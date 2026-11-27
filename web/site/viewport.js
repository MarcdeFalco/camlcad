// Vue 3D : scène three.js, cube de vue, barre de navigation, styles d'affichage,
// plans d'origine (choix du plan d'esquisse). Axe z vers le haut, en mm.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

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
    const sun = (this.sun = new THREE.DirectionalLight(0xffffff, 1.6)); sun.position.set(1, -2, 3); scene.add(sun);
    this.grid = new THREE.GridHelper(200, 20, 0x8a8f99, 0xc9ccd2); this.grid.rotation.x = Math.PI / 2; scene.add(this.grid);
    this.axes = this.makeAxes(); scene.add(this.axes);
    this.material = new THREE.MeshStandardMaterial({ color: 0x8c9aa8, roughness: 0.5, metalness: 0.1, flatShading: true, transparent: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
    this.hiMaterial = new THREE.MeshStandardMaterial({ color: 0x3d8bff, roughness: 0.5, flatShading: true, transparent: true, opacity: 0.75, depthTest: false });
    this.style = 0; // 0 ombré + arêtes, 1 ombré, 2 filaire
    this.part = null; this.edges = null; this.highlight = null; this.planes = null; this.fitted = false;
    new ResizeObserver(() => this.resize()).observe(el);
    // La page ne défile jamais (un défilement du code la décalait vers le haut).
    // (la racine ou le corps, défilés par CodeMirror malgré overflow:hidden).
    addEventListener('scroll', () => { for (const e of [document.documentElement, document.body]) if (e.scrollTop || e.scrollLeft) { e.scrollTop = 0; e.scrollLeft = 0; } }, true);
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
    const d = ISO.clone().addScaledVector(frame.z, 0.8); // vue de départ, penchée vers la normale du plan
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
  // Styles : 0 ombré + arêtes, 1 ombré, 2 filaire, 3 rendu (Black Book ch. 10, In-canvas Render :
  // éclairage d'ambiance, matière satinée, ombre portée sur le plan de travail).
  cycleStyle() { this.style = (this.style + 1) % 4; this.applyStyle(); return this.style; }
  applyStyle() {
    const render = this.style === 3, r = this.renderer;
    this.material.wireframe = this.style === 2;
    if (this.edges) this.edges.visible = this.style === 0;
    if (render && !this.env) this.env = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = render ? this.env : null;
    r.toneMapping = render ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping; r.toneMappingExposure = 0.8;
    this.material.envMapIntensity = 0.6; if (render) { this.gridWas = this.grid.visible; this.grid.visible = this.axes.visible = false; } else if (this.gridWas != null) { this.grid.visible = this.axes.visible = this.gridWas; this.gridWas = null; }
    Object.assign(this.material, render ? { roughness: 0.45, metalness: 0.3, color: new THREE.Color(0x7d8fa3) } : { roughness: 0.5, metalness: 0.1, color: new THREE.Color(0x8c9aa8) }); this.material.needsUpdate = true;
    r.shadowMap.enabled = render; this.sun.castShadow = render;
    if (this.part) this.part.castShadow = render;
    if (render && !this.ground) {
      this.ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.35 })); this.ground.receiveShadow = true;
      this.scene.add(this.ground);
    }
    if (this.ground) {
      this.ground.visible = render;
      if (render && this.part) {
        const b = new THREE.Box3().setFromObject(this.part), c = b.getCenter(new THREE.Vector3()), sz = b.getSize(new THREE.Vector3()), k = 4 * Math.max(sz.x, sz.y, 10);
        this.ground.scale.set(k, k, 1); this.ground.position.set(c.x, c.y, b.min.z - 0.01);
        Object.assign(this.sun.shadow.camera, { left: -k, right: k, top: k, bottom: -k, far: 10 * k }); this.sun.position.copy(c).add(new THREE.Vector3(1, -2, 3).multiplyScalar(k)); this.sun.target.position.copy(c); this.sun.target.updateMatrixWorld();
        this.sun.shadow.camera.updateProjectionMatrix(); this.sun.shadow.mapSize.set(2048, 2048);
      }
    }
  }
  toggleGrid() { this.grid.visible = !this.grid.visible; this.axes.visible = this.grid.visible; return this.grid.visible; }

  // Analyse zébrée (Black Book ch. 8, Zebra Analysis) : bandes réfléchies sur la pièce ; des
  // bandes qui se cassent révèlent une discontinuité de surface.
  toggleZebra() {
    this.zebra = !this.zebra;
    if (!this.zebraMat) this.zebraMat = new THREE.ShaderMaterial({
      vertexShader: 'varying vec3 vN; varying vec3 vV; void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying vec3 vN; varying vec3 vV; void main() { vec3 r = reflect(-vV, normalize(vN)); float s = step(0.5, fract(r.y * 5.0)); gl_FragColor = vec4(vec3(0.08 + 0.85 * s), 1.0); }',
    });
    if (this.part) { if (this.zebra) this.part.geometry.computeVertexNormals(); this.part.material = this.zebra ? this.zebraMat : this.material; }
    return this.zebra;
  }

  // Analyse de dépouille (Black Book ch. 8, Draft Analysis) : direction de démoulage +z ; vert si
  // la face est en dépouille (> 1°), jaune si verticale, rouge si en contre-dépouille.
  toggleDraft() {
    this.draftOn = !this.draftOn;
    if (!this.draftMat) this.draftMat = new THREE.ShaderMaterial({
      vertexShader: 'varying vec3 vN; void main() { vN = normalize(normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'varying vec3 vN; void main() { float s = normalize(vN).z; vec3 c = s > 0.0175 ? vec3(0.2, 0.7, 0.3) : (s > -0.0175 ? vec3(0.95, 0.8, 0.2) : vec3(0.85, 0.25, 0.2)); gl_FragColor = vec4(c, 1.0); }',
    });
    if (this.part) { if (this.draftOn) this.part.geometry.computeVertexNormals(); this.part.material = this.draftOn ? this.draftMat : this.material; }
    return this.draftOn;
  }

  // Capture d'image (Black Book ch. 1, Capture Image) : la vue telle qu'affichée, en PNG.
  capture() { this.renderer.render(this.scene, this.camera); return this.renderer.domElement.toDataURL('image/png'); }

  // ---------- Pièce affichée ----------
  static geometry(m) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(m.vertices, 3));
    g.setIndex(new THREE.BufferAttribute(m.triangles, 1));
    return g.toNonIndexed();
  }
  // Coupe : plan de découpe de la pièce (null : aucune) ; l'intérieur coupé est rendu en rouge.
  setClip(plane) {
    this.clip = plane;
    const planes = plane ? [plane] : [];
    this.material.clippingPlanes = planes; this.material.needsUpdate = true;
    if (this.edges) this.edges.material.clippingPlanes = planes;
    if (this.inside) { this.scene.remove(this.inside); this.inside = null; }
    if (plane && this.part) {
      this.inside = new THREE.Mesh(this.part.geometry, new THREE.MeshBasicMaterial({ color: 0xd0453a, side: THREE.BackSide, clippingPlanes: planes }));
      this.scene.add(this.inside);
    }
  }
  setPart(m) {
    this.clearPart();
    if (!m) return;
    const g = Viewport.geometry(m);
    this.part = new THREE.Mesh(g, this.material);
    this.edges = new THREE.LineSegments(new THREE.EdgesGeometry(g, 25), new THREE.LineBasicMaterial({ color: 0x1c2733 }));
    this.scene.add(this.part, this.edges);
    this.applyStyle();
    if (this.zebra || this.draftOn) { g.computeVertexNormals(); this.part.material = this.zebra ? this.zebraMat : this.draftMat; }
    if (this.clip) this.setClip(this.clip);
    if (!this.fitted) { this.fit(); this.fitted = true; }
  }
  clearPart() {
    if (this.inside) { this.scene.remove(this.inside); this.inside = null; }
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
        new THREE.MeshBasicMaterial({ color: colors[name] ?? 0xe0a030, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }));
      m.matrixAutoUpdate = false;
      m.matrix.makeBasis(f.x, f.y, f.z).setPosition(f.origin.clone().addScaledVector(f.x.clone().add(f.y), 20));
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
