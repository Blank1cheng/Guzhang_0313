<template>
  <section :class="['panel-card', 'modeling-panel', { 'modeling-panel--focused': focused }]">
    <div class="modeling-shell">
      <aside class="editor-rail">
        <div class="editor-hero">
          <div class="editor-hero__topline">
            <span class="draft-pill">当前草稿</span>
            <span class="hero-count">模板 {{ templateRows.length }}</span>
          </div>

          <strong>{{ draft.templateName || '未命名模板' }}</strong>

          <div class="editor-hero__meta">
            <span class="meta-chip meta-chip--soft">{{ categoryLabel(draft.category) }}</span>
            <span class="meta-chip meta-chip--soft">{{ modeLabel(draft.mode) }}</span>
            <span class="meta-chip meta-chip--soft">{{ parameterSchemas.length }} 项参数</span>
          </div>

          <p>在这里定义模板本体；注入位置、方式和时序仍在总览页部署。</p>

          <div class="editor-hero__actions">
            <a-button @click="handleReset">新建模板</a-button>
            <a-button type="primary" @click="emit('save')">保存模板</a-button>
          </div>
        </div>

        <article class="editor-section">
          <div class="section-head">
            <strong>基础设置</strong>
            <span>模板名称与故障分类</span>
          </div>

          <label class="field-stack">
            <span>模板名称</span>
            <a-input v-model:value="draft.templateName" placeholder="如：高斯噪声_方差5" />
          </label>

          <div class="field-stack">
            <span>故障分类</span>
            <a-radio-group v-model:value="draft.category" button-style="solid" class="full-group">
              <a-radio-button
                v-for="item in faultCategoryOptions"
                :key="item.value"
                :value="item.value"
              >
                {{ item.label }}
              </a-radio-button>
            </a-radio-group>
          </div>
        </article>

        <article class="editor-section editor-section--modes">
          <div class="section-head">
            <strong>模式选择</strong>
            <span>当前分类下可用模板模式</span>
          </div>

          <div class="mode-list">
            <button
              v-for="item in typeOptions"
              :key="item.value"
              type="button"
              class="mode-row"
              :class="{ 'mode-row--active': draft.mode === item.value }"
              @click="draft.mode = item.value"
            >
              <div class="mode-row__head">
                <strong>{{ item.label }}</strong>
                <span>{{ draft.mode === item.value ? '当前' : '切换' }}</span>
              </div>
              <small>{{ modeNarratives[item.value]?.brief || '按当前分类切换可用参数。' }}</small>
            </button>
          </div>
        </article>
      </aside>

      <div class="workspace-stage">
        <article class="workspace-card workspace-card--preview">
          <div class="workspace-head">
            <div>
              <strong>模板预览</strong>
              <span>实时查看模板扰动后的波形与关键指标</span>
            </div>

            <a-button size="small" @click="activeWorkspaceTab = 'registry'">查看模板库</a-button>
          </div>

          <div class="preview-strip">
            <div class="preview-summary__item">
              <span>分类</span>
              <strong>{{ categoryLabel(draft.category) }}</strong>
            </div>
            <div class="preview-summary__item">
              <span>模式</span>
              <strong>{{ modeLabel(draft.mode) }}</strong>
            </div>
            <div class="preview-summary__item">
              <span>峰值</span>
              <strong>{{ previewStats.peak }}</strong>
            </div>
            <div class="preview-summary__item">
              <span>波动</span>
              <strong>{{ previewStats.span }}</strong>
            </div>
          </div>

          <p class="preview-caption"><strong>{{ activeNarrative.title }}</strong>{{ activeNarrative.brief }}</p>

          <TrendChart :option="previewOption" :height="chartHeight" />
        </article>

        <article class="workspace-card workspace-card--detail">
          <div class="workspace-head workspace-head--detail">
            <div>
              <strong>{{ activeWorkspaceTab === 'parameters' ? '参数配置' : '已建模板' }}</strong>
              <span>{{ workspaceDescription }}</span>
            </div>

            <div class="workspace-tabs">
              <button
                type="button"
                class="workspace-tab"
                :class="{ 'workspace-tab--active': activeWorkspaceTab === 'parameters' }"
                @click="activeWorkspaceTab = 'parameters'"
              >
                参数配置
              </button>
              <button
                type="button"
                class="workspace-tab"
                :class="{ 'workspace-tab--active': activeWorkspaceTab === 'registry' }"
                @click="activeWorkspaceTab = 'registry'"
              >
                已建模板
              </button>
            </div>
          </div>

          <div v-if="activeWorkspaceTab === 'parameters'" class="detail-pane detail-pane--parameters">
            <div class="parameter-toolbar">
              <div class="parameter-toolbar__copy">
                <span>模板本体参数</span>
                <strong>{{ modeLabel(draft.mode) }}</strong>
                <small>{{ parameterSchemas.length }} 项参数会直接作用到当前模板预览。</small>
              </div>

              <a-button size="small" @click="activeWorkspaceTab = 'registry'">切换到模板库</a-button>
            </div>

            <div class="parameter-grid">
              <div v-for="schema in parameterSchemas" :key="schema.key" class="parameter-card">
                <div class="parameter-card__head">
                  <div class="parameter-copy">
                    <strong>{{ schema.label }}</strong>
                    <small>{{ parameterHint(schema.key) }}</small>
                  </div>
                  <span class="parameter-unit">{{ schema.unit || '无单位' }}</span>
                </div>

                <a-input-number
                  v-model:value="draft[schema.key]"
                  :step="schema.step || 0.1"
                  :min="schema.min"
                  :max="schema.max"
                  class="parameter-input"
                />
              </div>
            </div>
          </div>

          <div v-else class="detail-pane detail-pane--registry">
            <div class="registry-toolbar">
              <label class="field-stack field-stack--toolbar">
                <span>快速载入</span>
                <a-select
                  :value="draft.id || undefined"
                  allow-clear
                  placeholder="选择已有模板继续编辑"
                  @change="handleSelectTemplate"
                >
                  <a-select-option v-for="item in templateRows" :key="item.id" :value="item.id">
                    {{ item.templateName }}
                  </a-select-option>
                </a-select>
              </label>

              <div class="registry-summary">
                <span>当前草稿</span>
                <strong>{{ draft.templateName || '未命名模板' }}</strong>
                <small>{{ categoryLabel(draft.category) }} / {{ modeLabel(draft.mode) }}</small>
              </div>
            </div>

            <div v-if="templateRows.length" class="registry-grid">
              <div
                v-for="item in templateRows"
                :key="item.id"
                class="template-card"
                :class="{ 'template-card--active': item.id === draft.id }"
                tabindex="0"
                @click="handleSelectTemplate(item.id)"
                @keydown.enter.prevent="handleSelectTemplate(item.id)"
                @keydown.space.prevent="handleSelectTemplate(item.id)"
              >
                <div class="template-card__head">
                  <div class="template-card__identity">
                    <span class="template-card__token">{{ item.token || 'TM' }}</span>
                    <div class="template-card__copy">
                      <strong>{{ item.templateName }}</strong>
                      <small>{{ categoryLabel(item.category) }} / {{ modeLabel(item.mode) }}</small>
                    </div>
                  </div>

                  <span class="template-card__state">{{ item.id === draft.id ? '当前' : '可载入' }}</span>
                </div>

                <div class="template-card__tags">
                  <span class="template-chip">{{ categoryLabel(item.category) }}</span>
                  <span class="template-chip">{{ modeLabel(item.mode) }}</span>
                </div>

                <p class="template-card__summary">{{ summarizeTemplate(item) }}</p>

                <div class="template-card__actions">
                  <a-button size="small" type="primary" ghost @click.stop="handleSelectTemplate(item.id)">载入</a-button>
                  <a-button size="small" @click.stop="emit('duplicate', item.id)">复制</a-button>
                  <a-button size="small" danger @click.stop="emit('delete', item.id)">删除</a-button>
                </div>
              </div>
            </div>

            <div v-else class="empty-state">当前没有已保存模板。</div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue';

