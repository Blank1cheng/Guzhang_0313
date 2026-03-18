<template>
  <section class="panel-card execution-panel">
    <div class="panel-head">
      <div class="panel-head__title">
        <h3>执行控制台</h3>
        <p>监看任务、示波器和运行日志。</p>
      </div>
      <div class="panel-head__meta">
        <span class="meta-chip">状态 {{ runtimeStatusLabel }}</span>
        <span class="meta-chip">仿真 {{ runtime.simTime.toFixed(1) }}s</span>
        <span class="meta-chip">视界 {{ overview.horizonSeconds.toFixed(1) }}s</span>
      </div>
    </div>

    <div class="execution-topline">
      <article class="control-card">
        <div class="section-mini-head">
          <strong>运行控制</strong>
          <span>先部署任务，再启动仿真</span>
        </div>

        <div class="control-row">
          <div class="control-row__main">
            <a-button type="primary" :disabled="!controlState.canStart" @click="emit('start')">开始</a-button>
            <a-button :disabled="!controlState.canPause" @click="emit('pause')">暂停</a-button>
            <a-button :disabled="!controlState.canStep" @click="emit('step')">单步</a-button>
            <a-button danger ghost :disabled="!controlState.canStop" @click="emit('stop')">终止</a-button>
          </div>
          <div class="control-row__meta">
            <div class="runtime-select">
              <span>节拍</span>
              <a-select :value="runtime.tickIntervalMs" style="width: 148px" @change="emit('change-speed', $event)">
                <a-select-option v-for="item in speedOptions" :key="item.value" :value="item.value">
                  {{ item.label }}
                </a-select-option>
              </a-select>
            </div>
            <div class="runtime-chip">步长 {{ runtime.stepSize.toFixed(1) }}s</div>
          </div>
        </div>
      </article>

      <div class="kpi-grid">
        <div v-for="item in signalCards" :key="item.label" class="kpi-card">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </div>
      </div>
    </div>

    <div class="execution-body">
      <article class="scope-card">
        <div class="scope-card__head">
          <div>
            <strong>实时示波器</strong>
            <span>观测当前注入后的信号变化</span>
          </div>
          <a-select v-model:value="scopeIdProxy" style="width: 220px">
            <a-select-option v-for="item in scopeOptions" :key="item.id" :value="item.id">
              {{ item.name }}
            </a-select-option>
          </a-select>
        </div>

        <div class="scope-summary">
          <span class="scope-summary__item">当前信号 {{ currentSignalValue }}</span>
          <span class="scope-summary__item">任务 {{ taskRows.length }}</span>
          <span class="scope-summary__item">已部署 {{ overview.deployedFaultCount }}</span>
        </div>

        <TrendChart :option="liveScopeOption" height="260px" />

        <div class="scope-footer">
          <span>运行状态 {{ runtimeStatusLabel }}</span>
          <span>就绪任务 {{ overview.readyTaskCount }}</span>
        </div>
      </article>

      <div class="monitor-column">
        <article class="monitor-card task-card">
          <div class="section-mini-head">
            <strong>任务状态</strong>
            <span>{{ taskRows.length }} 项</span>
          </div>

          <div v-if="taskRows.length" class="task-list">
            <div v-for="task in taskRows" :key="task.id" class="task-row">
              <div class="task-row__main">
                <strong>{{ task.name }}</strong>
                <span>{{ task.templateName }} / {{ task.location }}</span>
              </div>
              <div class="task-state" :class="`task-state--${task.statusKey}`">{{ task.statusLabel }}</div>
            </div>
          </div>
          <div v-else class="empty-state">当前没有任务。</div>
        </article>

        <article class="monitor-card log-card">
          <div class="section-mini-head">
            <strong>运行日志</strong>
            <a-button size="small" @click="emit('clear-logs')">清空</a-button>
          </div>

          <div v-if="reversedLogs.length" class="log-list">
            <div v-for="item in reversedLogs" :key="item.id" class="log-line">
              <span>{{ item.time }}</span>
              <p>{{ item.text }}</p>
            </div>
          </div>
          <div v-else class="empty-state">日志控制台为空。</div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';

import TrendChart from '../charts/TrendChart.vue';

const scopeIdProxy = defineModel('activeScopeId', { type: String, default: '' });

const props = defineProps({
  runtime: { type: Object, required: true },
  speedOptions: { type: Array, required: true },
  scopeOptions: { type: Array, required: true },
  liveScopeOption: { type: Object, required: true },
  currentSignalValue: { type: String, required: true },
  taskRows: { type: Array, required: true },
  logs: { type: Array, required: true },
  overview: { type: Object, required: true },
  controlState: { type: Object, required: true },
});

const emit = defineEmits(['start', 'pause', 'step', 'stop', 'change-speed', 'clear-logs']);

const runtimeStatusLabel = computed(() => ({
  ready: '待命',
  running: '运行中',
  paused: '已暂停',
  stopped: '已停止',
  completed: '已完成',
}[props.runtime.status] || '待命'));

const signalCards = computed(() => ([
  { label: '当前信号', value: props.currentSignalValue },
  { label: '已部署故障', value: props.overview.deployedFaultCount },
  { label: '就绪任务', value: props.overview.readyTaskCount },
  { label: '运行步长', value: `${props.runtime.stepSize.toFixed(1)}s` },
]));

