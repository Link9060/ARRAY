import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  ArrowLeft, ArrowUpRight, Check, ChevronRight,
  CircleDot, Clock3, Compass, Crosshair, ExternalLink, Layers3,
  Radar, Radio, ShieldCheck, Sparkles, X, Play, Wifi, LogIn, LogOut, WifiOff,
  Search, Download, AlertTriangle, Activity, Server, SlidersHorizontal, ClipboardList,
  Bell, BellOff, CheckCircle2, AlertCircle, ArrowRight,
} from 'lucide-react';
import { AGENTS, CATEGORIES, getAgentsForCategory, modelForSelection, type Agent, type AgentCategory, type OperationsMode } from './data/agents';
import {
  DEMO_RUN_MS, advanceDemoMission, cancelDemoMission, createDemoMission,
  formatDuration, isActiveMission, phaseLabel,
  type ExecutionPolicy, type Mission, type MissionPhase,
} from './engine/mission';
import GlobeTrajectoryMap from './components/GlobeTrajectoryMap';
import { missionEvents, missionStatus } from './engine/missionEvents';
import { missionEndMessage, missionEndTransitions } from './engine/completionAlerts';
import LaunchSilo3D from './components/LaunchSilo3D';
import DeploymentConsole from './components/DeploymentConsole';
import { SILO_SEQUENCE_MS, activeLaunchSignal } from './engine/siloAnimation';
import { filterMissionRegister,makeMissionExport, type MissionFilter, type MissionOrder, type MissionChannel } from './engine/monitorFilters';
import GroveWorkerPanel from './components/GroveWorkerPanel';
import { RAVIN_ARRAY_API, liveApiConfigured, signInLive, signOutLive, launchLiveMission, listLiveMissions, cancelQueuedLiveMission } from './engine/liveClient';
import { loadSavedMissions, storeMission, resetArrayCloudIdentity } from './engine/arrayCloud';

type View = 'array' | 'monitor';
type CompletionSignal = { mission: Mission; observedAt: number };
const ALERT_PREF = 'ravin-array-completion-alerts-v1';
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

function ArrayCanvas({
  launchSignal, launchPlaying, onPreview,
}: {
  launchSignal: number;
  launchPlaying: boolean;
  onPreview: () => void;
}) {
  return (
    <div className="array-canvas array-canvas--dual station-camera-viewport">
      <div className="camera-overlay camera-overlay-top" aria-hidden="true"><span><span className="camera-record-dot"/>CAM 06 / NIGHT OBSERVATION</span><span>REC • SIMULATION</span></div>
      <div className="camera-crosshair" aria-hidden="true" />
      <div className="silo-stage" aria-label="Fictional outdoor nighttime industrial camera feed">
        <div className="silo-stage-topline"><span>ARRAY FACILITY / REMOTE CAM</span><span>FICTIONAL DISPLAY</span></div>
        <LaunchSilo3D launchSignal={launchSignal} />
        <div className="silo-stage-bottomline">
          <span className={launchPlaying ? 'silo-stage-state active' : 'silo-stage-state'}>
            <span className="silo-stage-light" />
            {launchPlaying ? 'ILLUSTRATIVE DEPLOYMENT' : 'CAMERA / STANDBY'}
          </span>
          <button type="button" className="silo-stage-preview" onClick={onPreview} aria-label="Play a camera-feed demo without starting an AI task">
            <Play size={11} /> CAMERA TEST
          </button>
        </div>
      </div>
      <div className="camera-overlay camera-overlay-bottom" aria-hidden="true">
        <span>REMOTE CAMERA // SCENE NOT LIVE</span><span>SOFTWARE MISSIONS ONLY</span>
      </div>
    </div>
  );
}

