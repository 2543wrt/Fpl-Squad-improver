/**
 * Calculates fixture difficulty for a team over the next N gameweeks.
 * Returns average FDR (1=easy, 5=hard).
 */
export function getFixtureDifficulty(teamId, fixtures, numGW = 3) {
  const teamFixtures = fixtures
    .filter(f => f.team_h === teamId || f.team_a === teamId)
    .slice(0, numGW);

  if (teamFixtures.length === 0) return null;

  const totalDifficulty = teamFixtures.reduce((sum, f) => {
    const difficulty = f.team_h === teamId ? f.team_h_difficulty : f.team_a_difficulty;
    return sum + difficulty;
  }, 0);

  return (totalDifficulty / teamFixtures.length).toFixed(1);
}

/**
 * Calculates squad stats for the dashboard summary bar.
 */
export function calculateSquadStats(squad, bootstrapData) {
  const totalValue = squad.reduce((sum, p) => sum + p.now_cost, 0) / 10;
  const avgForm = (squad.reduce((sum, p) => sum + parseFloat(p.form || 0), 0) / squad.length).toFixed(1);
  const totalPoints = squad.reduce((sum, p) => sum + p.total_points, 0);
  const avgOwnership = (squad.reduce((sum, p) => sum + parseFloat(p.selected_by_percent || 0), 0) / squad.length).toFixed(1);

  return { totalValue, avgForm, totalPoints, avgOwnership };
}

/**
 * Improved suggestion algorithm.
 * Identifies the weakest player by a composite score (form + points/cost ratio).
 * Finds replacements with better composite score within budget.
 */
export function calculateImprovement(squad, allPlayers, elementTypes, fixtures = []) {
  const starters = squad.slice(0, 11);

  // Composite score: weighted blend of form and points-per-million
  const score = (p) => {
    const form = parseFloat(p.form || 0);
    const ppm = p.now_cost > 0 ? (p.total_points / (p.now_cost / 10)) : 0;
    return (form * 0.6) + (ppm * 0.4);
  };

  const weakestLink = starters.reduce((min, player) => {
    return score(player) < score(min) ? player : min;
  }, starters[0]);

  const positionId = weakestLink.element_type;
  const maxCost = weakestLink.now_cost;
  const weakScore = score(weakestLink);

  // Exclude players already in the squad
  const squadIds = new Set(squad.map(p => p.id));

  const candidates = allPlayers.filter(p =>
    p.element_type === positionId &&
    p.now_cost <= maxCost &&
    !squadIds.has(p.id) &&
    score(p) > weakScore
  );

  // Sort by composite score descending
  candidates.sort((a, b) => score(b) - score(a));

  return {
    weakestLink,
    suggestions: candidates.slice(0, 5),
    weakScore: weakScore.toFixed(2),
  };
}

/**
 * Returns a colour class for fixture difficulty rating.
 */
export function fdrClass(fdr) {
  if (fdr <= 2) return 'fdr-easy';
  if (fdr <= 3) return 'fdr-medium';
  if (fdr <= 4) return 'fdr-hard';
  return 'fdr-very-hard';
}

/**
 * Returns position label from element_type id.
 */
export function positionLabel(elementTypeId) {
  const labels = { 1: 'GKP', 2: 'DEF', 3: 'MID', 4: 'FWD' };
  return labels[elementTypeId] || '?';
}

/**
 * Formats a cost value from FPL API (e.g. 95 → "£9.5m")
 */
export function formatCost(cost) {
  return `£${(cost / 10).toFixed(1)}m`;
}
