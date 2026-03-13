import {
  faultCategoryOptions,
  faultTypeOptionsByCategory,
  injectionLayerOptions,
  injectionMethodOptionsByLayer,
  processModeOptions,
  sourceModeOptions,
} from '../data/faultCatalog.js';

export function modeLabel(mode) {
  const options = Object.values(faultTypeOptionsByCategory).flat();
  return options.find((item) => item.value === mode)?.label || '故障模式';
}

export function categoryLabel(category) {
  return faultCategoryOptions.find((item) => item.value === category)?.label || '未分类';
}

export function layerLabel(layer) {
  return injectionLayerOptions.find((item) => item.value === layer)?.label || '电气层';
}

export function layerDescription(layer) {
  return injectionLayerOptions.find((item) => item.value === layer)?.description || '信号叠加式注入';
}

export function injectionMethodLabel(method) {
  const options = Object.values(injectionMethodOptionsByLayer).flat();
  return options.find((item) => item.value === method)?.label || '信号叠加式注入';
}

export function sourceModeLabel(mode) {
  return sourceModeOptions.find((item) => item.value === mode)?.label || '正弦源';
}

export function processModeLabel(mode) {
  return processModeOptions.find((item) => item.value === mode)?.label || '透传';
}

export function groupLabel(group) {
  return {
    source: '信号源',
    fault: '故障任务',
    scope: '示波器',
    system: '流程块',
  }[group] || '节点';
}

export function inferCategoryByMode(mode) {
  if (faultTypeOptionsByCategory.analog.some((item) => item.value === mode)) return 'analog';
  if (faultTypeOptionsByCategory.state.some((item) => item.value === mode)) return 'state';
  if (faultTypeOptionsByCategory.noise.some((item) => item.value === mode)) return 'noise';
  return 'analog';
}

export function buildFaultSubtitle(category, mode, layer, method) {
  return `${categoryLabel(category)} / ${modeLabel(mode)} / ${layerLabel(layer)} / ${injectionMethodLabel(method)}`;
}

export function buildTaskSummary(task) {
  return `${task.templateName} -> ${layerLabel(task.layer)} -> ${injectionMethodLabel(task.method)}`;
}
