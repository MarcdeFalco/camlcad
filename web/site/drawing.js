// Mise en plan (Black Book ch. 11, Drawing) : vues orthogonales de la pièce en projection
// européenne (face, dessus en dessous, gauche à droite), arêtes vives, cotes d'encombrement,
// cartouche ; feuille A4 paysage en SVG (mm), à l'échelle normalisée qui tient.
import * as THREE from 'three';

const SCALES = [10, 5, 2, 1, 0.5, 0.2, 0.1, 0.05];
const scaleText = (s) => (s >= 1 ? `${s}:1` : `1:${Math.round(1 / s)}`);

// Arêtes vives du maillage (angle > 20°), en segments 3D.
function edges(mesh) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(mesh.vertices, 3));
  g.setIndex(new THREE.BufferAttribute(mesh.triangles, 1));
  const p = new THREE.EdgesGeometry(g.toNonIndexed(), 20).attributes.position.array;
  return p;
}

// Vues : projection (x, y à l'écran, y vers le haut) d'un point 3D.
const VIEWS = {
  face: { name: 'Vue de face', f: (x, y, z) => [x, z] },
  dessus: { name: 'Vue de dessus', f: (x, y, z) => [x, y] }, // dessous la face : l'arrière contre elle
  gauche: { name: 'Vue de gauche', f: (x, y, z) => [-y, z] },
};

export function drawingSVG(mesh, title) {
  const E = edges(mesh), V = mesh.vertices;
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < V.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], V[i + k]); hi[k] = Math.max(hi[k], V[i + k]); }
  const [W, D, H] = [0, 1, 2].map((k) => hi[k] - lo[k]);
  // Feuille A4 paysage, marge 10, cartouche 20 de haut ; place : face + gauche en largeur, face + dessus en hauteur.
  const gap = 25, availW = 277 - gap * 2, availH = 170 - gap * 2;
  const s = SCALES.find((k) => (W + D) * k <= availW && (H + D) * k <= availH) ?? SCALES[SCALES.length - 1];
  const ox = 10 + gap, oyFront = 10 + gap + H * s; // coin bas gauche de la vue de face
  const place = {
    face: [ox - lo[0] * s, oyFront + lo[2] * s],
    dessus: [ox - lo[0] * s, oyFront + gap + hi[1] * s - 0],
    gauche: [ox + W * s + gap + hi[1] * s, oyFront + lo[2] * s],
  };
  const r = (x) => Math.round(x * 100) / 100;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="297mm" height="210mm" viewBox="0 0 297 210" font-family="sans-serif">\n`;
  svg += `<rect x="5" y="5" width="287" height="200" fill="none" stroke="#000" stroke-width="0.5"/>\n`;
  for (const [k, v] of Object.entries(VIEWS)) {
    const [px, py] = place[k];
    svg += `<g class="view" data-view="${k}" stroke="#000" stroke-width="0.25" fill="none">`;
    for (let i = 0; i < E.length; i += 6) {
      const [a, b] = v.f(E[i], E[i + 1], E[i + 2]), [c, d] = v.f(E[i + 3], E[i + 4], E[i + 5]);
      svg += `<line x1="${r(px + a * s)}" y1="${r(py - b * s)}" x2="${r(px + c * s)}" y2="${r(py - d * s)}"/>`;
    }
    svg += `</g>\n`;
  }
  // Cotes d'encombrement (en mm réels) : largeur et hauteur sur la vue de face, profondeur sur la gauche.
  const dim = (x1, y1, x2, y2, text, vertical) => {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    return `<g class="dim" stroke="#1f6feb" stroke-width="0.2"><line x1="${r(x1)}" y1="${r(y1)}" x2="${r(x2)}" y2="${r(y2)}"/>` +
      `<text x="${r(vertical ? mx - 2 : mx)}" y="${r(vertical ? my : my - 1.5)}" font-size="3.5" fill="#1f6feb" stroke="none" text-anchor="middle"${vertical ? ` transform="rotate(-90 ${r(mx - 2)} ${r(my)})"` : ''}>${text}</text></g>\n`;
  };
  const fmt = (x) => String(Math.round(x * 100) / 100);
  const fy = oyFront, fx0 = ox, fx1 = ox + W * s;
  svg += dim(fx0, fy + 8, fx1, fy + 8, fmt(W), false).replace('<g class="dim"', '<g class="dim" data-dim="largeur"');
  svg += dim(fx0 - 8, fy, fx0 - 8, fy - H * s, fmt(H), true).replace('<g class="dim"', '<g class="dim" data-dim="hauteur"');
  const gx0 = ox + W * s + gap;
  svg += dim(gx0, fy + 8, gx0 + D * s, fy + 8, fmt(D), false).replace('<g class="dim"', '<g class="dim" data-dim="profondeur"');
  for (const [k, v] of Object.entries(VIEWS)) {
    const [px, py] = place[k], tx = k === 'gauche' ? gx0 : ox, ty = k === 'dessus' ? py + 2 + D * 0 + 6 : fy + 14;
    svg += `<text x="${r(tx)}" y="${r(k === 'dessus' ? oyFront + gap + D * s + 6 : ty)}" font-size="3" fill="#555">${v.name}</text>\n`;
  }
  // Cartouche.
  svg += `<g class="cartouche" font-size="3.5"><rect x="192" y="185" width="100" height="20" fill="none" stroke="#000" stroke-width="0.4"/>` +
    `<text x="195" y="192">${title}</text><text x="195" y="199" font-size="3">Échelle ${scaleText(s)} · mm · projection européenne · camlcad</text></g>\n`;
  svg += `</svg>\n`;
  return { svg, scale: s, size: [W, D, H] };
}
