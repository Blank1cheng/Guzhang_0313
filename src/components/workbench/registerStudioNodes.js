import { HtmlNode, HtmlNodeModel, h } from '@logicflow/core';

import { defaultPortsByGroup, normalizePorts } from '../../utils/faultMath.js';

function compactTypeLabel(properties) {
  if (properties.group === 'source') return 'SRC';
  if (properties.group === 'fault') return 'FLT';
  if (properties.group === 'scope') return 'SCP';
  if (properties.group === 'system') return 'SYS';
  return properties.token || 'ND';
}

function groupLabel(properties) {
  if (properties.group === 'source') return '信号源';
  if (properties.group === 'fault') return '故障任务';
  if (properties.group === 'scope') return '示波器';
  if (properties.group === 'system') return '流程模块';
  return '工作节点';
}

function layerText(layer) {
  return {
    physical: '物理层',
    electrical: '电气层',
    protocol: '协议层',
  }[layer] || layer || '--';
}

function portFallback(properties, direction) {
  const defaults = defaultPortsByGroup(properties.group || 'system');
  return direction === 'input' ? defaults.inputPorts : defaults.outputPorts;
}

function resolvePalette(properties) {
  const accent = properties.accent || '#6f9aed';

  if (properties.group === 'source') {
    return {
      accent: '#4f86e7',
      panel: 'linear-gradient(180deg, rgba(253, 254, 255, 0.99), rgba(246, 249, 253, 0.97))',
      shell: 'rgba(79, 134, 231, 0.06)',
      border: 'rgba(144, 184, 245, 0.56)',
      chip: 'rgba(79, 134, 231, 0.1)',
      rail: 'rgba(79, 134, 231, 0.15)',
      center: 'rgba(79, 134, 231, 0.9)',
      shadow: '0 7px 16px rgba(63, 111, 192, 0.08)',
    };
  }

  if (properties.group === 'fault') {
    return {
      accent: '#6f9aed',
      panel: 'linear-gradient(180deg, rgba(252, 254, 255, 0.99), rgba(244, 249, 255, 0.97))',
      shell: 'rgba(111, 154, 237, 0.06)',
      border: 'rgba(156, 188, 244, 0.48)',
      chip: 'rgba(111, 154, 237, 0.1)',
      rail: 'rgba(111, 154, 237, 0.14)',
      center: 'rgba(111, 154, 237, 0.88)',
      shadow: '0 7px 16px rgba(79, 122, 204, 0.08)',
    };
  }

  if (properties.group === 'scope') {
    return {
      accent: '#86aff7',
      panel: 'linear-gradient(180deg, rgba(253, 254, 255, 0.99), rgba(247, 250, 253, 0.97))',
      shell: 'rgba(134, 175, 247, 0.06)',
      border: 'rgba(171, 199, 244, 0.48)',
      chip: 'rgba(134, 175, 247, 0.1)',
      rail: 'rgba(134, 175, 247, 0.15)',
      center: 'rgba(134, 175, 247, 0.9)',
      shadow: '0 7px 16px rgba(86, 120, 194, 0.08)',
    };
  }

  return {
    accent,
    panel: 'linear-gradient(180deg, rgba(253, 254, 255, 0.99), rgba(247, 250, 253, 0.97))',
    shell: `${accent}0f`,
    border: `${accent}42`,
    chip: `${accent}12`,
    rail: `${accent}18`,
    center: `${accent}dc`,
    shadow: '0 7px 16px rgba(109, 127, 157, 0.07)',
  };
}

function buildMetaLine(properties) {
  if (properties.group === 'source') {
    return `${properties.sourceConfig?.waveType || 'sine'} · A ${properties.sourceConfig?.amplitude ?? '--'}`;
  }
  if (properties.group === 'system') {
    return `${properties.processConfig?.mode || 'gain'} · G ${properties.processConfig?.gain ?? '--'}`;
  }
  if (properties.group === 'scope') {
    return `窗口 ${properties.scopeConfig?.sampleWindow ?? '--'} · 监测信号`;
  }
  if (properties.group === 'fault') {
    return `${properties.location || '--'} · ${layerText(properties.injectionLayer || properties.category)}`;
  }
  return properties.subtitle || '节点信息';
}

