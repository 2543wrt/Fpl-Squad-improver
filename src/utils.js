export function calculateImprovement(squad, allPlayers, elementTypes) {
  // Simple algorithm:
  // 1. Identify the lowest performing player in the starting XI (positions 1-11)
  // 2. Find a replacement with:
  //    - Same position
  //    - Cost <= Current Player Cost + Bank (assuming 0 bank for now for simplicity, or just <= cost)
  //    - Higher Form or Total Points
  
  // Filter for starting XI (usually the first 11 picks, but we should check 'multiplier' > 0 if available, 
  // though 'picks' array usually has 15 players. 0-10 are starters, 11-14 are bench in default order)
  const starters = squad.slice(0, 11);

  // Find weakest link based on form (recent performance)
  const weakestLink = starters.reduce((min, player) => {
    return parseFloat(player.form) < parseFloat(min.form) ? player : min;
  }, starters[0]);

  // Find replacements
  const positionId = weakestLink.element_type;
  const maxCost = weakestLink.now_cost; // strict budget for now

  const candidates = allPlayers.filter(p => 
    p.element_type === positionId &&
    p.now_cost <= maxCost &&
    p.id !== weakestLink.id &&
    parseFloat(p.form) > parseFloat(weakestLink.form)
  );

  // Sort by form descending
  candidates.sort((a, b) => parseFloat(b.form) - parseFloat(a.form));

  // Return top 3 suggestions
  return {
    weakestLink,
    suggestions: candidates.slice(0, 3)
  };
}
