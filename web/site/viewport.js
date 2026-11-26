// Vue 3D : scène three.js, cube de vue, barre de navigation, styles d'affichage,
// plans d'origine (choix du plan d'esquisse). Axe z vers le haut, en mm.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

const $ = (id) => document.getElementById(id);

// Vues normalisées : direction vers la caméra et « haut » de l'écran.
export const VIEWS = {
  Dessus: { dir: [0, 0, 1], up: [0, 1, 0] }, Dessous: { dir: [0, 0, -1], up: [0, -1, 0] },
  Avant: { dir: [0, -1, 0], up: [0, 0, 1] }, Arrière: { dir: [0, 1, 0], up: [0, 0, 1] },
  Droite: { dir: [1, 0, 0], up: [0, 0, 1] }, Gauche: { dir: [-1, 0, 0], up: [0, 0, 1] },
};
const ISO = new THREE.Vector3(1, -1.5, 1.1).normalize();

export class Viewport {
  constructor(el) {
    this.el = el;
    const scene = (this.scene = new THREE.Scene());
    const camera = (this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 5000));
    camera.up.set(0, 0, 1);
    camera.position.set(80, -120, 90);
    const renderer = (this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }));
    renderer.setPixelRatio(devicePixelRatio);
    el.prepend(renderer.domElement);
    this.controls = new OrbitControls(camera, renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x666677, 2.2));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(1, -2, 3); scene.add(sun);
    this.grid = new THREE.GridHelper(200, 20, 0x8a8f99, 0xc9ccd2); this.grid.rotation.x = Math.PI / 2; scene.add(this.grid);
    this.axes = this.makeAxes(); scene.add(this.axes);
    this.material = new THREE.MeshStandardMaterial({ color: 0x8c9aa8, roughness: 0.5, metalness: 0.1, flatShading: true, transparent: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
    this.hiMaterial = new THREE.MeshStandardMaterial({ color: 0x3d8bff, roughness: 0.5, flatShading: true, transparent: true, opacity: 0.75, depthTest: false });
    this.style = 0; // 0 ombré + arêtes, 1 ombré, 2 filaire
    this.part = null; this.edges = null; this.highlight = null; this.planes = null; this.fitted = false;
    new ResizeObserver(() => this.resize()).observe(el);
    this.initCube();
    renderer.setAnimationLoop(() => this.frame());
  }

  makeAxes() {
    const g = new THREE.Group();
    for (const [d, c] of [[[1, 0, 0], 0xd9534f], [[0, 1, 0], 0x5cb85c], [[0, 0, 1], 0x3d7bd9]]) {
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(...d).multiplyScalar(100)]);
      g.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: c })));
    }
    return g;
  }

  resize() {
    const r = this.el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    this.renderer.setSize(r.width, r.height); this.camera.aspect = r.width / r.height; this.camera.updateProjectionMatrix();
  }

  frame() {
    if (this.anim) this.anim();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    // Cube de vue : même orientation que la caméra principale.
    const d = this.camera.position.clone().sub(this.controls.target).normalize();
    this.cubeCam.position.copy(d.multiplyScalar(150));
    this.cubeCam.up.copy(this.camera.up);
    this.cubeCam.lookAt(0, 0, 0);
    this.cubeRenderer.render(this.cubeScene, this.cubeCam);
  }

  // ---------- Cube de vue (DOM en CSS 3D, faces cliquables) ----------
  initCube() {
    const box = $('viewcube');
    this.cubeRenderer = new CSS3DRenderer();
    this.cubeRenderer.setSize(96, 96);
    box.append(this.cubeRenderer.domElement);
    this.cubeScene = new THREE.Scene();
    this.cubeCam = new THREE.PerspectiveCamera(30, 1, 1, 1000);
    const r = 30;
    for (const [name, v] of Object.entries(VIEWS)) {
      const div = document.createElement('div');
      div.className = 'cubeface'; div.textContent = name;
      div.onclick = () => this.view(name);
      const o = new CSS3DObject(div);
      const n = new THREE.Vector3(...v.dir);
      o.position.copy(n.clone().multiplyScalar(r));
      o.up.set(...v.up);
      o.lookAt(n.clone().multiplyScalar(2 * r));
      this.cubeScene.add(o);
    }
    $('home').onclick = () => this.home();
    // Flèches autour du cube : amène à l'écran la face voisine (vue de face comprise).
    for (const [k, t, title] of [['up', '▲', 'Face du dessus'], ['down', '▼', 'Face du dessous'], ['left', '◀', 'Face de gauche'], ['right', '▶', 'Face de droite']]) {
      const b = document.createElement('button');
      b.className = `cubearrow ${k}`; b.textContent = t; b.title = title; b.onclick = () => this.roll(k);
      box.append(b);
    }
  }

  // Tourne la vue d'un quart de tour vers la face voisine (repère de l'écran).
  roll(k) {
    const q = this.camera.quaternion, d = this.camera.position.clone().sub(this.controls.target).normalize();
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q), right = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
    const snap = (v) => { const a = v.toArray().map(Math.abs), i = a.indexOf(Math.max(...a)); return a[i] > 0.97 ? new THREE.Vector3().setComponent(i, Math.sign(v.getComponent(i))) : v; };
    const [nd, nu] = { up: [up, d.clone().negate()], down: [up.clone().negate(), d], left: [right.clone().negate(), up], right: [right, up] }[k];
    this.orient(snap(nd), snap(nu));
  }

  // Oriente la caméra (animation courte) : direction vers la caméra et haut d'écran.
  orient(dir, up, target = this.controls.target.clone()) {
    const dist = this.camera.position.distanceTo(this.controls.target);
    const d = dir.clone().normalize();
    // Vue exactement selon z : léger décalage pour garder OrbitControls (z en haut) stable.
    if (Math.abs(d.z) > 0.999) d.add(up.clone().multiplyScalar(-1e-3)).normalize();
    const p0 = this.camera.position.clone().sub(this.controls.target), t0 = this.controls.target.clone();
    const p1 = d.multiplyScalar(dist), start = performance.now();
    this.anim = () => {
      const s = Math.min(1, (performance.now() - start) / 250), e = s * s * (3 - 2 * s);
      this.controls.target.lerpVectors(t0, target, e);
      const p = p0.clone().lerp(p1, e).setLength(dist);
      this.camera.position.copy(this.controls.target).add(p);
      if (s >= 1) this.anim = null;
    };
  }
  view(name) { const v = VIEWS[name]; this.orient(new THREE.Vector3(...v.dir), new THREE.Vector3(...v.up)); }
  home() { this.orient(ISO.clone(), new THREE.Vector3(0, 0, 1)); }
  // Vue de trois quarts sur un plan (après une esquisse, pour voir l'extrusion).
  threeQuarter(frame) {
    const d = frame.z.clone().multiplyScalar(1.1).addScaledVector(frame.x, 0.8).addScaledVector(frame.y, -1.2);
    this.orient(d, new THREE.Vector3(0, 0, 1));
  }
  lookAt(frame) { this.orient(frame.z.clone(), frame.y.clone(), frame.origin.clone()); }

  fit(objs) {
    const b = new THREE.Box3();
    for (const o of objs ?? [this.part]) if (o) b.expandByObject(o);
    if (b.isEmpty()) { b.setFromCenterAndSize(new THREE.Vector3(), new THREE.Vector3(60, 60, 60)); }
    const s = b.getBoundingSphere(new THREE.Sphere());
    const radius = Math.max(s.radius, 5);
    const half = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const dist = (1.2 * radius) / Math.sin(half) / Math.min(1, this.camera.aspect);
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    this.anim = null;
    this.controls.target.copy(s.center);
    this.camera.position.copy(s.center).addScaledVector(dir, dist);
  }

  // ---------- Navigation ----------
  setMode(mode) {
    this.controls.mouseButtons.LEFT = mode === 'pan' ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
  }
  cycleStyle() { this.style = (this.style + 1) % 3; this.applyStyle(); }
  applyStyle() {
    this.material.wireframe = this.style === 2;
    if (this.edges) this.edges.visible = this.style === 0;
  }
  toggleGrid() { this.grid.visible = !this.grid.visible; this.axes.visible = this.grid.visible; return this.grid.visible; }

  // ---------- Pièce affichée ----------
  static geometry(m) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(m.vertices, 3));
    g.setIndex(new THREE.BufferAttribute(m.triangles, 1));
    return g.toNonIndexed();
  }
  setPart(m) {
    this.clearPart();
    if (!m) return;
    const g = Viewport.geometry(m);
    this.part = new THREE.Mesh(g, this.material);
    this.edges = new THREE.LineSegments(new THREE.EdgesGeometry(g, 25), new THREE.LineBasicMaterial({ color: 0x1c2733 }));
    this.scene.add(this.part, this.edges);
    this.applyStyle();
    if (!this.fitted) { this.fit(); this.fitted = true; }
  }
  clearPart() {
    for (const o of [this.part, this.edges]) if (o) { this.scene.remove(o); o.geometry.dispose(); }
    this.part = this.edges = null;
  }
  setHighlight(m) {
    if (this.highlight) { this.scene.remove(this.highlight); this.highlight.geometry.dispose(); this.highlight = null; }
    this.material.opacity = m ? 0.35 : 1;
    if (!m) return;
    this.highlight = new THREE.Mesh(Viewport.geometry(m), this.hiMaterial);
    this.highlight.renderOrder = 1;
    this.scene.add(this.highlight);
  }

  // Face plane choisie, surlignée (positions de triangles à plat).
  faceOverlay(pos) {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x3d8bff, transparent: true, opacity: 0.55, depthTest: false, side: THREE.DoubleSide }));
    m.renderOrder = 2; this.scene.add(m);
    return m;
  }

  // Rayon sous la souris.
  ray(e) {
    const r = this.renderer.domElement.getBoundingClientRect();
    const rc = new THREE.Raycaster();
    rc.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), this.camera);
    return rc;
  }

  // ---------- Plans d'origine (choix du plan d'esquisse) ----------
  showPlanes(planes) {
    this.hidePlanes();
    this.planes = new THREE.Group();
    const colors = { XY: 0x3d7bd9, XZ: 0x5cb85c, YZ: 0xd9534f };
    for (const [name, p] of Object.entries(planes)) {
      const f = p.frame, m = new THREE.Mesh(new THREE.PlaneGeometry(40, 40),
        new THREE.MeshBasicMaterial({ color: colors[name], transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }));
      m.matrixAutoUpdate = false;
      m.matrix.makeBasis(f.x, f.y, f.z).setPosition(f.x.clone().add(f.y).multiplyScalar(20));
      m.userData.plane = name;
      this.planes.add(m);
    }
    this.scene.add(this.planes);
  }
  hidePlanes() { if (this.planes) { this.scene.remove(this.planes); this.planes = null; } }
  pickPlane(e) {
    if (!this.planes) return null;
    this.planes.updateMatrixWorld(true);
    const hit = this.ray(e).intersectObjects(this.planes.children)[0];
    return hit ? hit.object.userData.plane : null;
  }
  hoverPlane(name) {
    if (!this.planes) return;
    for (const m of this.planes.children) m.material.opacity = m.userData.plane === name ? 0.55 : 0.25;
  }
}
