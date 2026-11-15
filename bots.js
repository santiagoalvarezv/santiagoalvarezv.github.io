/* the two robots behind the projects page.
   left: the scaffld scene. a humanoid lifts the orange box off the table, twists twice and drops it in the
   green bin, which gets moved while it works, as in the project.
   right: the eeebot. two purple boards on standoffs, ultrasonic sensor, esp32, led strip, jumper wires,
   following a black line.
   only drawn on the projects view, on screens wide enough to have room at the sides (1360px+). */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const holder = document.getElementById('bots');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const wide = matchMedia('(min-width: 1360px)');

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
holder.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
camera.position.set(0, 1.5, 10.5);
camera.lookAt(0, 0.7, 0);

scene.add(new THREE.HemisphereLight(0xfff6e6, 0xb9b0a0, 1.5));
const sun = new THREE.DirectionalLight(0xffffff, 2.3);
sun.position.set(-3, 6, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 4, bottom: -2, near: 1, far: 20 });
sun.shadow.radius = 5;
sun.shadow.bias = -0.0004;
scene.add(sun);
const fill = new THREE.DirectionalLight(0xdfe8ff, 0.5); fill.position.set(4, 2, 3); scene.add(fill);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 20), new THREE.ShadowMaterial({ opacity: 0.17 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

/* ---------- helpers ---------- */
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.05, ...o });
function add(parent, geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
}
function rbox(w, h, d, r = 0.02) {                        // a box with rounded corners and softened edges
  const b = Math.min(r * 0.6, d * 0.45, w * 0.45, h * 0.45), W = w - 2 * b, H = h - 2 * b, c = Math.max(Math.min(r - b, W / 2, H / 2), 0.0005);
  const s = new THREE.Shape();
  s.moveTo(-W / 2 + c, -H / 2); s.lineTo(W / 2 - c, -H / 2); s.quadraticCurveTo(W / 2, -H / 2, W / 2, -H / 2 + c);
  s.lineTo(W / 2, H / 2 - c); s.quadraticCurveTo(W / 2, H / 2, W / 2 - c, H / 2);
  s.lineTo(-W / 2 + c, H / 2); s.quadraticCurveTo(-W / 2, H / 2, -W / 2, H / 2 - c);
  s.lineTo(-W / 2, -H / 2 + c); s.quadraticCurveTo(-W / 2, -H / 2, -W / 2 + c, -H / 2);
  const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 6 });
  g.center();
  return g;
}
function wire(parent, pts, color, r = 0.0045) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
  return add(parent, new THREE.TubeGeometry(curve, 24, r, 6), std(color, { roughness: 0.45 }));
}
function texture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const paint = () => { draw(c.getContext('2d'), w, h); t.needsUpdate = true; };
  paint();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(paint);   // redraw once the page fonts are in
  return t;
}
const ss = (a, b, t) => { const x = Math.min(1, Math.max(0, (t - a) / (b - a))); return x * x * (3 - 2 * x); };

/* =====================================================================================
   scaffld: humanoid, table, orange box, green bin
   ===================================================================================== */
const rig = new THREE.Group(); scene.add(rig);
rig.rotation.y = -0.6;
const silver = std(0xdde1e6, { metalness: 0.35, roughness: 0.3 });
const dark = std(0x1b1d22, { metalness: 0.25, roughness: 0.38 });
const glass = std(0x0b0d11, { metalness: 0.7, roughness: 0.08 });
const bot = new THREE.Group(); rig.add(bot);

function limb(parent, x, y, z, len, r, jointR) {          // a pivot at the top, the limb hanging down, its end at -len
  const pivot = new THREE.Group(); pivot.position.set(x, y, z); parent.add(pivot);
  add(pivot, new THREE.SphereGeometry(jointR, 24, 16), dark);
  add(pivot, new THREE.CapsuleGeometry(r, len - r * 1.4, 8, 20), silver, 0, -len / 2, 0);
  const end = new THREE.Group(); end.position.y = -len; pivot.add(end);
  return { pivot, end };
}

