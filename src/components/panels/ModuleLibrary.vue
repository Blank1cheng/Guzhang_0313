<template>
  <section class="panel-card library-panel">
    <div class="panel-head">
      <div class="panel-copy">
        <h3>故障建模库</h3>
        <p>基础模块与已建模板都可直接拖入画布，分组支持上下折叠，避免挤压中间工作台。</p>
      </div>

      <div class="panel-head-actions">
        <div class="library-summary">
          <span>模 {{ counts.templates }}</span>
          <span>任 {{ counts.tasks }}</span>
        </div>
        <a-space size="small">
          <a-button size="small" type="text" @click="toggleAllGroups(false)">展开</a-button>
          <a-button size="small" type="text" @click="toggleAllGroups(true)">折叠</a-button>
        </a-space>
      </div>
    </div>

    <div class="library-groups">
      <article v-for="group in groups" :key="group.key" class="library-group">
        <button type="button" class="group-head" @click="toggleGroup(group.key)">
          <strong>{{ group.label }}</strong>
          <div class="group-meta">
            <span>{{ group.items.length }}</span>
            <em>{{ isCollapsed(group.key) ? '展开' : '收起' }}</em>
          </div>
        </button>

        <div v-show="!isCollapsed(group.key)" class="library-list">
          <div v-for="item in group.items" :key="item.id" class="library-item">
            <div class="item-main" @mousedown.prevent="emit('drag-item', item)">
              <div class="item-token" :style="{ color: item.accent, background: `${item.accent}18` }">{{ item.token }}</div>
              <div class="item-copy">
                <strong>{{ item.label }}</strong>
                <span>{{ item.subtitle }}</span>
              </div>
            </div>

            <div class="item-actions">
              <a-button size="small" @mousedown.prevent="emit('drag-item', item)">拖拽</a-button>
              <a-button size="small" type="primary" ghost @click="emit('add-item', item)">加入画布</a-button>
            </div>

            <div v-if="item.libraryType === 'fault-template'" class="item-extra">
              <a-button size="small" type="link" @click="emit('edit-template', item.templateId)">编辑模板</a-button>
              <a-button size="small" danger type="link" @click="emit('delete-template', item.templateId)">删除</a-button>
            </div>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue';

const props = defineProps({
  groups: { type: Array, required: true },
  counts: { type: Object, required: true },
});

const emit = defineEmits(['drag-item', 'add-item', 'edit-template', 'delete-template']);

const collapsedKeys = ref(['faultTemplates']);

const allGroupKeys = computed(() => props.groups.map((group) => group.key));

watch(
  () => props.groups.map((group) => group.key).join('|'),
  () => {
    collapsedKeys.value = collapsedKeys.value.filter((key) => allGroupKeys.value.includes(key));
  },
  { immediate: true },
);

function isCollapsed(key) {
  return collapsedKeys.value.includes(key);
}

function toggleGroup(key) {
  if (isCollapsed(key)) {
    collapsedKeys.value = collapsedKeys.value.filter((item) => item !== key);
    return;
  }
  collapsedKeys.value = [...collapsedKeys.value, key];
}

function toggleAllGroups(collapse) {
  collapsedKeys.value = collapse ? [...allGroupKeys.value] : [];
}
</script>

<style scoped>
.library-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 16px;
  height: 100%;
  min-height: 0;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.panel-copy {
  min-width: 0;
}

.panel-head h3 {
  margin: 0 0 4px;
  color: #2d4e78;
  font-size: 17px;
}

.panel-head p {
  margin: 0;
  color: #7088a7;
  font-size: 12px;
  line-height: 1.6;
}

.panel-head-actions {
  display: grid;
  justify-items: end;
  gap: 10px;
}

.library-summary {
  display: flex;
  gap: 6px;
}

.library-summary span {
  padding: 5px 9px;
  border-radius: 999px;
  background: rgba(47, 128, 255, 0.1);
  color: #2f80ff;
  font-size: 12px;
  font-weight: 700;
}

.library-groups {
  display: grid;
  gap: 14px;
  align-content: start;
  min-height: 0;
  overflow: auto;
  padding-right: 4px;
}

.library-group {
  display: grid;
  gap: 10px;
}

.group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.group-head strong {
  color: #34557f;
  font-size: 13px;
}

.group-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.group-meta span,
.group-meta em {
  color: #7a8fa9;
  font-size: 12px;
  font-style: normal;
}

.library-list {
  display: grid;
  gap: 8px;
}

.library-item {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid rgba(189, 213, 247, 0.92);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 10px 20px rgba(60, 99, 169, 0.04);
}

.item-main {
  display: flex;
  gap: 10px;
  align-items: center;
  cursor: grab;
}

.item-token {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 800;
  flex-shrink: 0;
}

.item-copy {
  min-width: 0;
}

.item-copy strong {
  display: block;
  color: #2d4d76;
  font-size: 13px;
  line-height: 1.35;
}

.item-copy span {
  display: block;
  margin-top: 3px;
  color: #7490ad;
  font-size: 12px;
  line-height: 1.45;
}

.item-actions {
  display: flex;
  gap: 8px;
}

.item-extra {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
