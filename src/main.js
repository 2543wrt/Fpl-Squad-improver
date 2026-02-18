import './style.css';
import { getBootstrapStatic, getManagerTeam, getManagerHistory, getFixtures } from './api.js';
import {
  calculateImprovement,
  calculateSquadStats,
  getFixtureDifficulty,
  fdrClass,
  positionLabel,
  formatCost,
} from './utils.js';

// ─── State ────────────────────────────────────────────────────────────────────
const state = {
  bootstrapData: null,
  managerData: null,
  currentPicks: null,
  liveData: null,
  history: null,
  fixtures: [],
  activeTab: 'squad',
};

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const el = {
  loginSection: $('login-section'),
  dashboardSection: $('dashboard-section'),
  managerInput: $('manager-id-input'),
  loadBtn: $('load-team-btn'),
  errorMsg: $('error-message'),
  squadList: $('squad-list'),
  suggestionsList: $('suggestions-list'),
  statsPanel: $('stats-panel'),
  managerName: $('manager-name'),
  managerRank: $('manager-rank'),
  managerGWPoints: $('manager-gw-points'),
  managerTotalPoints: $('manager-total-points'),
  managerTeamName: $('manager-team-name'),
  backBtn: $('back-btn'),
  tabBtns: document.querySelectorAll('.tab-btn'),
  tabPanels: document.querySelectorAll('.tab-panel'),
};

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  showGlobalLoading(true);
  try {
    state.bootstrapData = await getBootstrapStatic();
  } catch {
    showError('Failed to connect to FPL API. Please try again later.');
  } finally {
    showGlobalLoading(false);
  }

  el.loadBtn.addEventListener('click', handleLoadTeam);
  el.managerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLoadTeam();
  });
  el.backBtn.addEventListener('click', handleBack);

  el.tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

// ─── Load team ────────────────────────────────────────────────────────────────
async function handleLoadTeam() {
  const managerId = el.managerInput.value.trim();
  if (!managerId || isNaN(managerId)) {
    showError('Please enter a valid numeric Manager ID.');
    return;
  }

  setLoadingState(true);
  hideError();

  try {
    const [teamData, history, fixtures] = await Promise.all([
      getManagerTeam(managerId),
      getManagerHistory(managerId),
      getFixtures(),
    ]);

    state.managerData = teamData.manager;
    state.currentPicks = teamData.picks;
    state.liveData = teamData.liveData;
    state.history = history;
    state.fixtures = fixtures;

    renderManagerBar();
    renderDashboard();

    el.loginSection.classList.add('hidden');
    el.dashboardSection.classList.remove('hidden');
    el.dashboardSection.classList.add('fade-in');
  } catch (err) {
    showError(err.message || 'An unexpected error occurred. Please try again.');
  } finally {
    setLoadingState(false);
  }
}

function handleBack() {
  el.dashboardSection.classList.add('hidden');
  el.loginSection.classList.remove('hidden');
  el.managerInput.value = '';
  hideError();
}

