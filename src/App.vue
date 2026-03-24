<template>
  <div class="app-shell">
    <input
      ref="workspaceInputRef"
      type="file"
      accept=".json,application/json"
      hidden
      @change="handleWorkspaceFileChange"
    >

    <section class="top-shell">
      <div class="top-shell__header">
        <div class="top-brand">
          <span class="top-brand__kicker">EXP_0312</span>
          <div class="top-brand__copy">
            <h1>故障注入平台</h1>
            <small>围绕多信号传播建模、故障建模、故障配置、仿真执行与结果分析的轻量工作台。</small>
          </div>
        </div>

        <div class="top-nav">
          <div class="view-tabs view-tabs--header">
            <button
              v-for="item in viewOptions"
              :key="item.value"
              type="button"
              class="view-tab"
              :class="{ 'view-tab--active': activeView === item.value }"
              @click="activeView = item.value"
            >
              {{ item.shortLabel }}
            </button>
          </div>
        </div>

        <div class="top-action-row">
          <div class="top-brand__meta top-brand__meta--compact">
            <span class="header-status" :class="`header-status--${runtime.status}`">{{ runtimeStatusText }}</span>
            <span class="header-meta">仿真 {{ runtime.simTime.toFixed(1) }}s</span>
            <span class="header-meta">节点 {{ canvasCounts.nodes }}</span>
            <span class="header-meta">任务 {{ injectionTasks.length }}</span>
          </div>
          <div class="header-action-group header-action-group--compact">
            <a-button class="header-action header-action--primary" :disabled="!runtimeControls.canStart" @click="handleRuntimeStart">开始</a-button>
            <a-button class="header-action" :disabled="!runtimeControls.canPause" @click="handleRuntimePause">暂停</a-button>
            <a-button class="header-action" :disabled="!runtimeControls.canStep" @click="handleRuntimeStep">单步</a-button>
            <a-button class="header-action header-action--danger" :disabled="!runtimeControls.canStop" danger @click="handleRuntimeStop">停止</a-button>
            <a-button class="header-action" :disabled="runtime.status === 'running'" @click="handleResetWorkspace">重置</a-button>
          </div>
        </div>
      </div>
    </section>

    <template v-if="activeView === 'overview'">
      <section class="overview-shell">
        <article class="panel-card workflow-board workflow-board--linear">
          <div class="workflow-board__steps workflow-board__steps--linear">
            <article
              v-for="item in workflowSteps"
              :key="item.key"
              class="workflow-arrow"
              :class="`workflow-arrow--${item.state}`"
            >
              <span class="workflow-arrow__index">{{ Number(item.index) }}</span>
              <span class="workflow-arrow__label">{{ item.label }}</span>
              <small class="workflow-arrow__hint">{{ item.hint }}</small>
            </article>
          </div>
        </article>

        <div class="overview-layout">
          <aside class="panel-card library-panel library-panel--sidebar">
            <div class="library-panel__head">
              <div class="panel-section-head panel-section-head--compact">
                <div class="section-badge">01</div>
                <div>
                  <h3>故障建模库</h3>
                  <p>左侧常驻画布，直接拖拽模板与基础模块，构建故障注入流程。</p>
                </div>
              </div>
              <div class="library-panel__head-actions">
                <span class="panel-head-pill">{{ activeLibraryCount }} 项</span>
                <div class="library-panel__head-buttons">
                  <a-button size="small" class="header-action--modeling" @click="handleOpenModelingEntry">新建</a-button>
                  <a-button size="small" @click="toggleLibraryCatalog()">{{ libraryCatalogCollapsed ? '展开' : '收起' }}</a-button>
                </div>
              </div>
            </div>

            <div class="library-search-row">
              <a-input v-model:value="templateKeyword" allow-clear placeholder="搜索模板、模式或模块" />
              <a-button size="small" @click="templateKeyword = ''">清空</a-button>
            </div>

            <div class="library-pane-tabs">
              <button
                v-for="item in libraryPaneOptions"
                :key="item.value"
                type="button"
                class="library-pane-tab"
                :class="{ 'library-pane-tab--active': activeLibraryPane === item.value }"
                @click="activeLibraryPane = item.value"
              >
                <span>{{ item.label }}</span>
                <strong>{{ item.value === 'faults' ? filteredTemplates.length : filteredBasicLibraryItems.length }}</strong>
              </button>
            </div>

            <div class="library-selected-card library-selected-card--mounted">
              <div class="library-selected-card__head">
                <div class="panel-mini-head panel-mini-head--stack">
                  <strong>{{ activeLibraryPane === 'faults' ? '当前模板' : '模块视图' }}</strong>
                  <span>{{ activeLibraryPane === 'faults' ? '模板本体会同步到注入配置区' : '拖拽源 / 流程 / 观测模块' }}</span>
                </div>
                <span class="library-selected-card__hint">{{ activeLibraryCount }} 项</span>
              </div>

              <template v-if="activeLibraryPane === 'faults'">
                <div class="field-inline field-inline--stack">
                  <span class="field-label">模板下拉</span>
                  <a-select :value="taskDraft.templateId" @change="handleTemplatePanelSelect">
                    <a-select-option v-for="item in filteredTemplates" :key="item.id" :value="item.id">
                      {{ item.templateName }}
                    </a-select-option>
                  </a-select>
                </div>

                <div class="template-summary-card__meta">
                  <span class="category-tag" :class="`category-tag--${templateDraft.category}`">{{ selectedTemplateMeta.category }}</span>
                  <span class="mode-tag">{{ selectedTemplateMeta.mode }}</span>
                </div>
                <strong>{{ taskDraft.templateName || '未选择模板' }}</strong>
                <small>{{ selectedTemplateMeta.summary }}</small>

                <div class="library-selected-actions">
                  <a-button size="small" type="primary" ghost :disabled="!taskDraft.templateId" @mousedown.prevent="handleFaultTemplateDrag(taskDraft.templateId)">
                    拖入画布
                  </a-button>
                  <a-button size="small" :disabled="!taskDraft.templateId" @click="handleCreateTask">加入任务</a-button>
                  <a-button size="small" @click="openModelingModal(taskDraft.templateId)">进入建模页</a-button>
                </div>
              </template>

              <template v-else>
                <strong>基础模块库</strong>
                <small>拖拽源、处理链路和观测模块到画布搭建基础流程。</small>
                <div class="library-selected-actions">
                  <a-button size="small" type="primary" ghost @click="openLibraryDrawer">展开模块库</a-button>
                  <a-button size="small" @click="fitCanvasView">适配画布</a-button>
                </div>
              </template>
            </div>

            <div v-show="!libraryCatalogCollapsed" class="library-browser-shell library-browser-shell--sidebar">
              <div v-if="activeLibraryPane === 'faults'" class="library-browser-scroll">
                <div class="field-inline field-inline--stack">
                  <span class="field-label">模板分类</span>
                  <a-select :value="activeTemplateFilter" @change="activeTemplateFilter = $event">
                    <a-select-option v-for="item in templateFilterOptions" :key="item.value" :value="item.value">
                      {{ item.label }}
                    </a-select-option>
                  </a-select>
                </div>

                <section
                  v-for="section in faultTemplateSections"
                  :key="section.key"
                  class="library-browser-group"
                >
                  <div class="panel-mini-head panel-mini-head--browser">
                    <strong>{{ section.label }}</strong>
                    <span>{{ section.hint }} / {{ section.items.length }}</span>
                  </div>

                  <div class="library-template-list library-template-list--browser">
                    <button
                      v-for="item in section.items"
                      :key="item.id"
                      type="button"
                      class="library-template-item library-template-item--browser"
                      :class="{ 'library-template-item--active': item.id === taskDraft.templateId }"
                      @click="handleTemplatePanelSelect(item.id)"
                    >
                      <div class="library-template-item__head">
                        <span class="category-tag" :class="`category-tag--${item.category}`">{{ categoryLabel(item.category) }}</span>
                        <small>{{ modeLabel(item.mode) }}</small>
                      </div>
                      <strong>{{ item.templateName }}</strong>
                      <span class="library-template-item__summary">{{ templateSummary(item) }}</span>

                      <div class="library-template-item__actions">
                        <a-button size="small" type="primary" ghost @mousedown.prevent.stop="handleFaultTemplateDrag(item.id)">
                          拖拽
                        </a-button>
                        <a-button size="small" @click.stop="openModelingModal(item.id)">编辑</a-button>
                      </div>
                    </button>
                  </div>
                </section>

                <div v-if="!faultTemplateSections.length" class="empty-card">
                  当前筛选条件下没有匹配模板。
                </div>
              </div>

              <div v-else class="library-browser-scroll">
                <section
                  v-for="section in basicLibrarySections"
                  :key="section.key"
                  class="library-browser-group"
                >
                  <div class="panel-mini-head panel-mini-head--browser">
                    <strong>{{ section.label }}</strong>
                    <span>{{ section.hint }}</span>
                  </div>

                  <div class="library-module-list">
                    <div
                      v-for="item in section.items"
                      :key="item.id"
                      class="library-module-row"
                    >
                      <button
                        type="button"
                        class="library-module-row__main"
                        @mousedown.prevent="handleLibraryDrag(item)"
                      >
                        <span class="library-module-item__token" :style="{ color: item.accent, background: `${item.accent}18` }">{{ item.token }}</span>
                        <div class="library-module-row__copy">
                          <strong>{{ item.label }}</strong>
                          <small>{{ item.subtitle }}</small>
                        </div>
                      </button>

                      <div class="library-module-row__meta">
                        <span class="library-port-chip">{{ item.group === 'source' ? 'O 1' : item.group === 'scope' ? 'I 1' : 'I 1 / O 1' }}</span>
                        <a-button size="small" @click="handleLibraryAdd(item)">加入</a-button>
                      </div>
                    </div>
                  </div>
                </section>

                <div v-if="!basicLibrarySections.length" class="empty-card">
                  当前筛选条件下没有匹配模块。
                </div>
              </div>
            </div>

            <article class="library-runtime-card">
              <div class="panel-mini-head panel-mini-head--browser">
                <strong>执行摘要</strong>
                <a-button size="small" @click="activeView = 'execution'">进入仿真</a-button>
              </div>

              <div class="library-runtime-grid">
                <div class="library-runtime-box">
                  <span>状态</span>
                  <strong>{{ runtimeStatusText }}</strong>
                </div>
                <div class="library-runtime-box">
                  <span>时间</span>
                  <strong>{{ runtime.simTime.toFixed(1) }}s</strong>
                </div>
                <div class="library-runtime-box">
                  <span>已部署</span>
                  <strong>{{ deployedTaskCount }}</strong>
                </div>
                <div class="library-runtime-box">
                  <span>恢复率</span>
                  <strong>{{ recoveryRateText }}</strong>
                </div>
              </div>

              <div class="library-runtime-actions">
                <a-button size="small" type="primary" :disabled="!runtimeControls.canStart" @click="handleRuntimeStart">开始</a-button>
                <a-button size="small" :disabled="!runtimeControls.canPause" @click="handleRuntimePause">暂停</a-button>
                <a-button size="small" :disabled="!runtimeControls.canStep" @click="handleRuntimeStep">步进</a-button>
                <a-button size="small" danger ghost :disabled="!runtimeControls.canStop" @click="handleRuntimeStop">终止</a-button>
              </div>
            </article>
          </aside>

          <transition name="library-drawer">
            <aside v-if="libraryExpanded" class="panel-card library-drawer">
              <div class="library-panel__head">
                <div class="panel-section-head panel-section-head--compact">
                  <div class="section-badge">01</div>
                  <div>
                    <h3>模板库</h3>
                    <p>左侧完整浏览，拖拽到画布后继续配置与部署。</p>
                  </div>
                </div>
                <div class="library-panel__head-actions">
                  <span class="panel-head-pill">{{ activeLibraryCount }} 项</span>
                  <a-button size="small" @click="toggleLibraryExpanded(false)">收起模块库</a-button>
                </div>
              </div>

              <div class="panel-stack">
                <div class="library-search-row">
                  <a-input v-model:value="templateKeyword" allow-clear placeholder="搜索模板、模式或模块" />
                  <a-button size="small" @click="templateKeyword = ''">清空</a-button>
                </div>

                <div class="library-pane-tabs">
                  <button
                    v-for="item in libraryPaneOptions"
                    :key="item.value"
                    type="button"
                    class="library-pane-tab"
                    :class="{ 'library-pane-tab--active': activeLibraryPane === item.value }"
                    @click="activeLibraryPane = item.value"
                  >
                    <span>{{ item.label }}</span>
                    <strong>{{ item.value === 'faults' ? filteredTemplates.length : filteredBasicLibraryItems.length }}</strong>
                  </button>
                </div>

                <div class="library-selected-card library-selected-card--mounted">
                  <div class="library-selected-card__head">
                    <div class="panel-mini-head panel-mini-head--stack">
                      <strong>当前挂载</strong>
                      <span>{{ activeLibraryPane === 'faults' ? '拖拽故障模板' : '浏览基础模块' }}</span>
                    </div>
                    <span class="library-selected-card__hint">{{ activeLibraryCount }} 项</span>
                  </div>

                  <div class="field-inline field-inline--stack">
                    <span class="field-label">模板下拉</span>
                    <a-select :value="taskDraft.templateId" @change="handleTemplatePanelSelect">
                      <a-select-option v-for="item in filteredTemplates" :key="item.id" :value="item.id">
                        {{ item.templateName }}
                      </a-select-option>
                    </a-select>
                  </div>

                  <div class="template-summary-card__meta">
                    <span class="category-tag" :class="`category-tag--${templateDraft.category}`">{{ selectedTemplateMeta.category }}</span>
                    <span class="mode-tag">{{ selectedTemplateMeta.mode }}</span>
                  </div>
                  <strong>{{ taskDraft.templateName || '未选择模板' }}</strong>
                  <small>{{ selectedTemplateMeta.summary }}</small>

                  <div class="library-selected-actions">
                    <a-button size="small" type="primary" ghost :disabled="!taskDraft.templateId" @mousedown.prevent="handleFaultTemplateDrag(taskDraft.templateId)">
                      拖入画布
                    </a-button>
                    <a-button size="small" :disabled="!taskDraft.templateId" @click="handleCreateTask">加入任务</a-button>
                    <a-button size="small" @click="openModelingModal(taskDraft.templateId)">进入建模页</a-button>
                  </div>
                </div>

                <div class="library-browser-shell">
                  <div v-if="activeLibraryPane === 'faults'" class="library-browser-scroll">
                    <div class="field-inline field-inline--stack">
                      <span class="field-label">模板分类</span>
                      <a-select :value="activeTemplateFilter" @change="activeTemplateFilter = $event">
                        <a-select-option v-for="item in templateFilterOptions" :key="item.value" :value="item.value">
                          {{ item.label }}
                        </a-select-option>
                      </a-select>
                    </div>

                    <section
                      v-for="section in faultTemplateSections"
                      :key="section.key"
                      class="library-browser-group"
                    >
                      <div class="panel-mini-head panel-mini-head--browser">
                        <strong>{{ section.label }}</strong>
                        <span>{{ section.hint }} / {{ section.items.length }}</span>
                      </div>

                      <div class="library-template-list library-template-list--browser">
                        <button
                          v-for="item in section.items"
                          :key="item.id"
                          type="button"
                          class="library-template-item library-template-item--browser"
                          :class="{ 'library-template-item--active': item.id === taskDraft.templateId }"
                          @click="handleTemplatePanelSelect(item.id)"
                        >
                          <div class="library-template-item__head">
                            <span class="category-tag" :class="`category-tag--${item.category}`">{{ categoryLabel(item.category) }}</span>
                            <small>{{ modeLabel(item.mode) }}</small>
                          </div>
                          <strong>{{ item.templateName }}</strong>
                          <span class="library-template-item__summary">{{ templateSummary(item) }}</span>

                          <div class="library-template-item__actions">
                            <a-button size="small" type="primary" ghost @mousedown.prevent.stop="handleFaultTemplateDrag(item.id)">
                              拖拽
                            </a-button>
                            <a-button size="small" @click.stop="openModelingModal(item.id)">编辑</a-button>
                          </div>
                        </button>
                      </div>
                    </section>

                    <div v-if="!faultTemplateSections.length" class="empty-card">
                      当前筛选条件下没有匹配模板。</div>
                  </div>

                  <div v-else class="library-browser-scroll">
                    <section
                      v-for="section in basicLibrarySections"
                      :key="section.key"
                      class="library-browser-group"
                    >
                      <div class="panel-mini-head panel-mini-head--browser">
                        <strong>{{ section.label }}</strong>
                        <span>{{ section.hint }}</span>
                      </div>

                      <div class="library-module-list">
                        <div
                          v-for="item in section.items"
                          :key="item.id"
                          class="library-module-row"
                        >
                          <button
                            type="button"
                            class="library-module-row__main"
                            @mousedown.prevent="handleLibraryDrag(item)"
                          >
                            <span class="library-module-item__token" :style="{ color: item.accent, background: `${item.accent}18` }">{{ item.token }}</span>
                            <div class="library-module-row__copy">
                              <strong>{{ item.label }}</strong>
                              <small>{{ item.subtitle }}</small>
                            </div>
                          </button>

                          <div class="library-module-row__meta">
                            <span class="library-port-chip">{{ item.group === 'source' ? 'O 1' : item.group === 'scope' ? 'I 1' : 'I 1 / O 1' }}</span>
                            <a-button size="small" @click="handleLibraryAdd(item)">加入</a-button>
                          </div>
                        </div>
                      </div>
                    </section>

                    <div v-if="!basicLibrarySections.length" class="empty-card">
                      当前筛选条件下没有匹配模块。</div>
                  </div>
                </div>

                <div class="library-actions">
                  <a-button @click="toggleLibraryExpanded(false)">收起模块库</a-button>
                  <a-button type="primary" ghost @click="openModelingModal(templateDraft.id)">编辑当前模板</a-button>
                  <a-button type="primary" @click="handleSaveTemplate">保存当前模板</a-button>
                </div>
              </div>
            </aside>
          </transition>

          <div class="panel-card scene-toolbar">
            <div class="scene-toolbar__left">
              <div class="toolbar-field">
                <span>场景预设</span>
                <a-select :value="activePresetId" style="width: 220px" @change="handleApplyPreset">
                  <a-select-option v-for="item in scenarioPresetOptions" :key="item.value" :value="item.value">
                    {{ item.label }}
                  </a-select-option>
                </a-select>
              </div>

              <div class="metric-cluster metric-cluster--soft">
                <span class="metric-pill">节点 {{ canvasCounts.nodes }}</span>
                <span class="metric-pill">链路 {{ canvasCounts.edges }}</span>
                <span class="metric-pill">故障 {{ canvasCounts.faults }}</span>
                <span class="metric-pill">任务 {{ injectionTasks.length }}</span>
              </div>
            </div>

            <div class="flow-strip flow-strip--mini">
              <div v-for="item in runFlowSteps" :key="item.key" class="flow-mini-item">
                <span class="flow-mini-item__index">{{ item.index }}</span>
                <div class="flow-mini-item__copy">
                  <strong>{{ item.label }}</strong>
                  <small>{{ item.hint }}</small>
                </div>
                <span class="run-flow-state" :class="`run-flow-state--${item.state}`">{{ item.stateText }}</span>
              </div>
            </div>

            <div class="scene-toolbar__actions">
              <div class="tool-group">
                <span class="tool-group__label">画布</span>
                <div class="action-group">
                  <a-button size="small" @click="fitCanvasView">适配视图</a-button>
                  <a-button size="small" @click="deleteCanvasSelection">删除</a-button>
                  <a-button size="small" @click="openLibraryDrawer">展开库</a-button>
                  <a-button size="small" type="primary" ghost @click="openTaskDrawer">配置子页</a-button>
                </div>
              </div>
            </div>
          </div>

          <aside class="panel-card config-panel">
            <div class="panel-section-head panel-section-head--compact">
              <div class="section-badge">02</div>
              <div>
                <h3>注入配置</h3>
                <p>常驻右栏用于快速配置，复杂任务可进入完整配置子页。</p>
              </div>
              <a-button size="small" @click="openTaskDrawer">进入子页</a-button>
            </div>

            <div class="config-panel__grid">
              <div class="config-template-summary">
                <strong>{{ taskDraft.templateName || '未选择模板' }}</strong>
                <span>{{ selectedTemplateMeta.category }} / {{ selectedTemplateMeta.mode }}</span>
                <small>{{ selectedTemplateMeta.summary }}</small>
              </div>

              <div class="config-method-banner">
                <span>当前注入方式</span>
                <strong>{{ currentMethodLabel }}</strong>
                <small>{{ currentMethodMeta?.hint || '按当前层级自动匹配注入方式。' }}</small>
              </div>

              <div class="config-section">
                <div class="config-section__head">
                  <strong>注入目标</strong>
                  <span>先定层级，再绑定节点位置与通道。</span>
                </div>

                <div class="config-section__grid">
                  <div class="param-field">
                    <span>注入层级</span>
                    <a-select v-model:value="taskDraft.layer">
                      <a-select-option v-for="item in injectionLayerOptions" :key="item.value" :value="item.value">
                        {{ item.label }}
                      </a-select-option>
                    </a-select>
                  </div>

                  <div class="param-field">
                    <span>目标位置</span>
                    <a-select v-model:value="taskDraft.location" show-search>
                      <a-select-option v-for="item in graphLocations" :key="item" :value="item">
                        {{ item }}
                      </a-select-option>
                    </a-select>
                  </div>

                  <div class="param-field config-section__field--full">
                    <span>通道</span>
                    <a-select v-model:value="taskDraft.channel" show-search>
                      <a-select-option v-for="item in graphChannels" :key="item" :value="item">
                        {{ item }}
                      </a-select-option>
                    </a-select>
                  </div>
                </div>
              </div>

              <div class="config-section">
                <div class="config-section__head">
                  <strong>时序规则</strong>
                  <span>控制触发时间、持续长度与强度放大。</span>
                </div>

                <div class="config-section__grid">
                  <div class="param-field">
                    <span>{{ currentMethodMeta?.factorLabel || '方法系数' }}</span>
                    <a-input-number v-model:value="taskDraft.methodFactor" :step="0.05" :min="0.1" style="width: 100%" />
                  </div>

                  <div class="param-field">
                    <span>触发时间</span>
                    <a-input-number v-model:value="taskDraft.triggerStart" :step="0.5" :min="0" style="width: 100%" />
                  </div>

                  <div class="param-field">
                    <span>持续时长</span>
                    <a-input-number v-model:value="taskDraft.duration" :step="0.5" :min="0.5" style="width: 100%" />
                  </div>

                  <div class="param-field">
                    <span>强度系数</span>
                    <a-input-number v-model:value="taskDraft.intensity" :step="0.1" :min="0.1" style="width: 100%" />
                  </div>

                  <div class="param-field">
                    <span>触发条件</span>
                    <a-select v-model:value="taskDraft.condition">
                      <a-select-option v-for="item in triggerConditionOptions" :key="item.value" :value="item.value">
                        {{ item.label }}
                      </a-select-option>
                    </a-select>
                  </div>
                </div>
              </div>

              <div class="config-tip">
                <span>当前模板</span>
                <strong>{{ taskDraft.templateName || '未选择模板' }}</strong>
                <small>{{ layerLabel(taskDraft.layer) }} / {{ currentMethodLabel }}</small>
              </div>

              <div class="config-panel__actions">
                <a-button type="primary" @click="handleCreateTask">加入任务</a-button>
                <a-button :disabled="!taskRows.length || runtime.status === 'running'" @click="handleDeployAllTasks">批量部署</a-button>
                <a-button @click="openTaskDrawer">完整配置</a-button>
              </div>
            </div>

            <section class="config-task-board">
              <div class="panel-mini-head panel-mini-head--browser">
                <strong>任务列表</strong>
                <span>{{ taskRows.length }} 项</span>
              </div>

              <div v-if="taskRows.length" class="overview-task-list overview-task-list--scroll">
                <article v-for="task in taskRows" :key="task.id" class="overview-task-item overview-task-item--board">
                  <div class="overview-task-item__main">
                    <strong>{{ task.name }}</strong>
                    <small>{{ task.location }} / {{ task.channel }}</small>
                    <small>{{ task.triggerStart }}s - {{ task.endTime }}s · {{ task.methodLabel || task.method }}</small>
                  </div>
                  <div class="overview-task-item__meta">
                    <span class="deploy-pill" :class="task.deployedNodeId ? 'deploy-pill--done' : 'deploy-pill--ready'">
                      {{ task.deployedNodeId ? '已部署' : '待部署' }}
                    </span>
                    <a-button size="small" type="primary" ghost @click="handleDeployTask(task.id)">部署</a-button>
                    <a-button size="small" danger @click="handleRemoveTask(task.id)">删除</a-button>
                  </div>
                </article>
              </div>
              <div v-else class="empty-card empty-card--compact">当前还没有配置任务，先从模板创建任务再部署到画布。</div>

              <details class="task-legend">
                <summary>注入层级说明</summary>
                <div class="task-legend__list">
                  <div class="task-legend__item"><span class="task-legend__swatch task-legend__swatch--physical"></span><small>物理层：参数修改式注入</small></div>
                  <div class="task-legend__item"><span class="task-legend__swatch task-legend__swatch--electrical"></span><small>电气层：信号叠加式注入</small></div>
                  <div class="task-legend__item"><span class="task-legend__swatch task-legend__swatch--protocol"></span><small>协议层：链路数据篡改式注入</small></div>
                </div>
              </details>
            </section>

            <section class="config-property-card">
              <div class="panel-mini-head panel-mini-head--browser">
                <strong>节点属性</strong>
                <a-button size="small" :disabled="!selectedFaultNode" @click="propertyDrawerOpen = true">详细</a-button>
              </div>

              <div v-if="selectedFaultNode" class="config-property-grid">
                <div class="property-field">
                  <label>节点名称</label>
                  <strong>{{ selectedFaultNode.name }}</strong>
                </div>
                <div class="property-field">
                  <label>故障模式</label>
                  <strong>{{ categoryLabel(selectedFaultNode.category) }}</strong>
                </div>
                <div class="property-field">
                  <label>故障类型</label>
                  <strong>{{ modeLabel(selectedFaultNode.mode) }}</strong>
                </div>
                <div class="property-field">
                  <label>作用位置</label>
                  <strong>{{ `${selectedFaultNode.location} / ${layerLabel(selectedFaultNode.injectionLayer)}` }}</strong>
                </div>
              </div>
              <div v-else class="property-empty">
                <strong>未选中故障节点</strong>
                <p>选中画布中的故障节点后，在这里查看摘要并进入详细编辑。</p>
              </div>
            </section>
          </aside>

          <article class="panel-card canvas-panel canvas-panel--main canvas-panel--focus">
            <div class="workspace-shell">
              <aside class="workspace-rail">
                <button type="button" class="workspace-rail__button" @click="openLibraryDrawer">
                  <span class="workspace-rail__token">LIB</span>
                  <span>模块库</span>
                </button>
                <button
                  type="button"
                  class="workspace-rail__button"
                  :disabled="!hasSystemModel"
                  @click="handleOpenModelingEntry"
                >
                  <span class="workspace-rail__token">MOD</span>
                  <span>故障建模</span>
                </button>
                <button
                  type="button"
                  class="workspace-rail__button"
                  :disabled="!hasSystemModel"
                  @click="handleOpenConfigEntry"
                >
                  <span class="workspace-rail__token">CFG</span>
                  <span>故障配置</span>
                </button>
                <button
                  type="button"
                  class="workspace-rail__button"
                  :disabled="!selectedNode && !selectedEdge"
                  @click="propertyDrawerOpen = true"
                >
                  <span class="workspace-rail__token">ATR</span>
                  <span>属性</span>
                </button>
                <button
                  type="button"
                  class="workspace-rail__button"
                  @click="scopeModalOpen = true"
                >
                  <span class="workspace-rail__token">SCP</span>
                  <span>示波器</span>
                </button>
              </aside>

              <div class="canvas-stage canvas-stage--focus">
                <div class="canvas-stage__head">
                  <div>
                    <strong>{{ hasSystemModel ? '多信号传播建模画布' : '请导入模型完成建模' }}</strong>
                    <small>{{ hasSystemModel ? workflowHeadline : '导入系统模型后，在画布上完成链路搭建、故障挂接和示波器配置。' }}</small>
                  </div>
                  <div class="canvas-stage__head-actions">
                    <a-button size="small" @click="openWorkspaceImport">导入</a-button>
                    <a-button size="small" :disabled="!hasSystemModel" @click="handleExportWorkspace">导出</a-button>
                    <a-button size="small" class="header-action--modeling" :disabled="!hasSystemModel" @click="handleOpenModelingEntry">故障建模</a-button>
                    <a-button size="small" type="primary" ghost :disabled="!hasSystemModel" @click="handleOpenConfigEntry">故障配置</a-button>
                  </div>
                </div>

                <div class="canvas-stage__status canvas-stage__status--focus">
                  <div class="canvas-stage__status-main">
                    <span class="stage-chip">预设 {{ scenarioPresetOptions.find((item) => item.value === activePresetId)?.label || '基础流程' }}</span>
                    <span class="stage-chip">窗口 {{ taskWindowText }}</span>
                    <span class="stage-chip">目标 {{ selectedTargetText }}</span>
                    <span class="stage-chip">任务 {{ injectionTasks.length }}</span>
                  </div>
                  <span class="canvas-stage__status-note">旧的建模页、配置窗和属性窗继续保留，从画布周边入口直接调起。</span>
                </div>

                <div
                  class="canvas-stage__surface"
                  :class="{
                    'canvas-stage__surface--empty': canvasGuide?.mode === 'empty',
                    'canvas-stage__surface--dragging': canvasGuide?.mode === 'dragging',
                    'canvas-stage__surface--placed': canvasGuide?.mode === 'placed',
                  }"
                >
                  <div class="canvas-stage__toolbar">
                    <button type="button" class="canvas-mini-button" aria-label="适配视图" title="适配视图" @click="fitCanvasView">适配</button>
                    <button type="button" class="canvas-mini-button" aria-label="删除选中" title="删除选中" @click="deleteCanvasSelection">删除</button>
                    <button type="button" class="canvas-mini-button" aria-label="查看属性" title="查看属性" @click="propertyDrawerOpen = true">属性</button>
                    <button type="button" class="canvas-mini-button" aria-label="查看示波器波形" title="查看示波器波形" @click="scopeModalOpen = true">示波</button>
                  </div>

                  <div v-if="canvasGuide" class="canvas-empty-guide" :class="`canvas-empty-guide--${canvasGuide.mode}`">
                    <span class="canvas-empty-guide__token">{{ hasSystemModel ? canvasGuide.token : '01' }}</span>
                    <strong>{{ hasSystemModel ? canvasGuide.title : '请导入模型完成建模' }}</strong>
                    <p>{{ hasSystemModel ? canvasGuide.text : '完成多信号传播模型导入后，再进入故障建模、故障配置和仿真执行。' }}</p>
                    <div v-if="canvasGuide.mode === 'empty'" class="canvas-empty-guide__actions">
                      <a-button size="small" type="primary" @click="openWorkspaceImport">导入模型</a-button>
                      <a-button size="small" @click="handleApplyPreset('baseline')">加载示例</a-button>
                      <a-button size="small" :disabled="!hasSystemModel" @click="handleOpenModelingEntry">故障建模</a-button>
                    </div>
                  </div>

                  <WorkbenchCanvas
                    ref="canvasRef"
                    :initial-graph="{ nodes: graphNodes, edges: graphEdges }"
                    @graph-change="syncGraph"
                    @selection-change="setSelectedElement"
                    @element-deleted="handleCanvasElementDeleted"
                    @node-added="handleCanvasNodeAdded"
                  />

                  <div v-if="selectedFaultNode" class="canvas-property-float">
                    <div class="canvas-property-float__head">
                      <strong>{{ selectedFaultNode.name }}</strong>
                      <a-button size="small" @click="propertyDrawerOpen = true">详细</a-button>
                    </div>
                    <div class="canvas-property-float__grid">
                      <span>模式</span>
                      <strong>{{ categoryLabel(selectedFaultNode.category) }}</strong>
                      <span>类型</span>
                      <strong>{{ modeLabel(selectedFaultNode.mode) }}</strong>
                      <span>位置</span>
                      <strong>{{ selectedFaultNode.location }}</strong>
                      <span>层级</span>
                      <strong>{{ layerLabel(selectedFaultNode.injectionLayer) }}</strong>
                    </div>
                  </div>
                </div>

                <div class="canvas-stage__footer canvas-stage__footer--focus">
                  <div class="canvas-inline-status canvas-inline-status--metric">
                    <span>进度</span>
                    <strong>{{ runtimeProgressPercent }}%</strong>
                    <div class="progress-track progress-track--inline">
                      <span class="progress-track__bar" :style="{ width: `${runtimeProgressPercent}%` }"></span>
                    </div>
                  </div>
                  <div class="canvas-inline-status canvas-inline-status--metric">
                    <span>状态</span>
                    <strong>{{ runtimeStatusText }}</strong>
                    <small>{{ deployedTaskCount }} 个任务已部署</small>
                  </div>
                  <div class="canvas-inline-status canvas-inline-status--metric">
                    <span>时间</span>
                    <strong>{{ runtime.simTime.toFixed(1) }}s</strong>
                    <small>视界 {{ runtimeHorizonSeconds.toFixed(1) }}s</small>
                  </div>
                  <div class="canvas-inline-status canvas-inline-status--log">
                    <span>日志</span>
                    <strong>{{ logs.length }} 条</strong>
                    <div class="log-preview">{{ latestLogText }}</div>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <a-drawer
        :open="leftDrawerOpen"
        placement="right"
        :width="520"
        :body-style="{ padding: '16px', background: '#f5f9ff' }"
        @close="leftDrawerOpen = false"
      >
        <template #title>故障注入配置 · 完整视图</template>

        <InjectionTaskPanel
          v-model:draft="taskDraft"
          :templates="faultTemplates"
          :tasks="injectionTasks"
          :current-template="currentTaskTemplate"
          :method-options="currentTaskMethodOptions"
          :method-meta="currentMethodMeta"
          :location-options="graphLocations"
          :channel-options="graphChannels"
          @use-template="selectTemplateForInjection"
          @create-task="handleCreateTask"
          @deploy-task="handleDeployTask"
          @clone-task="cloneInjectionTask"
          @remove-task="handleRemoveTask"
          @deploy-all="handleDeployAllTasks"
          @clear-tasks="handleClearTasks"
        />

        <div class="drawer-confirm-row">
          <a-button type="primary" @click="leftDrawerOpen = false">确认并返回主界面</a-button>
        </div>
      </a-drawer>

    </template>
    <template v-else-if="activeView === 'generation'">
      <section class="generation-layout">
        <header class="generation-header panel-card">
          <div class="generation-header__title">
            <span class="focus-kicker">模板建模</span>
            <div class="generation-header__route">
              <span class="meta-chip meta-chip--stage">02 故障建模</span>
              <span class="meta-chip">模板 {{ faultTemplates.length }}</span>
              <span class="meta-chip">参数 {{ generationParameterCount }}</span>
            </div>
            <div class="generation-header__headline">
              <h2>建模工作台</h2>
              <div class="generation-header__brief">
                <span class="meta-chip">{{ selectedTemplateMeta.category }}</span>
                <span class="meta-chip">{{ selectedTemplateMeta.mode }}</span>
                <span class="meta-chip">{{ generationParameterCount }} 项参数</span>
                <span class="meta-chip">模板 {{ faultTemplates.length }}</span>
              </div>
            </div>
            <p>直接定义模板本体、调整参数并管理已建模板，保存后回流主界面拖拽复用。</p>
          </div>

          <div class="generation-header__actions">
            <a-button type="primary" @click="handleSaveTemplateAndReturn">保存并返回主界面</a-button>
            <a-button @click="openLibraryDrawer">返回并打开模块库</a-button>
            <a-button @click="activeView = 'overview'">返回主界面</a-button>
          </div>
        </header>

        <TemplateModelingPanel
          v-model:draft="templateDraft"
          :templates="faultTemplates"
          :preview="templatePreview"
          :focused="true"
          @save="handleSaveTemplate"
          @reset="resetTemplateDraft"
          @duplicate="handleDuplicateTemplate"
          @delete="handleDeleteTemplateFromGeneration"
          @select-template="openModelingModal"
        />
      </section>
    </template>
    <template v-else-if="activeView === 'configuration'">
      <section class="generation-layout generation-layout--configuration">
        <header class="generation-header panel-card generation-header--configuration">
          <div class="generation-header__title">
            <span class="focus-kicker">故障配置</span>
            <div class="generation-header__route">
              <span class="meta-chip meta-chip--stage">03 故障配置</span>
              <span class="meta-chip">模板 {{ faultTemplates.length }}</span>
              <span class="meta-chip">任务 {{ injectionTasks.length }}</span>
            </div>
            <div class="generation-header__headline">
              <h2>注入配置工作台</h2>
              <div class="generation-header__brief">
                <span class="meta-chip">{{ taskDraft.templateName || '未选择模板' }}</span>
                <span class="meta-chip">{{ layerLabel(taskDraft.layer) }}</span>
                <span class="meta-chip">{{ currentMethodLabel }}</span>
              </div>
            </div>
            <p>从已建故障模板出发，配置注入层级、位置、方法和触发规则，再批量部署到系统总布图。</p>
          </div>

          <div class="generation-header__actions">
            <a-button type="primary" @click="activeView = 'overview'">确认并返回主界面</a-button>
            <a-button @click="openTaskDrawer">打开配置抽屉</a-button>
            <a-button @click="activeView = 'generation'">返回故障建模</a-button>
          </div>
        </header>

        <section class="configuration-layout">
          <aside class="configuration-aside panel-card">
            <div class="configuration-summary-card">
              <span class="focus-kicker">流程摘要</span>
              <h3>当前注入目标</h3>
              <div class="configuration-summary-grid">
                <div class="configuration-stat">
                  <span>当前模板</span>
                  <strong>{{ taskDraft.templateName || '未选择模板' }}</strong>
                </div>
                <div class="configuration-stat">
                  <span>注入层级</span>
                  <strong>{{ layerLabel(taskDraft.layer) }}</strong>
                </div>
                <div class="configuration-stat">
                  <span>注入方法</span>
                  <strong>{{ currentMethodLabel }}</strong>
                </div>
                <div class="configuration-stat">
                  <span>时间窗口</span>
                  <strong>{{ taskWindowText }}</strong>
                </div>
              </div>
            </div>

            <div class="configuration-summary-card configuration-summary-card--soft">
              <div class="section-head section-head--compact">
                <strong>进入条件</strong>
                <span>必须先完成前两步</span>
              </div>
              <div class="configuration-gate-list">
                <div class="configuration-gate-item" :class="{ 'configuration-gate-item--done': hasSystemModel }">
                  <span></span>
                  <p>已建立多信号传播模型</p>
                </div>
                <div class="configuration-gate-item" :class="{ 'configuration-gate-item--done': faultTemplates.length > 0 }">
                  <span></span>
                  <p>已至少建立 1 个故障模板</p>
                </div>
                <div class="configuration-gate-item" :class="{ 'configuration-gate-item--done': injectionTasks.length > 0 }">
                  <span></span>
                  <p>已生成待部署的注入任务</p>
                </div>
              </div>
            </div>

            <div class="configuration-summary-card configuration-summary-card--soft">
              <div class="section-head section-head--compact">
                <strong>操作入口</strong>
                <span>保留旧窗口调用</span>
              </div>
              <div class="configuration-quick-actions">
                <a-button @click="openLibraryDrawer">模块库</a-button>
                <a-button @click="propertyDrawerOpen = true" :disabled="!selectedNode && !selectedEdge">属性窗</a-button>
                <a-button @click="activeView = 'execution'" :disabled="!deployedTaskCount">进入仿真</a-button>
              </div>
            </div>
          </aside>

          <InjectionTaskPanel
            class="configuration-panel-shell"
            layout="page"
            v-model:draft="taskDraft"
            :templates="faultTemplates"
            :tasks="injectionTasks"
            :current-template="currentTaskTemplate"
            :method-options="currentTaskMethodOptions"
            :method-meta="currentMethodMeta"
            :location-options="graphLocations"
            :channel-options="graphChannels"
            @use-template="selectTemplateForInjection"
            @create-task="handleCreateTask"
            @deploy-task="handleDeployTask"
            @clone-task="cloneInjectionTask"
            @remove-task="handleRemoveTask"
            @deploy-all="handleDeployAllTasks"
            @clear-tasks="handleClearTasks"
          />
        </section>
      </section>
    </template>
    <template v-else>
      <section class="focus-layout">
        <aside class="focus-aside panel-card">
          <span class="focus-kicker">{{ currentViewMeta.kicker }}</span>
          <div class="focus-route">
            <span class="meta-chip meta-chip--stage">{{ activeView === 'execution' ? '04 仿真执行' : '05 结果分析' }}</span>
            <span class="meta-chip">{{ runtimeStatusText }}</span>
          </div>
          <h2>{{ currentViewMeta.title }}</h2>
          <p>{{ currentViewMeta.description }}</p>

          <div class="focus-stats">
            <div v-for="stat in currentViewMeta.stats" :key="`${activeView}-${stat.label}`" class="focus-stat-card">
              <span>{{ stat.label }}</span>
              <strong>{{ stat.value }}</strong>
            </div>
          </div>

          <div class="focus-steps">
            <div v-for="(step, index) in currentViewMeta.steps" :key="`${activeView}-${index}`" class="focus-step">
              <span>{{ index + 1 }}</span>
              <p>{{ step }}</p>
            </div>
          </div>

          <div class="focus-actions">
            <a-button type="primary" @click="activeView = 'overview'">返回主界面</a-button>
            <a-button @click="openTaskDrawer">打开配置窗</a-button>
            <a-button class="header-modeling-btn header-modeling-btn--small" @click="openModelingModal()">故障生成</a-button>
          </div>
        </aside>

        <div class="focus-main">
          <ExecutionPanel
            v-if="activeView === 'execution'"
            class="panel-slot"
            v-model:active-scope-id="activeScopeId"
            :runtime="runtime"
            :control-state="runtimeControls"
            :speed-options="speedOptions"
            :scope-options="scopeOptions"
            :live-scope-option="liveScopeOption"
            :current-signal-value="currentSignalValue"
            :task-rows="taskRows"
            :logs="logs"
            :overview="runtimeOverview"
            @start="handleRuntimeStart"
            @pause="handleRuntimePause"
            @step="handleRuntimeStep"
            @stop="handleRuntimeStop"
            @change-speed="setTickIntervalMs"
            @clear-logs="clearLogs"
          />

          <AnalysisPanel
            v-else
            class="panel-slot"
            :analysis-option="analysisOption"
            :metrics="analysisMetrics"
            :task-rows="taskRows"
            @export="exportReport"
          />
        </div>
      </section>
    </template>

    <transition name="property-flyout">
      <aside v-if="propertyDrawerOpen" class="property-flyout">
        <div class="property-flyout__head">
          <div class="property-flyout__copy">
            <span class="panel-head-pill">属性设置</span>
            <div>
              <strong>节点属性浮窗</strong>
              <small>和模板库同层悬浮，便于对照画布实时微调参数。</small>
            </div>
          </div>
          <a-button size="small" @click="propertyDrawerOpen = false">关闭</a-button>
        </div>

        <div class="property-flyout__body">
          <PropertyInspector
            :selected-node="selectedNode"
            :selected-edge="selectedEdge"
            :fault-preview="faultPreview"
            @patch-node="handleInspectorPatch"
            @delete-selection="deleteCanvasSelection"
          />
        </div>
      </aside>
    </transition>

    <transition name="scope-modal">
      <div
        v-if="scopeModalOpen && activeView === 'overview'"
        class="scope-modal-backdrop"
        @click.self="scopeModalOpen = false"
      >
        <section class="panel-card scope-modal">
          <div class="scope-modal__head">
            <div class="scope-modal__copy">
              <span class="panel-head-pill">示波器波形</span>
              <div>
                <strong>总览页快速示波</strong>
                <small>在主页面直接查看示波器曲线、当前信号值和运行时间。</small>
              </div>
            </div>

            <div class="scope-modal__actions">
              <a-select
                v-if="scopeOptions.length"
                v-model:value="activeScopeId"
                size="small"
                class="scope-modal__select"
              >
                <a-select-option v-for="item in scopeOptions" :key="item.id" :value="item.id">
                  {{ item.name }}
                </a-select-option>
              </a-select>
              <a-button size="small" @click="activeView = 'execution'; scopeModalOpen = false">进入执行</a-button>
              <a-button size="small" @click="scopeModalOpen = false">关闭</a-button>
            </div>
          </div>

          <div class="scope-modal__meta">
            <div class="scope-stat-card">
              <span>运行状态</span>
              <strong>{{ runtimeStatusText }}</strong>
            </div>
            <div class="scope-stat-card">
              <span>仿真时间</span>
              <strong>{{ runtime.simTime.toFixed(1) }}s</strong>
            </div>
            <div class="scope-stat-card">
              <span>当前信号</span>
              <strong>{{ currentSignalValue }}</strong>
            </div>
            <div class="scope-stat-card">
              <span>采样窗口</span>
              <strong>{{ activeScopeMeta?.sampleWindow ?? '--' }}</strong>
            </div>
          </div>

          <div class="scope-modal__body">
            <div v-if="scopeOptions.length" class="scope-modal__chart">
              <div class="scope-modal__chart-head">
                <div>
                  <strong>{{ activeScopeMeta?.name || '示波器' }}</strong>
                  <small>实时曲线会跟随当前工作区中的示波器节点同步刷新。</small>
                </div>
                <span class="scope-chart-badge">{{ scopeOptions.length }} 个示波器可切换</span>
              </div>
              <TrendChart :option="liveScopeOption" height="100%" />
            </div>
            <div v-else class="scope-modal__empty">
              <span class="scope-modal__empty-token">SCP</span>
              <strong>当前画布还没有示波器节点</strong>
              <p>先在左侧模块库中拖入示波器，连接到流程链路后，这里会显示实时波形。</p>
            </div>
          </div>

          <div class="scope-modal__footer">
            <small>建议在总览页用这个弹窗快速查看波形，在执行页继续查看日志与任务状态。</small>
            <a-button size="small" type="primary" ghost @click="openLibraryDrawer">打开模板库</a-button>
          </div>
        </section>
      </div>
    </transition>

  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { message } from 'ant-design-vue';

