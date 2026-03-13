import { HtmlNode, HtmlNodeModel, h } from '@logicflow/core';

import { defaultPortsByGroup, normalizePorts } from '../../utils/faultMath.js';

function compactTypeLabel(properties) {
  if (properties.group === 'source') return 'SRC';
  if (properties.group === 'fault') return 'FLT';
  if (properties.group === 'scope') return 'SCP';
  if (properties.group === 'system') return 'SYS';
  return properties.token || 'ND';
}

function portFallback(properties, direction) {
  const defaults = defaultPortsByGroup(properties.group || 'system');
  return direction === 'input' ? defaults.inputPorts : defaults.outputPorts;
}

function createPortColumn(direction, ports, accent) {
  const column = document.createElement('div');
  column.style.display = 'flex';
  column.style.flexDirection = 'column';
  column.style.alignItems = direction === 'input' ? 'flex-start' : 'flex-end';
  column.style.gap = '6px';
  column.style.minWidth = '84px';

  if (ports.length === 0) {
    const placeholder = document.createElement('div');
    placeholder.innerText = '-';
    placeholder.style.fontSize = '11px';
    placeholder.style.color = '#9bb0ca';
    column.appendChild(placeholder);
    return column;
  }

  ports.forEach((portName) => {
    const tag = document.createElement('div');
    tag.innerText = portName;
    tag.style.maxWidth = '138px';
    tag.style.padding = '3px 10px';
    tag.style.borderRadius = '999px';
    tag.style.border = `1px solid ${accent}33`;
    tag.style.background = direction === 'input' ? 'rgba(255,255,255,0.82)' : `${accent}12`;
    tag.style.color = direction === 'input' ? '#617a9a' : accent;
    tag.style.fontSize = '11px';
    tag.style.fontWeight = '700';
    tag.style.whiteSpace = 'nowrap';
    tag.style.overflow = 'hidden';
    tag.style.textOverflow = 'ellipsis';
    column.appendChild(tag);
  });

  return column;
}

