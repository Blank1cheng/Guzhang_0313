import { computed, reactive, ref, watch } from 'vue';

import {
  faultCategoryOptions,
  faultTypeOptionsByCategory,
  initialFaultTemplates,
  injectionLayerOptions,
  injectionLocationPresetsByLayer,
  injectionMethodOptionsByLayer,
  nodePalette,
  triggerConditionOptions,
} from '../data/faultCatalog.js';
import { buildFaultSubtitle, inferCategoryByMode, modeLabel } from '../utils/labels.js';
import { applyFault, defaultPortsByGroup, ensurePortList, generateSourceSignal, normalizePorts } from '../utils/faultMath.js';

let idSeed = 1;

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createId(prefix) {
  idSeed += 1;
  return `${prefix}-${Date.now().toString(36)}-${idSeed}`;
}

function accentByCategory(category) {
  return {
    analog: '#dc5a5a',
    state: '#cf4747',
    noise: '#d9534f',
  }[category] || '#d9534f';
}

function tokenByMode(mode) {
  return {
    gauss: 'GN',
    impulse: 'IN',
    bias: 'BO',
    drift: 'DF',
    interruption: 'SI',
    stuck: 'ST',
  }[mode] || 'FT';
}

function firstModeForCategory(category) {
  return faultTypeOptionsByCategory[category]?.[0]?.value || 'gauss';
}

function defaultMethodForLayer(layer) {
  return injectionMethodOptionsByLayer[layer]?.[0]?.value || 'signal_overlay';
}

function defaultMethodFactor(layer) {
  if (layer === 'physical') return 0.9;
  if (layer === 'protocol') return 1.15;
  return 1;
}

function defaultChannelForLayer(layer) {
  return layer === 'protocol' ? 'frame.payload' : 'signal';
}

function defaultLocationForLayer(layer) {
  return injectionLocationPresetsByLayer[layer]?.[0] || '传感器 A';
}

function inferLayerByCategory(category) {
  if (category === 'state') return 'protocol';
  if (category === 'analog') return 'physical';
  return 'electrical';
}

function buildTemplateDraft(template = {}) {
  const category = template.category || inferCategoryByMode(template.mode) || 'noise';
  const mode = template.mode || firstModeForCategory(category);
  return {
    id: template.id || '',
    templateName: template.templateName || `${modeLabel(mode)}_新建`,
    category,
    mode,
    mean: Number(template.mean ?? 0),
    variance: Number(template.variance ?? 5),
    bias: Number(template.bias ?? 0),
    severity: Number(template.severity ?? 0.58),
    accent: template.accent || accentByCategory(category),
    token: template.token || tokenByMode(mode),
  };
}

function cloneTemplateSnapshot(template = {}) {
  const category = template.category || inferCategoryByMode(template.mode) || 'noise';
  const mode = template.mode || firstModeForCategory(category);
  return {
    id: template.id || '',
    templateName: template.templateName || '未命名模板',
    category,
    mode,
    mean: Number(template.mean ?? 0),
    variance: Number(template.variance ?? 0),
    bias: Number(template.bias ?? 0),
    severity: Number(template.severity ?? 0.58),
    accent: template.accent || accentByCategory(category),
    token: template.token || tokenByMode(mode),
  };
}

function buildTaskDraft(template) {
  const safeTemplate = cloneTemplateSnapshot(template || initialFaultTemplates[0]);
  const layer = inferLayerByCategory(safeTemplate.category);
  return {
    id: '',
    templateId: safeTemplate.id,
    templateName: safeTemplate.templateName,
    category: safeTemplate.category,
    mode: safeTemplate.mode,
    layer,
    method: defaultMethodForLayer(layer),
    methodFactor: defaultMethodFactor(layer),
    location: defaultLocationForLayer(layer),
    channel: defaultChannelForLayer(layer),
    triggerStart: 2,
    duration: 98,
    intensity: 1,
    condition: 'immediate',
    note: '',
  };
}

function createSourceProperties(item, overrides = {}) {
  return {
    group: 'source',
    name: overrides.name || '主信号源',
    token: item.token,
    accent: item.accent,
    fill: item.fill,
    category: 'source',
    mode: 'source',
    subtitle: item.subtitle,
    inputPorts: [],
    outputPorts: ['signal'],
    sourceConfig: {
      waveType: 'sine',
      amplitude: 4.2,
      frequency: 0.18,
      offset: 17,
      phase: 0,
      duty: 50,
      ...(item.sourceConfig || {}),
      ...(overrides.sourceConfig || {}),
    },
  };
}

function createProcessProperties(item, overrides = {}) {
  return {
    group: 'system',
    name: overrides.name || '流程块 A',
    token: item.token,
    accent: item.accent,
    fill: item.fill,
    category: 'system',
    mode: 'process',
    subtitle: item.subtitle,
    inputPorts: overrides.inputPorts || ['in1'],
    outputPorts: overrides.outputPorts || ['out1'],
    processConfig: {
      mode: 'gain',
      gain: 1.05,
      offset: 0,
      memory: 17,
      ...(item.processConfig || {}),
      ...(overrides.processConfig || {}),
    },
  };
}

function createScopeProperties(item, overrides = {}) {
  return {
    group: 'scope',
    name: overrides.name || '示波器 A',
    token: item.token,
    accent: item.accent,
    fill: item.fill,
    category: 'monitor',
    mode: 'scope',
    subtitle: item.subtitle,
    inputPorts: ['signal'],
    outputPorts: [],
    scopeConfig: {
      sampleWindow: 80,
      ...(item.scopeConfig || {}),
      ...(overrides.scopeConfig || {}),
    },
  };
}