/* legs and pelvis */
const hips = new THREE.Group(); hips.position.y = 0.68; bot.add(hips);
add(hips, rbox(0.25, 0.13, 0.16, 0.04), dark, 0, 0.02, 0);
[-1, 1].forEach(s => {
  const thigh = limb(hips, s * 0.085, -0.03, 0, 0.3, 0.055, 0.062);
  thigh.pivot.rotation.x = -0.12;
  add(thigh.pivot, rbox(0.085, 0.16, 0.03, 0.02), dark, 0, -0.14, 0.045);            // thigh plate
  const shin = limb(thigh.end, 0, 0, 0, 0.3, 0.045, 0.056);
  shin.pivot.rotation.x = 0.24;
  const foot = add(shin.end, rbox(0.095, 0.05, 0.21, 0.02), dark, 0, -0.033, 0.045);
  foot.rotation.x = -0.12;
  add(shin.end, new THREE.SphereGeometry(0.04, 16, 12), dark);                        // ankle
});

/* torso: the waist joint turns, the feet stay where they are */
const CHEST_Y = 0.76, SHOULDER_Y = 0.31, L1 = 0.22, L2 = 0.22;
const chest = new THREE.Group(); chest.position.y = CHEST_Y - 0.68; hips.add(chest);
add(chest, new THREE.CylinderGeometry(0.08, 0.09, 0.08, 24), dark, 0, 0.01, 0);       // waist
add(chest, rbox(0.21, 0.13, 0.145, 0.04), silver, 0, 0.11, 0);                        // abdomen
add(chest, rbox(0.33, 0.21, 0.185, 0.06), silver, 0, 0.26, 0);                        // chest shell
add(chest, rbox(0.15, 0.105, 0.02, 0.02), dark, 0, 0.265, 0.09);                      // chest panel
add(chest, new THREE.BoxGeometry(0.05, 0.008, 0.004), std(0x7fd4ff, { emissive: 0x3fb8ff, emissiveIntensity: 1.4 }), 0, 0.29, 0.101);
add(chest, rbox(0.2, 0.2, 0.06, 0.03), dark, 0, 0.25, -0.105);                        // battery pack
add(chest, new THREE.CylinderGeometry(0.04, 0.05, 0.06, 20), dark, 0, 0.385, 0);      // neck
const head = new THREE.Group(); head.position.y = 0.48; chest.add(head);
add(head, new THREE.SphereGeometry(0.1, 36, 28), silver).scale.set(0.95, 1.08, 1.02);
add(head, new THREE.SphereGeometry(0.1, 36, 28, Math.PI / 2 - 1.05, 2.1, 0.72, 1.5), glass).scale.set(0.985, 1.115, 1.075);  // face shield
add(head, new THREE.BoxGeometry(0.05, 0.006, 0.004), std(0x9fe0ff, { emissive: 0x4fc3ff, emissiveIntensity: 1.8 }), 0, 0.04, 0.1);
[-1, 1].forEach(s => { add(head, new THREE.CylinderGeometry(0.03, 0.03, 0.02, 20), dark, s * 0.092, 0, 0).rotation.z = Math.PI / 2; });
const camLens = add(head, new THREE.CylinderGeometry(0.012, 0.012, 0.01, 16), std(0x101216, { metalness: 0.8, roughness: 0.15 }), 0, -0.035, 0.104);
camLens.rotation.x = Math.PI / 2;                                                      // the head camera, its only sensor

const arms = [-1, 1].map(s => {
  const upper = limb(chest, s * 0.2, SHOULDER_Y, 0, L1, 0.042, 0.06);
  const fore = limb(upper.end, 0, 0, 0, L2, 0.036, 0.047);
  const hand = new THREE.Group(); fore.end.add(hand);
  add(hand, new THREE.CylinderGeometry(0.026, 0.03, 0.03, 16), dark, 0, 0.005, 0);    // wrist
  add(hand, rbox(0.03, 0.075, 0.062, 0.012), dark, 0, -0.045, 0);                     // palm, facing inwards
  for (let i = 0; i < 3; i++) add(hand, new THREE.CapsuleGeometry(0.008, 0.04, 4, 8), silver, -s * 0.004, -0.105, -0.021 + i * 0.021).rotation.z = -s * 0.25;
  add(hand, new THREE.CapsuleGeometry(0.008, 0.03, 4, 8), silver, -s * 0.012, -0.05, 0.04).rotation.x = -0.7;   // thumb
  return { upper, fore, s };
});

