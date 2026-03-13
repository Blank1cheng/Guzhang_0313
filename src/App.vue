<template>
  <div class="app-shell">
    <input
      ref="workspaceInputRef"
      type="file"
      accept=".json,application/json"
      hidden
      @change="handleWorkspaceFileChange"
    >

    <StudioHeader
      :runtime="runtime"
      :counts="canvasCounts"
      :task-count="injectionTasks.length"
      :scenario-presets="scenarioPresetOptions"
      :active-preset="activePresetId"
      @apply-preset="handleApplyPreset"
      @export-workspace="handleExportWorkspace"
      @import-workspace="openWorkspaceImport"
      @reset-workspace="handleResetWorkspace"
      @deploy-all-tasks="handleDeployAllTasks"
      @clear-tasks="handleClearTasks"
    />

    <section class="view-switch-card panel-card">
      <div class="view-switch-copy">
        <span class="view-switch-kicker">界面导航</span>
        <h2>{{ currentViewMeta.title }}</h2>
        <p>{{ currentViewMeta.description }}</p>
      </div>

      <div class="view-switch-tabs">
        <button
          v-for="item in viewOptions"
          :key="item.value"
          type="button"
          class="view-switch-tab"
          :class="{ 'view-switch-tab--active': activeView === item.value }"
          @click="activeView = item.value"
        >
          <span>{{ item.shortLabel }}</span>
          <strong>{{ item.label }}</strong>
        </button>
      </div>
    </section>

    <template v-if="activeView === 'overview'">
      <section class="overview-shell">
        <div class="workspace-grid">
          <ModuleLibrary
            :groups="libraryGroups"
            :counts="{ templates: faultTemplates.length, tasks: injectionTasks.length }"
            @drag-item="handleLibraryDrag"
            @add-item="handleLibraryAdd"
            @edit-template="openViewAndSelectTemplate"
            @delete-template="deleteTemplate"
          />

          <div class="workspace-center">
            <WorkbenchCanvas
              ref="canvasRef"
              :initial-graph="{ nodes: graphNodes, edges: graphEdges }"
              @graph-change="syncGraph"
              @selection-change="setSelectedElement"
              @element-deleted="handleCanvasElementDeleted"
              @node-added="handleCanvasNodeAdded"
            />
          </div>

          <PropertyInspector
            :selected-node="selectedNode"
            :selected-edge="selectedEdge"
            :fault-preview="faultPreview"
            @patch-node="handleInspectorPatch"
            @delete-selection="deleteCanvasSelection"
          />
        </div>

        <div class="module-overview-grid">
          <article
            v-for="card in overviewCards"
            :key="card.view"
            class="module-overview-card panel-card"
          >
            <div class="module-overview-head">
              <div>
                <span class="module-overview-index">{{ card.index }}</span>
                <h3>{{ card.title }}</h3>
              </div>
              <a-button size="small" type="primary" ghost @click="activeView = card.view">进入子界面</a-button>
            </div>

            <p class="module-overview-text">{{ card.description }}</p>

            <div class="module-overview-stats">
              <div
                v-for="stat in card.stats"
                :key="`${card.view}-${stat.label}`"
                class="module-overview-stat"
              >
                <span>{{ stat.label }}</span>
                <strong>{{ stat.value }}</strong>
              </div>
            </div>

            <div class="module-overview-foot">
              <span>{{ card.note }}</span>
            </div>
          </article>
        </div>
      </section>
    </template>

    <template v-else>
      <section class="focus-layout">
        <aside class="focus-aside panel-card">
          <span class="focus-kicker">{{ currentViewMeta.kicker }}</span>
          <h2>{{ currentViewMeta.title }}</h2>
          <p>{{ currentViewMeta.description }}</p>

          <div class="focus-stats">
            <div
              v-for="stat in currentViewMeta.stats"
              :key="`${activeView}-${stat.label}`"
              class="focus-stat-card"
            >
              <span>{{ stat.label }}</span>
              <strong>{{ stat.value }}</strong>
            </div>
          </div>

          <div class="focus-steps">
            <div
              v-for="(step, index) in currentViewMeta.steps"
              :key="`${activeView}-${index}`"
              class="focus-step"
            >
              <span>{{ index + 1 }}</span>
              <p>{{ step }}</p>
            </div>
          </div>

          <div class="focus-actions">
            <a-button type="primary" @click="activeView = 'overview'">返回总览工作台</a-button>
          </div>
        </aside>

        <div class="focus-main">
          <TemplateModelingPanel
            v-if="activeView === 'modeling'"
            class="panel-slot"
            v-model:draft="templateDraft"
            :templates="faultTemplates"
            :preview="templatePreview"
            focused
            @save="handleSaveTemplate"
            @reset="resetTemplateDraft"
            @duplicate="duplicateTemplate"
            @delete="deleteTemplate"
            @select-template="selectTemplateForModeling"
          />

          <InjectionTaskPanel
            v-else-if="activeView === 'task'"
            class="panel-slot"
            v-model:draft="taskDraft"
            :templates="faultTemplates"
            :tasks="injectionTasks"
            :current-template="currentTaskTemplate"
            :method-options="currentTaskMethodOptions"
            :method-meta="currentMethodMeta"
            :location-options="graphLocations"
            :channel-options="graphChannels"
            @use-template="loadTemplateIntoTask"
            @create-task="handleCreateTask"
            @deploy-task="handleDeployTask"
            @clone-task="cloneInjectionTask"
            @remove-task="handleRemoveTask"
            @deploy-all="handleDeployAllTasks"
            @clear-tasks="handleClearTasks"
          />

          <ExecutionPanel
            v-else-if="activeView === 'execution'"
            class="panel-slot"
            v-model:active-scope-id="activeScopeId"
            :runtime="runtime"
            :speed-options="speedOptions"
            :scope-options="scopeOptions"
            :live-scope-option="liveScopeOption"
            :current-signal-value="currentSignalValue"
            :task-rows="taskRows"
            :logs="logs"
            :overview="runtimeOverview"
            @start="start"
            @pause="pause"
            @step="stepOnce"
            @stop="stop"
            @change-speed="setTickIntervalMs"
            @clear-logs="clearLogs"
          />

          <AnalysisPanel
            v-else
            class="panel-slot"
            :analysis-option="analysisOption"
            :metrics="analysisMetrics"
            :task-rows="taskRows"
            @export="exportReport"
          />
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { message } from 'ant-design-vue';

