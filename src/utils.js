/**
 * Calculates fixture difficulty for a team over the next N gameweeks.
 * Returns average FDR (1=easy, 5=hard).
 */
export function getFixtureDifficulty(teamId, fixtures, numGW = 3) {
  const teamFixtures = fixtures
    .filter(f => (f.team_h === teamId || f.team_a === teamId) && !f.finished)
    .slice(0, numGW);

  if (teamFixtures.length === 0) return null;

  const totalDifficulty = teamFixtures.reduce((sum, f) => {
    const difficulty = f.team_h === teamId ? f.team_h_difficulty : f.team_a_difficulty;
    return sum + difficulty;
  }, 0);

  return (totalDifficulty / teamFixtures.length).toFixed(1);
}

/**
 * Returns next N upcoming fixture objects for a team, enriched with opponent name + H/A.
 */
export function getNextFixtures(teamId, fixtures, teams, n = 5) {
  const upcoming = fixtures
    .filter(f => (f.team_h === teamId || f.team_a === teamId) && !f.finished)
    .slice(0, n);

  return upcoming.map(f => {
    const isHome = f.team_h === teamId;
    const opponentId = isHome ? f.team_a : f.team_h;
    const opponent = teams.find(t => t.id === opponentId);
    const fdr = isHome ? f.team_h_difficulty : f.team_a_difficulty;
    return {
      opponent: opponent?.short_name ?? '?',
      isHome,
      fdr,
      event: f.event,
    };
  });
}

/**
 * Calculates squad stats for the dashboard summary bar.
 */
export function calculateSquadStats(squad) {
  const totalValue = (squad.reduce((sum, p) => sum + p.now_cost, 0) / 10).toFixed(1);
  const avgForm = (squad.reduce((sum, p) => sum + parseFloat(p.form || 0), 0) / squad.length).toFixed(1);
  const totalPoints = squad.reduce((sum, p) => sum + p.total_points, 0);
  const avgOwnership = (squad.reduce((sum, p) => sum + parseFloat(p.selected_by_percent || 0), 0) / squad.length).toFixed(1);

  return { totalValue, avgForm, totalPoints, avgOwnership };
}

/**
 * Composite score for a player: weighted blend of form and points-per-million.
 */
export function playerScore(p) {
  const form = parseFloat(p.form || 0);
  const ppm = p.now_cost > 0 ? (p.total_points / (p.now_cost / 10)) : 0;
  return (form * 0.6) + (ppm * 0.4);
}

/**
 * Multi-transfer planner: finds the top N weakest starters and their best replacements.
 */
export function calculateMultiTransfer(squad, allPlayers, numTransfers = 3) {
  const starters = squad.slice(0, 11);
  const squadIds = new Set(squad.map(p => p.id));

  // Rank starters by score ascending (weakest first)
  const ranked = [...starters].sort((a, b) => playerScore(a) - playerScore(b));
  const weakest = ranked.slice(0, numTransfers);

  return weakest.map(weak => {
    const candidates = allPlayers.filter(p =>
      p.element_type === weak.element_type &&
      p.now_cost <= weak.now_cost &&
      !squadIds.has(p.id) &&
      playerScore(p) > playerScore(weak)
    ).sort((a, b) => playerScore(b) - playerScore(a));

    return {
      out: weak,
      in: candidates[0] ?? null,
      scoreDiff: candidates[0] ? (playerScore(candidates[0]) - playerScore(weak)).toFixed(2) : null,
    };
  }).filter(t => t.in !== null);
}

/**
 * Improved single-transfer suggestion (used in Transfers tab detail).
 */
export function calculateImprovement(squad, allPlayers, elementTypes, fixtures = []) {
  const starters = squad.slice(0, 11);
  const squadIds = new Set(squad.map(p => p.id));

  const weakestLink = starters.reduce((min, player) =>
    playerScore(player) < playerScore(min) ? player : min
  , starters[0]);

  const candidates = allPlayers.filter(p =>
    p.element_type === weakestLink.element_type &&
    p.now_cost <= weakestLink.now_cost &&
    !squadIds.has(p.id) &&
    playerScore(p) > playerScore(weakestLink)
  ).sort((a, b) => playerScore(b) - playerScore(a));

  return {
    weakestLink,
    suggestions: candidates.slice(0, 5),
    weakScore: playerScore(weakestLink).toFixed(2),
  };
}

/**
 * Captain ranking: ranks starters by expected GW points.
 * Formula: form * home_bonus / fdr_factor
 */
export function calculateCaptainRanking(starters, fixtures, teams) {
  return [...starters].map(p => {
    const nextFix = fixtures
      .filter(f => (f.team_h === p.team || f.team_a === p.team) && !f.finished)
      .slice(0, 1)[0];

    let expectedScore = parseFloat(p.form || 0);
    if (nextFix) {
      const isHome = nextFix.team_h === p.team;
      const fdr = isHome ? nextFix.team_h_difficulty : nextFix.team_a_difficulty;
      const homeMult = isHome ? 1.1 : 1.0;
      const fdrFactor = 1 + (5 - fdr) * 0.1;
      expectedScore = expectedScore * homeMult * fdrFactor;

      const opponentId = isHome ? nextFix.team_a : nextFix.team_h;
      const opponent = teams.find(t => t.id === opponentId);
      p._nextOpponent = `${isHome ? '' : '@'}${opponent?.short_name ?? '?'}`;
      p._nextFDR = fdr;
    }

    return { player: p, expectedScore: parseFloat(expectedScore.toFixed(2)) };
  }).sort((a, b) => b.expectedScore - a.expectedScore);
}

/**
 * Returns squad players with non-zero price changes this GW.
 */
export function getPriceChangers(squad) {
  return squad
    .filter(p => p.cost_change_event !== 0)
    .sort((a, b) => Math.abs(b.cost_change_event) - Math.abs(a.cost_change_event));
}

/**
 * Finds high-form, low-ownership differentials NOT in the squad.
 */
export function getDifferentials(allPlayers, squad, fixtures, teams) {
  const squadIds = new Set(squad.map(p => p.id));

  return allPlayers
    .filter(p =>
      !squadIds.has(p.id) &&
      parseFloat(p.form || 0) >= 5 &&
      parseFloat(p.selected_by_percent || 100) < 15 &&
      p.minutes > 0
    )
    .map(p => {
      const fdr = getFixtureDifficulty(p.team, fixtures, 3);
      return { ...p, _fdr: fdr };
    })
    .filter(p => p._fdr === null || parseFloat(p._fdr) <= 3.5)
    .sort((a, b) => parseFloat(b.form) - parseFloat(a.form))
    .slice(0, 8);
}

/**
 * Returns a colour class for fixture difficulty rating.
 */
export function fdrClass(fdr) {
  const n = parseFloat(fdr);
  if (n <= 2) return 'fdr-easy';
  if (n <= 3) return 'fdr-medium';
  if (n <= 4) return 'fdr-hard';
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