import {
  faultParameterSchemasByMode,
  injectionLayerOptions,
  scenarioPresetOptions,
  triggerConditionOptions,
} from './data/faultCatalog.js';
import { useSimulationRuntime } from './composables/useSimulationRuntime.js';
import { useStudioState } from './composables/useStudioState.js';
import {
  categoryLabel,
  injectionMethodLabel,
  layerLabel,
  modeLabel,
} from './utils/labels.js';
import InjectionTaskPanel from './components/panels/InjectionTaskPanel.vue';
import ExecutionPanel from './components/panels/ExecutionPanel.vue';
import AnalysisPanel from './components/panels/AnalysisPanel.vue';
import PropertyInspector from './components/panels/PropertyInspector.vue';
import TemplateModelingPanel from './components/panels/TemplateModelingPanel.vue';
import TrendChart from './components/charts/TrendChart.vue';
import WorkbenchCanvas from './components/workbench/WorkbenchCanvas.vue';

const STORAGE_KEY = 'exp_0312_workspace_v2';

const viewOptions = [
  { value: 'overview', shortLabel: '总览', label: '主界面总览' },
  { value: 'generation', shortLabel: '建模', label: '故障建模工作台' },
  { value: 'execution', shortLabel: '仿真', label: '仿真工作台' },
  { value: 'analysis', shortLabel: '分析', label: '结果分析' },
];

