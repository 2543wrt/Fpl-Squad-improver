import './style.css';
import { getBootstrapStatic, getManagerTeam } from './api.js';
import { calculateImprovement } from './utils.js';

const state = {
  bootstrapData: null,
  managerData: null,
  currentPicks: null,
};

const elements = {
  loginSection: document.getElementById('login-section'),
  dashboardSection: document.getElementById('dashboard-section'),
  managerInput: document.getElementById('manager-id-input'),
  loadBtn: document.getElementById('load-team-btn'),
  errorMsg: document.getElementById('error-message'),
  squadList: document.getElementById('squad-list'),
  suggestionsList: document.getElementById('suggestions-list'),
};

async function init() {
  try {
    // Pre-load static data (players, teams, etc.)
    state.bootstrapData = await getBootstrapStatic();
    console.log('FPL Data Loaded', state.bootstrapData);
  } catch (err) {
    showError('Failed to load FPL data. Please check your connection.');
  }

  elements.loadBtn.addEventListener('click', handleLoadTeam);
}

async function handleLoadTeam() {
  const managerId = elements.managerInput.value;
  if (!managerId) {
    showError('Please enter a Manager ID');
    return;
  }

  elements.loadBtn.textContent = 'Loading...';
  elements.loadBtn.disabled = true;
  hideError();

  try {
    const { manager, picks } = await getManagerTeam(managerId);
    state.managerData = manager;
    state.currentPicks = picks;
    
    renderDashboard();
    elements.loginSection.classList.add('hidden');
    elements.dashboardSection.classList.remove('hidden');
  } catch (err) {
    showError(err.message || 'Error loading team');
  } finally {
    elements.loadBtn.textContent = 'Load Team';
    elements.loadBtn.disabled = false;
  }
}

function renderDashboard() {
  elements.squadList.innerHTML = '';
  
  // Map picks to actual player data
  const fullSquad = state.currentPicks.picks.map(pick => {
    const player = state.bootstrapData.elements.find(p => p.id === pick.element);
    return { ...player, pick };
  });

  // Split into starters (1-11) and bench (12-15)
  // Note: API returns 1-indexed positions, usually 1-11 are starters.
  // We can trust the order in 'picks' array: indices 0-10 are starters, 11-14 are bench.
  const starters = fullSquad.slice(0, 11);
  const bench = fullSquad.slice(11);

  // Group starters by position type (1: GKP, 2: DEF, 3: MID, 4: FWD)
  const formation = {
    1: [], // GKP
    2: [], // DEF
    3: [], // MID
    4: []  // FWD
  };

  starters.forEach(p => {
    if (formation[p.element_type]) {
      formation[p.element_type].push(p);
    }
  });

  // Create Pitch Container
  const pitchContainer = document.createElement('div');
  pitchContainer.className = 'pitch';

  [1, 2, 3, 4].forEach(posType => {
    const row = document.createElement('div');
    row.className = 'pitch-row';
    
    formation[posType].forEach(player => {
      row.appendChild(createPlayerCard(player));
    });
    
    pitchContainer.appendChild(row);
  });

  elements.squadList.appendChild(pitchContainer);

  // Render Bench
  const benchContainer = document.createElement('div');
  benchContainer.className = 'bench';
  benchContainer.innerHTML = '<h3>Bench</h3>';
  const benchRow = document.createElement('div');
  benchRow.className = 'bench-row';
  
  bench.forEach(player => {
    benchRow.appendChild(createPlayerCard(player));
  });
  
  benchContainer.appendChild(benchRow);
  elements.squadList.appendChild(benchContainer);

  renderSuggestions(starters); // Only suggest improvements for starters? Or full squad? Let's stick to starters for now as per logic.
}

function createPlayerCard(player) {
  const card = document.createElement('div');
  card.className = 'player-card';
  
  const imageUrl = `https://resources.premierleague.com/premierleague/photos/players/110x140/p${player.code}.png`;

  card.innerHTML = `
    <div class="player-info-container">
      <img src="${imageUrl}" alt="${player.web_name}">
      <div class="player-info">
        <h3>${player.web_name}</h3>
      </div>
    </div>
    <div class="player-points">
      ${player.total_points}
    </div>
  `;
  return card;
}

function renderSuggestions(squad) {
  const { weakestLink, suggestions } = calculateImprovement(
    squad, 
    state.bootstrapData.elements, 
    state.bootstrapData.element_types
  );

  elements.suggestionsList.innerHTML = '';

  if (!weakestLink) return;

  const weakEl = document.createElement('div');
  weakEl.className = 'suggestion-header';
  weakEl.innerHTML = `<p>Consider replacing <strong>${weakestLink.web_name}</strong> (Form: ${weakestLink.form})</p>`;
  elements.suggestionsList.appendChild(weakEl);

  if (suggestions.length === 0) {
    elements.suggestionsList.innerHTML += '<p>No better options found within budget.</p>';
    return;
  }

  suggestions.forEach(player => {
    const card = document.createElement('div');
    card.className = 'player-card suggestion-card';
    
    const team = state.bootstrapData.teams.find(t => t.id === player.team);
    const imageUrl = `https://resources.premierleague.com/premierleague/photos/players/110x140/p${player.code}.png`;
    
    card.innerHTML = `
      <div class="player-info-container" style="display: flex; align-items: center; gap: 1rem;">
        <img src="${imageUrl}" alt="${player.web_name}" style="width: 70px; height: 70px; border-radius: 10%; object-fit:contain;">
        <div class="player-info">
          <h3>${player.web_name}</h3>
          <div class="player-meta">${team.short_name} | Form: ${player.form}</div>
        </div>
      </div>
      <div class="player-points">
        +${(parseFloat(player.form) - parseFloat(weakestLink.form)).toFixed(1)} form
      </div>
    `;
    elements.suggestionsList.appendChild(card);
  });
}

function showError(msg) {
  elements.errorMsg.textContent = msg;
  elements.errorMsg.classList.remove('hidden');
}

function hideError() {
  elements.errorMsg.classList.add('hidden');
}

init();
