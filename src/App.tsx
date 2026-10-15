import { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowDownRight, ArrowLeft, ArrowUpRight, Check, ChevronRight,
  CircleDot, Clock3, Compass, Crosshair, ExternalLink, Layers3,
  Radar, Radio, ShieldCheck, Sparkles, X, Play,
} from 'lucide-react';
import { AGENTS, CATEGORIES, getAgentsForCategory, type Agent, type AgentCategory } from './data/agents';
import {
  DEMO_RUN_MS, advanceDemoMission, cancelDemoMission, createDemoMission,
  formatDuration, isActiveMission, phaseLabel,
  type ExecutionPolicy, type Mission,
} from './engine/mission';
import { createFlightCurve, demoFlightFraction, positionOnCurve } from './engine/flightPath';

type View = 'array' | 'monitor';
const CHAT_URL = import.meta.env.VITE_RAVIN_CHAT_URL || 'https://enterarrow.com/ravin';

function BrandMark() {
  return (
    <div className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="none">
        <path d="M16 3 29 26H21.5L16 16 10.5 26H3L16 3Z" fill="currentColor" />
        <path d="M16 22V31" stroke="currentColor" strokeWidth="2" />
      </svg>
    </div>
  );
}

function Formation({
  category, agents, selectedAgentId, launchedAgentId, missions, onSelect,
}: {
  category: (typeof CATEGORIES)[number];
  agents: Agent[];
  selectedAgentId: string;
  launchedAgentId: string | null;
  missions: Mission[];
  onSelect: (id: string) => void;
}) {
  const activeInCategory = missions.filter((mission) => mission.category === category.id && isActiveMission(mission.phase)).length;
  return (
    <section className={`formation formation--${category.id}`} aria-label={`${category.name} agents`}>
      <div className="formation-topline">
        <div className="formation-heading">
          <span className="formation-code">{category.code}</span>
          <span className="formation-name">{category.name}</span>
        </div>
        <span className="formation-total">{activeInCategory > 0 ? `${activeInCategory} ACTIVE` : 'STANDBY'}</span>
      </div>
      <p className="formation-subtitle">{category.subtitle}</p>
      <div className="node-grid">
        {agents.map((agent, index) => {
          const selected = agent.id === selectedAgentId;
          const launching = agent.id === launchedAgentId;
          const inFlight = missions.some((mission) => mission.agentId === agent.id && isActiveMission(mission.phase));
          return (
            <button
              key={agent.id}
              type="button"
              className={`agent-node ${selected ? 'is-selected' : ''} ${launching ? 'is-launching' : ''} ${inFlight ? 'is-active' : ''}`}
              onClick={() => onSelect(agent.id)}
              title={`${agent.name}: ${agent.description}`}
              aria-pressed={selected}
              aria-label={`${agent.name}, ${category.name} agent${inFlight ? ', active demo mission' : ''}`}
            >
              <span className="node-radar-ring" />
              <span className="node-core"><span className="node-center" /></span>
              <span className="launch-streak" aria-hidden="true" />
              <span className="node-index">{String(index + 1).padStart(2, '0')}</span>
              <span className="node-tooltip">{agent.name}</span>
            </button>
          );
        })}
      </div>
      <div className="formation-foot">
        <span>06 UNITS</span>
        <span>ARRAY ONLINE <CircleDot size={10} strokeWidth={2} /></span>
      </div>
    </section>
  );
}