function createFaultNodeProperties(task, sourceTemplate) {
  const snapshot = cloneTemplateSnapshot(task.templateSnapshot || sourceTemplate);
  const triggerStart = Number(task.triggerStart ?? 2);
  const duration = Number(task.duration ?? 98);
  return {
    group: 'fault',
    name: task.name,
    token: snapshot.token,
    accent: snapshot.accent,
    fill: '#fff5f5',
    taskId: task.id,
    templateId: snapshot.id,
    templateName: snapshot.templateName,
    category: snapshot.category,
    mode: snapshot.mode,
    subtitle: buildFaultSubtitle(snapshot.category, snapshot.mode, task.layer, task.method),
    inputPorts: ['signal'],
    outputPorts: ['signal'],
    mean: Number(snapshot.mean ?? 0),
    variance: Number(snapshot.variance ?? 0),
    bias: Number(snapshot.bias ?? 0),
    severity: Number(snapshot.severity ?? 0.58),
    injectionLayer: task.layer,
    injectionMethod: task.method,
    methodFactor: Number(task.methodFactor ?? 1),
    location: task.location,
    channel: task.channel,
    triggerStart,
    duration,
    triggerEnd: triggerStart + duration,
    intensity: Number(task.intensity ?? 1),
    condition: task.condition || 'immediate',
    note: task.note || '',
    templateSnapshot: snapshot,
  };
}

function createInitialGraph() {
  const sourcePalette = nodePalette.find((item) => item.group === 'source');
  const processPalette = nodePalette.find((item) => item.group === 'system');
  const scopePalette = nodePalette.find((item) => item.group === 'scope');

  const sourceId = 'source-main';
  const processId = 'process-main';
  const scopeId = 'scope-main';

  return {
    nodes: [
      { id: sourceId, type: 'studio-node', x: 220, y: 220, text: '', properties: createSourceProperties(sourcePalette, { name: '主信号源' }) },
      { id: processId, type: 'studio-node', x: 540, y: 220, text: '', properties: createProcessProperties(processPalette, { name: '流程块 A' }) },
      { id: scopeId, type: 'studio-node', x: 860, y: 220, text: '', properties: createScopeProperties(scopePalette, { name: '基线示波器' }) },
    ],
    edges: [
      {
        id: 'edge-source-process',
        type: 'polyline',
        sourceNodeId: sourceId,
        targetNodeId: processId,
        sourceAnchorId: `${sourceId}::output::signal`,
        targetAnchorId: `${processId}::input::in1`,
        properties: { relationType: 'data', sourcePort: 'signal', targetPort: 'in1' },
        text: '',
      },
      {
        id: 'edge-process-scope',
        type: 'polyline',
        sourceNodeId: processId,
        targetNodeId: scopeId,
        sourceAnchorId: `${processId}::output::out1`,
        targetAnchorId: `${scopeId}::input::signal`,
        properties: { relationType: 'data', sourcePort: 'out1', targetPort: 'signal' },
        text: '',
      },
    ],
  };
}

function buildQuickPreview(model) {
  const points = Array.from({ length: 64 }, (_item, index) => Number((index * 0.5).toFixed(1)));
  const normal = points.map((timePoint) => Number(generateSourceSignal({ waveType: 'sine', amplitude: 4, frequency: 0.14, offset: 17 }, timePoint).toFixed(2)));
  const faulty = normal.map((value, index) => applyFault(value, index, model, { injectionLayer: 'electrical', methodFactor: 1, intensity: 1 }));
  const recovered = faulty.map((value, index) => Number((normal[index] + (value - normal[index]) * 0.32).toFixed(2)));
  return { points, normal, faulty, recovered };
}

function normalizeGraphData(graphData) {
  const initialGraph = createInitialGraph();
  const nodes = Array.isArray(graphData?.nodes) && graphData.nodes.length > 0
    ? graphData.nodes.map((item) => deepClone(item))
    : initialGraph.nodes.map((item) => deepClone(item));
  const edges = Array.isArray(graphData?.edges)
    ? graphData.edges.map((item) => deepClone(item))
    : initialGraph.edges.map((item) => deepClone(item));
  return { nodes, edges };
}

function buildTaskFromTemplate(template, overrides = {}) {
  const templateSnapshot = cloneTemplateSnapshot(template);
  const draft = buildTaskDraft(templateSnapshot);
  return {
    id: overrides.id || createId('task'),
    name: overrides.name || `${templateSnapshot.templateName}_任务`,
    templateId: templateSnapshot.id,
    templateName: templateSnapshot.templateName,
    category: templateSnapshot.category,
    mode: templateSnapshot.mode,
    layer: draft.layer,
    method: draft.method,
    methodFactor: Number(draft.methodFactor),
    location: draft.location,
    channel: draft.channel,
    triggerStart: Number(draft.triggerStart),
    duration: Number(draft.duration),
    intensity: Number(draft.intensity),
    condition: draft.condition,
    note: '',
    templateSnapshot,
    deployedNodeId: '',
    ...overrides,
    templateSnapshot: cloneTemplateSnapshot(overrides.templateSnapshot || templateSnapshot),
  };
}

function mergeTemplatesWithInitial(existingTemplates) {
  const merged = [...existingTemplates.map((item) => buildTemplateDraft(item))];
  initialFaultTemplates.forEach((template) => {
    if (!merged.some((item) => item.id === template.id)) {
      merged.push(buildTemplateDraft(template));
    }
  });
  return merged;
}