/* the table, the box and the bin */
const wood = std(0xa9713f, { roughness: 0.7 });
const R = 0.37;                                             // how far in front of the waist the box is held
add(rig, rbox(0.46, 0.03, 0.34, 0.01), wood, 0, 0.785, R + 0.01);
for (const [x, z] of [[-0.2, -0.14], [0.2, -0.14], [-0.2, 0.14], [0.2, 0.14]]) add(rig, new THREE.BoxGeometry(0.035, 0.77, 0.035), wood, x, 0.385, R + 0.01 + z);
const box = add(rig, rbox(0.2, 0.2, 0.2, 0.014), std(0xe2572b, { roughness: 0.55 }));
const bin = new THREE.Group(); bin.position.x = R; rig.add(bin);
add(bin, new THREE.BoxGeometry(0.25, 0.5, 0.28), std(0x33373d, { roughness: 0.8 }), 0, 0.25, 0);    // stand
const green = std(0x3f9e4f, { roughness: 0.6 });
add(bin, new THREE.BoxGeometry(0.25, 0.02, 0.28), green, 0, 0.51, 0);
add(bin, new THREE.BoxGeometry(0.014, 0.28, 0.28), green, -0.118, 0.64, 0);
add(bin, new THREE.BoxGeometry(0.014, 0.28, 0.28), green, 0.118, 0.64, 0);
add(bin, new THREE.BoxGeometry(0.25, 0.28, 0.014), green, 0, 0.64, -0.133);
add(bin, new THREE.BoxGeometry(0.25, 0.28, 0.014), green, 0, 0.64, 0.133);

/* one loop of the task. times in seconds */
const LOOP = 13;
function scaffld(time, mx, my) {
  const t = time % LOOP;
  const reach = ss(1.4, 2.4, t) - ss(7.1, 8.0, t);                                   // arms out to the box, then back
  const grip = ss(2.0, 2.5, t) - ss(6.8, 7.05, t);                                   // hands close on it ("hug")
  const h = 0.9 + 0.1 * ss(2.6, 3.3, t) - 0.14 * ss(6.0, 6.8, t);                    // lift, later lower over the bin
  const yaw = Math.PI / 4 * (ss(3.6, 4.3, t) + ss(4.9, 5.6, t)) - Math.PI / 2 * ss(8.2, 9.6, t);   // turn_left 45°, twice
  chest.rotation.y = yaw;
  bin.position.z = -0.13 * (1 - ss(3.35, 3.6, t) + ss(12.0, 12.7, t));               // the bin is moved after the lift

  if (t < 2.5) { box.position.set(0, 0.9, R); box.rotation.y = 0; box.scale.setScalar(Math.max(0.001, ss(0.2, 0.7, t))); }
  else if (t < 6.9) { box.position.set(Math.sin(yaw) * R, h, Math.cos(yaw) * R); box.rotation.y = yaw; box.scale.setScalar(1); }
  else {                                                                              // let go: it drops into the bin
    const dt = t - 6.9;
    box.position.set(R, Math.max(0.62, 0.86 - 4 * dt * dt), 0); box.rotation.y = Math.PI / 2;
    box.scale.setScalar(Math.max(0.001, 1 - ss(11.3, 11.8, t)));
  }

  /* two-link arm: shoulder and elbow angles that put the wrist beside the box */
  const dy = h - CHEST_Y - SHOULDER_Y, dz = R, d = Math.min(Math.hypot(dy, dz), L1 + L2 - 0.004);
  const phi = Math.atan2(dz, -dy);
  const a1 = Math.acos((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d));
  const a2 = Math.PI - Math.acos((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2));
  const sway = Math.sin(time * 1.5) * 0.02;
  arms.forEach(({ upper, fore, s }) => {
    upper.pivot.rotation.x = -(reach * (phi - a1) + (1 - reach) * (0.04 + sway * s));
    fore.pivot.rotation.x = -(reach * a2 + (1 - reach) * 0.16);
    upper.pivot.rotation.z = s * 0.07 * (1 - reach) - s * (0.02 + 0.17 * grip) * reach;
  });

  /* the head watches the box while it works, and the pointer when it is idle */
  const hx = 0.42 * reach + my * 0.2 * (1 - reach), hy = mx * 0.5 * (1 - reach);
  head.rotation.x += (hx - head.rotation.x) * 0.08;
  head.rotation.y += (hy - head.rotation.y) * 0.08;
  bot.position.y = Math.sin(time * 1.5) * 0.002;
}

