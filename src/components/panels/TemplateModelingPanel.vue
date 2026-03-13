<template>
  <section :class="['panel-card', 'modeling-panel', { 'modeling-panel--focused': focused }]">
    <div class="panel-head">
      <div>
        <h3>模块 1：故障模式建模</h3>
        <p>这里专门定义故障模板本身。先收敛模式分类和核心参数，再保存为可复用模板。</p>
      </div>
      <a-space>
        <a-button @click="emit('reset')">新建模板</a-button>
        <a-button type="primary" @click="emit('save')">保存模板</a-button>
      </a-space>
    </div>

    <div class="workflow-strip">
      <div class="workflow-step-card">
        <span>步骤 1</span>
        <strong>建立模板草稿</strong>
        <p>模板名只表示故障模式，不包含位置和注入方式。</p>
      </div>
      <div class="workflow-step-card">
        <span>步骤 2</span>
        <strong>选择模式并配置参数</strong>
        <p>按大类与类型联动，只展示该模式真正需要的固有参数。</p>
      </div>
      <div class="workflow-step-card">
        <span>步骤 3</span>
        <strong>保存到模板库</strong>
        <p>保存后模板会进入左侧故障建模库，并可在模块 2 中复用。</p>
      </div>
    </div>

    <div class="modeling-grid">
      <div class="section-stack">
        <article class="section-card section-card--hero">
          <div class="section-head">
            <span class="section-index">01</span>
            <div>
              <strong>模板管理</strong>
              <p>先定义模板名称和草稿状态，再进入后续建模步骤。</p>
            </div>
          </div>

          <div class="hero-grid">
            <div class="field-block">
              <label>模板名称</label>
              <a-input v-model:value="draft.templateName" placeholder="如：高斯噪声_方差5" />
            </div>

            <div class="hero-stats">
              <div class="hero-stat">
                <span>已建模板</span>
                <strong>{{ templates.length }}</strong>
              </div>
              <div class="hero-stat">
                <span>当前分类</span>
                <strong>{{ categoryLabel(draft.category) }}</strong>
              </div>
              <div class="hero-stat">
                <span>当前类型</span>
                <strong>{{ modeLabel(draft.mode) }}</strong>
              </div>
            </div>
          </div>

          <div class="section-inline-note">
            <span>命名建议：使用“故障类型 + 关键参数”形式，例如“高斯噪声_方差5”或“偏置故障_18”。</span>
          </div>
        </article>

        <article class="section-card">
          <div class="section-head">
            <span class="section-index">02</span>
            <div>
              <strong>模式选择区</strong>
              <p>先选故障大类，再选细分类型，避免在参数区混入无关字段。</p>
            </div>
          </div>

          <div class="field-block">
            <label>故障大类</label>
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
              <span>{{ modeNarratives[item.value]?.brief || '参数随模式自动切换。' }}</span>
            </button>
          </div>
        </article>

        <article class="section-card">
          <div class="section-head">
            <span class="section-index">03</span>
            <div>
              <strong>参数配置区</strong>
              <p>这里只维护故障本体的固有参数，不在这里指定注入位置和时序。</p>
            </div>
          </div>

          <div class="parameter-list">
            <div v-for="schema in parameterSchemas" :key="schema.key" class="parameter-row">
              <div class="parameter-copy">
                <strong>{{ schema.label }}</strong>
                <span>{{ schema.unit || '无单位' }}</span>
                <small>{{ parameterHint(schema.key) }}</small>
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

          <div class="mode-summary">
            <div class="summary-pill">{{ categoryLabel(draft.category) }}</div>
            <div class="summary-pill">{{ modeLabel(draft.mode) }}</div>
            <div class="summary-pill">参数项 {{ parameterSchemas.length }}</div>
          </div>
        </article>
      </div>

      <div class="preview-stack">
        <article class="section-card preview-card">
          <div class="section-head">
            <span class="section-index">04</span>
            <div>
              <strong>模板预览区</strong>
              <p>实时对比理想信号与模板扰动后的曲线差异，检查模板参数是否合理。</p>
            </div>
          </div>

          <div class="preview-banner">
            <div class="preview-badge">
              <span>当前模式</span>
              <strong>{{ categoryLabel(draft.category) }}</strong>
            </div>
            <div class="preview-badge">
              <span>故障类型</span>
              <strong>{{ modeLabel(draft.mode) }}</strong>
            </div>
            <div class="preview-badge">
              <span>模板名称</span>
              <strong>{{ draft.templateName || '未命名模板' }}</strong>
            </div>
          </div>

          <TrendChart :option="previewOption" :height="chartHeight" />

          <div class="mode-callout">
            <strong>{{ modeNarratives[draft.mode]?.title || '模板说明' }}</strong>
            <p>{{ modeNarratives[draft.mode]?.detail || '当前模板将根据已选参数生成故障预览曲线。' }}</p>
          </div>
        </article>

        <article class="section-card template-list-card">
          <div class="section-head">
            <span class="section-index">05</span>
            <div>
              <strong>已建模板列表</strong>
              <p>模板会进入左侧建模库，可拖拽到画布，也可回载继续编辑。</p>
            </div>
          </div>

          <div class="template-toolbar">
            <span>共 {{ templates.length }} 个模板</span>
            <span>保存后自动进入故障建模库</span>
          </div>

          <div class="template-list">
            <div v-for="item in templates" :key="item.id" class="template-item">
              <div class="template-copy">
                <strong>{{ item.templateName }}</strong>
                <span>{{ categoryLabel(item.category) }} / {{ modeLabel(item.mode) }}</span>
              </div>
              <div class="template-actions">
                <a-button size="small" @click="emit('select-template', item.id)">载入</a-button>
                <a-button size="small" @click="emit('duplicate', item.id)">复制</a-button>
                <a-button size="small" danger @click="emit('delete', item.id)">删除</a-button>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';

