export const faultCategoryOptions = [
  { value: 'analog', label: '模拟量故障' },
  { value: 'state', label: '状态量故障' },
  { value: 'noise', label: '噪声干扰' },
];

export const faultTypeOptionsByCategory = {
  analog: [
    { value: 'bias', label: '偏置故障' },
    { value: 'drift', label: '漂移故障' },
  ],
  state: [
    { value: 'interruption', label: '状态突变' },
    { value: 'stuck', label: '卡位故障' },
  ],
  noise: [
    { value: 'gauss', label: '高斯噪声' },
    { value: 'impulse', label: '脉冲噪声' },
  ],
};

export const faultParameterSchemasByMode = {
  gauss: [
    { key: 'mean', label: '均值', step: 0.1, unit: 'V' },
    { key: 'variance', label: '方差', step: 0.1, unit: 'V^2' },
    { key: 'severity', label: '基础严重度', step: 0.01, min: 0.1, max: 1.2, unit: '' },
  ],
  impulse: [
    { key: 'variance', label: '脉冲幅值', step: 0.1, unit: 'V' },
    { key: 'bias', label: '触发阈值', step: 0.1, unit: 'V' },
    { key: 'severity', label: '基础严重度', step: 0.01, min: 0.1, max: 1.2, unit: '' },
  ],
  bias: [
    { key: 'bias', label: '偏差量', step: 0.1, unit: 'V' },
    { key: 'severity', label: '基础严重度', step: 0.01, min: 0.1, max: 1.2, unit: '' },
  ],
  drift: [
    { key: 'bias', label: '漂移起点', step: 0.1, unit: 'V' },
    { key: 'variance', label: '漂移斜率', step: 0.01, unit: 'V/s' },
    { key: 'severity', label: '基础严重度', step: 0.01, min: 0.1, max: 1.2, unit: '' },
  ],
  interruption: [
    { key: 'severity', label: '中断比例', step: 0.01, min: 0.1, max: 1.2, unit: '' },
  ],
  stuck: [
    { key: 'bias', label: '卡滞值', step: 0.1, unit: '' },
    { key: 'severity', label: '基础严重度', step: 0.01, min: 0.1, max: 1.2, unit: '' },
  ],
};

export const injectionLayerOptions = [
  { value: 'physical', label: '物理层', description: '物理参数修正式注入' },
  { value: 'electrical', label: '电气层', description: '信号叠加式注入' },
  { value: 'protocol', label: '协议层', description: '通信链路数据篡改式注入' },
];

export const injectionMethodOptionsByLayer = {
  physical: [
    {
      value: 'param_modify',
      label: '物理参数修正式注入',
      factorLabel: '参数修正系数',
      hint: '对模板核心参数做物理量级修正，适合传感器、执行器和参数组。',
    },
  ],
  electrical: [
    {
      value: 'signal_overlay',
      label: '信号叠加式注入',
      factorLabel: '叠加耦合系数',
      hint: '将故障量叠加到实时信号上，适合模拟量和噪声干扰。',
    },
  ],
  protocol: [
    {
      value: 'data_tamper',
      label: '链路篡改式注入',
      factorLabel: '篡改覆盖系数',
      hint: '对数据帧或链路字段进行量化、覆盖或扰动，适合协议层验证。',
    },
  ],
};

export const injectionLocationPresetsByLayer = {
  physical: ['温度传感器参数组', '执行器 B 参数组', '导航参数组', '动力单元参数组'],
  electrical: ['传感器 A', '信号调理链路', '主信号总线', '执行器反馈通道'],
  protocol: ['CAN 帧链路', 'FDIR 通信链路', '遥测打包链路', '串口帧通道'],
};

export const sourceModeOptions = [
  { value: 'sine', label: '正弦源' },
  { value: 'square', label: '方波源' },
  { value: 'ramp', label: '斜坡源' },
  { value: 'constant', label: '常值源' },
  { value: 'pulse', label: '脉冲源' },
];

export const processModeOptions = [
  { value: 'pass', label: '透传' },
  { value: 'gain', label: '比例缩放' },
  { value: 'offset', label: '偏置修正' },
  { value: 'sum', label: '多输入求和' },
  { value: 'filter', label: '一阶平滑' },
];

export const triggerConditionOptions = [
  { value: 'immediate', label: '立即触发' },
  { value: 'delay', label: '延迟触发' },
  { value: 'event', label: '事件触发' },
];

export const scenarioPresetOptions = [
  {
    value: 'baseline',
    label: '基础流程',
    description: '主信号源 -> 流程块 -> 基线示波器',
  },
  {
    value: 'electrical_overlay',
    label: '电气层叠加',
    description: '在信号链路插入高斯噪声并对比前后波形',
  },
  {
    value: 'physical_modify',
    label: '物理层修正',
    description: '在参数组位置插入偏置故障并观察流程变化',
  },
  {
    value: 'protocol_tamper',
    label: '协议层篡改',
    description: '在通信链路插入状态突变并观察恢复过程',
  },
];

export const initialFaultTemplates = [
  {
    id: 'tpl-gauss-5',
    templateName: '高斯噪声_方差5',
    category: 'noise',
    mode: 'gauss',
    mean: 0,
    variance: 5,
    bias: 0,
    severity: 0.58,
    accent: '#79a7f2',
    token: 'GN',
  },
  {
    id: 'tpl-bias-18',
    templateName: '偏置故障_18',
    category: 'analog',
    mode: 'bias',
    mean: 0,
    variance: 0,
    bias: 18,
    severity: 0.62,
    accent: '#5f88dc',
    token: 'BO',
  },
  {
    id: 'tpl-drift-nav',
    templateName: '漂移故障_导航',
    category: 'analog',
    mode: 'drift',
    mean: 0,
    variance: 0.18,
    bias: 10,
    severity: 0.48,
    accent: '#688fdf',
    token: 'DF',
  },
  {
    id: 'tpl-link-cut',
    templateName: '状态突变_CAN链路',
    category: 'state',
    mode: 'interruption',
    mean: 0,
    variance: 0,
    bias: 0,
    severity: 0.72,
    accent: '#4d79d3',
    token: 'SI',
  },
];

export const nodePalette = [
  {
    id: 'source-sine',
    group: 'source',
    label: '信号源',
    subtitle: '标准波形源',
    token: 'SRC',
    accent: '#4f86e7',
    fill: '#f7fbff',
    sourceConfig: { waveType: 'sine', amplitude: 4.2, frequency: 0.18, offset: 17, phase: 0, duty: 50 },
  },
  {
    id: 'process-node',
    group: 'system',
    label: '流程块',
    subtitle: '通用信号处理节点',
    token: 'SYS',
    accent: '#6f9aed',
    fill: '#f8fbff',
    processConfig: { mode: 'gain', gain: 1.05, offset: 0, memory: 17 },
  },
  {
    id: 'scope-node',
    group: 'scope',
    label: '示波器',
    subtitle: '监测实时曲线',
    token: 'SCP',
    accent: '#86aff7',
    fill: '#f6faff',
    scopeConfig: { sampleWindow: 80 },
  },
];
