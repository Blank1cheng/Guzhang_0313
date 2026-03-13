const { execSync } = require('child_process');

function read(command) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
}

function getListeningPids(port) {
  const output = read(`netstat -ano -p tcp | findstr LISTENING | findstr :${port}`);
  if (!output) return [];

  const pids = new Set();
  output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const parts = line.split(/\s+/);
      const localAddress = parts[1] || '';
      const pid = parts[parts.length - 1];
      if (localAddress.endsWith(`:${port}`) && /^\d+$/.test(pid)) {
        pids.add(pid);
      }
    });

  return [...pids];
}

function getProcessName(pid) {
  const output = read(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`).trim();
  if (!output || output.startsWith('INFO:')) return '';
  const firstField = output.split(',')[0] || '';
  return firstField.replace(/^"|"$/g, '');
}

function killPid(pid) {
  try {
    execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function main() {
  const port = Number(process.argv[2]);
  if (!port) process.exit(0);

  const pids = getListeningPids(port);
  if (pids.length === 0) {
    console.log(`[ensure-dev-ports] port ${port} is free`);
    return;
  }

  pids.forEach((pid) => {
    const processName = getProcessName(pid) || 'unknown';
    const killed = killPid(pid);
    const status = killed ? 'killed' : 'failed';
    console.log(`[ensure-dev-ports] ${status} ${processName} (PID ${pid}) on port ${port}`);
  });
}

main();
