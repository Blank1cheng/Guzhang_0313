<template>
  <section class="panel-card task-panel">
    <div class="panel-head">
      <div>
        <h3>模块 2：故障注入配置</h3>
        <p>从模板库选择故障模板，然后配置注入层级、位置、方式和高级规则，形成可执行任务。</p>
      </div>
      <a-button type="primary" @click="emit('create-task')">加入任务列表</a-button>
    </div>

    <div class="task-grid">
      <div class="section-stack">
        <article class="section-card">
          <div class="section-head">
            <span class="section-index">01</span>
            <div>
              <strong>故障模板选择</strong>
              <p>从模块 1 中已经保存的模板出发，避免任务与模板语义混淆。</p>
            </div>
          </div>

          <div class="field-block">
            <label>从模板库选择</label>
            <a-select v-model:value="draft.templateId" @change="emit('use-template', $event)">
              <a-select-option v-for="item in templates" :key="item.id" :value="item.id">
                {{ item.templateName }}
              </a-select-option>
            </a-select>
          </div>

          <div class="template-preview-card">
            <strong>{{ draft.templateName }}</strong>
            <span>{{ layerDescription(draft.layer) }}</span>
          </div>

          <div v-if="currentTemplate" class="template-core-card">
            <strong>模板核心参数</strong>
            <span>故障模式：{{ categoryLabel(currentTemplate.category) }} / {{ modeLabel(currentTemplate.mode) }}</span>
            <p>均值 {{ currentTemplate.mean }}，方差 {{ currentTemplate.variance }}，偏差 {{ currentTemplate.bias }}，基础严重度 {{ currentTemplate.severity }}</p>
          </div>
        </article>

        <article class="section-card">
          <div class="section-head">
            <span class="section-index">02</span>
            <div>
              <strong>注入位置配置</strong>
              <p>先选层级，再选目标节点或链路，最后指定具体通道。</p>
            </div>
          </div>

          <div class="field-block">
            <label>注入层级</label>
            <a-radio-group v-model:value="draft.layer" button-style="solid" class="full-group">
              <a-radio-button
                v-for="item in injectionLayerOptions"
                :key="item.value"
                :value="item.value"
              >
                {{ item.label }}
              </a-radio-button>
            </a-radio-group>
          </div>

          <div class="field-grid">
            <div class="field-block">
              <label>目标节点 / 链路</label>
              <a-select v-model:value="draft.location" show-search>
                <a-select-option v-for="item in locationOptions" :key="item" :value="item">
                  {{ item }}
                </a-select-option>
              </a-select>
            </div>
            <div class="field-block">
              <label>信号通道</label>
              <a-select v-model:value="draft.channel" show-search>
                <a-select-option v-for="item in channelOptions" :key="item" :value="item">
                  {{ item }}
                </a-select-option>
              </a-select>
            </div>
          </div>
        </article>

        <article class="section-card">
          <div class="section-head">
            <span class="section-index">03</span>
            <div>
              <strong>注入方法配置</strong>
              <p>注入方法会与层级联动，方法参数只保留与执行方式直接相关的轻量调节。</p>
            </div>
          </div>

          <div class="field-grid">
            <div class="field-block">
              <label>注入方法</label>
              <a-select v-model:value="draft.method">
                <a-select-option v-for="item in methodOptions" :key="item.value" :value="item.value">
                  {{ item.label }}
                </a-select-option>
              </a-select>
            </div>
            <div class="field-block">
              <label>{{ methodMeta?.factorLabel || '方法系数' }}</label>
              <a-input-number v-model:value="draft.methodFactor" :step="0.05" :min="0.1" style="width: 100%" />
            </div>
          </div>

          <div class="method-hint">{{ methodMeta?.hint }}</div>
        </article>

        <article class="section-card">
          <div class="section-head">
            <span class="section-index">04</span>
            <div>
              <strong>高级触发规则</strong>
              <p>配置开始时刻、持续时长、强度系数和触发条件，用于并发模拟多个任务。</p>
            </div>
          </div>

          <div class="advanced-grid">
            <div class="field-block">
              <label>触发时间</label>
              <a-input-number v-model:value="draft.triggerStart" :step="0.5" :min="0" style="width: 100%" />
            </div>
            <div class="field-block">
              <label>持续时长</label>
              <a-input-number v-model:value="draft.duration" :step="0.5" :min="0.5" style="width: 100%" />
            </div>
            <div class="field-block">
              <label>强度系数</label>
              <a-input-number v-model:value="draft.intensity" :step="0.1" :min="0.1" style="width: 100%" />
            </div>
            <div class="field-block">
              <label>触发条件</label>
              <a-select v-model:value="draft.condition">
                <a-select-option v-for="item in triggerConditionOptions" :key="item.value" :value="item.value">
                  {{ item.label }}
                </a-select-option>
              </a-select>
            </div>
          </div>
        </article>
      </div>

      <div class="queue-stack">
        <article class="section-card queue-card">
          <div class="section-head">
            <span class="section-index">05</span>
            <div>
              <strong>已配置注入任务列表</strong>
              <p>任务可以批量部署到画布，并在模块 3 中统一执行。</p>
            </div>
          </div>

          <div class="queue-toolbar">
            <a-space>
              <a-button size="small" @click="emit('deploy-all')">全部部署</a-button>
              <a-button size="small" danger ghost @click="emit('clear-tasks')">清空任务</a-button>
            </a-space>
            <span>{{ tasks.length }} 个任务</span>
          </div>

          <div class="queue-list">
            <div v-for="task in tasks" :key="task.id" class="queue-item">
              <div class="queue-copy">
                <div class="queue-row">
                  <strong>{{ task.name }}</strong>
                  <span class="task-tag" :class="{ 'task-tag--deployed': task.deployedNodeId }">
                    {{ task.deployedNodeId ? '已部署' : '未部署' }}
                  </span>
                </div>
                <span>{{ task.templateName }} -> {{ layerLabel(task.layer) }} -> {{ injectionMethodLabel(task.method) }}</span>
                <small>{{ task.location }} / {{ task.channel }} / {{ task.triggerStart }}s - {{ task.triggerStart + task.duration }}s</small>
              </div>
              <div class="queue-actions">
                <a-button size="small" type="primary" ghost @click="emit('deploy-task', task.id)">加入画布</a-button>
                <a-button size="small" @click="emit('clone-task', task.id)">复制</a-button>
                <a-button size="small" danger @click="emit('remove-task', task.id)">删除</a-button>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup>
