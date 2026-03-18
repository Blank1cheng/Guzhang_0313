<template>
  <div ref="canvasRef" class="workbench-canvas"></div>
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
  fitView();
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
  fitView();
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
    grid: { size: 16, visible: true, type: 'dot', config: { color: 'rgba(154, 172, 196, 0.14)' } },
    keyboard: { enabled: true },
    autoExpand: false,
    background: { backgroundColor: '#fbfdff' },
  });

  registerStudioNodes(lf);
  lf.setTheme({
    polyline: {
      stroke: '#aabdd6',
      strokeWidth: 2.1,
      hoverStroke: '#88a7cd',
      selectedStroke: '#88a7cd',
      outlineColor: 'rgba(136, 167, 205, 0.14)',
    },
    anchor: {
      stroke: '#88a7cd',
      fill: '#ffffff',
      hoverFill: '#88a7cd',
      hoverStroke: '#88a7cd',
      r: 6,
    },
    nodeText: {
      color: '#304b69',
      fontSize: 12,
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
.workbench-canvas {
  height: 100%;
  min-height: 0;
  border-radius: 22px;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(189, 205, 227, 0.1), transparent 28%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.992), rgba(250, 252, 255, 0.98));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.78),
    inset 0 0 0 1px rgba(212, 222, 235, 0.9);
}
</style>