function CoreNode() {
  return (
    <a
      className="core-shortcut"
      href={CHAT_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Open RAVIN Core chat in a new tab"
      title="Open main RAVIN chat"
    >
      <span className="core-outer" aria-hidden="true" />
      <span className="core-middle" aria-hidden="true" />
      <span className="core-inner" aria-hidden="true">
        <Sparkles size={28} strokeWidth={1.4} />
      </span>
      <span className="core-orbit-dot" aria-hidden="true" />
      <span className="core-title">RAVIN</span>
      <span className="core-subtitle">CORE / CHAT <ArrowUpRight size={11} /></span>
    </a>
  );
}

function ArrayCanvas({
  selectedAgentId, launchedAgentId, missions, onSelect,
}: {
  selectedAgentId: string;
  launchedAgentId: string | null;
  missions: Mission[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="array-canvas">
      <div className="canvas-coordinates top-left">00.00° N / SYSTEM 01</div>
      <div className="canvas-coordinates top-right">RAVIN CORE LINK : READY</div>
      <div className="canvas-crosshair horizontal" aria-hidden="true" />
      <div className="canvas-crosshair vertical" aria-hidden="true" />
      <div className="formation-grid">
        {CATEGORIES.map((category) => (
          <Formation
            key={category.id}
            category={category}
            agents={getAgentsForCategory(category.id)}
            selectedAgentId={selectedAgentId}
            launchedAgentId={launchedAgentId}
            missions={missions}
            onSelect={onSelect}
          />
        ))}
      </div>
      <CoreNode />
      <div className="canvas-coordinates bottom-left">24 AGENTS / 04 ARRAYS</div>
      <div className="canvas-coordinates bottom-right">SELECT UNIT TO CONFIGURE <ArrowDownRight size={12} /></div>
    </div>
  );
}

function CommandDeck({
  selectedAgent, selectedCategory, objective, setObjective, policy, setPolicy,
  onSelectCategory, onLaunch, launchedAgentId,
}: {
  selectedAgent: Agent;
  selectedCategory: AgentCategory;
  objective: string;
  setObjective: (value: string) => void;
  policy: ExecutionPolicy;
  setPolicy: (value: ExecutionPolicy) => void;
  onSelectCategory: (category: AgentCategory) => void;
  onLaunch: () => void;
  launchedAgentId: string | null;
}) {
  return (
    <section className="command-deck" aria-label="Agent launch controls">
      <div className="deck-category-row">
        <span className="eyebrow deck-label">01 / SELECT DIVISION</span>
        <div className="category-buttons" role="group" aria-label="Agent categories">
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              className={`category-button ${selectedCategory === category.id ? 'selected' : ''}`}
              onClick={() => onSelectCategory(category.id)}
              aria-pressed={selectedCategory === category.id}
            >
              <span className={`category-indicator category-indicator--${category.id}`} />
              {category.name}
            </button>
          ))}
        </div>
        <span className="deck-status"><span className="live-dot" /> ALL SYSTEMS STANDBY</span>
      </div>
      <div className="deck-main">
        <div className="selected-agent">
          <span className="eyebrow">02 / SELECTED AGENT</span>
          <div className="selected-agent-icon"><Crosshair size={21} strokeWidth={1.4} /></div>
          <div className="selected-agent-name">{selectedAgent.name} <span>{selectedAgent.designation}</span></div>
          <p>{selectedAgent.description}</p>
          <div className="capability-list">{selectedAgent.capabilities.slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}</div>
        </div>
        <div className="mission-input">
          <label className="eyebrow" htmlFor="mission-objective">03 / MISSION OBJECTIVE</label>
          <textarea
            id="mission-objective"
            placeholder="Give your agent an objective...\nWhat should it accomplish?"
            value={objective}
            onChange={(event) => setObjective(event.target.value)}
            maxLength={1200}
            rows={3}
          />
          <div className="input-hint">
            <span><Sparkles size={12} /> Clear objectives make better missions.</span>
            <span>{objective.length} / 1200</span>
          </div>
        </div>
        <div className="deployment-controls">
          <label className="eyebrow" htmlFor="execution-policy">04 / EXECUTION POLICY</label>
          <div className="select-wrap">
            <ShieldCheck size={16} />
            <select
              id="execution-policy"
              value={policy}
              onChange={(event) => setPolicy(event.target.value as ExecutionPolicy)}
            >
              <option value="review">Review first</option>
              <option value="assist">Assist only</option>
              <option value="authorized">Authorized (future)</option>
            </select>
          </div>
          <p>Preview only. No real tools or permissions are connected.</p>
          <button
            className="launch-button"
            type="button"
            disabled={!objective.trim() || Boolean(launchedAgentId)}
            onClick={onLaunch}
          >
            <span>{launchedAgentId ? 'DEPLOYING...' : 'LAUNCH AGENT'}</span>
            {launchedAgentId ? <Activity size={18} /> : <ArrowUpRight size={20} />}
          </button>
        </div>
      </div>
      <div className="deck-footer"><span><span className="demo-marker" /> SIMULATED MISSION ENGINE</span><span>RAVIN ARRAY / BUILD 0.1.0</span></div>
    </section>
  );
}