import { categoryLabel, injectionMethodLabel, layerDescription, layerLabel, modeLabel } from '../../utils/labels.js';
import { injectionLayerOptions, triggerConditionOptions } from '../../data/faultCatalog.js';

const draft = defineModel('draft', { type: Object, required: true });

defineProps({
  templates: { type: Array, required: true },
  tasks: { type: Array, required: true },
  currentTemplate: { type: Object, default: null },
  methodOptions: { type: Array, required: true },
  methodMeta: { type: Object, default: null },
  locationOptions: { type: Array, required: true },
  channelOptions: { type: Array, required: true },
});

const emit = defineEmits([
  'create-task',
  'deploy-task',
  'clone-task',
  'remove-task',
  'use-template',
  'deploy-all',
  'clear-tasks',
]);
</script>

<style scoped>
.task-panel {
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

.task-grid {
  display: grid;
  grid-template-columns: 1.02fr 0.98fr;
  gap: 14px;
}

.section-stack,
.queue-stack {
  display: grid;
  gap: 12px;
}

.section-card {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid rgba(189, 213, 247, 0.92);
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

.field-grid,
.advanced-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.template-preview-card,
.template-core-card,
.method-hint,
.queue-item {
  padding: 12px;
  border: 1px solid rgba(189, 213, 247, 0.92);
  border-radius: 16px;
  background: rgba(245, 249, 255, 0.86);
}

.template-preview-card strong,
.template-core-card strong,
.queue-copy strong {
  display: block;
  color: #31527c;
}

.template-preview-card span,
.template-core-card span,
.queue-copy span,
.queue-copy small,
.method-hint {
  color: #7590ad;
  font-size: 11px;
  line-height: 1.6;
}

.template-core-card p {
  margin: 6px 0 0;
  color: #607a99;
  font-size: 11px;
  line-height: 1.6;
}

.queue-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.queue-toolbar span {
  color: #7890ad;
  font-size: 11px;
}

.queue-list {
  display: grid;
  gap: 10px;
  max-height: 520px;
  overflow: auto;
  padding-right: 4px;
}

.queue-item {
  display: grid;
  gap: 8px;
}

.queue-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.task-tag {
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(220, 90, 90, 0.12);
  color: #c84f4f;
  font-size: 11px;
  font-weight: 700;
}

.task-tag--deployed {
  background: rgba(47, 128, 255, 0.12);
  color: #2f80ff;
}

.queue-actions {
  display: flex;
  gap: 8px;
}

@media (max-width: 1200px) {
  .task-grid,
  .field-grid,
  .advanced-grid {
    grid-template-columns: 1fr;
  }
}
</style>