import { scenarioPresetOptions } from './data/faultCatalog.js';
import { useSimulationRuntime } from './composables/useSimulationRuntime.js';
import { useStudioState } from './composables/useStudioState.js';
import { categoryLabel, layerLabel, modeLabel } from './utils/labels.js';
import StudioHeader from './components/layout/StudioHeader.vue';
import ModuleLibrary from './components/panels/ModuleLibrary.vue';
import TemplateModelingPanel from './components/panels/TemplateModelingPanel.vue';
import InjectionTaskPanel from './components/panels/InjectionTaskPanel.vue';
import ExecutionPanel from './components/panels/ExecutionPanel.vue';
import AnalysisPanel from './components/panels/AnalysisPanel.vue';
import PropertyInspector from './components/panels/PropertyInspector.vue';
import WorkbenchCanvas from './components/workbench/WorkbenchCanvas.vue';

const STORAGE_KEY = 'exp_0312_workspace_v2';

const viewOptions = [
  { value: 'overview', shortLabel: '总览', label: '主界面工作台' },
  { value: 'modeling', shortLabel: '模块1', label: '故障模式建模' },
  { value: 'task', shortLabel: '模块2', label: '故障注入配置' },
  { value: 'execution', shortLabel: '模块3', label: '故障注入执行' },
  { value: 'analysis', shortLabel: '模块4', label: '结果分析' },
];

const canvasRef = ref(null);
const workspaceInputRef = ref(null);
const activePresetId = ref('baseline');
const workspaceHydrated = ref(false);
const activeView = ref('overview');

