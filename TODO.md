# MediRoute Delivery Checklist

## Application shell and visual identity

- [x] Provide MediRoute branding, an original cross-plus-route mark, the tagline “Every Second Counts. Every Route Matters.”, persistent navigation, responsive layout, clear blue primary actions, restrained red emergency markers, green success states, and a visible academic simulation disclaimer.
- [x] Keep all displayed graph, location, hospital, and road counts derived from the deterministic application dataset.

## Home Dashboard

- [x] Include Find a Route and Explore Algorithm actions, Dijkstra explanation, dataset summary cards, compact road-network preview, recent calculation panel, and simulated-data notice.

## Ambulance Route Finder

- [x] Provide ambulance start selection, destination hospital selection, shortest-distance and fastest-time optimization, Find Route and Reset controls.
- [x] Run the authoritative calculation through backend REST endpoints rather than frontend-only JavaScript.
- [x] Show an SVG road network with distinct ambulance, intersection, hospital, and highlighted-route states.
- [x] Show distance, estimated travel time, visited-node count, road-segment count, metric, and human-readable route sequence.
- [x] Handle missing, unknown, same-node, and unreachable inputs with explicit status messaging.

## Nearest Hospital

- [x] Select an ambulance location and optimization metric, calculate every hospital using actual graph cost, sort reachable hospitals by the selected metric, and keep unreachable hospitals visible and explicitly marked.
- [x] Show hospital identifier, distance, simulated travel time, route sequence, reachability, recommendation, and limitations note.

## DSA Algorithm Visualizer

- [x] Display the weighted graph, node IDs, edge weights, start/destination, visited nodes, current node, final path, distance table, trace steps, queue-removal count, and final cost.
- [x] Provide Start Simulation, Previous, Next Step, Run to Completion, and Reset controls.
- [x] Drive the visual state from the backend `/api/routes/trace` response.

## Testing and quality dashboard

- [x] Report functional, ECP/BVA, Selenium/TestNG, JaCoCo, and JMeter sections without fabricating unavailable metrics.
- [x] Use “Not run yet” / “No report available” for absent generated reports and document known limitations.

## REST and algorithm

- [x] Expose GET `/api/health`, `/api/locations`, `/api/hospitals`, `/api/graph`.
- [x] Expose POST `/api/routes/shortest`, `/api/routes/fastest`, `/api/hospitals/nearest`, `/api/routes/trace`.
- [x] Validate identifiers, optimization modes, empty/malformed requests, negative weights in graph construction, same-node routes, and unreachable destinations.
- [x] Use an adjacency list, non-negative distance/time weights, a priority queue, predecessor-based path reconstruction, and an execution trace.
- [x] Explain expected `O((V + E) log V)` complexity and why BFS is not sufficient for weighted minimum-distance routing.

## Documentation and quality evidence

- [x] Document local run commands, endpoint formats, response semantics, simulated-data safety boundary, and Java/Spring porting notes in `README.md`.
- [ ] Add the team's Java 17/Spring Boot 3 implementation and Maven/JUnit/TestNG/Selenium/JaCoCo/JMeter reports when the academic submission repository is expanded.