/* =====================================================================================
   eeebot
   ===================================================================================== */
const carRig = new THREE.Group(); scene.add(carRig);
carRig.rotation.y = 0.5;
const car = new THREE.Group(); carRig.add(car);
add(carRig, new THREE.PlaneGeometry(2.1, 0.05), std(0x17181b, { roughness: 0.9 }), 0, 0.003, 0).rotation.x = -Math.PI / 2;   // the line it follows

const PURPLE = '#5c2b88', black = std(0x17181c, { roughness: 0.55 }), white = std(0xf1f0ea, { roughness: 0.6 });
const metal = std(0xc9cdd3, { metalness: 0.8, roughness: 0.25 }), edge = std(0x4a2170, { roughness: 0.6 });
function perf(g, x0, y0, x1, y1, step = 16) {              // prototyping holes
  for (let y = y0; y <= y1; y += step) for (let x = x0; x <= x1; x += step) {
    g.fillStyle = 'rgba(214,190,235,.5)'; g.beginPath(); g.arc(x, y, 4.2, 0, 7); g.fill();
    g.fillStyle = '#2c1242'; g.beginPath(); g.arc(x, y, 2.3, 0, 7); g.fill();
  }
}
function vtext(g, s, x, y, size = 15) { g.save(); g.translate(x, y); g.rotate(-Math.PI / 2); g.font = '600 ' + size + 'px Inter, Arial, sans-serif'; g.fillText(s, 0, 0); g.restore(); }
function hole(g, x, y) { g.fillStyle = '#d8c690'; g.beginPath(); g.arc(x, y, 13, 0, 7); g.fill(); g.fillStyle = '#efe9da'; g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); }

