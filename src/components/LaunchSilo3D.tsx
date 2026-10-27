import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { siloPose } from '../engine/siloAnimation';

type Props = { launchSignal: number };

/** A fictional signal pod emerging from a stylized hatch, not a real spacecraft or weapon system. */
export default function LaunchSilo3D({ launchSignal }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef<number | null>(null);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    if (launchSignal > 0) startedRef.current = performance.now();
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
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowDetail ? 1.15 : 1.5));
    } catch {
      setAvailable(false);
      return;
    }
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.45;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.className = 'silo-webgl-canvas';
    host.appendChild(renderer.domElement);
    setAvailable(true);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x090f1b, 0.037);
    const camera = new THREE.PerspectiveCamera(38, 1, .1, 110);
    const ambient = new THREE.AmbientLight(0x8baccd, 2.3);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xdfeaff, 3.6);
    key.position.set(-3, 7, 5);
    scene.add(key);
    const rim = new THREE.PointLight(0x61bfff, 26, 12);
    rim.position.set(3, 2.6, -2);
    scene.add(rim);
    const beacon = new THREE.PointLight(0x80eaf6, 12, 9);
    beacon.position.set(0, .4, 0);
    scene.add(beacon);

    const metal = new THREE.MeshStandardMaterial({ color: 0x182537, metalness: .82, roughness: .27 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x0b1421, metalness: .7, roughness: .4 });
    const silver = new THREE.MeshStandardMaterial({ color: 0xa1b9cb, metalness: .79, roughness: .22 });
    const ceramic = new THREE.MeshStandardMaterial({ color: 0x31485f, metalness: .42, roughness: .29 });
    const luminous = new THREE.MeshBasicMaterial({ color: 0x9cf2ff });
    const line = new THREE.MeshBasicMaterial({ color: 0x69beda, transparent: true, opacity: .62 });
    const exhaustMaterial = new THREE.MeshBasicMaterial({
      color: 0x86e9ff, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });

    // Heavy industrial docking well, illuminated concentric rails and service deck.
    const platform = new THREE.Mesh(new THREE.CylinderGeometry(1.57, 1.78, .48, 64), metal);
    platform.position.y = -.31;
    scene.add(platform);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.97, .97, .12, 64), dark);
    shaft.position.y = -.01;
    scene.add(shaft);
    const innerRing = new THREE.Mesh(new THREE.TorusGeometry(1.04, .035, 10, 72), luminous);
    innerRing.rotation.x = Math.PI / 2;
    innerRing.position.y = .08;
    scene.add(innerRing);
    for (const [radius, y, material] of [
      [1.39, -.09, silver], [1.65, -.34, line], [1.88, -.49, line],
    ] as const) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, .016, 7, 88), material);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      scene.add(ring);
    }
    for (let index = 0; index < 12; index++) {
      const angle = index * Math.PI / 6;
      const bolt = new THREE.Mesh(new THREE.BoxGeometry(.12, .045, .23), silver);
      bolt.position.set(Math.cos(angle) * 1.44, -.05, Math.sin(angle) * 1.44);
      bolt.rotation.y = -angle;
      scene.add(bolt);
    }

    // Symmetrical roof panels swivel away from the launch well on side hinges.
    const hatchLeft = new THREE.Group();
    const hatchRight = new THREE.Group();
    hatchLeft.position.set(-1.21, .22, 0);
    hatchRight.position.set(1.21, .22, 0);
    const doorGeometry = new THREE.BoxGeometry(1.13, .14, 2.14);
    const leftDoor = new THREE.Mesh(doorGeometry, ceramic);
    leftDoor.position.x = .58;
    hatchLeft.add(leftDoor);
    const rightDoor = new THREE.Mesh(doorGeometry, ceramic);
    rightDoor.position.x = -.58;
    hatchRight.add(rightDoor);
    scene.add(hatchLeft, hatchRight);
    for (const door of [leftDoor, rightDoor]) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(.065, .014, 1.68), luminous);
      strip.position.set(0, .082, 0);
      door.add(strip);
    }

    // A small abstract orbital data pod with lighting, not a functional vehicle.
    const pod = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.235, .29, 1.45, 24), silver);
    pod.add(body);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(.235, .57, 24), silver);
    nose.position.y = 1.01;
    pod.add(nose);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .16, 24), dark);
    collar.position.y = -.63;
    pod.add(collar);
    for (const height of [-.49, .25, .66]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.246, .021, 7, 32), luminous);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = height;
      pod.add(ring);
    }
    const podEye = new THREE.Mesh(new THREE.SphereGeometry(.105, 14, 12), luminous);
    podEye.position.set(0, .37, .239);
    pod.add(podEye);
    const glow = new THREE.Mesh(new THREE.ConeGeometry(.22, 1.9, 20, 1, true), exhaustMaterial);
    glow.position.y = -1.67;
    glow.rotation.x = Math.PI;
    pod.add(glow);
    const exhaustRing = new THREE.Mesh(new THREE.TorusGeometry(.22, .024, 6, 28), luminous);
    exhaustRing.rotation.x = Math.PI / 2;
    exhaustRing.position.y = -.8;
    pod.add(exhaustRing);
    scene.add(pod);

    // Light particles form a stylized trail. No smoke textures or external assets.
    const dotCount = lowDetail ? 28 : 65;
    const dots = new Float32Array(dotCount * 3);
    const dotGeometry = new THREE.BufferGeometry();
    dotGeometry.setAttribute('position', new THREE.BufferAttribute(dots, 3));
    const particles = new THREE.Points(
      dotGeometry,
      new THREE.PointsMaterial({
        size: .055, color: 0x91efff, transparent: true, opacity: .8,
        sizeAttenuation: true, blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    );
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

    const onVisibility = () => { visible = document.visibilityState === 'visible'; if (visible && !stopped) loop(); };
    const intersection = new IntersectionObserver(entries => {
      visible = entries[0]?.isIntersecting === true && document.visibilityState === 'visible';
      if (visible && !stopped) loop();
    }, { threshold: .01 });
    intersection.observe(host);

    const onReduced = () => { reduced = reducedQuery.matches; if (reduced) renderFrame(performance.now()); };
    reducedQuery.addEventListener('change', onReduced);
    const onContextLost = (event: Event) => {
      event.preventDefault();
      stopped = true;
      cancelAnimationFrame(frameId);
      setAvailable(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    function renderFrame(timestamp: number) {
      const ms = startedRef.current === null ? null : timestamp - startedRef.current;
      if (ms !== null && ms > 4800) startedRef.current = null;
      const pose = siloPose(ms, reduced);
      hatchLeft.rotation.z = pose.hatch * 1.34;
      hatchRight.rotation.z = -pose.hatch * 1.34;
      pod.position.y = -1.32 + 7.1 * pose.ascent;
      pod.rotation.y = timestamp * .00018;
      pod.visible = pose.hatch > .12 || (ms === null ? false : pose.ascent > 0);
      exhaustMaterial.opacity = pose.thrust * .82;
      glow.scale.y = Math.max(.01, pose.thrust * (1.15 + .25 * Math.sin(timestamp * .028)));
      particles.visible = pose.thrust > .01;
      const positions = dotGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < dotCount; i++) {
        const v = ((timestamp * .0018 + i * .072) % 1);
        const a = i * 2.39996;
        const radius = .07 + .34 * v;
        positions[3 * i] = Math.cos(a) * radius;
        positions[3 * i + 1] = pod.position.y - 1.02 - v * 2.6;
        positions[3 * i + 2] = Math.sin(a) * radius;
      }
      dotGeometry.attributes.position.needsUpdate = true;
      beacon.intensity = 6 + 15 * pose.glow;
      innerRing.scale.setScalar(1 + pose.glow * .025);
      const idleTurn = Math.sin(timestamp * .00022) * .12;
      camera.position.set(4.6 + idleTurn + pose.shake * Math.sin(timestamp * .09), 3.65 + pose.ascent * .8, 7.6);
      camera.lookAt(0, .56 + pose.ascent * 1.4, 0);
      renderer.render(scene, camera);
    }
    function loop() {
      cancelAnimationFrame(frameId);
      if (stopped || !visible || reduced) return;
      frameId = requestAnimationFrame((time) => {
        if (time - lastFrame >= 33) {
          renderFrame(time);
          lastFrame = time;
        }
        loop();
      });
    }
    renderFrame(performance.now());
    loop();

    return () => {
      stopped = true;
      cancelAnimationFrame(frameId);
      intersection.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      reducedQuery.removeEventListener('change', onReduced);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh || object instanceof THREE.Points)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) material.dispose();
      });
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
          <span className="silo-fallback-symbol">◇</span>
          <span>3D PREVIEW UNAVAILABLE</span>
        </div>
      )}
    </div>
  );
}
