<template>
  <section class="panel-card analysis-panel">
    <div class="panel-head">
      <div>
        <h3>模块 4：结果分析</h3>
        <p>按模板、位置和方法三个维度复盘注入效果，并区分模板参数与注入配置参数。</p>
      </div>
      <a-button type="primary" @click="emit('export')">导出报告</a-button>
    </div>

    <div class="analysis-stack">
      <article class="section-card">
        <div class="section-head">
          <span class="section-index">01</span>
          <div>
            <strong>对比曲线</strong>
            <p>同时对比无故障状态、注入故障状态和恢复后状态。</p>
          </div>
        </div>
        <TrendChart :option="analysisOption" height="220px" />
      </article>

      <div class="summary-grid">
        <article class="section-card">
          <div class="section-head">
            <span class="section-index">02</span>
            <div>
              <strong>指标评估</strong>
              <p>围绕 FDIR 关心的检出时间、隔离准确率和稳健性评分给出结果。</p>
            </div>
          </div>

          <div class="metrics-grid">
            <div class="metric-box">
              <span>检出时间</span>
              <strong>{{ metrics.detectionTime == null ? '--' : `${metrics.detectionTime}s` }}</strong>
            </div>
            <div class="metric-box">
              <span>隔离准确率</span>
              <strong>{{ metrics.isolationAccuracy }}%</strong>
            </div>
            <div class="metric-box">
              <span>稳健性评分</span>
              <strong>{{ metrics.robustness }}</strong>
            </div>
          </div>
        </article>

        <article class="section-card">
          <div class="section-head">
            <span class="section-index">03</span>
            <div>
              <strong>任务分析维度</strong>
              <p>将模板核心参数和注入配置参数分开记录，便于后续试验复盘。</p>
            </div>
          </div>

          <div class="task-summary-list">
            <div v-for="task in taskRows" :key="task.id" class="task-summary-item">
              <div>
                <strong>{{ task.name }}</strong>
                <span>{{ task.templateName }}</span>
              </div>
              <p>
                模板核心参数：
                均值 {{ task.templateSnapshot?.mean ?? 0 }}，
                方差 {{ task.templateSnapshot?.variance ?? 0 }}，
                偏差 {{ task.templateSnapshot?.bias ?? 0 }}，
                严重度 {{ task.templateSnapshot?.severity ?? 0 }}
              </p>
              <p>
                注入配置参数：
                {{ task.location }} / {{ task.channel }} /
                {{ task.triggerStart }}s - {{ task.endTime }}s /
                强度 {{ task.intensity }} / 方法系数 {{ task.methodFactor }}
              </p>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup>
import TrendChart from '../charts/TrendChart.vue';

defineProps({
  analysisOption: { type: Object, required: true },
  metrics: { type: Object, required: true },
  taskRows: { type: Array, required: true },
});

const emit = defineEmits(['export']);
</script>

<style scoped>
.analysis-panel {
  display: grid;
  gap: 14px;
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

.analysis-stack,
.summary-grid {
  display: grid;
  gap: 12px;
}

.section-card {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid rgba(188, 212, 247, 0.9);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.84);
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

.metrics-grid,
.task-summary-list {
  display: grid;
  gap: 10px;
  max-height: 320px;
  overflow: auto;
  padding-right: 4px;
}

.metric-box {
  padding: 12px;
  border-radius: 14px;
  background: rgba(245, 249, 255, 0.86);
}

.metric-box span {
  display: block;
  margin-bottom: 6px;
  color: #728aa8;
  font-size: 11px;
}

.metric-box strong {
  color: #2b4d76;
  font-size: 20px;
}

.task-summary-item {
  padding: 12px;
  border-radius: 14px;
  background: rgba(245, 249, 255, 0.86);
}

.task-summary-item strong {
  display: block;
  color: #2b4d76;
}

.task-summary-item span {
  display: block;
  margin-top: 3px;
  color: #7b93ae;
  font-size: 11px;
}

.task-summary-item p {
  margin: 8px 0 0;
  color: #5f7898;
  font-size: 11px;
  line-height: 1.6;
}
</style>