const {
  faultTemplates,
  templateDraft,
  taskDraft,
  injectionTasks,
  graphNodes,
  graphEdges,
  selectedNode,
  selectedEdge,
  templatePreview,
  graphLocations,
  graphChannels,
  canvasCounts,
  libraryGroups,
  currentTaskMethodOptions,
  currentMethodMeta,
  currentTaskTemplate,
  resetTemplateDraft,
  saveTemplateDraft,
  duplicateTemplate,
  deleteTemplate,
  selectTemplateForModeling,
  loadTemplateIntoTask,
  createInjectionTask,
  cloneInjectionTask,
  removeInjectionTask,
  deployTaskToCanvas,
  deployAllTasksToCanvas,
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
} = useStudioState();

const {
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
} = useSimulationRuntime({
  graphNodes,
  graphEdges,
  injectionTasks,
});

const deployedTaskCount = computed(() => injectionTasks.value.filter((item) => item.deployedNodeId).length);
const currentFaultTemplateLabel = computed(() => `${categoryLabel(templateDraft.category)} / ${modeLabel(templateDraft.mode)}`);
const currentTaskLayerLabel = computed(() => layerLabel(taskDraft.layer));
const currentViewMeta = computed(() => {
  if (activeView.value === 'overview') {
    return {
      kicker: '主界面',
      title: '平台总览工作台',
      description: '总览页聚焦画布编排与属性联动，下方四张入口卡片用于切换到更聚焦的子界面。',
      stats: [],
      steps: [],
    };
  }

  if (activeView.value === 'modeling') {
    return {
      kicker: '模块 1',
      title: '故障模式建模',
      description: '只定义故障模板本身，不绑定位置和执行方式。先收敛模板，再投放到注入配置与画布。',
      stats: [
        { label: '已建模板', value: `${faultTemplates.value.length}` },
        { label: '当前分类', value: categoryLabel(templateDraft.category) },
        { label: '当前类型', value: modeLabel(templateDraft.mode) },
      ],
      steps: [
        '先命名模板，再选择模拟量故障、状态量故障或噪声干扰。',
        '只配置故障固有参数，例如均值、方差、偏差量或严重度。',
        '保存后模板进入左侧建模库，后续可以拖拽到画布或在模块 2 中复用。',
      ],
    };
  }

  if (activeView.value === 'task') {
    return {
      kicker: '模块 2',
      title: '故障注入配置',
      description: '从已建模板出发，确定注入层级、作用位置、注入方式与触发规则，形成可执行任务。',
      stats: [
        { label: '任务总数', value: `${injectionTasks.value.length}` },
        { label: '已部署任务', value: `${deployedTaskCount.value}` },
        { label: '当前层级', value: currentTaskLayerLabel.value },
      ],
      steps: [
        '优先从模板库选择模板，不在任务里重复修改故障固有参数。',
        '层级与方法联动，物理层、电气层、协议层分别绑定对应注入方式。',
        '加入任务列表后可以继续批量部署到总览画布，进行并发模拟。',
      ],
    };
  }

  if (activeView.value === 'execution') {
    return {
      kicker: '模块 3',
      title: '故障注入执行',
      description: '这里是运行控制中心，聚焦开始、暂停、单步推进、示波器切换和日志监控。',
      stats: [
        { label: '运行状态', value: runtime.status === 'running' ? '运行中' : runtime.status === 'paused' ? '已暂停' : '就绪' },
        { label: '仿真时间', value: `${runtime.simTime.toFixed(1)}s` },
        { label: '示波器数量', value: `${scopeOptions.value.length}` },
      ],
      steps: [
        '先确认任务已经部署到总览画布，再进入执行区启动运行。',
        '执行时重点看示波器切换、当前信号值和任务状态变化。',
        '日志控制台会记录触发、恢复和切换动作，便于后续回放。',
      ],
    };
  }

  return {
    kicker: '模块 4',
    title: '结果分析',
    description: '围绕模板、位置和方法三维度复盘注入结果，并区分模板核心参数与注入配置参数。',
    stats: [
      { label: '检出时间', value: analysisMetrics.value.detectionTime == null ? '--' : `${analysisMetrics.value.detectionTime}s` },
      { label: '隔离准确率', value: `${analysisMetrics.value.isolationAccuracy}%` },
      { label: '稳健性评分', value: `${analysisMetrics.value.robustness}` },
    ],
    steps: [
      '优先对比无故障、故障中、恢复后三段曲线，观察故障影响范围。',
      '再用指标评估检出时间、隔离准确率和稳健性表现。',
      '最后导出结构化报告，保留模板参数与注入参数的双层记录。',
    ],
  };
});