/* upper board, 0.86 x 0.40: 1200 px per unit. front of the car is on the left, the near edge at the bottom */
const upperTex = texture(1032, 480, (g, w, h) => {
  g.fillStyle = PURPLE; g.fillRect(0, 0, w, h);
  perf(g, 60, 60, 760, 420);
  perf(g, 800, 250, 990, 380);
  g.strokeStyle = '#f1ebf7'; g.fillStyle = '#f1ebf7'; g.lineWidth = 3;
  g.strokeRect(46, 44, 110, 392); g.strokeRect(170, 44, 330, 392); g.strokeRect(514, 44, 96, 392); g.strokeRect(624, 44, 150, 392);
  vtext(g, '↑ HC-SR04 Circuit ↑', 164, 330, 14); vtext(g, 'Optical Line Following Amplifier Circuits ↑', 508, 420, 14);
  vtext(g, '↑ Colour Sensor Breakout ↑', 618, 400, 14); vtext(g, 'General Purpose Stripboard ↑', 786, 420, 14); vtext(g, 'I2C Connections ↑', 806, 230, 14);
  g.save(); g.translate(1000, 34); g.rotate(Math.PI); g.font = '700 17px Inter, Arial, sans-serif'; g.fillText('The EEEBot Expansion Board v1.0', 0, 0); g.restore();
  for (let i = 0; i < 44; i++) { g.font = '500 9px Inter, Arial'; g.fillText(String(70 - i), 62 + i * 16, 452); }
  [[26, 26], [26, 454], [1006, 26], [1006, 454], [470, 26], [470, 454]].forEach(p => hole(g, p[0], p[1]));
  g.fillStyle = '#fbfaf5'; g.fillRect(730, 400, 196, 50); g.fillRect(936, 400, 62, 50);            // the name stickers
  g.strokeStyle = '#1b1b1b'; g.lineWidth = 2; g.strokeRect(730, 400, 196, 50); g.strokeRect(936, 400, 62, 50);
  g.fillStyle = '#16161a'; g.font = '600 40px Caveat, "Segoe Print", cursive'; g.textBaseline = 'middle';
  g.fillText('SANTIAGO', 742, 427); g.font = '600 30px Caveat, "Segoe Print", cursive'; g.fillText('01-3', 942, 427);
  g.textBaseline = 'alphabetic';
});
/* lower board, 0.90 x 0.40 */
const lowerTex = texture(1080, 480, (g, w, h) => {
  g.fillStyle = PURPLE; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(160,120,200,.55)'; g.lineWidth = 4;
  for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(330, 150 + i * 12); g.lineTo(520 + i * 14, 150 + i * 12); g.lineTo(600 + i * 14, 230 + i * 12); g.lineTo(900, 230 + i * 12); g.stroke(); }
  g.fillStyle = '#f1ebf7'; g.font = '700 17px Inter, Arial, sans-serif';
  [['SPI', 250], ['UART', 345], ['COLOUR SENSOR', 545], ['GND', 742], ['ON-BOARD VOLTAGE', 880]].forEach(p => g.fillText(p[0], p[1], 466));
  g.strokeStyle = '#f1ebf7'; g.lineWidth = 3; g.strokeRect(236, 396, 82, 44); g.strokeRect(336, 396, 62, 44); g.strokeRect(890, 396, 60, 44); g.strokeRect(970, 396, 60, 44);
  g.fillStyle = '#2a2a30'; g.fillRect(700, 400, 130, 36);
  for (let i = 0; i < 6; i++) { g.fillStyle = '#d8c690'; g.beginPath(); g.arc(248 + i * 12, 418, 4, 0, 7); g.fill(); }
  [[30, 30], [30, 450], [1050, 30], [1050, 450], [320, 30], [760, 300]].forEach(p => hole(g, p[0], p[1]));
});
/* sensor array board, 0.15 x 0.52 */
const arrayTex = texture(180, 624, (g, w, h) => {
  g.fillStyle = PURPLE; g.fillRect(0, 0, w, h);
  perf(g, 16, 18, 140, 610, 13);
  g.fillStyle = '#d9dde2';
  for (let i = 0; i < 46; i++) { const x = 20 + ((i * 53) % 118), y = 30 + ((i * 97) % 566); g.beginPath(); g.arc(x, y, 5 + (i % 3), 0, 7); g.fill(); }
  g.fillStyle = '#f1ebf7'; vtext(g, 'The Sensor Array Board v1.1', 170, 470, 13);
});
function board(w, d, tex, x, y) {
  const top = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, metalness: 0.05 });
  return add(car, new THREE.BoxGeometry(w, 0.016, d), [edge, edge, top, edge, edge, edge], x, y, 0);
}
const L = 0.168, U = 0.338;                                 // top faces of the lower and upper boards
board(0.9, 0.4, lowerTex, 0, L - 0.008);
board(0.86, 0.4, upperTex, 0.02, U - 0.008);
board(0.15, 0.52, arrayTex, -0.525, 0.112);
add(car, new THREE.BoxGeometry(0.03, 0.05, 0.3), edge, -0.455, 0.135, 0);                          // the array board hangs off the front
for (const [x, z] of [[-0.39, 0.17], [-0.39, -0.17], [0.43, 0.17], [0.43, -0.17]]) {
  add(car, new THREE.CylinderGeometry(0.014, 0.014, 0.154, 6), white, x, (L + U) / 2 - 0.008, z);  // nylon standoffs
  add(car, new THREE.CylinderGeometry(0.02, 0.02, 0.008, 12), white, x, U + 0.004, z);
}
[-0.08, 0.08].forEach(z => add(car, new THREE.CylinderGeometry(0.014, 0.014, 0.06, 6), white, -0.36, L + 0.03, z));

/* ultrasonic sensor */
const us = new THREE.Group(); us.position.set(-0.385, U, 0); car.add(us);
add(us, new THREE.BoxGeometry(0.022, 0.035, 0.1), black, 0.008, 0.018, 0);
add(us, new THREE.BoxGeometry(0.012, 0.105, 0.25), std(0x1f4f96, { roughness: 0.45 }), -0.004, 0.088, 0);
[-0.068, 0.068].forEach(z => {
  add(us, new THREE.CylinderGeometry(0.046, 0.046, 0.052, 28), metal, -0.036, 0.09, z).rotation.z = Math.PI / 2;
  add(us, new THREE.CylinderGeometry(0.037, 0.037, 0.003, 28), std(0x2b2d31, { roughness: 0.9 }), -0.063, 0.09, z).rotation.z = Math.PI / 2;
});
add(us, new THREE.CapsuleGeometry(0.011, 0.03, 4, 10), metal, -0.014, 0.128, 0).rotation.x = Math.PI / 2;   // crystal

