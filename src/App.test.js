import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock API service so no real network calls are made
jest.mock('./services/API_services', () => ({
  login: jest.fn(),
  logout: jest.fn(),
  validateToken: jest.fn().mockResolvedValue({ valid: false }),
  FLEET_CONSTANTS: {
    TOTAL_AGENTS: 5, ACTIVE_AGENTS: 5, FLEET_NAME: 'Veritas',
    MTD_SPEND_USD: 2340, PATHFINDER_EVAL_SCORE: 0.61,
    ORACLE_ANOMALY_SCORE: 79, ANOMALY_THRESHOLD: 75, EVAL_GATE_THRESHOLD: 0.80,
    APPROVED_AGENTS: [],
  },
}));

import App from './App';

describe('App smoke tests', () => {
  it('renders without crashing', () => {
    render(<App />);
  });

  it('shows a login form or dashboard on load', async () => {
    render(<App />);
    // App should render some identifiable content — either a login form or the main nav.
    await waitFor(() => {
      const hasLogin    = document.querySelector('input[type="password"]') !== null;
      const hasDashboard = document.querySelector('nav, [role="navigation"], [data-testid="dashboard"]') !== null;
      expect(hasLogin || hasDashboard).toBe(true);
    }, { timeout: 3000 });
  });
});

describe('FLEET_CONSTANTS smoke test', () => {
  it('FLEET_CONSTANTS exports expected keys', async () => {
    const { FLEET_CONSTANTS } = await import('./services/API_services');
    expect(FLEET_CONSTANTS).toHaveProperty('TOTAL_AGENTS', 5);
    expect(FLEET_CONSTANTS).toHaveProperty('FLEET_NAME', 'Veritas');
    expect(FLEET_CONSTANTS).toHaveProperty('EVAL_GATE_THRESHOLD', 0.80);
  });
});