const overviewCards = computed(() => [
  {
    view: 'modeling',
    index: '01',
    title: '故障模式建模',
    description: '纯模板建模区，先定义故障是什么，再作为可复用模板进入建模库。',
    stats: [
      { label: '模板数量', value: `${faultTemplates.value.length}` },
      { label: '当前草稿', value: currentFaultTemplateLabel.value },
    ],
    note: '适合集中维护高斯噪声、偏置故障、状态突变等模板。',
  },
  {
    view: 'task',
    index: '02',
    title: '故障注入配置',
    description: '基于模板补充层级、位置、方法和触发规则，生成可部署任务。',
    stats: [
      { label: '任务数量', value: `${injectionTasks.value.length}` },
      { label: '已部署', value: `${deployedTaskCount.value}` },
    ],
    note: '这里负责“落地执行配置”，不再重复修改模板本体。',
  },
  {
    view: 'execution',
    index: '03',
    title: '故障注入执行',
    description: '运行控制中心，统一处理开始、暂停、单步推进、示波器切换和日志监控。',
    stats: [
      { label: '运行状态', value: runtime.status === 'running' ? '运行中' : runtime.status === 'paused' ? '已暂停' : '就绪' },
      { label: '当前时间', value: `${runtime.simTime.toFixed(1)}s` },
    ],
    note: '适合边运行边观察示波器和任务状态变化。',
  },
  {
    view: 'analysis',
    index: '04',
    title: '结果分析',
    description: '对比故障前、中、恢复后三段曲线，并输出 FDIR 相关指标。',
    stats: [
      { label: '检出时间', value: analysisMetrics.value.detectionTime == null ? '--' : `${analysisMetrics.value.detectionTime}s` },
      { label: '稳健性', value: `${analysisMetrics.value.robustness}` },
    ],
    note: '报告会区分模板核心参数和注入配置参数。',
  },
]);

const faultPreview = computed(() => (
  selectedNode.value?.properties?.group === 'fault'
    ? normalizeFaultPreviewForNode(selectedNode.value.properties)
    : null
));

function resetCanvasScene(graph) {
  nextTick(() => {
    canvasRef.value?.resetScene(graph);
  });
}

async function ensureOverviewCanvas() {
  if (canvasRef.value) return true;
  activeView.value = 'overview';
  await nextTick();
  await new Promise((resolve) => window.requestAnimationFrame(resolve));
  return Boolean(canvasRef.value);
}

function downloadJson(payload, fileName) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function handleSaveTemplate() {
  const payload = saveTemplateDraft();
  message.success(`模板已保存：${payload.templateName}`);
}

function handleCreateTask() {
  const task = createInjectionTask();
  if (!task) return;
  message.success(`已加入任务列表：${task.name}`);
}

async function handleDeployTask(taskId) {
  const task = injectionTasks.value.find((item) => item.id === taskId);
  if (task?.deployedNodeId && graphNodes.value.some((node) => node.id === task.deployedNodeId)) {
    message.info('该任务已经部署到画布。');
    return;
  }

  const definition = deployTaskToCanvas(taskId);
  if (!definition) return;
  const ready = await ensureOverviewCanvas();
  if (!ready) {
    message.error('总览画布未就绪，请重试。');
    return;
  }
  canvasRef.value?.addNodeFromDefinition(definition);
  message.success('任务已加入画布。');
}

async function handleDeployAllTasks() {
  const definitions = deployAllTasksToCanvas();
  if (!definitions.length) {
    message.info('当前没有待部署任务。');
    return;
  }

  const ready = await ensureOverviewCanvas();
  if (!ready) {
    message.error('总览画布未就绪，请重试。');
    return;
  }

  definitions.forEach((definition) => {
    canvasRef.value?.addNodeFromDefinition(definition);
  });
  message.success(`已批量部署 ${definitions.length} 个任务。`);
}

