import { describe, expect, it } from 'vitest';
import {evolveSmoke,SMOKE_LIFETIME_MS} from '../src/engine/smokeTrail';
describe('independent decorative smoke',()=>{
 const seed={bornAt:1000,x:0,y:3,z:0,size:.65,phase:2};
 it('persists after the launch animation ends',()=>{
   const during=evolveSmoke(seed,6500);
   const after=evolveSmoke(seed,9000);
   expect(after.alive).toBe(true);
   expect(after.size).toBeGreaterThan(during.size);
   expect(after.x).toBeGreaterThan(during.x);
 });
 it('fades and expands gradually with its own age',()=>{
   const fresh=evolveSmoke(seed,1600);
   const late=evolveSmoke(seed,10500);
   expect(late.size).toBeGreaterThan(fresh.size);
   expect(late.alpha).toBeLessThan(fresh.alpha);
   expect(late.y).toBeGreaterThan(fresh.y);
 });
 it('expires separately from launch timeline',()=>{
   expect(evolveSmoke(seed,1000+SMOKE_LIFETIME_MS-1).alive).toBe(true);
   expect(evolveSmoke(seed,1000+SMOKE_LIFETIME_MS).alive).toBe(false);
 });
});
