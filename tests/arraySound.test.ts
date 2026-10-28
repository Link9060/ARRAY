import { describe, expect, it } from 'vitest';
import {ARRAY_AUDIO_FILES,ArraySoundController,cueUrl} from '../src/engine/arraySound';
import {SILO_SEQUENCE_MS} from '../src/engine/siloAnimation';

describe('Night Watch optional cinematic audio',()=>{
 it('maps every sound cue to its requested supplied filename',()=>{
   expect(Object.keys(ARRAY_AUDIO_FILES)).toHaveLength(9);
   expect(ARRAY_AUDIO_FILES.toggle).toContain('dragon-studio-light-switch');
   expect(ARRAY_AUDIO_FILES.cover).toContain('soundreality-switch');
   expect(ARRAY_AUDIO_FILES.verified).toContain('edr-switch-click-and-beep');
   expect(ARRAY_AUDIO_FILES.key).toContain('pietix-sound-effect-switch');
   expect(ARRAY_AUDIO_FILES.dispatch).toContain('freesound_community-breaker');
   expect(ARRAY_AUDIO_FILES.airRaid).toContain('air-raid-siren');
   expect(ARRAY_AUDIO_FILES.greekAlarm).toContain('greece-eas-alarm');
   expect(ARRAY_AUDIO_FILES.blastoff).toContain('rocket-blastoff');
   expect(ARRAY_AUDIO_FILES.checkComplete).toContain('electronic-beep');
 });
 it('supports root and GitHub Pages /ARRAY/ path without constructing broken links',()=>{
   expect(cueUrl('toggle','/ARRAY/')).toBe('/ARRAY/audio/dragon-studio-light-switch-on-382714.mp3');
   expect(cueUrl('cover','/ARRAY')).toBe('/ARRAY/audio/soundreality-switch-150130.mp3');
   expect(cueUrl('checkComplete','/')).toBe('/audio/eaglaxle-electronic-beep-1-453381.mp3');
 });
 it('keeps sounds off until explicitly enabled',()=>{
   const sound=new ArraySoundController();
   expect(sound.enabled).toBe(false);
   sound.play('airRaid',true);
   sound.stopAirRaid();
   sound.setVolume(.4);
   sound.setEnabled(false);
   expect(sound.enabled).toBe(false);
   sound.dispose();
 });
 it('aligns departure sound with the animation movement boundary',()=>{
   expect(Math.round(SILO_SEQUENCE_MS*.29)).toBeGreaterThan(1500);
   expect(Math.round(SILO_SEQUENCE_MS*.29)).toBeLessThan(2500);
 });
});