async function handleRemoveTask(taskId) {
  const task = removeInjectionTask(taskId);
  if (task?.deployedNodeId) {
    const ready = await ensureOverviewCanvas();
    if (!ready) {
      message.error('总览画布未就绪，请重试。');
      return;
    }
    canvasRef.value?.removeNodeById(task.deployedNodeId);
  }
}

function handleClearTasks() {
  const result = clearAllTasks();
  resetCanvasScene(result.graph);
  message.success('任务列表和故障节点已清空。');
}

function handleLibraryDrag(item) {
  if (!canvasRef.value) return;
  const definition = item.libraryType === 'fault-template'
    ? createPendingFaultDragDefinition(item.templateId)
    : createNodeDefinitionFromLibrary(item);
  if (!definition) return;
  canvasRef.value.startDrag(definition);
}

function handleLibraryAdd(item) {
  if (!canvasRef.value) return;
  const definition = createNodeDefinitionFromLibrary(item);
  if (!definition) return;
  canvasRef.value.addNodeFromDefinition(definition);
}

function openViewAndSelectTemplate(templateId) {
  activeView.value = 'modeling';
  selectTemplateForModeling(templateId);
}

function handleCanvasElementDeleted(payload) {
  if (payload.kind === 'node') {
    markTaskUndeployedByNode(payload.id);
  }
}

function handleCanvasNodeAdded(payload) {
  const node = payload?.data;
  const pendingTemplateId = node?.properties?.pendingTemplateId;
  if (!pendingTemplateId || !canvasRef.value) return;
  const patch = materializeDraggedFaultNode(node.id, pendingTemplateId);
  if (!patch) return;
  canvasRef.value.applyNodePatch(node.id, patch);
  message.success(`已从模板拖拽生成任务：${patch.templateName}`);
}

function handleInspectorPatch(patch) {
  if (!selectedNode.value || !canvasRef.value) return;
  const group = selectedNode.value.properties?.group;
  const normalizedPatch = buildNodePatchFromInspector(group, {
    ...selectedNode.value.properties,
    ...patch,
  });
  canvasRef.value.applyNodePatch(selectedNode.value.id, normalizedPatch);
}

function deleteCanvasSelection() {
  canvasRef.value?.deleteCurrentSelection();
}

function exportReport() {
  downloadJson(exportReportPayload(), 'exp_0312_fault_report.json');
  message.success('结构化报告已导出。');
}

function handleExportWorkspace() {
  downloadJson(exportWorkspaceSnapshot(), 'exp_0312_workspace.json');
  message.success('工作区快照已导出。');
}

function openWorkspaceImport() {
  workspaceInputRef.value?.click();
}

async function handleWorkspaceFileChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const snapshot = JSON.parse(text);
    const graph = importWorkspaceSnapshot(snapshot);
    activePresetId.value = 'baseline';
    resetCanvasScene(graph);
    message.success(`工作区已导入：${file.name}`);
  } catch {
    message.error('工作区导入失败，请检查 JSON 文件格式。');
  } finally {
    event.target.value = '';
  }
}

function handleResetWorkspace() {
  const graph = resetWorkspace();
  activePresetId.value = 'baseline';
  clearLogs();
  stop();
  resetCanvasScene(graph);
  message.success('工作区已重置为初始状态。');
}

function handleApplyPreset(presetId) {
  activePresetId.value = presetId;
  const graph = applyScenarioPreset(presetId);
  clearLogs();
  stop();
  resetCanvasScene(graph);
  const presetName = scenarioPresetOptions.find((item) => item.value === presetId)?.label || '场景';
  message.success(`已加载预设：${presetName}`);
}

watch(
  () => JSON.stringify(exportWorkspaceSnapshot()),
  (serialized) => {
    if (!workspaceHydrated.value) return;
    window.localStorage.setItem(STORAGE_KEY, serialized);
  },
);

onMounted(() => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const graph = importWorkspaceSnapshot(JSON.parse(raw));
      resetCanvasScene(graph);
      message.success('已恢复上次工作区。');
    }
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  } finally {
    workspaceHydrated.value = true;
  }
});
</script>
