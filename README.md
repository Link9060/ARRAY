# RAVIN ARRAY
> **Deploy intelligence.** A spatial command center for launching and monitoring RAVIN agents within the ARROW ecosystem.

**Project:** ARROW / RAVIN ARRAY  
**Repository:** `Link9060/ARRAY`  
**Status:** v0.1 interface prototype (the live execution service is not connected yet)  
**Canonical product name:** RAVIN ARRAY (UI may display `RAVIN / ARRAY`)  
**Last product spec update:** 2026-10-15

---

## 1. What we are building

RAVIN ARRAY transforms AI agent management into a cinematic, precise, navigable *launch array*. Instead of a conventional list of chatbots, users interact with four visual formations of agent nodes positioned around a large central RAVIN Core node. They configure a mission from a grounded command panel at the bottom of the screen, deploy a selected agent with a restrained abstract launch animation, and switch to a **Flight Monitor** showing symbolic trajectories, real execution events (once a backend is attached), and results.

The missile-silo / flight-path idea is a **visual metaphor for deploying software workers**, not a weapons system. Keep everything abstract and suitable for an everyday productivity application. There is no physical targeting, armament, or real-world missile functionality.

**North star:** Make deploying a useful AI agent feel as deliberate and satisfying as operating a premium spacecraft interface, while remaining immediately understandable and accessible.

### Product principles
1. **Clarity over spectacle:** every animation must explain state, not obscure it.
2. **Truthful telemetry:** never claim a simulated mission is real work; never invent a guaranteed ETA or progress percent from elapsed time.
3. **Human control:** users can inspect agent scope, set an objective, approve sensitive actions, and cancel jobs.
4. **Single source of truth:** mission execution is controlled by a backend adapter, not a visual animation.
5. **ARROW quality:** refined monochrome surfaces, pale spectral accents, generous spacing, strong typography, subtle motion.
6. **Small-screen first-class:** no tiny targets, horizontal overflow, or inaccessible hover-only controls.
7. **Security boundaries:** client-side checks are UX only; server enforces auth, tool permissions, and job ownership.

## 2. Product structure

### Primary view A: Launch Array
- **Center:** a visually dominant RAVIN Core orb; activation is a shortcut to the RAVIN chat. The destination is configurable with `VITE_RAVIN_CHAT_URL`.
- **Four arrays:** 2 × 2 category formations around RAVIN Core. Each formation has a category title, short description, and agent launch nodes (dots).
- **Individual node:** corresponds to one registered agent. Hover / focus reveals identity and role. Clicking selects the agent and updates bottom command controls.
- **Status language:** standby, selected, deploying, active, complete, attention. Accessible labels and text accompany color or animation.
- **Bottom command deck:** current category, selected agent, objective text, execution policy, and Launch action. Launch is disabled without a valid task.
- **Deployment animation:** charging ring, brief vertical vector streak, fading trail and node state transition. Honor reduced motion.
- **Global header:** brand, demo/live status, view switch, active mission count.

### Primary view B: Flight Monitor
- A symbolic mission trajectory map showing active agents as markers along dashed paths. A path is an illustration of work passing through stages, **not a geographical route**.
- Separate mission list/cards with agent name, user objective, phase, elapsed time, real backend progress if reported, trustworthy ETA if supported, and controls.
- Clicking a mission reveals phase history and details.
- Always distinguish idle/no missions, offline, queued, running, waiting approval, succeeded, failed, canceled.
- Mission output / artifacts and transparent logs are a later backend-dependent milestone.

### Four categories (initial taxonomy)

| Category | Intent | Example agents |
| --- | --- | --- |
| **Intelligence** | Investigate, verify, understand | Scout, Analyst, Researcher, Auditor, Synthesist, Pathfinder |
| **Creation** | Write, design, build | Architect, Builder, Designer, Writer, Prototyper, Refiner |
| **Coordination** | Plan, structure, orchestrate | Planner, Navigator, Scheduler, Organizer, Strategist, Dispatcher |
| **Execution** | Operate with explicit permissions | Operator, Monitor, Integrator, Tester, Reporter, Maintainer |

Names are **initial UI registry fixtures**, not assertions that model tools or capabilities are already connected. The registry must be replaceable with a backend-supplied catalog.

## 3. Core experience / user journey

1. Open ARRAY: all four arrays are visible, with central RAVIN Core orb.
2. Select an agent node: surface the agent's role, description, category and readiness.
3. Write the requested objective in the bottom command panel.
4. Choose a policy:
   - **Review first:** external effects require explicit approval.
   - **Assist only:** analysis or suggestions, no external changes.
   - **Authorized:** permitted operations only after server-side authorization (future live backend).
