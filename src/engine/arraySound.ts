/** Browser audio for a fictional software-dispatch UI.
 * Audio is opt-in, never starts on page load, and has no hardware controls.
 * Public audio files are optional: absent assets produce silent visual fallbacks.
 */
export type ArrayCue =
  | 'toggle' | 'cover' | 'verified' | 'key'
  | 'dispatch' | 'airRaid' | 'greekAlarm' | 'blastoff' | 'checkComplete';

export const ARRAY_AUDIO_FILES: Record<ArrayCue,string> = {
  toggle: 'dragon-studio-light-switch-on-382714.mp3',
  cover: 'soundreality-switch-150130.mp3',
  verified: 'edr-switch-click-and-beep-001a-11602.mp3',
  key: 'pietix-sound-effect-switch-2-535357.mp3',
  dispatch: 'freesound_community-breaker-switch-45684.mp3',
  airRaid: '11325622-air-raid-siren-sound-effect-241383.mp3',
  greekAlarm: 'jeremayjimenez-greece-eas-alarm-451404.mp3',
  blastoff: 'freesound_community-rocket-blastoff-76735.mp3',
  checkComplete: 'eaglaxle-electronic-beep-1-453381.mp3',
};

const CUE_LEVELS: Record<ArrayCue,number> = {
  toggle:.50, cover:.38, verified:.43, key:.50,
  dispatch:.65, airRaid:.22, greekAlarm:.30,
  blastoff:.33, checkComplete:.58,
};

export function cueUrl(cue:ArrayCue, baseUrl='/'):string {
  return baseUrl.replace(/\\/?$/, '/') + 'audio/' + ARRAY_AUDIO_FILES[cue];
}

export class ArraySoundController {
  private playing=new Set<HTMLAudioElement>();
  private siren:HTMLAudioElement|null=null;
  private timers=new Set<ReturnType<typeof setInterval>>();
  private soundOn=false;
  private volume=.38;
  onUnavailable?: (cue:ArrayCue)=>void;

  setEnabled(enabled:boolean) {
    this.soundOn=enabled;
    if(!enabled) this.stopAll();
  }
  get enabled(){return this.soundOn;}
  setVolume(value:number) {
    this.volume=Math.max(0,Math.min(1,value));
    for(const audio of this.playing) {
      const cue=(audio.dataset.arrayCue||'toggle') as ArrayCue;
      audio.volume=this.volume*CUE_LEVELS[cue];
    }
  }

  play(cue:ArrayCue,loop=false):void {
    if(!this.soundOn || typeof Audio==='undefined') return;
    if(cue==='airRaid') this.stopAirRaid(0);
    const base=import.meta.env.BASE_URL || '/';
    const audio=new Audio(cueUrl(cue,base));
    audio.dataset.arrayCue=cue;
    audio.loop=loop;
    audio.preload='auto';
    audio.volume=this.volume*CUE_LEVELS[cue];
    audio.onended=()=>{this.playing.delete(audio);if(this.siren===audio)this.siren=null;};
    audio.onerror=()=>{
      this.playing.delete(audio);
      if(this.siren===audio)this.siren=null;
      this.onUnavailable?.(cue);
    };
    this.playing.add(audio);
    if(cue==='airRaid') this.siren=audio;
    void audio.play().catch(()=>{
      this.playing.delete(audio);
      if(this.siren===audio)this.siren=null;
    });
  }

  stopAirRaid(fadeMs=360) {
    const audio=this.siren;
    this.siren=null;
    if(!audio)return;
    if(fadeMs<=0){audio.pause();audio.currentTime=0;this.playing.delete(audio);return;}
    const original=audio.volume;
    const start=Date.now();
    const id=setInterval(()=>{
      const fraction=Math.min(1,(Date.now()-start)/fadeMs);
      audio.volume=original*(1-fraction);
      if(fraction>=1){
        clearInterval(id);this.timers.delete(id);
        audio.pause();audio.currentTime=0;this.playing.delete(audio);
      }
    },35);
    this.timers.add(id);
  }
  stopAll(){
    for(const timer of this.timers) clearInterval(timer);
    this.timers.clear();
    this.siren=null;
    for(const audio of this.playing){audio.pause();audio.currentTime=0;}
    this.playing.clear();
  }
  dispose(){this.stopAll();this.onUnavailable=undefined;}
}
