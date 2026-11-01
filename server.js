const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, 'public');

const nodes = [
  { id: 'HQ', name: 'Central Command', type: 'location', x: 50, y: 49 },
  { id: 'NORTH', name: 'North Junction', type: 'location', x: 48, y: 22 },
  { id: 'WEST', name: 'West End', type: 'location', x: 22, y: 54 },
  { id: 'EAST', name: 'East Market', type: 'location', x: 77, y: 34 },
  { id: 'SOUTH', name: 'South Gate', type: 'location', x: 52, y: 76 },
  { id: 'PARK', name: 'Park Avenue', type: 'location', x: 73, y: 61 },
  { id: 'RIVER', name: 'Riverside', type: 'location', x: 86, y: 78 },
  { id: 'STATION', name: 'Fire Station', type: 'location', x: 28, y: 82 },
  { id: 'HILL', name: 'Hilltop Outpost', type: 'location', x: 13, y: 19 },
  { id: 'H1', name: 'City General', type: 'hospital', identifier: 'H-101', x: 91, y: 23 },
  { id: 'H2', name: "St. Mary's Medical", type: 'hospital', identifier: 'H-204', x: 36, y: 92 },
  { id: 'H3', name: 'Horizon Trauma Centre', type: 'hospital', identifier: 'H-309', x: 87, y: 10 }
];

const edges = [
  { id: 'R-01', from: 'HQ', to: 'NORTH', distance: 2.4, time: 4.5 },
  { id: 'R-02', from: 'HQ', to: 'WEST', distance: 2.8, time: 5.0 },
  { id: 'R-03', from: 'HQ', to: 'EAST', distance: 4.5, time: 7.0 },
  { id: 'R-04', from: 'NORTH', to: 'EAST', distance: 2.0, time: 3.0 },
  { id: 'R-05', from: 'NORTH', to: 'PARK', distance: 2.1, time: 4.0 },
  { id: 'R-06', from: 'WEST', to: 'SOUTH', distance: 3.2, time: 5.0 },
  { id: 'R-07', from: 'SOUTH', to: 'EAST', distance: 1.8, time: 3.5 },
  { id: 'R-08', from: 'SOUTH', to: 'STATION', distance: 1.0, time: 2.0 },
  { id: 'R-09', from: 'PARK', to: 'EAST', distance: 1.5, time: 2.5 },
  { id: 'R-10', from: 'STATION', to: 'RIVER', distance: 1.8, time: 3.0 },
  { id: 'R-11', from: 'RIVER', to: 'EAST', distance: 1.7, time: 2.8 },
  { id: 'R-12', from: 'EAST', to: 'H1', distance: 1.4, time: 2.5 },
  { id: 'R-13', from: 'SOUTH', to: 'H2', distance: 1.2, time: 2.1 },
  { id: 'R-14', from: 'PARK', to: 'H1', distance: 1.5, time: 2.8 },
  { id: 'R-15', from: 'HILL', to: 'H3', distance: 1.1, time: 1.8 }
];

const nodeById = new Map(nodes.map((node) => [node.id, node]));
const adjacency = new Map(nodes.map((node) => [node.id, []]));
for (const edge of edges) {
  adjacency.get(edge.from).push({ ...edge, to: edge.to });
  adjacency.get(edge.to).push({ ...edge, from: edge.from, to: edge.from });
}

class MinHeap {
  constructor() { this.items = []; }
  push(item) {
    this.items.push(item);
    let index = this.items.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.items[parent].priority <= item.priority) break;
      this.items[index] = this.items[parent];
      index = parent;
    }
    this.items[index] = item;
  }
  pop() {
    if (!this.items.length) return null;
    const root = this.items[0];
    const tail = this.items.pop();
    if (this.items.length && tail) {
      let index = 0;
      while (true) {
        const left = index * 2 + 1;
        const right = left + 1;
        let smallest = index;
        if (left < this.items.length && this.items[left].priority < tail.priority) smallest = left;
        if (right < this.items.length && this.items[right].priority < (smallest === index ? tail.priority : this.items[smallest].priority)) smallest = right;
        if (smallest === index) break;
        this.items[index] = this.items[smallest];
        index = smallest;
      }
      this.items[index] = tail;
    }
    return root;
  }
  get size() { return this.items.length; }
}

