// Deliberately self-contained and separate from API_services.js.
import { PENDING_REQUESTS } from './mock_data';

const getBaseUrl = () => {
  if (process.env.REACT_APP_API_URL !== undefined) {
    return process.env.REACT_APP_API_URL;
  }
  if (typeof window !== 'undefined' && window.location) {
    if (process.env.NODE_ENV === 'production' || window.location.port === '' || window.location.port === '80') {
      return '';
    }
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return 'http://localhost:8000';
};

const API_TIMEOUT_MS = 3000;

export const getOnboardingRequests = async () => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  const baseUrl = getBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/onboarding/requests`, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : (data?.requests ?? data?.data ?? []);
  } catch (err) {
    console.warn('Backend /api/onboarding/requests unavailable, using fallback:', err);
    return PENDING_REQUESTS;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const approveOnboardingRequestApi = async (id, payload = {}) => {
  const baseUrl = getBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/onboarding/requests/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Failed to submit onboarding approval to backend:', err);
  }
};

export const rejectOnboardingRequestApi = async (id, payload = {}) => {
  const baseUrl = getBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/onboarding/requests/${encodeURIComponent(id)}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Failed to submit onboarding rejection to backend:', err);
  }
};
