<template>
  <header class="studio-header">
    <div class="header-main">
      <div class="header-copy">
        <span class="header-kicker">EXP_0312</span>
        <h1>故障注入平台</h1>
        <p>面向物理层、电气层、协议层的分层故障模板建模、注入配置、执行监测与结果分析工作台。</p>
      </div>

      <div class="header-status">
        <div class="status-pill" :class="`status-pill--${runtime.status}`">
          {{ statusLabel }}
        </div>
        <div class="status-time">仿真时间 {{ runtime.simTime.toFixed(1) }}s</div>
      </div>
    </div>

    <div class="header-metrics">
      <div class="metric-card">
        <span>画布节点</span>
        <strong>{{ counts.nodes }}</strong>
      </div>
      <div class="metric-card">
        <span>连线数量</span>
        <strong>{{ counts.edges }}</strong>
      </div>
      <div class="metric-card">
        <span>故障节点</span>
        <strong>{{ counts.faults }}</strong>
      </div>
      <div class="metric-card">
        <span>任务列表</span>
        <strong>{{ taskCount }}</strong>
      </div>
    </div>

    <div class="header-actions">
      <div class="preset-box">
        <span>场景预设</span>
        <a-select :value="activePreset" style="width: 240px" @change="emit('apply-preset', $event)">
          <a-select-option v-for="item in scenarioPresets" :key="item.value" :value="item.value">
            {{ item.label }}
          </a-select-option>
        </a-select>
      </div>

      <a-space wrap>
        <a-button @click="emit('import-workspace')">导入工作区</a-button>
        <a-button @click="emit('export-workspace')">导出工作区</a-button>
        <a-button @click="emit('deploy-all-tasks')">一键部署任务</a-button>
        <a-button danger ghost @click="emit('clear-tasks')">清空任务</a-button>
        <a-button danger @click="emit('reset-workspace')">重置工作区</a-button>
      </a-space>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  runtime: { type: Object, required: true },
  counts: { type: Object, required: true },
  taskCount: { type: Number, required: true },
  scenarioPresets: { type: Array, required: true },
  activePreset: { type: String, default: 'baseline' },
});

const emit = defineEmits([
  'apply-preset',
  'export-workspace',
  'import-workspace',
  'reset-workspace',
  'deploy-all-tasks',
  'clear-tasks',
]);

const statusLabel = computed(() => ({
  ready: '就绪',
  running: '运行中',
  paused: '已暂停',
  stopped: '已停止',
}[props.runtime.status] || '就绪'));
</script>

<style scoped>
.studio-header {
  display: grid;
  gap: 12px;
  padding: 16px 20px;
  border: 1px solid rgba(188, 212, 247, 0.95);
  border-radius: 24px;
  background:
    radial-gradient(circle at top right, rgba(99, 142, 239, 0.16), transparent 36%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.97), rgba(247, 251, 255, 0.99));
  box-shadow: 0 18px 40px rgba(44, 86, 156, 0.08);
}

.header-main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.header-kicker {
  display: inline-block;
  margin-bottom: 6px;
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(47, 128, 255, 0.12);
  color: #2f80ff;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.header-copy h1 {
  margin: 0;
  color: #274a73;
  font-size: 26px;
  line-height: 1.1;
}

.header-copy p {
  margin: 6px 0 0;
  max-width: 680px;
  color: #6882a3;
  font-size: 12px;
  line-height: 1.65;
}

.header-status {
  display: grid;
  justify-items: end;
  gap: 8px;
}

.status-pill {
  min-width: 92px;
  padding: 8px 14px;
  border-radius: 999px;
  text-align: center;
  font-size: 12px;
  font-weight: 800;
}

.status-pill--ready {
  background: rgba(47, 128, 255, 0.12);
  color: #2f80ff;
}

.status-pill--running {
  background: rgba(62, 183, 127, 0.14);
  color: #2f9b65;
}

.status-pill--paused {
  background: rgba(255, 175, 66, 0.16);
  color: #bf7f0a;
}

.status-pill--stopped {
  background: rgba(220, 90, 90, 0.14);
  color: #c84f4f;
}

.status-time {
  color: #5d7696;
  font-size: 12px;
  font-weight: 700;
}

.header-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.metric-card {
  padding: 10px 12px;
  border: 1px solid rgba(188, 212, 247, 0.9);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.84);
}

.metric-card span {
  display: block;
  margin-bottom: 6px;
  color: #6d84a2;
  font-size: 11px;
}

.metric-card strong {
  color: #27486f;
  font-size: 18px;
}

.header-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 2px;
  border-top: 1px solid rgba(219, 232, 249, 0.9);
}

.preset-box {
  display: flex;
  align-items: center;
  gap: 10px;
}

.preset-box span {
  color: #547194;
  font-size: 12px;
  font-weight: 700;
}

@media (max-width: 1280px) {
  .header-main,
  .header-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .header-status {
    justify-items: start;
  }

  .header-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
