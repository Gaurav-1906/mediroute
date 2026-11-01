const state = {
  graph: null,
  locations: [],
  hospitals: [],
  routeResult: null,
  nearestResult: null,
  traceResult: null,
  traceIndex: 0,
  lastRouteLabel: 'No route calculated yet.'
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const app = $('#app');

async function api(path, options = {}) {
  const response = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'The API request could not be completed.');
  return data;
}

function formatKm(value) { return value === null || value === undefined ? '—' : `${Number(value).toFixed(1)} km`; }
function formatMinutes(value) { return value === null || value === undefined ? '—' : `${Number(value).toFixed(1)} min`; }
function titleForNode(id) { return state.graph?.nodes.find((node) => node.id === id)?.name || id; }
function hospitalFor(id) { return state.hospitals.find((hospital) => hospital.id === id); }
function routePairs(path) { const pairs = new Set(); for (let i = 0; i < path.length - 1; i += 1) pairs.add(`${path[i]}::${path[i + 1]}`); return pairs; }
function pairKey(a, b) { return `${a}::${b}`; }
function showToast(message) { const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); window.clearTimeout(showToast.timer); showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2600); }
function displayError(container, error) { container.innerHTML = `<div class="callout" style="border-color:var(--red);background:var(--red-soft);color:#a33443"><strong>Route unavailable</strong><br>${error.message || error}</div>`; }

