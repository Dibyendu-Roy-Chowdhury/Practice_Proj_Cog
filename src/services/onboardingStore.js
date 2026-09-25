// Shared external store for onboarding requests — a plain module, not a React
// component, so it can start fetching the moment it's imported (e.g. as soon as
// AppShell loads) rather than waiting for the Onboarding page to mount. Both the
// sidebar badge and the Onboarding page subscribe to this via useSyncExternalStore,
// so they always agree without either one owning the data.
import { getOnboardingRequests, approveOnboardingRequestApi, rejectOnboardingRequestApi } from './onboardingService';

const POLL_MS = 5000;

let requests = [];
let hasSynced = false;
// id -> 'approved' | 'rejected' — decisions made this session, applied on every
// sync so a refetch of the source data never undoes something already acted on.
const decisions = new Map();
const listeners = new Set();

const notify = () => listeners.forEach((listener) => listener());

const sync = async () => {
  const data = await getOnboardingRequests();
  if (Array.isArray(data)) {
    requests = data
      .filter((r) => decisions.get(r.id) !== 'rejected' && r.status !== 'rejected')
      .map((r) => ({
        ...r,
        status: decisions.get(r.id) === 'approved' ? 'approved' : (r.status || 'pending'),
      }));
  }
  hasSynced = true;
  notify();
};

sync();
setInterval(sync, POLL_MS);

export const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getRequests = () => requests;
export const getHasSynced = () => hasSynced;

export const approveRequest = (id) => {
  decisions.set(id, 'approved');
  requests = requests.map((r) => (r.id === id ? { ...r, status: 'approved' } : r));
  approveOnboardingRequestApi(id);
  notify();
};

export const rejectRequest = (id) => {
  decisions.set(id, 'rejected');
  requests = requests.filter((r) => r.id !== id);
  rejectOnboardingRequestApi(id);
  notify();
};
