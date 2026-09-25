// Module-level in-memory store — survives re-renders, cleared on page reload
const _ops = [];

export function logOp({ action, target, status = 'Success' }) {
  const op = {
    id:       Date.now(),
    time:     new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    action,
    target,
    status,
    operator: localStorage.getItem('username') || 'operator',
  };
  _ops.unshift(op);
  if (_ops.length > 50) _ops.pop();
  window.dispatchEvent(new CustomEvent('vfo:op', { detail: op }));
  return op;
}

export function getOps() {
  return [..._ops];
}

export function clearOps() {
  _ops.length = 0;
  window.dispatchEvent(new CustomEvent('vfo:op-cleared'));
}