function shellView(page) {
  const titles = { home: 'Command center', route: 'Ambulance route finder', nearest: 'Nearest hospital', visualizer: 'Algorithm visualizer' };
  $('#pageTitle').textContent = titles[page] || titles.home;
  $$('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.route === page));
}

function selectOptions(items, placeholder = null) {
  return `${placeholder ? `<option value="">${placeholder}</option>` : ''}${items.map((item) => `<option value="${item.id}">${item.id} · ${item.name}</option>`).join('')}`;
}

function miniGraph() {
  return `<svg class="mini-network" viewBox="0 0 100 100" role="img" aria-label="Compact road network preview">
    <g class="edges">${state.graph.edges.map((edge) => { const a = state.graph.nodes.find((n) => n.id === edge.from); const b = state.graph.nodes.find((n) => n.id === edge.to); return `<line class="edge" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" />`; }).join('')}</g>
    <g>${state.graph.nodes.map((node) => `<circle class="node-circle ${node.type}" cx="${node.x}" cy="${node.y}" r="${node.type === 'hospital' ? 3.2 : 2.7}" />`).join('')}</g>
    <g>${state.graph.nodes.filter((n) => n.type === 'hospital').map((node) => `<text class="node-plus" x="${node.x}" y="${node.y + .3}">+</text>`).join('')}</g>
  </svg>`;
}

function homeTemplate() {
  const c = state.graph.counts;
  return `<div class="page-intro"><div><span class="eyebrow">Operations overview</span><h1>Good morning, operator.</h1><p>Plan an explainable simulated ambulance route, inspect the algorithm's work, and compare hospitals from one calm command center.</p></div><div class="intro-actions"><a class="btn btn-primary" href="#/route">Find a route <span>→</span></a><a class="btn btn-secondary" href="#/visualizer">Explore algorithm</a></div></div>
  <section class="hero-grid"><div class="hero-card"><span class="eyebrow">MediRoute / Dijkstra lab</span><h1>Every second counts.<br /><span style="color:#68c3f1">Every route matters.</span></h1><p>A focused ambulance route finder for demonstrating weighted graphs, priority queues, and shortest-path reasoning with real execution evidence.</p><div class="hero-actions"><a class="btn btn-primary" href="#/route">Open route finder <span>↗</span></a><a class="btn btn-secondary" href="#/nearest">Compare hospitals</a></div><div class="hero-meta"><span><b>${c.nodes}</b> nodes</span><span><b>${c.roads}</b> roads</span><span><b>${c.hospitals}</b> hospitals</span></div></div><div class="network-card"><div class="card-head"><div><h2>Network pulse</h2><p>Deterministic road graph · adjacency list</p></div><span class="pill green"><span class="status-dot"></span> Ready</span></div>${miniGraph()}<div style="display:flex;justify-content:space-between;color:var(--muted);font-size:10px"><span>Blue routes show calculated path evidence</span><a href="#/visualizer" style="color:var(--blue);font-weight:700;text-decoration:none">Inspect graph →</a></div></div></section>
  <section class="stats-grid"><div class="stat-card"><div><span class="stat-label">Simulated locations</span><div class="stat-value">${c.locations}</div><span class="stat-sub">Start points available</span></div><span class="stat-icon blue">⌁</span></div><div class="stat-card"><div><span class="stat-label">Hospitals</span><div class="stat-value">${c.hospitals}</div><span class="stat-sub">${state.hospitals.filter((h) => h.id !== 'H3').length} reachable from HQ</span></div><span class="stat-icon red">✚</span></div><div class="stat-card"><div><span class="stat-label">Road connections</span><div class="stat-value">${c.roads}</div><span class="stat-sub">Bidirectional edges</span></div><span class="stat-icon green">↔</span></div><div class="stat-card"><div><span class="stat-label">Routing engine</span><div class="stat-value" style="font-size:18px;margin-top:13px">Dijkstra</div><span class="stat-sub">Priority queue enabled</span></div><span class="stat-icon amber">∿</span></div></section>
  <section class="two-col"><div class="panel"><div class="panel-header"><div><h2>How the route is decided</h2><p>Three visible steps keep the DSA logic easy to explain.</p></div><span class="pill blue">O((V + E) log V)</span></div><div class="explain-block"><div class="algorithm-badge">D</div><p><strong>Dijkstra's algorithm</strong> repeatedly removes the nearest unsettled node from a priority queue, relaxes each outgoing edge, and records a predecessor so the final path can be reconstructed. MediRoute runs the same graph against distance or simulated time weights.</p></div><div class="statements"><div class="statement"><span class="statement-number">1</span><span>Initialize every node with an infinite cost, except the selected ambulance location at zero.</span></div><div class="statement"><span class="statement-number">2</span><span>Relax neighbouring roads whenever a lower-cost route is discovered.</span></div><div class="statement"><span class="statement-number">3</span><span>Stop at the hospital, then walk predecessor links backward to show the chosen route.</span></div></div></div><div><div class="disclaimer"><strong>Academic simulation only</strong> Travel times and road distances are deterministic estimates for demonstration. MediRoute does not dispatch ambulances, use live traffic, or provide verified emergency directions.</div><div class="panel" style="margin-top:18px"><div class="panel-header"><div><h2>Quick start</h2><p>Choose the next investigation.</p></div></div><div class="quick-list"><a class="quick-row" href="#/route" style="text-decoration:none;color:inherit"><div class="quick-row-left"><span class="quick-marker">01</span><div><strong>Find a route</strong><small>Distance or time optimization</small></div></div><span style="color:var(--blue)">→</span></a><a class="quick-row" href="#/nearest" style="text-decoration:none;color:inherit"><div class="quick-row-left"><span class="quick-marker">02</span><div><strong>Compare hospitals</strong><small>Rank actual graph costs</small></div></div><span style="color:var(--blue)">→</span></a></div></div></div></section>`;
}

function graphSvg(viewState = {}) {
  const highlighted = routePairs(viewState.path || []);
  const visited = new Set(viewState.visited || []);
  const pathNodes = new Set(viewState.path || []);
  return `<svg class="route-svg" viewBox="0 0 100 100" role="img" aria-label="Weighted MediRoute road network">
    <defs><filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#0f2844" flood-opacity=".12" /></filter></defs>
    <g>${state.graph.edges.map((edge) => { const a = state.graph.nodes.find((n) => n.id === edge.from); const b = state.graph.nodes.find((n) => n.id === edge.to); const isHigh = highlighted.has(pairKey(edge.from, edge.to)) || highlighted.has(pairKey(edge.to, edge.from)); const mx = (a.x + b.x) / 2; const my = (a.y + b.y) / 2; return `<line class="edge ${isHigh ? 'highlighted' : ''}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" /><text class="edge-label ${isHigh ? 'highlighted' : ''}" x="${mx}" y="${my - 1.7}" text-anchor="middle">${edge.distance.toFixed(1)}</text>`; }).join('')}</g>
    <g filter="url(#softShadow)">${state.graph.nodes.map((node) => { const isStart = node.id === viewState.startId; const isCurrent = node.id === viewState.current; const classes = [node.type, isStart ? 'start' : '', isCurrent ? 'current' : '', visited.has(node.id) ? 'visited' : '', pathNodes.has(node.id) ? 'path' : '', viewState.unreachable?.includes(node.id) ? 'unreachable' : ''].join(' '); return `<g><circle class="node-circle ${classes}" cx="${node.x}" cy="${node.y}" r="${node.type === 'hospital' ? 4 : 3.4}" />${node.type === 'hospital' ? `<text class="node-plus" x="${node.x}" y="${node.y + .4}">+</text>` : ''}<text class="node-label" x="${node.x}" y="${node.y + 8}">${node.id}</text><text class="node-name" x="${node.x}" y="${node.y - 6}">${node.name.split(' ')[0]}</text></g>`; }).join('')}</g>
  </svg>`;
}

function routeTemplate() {
  return `<div class="page-intro"><div><span class="eyebrow">Live simulation workspace</span><h1>Ambulance route finder</h1><p>Choose a start point and a hospital. The backend will run Dijkstra with the selected non-negative edge weight.</p></div><span class="pill amber">Simulated road data</span></div><div class="route-layout"><section class="panel control-panel"><div class="panel-header"><div><h2>Plan a route</h2><p>All fields are required.</p></div><span class="pill blue">API /routes</span></div><form id="routeForm"><div class="form-grid"><div class="field full"><label for="routeStart">Ambulance starting location</label><select id="routeStart">${selectOptions(state.locations)}</select></div><div class="field full"><label for="routeHospital">Destination hospital</label><select id="routeHospital">${selectOptions(state.hospitals)}</select></div><div class="field full"><label>Optimization mode</label><div class="radio-group"><label class="radio-card"><input type="radio" name="optimization" value="distance" checked /><strong>Shortest distance</strong><small>Minimize road kilometres</small></label><label class="radio-card"><input type="radio" name="optimization" value="time" /><strong>Fastest time</strong><small>Minimize simulated minutes</small></label></div></div></div><div class="form-actions"><button class="btn btn-primary" type="submit">Find route <span>→</span></button><button class="btn btn-secondary" type="button" id="resetRoute">Reset</button></div></form><div id="routeResult" class="route-result empty">Select a scenario, then run the calculation to reveal the path and its evidence.</div></section><section class="graph-panel"><div class="graph-toolbar"><strong>Road network</strong><div class="legend"><span><i class="l-ambulance"></i> Start</span><span><i class="l-hospital"></i> Hospital</span><span><i class="l-route"></i> Route</span></div></div><div id="routeGraph">${graphSvg()}</div></section></div>`;
}

function resultMarkup(result) {
  if (!result) return '<div class="route-result empty">Select a scenario, then run the calculation to reveal the path and its evidence.</div>';
  return `<div class="callout"><strong>Route calculated by backend Dijkstra</strong><br>${result.optimization === 'time' ? 'Fastest estimated time' : 'Shortest road distance'} selected · ${result.queueRemovals} priority-queue removals recorded.</div><div class="result-grid"><div class="result-stat"><span>Total distance</span><strong>${formatKm(result.distanceKm)}</strong></div><div class="result-stat"><span>Estimated time</span><strong>${formatMinutes(result.timeMinutes)}</strong></div><div class="result-stat"><span>Visited nodes</span><strong>${result.visitedNodeCount}</strong></div><div class="result-stat"><span>Road segments</span><strong>${result.segments.length}</strong></div></div><div style="color:var(--muted);font-size:10px;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;font-weight:700">Human-readable route sequence</div><div class="path-strip">${result.path.map((id, index) => `${index ? '<span class="path-arrow">→</span>' : ''}<span class="path-node">${id}</span>`).join('')}</div>`;
}

async function setupRoute() {
  const form = $('#routeForm');
  const resultBox = $('#routeResult');
  const graphBox = $('#routeGraph');
  $('#routeHospital').value = 'H1';
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const startId = $('#routeStart').value;
    const destinationId = $('#routeHospital').value;
    const optimization = $('input[name="optimization"]:checked').value;
    resultBox.innerHTML = '<div class="route-result empty">Running priority-queue relaxation…</div>';
    try {
      const endpoint = optimization === 'time' ? '/api/routes/fastest' : '/api/routes/shortest';
      const result = await api(endpoint, { method: 'POST', body: JSON.stringify({ startId, destinationId }) });
      state.routeResult = result;
      state.lastRouteLabel = `${startId} → ${destinationId}`;
      resultBox.innerHTML = resultMarkup(result);
      graphBox.innerHTML = graphSvg({ path: result.path, startId, destinationId });
      showToast('Route calculation complete.');
    } catch (error) { state.routeResult = null; displayError(resultBox, error); graphBox.innerHTML = graphSvg({ startId, destinationId }); }
  });
  $('#resetRoute').addEventListener('click', () => { form.reset(); $('#routeHospital').value = 'H1'; resultBox.innerHTML = resultMarkup(null); graphBox.innerHTML = graphSvg(); state.routeResult = null; showToast('Route form reset.'); });
}