const templateFilterOptions = [
  { value: 'all', label: '全部' },
  { value: 'analog', label: '模拟量' },
  { value: 'state', label: '状态量' },
  { value: 'noise', label: '噪声' },
];

const canvasRef = ref(null);
const workspaceInputRef = ref(null);
const activePresetId = ref('baseline');
const workspaceHydrated = ref(false);
const activeView = ref('overview');
const libraryExpanded = ref(false);
const leftDrawerOpen = ref(false);
const propertyDrawerOpen = ref(false);
const scopeModalOpen = ref(false);
const activeTemplateFilter = ref('all');
const templateKeyword = ref('');
const activeLibraryPane = ref('faults');
const libraryCatalogCollapsed = ref(false);
const canvasGuideMode = ref('idle');
const canvasGuideTitle = ref('');
const canvasGuideText = ref('');
const canvasGuideToken = ref('');
const canvasGuideGroup = ref('');
let canvasGuideTimer = 0;

const {
  faultTemplates,
  templateDraft,
  taskDraft,
  injectionTasks,
  graphNodes,
  graphEdges,
  selectedNode,
  selectedEdge,
  templatePreview,
  graphLocations,
  graphChannels,
  canvasCounts,
  libraryGroups,
  currentTaskMethodOptions,
  currentMethodMeta,
  currentTaskTemplate,
  resetTemplateDraft,
  resetTaskDraft,
  saveTemplateDraft,
  duplicateTemplate,
  deleteTemplate,
  selectTemplateForModeling,
  loadTemplateIntoTask,
  createInjectionTask,
  cloneInjectionTask,
  removeInjectionTask,
  deployTaskToCanvas,
  deployAllTasksToCanvas,
  createPendingFaultDragDefinition,
  materializeDraggedFaultNode,
  createNodeDefinitionFromLibrary,
  syncGraph,
  setSelectedElement,
  markTaskUndeployedByNode,
  buildNodePatchFromInspector,
  normalizeFaultPreviewForNode,
  exportWorkspaceSnapshot,
  importWorkspaceSnapshot,
  resetWorkspace,
  applyScenarioPreset,
  clearAllTasks,
} = useStudioState();

const {
  runtime,
  logs,
  scopeOptions,
  speedOptions,
  activeScopeId,
  currentSignalValue,
  liveScopeOption,
  analysisOption,
  analysisMetrics,
  taskRows,
  deployedTaskCount,
  hasDeployedTasks,
  runtimeHorizonSeconds,
  runtimeOverview,
  start,
  pause,
  stop,
  stepOnce,
  clearLogs,
  setTickIntervalMs,
  exportReportPayload,
} = useSimulationRuntime({
  graphNodes,
  graphEdges,
  injectionTasks,
});

const detectionTimeText = computed(() => (
  analysisMetrics.value.detectionTime == null ? '--' : `${analysisMetrics.value.detectionTime}s`
));
const recoveryRateText = computed(() => `${analysisMetrics.value.robustness}%`);
const runtimeStatusText = computed(() => ({
  ready: '待命',
  running: '运行中',
  paused: '已暂停',
  stopped: '已终止',
  completed: '已完成',
}[runtime.status] || '待命'));

const runtimeControls = computed(() => ({
  canStart: hasDeployedTasks.value && runtime.status !== 'running',
  canPause: runtime.status === 'running',
  canStep: hasDeployedTasks.value && runtime.status !== 'running',
  canStop: ['running', 'paused', 'completed'].includes(runtime.status),
}));

const runtimeProgressPercent = computed(() => {
  const horizon = Math.max(runtime.stepSize, Number(runtimeHorizonSeconds.value || 0));
  const ratio = horizon > 0 ? Math.min(1, runtime.simTime / horizon) : 0;
  return Math.round(ratio * 100);
});

