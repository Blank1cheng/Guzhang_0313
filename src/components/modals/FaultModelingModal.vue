<template>
  <a-modal
    :open="open"
    :footer="null"
    :width="760"
    centered
    :closable="false"
    :mask-closable="true"
    @cancel="emit('update:open', false)"
  >
    <div class="fault-modeling-modal">
      <div class="fault-modeling-modal__head">
        <div>
          <span class="fault-modeling-modal__kicker">故障建模</span>
          <h3>故障模式模板建模</h3>
          <p>在这里定义故障模板本身，关闭后返回主界面完成注入配置与执行。</p>
        </div>

        <a-button type="text" size="small" @click="emit('update:open', false)">
          关闭
        </a-button>
      </div>

      <div class="fault-modeling-modal__body">
        <section class="fault-modeling-modal__column">
          <div class="step-head">
            <span class="step-index">01</span>
            <div>
              <strong>选择大类与细分类型</strong>
              <p>先定义故障属于哪个大类，再挑选当前可建模的细分类型。</p>
            </div>
          </div>

          <div class="pill-group">
            <button
              v-for="item in faultCategoryOptions"
              :key="item.value"
              type="button"
              class="pill-button"
              :class="{ 'pill-button--active': draft.category === item.value }"
              @click="draft.category = item.value"
            >
              {{ item.label }}
            </button>
          </div>

          <div class="type-grid">
            <button
              v-for="item in typeOptions"
              :key="item.value"
              type="button"
              class="type-tile"
              :class="{ 'type-tile--active': draft.mode === item.value }"
              @click="draft.mode = item.value"
            >
              <strong>{{ item.label }}</strong>
              <span>{{ modeNarratives[item.value]?.brief || '选择后进入参数建模。' }}</span>
            </button>
          </div>

          <div class="mode-note-card">
            <strong>{{ modeNarratives[draft.mode]?.title || '故障模板说明' }}</strong>
            <p>{{ modeNarratives[draft.mode]?.detail || '当前模板会根据参数自动生成效果预览。' }}</p>
          </div>
        </section>

        <section class="fault-modeling-modal__column">
          <div class="step-head">
            <span class="step-index">02</span>
            <div>
              <strong>配置固有参数与效果预览</strong>
              <p>只设置故障自身参数，不涉及注入位置、时序和方法。</p>
            </div>
          </div>

          <div class="parameter-list">
            <div
              v-for="schema in parameterSchemas"
              :key="schema.key"
              class="parameter-row"
            >
              <div class="parameter-copy">
                <strong>{{ schema.label }}</strong>
                <span>{{ parameterHint(schema.key) }}</span>
              </div>
              <a-input-number
                v-model:value="draft[schema.key]"
                :step="schema.step || 0.1"
                :min="schema.min"
                :max="schema.max"
                style="width: 100%"
              />
            </div>
          </div>

          <div class="preview-card">
            <span>效果预览</span>
            <TrendChart :option="previewOption" height="60px" />
          </div>
        </section>

        <section class="fault-modeling-modal__column">
          <div class="step-head">
            <span class="step-index">03</span>
            <div>
              <strong>命名保存与模板库</strong>
              <p>保存后模板自动进入主界面的模板库和画布侧栏。</p>
            </div>
          </div>

          <div class="name-block">
            <label>模板名称</label>
            <a-input v-model:value="draft.templateName" placeholder="如：高斯噪声_方差5" />
            <small>建议使用“故障类型 + 关键参数”的命名方式。</small>
          </div>

          <div class="save-actions">
            <a-button @click="emit('reset')">新建草稿</a-button>
            <a-button type="primary" @click="emit('save')">保存到模板库</a-button>
          </div>

          <div class="saved-list">
            <div
              v-for="item in templates"
              :key="item.id"
              class="saved-item"
            >
              <span class="saved-item__tag" :class="`saved-item__tag--${item.category}`">
                {{ categoryLabel(item.category) }}
              </span>
              <strong>{{ item.templateName }}</strong>
              <small>{{ modeLabel(item.mode) }} · {{ templateSummary(item) }}</small>
            </div>
          </div>
        </section>
      </div>

      <div class="fault-modeling-modal__footer">
        <p>建模完成后关闭此窗口，返回主界面进行注入配置与执行。</p>
        <a-button @click="emit('update:open', false)">关闭返回主界面</a-button>
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { computed } from 'vue';