function nearestTemplate() {
  return `<div class="page-intro"><div><span class="eyebrow">Hospital comparison</span><h1>Nearest hospital</h1><p>Compare reachable hospitals by actual graph cost. Unreachable destinations stay visible instead of being silently recommended.</p></div><span class="pill blue">Cost-aware ranking</span></div><div class="nearest-layout"><section class="panel control-panel"><div class="panel-header"><div><h2>Compare from</h2><p>Run one-to-many Dijkstra.</p></div></div><form id="nearestForm"><div class="field"><label for="nearestStart">Ambulance starting location</label><select id="nearestStart">${selectOptions(state.locations)}</select></div><div class="field" style="margin-top:14px"><label>Rank by</label><div class="radio-group"><label class="radio-card"><input type="radio" name="nearestOptimization" value="distance" checked /><strong>Distance</strong><small>Physical km</small></label><label class="radio-card"><input type="radio" name="nearestOptimization" value="time" /><strong>Time</strong><small>Simulated min</small></label></div></div><div class="form-actions"><button class="btn btn-primary" type="submit">Compare hospitals <span>→</span></button></div></form><div id="recommendation" class="recommendation"><span class="eyebrow">Recommendation</span><h3>Waiting for a comparison</h3><p>The first reachable hospital will be recommended after the backend ranks all destinations.</p></div></section><section class="panel"><div class="panel-header"><div><h2>Hospital results</h2><p id="nearestSubtitle">No comparison run yet.</p></div><span class="pill green">Reachability explicit</span></div><div id="hospitalResults" class="hospital-list"><div class="route-result empty">Run a comparison to populate actual route costs.</div></div></section></div>`;
}