const latestLogText = computed(() => logs.value.at(-1)?.text || '平台已就绪');
const taskWindowText = computed(() => `${Number(taskDraft.triggerStart).toFixed(1)}s - ${(Number(taskDraft.triggerStart) + Number(taskDraft.duration)).toFixed(1)}s`);
const selectedTargetText = computed(() => `${taskDraft.location || '--'} / ${taskDraft.channel || '--'}`);
const hasSystemModel = computed(() => (
  graphNodes.value.some((node) => ['source', 'system', 'scope'].includes(node.properties?.group))
));
const workflowCurrentIndex = computed(() => {
  if (!hasSystemModel.value) return 0;
  if (!faultTemplates.value.length) return 1;
  if (!injectionTasks.value.length) return 2;
  if (runtime.status === 'completed' || runtime.simTime > 0) return 4;
  return 3;
});
const workflowSteps = computed(() => {
  const current = workflowCurrentIndex.value;
  const steps = [
    { key: 'model', index: '01', label: '多信号传播建模', hint: hasSystemModel.value ? '总布图已具备基础链路' : '请导入模型或拖入基础模块', activeText: '建模中' },
    { key: 'fault-model', index: '02', label: '故障建模', hint: `${faultTemplates.value.length} 个模板可用`, activeText: '建模中' },
    { key: 'fault-config', index: '03', label: '故障配置', hint: `${injectionTasks.value.length} 个任务待部署`, activeText: '配置中' },
    { key: 'simulation', index: '04', label: '仿真执行', hint: `${deployedTaskCount.value} 个任务已部署`, activeText: runtime.status === 'running' ? '运行中' : '待启动' },
    { key: 'analysis', index: '05', label: '结果分析', hint: runtime.simTime > 0 ? '可对比查看指标与波形' : '等待仿真结果', activeText: '分析中' },
  ];

  return steps.map((item, index) => {
    const state = index < current ? 'done' : index === current ? 'active' : 'pending';
    return {
      ...item,
      state,
      stateText: state === 'done' ? '已完成' : state === 'active' ? item.activeText : '未开始',
    };
  });
});
const workflowHeadline = computed(() => {
  const current = workflowSteps.value[workflowCurrentIndex.value];
  return `当前处于「${current.label}」阶段，${current.hint}。`;
});

const runFlowSteps = computed(() => {
  const runtimeFlowState = runtime.status === 'running'
    ? { state: 'active', text: '执行中' }
    : runtime.status === 'completed'
      ? { state: 'done', text: '已完成' }
      : { state: 'pending', text: '待执行' };

  return [
    {
      key: 'model',
      index: '01',
      label: '建模',
      hint: `模板 ${faultTemplates.value.length} 个`,
      state: faultTemplates.value.length ? 'done' : 'pending',
      stateText: faultTemplates.value.length ? '已就绪' : '待创建',
    },
    {
      key: 'config',
      index: '02',
      label: '配置',
      hint: `任务 ${injectionTasks.value.length} 个`,
      state: injectionTasks.value.length ? 'done' : 'pending',
      stateText: injectionTasks.value.length ? '已配置' : '待配置',
    },
    {
      key: 'deploy',
      index: '03',
      label: '部署',
      hint: `已部署 ${deployedTaskCount.value} 个`,
      state: deployedTaskCount.value ? 'done' : 'pending',
      stateText: deployedTaskCount.value ? '已部署' : '待部署',
    },
    {
      key: 'execute',
      index: '04',
      label: '执行',
      hint: `视界 ${runtimeHorizonSeconds.value.toFixed(1)}s`,
      state: runtimeFlowState.state,
      stateText: runtimeFlowState.text,
    },
  ];
});

const currentMethodLabel = computed(() => injectionMethodLabel(taskDraft.method));
const activeScopeMeta = computed(() => (
  scopeOptions.value.find((item) => item.id === activeScopeId.value) || scopeOptions.value[0] || null
));
const libraryPaneOptions = [
  { value: 'faults', label: '故障模板' },
  { value: 'modules', label: '基础模块' },
];

const filteredTemplates = computed(() => {
  const keyword = templateKeyword.value.trim().toLowerCase();
  return faultTemplates.value.filter((item) => {
    const categoryMatched = activeTemplateFilter.value === 'all' || item.category === activeTemplateFilter.value;
    if (!categoryMatched) return false;
    if (!keyword) return true;
    return [
      item.templateName,
      item.token,
      modeLabel(item.mode),
      categoryLabel(item.category),
    ]
      .join(' ')
      .toLowerCase()
      .includes(keyword);
  });
});

const basicLibraryItems = computed(() => (
  libraryGroups.value.find((group) => group.key === 'basic')?.items || []
));
const filteredBasicLibraryItems = computed(() => {
  const keyword = templateKeyword.value.trim().toLowerCase();
  return basicLibraryItems.value.filter((item) => {
    if (!keyword) return true;
    return [
      item.label,
      item.subtitle,
      item.token,
      item.group,
    ]
      .join(' ')
      .toLowerCase()
      .includes(keyword);
  });
});
const faultTemplateSections = computed(() => {
  const sectionOptions = templateFilterOptions.filter((item) => item.value !== 'all');
  return sectionOptions
    .map((section) => ({
      key: section.value,
      label: section.label,
      hint: section.value === 'noise' ? '噪声 / 干扰' : section.value === 'analog' ? '参数 / 偏置' : '状态 / 协议',
      items: filteredTemplates.value.filter((item) => item.category === section.value),
    }))
    .filter((section) => section.items.length);
});
const basicLibrarySections = computed(() => {
  const definitions = [
    { key: 'source', label: '信号生成', hint: '输入模块' },
    { key: 'system', label: '流程处理', hint: '处理模块' },
    { key: 'scope', label: '观测监视', hint: '输出模块' },
  ];
  return definitions
    .map((section) => ({
      ...section,
      items: filteredBasicLibraryItems.value.filter((item) => item.group === section.key),
    }))
    .filter((section) => section.items.length);
});
const activeLibraryCount = computed(() => (
  activeLibraryPane.value === 'faults' ? filteredTemplates.value.length : filteredBasicLibraryItems.value.length
));
const hasCanvasContent = computed(() => (
  canvasCounts.value.nodes > 0 || canvasCounts.value.edges > 0
));
const canvasGuideLanes = computed(() => {
  if (!['dragging', 'placed'].includes(canvasGuideMode.value)) return [];
  const activeKey = canvasGuideGroup.value || '';
  return [
    { key: 'source', label: '信号源区', hint: '输入', active: activeKey === 'source' },
    { key: 'fault', label: '注入区', hint: '故障', active: activeKey === 'fault' },
    { key: 'system', label: '流程区', hint: '处理', active: activeKey === 'system' },
    { key: 'scope', label: '观测区', hint: '输出', active: activeKey === 'scope' },
  ];
});
const canvasGuide = computed(() => {
  if (canvasGuideMode.value === 'dragging' || canvasGuideMode.value === 'placed') {
    return {
      mode: canvasGuideMode.value,
      token: canvasGuideToken.value,
      title: canvasGuideTitle.value,
      text: canvasGuideText.value,
    };
  }

  if (!hasCanvasContent.value) {
    return {
      mode: 'empty',
      token: '步骤 1',
      title: '请先导入模型完成建模',
      text: '先导入已有模型或加载示例模型，再补全多信号传播链路、故障节点与示波器观测点。',
    };
  }

  return null;
});
const generationParameterCount = computed(() => (
  faultParameterSchemasByMode[templateDraft.mode]?.length || 0
));
const generationPreviewStats = computed(() => {
  const faulty = templatePreview.value.faulty || [];
  if (!faulty.length) {
    return { peak: '--', span: '--', bias: '--' };
  }
  const peak = Math.max(...faulty.map((item) => Math.abs(Number(item) || 0)));
  const min = Math.min(...faulty.map((item) => Number(item) || 0));
  const max = Math.max(...faulty.map((item) => Number(item) || 0));
  const mean = faulty.reduce((total, item) => total + Number(item || 0), 0) / faulty.length;
  return {
    peak: peak.toFixed(2),
    span: (max - min).toFixed(2),
    bias: mean.toFixed(2),
  };
});
const generationNarrative = computed(() => (
  `${selectedTemplateMeta.value.category} / ${selectedTemplateMeta.value.mode} / ${generationParameterCount.value} 项参数`
));

const selectedTemplateMeta = computed(() => ({
  category: categoryLabel(templateDraft.category),
  mode: modeLabel(templateDraft.mode),
  summary: templateSummary(templateDraft),
}));

const selectedFaultNode = computed(() => (
  selectedNode.value?.properties?.group === 'fault' ? selectedNode.value.properties : null
));

const faultPreview = computed(() => (
  selectedNode.value ? normalizeFaultPreviewForNode(selectedNode.value.properties || {}) : templatePreview.value
));

const currentViewMeta = computed(() => {
  if (activeView.value === 'execution') {
    return {
      kicker: '模块 03',
      title: '执行工作台',
      description: '集中查看仿真状态、示波器输出和任务进度。',
      stats: [
        { label: '运行状态', value: runtimeStatusText.value },
        { label: '当前时间', value: `${runtime.simTime.toFixed(1)}s` },
        { label: '示波器', value: `${scopeOptions.value.length}` },
      ],
      steps: [
        '先部署任务并确认链路完整。',
        '根据需要切换示波器与运行速度。',
        '异常时暂停或终止，再回总览调整。',
      ],
    };
  }

  return {
    kicker: '模块 04',
    title: '分析总览',
    description: '汇总检测、隔离和恢复结果，辅助任务复盘。',
    stats: [
      { label: '检测时间', value: detectionTimeText.value },
      { label: '隔离准确率', value: `${analysisMetrics.value.isolationAccuracy}%` },
      { label: '恢复率', value: recoveryRateText.value },
    ],
    steps: [
      '对比正常、故障与恢复曲线。',
      '核对诊断指标和任务记录。',
      '确认恢复效果后再导出报告。',
    ],
  };
});
function templateSummary(template) {
  const parts = [];
  if (Number.isFinite(Number(template.mean)) && Number(template.mean) !== 0) parts.push(`均值 ${template.mean}`);
  if (Number.isFinite(Number(template.variance)) && Number(template.variance) !== 0) parts.push(`方差 ${template.variance}`);
  if (Number.isFinite(Number(template.bias)) && Number(template.bias) !== 0) parts.push(`偏差 ${template.bias}`);
  parts.push(`严重度 ${template.severity}`);
  return parts.join(' / ');
}

function openModelingModal(templateId) {
  if (templateId) {
    selectTemplateForModeling(templateId);
    loadTemplateIntoTask(templateId);
  }
  activeView.value = 'generation';
  libraryExpanded.value = false;
  leftDrawerOpen.value = false;
  propertyDrawerOpen.value = false;
}

function handleTemplatePanelSelect(templateId) {
  selectTemplateForModeling(templateId);
  selectTemplateForInjection(templateId);
}

function openLibraryDrawer() {
  activeView.value = 'overview';
  libraryExpanded.value = true;
  propertyDrawerOpen.value = false;
}

function toggleLibraryCatalog(force) {
  libraryCatalogCollapsed.value = typeof force === 'boolean' ? force : !libraryCatalogCollapsed.value;
}

function toggleLibraryExpanded(force) {
  activeView.value = 'overview';
  libraryExpanded.value = typeof force === 'boolean' ? force : !libraryExpanded.value;
}

function openTaskDrawer() {
  activeView.value = 'overview';
  leftDrawerOpen.value = true;
  propertyDrawerOpen.value = false;
}

function selectTemplateForInjection(templateId) {
  loadTemplateIntoTask(templateId);
}

function fitCanvasView() {
  canvasRef.value?.fitView();
}

function handleWorkflowStepClick(stepKey) {
  if (stepKey === 'model') {
    activeView.value = 'overview';
    fitCanvasView();
    return;
  }
  if (stepKey === 'fault-model') {
    handleOpenModelingEntry();
    return;
  }
  if (stepKey === 'fault-config') {
    handleOpenConfigEntry();
    return;
  }
  if (stepKey === 'simulation') {
    activeView.value = 'execution';
    return;
  }
  if (stepKey === 'analysis') {
    activeView.value = 'analysis';
  }
}

function handleOpenModelingEntry() {
  if (!hasSystemModel.value) {
    message.warning('请先建立多信号传播模型。');
    activeView.value = 'overview';
    return;
  }
  openModelingModal(templateDraft.id || taskDraft.templateId);
}

function handleOpenConfigEntry() {
  if (!hasSystemModel.value) {
    message.warning('请先建立多信号传播模型。');
    activeView.value = 'overview';
    return;
  }
  if (!faultTemplates.value.length) {
    message.warning('请先完成故障建模。');
    return;
  }
  activeView.value = 'configuration';
}

function clearCanvasGuideTimer() {
  if (!canvasGuideTimer) return;
  window.clearTimeout(canvasGuideTimer);
  canvasGuideTimer = 0;
}

function setCanvasGuide(mode, title, text, token, duration = 0, group = '') {
  clearCanvasGuideTimer();
  canvasGuideMode.value = mode;
  canvasGuideTitle.value = title;
  canvasGuideText.value = text;
  canvasGuideToken.value = token;
  canvasGuideGroup.value = group;

  if (duration > 0) {
    canvasGuideTimer = window.setTimeout(() => {
      canvasGuideMode.value = 'idle';
      canvasGuideTitle.value = '';
      canvasGuideText.value = '';
      canvasGuideToken.value = '';
      canvasGuideGroup.value = '';
      canvasGuideTimer = 0;
    }, duration);
  }
}

function clearCanvasGuide() {
  clearCanvasGuideTimer();
  canvasGuideMode.value = 'idle';
  canvasGuideTitle.value = '';
  canvasGuideText.value = '';
  canvasGuideToken.value = '';
  canvasGuideGroup.value = '';
}

function beginCanvasDrag(label, detail, group = '') {
  setCanvasGuide('dragging', `拖拽 ${label}`, detail, '拖拽', 0, group);
}

function confirmCanvasPlacement(title, detail, group = '') {
  setCanvasGuide('placed', title, detail, '已放置', 2400, group);
}

function placementDetailByGroup(group) {
  return {
    source: '建议放在左侧输入区，作为链路起点。',
    system: '建议放在中部处理区，串接主流程。',
    scope: '建议放在右侧观测区，便于查看输出。',
    fault: '建议插入中部注入区，连接目标链路。',
  }[group] || '可继续拖动调整位置并补全连线。';
}

function handleGlobalMouseUp() {
  if (canvasGuideMode.value !== 'dragging') return;
  window.setTimeout(() => {
    if (canvasGuideMode.value === 'dragging') {
      clearCanvasGuide();
    }
  }, 160);
}

function resetCanvasScene(graph) {
  nextTick(() => {
    canvasRef.value?.resetScene(graph);
  });
}

async function ensureOverviewCanvas() {
  if (canvasRef.value) return true;
  activeView.value = 'overview';
  await nextTick();
  await new Promise((resolve) => window.requestAnimationFrame(resolve));
  return Boolean(canvasRef.value);
}

function handleRuntimeStart() {
  if (!hasDeployedTasks.value) {
    message.warning('请先至少部署一个任务后再执行。');
    activeView.value = 'overview';
    openTaskDrawer();
    return;
  }
  start();
}

function handleRuntimePause() {
  pause();
}

function handleRuntimeStep() {
  if (!hasDeployedTasks.value) {
    message.warning('请先至少部署一个任务后再执行。');
    activeView.value = 'overview';
    openTaskDrawer();
    return;
  }
  stepOnce();
}

function handleRuntimeStop() {
  stop();
}

function downloadJson(payload, fileName) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function handleSaveTemplate() {
  const payload = saveTemplateDraft();
  message.success(`模板已保存：${payload.templateName}`);
}

function handleSaveTemplateAndReturn() {
  const payload = saveTemplateDraft();
  loadTemplateIntoTask(payload.id);
  resetTaskDraft(payload);
  activeView.value = 'overview';
  message.success(`模板已保存并同步到主界面：${payload.templateName}`);
}

function handleDuplicateTemplate(templateId) {
  const payload = duplicateTemplate(templateId || templateDraft.id);
  if (!payload) return;
  message.success(`已复制模板：${payload.templateName}`);
}

function handleDeleteTemplateFromGeneration(templateId) {
  if (!templateId) return;
  deleteTemplate(templateId);
  message.success('模板已删除');
}

function handleCreateTask() {
  const task = createInjectionTask();
  if (!task) return;
  message.success(`任务已创建：${task.name}`);
}

async function handleDeployTask(taskId) {
  if (runtime.status === 'running') {
    message.warning('运行中无法部署任务。');
    return;
  }
  const task = injectionTasks.value.find((item) => item.id === taskId);
  if (task?.deployedNodeId && graphNodes.value.some((node) => node.id === task.deployedNodeId)) {
    message.info('该任务已在画布中。');
    return;
  }

  const definition = deployTaskToCanvas(taskId);
  if (!definition) return;
  const ready = await ensureOverviewCanvas();
  if (!ready) {
    message.error('当前无法打开总览画布。');
    return;
  }
  canvasRef.value?.addNodeFromDefinition(definition);
  message.success('任务已部署到画布。');
}

async function handleDeployAllTasks() {
  if (runtime.status === 'running') {
    message.warning('运行中无法部署任务。');
    return;
  }
  const definitions = deployAllTasksToCanvas();
  if (!definitions.length) {
    message.info('没有可部署的任务。');
    return;
  }

  const ready = await ensureOverviewCanvas();
  if (!ready) {
    message.error('当前无法打开总览画布。');
    return;
  }

  definitions.forEach((definition) => {
    canvasRef.value?.addNodeFromDefinition(definition);
  });
  message.success(`已批量部署 ${definitions.length} 个任务。`);
}

