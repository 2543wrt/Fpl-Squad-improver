import './style.css';
import {
  getBootstrapStatic, getManagerTeam, getManagerHistory,
  getFixtures, getEventStatus, getPlayerSummary,
} from './api.js';
import {
  calculateImprovement, calculateSquadStats, calculateMultiTransfer,
  calculateCaptainRanking, getPriceChangers, getDifferentials,
  getNextFixtures, getFixtureDifficulty, fdrClass,
  positionLabel, formatCost,
} from './utils.js';

// ─── State ────────────────────────────────────────────────────────────────────
const state = {
  bootstrapData: null,
  managerData: null,
  currentPicks: null,
  liveData: null,
  history: null,
  fixtures: [],
  fullSquad: [],
  activeTab: 'squad',
  liveInterval: null,
  managerId: null,
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
  fixtureTicker: $('fixture-ticker'),
  transfersPanel: $('transfers-panel'),
  statsPanel: $('stats-panel'),
  managerName: $('manager-name'),
  managerRank: $('manager-rank'),
  managerGWPoints: $('manager-gw-points'),
  managerTotalPoints: $('manager-total-points'),
  managerTeamName: $('manager-team-name'),
  liveBadge: $('live-badge'),
  backBtn: $('back-btn'),
  shareBtn: $('share-btn'),
  themeToggle: $('theme-toggle'),
  modalOverlay: $('player-modal'),
  modalClose: $('modal-close'),
  modalContent: $('modal-content'),
  tabBtns: document.querySelectorAll('.tab-btn'),
  tabPanels: document.querySelectorAll('.tab-panel'),
};

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  initTheme();
  showGlobalLoading(true);
  try {
    state.bootstrapData = await getBootstrapStatic();
  } catch {
    showError('Failed to connect to FPL API. Please try again later.');
  } finally {
    showGlobalLoading(false);
  }

  // URL state: auto-load if ?id= present
  const urlId = new URLSearchParams(window.location.search).get('id');
  if (urlId) {
    el.managerInput.value = urlId;
    handleLoadTeam();
  }

  el.loadBtn.addEventListener('click', handleLoadTeam);
  el.managerInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleLoadTeam(); });
  el.backBtn.addEventListener('click', handleBack);
  el.shareBtn.addEventListener('click', handleShare);
  el.themeToggle.addEventListener('click', toggleTheme);
  el.modalOverlay.addEventListener('click', (e) => { if (e.target === el.modalOverlay) closeModal(); });
  el.modalClose.addEventListener('click', closeModal);
  el.tabBtns.forEach((btn) => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
}