const reversedLogs = computed(() => [...props.logs].reverse());
</script>

<style scoped>
.execution-panel {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 14px;
  height: 100%;
  min-height: 0;
  padding: 18px;
  background:
    radial-gradient(circle at top right, rgba(95, 146, 236, 0.12), transparent 28%),
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

.execution-topline {
  display: grid;
  grid-template-columns: minmax(0, 1.02fr) minmax(0, 0.98fr);
  gap: 12px;
}

.control-card,
.kpi-card,
.scope-card,
.monitor-card {
  min-height: 0;
  padding: 16px;
  border: 1px solid rgba(186, 208, 240, 0.9);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.86), 0 12px 26px rgba(52, 87, 145, 0.06);
  overflow: hidden;
}

.control-card {
  display: grid;
  gap: 12px;
  background:
    radial-gradient(circle at top right, rgba(234, 137, 57, 0.08), transparent 24%),
    linear-gradient(180deg, rgba(248, 251, 255, 0.98), rgba(255, 255, 255, 0.92));
}

.section-mini-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.section-mini-head strong {
  color: var(--text-strong, #17365d);
  font-size: 15px;
}

.section-mini-head span {
  color: var(--muted, #6783a7);
  font-size: 12px;
}

.control-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.control-row__main,
.control-row__meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.runtime-select {
  display: flex;
  align-items: center;
  gap: 8px;
}

.runtime-select span,
.runtime-chip,
.scope-footer span,
.scope-summary__item {
  color: var(--muted, #6783a7);
  font-size: 12px;
}

.runtime-chip,
.scope-summary__item {
  display: inline-flex;
  align-items: center;
  padding: 7px 11px;
  border-radius: 999px;
  background: rgba(106, 143, 190, 0.09);
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.kpi-card span {
  display: block;
  margin-bottom: 6px;
  color: var(--muted, #6783a7);
  font-size: 12px;
}

.kpi-card strong {
  color: var(--text-strong, #17365d);
  font-size: 28px;
  line-height: 1.1;
}

.execution-body {
  display: grid;
  grid-template-columns: minmax(0, 1.14fr) minmax(320px, 0.86fr);
  gap: 14px;
  min-height: 0;
}

.scope-card {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  gap: 12px;
}

.scope-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.scope-card__head strong {
  color: var(--text-strong, #17365d);
  font-size: 16px;
}

.scope-card__head span {
  display: block;
  margin-top: 4px;
  color: var(--muted, #6783a7);
  font-size: 12px;
}

.scope-summary,
.scope-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.monitor-column {
  display: grid;
  grid-template-rows: minmax(0, 0.92fr) minmax(0, 1.08fr);
  gap: 12px;
  min-height: 0;
}

.monitor-card {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 10px;
}

.task-list,
.log-list {
  min-height: 0;
  overflow: auto;
  padding-right: 4px;
}

.task-list {
  display: grid;
  gap: 8px;
}

.task-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 0;
}

.task-row + .task-row,
.log-line + .log-line {
  border-top: 1px solid rgba(223, 233, 248, 0.88);
}

.task-row__main {
  min-width: 0;
}

.task-row__main strong,
.task-row__main span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-row__main strong {
  color: var(--text-strong, #17365d);
}

.task-row__main span {
  margin-top: 3px;
  color: var(--muted, #6783a7);
  font-size: 12px;
}

.task-state {
  align-self: center;
  padding: 5px 9px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.task-state--active {
  background: rgba(62, 183, 127, 0.14);
  color: #2f9b65;
}

.task-state--ready,
.task-state--waiting,
.task-state--paused {
  background: rgba(47, 128, 255, 0.12);
  color: #2f80ff;
}

.task-state--recovery,
.task-state--done {
  background: rgba(255, 175, 66, 0.16);
  color: #bf7f0a;
}

.task-state--undeployed {
  background: rgba(220, 90, 90, 0.12);
  color: #c84f4f;
}

.log-list {
  display: grid;
  gap: 0;
}

.log-line {
  display: grid;
  grid-template-columns: 64px 1fr;
  gap: 8px;
  padding: 8px 0;
}

.log-line span {
  color: var(--muted, #6783a7);
  font-size: 12px;
  font-weight: 700;
  font-family: 'Fira Code', 'Consolas', monospace;
}

.log-line p {
  margin: 0;
  color: var(--text, #23486f);
  font-size: 12px;
  line-height: 1.55;
  font-family: 'Fira Code', 'Consolas', monospace;
}

.empty-state {
  display: grid;
  place-items: center;
  color: var(--muted, #6783a7);
  font-size: 12px;
  min-height: 120px;
  border: 1px dashed rgba(203, 219, 243, 0.92);
  border-radius: 18px;
  background: rgba(247, 250, 255, 0.74);
}

@media (max-width: 1120px) {
  .execution-topline,
  .execution-body,
  .kpi-grid {
    grid-template-columns: 1fr;
  }

  .monitor-column {
    grid-template-rows: repeat(2, minmax(240px, 1fr));
  }
}
</style>