function buildCenterCopy(properties) {
  if (properties.group === 'source') return '输出主信号';
  if (properties.group === 'system') return '流程处理';
  if (properties.group === 'scope') return '实时观测';
  if (properties.group === 'fault') return '注入任务';
  return '信号节点';
}

function formatMetricValue(value, suffix = '') {
  if (value == null || value === '') return '--';
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    const normalized = Number.isInteger(numeric) ? numeric.toString() : numeric.toFixed(2).replace(/\.?0+$/, '');
    return `${normalized}${suffix}`;
  }
  return `${value}${suffix}`;
}

function buildDetailMetrics(properties, inputPorts) {
  if (properties.group === 'source') {
    return [
      { label: '频率', value: formatMetricValue(properties.sourceConfig?.frequency, 'Hz') },
      { label: '偏置', value: formatMetricValue(properties.sourceConfig?.offset) },
    ];
  }

  if (properties.group === 'system') {
    return [
      { label: '模式', value: properties.processConfig?.mode || '--' },
      { label: '增益', value: formatMetricValue(properties.processConfig?.gain) },
    ];
  }

  if (properties.group === 'scope') {
    return [
      { label: '窗口', value: formatMetricValue(properties.scopeConfig?.sampleWindow, 's') },
      { label: '通道', value: inputPorts[0] || 'signal' },
    ];
  }

  if (properties.group === 'fault') {
    return [
      {
        label: '窗口',
        value: `${formatMetricValue(properties.triggerStart)}-${formatMetricValue(properties.triggerEnd, 's')}`,
      },
      { label: '强度', value: `x${formatMetricValue(properties.intensity)}` },
    ];
  }

  return [];
}

function createChip(text, palette, alignRight = false) {
  const chip = document.createElement('div');
  chip.innerText = text;
  chip.style.display = 'inline-flex';
  chip.style.alignItems = 'center';
  chip.style.justifyContent = 'center';
  chip.style.maxWidth = '108px';
  chip.style.padding = '2px 6px';
  chip.style.borderRadius = '999px';
  chip.style.background = alignRight ? 'rgba(255,255,255,0.88)' : palette.chip;
  chip.style.border = `1px solid ${palette.border}`;
  chip.style.color = palette.accent;
  chip.style.fontSize = '9.25px';
  chip.style.fontWeight = '700';
  chip.style.whiteSpace = 'nowrap';
  chip.style.overflow = 'hidden';
  chip.style.textOverflow = 'ellipsis';
  return chip;
}

function createMetricTag(label, value, palette) {
  const tag = document.createElement('div');
  tag.style.display = 'inline-flex';
  tag.style.alignItems = 'center';
  tag.style.gap = '4px';
  tag.style.padding = '2px 6px';
  tag.style.borderRadius = '9px';
  tag.style.background = 'rgba(255,255,255,0.84)';
  tag.style.border = `1px solid ${palette.border}`;
  tag.style.minWidth = '0';

  const labelEl = document.createElement('span');
  labelEl.innerText = label;
  labelEl.style.color = '#8b9eb8';
  labelEl.style.fontSize = '9.25px';
  labelEl.style.fontWeight = '700';

  const valueEl = document.createElement('strong');
  valueEl.innerText = value;
  valueEl.style.color = '#476684';
  valueEl.style.fontSize = '9.5px';
  valueEl.style.fontWeight = '800';
  valueEl.style.maxWidth = '56px';
  valueEl.style.whiteSpace = 'nowrap';
  valueEl.style.overflow = 'hidden';
  valueEl.style.textOverflow = 'ellipsis';

  tag.appendChild(labelEl);
  tag.appendChild(valueEl);
  return tag;
}