// ─── Load team ────────────────────────────────────────────────────────────────
async function handleLoadTeam() {
  const managerId = el.managerInput.value.trim();
  if (!managerId || isNaN(managerId)) { showError('Please enter a valid numeric Manager ID.'); return; }

  setLoadingState(true);
  hideError();

  try {
    const [teamData, history, fixtures] = await Promise.all([
      getManagerTeam(managerId),
      getManagerHistory(managerId),
      getFixtures(),
    ]);

    state.managerId = managerId;
    state.managerData = teamData.manager;
    state.currentPicks = teamData.picks;
    state.liveData = teamData.liveData;
    state.history = history;
    state.fixtures = fixtures;

    // Build full squad array once
    state.fullSquad = state.currentPicks.picks.map((pick) => {
      const player = state.bootstrapData.elements.find((p) => p.id === pick.element);
      const liveEl = state.liveData?.elements?.find((e) => e.id === pick.element);
      return { ...player, pick, livePoints: liveEl?.stats?.total_points ?? null };
    });

    // URL state
    const url = new URL(window.location);
    url.searchParams.set('id', managerId);
    window.history.pushState({}, '', url);

    renderManagerBar();
    renderDashboard();
    checkLiveGW();

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
  if (state.liveInterval) { clearInterval(state.liveInterval); state.liveInterval = null; }
  el.dashboardSection.classList.add('hidden');
  el.loginSection.classList.remove('hidden');
  el.managerInput.value = '';
  hideError();
  const url = new URL(window.location);
  url.searchParams.delete('id');
  window.history.pushState({}, '', url);
}

// ─── Manager bar ──────────────────────────────────────────────────────────────
function renderManagerBar() {
  const m = state.managerData;
  el.managerName.textContent = `${m.player_first_name} ${m.player_last_name}`;
  el.managerTeamName.textContent = m.name;
  el.managerRank.textContent = m.summary_overall_rank ? `#${m.summary_overall_rank.toLocaleString()}` : '—';
  el.managerGWPoints.textContent = m.summary_event_points ?? '—';
  el.managerTotalPoints.textContent = m.summary_overall_points ?? '—';
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function renderDashboard() {
  renderSquad();
  renderFixtureTicker();
  renderTransfersTab();
  renderStats();
  switchTab('squad');
}

// ─── Feature 6: Animated Pitch + Feature 4: Price badges ─────────────────────
function renderSquad() {
  el.squadList.innerHTML = '';
  const starters = state.fullSquad.slice(0, 11);
  const bench = state.fullSquad.slice(11);

  const formation = { 1: [], 2: [], 3: [], 4: [] };
  starters.forEach((p) => formation[p.element_type]?.push(p));

  const pitch = document.createElement('div');
  pitch.className = 'pitch';
  pitch.id = 'pitch-el';
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
  card.title = `${player.web_name} — click for details`;

  const team = state.bootstrapData.teams.find((t) => t.id === player.team);
  const imageUrl = `https://resources.premierleague.com/premierleague/photos/players/110x140/p${player.code}.png`;
  const points = player.livePoints !== null ? player.livePoints : (player.event_points ?? player.total_points);
  const isCaptain = player.pick?.is_captain;
  const isVice = player.pick?.is_vice_captain;
  const priceChange = player.cost_change_event;

  card.innerHTML = `
    <div class="pitch-player-img-wrap">
      <img src="${imageUrl}" alt="${player.web_name}" loading="lazy"
           onerror="this.src='https://resources.premierleague.com/premierleague/photos/players/110x140/Photo-Missing.png'">
      ${isCaptain ? '<span class="captain-badge">C</span>' : ''}
      ${isVice ? '<span class="vice-badge">V</span>' : ''}
      ${priceChange > 0 ? `<span class="price-badge up">▲${(priceChange / 10).toFixed(1)}</span>` : ''}
      ${priceChange < 0 ? `<span class="price-badge down">▼${(Math.abs(priceChange) / 10).toFixed(1)}</span>` : ''}
    </div>
    <div class="pitch-player-info">
      <span class="pitch-player-name">${player.web_name}</span>
      <span class="pitch-player-team">${team?.short_name ?? ''}</span>
    </div>
    <div class="pitch-player-points" data-player-id="${player.id}">${points}</div>
  `;

  // Feature 7: click → modal
  card.addEventListener('click', () => openPlayerModal(player));
  return card;
}

// ─── Feature 2: Fixture Ticker ────────────────────────────────────────────────
function renderFixtureTicker() {
  el.fixtureTicker.innerHTML = '';
  const { teams } = state.bootstrapData;
  const allPlayers = state.fullSquad;

  const wrap = document.createElement('div');
  wrap.className = 'fixture-ticker-wrap';

  const header = document.createElement('div');
  header.className = 'fixture-ticker-header';
  header.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
    Fixture Difficulty — Next 5 Gameweeks
  `;
  wrap.appendChild(header);

  const table = document.createElement('table');
  table.className = 'fixture-ticker-table';

  const thead = document.createElement('thead');
  thead.innerHTML = `<tr>
    <th>Player</th>
    <th>GW+1</th><th>GW+2</th><th>GW+3</th><th>GW+4</th><th>GW+5</th>
  </tr>`;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  allPlayers.forEach((player) => {
    const fixtures = getNextFixtures(player.team, state.fixtures, teams, 5);
    const tr = document.createElement('tr');
    const imgUrl = `https://resources.premierleague.com/premierleague/photos/players/110x140/p${player.code}.png`;
    tr.innerHTML = `
      <td>
        <div class="ticker-player-cell">
          <img src="${imgUrl}" alt="${player.web_name}"
               onerror="this.src='https://resources.premierleague.com/premierleague/photos/players/110x140/Photo-Missing.png'">
          <div>
            <div class="ticker-player-name">${player.web_name}</div>
            <div class="ticker-player-pos">${positionLabel(player.element_type)}</div>
          </div>
        </div>
      </td>
      ${fixtures.map(f => `
        <td>
          <div class="fixture-cell ${fdrClass(f.fdr)}">
            ${f.opponent}
            <span class="fix-ha">${f.isHome ? 'H' : 'A'}</span>
          </div>
        </td>
      `).join('')}
      ${Array(5 - fixtures.length).fill('<td><div class="fixture-cell" style="opacity:0.3">—</div></td>').join('')}
    `;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  wrap.appendChild(table);
  el.fixtureTicker.appendChild(wrap);
}

// ─── Transfers Tab (Features 1, 3, 5 + existing suggestions) ─────────────────
function renderTransfersTab() {
  el.transfersPanel.innerHTML = '';
  const panel = document.createElement('div');
  panel.className = 'transfers-panel';

  // ── Feature 1: Multi-Transfer Planner ──
  const transfers = calculateMultiTransfer(state.fullSquad, state.bootstrapData.elements, 3);
  if (transfers.length > 0) {
    const section = document.createElement('div');
    section.innerHTML = `
      <div class="section-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
          <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
        </svg>
        Recommended Transfers
      </div>
    `;
    transfers.forEach((t) => {
      const outTeam = state.bootstrapData.teams.find(tm => tm.id === t.out.team);
      const inTeam = state.bootstrapData.teams.find(tm => tm.id === t.in.team);
      const pair = document.createElement('div');
      pair.className = 'transfer-pair';
      pair.innerHTML = `
        <div class="transfer-player out">
          <img src="https://resources.premierleague.com/premierleague/photos/players/110x140/p${t.out.code}.png"
               alt="${t.out.web_name}"
               onerror="this.src='https://resources.premierleague.com/premierleague/photos/players/110x140/Photo-Missing.png'">
          <div class="transfer-player-info">
            <strong>${t.out.web_name}</strong>
            <span>${outTeam?.short_name ?? ''} · ${formatCost(t.out.now_cost)}</span>
            <div class="stat-pills" style="margin-top:0.3rem">
              <span class="stat-pill">Form: <b>${t.out.form}</b></span>
              <span class="stat-pill">Pts: <b>${t.out.total_points}</b></span>
            </div>
          </div>
        </div>
        <div class="transfer-arrow">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
          <span class="transfer-gain">+${t.scoreDiff}</span>
        </div>
        <div class="transfer-player in">
          <img src="https://resources.premierleague.com/premierleague/photos/players/110x140/p${t.in.code}.png"
               alt="${t.in.web_name}"
               onerror="this.src='https://resources.premierleague.com/premierleague/photos/players/110x140/Photo-Missing.png'">
          <div class="transfer-player-info">
            <strong>${t.in.web_name}</strong>
            <span>${inTeam?.short_name ?? ''} · ${formatCost(t.in.now_cost)}</span>
            <div class="stat-pills" style="margin-top:0.3rem">
              <span class="stat-pill">Form: <b>${t.in.form}</b></span>
              <span class="stat-pill">Pts: <b>${t.in.total_points}</b></span>
            </div>
          </div>
        </div>
      `;
      section.appendChild(pair);
    });
    panel.appendChild(section);
  }

  // ── Feature 3: Captain Picker ──
  const starters = state.fullSquad.slice(0, 11);
  const captainRanking = calculateCaptainRanking(starters, state.fixtures, state.bootstrapData.teams);
  const captainSection = document.createElement('div');
  captainSection.innerHTML = `
    <div class="section-header">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
        <path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
      </svg>
      Captain Picker
    </div>
  `;
  const captainList = document.createElement('div');
  captainList.className = 'captain-list';
  captainRanking.slice(0, 5).forEach((item, i) => {
    const p = item.player;
    const team = state.bootstrapData.teams.find(t => t.id === p.team);
    const row = document.createElement('div');
    row.className = 'captain-row';
    row.innerHTML = `
      <img src="https://resources.premierleague.com/premierleague/photos/players/110x140/p${p.code}.png"
           alt="${p.web_name}"
           onerror="this.src='https://resources.premierleague.com/premierleague/photos/players/110x140/Photo-Missing.png'">
      <div class="captain-info">
        <strong>${p.web_name}</strong>
        <span>${team?.short_name ?? ''} · ${p._nextOpponent ?? 'TBD'} · Form: ${p.form}</span>
      </div>
      ${i === 0 ? '<span class="captain-badge-label">CAPTAIN</span>' : ''}
      <div class="captain-score">${item.expectedScore}</div>
    `;
    captainList.appendChild(row);
  });
  captainSection.appendChild(captainList);
  panel.appendChild(captainSection);

  // ── Feature 5: Differential Finder ──
  const diffs = getDifferentials(state.bootstrapData.elements, state.fullSquad, state.fixtures, state.bootstrapData.teams);
  if (diffs.length > 0) {
    const diffSection = document.createElement('div');
    diffSection.innerHTML = `
      <div class="section-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        Differentials (High Form · Low Ownership)
      </div>
    `;
    const grid = document.createElement('div');
    grid.className = 'differential-grid';
    diffs.forEach((p) => {
      const team = state.bootstrapData.teams.find(t => t.id === p.team);
      const card = document.createElement('div');
      card.className = 'differential-card';
      card.innerHTML = `
        <img src="https://resources.premierleague.com/premierleague/photos/players/110x140/p${p.code}.png"
             alt="${p.web_name}"
             onerror="this.src='https://resources.premierleague.com/premierleague/photos/players/110x140/Photo-Missing.png'">
        <strong>${p.web_name}</strong>
        <span>${team?.short_name ?? ''} · ${positionLabel(p.element_type)} · ${formatCost(p.now_cost)}</span>
        <div class="stat-pills">
          <span class="stat-pill">Form: <b>${p.form}</b></span>
          <span class="stat-pill">Sel: <b>${p.selected_by_percent}%</b></span>
          ${p._fdr ? `<span class="stat-pill fdr-pill ${fdrClass(parseFloat(p._fdr))}">FDR: <b>${p._fdr}</b></span>` : ''}
        </div>
      `;
      card.addEventListener('click', () => openPlayerModal(p));
      grid.appendChild(card);
    });
    diffSection.appendChild(grid);
    panel.appendChild(diffSection);
  }

  // ── Existing single-transfer suggestions ──
  const { weakestLink, suggestions } = calculateImprovement(
    state.fullSquad, state.bootstrapData.elements, state.bootstrapData.element_types, state.fixtures
  );
  if (weakestLink) {
    const sugSection = document.createElement('div');
    const weakTeam = state.bootstrapData.teams.find(t => t.id === weakestLink.team);
    const weakFDR = getFixtureDifficulty(weakestLink.team, state.fixtures);
    sugSection.innerHTML = `
      <div class="section-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        Weakest Link Analysis
      </div>
    `;
    const headerCard = document.createElement('div');
    headerCard.className = 'suggestion-header-card';
    headerCard.innerHTML = `
      <div class="suggestion-header-label">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        </svg>
        Consider replacing
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
      <p class="suggestion-subtext">Top replacements within budget:</p>
    `;
    sugSection.appendChild(headerCard);

    suggestions.forEach((player, i) => {
      const team = state.bootstrapData.teams.find(t => t.id === player.team);
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
      card.addEventListener('click', () => openPlayerModal(player));
      sugSection.appendChild(card);
    });
    panel.appendChild(sugSection);
  }

  el.transfersPanel.appendChild(panel);
}

// ─── Stats Panel (Feature 4 price changes + existing stats) ──────────────────
function renderStats() {
  const stats = calculateSquadStats(state.fullSquad);
  const m = state.managerData;
  const gwHistory = state.history?.current ?? [];
  const last5 = gwHistory.slice(-5);
  const priceChangers = getPriceChangers(state.fullSquad);

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
          return `<div class="gw-bar-wrap">
            <div class="gw-bar-label">${gw.points}</div>
            <div class="gw-bar-track"><div class="gw-bar-fill" style="height:${pct}%"></div></div>
            <div class="gw-bar-gw">GW${gw.event}</div>
          </div>`;
        }).join('')}
      </div>
    </div>` : ''}

    ${priceChangers.length > 0 ? `
    <div class="price-changes-section">
      <h3>Price Changes This GW</h3>
      <div class="price-change-list">
        ${priceChangers.map(p => {
          const team = state.bootstrapData.teams.find(t => t.id === p.team);
          const change = p.cost_change_event;
          return `<div class="price-change-row">
            <img src="https://resources.premierleague.com/premierleague/photos/players/110x140/p${p.code}.png"
                 alt="${p.web_name}"
                 onerror="this.src='https://resources.premierleague.com/premierleague/photos/players/110x140/Photo-Missing.png'">
            <strong>${p.web_name}</strong>
            <span style="font-size:0.8rem;color:var(--text-3)">${team?.short_name ?? ''}</span>
            <span class="price-tag ${change > 0 ? 'up' : 'down'}">
              ${change > 0 ? '▲' : '▼'}£${(Math.abs(change) / 10).toFixed(1)}m
            </span>
          </div>`;
        }).join('')}
      </div>
    </div>` : ''}

    <div class="top-performers">
      <h3>Top Performers This Season</h3>
      <div class="performer-list">
        ${[...state.fullSquad].sort((a, b) => b.total_points - a.total_points).slice(0, 5).map((p, i) => {
          const team = state.bootstrapData.teams.find(t => t.id === p.team);
          return `<div class="performer-row">
            <span class="performer-rank">${i + 1}</span>
            <img src="https://resources.premierleague.com/premierleague/photos/players/110x140/p${p.code}.png"
                 alt="${p.web_name}"
                 onerror="this.src='https://resources.premierleague.com/premierleague/photos/players/110x140/Photo-Missing.png'">
            <div class="performer-info">
              <strong>${p.web_name}</strong>
              <span>${team?.short_name ?? ''} · ${positionLabel(p.element_type)}</span>
            </div>
            <div class="performer-pts">${p.total_points} pts</div>
          </div>`;
        }).join('')}
      </div>
    </div>
  `;
}

