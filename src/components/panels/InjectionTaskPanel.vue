<template>
  <section class="panel-card task-panel">
    <div class="panel-head">
      <div>
        <h3>注入任务配置</h3>
        <p>从模板出发，配置位置、方法和时序。</p>
      </div>
      <a-button type="primary" @click="emit('create-task')">加入任务</a-button>
    </div>

    <div class="task-flow">
      <article class="section-card">
        <div class="section-head">
          <strong>模板选择</strong>
          <span>先选模板，再配置注入参数</span>
        </div>

        <div class="field-block">
          <label>已保存模板</label>
          <a-select v-model:value="draft.templateId" @change="emit('use-template', $event)">
            <a-select-option v-for="item in templates" :key="item.id" :value="item.id">
              {{ item.templateName }}
            </a-select-option>
          </a-select>
        </div>

        <div class="summary-card">
          <strong>{{ draft.templateName || '未选择模板' }}</strong>
          <span>{{ layerDescription(draft.layer) }}</span>
          <p v-if="currentTemplate">{{ categoryLabel(currentTemplate.category) }} / {{ modeLabel(currentTemplate.mode) }} / 严重度 {{ currentTemplate.severity }}</p>
        </div>
      </article>

      <article class="section-card">
        <div class="section-head">
          <strong>注入目标</strong>
          <span>层级、位置和通道</span>
        </div>

        <div class="field-block">
          <label>注入层级</label>
          <a-radio-group v-model:value="draft.layer" button-style="solid" class="full-group">
            <a-radio-button v-for="item in injectionLayerOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </a-radio-button>
          </a-radio-group>
        </div>

        <div class="field-grid">
          <div class="field-block">
            <label>目标位置</label>
            <a-select v-model:value="draft.location" show-search>
              <a-select-option v-for="item in locationOptions" :key="item" :value="item">
                {{ item }}
              </a-select-option>
            </a-select>
          </div>
          <div class="field-block">
            <label>通道</label>
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
          <strong>注入方法</strong>
          <span>根据层级匹配可用方法</span>
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

        <div class="summary-card summary-card--soft">{{ methodMeta?.hint || '根据当前层级自动绑定可用注入方式。' }}</div>
      </article>

      <article class="section-card">
        <div class="section-head">
          <strong>时序规则</strong>
          <span>设置触发和持续时间</span>
        </div>

        <div class="field-grid field-grid--triple">
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
        </div>

        <div class="field-block">
          <label>触发条件</label>
          <a-select v-model:value="draft.condition">
            <a-select-option v-for="item in triggerConditionOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </a-select-option>
          </a-select>
        </div>
      </article>

      <article class="section-card queue-card">
        <div class="section-head">
          <strong>任务列表</strong>
          <span>{{ tasks.length }} 项</span>
        </div>

        <div class="queue-toolbar">
          <a-button size="small" @click="emit('deploy-all')">批量部署</a-button>
          <a-button size="small" danger ghost @click="emit('clear-tasks')">清空任务</a-button>
        </div>

        <div v-if="tasks.length" class="queue-list">
          <div v-for="task in tasks" :key="task.id" class="queue-item">
            <div class="queue-item__head">
              <div>
                <strong>{{ task.name }}</strong>
                <span>{{ task.templateName }}</span>
              </div>
              <span class="task-tag" :class="{ 'task-tag--deployed': task.deployedNodeId }">
                {{ task.deployedNodeId ? '已部署' : '未部署' }}
              </span>
            </div>
            <p>{{ task.location }} / {{ task.channel }} / {{ task.triggerStart }}s - {{ task.triggerStart + task.duration }}s</p>
            <div class="queue-actions">
              <a-button size="small" type="primary" ghost @click="emit('deploy-task', task.id)">加入画布</a-button>
              <a-button size="small" @click="emit('clone-task', task.id)">复制</a-button>
              <a-button size="small" danger @click="emit('remove-task', task.id)">删除</a-button>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">当前没有注入任务。</div>
      </article>
    </div>
  </section>
</template>

<script setup>
import { categoryLabel, layerDescription, modeLabel } from '../../utils/labels.js';
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
}

.task-flow {
  display: grid;
  gap: 12px;
}

.section-card {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid rgba(189, 213, 247, 0.92);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.88);
}

.section-head,
.queue-item__head,
.queue-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.section-head strong,
.summary-card strong,
.queue-item strong {
  color: #31527c;
}

.section-head span,
.summary-card span,
.summary-card p,
.queue-item span,
.queue-item p {
  color: #7890ad;
  font-size: 12px;
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

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.field-grid--triple {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.summary-card,
.queue-item,
.empty-state {
  padding: 12px;
  border: 1px solid rgba(189, 213, 247, 0.88);
  border-radius: 16px;
  background: rgba(245, 249, 255, 0.86);
}

.summary-card {
  display: grid;
  gap: 4px;
}

.summary-card--soft {
  color: #607a99;
  line-height: 1.6;
}

.queue-list {
  display: grid;
  gap: 10px;
  max-height: 320px;
  overflow: auto;
  padding-right: 4px;
}

.task-tag {
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(220, 90, 90, 0.12);
  color: #c84f4f;
  font-size: 12px;
  font-weight: 700;
}

.task-tag--deployed {
  background: rgba(47, 128, 255, 0.12);
  color: #2f80ff;
}

.queue-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.empty-state {
  display: grid;
  place-items: center;
  color: #7a90ac;
  min-height: 120px;
  border-style: dashed;
  background: rgba(247, 250, 255, 0.72);
}

@media (max-width: 720px) {
  .field-grid,
  .field-grid--triple {
    grid-template-columns: 1fr;
  }
}
</style>
