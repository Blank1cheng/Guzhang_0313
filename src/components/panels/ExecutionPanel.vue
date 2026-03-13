<template>
  <section class="panel-card execution-panel">
    <div class="panel-head">
      <div>
        <h3>模块 3：故障注入执行</h3>
        <p>实时控制任务执行，支持开始、暂停、单步推进和终止，并监控示波器、任务状态和日志。</p>
      </div>
    </div>

    <div class="control-strip">
      <div class="control-group">
        <a-button type="primary" @click="emit('start')">开始</a-button>
        <a-button @click="emit('pause')">暂停</a-button>
        <a-button @click="emit('step')">单步推进</a-button>
        <a-button danger @click="emit('stop')">终止</a-button>
      </div>

      <div class="control-meta">
        <div class="meta-item">
          <span>运行状态</span>
          <strong>{{ runtimeStatusLabel }}</strong>
        </div>
        <div class="meta-item">
          <span>仿真时间</span>
          <strong>{{ runtime.simTime.toFixed(1) }}s</strong>
        </div>
        <div class="meta-item meta-item--select">
          <span>运行节拍</span>
          <a-select :value="runtime.tickIntervalMs" style="width: 150px" @change="emit('change-speed', $event)">
            <a-select-option v-for="item in speedOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </a-select-option>
          </a-select>
        </div>
      </div>
    </div>

    <div class="execution-grid">
      <div class="runtime-stack">
        <div class="runtime-top">
          <div class="signal-card">
            <span>当前信号值</span>
            <strong>{{ currentSignalValue }}</strong>
          </div>
          <div class="signal-card">
            <span>已部署故障</span>
            <strong>{{ overview.deployedFaultCount }}</strong>
          </div>
          <div class="signal-card">
            <span>就绪任务</span>
            <strong>{{ overview.readyTaskCount }}</strong>
          </div>
          <div class="signal-card">
            <span>单步粒度</span>
            <strong>{{ runtime.stepSize.toFixed(1) }}s</strong>
          </div>
        </div>

        <div class="scope-card">
          <div class="scope-head">
            <div>
              <strong>实时示波器</strong>
              <p>可切换不同示波器，观察当前任务下的实时曲线变化。</p>
            </div>
            <a-select v-model:value="scopeIdProxy" style="width: 220px">
              <a-select-option v-for="item in scopeOptions" :key="item.id" :value="item.id">
                {{ item.name }}
              </a-select-option>
            </a-select>
          </div>
          <TrendChart :option="liveScopeOption" height="236px" />
        </div>
      </div>

      <div class="monitor-stack">
        <div class="task-table">
          <div class="section-mini-head">
            <strong>任务状态</strong>
            <span>{{ taskRows.length }} 个任务</span>
          </div>
          <div class="task-row" v-for="task in taskRows" :key="task.id">
            <div>
              <strong>{{ task.name }}</strong>
              <span>{{ task.templateName }} / {{ task.location }}</span>
            </div>
            <div class="task-state" :class="`task-state--${task.statusKey}`">{{ task.statusLabel }}</div>
          </div>
        </div>

        <div class="log-console">
          <div class="section-mini-head">
            <strong>日志控制台</strong>
            <a-button size="small" @click="emit('clear-logs')">清空日志</a-button>
          </div>
          <div class="log-list">
            <div v-for="item in reversedLogs" :key="item.id" class="log-line">
              <span>{{ item.time }}</span>
              <p>{{ item.text }}</p>
            </div>
          </div>
        </div>
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
});

const emit = defineEmits(['start', 'pause', 'step', 'stop', 'change-speed', 'clear-logs']);

const runtimeStatusLabel = computed(() => ({
  ready: '就绪',
  running: '运行中',
  paused: '已暂停',
  stopped: '已停止',
}[props.runtime.status] || '就绪'));

const reversedLogs = computed(() => [...props.logs].reverse());
</script>

<style scoped>
.execution-panel {
  display: grid;
  gap: 14px;
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

.control-strip {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 12px;
}

.control-group,
.control-meta,
.signal-card,
.scope-card,
.task-table,
.log-console {
  padding: 14px;
  border: 1px solid rgba(188, 212, 247, 0.9);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.84);
}

.control-group {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.control-meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.meta-item {
  display: grid;
  gap: 6px;
  align-content: start;
}

.meta-item span {
  color: #7a90ac;
  font-size: 11px;
}

.meta-item strong {
  color: #274a73;
  font-size: 16px;
}

.execution-grid {
  display: grid;
  grid-template-columns: 1.08fr 0.92fr;
  gap: 14px;
}

.runtime-stack,
.monitor-stack {
  display: grid;
  gap: 12px;
}

.runtime-top {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.signal-card span {
  display: block;
  margin-bottom: 6px;
  color: #728aa8;
  font-size: 11px;
}

.signal-card strong {
  color: #2b4d76;
  font-size: 20px;
}

.scope-head,
.section-mini-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 10px;
}

.scope-head strong,
.section-mini-head strong {
  color: #31527c;
  font-size: 13px;
}

.scope-head p {
  margin: 4px 0 0;
  color: #7890ad;
  font-size: 11px;
  line-height: 1.55;
}

.section-mini-head span {
  color: #7a90ac;
  font-size: 11px;
}

.task-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 0;
  border-top: 1px solid rgba(223, 233, 248, 0.88);
}

.task-table {
  max-height: 250px;
  overflow: auto;
}

.task-row:first-of-type {
  border-top: none;
}

.task-row strong {
  display: block;
  color: #32537d;
}

.task-row span {
  display: block;
  margin-top: 3px;
  color: #7890ad;
  font-size: 11px;
}

.task-state {
  align-self: center;
  padding: 5px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
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
  gap: 8px;
  max-height: 248px;
  overflow: auto;
  padding-right: 4px;
}

.log-line {
  display: grid;
  grid-template-columns: 64px 1fr;
  gap: 8px;
  padding: 8px 0;
  border-top: 1px solid rgba(223, 233, 248, 0.88);
}

.log-line:first-of-type {
  border-top: none;
}

.log-line span {
  color: #7890ad;
  font-size: 11px;
  font-weight: 700;
}

.log-line p {
  margin: 0;
  color: #365a84;
  font-size: 12px;
  line-height: 1.55;
}

@media (max-width: 1280px) {
  .control-strip,
  .execution-grid,
  .control-meta,
  .runtime-top {
    grid-template-columns: 1fr;
  }

  .control-group {
    flex-wrap: wrap;
  }
}
</style>
