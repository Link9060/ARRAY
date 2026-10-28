import {useEffect,useRef,useState,type ChangeEvent} from 'react';
import {Music2,Pause,Play,Upload,Volume2,VolumeX,X} from 'lucide-react';
import {
  DEFAULT_MUSIC_VOLUME, MUSIC_VOLUME_PREF,
  clampMusicVolume,isAudioFile,loadSavedTrack,saveLocalTrack,clearLocalTrack,
} from '../engine/localMusic';

/** Separate from ARRAY's fictional launch sound-effect engine.
 * Music is a visitor-selected local file and never leaves their browser.
 */
export default function AmbientMusicControl(){
  const audioRef=useRef<HTMLAudioElement|null>(null);
  const pickerRef=useRef<HTMLInputElement|null>(null);
  const objectUrlRef=useRef<string|null>(null);
  const explicitlySelected=useRef(false);
  const [trackUrl,setTrackUrl]=useState<string|null>(null);
  const [trackName,setTrackName]=useState('');
  const [playing,setPlaying]=useState(false);
  const [message,setMessage]=useState('');
  const [volume,setVolume]=useState(()=>{
    try{
      const value=Number(window.localStorage.getItem(MUSIC_VOLUME_PREF));
      return window.localStorage.getItem(MUSIC_VOLUME_PREF)===null
        ? DEFAULT_MUSIC_VOLUME : clampMusicVolume(value);
    }catch{return DEFAULT_MUSIC_VOLUME;}
  });

  useEffect(()=>{
    let active=true;
    loadSavedTrack().then(track=>{
      if(!active||explicitlySelected.current||!track)return;
      const url=URL.createObjectURL(track.blob);
      objectUrlRef.current=url;
      setTrackUrl(url);
      setTrackName(track.name);
    }).catch(()=>{
      if(active)setMessage('Local music storage is unavailable. You can still play a file this session.');
    });
    return ()=>{
      active=false;
      audioRef.current?.pause();
      if(objectUrlRef.current)URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current=null;
    };
  },[]);

  useEffect(()=>{
    if(audioRef.current)audioRef.current.volume=clampMusicVolume(volume);
  },[volume,trackUrl]);

  function setLocalSource(blob:Blob,name:string){
    audioRef.current?.pause();
    setPlaying(false);
    if(objectUrlRef.current)URL.revokeObjectURL(objectUrlRef.current);
    const url=URL.createObjectURL(blob);
    objectUrlRef.current=url;
    setTrackUrl(url);
    setTrackName(name);
  }

  async function chooseFile(event:ChangeEvent<HTMLInputElement>){
    const file=event.currentTarget.files?.[0];
    event.currentTarget.value='';
    if(!file)return;
    if(!isAudioFile(file)){
      setMessage('Choose an audio file smaller than 80 MB.');
      return;
    }
    explicitlySelected.current=true;
    setLocalSource(file,file.name);
    setMessage('Track ready. Select PLAY MUSIC to begin.');
    try{
      await saveLocalTrack(file,file.name);
      setMessage('Music saved privately in this browser. Ready to play.');
    }catch{
      setMessage('Music is ready for this session; browser storage could not save it.');
    }
  }

  async function toggleMusic(){
    if(!trackUrl){
      pickerRef.current?.click();
      return;
    }
    const audio=audioRef.current;
    if(!audio)return;
    if(!audio.paused){
      audio.pause();
      setPlaying(false);
      setMessage('');
      return;
    }
    try{
      audio.volume=clampMusicVolume(volume);
      audio.loop=true;
      await audio.play();
      setPlaying(true);
      setMessage('');
    }catch{
      setPlaying(false);
      setMessage('Your browser could not play this file. Select another audio track.');
    }
  }

  function changeVolume(next:number){
    const adjusted=clampMusicVolume(next);
    setVolume(adjusted);
    if(audioRef.current)audioRef.current.volume=adjusted;
    try{window.localStorage.setItem(MUSIC_VOLUME_PREF,String(adjusted));}catch{/* optional */}
  }

  async function removeFile(){
    explicitlySelected.current=true;
    audioRef.current?.pause();
    setPlaying(false);
    setTrackUrl(null);
    setTrackName('');
    if(objectUrlRef.current)URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current=null;
    setMessage('Local track cleared.');
    try{await clearLocalTrack();}catch{
      setMessage('Track removed from this session; browser storage could not be cleared.');
    }
  }

  return (
    <section className="ambient-music-strip" aria-label="Separate background music player">
      <div className="ambient-music-inner">
        <div className="ambient-music-heading">
          <span className="ambient-music-icon"><Music2 size={17}/></span>
          <span><strong>BACKGROUND MUSIC</strong><small>PERSONAL AUDIO / SEPARATE FROM SFX</small></span>
        </div>
        <button type="button" className={'ambient-music-toggle'+(playing?' active':'')}
          aria-pressed={playing} onClick={()=>{void toggleMusic();}}>
          {playing?<Pause size={14}/>:<Play size={14}/>}
          {playing?'PAUSE MUSIC':'PLAY MUSIC'}
        </button>
        <div className="ambient-music-track">
          <span className={playing?'ambient-music-indicator playing':'ambient-music-indicator'} />
          <span title={trackName||'Choose a locally stored track'}>
            {trackName||'NO LOCAL TRACK SELECTED'}
          </span>
          <small>{playing?'LOOPING':'STANDBY'}</small>
        </div>
        <label className="ambient-music-volume">
          {volume===0?<VolumeX size={15}/>:<Volume2 size={15}/>}
          <span>VOLUME</span>
          <input type="range" min="0" max="100" step="1"
            aria-label="Background music volume, independent of sound effects"
            value={Math.round(volume*100)}
            onChange={event=>changeVolume(Number(event.currentTarget.value)/100)}/>
          <output>{Math.round(volume*100)}%</output>
        </label>
        <div className="ambient-music-file-actions">
          <button type="button" className="ambient-music-file"
            onClick={()=>pickerRef.current?.click()} title="Choose a local audio file that remains in your browser">
            <Upload size={13}/>{trackUrl?'CHANGE':'ADD TRACK'}
          </button>
          {trackUrl && <button type="button" className="ambient-music-remove" onClick={()=>{void removeFile();}}
            aria-label="Remove privately stored music"><X size={13}/></button>}
          <input ref={pickerRef} type="file" accept="audio/*,.mp3,.ogg,.m4a,.wav"
            className="ambient-music-picker" aria-label="Select local background music"
            onChange={event=>{void chooseFile(event);}}/>
        </div>
      </div>
      <audio ref={audioRef} src={trackUrl??undefined} preload="metadata" loop
        onPause={()=>setPlaying(false)} onPlay={()=>setPlaying(true)}
        onError={()=>setMessage('Unable to decode this music file in your browser.')}/>
      {message && <div className="ambient-music-message" role="status">{message}</div>}
    </section>
  );
}