5. Hit **Launch**: create a mission record with id, agent id, objective, mode and timestamps; animate the selected node as presentation only.
6. Switch to **Flight Monitor** to examine the mission lifecycle and trajectory visualization.
7. Pause, cancel, review, or inspect actual results when the backend supports each action.
8. Return to Launch Array for another deployment; RAVIN Core remains a direct chat shortcut.

### Agent cardinality / scalability
Start with six agent fixtures per formation (24 total). The layout should scale to different categories and agent counts without position assumptions; agents should be data-driven. Do not assume 24 is a permanent limit.

## 4. Technical plan

### Initial stack
- **Vite + React + TypeScript** for fast local development and a production static build.
- **CSS** design tokens, gradients, CSS / SVG animation, responsive grid.
- **Lucide React** for UI icons.
- No required server, secret, deployment vendor, or account connection in the first cut.

### Folder map (target)
```text
/
  README.md                 Product truth and development reference
  package.json              App scripts and dependencies
  index.html                HTML shell
  tsconfig.json             TypeScript setup
  vite.config.ts            Vite configuration
  .gitignore                Local output exclusions
  src/
    main.tsx                React mount
    App.tsx                 Page and interaction composition
    styles.css              Tokens, UI layout, effects, responsive styles
    data/agents.ts          Categories + initial agent registry
    engine/mission.ts       Mission types, lifecycle, truthful demo adapter
  tests/
    mission.test.ts         Mission behavior and state tests
```

### Commands
```bash
npm install
npm run dev
npm run build
npm run test
npm run preview
```

Local development expects Node 20.19+ or 22.12+ for current Vite releases.

### Integration boundary
The React page must not directly call arbitrary third-party model APIs from the browser. RAVIN Core / agent backend should eventually provide an authenticated mission API. Proposed endpoints **not yet implemented**:

```text
GET    /api/array/agents
POST   /api/array/missions
GET    /api/array/missions
GET    /api/array/missions/:id
POST   /api/array/missions/:id/cancel
POST   /api/array/missions/:id/approve
GET    /api/array/missions/:id/events  (SSE / WebSocket)
```

A mission adapter interface should separate **demo mode** from a future network adapter. Do not wire speculative endpoints as if already implemented.

### Suggested data contract
```ts
type MissionPhase =
  | 'queued' | 'deploying' | 'running' | 'waiting_approval'
  | 'succeeded' | 'failed' | 'canceled';

interface Agent {
  id: string;
  name: string;
  category: 'intelligence' | 'creation' | 'coordination' | 'execution';
  description: string;
  capabilities: string[]; // informational until mapped to vetted server tools
}
interface Mission {
  id: string;
  agentId: string;
  objective: string;
  policy: 'review' | 'assist' | 'authorized';
  phase: MissionPhase;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  progress?: number; // ONLY if backed by real units or reported phase metrics
  etaSeconds?: number; // ONLY if backed by a calibrated estimate
  etaConfidence?: 'low' | 'medium' | 'high';
}
```

### ETA / trajectory integrity
An AI job's exact completion time generally **cannot be known**. For a live backend, show an ETA only when the server has sufficiently meaningful metrics such as completed subtasks / total known subtasks, duration distributions for similar job types, tool waiting states, and/or phase confidence intervals. Otherwise show **Calculating**, **Unknown**, or **No estimate**. A dashed path is symbolic, not a measurement of real progress. In demo mode, explicitly identify every status and animation as a simulation.

## 5. ARROW ecosystem connections

| Module | Planned relationship |
| --- | --- |
| **RAVIN Core** | Chat shortcut, authenticated worker gateway, reasoning and tooling |
| **Orbit** | Navigation / shared ARROW identity and user context |
| **Waypoint** | Turn intentions / plans into structured agent objectives |
| **Atlas** | Agent state projection: active, waiting, blocked, done, etc. |
| **Relay** | Optional alerts, approvals, handoffs, mission notifications |
| **Frontier** | Potential authorized development agents for code review / builds, never unchecked automatic deployment |

No module integration is considered shipped until its contract, authentication, and observed behavior are implemented and tested.

## 6. Security and trust requirements

- Never ship provider API keys or privileged tokens inside `VITE_*` variables.
- Authenticate requests server-side; check mission ownership, RBAC and scopes on **every** action.
- Restrict agent tools by allowlist, enforce least privilege and budgets / rate limits.
- Sensitive tools (messaging, repo pushes, deletions, publication) require explicit server-side permission and ideally human approval.
- Treat agent outputs and external resources as untrusted. Avoid prompt-injection-induced tool execution.
- Keep audit logs with time, actor, task, tool decisions, approvals, outcome and errors; redact secrets.
- Provide abort/cancel behavior; do not imply cancellation worked until the backend confirms.
- Offer appropriate empty, offline, failed, loading, and reduced-motion states.