function scenarioGraphFromPreset(presetId, templates) {
  const sourcePalette = nodePalette.find((item) => item.group === 'source');
  const processPalette = nodePalette.find((item) => item.group === 'system');
  const scopePalette = nodePalette.find((item) => item.group === 'scope');

  const findTemplate = (templateId, fallbackMode) => (
    templates.find((item) => item.id === templateId)
    || templates.find((item) => item.mode === fallbackMode)
    || templates[0]
  );

  if (presetId === 'electrical_overlay') {
    const template = findTemplate('tpl-gauss-5', 'gauss');
    const task = buildTaskFromTemplate(template, {
      name: `${template.templateName}_电气层任务`,
      layer: 'electrical',
      method: 'signal_overlay',
      methodFactor: 1,
      location: '主信号总线',
      channel: 'signal',
      triggerStart: 2,
      duration: 100,
      intensity: 1,
      condition: 'immediate',
      deployedNodeId: 'fault-electrical',
    });
    return {
      graph: {
        nodes: [
          { id: 'source-main', type: 'studio-node', x: 190, y: 250, text: '', properties: createSourceProperties(sourcePalette, { name: '主信号源' }) },
          { id: 'scope-before', type: 'studio-node', x: 450, y: 110, text: '', properties: createScopeProperties(scopePalette, { name: '注入前示波器' }) },
          { id: 'fault-electrical', type: 'studio-node', x: 530, y: 250, text: '', properties: createFaultNodeProperties(task, task.templateSnapshot) },
          { id: 'process-main', type: 'studio-node', x: 850, y: 250, text: '', properties: createProcessProperties(processPalette, { name: '流程块 A' }) },
          { id: 'scope-after', type: 'studio-node', x: 1150, y: 250, text: '', properties: createScopeProperties(scopePalette, { name: '注入后示波器' }) },
        ],
        edges: [
          {
            id: 'edge-source-before',
            type: 'polyline',
            sourceNodeId: 'source-main',
            targetNodeId: 'scope-before',
            sourceAnchorId: 'source-main::output::signal',
            targetAnchorId: 'scope-before::input::signal',
            properties: { relationType: 'data', sourcePort: 'signal', targetPort: 'signal' },
            text: '',
          },
          {
            id: 'edge-source-fault',
            type: 'polyline',
            sourceNodeId: 'source-main',
            targetNodeId: 'fault-electrical',
            sourceAnchorId: 'source-main::output::signal',
            targetAnchorId: 'fault-electrical::input::signal',
            properties: { relationType: 'data', sourcePort: 'signal', targetPort: 'signal' },
            text: '',
          },
          {
            id: 'edge-fault-process',
            type: 'polyline',
            sourceNodeId: 'fault-electrical',
            targetNodeId: 'process-main',
            sourceAnchorId: 'fault-electrical::output::signal',
            targetAnchorId: 'process-main::input::in1',
            properties: { relationType: 'data', sourcePort: 'signal', targetPort: 'in1' },
            text: '',
          },
          {
            id: 'edge-process-after',
            type: 'polyline',
            sourceNodeId: 'process-main',
            targetNodeId: 'scope-after',
            sourceAnchorId: 'process-main::output::out1',
            targetAnchorId: 'scope-after::input::signal',
            properties: { relationType: 'data', sourcePort: 'out1', targetPort: 'signal' },
            text: '',
          },
        ],
      },
      tasks: [task],
    };
  }

  if (presetId === 'physical_modify') {
    const template = findTemplate('tpl-bias-18', 'bias');
    const task = buildTaskFromTemplate(template, {
      name: `${template.templateName}_物理层任务`,
      layer: 'physical',
      method: 'param_modify',
      methodFactor: 0.92,
      location: '温度传感器参数组',
      channel: 'analog.out',
      triggerStart: 5,
      duration: 90,
      intensity: 1.1,
      condition: 'delay',
      deployedNodeId: 'fault-physical',
    });
    return {
      graph: {
        nodes: [
          { id: 'source-main', type: 'studio-node', x: 190, y: 230, text: '', properties: createSourceProperties(sourcePalette, { name: '主信号源' }) },
          { id: 'process-main', type: 'studio-node', x: 490, y: 230, text: '', properties: createProcessProperties(processPalette, { name: '参数修正流程', processConfig: { mode: 'gain', gain: 1.08, offset: 0.4, memory: 17 } }) },
          { id: 'fault-physical', type: 'studio-node', x: 810, y: 230, text: '', properties: createFaultNodeProperties(task, task.templateSnapshot) },
          { id: 'scope-after', type: 'studio-node', x: 1120, y: 230, text: '', properties: createScopeProperties(scopePalette, { name: '物理层示波器' }) },
        ],
        edges: [
          {
            id: 'edge-source-process',
            type: 'polyline',
            sourceNodeId: 'source-main',
            targetNodeId: 'process-main',
            sourceAnchorId: 'source-main::output::signal',
            targetAnchorId: 'process-main::input::in1',
            properties: { relationType: 'data', sourcePort: 'signal', targetPort: 'in1' },
            text: '',
          },
          {
            id: 'edge-process-fault',
            type: 'polyline',
            sourceNodeId: 'process-main',
            targetNodeId: 'fault-physical',
            sourceAnchorId: 'process-main::output::out1',
            targetAnchorId: 'fault-physical::input::signal',
            properties: { relationType: 'data', sourcePort: 'out1', targetPort: 'signal' },
            text: '',
          },
          {
            id: 'edge-fault-scope',
            type: 'polyline',
            sourceNodeId: 'fault-physical',
            targetNodeId: 'scope-after',
            sourceAnchorId: 'fault-physical::output::signal',
            targetAnchorId: 'scope-after::input::signal',
            properties: { relationType: 'data', sourcePort: 'signal', targetPort: 'signal' },
            text: '',
          },
        ],
      },
      tasks: [task],
    };
  }

  if (presetId === 'protocol_tamper') {
    const template = findTemplate('tpl-link-cut', 'interruption');
    const task = buildTaskFromTemplate(template, {
      name: `${template.templateName}_协议层任务`,
      layer: 'protocol',
      method: 'data_tamper',
      methodFactor: 1.12,
      location: 'CAN 帧链路',
      channel: 'frame.payload',
      triggerStart: 12,
      duration: 60,
      intensity: 1.05,
      condition: 'event',
      deployedNodeId: 'fault-protocol',
    });
    return {
      graph: {
        nodes: [
          { id: 'source-main', type: 'studio-node', x: 170, y: 250, text: '', properties: createSourceProperties(sourcePalette, { name: '协议输入源', sourceConfig: { waveType: 'square', amplitude: 3.4, frequency: 0.12, offset: 16 } }) },
          { id: 'process-main', type: 'studio-node', x: 450, y: 250, text: '', properties: createProcessProperties(processPalette, { name: '打包流程', processConfig: { mode: 'sum', gain: 1, offset: 0, memory: 0 } }) },
          { id: 'fault-protocol', type: 'studio-node', x: 760, y: 250, text: '', properties: createFaultNodeProperties(task, task.templateSnapshot) },
          { id: 'scope-after', type: 'studio-node', x: 1070, y: 250, text: '', properties: createScopeProperties(scopePalette, { name: '链路示波器' }) },
        ],
        edges: [
          {
            id: 'edge-source-process',
            type: 'polyline',
            sourceNodeId: 'source-main',
            targetNodeId: 'process-main',
            sourceAnchorId: 'source-main::output::signal',
            targetAnchorId: 'process-main::input::in1',
            properties: { relationType: 'data', sourcePort: 'signal', targetPort: 'in1' },
            text: '',
          },
          {
            id: 'edge-process-fault',
            type: 'polyline',
            sourceNodeId: 'process-main',
            targetNodeId: 'fault-protocol',
            sourceAnchorId: 'process-main::output::out1',
            targetAnchorId: 'fault-protocol::input::signal',
            properties: { relationType: 'data', sourcePort: 'out1', targetPort: 'signal' },
            text: '',
          },
          {
            id: 'edge-fault-scope',
            type: 'polyline',
            sourceNodeId: 'fault-protocol',
            targetNodeId: 'scope-after',
            sourceAnchorId: 'fault-protocol::output::signal',
            targetAnchorId: 'scope-after::input::signal',
            properties: { relationType: 'data', sourcePort: 'signal', targetPort: 'signal' },
            text: '',
          },
        ],
      },
      tasks: [task],
    };
  }

  return {
    graph: createInitialGraph(),
    tasks: [],
  };
}

