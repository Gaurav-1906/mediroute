# MediRoute

MediRoute is an explainable academic ambulance route-finding simulator. It demonstrates a weighted graph, Dijkstra's shortest-path algorithm, path reconstruction, nearest-hospital ranking, and a backend-generated execution trace through a focused responsive dashboard.

> **Safety boundary:** this is a simulated academic environment. Distances and travel times are deterministic sample data. MediRoute does not dispatch ambulances, use live traffic, or provide verified emergency directions.

## Run locally

The project intentionally has no runtime dependency install step. Use Node 18 or newer:

```bash
npm start
```

The app listens on `PORT` when provided, otherwise on port `3000`. The Preview server uses the same port. A syntax check is available with:

```bash
npm run check
```

## Included views

The command center shows the dataset counts and a compact road network. Route Finder posts to the backend with either distance or simulated-time optimization and renders the returned route. Nearest Hospital runs the same graph calculation to every hospital, sorts reachable results by the selected cost, and leaves unreachable hospitals visible. Algorithm Visualizer loads the backend step trace and supports next, previous, reset, and run-to-completion controls.

## API contract

All POST bodies are JSON. Identifiers must exist in the deterministic graph. A malformed JSON body or missing/unknown identifier returns `400`. A valid but disconnected route returns `422` with the partial result and an explicit error. Unexpected internal errors do not expose stack traces.

| Method | Endpoint | Request | Purpose |
|---|---|---|---|
| GET | `/api/health` | — | Service and graph health |
| GET | `/api/locations` | — | Simulated ambulance start locations |
| GET | `/api/hospitals` | — | Hospital nodes and identifiers |
| GET | `/api/graph` | — | Nodes, weighted roads, and derived counts |
| POST | `/api/routes/shortest` | `{ startId, destinationId }` | Dijkstra using distance weights |
| POST | `/api/routes/fastest` | `{ startId, destinationId }` | Dijkstra using simulated-time weights |
| POST | `/api/hospitals/nearest` | `{ startId, optimization: "distance"|"time" }` | Rank all hospitals by actual graph cost |
| POST | `/api/routes/trace` | `{ startId, destinationId, optimization }` | Return visit, relaxation, queue, distance, and path evidence |

Route responses include `distanceKm`, `timeMinutes`, `visitedNodeCount`, `queueRemovals`, `segments`, `path`, `distanceTable`, and `optimization`. The trace response additionally includes ordered `steps`; each step records the current node, visited nodes, best-known distances, relaxed edges, queue size, and queue removals.

## DSA notes

The graph is built as an adjacency list. Roads are inserted in both directions, with separate non-negative `distance` and `time` weights. A custom binary min-heap is used as the priority queue. Dijkstra stores predecessor links so the returned path is reconstructed from the destination back to the selected start. With an adjacency list and binary heap, expected complexity is `O((V + E) log V)` under the standard implementation assumptions.

BFS is not used for the main answer because BFS minimizes edge count, not total weighted distance or time. It can return a route with fewer road segments that is physically longer or slower.

The graph includes multiple alternatives, a direct-but-expensive edge, routes with different distance/time trade-offs, an alternate hospital, an equal-cost opportunity, and a disconnected hospital connected only to the Hilltop Outpost component.

## Java/Spring academic expansion

The preview implementation keeps the app runnable without a Java toolchain, while preserving the requested backend boundary and REST contract. For a full college submission, port `nodes`, `edges`, `dijkstra`, and `nearestResponse` into Java 17/Spring Boot 3 services: `WeightedGraph` owns adjacency lists, `DijkstraService` owns the priority queue and predecessor map, and REST controllers map the same endpoint shapes. Add Jakarta Bean Validation for request DTOs, JUnit 5 and TestNG suites, Selenium WebDriver tests, JaCoCo Maven reporting, and a JMeter plan. Keep the deterministic network as a shared fixture so the UI and independent tests can verify exact expected values.

## Reports and limitations

Static sample roads, simulated travel times, and the lightweight Node preview server are known limitations and are visible in the interface.