// ─── Feature 7: Player Detail Modal ──────────────────────────────────────────
async function openPlayerModal(player) {
  const team = state.bootstrapData.teams.find(t => t.id === player.team);
  const pos = positionLabel(player.element_type);
  const fixtures = getNextFixtures(player.team, state.fixtures, state.bootstrapData.teams, 5);
  const imageUrl = `https://resources.premierleague.com/premierleague/photos/players/110x140/p${player.code}.png`;

  el.modalContent.innerHTML = `
    <div class="modal-hero">
      <img src="${imageUrl}" alt="${player.web_name}"
           onerror="this.src='https://resources.premierleague.com/premierleague/photos/players/110x140/Photo-Missing.png'">
      <div class="modal-hero-info">
        <h3>${player.first_name ?? ''} ${player.second_name ?? player.web_name}</h3>
        <span>${team?.name ?? ''} · ${formatCost(player.now_cost)}</span>
        <div><span class="modal-pos-badge pos-${pos}">${pos}</span></div>
      </div>
    </div>
    <div class="modal-stats-grid">
      <div class="modal-stat"><div class="modal-stat-value">${player.total_points}</div><div class="modal-stat-label">Total Pts</div></div>
      <div class="modal-stat"><div class="modal-stat-value">${player.form}</div><div class="modal-stat-label">Form</div></div>
      <div class="modal-stat"><div class="modal-stat-value">${player.selected_by_percent}%</div><div class="modal-stat-label">Ownership</div></div>
      <div class="modal-stat"><div class="modal-stat-value">${player.minutes ?? '—'}</div><div class="modal-stat-label">Minutes</div></div>
      <div class="modal-stat"><div class="modal-stat-value">${player.goals_scored ?? 0}</div><div class="modal-stat-label">Goals</div></div>
      <div class="modal-stat"><div class="modal-stat-value">${player.assists ?? 0}</div><div class="modal-stat-label">Assists</div></div>
      <div class="modal-stat"><div class="modal-stat-value">${player.clean_sheets ?? 0}</div><div class="modal-stat-label">Clean Sheets</div></div>
      <div class="modal-stat"><div class="modal-stat-value">${player.bonus ?? 0}</div><div class="modal-stat-label">Bonus Pts</div></div>
    </div>
    ${fixtures.length > 0 ? `
    <div class="modal-section-title">Next Fixtures</div>
    <div class="modal-fixtures">
      ${fixtures.map(f => `
        <div class="modal-fixture-chip ${fdrClass(f.fdr)}">
          ${f.opponent}
          <span class="fix-ha">${f.isHome ? 'H' : 'A'}</span>
        </div>
      `).join('')}
    </div>` : ''}
    <div id="modal-gw-loading" style="color:var(--text-3);font-size:0.85rem">Loading GW history…</div>
  `;

  el.modalOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Async load GW history
  const summary = await getPlayerSummary(player.id);
  const gwEl = $('modal-gw-loading');
  if (gwEl && summary?.history?.length > 0) {
    const last5 = summary.history.slice(-5).reverse();
    gwEl.outerHTML = `
      <div class="modal-section-title">Recent GW Points</div>
      <div class="modal-gw-list">
        ${last5.map(gw => `
          <div class="modal-gw-row">
            <span class="modal-gw-label">GW${gw.round}</span>
            <span style="color:var(--text-2);font-size:0.78rem">${gw.minutes}min · ${gw.goals_scored}G ${gw.assists}A</span>
            <span class="modal-gw-pts">${gw.total_points} pts</span>
          </div>
        `).join('')}
      </div>
    `;
  } else if (gwEl) {
    gwEl.textContent = '';
  }
}

