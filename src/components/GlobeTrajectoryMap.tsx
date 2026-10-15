import { useEffect, useRef } from 'react';
import { Radio } from 'lucide-react';
import { createCloudRenderer, fitCanvas } from '../lib/orbit-particle-renderer';
import { arcPosition, pointIsForeground, projectGlobe, routeForMission, type GlobeRoute, type Projected, type ViewRotation } from '../engine/globe';
import { demoFlightFraction } from '../engine/flightPath';
import type { Mission } from '../engine/mission';

interface Props {
  missions: Mission[];
  selectedMissionId: string | null;
  onSelect: (id: string) => void;
  now: number;
}
type Flight = { mission: Mission; route: GlobeRoute; track: Projected[]; progress: number; current: Projected; future: Projected };
type ClickTarget = { id: string; x: number; y: number };

const TAU = Math.PI * 2;
const orbit = createCloudRenderer(false, { density: .72, size: 1.04 });
const tracks = new Map<string, GlobeRoute>();

function savedRoute(id: string): GlobeRoute {
  let route = tracks.get(id);
  if (!route) {
    if (tracks.size > 70) tracks.clear();
    route = routeForMission(id);
    tracks.set(id, route);
  }
  return route;
}

function drawBackdrop(ctx: CanvasRenderingContext2D, width: number, height: number, cx: number, cy: number, radius: number) {
  const grad = ctx.createRadialGradient(cx, cy, radius * .3, cx, cy, radius * 2.9);
  grad.addColorStop(0, 'rgba(62,94,159,.15)');
  grad.addColorStop(.5, 'rgba(32,51,90,.075)');
  grad.addColorStop(1, 'rgba(7,14,24,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.lineWidth = .7;
  ctx.strokeStyle = 'rgba(145,174,227,.075)';
  for (let i = 1; i < 7; i++) {
    const x = width * i / 7;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
  }
  for (let i = 1; i < 5; i++) {
    const y = height * i / 5;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
  }
  ctx.lineWidth = .8;
  ctx.strokeStyle = 'rgba(143,166,212,.19)';
  for (const r of [1.21, 1.65, 2.07]) {
    ctx.setLineDash([2, 9]);
    ctx.beginPath(); ctx.arc(cx, cy, radius * r, 0, TAU); ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(162,189,239,.13)';
  ctx.beginPath(); ctx.moveTo(cx - radius * 2.4, cy); ctx.lineTo(cx + radius * 2.4, cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - radius * 1.8); ctx.lineTo(cx, cy + radius * 1.8); ctx.stroke();
}

function drawGlobeBase(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number) {
  const shadow = ctx.createRadialGradient(cx - radius * .28, cy - radius * .35, 2, cx, cy, radius * 1.2);
  shadow.addColorStop(0, 'rgba(36,54,81,.50)');
  shadow.addColorStop(.64, 'rgba(14,25,41,.89)');
  shadow.addColorStop(1, 'rgba(8,15,27,.99)');
  ctx.fillStyle = shadow;
  ctx.beginPath(); ctx.arc(cx, cy, radius * 1.012, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(157,186,238,.27)';
  ctx.lineWidth = .9;
  ctx.beginPath(); ctx.arc(cx, cy, radius * 1.01, 0, TAU); ctx.stroke();
}

function globeWireframe(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, rot: ViewRotation) {
  ctx.lineWidth = .75;
  ctx.strokeStyle = 'rgba(162,192,243,.16)';
  for (const lat of [-60, -30, 0, 30, 60]) {
    for (let lon = 0; lon < 360; lon += 4) {
      const latRad = lat * Math.PI / 180;
      const f = Math.cos(latRad);
      const a = lon * Math.PI / 180, b = (lon + 4) * Math.PI / 180;
      const p = projectGlobe({ x:f*Math.cos(a), y:Math.sin(latRad), z:f*Math.sin(a) },rot,cx,cy,radius);
      const q = projectGlobe({ x:f*Math.cos(b), y:Math.sin(latRad), z:f*Math.sin(b) },rot,cx,cy,radius);
      if (p.z < 0 || q.z < 0) continue;
      ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(q.x,q.y); ctx.stroke();
    }
  }
  for (let lon = 0; lon < 360; lon += 30) {
    const angle = lon * Math.PI / 180;
    for (let lat = -88; lat < 88; lat += 4) {
      const a = lat*Math.PI/180, b=(lat+4)*Math.PI/180;
      const p = projectGlobe({x:Math.cos(a)*Math.cos(angle),y:Math.sin(a),z:Math.cos(a)*Math.sin(angle)},rot,cx,cy,radius);
      const q = projectGlobe({x:Math.cos(b)*Math.cos(angle),y:Math.sin(b),z:Math.cos(b)*Math.sin(angle)},rot,cx,cy,radius);
      if (p.z < 0 || q.z < 0) continue;
      ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(q.x,q.y); ctx.stroke();
    }
  }
}

function drawTrack(ctx: CanvasRenderingContext2D, flight: Flight, foreground: boolean, selected: boolean) {
  const { track, progress } = flight;
  for (let i = 0; i < track.length; i += 2) {
    const p = track[i];
    const front = pointIsForeground(p);
    if (front !== foreground) continue;
    const t = i / (track.length - 1);
    const traveled = t <= progress;
    const size = selected ? 1.6 : 1.25;
    ctx.beginPath();
    ctx.arc(p.x, p.y, traveled ? size * 1.16 : size, 0, TAU);
    const alpha = !foreground ? .08 : traveled ? (selected ? .93 : .74) : (selected ? .49 : .27);
    ctx.fillStyle = foreground ? 'rgba(202,222,255,' + alpha + ')' : 'rgba(91,117,167,' + alpha + ')';
    ctx.fill();
  }
}

function drawMarker(ctx: CanvasRenderingContext2D, p: Projected, color: string, selected: boolean, animation: number) {
  if (!pointIsForeground(p)) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = selected ? 1.35 : 1;
  ctx.globalAlpha = selected ? .87 : .62;
  ctx.beginPath(); ctx.arc(p.x,p.y,selected ? 6.5 : 5.2,0,TAU); ctx.stroke();
  ctx.globalAlpha = .85;
  ctx.fillStyle = color;
  ctx.beginPath();ctx.arc(p.x,p.y,1.8,0,TAU);ctx.fill();
  if (animation > 0) {
    ctx.globalAlpha = .45 * (1-animation);
    ctx.beginPath();ctx.arc(p.x,p.y,7 + animation * 23,0,TAU);ctx.stroke();
  }
  ctx.restore();
}

function drawVector(ctx: CanvasRenderingContext2D, flight: Flight, selected: boolean) {
  const p = flight.current;
  if (!pointIsForeground(p)) return;
  const next = flight.future;
  const angle = Math.atan2(next.y-p.y,next.x-p.x);
  ctx.save();
  const glow = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,selected ? 24 : 16);
  glow.addColorStop(0,'rgba(216,232,255,.48)');glow.addColorStop(1,'rgba(140,179,254,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();ctx.arc(p.x,p.y,selected ? 24 : 16,0,TAU);ctx.fill();
  ctx.translate(p.x,p.y);ctx.rotate(angle);
  ctx.strokeStyle = 'rgba(158,201,255,.52)';ctx.lineWidth = 2;
  ctx.beginPath();ctx.moveTo(-22,0);ctx.lineTo(-7,0);ctx.stroke();
  ctx.fillStyle = flight.mission.phase === 'succeeded' ? '#9fe6cc' : '#e6f0ff';
  ctx.strokeStyle = '#99bdf5';ctx.lineWidth = .75;
  ctx.beginPath();ctx.moveTo(11,0);ctx.lineTo(-8,-5.5);ctx.lineTo(-5,0);ctx.lineTo(-8,5.5);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.restore();
  if (selected) {
    const label = flight.mission.agentName.toUpperCase();
    const lx = Math.max(12,Math.min(p.x+18, ctx.canvas.width / (ctx.getTransform().a || 1) - 112));
    ctx.fillStyle = '#e0edff';
    ctx.font = '10px monospace';
    ctx.fillText(label, lx, p.y-21);
  }
}

export default function GlobeTrajectoryMap({ missions, selectedMissionId, onSelect, now }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ missions, selectedMissionId, onSelect, now });
  const targetRef = useRef<ClickTarget[]>([]);
  const yawOffsetRef = useRef(0);
  stateRef.current = { missions, selectedMissionId, onSelect, now };

  useEffect(() => {
    const canvas = canvasRef.current;
    const shell = shellRef.current;
    const ctx = canvas?.getContext('2d',{alpha:true});
    if (!canvas || !shell || !ctx) return;
    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduceMotion = reduceMotionQuery.matches;
    const onMotion = (event: MediaQueryListEvent) => { reduceMotion = event.matches; };
    reduceMotionQuery.addEventListener('change',onMotion);
    let width=1, height=1, centerX=0, centerY=0, radius=1, scale=1;
    const resize=()=>{
      const bounds=shell.getBoundingClientRect();
      width=Math.max(1,bounds.width);
      height=Math.max(1,bounds.height);
      centerX=width*.5;
      centerY=height*.50;
      radius=Math.min(width*.285,height*.355,230);
      const nativeRadius=Math.min(width*.228,height*.258,292);
      scale=radius/Math.max(1,nativeRadius);
      fitCanvas(canvas,ctx,width,height);
    };
    const observer=new ResizeObserver(resize);
    observer.observe(shell);
    resize();

    let frame=0, lastFrame=-1000, disposed=false;
    const origin=performance.now();
    const draw=(time:number)=>{
      if(disposed)return;
      frame=requestAnimationFrame(draw);
      if(document.hidden || time-lastFrame < (reduceMotion ? 250 : 28))return;
      lastFrame=time;
      ctx.clearRect(0,0,width,height);
      const seconds=reduceMotion?0:(time-origin)/1000;
      const rot:ViewRotation={yaw:seconds*.052+yawOffsetRef.current+.35,pitch:reduceMotion ? -.14 : -.14+Math.sin(seconds*.14)*.028,roll:reduceMotion?0:Math.sin(seconds*.09)*.016};
      drawBackdrop(ctx,width,height,centerX,centerY,radius);
      const state=stateRef.current;
      const displayed=state.missions.slice(0,6);
      const timestamp=Date.now();
      const flights:Flight[]=displayed.map(mission=>{
        const route=savedRoute(mission.id);
        const progress=demoFlightFraction(mission,timestamp);
        const track:Projected[]=[];
        for(let i=0;i<=96;i++)track.push(projectGlobe(arcPosition(route,i/96),rot,centerX,centerY,radius));
        const current=projectGlobe(arcPosition(route,progress),rot,centerX,centerY,radius);
        const future=projectGlobe(arcPosition(route,Math.min(1,progress+.012)),rot,centerX,centerY,radius);
        return {mission,route,track,progress,current,future};
      });
      for(const f of flights)drawTrack(ctx,f,false,f.mission.id===state.selectedMissionId);
      drawGlobeBase(ctx,centerX,centerY,radius);
      orbit(ctx,centerX,centerY,width,seconds,true,{scale,yaw:rot.yaw,pitch:rot.pitch,roll:rot.roll,reduceMotion});
      globeWireframe(ctx,centerX,centerY,radius,rot);
      const clickTargets:ClickTarget[]=[];
      for(const f of flights) {
        const selected=f.mission.id===state.selectedMissionId;
        drawTrack(ctx,f,true,selected);
        const start=projectGlobe(f.route.start,rot,centerX,centerY,radius);
        const end=projectGlobe(f.route.end,rot,centerX,centerY,radius);
        const launching=f.mission.phase==='deploying';
        const completed=f.mission.phase==='succeeded';
        const arrivalAge=completed && f.mission.finishedAt ? (timestamp-f.mission.finishedAt) / 2400 : -1;
        drawMarker(ctx,start,'#aec4f7',selected,launching ? (seconds % 1.2)/1.2 : 0);
        drawMarker(ctx,end,completed?'#a8edcb':'#8baccb',selected,arrivalAge>=0 && arrivalAge < 1 ? arrivalAge : 0);
        if(f.mission.phase!=='canceled' && f.mission.phase!=='failed')drawVector(ctx,f,selected);
        if(pointIsForeground(f.current))clickTargets.push({id:f.mission.id,x:f.current.x,y:f.current.y});
      }
      targetRef.current=clickTargets;
      ctx.strokeStyle='rgba(195,216,251,.15)';
      ctx.lineWidth=1;
      const ticks=radius*1.7;
      for(const corner of [-1,1]){
        ctx.beginPath();ctx.moveTo(centerX + corner*ticks,centerY-9);ctx.lineTo(centerX+corner*ticks,centerY+9);ctx.stroke();
      }
    };
    frame=requestAnimationFrame(draw);

    let pointer:{id:number;x:number;y:number;dragged:boolean}|null=null;
    const pointerDown=(event:PointerEvent)=>{
      if(event.button!==0)return;
      pointer={id:event.pointerId,x:event.clientX,y:event.clientY,dragged:false};
      canvas.setPointerCapture(event.pointerId);
    };
    const pointerMove=(event:PointerEvent)=>{
      if(!pointer || pointer.id!==event.pointerId)return;
      const dx=event.clientX-pointer.x,dy=event.clientY-pointer.y;
      if(Math.abs(dx)+Math.abs(dy)>2)pointer.dragged=true;
      if(pointer.dragged && !reduceMotion)yawOffsetRef.current+=dx*.0054;
      pointer.x=event.clientX;pointer.y=event.clientY;
    };
    const pointerUp=(event:PointerEvent)=>{
      if(!pointer || pointer.id!==event.pointerId)return;
      const wasDragged=pointer.dragged;
      pointer=null;
      if(wasDragged)return;
      const bounds=canvas.getBoundingClientRect();
      const x=event.clientX-bounds.left,y=event.clientY-bounds.top;
      const candidate=targetRef.current.find(t=>Math.hypot(t.x-x,t.y-y)<24);
      if(candidate)stateRef.current.onSelect(candidate.id);
    };
    canvas.addEventListener('pointerdown',pointerDown);
    canvas.addEventListener('pointermove',pointerMove);
    canvas.addEventListener('pointerup',pointerUp);
    canvas.addEventListener('pointercancel',pointerUp);
    return ()=>{
      disposed=true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      reduceMotionQuery.removeEventListener('change',onMotion);
      canvas.removeEventListener('pointerdown',pointerDown);
      canvas.removeEventListener('pointermove',pointerMove);
      canvas.removeEventListener('pointerup',pointerUp);
      canvas.removeEventListener('pointercancel',pointerUp);
    };
  },[]);

  return (
    <div className="trajectory-map globe-monitor" ref={shellRef}>
      <div className="map-topline"><span>ORBITAL FLIGHT MONITOR</span><span>PARTICLE GLOBE / SIMULATION <Radio size={13}/></span></div>
      <canvas ref={canvasRef} aria-label="Rotating ARROW Orbit particle globe with simulated agent flight trajectories. Drag to rotate. Mission list below provides keyboard access." role="img" className="globe-monitor-canvas" />
      {missions.length===0 && <div className="globe-empty">
        <strong>NO MISSIONS IN FLIGHT</strong>
        <span>Run a TEST LAUNCH to preview a flight vector.</span>
      </div>}
      <div className="globe-legend" aria-hidden="true"><span><i/> LAUNCH</span><span><i/> FLIGHT PATH</span><span><i/> ARRIVAL</span></div>
      <div className="map-bottomline"><span>DRAG TO ROTATE / ORBIT-STYLE PARTICLE ENGINE</span><span>ABSTRACT MISSIONS / NO LIVE TELEMETRY</span></div>
    </div>
  );
}
