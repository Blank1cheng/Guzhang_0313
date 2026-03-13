export function normalizeIntensityScale(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 1;
  return Math.max(0.1, numeric);
}

export function normalizeMethodFactor(value, fallback = 1) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0.1, numeric);
}

export function defaultPortsByGroup(group) {
  if (group === 'source') return { inputPorts: [], outputPorts: ['signal'] };
  if (group === 'scope') return { inputPorts: ['signal'], outputPorts: [] };
  if (group === 'fault') return { inputPorts: ['signal'], outputPorts: ['signal'] };
  return { inputPorts: ['in1'], outputPorts: ['out1'] };
}

export function normalizePorts(ports, fallback = []) {
  if (Array.isArray(ports) && ports.length > 0) return ports.filter(Boolean);
  return [...fallback];
}

export function makePortList(count, prefix) {
  const safeCount = Math.max(1, Number(count) || 1);
  return Array.from({ length: safeCount }, (_item, index) => `${prefix}${index + 1}`);
}

export function ensurePortList(existing, minCount, prefix) {
  const normalized = normalizePorts(existing, []);
  if (normalized.length >= minCount) return normalized.slice(0, minCount);
  return makePortList(minCount, prefix);
}

export function parseAnchorPort(anchorId, fallback = 'signal') {
  const parts = String(anchorId || '').split('::');
  return parts[2] || fallback;
}

export function generateSourceSignal(config, simTime) {
  const waveType = config?.waveType || 'sine';
  const amplitude = Number(config?.amplitude ?? 4.2);
  const frequency = Number(config?.frequency ?? 0.18);
  const offset = Number(config?.offset ?? 17);
  const phase = Number(config?.phase ?? 0);
  const duty = Math.min(99, Math.max(1, Number(config?.duty ?? 50))) / 100;
  const t = simTime + phase;

  switch (waveType) {
    case 'constant':
      return offset;
    case 'square':
      return offset + (Math.sin(t * Math.PI * frequency * 2) >= Math.cos(Math.PI * (1 - duty)) ? amplitude : -amplitude);
    case 'ramp':
      return offset + ((((t * frequency) % 1) + 1) % 1) * amplitude;
    case 'pulse':
      return offset + ((((t * frequency) % 1) + 1) % 1) < duty ? amplitude : 0;
    case 'sine':
    default:
      return offset + Math.sin(t * Math.PI * frequency * 2) * amplitude;
  }
}

function pseudoNoise(index) {
  return Math.sin(index * 3.2) * 0.8 + Math.cos(index * 1.7) * 0.35;
}