function hospitalCardMarkup(item, index, recommendedId) {
  const isRecommended = item.id === recommendedId;
  return `<article class="hospital-card ${isRecommended ? 'recommended' : ''}"><div class="hospital-icon">✚</div><div><h3>${item.name}</h3><small>${item.identifier} · ${item.id}</small><div class="hospital-metrics"><span>Distance <b>${formatKm(item.distanceKm)}</b></span><span>Time <b>${formatMinutes(item.timeMinutes)}</b></span></div>${item.reachable ? `<div class="path-strip" style="margin-top:10px">${item.path.map((id, pathIndex) => `${pathIndex ? '<span class="path-arrow">→</span>' : ''}<span class="path-node">${id}</span>`).join('')}</div>` : ''}</div><div class="hospital-status"><span class="pill ${item.reachable ? 'green' : 'red'}">${item.reachable ? (isRecommended ? 'Recommended' : 'Reachable') : 'Unreachable'}</span><small>${item.reachable ? `${item.cost.toFixed(1)} ${item.optimization === 'time' ? 'min cost' : 'km cost'}` : 'No connected path'}</small></div></article>`;
}

async function setupNearest() {
  $('#nearestStart').value = 'HQ';
  $('#nearestForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const startId = $('#nearestStart').value;
    const optimization = $('input[name="nearestOptimization"]:checked').value;
    const resultsBox = $('#hospitalResults');
    resultsBox.innerHTML = '<div class="route-result empty">Ranking hospitals by actual graph cost…</div>';
    try {
      const data = await api('/api/hospitals/nearest', { method: 'POST', body: JSON.stringify({ startId, optimization }) });
      state.nearestResult = data;
      $('#nearestSubtitle').textContent = `From ${titleForNode(startId)} · ranked by ${optimization === 'time' ? 'simulated time' : 'road distance'}`;
      resultsBox.innerHTML = data.results.map((item, index) => hospitalCardMarkup(item, index, data.recommended?.id)).join('');
      const recommendation = $('#recommendation');
      if (data.recommended) recommendation.innerHTML = `<span class="eyebrow">Recommended hospital</span><h3>${data.recommended.name}</h3><p>${data.recommended.identifier} · ${formatKm(data.recommended.distanceKm)} · ${formatMinutes(data.recommended.timeMinutes)}<br />Path: ${data.recommended.path.join(' → ')}</p>`;
      else recommendation.innerHTML = '<span class="eyebrow">No recommendation</span><h3>No reachable hospital</h3><p>Keep the unreachable state explicit; this graph has no valid destination from the selected start.</p>';
      showToast('Hospital comparison complete.');
    } catch (error) { displayError(resultsBox, error); }
  });
}