function createPortColumn(direction, ports, palette) {
  const column = document.createElement('div');
  column.style.display = 'grid';
  column.style.gap = '5px';
  column.style.alignContent = 'start';
  column.style.minWidth = '72px';

  const columnHead = document.createElement('div');
  columnHead.innerText = direction === 'input' ? '输入' : '输出';
  columnHead.style.color = '#7e93b1';
  columnHead.style.fontSize = '9.25px';
  columnHead.style.fontWeight = '700';
  columnHead.style.textAlign = direction === 'input' ? 'left' : 'right';
  column.appendChild(columnHead);

  if (ports.length === 0) {
    const placeholder = document.createElement('div');
    placeholder.innerText = '未定义';
    placeholder.style.padding = '4px 6px';
    placeholder.style.borderRadius = '9px';
    placeholder.style.background = 'rgba(255,255,255,0.72)';
    placeholder.style.color = '#9bb0ca';
    placeholder.style.fontSize = '9.25px';
    placeholder.style.textAlign = direction === 'input' ? 'left' : 'right';
    column.appendChild(placeholder);
    return column;
  }

  ports.forEach((portName) => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.justifyContent = direction === 'input' ? 'flex-start' : 'flex-end';
    row.style.gap = '5px';

    const rail = document.createElement('span');
    rail.style.width = '10px';
    rail.style.height = '2px';
    rail.style.borderRadius = '999px';
    rail.style.background = palette.center;
    rail.style.opacity = '0.72';

    const tag = createChip(portName, palette, direction === 'output');
    tag.style.maxWidth = '76px';

    if (direction === 'input') {
      row.appendChild(rail);
      row.appendChild(tag);
    } else {
      row.appendChild(tag);
      row.appendChild(rail);
    }

    column.appendChild(row);
  });

  return column;
}

class StudioNode extends HtmlNode {
  getAnchorShape(anchorData) {
    const { x, y, direction } = anchorData;
    return h('circle', {
      cx: x,
      cy: y,
      r: 6,
      className: `studio-anchor studio-anchor--${direction}`,
    });
  }

  shouldUpdate() {
    if (this.preProperties && this.preProperties === this.currentProperties) return false;
    this.preProperties = this.currentProperties;
    return true;
  }