import TrendChart from '../charts/TrendChart.vue';
import { buildLineChartOption } from '../../utils/chartOption.js';
import { categoryLabel, modeLabel } from '../../utils/labels.js';
import { faultCategoryOptions, faultParameterSchemasByMode, faultTypeOptionsByCategory } from '../../data/faultCatalog.js';

const modeNarratives = {
  gauss: {
    title: '高斯噪声模板',
    brief: '适合模拟随机波动和测量噪声。',
    detail: '重点关注均值、方差和严重度对信号起伏的影响。',
    parameterHints: {
      mean: '控制噪声中心偏移，通常保持在零附近。',
      variance: '决定离散程度，数值越大起伏越明显。',
      severity: '作为模板基础严重度，后续可在注入页继续放大。',
    },
  },
  impulse: {
    title: '脉冲噪声模板',
    brief: '适合模拟尖峰干扰和偶发突刺。',
    detail: '强调幅值与阈值，适合观察瞬时尖峰对链路的影响。',
    parameterHints: {
      variance: '这里表示脉冲幅值，决定单次尖峰高度。',
      bias: '作为触发阈值，影响脉冲出现条件。',
      severity: '控制脉冲模板的基础影响强度。',
    },
  },
  bias: {
    title: '偏置故障模板',
    brief: '适合模拟固定偏差和标定漂移。',
    detail: '常用于物理量偏置或电气层叠加，关注持续偏移量。',
    parameterHints: {
      bias: '定义固定偏差量，是偏置故障的核心参数。',
      severity: '控制偏置模板的基础严重度。',
    },
  },
  drift: {
    title: '渐变故障模板',
    brief: '适合模拟缓慢漂移和退化过程。',
    detail: '通过起点和斜率描述逐步恶化趋势，适合长期观察。',
    parameterHints: {
      bias: '表示漂移起点或初始偏差。',
      variance: '这里表示漂移斜率，决定变化速度。',
      severity: '控制整体漂移影响强度。',
    },
  },
  interruption: {
    title: '状态突变模板',
    brief: '适合模拟链路中断和状态阻塞。',
    detail: '更偏向离散状态异常，适合协议层或状态量验证。',
    parameterHints: {
      severity: '表示阻塞比例或状态突变强度。',
    },
  },
  stuck: {
    title: '卡位故障模板',
    brief: '适合模拟执行器卡滞和状态锁死。',
    detail: '重点是卡滞值与基础严重度，可结合具体链路验证。',
    parameterHints: {
      bias: '表示锁定后的卡滞值。',
      severity: '控制卡位故障基础影响强度。',
    },
  },
};