function CommandDeck({
  selectedAgent, selectedCategory, objective, setObjective, policy, setPolicy,
  onSelectCategory, liveMode, operationsMode, setOperationsMode, instructions, setInstructions,
}: {
  selectedAgent: Agent;
  selectedCategory: AgentCategory;
  objective: string;
  setObjective: (value: string) => void;
  policy: ExecutionPolicy;
  setPolicy: (value: ExecutionPolicy) => void;
  onSelectCategory: (category: AgentCategory) => void;
  liveMode: boolean;
  operationsMode: OperationsMode;
  setOperationsMode: (value: OperationsMode) => void;
  instructions: string;
  setInstructions: (value: string) => void;
}) {
  const activeModel = modelForSelection(selectedCategory, operationsMode);
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
        <span className="deck-status"><span className="live-dot" /> SOFTWARE NETWORK READY</span>
      </div>
      <div className="deck-main">
        <div className="selected-agent">
          <span className="eyebrow">02 / SELECTED AGENT</span>
          <div className="selected-agent-icon"><Crosshair size={21} strokeWidth={1.4} /></div>
          <div className="selected-agent-name">{selectedAgent.name} <span>{selectedAgent.designation}</span></div>
          <p>{selectedAgent.description}</p>
          <div className="capability-list">{selectedAgent.capabilities.slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}</div>
          {selectedCategory === 'operations' && (
            <div className="operations-mode">
              <span className="eyebrow">OPERATIONS MODE</span>
              <div className="model-toggle" role="group" aria-label="Operations model">
                <button type="button" onClick={() => setOperationsMode('general')} className={operationsMode === 'general' ? 'active' : ''} aria-pressed={operationsMode === 'general'}>GENERAL</button>
                <button type="button" onClick={() => setOperationsMode('coding')} className={operationsMode === 'coding' ? 'active' : ''} aria-pressed={operationsMode === 'coding'}>CODING</button>
              </div>
            </div>
          )}
          <div className="model-identity" aria-live="polite">
            <span>SELECTED MODEL</span>
            <strong>{activeModel.label}</strong>
            <small>{liveMode ? 'Server confirms model on mission start' : 'Preview selection / no inference'}</small>
            {selectedCategory === 'operations' && operationsMode === 'coding' &&
              <small className="model-cost-warning">Cloudflare free usage is limited. Paid accounts may incur charges.</small>}
          </div>
        </div>
        <div className="mission-input">
          <label className="eyebrow" htmlFor="mission-objective">03 / MISSION OBJECTIVE</label>
          <textarea
            id="mission-objective"
            placeholder={"Give your agent an objective...\nWhat should it accomplish?"}
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
          <span className="eyebrow">04 / EXECUTION POLICY</span>
          <div className="execution-policy-options" role="group" aria-label="Execution policy">
            <button type="button" className={policy === 'review' ? 'selected' : ''}
              aria-pressed={policy === 'review'} onClick={() => setPolicy('review')}>
              <ShieldCheck size={16}/><span><strong>REVIEW FIRST</strong><small>Draft + verification checklist</small></span>
            </button>
            <button type="button" className={policy === 'assist' ? 'selected' : ''}
              aria-pressed={policy === 'assist'} onClick={() => setPolicy('assist')}>
              <Check size={16}/><span><strong>ASSIST ONLY</strong><small>Direct answer, text only</small></span>
            </button>
          </div>
          <p className="policy-explanation">{policy === 'review'
            ? 'Agent drafts the result, identifies assumptions and risks, and lists checks for your approval. Nothing is executed.'
            : 'Agent supplies explanations, examples, or code as text. It cannot run commands, edit files, publish or purchase.'}</p>
          <label className="eyebrow policy-extra-label" htmlFor="agent-instructions">05 / RESPONSE INSTRUCTIONS <span>OPTIONAL</span></label>
          <textarea id="agent-instructions" className="agent-instructions"
            value={instructions} onChange={event => setInstructions(event.target.value)}
            maxLength={400} rows={3}
            placeholder="Output format, constraints, acceptance criteria..." />
          <span className="instruction-length">{instructions.length} / 400 · Preferences cannot grant tools or permissions</span>
          <p className="policy-permission"><ShieldCheck size={13}/> {liveMode
            ? 'SERVER ENFORCED · No external actions available'
            : 'DEMO ONLY · No model execution or external actions'}</p>
          <p className="station-deck-nextstep">NEXT → COMPLETE THE SOFTWARE DISPATCH CHECKS ON THE RIGHT.</p>
        </div>
      </div>
      <div className="deck-footer"><span><span className="demo-marker" /> {liveMode ? 'AUTHENTICATED RAVIN / TEXT ONLY' : 'SIMULATED MISSION ENGINE'}</span><span>RAVIN ARRAY / BUILD 0.2.0</span></div>
    </section>
  );
}

function MissionCard({ mission, now, selected, onSelect }: { mission: Mission; now: number; selected: boolean; onSelect: () => void }) {
  return (
    <button type="button" className={`mission-card ${selected ? 'is-selected' : ''}`} onClick={onSelect} aria-pressed={selected}>
      <div className="mission-card-head">
        <span className="mission-code">{mission.agentId.toUpperCase()} / {mission.isDemo ? 'SIMULATION' : 'SERVER'}</span>
        <span className={`mission-phase phase--${mission.phase}`}><span className="status-pin" /> {missionStatus(mission)}</span>
      </div>
      <strong>{mission.agentName}</strong>
      <p>{mission.objective}</p>
      <div className="mission-card-foot"><span><Clock3 size={12} /> {formatDuration((mission.finishedAt ?? now) - mission.createdAt)}</span><span>VIEW RECORD <ArrowUpRight size={12}/></span></div>
    </button>
  );
}

function MissionInspector({ mission, now, onCancel }: { mission: Mission | undefined; now: number; onCancel: (id: string) => void }) {
  if (!mission) return (
    <aside className="mission-inspector empty-inspector">
      <span className="eyebrow">MISSION INSPECTOR</span>
      <Radar size={34} strokeWidth={1} />
      <p>Select a recorded software mission to inspect verified timestamps, execution policy, and results.</p>
    </aside>
  );
  const elapsed = (mission.finishedAt ?? now) - mission.createdAt;
  const remaining = Math.max(0, DEMO_RUN_MS - (now - mission.createdAt));
  const active = isActiveMission(mission.phase);
  return (
    <aside className="mission-inspector" aria-label="Selected mission details">
      <span className="eyebrow">MISSION DOSSIER / {mission.isDemo ? "SIMULATION" : "LIVE RAVIN"}</span>
      <div className="inspector-top"><div className="inspector-symbol"><Crosshair size={24} /></div><span className="inspector-id">{mission.id.slice(-9)}</span></div>
      <h3>{mission.agentName}</h3>
      <div className="inspector-phase"><span className="status-pin" /> {phaseLabel(mission.phase)}</div>
      <div className="inspector-section"><span className="eyebrow">ASSIGNED OBJECTIVE</span><p>{mission.objective}</p></div>
      <div className="inspector-metrics">
        <div><span>ELAPSED</span><strong>{formatDuration(elapsed)}</strong></div>
        <div><span>{mission.isDemo ? 'DEMO SEQUENCE' : 'ESTIMATED REMAINING'}</span><strong>{mission.isDemo && active ? formatDuration(remaining) : 'UNKNOWN'}</strong></div>
      </div>
      <p className="inspector-disclaimer"><CircleDot size={13} /> {mission.isDemo ? 'This is an illustrative countdown, not a prediction of AI completion time.' : 'Server status is real. Trajectory is illustrative; there is no reliable ETA.'}</p>
      <div className="inspector-section"><span className="eyebrow">MISSION SETTINGS</span>
        <div className="inspector-detail"><span>Policy</span><strong>{mission.policy === 'review' ? 'Review first · draft + checks' : mission.policy === 'assist' ? 'Assist only · text output' : 'Unsupported legacy policy'}</strong></div>
        {mission.instructions && <div className="inspector-instructions"><span className="eyebrow">ADDITIONAL RESPONSE INSTRUCTIONS</span><p>{mission.instructions}</p></div>}
        <div className="inspector-detail"><span>Engine</span><strong>{mission.isDemo ? 'Local simulator' : 'RAVIN / tool-free AI'}</strong></div>
        {mission.model && <div className="inspector-detail"><span>Model</span><strong>{mission.model}</strong></div>}
        {mission.operationsMode === 'coding' && <div className="inspector-detail"><span>Operations mode</span><strong>Coding, text-only</strong></div>}
        <div className="inspector-detail"><span>Output</span><strong>{mission.isDemo ? 'None · simulation' : mission.output ? 'Text result received' : 'Not received yet'}</strong></div>
      </div>
      {mission.output && <div className="inspector-section"><span className="eyebrow">RAVIN RESULT / TEXT OUTPUT</span><pre className="mission-output">{mission.output}</pre></div>}
      {mission.error && <div className="mission-error" role="alert">{mission.error}</div>}
      {active && (mission.isDemo || mission.phase === 'queued')
        ? <button type="button" className="secondary-action" onClick={() => onCancel(mission.id)}><X size={15} /> {mission.isDemo ? 'Cancel simulated mission' : 'Cancel queued mission'}</button>
        : active ? <div className="inspector-disclaimer">Running live jobs cannot be canceled until the backend supports request interruption.</div>
        : <div className="mission-terminal"><Check size={15} /> {mission.isDemo ? (mission.phase === 'succeeded' ? 'Demo sequence ended. No AI task was executed.' : 'Demo mission is no longer active.') : 'Server-reported state. See the result above when available.'}</div>}
    </aside>
  );
}