import TrendChart from '../charts/TrendChart.vue';
import { buildLineChartOption } from '../../utils/chartOption.js';
import { categoryLabel, modeLabel } from '../../utils/labels.js';
import { faultCategoryOptions, faultParameterSchemasByMode, faultTypeOptionsByCategory } from '../../data/faultCatalog.js';

const modeNarratives = {
  gauss: {
    title: '高斯噪声模板',
    brief: '用于模拟随机波动和测量噪声扩散。',
    detail: '适合电气层信号叠加式注入，重点关注均值、方差和整体严重度对波形起伏的影响。',
    parameterHints: {
      mean: '控制噪声中心偏移，通常保持在零附近。',
      variance: '决定波动离散程度，数值越大，波形起伏越明显。',
      severity: '作为模板基础严重度，后续可在模块 2 中再放大或缩小。',
    },
  },
  impulse: {
    title: '脉冲噪声模板',
    brief: '适合模拟尖峰干扰和偶发突刺。',
    detail: '脉冲噪声更强调幅值与触发阈值，适合观察异常峰值对链路的瞬态影响。',
    parameterHints: {
      variance: '这里表示脉冲幅值，决定单次尖峰高度。',
      bias: '作为触发阈值，影响脉冲出现条件。',
      severity: '控制脉冲模板的基础影响强度。',
    },
  },
  bias: {
    title: '偏置故障模板',
    brief: '适合模拟固定偏差、标定偏移。',
    detail: '常用于物理层参数修改或电气层偏置叠加，关注稳定偏移量对输出的持续影响。',
    parameterHints: {
      bias: '定义固定偏差量，是偏置故障的核心参数。',
      severity: '控制偏置模板的基础严重度。',
    },
  },
  drift: {
    title: '渐变故障模板',
    brief: '适合模拟缓慢漂移和退化过程。',
    detail: '通过起点与漂移斜率描述逐步恶化过程，适合长期趋势观察。',
    parameterHints: {
      bias: '表示漂移起点或初始偏差。',
      variance: '这里表示漂移斜率，决定变化速度。',
      severity: '控制整体漂移影响强度。',
    },
  },
  interruption: {
    title: '状态突变模板',
    brief: '适合模拟链路中断和状态阻塞。',
    detail: '更偏向离散状态异常，通常与协议层或状态量验证关联。',
    parameterHints: {
      severity: '表示阻塞比例或状态突变强度。',
    },
  },
  stuck: {
    title: '卡位故障模板',
    brief: '适合模拟执行器卡滞和状态锁死。',
    detail: '重点是卡滞值与基础严重度，后续可结合具体链路进行执行验证。',
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

const typeOptions = computed(() => faultTypeOptionsByCategory[draft.value.category] || faultTypeOptionsByCategory.noise);
const parameterSchemas = computed(() => faultParameterSchemasByMode[draft.value.mode] || faultParameterSchemasByMode.gauss);
const chartHeight = computed(() => (props.focused ? '250px' : '220px'));
const previewOption = computed(() => buildLineChartOption({
  xAxis: props.preview.points.map((item) => `${item}s`),
  series: [
    { name: '理想信号', data: props.preview.normal, color: '#95a9c8', width: 2.1 },
    { name: '模板扰动', data: props.preview.faulty, color: '#2f80ff', width: 2.8 },
  ],
  showArea: true,
}));

function parameterHint(key) {
  return modeNarratives[draft.value.mode]?.parameterHints?.[key] || '该参数仅作用于当前故障模板本身。';
}
</script>

<style scoped>
.modeling-panel {
  display: grid;
  gap: 14px;
}

.modeling-panel--focused {
  gap: 16px;
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
  font-size: 18px;
}

.panel-head p {
  margin: 0;
  color: #7088a7;
  font-size: 12px;
  line-height: 1.65;
}

.workflow-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.workflow-step-card {
  padding: 12px;
  border: 1px solid rgba(189, 213, 247, 0.92);
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(245, 249, 255, 0.95), rgba(255, 255, 255, 0.84));
}

.workflow-step-card span {
  display: inline-block;
  margin-bottom: 8px;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(47, 128, 255, 0.1);
  color: #2f80ff;
  font-size: 11px;
  font-weight: 700;
}

.workflow-step-card strong {
  display: block;
  color: #31527c;
  font-size: 14px;
}

.workflow-step-card p {
  margin: 6px 0 0;
  color: #7890ad;
  font-size: 11px;
  line-height: 1.55;
}

.modeling-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.02fr) minmax(0, 0.98fr);
  gap: 14px;
}

