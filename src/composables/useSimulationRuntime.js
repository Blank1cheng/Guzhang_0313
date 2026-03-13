import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';

import { buildLineChartOption } from '../utils/chartOption.js';
import {
  applyFault,
  buildExecutionOrder,
  buildMetricsFromSeries,
  defaultPortsByGroup,
  generateSourceSignal,
  normalizePorts,
  parseAnchorPort,
  processSystemNode,
  signalValueToNumber,
} from '../utils/faultMath.js';
import { injectionMethodLabel, layerLabel } from '../utils/labels.js';

function timeStamp() {
  return new Date().toLocaleTimeString('zh-CN', { hour12: false });
}

function pushRingBuffer(list, item, limit) {
  list.push(item);
  while (list.length > limit) list.shift();
}

function createBootLog() {
  return {
    id: 'log-ready',
    time: timeStamp(),
    text: '平台已就绪，可开始配置模板、任务与画布连线。',
  };
}

export function useSimulationRuntime({ graphNodes, graphEdges, injectionTasks }) {
  const runtime = reactive({
    status: 'ready',
    simTime: 0,
    tickIntervalMs: 420,
    stepSize: 0.5,
    maxLogRecords: 100,
  });

  const speedOptions = [
    { label: '快速 0.25s', value: 250 },
    { label: '标准 0.42s', value: 420 },
    { label: '稳态 0.65s', value: 650 },
    { label: '精细 1.00s', value: 1000 },
  ];

  const logs = ref([createBootLog()]);
  const activeScopeId = ref('');
  const scopeSeriesMap = ref({});
  const systemMemoryMap = new Map();
  const faultActivationMap = new Map();
  let runtimeTimer = null;

  const scopeOptions = computed(() => graphNodes.value
    .filter((node) => node.properties?.group === 'scope')
    .map((node) => ({
      id: node.id,
      name: node.properties?.name || node.id,
      sampleWindow: Number(node.properties?.scopeConfig?.sampleWindow ?? 80),
    })));

  const faultNodes = computed(() => graphNodes.value.filter((node) => node.properties?.group === 'fault'));

  const normalizedEdges = computed(() => {
    const nodeMap = new Map(graphNodes.value.map((node) => [node.id, node]));
    return graphEdges.value.map((edge) => {
      const sourceNode = nodeMap.get(edge.sourceNodeId);
      const targetNode = nodeMap.get(edge.targetNodeId);
      const sourcePorts = normalizePorts(sourceNode?.properties?.outputPorts, defaultPortsByGroup(sourceNode?.properties?.group).outputPorts);
      const targetPorts = normalizePorts(targetNode?.properties?.inputPorts, defaultPortsByGroup(targetNode?.properties?.group).inputPorts);
      return {
        ...edge,
        sourcePort: edge.properties?.sourcePort || parseAnchorPort(edge.sourceAnchorId, sourcePorts[0] || 'signal'),
        targetPort: edge.properties?.targetPort || parseAnchorPort(edge.targetAnchorId, targetPorts[0] || 'signal'),
      };
    });
  });

  const taskRows = computed(() => injectionTasks.value.map((task) => {
    const deployed = Boolean(task.deployedNodeId);
    const startTime = Number(task.triggerStart);
    const endTime = startTime + Number(task.duration);
    let statusKey = 'undeployed';
    let statusLabel = '未部署';

    if (deployed) {
      if (runtime.status === 'ready' && runtime.simTime === 0) {
        statusKey = 'ready';
        statusLabel = '待运行';
      } else if (runtime.simTime < startTime) {
        statusKey = 'waiting';
        statusLabel = '待触发';
      } else if (runtime.simTime <= endTime) {
        statusKey = runtime.status === 'running' ? 'active' : 'paused';
        statusLabel = runtime.status === 'running' ? '执行中' : '已暂停';
      } else if (runtime.simTime <= endTime + 10) {
        statusKey = 'recovery';
        statusLabel = '恢复跟踪';
      } else {
        statusKey = 'done';
        statusLabel = '已完成';
      }
    }

    return {
      ...task,
      deployed,
      endTime,
      statusKey,
      statusLabel,
    };
  }));

  const liveScopeSeries = computed(() => {
    const fallbackId = scopeOptions.value[0]?.id || '';
    const scopeId = activeScopeId.value || fallbackId;
    return scopeSeriesMap.value[scopeId] || { time: [], values: [], name: '未选择示波器' };
  });

  const currentSignalValue = computed(() => {
    const values = liveScopeSeries.value.values || [];
    if (values.length === 0) return '--';
    return Number(values[values.length - 1]).toFixed(2);
  });

  const liveScopeOption = computed(() => buildLineChartOption({
    xAxis: liveScopeSeries.value.time,
    series: [
      { name: liveScopeSeries.value.name, data: liveScopeSeries.value.values, color: '#2f80ff', width: 2.6 },
    ],
    showArea: true,
  }));

  function appendLog(text) {
    logs.value = [
      ...logs.value,
      {
        id: `log-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
        time: timeStamp(),
        text,
      },
    ].slice(-runtime.maxLogRecords);
  }

  function clearRuntimeTimer() {
    if (runtimeTimer) {
      window.clearInterval(runtimeTimer);
      runtimeTimer = null;
    }
  }

  function restartRuntimeTimerIfRunning() {
    if (runtime.status !== 'running') return;
    clearRuntimeTimer();
    runtimeTimer = window.setInterval(runSingleTick, runtime.tickIntervalMs);
  }

  function clearRuntimeCache() {
    scopeSeriesMap.value = {};
    systemMemoryMap.clear();
    faultActivationMap.clear();
  }

  function clearLogs() {
    logs.value = [createBootLog()];
  }

  function setTickIntervalMs(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 150) return;
    runtime.tickIntervalMs = numeric;
    restartRuntimeTimerIfRunning();
  }

  function getInputsByPort(targetNodeId, nodeOutputs) {
    const incomingEdges = normalizedEdges.value.filter((edge) => edge.targetNodeId === targetNodeId);
    const inputsByPort = {};
    incomingEdges.forEach((edge) => {
      const sourcePayload = nodeOutputs.get(edge.sourceNodeId) || {};
      const sourceValue = sourcePayload[edge.sourcePort];
      if (!inputsByPort[edge.targetPort]) inputsByPort[edge.targetPort] = [];
      inputsByPort[edge.targetPort].push(sourceValue);
    });
    return inputsByPort;
  }

  function writeScopeValue(node, simTime, value) {
    const scopeId = node.id;
    const scopeName = node.properties?.name || node.id;
    const sampleWindow = Number(node.properties?.scopeConfig?.sampleWindow ?? 80);
    const cache = scopeSeriesMap.value[scopeId] || { name: scopeName, time: [], values: [] };
    pushRingBuffer(cache.time, `${simTime.toFixed(1)}s`, sampleWindow);
    pushRingBuffer(cache.values, Number(value.toFixed(3)), sampleWindow);
    scopeSeriesMap.value = {
      ...scopeSeriesMap.value,
      [scopeId]: cache,
    };
  }

  function executeAt(simTime, stepIndex, options = {}) {
    const orderedNodes = buildExecutionOrder(graphNodes.value, normalizedEdges.value);
    const nodeOutputs = new Map();
    const faultStatusRows = [];

    orderedNodes.forEach((node) => {
      const properties = node.properties || {};
      const group = properties.group;
      const outputPorts = normalizePorts(properties.outputPorts, defaultPortsByGroup(group).outputPorts);
      const inputsByPort = getInputsByPort(node.id, nodeOutputs);
      const flatInputs = Object.values(inputsByPort).flat().map((item) => signalValueToNumber(item, 0));
      const primaryInput = flatInputs[0] ?? 0;

      if (group === 'source') {
        const value = generateSourceSignal(properties.sourceConfig, simTime);
        const outputs = {};
        outputPorts.forEach((port) => { outputs[port] = Number(value.toFixed(4)); });
        nodeOutputs.set(node.id, outputs);
        return;
      }

      if (group === 'system') {
        const memoryValue = systemMemoryMap.get(node.id) ?? 0;
        const value = processSystemNode(inputsByPort, properties.processConfig || {}, memoryValue);
        systemMemoryMap.set(node.id, value);
        const outputs = {};
        outputPorts.forEach((port) => { outputs[port] = Number(value.toFixed(4)); });
        nodeOutputs.set(node.id, outputs);
        return;
      }

      if (group === 'fault') {
        const inWindow = !options.disableFaults
          && simTime >= Number(properties.triggerStart ?? 0)
          && simTime <= Number(properties.triggerEnd ?? (Number(properties.triggerStart ?? 0) + Number(properties.duration ?? 0)));
        const value = inWindow
          ? applyFault(primaryInput, stepIndex, properties, {
            injectionLayer: properties.injectionLayer,
            methodFactor: properties.methodFactor,
            intensity: properties.intensity,
          })
          : primaryInput;
        const outputs = {};
        outputPorts.forEach((port) => { outputs[port] = Number(value.toFixed(4)); });
        nodeOutputs.set(node.id, outputs);
        faultStatusRows.push({
          id: node.id,
          name: properties.name || node.id,
          active: inWindow,
          layer: properties.injectionLayer,
          method: properties.injectionMethod,
          location: properties.location,
        });
        return;
      }

      if (group === 'scope') {
        if (!options.skipScopeWrite) writeScopeValue(node, simTime, primaryInput);
        nodeOutputs.set(node.id, {});
        return;
      }

      nodeOutputs.set(node.id, {});
    });

    return {
      nodeOutputs,
      faultStatusRows,
    };
  }

  function runSingleTick() {
    const stepIndex = Math.round(runtime.simTime / runtime.stepSize);
    const result = executeAt(runtime.simTime, stepIndex, { disableFaults: false, skipScopeWrite: false });

    result.faultStatusRows.forEach((row) => {
      const wasActive = faultActivationMap.get(row.id) || false;
      if (row.active && !wasActive) {
        appendLog(`${runtime.simTime.toFixed(1)}s 在 ${row.location} 以 ${injectionMethodLabel(row.method)} 启动 ${row.name}（${layerLabel(row.layer)}）。`);
      }
      if (!row.active && wasActive) {
        appendLog(`${runtime.simTime.toFixed(1)}s ${row.name} 注入结束，系统进入恢复跟踪。`);
      }
      faultActivationMap.set(row.id, row.active);
    });

    runtime.simTime = Number((runtime.simTime + runtime.stepSize).toFixed(1));
  }

  function simulateSeries(disableFaults) {
    const scopeSeries = {};
    const localMemory = new Map();
    const orderedNodes = buildExecutionOrder(graphNodes.value, normalizedEdges.value);
    const steps = 80;

    for (let stepIndex = 0; stepIndex < steps; stepIndex += 1) {
      const simTime = Number((stepIndex * runtime.stepSize).toFixed(1));
      const nodeOutputs = new Map();

      orderedNodes.forEach((node) => {
        const properties = node.properties || {};
        const group = properties.group;
        const inputPorts = normalizePorts(properties.inputPorts, defaultPortsByGroup(group).inputPorts);
        const outputPorts = normalizePorts(properties.outputPorts, defaultPortsByGroup(group).outputPorts);
        const incomingEdges = normalizedEdges.value.filter((edge) => edge.targetNodeId === node.id);
        const inputsByPort = {};

        inputPorts.forEach((portName) => {
          inputsByPort[portName] = incomingEdges
            .filter((edge) => edge.targetPort === portName)
            .map((edge) => nodeOutputs.get(edge.sourceNodeId)?.[edge.sourcePort]);
        });

        const flatInputs = Object.values(inputsByPort).flat().map((item) => signalValueToNumber(item, 0));
        const primaryInput = flatInputs[0] ?? 0;

        if (group === 'source') {
          const value = generateSourceSignal(properties.sourceConfig, simTime);
          const outputs = {};
          outputPorts.forEach((port) => { outputs[port] = Number(value.toFixed(4)); });
          nodeOutputs.set(node.id, outputs);
          return;
        }

        if (group === 'system') {
          const memoryValue = localMemory.get(node.id) ?? 0;
          const value = processSystemNode(inputsByPort, properties.processConfig || {}, memoryValue);
          localMemory.set(node.id, value);
          const outputs = {};
          outputPorts.forEach((port) => { outputs[port] = Number(value.toFixed(4)); });
          nodeOutputs.set(node.id, outputs);
          return;
        }

        if (group === 'fault') {
          const inWindow = !disableFaults
            && simTime >= Number(properties.triggerStart ?? 0)
            && simTime <= Number(properties.triggerEnd ?? (Number(properties.triggerStart ?? 0) + Number(properties.duration ?? 0)));
          const value = inWindow
            ? applyFault(primaryInput, stepIndex, properties, {
              injectionLayer: properties.injectionLayer,
              methodFactor: properties.methodFactor,
              intensity: properties.intensity,
            })
            : primaryInput;
          const outputs = {};
          outputPorts.forEach((port) => { outputs[port] = Number(value.toFixed(4)); });
          nodeOutputs.set(node.id, outputs);
          return;
        }

        if (group === 'scope') {
          const scopeCache = scopeSeries[node.id] || { name: properties.name || node.id, time: [], values: [] };
          scopeCache.time.push(`${simTime.toFixed(1)}s`);
          scopeCache.values.push(Number(primaryInput.toFixed(3)));
          scopeSeries[node.id] = scopeCache;
          nodeOutputs.set(node.id, {});
          return;
        }

        nodeOutputs.set(node.id, {});
      });
    }

    return scopeSeries;
  }

  const analysisSeries = computed(() => {
    const normalScopes = simulateSeries(true);
    const faultyScopes = simulateSeries(false);
    const scopeId = activeScopeId.value
      || scopeOptions.value[0]?.id
      || Object.keys(faultyScopes)[0]
      || Object.keys(normalScopes)[0]
      || '';
    const normal = normalScopes[scopeId]?.values || [];
    const faulty = faultyScopes[scopeId]?.values || normal;
    const recovered = faulty.map((value, index) => Number((normal[index] + (value - normal[index]) * 0.32).toFixed(3)));
    const xAxis = faultyScopes[scopeId]?.time || normalScopes[scopeId]?.time || [];
    return {
      scopeId,
      xAxis,
      normal,
      faulty,
      recovered,
    };
  });

  const analysisOption = computed(() => buildLineChartOption({
    xAxis: analysisSeries.value.xAxis,
    series: [
      { name: '无故障状态', data: analysisSeries.value.normal, color: '#8aa4c7', width: 2.1 },
      { name: '注入故障状态', data: analysisSeries.value.faulty, color: '#2f80ff', width: 2.8 },
      { name: '恢复后状态', data: analysisSeries.value.recovered, color: '#4cb782', width: 2.2 },
    ],
    showArea: false,
  }));

  const analysisMetrics = computed(() => buildMetricsFromSeries(
    analysisSeries.value.normal,
    analysisSeries.value.faulty,
    analysisSeries.value.recovered,
    runtime.stepSize,
  ));

  const runtimeOverview = computed(() => ({
    liveSignal: currentSignalValue.value,
    scopeCount: scopeOptions.value.length,
    deployedFaultCount: faultNodes.value.length,
    readyTaskCount: taskRows.value.filter((row) => row.statusKey !== 'undeployed').length,
  }));

  function ensureActiveScope() {
    if (!activeScopeId.value || !scopeOptions.value.some((item) => item.id === activeScopeId.value)) {
      activeScopeId.value = scopeOptions.value[0]?.id || '';
    }
  }

  function start() {
    ensureActiveScope();
    clearRuntimeTimer();
    runtime.status = 'running';
    appendLog('执行模式已切换为连续运行。');
    runtimeTimer = window.setInterval(runSingleTick, runtime.tickIntervalMs);
  }

  function pause() {
    clearRuntimeTimer();
    runtime.status = 'paused';
    appendLog('执行已暂停，可继续单步调试。');
  }

  function stop() {
    clearRuntimeTimer();
    runtime.status = 'stopped';
    runtime.simTime = 0;
    clearRuntimeCache();
    appendLog('执行已终止，运行态缓存已释放。');
  }

  function stepOnce() {
    clearRuntimeTimer();
    if (runtime.status === 'stopped') runtime.simTime = 0;
    runtime.status = 'paused';
    runSingleTick();
    appendLog('已执行单步仿真。');
  }

  function exportReportPayload() {
    return {
      generatedAt: new Date().toISOString(),
      runtime: {
        status: runtime.status,
        simTime: runtime.simTime,
        tickIntervalMs: runtime.tickIntervalMs,
        stepSize: runtime.stepSize,
      },
      tasks: taskRows.value.map((row) => ({
        id: row.id,
        name: row.name,
        template: row.templateName,
        templateCore: row.templateSnapshot || null,
        injectionConfig: {
          layer: row.layer,
          method: row.method,
          methodFactor: row.methodFactor,
          location: row.location,
          channel: row.channel,
          triggerStart: row.triggerStart,
          duration: row.duration,
          intensity: row.intensity,
          condition: row.condition,
        },
        status: row.statusLabel,
      })),
      metrics: analysisMetrics.value,
      scope: {
        id: analysisSeries.value.scopeId,
        normal: analysisSeries.value.normal,
        faulty: analysisSeries.value.faulty,
        recovered: analysisSeries.value.recovered,
      },
      logs: logs.value.slice(-20),
    };
  }

  watch(scopeOptions, ensureActiveScope, { immediate: true, deep: true });

  watch(
    [graphNodes, graphEdges],
    () => {
      clearRuntimeTimer();
      runtime.status = runtime.status === 'stopped' ? 'stopped' : 'ready';
      runtime.simTime = 0;
      clearRuntimeCache();
      ensureActiveScope();
    },
    { deep: true },
  );

  onBeforeUnmount(() => {
    clearRuntimeTimer();
    clearRuntimeCache();
  });

  return {
    runtime,
    logs,
    scopeOptions,
    speedOptions,
    activeScopeId,
    currentSignalValue,
    liveScopeOption,
    analysisOption,
    analysisMetrics,
    taskRows,
    runtimeOverview,
    start,
    pause,
    stop,
    stepOnce,
    clearLogs,
    setTickIntervalMs,
    exportReportPayload,
  };
}