import TrendChart from '../charts/TrendChart.vue';
import { buildLineChartOption } from '../../utils/chartOption.js';
import { categoryLabel, modeLabel } from '../../utils/labels.js';
import {
  faultCategoryOptions,
  faultParameterSchemasByMode,
  faultTypeOptionsByCategory,
} from '../../data/faultCatalog.js';

const modeNarratives = {
  gauss: {
    title: '高斯噪声',
    brief: '适合模拟随机波动和测量噪声扩散。',
    detail: '重点关注均值、方差和整体严重度对波形抖动的影响。',
    parameterHints: {
      mean: '控制噪声中心偏移。',
      variance: '决定波动离散程度。',
      severity: '作为模板基础严重度，后续可在注入配置中放大或缩小。',
    },
  },
  impulse: {
    title: '脉冲噪声',
    brief: '适合模拟尖峰干扰和偶发突刺。',
    detail: '更强调幅值、触发门限和瞬时冲击对链路的影响。',
    parameterHints: {
      variance: '这里作为脉冲幅值使用。',
      bias: '这里作为触发门限使用。',
      severity: '控制模板基础影响强度。',
    },
  },
  bias: {
    title: '偏差故障',
    brief: '适合模拟固定偏置和标定偏移。',
    detail: '常用于物理层参数修改或电气层信号叠加，关注稳定偏移量。',
    parameterHints: {
      bias: '定义固定偏差量。',
      severity: '控制偏差基础强度。',
    },
  },
  drift: {
    title: '渐变故障',
    brief: '适合模拟缓慢漂移和退化过程。',
    detail: '通过起点和漂移斜率描述逐步恶化过程，适合长期趋势观察。',
    parameterHints: {
      bias: '表示漂移起点。',
      variance: '表示漂移斜率。',
      severity: '控制整体漂移影响强度。',
    },
  },
  interruption: {
    title: '状态突变',
    brief: '适合模拟链路中断和状态阻塞。',
    detail: '更偏向离散状态异常，常用于状态量和协议层验证。',
    parameterHints: {
      severity: '表示阻塞比例或状态突变强度。',
    },
  },
  stuck: {
    title: '卡位故障',
    brief: '适合模拟执行器卡滞和状态锁死。',
    detail: '重点是卡滞值与严重度，适合观察持续冻结的输出行为。',
    parameterHints: {
      bias: '表示锁定后的卡滞值。',
      severity: '控制卡位故障基础影响强度。',
    },
  },
};

const draft = defineModel('draft', { type: Object, required: true });

const props = defineProps({
  open: { type: Boolean, default: false },
  templates: { type: Array, required: true },
  preview: { type: Object, required: true },
});

const emit = defineEmits(['update:open', 'save', 'reset']);

const typeOptions = computed(() => (
  faultTypeOptionsByCategory[draft.value.category] || faultTypeOptionsByCategory.noise
));

const parameterSchemas = computed(() => (
  faultParameterSchemasByMode[draft.value.mode] || faultParameterSchemasByMode.gauss
));

const previewOption = computed(() => buildLineChartOption({
  xAxis: (Array.isArray(props.preview?.points) ? props.preview.points : []).map((item) => `${item}s`),
  series: [
    { name: '理想信号', data: props.preview?.normal || [], color: '#8aaee8', width: 2 },
    { name: '扰动后', data: props.preview?.faulty || [], color: '#ea8f88', width: 2.4 },
  ],
  showArea: true,
}));

function parameterHint(key) {
  return modeNarratives[draft.value.mode]?.parameterHints?.[key] || '该参数仅作用于当前故障模板本身。';
}

function templateSummary(item) {
  const parts = [];
  if (Number.isFinite(Number(item.mean)) && Number(item.mean) !== 0) parts.push(`均值 ${item.mean}`);
  if (Number.isFinite(Number(item.variance)) && Number(item.variance) !== 0) parts.push(`方差 ${item.variance}`);
  if (Number.isFinite(Number(item.bias)) && Number(item.bias) !== 0) parts.push(`幅值 ${item.bias}`);
  parts.push(`严重度 ${item.severity}`);
  return parts.join(' · ');
}
</script>

<style scoped>
.fault-modeling-modal {
  height: 620px;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
}