function TrajectoryMap({ missions, selectedMissionId, onSelect, now }: {
  missions: Mission[];
  selectedMissionId: string | null;
  onSelect: (id: string) => void;
  now: number;
}) {
  const plotted = missions.slice(0, 4);
  return (
    <div className="trajectory-map">
      <div className="map-topline"><span>MISSION TRAJECTORIES</span><span>SCHEMATIC DISPLAY <Radio size={13} /></span></div>
      <svg viewBox="0 0 880 435" role="img" aria-label={plotted.length ? 'Illustrative curved routes for recent simulated missions' : 'Empty simulated flight trajectory field'}>
        <defs>
          <pattern id="flight-grid" width="38" height="38" patternUnits="userSpaceOnUse"><path d="M 38 0 L 0 0 0 38" fill="none" stroke="#c5d6fa" strokeOpacity=".065" strokeWidth="1"/></pattern>
          <radialGradient id="monitor-glow"><stop offset="0" stopColor="#8baaff" stopOpacity=".12"/><stop offset="1" stopColor="#8baaff" stopOpacity="0"/></radialGradient>
        </defs>
        <rect width="880" height="435" fill="url(#flight-grid)" />
        <circle cx="110" cy="338" r="194" fill="url(#monitor-glow)" />
        {[74, 147, 225, 312].map((radius) => <circle key={radius} cx="110" cy="338" r={radius} fill="none" stroke="#9caecf" strokeOpacity=".11" strokeDasharray="2 7" />)}
        <path d="M 0 338 H 880 M 110 0 V 435" stroke="#9caecf" strokeOpacity=".11" />
        <circle cx="95" cy="336" r="34" stroke="#a8baff" strokeOpacity=".7" fill="#0e1724" />
        <circle cx="95" cy="336" r="17" fill="#b0beff" fillOpacity=".12" stroke="#9fb0ec" />
        <path d="M89 343 95 326 101 343" fill="none" stroke="#e5edff" strokeWidth="2" strokeLinecap="round"/>
        <text x="95" y="389" textAnchor="middle" fontSize="10" fill="#97a7c5" letterSpacing="2">ARRAY</text>
        {plotted.map((mission) => {
          const c = createFlightCurve(mission.id);
          const fraction = demoFlightFraction(mission, now);
          const { x, y, angle } = positionOnCurve(c, fraction);
          const d = `M${c.sx} ${c.sy} C${c.c1x} ${c.c1y} ${c.c2x} ${c.c2y} ${c.ex} ${c.ey}`;
          const selected = mission.id === selectedMissionId;
          const finished = mission.phase === 'succeeded';
          const stopped = mission.phase === 'canceled' || mission.phase === 'failed';
          return (
            <g key={mission.id} className="trajectory-flight" role="button" tabIndex={0}
              onClick={() => onSelect(mission.id)}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(mission.id); } }}
              aria-label={`Inspect ${mission.agentName} mission`}
            >
              <path d={d} fill="none" stroke={selected ? '#b6c7ff' : '#687a9d'} strokeOpacity={selected ? '.85' : '.55'} strokeWidth={selected ? '2' : '1.5'} strokeDasharray="3 10" />
              <circle cx={c.sx} cy={c.sy} r="9" fill="#8198c9" fillOpacity=".14" stroke="#8097bd" strokeWidth="1"/>
              <circle cx={c.sx} cy={c.sy} r="3" fill="#b8caff"/>
              <circle cx={c.ex} cy={c.ey} r={finished ? 11 : 7} fill={finished ? '#8ce5c0' : 'transparent'} fillOpacity=".18" stroke={finished ? '#8ce5c0' : '#8ca3cf'} strokeOpacity=".7" />
              <path d={`M${c.ex - 10} ${c.ey} H${c.ex + 10} M${c.ex} ${c.ey - 10} V${c.ey + 10}`} stroke="#899fc7" strokeOpacity=".42" />
              {finished && <circle className="arrival-ring" cx={c.ex} cy={c.ey} r="17" stroke="#91dfc9" strokeWidth="1.5" fill="none"/>}
              <circle cx={x} cy={y} r={selected ? 19 : 14} fill="#a4b9ff" fillOpacity=".09" stroke="#b9caff" strokeOpacity={selected ? '.8' : '.4'} />
              <g transform={`translate(${x} ${y}) rotate(${angle})`} opacity={stopped ? '.45' : '1'}>
                <path d="M 10 0 L -7 -5 L -4 0 L -7 5 Z" fill={finished ? '#9ce2cc' : '#dae4ff'} stroke="#bdd2ff" strokeWidth=".7" strokeLinejoin="round"/>
                {!finished && !stopped && <path d="M -7 0 L -22 0" stroke="#abc9ff" strokeWidth="2" strokeLinecap="round" strokeOpacity=".7"/>}
              </g>
              <text x={Math.min(x + 21, 776)} y={y - 23} fontSize="10" fill={selected ? '#e2ebff' : '#96a5c3'} letterSpacing="1.2">{mission.agentName.toUpperCase()}</text>
              <circle cx={x} cy={y} r="27" fill="transparent"/>
            </g>
          );
        })}
        {!plotted.length && <g>
          <text x="458" y="191" textAnchor="middle" fill="#d2dcf0" fontSize="17" letterSpacing="2">NO MISSIONS IN FLIGHT</text>
          <text x="458" y="219" textAnchor="middle" fill="#8090ac" fontSize="11">Try TEST LAUNCH above or deploy an agent from Launch Array.</text>
        </g>}
      </svg>
      <div className="map-bottomline"><span>POSITION REFLECTS SIMULATED PHASES</span><span>NO LIVE TELEMETRY</span></div>
    </div>
  );
}

