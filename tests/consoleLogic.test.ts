import {describe,it,expect} from 'vitest';
import {dispatchReady,toggleDispatchCheck} from '../src/engine/consoleLogic';
describe('fictional agent dispatch control',()=>{
 it('permits any three independent software checks among six',()=>{
   const a=toggleDispatchCheck([],0);
   const b=toggleDispatchCheck(a,2);
   const c=toggleDispatchCheck(b,5);
   expect(c).toEqual([0,2,5]);
   expect(toggleDispatchCheck(c,4)).toEqual(c);
   expect(toggleDispatchCheck(c,2)).toEqual([0,5]);
 });
 it('requires three checks, two digital verifications, an open cover, and an objective',()=>{
   const c=[1,3,5];
   expect(dispatchReady(c,true,true,true,true)).toBe(true);
   expect(dispatchReady(c,false,true,true,true)).toBe(false);
   expect(dispatchReady(c,true,true,false,true)).toBe(false);
   expect(dispatchReady(c,true,true,true,false)).toBe(false);
   expect(dispatchReady([1,1,3],true,true,true,true)).toBe(false);
   expect(dispatchReady([1,2,6],true,true,true,true)).toBe(false);
 });
});