.modeling-panel--focused .modeling-grid {
  grid-template-columns: minmax(0, 1.08fr) minmax(0, 0.92fr);
}

.section-stack,
.preview-stack {
  display: grid;
  gap: 12px;
}

.section-card {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid rgba(189, 213, 247, 0.92);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.86);
}

.section-card--hero {
  background:
    radial-gradient(circle at top right, rgba(86, 144, 255, 0.12), transparent 34%),
    rgba(255, 255, 255, 0.9);
}

.section-head {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  align-items: start;
}

.section-index {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background: rgba(47, 128, 255, 0.1);
  color: #2f80ff;
  font-size: 11px;
  font-weight: 800;
}

.section-head strong {
  display: block;
  color: #31527c;
  font-size: 14px;
}

.section-head p {
  margin: 4px 0 0;
  color: #7890ad;
  font-size: 11px;
  line-height: 1.55;
}

.hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 10px;
  align-items: start;
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.hero-stat {
  padding: 12px;
  border-radius: 16px;
  background: rgba(245, 249, 255, 0.86);
}

.hero-stat span {
  display: block;
  margin-bottom: 6px;
  color: #7a90ac;
  font-size: 11px;
}

.hero-stat strong {
  color: #2b4d76;
  font-size: 16px;
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

.full-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.section-inline-note {
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(245, 249, 255, 0.86);
  color: #7390ad;
  font-size: 11px;
  line-height: 1.55;
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.type-tile {
  padding: 12px;
  border: 1px solid rgba(189, 213, 247, 0.92);
  border-radius: 16px;
  background: rgba(245, 249, 255, 0.7);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.type-tile strong {
  display: block;
  color: #31527c;
  font-size: 13px;
}

.type-tile span {
  display: block;
  margin-top: 4px;
  color: #7890ad;
  font-size: 11px;
  line-height: 1.5;
}

.type-tile--active {
  border-color: rgba(47, 128, 255, 0.8);
  box-shadow: 0 10px 24px rgba(67, 121, 217, 0.12);
  transform: translateY(-1px);
}

.parameter-list {
  display: grid;
  gap: 8px;
}

.parameter-row {
  display: grid;
  grid-template-columns: 1fr 156px;
  gap: 10px;
  align-items: center;
  padding: 12px;
  border-radius: 16px;
  background: rgba(245, 249, 255, 0.86);
}

.parameter-copy strong {
  display: block;
  color: #31527c;
  font-size: 12px;
}

.parameter-copy span,
.parameter-copy small {
  display: block;
  margin-top: 3px;
  color: #8197b2;
  font-size: 11px;
  line-height: 1.5;
}

.parameter-input {
  width: 100%;
}

.mode-summary {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.summary-pill {
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(47, 128, 255, 0.1);
  color: #2f80ff;
  font-size: 11px;
  font-weight: 700;
}

.preview-banner {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.preview-badge,
.mode-callout {
  padding: 12px;
  border-radius: 16px;
  background: rgba(245, 249, 255, 0.86);
}

.preview-badge span {
  display: block;
  margin-bottom: 4px;
  color: #7890ad;
  font-size: 11px;
}

.preview-badge strong {
  color: #2b4d76;
  font-size: 13px;
}

.mode-callout strong {
  color: #31527c;
  font-size: 13px;
}

.mode-callout p {
  margin: 6px 0 0;
  color: #7890ad;
  font-size: 11px;
  line-height: 1.55;
}

.template-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  color: #7890ad;
  font-size: 11px;
}

.template-list {
  display: grid;
  gap: 10px;
  max-height: 360px;
  overflow: auto;
  padding-right: 4px;
}

.template-item {
  display: grid;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(245, 249, 255, 0.86);
}

.template-copy strong {
  display: block;
  color: #30517b;
}

.template-copy span {
  display: block;
  margin-top: 3px;
  color: #7890ad;
  font-size: 11px;
}

.template-actions {
  display: flex;
  gap: 8px;
}

@media (max-width: 1280px) {
  .workflow-strip,
  .modeling-grid,
  .hero-grid,
  .hero-stats,
  .type-grid,
  .preview-banner,
  .parameter-row {
    grid-template-columns: 1fr;
  }
}
</style>