function MissionCard({ mission, now, selected, onSelect }: { mission: Mission; now: number; selected: boolean; onSelect: () => void }) {
  return (
    <button type="button" className={`mission-card ${selected ? 'is-selected' : ''}`} onClick={onSelect} aria-pressed={selected}>
      <div className="mission-card-head">
        <span className="mission-code">{mission.agentId.toUpperCase()} / SIM</span>
        <span className={`mission-phase phase--${mission.phase}`}><span className="status-pin" /> {phaseLabel(mission.phase)}</span>
      </div>
      <strong>{mission.agentName}</strong>
      <p>{mission.objective}</p>
      <div className="mission-card-foot"><span><Clock3 size={12} /> {formatDuration((mission.finishedAt ?? now) - mission.createdAt)}</span><span>VIEW PATH <ArrowUpRight size={12}/></span></div>
    </button>
  );
}

function MissionInspector({ mission, now, onCancel }: { mission: Mission | undefined; now: number; onCancel: (id: string) => void }) {
  if (!mission) return (
    <aside className="mission-inspector empty-inspector">
      <span className="eyebrow">MISSION INSPECTOR</span>
      <Radar size={34} strokeWidth={1} />
      <p>Select a simulated mission to inspect its status and launch details.</p>
    </aside>
  );
  const elapsed = (mission.finishedAt ?? now) - mission.createdAt;
  const remaining = Math.max(0, DEMO_RUN_MS - (now - mission.createdAt));
  const active = isActiveMission(mission.phase);
  return (
    <aside className="mission-inspector" aria-label="Selected mission details">
      <span className="eyebrow">MISSION INSPECTOR / SIMULATION</span>
      <div className="inspector-top"><div className="inspector-symbol"><Crosshair size={24} /></div><span className="inspector-id">{mission.id.slice(-9)}</span></div>
      <h3>{mission.agentName}</h3>
      <div className="inspector-phase"><span className="status-pin" /> {phaseLabel(mission.phase)}</div>
      <div className="inspector-section"><span className="eyebrow">ASSIGNED OBJECTIVE</span><p>{mission.objective}</p></div>
      <div className="inspector-metrics">
        <div><span>ELAPSED</span><strong>{formatDuration(elapsed)}</strong></div>
        <div><span>DEMO SEQUENCE</span><strong>{active ? formatDuration(remaining) : '—'}</strong></div>
      </div>
      <p className="inspector-disclaimer"><CircleDot size={13} /> This is an illustrative countdown, not a prediction of AI completion time.</p>
      <div className="inspector-section"><span className="eyebrow">MISSION SETTINGS</span>
        <div className="inspector-detail"><span>Policy</span><strong>{mission.policy === 'review' ? 'Review first' : mission.policy === 'assist' ? 'Assist only' : 'Authorized (future)'}</strong></div>
        <div className="inspector-detail"><span>Engine</span><strong>Local simulator</strong></div>
        <div className="inspector-detail"><span>Live RAVIN output</span><strong>Not connected</strong></div>
      </div>
      {active ? <button type="button" className="secondary-action" onClick={() => onCancel(mission.id)}><X size={15} /> Cancel demo mission</button>
        : <div className="mission-terminal"><Check size={15} /> {mission.phase === 'succeeded' ? 'Demo sequence ended. No AI task was executed.' : 'Demo mission is no longer active.'}</div>}
    </aside>
  );
}

