<template>
  <section class="panel-card analysis-panel">
    <div class="panel-head">
      <div class="panel-head__title">
        <h3>总结分析</h3>
        <p>对比故障前后曲线与诊断指标。</p>
      </div>
      <div class="panel-head__meta">
        <span class="meta-chip">任务 {{ taskRows.length }}</span>
        <span class="meta-chip">鲁棒性 {{ metrics.robustness }}</span>
        <a-button type="primary" @click="emit('export')">导出报告</a-button>
      </div>
    </div>

    <div class="analysis-kpi-grid">
      <div class="metric-box">
        <span>检测时间</span>
        <strong>{{ metrics.detectionTime == null ? '--' : `${metrics.detectionTime}s` }}</strong>
      </div>
      <div class="metric-box">
        <span>隔离准确率</span>
        <strong>{{ metrics.isolationAccuracy }}%</strong>
      </div>
      <div class="metric-box">
        <span>鲁棒性</span>
        <strong>{{ metrics.robustness }}</strong>
      </div>
      <div class="metric-box">
        <span>任务数</span>
        <strong>{{ taskRows.length }}</strong>
      </div>
    </div>

    <div class="analysis-body">
      <article class="analysis-card analysis-card--chart">
        <div class="section-head">
          <div>
            <strong>对比曲线</strong>
            <span>同轴比对正常、注入和恢复阶段</span>
          </div>
          <div class="legend-strip">
            <span>正常</span>
            <span>注入</span>
            <span>恢复</span>
          </div>
        </div>
        <TrendChart :option="analysisOption" height="260px" />
      </article>

      <article class="analysis-card analysis-card--summary">
        <div class="section-head">
          <div>
            <strong>诊断摘要</strong>
            <span>用于快速判断本轮注入效果</span>
          </div>
        </div>

        <div class="summary-list">
          <div class="summary-row">
            <span>检测时间</span>
            <strong>{{ metrics.detectionTime == null ? '--' : `${metrics.detectionTime}s` }}</strong>
          </div>
          <div class="summary-row">
            <span>隔离准确率</span>
            <strong>{{ metrics.isolationAccuracy }}%</strong>
          </div>
          <div class="summary-row">
            <span>鲁棒性</span>
            <strong>{{ metrics.robustness }}</strong>
          </div>
          <div class="summary-row">
            <span>建议</span>
            <strong>{{ diagnosisText }}</strong>
          </div>
        </div>
      </article>

      <article class="analysis-card analysis-card--tasks">
        <div class="section-head">
          <div>
            <strong>任务复盘</strong>
            <span>保留模板参数和注入窗口，便于复现</span>
          </div>
        </div>

        <div v-if="taskRows.length" class="task-summary-list">
          <div v-for="task in taskRows" :key="task.id" class="task-summary-item">
            <div class="task-summary-item__head">
              <div>
                <strong>{{ task.name }}</strong>
                <span>{{ task.templateName }}</span>
              </div>
              <div class="task-summary-item__status">{{ task.statusLabel }}</div>
            </div>
            <div class="task-summary-item__grid">
              <div>
                <label>位置</label>
                <p>{{ task.location }} / {{ task.channel }}</p>
              </div>
              <div>
                <label>窗口</label>
                <p>{{ task.triggerStart }}s - {{ task.endTime }}s</p>
              </div>
              <div>
                <label>强度</label>
                <p>{{ task.intensity }}</p>
              </div>
              <div>
                <label>方法</label>
                <p>{{ task.methodLabel || task.method }}</p>
              </div>
            </div>
            <div class="task-summary-item__meta">
              模板参数：
              均值 {{ task.templateSnapshot?.mean ?? 0 }} /
              方差 {{ task.templateSnapshot?.variance ?? 0 }} /
              偏差 {{ task.templateSnapshot?.bias ?? 0 }} /
              严重度 {{ task.templateSnapshot?.severity ?? 0 }}
            </div>
          </div>
        </div>
        <div v-else class="empty-state">当前没有可分析任务。</div>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';

import TrendChart from '../charts/TrendChart.vue';

const props = defineProps({
  analysisOption: { type: Object, required: true },
  metrics: { type: Object, required: true },
  taskRows: { type: Array, required: true },
});

const emit = defineEmits(['export']);

const diagnosisText = computed(() => {
  const accuracy = Number(props.metrics.isolationAccuracy || 0);
  const robustness = Number.parseFloat(String(props.metrics.robustness || 0)) || 0;

  if (accuracy >= 90 && robustness >= 85) return '诊断稳定';
  if (accuracy >= 75 && robustness >= 70) return '可继续优化';
  return '建议复查策略';
});
</script>