/* the three op-amps, their trimmers and resistors */
const tan = std(0xd2b48c), blue = std(0x2f6fd0, { roughness: 0.4 });
for (let i = 0; i < 3; i++) {
  const x = -0.27 + i * 0.085;
  add(car, new THREE.BoxGeometry(0.046, 0.008, 0.052), metal, x, U + 0.006, -0.09);                 // legs
  add(car, new THREE.BoxGeometry(0.05, 0.022, 0.04), black, x, U + 0.02, -0.09);
  add(car, new THREE.BoxGeometry(0.03, 0.03, 0.02), blue, x - 0.004, U + 0.015, -0.152);
  add(car, new THREE.CylinderGeometry(0.006, 0.006, 0.004, 8), std(0xe9d27a, { metalness: 0.6 }), x - 0.004, U + 0.032, -0.152);
  add(car, new THREE.CapsuleGeometry(0.006, 0.026, 4, 8), tan, x + 0.012, U + 0.008, -0.038).rotation.z = Math.PI / 2;
}
[[-0.335, -0.02], [-0.335, 0.0]].forEach(p => add(car, new THREE.CapsuleGeometry(0.006, 0.026, 4, 8), tan, p[0], U + 0.008, p[1]).rotation.z = Math.PI / 2);

/* led strip, buzzer, status led */
add(car, new THREE.BoxGeometry(0.315, 0.004, 0.046), white, -0.2, U + 0.002, 0.078);
const leds = [];
for (let i = 0; i < 8; i++) leds.push(add(car, new THREE.BoxGeometry(0.024, 0.008, 0.024), std(0xffffff, { emissive: 0x000000, emissiveIntensity: 1.7 }), -0.335 + i * 0.0385, U + 0.007, 0.078));
add(car, new THREE.CylinderGeometry(0.028, 0.028, 0.024, 24), black, 0.03, U + 0.012, 0.125);
add(car, new THREE.CylinderGeometry(0.005, 0.005, 0.002, 10), std(0x050505), 0.03, U + 0.025, 0.125);
add(car, new THREE.CapsuleGeometry(0.011, 0.014, 6, 12), std(0xe02b20, { emissive: 0xd01208, emissiveIntensity: 0.9, roughness: 0.25 }), -0.04, U + 0.022, 0.168);

/* esp32 on its header socket */
add(car, new THREE.BoxGeometry(0.3, 0.045, 0.118), black, 0.27, U + 0.0225, -0.095);
add(car, new THREE.BoxGeometry(0.3, 0.006, 0.118), std(0x101114, { roughness: 0.5 }), 0.27, U + 0.048, -0.095);
add(car, new THREE.BoxGeometry(0.1, 0.014, 0.088), metal, 0.175, U + 0.058, -0.095);               // rf shield
add(car, new THREE.BoxGeometry(0.03, 0.012, 0.04), metal, 0.41, U + 0.057, -0.095);                // usb
add(car, new THREE.BoxGeometry(0.035, 0.008, 0.035), std(0x24262b), 0.3, U + 0.055, -0.095);
[-0.05, 0.05].forEach(z => add(car, new THREE.BoxGeometry(0.285, 0.004, 0.006), std(0xd8c690, { metalness: 0.7 }), 0.27, U + 0.053, -0.095 + z));
add(car, new THREE.BoxGeometry(0.008, 0.004, 0.008), std(0xff3b30, { emissive: 0xff2010, emissiveIntensity: 1.5 }), 0.36, U + 0.053, -0.075);

