<template>
  <header class="studio-header">
    <div class="header-top">
      <div class="header-brand">
        <span class="header-kicker">EXP_0312</span>
        <h1>故障注入平台</h1>
        <p>聚焦模板建模、注入配置、执行监控和结果分析的统一工作台。</p>
      </div>

      <div class="header-global">
        <div class="header-status">
          <div class="status-pill" :class="`status-pill--${runtime.status}`">
            {{ statusLabel }}
          </div>
          <div class="status-time">仿真时间 {{ runtime.simTime.toFixed(1) }}s</div>
        </div>

        <a-space wrap class="header-actions">
          <a-button @click="emit('import-workspace')">导入工作区</a-button>
          <a-button @click="emit('export-workspace')">导出工作区</a-button>
          <a-button @click="emit('deploy-all-tasks')">一键部署任务</a-button>
          <a-button danger ghost @click="emit('clear-tasks')">清空任务</a-button>
          <a-button danger @click="emit('reset-workspace')">重置工作区</a-button>
        </a-space>
      </div>
    </div>

    <div class="header-bottom">
      <div class="header-flow">
        <div class="preset-box">
          <span>演示模板</span>
          <a-select :value="activePreset" style="width: 220px" @change="emit('apply-preset', $event)">
            <a-select-option v-for="item in scenarioPresets" :key="item.value" :value="item.value">
              {{ item.label }}
            </a-select-option>
          </a-select>
        </div>

        <div class="flow-tabs">
          <button
            v-for="item in viewOptions"
            :key="item.value"
            type="button"
            class="flow-tab"
            :class="{ 'flow-tab--active': activeView === item.value }"
            @click="emit('change-view', item.value)"
          >
            <span>{{ item.shortLabel }}</span>
            <strong>{{ item.label }}</strong>
          </button>
        </div>
      </div>

      <div class="metric-strip">
        <div class="metric-pill">节点 {{ counts.nodes }}</div>
        <div class="metric-pill">连线 {{ counts.edges }}</div>
        <div class="metric-pill">故障 {{ counts.faults }}</div>
        <div class="metric-pill">任务 {{ taskCount }}</div>
      </div>
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
  viewOptions: { type: Array, required: true },
  activeView: { type: String, required: true },
});

const emit = defineEmits([
  'change-view',
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
  gap: 16px;
  padding: 22px 24px 18px;
  border: 1px solid rgba(188, 212, 247, 0.95);
  border-radius: 28px;
  background:
    radial-gradient(circle at top right, rgba(99, 142, 239, 0.16), transparent 36%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 251, 255, 0.99));
  box-shadow: 0 22px 46px rgba(44, 86, 156, 0.08);
}

.header-top,
.header-bottom {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.header-brand {
  min-width: 0;
}

.header-kicker {
  display: inline-block;
  margin-bottom: 8px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(47, 128, 255, 0.12);
  color: #2f80ff;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.header-brand h1 {
  margin: 0;
  color: #274a73;
  font-size: 30px;
  line-height: 1.08;
}

.header-brand p {
  margin: 8px 0 0;
  color: #6b84a4;
  font-size: 12px;
  line-height: 1.65;
}

.header-global {
  display: grid;
  justify-items: end;
  gap: 12px;
}

.header-status {
  display: grid;
  justify-items: end;
  gap: 8px;
}

.status-pill {
  min-width: 96px;
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

.header-actions {
  justify-content: flex-end;
}

.header-bottom {
  padding-top: 12px;
  border-top: 1px solid rgba(219, 232, 249, 0.92);
}

.header-flow {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.preset-box {
  display: flex;
  align-items: center;
  gap: 10px;
}

.preset-box span {
  color: #557195;
  font-size: 12px;
  font-weight: 700;
}

.flow-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.flow-tab {
  min-width: 136px;
  padding: 10px 14px;
  border: 1px solid rgba(189, 213, 247, 0.92);
  border-radius: 18px;
  background: rgba(245, 249, 255, 0.74);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.flow-tab span {
  display: block;
  margin-bottom: 5px;
  color: #7389a7;
  font-size: 12px;
  font-weight: 700;
}

.flow-tab strong {
  color: #31527c;
  font-size: 14px;
  line-height: 1.3;
}

.flow-tab--active {
  border-color: rgba(47, 128, 255, 0.78);
  background: linear-gradient(180deg, rgba(47, 128, 255, 0.14), rgba(255, 255, 255, 0.94));
  box-shadow: 0 14px 28px rgba(47, 128, 255, 0.12);
  transform: translateY(-1px);
}

.metric-strip {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.metric-pill {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(47, 128, 255, 0.09);
  color: #567396;
  font-size: 12px;
  font-weight: 700;
}

@media (max-width: 1440px) {
  .header-top,
  .header-bottom {
    flex-direction: column;
    align-items: stretch;
  }

  .header-global,
  .header-status {
    justify-items: start;
  }

  .metric-strip {
    justify-content: flex-start;
  }
}
</style>
