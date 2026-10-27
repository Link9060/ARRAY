import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { evolveSmoke, SMOKE_EMIT_INTERVAL_MS, type SmokeSeed } from '../engine/smokeTrail';
import {
  siloPose, siloModelY, siloModelVisible, siloCameraLift, siloExitOffset, SILO_SEQUENCE_MS,
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
function createWarningPlacard(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is unavailable.');
  ctx.fillStyle = '#d3b45d';
  ctx.fillRect(0,0,512,256);
  ctx.fillStyle = '#161810';
  ctx.fillRect(14,14,484,228);
  ctx.fillStyle = '#d9be74';
  ctx.fillRect(25,25,462,66);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#1a1b14';
  ctx.font = 'bold 51px monospace';
  ctx.fillText('CAUTION',256,77);
  ctx.fillStyle = '#e9dfb7';
  ctx.font = 'bold 33px monospace';
  ctx.fillText('SIMULATED SITE',256,149);
  ctx.font = '24px monospace';
  ctx.fillText('CAMERA SET DRESSING',256,198);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Camera-facing luminous plume texture, so it reads at small viewport sizes. */
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
function createMoonGlowTexture(): THREE.CanvasTexture {
  return paintedTexture(ctx=>{
    const gr=ctx.createRadialGradient(128,128,12,128,128,127);
    gr.addColorStop(0,'rgba(218,230,222,.37)');
    gr.addColorStop(.18,'rgba(173,193,185,.20)');
    gr.addColorStop(.55,'rgba(137,170,174,.07)');
    gr.addColorStop(1,'rgba(90,125,137,0)');
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
    const camera = new THREE.PerspectiveCamera(37, 1, .1, 100);
    scene.add(new THREE.HemisphereLight(0x607c92, 0x100f08, .78));
    // Night backdrop: moonlit treeline, faint stars and distant hillside.
    const starsPosition: number[] = [];
    for (let i=0;i<115;i++) {
      const angle=i*2.399963;
      const x=Math.sin(angle)*(14+(i%7)*2);
      const z=-16-(i%9)*2;
      const y=5+((i*23)%67)/67*11;
      starsPosition.push(x,y,z);
    }
    const starGeometry=new THREE.BufferGeometry();
    starGeometry.setAttribute('position',new THREE.Float32BufferAttribute(starsPosition,3));
    scene.add(new THREE.Points(starGeometry,new THREE.PointsMaterial({
      color:0xb9c9c5,size:.075,sizeAttenuation:true,opacity:.54,transparent:true,
    })));
    // Uneven, layered pine silhouettes, with subtle height, lean and density changes.
    // Reuse geometries to keep the night-scene draw overhead modest.
    const darkTree = new THREE.MeshStandardMaterial({color:0x0b1b18,roughness:1});
    const distantTree = new THREE.MeshStandardMaterial({color:0x162620,roughness:1});
    const treeCone = new THREE.ConeGeometry(1,1,7);
    const treeTrunk = new THREE.CylinderGeometry(.12,.17,1,5);
    for (let i=0;i<52;i++) {
      const row = i % 3;
      const x = ((i * 13) % 53 - 26) * .69 + Math.sin(i*1.17)*.65;
      const z = -8.7 - row*2.9 - (i % 5)*.36;
      const h = 2.6 + ((i*19)%13)*.24;
      const tree = new THREE.Group();
      tree.position.set(x,0,z);
      tree.rotation.z = Math.sin(i*2.45)*.035;
      const trunk=new THREE.Mesh(treeTrunk,darkTree);
      trunk.position.y=h*.19;
      trunk.scale.set(.6,h*.38,.6);
      tree.add(trunk);
      for (let layer=0; layer<3; layer++) {
        const foliage=new THREE.Mesh(treeCone, row===2 ? distantTree : darkTree);
        const width = .78 + (i%5)*.11;
        foliage.scale.set(width*(1-layer*.23),h*(.59-layer*.12),width*(1-layer*.23));
        foliage.position.set(Math.sin(i+layer)*.055,h*(.43+layer*.21),0);
        foliage.rotation.y=i*.7+layer*.4;
        tree.add(foliage);
      }
      scene.add(tree);
    }
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
      new THREE.PlaneGeometry(13,13),
      new THREE.MeshStandardMaterial({color:0x10150f,roughness: .95,metalness: .11,bumpMap:steelTexture,bumpScale:.028}),
    );
    ground.rotation.x=-Math.PI/2;
    ground.position.y=-3.35;
    ground.receiveShadow=true;
    scene.add(ground);
    // A continuous concrete surface with a hole makes the bay feel recessed
    // into the installation rather than perched on a display pedestal.
    const floorDeck = new THREE.Mesh(
      new THREE.RingGeometry(1.69, 14, 112),
      new THREE.MeshStandardMaterial({
        color:0x242a24, metalness:.18, roughness:.94,
        bumpMap:steelTexture, bumpScale:.034, side:THREE.DoubleSide,
      }),
    );
    floorDeck.rotation.x=-Math.PI/2;
    floorDeck.position.y=.095;
    floorDeck.receiveShadow=true;
    scene.add(floorDeck);
    const shaftWall = new THREE.Mesh(
      new THREE.CylinderGeometry(1.105, 1.105, 3.8, 80, 1, true),
      new THREE.MeshStandardMaterial({
        color:0x141914,metalness:.35,roughness:.91,side:THREE.BackSide,
      }),
    );
    shaftWall.position.y=-1.83;
    shaftWall.receiveShadow=true;
    scene.add(shaftWall);
    const lowerBayLight = new THREE.PointLight(0xd2b783, 2.1, 5.0);
    lowerBayLight.position.set(0,-.85,0);
    scene.add(lowerBayLight);
    // Low amber floor beacons cast small pools of light along the concrete perimeter.
    for (const [x,z] of [[-3.3,-3.2],[3.3,-3.2],[-3.3,3.2],[3.3,3.2]] as const) {
      const fixture=new THREE.Mesh(new THREE.CylinderGeometry(.18,.23,.19,12),
        new THREE.MeshStandardMaterial({color:0x3a3b30,metalness:.48,roughness:.63}));
      fixture.position.set(x,.21,z);
      scene.add(fixture);
      const lens=new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,.035,12),
        new THREE.MeshBasicMaterial({color:0xf5ca75}));
      lens.position.set(x,.325,z);
      scene.add(lens);
      const lamp=new THREE.PointLight(0xe7b968,1.6,3.7);
      lamp.position.set(x,.52,z);
      scene.add(lamp);
    }
    // Readable warning art with explicit fictional-site labeling.
    const warningTexture = createWarningPlacard();
    const signMaterial = new THREE.MeshBasicMaterial({map:warningTexture,side:THREE.DoubleSide});
    for (const [x,z] of [[-2.75,-1.85],[2.75,-1.85]] as const) {
      const post=new THREE.Mesh(new THREE.BoxGeometry(.095,1.04,.10),deep);
      post.position.set(x,.60,z);
      scene.add(post);
      const signBacking=new THREE.Mesh(new THREE.BoxGeometry(1.25,.70,.055),deep);
      signBacking.position.set(x,1.18,z);
      scene.add(signBacking);
      const placard=new THREE.Mesh(new THREE.PlaneGeometry(1.15,.59),signMaterial);
      placard.position.set(x,1.18,z+.034);
      scene.add(placard);
    }
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
    const insetWall = new THREE.Mesh(
      new THREE.CylinderGeometry(1.09,1.09,1.7,80,1,true),
      new THREE.MeshStandardMaterial({color:0x090c09,metalness:.4,roughness:.84,side:THREE.BackSide}),
    );
    insetWall.position.y=-.82;
    scene.add(insetWall);
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

    // Oversized armored hatch doors, with stripe-engraved inspection markings.
    const hatchLeft = new THREE.Group();
    const hatchRight = new THREE.Group();
    hatchLeft.position.set(-1.22, .21, 0);
    hatchRight.position.set(1.22, .21, 0);
    const doorGeometry = new THREE.BoxGeometry(1.25, .18, 2.25);
    const leftDoor = new THREE.Mesh(doorGeometry, armor);
    leftDoor.position.x = .61;
    hatchLeft.add(leftDoor);
    const rightDoor = new THREE.Mesh(doorGeometry, armor);
    rightDoor.position.x = -.61;
    hatchRight.add(rightDoor);
    leftDoor.castShadow = true;
    rightDoor.castShadow = true;
    scene.add(hatchLeft, hatchRight);
    for (const door of [leftDoor, rightDoor]) {
      for (let j = -2; j <= 2; j++) {
        const seam = new THREE.Mesh(new THREE.BoxGeometry(.055, .014, .17), caution);
        seam.position.set(0, .107, j * .36);
        door.add(seam);
      }
      const ridge = new THREE.Mesh(new THREE.BoxGeometry(.05, .045, 1.85), brushed);
      ridge.position.set(0, .113, 0);
      door.add(ridge);
      // Decorative inspection seams and fasteners; not functional hardware.
      for (const x of [-.36,.36]) for (const z of [-.86,-.43,0,.43,.86]) {
        const rivet = new THREE.Mesh(new THREE.SphereGeometry(.018,7,5),brushed);
        rivet.position.set(x,.109,z);
        door.add(rivet);
      }
      for (const z of [-.73,.73]) {
        const armorSeam=new THREE.Mesh(new THREE.BoxGeometry(.95,.008,.014),deep);
        armorSeam.position.set(0,.108,z);
        door.add(armorSeam);
      }
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
    // The prop is longer and starts completely below the closed inspection deck.
    // Clipping at deck level keeps hidden sections from unrealistically appearing
    // through the solid platform as the animated silhouette emerges.
    missile.scale.y = SILO_MODEL_SCALE_Y;
    const deckClip = new THREE.Plane(new THREE.Vector3(0, 1, 0), -SILO_DECK_Y);
    missile.traverse(part => {
      if (!(part instanceof THREE.Mesh)) return;
      const original = Array.isArray(part.material) ? part.material : [part.material];
      const clipped = original.map(material => {
        const copy = material.clone();
        copy.clippingPlanes = [deckClip];
        copy.clipShadows = true;
        return copy;
      });
      part.material = Array.isArray(part.material) ? clipped : clipped[0];
    });
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
        if (!(object instanceof THREE.Mesh || object instanceof THREE.Points)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) material.dispose();
      });
      // In addition to materials, WebGL textures must be explicitly destroyed.
      hazardTexture.dispose();
      stencilTexture.dispose();
      steelTexture.dispose();
      warningTexture.dispose();
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
