import { useEffect, useRef, useState } from 'react';
import { Check, LockKeyhole, ShieldCheck, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { dispatchReady, toggleDispatchCheck, SOFTWARE_CHECK_COUNT } from '../engine/consoleLogic';
import { ArraySoundController } from '../engine/arraySound';
import { SILO_SEQUENCE_MS } from '../engine/siloAnimation';

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

/** A theatrical software-dispatch surface, not a control for physical equipment. */
export default function DeploymentConsole({
  selectedAgent, objectiveReady, launchPlaying, launchPending,
  launchSignal, liveMode, onDispatch, onPreview,
}: Props) {
  const [checks, setChecks] = useState<number[]>([]);
  const [keys, setKeys] = useState<[boolean,boolean]>([false,false]);
  const [coverOpen, setCoverOpen] = useState(false);
  const [soundOn,setSoundOn] = useState(false);
  const [volume,setVolume] = useState(.38);
  const [audioMissing,setAudioMissing] = useState(false);
  const audioRef = useRef<ArraySoundController|null>(null);
  if(!audioRef.current) audioRef.current = new ArraySoundController();
  const audio = audioRef.current;

  useEffect(()=>{
    audio.onUnavailable=()=>setAudioMissing(true);
    const onPageHidden=()=>{if(document.hidden) audio.stopAll();};
    document.addEventListener('visibilitychange',onPageHidden);
    return ()=>{document.removeEventListener('visibilitychange',onPageHidden);audio.dispose();};
  },[audio]);

  useEffect(()=>{
    if(launchSignal<=0)return;
    // The rocket's first modeled movement occurs at 29% of the visual sequence.
    const timer=window.setTimeout(()=>audio.play('blastoff'),SILO_SEQUENCE_MS*.29);
    setChecks([]);
    setKeys([false,false]);
    setCoverOpen(false);
    return ()=>window.clearTimeout(timer);
  },[audio,launchSignal]);

  const preflightReady = checks.length === SOFTWARE_CHECK_COUNT && keys.every(Boolean);
  const ready=dispatchReady(checks,keys[0],keys[1],coverOpen,objectiveReady);
  const busy=launchPlaying || launchPending;

  function switchCheck(index:number){
    if(busy)return;
    const next=toggleDispatchCheck(checks,index);
    if(next.length===checks.length && next.every((v,i)=>v===checks[i]))return;
    setChecks(next);
    audio.play('toggle');
    if(next.length===SOFTWARE_CHECK_COUNT && checks.length!==SOFTWARE_CHECK_COUNT) {
      // Distinct confirmation chirp after the final of three checks.
      audio.play('checkComplete');
    }
    if(next.length<SOFTWARE_CHECK_COUNT && keys.some(Boolean)){
      audio.stopAirRaid();
      setKeys([false,false]);
      setCoverOpen(false);
    }
  }

  function turnKey(index:number){
    if(busy || checks.length!==SOFTWARE_CHECK_COUNT)return;
    const next: [boolean,boolean]=keys.map((value,i)=>i===index?!value:value) as [boolean,boolean];
    const firstTurn=!keys.some(Boolean) && next.some(Boolean);
    const verified=!keys.every(Boolean) && next.every(Boolean);
    setKeys(next);
    if(!next.every(Boolean))setCoverOpen(false);
    audio.play('key');
    if(firstTurn)audio.play('airRaid',true);
    if(verified)audio.play('verified');
  }

  function flipCover(){
    if(busy || !preflightReady)return;
    setCoverOpen(v=>!v);
    audio.play('cover');
  }

  function reset(){
    audio.stopAirRaid(0);
    setChecks([]);
    setKeys([false,false]);
    setCoverOpen(false);
  }

  function dispatch(){
    if(!ready || busy)return;
    audio.stopAirRaid(0);
    audio.play('dispatch');
    audio.play('greekAlarm');
    onDispatch();
  }

  function cameraTest(){
    if(busy)return;
    audio.stopAirRaid(0);
    onPreview();
  }

  function changeSound(){
    const next=!soundOn;
    setSoundOn(next);
    audio.setEnabled(next);
    audio.setVolume(volume);
    if(next)setAudioMissing(false);
  }

  return (
    <section className="station-dispatch" aria-label="Fictional software agent deployment desk">
      <div className="station-dispatch-header">
        <span>RAVIN ARRAY / AGENT DISPATCH CONSOLE</span>
        <span className="station-dispatch-status">
          <span className={preflightReady ? 'station-indicator on' : 'station-indicator'} />
          {busy?'TASK SEQUENCE':ready?'DISPATCH READY':'STANDBY'}
        </span>
      </div>
      <div className="station-dispatch-subhead">
        <ShieldCheck size={14}/> SOFTWARE MISSIONS ONLY
        <div className="console-audio-controls" aria-label="Camera and console audio">
          <button type="button" className="sound-power" aria-pressed={soundOn} onClick={changeSound}
            title={soundOn?'Mute all sound effects':'Enable supplied sound effects'}>
            {soundOn?<Volume2 size={15}/>:<VolumeX size={15}/>}
            <span>SOUND {soundOn?'ON':'OFF'}</span>
          </button>
          <label className="console-volume-control">
            <span>LEVEL</span>
            <input type="range" min={0} max={100} value={Math.round(volume*100)}
              disabled={!soundOn} onChange={event=>{
                const v=Number(event.target.value)/100;
                setVolume(v);audio.setVolume(v);
              }} aria-label="Sound effect volume"/>
          </label>
        </div>
      </div>
      {audioMissing && soundOn &&
        <div className="console-audio-warning" role="status">
          Audio files are not installed. Add the supplied MP3 files to <code>public/audio/</code>. Visual controls still work.
        </div>}
      <div className="station-dispatch-sections">
        <div className="switch-bank">
          <div className="console-bank-title">01 / SOFTWARE CHECKS <span>{checks.length}/3 SELECTED</span></div>
          <div className="toggle-rail">
            {['A','B','C','D','E','F'].map((label,index)=>{
              const active=checks.includes(index);
              return <button key={label} type="button"
                className={'console-switch'+(active?' is-on':'')}
                aria-pressed={active} aria-label={'Software check '+label+(active?' enabled':' disabled')}
                disabled={busy||(!active&&checks.length>=SOFTWARE_CHECK_COUNT)}
                onClick={()=>switchCheck(index)}>
                <span className="console-switch-track"><span className="console-switch-lever">
                  <span className="console-switch-thumb"/>
                </span></span>
                <strong>{label}</strong>
                <small>{active?'ACTIVE':'OFF'}</small>
              </button>;
            })}
          </div>
        </div>
        <div className="key-bank">
          <div className="console-bank-title">02 / DIGITAL VERIFICATION</div>
          <div className="key-rail">
            {keys.map((active,index)=>
              <button type="button" key={index}
                className={'console-key'+(active?' is-on':'')}
                aria-label={'Turn digital verification dial '+(index+1)} aria-pressed={active}
                disabled={busy || checks.length!==SOFTWARE_CHECK_COUNT}
                onClick={()=>turnKey(index)}>
                <span className="console-key-ring"><span className="console-key-slot"/></span>
                <span>VERIFY {index===0?'I':'II'}</span><small>{active?'CONFIRMED':'TURN'}</small>
              </button>)}
          </div>
          <div className="key-status"><span className={preflightReady?'ready':''}/>
            {preflightReady?'BOTH VERIFIED':'VERIFICATION REQUIRED'}
          </div>
        </div>
        <div className="guard-bank">
          <div className="console-bank-title">03 / FINAL AGENT DISPATCH</div>
          <div className="guard-console-frame">
            <div className="guard-light-row" aria-live="polite">
              <span className={'guard-ready-led '+(preflightReady?'green':'red')}/>
              <strong>{preflightReady?'COVER UNLOCKED':'COVER LOCKED'}</strong>
            </div>
            <div className="guard-assembly">
              <button type="button" className={'guarded-deploy-button'+(coverOpen?' uncovered':'')}
                disabled={!ready||busy} onClick={dispatch}
                aria-label={liveMode?'Dispatch selected AI software task':'Run selected demo task'}>
                <span className="guarded-deploy-cap"><Check size={16}/></span>
                <span>{launchPending?'SUBMITTING':liveMode?'DISPATCH':'DEMO TASK'}</span>
              </button>
              <button type="button" className={'guard-lid'+(coverOpen?' lifted':'')}
                aria-label={coverOpen?'Close protective software dispatch cover':'Lift protective software dispatch cover'}
                aria-expanded={coverOpen}
                disabled={busy||!preflightReady} onClick={flipCover}>
                <span className="guard-lid-window"><LockKeyhole size={17}/></span>
                <span>{coverOpen?'LOWER COVER':'LIFT COVER'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="station-dispatch-footer">
        <span>SELECTED: {selectedAgent.toUpperCase()}</span>
        <span>{!objectiveReady?'ENTER AN OBJECTIVE TO DISPATCH':'OBJECTIVE RECORDED'}</span>
        <button type="button" onClick={reset} disabled={busy}><RotateCcw size={11}/> RESET</button>
        <button type="button" onClick={cameraTest} disabled={busy}>CAMERA TEST / NO MISSION</button>
      </div>
    </section>
  );
}