function visualizerTemplate() {
  return `<div class="page-intro"><div><span class="eyebrow">Execution evidence</span><h1>Algorithm visualizer</h1><p>Step through the exact backend trace. Visited nodes, relaxations, distances, and the final path are all generated by Dijkstra.</p></div><span class="pill blue">Priority queue trace</span></div><div class="visualizer-layout"><section class="panel trace-panel"><div class="panel-header"><div><h2>Simulation controls</h2><p>Change inputs, then step through the run.</p></div><div class="trace-controls"><button class="btn btn-secondary" id="traceReset">Reset</button><button class="btn btn-secondary" id="tracePrev">← Previous</button><button class="btn btn-primary" id="traceNext">Next step →</button><button class="btn btn-secondary" id="traceRun">Run to completion</button></div></div><div class="form-grid" style="margin-bottom:18px"><div class="field"><label for="traceStart">Start node</label><select id="traceStart">${selectOptions(state.locations)}</select></div><div class="field"><label for="traceDestination">Destination hospital</label><select id="traceDestination">${selectOptions(state.hospitals)}</select></div><div class="field full"><label>Metric</label><div class="radio-group"><label class="radio-card"><input type="radio" name="traceOptimization" value="distance" checked /><strong>Distance weights</strong><small>Show km relaxation</small></label><label class="radio-card"><input type="radio" name="traceOptimization" value="time" /><strong>Time weights</strong><small>Show minute relaxation</small></label></div></div></div><div id="traceGraph">${graphSvg()}</div></section><section class="panel"><div class="panel-header"><div><h2>Execution steps</h2><p id="traceSummary">Loading trace…</p></div><span class="trace-step" id="traceStepCounter">Step 0 / 0</span></div><div id="traceList" class="trace-list"><div class="route-result empty">Requesting backend trace…</div></div></section></div><section class="panel" style="margin-top:18px"><div class="panel-header"><div><h2>Distance table</h2><p>Current best-known cost after each step.</p></div><span class="pill amber">∞ = not reached</span></div><div class="table-wrap" id="distanceTable"><div class="route-result empty">Distance table appears when the trace is ready.</div></div></section>`;
}

function renderTraceState() {
  const result = state.traceResult;
  if (!result) return;
  const step = result.steps[Math.min(state.traceIndex, Math.max(0, result.steps.length - 1))] || { visited: [], distances: {} };
  const path = state.traceIndex >= result.steps.length - 1 ? result.path : [];
  $('#traceGraph').innerHTML = graphSvg({ startId: result.startId, destinationId: result.destinationId, visited: step.visited, current: step.current, path });
  $('#traceStepCounter').textContent = `Step ${Math.min(state.traceIndex + 1, result.steps.length)} / ${result.steps.length}`;
  $('#traceSummary').textContent = `${result.queueRemovals} priority-queue removals · final cost ${result.cost ?? 'unreachable'}`;
  $('#traceList').innerHTML = result.steps.map((item, index) => `<div class="trace-row ${index === state.traceIndex ? 'active' : ''}"><span class="trace-index">${index + 1}</span><div><strong>Visit ${item.current} <span style="color:var(--muted);font-weight:500">· queue ${item.queueSize}</span></strong><p>${item.relaxed.length ? `Relaxed ${item.relaxed.map((edge) => `${edge.to} to ${edge.cost}`).join(', ')}.` : 'No lower-cost neighbor found on this visit.'} Visited: ${item.visited.join(' → ')}.</p></div></div>`).join('');
  const tableEntries = state.graph.nodes.map((node) => `<tr><td>${node.id}</td><td class="${step.distances[node.id] === null ? 'infinite' : 'known'}">${step.distances[node.id] === null ? '∞' : step.distances[node.id].toFixed(2)}</td><td>${titleForNode(node.id)}</td></tr>`).join('');
  $('#distanceTable').innerHTML = `<table class="distance-table"><thead><tr><th>Node</th><th>${result.optimization === 'time' ? 'Best time' : 'Best distance'}</th><th>Meaning</th></tr></thead><tbody>${tableEntries}</tbody></table>`;
  $$('.trace-row').forEach((row, index) => row.addEventListener('click', () => { state.traceIndex = index; renderTraceState(); }));
}

