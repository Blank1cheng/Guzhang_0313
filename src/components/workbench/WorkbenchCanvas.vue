<template>
  <div class="workbench-shell">
    <div class="workbench-toolbar">
      <a-space>
        <a-button size="small" @click="fitView">适配视图</a-button>
        <a-button size="small" @click="deleteCurrentSelection">删除选中</a-button>
      </a-space>
      <span class="workbench-hint">将左侧模块拖入画布，拖线时请从输出端口连接到输入端口。</span>
    </div>
    <div ref="canvasRef" class="workbench-canvas"></div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import LogicFlow from '@logicflow/core';
import { DndPanel, SelectionSelect } from '@logicflow/extension';

import registerStudioNodes from './registerStudioNodes.js';
import { defaultPortsByGroup, parseAnchorPort } from '../../utils/faultMath.js';

LogicFlow.use(DndPanel);
LogicFlow.use(SelectionSelect);

const props = defineProps({
  initialGraph: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['graph-change', 'selection-change', 'element-deleted', 'node-added']);

const canvasRef = ref(null);
let lf = null;
let selectedNodeId = '';
let selectedEdgeId = '';

function emitGraphChange() {
  if (!lf) return;
  emit('graph-change', lf.getGraphData());
}

function clearSelection() {
  selectedNodeId = '';
  selectedEdgeId = '';
  emit('selection-change', { kind: 'none', id: '' });
}

function bindEdgePorts(edgeData) {
  if (!lf || !edgeData?.id) return;
  const sourceNode = lf.getNodeDataById(edgeData.sourceNodeId);
  const targetNode = lf.getNodeDataById(edgeData.targetNodeId);
  const sourcePort = parseAnchorPort(
    edgeData.sourceAnchorId,
    defaultPortsByGroup(sourceNode?.properties?.group).outputPorts[0] || 'signal',
  );
  const targetPort = parseAnchorPort(
    edgeData.targetAnchorId,
    defaultPortsByGroup(targetNode?.properties?.group).inputPorts[0] || 'signal',
  );
  lf.setProperties(edgeData.id, {
    ...(edgeData.properties || {}),
    sourcePort,
    targetPort,
    relationType: 'data',
  });
  lf.updateText(edgeData.id, '');
}

function deleteCurrentSelection() {
  if (!lf) return;

  if (selectedEdgeId) {
    const edgeId = selectedEdgeId;
    selectedEdgeId = '';
    lf.deleteEdge(edgeId);
    emit('element-deleted', { kind: 'edge', id: edgeId });
    emitGraphChange();
    clearSelection();
    return;
  }

  if (selectedNodeId) {
    const nodeId = selectedNodeId;
    selectedNodeId = '';
    lf.deleteNode(nodeId);
    emit('element-deleted', { kind: 'node', id: nodeId });
    emitGraphChange();
    clearSelection();
  }
}

function fitView() {
  if (!lf) return;
  lf.translateCenter();
  lf.fitView();
}

function addNodeFromDefinition(definition) {
  if (!lf || !definition) return null;
  const node = lf.addNode(definition);
  emitGraphChange();
  return node;
}

function startDrag(definition) {
  if (!lf || !definition) return;
  lf.dnd.startDrag({
    type: definition.type || 'studio-node',
    text: definition.text || '',
    properties: definition.properties,
  });
}

function applyNodePatch(nodeId, patch) {
  if (!lf || !nodeId || !patch) return;
  lf.setProperties(nodeId, patch);
  lf.updateText(nodeId, '');
  emitGraphChange();
}

function removeNodeById(nodeId) {
  if (!lf || !nodeId) return;
  lf.deleteNode(nodeId);
  emitGraphChange();
}

function resetScene(graphData) {
  if (!lf) return;
  lf.render(graphData);
  emitGraphChange();
}

function handleDeleteKeydown(event) {
  if (event.key !== 'Delete' && event.key !== 'Backspace') return;
  deleteCurrentSelection();
}

function initLogicFlow() {
  if (!canvasRef.value) return;

  lf = new LogicFlow({
    container: canvasRef.value,
    grid: { size: 12, visible: true, type: 'dot', config: { color: 'rgba(89, 141, 211, 0.16)' } },
    keyboard: { enabled: true },
    autoExpand: false,
    background: { backgroundColor: '#fbfdff' },
  });

  registerStudioNodes(lf);
  lf.setTheme({
    polyline: {
      stroke: '#90b6ff',
      strokeWidth: 2.2,
      hoverStroke: '#2f80ff',
      selectedStroke: '#2f80ff',
    },
  });

  if (lf.extension?.selectionSelect?.openSelectionSelect) {
    lf.extension.selectionSelect.openSelectionSelect();
  }

  lf.render(props.initialGraph);
  fitView();

  (lf.getGraphData().edges || []).forEach((edge) => bindEdgePorts(edge));

  lf.on('node:add', ({ data }) => {
    selectedNodeId = data.id;
    selectedEdgeId = '';
    emit('node-added', { data });
    emit('selection-change', { kind: 'node', id: data.id, data });
    emitGraphChange();
  });

  lf.on('node:click', ({ data }) => {
    selectedNodeId = data.id;
    selectedEdgeId = '';
    emit('selection-change', { kind: 'node', id: data.id, data });
  });

  lf.on('edge:add', ({ data }) => {
    bindEdgePorts(data);
    selectedNodeId = '';
    selectedEdgeId = data.id;
    emit('selection-change', { kind: 'edge', id: data.id, data });
    emitGraphChange();
  });

  lf.on('edge:click', ({ data }) => {
    selectedNodeId = '';
    selectedEdgeId = data.id;
    emit('selection-change', { kind: 'edge', id: data.id, data });
  });

  lf.on('blank:click', () => {
    clearSelection();
  });

  lf.on('node:delete', ({ data }) => {
    emit('element-deleted', { kind: 'node', id: data?.id || selectedNodeId });
    clearSelection();
    emitGraphChange();
  });

  lf.on('edge:delete', ({ data }) => {
    emit('element-deleted', { kind: 'edge', id: data?.id || selectedEdgeId });
    clearSelection();
    emitGraphChange();
  });

  emitGraphChange();
}

defineExpose({
  startDrag,
  addNodeFromDefinition,
  applyNodePatch,
  deleteCurrentSelection,
  removeNodeById,
  resetScene,
  fitView,
});

onMounted(() => {
  initLogicFlow();
  window.addEventListener('keydown', handleDeleteKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleDeleteKeydown);
  if (lf) {
    lf.destroy();
    lf = null;
  }
});
</script>

<style scoped>
.workbench-shell {
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 8px;
  height: 100%;
  min-height: 0;
}

.workbench-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px 12px;
  border: 1px solid rgba(185, 211, 247, 0.86);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 10px 22px rgba(53, 92, 162, 0.06);
}

.workbench-hint {
  color: #6b84a4;
  font-size: 11px;
  line-height: 1.5;
}

.workbench-canvas {
  height: 100%;
  min-height: 0;
  border-radius: 22px;
  border: 1px solid rgba(191, 214, 246, 0.95);
  overflow: hidden;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
}
</style>
