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
 * Uses localStorage cache with 1-hour TTL.
 */
export async function getBootstrapStatic() {
  const CACHE_KEY = 'fpl_bootstrap';
  const CACHE_TTL = 60 * 60 * 1000; // 1 hour

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) {
        return data;
      }
    }
  } catch { /* ignore parse errors */ }

  const data = await apiFetch('/bootstrap-static/');

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch { /* ignore storage errors (quota etc.) */ }

  return data;
}

/**
 * Fetches a manager's general info, current GW picks, and live GW points.
 * Returns { manager, picks, liveData }
 */
export async function getManagerTeam(managerId) {
  const manager = await apiFetch(`/entry/${managerId}/`).catch(() => {
    throw new FPLError('Manager not found. Please check your ID.', 404);
  });

  const currentEvent = manager.current_event;
  if (!currentEvent) {
    throw new FPLError('No active gameweek found for this manager.', 400);
  }

  const picks = await apiFetch(`/entry/${managerId}/event/${currentEvent}/picks/`).catch(() => {
    throw new FPLError('Could not load team picks for the current gameweek.', 500);
  });

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
 * Fetches ALL fixtures (past and future) for the fixture ticker.
 */
export async function getFixtures() {
  return apiFetch('/fixtures/').catch(() => []);
}

/**
 * Fetches the current event/GW status to detect if a GW is live.
 * Returns the current event object or null.
 */
export async function getEventStatus() {
  try {
    const data = await apiFetch('/event-status/');
    return data;
  } catch {
    return null;
  }
}

/**
 * Fetches detailed stats for a single player (GW breakdown, xG, xA, etc.)
 */
export async function getPlayerSummary(playerId) {
  return apiFetch(`/element-summary/${playerId}/`).catch(() => null);
}