export function signalValueToNumber(value, fallback = 0) {
  const candidate = Array.isArray(value) ? value[0] : value;
  const parsed = Number(candidate);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function processSystemNode(inputsByPort, config = {}, memoryValue = 0) {
  const flatInputs = Object.values(inputsByPort).flat().map((item) => signalValueToNumber(item, 0));
  const primary = flatInputs[0] ?? 0;
  const gain = Number(config.gain ?? 1);
  const offset = Number(config.offset ?? 0);
  const memory = Number(config.memory ?? memoryValue ?? 0);

  switch (config.mode) {
    case 'gain':
      return primary * gain + offset;
    case 'offset':
      return primary + offset;
    case 'sum':
      return flatInputs.reduce((accumulator, item) => accumulator + item, 0) * gain + offset;
    case 'filter':
      return memory * 0.82 + primary * 0.18 + offset;
    case 'pass':
    default:
      return primary;
  }
}

function applyInjectionMethod(baseValue, faultValue, config = {}) {
  const methodFactor = normalizeMethodFactor(config.methodFactor, 1);
  const layer = config.injectionLayer || 'electrical';
  const delta = faultValue - baseValue;

  if (layer === 'physical') return baseValue + delta * (0.84 + methodFactor * 0.34);
  if (layer === 'protocol') return Number((Math.round((baseValue + delta * Math.min(1.25, methodFactor)) * 2) / 2).toFixed(2));
  return baseValue + delta * methodFactor;
}

export function applyFault(baseValue, index, model, config) {
  const severity = 0.42 + Number(model.severity || 0) * 1.18;
  const intensity = normalizeIntensityScale(config.intensity ?? model.intensity ?? 1);
  let faultValue = baseValue;

  switch (model.mode) {
    case 'bias':
      faultValue = baseValue + Number(model.bias || 0) * 0.18 * severity * intensity;
      break;
    case 'drift':
      faultValue = baseValue + index * Number(model.variance || 0.18) * severity * intensity + Number(model.bias || 0) * 0.08;
      break;
    case 'interruption':
      faultValue = baseValue * Math.max(0.04, 1 - Math.min(0.92, severity * 0.42 + intensity * 0.22));
      break;
    case 'stuck':
      faultValue = Number(model.bias || baseValue);
      break;
    case 'impulse':
      faultValue = baseValue + (Math.sin(index * 2.8) > 0.75 ? Number(model.variance || 0) * (1.2 + intensity + severity * 0.4) : 0);
      break;
    case 'gauss':
    default:
      faultValue = baseValue + Number(model.mean || 0) + pseudoNoise(index) * Number(model.variance || 0) * 0.34 * severity * intensity;
      break;
  }

  return Number(applyInjectionMethod(baseValue, faultValue, config).toFixed(4));
}

export function buildExecutionOrder(nodes, edges) {
  const orderedSeed = [...nodes].sort((a, b) => (a.x - b.x) || (a.y - b.y) || String(a.id).localeCompare(String(b.id)));
  const nodeMap = new Map(orderedSeed.map((node) => [node.id, node]));
  const outgoing = new Map(orderedSeed.map((node) => [node.id, []]));
  const indegree = new Map(orderedSeed.map((node) => [node.id, 0]));

  (edges || []).forEach((edge) => {
    if (!nodeMap.has(edge.sourceNodeId) || !nodeMap.has(edge.targetNodeId)) return;
    outgoing.get(edge.sourceNodeId)?.push(edge.targetNodeId);
    indegree.set(edge.targetNodeId, Number(indegree.get(edge.targetNodeId) || 0) + 1);
  });

  const queue = orderedSeed.filter((node) => indegree.get(node.id) === 0);
  const ordered = [];
  const queued = new Set(queue.map((node) => node.id));

  while (queue.length > 0) {
    queue.sort((a, b) => (a.x - b.x) || (a.y - b.y) || String(a.id).localeCompare(String(b.id)));
    const currentNode = queue.shift();
    if (!currentNode || ordered.some((item) => item.id === currentNode.id)) continue;
    ordered.push(currentNode);
    (outgoing.get(currentNode.id) || []).forEach((targetId) => {
      const nextDegree = Number(indegree.get(targetId) || 0) - 1;
      indegree.set(targetId, nextDegree);
      if (nextDegree <= 0 && !queued.has(targetId)) {
        const targetNode = nodeMap.get(targetId);
        if (targetNode) {
          queue.push(targetNode);
          queued.add(targetId);
        }
      }
    });
  }

  if (ordered.length < orderedSeed.length) {
    const remaining = orderedSeed.filter((node) => !ordered.some((item) => item.id === node.id));
    ordered.push(...remaining);
  }
  return ordered;
}

export function buildMetricsFromSeries(normal, faulty, recovered, stepSize = 0.5) {
  const threshold = 1.2;
  const detectIndex = normal.findIndex((item, index) => Math.abs((faulty[index] ?? item) - item) >= threshold);
  const detectionTime = detectIndex >= 0 ? Number((detectIndex * stepSize).toFixed(1)) : null;
  const isolationAccuracy = Math.max(
    72,
    Math.min(
      98,
      78 + normal.reduce((accumulator, item, index) => accumulator + Math.min(2, Math.abs((faulty[index] ?? item) - item)), 0) / Math.max(1, normal.length),
    ),
  );
  const robustness = Math.max(
    60,
    Math.min(
      96,
      88 - recovered.reduce((accumulator, item, index) => accumulator + Math.abs(item - (normal[index] ?? item)), 0) / Math.max(1, recovered.length * 4),
    ),
  );

  return {
    detectionTime,
    isolationAccuracy: Number(isolationAccuracy.toFixed(1)),
    robustness: Number(robustness.toFixed(1)),
  };
}
