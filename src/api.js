export const API_BASE = '/api';

/**
 * Custom error class for FPL API errors
 */
export class FPLError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'FPLError';
    this.status = status;
  }
}

async function apiFetch(path) {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new FPLError(`API error on ${path}`, response.status);
  }
  return response.json();
}

/**
 * Fetches all bootstrap static data: players, teams, events, element types.
 */
export async function getBootstrapStatic() {
  return apiFetch('/bootstrap-static/');
}

/**
 * Fetches a manager's general info, current GW picks, and live GW points.
 * Returns { manager, picks, livePoints }
 */
export async function getManagerTeam(managerId) {
  // 1. Manager info
  const manager = await apiFetch(`/entry/${managerId}/`).catch(() => {
    throw new FPLError('Manager not found. Please check your ID.', 404);
  });

  const currentEvent = manager.current_event;
  if (!currentEvent) {
    throw new FPLError('No active gameweek found for this manager.', 400);
  }

  // 2. Picks for current GW
  const picks = await apiFetch(`/entry/${managerId}/event/${currentEvent}/picks/`).catch(() => {
    throw new FPLError('Could not load team picks for the current gameweek.', 500);
  });

  // 3. Live GW data for real-time points
  const liveData = await apiFetch(`/event/${currentEvent}/live/`).catch(() => null);

  return { manager, picks, liveData };
}

/**
 * Fetches a manager's season history (past seasons + GW history).
 */
export async function getManagerHistory(managerId) {
  return apiFetch(`/entry/${managerId}/history/`).catch(() => null);
}

/**
 * Fetches upcoming fixtures for all teams.
 */
export async function getFixtures() {
  return apiFetch('/fixtures/?future=1').catch(() => []);
}