// ─── Manager bar ──────────────────────────────────────────────────────────────
function renderManagerBar() {
  const m = state.managerData;
  el.managerName.textContent = `${m.player_first_name} ${m.player_last_name}`;
  el.managerTeamName.textContent = m.name;
  el.managerRank.textContent = m.summary_overall_rank
    ? `#${m.summary_overall_rank.toLocaleString()}`
    : '—';
  el.managerGWPoints.textContent = m.summary_event_points ?? '—';
  el.managerTotalPoints.textContent = m.summary_overall_points ?? '—';
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function renderDashboard() {
  renderSquad();
  renderSuggestions();
  renderStats();
  switchTab('squad');
}

// ─── Squad / Pitch ────────────────────────────────────────────────────────────
function renderSquad() {
  el.squadList.innerHTML = '';

  const fullSquad = state.currentPicks.picks.map((pick) => {
    const player = state.bootstrapData.elements.find((p) => p.id === pick.element);
    const liveEl = state.liveData?.elements?.find((e) => e.id === pick.element);
    return { ...player, pick, livePoints: liveEl?.stats?.total_points ?? null };
  });

  const starters = fullSquad.slice(0, 11);
  const bench = fullSquad.slice(11);

  // Group starters by position
  const formation = { 1: [], 2: [], 3: [], 4: [] };
  starters.forEach((p) => formation[p.element_type]?.push(p));

  // Pitch
  const pitch = document.createElement('div');
  pitch.className = 'pitch';

  // Pitch markings overlay
  pitch.innerHTML = `
    <div class="pitch-markings">
      <div class="pitch-line pitch-halfway"></div>
      <div class="pitch-circle"></div>
      <div class="pitch-box pitch-box-top"></div>
      <div class="pitch-box pitch-box-bottom"></div>
    </div>
  `;

  [1, 2, 3, 4].forEach((posType) => {
    const row = document.createElement('div');
    row.className = 'pitch-row';
    formation[posType].forEach((player) => row.appendChild(createPitchCard(player)));
    pitch.appendChild(row);
  });

  el.squadList.appendChild(pitch);

  // Bench
  const benchSection = document.createElement('div');
  benchSection.className = 'bench-section';
  benchSection.innerHTML = `<div class="bench-label"><span>BENCH</span></div>`;
  const benchRow = document.createElement('div');
  benchRow.className = 'bench-row';
  bench.forEach((player) => benchRow.appendChild(createPitchCard(player, true)));
  benchSection.appendChild(benchRow);
  el.squadList.appendChild(benchSection);
}

function createPitchCard(player, isBench = false) {
  const card = document.createElement('div');
  card.className = `pitch-player${isBench ? ' bench-player' : ''}`;

  const team = state.bootstrapData.teams.find((t) => t.id === player.team);
  const imageUrl = `https://resources.premierleague.com/premierleague/photos/players/110x140/p${player.code}.png`;
  const pos = positionLabel(player.element_type);
  const points = player.livePoints !== null ? player.livePoints : player.event_points ?? player.total_points;
  const isCaptain = player.pick?.is_captain;
  const isViceCaptain = player.pick?.is_vice_captain;

  card.innerHTML = `
    <div class="pitch-player-img-wrap">
      <img src="${imageUrl}" alt="${player.web_name}" loading="lazy"
           onerror="this.src='https://resources.premierleague.com/premierleague/photos/players/110x140/Photo-Missing.png'">
      ${isCaptain ? '<span class="captain-badge">C</span>' : ''}
      ${isViceCaptain ? '<span class="vice-badge">V</span>' : ''}
    </div>
    <div class="pitch-player-info">
      <span class="pitch-player-name">${player.web_name}</span>
      <span class="pitch-player-team">${team?.short_name ?? ''}</span>
    </div>
    <div class="pitch-player-points">${points}</div>
  `;
  return card;
}

// ─── Suggestions ──────────────────────────────────────────────────────────────
function renderSuggestions() {
  el.suggestionsList.innerHTML = '';

  const fullSquad = state.currentPicks.picks.map((pick) => {
    return state.bootstrapData.elements.find((p) => p.id === pick.element);
  });

  const { weakestLink, suggestions } = calculateImprovement(
    fullSquad,
    state.bootstrapData.elements,
    state.bootstrapData.element_types,
    state.fixtures
  );

  if (!weakestLink) {
    el.suggestionsList.innerHTML = '<p class="empty-state">No suggestions available.</p>';
    return;
  }

  // Weakest player header
  const weakTeam = state.bootstrapData.teams.find((t) => t.id === weakestLink.team);
  const weakFDR = getFixtureDifficulty(weakestLink.team, state.fixtures);
  const header = document.createElement('div');
  header.className = 'suggestion-header-card';
  header.innerHTML = `
    <div class="suggestion-header-label">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      Weakest Link Identified
    </div>
    <div class="suggestion-weak-player">
      <img src="https://resources.premierleague.com/premierleague/photos/players/110x140/p${weakestLink.code}.png"
           alt="${weakestLink.web_name}"
           onerror="this.src='https://resources.premierleague.com/premierleague/photos/players/110x140/Photo-Missing.png'">
      <div class="suggestion-weak-info">
        <strong>${weakestLink.web_name}</strong>
        <span>${weakTeam?.short_name ?? ''} · ${positionLabel(weakestLink.element_type)} · ${formatCost(weakestLink.now_cost)}</span>
        <div class="stat-pills">
          <span class="stat-pill">Form: <b>${weakestLink.form}</b></span>
          <span class="stat-pill">Pts: <b>${weakestLink.total_points}</b></span>
          ${weakFDR ? `<span class="stat-pill fdr-pill ${fdrClass(parseFloat(weakFDR))}">FDR: <b>${weakFDR}</b></span>` : ''}
        </div>
      </div>
    </div>
    <p class="suggestion-subtext">Top replacements within budget (same position):</p>
  `;
  el.suggestionsList.appendChild(header);

  if (suggestions.length === 0) {
    el.suggestionsList.innerHTML += '<p class="empty-state">No better options found within budget.</p>';
    return;
  }

  suggestions.forEach((player, i) => {
    const team = state.bootstrapData.teams.find((t) => t.id === player.team);
    const fdr = getFixtureDifficulty(player.team, state.fixtures);
    const formDiff = (parseFloat(player.form) - parseFloat(weakestLink.form)).toFixed(1);
    const card = document.createElement('div');
    card.className = 'suggestion-card';
    card.style.animationDelay = `${i * 0.07}s`;
    card.innerHTML = `
      <div class="suggestion-rank">${i + 1}</div>
      <img src="https://resources.premierleague.com/premierleague/photos/players/110x140/p${player.code}.png"
           alt="${player.web_name}"
           onerror="this.src='https://resources.premierleague.com/premierleague/photos/players/110x140/Photo-Missing.png'">
      <div class="suggestion-info">
        <strong>${player.web_name}</strong>
        <span>${team?.short_name ?? ''} · ${formatCost(player.now_cost)}</span>
        <div class="stat-pills">
          <span class="stat-pill">Form: <b>${player.form}</b></span>
          <span class="stat-pill">Pts: <b>${player.total_points}</b></span>
          <span class="stat-pill">Sel: <b>${player.selected_by_percent}%</b></span>
          ${fdr ? `<span class="stat-pill fdr-pill ${fdrClass(parseFloat(fdr))}">FDR: <b>${fdr}</b></span>` : ''}
        </div>
      </div>
      <div class="suggestion-delta ${parseFloat(formDiff) >= 0 ? 'positive' : 'negative'}">
        ${parseFloat(formDiff) >= 0 ? '+' : ''}${formDiff}
        <span>form</span>
      </div>
    `;
    el.suggestionsList.appendChild(card);
  });
}

// ─── Stats panel ──────────────────────────────────────────────────────────────
function renderStats() {
  const fullSquad = state.currentPicks.picks.map((pick) =>
    state.bootstrapData.elements.find((p) => p.id === pick.element)
  );

  const stats = calculateSquadStats(fullSquad, state.bootstrapData);
  const m = state.managerData;

  // GW history chart data
  const gwHistory = state.history?.current ?? [];
  const last5 = gwHistory.slice(-5);

  el.statsPanel.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
        <div class="stat-value">£${stats.totalValue}m</div>
        <div class="stat-label">Squad Value</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
        <div class="stat-value">${stats.avgForm}</div>
        <div class="stat-label">Avg Form</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>
        <div class="stat-value">${stats.totalPoints}</div>
        <div class="stat-label">Total Points</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
        <div class="stat-value">${stats.avgOwnership}%</div>
        <div class="stat-label">Avg Ownership</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg></div>
        <div class="stat-value">${m.summary_overall_rank ? '#' + m.summary_overall_rank.toLocaleString() : '—'}</div>
        <div class="stat-label">Overall Rank</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg></div>
        <div class="stat-value">${m.last_deadline_bank != null ? '£' + (m.last_deadline_bank / 10).toFixed(1) + 'm' : '—'}</div>
        <div class="stat-label">Bank</div>
      </div>
    </div>

    ${last5.length > 0 ? `
    <div class="gw-history">
      <h3>Last 5 Gameweeks</h3>
      <div class="gw-bars">
        ${last5.map(gw => {
          const maxPts = Math.max(...last5.map(g => g.points));
          const pct = maxPts > 0 ? Math.round((gw.points / maxPts) * 100) : 0;
          return `
            <div class="gw-bar-wrap">
              <div class="gw-bar-label">${gw.points}</div>
              <div class="gw-bar-track">
                <div class="gw-bar-fill" style="height: ${pct}%"></div>
              </div>
              <div class="gw-bar-gw">GW${gw.event}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
    ` : ''}

    <div class="top-performers">
      <h3>Top Performers This Season</h3>
      <div class="performer-list">
        ${fullSquad
          .sort((a, b) => b.total_points - a.total_points)
          .slice(0, 5)
          .map((p, i) => {
            const team = state.bootstrapData.teams.find(t => t.id === p.team);
            return `
              <div class="performer-row">
                <span class="performer-rank">${i + 1}</span>
                <img src="https://resources.premierleague.com/premierleague/photos/players/110x140/p${p.code}.png"
                     alt="${p.web_name}"
                     onerror="this.src='https://resources.premierleague.com/premierleague/photos/players/110x140/Photo-Missing.png'">
                <div class="performer-info">
                  <strong>${p.web_name}</strong>
                  <span>${team?.short_name ?? ''} · ${positionLabel(p.element_type)}</span>
                </div>
                <div class="performer-pts">${p.total_points} pts</div>
              </div>
            `;
          }).join('')}
      </div>
    </div>
  `;
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
function switchTab(tabName) {
  state.activeTab = tabName;
  el.tabBtns.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  el.tabPanels.forEach((panel) => {
    panel.classList.toggle('hidden', panel.dataset.tab !== tabName);
  });
}

// ─── UI helpers ───────────────────────────────────────────────────────────────
function setLoadingState(loading) {
  el.loadBtn.disabled = loading;
  el.loadBtn.innerHTML = loading
    ? `<span class="spinner"></span> Loading...`
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="5 12 12 5 19 12"/><polyline points="5 19 12 12 19 19"/></svg> Analyse Team`;
}

function showGlobalLoading(show) {
  const overlay = document.getElementById('global-loading');
  if (overlay) overlay.classList.toggle('hidden', !show);
}

function showError(msg) {
  el.errorMsg.textContent = msg;
  el.errorMsg.classList.remove('hidden');
}

function hideError() {
  el.errorMsg.classList.add('hidden');
}

init();