## 7. Visual design specification

### Design attitude
**Precision science instrument meets a luxurious productivity OS.** A quiet charcoal / near-black field, hairline geometry, pale blue-white lighting, soft radial halos, fine grain only if performance allows, clean dot formations, and generous space. A little atmospheric movement, never a busy arcade.

### Main composition
Desktop: header; title and mode switch; a spacious central field with four 6-node arrays around the core; fixed-looking but scroll-safe bottom command deck. Tracking view swaps the main field for a mission map and mission inspector. Smaller screens stack / shrink formations with an accessible list fallback and put command controls into normal page flow.

### States
- Idle node: low-contrast border and centered pin.
- Hover / keyboard focus: labeled tooltip, illuminated orbit.
- Selected: visible concentric ring and agent profile in command deck.
- Deploying: charging pulse and short upward streak.
- Active: slow restrained orbit accent; not blinking.
- Mission path: thin dotted curve with position based on **known states only** (unless clearly identified as a demo).
- Finished/error: plain readable status on the mission card, not color alone.

### Animation rules
Respect `prefers-reduced-motion`; cap expensive visual effects; never show a fictional work percentage as factual telemetry. The launch animation is **confirmation of a UI dispatch request**, not proof that a remote worker started.

### Accessibility
Semantic controls, keyboard focus, minimum comfortable touch targets, proper form labels, live status announcements and color-independent text status. Text must remain readable over gradients.

## 8. Roadmap and definition of done

### Phase 0: foundation (first production pass)
- [x] Publish this living README
- [x] Vite/React/TypeScript scaffold committed
- [ ] Clean install and full build verified in a Node environment
- [x] Four category arrays and central RAVIN chat shortcut
- [x] Agent selection and bottom command deck
- [x] Honest **DEMO MODE** mission creation, launch animation, mode switch, mission inspection
- [x] Responsive layouts, keyboard focus states and reduced-motion styles implemented
- [ ] Mobile and keyboard browser interaction checks completed
- [x] Basic mission-state tests authored (execution unverified)
- [ ] All automated tests executed successfully
- [x] No deployment config changes

### Phase 1: live worker connection
- [ ] Define RAVIN Core mission endpoint and auth/session strategy
- [ ] Replace fixtures with a validated server agent registry
- [ ] Wire launch to real background jobs, phase events and failure states
- [ ] Wire cancellation and approvals with server confirmations
- [ ] Structured mission logs and results
- [ ] Real monitoring shows server-reported state, never an elapsed-time-only claim

### Phase 2: intelligence network
- [ ] Multi-agent missions / teams, task routing, dependencies
- [ ] Realistic ETA ranges using calibrated historical telemetry
- [ ] Saved templates, recurring workflows (server-managed)
- [ ] Clear per-job spend, token/tool budget and limits
- [ ] RAVIN integration into ARROW's unified authentication / navigation

### Phase 3: advanced operations
- [ ] Mission history and replay
- [ ] Tool scopes and centralized policy management
- [ ] Live output artifacts and human-in-the-loop approvals
- [ ] Multi-step orchestration / delegated agents
- [ ] Resilient queue, retries and eventual offline handling

### First release acceptance criteria
- App builds cleanly using `npm run build`.
- Four named categories render with distinguishable selectable agents.
- RAVIN Core is keyboard accessible and opens a configurable chat destination.
- No blank-objective missions; changing category / agent behaves consistently.
- Launch mode and Flight Monitor are navigable without refresh.
- Every demo mission is visibly marked `SIMULATED`.
- Active trajectories and honest state labels work without implying real model execution.
- Works at phone, tablet and desktop widths, with reduced-motion support.
- No secrets, vendor deployment configuration or live claims in the repo.

## 9. Future deployment (intentionally deferred)
The owner will configure **GitHub Actions** deployment **after** the initial project is built. Do not add or switch workflows, hosting secrets, domains, Pages settings or deployment providers without explicit instructions. A static Vite build emits `dist/` which can be deployed by GitHub Actions / Pages or another approved static host. If using a subpath like `/ARRAY/`, set Vite `base` accordingly; for a custom root domain, use `/`.

## 10. Working agreements for future AI-assisted development