async function loadTrace() {
  const startId = $('#traceStart').value;
  const destinationId = $('#traceDestination').value;
  const optimization = $('input[name="traceOptimization"]:checked').value;
  $('#traceSummary').textContent = 'Requesting backend trace…';
  try {
    state.traceResult = await api('/api/routes/trace', { method: 'POST', body: JSON.stringify({ startId, destinationId, optimization }) });
    state.traceIndex = 0;
    renderTraceState();
  } catch (error) { $('#traceSummary').textContent = error.message; $('#traceList').innerHTML = `<div class="callout" style="border-color:var(--red);background:var(--red-soft);color:#a33443">${error.message}</div>`; }
}

async function setupVisualizer() {
  $('#traceStart').value = 'HQ'; $('#traceDestination').value = 'H1';
  $('#traceStart').addEventListener('change', loadTrace); $('#traceDestination').addEventListener('change', loadTrace);
  $$('input[name="traceOptimization"]').forEach((radio) => radio.addEventListener('change', loadTrace));
  $('#traceNext').addEventListener('click', () => { if (state.traceResult) { state.traceIndex = Math.min(state.traceIndex + 1, state.traceResult.steps.length - 1); renderTraceState(); } });
  $('#tracePrev').addEventListener('click', () => { if (state.traceResult) { state.traceIndex = Math.max(state.traceIndex - 1, 0); renderTraceState(); } });
  $('#traceRun').addEventListener('click', () => { if (state.traceResult) { state.traceIndex = Math.max(0, state.traceResult.steps.length - 1); renderTraceState(); showToast('Trace completed.'); } });
  $('#traceReset').addEventListener('click', () => { state.traceResult = null; state.traceIndex = 0; loadTrace(); showToast('Trace reset.'); });
  await loadTrace();
}

async function renderPage(page) {
  const templates = { home: homeTemplate, route: routeTemplate, nearest: nearestTemplate, visualizer: visualizerTemplate };
  const activePage = templates[page] ? page : 'home';
  shellView(activePage);
  if (!state.graph) { app.innerHTML = '<div class="route-result empty">Loading the deterministic route network…</div>'; return; }
  app.innerHTML = templates[activePage]();
  if (activePage === 'route') await setupRoute();
  if (activePage === 'nearest') await setupNearest();
  if (activePage === 'visualizer') await setupVisualizer();
  app.focus({ preventScroll: true });
}

function currentPage() {
  const hashValue = window.location.hash.replace(/^#\/?/, '').split('/')[0];
  if (hashValue) return hashValue;
  const pathValue = window.location.pathname.replace(/^\//, '').split('/')[0];
  return pathValue || 'home';
}

async function boot() {
  try {
    const [graphData, locationData, hospitalData] = await Promise.all([api('/api/graph'), api('/api/locations'), api('/api/hospitals')]);
    state.graph = graphData; state.locations = locationData.locations; state.hospitals = hospitalData.hospitals;
    await renderPage(currentPage());
  } catch (error) { app.innerHTML = `<div class="callout" style="border-color:var(--red);background:var(--red-soft);color:#a33443"><strong>Preview server unavailable</strong><br>${error.message}</div>`; }
}

window.addEventListener('hashchange', () => renderPage(currentPage()));
$('#helpButton').addEventListener('click', () => $('#helpModal').showModal());
$('#closeHelp').addEventListener('click', () => $('#helpModal').close());
$('#helpModal').addEventListener('click', (event) => { if (event.target === $('#helpModal')) $('#helpModal').close(); });
boot();