.fault-modeling-modal__head,
.fault-modeling-modal__footer {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.fault-modeling-modal__head {
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(214, 228, 248, 0.9);
}

.fault-modeling-modal__kicker {
  display: inline-block;
  margin-bottom: 6px;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(47, 128, 255, 0.1);
  color: #2f80ff;
  font-size: 12px;
  font-weight: 700;
}

.fault-modeling-modal__head h3 {
  margin: 0;
  color: #284b74;
  font-size: 22px;
  line-height: 1.2;
}

.fault-modeling-modal__head p,
.fault-modeling-modal__footer p {
  margin: 6px 0 0;
  color: #7088a7;
  font-size: 13px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.fault-modeling-modal__body {
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.fault-modeling-modal__column {
  min-height: 0;
  padding: 18px 16px;
  display: grid;
  align-content: start;
  gap: 12px;
  overflow-y: auto;
  border-right: 1px solid rgba(214, 228, 248, 0.9);
}

.fault-modeling-modal__column:last-child {
  border-right: none;
}

.step-head {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  align-items: start;
}

.step-index {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 10px;
  background: rgba(47, 128, 255, 0.1);
  color: #2f80ff;
  font-size: 12px;
  font-weight: 800;
}

.step-head strong {
  display: block;
  color: #31527c;
  font-size: 15px;
}

.step-head p {
  margin: 4px 0 0;
  color: #7890ad;
  font-size: 13px;
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.pill-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pill-button {
  padding: 7px 11px;
  border: 1px solid rgba(189, 213, 247, 0.92);
  border-radius: 999px;
  background: rgba(245, 249, 255, 0.8);
  color: #607997;
  font-size: 13px;
  cursor: pointer;
}

.pill-button--active {
  border-color: rgba(47, 128, 255, 0.78);
  background: rgba(47, 128, 255, 0.12);
  color: #2f80ff;
  font-weight: 700;
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.type-tile {
  padding: 10px;
  border: 1px solid rgba(189, 213, 247, 0.92);
  border-radius: 14px;
  background: rgba(245, 249, 255, 0.74);
  text-align: left;
  cursor: pointer;
}

.type-tile strong {
  display: block;
  color: #31527c;
  font-size: 14px;
}

.type-tile span {
  display: block;
  margin-top: 4px;
  color: #7890ad;
  font-size: 13px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.type-tile--active {
  border-color: rgba(47, 128, 255, 0.78);
  background: rgba(47, 128, 255, 0.1);
}

.mode-note-card,
.preview-card,
.saved-item,
.parameter-row {
  padding: 12px;
  border: 1px solid rgba(189, 213, 247, 0.88);
  border-radius: 16px;
  background: rgba(245, 249, 255, 0.78);
}

.mode-note-card strong,
.parameter-copy strong,
.saved-item strong {
  display: block;
  color: #31527c;
  font-size: 14px;
}

.mode-note-card p,
.parameter-copy span,
.saved-item small {
  margin: 4px 0 0;
  color: #7890ad;
  font-size: 13px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.parameter-list,
.saved-list {
  display: grid;
  gap: 8px;
}

.parameter-row {
  display: grid;
  grid-template-columns: 1fr 132px;
  gap: 10px;
  align-items: center;
}

.preview-card {
  overflow: hidden;
}

.preview-card span {
  display: block;
  margin-bottom: 8px;
  color: #6d88a8;
  font-size: 13px;
  font-weight: 700;
}

.name-block {
  display: grid;
  gap: 6px;
}

.name-block label {
  color: #4d6888;
  font-size: 13px;
  font-weight: 700;
}

.name-block small {
  color: #8398b3;
  font-size: 13px;
  overflow-wrap: anywhere;
}

.save-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.saved-item {
  display: grid;
  gap: 4px;
}

.saved-item__tag {
  justify-self: start;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
}

.saved-item__tag--noise {
  background: rgba(220, 90, 90, 0.14);
  color: #ca4a4a;
}

.saved-item__tag--analog {
  background: rgba(47, 128, 255, 0.12);
  color: #2f80ff;
}

.saved-item__tag--state {
  background: rgba(152, 97, 240, 0.14);
  color: #7f4dd3;
}

.fault-modeling-modal__footer {
  padding-top: 14px;
  border-top: 1px solid rgba(214, 228, 248, 0.9);
}
</style>