function closeModal() {
  el.modalOverlay.classList.add('hidden');
  document.body.style.overflow = '';
}

// ─── Feature 8: Live Points Ticker ───────────────────────────────────────────
async function checkLiveGW() {
  const status = await getEventStatus();
  const isLive = status?.leagues === 'Updated' ||
    (status?.status && status.status.some(s => s.bonus_added === false));

  if (isLive) {
    el.liveBadge.classList.remove('hidden');
    startLiveTicker();
  }
}

function startLiveTicker() {
  if (state.liveInterval) clearInterval(state.liveInterval);
  state.liveInterval = setInterval(async () => {
    const currentEvent = state.managerData?.current_event;
    if (!currentEvent) return;
    try {
      const res = await fetch(`/api/event/${currentEvent}/live/`);
      if (!res.ok) return;
      const liveData = await res.json();
      state.liveData = liveData;
      updateLivePoints(liveData);
    } catch { /* silent */ }
  }, 60000);
}

function updateLivePoints(liveData) {
  state.fullSquad.forEach(player => {
    const liveEl = liveData?.elements?.find(e => e.id === player.id);
    if (!liveEl) return;
    const pts = liveEl.stats?.total_points ?? 0;
    const chip = document.querySelector(`.pitch-player-points[data-player-id="${player.id}"]`);
    if (chip && chip.textContent !== String(pts)) {
      chip.textContent = pts;
      chip.classList.add('updated');
      setTimeout(() => chip.classList.remove('updated'), 2000);
    }
  });
}

