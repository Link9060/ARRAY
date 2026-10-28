import {describe,it,expect} from 'vitest';
import {clampMusicVolume,DEFAULT_MUSIC_VOLUME,isAudioFile} from '../src/engine/localMusic';
describe('private local music player',()=>{
 it('keeps independent volume safe and modest by default',()=>{
   expect(DEFAULT_MUSIC_VOLUME).toBeLessThan(.25);
   expect(clampMusicVolume(-5)).toBe(0);
   expect(clampMusicVolume(6)).toBe(1);
   expect(clampMusicVolume(Number.NaN)).toBe(DEFAULT_MUSIC_VOLUME);
   expect(clampMusicVolume(.35)).toBe(.35);
 });
 it('accepts audio but not arbitrary or extremely large files',()=>{
   expect(isAudioFile({name:'Relaxed Scene - James Clarke.mp3',size:3885975,type:'audio/mpeg'})).toBe(true);
   expect(isAudioFile({name:'ambient.ogg',size:1200,type:''})).toBe(true);
   expect(isAudioFile({name:'picture.png',size:2500,type:'image/png'})).toBe(false);
   expect(isAudioFile({name:'song.mp3',size:0,type:'audio/mpeg'})).toBe(false);
   expect(isAudioFile({name:'song.mp3',size:90*1024*1024,type:'audio/mpeg'})).toBe(false);
 });
});