/* connectors and the wiring */
add(car, new THREE.BoxGeometry(0.075, 0.05, 0.056), white, 0.2, U + 0.025, 0.07);
add(car, new THREE.BoxGeometry(0.07, 0.05, 0.05), white, 0.37, L + 0.025, 0.16);
add(car, new THREE.BoxGeometry(0.085, 0.03, 0.02), black, 0.048, L + 0.015, 0.188);
for (let i = 0; i < 4; i++) wire(car, [[0.215 + i * 0.012, U + 0.04, 0.09], [0.25 + i * 0.012, U + 0.055, 0.17], [0.27 + i * 0.01, U - 0.04, 0.218], [0.35 + i * 0.008, L + 0.05, 0.17]], 0x111114, 0.0055);
[0x2f6fd2, 0xe58fb7, 0x7a4fc0, 0xf0c419, 0x7a4a26].forEach((c, i) => {                               // down to the colour sensor header
  const x = 0.02 + i * 0.014;
  wire(car, [[x, U + 0.004, 0.13], [x, U + 0.02, 0.195], [x, U - 0.05, 0.212], [x, L + 0.03, 0.19]], c);
});
const RED = 0xd23b2f, GRN = 0x2fa04a, BLU = 0x2f6fd2, YEL = 0xf0c419, ORG = 0xf08a2f, PNK = 0xe58fb7, BLK = 0x16161a;
[[-0.3, -0.175, 0.12, -0.172, RED, 0.03], [-0.22, -0.183, 0.14, -0.15, GRN, 0.035], [-0.345, -0.005, 0.1, -0.02, BLU, 0.012], [-0.345, 0.015, 0.34, 0.025, RED, 0.012],
 [-0.04, 0.07, 0.11, 0.12, RED, 0.02], [-0.04, 0.085, 0.3, 0.145, GRN, 0.022], [0.0, -0.12, 0.125, -0.06, ORG, 0.025], [0.0, -0.14, 0.125, -0.125, YEL, 0.03],
 [0.06, 0.0, 0.12, -0.1, YEL, 0.04], [0.1, 0.03, 0.39, 0.03, PNK, 0.018], [0.12, 0.05, 0.41, 0.055, BLU, 0.016], [-0.1, 0.165, 0.425, 0.158, RED, 0.012],
 [-0.27, -0.06, -0.27, 0.19, BLK, 0.012], [-0.185, -0.06, -0.185, 0.19, BLK, 0.012], [-0.1, -0.06, -0.1, 0.19, BLK, 0.012],
 [-0.31, 0.19, -0.24, 0.165, GRN, 0.02], [-0.3, 0.185, -0.2, 0.175, 0x7a4fc0, 0.025]
].forEach(([x0, z0, x1, z1, c, lift], i) => {
  const mx = (x0 + x1) / 2 + ((i * 37) % 7 - 3) * 0.006, mz = (z0 + z1) / 2 + ((i * 53) % 9 - 4) * 0.006;
  wire(car, [[x0, U + 0.002, z0], [x0 + (x1 - x0) * 0.12, U + lift * 0.8, z0 + (z1 - z0) * 0.12], [mx, U + lift, mz], [x1 - (x1 - x0) * 0.12, U + lift * 0.8, z1 - (z1 - z0) * 0.12], [x1, U + 0.002, z1]], c);
});

/* under the boards: display, motors, the line sensors */
add(car, new THREE.BoxGeometry(0.05, 0.085, 0.1), std(0x202226), -0.3, L + 0.0425, 0);
add(car, new THREE.BoxGeometry(0.002, 0.07, 0.085), std(0xe8e6df), -0.326, L + 0.0425, 0);
const eyes = [];
for (let i = 0; i < 6; i++) eyes.push(add(car, new THREE.SphereGeometry(0.014, 12, 10), std(0xf4f0ff, { emissive: 0xff5a5a, emissiveIntensity: 0.5, transparent: true, opacity: 0.85, roughness: 0.1 }), -0.53, 0.095, -0.2 + i * 0.08));
const yellow = std(0xf2c230, { roughness: 0.45 });
[-1, 1].forEach(s => {
  add(car, rbox(0.19, 0.062, 0.056, 0.012), yellow, 0.245, 0.122, s * 0.135);
  add(car, new THREE.CylinderGeometry(0.03, 0.03, 0.07, 16), std(0xb9bcc2, { metalness: 0.6, roughness: 0.35 }), 0.12, 0.122, s * 0.135).rotation.z = Math.PI / 2;
});

