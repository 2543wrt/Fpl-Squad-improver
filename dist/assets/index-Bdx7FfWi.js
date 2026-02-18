(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))r(n);new MutationObserver(n=>{for(const s of n)if(s.type==="childList")for(const a of s.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&r(a)}).observe(document,{childList:!0,subtree:!0});function o(n){const s={};return n.integrity&&(s.integrity=n.integrity),n.referrerPolicy&&(s.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?s.credentials="include":n.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function r(n){if(n.ep)return;n.ep=!0;const s=o(n);fetch(n.href,s)}})();const G="/api";class k extends Error{constructor(t,o){super(t),this.name="FPLError",this.status=o}}async function w(e){const t=await fetch(`${G}${e}`);if(!t.ok)throw new k(`API error on ${e}`,t.status);return t.json()}async function R(){const e="fpl_bootstrap";try{const r=localStorage.getItem(e);if(r){const{data:n,timestamp:s}=JSON.parse(r);if(Date.now()-s<36e5)return n}}catch{}const o=await w("/bootstrap-static/");try{localStorage.setItem(e,JSON.stringify({data:o,timestamp:Date.now()}))}catch{}return o}async function W(e){const t=await w(`/entry/${e}/`).catch(()=>{throw new k("Manager not found. Please check your ID.",404)}),o=t.current_event;if(!o)throw new k("No active gameweek found for this manager.",400);const r=await w(`/entry/${e}/event/${o}/picks/`).catch(()=>{throw new k("Could not load team picks for the current gameweek.",500)}),n=await w(`/event/${o}/live/`).catch(()=>null);return{manager:t,picks:r,liveData:n}}async function V(e){return w(`/entry/${e}/history/`).catch(()=>null)}async function j(){return w("/fixtures/").catch(()=>[])}async function z(){try{return await w("/event-status/")}catch{return null}}async function U(e){return w(`/element-summary/${e}/`).catch(()=>null)}function P(e,t,o=3){const r=t.filter(s=>(s.team_h===e||s.team_a===e)&&!s.finished).slice(0,o);return r.length===0?null:(r.reduce((s,a)=>{const i=a.team_h===e?a.team_h_difficulty:a.team_a_difficulty;return s+i},0)/r.length).toFixed(1)}function I(e,t,o,r=5){return t.filter(s=>(s.team_h===e||s.team_a===e)&&!s.finished).slice(0,r).map(s=>{const a=s.team_h===e,i=a?s.team_a:s.team_h,c=o.find(u=>u.id===i),d=a?s.team_h_difficulty:s.team_a_difficulty;return{opponent:(c==null?void 0:c.short_name)??"?",isHome:a,fdr:d,event:s.event}})}function K(e){const t=(e.reduce((s,a)=>s+a.now_cost,0)/10).toFixed(1),o=(e.reduce((s,a)=>s+parseFloat(a.form||0),0)/e.length).toFixed(1),r=e.reduce((s,a)=>s+a.total_points,0),n=(e.reduce((s,a)=>s+parseFloat(a.selected_by_percent||0),0)/e.length).toFixed(1);return{totalValue:t,avgForm:o,totalPoints:r,avgOwnership:n}}function f(e){const t=parseFloat(e.form||0),o=e.now_cost>0?e.total_points/(e.now_cost/10):0;return t*.6+o*.4}function J(e,t,o=3){const r=e.slice(0,11),n=new Set(e.map(i=>i.id));return[...r].sort((i,c)=>f(i)-f(c)).slice(0,o).map(i=>{const c=t.filter(d=>d.element_type===i.element_type&&d.now_cost<=i.now_cost&&!n.has(d.id)&&f(d)>f(i)).sort((d,u)=>f(u)-f(d));return{out:i,in:c[0]??null,scoreDiff:c[0]?(f(c[0])-f(i)).toFixed(2):null}}).filter(i=>i.in!==null)}function Y(e,t,o,r=[]){const n=e.slice(0,11),s=new Set(e.map(c=>c.id)),a=n.reduce((c,d)=>f(d)<f(c)?d:c,n[0]),i=t.filter(c=>c.element_type===a.element_type&&c.now_cost<=a.now_cost&&!s.has(c.id)&&f(c)>f(a)).sort((c,d)=>f(d)-f(c));return{weakestLink:a,suggestions:i.slice(0,5),weakScore:f(a).toFixed(2)}}function Q(e,t,o){return[...e].map(r=>{const n=t.filter(a=>(a.team_h===r.team||a.team_a===r.team)&&!a.finished).slice(0,1)[0];let s=parseFloat(r.form||0);if(n){const a=n.team_h===r.team,i=a?n.team_h_difficulty:n.team_a_difficulty,c=a?1.1:1,d=1+(5-i)*.1;s=s*c*d;const u=a?n.team_a:n.team_h,m=o.find(g=>g.id===u);r._nextOpponent=`${a?"":"@"}${(m==null?void 0:m.short_name)??"?"}`,r._nextFDR=i}return{player:r,expectedScore:parseFloat(s.toFixed(2))}}).sort((r,n)=>n.expectedScore-r.expectedScore)}function X(e){return e.filter(t=>t.cost_change_event!==0).sort((t,o)=>Math.abs(o.cost_change_event)-Math.abs(t.cost_change_event))}function Z(e,t,o,r){const n=new Set(t.map(s=>s.id));return e.filter(s=>!n.has(s.id)&&parseFloat(s.form||0)>=5&&parseFloat(s.selected_by_percent||100)<15&&s.minutes>0).map(s=>{const a=P(s.team,o,3);return{...s,_fdr:a}}).filter(s=>s._fdr===null||parseFloat(s._fdr)<=3.5).sort((s,a)=>parseFloat(a.form)-parseFloat(s.form)).slice(0,8)}function _(e){const t=parseFloat(e);return t<=2?"fdr-easy":t<=3?"fdr-medium":t<=4?"fdr-hard":"fdr-very-hard"}function $(e){return{1:"GKP",2:"DEF",3:"MID",4:"FWD"}[e]||"?"}function b(e){return`£${(e/10).toFixed(1)}m`}const l={bootstrapData:null,managerData:null,currentPicks:null,liveData:null,history:null,fixtures:[],fullSquad:[],activeTab:"squad",liveInterval:null,managerId:null},v=e=>document.getElementById(e),p={loginSection:v("login-section"),dashboardSection:v("dashboard-section"),managerInput:v("manager-id-input"),loadBtn:v("load-team-btn"),errorMsg:v("error-message"),squadList:v("squad-list"),fixtureTicker:v("fixture-ticker"),transfersPanel:v("transfers-panel"),statsPanel:v("stats-panel"),managerName:v("manager-name"),managerRank:v("manager-rank"),managerGWPoints:v("manager-gw-points"),managerTotalPoints:v("manager-total-points"),managerTeamName:v("manager-team-name"),liveBadge:v("live-badge"),backBtn:v("back-btn"),shareBtn:v("share-btn"),themeToggle:v("theme-toggle"),modalOverlay:v("player-modal"),modalClose:v("modal-close"),modalContent:v("modal-content"),tabBtns:document.querySelectorAll(".tab-btn"),tabPanels:document.querySelectorAll(".tab-panel")};async function ee(){pe(),B(!0);try{l.bootstrapData=await R()}catch{F("Failed to connect to FPL API. Please try again later.")}finally{B(!1)}const e=new URLSearchParams(window.location.search).get("id");e&&(p.managerInput.value=e,E()),p.loadBtn.addEventListener("click",E),p.managerInput.addEventListener("keydown",t=>{t.key==="Enter"&&E()}),p.backBtn.addEventListener("click",te),p.shareBtn.addEventListener("click",ue),p.themeToggle.addEventListener("click",me),p.modalOverlay.addEventListener("click",t=>{t.target===p.modalOverlay&&D()}),p.modalClose.addEventListener("click",D),p.tabBtns.forEach(t=>t.addEventListener("click",()=>q(t.dataset.tab)))}async function E(){const e=p.managerInput.value.trim();if(!e||isNaN(e)){F("Please enter a valid numeric Manager ID.");return}H(!0),A();try{const[t,o,r]=await Promise.all([W(e),V(e),j()]);l.managerId=e,l.managerData=t.manager,l.currentPicks=t.picks,l.liveData=t.liveData,l.history=o,l.fixtures=r,l.fullSquad=l.currentPicks.picks.map(s=>{var c,d,u;const a=l.bootstrapData.elements.find(m=>m.id===s.element),i=(d=(c=l.liveData)==null?void 0:c.elements)==null?void 0:d.find(m=>m.id===s.element);return{...a,pick:s,livePoints:((u=i==null?void 0:i.stats)==null?void 0:u.total_points)??null}});const n=new URL(window.location);n.searchParams.set("id",e),window.history.pushState({},"",n),se(),ae(),le(),p.loginSection.classList.add("hidden"),p.dashboardSection.classList.remove("hidden"),p.dashboardSection.classList.add("fade-in")}catch(t){F(t.message||"An unexpected error occurred. Please try again.")}finally{H(!1)}}function te(){l.liveInterval&&(clearInterval(l.liveInterval),l.liveInterval=null),p.dashboardSection.classList.add("hidden"),p.loginSection.classList.remove("hidden"),p.managerInput.value="",A();const e=new URL(window.location);e.searchParams.delete("id"),window.history.pushState({},"",e)}function se(){const e=l.managerData;p.managerName.textContent=`${e.player_first_name} ${e.player_last_name}`,p.managerTeamName.textContent=e.name,p.managerRank.textContent=e.summary_overall_rank?`#${e.summary_overall_rank.toLocaleString()}`:"—",p.managerGWPoints.textContent=e.summary_event_points??"—",p.managerTotalPoints.textContent=e.summary_overall_points??"—"}function ae(){ne(),ie(),oe(),re(),q("squad")}function ne(){p.squadList.innerHTML="";const e=l.fullSquad.slice(0,11),t=l.fullSquad.slice(11),o={1:[],2:[],3:[],4:[]};e.forEach(a=>{var i;return(i=o[a.element_type])==null?void 0:i.push(a)});const r=document.createElement("div");r.className="pitch",r.id="pitch-el",r.innerHTML=`
    <div class="pitch-markings">
      <div class="pitch-line pitch-halfway"></div>
      <div class="pitch-circle"></div>
      <div class="pitch-box pitch-box-top"></div>
      <div class="pitch-box pitch-box-bottom"></div>
    </div>
  `,[1,2,3,4].forEach(a=>{const i=document.createElement("div");i.className="pitch-row",o[a].forEach(c=>i.appendChild(T(c))),r.appendChild(i)}),p.squadList.appendChild(r);const n=document.createElement("div");n.className="bench-section",n.innerHTML='<div class="bench-label"><span>BENCH</span></div>';const s=document.createElement("div");s.className="bench-row",t.forEach(a=>s.appendChild(T(a,!0))),n.appendChild(s),p.squadList.appendChild(n)}function T(e,t=!1){var d,u;const o=document.createElement("div");o.className=`pitch-player${t?" bench-player":""}`,o.title=`${e.web_name} — click for details`;const r=l.bootstrapData.teams.find(m=>m.id===e.team),n=`https://resources.premierleague.com/premierleague/photos/players/110x140/p${e.code}.png`,s=e.livePoints!==null?e.livePoints:e.event_points??e.total_points,a=(d=e.pick)==null?void 0:d.is_captain,i=(u=e.pick)==null?void 0:u.is_vice_captain,c=e.cost_change_event;return o.innerHTML=`
    <div class="pitch-player-img-wrap">
      <img src="${n}" alt="${e.web_name}" loading="lazy"
           onerror="this.src='https://resources.premierleague.com/premierleague/photos/players/110x140/Photo-Missing.png'">
      ${a?'<span class="captain-badge">C</span>':""}
      ${i?'<span class="vice-badge">V</span>':""}
      ${c>0?`<span class="price-badge up">▲${(c/10).toFixed(1)}</span>`:""}
      ${c<0?`<span class="price-badge down">▼${(Math.abs(c)/10).toFixed(1)}</span>`:""}
    </div>
    <div class="pitch-player-info">
      <span class="pitch-player-name">${e.web_name}</span>
      <span class="pitch-player-team">${(r==null?void 0:r.short_name)??""}</span>
    </div>
    <div class="pitch-player-points" data-player-id="${e.id}">${s}</div>
  `,o.addEventListener("click",()=>S(e)),o}function ie(){p.fixtureTicker.innerHTML="";const{teams:e}=l.bootstrapData,t=l.fullSquad,o=document.createElement("div");o.className="fixture-ticker-wrap";const r=document.createElement("div");r.className="fixture-ticker-header",r.innerHTML=`
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
    Fixture Difficulty — Next 5 Gameweeks
  `,o.appendChild(r);const n=document.createElement("table");n.className="fixture-ticker-table";const s=document.createElement("thead");s.innerHTML=`<tr>
    <th>Player</th>
    <th>GW+1</th><th>GW+2</th><th>GW+3</th><th>GW+4</th><th>GW+5</th>
  </tr>`,n.appendChild(s);const a=document.createElement("tbody");t.forEach(i=>{const c=I(i.team,l.fixtures,e,5),d=document.createElement("tr"),u=`https://resources.premierleague.com/premierleague/photos/players/110x140/p${i.code}.png`;d.innerHTML=`
      <td>
        <div class="ticker-player-cell">
          <img src="${u}" alt="${i.web_name}"
               onerror="this.src='https://resources.premierleague.com/premierleague/photos/players/110x140/Photo-Missing.png'">
          <div>
            <div class="ticker-player-name">${i.web_name}</div>
            <div class="ticker-player-pos">${$(i.element_type)}</div>
          </div>
        </div>
      </td>
      ${c.map(m=>`
        <td>
          <div class="fixture-cell ${_(m.fdr)}">
            ${m.opponent}
            <span class="fix-ha">${m.isHome?"H":"A"}</span>
          </div>
        </td>
      `).join("")}
      ${Array(5-c.length).fill('<td><div class="fixture-cell" style="opacity:0.3">—</div></td>').join("")}
    `,a.appendChild(d)}),n.appendChild(a),o.appendChild(n),p.fixtureTicker.appendChild(o)}function oe(){p.transfersPanel.innerHTML="";const e=document.createElement("div");e.className="transfers-panel";const t=J(l.fullSquad,l.bootstrapData.elements,3);if(t.length>0){const d=document.createElement("div");d.innerHTML=`
      <div class="section-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
          <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
        </svg>
        Recommended Transfers
      </div>
    `,t.forEach(u=>{const m=l.bootstrapData.teams.find(y=>y.id===u.out.team),g=l.bootstrapData.teams.find(y=>y.id===u.in.team),h=document.createElement("div");h.className="transfer-pair",h.innerHTML=`
        <div class="transfer-player out">
          <img src="https://resources.premierleague.com/premierleague/photos/players/110x140/p${u.out.code}.png"
               alt="${u.out.web_name}"
               onerror="this.src='https://resources.premierleague.com/premierleague/photos/players/110x140/Photo-Missing.png'">
          <div class="transfer-player-info">
            <strong>${u.out.web_name}</strong>
            <span>${(m==null?void 0:m.short_name)??""} · ${b(u.out.now_cost)}</span>
            <div class="stat-pills" style="margin-top:0.3rem">
              <span class="stat-pill">Form: <b>${u.out.form}</b></span>
              <span class="stat-pill">Pts: <b>${u.out.total_points}</b></span>
            </div>
          </div>
        </div>
        <div class="transfer-arrow">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
          <span class="transfer-gain">+${u.scoreDiff}</span>
        </div>
        <div class="transfer-player in">
          <img src="https://resources.premierleague.com/premierleague/photos/players/110x140/p${u.in.code}.png"
               alt="${u.in.web_name}"
               onerror="this.src='https://resources.premierleague.com/premierleague/photos/players/110x140/Photo-Missing.png'">
          <div class="transfer-player-info">
            <strong>${u.in.web_name}</strong>
            <span>${(g==null?void 0:g.short_name)??""} · ${b(u.in.now_cost)}</span>
            <div class="stat-pills" style="margin-top:0.3rem">
              <span class="stat-pill">Form: <b>${u.in.form}</b></span>
              <span class="stat-pill">Pts: <b>${u.in.total_points}</b></span>
            </div>
          </div>
        </div>
      `,d.appendChild(h)}),e.appendChild(d)}const o=l.fullSquad.slice(0,11),r=Q(o,l.fixtures,l.bootstrapData.teams),n=document.createElement("div");n.innerHTML=`
    <div class="section-header">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
        <path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
      </svg>
      Captain Picker
    </div>
  `;const s=document.createElement("div");s.className="captain-list",r.slice(0,5).forEach((d,u)=>{const m=d.player,g=l.bootstrapData.teams.find(y=>y.id===m.team),h=document.createElement("div");h.className="captain-row",h.innerHTML=`
      <img src="https://resources.premierleague.com/premierleague/photos/players/110x140/p${m.code}.png"
           alt="${m.web_name}"
           onerror="this.src='https://resources.premierleague.com/premierleague/photos/players/110x140/Photo-Missing.png'">
      <div class="captain-info">
        <strong>${m.web_name}</strong>
        <span>${(g==null?void 0:g.short_name)??""} · ${m._nextOpponent??"TBD"} · Form: ${m.form}</span>
      </div>
      ${u===0?'<span class="captain-badge-label">CAPTAIN</span>':""}
      <div class="captain-score">${d.expectedScore}</div>
    `,s.appendChild(h)}),n.appendChild(s),e.appendChild(n);const a=Z(l.bootstrapData.elements,l.fullSquad,l.fixtures,l.bootstrapData.teams);if(a.length>0){const d=document.createElement("div");d.innerHTML=`
      <div class="section-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        Differentials (High Form · Low Ownership)
      </div>
    `;const u=document.createElement("div");u.className="differential-grid",a.forEach(m=>{const g=l.bootstrapData.teams.find(y=>y.id===m.team),h=document.createElement("div");h.className="differential-card",h.innerHTML=`
        <img src="https://resources.premierleague.com/premierleague/photos/players/110x140/p${m.code}.png"
             alt="${m.web_name}"
             onerror="this.src='https://resources.premierleague.com/premierleague/photos/players/110x140/Photo-Missing.png'">
        <strong>${m.web_name}</strong>
        <span>${(g==null?void 0:g.short_name)??""} · ${$(m.element_type)} · ${b(m.now_cost)}</span>
        <div class="stat-pills">
          <span class="stat-pill">Form: <b>${m.form}</b></span>
          <span class="stat-pill">Sel: <b>${m.selected_by_percent}%</b></span>
          ${m._fdr?`<span class="stat-pill fdr-pill ${_(parseFloat(m._fdr))}">FDR: <b>${m._fdr}</b></span>`:""}
        </div>
      `,h.addEventListener("click",()=>S(m)),u.appendChild(h)}),d.appendChild(u),e.appendChild(d)}const{weakestLink:i,suggestions:c}=Y(l.fullSquad,l.bootstrapData.elements,l.bootstrapData.element_types,l.fixtures);if(i){const d=document.createElement("div"),u=l.bootstrapData.teams.find(h=>h.id===i.team),m=P(i.team,l.fixtures);d.innerHTML=`
      <div class="section-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        Weakest Link Analysis
      </div>
    `;const g=document.createElement("div");g.className="suggestion-header-card",g.innerHTML=`
      <div class="suggestion-header-label">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        </svg>
        Consider replacing
      </div>
      <div class="suggestion-weak-player">
        <img src="https://resources.premierleague.com/premierleague/photos/players/110x140/p${i.code}.png"
             alt="${i.web_name}"
             onerror="this.src='https://resources.premierleague.com/premierleague/photos/players/110x140/Photo-Missing.png'">
        <div class="suggestion-weak-info">
          <strong>${i.web_name}</strong>
          <span>${(u==null?void 0:u.short_name)??""} · ${$(i.element_type)} · ${b(i.now_cost)}</span>
          <div class="stat-pills">
            <span class="stat-pill">Form: <b>${i.form}</b></span>
            <span class="stat-pill">Pts: <b>${i.total_points}</b></span>
            ${m?`<span class="stat-pill fdr-pill ${_(parseFloat(m))}">FDR: <b>${m}</b></span>`:""}
          </div>
        </div>
      </div>
      <p class="suggestion-subtext">Top replacements within budget:</p>
    `,d.appendChild(g),c.forEach((h,y)=>{const L=l.bootstrapData.teams.find(O=>O.id===h.team),C=P(h.team,l.fixtures),M=(parseFloat(h.form)-parseFloat(i.form)).toFixed(1),x=document.createElement("div");x.className="suggestion-card",x.style.animationDelay=`${y*.07}s`,x.innerHTML=`
        <div class="suggestion-rank">${y+1}</div>
        <img src="https://resources.premierleague.com/premierleague/photos/players/110x140/p${h.code}.png"
             alt="${h.web_name}"
             onerror="this.src='https://resources.premierleague.com/premierleague/photos/players/110x140/Photo-Missing.png'">
        <div class="suggestion-info">
          <strong>${h.web_name}</strong>
          <span>${(L==null?void 0:L.short_name)??""} · ${b(h.now_cost)}</span>
          <div class="stat-pills">
            <span class="stat-pill">Form: <b>${h.form}</b></span>
            <span class="stat-pill">Pts: <b>${h.total_points}</b></span>
            <span class="stat-pill">Sel: <b>${h.selected_by_percent}%</b></span>
            ${C?`<span class="stat-pill fdr-pill ${_(parseFloat(C))}">FDR: <b>${C}</b></span>`:""}
          </div>
        </div>
        <div class="suggestion-delta ${parseFloat(M)>=0?"positive":"negative"}">
          ${parseFloat(M)>=0?"+":""}${M}
          <span>form</span>
        </div>
      `,x.addEventListener("click",()=>S(h)),d.appendChild(x)}),e.appendChild(d)}p.transfersPanel.appendChild(e)}function re(){var s;const e=K(l.fullSquad),t=l.managerData,r=(((s=l.history)==null?void 0:s.current)??[]).slice(-5),n=X(l.fullSquad);p.statsPanel.innerHTML=`
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
        <div class="stat-value">£${e.totalValue}m</div>
        <div class="stat-label">Squad Value</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
        <div class="stat-value">${e.avgForm}</div>
        <div class="stat-label">Avg Form</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>
        <div class="stat-value">${e.totalPoints}</div>
        <div class="stat-label">Total Points</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
        <div class="stat-value">${e.avgOwnership}%</div>
        <div class="stat-label">Avg Ownership</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg></div>
        <div class="stat-value">${t.summary_overall_rank?"#"+t.summary_overall_rank.toLocaleString():"—"}</div>
        <div class="stat-label">Overall Rank</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg></div>
        <div class="stat-value">${t.last_deadline_bank!=null?"£"+(t.last_deadline_bank/10).toFixed(1)+"m":"—"}</div>
        <div class="stat-label">Bank</div>
      </div>
    </div>

    ${r.length>0?`
    <div class="gw-history">
      <h3>Last 5 Gameweeks</h3>
      <div class="gw-bars">
        ${r.map(a=>{const i=Math.max(...r.map(d=>d.points)),c=i>0?Math.round(a.points/i*100):0;return`<div class="gw-bar-wrap">
            <div class="gw-bar-label">${a.points}</div>
            <div class="gw-bar-track"><div class="gw-bar-fill" style="height:${c}%"></div></div>
            <div class="gw-bar-gw">GW${a.event}</div>
          </div>`}).join("")}
      </div>
    </div>`:""}

    ${n.length>0?`
    <div class="price-changes-section">
      <h3>Price Changes This GW</h3>
      <div class="price-change-list">
        ${n.map(a=>{const i=l.bootstrapData.teams.find(d=>d.id===a.team),c=a.cost_change_event;return`<div class="price-change-row">
            <img src="https://resources.premierleague.com/premierleague/photos/players/110x140/p${a.code}.png"
                 alt="${a.web_name}"
                 onerror="this.src='https://resources.premierleague.com/premierleague/photos/players/110x140/Photo-Missing.png'">
            <strong>${a.web_name}</strong>
            <span style="font-size:0.8rem;color:var(--text-3)">${(i==null?void 0:i.short_name)??""}</span>
            <span class="price-tag ${c>0?"up":"down"}">
              ${c>0?"▲":"▼"}£${(Math.abs(c)/10).toFixed(1)}m
            </span>
          </div>`}).join("")}
      </div>
    </div>`:""}

    <div class="top-performers">
      <h3>Top Performers This Season</h3>
      <div class="performer-list">
        ${[...l.fullSquad].sort((a,i)=>i.total_points-a.total_points).slice(0,5).map((a,i)=>{const c=l.bootstrapData.teams.find(d=>d.id===a.team);return`<div class="performer-row">
            <span class="performer-rank">${i+1}</span>
            <img src="https://resources.premierleague.com/premierleague/photos/players/110x140/p${a.code}.png"
                 alt="${a.web_name}"
                 onerror="this.src='https://resources.premierleague.com/premierleague/photos/players/110x140/Photo-Missing.png'">
            <div class="performer-info">
              <strong>${a.web_name}</strong>
              <span>${(c==null?void 0:c.short_name)??""} · ${$(a.element_type)}</span>
            </div>
            <div class="performer-pts">${a.total_points} pts</div>
          </div>`}).join("")}
      </div>
    </div>
  `}async function S(e){var i;const t=l.bootstrapData.teams.find(c=>c.id===e.team),o=$(e.element_type),r=I(e.team,l.fixtures,l.bootstrapData.teams,5),n=`https://resources.premierleague.com/premierleague/photos/players/110x140/p${e.code}.png`;p.modalContent.innerHTML=`
    <div class="modal-hero">
      <img src="${n}" alt="${e.web_name}"
           onerror="this.src='https://resources.premierleague.com/premierleague/photos/players/110x140/Photo-Missing.png'">
      <div class="modal-hero-info">
        <h3>${e.first_name??""} ${e.second_name??e.web_name}</h3>
        <span>${(t==null?void 0:t.name)??""} · ${b(e.now_cost)}</span>
        <div><span class="modal-pos-badge pos-${o}">${o}</span></div>
      </div>
    </div>
    <div class="modal-stats-grid">
      <div class="modal-stat"><div class="modal-stat-value">${e.total_points}</div><div class="modal-stat-label">Total Pts</div></div>
      <div class="modal-stat"><div class="modal-stat-value">${e.form}</div><div class="modal-stat-label">Form</div></div>
      <div class="modal-stat"><div class="modal-stat-value">${e.selected_by_percent}%</div><div class="modal-stat-label">Ownership</div></div>
      <div class="modal-stat"><div class="modal-stat-value">${e.minutes??"—"}</div><div class="modal-stat-label">Minutes</div></div>
      <div class="modal-stat"><div class="modal-stat-value">${e.goals_scored??0}</div><div class="modal-stat-label">Goals</div></div>
      <div class="modal-stat"><div class="modal-stat-value">${e.assists??0}</div><div class="modal-stat-label">Assists</div></div>
      <div class="modal-stat"><div class="modal-stat-value">${e.clean_sheets??0}</div><div class="modal-stat-label">Clean Sheets</div></div>
      <div class="modal-stat"><div class="modal-stat-value">${e.bonus??0}</div><div class="modal-stat-label">Bonus Pts</div></div>
    </div>
    ${r.length>0?`
    <div class="modal-section-title">Next Fixtures</div>
    <div class="modal-fixtures">
      ${r.map(c=>`
        <div class="modal-fixture-chip ${_(c.fdr)}">
          ${c.opponent}
          <span class="fix-ha">${c.isHome?"H":"A"}</span>
        </div>
      `).join("")}
    </div>`:""}
    <div id="modal-gw-loading" style="color:var(--text-3);font-size:0.85rem">Loading GW history…</div>
  `,p.modalOverlay.classList.remove("hidden"),document.body.style.overflow="hidden";const s=await U(e.id),a=v("modal-gw-loading");if(a&&((i=s==null?void 0:s.history)==null?void 0:i.length)>0){const c=s.history.slice(-5).reverse();a.outerHTML=`
      <div class="modal-section-title">Recent GW Points</div>
      <div class="modal-gw-list">
        ${c.map(d=>`
          <div class="modal-gw-row">
            <span class="modal-gw-label">GW${d.round}</span>
            <span style="color:var(--text-2);font-size:0.78rem">${d.minutes}min · ${d.goals_scored}G ${d.assists}A</span>
            <span class="modal-gw-pts">${d.total_points} pts</span>
          </div>
        `).join("")}
      </div>
    `}else a&&(a.textContent="")}function D(){p.modalOverlay.classList.add("hidden"),document.body.style.overflow=""}async function le(){const e=await z();((e==null?void 0:e.leagues)==="Updated"||(e==null?void 0:e.status)&&e.status.some(o=>o.bonus_added===!1))&&(p.liveBadge.classList.remove("hidden"),ce())}function ce(){l.liveInterval&&clearInterval(l.liveInterval),l.liveInterval=setInterval(async()=>{var t;const e=(t=l.managerData)==null?void 0:t.current_event;if(e)try{const o=await fetch(`/api/event/${e}/live/`);if(!o.ok)return;const r=await o.json();l.liveData=r,de(r)}catch{}},6e4)}function de(e){l.fullSquad.forEach(t=>{var s,a;const o=(s=e==null?void 0:e.elements)==null?void 0:s.find(i=>i.id===t.id);if(!o)return;const r=((a=o.stats)==null?void 0:a.total_points)??0,n=document.querySelector(`.pitch-player-points[data-player-id="${t.id}"]`);n&&n.textContent!==String(r)&&(n.textContent=r,n.classList.add("updated"),setTimeout(()=>n.classList.remove("updated"),2e3))})}function pe(){const e=localStorage.getItem("fpl_theme")??"dark";document.documentElement.className=e,N(e)}function me(){const t=(document.documentElement.classList.contains("dark")?"dark":"light")==="dark"?"light":"dark";document.documentElement.className=t,localStorage.setItem("fpl_theme",t),N(t)}function N(e){p.themeToggle.innerHTML=e==="dark"?`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>`:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>`}async function ue(){const e=document.getElementById("pitch-el");if(e){p.shareBtn.disabled=!0,p.shareBtn.innerHTML='<span class="spinner"></span> Generating…';try{if(typeof html2canvas>"u"){alert("Share feature is loading, please try again in a moment.");return}const t=await html2canvas(e,{backgroundColor:"#0d0f14",scale:2,useCORS:!0,allowTaint:!0}),o=document.createElement("a");o.download=`fpl-squad-${l.managerId}.png`,o.href=t.toDataURL("image/png"),o.click()}catch(t){console.error("Share failed:",t),alert("Could not generate image. Try again.")}finally{p.shareBtn.disabled=!1,p.shareBtn.innerHTML=`
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
      </svg>
      Share`}}}function q(e){l.activeTab=e,p.tabBtns.forEach(t=>t.classList.toggle("active",t.dataset.tab===e)),p.tabPanels.forEach(t=>t.classList.toggle("hidden",t.dataset.tab!==e))}function H(e){p.loadBtn.disabled=e,p.loadBtn.innerHTML=e?'<span class="spinner"></span> Loading...':'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="5 12 12 5 19 12"/><polyline points="5 19 12 12 19 19"/></svg> Analyse Team'}function B(e){var t;(t=v("global-loading"))==null||t.classList.toggle("hidden",!e)}function F(e){p.errorMsg.textContent=e,p.errorMsg.classList.remove("hidden")}function A(){p.errorMsg.classList.add("hidden")}ee();