const draft = defineModel('draft', { type: Object, required: true });

const props = defineProps({
  templates: { type: Array, required: true },
  preview: { type: Object, required: true },
  focused: { type: Boolean, default: false },
});

const emit = defineEmits(['save', 'reset', 'duplicate', 'delete', 'select-template']);

const activeWorkspaceTab = ref('parameters');

const typeOptions = computed(() => faultTypeOptionsByCategory[draft.value.category] || faultTypeOptionsByCategory.noise);
const parameterSchemas = computed(() => faultParameterSchemasByMode[draft.value.mode] || faultParameterSchemasByMode.gauss);
const templateRows = computed(() => props.templates.slice().reverse());
const activeNarrative = computed(() => modeNarratives[draft.value.mode] || {
  title: '模板说明',
  brief: '当前模式将根据参数生成模板预览。',
  detail: '当前模板将根据已选参数生成预览曲线。',
});
const chartHeight = computed(() => (props.focused ? '178px' : '166px'));
const workspaceDescription = computed(() => {
  if (activeWorkspaceTab.value === 'parameters') {
    return '把模板本体参数集中在这里，预览会同步反馈当前扰动效果。';
  }

  return `${templateRows.value.length} 个已建模板，可直接载入、复制和删除。`;
});
const previewOption = computed(() => buildLineChartOption({
  xAxis: props.preview.points.map((item) => `${item}s`),
  series: [
    { name: '理想信号', data: props.preview.normal, color: '#96abca', width: 2.1 },
    { name: '模板扰动', data: props.preview.faulty, color: '#367cff', width: 2.6 },
  ],
  showArea: true,
}));
const previewStats = computed(() => {
  const faulty = props.preview.faulty || [];
  if (!faulty.length) {
    return { peak: '--', span: '--', bias: '--' };
  }
  const peak = Math.max(...faulty.map((item) => Math.abs(Number(item) || 0)));
  const min = Math.min(...faulty.map((item) => Number(item) || 0));
  const max = Math.max(...faulty.map((item) => Number(item) || 0));
  const mean = faulty.reduce((total, item) => total + Number(item || 0), 0) / faulty.length;
  return {
    peak: peak.toFixed(2),
    span: (max - min).toFixed(2),
    bias: mean.toFixed(2),
  };
});

