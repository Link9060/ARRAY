import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { evolveSmoke, SMOKE_EMIT_INTERVAL_MS, type SmokeSeed } from '../engine/smokeTrail';
import {
  siloPose, siloModelY, siloModelVisible, siloCameraLift, siloExitOffset, siloVisualAlert, SILO_SEQUENCE_MS,
  SILO_DECK_Y, SILO_MODEL_SCALE_Y,
} from '../engine/siloAnimation';

type Props = { launchSignal: number };

/**
 * Fictional cold-war-inspired launch-bay exhibit for software tasks.
 * Shapes, hazard graphics and motion are decorative, not weapon engineering.
 */
function createHazardMark(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is unavailable.');
  ctx.clearRect(0, 0, 256, 256);
  ctx.fillStyle = '#d9bd67';
  ctx.beginPath();
  ctx.arc(128, 128, 113, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#10120e';
  for (let i = 0; i < 3; i++) {
    const angle = -Math.PI / 2 + i * Math.PI * 2 / 3;
    ctx.beginPath();
    ctx.arc(128, 128, 88, angle - .43, angle + .43);
    ctx.arc(128, 128, 27, angle + .43, angle - .43, true);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(128, 128, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#10120e';
  ctx.lineWidth = 11;
  ctx.beginPath();
  ctx.arc(128, 128, 109, 0, Math.PI * 2);
  ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createStencil(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is unavailable.');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#c9d1b3';
  ctx.textAlign = 'center';
  ctx.font = 'bold 68px monospace';
  ctx.fillText('ARRAY // 06', 256, 77);
  ctx.font = 'bold 26px monospace';
  ctx.fillStyle = '#dbbe6a';
  ctx.fillText('FICTIONAL · DISPLAY', 256, 127);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Deterministic procedural surface variation, without downloaded textures or assets. */
function createSteelTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is unavailable.');
  ctx.fillStyle = '#8f8f8f';
  ctx.fillRect(0,0,512,512);
  let seed = 137;
  const next = () => { seed = (Math.imul(seed,1664525)+1013904223)|0; return (seed>>>0)/4294967296; };
  for (let i=0; i<21000; i++) {
    const c = Math.floor(85 + next()*90);
    ctx.fillStyle = `rgba(${c},${c},${c},${.03 + next()*.15})`;
    ctx.fillRect(next()*512,next()*512,1+next()*2,1+next()*7);
  }
  for (let i=0; i<85; i++) {
    ctx.strokeStyle = `rgba(28,32,28,${.02+next()*.08})`;
    ctx.lineWidth=.3+next();
    ctx.beginPath();
    const x=next()*512,y=next()*512;
    ctx.moveTo(x,y);
    ctx.lineTo(x+next()*62,y+next()*3);
    ctx.stroke();
  }
  const texture=new THREE.CanvasTexture(canvas);
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.set(1.3,2.3);
  return texture;
}


/** Legible, high-contrast fictional location placard for the camera feed. */
/** Soft photographic spill, not a visible polygonal beam. */
function createBeaconSpillTexture(): THREE.CanvasTexture {
  const canvas=document.createElement('canvas');
  canvas.width=256;canvas.height=256;
  const ctx=canvas.getContext('2d');
  if(!ctx) throw new Error('Canvas 2D unavailable');
  const g=ctx.createRadialGradient(128,128,8,128,128,128);
  g.addColorStop(0,'rgba(255,255,235,.62)');
  g.addColorStop(.23,'rgba(255,236,189,.30)');
  g.addColorStop(.63,'rgba(255,228,175,.07)');
  g.addColorStop(1,'rgba(255,221,170,0)');
  ctx.fillStyle=g;ctx.fillRect(0,0,256,256);
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  return texture;
}

function createFlareTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is unavailable.');
  const grad = ctx.createRadialGradient(64,32,8,64,115,147);
  grad.addColorStop(0,'rgba(255,255,235,.96)');
  grad.addColorStop(.13,'rgba(255,222,124,.95)');
  grad.addColorStop(.33,'rgba(255,142,45,.8)');
  grad.addColorStop(.62,'rgba(237,63,12,.32)');
  grad.addColorStop(1,'rgba(255,30,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,128,256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}


function paintedTexture(draw: (ctx:CanvasRenderingContext2D)=>void, width=512, height=512): THREE.CanvasTexture {
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');
  if(!ctx) throw new Error('2D canvas unavailable');
  draw(ctx);
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  return texture;
}
function createGroundTexture(): THREE.CanvasTexture {
  const texture=paintedTexture(ctx=>{
    ctx.fillStyle='#44483c';ctx.fillRect(0,0,512,512);
    let seed=29583;
    const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/4294967296};
    for(let i=0;i<23000;i++){
      const v=Math.floor(38+rnd()*84);
      ctx.fillStyle=`rgba(${v},${v+3},${Math.max(0,v-7)},${.08+rnd()*.32})`;
      const x=rnd()*512,y=rnd()*512,k=.5+rnd()*4;
      ctx.fillRect(x,y,k,k*.5);
    }
    for(let i=0;i<65;i++){
      let x=rnd()*512,y=rnd()*512;
      ctx.beginPath();ctx.moveTo(x,y);
      for(let j=0;j<5;j++){x+=(rnd()-.5)*35;y+=rnd()*13;ctx.lineTo(x,y)}
      ctx.strokeStyle='rgba(12,18,15,.13)';ctx.lineWidth=.4+rnd();ctx.stroke();
    }
    for(let i=0;i<45;i++){
      const x=rnd()*512,y=rnd()*512;
      ctx.fillStyle='rgba(75,82,62,.20)';ctx.beginPath();ctx.ellipse(x,y,3+rnd()*15,2+rnd()*8,0,0,Math.PI*2);ctx.fill();
    }
  });
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.set(5,5);
  return texture;
}
function createSmokeTexture(): THREE.CanvasTexture {
  return paintedTexture(ctx=>{
    const gr=ctx.createRadialGradient(128,128,11,128,128,126);
    gr.addColorStop(0,'rgba(215,221,216,.48)');
    gr.addColorStop(.35,'rgba(169,176,170,.31)');
    gr.addColorStop(.7,'rgba(120,133,130,.13)');
    gr.addColorStop(1,'rgba(94,106,102,0)');
    ctx.fillStyle=gr;ctx.fillRect(0,0,256,256);
  },256,256);
}
function createSquareWarning(): THREE.CanvasTexture {
  return paintedTexture(ctx=>{
    ctx.fillStyle='#e2b946';ctx.fillRect(0,0,512,512);
    ctx.strokeStyle='#191914';ctx.lineWidth=20;ctx.strokeRect(22,22,468,468);
    ctx.textAlign='center';ctx.fillStyle='#191914';
    ctx.font='bold 69px monospace';ctx.fillText('WARNING',256,138);
    ctx.fillRect(49,174,414,10);
    ctx.font='bold 39px monospace';ctx.fillText('RESTRICTED',256,252);
    ctx.fillText('CAMERA AREA',256,308);
    ctx.font='24px monospace';ctx.fillText('SIMULATED LOCATION',256,406);
    ctx.fillText('NO LIVE EQUIPMENT',256,450);
  });
}
function createTriangleSymbol(): THREE.CanvasTexture {
  return paintedTexture(ctx=>{
    ctx.clearRect(0,0,512,512);
    ctx.fillStyle='#e2b946';ctx.strokeStyle='#10120d';ctx.lineWidth=19;
    ctx.beginPath();ctx.moveTo(256,40);ctx.lineTo(484,449);ctx.lineTo(28,449);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.translate(256,306);
    ctx.fillStyle='#10120d';
    for(let i=0;i<3;i++){
      ctx.save();ctx.rotate(-Math.PI/2+i*2*Math.PI/3);
      ctx.beginPath();ctx.arc(0,0,119,-.49,.49);
      ctx.arc(0,0,41,.49,-.49,true);ctx.closePath();ctx.fill();ctx.restore();
    }
    ctx.beginPath();ctx.arc(0,0,26,0,Math.PI*2);ctx.fill();
  });
}

export default function LaunchSilo3D({ launchSignal }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef<number | null>(null);
  const repaintRef = useRef<(() => void) | null>(null);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    if (launchSignal > 0) startedRef.current = performance.now();
    repaintRef.current?.();
  }, [launchSignal]);

  useEffect(() => {
    const host = mountRef.current;
    if (!host) return;
    const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const lowDetail = window.matchMedia('(max-width: 730px)').matches;
    let reduced = reducedQuery.matches;
    let visible = true;
    let stopped = false;
    let frameId = 0;
    let lastFrame = 0;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true, antialias: !lowDetail, powerPreference: 'low-power',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowDetail ? 1.2 : 1.6));
    } catch {
      setAvailable(false);
      return;
    }
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setClearColor(0x000000, 0);
    renderer.localClippingEnabled = true;
    renderer.shadowMap.enabled = !lowDetail;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.className = 'silo-webgl-canvas';
    host.appendChild(renderer.domElement);
    setAvailable(true);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x080f12, .027);
    const camera = new THREE.PerspectiveCamera(37, 1, .1, 225);
    scene.add(new THREE.HemisphereLight(0x607c92, 0x100f08, .78));
    // Background follows only camera orientation, like a distant outdoor sky.
    // The camera looks downward at the bay, so world-positioned stars were out of frame.
    scene.add(camera);
    const sky = new THREE.Group();
    camera.add(sky);
    const starsPosition:number[]=[];
    let starSeed=8414;
    const nextStar=()=>{starSeed=(Math.imul(starSeed,1664525)+1013904223)|0;return (starSeed>>>0)/4294967296};
    for(let i=0;i<(lowDetail?180:430);i++){
      starsPosition.push((nextStar()-.5)*53,(nextStar()-.5)*27,-28-nextStar()*16);
    }
    const starGeometry=new THREE.BufferGeometry();
    starGeometry.setAttribute('position',new THREE.Float32BufferAttribute(starsPosition,3));
    const stars = new THREE.Points(starGeometry,new THREE.PointsMaterial({
      color:0xcdd8d1,size:lowDetail?.15:.25,sizeAttenuation:true,
      opacity:.82,transparent:true,depthWrite:false,fog:false,
    }));
    sky.add(stars);
    // Keep distant stars, but leave out the moon as requested.

    // Organic layered evergreen clusters. Instancing keeps rendering efficient.
    const treeTrunk=new THREE.CylinderGeometry(.12,.19,1,6);
    const trunkMat=new THREE.MeshStandardMaterial({color:0x1e2119,roughness:1});
    const foliageGeo=new THREE.IcosahedronGeometry(1,1);
    const leafMats=[
      new THREE.MeshStandardMaterial({color:0x122620,roughness:1,flatShading:true}),
      new THREE.MeshStandardMaterial({color:0x1b332b,roughness:1,flatShading:true}),
      new THREE.MeshStandardMaterial({color:0x0c1c17,roughness:1,flatShading:true}),
    ];
    const trunks=new THREE.InstancedMesh(treeTrunk,trunkMat,53);
    const foliage=leafMats.map(mat=>new THREE.InstancedMesh(foliageGeo,mat,210));
    const foliageIndices=[0,0,0];
    const transform=new THREE.Object3D();
    for(let i=0;i<53;i++){
      const row=i%3;
      const x=((i*13)%53-26)*.69+Math.sin(i*1.17)*.65;
      const z=-9.3-row*2.95-(i%5)*.4;
      const h=3+((i*19)%13)*.22;
      transform.position.set(x,.11+h*.21,z);
      transform.rotation.set(0,i*.17,Math.sin(i*2.45)*.025);
      transform.scale.set(.6,h*.42,.6);
      transform.updateMatrix();
      trunks.setMatrixAt(i,transform.matrix);
      const clusters=8+(i%4);
      for(let j=0;j<clusters;j++){
        const index=(i+j)%3;
        const mesh=foliage[index], idx=foliageIndices[index]++;
        const p=j/clusters,spread=(1-p)*(.62+(i%4)*.07);
        const angle=j*2.399+i*.69;
        transform.position.set(x+Math.cos(angle)*spread,.11+h*(.36+.57*p),z+Math.sin(angle)*spread);
        transform.rotation.set(j*.13,i*.7+j*.33,j*.09);
        transform.scale.set(.43+(1-p)*.24,.52+(1-p)*.20,.42+(1-p)*.22);
        transform.updateMatrix();
        mesh.setMatrixAt(idx,transform.matrix);
      }
    }
    scene.add(trunks);
    foliage.forEach((mesh,i)=>{mesh.count=foliageIndices[i];mesh.instanceMatrix.needsUpdate=true;scene.add(mesh);});
    const key = new THREE.DirectionalLight(0xffeed1, 4.2);
    key.position.set(-3.5, 7.8, 3.8);
    if (!lowDetail) {
      key.castShadow=true;
      key.shadow.mapSize.set(1024,1024);
      key.shadow.camera.near=.5;
      key.shadow.camera.far=18;
      key.shadow.camera.left=-6;
      key.shadow.camera.right=6;
      key.shadow.camera.top=8;
      key.shadow.camera.bottom=-6;
      key.shadow.bias=-.0004;
    }
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x9caf9e, 1.18);
    fill.position.set(3.2, 3.5, -4.6);
    scene.add(fill);
    const bayLamp = new THREE.PointLight(0xeac47e, 5.5, 9);
    bayLamp.position.set(0, .55, 0);
    const warmInspection = new THREE.SpotLight(0xffdab0, 18, 14, .66, .78, 1);
    warmInspection.position.set(-3.4, 6.3, 3.5);
    warmInspection.target.position.set(0, .3, 0);
    scene.add(warmInspection, warmInspection.target);
    const coolInspection = new THREE.SpotLight(0x81988b, 11, 13, .72, .85, 1);
    coolInspection.position.set(3.1, 4.7, -2.6);
    coolInspection.target.position.set(0, 1.2, 0);
    scene.add(coolInspection, coolInspection.target);
    scene.add(bayLamp);

    const armor = new THREE.MeshStandardMaterial({ color: 0x252a24, metalness: .72, roughness: .47 });
    const deep = new THREE.MeshStandardMaterial({ color: 0x0b0d0c, metalness: .55, roughness: .65 });
    const steelTexture=createSteelTexture();
    const graphite = new THREE.MeshStandardMaterial({
      color: 0x161914, metalness: .66, roughness: .67,
      bumpMap: steelTexture, bumpScale: .055,
    });
    armor.bumpMap=steelTexture;
    armor.bumpScale=.035;
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(180,180),
      new THREE.MeshStandardMaterial({color:0x10150f,roughness: .95,metalness: .11,bumpMap:steelTexture,bumpScale:.028}),
    );
    ground.rotation.x=-Math.PI/2;
    ground.position.y=-9.2;
    ground.receiveShadow=true;
    scene.add(ground);
    // A continuous concrete surface with a hole makes the bay feel recessed
    // into the installation rather than perched on a display pedestal.
    const groundTexture=createGroundTexture();
    groundTexture.repeat.set(38,38);
    const floorDeck = new THREE.Mesh(
      new THREE.RingGeometry(1.15, 9.4, 112, 8),
      new THREE.MeshStandardMaterial({
        color:0x73776a, metalness:.08, roughness:.98,
        map:groundTexture,bumpMap:groundTexture,bumpScale:.13,side:THREE.DoubleSide,
      }),
    );
    floorDeck.rotation.x=-Math.PI/2;
    floorDeck.position.y=.095;
    floorDeck.receiveShadow=true;
    scene.add(floorDeck);
    // Grass takes over at the edge of the facility's concrete apron.
    // Both surfaces have the same ground height; no raised clipping slabs.
    const grassTexture=createGroundTexture();
    grassTexture.repeat.set(27,27);
    const grass = new THREE.Mesh(
      new THREE.RingGeometry(9.42, 115, 132, 9),
      new THREE.MeshStandardMaterial({color:0x314b30,metalness:0,roughness:1,
        map:grassTexture,bumpMap:grassTexture,bumpScale:.05,side:THREE.DoubleSide}),
    );
    grass.rotation.x=-Math.PI/2;
    grass.position.y=.091;
    grass.receiveShadow=true;
    scene.add(grass);
    // An offset approach path meets the main bay from the lower left of frame.
    const accessPath = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4,23),
      new THREE.MeshStandardMaterial({color:0x44483d,metalness:.04,roughness:.93,
        map:groundTexture,bumpMap:groundTexture,bumpScale:.035}),
    );
    accessPath.rotation.x=-Math.PI/2;
    accessPath.rotation.z=-.72;
    accessPath.position.set(-6.3,.107,6.7);
    accessPath.receiveShadow=true;
    scene.add(accessPath);
    // Secondary decorative bay at the lower-left edge of the camera.
    // Intentionally cropped so the scene reads as part of a larger facility.
    const auxiliaryBay=new THREE.Group();
    auxiliaryBay.position.set(-4.6,.122,3.2);
    const auxMat=new THREE.MeshStandardMaterial({color:0x292f29,metalness:.62,roughness:.44});
    const auxRing=new THREE.Mesh(new THREE.RingGeometry(1.5,2.10,72),auxMat);
    auxRing.rotation.x=-Math.PI/2;auxiliaryBay.add(auxRing);
    const auxWell=new THREE.Mesh(new THREE.CircleGeometry(1.51,64),
      new THREE.MeshStandardMaterial({color:0x090e0c,roughness:.91}));
    auxWell.rotation.x=-Math.PI/2;auxWell.position.y=-.018;auxiliaryBay.add(auxWell);
    for(let half=0;half<2;half++){
      const shape=new THREE.Shape();
      const left=half===0,radius=1.5;
      if(left){
        shape.moveTo(0,radius);
        shape.absarc(0,0,radius,Math.PI/2,1.5*Math.PI,false);
        shape.lineTo(0,radius);
      }else{
        shape.moveTo(0,-radius);
        shape.absarc(0,0,radius,-Math.PI/2,Math.PI/2,false);
        shape.lineTo(0,-radius);
      }
      const door=new THREE.Mesh(new THREE.ShapeGeometry(shape),auxMat);
      door.rotation.x=-Math.PI/2;
      door.position.y=.028;
      auxiliaryBay.add(door);
    }
    for(const r of [2.24,2.42]){
      const ring=new THREE.Mesh(new THREE.TorusGeometry(r,.02,6,72),
        new THREE.MeshBasicMaterial({color:0x55665a}));
      ring.rotation.x=Math.PI/2;ring.position.y=.023;auxiliaryBay.add(ring);
    }
    scene.add(auxiliaryBay);

    // Stylized fence in the grass at the edge of the concrete. This is visual
    // scenery only, not a dimensioned or functional physical barrier.
    const boundaryFence=new THREE.Group();
    const fenceMetal=new THREE.MeshStandardMaterial({color:0x4e6056,roughness:.69,metalness:.43});
    const wireMaterial=new THREE.LineBasicMaterial({color:0x77867a,transparent:true,opacity:.65});
    const boundarySegments:THREE.Vector3[]=[];
    for(let i=0;i<10;i++){
      const x=-18+i*4;
      const post=new THREE.Mesh(new THREE.BoxGeometry(.075,1.78,.075),fenceMetal);
      post.position.set(x,.97,-10.6);
      boundaryFence.add(post);
    }
    for(const height of [.82,1.28,1.64]){
      for(let j=0;j<120;j++){
        const x=-18+j*.305;
        const next=x+.305;
        boundarySegments.push(new THREE.Vector3(x,height,-10.6),
          new THREE.Vector3(next,height+.01*Math.sin(j*.6),-10.6));
      }
    }
    // Tiny crossed highlights suggest a distant security wire silhouette.
    for(let j=0;j<95;j++){
      const x=-18+j*.38;
      boundarySegments.push(new THREE.Vector3(x-.05,1.59,-10.6),
        new THREE.Vector3(x+.05,1.71,-10.6));
    }
    boundaryFence.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(boundarySegments),wireMaterial));
    scene.add(boundaryFence);

    // Perimeter posts illuminate red only when the fictional software task
    // launch is playing; they are dark in standby.
    const perimeterAlarms:{bulb:THREE.Mesh;light:THREE.PointLight}[]=[];
    for(const x of [-13,-4,5,14]){
      const standard=new THREE.Mesh(new THREE.CylinderGeometry(.045,.075,3.1,8),fenceMetal);
      standard.position.set(x,1.63,-10.35);scene.add(standard);
      const head=new THREE.Mesh(new THREE.BoxGeometry(.48,.15,.25),auxMat);
      head.position.set(x,3.2,-10.35);scene.add(head);
      const bulb=new THREE.Mesh(new THREE.SphereGeometry(.12,12,8),
        new THREE.MeshBasicMaterial({color:0xff4c37}));
      bulb.position.set(x,3.32,-10.35);
      bulb.visible=false;
      scene.add(bulb);
      const light=new THREE.PointLight(0xee3024,0,5.5);
      light.position.copy(bulb.position);
      scene.add(light);
      perimeterAlarms.push({bulb,light});
    }
    // A few durable-looking panel boxes and low curbs make the pad less empty.
    const utilitySteel=new THREE.MeshStandardMaterial({color:0x414a3e,metalness:.64,roughness:.53});
    for(const [x,z,w] of [[-3.9,2.2,.68],[3.9,-2.3,.95],[-4.3,-3.2,.52]] as const){
      const cabinet=new THREE.Mesh(new THREE.BoxGeometry(w,.57,.43),utilitySteel);
      cabinet.position.set(x,.40,z);
      cabinet.castShadow=true;scene.add(cabinet);
      const latch=new THREE.Mesh(new THREE.BoxGeometry(.09,.05,.018),
        new THREE.MeshBasicMaterial({color:0xc2ba8e}));
      latch.position.set(x,.45,z+.225);scene.add(latch);
    }
    const shaftWall = new THREE.Mesh(
      new THREE.CylinderGeometry(1.105, 1.105, 9.1, 80, 1, true),
      new THREE.MeshStandardMaterial({
        color:0x141914,metalness:.35,roughness:.91,side:THREE.BackSide,
      }),
    );
    shaftWall.position.y=-4.44;
    shaftWall.receiveShadow=true;
    scene.add(shaftWall);
    const lowerBayLight = new THREE.PointLight(0xd2b783, 2.1, 5.0);
    lowerBayLight.position.set(0,-.85,0);
    scene.add(lowerBayLight);
    // Compact sealed dual-head beacons, photographed through a dark dome.
    // Rotating lenses and localized ground spill replace the previous opaque
    // triangles and large solid-looking spotlight cones.
    const beaconSpillTexture=createBeaconSpillTexture();
    type DualBeacon={
      rotor:THREE.Group;
      spill:THREE.Group;
      glass:THREE.MeshPhysicalMaterial;
      lenses:THREE.MeshBasicMaterial;
      spots:[THREE.SpotLight,THREE.SpotLight];
      spillMaterial:THREE.MeshBasicMaterial;
    };
    const rotatingBeacons:DualBeacon[]=[];
    const beaconLocations=[[-3.15,-3.05],[3.15,-3.05],[-3.15,3.05],[3.15,3.05]] as const;
    const shellMaterial=new THREE.MeshStandardMaterial({color:0x2b312e,metalness:.76,roughness:.39});
    const polishedMetal=new THREE.MeshStandardMaterial({color:0x9fa69d,metalness:.89,roughness:.19});
    for(const [x,z] of beaconLocations) {
      const pedestal=new THREE.Mesh(new THREE.CylinderGeometry(.215,.24,.085,32),shellMaterial);
      pedestal.position.set(x,.18,z);scene.add(pedestal);
      const foot=new THREE.Mesh(new THREE.CylinderGeometry(.17,.18,.065,28),polishedMetal);
      foot.position.set(x,.245,z);scene.add(foot);

      // Clear outer cover stays still. Only the two internal heads rotate.
      const glass=new THREE.MeshPhysicalMaterial({
        color:0xe3be73,metalness:0,roughness:.1,transmission:.12,
        transparent:true,opacity:.21,depthWrite:false,side:THREE.DoubleSide,
      });
      const dome=new THREE.Mesh(new THREE.SphereGeometry(.21,32,16,0,2*Math.PI,0,Math.PI/2),glass);
      dome.position.set(x,.3,z);
      scene.add(dome);
      const cap=new THREE.Mesh(new THREE.TorusGeometry(.211,.021,8,32),shellMaterial);
      cap.rotation.x=Math.PI/2;cap.position.set(x,.3,z);scene.add(cap);

      const lenses=new THREE.MeshBasicMaterial({color:0xffe1a1,side:THREE.DoubleSide});
      const rotor=new THREE.Group();
      rotor.position.set(x,.343,z);
      const center=new THREE.Mesh(new THREE.CylinderGeometry(.074,.074,.065,20),polishedMetal);
      rotor.add(center);
      const spots:THREE.SpotLight[]=[];
      for(const sign of [-1,1]) {
        const head=new THREE.Group();
        head.position.x=sign*.12;
        const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.069,.081,.065,24),shellMaterial);
        barrel.rotation.z=Math.PI/2;
        head.add(barrel);
        const silver=new THREE.Mesh(new THREE.RingGeometry(.039,.07,24),polishedMetal);
        silver.rotation.y=sign>0?Math.PI/2:-Math.PI/2;
        silver.position.x=sign*.038;
        head.add(silver);
        const lens=new THREE.Mesh(new THREE.CircleGeometry(.045,24),lenses);
        lens.rotation.y=sign>0?Math.PI/2:-Math.PI/2;
        lens.position.x=sign*.041;
        head.add(lens);
        rotor.add(head);

        // Aim toward nearby ground: two opposing moving illumination pools.
        const spot=new THREE.SpotLight(0xffc277,3.3,3.6,.43,.95,1.2);
        spot.position.set(sign*.14,.02,0);
        const aim=new THREE.Object3D();
        aim.position.set(sign*1.75,-.33,0);
        rotor.add(spot,aim);
        spot.target=aim;
        spots.push(spot);
      }
      scene.add(rotor);
      const spill=new THREE.Group();
      spill.position.set(x,.139,z);
      const spillMaterial=new THREE.MeshBasicMaterial({
        map:beaconSpillTexture,color:0xffcc78,transparent:true,opacity:.29,
        blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,
      });
      for(const sign of [-1,1]){
        const pool=new THREE.Mesh(new THREE.PlaneGeometry(2.8,1.0),spillMaterial);
        pool.rotation.x=-Math.PI/2;
        pool.position.x=sign*1.12;
        spill.add(pool);
      }
      scene.add(spill);
      rotatingBeacons.push({rotor,spill,glass,lenses,spots:spots as [THREE.SpotLight,THREE.SpotLight],spillMaterial});
    }
    // Smaller, constant-red accent lamps only during the cinematic launch.
    const accentLamps:THREE.Mesh[]=[];
    for(let i=0;i<10;i++){
      const angle=i*Math.PI*2/10;
      const bulb=new THREE.Mesh(new THREE.SphereGeometry(.053,10,8),
        new THREE.MeshBasicMaterial({color:0xea382b}));
      bulb.position.set(Math.cos(angle)*2.03,.16,Math.sin(angle)*2.03);
      bulb.visible=false;
      scene.add(bulb);
      accentLamps.push(bulb);
    }
    const redAccentLight=new THREE.PointLight(0xdf3026,0,4.0);
    redAccentLight.position.set(0,.55,0);
    scene.add(redAccentLight);
    // Contrasting roadside-style yellow signs, both clearly fictional.
    const triangleTexture=createTriangleSymbol();
    const squareTexture=createSquareWarning();
    const backingMaterial=new THREE.MeshStandardMaterial({color:0x242521,metalness:.38,roughness:.65});
    const postGeometry=new THREE.BoxGeometry(.085,1.62,.11);
    const postMaterial=new THREE.MeshStandardMaterial({color:0x5d685f,metalness:.72,roughness:.47});
    // Leaning triangular radiation warning on the left.
    const leftSign=new THREE.Group();
    leftSign.position.set(-2.65,.11,-2.2);
    leftSign.scale.setScalar(.58);
    leftSign.rotation.z=-.16;
    const leftPost=new THREE.Mesh(postGeometry,postMaterial);
    leftPost.position.y=.76;leftSign.add(leftPost);
    const warningShape=new THREE.Shape();
    warningShape.moveTo(-.79,-.72);warningShape.lineTo(.79,-.72);
    warningShape.lineTo(0,.75);warningShape.closePath();
    const triangleBacking=new THREE.Mesh(new THREE.ShapeGeometry(warningShape),backingMaterial);
    triangleBacking.position.set(0,1.64,.01);
    leftSign.add(triangleBacking);
    const triangleFace=new THREE.Mesh(new THREE.PlaneGeometry(1.65,1.65),
      new THREE.MeshBasicMaterial({map:triangleTexture,transparent:true,side:THREE.DoubleSide,depthWrite:false}));
    triangleFace.position.set(0,1.64,.055);
    leftSign.add(triangleFace);
    scene.add(leftSign);
    // Squarer, upright yellow warning placard.
    const rightSign=new THREE.Group();
    rightSign.position.set(2.75,.11,-2.2);
    rightSign.scale.setScalar(.61);
    const rightPost=new THREE.Mesh(postGeometry,postMaterial);
    rightPost.position.y=.78;rightSign.add(rightPost);
    const rectangleBacking=new THREE.Mesh(new THREE.BoxGeometry(1.35,1.25,.07),backingMaterial);
    rectangleBacking.position.set(0,1.68,0);rightSign.add(rectangleBacking);
    const squareFace=new THREE.Mesh(new THREE.PlaneGeometry(1.29,1.2),
      new THREE.MeshBasicMaterial({map:squareTexture,side:THREE.DoubleSide}));
    squareFace.position.set(0,1.68,.048);
    rightSign.add(squareFace);
    scene.add(rightSign);

    // Expansion seams belong to the surrounding concrete, not the bay itself.
    for (const side of [-1,1]) {
      for (let i=0;i<3;i++) {
        const seam = new THREE.Mesh(new THREE.BoxGeometry(.015,.004,10),deep);
        seam.position.set(side*(2.65+i*1.65),.101,0);
        scene.add(seam);
      }
    }
    const olive = new THREE.MeshStandardMaterial({ color: 0x545c49, metalness: .58, roughness: .58 });
    const brushed = new THREE.MeshStandardMaterial({ color: 0x6e7469, metalness: .74, roughness: .48 });
    const caution = new THREE.MeshBasicMaterial({ color: 0xd1af56 });
    const fineLine = new THREE.MeshBasicMaterial({ color: 0x788268, transparent: true, opacity: .62 });
    const exhaustMaterial = new THREE.MeshBasicMaterial({
      color: 0xd5b975, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });

    // Flush metal collar surrounding a dark, open shaft.
    const rim = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.76, 96), armor);
    rim.rotation.x=-Math.PI/2;
    rim.position.y=.116;
    rim.receiveShadow=true;
    scene.add(rim);
    // Deep shaft with visible inset rings and practical interior light strips.
    const shaftLights: THREE.PointLight[]=[];
    for (let tier=0;tier<6;tier++) {
      const y=-.35-tier*1.2;
      const ring=new THREE.Mesh(
        new THREE.TorusGeometry(1.06,.023,7,72),
        new THREE.MeshStandardMaterial({color:0x61695b,metalness:.72,roughness:.34}),
      );
      ring.rotation.x=Math.PI/2;ring.position.y=y;scene.add(ring);
      for (let side=0;side<4;side++) {
        const a=side*Math.PI/2;
        const strip=new THREE.Mesh(
          new THREE.BoxGeometry(.085,.31,.035),
          new THREE.MeshBasicMaterial({color:tier%2===0?0xb7b481:0x7f957a}),
        );
        strip.position.set(Math.sin(a)*1.035,y,Math.cos(a)*1.035);
        strip.rotation.y=a;scene.add(strip);
      }
      if(tier%2===0) {
        const light=new THREE.PointLight(0xb7ae78,.8,3.8);
        light.position.set(0,y,0);scene.add(light);shaftLights.push(light);
      }
    }
    for (const [radius, height, material] of [
      [1.13, .127, caution],
      [1.46, .129, brushed],
      [1.70, .123, fineLine],
      [1.97, .108, fineLine],
    ] as const) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, .016, 8, 72), material);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = height;
      scene.add(ring);
    }
    for (let i = 0; i < 16; i++) {
      const angle = i * Math.PI / 8;
      const isWarning = i % 4 === 0;
      const block = new THREE.Mesh(
        new THREE.BoxGeometry(.13, .035, isWarning ? .37 : .15),
        isWarning ? caution : brushed,
      );
      block.position.set(Math.cos(angle) * 1.48, .145, Math.sin(angle) * 1.48);
      block.rotation.y = -angle;
      scene.add(block);
    }

    // Two truly semicircular armor leaves sit flush with the round shaft.
    // They retain the original outward-opening visual choreography.
    const hatchLeft=new THREE.Group();
    const hatchRight=new THREE.Group();
    const hatchRadius=1.105;
    hatchLeft.position.set(-hatchRadius,.18,0);
    hatchRight.position.set(hatchRadius,.18,0);
    function makeHalfDisc(left:boolean): THREE.ExtrudeGeometry {
      const shape=new THREE.Shape();
      if(left) {
        shape.moveTo(0,hatchRadius);
        shape.absarc(0,0,hatchRadius,Math.PI/2,Math.PI*1.5,false);
        shape.lineTo(0,hatchRadius);
      } else {
        shape.moveTo(0,-hatchRadius);
        shape.absarc(0,0,hatchRadius,-Math.PI/2,Math.PI/2,false);
        shape.lineTo(0,-hatchRadius);
      }
      return new THREE.ExtrudeGeometry(shape,{depth:.125,bevelEnabled:false,curveSegments:56});
    }
    const leftDoor=new THREE.Mesh(makeHalfDisc(true),armor);
    const rightDoor=new THREE.Mesh(makeHalfDisc(false),armor);
    leftDoor.rotation.x=-Math.PI/2;
    rightDoor.rotation.x=-Math.PI/2;
    leftDoor.position.x=hatchRadius;
    rightDoor.position.x=-hatchRadius;
    for(const [door,side] of [[leftDoor,-1],[rightDoor,1]] as const) {
      door.castShadow=true;door.receiveShadow=true;
      // Engraved curved-metal panels, limited to each circular half.
      for(const z of [-.53,0,.53]){
        const rib=new THREE.Mesh(new THREE.BoxGeometry(.34,.045,.015),brushed);
        rib.position.set(side*.47,z,.135);
        door.add(rib);
      }
      for(const z of [-.57,.57]){
        const stud=new THREE.Mesh(new THREE.CylinderGeometry(.036,.036,.018,10),deep);
        stud.rotation.x=Math.PI/2;
        stud.position.set(side*.47,z,.147);
        door.add(stud);
      }
    }
    hatchLeft.add(leftDoor);
    hatchRight.add(rightDoor);
    scene.add(hatchLeft,hatchRight);
    // Flush hinge caps at the rim, no large square slab over a round opening.
    for(const x of [-hatchRadius,hatchRadius]) {
      const hinge=new THREE.Mesh(new THREE.CylinderGeometry(.11,.11,.19,24),brushed);
      hinge.rotation.x=Math.PI/2;
      hinge.position.set(x,.22,0);
      scene.add(hinge);
    }

    // Fictional exhibit missile silhouette: matt black casing, hazard badges,
    // broad decorative bands and stylized fins. No working/functional details.
    const missile = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.CylinderGeometry(.385, .41, 2.65, 36), graphite);
    hull.position.y = 0;
    hull.castShadow=true;
    missile.add(hull);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(.387, .91, 36), armor);
    nose.position.y = 1.78;
    nose.castShadow=true;
    missile.add(nose);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(.045, 12, 10), brushed);
    tip.position.y = 2.21;
    missile.add(tip);
    for (const y of [-1.20, -.82, .88, 1.29]) {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(.415, .415, .095, 36), y > .5 ? olive : deep);
      band.position.y = y;
      missile.add(band);
    }
    for (const y of [-.73, 1.05]) {
      const groove = new THREE.Mesh(new THREE.TorusGeometry(.417, .018, 6, 36), brushed);
      groove.rotation.x = Math.PI / 2;
      groove.position.y = y;
      missile.add(groove);
    }
    const lowerSkirt = new THREE.Mesh(new THREE.CylinderGeometry(.42, .46, .30, 36), deep);
    lowerSkirt.position.y = -1.48;
    missile.add(lowerSkirt);
    for (let index = 0; index < 4; index++) {
      const angle = index * Math.PI / 2;
      const fin = new THREE.Mesh(new THREE.BoxGeometry(.075, .72, .58), armor);
      fin.position.set(Math.sin(angle) * .43, -1.25, Math.cos(angle) * .43);
      fin.rotation.y = angle;
      missile.add(fin);
    }
    const hazardTexture = createHazardMark();
    const stencilTexture = createStencil();
    const badge = new THREE.Mesh(new THREE.PlaneGeometry(.55, .55), new THREE.MeshBasicMaterial({
      map: hazardTexture, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    }));
    badge.position.set(0, .35, .425);
    missile.add(badge);
    const serial = new THREE.Mesh(new THREE.PlaneGeometry(.74, .235), new THREE.MeshBasicMaterial({
      map: stencilTexture, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    }));
    serial.position.set(0, -.30, .425);
    missile.add(serial);
    const rearBadge = badge.clone();
    rearBadge.position.set(0, .35, -.425);
    rearBadge.rotation.y = Math.PI;
    missile.add(rearBadge);

    // Stylized luminous cinematic exhaust with a white core and orange halo.
    const glow = new THREE.Mesh(new THREE.ConeGeometry(.36, 2.45, 22, 1, true), exhaustMaterial);
    glow.rotation.x = Math.PI;
    glow.position.y = -2.67;
    missile.add(glow);
    const flameCoreMaterial=new THREE.MeshBasicMaterial({
      color:0xffdd9a,transparent:true,opacity:0,
      blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,
    });
    const flameHaloMaterial=new THREE.MeshBasicMaterial({
      color:0xff7027,transparent:true,opacity:0,
      blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,
    });
    const flameCore=new THREE.Mesh(new THREE.ConeGeometry(.21,2.65,20,1,true),flameCoreMaterial);
    flameCore.rotation.x=Math.PI;
    flameCore.position.y=-2.75;
    missile.add(flameCore);
    const flameHalo=new THREE.Mesh(new THREE.ConeGeometry(.55,3.2,24,1,true),flameHaloMaterial);
    flameHalo.rotation.x=Math.PI;
    flameHalo.position.y=-3.05;
    missile.add(flameHalo);
    // A separate camera-facing layered glow is visible at CCTV resolutions.
    // The original thin mesh cones were mostly hidden by the deck clip plane.
    const flareTexture = createFlareTexture();
    const flareMaterial = new THREE.SpriteMaterial({
      map:flareTexture,color:0xffd09a,transparent:true,opacity:0,
      depthWrite:false,blending:THREE.AdditiveBlending,
    });
    const flareSprite = new THREE.Sprite(flareMaterial);
    flareSprite.scale.set(1.8,4.4,1);
    flareSprite.visible = false;
    scene.add(flareSprite);
    const warmBurst = new THREE.PointLight(0xff9a3b,0,7);
    scene.add(warmBurst);
    // Matte inspection markings reinforce scale and material without real engineering.
    for (const y of [-1.03,-.93,-.10,.12,.78]) {
      const thin = new THREE.Mesh(new THREE.TorusGeometry(.412,.006,5,48),brushed);
      thin.rotation.x=Math.PI/2;
      thin.position.y=y;
      missile.add(thin);
    }
    for(let i=0;i<9;i++) {
      const angle=i*2*Math.PI/9;
      const mark=new THREE.Mesh(new THREE.BoxGeometry(.012,.065,.013),brushed);
      mark.position.set(Math.sin(angle)*.413,-.69,Math.cos(angle)*.413);
      missile.add(mark);
    }
    // The fictional object is physically present inside the open shaft.
    // Geometry and the circular hatch conceal it naturally, not a world-space
    // clipping plane that made it suddenly appear at ground level.
    missile.scale.y = SILO_MODEL_SCALE_Y;
    missile.position.y = siloModelY(siloPose(null));
    missile.visible = false;
    scene.add(missile);

    // A restrained layer of stationary atmospheric dust lends scale to the lit bay.
    const dustCount = lowDetail ? 18 : 58;
    const dustXYZ = new Float32Array(dustCount * 3);
    for (let i=0; i<dustCount; i++) {
      const angle=i*2.39996;
      const radius=1.35+((i*17)%43)/43*3.1;
      dustXYZ[3*i] = Math.cos(angle)*radius;
      dustXYZ[3*i+1] = .25+((i*29)%61)/61*4;
      dustXYZ[3*i+2] = Math.sin(angle)*radius;
    }
    const dustGeo=new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustXYZ, 3));
    const dust=new THREE.Points(dustGeo, new THREE.PointsMaterial({
      color:0xe4d6b6, size:.017, transparent:true,
      opacity:lowDetail ? .13 : .24, depthWrite:false,
    }));
    scene.add(dust);
    const dotCount = lowDetail ? 18 : 42;
    const dots = new Float32Array(dotCount * 3);
    const dotGeometry = new THREE.BufferGeometry();
    dotGeometry.setAttribute('position', new THREE.BufferAttribute(dots, 3));
    const particles = new THREE.Points(dotGeometry, new THREE.PointsMaterial({
      size: .045, color: 0xc7bd90, transparent: true, opacity: .54,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    particles.visible = false;
    particles.material.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0,1,0),-SILO_DECK_Y)];
    scene.add(particles);

    // Smoke is owned by the scene, never by the 6.8-second launch timeline.
    // Each puff has a birth timestamp and can linger for another 12 seconds.
    const smokeTexture=createSmokeTexture();
    const smokeSlotCount=lowDetail?38:82;
    type SmokeSlot={sprite:THREE.Sprite;seed:SmokeSeed|null};
    const smokeSlots:SmokeSlot[]=Array.from({length:smokeSlotCount},()=>{
      const mat=new THREE.SpriteMaterial({
        map:smokeTexture,color:0xd4ded5,transparent:true,opacity:0,
        depthWrite:false,depthTest:true,
      });
      const sprite=new THREE.Sprite(mat);
      sprite.visible=false;
      scene.add(sprite);
      return {sprite,seed:null};
    });
    let smokeCursor=0;
    let smokeLastSpawn=-Infinity;

    function resize() {
      const width = Math.max(1, host!.clientWidth);
      const height = Math.max(1, host!.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);

    const onVisibility = () => {
      visible = document.visibilityState === 'visible';
      if (visible && !stopped) loop();
    };
    document.addEventListener('visibilitychange', onVisibility);
    const observer = new IntersectionObserver(entries => {
      visible = entries[0]?.isIntersecting === true && document.visibilityState === 'visible';
      if (visible && !stopped) loop();
    }, { threshold: .01 });
    observer.observe(host);
    const onReduced = () => {
      reduced = reducedQuery.matches;
      if (reduced) renderFrame(performance.now());
      else loop();
    };
    reducedQuery.addEventListener('change', onReduced);
    const onContextLost = (event: Event) => {
      event.preventDefault();
      stopped = true;
      cancelAnimationFrame(frameId);
      setAvailable(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    function renderFrame(timestamp: number) {
      const elapsed = startedRef.current === null ? null : timestamp - startedRef.current;
      if (elapsed !== null && elapsed > SILO_SEQUENCE_MS) startedRef.current = null;
      const pose = siloPose(elapsed, reduced);
      const alertActive = siloVisualAlert(elapsed);
      const beaconColor=alertActive?0xe74e42:0xf2bd69;
      for(let i=0;i<rotatingBeacons.length;i++){
        const beacon=rotatingBeacons[i];
        const angle=reduced?i*Math.PI/2:timestamp*.0038+i*Math.PI*.5;
        beacon.rotor.rotation.y=angle;
        beacon.spill.rotation.y=angle;
        beacon.glass.color.setHex(beaconColor);
        beacon.lenses.color.setHex(alertActive?0xffa9a1:0xffe5a5);
        beacon.spillMaterial.color.setHex(alertActive?0xf64e42:0xffcc78);
        for(const spot of beacon.spots){
          spot.color.setHex(beaconColor);
          spot.intensity=reduced?0:3.3;
        }
      }
      accentLamps.forEach(lamp => {lamp.visible=alertActive;});
      perimeterAlarms.forEach(({bulb,light}) => {
        bulb.visible=alertActive;
        light.intensity=alertActive ? 1.35 : 0;
      });
      redAccentLight.intensity = alertActive ? .68 : 0;
      // Shut completely at rest. Open, reveal the rising prop, then re-seal.
      hatchLeft.rotation.z = pose.hatch * 1.36;
      hatchRight.rotation.z = -pose.hatch * 1.36;
      missile.position.y = siloModelY(pose) + siloExitOffset(elapsed, reduced);
      missile.rotation.y = Math.sin(timestamp * .00017) * .018;
      missile.visible = siloModelVisible(pose)
        && elapsed !== null && elapsed < SILO_SEQUENCE_MS * .94;
      const cinematicFlare = missile.visible ? pose.thrust : 0;
      const emissionY = missile.position.y - SILO_MODEL_SCALE_Y * 1.75;
      const plumeVisible = cinematicFlare > .04 && emissionY > SILO_DECK_Y + .08;
      flareSprite.visible = plumeVisible;
      flareSprite.position.set(0, emissionY - 1.55, 0);
      flareMaterial.opacity = plumeVisible ? cinematicFlare * .95 : 0;
      flareSprite.scale.set(1.65 + Math.sin(timestamp*.035)*.13, 3.9 + Math.cos(timestamp*.044)*.22, 1);
      warmBurst.intensity = plumeVisible ? 6.4 * cinematicFlare : 0;
      warmBurst.position.set(0, Math.max(.5,emissionY), 0);
      lowerBayLight.intensity = 2.1 + (plumeVisible ? 3.7 * cinematicFlare : 0);
      // Emit only while the prop is visible and clear of the floor.
      // Previously born smoke continues to age, drift, and dissipate in standby.
      if (!reduced && plumeVisible && timestamp-smokeLastSpawn>=SMOKE_EMIT_INTERVAL_MS) {
        const slot=smokeSlots[smokeCursor++%smokeSlots.length];
        slot.seed={
          bornAt:timestamp,
          x:Math.sin(timestamp*.0021)*.12,
          y:emissionY+.30,
          z:Math.cos(timestamp*.0017)*.11,
          size:1.2+(smokeCursor%6)*.12,
          phase:smokeCursor*2.39996,
        };
        smokeLastSpawn=timestamp;
      }
      for(const slot of smokeSlots) {
        if(!slot.seed||reduced){slot.sprite.visible=false;continue;}
        const smoke=evolveSmoke(slot.seed,timestamp);
        slot.sprite.visible=smoke.alive && smoke.alpha>.004;
        if(!smoke.alive){slot.seed=null;continue;}
        slot.sprite.position.set(smoke.x,smoke.y,smoke.z);
        slot.sprite.scale.set(smoke.size,smoke.size*.85,1);
        (slot.sprite.material as THREE.SpriteMaterial).opacity=smoke.alpha;
      }
      exhaustMaterial.opacity = cinematicFlare * .92;
      flameCoreMaterial.opacity = cinematicFlare * .98;
      flameHaloMaterial.opacity = cinematicFlare * .38;
      flameCore.scale.y = 1+.14*Math.sin(timestamp*.035);
      flameHalo.scale.y = 1+.10*Math.sin(timestamp*.047);
      glow.scale.y = Math.max(.01, pose.thrust * (1.1 + .1 * Math.sin(timestamp * .03)));
      particles.visible = missile.visible && pose.thrust > .1;
      const positions = dotGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < dotCount; i++) {
        const v = (timestamp * .0012 + i * .061) % 1;
        const a = i * 2.4;
        positions[i * 3] = Math.cos(a) * (.05 + v * .25);
        positions[i * 3 + 1] = missile.position.y - 1.25 - v * 2.2;
        positions[i * 3 + 2] = Math.sin(a) * (.05 + v * .25);
      }
      dotGeometry.attributes.position.needsUpdate = true;
      bayLamp.intensity = 2.4 + pose.glow * 3.5 + pose.thrust * 5;
      // Keep the recessed bay in frame. An understated nod follows the launch
      // and eases back to rest before the hatches finish closing.
      const cameraLift = siloCameraLift(elapsed, reduced);
      const sway = reduced ? 0 : Math.sin(timestamp * .00017) * .035;
      const quake = reduced ? 0 : pose.thrust * .055 * (1 - pose.ascent*.40);
      camera.position.set(3.75 + sway + quake * Math.sin(timestamp*.13),
        3.15 + cameraLift * .10 + quake * .62 * Math.cos(timestamp*.10),
        7.25 - cameraLift * .14);
      camera.lookAt(0, .65 + cameraLift * .30, 0);
      renderer.render(scene, camera);
    }

    function loop() {
      cancelAnimationFrame(frameId);
      if (stopped || !visible || reduced) return;
      frameId = requestAnimationFrame(time => {
        if (time - lastFrame >= 33) {
          renderFrame(time);
          lastFrame = time;
        }
        loop();
      });
    }
    repaintRef.current = () => renderFrame(performance.now());
    renderFrame(performance.now());
    loop();

    return () => {
      stopped = true;
      repaintRef.current = null;
      cancelAnimationFrame(frameId);
      observer.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      reducedQuery.removeEventListener('change', onReduced);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      scene.traverse(object => {
        if(object instanceof THREE.Sprite){
          object.material.dispose();
          return;
        }
        if (!(object instanceof THREE.Mesh || object instanceof THREE.Points ||
              object instanceof THREE.Line)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) material.dispose();
      });
      // In addition to materials, WebGL textures must be explicitly destroyed.
      beaconSpillTexture.dispose();
      hazardTexture.dispose();
      stencilTexture.dispose();
      steelTexture.dispose();
      groundTexture.dispose();
    grassTexture.dispose();
      triangleTexture.dispose();
      squareTexture.dispose();
      smokeTexture.dispose();
      flareTexture.dispose();
      flareMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div className="silo-three-layer" aria-hidden="true">
      <div ref={mountRef} className="silo-three-mount" />
      {!available && (
        <div className="silo-webgl-fallback">
          <span className="silo-fallback-rings" />
          <span className="silo-fallback-symbol">☢</span>
          <span>THREE-DIMENSIONAL VIEW UNAVAILABLE</span>
        </div>
      )}
    </div>
  );
}