/* wheels: open five-spoke rims, the yellow motor showing through; a blue caster at the front */
const WHEEL_R = 0.118;
const wheels = [-1, 1].map(s => {
  const w = new THREE.Group(); w.position.set(0.3, WHEEL_R, s * 0.235); car.add(w);
  add(w, new THREE.TorusGeometry(0.094, 0.024, 16, 48), std(0x121214, { roughness: 0.85 }));
  add(w, new THREE.TorusGeometry(0.073, 0.007, 10, 40), black);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2, sp = add(w, new THREE.BoxGeometry(0.062, 0.015, 0.016), black, Math.cos(a) * 0.043, Math.sin(a) * 0.043, 0);
    sp.rotation.z = a;
  }
  add(w, new THREE.CylinderGeometry(0.02, 0.02, 0.03, 20), black).rotation.x = Math.PI / 2;
  add(w, new THREE.CylinderGeometry(0.008, 0.008, 0.034, 12), metal).rotation.x = Math.PI / 2;
  return w;
});
const caster = new THREE.Group(); caster.position.set(-0.2, 0.07, 0); car.add(caster);
add(caster, new THREE.CylinderGeometry(0.066, 0.066, 0.03, 32), std(0x2346c8, { roughness: 0.4 })).rotation.x = Math.PI / 2;
add(caster, new THREE.TorusGeometry(0.066, 0.007, 10, 36), black);
add(car, new THREE.BoxGeometry(0.034, 0.095, 0.05), std(0x2346c8, { roughness: 0.4 }), -0.2, 0.115, 0);

function eeebot(time) {
  const x = Math.sin(time * 0.45) * 0.12;                                             // back and forth along the line
  car.position.x = x;
  car.position.y = Math.sin(time * 9) * 0.0012;
  wheels.forEach(w => w.rotation.z = -x / WHEEL_R);
  caster.rotation.z = -x / 0.07;
  leds.forEach((l, i) => l.material.emissive.setHSL((time * 0.18 + i / 8) % 1, 0.95, 0.5));
  eyes.forEach((e, i) => e.material.emissiveIntensity = 0.35 + 0.35 * Math.max(0, Math.sin(time * 3 - i * 0.9)));
}

/* ---------- layout: each one fills the margin at its side of the page ---------- */
function layout() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  const visH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z, halfW = visH * camera.aspect / 2;
  const margin = Math.max(0, (w - 1024) / 2) * visH / h;                              // world width free at each side of the column
  const sBot = THREE.MathUtils.clamp(margin * 1.05, 0.75, 1.5), sCar = THREE.MathUtils.clamp(margin * 0.95, 0.65, 1.35);
  rig.scale.setScalar(sBot); carRig.scale.setScalar(sCar);
  rig.position.set(-halfW + Math.max(margin / 2, 0.52 * sBot), 0, 0);
  carRig.position.set(halfW - Math.max(margin / 2, 0.66 * sCar), 0, 0.2);
}

/* ---------- loop ---------- */
let mx = 0, my = 0;
addEventListener('pointermove', e => { mx = e.clientX / innerWidth * 2 - 1; my = e.clientY / innerHeight * 2 - 1; }, { passive: true });
const clock = new THREE.Clock();
let running = false, raf = 0;
function frame() {
  const t = reduce ? 3.4 : clock.getElapsedTime();           // with reduced motion: one still frame, box in hand
  scaffld(t, mx, my); eeebot(t);
  renderer.render(scene, camera);
  if (running) raf = requestAnimationFrame(frame);
}
function update() {
  const show = document.body.dataset.view === 'projects' && wide.matches;
  holder.classList.toggle('on', show);
  if (show && !running) { layout(); running = !reduce; if (reduce) frame(); else raf = requestAnimationFrame(frame); }
  if (!show && running) { running = false; cancelAnimationFrame(raf); }
}
addEventListener('resize', () => { if (holder.classList.contains('on')) { layout(); if (reduce) frame(); } });
addEventListener('hashchange', () => setTimeout(update, 0));
wide.addEventListener('change', update);
document.addEventListener('visibilitychange', () => { if (document.hidden) { running = false; cancelAnimationFrame(raf); } else update(); });
update();