function handleReset() {
  activeWorkspaceTab.value = 'parameters';
  emit('reset');
}

function handleSelectTemplate(id) {
  emit('select-template', id);
  activeWorkspaceTab.value = 'parameters';
}

function parameterHint(key) {
  return modeNarratives[draft.value.mode]?.parameterHints?.[key] || '该参数仅作用于当前模板本体。';
}

function summarizeTemplate(template) {
  const schemas = faultParameterSchemasByMode[template.mode] || [];
  const metrics = schemas
    .map((schema) => {
      const value = Number(template[schema.key]);
      return Number.isFinite(value) && value !== 0 ? `${schema.label} ${value}` : '';
    })
    .filter(Boolean)
    .slice(0, 3);

  if (Number.isFinite(Number(template.severity))) {
    metrics.push(`严重度 ${template.severity}`);
  }

  return metrics.join(' / ') || '等待配置参数';
}
</script>

<style scoped>
.modeling-panel {
  height: 100%;
  min-height: 0;
  padding: 18px 20px;
  background:
    radial-gradient(circle at top right, rgba(128, 179, 255, 0.14), transparent 24%),
    radial-gradient(circle at bottom left, rgba(197, 220, 255, 0.11), transparent 24%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.985), rgba(247, 250, 254, 0.96));
  box-sizing: border-box;
  overflow: hidden;
}

.modeling-shell {
  display: grid;
  grid-template-columns: minmax(300px, 348px) minmax(0, 1fr);
  gap: 18px;
  height: 100%;
  min-height: 0;
}

.editor-rail,
.workspace-stage {
  min-height: 0;
}

.editor-rail {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 14px;
}

.editor-hero,
.editor-section,
.workspace-card {
  display: grid;
  gap: 14px;
  padding: 16px;
  border: 1px solid rgba(191, 209, 237, 0.84);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.88);
  min-height: 0;
}

.editor-hero {
  align-content: start;
  gap: 12px;
  background:
    linear-gradient(180deg, rgba(247, 250, 255, 0.98), rgba(241, 247, 255, 0.95));
}

.editor-hero__topline,
.editor-hero__meta,
.editor-hero__actions,
.template-card__head,
.template-card__tags,
.template-card__actions,
.workspace-tabs,
.parameter-toolbar,
.registry-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.draft-pill,
.hero-count,
.template-card__token,
.template-chip,
.template-card__state {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
}

.draft-pill,
.hero-count,
.template-card__state,
.template-chip {
  padding: 5px 10px;
}