function validateId(id, label) {
  if (typeof id !== 'string' || !id.trim()) return `${label} is required.`;
  if (!nodeById.has(id)) return `Unknown ${label.toLowerCase()} '${id}'.`;
  return null;
}

function validateOptimization(value) {
  return value === 'time' || value === 'distance' ? null : "optimization must be 'distance' or 'time'.";
}

function snapshotDistances(distances) {
  return Object.fromEntries(nodes.map((node) => [node.id, Number.isFinite(distances[node.id]) ? Number(distances[node.id].toFixed(2)) : null]));
}

function reconstructPath(previous, start, destination) {
  const pathResult = [];
  let current = destination;
  while (current) {
    pathResult.unshift(current);
    if (current === start) return pathResult;
    current = previous[current];
  }
  return [];
}

function dijkstra(start, destination, optimization = 'distance', buildTrace = false) {
  const weightKey = optimization === 'time' ? 'time' : 'distance';
  const distances = Object.fromEntries(nodes.map((node) => [node.id, Infinity]));
  const previous = {};
  const visited = [];
  const heap = new MinHeap();
  const steps = [];
  let queueRemovals = 0;
  distances[start] = 0;
  heap.push({ nodeId: start, priority: 0 });

  while (heap.size) {
    const currentItem = heap.pop();
    queueRemovals += 1;
    if (!currentItem || currentItem.priority !== distances[currentItem.nodeId] || visited.includes(currentItem.nodeId)) continue;
    const current = currentItem.nodeId;
    visited.push(current);
    const step = {
      index: steps.length,
      action: 'visit',
      current,
      visited: [...visited],
      distances: snapshotDistances(distances),
      relaxed: [],
      queueRemovals,
      queueSize: heap.size
    };
    if (current === destination) {
      if (buildTrace) steps.push(step);
      break;
    }
    for (const edge of adjacency.get(current) || []) {
      if (visited.includes(edge.to)) continue;
      const candidate = distances[current] + edge[weightKey];
      if (candidate < distances[edge.to]) {
        distances[edge.to] = candidate;
        previous[edge.to] = current;
        heap.push({ nodeId: edge.to, priority: candidate });
        step.relaxed.push({ from: current, to: edge.to, cost: Number(candidate.toFixed(2)) });
      }
    }
    step.distances = snapshotDistances(distances);
    step.queueSize = heap.size;
    if (buildTrace) steps.push(step);
  }

  const path = reconstructPath(previous, start, destination);
  const reachable = path.length > 0;
  let totalDistance = 0;
  let totalTime = 0;
  const segments = [];
  for (let index = 0; index < path.length - 1; index += 1) {
    const from = path[index];
    const to = path[index + 1];
    const edge = (adjacency.get(from) || []).find((candidate) => candidate.to === to);
    if (edge) {
      totalDistance += edge.distance;
      totalTime += edge.time;
      segments.push(edge.id);
    }
  }
  const cost = reachable ? (optimization === 'time' ? totalTime : totalDistance) : null;
  return {
    startId: start,
    destinationId: destination,
    optimization,
    reachable,
    cost: cost === null ? null : Number(cost.toFixed(2)),
    distanceKm: reachable ? Number(totalDistance.toFixed(2)) : null,
    timeMinutes: reachable ? Number(totalTime.toFixed(1)) : null,
    path,
    segments,
    visitedNodes: visited,
    visitedNodeCount: visited.length,
    queueRemovals,
    distanceTable: snapshotDistances(distances),
    steps
  };
}

function routeResponse(body, optimization) {
  if (!body || typeof body !== 'object') return { status: 400, payload: { error: 'Request body must be a JSON object.' } };
  const startError = validateId(body.startId, 'Start location');
  const destinationError = validateId(body.destinationId, 'Destination hospital');
  if (startError || destinationError) return { status: 400, payload: { error: startError || destinationError } };
  const result = dijkstra(body.startId, body.destinationId, optimization);
  return result.reachable
    ? { status: 200, payload: result }
    : { status: 422, payload: { error: `No route exists from ${body.startId} to ${body.destinationId}.`, result } };
}