async function handleRemoveTask(taskId) {
  if (runtime.status === 'running') {
    message.warning('运行中无法删除任务。');
    return;
  }
  const task = removeInjectionTask(taskId);
  if (task?.deployedNodeId) {
    const ready = await ensureOverviewCanvas();
    if (!ready) {
      message.error('当前无法更新总览画布。');
      return;
    }
    canvasRef.value?.removeNodeById(task.deployedNodeId);
  }
}

function handleClearTasks() {
  if (runtime.status === 'running') {
    message.warning('运行中无法清空任务。');
    return;
  }
  const result = clearAllTasks();
  resetCanvasScene(result.graph);
  message.success('任务与画布故障节点已清空。');
}

async function handleFaultTemplateDrag(templateId) {
  const ready = await ensureOverviewCanvas();
  if (!ready || !canvasRef.value) return;
  const definition = createPendingFaultDragDefinition(templateId);
  if (!definition) return;
  const template = faultTemplates.value.find((item) => item.id === templateId);
  beginCanvasDrag(template?.templateName || '未命名模板', '释放到画布即可生成故障节点。', 'fault');
  canvasRef.value.startDrag(definition);
}

async function handleLibraryDrag(item) {
  const ready = await ensureOverviewCanvas();
  if (!ready || !canvasRef.value) return;
  const definition = item.libraryType === 'fault-template'
    ? createPendingFaultDragDefinition(item.templateId)
    : createNodeDefinitionFromLibrary(item);
  if (!definition) return;
  beginCanvasDrag(
    item.label || item.templateName || '未命名模块',
    item.libraryType === 'fault-template' ? '释放到画布生成故障节点。' : '释放到画布生成基础模块。',
    item.libraryType === 'fault-template' ? 'fault' : item.group,
  );
  canvasRef.value.startDrag(definition);
}

async function handleLibraryAdd(item) {
  const ready = await ensureOverviewCanvas();
  if (!ready || !canvasRef.value) return;
  const definition = createNodeDefinitionFromLibrary(item);
  if (!definition) return;
  canvasRef.value.addNodeFromDefinition(definition);
}

function handleCanvasElementDeleted(payload) {
  if (payload.kind === 'node') {
    markTaskUndeployedByNode(payload.id);
  }
}

function handleCanvasNodeAdded(payload) {
  const node = payload?.data;
  if (!node) return;
  const pendingTemplateId = node?.properties?.pendingTemplateId;
  if (pendingTemplateId && canvasRef.value) {
    const patch = materializeDraggedFaultNode(node.id, pendingTemplateId);
    if (!patch) return;
    canvasRef.value.applyNodePatch(node.id, patch);
    confirmCanvasPlacement(`已放置 ${patch.templateName}`, '故障模板已落位，可继续连线和配置。', 'fault');
    message.success(`已生成故障节点：${patch.templateName}`);
    return;
  }

  const label = node.properties?.name || node.properties?.templateName || node.text?.value || '节点';
  confirmCanvasPlacement(`已放置 ${label}`, placementDetailByGroup(node.properties?.group), node.properties?.group);
}

function handleInspectorPatch(patch) {
  if (!selectedNode.value || !canvasRef.value) return;
  const group = selectedNode.value.properties?.group;
  const normalizedPatch = buildNodePatchFromInspector(group, {
    ...selectedNode.value.properties,
    ...patch,
  });
  canvasRef.value.applyNodePatch(selectedNode.value.id, normalizedPatch);
}

function deleteCanvasSelection() {
  canvasRef.value?.deleteCurrentSelection();
}

function exportReport() {
  downloadJson(exportReportPayload(), 'exp_0312_fault_report.json');
  message.success('报告已导出。');
}

function handleExportWorkspace() {
  downloadJson(exportWorkspaceSnapshot(), 'exp_0312_workspace.json');
  message.success('工作区已导出。');
}

function openWorkspaceImport() {
  workspaceInputRef.value?.click();
}

async function handleWorkspaceFileChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const snapshot = JSON.parse(text);
    const graph = importWorkspaceSnapshot(snapshot);
    activePresetId.value = 'baseline';
    resetCanvasScene(graph);
    message.success(`已导入工作区：${file.name}`);
  } catch {
    message.error('导入失败，请检查 JSON 文件。');
  } finally {
    event.target.value = '';
  }
}

function handleResetWorkspace() {
  const graph = resetWorkspace();
  activePresetId.value = 'baseline';
  clearLogs();
  stop();
  resetCanvasScene(graph);
  message.success('工作区已重置。');
}

function handleApplyPreset(presetId) {
  activePresetId.value = presetId;
  const graph = applyScenarioPreset(presetId);
  clearLogs();
  stop();
  resetCanvasScene(graph);
  const presetName = scenarioPresetOptions.find((item) => item.value === presetId)?.label || '基础流程';
  message.success(`已应用预设：${presetName}`);
}

watch(
  () => JSON.stringify(exportWorkspaceSnapshot()),
  (serialized) => {
    if (!workspaceHydrated.value) return;
    window.localStorage.setItem(STORAGE_KEY, serialized);
  },
);

watch(
  activeView,
  (nextView) => {
    if (nextView !== 'overview') {
      leftDrawerOpen.value = false;
      propertyDrawerOpen.value = false;
      scopeModalOpen.value = false;
    }
  },
);

onMounted(() => {
  window.addEventListener('mouseup', handleGlobalMouseUp);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const graph = importWorkspaceSnapshot(JSON.parse(raw));
      resetCanvasScene(graph);
      message.success('已从本地缓存恢复工作区。');
    }
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  } finally {
    workspaceHydrated.value = true;
  }
});

onBeforeUnmount(() => {
  clearCanvasGuideTimer();
  window.removeEventListener('mouseup', handleGlobalMouseUp);
});
</script>


















<style scoped>
.app-shell {
  --panel-bg: linear-gradient(180deg, rgba(255, 255, 255, 0.975), rgba(251, 253, 255, 0.95));
  --panel-elevated: linear-gradient(180deg, rgba(255, 255, 255, 0.99), rgba(252, 254, 255, 0.96));
  --panel-muted: rgba(250, 252, 255, 0.9);
  --panel-border: rgba(194, 208, 226, 0.82);
  --panel-shadow: 0 16px 34px rgba(92, 112, 144, 0.075), inset 0 1px 0 rgba(255, 255, 255, 0.94);
  --soft-shadow: 0 9px 20px rgba(92, 112, 144, 0.065);
  --hairline: rgba(214, 224, 236, 0.94);
  --primary: #4f86e7;
  --primary-strong: #2d63bf;
  --primary-soft: rgba(79, 134, 231, 0.15);
  --accent: #82b0ff;
  --accent-soft: rgba(130, 176, 255, 0.16);
  --text: #2c4f7b;
  --text-strong: #183b66;
  --muted: #6f88aa;
  --muted-soft: #99acc7;
  --success: #4f9576;
  --success-soft: rgba(79, 149, 118, 0.13);
  --warning: #cb8a56;
  --warning-soft: rgba(203, 138, 86, 0.14);
  --danger: #cb7c74;
  --danger-soft: rgba(203, 124, 116, 0.12);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 14px;
  min-height: 100vh;
  height: 100dvh;
  padding: 14px;
  color: var(--text);
  font-family: inherit;
  overflow: hidden;
}

.panel-card {
  min-height: 0;
  border: 1px solid var(--panel-border);
  border-radius: 24px;
  background: var(--panel-bg);
  box-shadow: var(--panel-shadow);
  backdrop-filter: blur(14px);
}

.top-shell {
  border: 1px solid rgba(196, 209, 226, 0.88);
  border-radius: 26px;
  background:
    radial-gradient(circle at 14% 12%, rgba(134, 180, 255, 0.14), transparent 26%),
    radial-gradient(circle at 86% 16%, rgba(180, 210, 255, 0.09), transparent 18%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.985), rgba(249, 252, 255, 0.955));
  box-shadow: 0 14px 28px rgba(92, 112, 144, 0.07);
  backdrop-filter: blur(16px);
}

.top-shell__header {
  display: grid;
  grid-template-areas: "brand nav actions";
  grid-template-columns: minmax(260px, 1fr) auto minmax(360px, auto);
  align-items: center;
  gap: 18px;
  padding: 18px 22px;
}

.top-brand {
  display: grid;
  gap: 10px;
  grid-area: brand;
  min-width: 0;
}

.top-brand__kicker,
.section-badge,
.focus-kicker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  min-width: 36px;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.section-badge {
  min-width: 32px;
  padding-inline: 10px;
  letter-spacing: 0.02em;
}

.top-brand__copy {
  display: grid;
  gap: 4px;
}

.top-brand__copy h1 {
  margin: 0;
  color: var(--text-strong);
  font-size: 40px;
  line-height: 1.12;
  font-weight: 800;
  letter-spacing: -0.04em;
}

.top-brand__copy small {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.45;
  letter-spacing: 0.01em;
}

.top-brand__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.header-status,
.header-meta,
.metric-pill,
.stage-chip,
.mode-tag,
.category-tag,
.run-flow-state,
.deploy-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.header-meta,
.metric-pill,
.stage-chip,
.mode-tag,
.run-flow-state--pending,
.deploy-pill--ready,
.deploy-pill--waiting,
.deploy-pill--paused {
  background: var(--primary-soft);
  color: var(--primary);
}

.header-status--running,
.run-flow-state--active,
.deploy-pill--active,
.deploy-pill--done,
.category-tag--state {
  background: var(--success-soft);
  color: var(--success);
}

.header-status--ready,
.header-status--completed,
.run-flow-state--done,
.category-tag--analog {
  background: var(--primary-soft);
  color: var(--primary);
}

.header-status--paused,
.category-tag--noise,
.deploy-pill--undeployed {
  background: var(--danger-soft);
  color: var(--danger);
}

.header-status--stopped,
.deploy-pill--recovery {
  background: var(--warning-soft);
  color: var(--warning);
}

.top-nav {
  display: flex;
  grid-area: nav;
  justify-content: center;
}

.view-tabs--header {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px;
  border: 1px solid rgba(191, 211, 242, 0.94);
  border-radius: 999px;
  background: rgba(245, 249, 255, 0.82);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.88);
}

.view-tab {
  min-width: 78px;
  height: 40px;
  padding: 0 18px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--muted);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
}

.view-tab:hover,
.view-tab--active {
  background: linear-gradient(180deg, rgba(187, 205, 229, 0.24), rgba(145, 170, 203, 0.16));
  color: var(--primary-strong);
  box-shadow: inset 0 0 0 1px rgba(171, 191, 216, 0.28), 0 4px 12px rgba(92, 112, 144, 0.055);
}

.top-action-row {
  display: flex;
  align-items: center;
  grid-area: actions;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.header-action-group {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px;
  border-radius: 18px;
  background: rgba(250, 252, 255, 0.88);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.82);
}

.header-action-group--primary {
  background: rgba(246, 249, 253, 0.94);
}

.overview-shell,
.overview-layout,
.generation-layout,
.focus-layout,
.generation-main,
.focus-main,
.generation-aside,
.panel-slot {
  min-height: 0;
}

.overview-shell,
.generation-layout,
.focus-layout {
  height: 100%;
}

.overview-layout {
  display: grid;
  position: relative;
  grid-template-columns: 320px minmax(0, 1fr) 332px;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 14px;
  height: 100%;
}

.generation-layout {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 12px;
  height: 100%;
}

.generation-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px 18px;
  padding: 16px 18px;
  background:
    radial-gradient(circle at top right, rgba(142, 188, 255, 0.12), transparent 28%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.99), rgba(248, 251, 255, 0.95));
}

.generation-header__title {
  display: grid;
  gap: 5px;
}

.generation-header__headline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.generation-header__title h2 {
  margin: 0;
  color: var(--text-strong);
}

.generation-header__title p {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.6;
}

.generation-header__brief {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.generation-header__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.library-panel--sidebar {
  grid-column: 1;
  grid-row: 1 / span 2;
  display: grid;
  grid-template-rows: auto auto auto auto minmax(0, 1fr) auto;
  gap: 14px;
  padding: 16px;
  overflow: hidden;
  background:
    radial-gradient(circle at top right, rgba(122, 176, 255, 0.14), transparent 34%),
    linear-gradient(180deg, rgba(254, 255, 255, 0.99), rgba(246, 250, 255, 0.96));
}

.library-drawer {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 12;
  width: min(472px, calc(100% - 372px));
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 14px;
  padding: 18px;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(132, 192, 255, 0.16), transparent 26%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.99), rgba(245, 250, 255, 0.96));
  box-shadow: 0 18px 40px rgba(37, 88, 167, 0.14), inset -1px 0 0 rgba(209, 224, 244, 0.9);
}

.library-drawer-enter-active,
.library-drawer-leave-active {
  transition: transform 0.22s ease, opacity 0.22s ease;
}

.library-drawer-enter-from,
.library-drawer-leave-to {
  transform: translateX(-18px);
  opacity: 0;
}

.library-panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.library-panel__head > .panel-section-head {
  flex: 1 1 auto;
}

.library-panel__head-actions {
  display: grid;
  justify-items: end;
  gap: 8px;
  flex: 0 0 auto;
}

.panel-head-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(106, 143, 190, 0.09);
  color: var(--primary);
  font-size: 11px;
  font-weight: 700;
}

.scene-toolbar {
  grid-column: 2;
  grid-row: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    "filters actions"
    "flow flow";
  align-items: start;
  gap: 12px;
  padding: 14px 16px;
}

.config-panel {
  grid-column: 3;
  grid-row: 1 / span 2;
  display: grid;
  align-content: start;
  gap: 14px;
  padding: 16px;
  overflow: auto;
}

.canvas-panel--main {
  grid-column: 2;
  grid-row: 2;
  padding: 12px;
  overflow: hidden;
}

.generation-aside {
  grid-column: 2;
  grid-row: 1;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  align-content: start;
  gap: 14px;
  padding: 18px;
  min-height: 0;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(142, 188, 255, 0.12), transparent 24%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(249, 252, 255, 0.94));
}

.generation-main {
  grid-column: 1;
  grid-row: 1;
  min-width: 0;
  overflow: hidden;
}

.generation-hero,
.generation-block,
.generation-main-shell {
  display: grid;
  gap: 12px;
  min-height: 0;
}

.generation-hero {
  padding: 16px;
  border: 1px solid var(--hairline);
  border-radius: 24px;
  background:
    radial-gradient(circle at top right, rgba(150, 194, 255, 0.18), transparent 38%),
    radial-gradient(circle at bottom left, rgba(185, 214, 255, 0.08), transparent 30%),
    linear-gradient(180deg, rgba(253, 254, 255, 0.99), rgba(249, 252, 255, 0.96));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.88), var(--soft-shadow);
}

.generation-aside__head {
  display: grid;
  gap: 8px;
}

.generation-aside__head h2,
.generation-main-shell__head h3 {
  margin: 0;
  color: var(--text-strong);
}

.generation-aside__head p {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.6;
}

.generation-hero__card {
  display: grid;
  gap: 8px;
  padding: 14px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(191, 211, 242, 0.88);
}

.generation-hero__meta,
.generation-template-item__top,
.generation-main-shell__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.generation-hero__card strong {
  color: var(--text-strong);
  font-size: 18px;
  line-height: 1.25;
}

.generation-hero__card small {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.5;
}