  setHtml(rootEl) {
    rootEl.innerHTML = '';
    rootEl.style.overflow = 'visible';

    const { properties = {} } = this.props.model;
    const palette = resolvePalette(properties);
    const inputPorts = normalizePorts(properties.inputPorts, portFallback(properties, 'input'));
    const outputPorts = normalizePorts(properties.outputPorts, portFallback(properties, 'output'));
    const detailMetrics = buildDetailMetrics(properties, inputPorts);

    const shell = document.createElement('div');
    shell.style.width = '100%';
    shell.style.height = '100%';
    shell.style.padding = '3px';
    shell.style.borderRadius = '14px';
    shell.style.background = palette.shell;
    shell.style.boxSizing = 'border-box';

    const card = document.createElement('div');
    card.style.width = '100%';
    card.style.height = '100%';
    card.style.display = 'grid';
    card.style.gridTemplateRows = 'auto auto 1fr';
    card.style.gap = '5px';
    card.style.padding = '7px 9px';
    card.style.borderRadius = '12px';
    card.style.background = palette.panel;
    card.style.border = `1px solid ${palette.border}`;
    card.style.boxShadow = palette.shadow;
    card.style.boxSizing = 'border-box';

    const head = document.createElement('div');
    head.style.display = 'flex';
    head.style.alignItems = 'flex-start';
    head.style.justifyContent = 'space-between';
    head.style.gap = '6px';

    const titleGroup = document.createElement('div');
    titleGroup.style.display = 'grid';
    titleGroup.style.gap = '3px';
    titleGroup.style.minWidth = '0';

    const typeRow = document.createElement('div');
    typeRow.style.display = 'flex';
    typeRow.style.alignItems = 'center';
    typeRow.style.gap = '5px';
    typeRow.appendChild(createChip(compactTypeLabel(properties), palette));

    const groupMeta = document.createElement('span');
    groupMeta.innerText = groupLabel(properties);
    groupMeta.style.color = '#8799b1';
    groupMeta.style.fontSize = '9.25px';
    groupMeta.style.fontWeight = '700';
    groupMeta.style.whiteSpace = 'nowrap';
    typeRow.appendChild(groupMeta);

    const title = document.createElement('div');
    title.innerText = properties.name || '未命名节点';
    title.style.color = '#2f4965';
    title.style.fontSize = '12.5px';
    title.style.fontWeight = '800';
    title.style.lineHeight = '1.24';
    title.style.whiteSpace = 'nowrap';
    title.style.overflow = 'hidden';
    title.style.textOverflow = 'ellipsis';

    const meta = document.createElement('div');
    meta.innerText = buildMetaLine(properties);
    meta.style.color = '#7a8fa7';
    meta.style.fontSize = '9.5px';
    meta.style.lineHeight = '1.35';
    meta.style.whiteSpace = 'nowrap';
    meta.style.overflow = 'hidden';
    meta.style.textOverflow = 'ellipsis';

    titleGroup.appendChild(typeRow);
    titleGroup.appendChild(title);
    titleGroup.appendChild(meta);

    const ioSummary = document.createElement('div');
    ioSummary.style.display = 'flex';
    ioSummary.style.alignItems = 'center';
    ioSummary.style.flex = '0 0 auto';

    const ioChip = createChip(`I ${inputPorts.length} / O ${outputPorts.length}`, palette, true);
    ioChip.style.maxWidth = 'none';
    ioSummary.appendChild(ioChip);

    head.appendChild(titleGroup);
    head.appendChild(ioSummary);

    const infoRail = document.createElement('div');
    infoRail.style.display = 'grid';
    infoRail.style.gap = '3px';
    infoRail.style.padding = '5px 6px';
    infoRail.style.borderRadius = '10px';
    infoRail.style.background = 'rgba(255,255,255,0.8)';
    infoRail.style.border = `1px solid ${palette.border}`;

    const infoMain = document.createElement('div');
    infoMain.style.display = 'grid';
    infoMain.style.gap = '3px';
    infoMain.style.minWidth = '0';

    const subtitle = document.createElement('div');
    subtitle.innerText = properties.subtitle || buildCenterCopy(properties);
    subtitle.style.color = '#667e99';
    subtitle.style.fontSize = '9.5px';
    subtitle.style.fontWeight = '700';
    subtitle.style.whiteSpace = 'nowrap';
    subtitle.style.overflow = 'hidden';
    subtitle.style.textOverflow = 'ellipsis';

    infoMain.appendChild(subtitle);

    if (detailMetrics.length) {
      const metricRow = document.createElement('div');
      metricRow.style.display = 'flex';
      metricRow.style.flexWrap = 'wrap';
      metricRow.style.gap = '3px';
      detailMetrics.slice(0, 1).forEach((item) => {
        metricRow.appendChild(createMetricTag(item.label, item.value, palette));
      });
      infoMain.appendChild(metricRow);
    }
    infoRail.appendChild(infoMain);

    const portRow = document.createElement('div');
    portRow.style.display = 'grid';
    portRow.style.gridTemplateColumns = 'minmax(68px, 1fr) 52px minmax(68px, 1fr)';
    portRow.style.gap = '5px';
    portRow.style.alignItems = 'center';

    const centerPanel = document.createElement('div');
    centerPanel.style.display = 'grid';
    centerPanel.style.placeItems = 'center';
    centerPanel.style.alignContent = 'center';
    centerPanel.style.gap = '3px';
    centerPanel.style.minHeight = '44px';
    centerPanel.style.padding = '5px 3px';
    centerPanel.style.borderRadius = '10px';
    centerPanel.style.background = 'rgba(255,255,255,0.84)';
    centerPanel.style.border = `1px solid ${palette.border}`;
    centerPanel.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.88)';

    const core = document.createElement('div');
    core.style.width = '12px';
    core.style.height = '12px';
    core.style.borderRadius = '999px';
    core.style.background = `linear-gradient(135deg, ${palette.center}, ${palette.accent})`;
    core.style.boxShadow = `0 0 0 3px ${palette.chip}`;