function nearestResponse(body) {
  if (!body || typeof body !== 'object') return { status: 400, payload: { error: 'Request body must be a JSON object.' } };
  const startError = validateId(body.startId, 'Start location');
  const optimizationError = validateOptimization(body.optimization || 'distance');
  if (startError || optimizationError) return { status: 400, payload: { error: startError || optimizationError } };
  const optimization = body.optimization || 'distance';
  const results = nodes.filter((node) => node.type === 'hospital').map((hospital) => {
    const result = dijkstra(body.startId, hospital.id, optimization);
    return { ...hospital, ...result, status: result.reachable ? 'Reachable' : 'Unreachable' };
  });
  const reachable = results.filter((result) => result.reachable).sort((a, b) => a.cost - b.cost);
  const unreachable = results.filter((result) => !result.reachable);
  return { status: 200, payload: { startId: body.startId, optimization, recommended: reachable[0] || null, results: [...reachable, ...unreachable] } };
}

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; if (raw.length > 1000000) reject(new Error('Request too large')); });
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch { reject(new Error('Malformed JSON request.')); }
    });
    req.on('error', reject);
  });
}

function serveStatic(req, res, pathname) {
  const cleanPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.resolve(PUBLIC_DIR, `.${cleanPath}`);
  if (!filePath.startsWith(PUBLIC_DIR)) return json(res, 403, { error: 'Forbidden.' });
  fs.readFile(filePath, (error, data) => {
    if (error && ['/', '/route', '/nearest', '/visualizer'].includes(pathname)) {
      return fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (fallbackError, fallbackData) => {
        if (fallbackError) return json(res, 404, { error: 'Not found.' });
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
        res.end(fallbackData);
      });
    }
    if (error) return json(res, 404, { error: 'Not found.' });
    const ext = path.extname(filePath);
    const contentType = {
      '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon'
    }[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = requestUrl.pathname;
  try {
    if (pathname === '/api/health' && req.method === 'GET') return json(res, 200, { status: 'ok', service: 'MediRoute API', graph: { nodes: nodes.length, roads: edges.length } });
    if (pathname === '/api/locations' && req.method === 'GET') return json(res, 200, { locations: nodes.filter((node) => node.type === 'location') });
    if (pathname === '/api/hospitals' && req.method === 'GET') return json(res, 200, { hospitals: nodes.filter((node) => node.type === 'hospital') });
    if (pathname === '/api/graph' && req.method === 'GET') return json(res, 200, { nodes, edges, counts: { nodes: nodes.length, locations: nodes.filter((node) => node.type === 'location').length, hospitals: nodes.filter((node) => node.type === 'hospital').length, roads: edges.length } });
    if (pathname === '/api/routes/shortest' && req.method === 'POST') { const result = routeResponse(await readBody(req), 'distance'); return json(res, result.status, result.payload); }
    if (pathname === '/api/routes/fastest' && req.method === 'POST') { const result = routeResponse(await readBody(req), 'time'); return json(res, result.status, result.payload); }
    if (pathname === '/api/hospitals/nearest' && req.method === 'POST') { const result = nearestResponse(await readBody(req)); return json(res, result.status, result.payload); }
    if (pathname === '/api/routes/trace' && req.method === 'POST') {
      const body = await readBody(req);
      const startError = validateId(body.startId, 'Start location');
      const destinationError = validateId(body.destinationId, 'Destination hospital');
      const optimizationError = validateOptimization(body.optimization || 'distance');
      if (startError || destinationError || optimizationError) return json(res, 400, { error: startError || destinationError || optimizationError });
      return json(res, 200, dijkstra(body.startId, body.destinationId, body.optimization || 'distance', true));
    }
    if (pathname.startsWith('/api/')) return json(res, 404, { error: 'API endpoint not found.' });
    if (req.method === 'GET') return serveStatic(req, res, pathname);
    return json(res, 405, { error: 'Method not allowed.' });
  } catch (error) {
    const status = error.message === 'Malformed JSON request.' ? 400 : 500;
    return json(res, status, { error: status === 400 ? error.message : 'Unexpected server error.' });
  }
});

server.listen(PORT, '0.0.0.0', () => console.log(`MediRoute listening on http://0.0.0.0:${PORT}`));
