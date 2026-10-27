import { useEffect, useState } from 'react';
import { Check, LockKeyhole, ShieldCheck, RotateCcw } from 'lucide-react';
import { dispatchReady, toggleDispatchCheck, SOFTWARE_CHECK_COUNT } from '../engine/consoleLogic';

type Props = {
  selectedAgent: string;
  objectiveReady: boolean;
  launchPlaying: boolean;
  launchPending: boolean;
  launchSignal: number;
  liveMode: boolean;
  onDispatch: () => void;
  onPreview: () => void;
};

/** A theatrical software-dispatch control surface, not a real launch system. */
export default function DeploymentConsole({
  selectedAgent, objectiveReady, launchPlaying, launchPending,
  launchSignal, liveMode, onDispatch, onPreview,
}: Props) {
  const [checks, setChecks] = useState<number[]>([]);
  const [keys, setKeys] = useState<[boolean, boolean]>([false, false]);
  const [coverOpen, setCoverOpen] = useState(false);
  useEffect(() => {
    setChecks([]);
    setKeys([false, false]);
    setCoverOpen(false);
  }, [launchSignal]);

  const preflightReady = checks.length === SOFTWARE_CHECK_COUNT && keys.every(Boolean);
  const ready = dispatchReady(checks, keys[0], keys[1], coverOpen, objectiveReady);
  const busy = launchPlaying || launchPending;
  return (
    <section className="station-dispatch" aria-label="Fictional software agent deployment desk">
      <div className="station-dispatch-header">
        <span>RAVIN ARRAY / AGENT DISPATCH CONSOLE</span>
        <span className="station-dispatch-status"><span className={preflightReady ? 'station-indicator on' : 'station-indicator'} /> {busy ? 'TASK SEQUENCE' : ready ? 'DISPATCH READY' : 'STANDBY'}</span>
      </div>
      <div className="station-dispatch-subhead"><ShieldCheck size={14} /> THEATRICAL UI · SOFTWARE TASKS ONLY <span>6 CHECKS / 2 DIGITAL KEYS</span></div>
      <div className="station-dispatch-sections">
        <div className="switch-bank">
          <div className="console-bank-title">01 / SELECT THREE SOFTWARE CHECKS <span>{checks.length}/3</span></div>
          <div className="toggle-rail">
            {['A','B','C','D','E','F'].map((label,index) => {
              const active = checks.includes(index);
              return <button key={label} type="button" className={active ? 'console-switch is-on' : 'console-switch'}
                aria-pressed={active} aria-label={'Software check ' + label + (active ? ' enabled' : ' disabled')}
                disabled={busy || (!active && checks.length >= SOFTWARE_CHECK_COUNT)}
                onClick={() => setChecks(old => toggleDispatchCheck(old,index))}>
                <span className="console-switch-track"><span className="console-switch-lever" /></span>
                <strong>{label}</strong><small>{active ? 'ON' : 'OFF'}</small>
              </button>;
            })}
          </div>
        </div>
        <div className="key-bank">
          <div className="console-bank-title">02 / DIGITAL VERIFICATION</div>
          <div className="key-rail">
            {keys.map((active,index) => (
              <button type="button" key={index} className={active ? 'console-key is-on' : 'console-key'}
                aria-label={'Turn digital verification dial ' + (index+1)}
                aria-pressed={active} disabled={busy || checks.length !== SOFTWARE_CHECK_COUNT}
                onClick={() => setKeys(previous => previous.map((value,i) => i===index ? !value : value) as [boolean,boolean])}>
                <span className="console-key-ring"><span className="console-key-slot" /></span>
                <span>VERIFY {index===0?'I':'II'}</span><small>{active?'CONFIRMED':'TURN'}</small>
              </button>
            ))}
          </div>
        </div>
        <div className="guard-bank">
          <div className="console-bank-title">03 / FINAL SOFTWARE DISPATCH</div>
          <div className="guard-unit">
            <button type="button" className={coverOpen ? 'guard-lid lifted' : 'guard-lid'}
              aria-expanded={coverOpen} disabled={busy || !preflightReady} onClick={() => setCoverOpen(value => !value)}>
              <span className="guard-lid-window"><LockKeyhole size={18}/></span>
              <span>{coverOpen ? 'CLOSE GUARD' : 'LIFT SAFETY COVER'}</span>
            </button>
            <button className="guarded-deploy-button" type="button" disabled={!ready || busy}
              onClick={onDispatch}><span className="guarded-deploy-cap"><Check size={15}/></span>
              {launchPending ? 'SUBMITTING...' : liveMode ? 'DISPATCH AGENT' : 'RUN DEMO TASK'}
            </button>
          </div>
        </div>
      </div>
      <div className="station-dispatch-footer">
        <span>SELECTED: {selectedAgent.toUpperCase()}</span>
        <span>{!objectiveReady ? 'ENTER AN OBJECTIVE TO DISPATCH' : 'OBJECTIVE RECORDED'}</span>
        <button type="button" onClick={() => {setChecks([]);setKeys([false,false]);setCoverOpen(false);}} disabled={busy}><RotateCcw size={11}/> RESET</button>
        <button type="button" onClick={onPreview} disabled={busy}>CAMERA DEMO / NO MISSION</button>
      </div>
    </section>
  );
}
