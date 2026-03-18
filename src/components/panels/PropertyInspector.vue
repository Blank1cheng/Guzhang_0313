<template>
  <section class="panel-card inspector-panel">
    <div class="panel-head">
      <div>
        <h3>属性面板</h3>
        <p>查看当前选中节点或连线的关键参数，并直接微调配置。</p>
      </div>
      <a-button danger @click="emit('delete-selection')">删除选中</a-button>
    </div>

    <div v-if="selectedNode" class="inspector-stack">
      <div class="summary-card">
        <span>{{ groupLabel(selectedNode.properties.group) }}</span>
        <strong>{{ selectedNode.properties.name }}</strong>
      </div>

      <div class="field-block">
        <label>名称</label>
        <a-input :value="selectedNode.properties.name" @change="patchTop('name', $event.target.value)" />
      </div>

      <template v-if="selectedNode.properties.group === 'source'">
        <div class="field-block">
          <label>信号类型</label>
          <a-select :value="selectedNode.properties.sourceConfig?.waveType" @change="patchSourceConfig('waveType', $event)">
            <a-select-option v-for="item in sourceModeOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </a-select-option>
          </a-select>
        </div>

        <div class="field-grid">
          <div class="field-block">
            <label>幅值</label>
            <a-input-number :value="selectedNode.properties.sourceConfig?.amplitude" style="width: 100%" @change="patchSourceConfig('amplitude', $event)" />
          </div>
          <div class="field-block">
            <label>频率</label>
            <a-input-number :value="selectedNode.properties.sourceConfig?.frequency" :step="0.01" style="width: 100%" @change="patchSourceConfig('frequency', $event)" />
          </div>
          <div class="field-block">
            <label>偏移</label>
            <a-input-number :value="selectedNode.properties.sourceConfig?.offset" style="width: 100%" @change="patchSourceConfig('offset', $event)" />
          </div>
          <div class="field-block">
            <label>相位</label>
            <a-input-number :value="selectedNode.properties.sourceConfig?.phase" :step="0.1" style="width: 100%" @change="patchSourceConfig('phase', $event)" />
          </div>
        </div>
      </template>

      <template v-else-if="selectedNode.properties.group === 'system'">
        <div class="field-block">
          <label>流程模式</label>
          <a-select :value="selectedNode.properties.processConfig?.mode" @change="patchProcessConfig('mode', $event)">
            <a-select-option v-for="item in processModeOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </a-select-option>
          </a-select>
        </div>

        <div class="field-grid">
          <div class="field-block">
            <label>输入端口数</label>
            <a-input-number :value="selectedNode.properties.inputPorts?.length || 1" :min="1" :max="4" style="width: 100%" @change="patchPortCount('inputCount', $event)" />
          </div>
          <div class="field-block">
            <label>输出端口数</label>
            <a-input-number :value="selectedNode.properties.outputPorts?.length || 1" :min="1" :max="3" style="width: 100%" @change="patchPortCount('outputCount', $event)" />
          </div>
          <div class="field-block">
            <label>增益</label>
            <a-input-number :value="selectedNode.properties.processConfig?.gain" :step="0.05" style="width: 100%" @change="patchProcessConfig('gain', $event)" />
          </div>
          <div class="field-block">
            <label>偏置</label>
            <a-input-number :value="selectedNode.properties.processConfig?.offset" :step="0.1" style="width: 100%" @change="patchProcessConfig('offset', $event)" />
          </div>
        </div>
      </template>

      <template v-else-if="selectedNode.properties.group === 'scope'">
        <div class="field-block">
          <label>采样窗口</label>
          <a-input-number :value="selectedNode.properties.scopeConfig?.sampleWindow" :min="20" :max="200" style="width: 100%" @change="patchScopeConfig('sampleWindow', $event)" />
        </div>
      </template>

      <template v-else-if="selectedNode.properties.group === 'fault'">
        <div class="field-grid">
          <div class="summary-card summary-card--mini">
            <span>故障模式</span>
            <strong>{{ categoryLabel(selectedNode.properties.category) }}</strong>
          </div>
          <div class="summary-card summary-card--mini">
            <span>故障类型</span>
            <strong>{{ modeLabel(selectedNode.properties.mode) }}</strong>
          </div>
          <div class="summary-card summary-card--mini">
            <span>注入层级</span>
            <strong>{{ layerLabel(selectedNode.properties.injectionLayer) }}</strong>
          </div>
          <div class="summary-card summary-card--mini">
            <span>注入方式</span>
            <strong>{{ injectionMethodLabel(selectedNode.properties.injectionMethod) }}</strong>
          </div>
        </div>

        <div class="field-block">
          <label>作用位置</label>
          <a-input :value="selectedNode.properties.location" @change="patchTop('location', $event.target.value)" />
        </div>

        <div class="field-grid">
          <div class="field-block">
            <label>注入通道</label>
            <a-input :value="selectedNode.properties.channel" @change="patchTop('channel', $event.target.value)" />
          </div>
          <div class="field-block">
            <label>方法系数</label>
            <a-input-number :value="selectedNode.properties.methodFactor" :step="0.05" :min="0.1" style="width: 100%" @change="patchTop('methodFactor', $event)" />
          </div>
          <div class="field-block">
            <label>触发时间</label>
            <a-input-number :value="selectedNode.properties.triggerStart" :step="0.5" :min="0" style="width: 100%" @change="patchFaultWindow('triggerStart', $event)" />
          </div>
          <div class="field-block">
            <label>持续时长</label>
            <a-input-number :value="selectedNode.properties.duration" :step="0.5" :min="0.5" style="width: 100%" @change="patchFaultWindow('duration', $event)" />
          </div>
          <div class="field-block">
            <label>强度系数</label>
            <a-input-number :value="selectedNode.properties.intensity" :step="0.1" :min="0.1" style="width: 100%" @change="patchTop('intensity', $event)" />
          </div>
          <div class="field-block">
            <label>基础严重度</label>
            <a-input-number :value="selectedNode.properties.severity" :step="0.01" :min="0.1" :max="1.2" style="width: 100%" @change="patchTop('severity', $event)" />
          </div>
        </div>

        <div class="field-grid">
          <div class="field-block">
            <label>均值</label>
            <a-input-number :value="selectedNode.properties.mean" :step="0.1" style="width: 100%" @change="patchTop('mean', $event)" />
          </div>
          <div class="field-block">
            <label>方差 / 幅值</label>
            <a-input-number :value="selectedNode.properties.variance" :step="0.1" style="width: 100%" @change="patchTop('variance', $event)" />
          </div>
          <div class="field-block">
            <label>偏差量</label>
            <a-input-number :value="selectedNode.properties.bias" :step="0.1" style="width: 100%" @change="patchTop('bias', $event)" />
          </div>
        </div>

        <div v-if="faultPreview" class="fault-preview-card">
          <div class="chart-head">
            <strong>故障效果预览</strong>
            <span>{{ selectedNode.properties.location }} - {{ layerLabel(selectedNode.properties.injectionLayer) }}</span>
          </div>
          <TrendChart :option="faultPreviewOption" height="210px" />
        </div>
      </template>
    </div>

    <div v-else-if="selectedEdge" class="empty-card">
      <strong>已选中连线</strong>
      <p>当前连线：{{ selectedEdge.sourceNodeId }} -> {{ selectedEdge.targetNodeId }}。系统会按端口关系自动解析信号流向。</p>
    </div>

    <div v-else class="empty-card">
      <strong>未选择节点</strong>
      <p>点击画布中的模块或连线后，这里会显示对应属性。故障节点会展示模式、类型、层级、方式和触发窗口。</p>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';