function MonitorView({ missions, now, selectedMissionId, setSelectedMissionId, onCancel, onGoToArray, onTestLaunch }: {
  missions: Mission[];
  now: number;
  selectedMissionId: string | null;
  setSelectedMissionId: (id: string) => void;
  onCancel: (id: string) => void;
  onGoToArray: () => void;
  onTestLaunch: () => void;
}) {
  const selected = missions.find((mission) => mission.id === selectedMissionId) ?? missions[0];
  return (
    <div className="monitor-layout">
      <div className="monitor-primary">
        <div className="monitor-head">
          <div><span className="eyebrow">OPERATIONS / 02</span><h2>Flight monitor<span className="title-period">.</span></h2><p>Every mission has a path. Follow the sequence.</p></div>
          <div className="monitor-header-actions">
            <button type="button" className="test-launch-button" onClick={onTestLaunch} title="Launch a simulated test vector without connecting a real agent">
              <Play size={15} fill="currentColor" /> TEST LAUNCH <span>SIM</span>
            </button>
            <button type="button" className="quiet-action" onClick={onGoToArray}><ArrowLeft size={15}/> BACK TO ARRAY</button>
          </div>
        </div>
        <TrajectoryMap missions={missions} selectedMissionId={selected?.id ?? null} onSelect={setSelectedMissionId} now={now} />
        <div className="mission-list-title"><span>MISSION LOG <span className="muted">/ {missions.length.toString().padStart(2, '0')}</span></span><span>NEWEST FIRST</span></div>
        <div className="mission-list">
          {missions.length ? missions.map((mission) => <MissionCard key={mission.id} mission={mission} now={now} selected={mission.id === selected?.id} onSelect={() => setSelectedMissionId(mission.id)} />) : <div className="empty-log"><Radio size={18} /> The flight log is empty. Use Test Launch above to fire a visual diagnostic, or deploy an agent.</div>}
        </div>
      </div>
      <MissionInspector mission={selected} now={now} onCancel={onCancel} />
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<View>('array');
  const [selectedAgentId, setSelectedAgentId] = useState('scout');
  const [objective, setObjective] = useState('');
  const [policy, setPolicy] = useState<ExecutionPolicy>('review');
  const [missions, setMissions] = useState<Mission[]>([]);
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [launchedAgentId, setLaunchedAgentId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [notice, setNotice] = useState('');

  const selectedAgent = AGENTS.find((agent) => agent.id === selectedAgentId) ?? AGENTS[0];
  const activeCount = missions.filter((mission) => isActiveMission(mission.phase)).length;
  const recentCount = missions.filter((mission) => mission.phase === 'succeeded').length;
  const selectedCategory = selectedAgent.category;

  useEffect(() => {
    const timer = window.setInterval(() => {
      const timestamp = Date.now();
      setNow(timestamp);
      setMissions((previous) => {
        let changed = false;
        const next = previous.map((mission) => {
          const updated = advanceDemoMission(mission, timestamp);
          if (updated !== mission) changed = true;
          return updated;
        });
        return changed ? next : previous;
      });
    }, 100);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!launchedAgentId) return;
    const timer = window.setTimeout(() => { setLaunchedAgentId(null); setView('monitor'); }, 1800);
    return () => window.clearTimeout(timer);
  }, [launchedAgentId]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const displayTime = useMemo(() => new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }), [now]);

  function selectCategory(category: AgentCategory) {
    setSelectedAgentId(getAgentsForCategory(category)[0].id);
  }

  function launch() {
    if (!objective.trim() || launchedAgentId) return;
    const mission = createDemoMission({
      agentId: selectedAgent.id,
      agentName: selectedAgent.name,
      category: selectedAgent.category,
      objective,
      policy,
    });
    setMissions((previous) => [mission, ...previous].slice(0, 30));
    setSelectedMissionId(mission.id);
    setLaunchedAgentId(selectedAgent.id);
    setObjective('');
    setNotice(`${selectedAgent.name} demo sequence deployed. No real AI work started.`);
  }

  function launchTest() {
    const mission = createDemoMission({
      agentId: 'test-vector',
      agentName: 'Test Vector',
      category: 'diagnostic',
      objective: 'Visual diagnostics: test the simulated launch, arched flight path and arrival.',
      policy: 'assist',
    });
    setMissions((previous) => [mission, ...previous].slice(0, 30));
    setSelectedMissionId(mission.id);
    setView('monitor');
    setNotice('Test vector launched in simulation mode. No real agent or hardware was activated.');
  }

  function cancelMission(id: string) {
    setMissions((previous) => previous.map((mission) => mission.id === id ? cancelDemoMission(mission, Date.now()) : mission));
    setNotice('Local demo mission canceled.');
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" aria-hidden="true" /><div className="ambient ambient-two" aria-hidden="true" />
      <header className="site-header">
        <a className="brand" href="#top" onClick={(event) => { event.preventDefault(); setView('array'); }} aria-label="RAVIN ARRAY, go to launch view">
          <BrandMark />
          <span className="brand-text"><strong>RAVIN <span>/ ARRAY</span></strong><small>RESONANT INTELLIGENCE NETWORK</small></span>
        </a>
        <div className="header-center"><span className="header-line" /><span className="header-route">ARROW ECOSYSTEM <ChevronRight size={12} /> RAVIN <ChevronRight size={12} /> ARRAY</span><span className="header-line" /></div>
        <div className="header-right"><span className="header-clock">{displayTime}</span><span className="simulation-pill"><span className="amber-dot" /> SIMULATION MODE</span><a className="header-chat" href={CHAT_URL} target="_blank" rel="noopener noreferrer">RAVIN CHAT <ExternalLink size={13} /></a></div>
      </header>
      <main id="top" className="main-content">
        <div className="intro-row">
          <div><div className="section-kicker"><span className="section-kicker-line" /> INTELLIGENCE DEPLOYMENT SYSTEM <span className="alpha-index">/ 001</span></div><h1>RAVIN <span>ARRAY</span><span className="title-period">.</span></h1><p className="intro-tagline">Deploy intelligence. <span>Track every mission.</span></p></div>
          <div className="mode-panel"><div className="mode-panel-head"><span>OPERATIONAL ENVIRONMENT</span><span><Radio size={12} /> LOCAL DEMO</span></div><div className="view-toggle" role="group" aria-label="Choose ARRAY view"><button type="button" className={view === 'array' ? 'active' : ''} onClick={() => setView('array')} aria-pressed={view === 'array'}><Layers3 size={16}/> LAUNCH ARRAY</button><button type="button" className={view === 'monitor' ? 'active' : ''} onClick={() => setView('monitor')} aria-pressed={view === 'monitor'}><Radar size={16}/> FLIGHT MONITOR {activeCount > 0 && <span className="nav-active-count">{activeCount}</span>}</button></div></div>
        </div>
        <div className="stats-strip">
          <span><span className="strip-indicator" /> SYSTEM ONLINE <span className="strip-separator">/</span> INTERFACE PREVIEW</span>
          <span>04 <small>DIVISIONS</small><span className="strip-separator">/</span> 24 <small>AGENTS</small></span>
          <span>{activeCount.toString().padStart(2, '0')} <small>IN FLIGHT</small><span className="strip-separator">/</span> {recentCount.toString().padStart(2, '0')} <small>DEMO COMPLETE</small></span>
        </div>
        {view === 'array' ? (
          <>
            <div className="canvas-labels"><span><Compass size={14} /> THE DEPLOYMENT FIELD</span><span><span className="legend-item"><i className="legend-idle" /> STANDBY</span><span className="legend-item"><i className="legend-active" /> SELECTED</span><span className="legend-item"><i className="legend-running" /> ACTIVE</span></span></div>
            <ArrayCanvas selectedAgentId={selectedAgentId} launchedAgentId={launchedAgentId} missions={missions} onSelect={setSelectedAgentId} />
            <CommandDeck selectedAgent={selectedAgent} selectedCategory={selectedCategory} objective={objective} setObjective={setObjective} policy={policy} setPolicy={setPolicy} onSelectCategory={selectCategory} onLaunch={launch} launchedAgentId={launchedAgentId}/>
          </>
        ) : <MonitorView missions={missions} now={now} selectedMissionId={selectedMissionId} setSelectedMissionId={setSelectedMissionId} onCancel={cancelMission} onGoToArray={() => setView('array')} onTestLaunch={launchTest}/>}
        <footer className="site-footer"><span>RAVIN ARRAY <span className="muted">© ARROW / RESONANT ASSIST</span></span><span><CircleDot size={12} /> NO LIVE AGENTS CONNECTED <span className="footer-divider">/</span> PROTOTYPE 0.1.0</span></footer>
      </main>
      {notice && <div className="toast" role="status"><Check size={16} /> {notice}<button type="button" aria-label="Dismiss notice" onClick={() => setNotice('')}><X size={15}/></button></div>}
    </div>
  );
}