// ─── Feature 9: Dark/Light Mode Toggle ───────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('fpl_theme') ?? 'dark';
  document.documentElement.className = saved;
  updateThemeIcon(saved);
}

function toggleTheme() {
  const current = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.className = next;
  localStorage.setItem('fpl_theme', next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  el.themeToggle.innerHTML = theme === 'dark'
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>`;
}

// ─── Feature 10: Shareable Squad Card ────────────────────────────────────────
async function handleShare() {
  const pitchEl = document.getElementById('pitch-el');
  if (!pitchEl) return;

  el.shareBtn.disabled = true;
  el.shareBtn.innerHTML = `<span class="spinner"></span> Generating…`;

  try {
    if (typeof html2canvas === 'undefined') {
      alert('Share feature is loading, please try again in a moment.');
      return;
    }
    const canvas = await html2canvas(pitchEl, {
      backgroundColor: '#0d0f14',
      scale: 2,
      useCORS: true,
      allowTaint: true,
    });
    const link = document.createElement('a');
    link.download = `fpl-squad-${state.managerId}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (e) {
    console.error('Share failed:', e);
    alert('Could not generate image. Try again.');
  } finally {
    el.shareBtn.disabled = false;
    el.shareBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
      </svg>
      Share`;
  }
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
function switchTab(tabName) {
  state.activeTab = tabName;
  el.tabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabName));
  el.tabPanels.forEach(panel => panel.classList.toggle('hidden', panel.dataset.tab !== tabName));
}

// ─── UI helpers ───────────────────────────────────────────────────────────────
function setLoadingState(loading) {
  el.loadBtn.disabled = loading;
  el.loadBtn.innerHTML = loading
    ? `<span class="spinner"></span> Loading...`
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="5 12 12 5 19 12"/><polyline points="5 19 12 12 19 19"/></svg> Analyse Team`;
}

function showGlobalLoading(show) {
  $('global-loading')?.classList.toggle('hidden', !show);
}

function showError(msg) {
  el.errorMsg.textContent = msg;
  el.errorMsg.classList.remove('hidden');
}

function hideError() {
  el.errorMsg.classList.add('hidden');
}

init();