function MonitorView({
  missions, now, selectedMissionId, setSelectedMissionId,
  onCancel, onGoToArray, onTestLaunch, liveConnected, cloudReady,
  completionSignal, onDismissCompletion, notificationsEnabled, onToggleNotifications,
}: {
  missions: Mission[];
  now: number;
  selectedMissionId: string | null;
  setSelectedMissionId: (id: string) => void;
  onCancel: (id: string) => void;
  onGoToArray: () => void;
  onTestLaunch: () => void;
  liveConnected: boolean;
  cloudReady: boolean;
  completionSignal: CompletionSignal | null;
  onDismissCompletion: () => void;
  notificationsEnabled: boolean;
  onToggleNotifications: () => void;
}) {
  const [search,setSearch] = useState('');
  const [filter,setFilter] = useState<MissionFilter>('all');
  const [channel,setChannel] = useState<MissionChannel>('both');
  const [order,setOrder] = useState<MissionOrder>('newest');
  const [division,setDivision] = useState<'all' | 'intelligence' | 'operations'>('all');
  const [eventScope,setEventScope] = useState<'all' | 'selected'>('all');

  const all = filterMissionRegister(missions,search,filter,channel,order);
  const visible = all.filter(m => division === 'all' || m.category === division);
  const selected = visible.find(m => m.id === selectedMissionId) ?? visible[0];
  const activeCount = missions.filter(m => isActiveMission(m.phase)).length;
  const reviewCount = missions.filter(m => m.phase === 'waiting_approval').length;
  const completedCount = missions.filter(m => m.phase === 'succeeded').length;
  const attentionCount = missions.filter(m => m.phase === 'failed' || m.phase === 'canceled').length;
  const liveCount = missions.filter(m => !m.isDemo).length;
  const recordedEvents = missions.flatMap(m => missionEvents(m).map(ev => ({
    ...ev,agentName:m.agentName,missionId:m.id,
  }))).sort((a,b) => b.time - a.time);
  const auditEntries = recordedEvents.filter(ev =>
    eventScope === 'all' || ev.missionId === selected?.id).slice(0,24);
  const divisionCounts = {
    intelligence:missions.filter(m => m.category === 'intelligence' && isActiveMission(m.phase)).length,
    operations:missions.filter(m => m.category === 'operations' && isActiveMission(m.phase)).length,
  };

  function openCompletedMission() {
    const done = completionSignal?.mission;
    if (!done) return;
    // A completed task must be visible even if the register was filtered.
    setSearch('');
    setFilter('all');
    setChannel('both');
    setDivision('all');
    setSelectedMissionId(done.id);
    onDismissCompletion();
  }

  function exportVisibleMissions() {
    if(!visible.length)return;
    const json = makeMissionExport(visible,Date.now());
    const url = URL.createObjectURL(new Blob([json],{type:'application/json;charset=utf-8'}));
    const link=document.createElement('a');
    link.href=url;
    link.download='ravin-array-missions-'+new Date().toISOString().slice(0,10)+'.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="ops-room" aria-label="ARRAY software mission control room">
      <div className="ops-room-head">
        <div className="ops-head-title">
          <div className="ops-room-kicker"><span className="ops-led"/><span>STATION 02 / OPERATIONS & AUDIT</span><span className="ops-separator">/</span><span>RAVIN ARRAY</span></div>
          <h2>MISSION <span>CONTROL</span><span className="title-period">.</span></h2>
          <p>Software task tracking, verified event records and an illustrative mission network.</p>
        </div>
        <div className="ops-head-actions">
          <div className="ops-clock"><Clock3 size={13}/><span>{new Date(now).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false})}</span><small>LOCAL</small></div>
          <button type="button" className={'ops-action ops-notify-toggle'+(notificationsEnabled?' enabled':'')}
            onClick={onToggleNotifications} aria-pressed={notificationsEnabled}
            title="Optional browser alerts while ARRAY is open; your browser may require permission">
            {notificationsEnabled?<Bell size={14}/>:<BellOff size={14}/>}
            ALERTS {notificationsEnabled?'ON':'OFF'}
          </button>
          <button type="button" className="ops-action ops-action-demo" onClick={onTestLaunch}><Play size={14}/> NEW DEMO <span>SIM</span></button>
          <button type="button" className="ops-action ops-action-return" onClick={onGoToArray}><ArrowLeft size={14}/> LAUNCH DESK</button>
        </div>
      </div>


      {completionSignal && (
        <div className={'ops-completion-announcement'+(completionSignal.mission.phase === 'failed'?' is-failed':'')}
          key={completionSignal.mission.id+':'+completionSignal.observedAt} role="status" aria-live="polite">
          <div className="ops-completion-emblem">
            <span className="ops-completion-ring"/>
            {completionSignal.mission.phase==='failed'?<AlertCircle size={27}/>:<CheckCircle2 size={29}/>}
          </div>
          <div className="ops-completion-copy">
            <span className="ops-completion-eyebrow">
              {completionSignal.mission.isDemo?'SIMULATION / END OF SEQUENCE':'RAVIN / REPORTED TASK STATUS'}
            </span>
            <strong>{completionSignal.mission.phase==='failed'?'MISSION INTERRUPTED':
              completionSignal.mission.isDemo?'SIMULATION COMPLETE':'MISSION COMPLETE'}</strong>
            <p>{completionSignal.mission.agentName} <span>/</span> {completionSignal.mission.objective}</p>
            <small>{completionSignal.mission.isDemo
              ? 'Demonstration finished. No AI work was performed.'
              : completionSignal.mission.phase==='failed'
                ? 'RAVIN reported a failure. Inspect the recorded error.'
                : completionSignal.mission.output
                  ? 'RAVIN reported success. Text result received.'
                  : 'RAVIN reported success. No text result was included.'}
            </small>
          </div>
          <div className="ops-completion-actions">
            <button type="button" className="ops-completion-open" onClick={openCompletedMission}>
              VIEW DOSSIER <ArrowRight size={15}/>
            </button>
            <button type="button" className="ops-completion-close" onClick={onDismissCompletion}
              aria-label="Dismiss mission completion announcement"><X size={16}/></button>
          </div>
        </div>
      )}
      <div className="ops-notification-note">
        <Bell size={12}/> {notificationsEnabled
          ? 'Browser alerts enabled while this ARRAY page is running. Notifications distinguish live RAVIN results from demos.'
          : 'Enable browser alerts to be notified when a tracked task completes. The page must remain open.'}
      </div>
      <div className="ops-connection-strip">
        <div><span className={liveConnected?'ops-dot ready':'ops-dot'}/><span>RAVIN SERVICE</span><strong>{liveConnected?'AUTHENTICATED':'NOT CONNECTED'}</strong></div>
        <div><span className={cloudReady?'ops-dot ready':'ops-dot'}/><span>MISSION ARCHIVE</span><strong>{cloudReady?'SYNC ACTIVE':'LOCAL RECORDS'}</strong></div>
        <div><span className="ops-dot amber"/><span>NETWORK DISPLAY</span><strong>ILLUSTRATIVE / NO GPS</strong></div>
        <div><span className="ops-dot amber"/><span>LOG ENTRIES</span><strong>{recordedEvents.length.toString().padStart(2,'0')} RECORDED</strong></div>
      </div>

      <div className="ops-instrument-grid" aria-label="Mission metrics from recorded data">
        {[
          {label:'REGISTERED MISSIONS',value:missions.length,description:'Live + simulated',kind:'neutral',icon:<ClipboardList size={17}/>},
          {label:'ACTIVE WORK',value:activeCount,description:'Queued / running / review',kind:'amber',icon:<Activity size={17}/>},
          {label:'AWAITING REVIEW',value:reviewCount,description:'Approval required',kind:'review',icon:<ShieldCheck size={17}/>},
          {label:'COMPLETED',value:completedCount,description:liveCount+' live requests recorded',kind:'green',icon:<Check size={17}/>},
          {label:'NEEDS ATTENTION',value:attentionCount,description:'Failed or canceled',kind:'red',icon:<AlertTriangle size={17}/>},
        ].map(item=><div className={'ops-instrument ops-instrument--'+item.kind} key={item.label}>
          <div className="ops-instrument-top"><span>{item.label}</span>{item.icon}</div>
          <strong>{item.value.toString().padStart(2,'0')}</strong>
          <small>{item.description}</small>
        </div>)}
      </div>

      <div className="ops-deck-layout">
        <div className="ops-deck-main">
          <section className="ops-display-panel" aria-label="Illustrative mission network">
            <div className="ops-panel-cap">
              <span><Radar size={15}/> DISPLAY 01 <i/> MISSION NETWORK</span>
              <span className="ops-cap-meta">VISUAL ROUTES ONLY <span className="ops-online-dot"/></span>
            </div>
            <div className="ops-network-shell">
              {completionSignal && now-completionSignal.observedAt < 7500 && (
                <div className={'ops-arrival-overlay'+(completionSignal.mission.phase==='failed'?' failed':'')}
                  aria-hidden="true">
                  <span className="ops-arrival-pulse"/>
                  <span className="ops-arrival-text">{completionSignal.mission.isDemo?'SIM ROUTE ENDED':
                    completionSignal.mission.phase==='failed'?'TASK FAILED':'TASK COMPLETED'}</span>
                </div>
              )}
              <GlobeTrajectoryMap missions={missions} selectedMissionId={selected?.id ?? null}
                onSelect={setSelectedMissionId} now={now}/>
            </div>
            <div className="ops-display-foot"><span>NETWORK VISUALIZATION / ROUTES ARE SYMBOLIC</span><span>{activeCount.toString().padStart(2,'0')} ACTIVE TASKS</span></div>
          </section>

          <section className="ops-registry-panel" aria-label="Mission registry">
            <div className="ops-panel-cap"><span><SlidersHorizontal size={15}/> DISPLAY 02 <i/> MISSION REGISTER</span><span className="ops-cap-meta">{visible.length} / {missions.length} RECORDS</span></div>
            <div className="ops-division-rail">
              {([
                ['all','ALL DIVISIONS',missions.filter(m=>isActiveMission(m.phase)).length],
                ['intelligence','A–01 INTELLIGENCE',divisionCounts.intelligence],
                ['operations','A–02 OPERATIONS',divisionCounts.operations],
              ] as const).map(([id,label,count])=>
                <button type="button" key={id} className={division===id?'selected':''}
                  aria-pressed={division===id} onClick={()=>setDivision(id)}>
                  <span className="ops-division-pin"/><strong>{label}</strong><small>{count} ACTIVE</small>
                </button>)}
            </div>
            <div className="ops-filter-bar">
              <label className="ops-search"><Search size={15}/>
                <input aria-label="Search missions by agent, objective or ID" value={search}
                  onChange={e=>setSearch(e.target.value)} placeholder="Search missions, objectives, IDs..."/>
                {search && <button type="button" onClick={()=>setSearch('')} aria-label="Clear mission search"><X size={13}/></button>}
              </label>
              <select className="ops-select" aria-label="Filter missions by status" value={filter} onChange={e=>setFilter(e.target.value as MissionFilter)}>
                <option value="all">ALL STATES</option>
                <option value="active">ACTIVE</option>
                <option value="review">NEEDS REVIEW</option>
                <option value="completed">COMPLETED</option>
                <option value="attention">ISSUES / CANCELED</option>
              </select>
              <select className="ops-select" aria-label="Filter live or simulated missions" value={channel} onChange={e=>setChannel(e.target.value as MissionChannel)}>
                <option value="both">ALL SOURCES</option>
                <option value="live">LIVE ONLY</option>
                <option value="demo">DEMO ONLY</option>
              </select>
              <select className="ops-select" aria-label="Mission sort order" value={order} onChange={e=>setOrder(e.target.value as MissionOrder)}>
                <option value="newest">NEWEST FIRST</option>
                <option value="oldest">OLDEST FIRST</option>
              </select>
              <button className="ops-export" type="button" onClick={exportVisibleMissions} disabled={!visible.length} title="Export filtered mission records as a JSON file"><Download size={14}/> EXPORT</button>
            </div>
            <div className="mission-list ops-mission-register">
              {visible.length ? visible.map(m=>
                <MissionCard key={m.id} mission={m} now={now}
                  selected={m.id===selected?.id} onSelect={()=>setSelectedMissionId(m.id)}/>)
                : <div className="empty-log ops-no-results"><Search size={18}/> No mission records match these filters.
                  <button type="button" onClick={()=>{setSearch('');setFilter('all');setChannel('both');setDivision('all');}}>RESET FILTERS</button>
                </div>}
            </div>
          </section>

          <section className="ops-audit-panel" aria-label="Verified mission event audit">
            <div className="ops-panel-cap"><span><Radio size={15}/> DISPLAY 03 <i/> EVENT AUDIT</span>
              <div className="ops-audit-scope" role="group" aria-label="Event log scope">
                <button type="button" aria-pressed={eventScope==='all'} onClick={()=>setEventScope('all')}>ALL EVENTS</button>
                <button type="button" aria-pressed={eventScope==='selected'} disabled={!selected}
                  onClick={()=>setEventScope('selected')}>SELECTED TASK</button>
              </div>
            </div>
            <div className="mission-audit ops-audit-stream">
              {auditEntries.length ? auditEntries.map(ev=>
                <button type="button" className="audit-entry" key={ev.key} onClick={()=>setSelectedMissionId(ev.missionId)}>
                  <time dateTime={new Date(ev.time).toISOString()}>{new Date(ev.time).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'})}</time>
                  <span className={ev.source==='simulation'?'audit-indicator simulation':'audit-indicator'} />
                  <span className="audit-entry-main"><strong>{ev.label}</strong><small>{ev.agentName} / {ev.detail}</small></span>
                  <span className="audit-source">{ev.source==='simulation'?'SIM':'API'}</span>
                </button>) : <div className="empty-log">No recorded events in this view.</div>}
            </div>
            <div className="ops-display-foot"><span>SERVER TIMESTAMPS OR EXPLICIT LOCAL DEMO EVENTS</span><span>READ ONLY</span></div>
          </section>
          <div className="ops-external-feed"><GroveWorkerPanel/></div>
        </div>
        <div className="ops-dossier-rail">
          <div className="ops-rail-title"><span><Server size={14}/> SELECTED TASK / INSPECTOR</span><span>{selected?'RECORD OPEN':'NO SELECTION'}</span></div>
          <MissionInspector mission={selected} now={now} onCancel={onCancel}/>
          <div className="ops-rail-foot"><span className="ops-dot amber"/> NO AUTOMATIC PURCHASES, DEPLOYMENTS OR EXTERNAL TOOLS</div>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [view, setView] = useState<View>('array');
  const [selectedAgentId, setSelectedAgentId] = useState('intelligence-01');
  const [operationsMode, setOperationsMode] = useState<OperationsMode>('general');
  const [objective, setObjective] = useState('');
  const [policy, setPolicy] = useState<ExecutionPolicy>('review');
  const [instructions, setInstructions] = useState('');
  const [missions, setMissions] = useState<Mission[]>([]);
  const previousPhases = useRef<Map<string,MissionPhase>>(new Map());
  const [completionSignal,setCompletionSignal] = useState<CompletionSignal|null>(null);
  const [notificationsEnabled,setNotificationsEnabled] = useState(()=>{
    try {
      return typeof Notification!=='undefined' && Notification.permission==='granted' &&
        window.localStorage.getItem(ALERT_PREF)==='on';
    } catch { return false; }
  });
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [launchedAgentId, setLaunchedAgentId] = useState<string | null>(null);
  const [launchPending, setLaunchPending] = useState(false);
  const [launchSignal, setLaunchSignal] = useState(0);
  const [launchPlaying, setLaunchPlaying] = useState(false);
  const cameraSequence = activeLaunchSignal(launchSignal,launchPlaying);
  const [now, setNow] = useState(() => Date.now());
  const [notice, setNotice] = useState('');
  const [liveMode, setLiveMode] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [liveError, setLiveError] = useState('');
  const [cloudReady, setCloudReady] = useState(false);
  const [cloudError, setCloudError] = useState('');

  useEffect(() => {
    const transitions=missionEndTransitions(previousPhases.current,missions);
    previousPhases.current = new Map(missions.map(m => [m.id,m.phase]));
    if(!transitions.length)return;
    const latest=transitions[0];
    setCompletionSignal({mission:latest,observedAt:Date.now()});
    setSelectedMissionId(latest.id);
    if(!notificationsEnabled || typeof Notification==='undefined' ||
       Notification.permission!=='granted')return;
    // No notification is sent for already-completed history loaded at sign-in.
    for(const mission of transitions){
      const {title,body}=missionEndMessage(mission);
      try {
        const notification=new Notification(title,{body,tag:'array-task-'+mission.id});
        notification.onclick=()=>{
          window.focus();
          setSelectedMissionId(mission.id);
          setView('monitor');
          notification.close();
        };
      } catch {
        // Browser/system blocked notification, but the in-page result still appears.
      }
    }
  },[missions,notificationsEnabled]);

  async function toggleCompletionAlerts() {
    if(notificationsEnabled) {
      setNotificationsEnabled(false);
      try {window.localStorage.removeItem(ALERT_PREF);}catch {/* storage is optional */}
      return;
    }
    if(typeof Notification==='undefined' || !window.isSecureContext) {
      setNotice('This browser does not support page notifications in this context.');
      return;
    }
    // Request permission only in the direct click handler, never on page load.
    let permission:NotificationPermission;
    try {permission=await Notification.requestPermission();}
    catch {setNotice('Browser notification request was unavailable.');return;}
    if(permission!=='granted') {
      setNotificationsEnabled(false);
      setNotice('Notifications were not enabled. Check your browser site permissions.');
      return;
    }
    setNotificationsEnabled(true);
    try {window.localStorage.setItem(ALERT_PREF,'on');}catch {/* optional */}
    setNotice('Mission alerts enabled while ARRAY remains open.');
  }

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
    }, view === 'monitor' && activeCount > 0 ? 80 : 500);
    return () => window.clearInterval(timer);
  }, [view, activeCount]);

  useEffect(() => {
    if (!launchedAgentId) return;
    // Allow the one-shot 10-second alarm to complete and the blastoff tail to fade before switching views.
    const timer = window.setTimeout(() => { setLaunchedAgentId(null); setView('monitor'); }, Math.max(SILO_SEQUENCE_MS + 260, 11_000));
    return () => window.clearTimeout(timer);
  }, [launchedAgentId]);

  useEffect(() => {
    if (!launchPlaying) return;
    const timer = window.setTimeout(() => setLaunchPlaying(false), SILO_SEQUENCE_MS);
    return () => window.clearTimeout(timer);
  }, [launchPlaying, launchSignal]);

  function previewSilo() {
    setLaunchSignal(previous => previous + 1);
    setLaunchPlaying(true);
  }
  function returnToArray() {
    // A historical signal must never replay a launch when the camera remounts.
    setLaunchPlaying(false);
    setLaunchSignal(0);
    setLaunchedAgentId(null);
    setView('array');
  }

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!liveConnected) return;
    let stale = false;
    const lastSavedPhase = new Map<string,string>();
    const poll = async () => {
      try {
        const remote = await listLiveMissions();
        if (stale) return;
        setMissions(previous => {
          const all = [...previous, ...remote];
          return [...new Map(all.map(m => [m.id, m])).values()]
            .sort((a,b) => b.createdAt - a.createdAt).slice(0,50);
        });
        setLiveError('');
        if (cloudReady) {
          for (const mission of remote) {
            const signature = [mission.phase, mission.finishedAt, mission.output, mission.error].join('/');
            if (lastSavedPhase.get(mission.id) === signature) continue;
            lastSavedPhase.set(mission.id, signature);
            void storeMission(mission).catch(error =>
              setCloudError(error instanceof Error ? error.message : 'Supabase history save failed.')
            );
          }
        }
      } catch(error) {
        if (!stale) setLiveError(error instanceof Error ? error.message : 'Live mission refresh failed.');
      }
    };
    void poll();
    const timer = window.setInterval(() => { void poll(); }, 4000);
    return () => { stale=true; window.clearInterval(timer); };
  }, [liveConnected, cloudReady]);

  const displayTime = useMemo(() => new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }), [now]);

  function selectCategory(category: AgentCategory) {
    setSelectedAgentId(getAgentsForCategory(category)[0].id);
  }

  async function launch() {
    if (!objective.trim() || launchedAgentId || launchPending) return;
    if (liveMode) {
      setLaunchPending(true);
      try {
        const mission = await launchLiveMission(selectedAgent.id, objective.trim(), policy, selectedCategory === 'operations' ? operationsMode : 'general', instructions);
        setLaunchedAgentId(selectedAgent.id);
        setMissions(previous => [mission, ...previous].slice(0,50));
        if (cloudReady) void storeMission(mission).catch(error => setCloudError(String(error)));
        setSelectedMissionId(mission.id);
        setObjective('');
        setInstructions('');
        setNotice(`${selectedAgent.name} submitted to live RAVIN using ${mission.model || 'server-selected model'}. Symbolic launch playing.`);
        previewSilo();
      } catch(error) {
        setLaunchedAgentId(null);
        setNotice(error instanceof Error ? error.message : 'Live launch failed.');
      } finally {
        setLaunchPending(false);
      }
      return;
    }
    const mission = createDemoMission({
      agentId: selectedAgent.id,
      agentName: selectedAgent.name,
      category: selectedAgent.category,
      objective,
      policy,
    });
    mission.instructions = instructions.trim();
    mission.operationsMode = selectedCategory === 'operations' ? operationsMode : 'general';
    mission.model = modelForSelection(selectedCategory, operationsMode).id;
    setMissions(previous => [mission, ...previous].slice(0,50));
    if (cloudReady) void storeMission(mission).catch(error => setCloudError(String(error)));
    setSelectedMissionId(mission.id);
    setLaunchedAgentId(selectedAgent.id);
    previewSilo();
    setObjective('');
    setInstructions('');
    setNotice(`${selectedAgent.name} demo sequence deployed. No real AI work started.`);
  }

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginBusy(true); setLoginError('');
    try {
      await signInLive(loginEmail, loginPassword);
      resetArrayCloudIdentity();
      let saved: Mission[] = [];
      try {
        saved = await loadSavedMissions();
        setCloudReady(true); setCloudError('');
      } catch (error) {
        setCloudReady(false);
        setCloudError(error instanceof Error ? error.message : 'Cloud history unavailable.');
      }
      let remote: Mission[] = [];
      let serverOnline = false;
      try {
        remote = await listLiveMissions();
        serverOnline = true; setLiveError('');
      } catch (error) {
        setLiveError(error instanceof Error ? error.message : 'RAVIN worker server is offline.');
      }
      setMissions(previous => {
        const all = [...saved, ...previous.filter(m => m.isDemo), ...remote];
        return [...new Map(all.map(m => [m.id, m])).values()]
          .sort((a,b) => b.createdAt - a.createdAt).slice(0,50);
      });
      setLiveConnected(true); setLiveMode(serverOnline);
      setLoginOpen(false); setLoginPassword('');
      if (policy === 'authorized') setPolicy('review');
      setNotice(serverOnline ? 'RAVIN connected. Supabase mission history checked.' : 'Account authenticated. RAVIN server is unavailable; Supabase history may still sync.');
    } catch(error) {
      signOutLive(); resetArrayCloudIdentity(); setCloudReady(false);
      setLoginError(error instanceof Error ? error.message : 'Could not connect to RAVIN.');
    } finally { setLoginBusy(false); }
  }
  function disconnectLive() {
    signOutLive(); resetArrayCloudIdentity();
    setLiveConnected(false); setLiveMode(false); setCloudReady(false); setCloudError('');
    setMissions([]);
    setNotice('Signed out. Account mission history is no longer shown.');
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
    if (cloudReady) void storeMission(mission).catch(error => setCloudError(String(error)));
    setSelectedMissionId(mission.id);
    setView('monitor');
    setNotice('Test vector launched in simulation mode. No real agent or hardware was activated.');
  }

  async function cancelMission(id: string) {
    const mission = missions.find(item => item.id === id);
    if (!mission) return;
    if (mission.isDemo) {
      const canceled = cancelDemoMission(mission, Date.now());
      setMissions(previous => previous.map(item => item.id === id ? canceled : item));
      if (cloudReady) void storeMission(canceled).catch(error => setCloudError(String(error)));
      setNotice('Local demo mission canceled.');
      return;
    }
    try {
      const canceled = await cancelQueuedLiveMission(id);
      setMissions(previous => previous.map(item => item.id === id ? canceled : item));
      if (cloudReady) void storeMission(canceled).catch(error => setCloudError(String(error)));
      setNotice('Queued live mission canceled.');
    } catch(error) {
      setNotice(error instanceof Error ? error.message : 'Live cancel failed.');
    }
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" aria-hidden="true" /><div className="ambient ambient-two" aria-hidden="true" />
      <header className="site-header">
        <a className="brand" href="#top" onClick={(event) => { event.preventDefault(); returnToArray(); }} aria-label="RAVIN ARRAY, go to launch view">
          <BrandMark />
          <span className="brand-text"><strong>RAVIN <span>/ ARRAY</span></strong><small>RESONANT INTELLIGENCE NETWORK</small></span>
        </a>
        <div className="header-center"><span className="header-line" /><span className="header-route">ARROW ECOSYSTEM <ChevronRight size={12} /> RAVIN <ChevronRight size={12} /> ARRAY</span><span className="header-line" /></div>
        <div className="header-right"><span className="header-clock">{displayTime}</span><span className="simulation-pill"><span className="amber-dot" /> {liveMode ? 'LIVE TEXT MODE' : 'SIMULATION MODE'}</span><a className="header-chat" href={CHAT_URL} target="_blank" rel="noopener noreferrer">RAVIN CHAT <ExternalLink size={13} /></a></div>
      </header>
      <main id="top" className="main-content">
        <div className="intro-row">
          <div><div className="section-kicker"><span className="section-kicker-line" /> MISSION CONTROL / SIMULATED INTERFACE <span className="alpha-index">/ 001</span></div><h1>RAVIN <span>ARRAY</span><span className="title-period">.</span></h1><p className="intro-tagline">Task command interface. <span>Coordinate the RAVIN network.</span></p></div>
          <div className="mode-panel"><div className="mode-panel-head"><span>OPERATIONS TERMINAL</span><span><Radio size={12} /> {liveMode ? 'RAVIN LIVE' : 'LOCAL DEMO'}</span></div><div className="view-toggle" role="group" aria-label="Choose ARRAY view"><button type="button" className={view === 'array' ? 'active' : ''} onClick={returnToArray} aria-pressed={view === 'array'}><Layers3 size={16}/> LAUNCH ARRAY</button><button type="button" className={view === 'monitor' ? 'active' : ''} onClick={() => setView('monitor')} aria-pressed={view === 'monitor'}><Radar size={16}/> FLIGHT MONITOR {activeCount > 0 && <span className="nav-active-count">{activeCount}</span>}</button></div></div>
        </div>
        <div className="connection-toolbar">
          <div className="connection-status"><span className={liveConnected ? 'connection-light connected' : 'connection-light'}/> {liveConnected ? 'RAVIN AUTHENTICATED / TEXT-ONLY WORKERS' : liveApiConfigured() ? 'API ENDPOINT CONFIGURED / SIGN IN TO VERIFY' : 'LIVE BACKEND NOT CONFIGURED / DEMO READY'}{cloudReady ? ' / SUPABASE HISTORY SYNC ON' : ''}</div>
          <div className="connection-actions">
            <button type="button" className={!liveMode ? 'active' : ''} onClick={() => { setLiveMode(false); setPolicy('review'); }} aria-pressed={!liveMode}>SIMULATION</button>
            <button type="button" className={liveMode ? 'active' : ''} onClick={() => { if(liveConnected){setLiveMode(true);if(policy==='authorized')setPolicy('review');}else {setLoginError('');setLoginOpen(true);} }} aria-pressed={liveMode} disabled={!liveApiConfigured()}>{liveConnected ? <Wifi size={13}/> : <LogIn size={13}/>} LIVE RAVIN</button>
            {liveConnected && <button type="button" className="disconnect-action" onClick={disconnectLive} title="Sign out of live RAVIN"><LogOut size={13}/> DISCONNECT</button>}
          </div>
        </div>
        {cloudError && liveConnected && <p className="connection-error" role="status"><WifiOff size={14}/> Supabase history: {cloudError}</p>}
        {liveError && <p className="connection-error" role="alert"><WifiOff size={14}/> {liveError}</p>}
        <div className="stats-strip">
          <span><span className="strip-indicator" /> SYSTEM ONLINE <span className="strip-separator">/</span> {liveMode ? 'LIVE TEXT MISSIONS' : 'INTERFACE PREVIEW'}</span>
          <span>02 <small>DIVISIONS</small><span className="strip-separator">/</span> 12 <small>AGENTS</small></span>
          <span>{activeCount.toString().padStart(2, '0')} <small>IN FLIGHT</small><span className="strip-separator">/</span> {recentCount.toString().padStart(2, '0')} <small>COMPLETED</small></span>
        </div>
        {view === 'array' ? (
          <>
            <div className="canvas-labels"><span><Compass size={14} /> SOFTWARE DEPLOYMENT ARRAY</span><span><span className="legend-item"><i className="legend-idle" /> STANDBY</span><span className="legend-item"><i className="legend-active" /> SELECTED</span><span className="legend-item"><i className="legend-running" /> ACTIVE</span></span></div>
            <div className="array-station">
              <aside className="array-station-left" aria-label="Software worker selection and instructions">
                <div className="station-left-head">
                  <div><span className="eyebrow">WORKSTATION 01</span><strong>AGENT CONFIGURATION</strong></div>
                  <a href={CHAT_URL} target="_blank" rel="noopener noreferrer"><Sparkles size={14}/> RAVIN CORE <ArrowUpRight size={12}/></a>
                </div>
                <div className="station-agent-selector">
                  {CATEGORIES.map(category => <Formation
                    key={category.id} category={category} agents={getAgentsForCategory(category.id)}
                    selectedAgentId={selectedAgentId} launchedAgentId={launchedAgentId}
                    missions={missions} onSelect={setSelectedAgentId}
                  />)}
                </div>
                <CommandDeck selectedAgent={selectedAgent} selectedCategory={selectedCategory}
                  objective={objective} setObjective={setObjective} policy={policy} setPolicy={setPolicy}
                  onSelectCategory={selectCategory} liveMode={liveMode} operationsMode={operationsMode}
                  setOperationsMode={setOperationsMode} instructions={instructions} setInstructions={setInstructions}/>
              </aside>
              <div className="array-station-right">
                <ArrayCanvas launchSignal={cameraSequence} launchPlaying={launchPlaying} onPreview={previewSilo} />
                <DeploymentConsole selectedAgent={selectedAgent.name} objectiveReady={Boolean(objective.trim())}
                  launchSignal={cameraSequence} launchPlaying={launchPlaying} launchPending={launchPending}
                  liveMode={liveMode} onPreview={previewSilo} onDispatch={() => {void launch();}} />
              </div>
            </div>
          </>
        ) : <MonitorView missions={missions} now={now} selectedMissionId={selectedMissionId} setSelectedMissionId={setSelectedMissionId} onCancel={(id) => {void cancelMission(id);}} onGoToArray={returnToArray} onTestLaunch={launchTest} liveConnected={liveConnected} cloudReady={cloudReady}
          completionSignal={completionSignal} onDismissCompletion={()=>setCompletionSignal(null)}
          notificationsEnabled={notificationsEnabled} onToggleNotifications={()=>{void toggleCompletionAlerts();}}/>}
        <footer className="site-footer"><span>RAVIN ARRAY <span className="muted">© ARROW / RESONANT ASSIST</span></span><span><CircleDot size={12} /> {liveMode ? 'TEXT-ONLY RAVIN SESSION' : 'SIMULATION AVAILABLE'} <span className="footer-divider">/</span> PROTOTYPE 0.2.0</span></footer>
      </main>
      {loginOpen && <div className="live-login-backdrop" role="presentation" onClick={(event) => { if(event.target===event.currentTarget && !loginBusy)setLoginOpen(false); }}>
        <form className="live-login" onSubmit={(event) => {void submitLogin(event);}} aria-label="Connect live RAVIN">
          <div className="live-login-head"><div><span className="eyebrow">ARRAY / CONNECT</span><h2>Connect RAVIN<span className="title-period">.</span></h2></div><button type="button" onClick={() => setLoginOpen(false)} aria-label="Close" disabled={loginBusy}><X size={18}/></button></div>
          <p>Use your existing RAVIN account to enable authenticated, text-only AI missions. Passwords are sent only to RAVIN's existing authentication service, and session tokens are held in memory.</p>
          <label htmlFor="live-email">RAVIN ACCOUNT EMAIL</label>
          <input id="live-email" type="email" autoComplete="username" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)}/>
          <label htmlFor="live-password">PASSWORD</label>
          <input id="live-password" type="password" autoComplete="current-password" required value={loginPassword} onChange={e => setLoginPassword(e.target.value)}/>
          {loginError && <p className="live-login-error" role="alert">{loginError}</p>}
          <button type="submit" className="launch-button" disabled={loginBusy || !liveApiConfigured()}><span>{loginBusy ? 'CONNECTING...' : 'SIGN IN & CONNECT'}</span><LogIn size={16}/></button>
          <small>Live RAVIN API: {RAVIN_ARRAY_API ? new URL(RAVIN_ARRAY_API).host : 'Not configured'}. No external tool execution is enabled.</small>
        </form>
      </div>}
      {notice && <div className="toast" role="status"><Check size={16} /> {notice}<button type="button" aria-label="Dismiss notice" onClick={() => setNotice('')}><X size={15}/></button></div>}
    </div>
  );
}