.draft-pill,
.template-card__token {
  background: rgba(79, 134, 231, 0.12);
  color: var(--primary, #4f86e7);
}

.hero-count,
.template-chip,
.meta-chip--soft,
.parameter-unit {
  background: rgba(223, 233, 248, 0.74);
  color: var(--primary, #4f86e7);
}

.editor-hero strong {
  color: var(--text-strong, #17365d);
  font-size: 24px;
  line-height: 1.14;
}

.editor-hero p,
.section-head span,
.field-stack span,
.preview-summary__item span,
.preview-caption,
.parameter-copy small,
.parameter-toolbar__copy span,
.parameter-toolbar__copy small,
.registry-summary span,
.registry-summary small,
.template-card__copy small,
.template-card__summary,
.empty-state,
.workspace-head span {
  color: var(--muted, #6783a7);
  font-size: 12px;
  line-height: 1.55;
}

.editor-hero p,
.preview-caption,
.template-card__summary {
  margin: 0;
}

.section-head,
.workspace-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}

.section-head strong,
.workspace-head strong,
.preview-summary__item strong,
.preview-caption strong,
.parameter-copy strong,
.parameter-toolbar__copy strong,
.registry-summary strong,
.template-card__copy strong,
.mode-row__head strong {
  color: var(--text-strong, #17365d);
}

.section-head strong,
.workspace-head strong {
  font-size: 16px;
}

.field-stack {
  display: grid;
  gap: 8px;
}

.editor-section {
  align-content: start;
}

.editor-section--modes {
  min-height: 0;
}

.mode-list {
  display: grid;
  gap: 10px;
  min-height: 0;
}

.mode-row {
  display: grid;
  gap: 6px;
  padding: 12px 14px;
  border: 1px solid rgba(188, 208, 239, 0.86);
  border-radius: 18px;
  background: rgba(248, 251, 255, 0.88);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.mode-row:hover,
.mode-row--active {
  transform: translateY(-1px);
  border-color: rgba(110, 154, 226, 0.9);
  box-shadow: 0 10px 20px rgba(88, 109, 140, 0.08);
}

.mode-row--active {
  background:
    linear-gradient(180deg, rgba(246, 249, 255, 0.98), rgba(236, 244, 255, 0.95));
}

.mode-row__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.mode-row__head span {
  color: var(--primary, #4f86e7);
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}

.mode-row small {
  color: var(--muted, #6783a7);
  line-height: 1.55;
}

.workspace-stage {
  display: grid;
  grid-template-rows: minmax(270px, 0.88fr) minmax(0, 1.12fr);
  gap: 16px;
}

.workspace-card--preview {
  grid-template-rows: auto auto auto minmax(0, 1fr);
  overflow: hidden;
}

.workspace-card--detail {
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
}

.preview-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.preview-summary__item {
  display: grid;
  gap: 2px;
  padding: 9px 12px;
  border: 1px solid rgba(188, 208, 239, 0.84);
  border-radius: 15px;
  background: rgba(247, 250, 255, 0.92);
}

.preview-caption {
  margin: 0;
  color: var(--muted, #6783a7);
  font-size: 12px;
  line-height: 1.55;
}

.preview-caption strong {
  margin-right: 8px;
  color: var(--text-strong, #17365d);
}

.workspace-head--detail {
  align-items: center;
}

.workspace-tabs {
  justify-content: flex-end;
}

.workspace-tab {
  padding: 8px 14px;
  border: 1px solid rgba(188, 208, 239, 0.88);
  border-radius: 999px;
  background: rgba(247, 250, 255, 0.86);
  color: var(--muted, #6783a7);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: border-color 0.18s ease, background 0.18s ease, color 0.18s ease;
}

.workspace-tab--active {
  border-color: transparent;
  background: linear-gradient(180deg, #8fb1e8, #6e95d7);
  color: #f7fbff;
}

.detail-pane {
  min-height: 0;
  display: grid;
  gap: 14px;
}

.detail-pane--parameters,
.detail-pane--registry {
  grid-template-rows: auto minmax(0, 1fr);
}

.parameter-toolbar {
  justify-content: space-between;
  padding: 14px 16px;
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(248, 251, 255, 0.94), rgba(255, 255, 255, 0.9));
  border: 1px solid rgba(188, 208, 239, 0.78);
}

.parameter-toolbar__copy {
  display: grid;
  gap: 3px;
}

.parameter-grid,
.registry-grid {
  display: grid;
  gap: 12px;
  min-height: 0;
  overflow: auto;
  padding-right: 4px;
}

.parameter-grid {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  align-content: start;
}

.parameter-card {
  display: grid;
  gap: 12px;
  align-content: start;
  padding: 14px;
  border: 1px solid rgba(188, 208, 239, 0.84);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(250, 252, 255, 0.96), rgba(255, 255, 255, 0.92));
}

.parameter-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.parameter-copy {
  display: grid;
  gap: 4px;
}

.parameter-unit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.parameter-input {
  width: 100%;
}

.registry-toolbar {
  justify-content: space-between;
  padding: 12px 0 2px;
}

.field-stack--toolbar {
  flex: 1 1 320px;
  min-width: 0;
}

.registry-summary {
  display: grid;
  gap: 4px;
  justify-items: end;
}

.registry-grid {
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  align-content: start;
}

.template-card {
  display: grid;
  gap: 12px;
  align-content: start;
  padding: 15px;
  border: 1px solid rgba(188, 208, 239, 0.78);
  border-radius: 18px;
  background: rgba(249, 252, 255, 0.8);
  cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
  outline: none;
}

.template-card:hover,
.template-card:focus-visible,
.template-card--active {
  transform: translateY(-1px);
  border-color: rgba(110, 154, 226, 0.88);
  box-shadow: 0 10px 18px rgba(88, 109, 140, 0.08);
}

.template-card--active {
  background:
    linear-gradient(180deg, rgba(247, 250, 255, 0.98), rgba(239, 246, 255, 0.94));
}

.template-card__head {
  justify-content: space-between;
  align-items: flex-start;
}

.template-card__identity {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  min-width: 0;
}

.template-card__token {
  min-width: 38px;
  min-height: 28px;
  padding: 0 10px;
}

.template-card__copy {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.template-card__copy strong,
.template-card__copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template-card__summary {
  min-height: 38px;
}

.template-card__actions {
  justify-content: flex-end;
}

.empty-state {
  display: grid;
  place-items: center;
  min-height: 180px;
  border: 1px dashed rgba(188, 208, 239, 0.88);
  border-radius: 18px;
  background: rgba(248, 251, 255, 0.72);
}

:deep(.ant-btn) {
  min-width: 72px;
}

:deep(.ant-input),
:deep(.ant-input-number),
:deep(.ant-radio-button-wrapper) {
  font-family: inherit;
}

:deep(.ant-input),
:deep(.ant-input-number),
:deep(.ant-input-number-input),
:deep(.ant-radio-button-wrapper),
:deep(.ant-select-selector) {
  color: var(--text, #2b4a71);
}

:deep(.ant-input),
:deep(.ant-input-number),
:deep(.ant-select-selector) {
  border-color: rgba(193, 214, 244, 0.94);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: none;
}

:deep(.ant-input) {
  min-height: 42px;
  padding-inline: 12px;
}

:deep(.ant-input::placeholder),
:deep(.ant-input-number-input::placeholder) {
  color: rgba(111, 135, 168, 0.76);
}

:deep(.ant-input-number) {
  height: 42px;
}

:deep(.ant-input-number-input) {
  height: 100%;
}

:deep(.ant-select-selector) {
  min-height: 42px;
  padding-inline: 12px;
}

:deep(.ant-select-single .ant-select-selector .ant-select-selection-item),
:deep(.ant-select-single .ant-select-selector .ant-select-selection-placeholder) {
  line-height: 40px;
}

:deep(.ant-radio-group) {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

:deep(.ant-radio-button-wrapper) {
  height: 34px;
  line-height: 32px;
  padding-inline: 14px;
  border-radius: 999px;
  border-inline-start-width: 1px;
  border-color: rgba(188, 208, 239, 0.88);
  background: rgba(248, 251, 255, 0.86);
  font-size: 12px;
  font-weight: 700;
  box-shadow: none;
}

:deep(.ant-radio-button-wrapper:not(:first-child)::before) {
  display: none;
}

:deep(.ant-radio-button-wrapper:hover) {
  color: var(--primary, #346dcd);
}

:deep(.ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled)) {
  border-color: transparent;
  background: linear-gradient(180deg, #99b3d4, #708fbd);
  color: #f7fbff;
  box-shadow: 0 10px 18px rgba(87, 109, 141, 0.12);
}

@media (max-width: 1360px) {
  .modeling-panel {
    overflow: auto;
  }

  .modeling-shell {
    grid-template-columns: minmax(284px, 320px) minmax(0, 1fr);
    height: auto;
    min-height: 100%;
  }

  .workspace-stage {
    grid-template-rows: auto auto;
  }

  .preview-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1180px) {
  .modeling-shell {
    grid-template-columns: 1fr;
  }

  .editor-rail {
    grid-template-rows: auto auto auto;
  }

  .workspace-stage {
    grid-template-rows: auto minmax(0, 1fr);
  }

  .workspace-card--preview {
    grid-template-rows: auto auto auto auto;
  }
}

@media (max-width: 900px) {
  .modeling-panel {
    padding: 16px;
  }

  .workspace-head,
  .registry-toolbar,
  .parameter-toolbar {
    align-items: flex-start;
  }

  .workspace-tabs,
  .template-card__actions {
    justify-content: flex-start;
  }

  .preview-strip,
  .parameter-grid,
  .registry-grid {
    grid-template-columns: 1fr;
  }

  .registry-summary {
    justify-items: start;
  }
}
</style>