    const coreLabel = document.createElement('div');
    coreLabel.innerText = compactTypeLabel(properties);
    coreLabel.style.color = palette.accent;
    coreLabel.style.fontSize = '8.5px';
    coreLabel.style.fontWeight = '800';
    coreLabel.style.letterSpacing = '0.06em';

    centerPanel.appendChild(core);
    centerPanel.appendChild(coreLabel);

    portRow.appendChild(createPortColumn('input', inputPorts, palette));
    portRow.appendChild(centerPanel);
    portRow.appendChild(createPortColumn('output', outputPorts, palette));

    card.appendChild(head);
    card.appendChild(infoRail);
    card.appendChild(portRow);
    shell.appendChild(card);
    rootEl.appendChild(shell);
  }
}

class StudioNodeModel extends HtmlNodeModel {
  setAttributes() {
    const properties = this.properties || {};
    const inputPorts = normalizePorts(properties.inputPorts, portFallback(properties, 'input'));
    const outputPorts = normalizePorts(properties.outputPorts, portFallback(properties, 'output'));
    const portCount = Math.max(inputPorts.length, outputPorts.length, 1);
    const nameLength = String(properties.name || '').length;
    const longestPortLength = Math.max(
      0,
      ...inputPorts.map((item) => String(item || '').length),
      ...outputPorts.map((item) => String(item || '').length),
    );

    this.width = Math.min(344, Math.max(236, 188 + portCount * 10, 150 + nameLength * 6, 192 + longestPortLength * 4));
    this.height = Math.max(156, 136 + portCount * 22);
    this.sourceRules = [];
    this.targetRules = [];

    this.sourceRules.push({
      message: '请从输出端口发起连线。',
      validate: (sourceNode, targetNode, sourceAnchor) => {
        if (sourceAnchor?.direction !== 'output') return false;
        return sourceNode.id !== targetNode?.id;
      },
    });

    this.targetRules.push({
      message: '请连接到输入端口。',
      validate: (_sourceNode, _targetNode, _sourceAnchor, targetAnchor) => targetAnchor?.direction === 'input',
    });
  }

  getOutlineStyle() {
    const style = super.getOutlineStyle();
    const palette = resolvePalette(this.properties || {});
    style.stroke = palette.accent;
    style.strokeWidth = 1.1;
    style.strokeDasharray = '6 4';
    style.radius = 12;
    return style;
  }

  getAnchorStyle(anchorInfo) {
    const style = super.getAnchorStyle(anchorInfo);
    const palette = resolvePalette(this.properties || {});
    style.width = 10;
    style.height = 10;
    style.r = 5;
    style.fill = anchorInfo.direction === 'input' ? '#ffffff' : palette.accent;
    style.stroke = palette.accent;
    style.strokeWidth = 1.8;
    style.hover.fill = palette.accent;
    style.hover.stroke = palette.accent;
    return style;
  }

  getDefaultAnchor() {
    const { id, x, y, width, height, properties = {} } = this;
    const inputPorts = normalizePorts(properties.inputPorts, portFallback(properties, 'input'));
    const outputPorts = normalizePorts(properties.outputPorts, portFallback(properties, 'output'));
    const anchors = [];
    const topOffset = y - height / 2 + 88;

    inputPorts.forEach((portName, index) => {
      anchors.push({
        x: x - width / 2 + 7,
        y: topOffset + index * 20,
        id: `${id}::input::${portName}`,
        direction: 'input',
        edgeAddable: false,
      });
    });

    outputPorts.forEach((portName, index) => {
      anchors.push({
        x: x + width / 2 - 7,
        y: topOffset + index * 20,
        id: `${id}::output::${portName}`,
        direction: 'output',
      });
    });

    return anchors;
  }
}

export default function registerStudioNodes(lf) {
  lf.register({
    type: 'studio-node',
    view: StudioNode,
    model: StudioNodeModel,
  });
}