import TrendChart from '../charts/TrendChart.vue';
import { buildLineChartOption } from '../../utils/chartOption.js';
import { processModeOptions, sourceModeOptions } from '../../data/faultCatalog.js';
import { categoryLabel, groupLabel, injectionMethodLabel, layerLabel, modeLabel } from '../../utils/labels.js';

const props = defineProps({
  selectedNode: { type: Object, default: null },
  selectedEdge: { type: Object, default: null },
  faultPreview: { type: Object, default: null },
});

const emit = defineEmits(['patch-node', 'delete-selection']);

const faultPreviewOption = computed(() => {
  if (!props.faultPreview) return buildLineChartOption({ xAxis: [], series: [] });
  return buildLineChartOption({
    xAxis: props.faultPreview.points.map((item) => `${item}s`),
    series: [
      { name: '理想信号', data: props.faultPreview.normal, color: '#9cb0cc', width: 2.1 },
      { name: '故障输出', data: props.faultPreview.faulty, color: '#2f80ff', width: 2.7 },
    ],
    showArea: true,
  });
});

function patchTop(key, value) {
  emit('patch-node', { [key]: value });
}

function patchSourceConfig(key, value) {
  emit('patch-node', {
    sourceConfig: {
      ...(props.selectedNode?.properties?.sourceConfig || {}),
      [key]: value,
    },
  });
}

function patchProcessConfig(key, value) {
  emit('patch-node', {
    processConfig: {
      ...(props.selectedNode?.properties?.processConfig || {}),
      [key]: value,
    },
  });
}

function patchScopeConfig(key, value) {
  emit('patch-node', {
    scopeConfig: {
      ...(props.selectedNode?.properties?.scopeConfig || {}),
      [key]: value,
    },
  });
}

function patchPortCount(key, value) {
  emit('patch-node', { [key]: value });
}

function patchFaultWindow(key, value) {
  const triggerStart = key === 'triggerStart' ? Number(value) : Number(props.selectedNode?.properties?.triggerStart ?? 0);
  const duration = key === 'duration' ? Number(value) : Number(props.selectedNode?.properties?.duration ?? 0);
  emit('patch-node', {
    triggerStart,
    duration,
    triggerEnd: triggerStart + duration,
  });
}
</script>

<style scoped>
.inspector-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 14px;
  height: 100%;
  min-height: 0;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.panel-head h3 {
  margin: 0 0 4px;
  color: #2d4e78;
  font-size: 17px;
}

.panel-head p {
  margin: 0;
  color: #7088a7;
  font-size: 12px;
  line-height: 1.65;
}

.inspector-stack {
  display: grid;
  gap: 10px;
  min-height: 0;
  overflow: auto;
  padding-right: 4px;
}

.summary-card,
.empty-card,
.fault-preview-card {
  padding: 14px;
  border: 1px solid rgba(188, 212, 247, 0.9);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 10px 20px rgba(60, 99, 169, 0.04);
}

.summary-card span,
.empty-card span {
  display: block;
  color: #728aa8;
  font-size: 12px;
  line-height: 1.5;
}

.summary-card strong,
.empty-card strong {
  display: block;
  margin-top: 6px;
  color: #2b4d76;
  font-size: 16px;
}

.summary-card--mini strong {
  font-size: 14px;
}

.empty-card p {
  margin: 6px 0;
  color: #557090;
  font-size: 12px;
  line-height: 1.6;
}

.field-block {
  display: grid;
  gap: 6px;
}

.field-block label {
  color: #4d6888;
  font-size: 12px;
  font-weight: 700;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.chart-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.chart-head strong {
  color: #31527c;
  font-size: 13px;
}

.chart-head span {
  color: #7a90ac;
  font-size: 12px;
}

@media (max-width: 980px) {
  .field-grid {
    grid-template-columns: 1fr;
  }
}
</style>
