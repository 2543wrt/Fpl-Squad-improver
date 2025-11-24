export const API_BASE = '/api';

export async function getBootstrapStatic() {
  try {
    const response = await fetch(`${API_BASE}/bootstrap-static/`);
    if (!response.ok) throw new Error('Failed to fetch static data');
    return await response.json();
  } catch (error) {
    console.error('Error fetching bootstrap static:', error);
    throw error;
  }
}

export async function getManagerTeam(managerId) {
  try {
    // Fetch current gameweek first to know which picks to get
    // For simplicity in this prototype, we'll assume the current active event
    // In a real app, we'd check 'events' from bootstrap-static first
    
    // Note: The endpoint for a manager's team for a specific event is /entry/{id}/event/{event}/picks/
    // But to get just the current squad, we often need to know the current GW.
    // Let's try to fetch the manager's general info first to validate ID.
    const managerRes = await fetch(`${API_BASE}/entry/${managerId}/`);
    if (!managerRes.ok) throw new Error('Manager not found');
    const managerData = await managerRes.json();

    // Get current GW from manager data summary or bootstrap
    const currentEvent = managerData.current_event;

    if (!currentEvent) {
        throw new Error("No active event found for this manager.");
    }

    const picksRes = await fetch(`${API_BASE}/entry/${managerId}/event/${currentEvent}/picks/`);
    if (!picksRes.ok) throw new Error('Failed to fetch team picks');
    const picksData = await picksRes.json();

    return { manager: managerData, picks: picksData };
  } catch (error) {
    console.error('Error fetching manager team:', error);
    throw error;
  }
}