class StudioNode extends HtmlNode {
  getAnchorShape(anchorData) {
    const { x, y, direction } = anchorData;
    return h('rect', {
      x: x - 7,
      y: y - 7,
      width: 14,
      height: 14,
      rx: 4,
      ry: 4,
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
    const accent = properties.accent || '#2f80ff';
    const inputPorts = normalizePorts(properties.inputPorts, portFallback(properties, 'input'));
    const outputPorts = normalizePorts(properties.outputPorts, portFallback(properties, 'output'));

    const wrapper = document.createElement('div');
    wrapper.style.width = '100%';
    wrapper.style.height = '100%';
    wrapper.style.display = 'grid';
    wrapper.style.gridTemplateRows = 'auto 1fr';
    wrapper.style.gap = '10px';
    wrapper.style.boxSizing = 'border-box';
    wrapper.style.padding = '6px';

    const title = document.createElement('div');
    title.innerText = properties.name || '未命名节点';
    title.style.padding = '8px 16px';
    title.style.borderRadius = '16px';
    title.style.background = '#ffffff';
    title.style.border = '1px solid rgba(185, 212, 247, 0.96)';
    title.style.boxShadow = '0 10px 24px rgba(48, 88, 160, 0.08)';
    title.style.color = '#32537d';
    title.style.fontSize = '13px';
    title.style.fontWeight = '800';
    title.style.lineHeight = '18px';
    title.style.textAlign = 'center';
    title.style.whiteSpace = 'nowrap';
    title.style.overflow = 'hidden';
    title.style.textOverflow = 'ellipsis';

    const card = document.createElement('div');
    card.style.width = '100%';
    card.style.height = '100%';
    card.style.padding = '16px';
    card.style.borderRadius = '18px';
    card.style.border = `1px solid ${accent}26`;
    card.style.background = properties.fill || '#f8fbff';
    card.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.74)';
    card.style.display = 'grid';
    card.style.gridTemplateRows = 'auto auto 1fr';
    card.style.gap = '12px';
    card.style.boxSizing = 'border-box';

    const topRow = document.createElement('div');
    topRow.style.display = 'flex';
    topRow.style.justifyContent = 'space-between';
    topRow.style.alignItems = 'center';
    topRow.style.gap = '10px';

    const typePill = document.createElement('div');
    typePill.innerText = compactTypeLabel(properties);
    typePill.style.minWidth = '42px';
    typePill.style.height = '28px';
    typePill.style.display = 'grid';
    typePill.style.placeItems = 'center';
    typePill.style.padding = '0 10px';
    typePill.style.borderRadius = '999px';
    typePill.style.background = `${accent}18`;
    typePill.style.color = accent;
    typePill.style.fontSize = '11px';
    typePill.style.fontWeight = '800';
    typePill.style.letterSpacing = '0.04em';

    const ioSummary = document.createElement('div');
    ioSummary.innerText = `I ${inputPorts.length} / O ${outputPorts.length}`;
    ioSummary.style.padding = '4px 10px';
    ioSummary.style.borderRadius = '999px';
    ioSummary.style.border = '1px solid rgba(184, 211, 246, 0.88)';
    ioSummary.style.background = 'rgba(245,249,255,0.96)';
    ioSummary.style.color = '#587395';
    ioSummary.style.fontSize = '11px';
    ioSummary.style.fontWeight = '700';

    topRow.appendChild(typePill);
    topRow.appendChild(ioSummary);

    const separator = document.createElement('div');
    separator.style.height = '1px';
    separator.style.background = 'rgba(189, 213, 247, 0.7)';

    const portRow = document.createElement('div');
    portRow.style.display = 'grid';
    portRow.style.gridTemplateColumns = 'minmax(92px, 1fr) auto minmax(92px, 1fr)';
    portRow.style.alignItems = 'start';
    portRow.style.gap = '12px';

    const centerMark = document.createElement('div');
    centerMark.style.display = 'grid';
    centerMark.style.placeItems = 'center';
    centerMark.style.minWidth = '34px';
    centerMark.style.height = '100%';

    const centerDot = document.createElement('div');
    centerDot.style.width = '18px';
    centerDot.style.height = '18px';
    centerDot.style.borderRadius = '999px';
    centerDot.style.background = `linear-gradient(135deg, ${accent}, ${accent}55)`;
    centerDot.style.boxShadow = `0 0 0 4px ${accent}15`;
    centerMark.appendChild(centerDot);

    portRow.appendChild(createPortColumn('input', inputPorts, accent));
    portRow.appendChild(centerMark);
    portRow.appendChild(createPortColumn('output', outputPorts, accent));

    card.appendChild(topRow);
    card.appendChild(separator);
    card.appendChild(portRow);

    wrapper.appendChild(title);
    wrapper.appendChild(card);
    rootEl.appendChild(wrapper);
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

    this.width = Math.min(500, Math.max(300, 220 + portCount * 14, 150 + nameLength * 16, 248 + longestPortLength * 10));
    this.height = Math.max(158, 132 + portCount * 30);
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
    style.stroke = 'rgba(47, 128, 255, 0.18)';
    style.strokeDasharray = '6 4';
    return style;
  }

  getAnchorStyle(anchorInfo) {
    const style = super.getAnchorStyle(anchorInfo);
    const accent = this.properties?.accent || '#2f80ff';
    style.width = 14;
    style.height = 14;
    style.fill = anchorInfo.direction === 'input' ? '#ffffff' : accent;
    style.stroke = accent;
    style.strokeWidth = 2.4;
    style.hover.fill = accent;
    style.hover.stroke = accent;
    return style;
  }

  getDefaultAnchor() {
    const { id, x, y, width, height, properties = {} } = this;
    const inputPorts = normalizePorts(properties.inputPorts, portFallback(properties, 'input'));
    const outputPorts = normalizePorts(properties.outputPorts, portFallback(properties, 'output'));
    const anchors = [];
    const topOffset = y - height / 2 + 112;

    inputPorts.forEach((portName, index) => {
      anchors.push({
        x: x - width / 2 + 7,
        y: topOffset + index * 30,
        id: `${id}::input::${portName}`,
        direction: 'input',
        edgeAddable: false,
      });
    });

    outputPorts.forEach((portName, index) => {
      anchors.push({
        x: x + width / 2 - 7,
        y: topOffset + index * 30,
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
