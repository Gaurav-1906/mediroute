# MediRoute Implementation Plan

## Scope and approach

MediRoute is a competition-ready academic simulator for ambulance route finding. The deliverable is a dependency-light web application that runs from one command, keeps the graph deterministic and explainable, and exposes REST endpoints so the interface is not performing the authoritative route calculation.

The backend is a small Node HTTP service for the runnable preview. It owns the weighted adjacency-list graph, a custom binary min-heap used as the priority queue, Dijkstra for distance and simulated time, path reconstruction, nearest-hospital ranking, validation, and execution traces. The same domain concepts are intentionally simple enough to port to Java/Spring Boot for the team's academic submission; the README documents that boundary and the API contract.

The frontend is semantic HTML, CSS, and vanilla JavaScript. It uses hash routes for the five required views and renders the deterministic network as an SVG so the route, markers, edge weights, visited nodes, and algorithm state remain visible without relying on a map provider or live traffic data.

## Project structure

- `server.js`: HTTP server, graph data, Dijkstra implementation, trace generation, REST endpoint handlers, and static file serving.
- `public/index.html`: application shell and view templates.
- `public/styles.css`: visual system, responsive layout, cards, tables, graph state, and motion.
- `public/app.js`: API client, hash router, SVG graph renderer, page controllers, and visualizer controls.
- `public/manus-routes.json`: declared top-level page routes for Preview and publication.
- `README.md`: run instructions, API contract, algorithm explanation, test/report status, and Java/Spring migration notes.
- `TODO.md`: requirement-level delivery checklist.

## Design direction

**Candidate styles:** clinical operations console (0.07); civic wayfinding atlas (0.05); precision dispatch desk (0.08).

**Chosen movement:** precision dispatch desk — a calm emergency-operations interface that pairs a dark navy command rail with clean paper-like surfaces and precise blue route markings.

**Core principles:** (1) decision-first hierarchy, (2) visible algorithm evidence, (3) clear emergency semantics without alarmist clutter, (4) explainable numbers over decorative metrics.

**Color philosophy:** deep navy creates trust and focus; clear blue owns the product's route/path identity; soft blue surfaces separate analytical layers; red is reserved for ambulance and hospital emergency markers; green signals a completed calculation; warm amber calls out simulated-data limits.

**Layout paradigm:** a persistent command rail anchors navigation while each screen uses a wide workbench: controls and evidence sit side-by-side, with the road network acting as the visual spine rather than a centered marketing hero.

**Signature elements:** a cross-and-route wordmark; small uppercase telemetry labels; blue route strokes with circular node markers and compact edge annotations.

**Interaction philosophy:** every action produces visible evidence. Route controls update summaries, route lines, and path sequences together. Visualizer controls move through actual backend trace steps, never through a decorative timer.

**Animation:** use short 180–260ms transitions for view changes, card reveal, route drawing, and node state changes. No looping motion or attention-grabbing pulses beyond a restrained live-status dot.

**Typography:** use a system sans stack for reliable preview rendering; weight and letter spacing establish hierarchy, with compact mono labels for IDs, route costs, and test states.

**Brand essence:** an explainable ambulance-routing lab for DSA students and reviewers; precise, calm, demonstrable.

**Brand voice:** direct and evidence-led. Example lines: “Choose a start point. We’ll show the work.” and “This route is simulated, so every number is inspectable.”

**Wordmark and logo:** a rounded square medical cross intersected by a blue route line, followed by the MediRoute wordmark.

**Signature brand color:** `#1e6fe8`, the route-blue used for primary actions, edges, focus states, and path evidence.

## Build and run workflow

Run `npm start` from the project root. The service listens on `PORT` or 3000 and serves both the dashboard and `/api/*`. Before delivery, verify `/api/health`, `/api/graph`, `/api/routes/shortest`, `/api/hospitals/nearest`, `/api/routes/trace`, and `/manus-routes.json`, then exercise the route and visualizer views in Preview.