.generation-hero__metrics {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.generation-block {
  padding: 14px;
  border: 1px solid var(--hairline);
  border-radius: 22px;
  background: rgba(247, 250, 255, 0.86);
  overflow: hidden;
}

.generation-block__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.generation-block__head strong {
  color: var(--text-strong);
  font-size: 14px;
}

.generation-block__head span {
  color: var(--muted);
  font-size: 12px;
}

.generation-main-shell {
  height: 100%;
  min-height: 0;
  padding: 18px;
  overflow: hidden;
}

.generation-main-shell__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.generation-main-shell :deep(.modeling-panel) {
  min-height: 0;
  overflow: auto;
  padding-right: 4px;
}

.library-panel--sidebar .library-browser-shell {
  min-height: 0;
}

.library-panel--sidebar .library-browser-scroll {
  gap: 12px;
  padding: 12px;
}

.library-actions--sidebar {
  display: grid;
  gap: 8px;
}

.panel-section-head,
.dashboard-card__head,
.property-field,
.analysis-mini-row,
.overview-task-item,
.focus-step,
.focus-stat-card {
  min-width: 0;
}

.panel-section-head {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  align-items: start;
}

.panel-section-head h3,
.dashboard-card__head h3,
.focus-aside h2 {
  margin: 0;
  color: var(--text-strong);
}

.panel-section-head p,
.dashboard-card__head p {
  display: none;
}

.panel-stack,
.template-summary-card,
.template-quick-item,
.template-stat-card,
.summary-metric,
.config-tip,
.property-field,
.property-metric,
.property-empty,
.empty-card {
  display: grid;
  gap: 6px;
}

.panel-stack {
  min-height: 0;
  align-content: start;
  overflow: auto;
  padding-right: 4px;
}

.field-inline--stack,
.param-field,
.overview-task-item__main {
  display: grid;
  gap: 8px;
}

.param-field {
  min-width: 0;
}

.library-search-row,
.action-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.library-search-row {
  min-width: 0;
}

.library-search-row :deep(.ant-input-affix-wrapper) {
  border-radius: 12px;
}

.library-pane-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.library-pane-tab {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid rgba(203, 219, 243, 0.92);
  border-radius: 16px;
  background: rgba(247, 250, 255, 0.86);
  color: var(--muted);
  cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.library-pane-tab span,
.library-pane-tab strong {
  white-space: nowrap;
}

.library-pane-tab strong {
  color: var(--text-strong);
  font-size: 12px;
}

.library-pane-tab:hover,
.library-pane-tab--active {
  transform: translateY(-1px);
  border-color: rgba(110, 154, 226, 0.92);
  background: linear-gradient(180deg, rgba(247, 250, 255, 0.98), rgba(239, 246, 255, 0.94));
  box-shadow: var(--soft-shadow);
}

.field-label,
.param-field span,
.config-tip span,
.template-stat-card span,
.summary-metric span,
.analysis-mini-row span,
.property-field label,
.property-metric span,
.empty-card,
.property-empty p,
.template-summary-card small,
.template-quick-item small,
.overview-task-item small {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.5;
}

.template-summary-card,
.template-stat-card,
.template-quick-item,
.summary-metric,
.analysis-mini-row,
.overview-task-item,
.property-metric,
.config-tip,
.param-field--readonly,
.property-empty,
.empty-card {
  padding: 12px;
  border: 1px solid rgba(203, 219, 243, 0.92);
  border-radius: 18px;
  background: rgba(247, 250, 255, 0.9);
}

.template-summary-card__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.template-summary-card strong,
.template-quick-item strong,
.template-stat-card strong,
.summary-metric strong,
.analysis-mini-row strong,
.property-title,
.property-field strong,
.property-metric strong,
.overview-task-item strong,
.canvas-stage__head strong {
  color: var(--text-strong);
}

.template-stat-grid,
.summary-metric-grid,
.analysis-mini-grid,
.property-metric-strip {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.summary-metric-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.config-panel__grid {
  display: grid;
  gap: 10px;
}

.template-quick-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.template-quick-item {
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
}

.template-quick-item:hover,
.template-quick-item--active {
  transform: translateY(-1px);
  border-color: rgba(110, 154, 226, 0.92);
  box-shadow: var(--soft-shadow);
}

.library-selected-card,
.library-template-item,
.library-module-item,
.generation-load-card,
.generation-template-item,
.scope-inline-summary {
  padding: 12px;
  border: 1px solid rgba(203, 219, 243, 0.92);
  border-radius: 18px;
  background: rgba(247, 250, 255, 0.92);
}

.panel-mini-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.panel-mini-head--stack {
  display: grid;
  justify-items: start;
}

.panel-mini-head--browser {
  padding-bottom: 2px;
}

.panel-mini-head strong {
  color: var(--text-strong);
  font-size: 13px;
}

.panel-mini-head span {
  color: var(--muted);
  font-size: 12px;
}

.library-selected-card {
  display: grid;
  gap: 8px;
}

.library-selected-card--mounted {
  gap: 10px;
  background:
    radial-gradient(circle at top right, rgba(110, 154, 226, 0.12), transparent 32%),
    rgba(247, 250, 255, 0.94);
}

.library-selected-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.library-selected-card__hint {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(106, 143, 190, 0.09);
  color: var(--primary);
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.library-selected-card strong {
  color: var(--text-strong);
}

.library-selected-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.library-template-list {
  display: grid;
  gap: 8px;
}

.library-template-list--browser {
  gap: 10px;
}

.library-template-item,
.generation-template-item {
  display: grid;
  gap: 6px;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
}

.library-template-item:hover,
.library-template-item--active,
.generation-template-item:hover,
.generation-template-item--active {
  transform: translateY(-1px);
  border-color: rgba(110, 154, 226, 0.92);
  box-shadow: var(--soft-shadow);
}

.library-template-item__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.library-template-item__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.library-template-item strong,
.generation-template-item strong {
  color: var(--text-strong);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.library-template-item span,
.library-template-item small,
.generation-template-item small {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.library-template-item--browser {
  padding: 12px 12px 10px;
  background:
    linear-gradient(180deg, rgba(250, 252, 255, 0.96), rgba(244, 248, 255, 0.9));
}

.library-template-item__summary {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.45;
}

.library-module-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.library-browser-shell {
  min-height: 0;
  border: 1px solid rgba(203, 219, 243, 0.82);
  border-radius: 20px;
  background: rgba(248, 251, 255, 0.9);
  overflow: hidden;
}

.library-browser-scroll {
  display: grid;
  align-content: start;
  gap: 12px;
  max-height: 100%;
  min-height: 0;
  padding: 12px;
  overflow: auto;
}

.library-drawer .library-browser-scroll {
  gap: 14px;
  padding: 14px;
}

.library-drawer .library-module-row,
.library-drawer .library-template-item--browser {
  padding-inline: 14px;
}

.library-browser-group {
  display: grid;
  gap: 8px;
}

.library-module-list {
  display: grid;
  gap: 8px;
}

.library-module-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid rgba(203, 219, 243, 0.9);
  border-radius: 16px;
  background: rgba(247, 250, 255, 0.92);
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.library-module-row:hover {
  transform: translateY(-1px);
  border-color: rgba(110, 154, 226, 0.92);
  box-shadow: var(--soft-shadow);
}

.library-module-row__main {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: grab;
}

.library-module-row__copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.library-module-row__copy strong,
.library-module-row__copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.library-module-row__copy strong {
  color: var(--text-strong);
  font-size: 13px;
}

.library-module-row__copy small {
  color: var(--muted);
  font-size: 12px;
}

.library-module-row__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.library-port-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(106, 143, 190, 0.09);
  color: var(--primary);
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.library-module-item {
  display: grid;
  justify-items: start;
  gap: 8px;
  text-align: left;
  cursor: grab;
  transition: border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
}

.library-module-item:hover {
  transform: translateY(-1px);
  border-color: rgba(110, 154, 226, 0.92);
  box-shadow: var(--soft-shadow);
}

.library-module-item strong {
  color: var(--text-strong);
  font-size: 13px;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.library-module-item small {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.5;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.library-module-item__token {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 800;
}

.scope-inline-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.scope-inline-summary span {
  color: var(--muted);
  font-size: 12px;
}

.scope-inline-summary strong {
  color: var(--text-strong);
}

.generation-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.generation-actions--hero {
  padding-top: 2px;
}

.generation-load-card {
  display: grid;
  gap: 8px;
  min-height: 0;
}

.generation-template-list {
  display: grid;
  gap: 8px;
  min-height: 0;
  overflow: auto;
  padding-right: 4px;
}

.library-actions,
.exec-actions,
.scene-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.scene-toolbar__actions {
  grid-area: actions;
  justify-content: flex-end;
  justify-self: end;
  align-self: start;
  align-items: flex-start;
  max-width: 100%;
}

.tool-group {
  display: grid;
  gap: 8px;
  justify-items: end;
}

.tool-group__label {
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.action-group :deep(.ant-btn) {
  min-width: 60px;
}

.action-group--runtime {
  padding-left: 10px;
  border-left: 1px solid rgba(210, 223, 244, 0.92);
}

.scene-toolbar__left {
  grid-area: filters;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  min-width: 0;
}

.toolbar-field {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.toolbar-field span {
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.flow-strip--mini {
  grid-area: flow;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  min-width: 0;
}

.flow-mini-item {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 54px;
  padding: 10px 12px;
  border: 1px solid rgba(202, 219, 243, 0.92);
  border-radius: 16px;
  background: rgba(248, 251, 255, 0.9);
  overflow: hidden;
}

.flow-mini-item__index {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 8px;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 10px;
  font-weight: 800;
}

.flow-mini-item__copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.flow-mini-item__copy strong {
  color: var(--text-strong);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.flow-mini-item__copy small {
  display: none;
}

.param-field strong {
  color: var(--text-strong);
  font-size: 13px;
  line-height: 1.5;
}

.param-field--readonly {
  align-content: start;
}

.config-tip small {
  color: var(--muted);
  font-size: 12px;
}

.config-template-summary {
  display: grid;
  gap: 4px;
  padding: 12px;
  border: 1px solid rgba(203, 219, 243, 0.92);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(239, 245, 255, 0.94), rgba(247, 250, 255, 0.92));
}

.config-template-summary strong {
  color: var(--text-strong);
}

.config-template-summary span,
.config-template-summary small {
  color: var(--muted);
  font-size: 12px;
}

.config-identity-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.config-identity-card {
  display: grid;
  gap: 4px;
  min-width: 0;
  padding: 12px;
  border: 1px solid rgba(203, 219, 243, 0.92);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(244, 248, 255, 0.96), rgba(250, 252, 255, 0.92));
}

.config-identity-card span,
.config-identity-card small {
  color: var(--muted);
  font-size: 11px;
  line-height: 1.45;
}

.config-identity-card strong {
  color: var(--text-strong);
  font-size: 14px;
  line-height: 1.35;
}

.config-section {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(203, 219, 243, 0.92);
  border-radius: 18px;
  background: rgba(247, 250, 255, 0.88);
}

.config-section__head {
  display: grid;
  gap: 4px;
}

.config-section__head strong {
  color: var(--text-strong);
  font-size: 13px;
}

.config-section__head span {
  color: var(--muted);
  font-size: 11px;
  line-height: 1.35;
}

.config-section__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.config-section__field--full {
  grid-column: 1 / -1;
}

.config-panel__actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.config-divider,
.property-divider {
  height: 1px;
  background: rgba(210, 223, 244, 0.92);
}

.panel-section-head--sub {
  margin-top: 2px;
}

.canvas-stage {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 12px;
  height: 100%;
}

.canvas-stage__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.canvas-stage__head small {
  color: var(--muted);
  font-size: 11px;
}

.canvas-stage__status {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.canvas-stage__surface {
  position: relative;
  min-height: 0;
  border: 1px solid rgba(202, 214, 230, 0.96);
  border-radius: 22px;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(181, 199, 223, 0.12), transparent 24%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.995), rgba(250, 252, 255, 0.98));
  transition: box-shadow 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}

.canvas-stage__surface :deep(.workbench-canvas) {
  height: 100%;
}

.canvas-stage__surface--empty {
  box-shadow: inset 0 0 0 1px rgba(210, 220, 234, 0.78);
}

.canvas-stage__surface--dragging {
  border-color: rgba(145, 170, 203, 0.58);
  box-shadow:
    inset 0 0 0 2px rgba(136, 167, 205, 0.18),
    0 12px 24px rgba(92, 112, 144, 0.07);
}

.canvas-stage__surface--placed {
  border-color: rgba(81, 159, 120, 0.48);
  box-shadow:
    inset 0 0 0 2px rgba(47, 151, 105, 0.18),
    0 18px 34px rgba(47, 151, 105, 0.1);
}

.canvas-stage__toolbar {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 5;
  display: flex;
  gap: 8px;
}

.canvas-mini-button {
  width: 34px;
  height: 34px;
  border: 1px solid rgba(208, 219, 232, 0.95);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.96);
  color: var(--primary-strong);
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: var(--soft-shadow);
}

.canvas-lane-strip {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 5;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  width: min(720px, calc(100% - 96px));
}

.canvas-lane-chip {
  display: grid;
  gap: 2px;
  min-width: 0;
  padding: 8px 10px;
  border: 1px solid rgba(208, 219, 232, 0.92);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: var(--soft-shadow);
}

.canvas-lane-chip strong,
.canvas-lane-chip span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.canvas-lane-chip strong {
  color: var(--text-strong);
  font-size: 12px;
}

.canvas-lane-chip span {
  color: var(--muted);
  font-size: 11px;
}

.canvas-lane-chip--active {
  border-color: rgba(167, 188, 214, 0.94);
  background: linear-gradient(180deg, rgba(251, 253, 255, 0.99), rgba(244, 248, 252, 0.96));
}

.canvas-empty-guide {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 4;
  width: min(360px, calc(100% - 40px));
  transform: translate(-50%, -50%);
  padding: 18px;
  border: 1px dashed rgba(204, 216, 232, 0.96);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.92);
  text-align: center;
  box-shadow: var(--soft-shadow);
}

.canvas-empty-guide--dragging {
  border-style: solid;
  border-color: rgba(145, 170, 203, 0.42);
  background: rgba(252, 253, 255, 0.95);
}

.canvas-empty-guide--placed {
  border-style: solid;
  border-color: rgba(81, 159, 120, 0.34);
  background: rgba(248, 253, 249, 0.94);
}

.canvas-empty-guide__token {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  margin: 0 auto 10px;
  padding: 5px 10px;
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
}

.canvas-empty-guide strong {
  display: block;
  color: var(--text-strong);
  font-size: 18px;
}

.canvas-empty-guide p,
.property-empty p {
  margin: 0;
}

.canvas-empty-guide__actions {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.canvas-stage__footer {
  display: grid;
  grid-template-columns: 208px minmax(0, 1fr);
  gap: 10px;
}

.canvas-inline-status {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid rgba(212, 221, 234, 0.92);
  border-radius: 18px;
  background: rgba(249, 251, 254, 0.92);
}

.canvas-inline-status span,
.log-preview {
  color: var(--muted);
  font-size: 12px;
}

.canvas-inline-status strong {
  color: var(--text-strong);
  font-size: 14px;
}

.canvas-inline-status span,
.canvas-inline-status strong {
  white-space: nowrap;
}

.progress-track {
  height: 8px;
  border-radius: 999px;
  background: rgba(225, 232, 242, 0.96);
  overflow: hidden;
}

.progress-track--inline {
  min-width: 120px;
}

.progress-track__bar {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #b9cbe0, #88a7cd);
}

.log-preview {
  min-width: 0;
  line-height: 1.45;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.property-stack {
  display: grid;
  gap: 12px;
}

.property-title {
  font-size: 18px;
  font-weight: 800;
}

.dashboard-card {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 12px;
  padding: 16px;
  min-width: 0;
  overflow: hidden;
}

.dashboard-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.dashboard-card__head > div {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.dashboard-card__head h3 {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.overview-task-list {
  display: grid;
  gap: 8px;
  min-height: 0;
  align-content: start;
}

.overview-task-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
}

.overview-task-item__meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  flex: 0 0 auto;
  justify-content: flex-end;
}

.overview-task-item__main {
  min-width: 0;
  flex: 1 1 auto;
}

.overview-task-item__main strong,
.overview-task-item__main small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.overview-task-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 2px;
}

.empty-card {
  align-content: start;
}

.focus-layout {
  display: grid;
  grid-template-columns: 284px minmax(0, 1fr);
  gap: 16px;
  overflow: hidden;
}

.focus-aside {
  display: grid;
  align-content: start;
  gap: 14px;
  padding: 20px;
  min-height: 0;
  overflow: auto;
  background:
    radial-gradient(circle at top left, rgba(156, 198, 255, 0.16), transparent 26%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(249, 252, 255, 0.94));
}

.focus-kicker {
  background: var(--primary-soft);
  color: var(--primary);
}

.focus-aside h2 {
  margin: 0;
  font-size: 28px;
  line-height: 1.18;
}

.focus-aside > p {
  margin: -4px 0 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
}

.focus-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.focus-steps {
  display: grid;
  gap: 10px;
  min-height: 0;
  overflow: auto;
  padding-right: 4px;
}

.focus-stat-card,
.focus-step {
  padding: 14px;
  border: 1px solid var(--hairline);
  border-radius: 18px;
  background: rgba(250, 252, 255, 0.88);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.88);
}

.focus-stat-card strong {
  font-size: 20px;
  color: var(--text-strong);
}

.focus-step {
  display: grid;
  grid-template-columns: 28px 1fr;
  gap: 10px;
  align-items: start;
}

.focus-step span {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 10px;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 12px;
  font-weight: 800;
}

.focus-step p {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.55;
}

.focus-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.focus-main {
  display: grid;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

:deep(.ant-btn),
:deep(.ant-input),
:deep(.ant-input-number),
:deep(.ant-input-number-input),
:deep(.ant-select),
:deep(.ant-select-selection-item),
:deep(.ant-select-selection-placeholder),
:deep(.ant-select-item),
:deep(.ant-radio-button-wrapper) {
  font-family: inherit !important;
}

:deep(.ant-btn) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  border-radius: 13px;
  border-color: rgba(196, 210, 229, 0.94);
  color: var(--text);
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: 0.01em;
  box-shadow: 0 5px 12px rgba(78, 99, 132, 0.05);
}

:deep(.ant-btn > span) {
  display: inline-flex;
  align-items: center;
}

:deep(.ant-btn:hover),
:deep(.ant-btn:focus) {
  border-color: rgba(142, 167, 201, 0.92);
  color: var(--primary);
}

:deep(.ant-btn-primary) {
  border-color: transparent;
  background: linear-gradient(180deg, #b3c6de, #88a7cd);
  box-shadow: 0 9px 16px rgba(92, 112, 144, 0.1);
}

:deep(.ant-btn-primary.ant-btn-background-ghost) {
  border-color: rgba(154, 176, 207, 0.78);
  color: var(--primary);
  background: rgba(106, 143, 190, 0.08);
}

.top-action-row :deep(.ant-btn) {
  background: rgba(255, 255, 255, 0.92);
  min-width: 64px;
}

.top-action-row :deep(.header-action--primary) {
  border-color: transparent;
  background: linear-gradient(180deg, #b7c9df, #8ba9cd);
  color: #f7fbff;
}

.top-action-row :deep(.header-action--accent) {
  border-color: rgba(74, 149, 122, 0.38);
  background: rgba(47, 151, 105, 0.1);
  color: var(--success);
}

.top-action-row :deep(.header-action--warning) {
  border-color: rgba(234, 137, 57, 0.42);
  background: rgba(234, 137, 57, 0.11);
  color: var(--warning);
}

.top-action-row :deep(.header-action--danger) {
  border-color: rgba(201, 93, 96, 0.34);
  background: rgba(201, 93, 96, 0.1);
  color: var(--danger);
}

:deep(.ant-select-selector),
:deep(.ant-input-number),
:deep(.ant-input) {
  border-color: rgba(193, 214, 244, 0.94) !important;
  border-radius: 12px !important;
  background: rgba(255, 255, 255, 0.96) !important;
  box-shadow: none !important;
}

:deep(.ant-input) {
  min-height: 36px;
}

:deep(.ant-select-selector) {
  min-height: 36px !important;
}

:deep(.ant-select-selection-item),
:deep(.ant-select-selection-placeholder) {
  line-height: 34px !important;
}

.overview-task-item__meta :deep(.ant-space) {
  justify-content: flex-end;
}

@media (max-width: 1600px) {
  .overview-layout {
    grid-template-columns: 296px minmax(0, 1fr) 308px;
  }

  .flow-strip--mini {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .canvas-lane-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: min(460px, calc(100% - 96px));
  }
}

@media (max-width: 1480px) {
  .overview-layout {
    grid-template-columns: 296px minmax(0, 1fr);
    grid-template-rows: auto minmax(300px, 1fr) minmax(232px, auto);
  }

  .generation-layout {
    grid-template-rows: auto auto;
    align-content: start;
    overflow: auto;
  }

  .scene-toolbar {
    grid-column: 2;
    grid-row: 1;
    grid-template-columns: 1fr;
    grid-template-areas:
      "filters"
      "flow"
      "actions";
    justify-items: stretch;
  }

  .scene-toolbar__actions {
    justify-content: flex-start;
    justify-self: stretch;
  }

  .tool-group {
    justify-items: start;
  }

  .action-group--runtime {
    padding-left: 0;
    border-left: none;
  }

  .config-panel {
    grid-column: 1 / span 2;
    grid-row: 3;
    max-height: 232px;
  }

  .canvas-panel--main {
    grid-column: 2;
    grid-row: 2;
  }

  .library-drawer {
    width: min(448px, calc(100% - 40px));
  }
}

@media (max-width: 1360px) {
  .app-shell {
    height: 100dvh;
    min-height: 100dvh;
    overflow: hidden;
  }

  .top-shell__header {
    grid-template-areas:
      "brand brand"
      "nav actions";
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
    gap: 14px 16px;
    padding: 16px 18px;
  }

  .top-nav,
  .top-action-row {
    width: 100%;
  }

  .top-nav {
    justify-content: flex-start;
  }

  .top-action-row {
    width: auto;
    justify-content: flex-end;
  }

  .header-action-group {
    width: auto;
    flex-wrap: wrap;
  }

  .overview-layout {
    grid-template-columns: 272px minmax(0, 1fr);
    grid-template-rows: auto minmax(300px, 1fr) minmax(232px, auto);
  }

  .generation-header {
    grid-template-columns: 1fr;
    align-items: start;
  }

  .generation-header__actions {
    justify-content: flex-start;
  }

  .scene-toolbar {
    grid-column: 2;
    grid-row: 1;
    grid-template-columns: 1fr;
    grid-template-areas:
      "filters"
      "flow"
      "actions";
    justify-items: stretch;
  }

  .config-panel {
    grid-column: 1 / span 2;
    grid-row: 3;
    max-height: 232px;
  }

  .canvas-panel--main {
    grid-column: 2;
    grid-row: 2;
  }

}

@media (max-width: 1080px) {
  .overview-layout,
  .generation-layout,
  .focus-layout {
    grid-template-columns: 1fr;
  }

  .library-panel--sidebar,
  .scene-toolbar,
  .config-panel,
  .canvas-panel--main,
  .generation-aside,
  .generation-main {
    grid-column: auto;
    grid-row: auto;
  }

  .library-drawer {
    width: calc(100% - 16px);
    right: 8px;
    left: 8px;
  }

  .scene-toolbar,
  .config-panel__grid,
  .summary-metric-grid,
  .analysis-mini-grid,
  .template-stat-grid,
  .library-module-grid,
  .property-metric-strip,
  .template-quick-grid,
  .config-panel__actions,
  .canvas-stage__footer,
  .config-identity-strip,
  .focus-stats {
    grid-template-columns: 1fr;
  }

  .scene-toolbar__left,
  .scene-toolbar__actions,
  .canvas-stage__head,
  .overview-task-item,
  .overview-task-footer,
  .action-group,
  .top-action-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .library-pane-tabs,
  .library-module-row {
    grid-template-columns: 1fr;
  }

  .library-module-row__meta,
  .library-selected-card__head {
    justify-content: flex-start;
  }

  .canvas-lane-strip {
    width: 100%;
  }

  .tool-group {
    justify-items: start;
  }

  .action-group--runtime {
    padding-left: 0;
    border-left: none;
  }

  .config-section__grid {
    grid-template-columns: 1fr;
  }

  .overview-task-item__meta :deep(.ant-space) {
    justify-content: flex-start;
  }
}

@media (max-width: 768px) {
  .app-shell {
    padding: 12px;
    gap: 12px;
  }

  .top-shell__header,
  .library-drawer,
  .scene-toolbar,
  .config-panel,
  .library-panel--sidebar,
  .generation-aside,
  .focus-aside {
    padding: 14px;
  }

  .top-brand__copy h1 {
    font-size: 26px;
  }

  .top-shell__header {
    grid-template-areas:
      "brand"
      "nav"
      "actions";
    grid-template-columns: 1fr;
  }

  .view-tabs--header {
    width: 100%;
    justify-content: space-between;
  }

  .view-tab {
    min-width: 0;
    flex: 1;
  }

  .canvas-lane-strip {
    position: static;
    width: 100%;
    margin: 14px 14px 0;
  }

  .canvas-stage__surface {
    min-height: 360px;
  }
}

.overview-shell {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 12px;
  min-height: 0;
}

.workflow-board {
  display: grid;
  grid-template-columns: minmax(260px, 0.88fr) minmax(0, 1.12fr);
  align-items: center;
  gap: 16px;
  padding: 16px 18px;
  background:
    radial-gradient(circle at top right, rgba(135, 184, 255, 0.14), transparent 26%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.99), rgba(247, 251, 255, 0.95));
}

.workflow-board__copy {
  display: grid;
  gap: 8px;
}

.workflow-board__kicker {
  display: inline-flex;
  width: fit-content;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(79, 134, 231, 0.12);
  color: var(--primary);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
}

.workflow-board__copy h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 24px;
  line-height: 1.18;
}

.workflow-board__copy p {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.55;
}

.workflow-board__steps {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}

.workflow-step-card {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  align-items: start;
  gap: 10px;
  min-width: 0;
  padding: 12px;
  border: 1px solid rgba(203, 219, 243, 0.92);
  border-radius: 18px;
  background: rgba(248, 251, 255, 0.9);
}

.workflow-step-card--done {
  border-color: rgba(133, 174, 153, 0.68);
  background: linear-gradient(180deg, rgba(247, 252, 249, 0.98), rgba(241, 249, 244, 0.95));
}

.workflow-step-card--active {
  border-color: rgba(110, 154, 226, 0.92);
  background: linear-gradient(180deg, rgba(244, 248, 255, 0.99), rgba(236, 244, 255, 0.94));
  box-shadow: 0 10px 22px rgba(92, 112, 144, 0.08);
}

.workflow-step-card__index {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 10px;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 11px;
  font-weight: 800;
}

.workflow-step-card__copy {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.workflow-step-card__copy strong {
  color: var(--text-strong);
  font-size: 13px;
  line-height: 1.35;
}

.workflow-step-card__copy small,
.workflow-step-card__state {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.45;
}

.workflow-step-card__state {
  grid-column: 2;
  font-weight: 700;
}

.top-shell__header {
  grid-template-columns: minmax(280px, 1fr) auto minmax(430px, auto);
  gap: 18px 20px;
  padding: 18px 20px;
}

.top-brand__copy h1 {
  font-size: 34px;
  letter-spacing: -0.035em;
}

.top-brand__copy small {
  font-size: 13px;
  line-height: 1.55;
  max-width: 760px;
}

.top-brand__meta {
  gap: 10px;
}

.header-status,
.header-meta,
.metric-pill,
.stage-chip,
.mode-tag,
.category-tag,
.run-flow-state,
.deploy-pill {
  font-size: 12px;
}

.view-tab {
  min-width: 86px;
  height: 40px;
  font-size: 13px;
}

.top-action-row {
  gap: 10px;
}

.header-action-group {
  gap: 6px;
  padding: 4px;
}

.header-action-group--primary {
  background: rgba(246, 249, 253, 0.98);
}

.top-action-row :deep(.ant-btn) {
  min-width: 74px;
}

.top-action-row :deep(.header-action--modeling),
.library-panel__head-buttons :deep(.header-action--modeling),
.canvas-stage__head-actions :deep(.header-action--modeling) {
  border-color: rgba(128, 86, 226, 0.35);
  background: rgba(128, 86, 226, 0.1);
  color: #6b42cc;
}

.overview-layout {
  grid-template-columns: clamp(280px, 20vw, 300px) minmax(0, 1fr) clamp(276px, 19vw, 292px);
  gap: 10px;
}

.library-panel--sidebar,
.config-panel {
  padding: 14px;
  gap: 12px;
}

.library-panel__head-buttons {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.library-selected-card,
.library-template-item,
.library-module-item,
.generation-load-card,
.generation-template-item,
.scope-inline-summary {
  padding: 10px 11px;
  border-radius: 16px;
}

.library-template-item span,
.library-template-item small,
.generation-template-item small,
.library-template-item__summary,
.library-module-row__copy small,
.field-label,
.param-field span,
.config-tip span,
.template-stat-card span,
.summary-metric span,
.analysis-mini-row span,
.property-field label,
.property-metric span,
.empty-card,
.property-empty p,
.template-summary-card small,
.template-quick-item small,
.overview-task-item small {
  font-size: 12px;
}

.library-module-row {
  padding: 9px 10px;
  border-radius: 14px;
}

.library-module-row__copy strong,
.library-template-item strong,
.generation-template-item strong {
  font-size: 13px;
}

.library-browser-scroll {
  gap: 10px;
}

.library-runtime-card,
.config-method-banner,
.config-task-board,
.config-property-card {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(203, 219, 243, 0.92);
  border-radius: 18px;
  background: rgba(247, 250, 255, 0.9);
}

.library-runtime-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.library-runtime-box {
  display: grid;
  gap: 3px;
  padding: 8px 10px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(210, 221, 238, 0.9);
}

.library-runtime-box span {
  color: var(--muted);
  font-size: 11px;
}

.library-runtime-box strong {
  color: var(--text-strong);
  font-size: 14px;
}

.library-runtime-actions {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}

.scene-toolbar {
  gap: 10px;
  padding: 12px 14px;
}

.scene-toolbar__left {
  gap: 10px;
}

.metric-cluster {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.flow-strip--mini {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.flow-mini-item {
  min-height: 62px;
  padding: 10px 11px;
  border-radius: 16px;
}

.flow-mini-item__copy {
  gap: 4px;
}

.flow-mini-item__copy strong {
  font-size: 13px;
  white-space: normal;
  line-height: 1.3;
}

.flow-mini-item__copy small {
  display: block;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.45;
}

.scene-toolbar__actions {
  align-items: center;
}

.tool-group {
  justify-items: end;
}

.config-panel {
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  align-content: stretch;
  overflow: hidden;
}

.config-panel__grid {
  align-content: start;
  gap: 8px;
}

.config-method-banner {
  background: linear-gradient(180deg, rgba(244, 248, 255, 0.96), rgba(250, 252, 255, 0.92));
}

.config-method-banner span,
.config-method-banner small {
  color: var(--muted);
  font-size: 11px;
  line-height: 1.45;
}

.config-method-banner strong {
  color: var(--text-strong);
  font-size: 15px;
}

.config-section {
  gap: 8px;
  padding: 11px;
  border-radius: 16px;
}

.config-section__grid {
  gap: 8px;
}

.config-panel__actions {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.config-task-board {
  min-height: 0;
  grid-template-rows: auto minmax(0, 1fr) auto;
  overflow: hidden;
}

.overview-task-list--scroll {
  min-height: 0;
  overflow: auto;
  padding-right: 2px;
}

.overview-task-item--board {
  padding: 10px 12px;
  border: 1px solid rgba(203, 219, 243, 0.92);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.84);
}

.overview-task-item--board .overview-task-item__main {
  gap: 5px;
}

.overview-task-item--board .overview-task-item__main small {
  white-space: normal;
  line-height: 1.45;
}

.task-legend {
  border-top: 1px solid rgba(210, 223, 244, 0.92);
  padding-top: 8px;
}

.task-legend summary {
  cursor: pointer;
  color: var(--primary-strong);
  font-size: 12px;
  font-weight: 700;
}

.task-legend__list {
  display: grid;
  gap: 6px;
  margin-top: 8px;
}

.task-legend__item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.task-legend__item small {
  color: var(--muted);
  font-size: 11px;
  line-height: 1.45;
}

.task-legend__swatch {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  flex: 0 0 auto;
}

.task-legend__swatch--physical {
  background: rgba(79, 149, 118, 0.75);
}

.task-legend__swatch--electrical {
  background: rgba(79, 134, 231, 0.76);
}

.task-legend__swatch--protocol {
  background: rgba(128, 86, 226, 0.72);
}

.config-property-card {
  align-content: start;
}

.config-property-grid {
  display: grid;
  gap: 8px;
}

.canvas-panel--main {
  padding: 10px;
}

.canvas-stage {
  gap: 10px;
}

.canvas-stage__head {
  align-items: flex-start;
  flex-wrap: wrap;
}

.canvas-stage__head small {
  font-size: 12px;
  line-height: 1.5;
}

.canvas-stage__head-actions,
.canvas-stage__status-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.canvas-stage__status {
  justify-content: space-between;
  gap: 10px;
}

.canvas-stage__status-note {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.45;
}

.canvas-stage__surface {
  border-radius: 20px;
}

.canvas-stage__toolbar {
  top: 12px;
  right: 12px;
}

.canvas-mini-button {
  width: auto;
  min-width: 52px;
  height: 32px;
  padding: 0 10px;
  border-radius: 10px;
  font-size: 12px;
}

.canvas-empty-guide {
  width: min(380px, calc(100% - 44px));
  padding: 18px 16px;
}

.canvas-empty-guide strong {
  font-size: 20px;
}

.canvas-empty-guide p {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.55;
}

.canvas-stage__footer {
  grid-template-columns: 240px minmax(0, 1fr);
}

.drawer-confirm-row {
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
}

.property-flyout {
  position: fixed;
  top: 96px;
  right: 16px;
  bottom: 16px;
  z-index: 22;
  width: min(436px, calc(100vw - 32px));
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 12px;
  padding: 16px;
  overflow: hidden;
  border: 1px solid rgba(212, 222, 236, 0.96);
  border-radius: 26px;
  background:
    radial-gradient(circle at top right, rgba(144, 189, 248, 0.16), transparent 24%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(246, 250, 255, 0.96));
  box-shadow: 0 24px 52px rgba(50, 84, 132, 0.16);
  backdrop-filter: blur(12px);
}

.property-flyout__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.property-flyout__copy {
  display: grid;
  gap: 8px;
}

.property-flyout__copy strong {
  display: block;
  color: var(--text-strong);
  font-size: 18px;
  line-height: 1.2;
}

.property-flyout__copy small {
  display: block;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.5;
}

.property-flyout__body {
  min-height: 0;
  overflow: hidden;
}

.property-flyout__body :deep(.inspector-panel) {
  height: 100%;
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.property-flyout__body :deep(.panel-head) {
  position: sticky;
  top: 0;
  z-index: 1;
  padding-bottom: 12px;
  background: linear-gradient(180deg, rgba(247, 250, 255, 0.98), rgba(247, 250, 255, 0.82) 72%, rgba(247, 250, 255, 0));
}

.property-flyout__body :deep(.panel-head h3) {
  font-size: 17px;
}

.property-flyout__body :deep(.panel-head p),
.property-flyout__body :deep(.field-block label),
.property-flyout__body :deep(.summary-card span) {
  font-size: 12px;
}

.property-flyout__body :deep(.inspector-stack) {
  min-height: 0;
  height: 100%;
  padding-right: 4px;
  overflow-y: auto;
}

.property-flyout-enter-active,
.property-flyout-leave-active {
  transition: transform 0.22s ease, opacity 0.22s ease;
}

.property-flyout-enter-from,
.property-flyout-leave-to {
  transform: translateX(18px);
  opacity: 0;
}

.scope-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 28;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(235, 242, 252, 0.36);
  backdrop-filter: blur(10px);
}

.scope-modal {
  width: min(980px, calc(100vw - 48px));
  height: min(640px, calc(100vh - 56px));
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  gap: 14px;
  padding: 18px;
  overflow: hidden;
  border-radius: 30px;
  border: 1px solid rgba(215, 224, 237, 0.96);
  background:
    radial-gradient(circle at top left, rgba(123, 171, 239, 0.12), transparent 26%),
    radial-gradient(circle at right bottom, rgba(115, 204, 237, 0.08), transparent 22%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.99), rgba(246, 250, 255, 0.97));
  box-shadow: 0 26px 58px rgba(46, 76, 122, 0.18);
}

.scope-modal__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.scope-modal__copy {
  display: grid;
  gap: 8px;
}

.scope-modal__copy strong {
  display: block;
  color: var(--text-strong);
  font-size: 21px;
  line-height: 1.16;
}

.scope-modal__copy small {
  display: block;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.5;
}

.scope-modal__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.scope-modal__select {
  width: 220px;
}

.scope-modal__meta {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.scope-stat-card {
  display: grid;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 18px;
  border: 1px solid rgba(213, 222, 235, 0.96);
  background: rgba(248, 251, 255, 0.92);
}

.scope-stat-card span {
  color: var(--muted);
  font-size: 12px;
}

.scope-stat-card strong {
  color: var(--text-strong);
  font-size: 18px;
  line-height: 1.2;
}

.scope-modal__body {
  min-height: 0;
  overflow: hidden;
}

.scope-modal__chart,
.scope-modal__empty {
  height: 100%;
  min-height: 0;
  border-radius: 24px;
  border: 1px solid rgba(214, 224, 237, 0.98);
  background:
    linear-gradient(rgba(231, 237, 245, 0.55) 1px, transparent 1px),
    linear-gradient(90deg, rgba(231, 237, 245, 0.55) 1px, transparent 1px),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(249, 251, 255, 0.96));
  background-size: 24px 24px, 24px 24px, auto;
}

.scope-modal__chart {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 12px;
  padding: 16px;
}

.scope-modal__chart-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.scope-modal__chart-head strong {
  display: block;
  color: var(--text-strong);
  font-size: 16px;
}

.scope-modal__chart-head small {
  display: block;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.45;
}

.scope-chart-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(79, 134, 231, 0.1);
  color: var(--primary);
  font-size: 11px;
  font-weight: 700;
}

.scope-modal__chart :deep(.trend-chart) {
  min-height: 0;
  height: 100%;
}

.scope-modal__empty {
  display: grid;
  place-items: center;
  gap: 10px;
  padding: 18px;
  text-align: center;
}

.scope-modal__empty-token {
  display: inline-grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 18px;
  background: rgba(79, 134, 231, 0.12);
  color: var(--primary);
  font-size: 13px;
  font-weight: 800;
}

.scope-modal__empty strong {
  color: var(--text-strong);
  font-size: 20px;
  line-height: 1.18;
}

.scope-modal__empty p {
  max-width: 34ch;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
}

.scope-modal__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.scope-modal__footer small {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.45;
}

.scope-modal-enter-active,
.scope-modal-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.scope-modal-enter-from,
.scope-modal-leave-to {
  opacity: 0;
}

.scope-modal-enter-from .scope-modal,
.scope-modal-leave-to .scope-modal {
  transform: translateY(10px) scale(0.985);
}

.empty-card--compact {
  padding: 10px 11px;
  border-radius: 16px;
}

@media (max-width: 1600px) {
  .flow-strip--mini {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 1480px) and (min-width: 1181px) {
  .overview-layout {
    grid-template-columns: clamp(264px, 20vw, 284px) minmax(0, 1fr) clamp(258px, 19vw, 276px);
    grid-template-rows: auto minmax(0, 1fr);
  }

  .scene-toolbar {
    grid-column: 2;
    grid-row: 1;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      "filters actions"
      "flow flow";
    justify-items: stretch;
  }

  .config-panel {
    grid-column: 3;
    grid-row: 1 / span 2;
    max-height: none;
  }

  .canvas-panel--main {
    grid-column: 2;
    grid-row: 2;
  }

  .workflow-board__steps {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

@media (max-width: 1360px) and (min-width: 1181px) {
  .top-shell__header {
    grid-template-columns: minmax(240px, 1fr) auto minmax(360px, auto);
  }

  .workflow-board {
    grid-template-columns: 1fr;
  }

  .workflow-board__steps {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .flow-strip--mini {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1180px) {
  .overview-shell {
    grid-template-rows: auto auto;
  }

  .workflow-board {
    grid-template-columns: 1fr;
  }

  .workflow-board__steps {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .config-panel,
  .library-panel--sidebar {
    overflow: hidden;
  }
}

@media (max-width: 768px) {
  .workflow-board__steps,
  .library-runtime-grid,
  .library-runtime-actions {
    grid-template-columns: 1fr;
  }

  .canvas-stage__footer {
    grid-template-columns: 1fr;
  }
}

.top-shell__header {
  grid-template-columns: minmax(220px, 1fr) auto minmax(360px, auto);
  align-items: center;
  gap: 14px 18px;
  padding: 12px 16px;
}

.top-brand {
  display: grid;
  gap: 6px;
}

.top-brand__copy {
  display: grid;
  gap: 4px;
}

.top-brand__copy h1 {
  font-size: 30px;
  line-height: 1.08;
}

.top-brand__copy small {
  max-width: 520px;
  font-size: 12px;
  line-height: 1.5;
}

.top-nav {
  justify-self: center;
}

.view-tabs--header {
  padding: 4px;
  border-radius: 999px;
  background: rgba(245, 248, 253, 0.92);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.88);
}

.view-tab {
  min-width: 74px;
  height: 38px;
  padding: 0 18px;
  font-size: 13px;
  border-radius: 999px;
}

.top-action-row {
  justify-self: end;
  align-items: center;
  gap: 10px;
}

.top-brand__meta--compact {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.header-action-group--compact {
  padding: 4px;
  gap: 4px;
}

.top-action-row :deep(.ant-btn) {
  min-width: 64px;
  height: 34px;
  padding: 0 12px;
}

.overview-shell {
  gap: 10px;
}

.workflow-board--linear {
  display: block;
  padding: 10px 12px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 250, 255, 0.94));
}

.workflow-board__steps--linear {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0;
}

.workflow-arrow {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-areas: "index label";
  align-items: center;
  gap: 0 10px;
  min-width: 0;
  padding: 12px 28px 12px 22px;
  margin-left: -16px;
  border: 1px solid rgba(208, 216, 228, 0.92);
  background: linear-gradient(180deg, rgba(252, 253, 255, 0.98), rgba(245, 248, 253, 0.94));
  color: var(--text-strong);
  text-align: left;
  clip-path: polygon(0 0, calc(100% - 18px) 0, 100% 50%, calc(100% - 18px) 100%, 0 100%, 18px 50%);
  transition: border-color 0.18s ease, background 0.18s ease;
}

.workflow-arrow:first-child {
  margin-left: 0;
  clip-path: polygon(0 0, calc(100% - 18px) 0, 100% 50%, calc(100% - 18px) 100%, 0 100%);
  border-radius: 16px 0 0 16px;
}

.workflow-arrow:last-child {
  border-radius: 0 16px 16px 0;
}

.workflow-arrow--done {
  border-color: rgba(151, 182, 223, 0.94);
  background: linear-gradient(180deg, rgba(248, 251, 255, 0.98), rgba(240, 246, 255, 0.94));
}

.workflow-arrow--active {
  border-color: rgba(223, 112, 92, 0.72);
  background: linear-gradient(180deg, rgba(255, 246, 244, 0.99), rgba(255, 239, 236, 0.95));
}

.workflow-arrow__index {
  grid-area: index;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.18);
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
}

.workflow-arrow--active .workflow-arrow__index {
  background: rgba(222, 88, 66, 0.9);
  color: #fff;
}

.workflow-arrow--done .workflow-arrow__index {
  background: rgba(79, 134, 231, 0.14);
  color: var(--primary);
}

.workflow-arrow__label {
  grid-area: label;
  min-width: 0;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.25;
  white-space: normal;
}

.workflow-arrow__hint {
  display: none;
}

.overview-layout {
  position: relative;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  gap: 0;
}

.library-panel--sidebar,
.scene-toolbar,
.config-panel {
  display: none;
}

.canvas-panel--focus {
  grid-column: 1;
  grid-row: 1;
  padding: 10px;
  overflow: hidden;
}

.workspace-shell {
  display: grid;
  grid-template-columns: 78px minmax(0, 1fr);
  gap: 10px;
  height: 100%;
  min-height: 0;
}

.workspace-rail {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 0;
}

.workspace-rail__button {
  display: grid;
  justify-items: center;
  gap: 6px;
  padding: 12px 6px;
  border: 1px solid rgba(208, 217, 229, 0.92);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(251, 253, 255, 0.98), rgba(244, 248, 253, 0.95));
  color: var(--text-strong);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
  transition: border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
}

.workspace-rail__button:not(:disabled):hover {
  border-color: rgba(128, 158, 214, 0.94);
  box-shadow: 0 10px 24px rgba(61, 94, 142, 0.08);
  transform: translateY(-1px);
}

.workspace-rail__button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.workspace-rail__token {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 12px;
  background: rgba(79, 134, 231, 0.12);
  color: var(--primary);
  font-size: 10px;
  font-weight: 800;
}

.canvas-stage--focus {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  gap: 10px;
  height: 100%;
  min-height: 0;
  padding: 12px;
  border-radius: 26px;
  background:
    radial-gradient(circle at top right, rgba(141, 184, 245, 0.08), transparent 24%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.99), rgba(247, 250, 255, 0.95));
}

.canvas-stage__head {
  align-items: flex-start;
}

.canvas-stage__head strong {
  font-size: 20px;
  line-height: 1.18;
}

.canvas-stage__head small {
  display: block;
  max-width: 60ch;
  font-size: 12px;
  line-height: 1.5;
}

.canvas-stage__head-actions {
  gap: 8px;
}

.canvas-stage__status--focus {
  align-items: center;
  gap: 10px;
  padding: 0 2px 2px;
}

.canvas-stage__surface {
  min-height: 0;
  border-radius: 24px;
  background:
    linear-gradient(rgba(230, 235, 241, 0.55) 1px, transparent 1px),
    linear-gradient(90deg, rgba(230, 235, 241, 0.55) 1px, transparent 1px),
    linear-gradient(180deg, rgba(255, 255, 255, 0.99), rgba(249, 251, 255, 0.97));
  background-size: 24px 24px, 24px 24px, auto;
}

.canvas-stage__toolbar {
  top: 16px;
  right: 16px;
  gap: 8px;
}

.canvas-mini-button {
  min-width: 56px;
  height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.canvas-empty-guide {
  width: min(420px, calc(100% - 56px));
  padding: 18px 18px 16px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(212, 220, 232, 0.96);
  box-shadow: 0 20px 40px rgba(72, 97, 136, 0.08);
}

.canvas-empty-guide__token {
  width: 38px;
  height: 38px;
  border-radius: 14px;
  font-size: 13px;
}

.canvas-empty-guide strong {
  font-size: 28px;
  line-height: 1.12;
}

.canvas-empty-guide p {
  font-size: 13px;
  line-height: 1.6;
}

.canvas-property-float {
  position: absolute;
  right: 18px;
  bottom: 18px;
  z-index: 3;
  width: 228px;
  display: grid;
  gap: 10px;
  padding: 14px;
  border: 1px solid rgba(210, 220, 233, 0.96);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 16px 34px rgba(70, 92, 132, 0.12);
}

.canvas-property-float__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.canvas-property-float__head strong {
  color: var(--text-strong);
  font-size: 14px;
}

.canvas-property-float__grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px 10px;
}

.canvas-property-float__grid span {
  color: var(--muted);
  font-size: 11px;
}

.canvas-property-float__grid strong {
  color: var(--text-strong);
  font-size: 12px;
  line-height: 1.45;
}

.canvas-stage__footer--focus {
  grid-template-columns: 180px 180px 180px minmax(0, 1fr);
  gap: 10px;
}

.canvas-inline-status--metric,
.canvas-inline-status--log {
  min-height: 72px;
  padding: 10px 12px;
  border-radius: 18px;
  background: rgba(248, 251, 255, 0.92);
  border: 1px solid rgba(211, 221, 234, 0.96);
}

.canvas-inline-status--metric small {
  color: var(--muted);
  font-size: 11px;
  line-height: 1.45;
}

.log-preview {
  font-size: 12px;
  line-height: 1.5;
}

.library-drawer {
  top: 12px;
  left: 12px;
  bottom: 12px;
  width: min(380px, calc(100% - 32px));
  border-radius: 26px;
  box-shadow: 0 24px 48px rgba(44, 78, 132, 0.16), inset -1px 0 0 rgba(209, 224, 244, 0.9);
}

.generation-layout {
  gap: 10px;
}

.generation-layout--configuration {
  grid-template-rows: auto minmax(0, 1fr);
}

.generation-header {
  padding: 14px 16px;
  border-radius: 24px;
}

.generation-header--configuration {
  background:
    radial-gradient(circle at top right, rgba(214, 195, 120, 0.16), transparent 24%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.99), rgba(249, 250, 252, 0.95));
}

.generation-header__title {
  gap: 8px;
}

.generation-header__route,
.focus-route {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.meta-chip--stage {
  background: rgba(223, 92, 75, 0.1);
  color: #cc5a48;
}

.generation-header__headline h2,
.focus-aside h2 {
  font-size: 24px;
}

.generation-header__title p,
.focus-aside > p {
  max-width: 64ch;
  font-size: 12px;
}

.generation-header__actions {
  gap: 6px;
}

.generation-header__actions :deep(.ant-btn),
.focus-actions :deep(.ant-btn) {
  min-width: 112px;
  height: 36px;
  border-radius: 999px;
}

.focus-layout {
  grid-template-columns: 256px minmax(0, 1fr);
  gap: 12px;
}

.configuration-layout {
  display: grid;
  grid-template-columns: 268px minmax(0, 1fr);
  gap: 12px;
  min-height: 0;
  overflow: hidden;
}

.configuration-aside {
  display: grid;
  align-content: start;
  gap: 12px;
  min-height: 0;
  padding: 14px;
  border-radius: 24px;
  background:
    radial-gradient(circle at top left, rgba(226, 204, 118, 0.12), transparent 24%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(249, 252, 255, 0.94));
}

.configuration-summary-card {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid rgba(216, 221, 230, 0.92);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.88);
}

.configuration-summary-card .section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.configuration-summary-card h3 {
  margin: 0;
  color: var(--text-strong);
  font-size: 18px;
}

.configuration-summary-card--soft {
  background: rgba(247, 249, 253, 0.88);
}

.configuration-summary-grid {
  display: grid;
  gap: 8px;
}

.configuration-stat {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(246, 249, 255, 0.92);
}

.configuration-stat span {
  color: var(--muted);
  font-size: 11px;
}

.configuration-stat strong {
  color: var(--text-strong);
  font-size: 13px;
  line-height: 1.45;
}

.section-head--compact {
  align-items: center;
}

.configuration-gate-list {
  display: grid;
  gap: 8px;
}

.configuration-gate-item {
  display: grid;
  grid-template-columns: 12px 1fr;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(220, 224, 231, 0.92);
}

.configuration-gate-item span {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.35);
}

.configuration-gate-item--done span {
  background: rgba(74, 163, 99, 0.92);
}

.configuration-gate-item p {
  margin: 0;
  color: var(--text-strong);
  font-size: 12px;
  line-height: 1.45;
}

.configuration-quick-actions {
  display: grid;
  gap: 8px;
}

.configuration-quick-actions :deep(.ant-btn) {
  height: 36px;
  border-radius: 999px;
}

.configuration-panel-shell {
  min-height: 0;
  overflow: hidden;
}

.focus-aside {
  gap: 12px;
  padding: 16px;
  border-radius: 24px;
}

.focus-stats {
  gap: 8px;
}

.focus-stat-card,
.focus-step {
  padding: 12px;
  border-radius: 16px;
}

.focus-stat-card strong {
  font-size: 18px;
}

.focus-step p {
  font-size: 12px;
}

.focus-actions {
  display: grid;
  gap: 8px;
}

.focus-main {
  border-radius: 24px;
  overflow: hidden;
}

@media (max-width: 1440px) {
  .workflow-board__steps--linear {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .workflow-arrow,
  .workflow-arrow:first-child {
    margin-left: 0;
    clip-path: none;
    border-radius: 16px;
  }

  .canvas-stage__footer--focus {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1180px) {
  .top-shell__header {
    grid-template-columns: 1fr;
  }

  .top-nav,
  .top-action-row {
    justify-self: stretch;
  }

  .workspace-shell {
    grid-template-columns: 1fr;
  }

  .configuration-layout {
    grid-template-columns: 1fr;
  }

  .workspace-rail {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .workspace-rail__button {
    min-width: 120px;
    grid-template-columns: auto 1fr;
    justify-items: start;
    align-items: center;
    gap: 8px;
    text-align: left;
  }

  .canvas-property-float {
    position: static;
    width: 100%;
    margin-top: 12px;
  }

  .property-flyout {
    top: 88px;
    right: 12px;
    bottom: 12px;
    width: min(392px, calc(100vw - 24px));
  }

  .scope-modal {
    width: min(940px, calc(100vw - 32px));
    height: min(620px, calc(100vh - 32px));
  }

  .scope-modal__meta {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .workflow-board__steps--linear,
  .canvas-stage__footer--focus {
    grid-template-columns: 1fr;
  }

  .property-flyout {
    left: 12px;
    width: auto;
  }

  .scope-modal-backdrop {
    padding: 12px;
  }

  .scope-modal {
    width: 100%;
    height: min(680px, calc(100vh - 24px));
    padding: 14px;
    border-radius: 24px;
  }

  .scope-modal__head,
  .scope-modal__chart-head,
  .scope-modal__footer {
    display: grid;
    gap: 10px;
    justify-content: stretch;
  }

  .scope-modal__actions,
  .scope-modal__meta {
    display: grid;
    grid-template-columns: 1fr;
  }

  .scope-modal__select {
    width: 100%;
  }
}
</style>
