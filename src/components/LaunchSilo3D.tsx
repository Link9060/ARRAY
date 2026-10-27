import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { siloPose, SILO_SEQUENCE_MS } from '../engine/siloAnimation';

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
    renderer.shadowMap.enabled = !lowDetail;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.className = 'silo-webgl-canvas';
    host.appendChild(renderer.domElement);
    setAvailable(true);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0b0e0b, .033);
    const camera = new THREE.PerspectiveCamera(37, 1, .1, 100);
    scene.add(new THREE.AmbientLight(0xb7b9a6, 1.12));
    const key = new THREE.DirectionalLight(0xf4edcd, 3.4);
    key.position.set(-4, 7, 5);
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
    const fill = new THREE.DirectionalLight(0x8d997d, 1.5);
    fill.position.set(2, 2, -4);
    scene.add(fill);
    const bayLamp = new THREE.PointLight(0xc4a957, 4.5, 8);
    bayLamp.position.set(0, .5, 0);
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
    ground.position.y=-.59;
    ground.receiveShadow=true;
    scene.add(ground);
    // Peripheral recessed deck seams and hazard markings make the prop feel grounded.
    for (let i=-3; i<=3; i++) {
      const seam = new THREE.Mesh(new THREE.BoxGeometry(.015,.004,12),deep);
      seam.position.set(i*1.65,-.582,0);
      scene.add(seam);
    }
    const olive = new THREE.MeshStandardMaterial({ color: 0x545c49, metalness: .58, roughness: .58 });
    const brushed = new THREE.MeshStandardMaterial({ color: 0x6e7469, metalness: .74, roughness: .48 });
    const caution = new THREE.MeshBasicMaterial({ color: 0xd1af56 });
    const fineLine = new THREE.MeshBasicMaterial({ color: 0x788268, transparent: true, opacity: .62 });
    const exhaustMaterial = new THREE.MeshBasicMaterial({
      color: 0xd5b975, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });

    // Stylized inspection platform: concentric industrial steel rings and armor plates.
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.69, 1.87, .47, 64), armor);
    plinth.position.y = -.33;
    plinth.castShadow=true;
    plinth.receiveShadow=true;
    scene.add(plinth);
    const well = new THREE.Mesh(new THREE.CylinderGeometry(1.01, 1.01, .12, 64), deep);
    well.position.y = -.04;
    well.receiveShadow=true;
    scene.add(well);
    for (const [radius, height, material] of [
      [1.035, .04, caution],
      [1.44, -.08, brushed],
      [1.73, -.49, fineLine],
      [1.97, -.5, fineLine],
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
      block.position.set(Math.cos(angle) * 1.48, -.03, Math.sin(angle) * 1.48);
      block.rotation.y = -angle;
      scene.add(block);
    }

    // Oversized armored hatch doors, with stripe-engraved inspection markings.
    const hatchLeft = new THREE.Group();
    const hatchRight = new THREE.Group();
    hatchLeft.position.set(-1.22, .21, 0);
    hatchRight.position.set(1.22, .21, 0);
    const doorGeometry = new THREE.BoxGeometry(1.15, .18, 2.25);
    const leftDoor = new THREE.Mesh(doorGeometry, armor);
    leftDoor.position.x = .585;
    hatchLeft.add(leftDoor);
    const rightDoor = new THREE.Mesh(doorGeometry, armor);
    rightDoor.position.x = -.585;
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

    const glow = new THREE.Mesh(new THREE.ConeGeometry(.23, 1.9, 20, 1, true), exhaustMaterial);
    glow.rotation.x = Math.PI;
    glow.position.y = -2.44;
    missile.add(glow);
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
    scene.add(missile);

    const dotCount = lowDetail ? 18 : 42;
    const dots = new Float32Array(dotCount * 3);
    const dotGeometry = new THREE.BufferGeometry();
    dotGeometry.setAttribute('position', new THREE.BufferAttribute(dots, 3));
    const particles = new THREE.Points(dotGeometry, new THREE.PointsMaterial({
      size: .045, color: 0xc7bd90, transparent: true, opacity: .54,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    particles.visible = false;
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
      hatchLeft.rotation.z = .91 + pose.hatch * .61;
      hatchRight.rotation.z = -.91 - pose.hatch * .61;
      // The inspection object remains visible while parked. Launch remains illustrative.
      missile.position.y = -.18 + 7.6 * pose.ascent;
      missile.rotation.y = Math.sin(timestamp * .00023) * .055;
      missile.visible = pose.ascent < .95;
      exhaustMaterial.opacity = pose.thrust * .46;
      glow.scale.y = Math.max(.01, pose.thrust * (1.1 + .1 * Math.sin(timestamp * .03)));
      particles.visible = pose.thrust > .1;
      const positions = dotGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < dotCount; i++) {
        const v = (timestamp * .0012 + i * .061) % 1;
        const a = i * 2.4;
        positions[i * 3] = Math.cos(a) * (.05 + v * .25);
        positions[i * 3 + 1] = missile.position.y - 1.25 - v * 2.2;
        positions[i * 3 + 2] = Math.sin(a) * (.05 + v * .25);
      }
      dotGeometry.attributes.position.needsUpdate = true;
      bayLamp.intensity = 3 + pose.glow * 5;
      const sway = Math.sin(timestamp * .00017) * .09;
      camera.position.set(4.1 + sway + pose.shake * Math.sin(timestamp * .1), 3.3 + pose.ascent * .3, 7.55);
      camera.lookAt(0, .83 + pose.ascent * .8, 0);
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