export function useStudioState() {
  const faultTemplates = ref(initialFaultTemplates.map((item) => buildTemplateDraft(item)));
  const templateDraft = reactive(buildTemplateDraft(faultTemplates.value[0]));
  const taskDraft = reactive(buildTaskDraft(faultTemplates.value[0]));
  const injectionTasks = ref([]);
  const initialGraph = createInitialGraph();
  const graphNodes = ref(initialGraph.nodes.map((item) => deepClone(item)));
  const graphEdges = ref(initialGraph.edges.map((item) => deepClone(item)));
  const selectedElement = ref({ kind: 'none', id: '' });

  const selectedNode = computed(() => {
    if (selectedElement.value.kind !== 'node') return null;
    return graphNodes.value.find((node) => node.id === selectedElement.value.id) || null;
  });

  const selectedEdge = computed(() => {
    if (selectedElement.value.kind !== 'edge') return null;
    return graphEdges.value.find((edge) => edge.id === selectedElement.value.id) || null;
  });

  const faultTypeOptions = computed(() => faultTypeOptionsByCategory[templateDraft.category] || faultTypeOptionsByCategory.noise);

  const currentTaskTemplate = computed(() => (
    faultTemplates.value.find((item) => item.id === taskDraft.templateId)
    || faultTemplates.value[0]
    || null
  ));

  const currentTaskMethodOptions = computed(() => injectionMethodOptionsByLayer[taskDraft.layer] || injectionMethodOptionsByLayer.electrical);

  const currentMethodMeta = computed(() => (
    currentTaskMethodOptions.value.find((item) => item.value === taskDraft.method)
    || currentTaskMethodOptions.value[0]
    || null
  ));

  const templatePreview = computed(() => buildQuickPreview(templateDraft));

  const graphLocations = computed(() => {
    const dynamic = graphNodes.value
      .filter((node) => ['source', 'system', 'scope'].includes(node.properties?.group))
      .map((node) => node.properties?.name)
      .filter(Boolean);
    return [...new Set([...(injectionLocationPresetsByLayer[taskDraft.layer] || []), ...dynamic])];
  });

  const graphChannels = computed(() => {
    const baseChannels = taskDraft.layer === 'protocol'
      ? ['frame.payload', 'frame.id', 'frame.checksum']
      : ['signal', 'analog.out', 'feedback'];
    const dynamic = graphNodes.value.flatMap((node) => {
      const group = node.properties?.group;
      const ports = normalizePorts(node.properties?.outputPorts, defaultPortsByGroup(group).outputPorts);
      return ports.map((port) => `${node.properties?.name}.${port}`);
    });
    return [...new Set([...baseChannels, ...dynamic])];
  });

  const canvasCounts = computed(() => ({
    nodes: graphNodes.value.length,
    edges: graphEdges.value.length,
    faults: graphNodes.value.filter((node) => node.properties?.group === 'fault').length,
    scopes: graphNodes.value.filter((node) => node.properties?.group === 'scope').length,
  }));

  const libraryGroups = computed(() => [
    {
      key: 'basic',
      label: '基础模块',
      items: nodePalette.map((item) => ({
        ...item,
        libraryType: 'node',
      })),
    },
    {
      key: 'faultTemplates',
      label: '故障模板库',
      items: faultTemplates.value.map((template) => ({
        id: template.id,
        templateId: template.id,
        label: template.templateName,
        subtitle: `${modeLabel(template.mode)} / 可复用模板`,
        token: template.token,
        accent: template.accent,
        libraryType: 'fault-template',
        category: template.category,
        mode: template.mode,
      })),
    },
  ]);

  watch(
    () => templateDraft.category,
    (category) => {
      const nextOptions = faultTypeOptionsByCategory[category] || faultTypeOptionsByCategory.noise;
      if (!nextOptions.some((item) => item.value === templateDraft.mode)) {
        templateDraft.mode = nextOptions[0]?.value || 'gauss';
      }
      templateDraft.accent = accentByCategory(category);
    },
    { immediate: true },
  );

  watch(
    () => templateDraft.mode,
    (mode) => {
      if (!templateDraft.id && (!templateDraft.templateName || templateDraft.templateName.endsWith('_新建'))) {
        templateDraft.templateName = `${modeLabel(mode)}_新建`;
      }
      templateDraft.token = tokenByMode(mode);
      templateDraft.category = inferCategoryByMode(mode);
    },
  );

  watch(
    () => taskDraft.layer,
    (layer) => {
      taskDraft.method = defaultMethodForLayer(layer);
      taskDraft.methodFactor = defaultMethodFactor(layer);
      taskDraft.location = graphLocations.value[0] || defaultLocationForLayer(layer);
      taskDraft.channel = defaultChannelForLayer(layer);
    },
    { immediate: true },
  );

  watch(
    () => taskDraft.templateId,
    (templateId) => {
      const template = faultTemplates.value.find((item) => item.id === templateId);
      if (!template) return;
      taskDraft.templateName = template.templateName;
      taskDraft.category = template.category;
      taskDraft.mode = template.mode;
      taskDraft.layer = inferLayerByCategory(template.category);
    },
    { immediate: true },
  );

  function resetTemplateDraft(template = null) {
    Object.assign(templateDraft, buildTemplateDraft(template || {}));
  }

  function resetTaskDraft(template = null) {
    Object.assign(taskDraft, buildTaskDraft(template || currentTaskTemplate.value || faultTemplates.value[0] || {}));
  }

  function selectTemplateForModeling(templateId) {
    const template = faultTemplates.value.find((item) => item.id === templateId);
    if (!template) return;
    resetTemplateDraft(template);
  }

  function saveTemplateDraft() {
    const payload = buildTemplateDraft(templateDraft);
    if (payload.id) {
      faultTemplates.value = faultTemplates.value.map((item) => (item.id === payload.id ? payload : item));
    } else {
      payload.id = createId('template');
      faultTemplates.value = [...faultTemplates.value, payload];
      templateDraft.id = payload.id;
    }

    injectionTasks.value = injectionTasks.value.map((task) => (
      task.templateId === payload.id
        ? {
          ...task,
          templateName: payload.templateName,
          category: payload.category,
          mode: payload.mode,
          templateSnapshot: cloneTemplateSnapshot(task.templateSnapshot || payload),
        }
        : task
    ));

    if (taskDraft.templateId === payload.id || !taskDraft.templateId) {
      taskDraft.templateId = payload.id;
    }

    return payload;
  }

  function duplicateTemplate(templateId) {
    const template = faultTemplates.value.find((item) => item.id === templateId);
    if (!template) return null;
    const cloned = {
      ...template,
      id: createId('template'),
      templateName: `${template.templateName}_副本`,
    };
    faultTemplates.value = [...faultTemplates.value, cloned];
    resetTemplateDraft(cloned);
    return cloned;
  }

  function deleteTemplate(templateId) {
    faultTemplates.value = faultTemplates.value.filter((item) => item.id !== templateId);
    if (!faultTemplates.value.some((item) => item.id === taskDraft.templateId)) {
      taskDraft.templateId = faultTemplates.value[0]?.id || '';
    }
    if (templateDraft.id === templateId) {
      resetTemplateDraft(faultTemplates.value[0] || {});
    }
  }

  function loadTemplateIntoTask(templateId) {
    const template = faultTemplates.value.find((item) => item.id === templateId);
    if (!template) return;
    taskDraft.templateId = template.id;
    taskDraft.templateName = template.templateName;
    taskDraft.category = template.category;
    taskDraft.mode = template.mode;
    taskDraft.layer = inferLayerByCategory(template.category);
  }

  function createInjectionTask() {
    const template = currentTaskTemplate.value;
    if (!template) return null;
    const templateSnapshot = cloneTemplateSnapshot(template);
    const task = {
      id: createId('task'),
      name: `${template.templateName}_任务${injectionTasks.value.length + 1}`,
      templateId: template.id,
      templateName: template.templateName,
      category: template.category,
      mode: template.mode,
      layer: taskDraft.layer,
      method: taskDraft.method,
      methodFactor: Number(taskDraft.methodFactor),
      location: taskDraft.location,
      channel: taskDraft.channel,
      triggerStart: Number(taskDraft.triggerStart),
      duration: Number(taskDraft.duration),
      intensity: Number(taskDraft.intensity),
      condition: taskDraft.condition,
      note: taskDraft.note,
      templateSnapshot,
      deployedNodeId: '',
    };
    injectionTasks.value = [...injectionTasks.value, task];
    return task;
  }

  function createTaskFromTemplateSnapshot(template, overrides = {}) {
    if (!template) return null;
    const task = buildTaskFromTemplate(template, {
      name: `${template.templateName}_任务${injectionTasks.value.length + 1}`,
      ...overrides,
    });
    injectionTasks.value = [...injectionTasks.value, task];
    return task;
  }

  function cloneInjectionTask(taskId) {
    const task = injectionTasks.value.find((item) => item.id === taskId);
    if (!task) return null;
    const cloned = {
      ...deepClone(task),
      id: createId('task'),
      name: `${task.name}_副本`,
      deployedNodeId: '',
      templateSnapshot: cloneTemplateSnapshot(task.templateSnapshot),
    };
    injectionTasks.value = [...injectionTasks.value, cloned];
    return cloned;
  }

  function removeInjectionTask(taskId) {
    const task = injectionTasks.value.find((item) => item.id === taskId) || null;
    injectionTasks.value = injectionTasks.value.filter((item) => item.id !== taskId);
    return task;
  }

  function buildFaultNodeDefinition(task, position = {}) {
    const template = task.templateSnapshot || faultTemplates.value.find((item) => item.id === task.templateId);
    if (!template) return null;
    return {
      id: task.deployedNodeId || createId('fault-node'),
      type: 'studio-node',
      x: Number(position.x) || 520,
      y: Number(position.y) || 360,
      text: '',
      properties: createFaultNodeProperties(task, template),
    };
  }

  function deployTaskToCanvas(taskId, position = {}) {
    const task = injectionTasks.value.find((item) => item.id === taskId);
    if (!task) return null;
    if (task.deployedNodeId && graphNodes.value.some((node) => node.id === task.deployedNodeId)) {
      return null;
    }

    const node = buildFaultNodeDefinition(task, position);
    if (!node) return null;
    injectionTasks.value = injectionTasks.value.map((item) => (
      item.id === taskId ? { ...item, deployedNodeId: node.id } : item
    ));
    return node;
  }

  function deployAllTasksToCanvas() {
    const baseY = 320;
    const gapY = 170;
    const pending = injectionTasks.value.filter((task) => !task.deployedNodeId || !graphNodes.value.some((node) => node.id === task.deployedNodeId));
    const definitions = pending.map((task, index) => {
      const node = buildFaultNodeDefinition(task, { x: 600, y: baseY + index * gapY });
      if (!node) return null;
      injectionTasks.value = injectionTasks.value.map((item) => (
        item.id === task.id ? { ...item, deployedNodeId: node.id } : item
      ));
      return node;
    }).filter(Boolean);
    return definitions;
  }

  function instantiateTemplateToTask(templateId, position = {}) {
    const template = faultTemplates.value.find((item) => item.id === templateId);
    const task = createTaskFromTemplateSnapshot(template);
    if (!task) return null;
    return deployTaskToCanvas(task.id, position);
  }

  function createPendingFaultDragDefinition(templateId) {
    const template = faultTemplates.value.find((item) => item.id === templateId);
    if (!template) return null;
    const snapshot = cloneTemplateSnapshot(template);
    const draft = buildTaskDraft(snapshot);
    return {
      type: 'studio-node',
      text: '',
      properties: {
        group: 'fault',
        name: snapshot.templateName,
        token: snapshot.token,
        accent: snapshot.accent,
        fill: '#fff5f5',
        templateId: snapshot.id,
        pendingTemplateId: snapshot.id,
        templateName: snapshot.templateName,
        category: snapshot.category,
        mode: snapshot.mode,
        subtitle: `${modeLabel(snapshot.mode)} / 待创建任务`,
        inputPorts: ['signal'],
        outputPorts: ['signal'],
        mean: Number(snapshot.mean ?? 0),
        variance: Number(snapshot.variance ?? 0),
        bias: Number(snapshot.bias ?? 0),
        severity: Number(snapshot.severity ?? 0.58),
        injectionLayer: draft.layer,
        injectionMethod: draft.method,
        methodFactor: Number(draft.methodFactor),
        location: draft.location,
        channel: draft.channel,
        triggerStart: Number(draft.triggerStart),
        duration: Number(draft.duration),
        triggerEnd: Number(draft.triggerStart) + Number(draft.duration),
        intensity: Number(draft.intensity),
        condition: draft.condition,
        templateSnapshot: snapshot,
      },
    };
  }

  function materializeDraggedFaultNode(nodeId, templateId) {
    const template = faultTemplates.value.find((item) => item.id === templateId);
    const task = createTaskFromTemplateSnapshot(template, { deployedNodeId: nodeId });
    if (!task) return null;
    return createFaultNodeProperties(task, task.templateSnapshot);
  }

  function createNodeDefinitionFromLibrary(item, position = {}) {
    if (item.libraryType === 'fault-template') {
      return instantiateTemplateToTask(item.templateId, position);
    }

    if (item.group === 'source') {
      return {
        id: createId('source-node'),
        type: 'studio-node',
        x: Number(position.x) || 240,
        y: Number(position.y) || 360,
        text: '',
        properties: createSourceProperties(item, { name: `信号源 ${canvasCounts.value.nodes + 1}` }),
      };
    }

    if (item.group === 'scope') {
      return {
        id: createId('scope-node'),
        type: 'studio-node',
        x: Number(position.x) || 920,
        y: Number(position.y) || 360,
        text: '',
        properties: createScopeProperties(item, { name: `示波器 ${canvasCounts.value.scopes + 1}` }),
      };
    }

    return {
      id: createId('process-node'),
      type: 'studio-node',
      x: Number(position.x) || 580,
      y: Number(position.y) || 360,
      text: '',
      properties: createProcessProperties(item, { name: `流程块 ${canvasCounts.value.nodes + 1}` }),
    };
  }

  function syncGraph(graphData) {
    const normalized = normalizeGraphData(graphData);
    graphNodes.value = normalized.nodes;
    graphEdges.value = normalized.edges;

    const faultNodeMap = new Map(
      graphNodes.value
        .filter((node) => node.properties?.group === 'fault' && node.properties?.taskId)
        .map((node) => [node.properties.taskId, node]),
    );

    injectionTasks.value = injectionTasks.value.map((task) => {
      const faultNode = faultNodeMap.get(task.id);
      if (!faultNode) return { ...task, deployedNodeId: '' };
      const props = faultNode.properties || {};
      const templateSnapshot = props.templateSnapshot
        ? cloneTemplateSnapshot(props.templateSnapshot)
        : cloneTemplateSnapshot({
          id: props.templateId || task.templateId,
          templateName: props.templateName || task.templateName,
          category: props.category || task.category,
          mode: props.mode || task.mode,
          mean: props.mean ?? task.templateSnapshot?.mean,
          variance: props.variance ?? task.templateSnapshot?.variance,
          bias: props.bias ?? task.templateSnapshot?.bias,
          severity: props.severity ?? task.templateSnapshot?.severity,
          accent: props.accent || task.templateSnapshot?.accent,
          token: props.token || task.templateSnapshot?.token,
        });

      return {
        ...task,
        name: props.name || task.name,
        templateId: props.templateId || task.templateId,
        templateName: props.templateName || task.templateName,
        category: props.category || task.category,
        mode: props.mode || task.mode,
        layer: props.injectionLayer || task.layer,
        method: props.injectionMethod || task.method,
        methodFactor: Number(props.methodFactor ?? task.methodFactor),
        location: props.location || task.location,
        channel: props.channel || task.channel,
        triggerStart: Number(props.triggerStart ?? task.triggerStart),
        duration: Number(props.duration ?? task.duration),
        intensity: Number(props.intensity ?? task.intensity),
        condition: props.condition || task.condition,
        note: props.note || task.note,
        templateSnapshot,
        deployedNodeId: faultNode.id,
      };
    });

    if (selectedElement.value.kind === 'node' && !graphNodes.value.some((item) => item.id === selectedElement.value.id)) {
      selectedElement.value = { kind: 'none', id: '' };
    }
    if (selectedElement.value.kind === 'edge' && !graphEdges.value.some((item) => item.id === selectedElement.value.id)) {
      selectedElement.value = { kind: 'none', id: '' };
    }
  }

  function setSelectedElement(payload) {
    selectedElement.value = payload || { kind: 'none', id: '' };
  }

  function markTaskUndeployedByNode(nodeId) {
    injectionTasks.value = injectionTasks.value.map((task) => (
      task.deployedNodeId === nodeId ? { ...task, deployedNodeId: '' } : task
    ));
  }

  function buildNodePatchFromInspector(group, patch) {
    if (group === 'system') {
      const inputCount = Math.max(1, Number(patch.inputCount ?? patch.inputPorts?.length ?? 1));
      const outputCount = Math.max(1, Number(patch.outputCount ?? patch.outputPorts?.length ?? 1));
      const { inputCount: _inputCount, outputCount: _outputCount, ...rest } = patch;
      return {
        ...rest,
        inputPorts: ensurePortList(rest.inputPorts, inputCount, 'in'),
        outputPorts: ensurePortList(rest.outputPorts, outputCount, 'out'),
      };
    }

    if (group === 'fault') {
      const triggerStart = Number(patch.triggerStart ?? 0);
      const duration = Number(patch.duration ?? 0);
      return {
        ...patch,
        subtitle: buildFaultSubtitle(patch.category, patch.mode, patch.injectionLayer, patch.injectionMethod),
        triggerEnd: triggerStart + duration,
        templateSnapshot: cloneTemplateSnapshot({
          id: patch.templateId,
          templateName: patch.templateName,
          category: patch.category,
          mode: patch.mode,
          mean: patch.mean,
          variance: patch.variance,
          bias: patch.bias,
          severity: patch.severity,
          accent: patch.accent,
          token: patch.token,
        }),
      };
    }

    return patch;
  }

  function normalizeFaultPreviewForNode(properties) {
    return buildQuickPreview(properties);
  }

  function exportWorkspaceSnapshot() {
    return {
      version: 'exp_0312_workspace_v2',
      exportedAt: new Date().toISOString(),
      templates: faultTemplates.value.map((item) => deepClone(item)),
      templateDraft: deepClone(templateDraft),
      taskDraft: deepClone(taskDraft),
      tasks: injectionTasks.value.map((item) => deepClone(item)),
      graph: {
        nodes: graphNodes.value.map((item) => deepClone(item)),
        edges: graphEdges.value.map((item) => deepClone(item)),
      },
    };
  }

  function importWorkspaceSnapshot(snapshot) {
    const templates = Array.isArray(snapshot?.templates) && snapshot.templates.length > 0
      ? snapshot.templates.map((item) => buildTemplateDraft(item))
      : initialFaultTemplates.map((item) => buildTemplateDraft(item));
    const templateMap = new Map(templates.map((item) => [item.id, item]));

    faultTemplates.value = templates;
    Object.assign(templateDraft, buildTemplateDraft(snapshot?.templateDraft || templates[0]));
    Object.assign(taskDraft, buildTaskDraft(templateMap.get(snapshot?.taskDraft?.templateId) || snapshot?.taskDraft || templates[0]));
    Object.assign(taskDraft, {
      ...taskDraft,
      ...deepClone(snapshot?.taskDraft || {}),
    });

    injectionTasks.value = Array.isArray(snapshot?.tasks)
      ? snapshot.tasks.map((task, index) => {
        const fallbackTemplate = templateMap.get(task.templateId) || templates[0];
        const templateSnapshot = cloneTemplateSnapshot(task.templateSnapshot || fallbackTemplate);
        const draft = buildTaskDraft(templateSnapshot);
        return {
          id: task.id || createId('task'),
          name: task.name || `${templateSnapshot.templateName}_任务${index + 1}`,
          templateId: task.templateId || templateSnapshot.id,
          templateName: task.templateName || templateSnapshot.templateName,
          category: task.category || templateSnapshot.category,
          mode: task.mode || templateSnapshot.mode,
          layer: task.layer || draft.layer,
          method: task.method || draft.method,
          methodFactor: Number(task.methodFactor ?? draft.methodFactor),
          location: task.location || draft.location,
          channel: task.channel || draft.channel,
          triggerStart: Number(task.triggerStart ?? draft.triggerStart),
          duration: Number(task.duration ?? draft.duration),
          intensity: Number(task.intensity ?? draft.intensity),
          condition: task.condition || draft.condition,
          note: task.note || '',
          deployedNodeId: task.deployedNodeId || '',
          templateSnapshot,
        };
      })
      : [];

    const normalizedGraph = normalizeGraphData(snapshot?.graph);
    graphNodes.value = normalizedGraph.nodes;
    graphEdges.value = normalizedGraph.edges;
    selectedElement.value = { kind: 'none', id: '' };

    return {
      nodes: graphNodes.value.map((item) => deepClone(item)),
      edges: graphEdges.value.map((item) => deepClone(item)),
    };
  }

  function resetWorkspace() {
    const initialTemplates = initialFaultTemplates.map((item) => buildTemplateDraft(item));
    faultTemplates.value = initialTemplates;
    Object.assign(templateDraft, buildTemplateDraft(initialTemplates[0]));
    Object.assign(taskDraft, buildTaskDraft(initialTemplates[0]));
    injectionTasks.value = [];
    const graph = createInitialGraph();
    graphNodes.value = graph.nodes.map((item) => deepClone(item));
    graphEdges.value = graph.edges.map((item) => deepClone(item));
    selectedElement.value = { kind: 'none', id: '' };
    return graph;
  }

  function applyScenarioPreset(presetId) {
    const mergedTemplates = mergeTemplatesWithInitial(faultTemplates.value);
    faultTemplates.value = mergedTemplates;
    Object.assign(templateDraft, buildTemplateDraft(mergedTemplates[0]));
    Object.assign(taskDraft, buildTaskDraft(mergedTemplates[0]));
    const scenario = scenarioGraphFromPreset(presetId, mergedTemplates);
    graphNodes.value = scenario.graph.nodes.map((item) => deepClone(item));
    graphEdges.value = scenario.graph.edges.map((item) => deepClone(item));
    injectionTasks.value = scenario.tasks.map((item) => deepClone(item));
    selectedElement.value = { kind: 'none', id: '' };
    return scenario.graph;
  }

  function clearAllTasks() {
    const removedNodeIds = injectionTasks.value
      .map((task) => task.deployedNodeId)
      .filter(Boolean);

    injectionTasks.value = [];
    graphNodes.value = graphNodes.value.filter((node) => node.properties?.group !== 'fault');
    graphEdges.value = graphEdges.value.filter((edge) => !removedNodeIds.includes(edge.sourceNodeId) && !removedNodeIds.includes(edge.targetNodeId));
    selectedElement.value = { kind: 'none', id: '' };

    return {
      removedNodeIds,
      graph: {
        nodes: graphNodes.value.map((item) => deepClone(item)),
        edges: graphEdges.value.map((item) => deepClone(item)),
      },
    };
  }

  return {
    faultCategoryOptions,
    injectionLayerOptions,
    triggerConditionOptions,
    faultTemplates,
    templateDraft,
    taskDraft,
    injectionTasks,
    graphNodes,
    graphEdges,
    selectedElement,
    selectedNode,
    selectedEdge,
    faultTypeOptions,
    currentTaskTemplate,
    currentTaskMethodOptions,
    currentMethodMeta,
    templatePreview,
    graphLocations,
    graphChannels,
    canvasCounts,
    libraryGroups,
    resetTemplateDraft,
    resetTaskDraft,
    saveTemplateDraft,
    duplicateTemplate,
    deleteTemplate,
    selectTemplateForModeling,
    loadTemplateIntoTask,
    createInjectionTask,
    createTaskFromTemplateSnapshot,
    cloneInjectionTask,
    removeInjectionTask,
    deployTaskToCanvas,
    deployAllTasksToCanvas,
    instantiateTemplateToTask,
    createPendingFaultDragDefinition,
    materializeDraggedFaultNode,
    createNodeDefinitionFromLibrary,
    syncGraph,
    setSelectedElement,
    markTaskUndeployedByNode,
    buildNodePatchFromInspector,
    normalizeFaultPreviewForNode,
    exportWorkspaceSnapshot,
    importWorkspaceSnapshot,
    resetWorkspace,
    applyScenarioPreset,
    clearAllTasks,
  };
}