<style scoped>
.analysis-panel {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 14px;
  height: 100%;
  min-height: 0;
  padding: 18px;
  background:
    radial-gradient(circle at top right, rgba(234, 137, 57, 0.08), transparent 24%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(246, 250, 255, 0.92));
  box-sizing: border-box;
  overflow: hidden;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.panel-head__title {
  display: grid;
  gap: 6px;
  padding-top: 2px;
}

.panel-head__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.meta-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 7px 12px;
  border-radius: 999px;
  background: var(--primary-soft, rgba(106, 143, 190, 0.14));
  color: var(--primary, #346dcd);
  font-size: 12px;
  font-weight: 700;
}

.panel-head h3 {
  margin: 0;
  color: var(--text-strong, #17365d);
  font-size: 30px;
  line-height: 1.18;
  letter-spacing: -0.03em;
}

.panel-head p {
  margin: 0;
  color: var(--muted, #6783a7);
  font-size: 13px;
  line-height: 1.5;
}

.analysis-kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.metric-box,
.analysis-card {
  padding: 16px;
  border: 1px solid rgba(186, 208, 240, 0.9);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.86), 0 12px 26px rgba(52, 87, 145, 0.06);
  overflow: hidden;
}

.metric-box span {
  display: block;
  margin-bottom: 6px;
  color: var(--muted, #6783a7);
  font-size: 12px;
}

.metric-box strong {
  color: var(--text-strong, #17365d);
  font-size: 28px;
  line-height: 1.08;
}

.analysis-body {
  display: grid;
  grid-template-columns: minmax(0, 1.06fr) minmax(300px, 0.74fr);
  grid-template-rows: minmax(0, 0.86fr) minmax(0, 1.14fr);
  gap: 12px;
  min-height: 0;
}

.analysis-card {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 12px;
}

.analysis-card--chart {
  grid-column: 1;
  grid-row: 1;
}

.analysis-card--summary {
  grid-column: 2;
  grid-row: 1;
}

.analysis-card--tasks {
  grid-column: 1 / span 2;
  grid-row: 2;
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.section-head strong {
  display: block;
  color: var(--text-strong, #17365d);
  font-size: 16px;
}

.section-head span {
  display: block;
  margin-top: 4px;
  color: var(--muted, #6783a7);
  font-size: 12px;
}

.legend-strip {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.legend-strip span,
.task-summary-item__status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(106, 143, 190, 0.1);
  color: var(--primary, #346dcd);
  font-size: 11px;
  font-weight: 700;
}

.summary-list {
  display: grid;
  gap: 10px;
  align-content: start;
}

.summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px;
  border-radius: 16px;
  background: rgba(246, 249, 255, 0.88);
}

.summary-row span {
  color: var(--muted, #6783a7);
  font-size: 12px;
}

.summary-row strong {
  color: var(--text-strong, #17365d);
  font-size: 15px;
}

.task-summary-list {
  display: grid;
  gap: 10px;
  min-height: 0;
  overflow: auto;
  padding-right: 4px;
}

.task-summary-item {
  display: grid;
  gap: 10px;
  padding: 12px;
  border-radius: 18px;
  background: rgba(246, 249, 255, 0.88);
}

.task-summary-item__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.task-summary-item__head strong {
  display: block;
  color: var(--text-strong, #17365d);
}

.task-summary-item__head span {
  display: block;
  margin-top: 3px;
  color: var(--muted, #6783a7);
  font-size: 12px;
}

.task-summary-item__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.task-summary-item__grid label {
  display: block;
  margin-bottom: 4px;
  color: var(--muted, #6783a7);
  font-size: 12px;
}

.task-summary-item__grid p,
.task-summary-item__meta {
  margin: 0;
  color: var(--text, #23486f);
  font-size: 12px;
  line-height: 1.6;
}

.empty-state {
  display: grid;
  place-items: center;
  color: var(--muted, #6783a7);
  font-size: 12px;
  min-height: 140px;
  border: 1px dashed rgba(203, 219, 243, 0.92);
  border-radius: 18px;
  background: rgba(247, 250, 255, 0.74);
}

@media (max-width: 1120px) {
  .analysis-kpi-grid,
  .analysis-body,
  .task-summary-item__grid {
    grid-template-columns: 1fr;
  }

  .analysis-body {
    grid-template-rows: auto;
  }

  .analysis-card--chart,
  .analysis-card--summary,
  .analysis-card--tasks {
    grid-column: auto;
    grid-row: auto;
  }
}
</style>