1. **Read this README before changing the project**, and read the actual code to verify implementation reality.
2. Preserve the core geometry: central RAVIN node, four formations, bottom controls and separate monitor view.
3. Never present a demo simulator as a live agent. Clearly flag which features are working and which are fixtures.
4. Prefer incremental, tested changes; run build/tests after meaningful changes.
5. Never modify other ARROW repositories to make ARRAY look functional without coordinated user consent.
6. Prefer explicit versioned contracts and testable adapter boundaries over coupling directly to another app.
7. When a major design or implementation decision changes, update this README and the roadmap checkboxes.
8. Keep deployment ownership with the user; don't enable an automation, workflow or publish to a live domain without request.

---

**The promise of RAVIN ARRAY:** the intelligence is useful, the controls are understandable, and the cinematic presentation never disguises what the software can actually do.


### Flight Monitor diagnostic launcher (2026-10-15)

The Flight Monitor includes a persistent **TEST LAUNCH** control. It creates a `Test Vector` entry using the local simulator without requiring an agent selection or objective. Each launch has a seeded, repeatable per-mission curved trajectory (abstract 2D coordinates; not physical or geographic targets). During the 24-second simulation a small stylized vector follows the dotted arc; on completion the destination receives a subtle arrival ring. The user can select the mission and cancel the simulation.

- Each click creates an independent test mission; re-running does not recycle or reset earlier IDs.
- A mission's launch/end coordinates are derived from its unique identifier and stay stable for the lifetime of that mission.
- The travel fraction is **strictly demo animation timing**, never a live progress metric.
- The test launch is always local and must never automatically invoke future real backend tools.
- The dedicated `tests/flightPath.test.ts` covers deterministic paths, endpoints, travel timing and cancellation.
- This is a stepping stone to the requested **3D Orbit-inspired rotating globe**; that separate globe integration has **not** been implemented yet.
- The tests and production build for these newest changes have not been executed by this GitHub editing session, even though the earlier user-reported mission-engine test run passed.

## 11. Implementation snapshot (2026-10-15)

**Implemented in repository:** a static Vite/React/TypeScript app with a four-quadrant 24-agent launch array, configurable RAVIN Core chat shortcut, six nodes per category, bottom command controls, a local simulated mission launch state machine, animated deployment streak, Flight Monitor trajectory SVG, mission list, mission inspector, demo cancellation, and responsive / reduced-motion CSS. Basic unit tests are committed.

**Not implemented:** backend workers, model/tool API calls, real task output, server-side execution policies, authentication, persistent missions, backend job cancel/approve, real progress and ETA forecasting, or any deployment workflow.

**Verification note:** Source files were written and checked via GitHub connector, but an actual dependency install, TypeScript production build, test run, and browser/device QA have **not** been executed from this editing environment. Run `npm install && npm run build && npm run test` in Codespaces or your development machine before enabling deployment. Keep the UI labeled **SIMULATION MODE** until the RAVIN backend is working and verified.

**Next implementation priority:** validate build and mobile behavior, then implement an authenticated `MissionAdapter` so the local simulator can be replaced with real RAVIN Core execution, phase events and output.


## Flight Monitor v2: Orbit particle globe (2026-10-15)

**Implemented:** The flat Flight Monitor schematic has been replaced by a rotating, Orbit-style particle globe. The sphere renderer is copied from the project's sibling repository `Resonant-Orbit/src/lib/particle-renderer.ts` into `src/lib/orbit-particle-renderer.ts`; ARRAY uses the same globe rotation speed (~0.052 radians per second), pitch/roll conventions and perspective projection. The globe contains visual-only graticules, faint orbital guides, a draggable yaw adjustment, and reduced-motion handling.

- Mission IDs deterministically produce different abstract 3D starting and ending points in `src/engine/globe.ts`. They are not real-world geographic coordinates.
- Dotted trajectories follow elevated spherical great-circle arcs, with arrows/pulses advancing according to the **local demo clock**. Destination circles glow when the simulation ends; canceled/failed flights stop.
- The foreground/occlusion logic dims hidden arcs and only draws visible vectors; routes rotate with the particle orb, not independently.
- Up to six recent mission paths render concurrently; entries remain individually selectable through the accessible mission list and via clickable globe markers.
- A persistent **TEST LAUNCH** button remains in the monitor, creating a standalone simulated test route without API calls.
- New tests in `tests/globe.test.ts` cover stable coordinates, raised arcs, projection and demo timing.
- The new `.github/workflows/validate.yml` workflow runs install, TypeScript build and unit tests on every push/PR. **It performs no deployment or publication.**
- The real agent backend, measured progress, calibrated ETA, persistence and authentication remain future tasks. Never show a simulated trajectory as evidence an agent did any work.

### Immediate next step

Check GitHub Actions validation and visually review the globe in a browser, especially small-screen scaling, pointer-drag response, end-marker positions, flight occlusion and performance. Fix any reported regressions before wiring live RAVIN execution.
