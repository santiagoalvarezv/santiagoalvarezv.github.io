/* handheld prototype: a clamshell console with two screens, modelled in millimetres.
   bottom half lies on the table, top half swings on the hinge. no logos, screens are blank for now. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { SUPABASE_URL, SUPABASE_KEY } from './games/config.js?v=8';

/* ---------- sizes (mm), roughly a big-screen clamshell handheld ---------- */
const W = 156, D = 93;          /* width and depth of each half */
const TB = 11.5, TT = 9.5;      /* thickness of bottom and top half */
const RC = 12;                  /* corner radius */
const HY = TB + 3.2, HZ = 5.5;  /* hinge axis: height above the table, distance in from the back edge */
const OPEN = THREE.MathUtils.degToRad(-24), SHUT = THREE.MathUtils.degToRad(90);

/* ---------- renderer, scene, camera ---------- */
const stage = document.getElementById('stage');
const EMBED = document.documentElement.classList.contains('embed');   /* shown inside the portfolio page */
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: EMBED });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
if (!EMBED) scene.background = new THREE.Color(0xe7e5e0);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(28, 1, 40, 3000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.enablePan = false;
if (EMBED){ controls.enableZoom = false; renderer.domElement.style.touchAction = 'pan-y'; }   /* the page keeps its scroll */
controls.minDistance = 220; controls.maxDistance = 900;
controls.minPolarAngle = 0.35; controls.maxPolarAngle = 1.45;
controls.minAzimuthAngle = -0.9; controls.maxAzimuthAngle = 0.9;   /* keep the console facing you: no sideways or upside-down views */
controls.target.set(0, 42, 18);
camera.position.set(0, 215, 330);

/* light: soft key from the upper left, a fill, and a floor that only shows the shadow */
scene.add(new THREE.HemisphereLight(0xffffff, 0xd9d4ca, 0.55));
const key = new THREE.DirectionalLight(0xffffff, 1.6);
key.position.set(-160, 320, 220); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -200, right: 200, top: 200, bottom: -200, near: 10, far: 900 });
key.shadow.radius = 6; key.shadow.bias = -0.0004;
scene.add(key);
const fill = new THREE.DirectionalLight(0xffffff, 0.45); fill.position.set(220, 120, 160); scene.add(fill);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.ShadowMaterial({ opacity: 0.16 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

/* ---------- materials ---------- */
const M = {
  shell: new THREE.MeshPhysicalMaterial({ color: 0x18191c, roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.35, envMapIntensity: 0.35 }),
  inner: new THREE.MeshPhysicalMaterial({ color: 0x1e1f22, roughness: 0.7, clearcoat: 0.1, envMapIntensity: 0.3 }),
  gloss: new THREE.MeshPhysicalMaterial({ color: 0x050506, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 0.35 }),
  key: new THREE.MeshPhysicalMaterial({ color: 0x27282c, roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.25, envMapIntensity: 0.6 }),
  pad: new THREE.MeshPhysicalMaterial({ color: 0x8f8f8d, roughness: 0.55, clearcoat: 0.2 }),
  ring: new THREE.MeshPhysicalMaterial({ color: 0x141416, roughness: 0.5 }),
  hole: new THREE.MeshBasicMaterial({ color: 0x050505 }),
  hinge: new THREE.MeshPhysicalMaterial({ color: 0x1f2023, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2, envMapIntensity: 0.6 }),
  slider: new THREE.MeshPhysicalMaterial({ color: 0xb9b9b6, roughness: 0.35, metalness: 0.4 }),
  led: new THREE.MeshBasicMaterial({ color: 0x4a7dff }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, transparent: true, opacity: 0.12, clearcoat: 1 }),
};

/* ---------- little helpers ---------- */
function roundedRect(w, h, r){
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
/* a rounded slab lying in XY, from z = 0 to z = t, with soft edges */
function slab(w, h, r, t, bevel, mat){
  const b = Math.min(bevel, t / 2 - 0.01);
  const g = new THREE.ExtrudeGeometry(roundedRect(w - 2 * b, h - 2 * b, Math.max(0.1, r - b)), { depth: t - 2 * b, bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: 5, curveSegments: 28 });
  g.translate(0, 0, b);
  const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; return m;
}
function disc(r, h, mat, seg = 48){
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat);
  m.rotation.x = Math.PI / 2; m.castShadow = true; return m;   /* axis along z, flat face up */
}
function canvasTex(w, h, draw){
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
/* printed text: a transparent decal facing +z */
function print(text, wmm, hmm, opts = {}){
  const px = 24, cw = Math.round(wmm * px), ch = Math.round(hmm * px);
  const tex = canvasTex(cw, ch, (g) => {
    g.fillStyle = opts.color || 'rgba(205,205,200,.85)';
    g.font = (opts.weight || 500) + ' ' + Math.round(ch * (opts.size || 0.7)) + 'px "Helvetica Neue", Arial, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (opts.spacing) g.letterSpacing = opts.spacing + 'px';
    g.fillText(text, cw / 2, ch / 2 + 1);
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(wmm, hmm), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
}
function at(obj, x, y, z){ obj.position.set(x, y, z); return obj; }

/* ---------- the screens: a home menu of apps underneath, the selected app's banner on top ----------
   every app here is a placeholder for now; only the map is switched on. later each one becomes a hackathon. */
/* ---------- accounts and points ----------
   two ways to keep them, same calls either way:
   - supabase (games/config.js filled in): one shared ranking for everyone. see games/supabase.sql
   - local (config empty): kept in this browser only, passwords salted and hashed with PBKDF2 */
function localStore(){
  const KEY = 'hs_users', SES = 'hs_session', enc = new TextEncoder();
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const write = (u) => { try { localStorage.setItem(KEY, JSON.stringify(u)); } catch (e) {} };
  const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
  const salt = () => hex(crypto.getRandomValues(new Uint8Array(16)));
  async function hash(pass, sl){
    const k = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits']);
    return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(sl), iterations: 150000, hash: 'SHA-256' }, k, 256));
  }
  const key = (n) => n.trim().toLowerCase();
  let me = null;
  try { const s = localStorage.getItem(SES); if (s && read()[s]) me = s; } catch (e) {}
  const remember = (k) => { me = k; try { localStorage.setItem(SES, k); } catch (e) {} };
  return {
    shared: false, ready: Promise.resolve(),
    user(){ const u = read()[me]; return u ? { name: u.name, points: u.points, games: u.games || 0, avatar: u.avatar || null } : null; },
    async setAvatar(a){ const u = read(); if (!u[me]) return; u[me].avatar = a; write(u); },
    async signUp(name, pass){
      const u = read(), k = key(name); if (u[k]) throw 'taken';
      const sl = salt(); u[k] = { name: name.trim(), salt: sl, hash: await hash(pass, sl), points: 0, games: 0 }; write(u); remember(k);
    },
    async logIn(name, pass){ const r = read()[key(name)]; if (!r || await hash(pass, r.salt) !== r.hash) throw 'wrong'; remember(key(name)); },
    async logOut(){ me = null; try { localStorage.removeItem(SES); } catch (e) {} },
    async addPoints(n){ const u = read(); if (!u[me]) return; u[me].points += n; u[me].games = (u[me].games || 0) + 1; write(u); },
    async ranking(){ return Object.values(read()).map((r) => ({ name: r.name, points: r.points, avatar: r.avatar || null })).sort((a, b) => b.points - a.points); },
    async rename(name){
      const u = read(), k = key(name); if (k !== me && u[k]) throw 'taken';
      const r = u[me]; delete u[me]; r.name = name.trim(); u[k] = r; write(u); remember(k);
    },
    async setPassword(old, pass){
      const u = read(), r = u[me]; if (await hash(old, r.salt) !== r.hash) throw 'wrong';
      r.salt = salt(); r.hash = await hash(pass, r.salt); write(u);
    },
  };
}

function supabaseStore(url, anon){
  let sb = null, profile = null;
  const fail = (e) => { throw e; };
  async function load(){
    const { data } = await sb.auth.getSession();
    if (!data.session){ profile = null; return; }
    const r = await sb.from('profiles').select('name, points, games, login_email, avatar').eq('id', data.session.user.id).maybeSingle();
    profile = r.data || null;
  }
  const ready = import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/+esm')
    .then(({ createClient }) => { sb = createClient(url, anon, { auth: { persistSession: true, storageKey: 'hs_supabase' } }); return load(); })
    .catch(() => { profile = null; });
  return {
    shared: true, ready,
    user(){ return profile ? { name: profile.name, points: profile.points, games: profile.games, avatar: profile.avatar || null } : null; },
    async setAvatar(a){ const r = await sb.rpc('set_avatar', { a }); if (r.error) fail('net'); await load(); },
    async signUp(name, pass){
      const t = await sb.rpc('name_taken', { p_name: name }); if (t.error) fail('net'); if (t.data) fail('taken');
      const email = crypto.randomUUID() + '@players.santiagoalvarezv.com';
      const r = await sb.auth.signUp({ email, password: pass, options: { data: { name: name.trim() } } });
      if (r.error) fail(/database|duplicate|unique/i.test(r.error.message) ? 'taken' : 'net');
      if (!r.data.session) fail('confirm');   /* email confirmation is still switched on in supabase */
      await load();
    },
    async logIn(name, pass){
      const e = await sb.rpc('login_email', { p_name: name }); if (e.error) fail('net'); if (!e.data) fail('wrong');
      const r = await sb.auth.signInWithPassword({ email: e.data, password: pass }); if (r.error) fail('wrong');
      await load();
    },
    async logOut(){ await sb.auth.signOut(); profile = null; },
    async addPoints(n){ if (!profile) return; await sb.rpc('add_points', { p: n }); await load(); },
    async ranking(){
      const r = await sb.from('ranking').select('name, points, avatar').order('points', { ascending: false }).limit(50);
      return r.data || [];
    },
    async rename(name){
      if (name.trim().toLowerCase() !== (profile.name || '').toLowerCase()){ const t = await sb.rpc('name_taken', { p_name: name }); if (t.data) fail('taken'); }
      const r = await sb.rpc('rename', { p_name: name }); if (r.error) fail(/unique|duplicate/i.test(r.error.message) ? 'taken' : 'net');
      await load();
    },
    async setPassword(old, pass){
      const check = await sb.auth.signInWithPassword({ email: profile.login_email, password: old }); if (check.error) fail('wrong');
      const r = await sb.auth.updateUser({ password: pass }); if (r.error) fail('net');
    },
  };
}
const store = SUPABASE_URL && SUPABASE_KEY ? supabaseStore(SUPABASE_URL, SUPABASE_KEY) : localStore();

/* ---------- the avatar: a big-headed little character in 3D ----------
   a smooth head with the face painted on, hair and hats as soft shapes, a small body.
   one scene renders it: live on the top screen while editing, and as small snapshots everywhere else. */
const AV = {
  skin:  ['#fde3cf', '#f6cda6', '#e8b184', '#cf8f5c', '#9c6038', '#62391d'],
  hairColor: ['#24201e', '#4f3020', '#8a5a2e', '#d9a95c', '#f0dfa1', '#b8392d', '#9097a1', '#3b5bdb'],
  shirt: ['#3f74ea', '#e8463a', '#3fb27f', '#f2a91c', '#8e5bd8', '#2a3142', '#ff8fb3', '#f4f4f2'],
  face: 3, hair: 8, brows: 4, eyes: 6, nose: 3, mouth: 6, glasses: 4, hat: 3,
};
const AVATAR_DEFAULT = { face: 0, skin: 1, hair: 0, hairColor: 1, brows: 0, eyes: 0, nose: 0, mouth: 0, glasses: 0, hat: 0, shirt: 0 };
function avatarOf(a){ const o = Object.assign({}, AVATAR_DEFAULT); if (a) for (const k in o) if (Number.isInteger(a[k]) && a[k] >= 0) o[k] = a[k]; return o; }
function shade(hex, f){ const n = parseInt(hex.slice(1), 16), c = (v) => Math.max(0, Math.min(255, Math.round(v * f))); return 'rgb(' + c(n >> 16) + ',' + c((n >> 8) & 255) + ',' + c(n & 255) + ')'; }
const pickc = (arr, i) => arr[i % arr.length];

/* the face is painted on a canvas wrapped round the head; the front of the head is u = 0.25 of the texture */
function paintFace(g, W, H, a, blink){
  const skin = pickc(AV.skin, a.skin), hc = pickc(AV.hairColor, a.hairColor);
  g.fillStyle = skin; g.fillRect(0, 0, W, H);
  const fx = W * 0.25, u = W / 1024;   /* face centre x, and one unit at 1024 wide */
  g.lineCap = 'round'; g.lineJoin = 'round';
  /* cheeks */
  g.fillStyle = 'rgba(244,120,110,.22)';
  [-1, 1].forEach((d) => { g.beginPath(); g.ellipse(fx + d * 74 * u, 300 * u, 26 * u, 15 * u, 0, 0, Math.PI * 2); g.fill(); });
  /* brows */
  g.strokeStyle = shade(hc, 0.95); g.fillStyle = shade(hc, 0.95);
  [-1, 1].forEach((d) => {
    const x0 = fx + d * 22 * u, x1 = fx + d * 70 * u, y = 196 * u;
    g.lineWidth = (a.brows === 2 ? 11 : a.brows === 3 ? 4 : 7) * u;
    g.beginPath(); g.moveTo(x0, y + (a.brows === 3 ? -6 : 0) * u);
    if (a.brows === 1) g.quadraticCurveTo((x0 + x1) / 2, y - 14 * u, x1, y + 2 * u);
    else g.lineTo(x1, y - (a.brows === 3 ? 12 : 3) * u);
    g.stroke();
  });
  /* eyes */
  [-1, 1].forEach((d) => {
    const x = fx + d * 46 * u, y = 244 * u;
    g.fillStyle = '#231d1b'; g.strokeStyle = '#231d1b'; g.lineWidth = 6 * u;
    if (blink || a.eyes === 2){ g.beginPath(); g.arc(x, y + (blink ? 0 : 8) * u, 14 * u, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); return; }
    if (a.eyes === 0){ g.beginPath(); g.ellipse(x, y, 10 * u, 15 * u, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x + 3 * u, y - 5 * u, 3.6 * u, 0, Math.PI * 2); g.fill(); }
    if (a.eyes === 1){ g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x, y, 17 * u, 15 * u, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#5a3a22'; g.beginPath(); g.arc(x + 2 * u, y + 1 * u, 9 * u, 0, Math.PI * 2); g.fill(); g.fillStyle = '#16100e'; g.beginPath(); g.arc(x + 2 * u, y + 1 * u, 5 * u, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x + 5 * u, y - 3 * u, 2.4 * u, 0, Math.PI * 2); g.fill(); }
    if (a.eyes === 3){ g.beginPath(); g.arc(x, y, 6 * u, 0, Math.PI * 2); g.fill(); }
    if (a.eyes === 4){ g.beginPath(); g.ellipse(x, y, 13 * u, 11 * u, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(x + d * 10 * u, y - 8 * u); g.lineTo(x + d * 19 * u, y - 14 * u); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x + 4 * u, y - 4 * u, 3 * u, 0, Math.PI * 2); g.fill(); }
    if (a.eyes === 5){ g.beginPath(); g.ellipse(x, y + 3 * u, 11 * u, 9 * u, 0, 0, Math.PI); g.fill(); g.beginPath(); g.moveTo(x - 14 * u, y + 2 * u); g.lineTo(x + 14 * u, y + 2 * u); g.stroke(); }
  });
  /* nose */
  g.strokeStyle = shade(skin, 0.72); g.fillStyle = shade(skin, 0.86); g.lineWidth = 5 * u;
  if (a.nose === 0){ g.beginPath(); g.arc(fx, 282 * u, 9 * u, Math.PI * 0.15, Math.PI * 0.85); g.stroke(); }
  if (a.nose === 1){ g.beginPath(); g.ellipse(fx, 284 * u, 13 * u, 9 * u, 0, 0, Math.PI * 2); g.fill(); }
  if (a.nose === 2){ g.beginPath(); g.moveTo(fx - 2 * u, 258 * u); g.lineTo(fx + 8 * u, 286 * u); g.lineTo(fx - 6 * u, 290 * u); g.stroke(); }
  /* mouth */
  const my = 330 * u; g.strokeStyle = '#8a3b33'; g.fillStyle = '#8a3b33'; g.lineWidth = 6 * u;
  if (a.mouth === 0){ g.beginPath(); g.arc(fx, my - 16 * u, 26 * u, Math.PI * 0.22, Math.PI * 0.78); g.stroke(); }
  if (a.mouth === 1){ g.beginPath(); g.moveTo(fx - 28 * u, my - 6 * u); g.quadraticCurveTo(fx, my + 34 * u, fx + 28 * u, my - 6 * u); g.closePath(); g.fill(); g.fillStyle = '#fff'; g.fillRect(fx - 20 * u, my - 6 * u, 40 * u, 7 * u); }
  if (a.mouth === 2){ g.beginPath(); g.moveTo(fx - 18 * u, my); g.lineTo(fx + 18 * u, my); g.stroke(); }
  if (a.mouth === 3){ g.beginPath(); g.ellipse(fx, my, 9 * u, 12 * u, 0, 0, Math.PI * 2); g.fill(); }
  if (a.mouth === 4){ g.beginPath(); g.moveTo(fx - 20 * u, my + 2 * u); g.quadraticCurveTo(fx + 6 * u, my + 10 * u, fx + 24 * u, my - 10 * u); g.stroke(); }
  if (a.mouth === 5){ g.beginPath(); g.moveTo(fx - 30 * u, my - 8 * u); g.lineTo(fx + 30 * u, my - 8 * u); g.quadraticCurveTo(fx + 28 * u, my + 30 * u, fx, my + 30 * u); g.quadraticCurveTo(fx - 28 * u, my + 30 * u, fx - 30 * u, my - 8 * u); g.fill(); g.fillStyle = '#e66a6a'; g.beginPath(); g.ellipse(fx, my + 18 * u, 14 * u, 8 * u, 0, 0, Math.PI * 2); g.fill(); }
}

const avScene = new THREE.Scene();
avScene.environment = scene.environment;
avScene.add(new THREE.HemisphereLight(0xffffff, 0xcfd8e6, 1.1));
const avKey = new THREE.DirectionalLight(0xffffff, 1.5); avKey.position.set(-2.5, 4, 5); avScene.add(avKey);
const avRim = new THREE.DirectionalLight(0xbfdcff, 0.8); avRim.position.set(3, 2, -3); avScene.add(avRim);
const avCam = new THREE.PerspectiveCamera(26, 1, 3, 30);
const faceCanvas = document.createElement('canvas'); faceCanvas.width = 1024; faceCanvas.height = 512;
const faceTex = new THREE.CanvasTexture(faceCanvas); faceTex.colorSpace = THREE.SRGBColorSpace; faceTex.anisotropy = 8;
let avRig = null, avLook = null;

function mat(hex, rough){ return new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: rough == null ? 0.6 : rough, envMapIntensity: 0.6 }); }
/* builds the character for a look; the face canvas is shared and repainted */
function buildAvatar(raw, canvas, tex){
  const a = avatarOf(raw), grp = new THREE.Group();
  const skin = pickc(AV.skin, a.skin), hc = pickc(AV.hairColor, a.hairColor), sh = pickc(AV.shirt, a.shirt);
  const fs = [[1, 1.02, 1], [0.92, 1.12, 0.95], [1.1, 0.95, 1]][a.face % 3];
  const head = new THREE.Group(); grp.add(head);
  paintFace(canvas.getContext('2d'), canvas.width, canvas.height, a, false); tex.needsUpdate = true;
  const unit = new THREE.Group(); unit.scale.set(...fs); head.add(unit);   /* hair, hats and glasses stretch with the head */
  const skull = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 40), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, envMapIntensity: 0.5 }));
  unit.add(skull);
  const skinM = mat(skin, 0.55);
  [-1, 1].forEach((d) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), skinM); e.scale.set(0.8, 1.15, 0.6); e.position.set(d * 0.98, -0.02, 0.02); unit.add(e); });
  const hairM = mat(hc, 0.62);
  const cap = (r, theta, tilt) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 24, 0, Math.PI * 2, 0, theta), hairM); m.rotation.x = -(tilt + 0.12); return m; };
  if (a.hat === 0){
    if (a.hair === 0) unit.add(cap(1.08, 1.78, 0.62));
    if (a.hair === 1){ unit.add(cap(1.08, 1.62, 0.62)); for (let i = 0; i < 9; i++){ const c = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.55, 12), hairM); const t = -1 + (i / 8) * 2; c.position.set(t * 0.7, 0.95 - Math.abs(t) * 0.25, -0.1 + (i % 2) * 0.25); c.rotation.z = -t * 0.6; c.rotation.x = -0.25; unit.add(c); } }
    if (a.hair === 2){ unit.add(cap(1.08, 1.85, 0.55)); const back = new THREE.Mesh(new THREE.CapsuleGeometry(0.85, 1.0, 8, 24), hairM); back.scale.set(1.12, 1, 0.55); back.position.set(0, -0.55, -0.42); unit.add(back); }
    if (a.hair === 3){ unit.add(cap(1.08, 1.78, 0.62)); const bun = new THREE.Mesh(new THREE.SphereGeometry(0.38, 24, 16), hairM); bun.position.set(0, 1.05, -0.35); unit.add(bun); }
    if (a.hair === 4){ for (let i = 0; i < 46; i++){ const phi = Math.acos(1 - (i + 0.5) / 46 * 1.15), th = i * 2.399; const v = new THREE.Vector3(Math.sin(phi) * Math.cos(th), Math.cos(phi), Math.sin(phi) * Math.sin(th)); if (v.z > 0.55 && v.y < 0.75) continue; const b = new THREE.Mesh(new THREE.SphereGeometry(0.27, 16, 12), hairM); b.position.set(v.x * 1.04, v.y * 1.04, v.z * 1.04); unit.add(b); } }
    if (a.hair === 6){ unit.add(cap(1.08, 1.78, 0.48)); const fr = new THREE.Mesh(new THREE.SphereGeometry(0.62, 32, 20), hairM); fr.scale.set(1.05, 0.38, 0.5); fr.position.set(-0.28, 0.6, 0.66); fr.rotation.z = -0.4; unit.add(fr); }
    if (a.hair === 7){ const m = cap(1.045, 1.72, 0.66); unit.add(m); }
  } else {
    const hatM = mat(shade(sh, 0.88), 0.7);   /* the hat matches the shirt */
    if (a.hair === 2){ const back = new THREE.Mesh(new THREE.CapsuleGeometry(0.85, 1.0, 8, 24), hairM); back.scale.set(1.12, 1, 0.55); back.position.set(0, -0.55, -0.42); unit.add(back); }
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.13, 48, 24, 0, Math.PI * 2, 0, a.hat === 1 ? 1.25 : 1.4), hatM); dome.rotation.x = -0.3; unit.add(dome);
    if (a.hat === 1){ const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.06, 32, 1, false, -Math.PI / 2, Math.PI), hatM); brim.position.set(0, 0.5, 0.72); brim.rotation.x = 0.32; brim.scale.set(1, 1.6, 1.15); unit.add(brim); }
    else { const band = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.09, 12, 48), hatM); band.rotation.x = Math.PI / 2 - 0.3; band.position.y = 0.35; unit.add(band); const pom = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), mat('#f4f4f2', 0.9)); pom.position.set(0, 1.12, -0.3); unit.add(pom); }
  }
  if (a.glasses){
    const gm = a.glasses === 3 ? mat('#15171d', 0.2) : mat('#1d1d22', 0.35);
    [-1, 1].forEach((d) => {
      const x = d * 0.28, y = 0.07, z = 1.1;
      const ring = a.glasses === 2 ? new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 8, 4), gm) : new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.028, 10, 32), gm);
      if (a.glasses === 2) ring.rotation.z = Math.PI / 4;
      ring.position.set(x, y, z); ring.rotation.y = d * -0.25; unit.add(ring);
      if (a.glasses === 3){ const lens = new THREE.Mesh(new THREE.CircleGeometry(0.19, 24), new THREE.MeshStandardMaterial({ color: 0x14161c, roughness: 0.1, metalness: 0.3 })); lens.position.set(x, y, z + 0.005); lens.rotation.y = d * -0.25; unit.add(lens); }
    });
    [-1, 1].forEach((d) => { const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.75, 6), gm); arm.rotation.x = Math.PI / 2; arm.position.set(d * 0.5, 0.08, 0.72); arm.rotation.y = d * 0.55; unit.add(arm); });
    const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8), gm); bridge.rotation.z = Math.PI / 2; bridge.position.set(0, 0.1, 1.12); unit.add(bridge);
  }
  /* body: small, under the big head */
  const shirtM = mat(sh, 0.75), pantsM = mat('#34405a', 0.8), shoeM = mat('#f4f4f2', 0.6);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.3, 16), skinM); neck.position.y = -1.08; grp.add(neck);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.45, 8, 24), shirtM); torso.scale.set(1.15, 1, 0.85); torso.position.y = -1.62; grp.add(torso);
  [-1, 1].forEach((d) => {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.5, 6, 12), shirtM); arm.position.set(d * 0.6, -1.66, 0); arm.rotation.z = d * 0.32; grp.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), skinM); hand.position.set(d * 0.73, -2.02, 0.02); grp.add(hand);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.4, 6, 12), pantsM); leg.position.set(d * 0.2, -2.35, 0); grp.add(leg);
    const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 12), shoeM); shoe.scale.set(1, 0.6, 1.4); shoe.position.set(d * 0.2, -2.68, 0.08); grp.add(shoe);
  });
  grp.userData = { head, look: a };
  return grp;
}
function disposeTree(o){ o.traverse((m) => { if (m.geometry) m.geometry.dispose(); if (m.material && m.material.map !== faceTex && m.material.map !== snapFaceTex) m.material.dispose(); }); }

/* framings: whole little body, or just the head */
function frame(cam, mode, aspect){
  cam.aspect = aspect;
  if (mode === 'face'){ cam.fov = 26; cam.position.set(0, 0.05, 5.6); cam.lookAt(0, 0.0, 0); }
  else if (mode === 'bust'){ cam.fov = 26; cam.position.set(0, -0.35, 7.4); cam.lookAt(0, -0.35, 0); }
  else { cam.fov = 26; cam.position.set(0, -0.75, 10.5); cam.lookAt(0, -0.8, 0); }
  cam.updateProjectionMatrix();
}

/* small pictures of a look, for the menu tiles and the ranking (cached) */
const snapRT = new THREE.WebGLRenderTarget(256, 256, { samples: 4 }); snapRT.texture.colorSpace = THREE.SRGBColorSpace;
const snapFaceCanvas = document.createElement('canvas'); snapFaceCanvas.width = 1024; snapFaceCanvas.height = 512;
const snapFaceTex = new THREE.CanvasTexture(snapFaceCanvas); snapFaceTex.colorSpace = THREE.SRGBColorSpace;
const snapCam = new THREE.PerspectiveCamera(26, 1, 3, 30), snapCache = new Map(), snapBuf = new Uint8Array(256 * 256 * 4);
function avatarSnap(raw, mode){
  const key = mode + JSON.stringify(avatarOf(raw));
  if (snapCache.has(key)) return snapCache.get(key);
  const rig = buildAvatar(raw, snapFaceCanvas, snapFaceTex);
  if (avRig) avRig.visible = false;
  avScene.add(rig); frame(snapCam, mode, 1);
  const bg = avScene.background; avScene.background = null;
  renderer.setRenderTarget(snapRT); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(avScene, snapCam); renderer.setRenderTarget(null);
  renderer.readRenderTargetPixels(snapRT, 0, 0, 256, 256, snapBuf);
  avScene.background = bg; avScene.remove(rig); disposeTree(rig); if (avRig) avRig.visible = true;
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const img = c.getContext('2d').createImageData(256, 256);
  for (let y = 0; y < 256; y++) img.data.set(snapBuf.subarray((255 - y) * 1024, (256 - y) * 1024), y * 1024);   /* the GPU's rows run bottom up */
  c.getContext('2d').putImageData(img, 0, 0);
  if (snapCache.size > 400) snapCache.clear();
  snapCache.set(key, c);
  return c;
}
/* the old 2D call: now draws a snapshot of the 3D character, s wide, centred at (cx, cy) */
function drawAvatar(g, cx, cy, s, raw, mode){
  g.drawImage(avatarSnap(raw, mode || 'bust'), cx - s / 2, cy - s / 2, s, s);
}

const FONT = '"Arial Rounded MT Bold", "Nunito", "Helvetica Neue", Arial, sans-serif';
const APPS = [
  { id: 'maps', name: 'Maps', on: true }, { id: 'ranks', name: 'Rankings', on: true }, { id: 'settings', name: 'Settings', on: true },
  { id: 'avatar', name: 'Avatar', on: true }, { id: 'music', name: 'Music' }, { id: 'mail', name: 'Mail' }, { id: 'notes', name: 'Notes' }, { id: 'web', name: 'Browser' },
];
let sel = 0;   /* which app the menu has selected; the d-pad moves it */

function backdrop(g, w, h){
  const grd = g.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, '#f3f5fa'); grd.addColorStop(1, '#e1e6ef');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  const s = h / 4.6, gap = s * 0.18;
  g.fillStyle = 'rgba(255,255,255,.42)'; g.strokeStyle = 'rgba(190,198,215,.18)'; g.lineWidth = 2;
  for (let y = -s * 0.4; y < h; y += s + gap) for (let x = -s * 0.3; x < w; x += s + gap){ g.beginPath(); g.roundRect(x, y, s, s, s * 0.24); g.fill(); g.stroke(); }
}
function vignette(g, w, h){
  const v = g.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, w * 0.72);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(40,50,80,.09)');
  g.fillStyle = v; g.fillRect(0, 0, w, h);
}
function shadowed(g, fn, blur, dy){ g.save(); g.shadowColor = 'rgba(40,55,90,.28)'; g.shadowBlur = blur; g.shadowOffsetY = dy; fn(); g.restore(); }

/* a little map, used for the icon and, bigger, for the banner */
function drawMap(g, x, y, w, h, r, detail){
  g.save(); g.beginPath(); g.roundRect(x, y, w, h, r); g.clip();
  g.fillStyle = '#eef0e3'; g.fillRect(x, y, w, h);
  g.fillStyle = '#bfe3a2'; g.beginPath(); g.ellipse(x + w * 0.24, y + h * 0.3, w * 0.2, h * 0.17, -0.3, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(x + w * 0.82, y + h * 0.82, w * 0.16, h * 0.13, 0.4, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#8fc6ef'; g.lineWidth = Math.max(3, w * 0.07); g.lineCap = 'round';
  g.beginPath(); g.moveTo(x - w * 0.05, y + h * 0.66); g.bezierCurveTo(x + w * 0.3, y + h * 0.5, x + w * 0.55, y + h * 0.95, x + w * 1.05, y + h * 0.7); g.stroke();
  g.strokeStyle = '#ffffff'; g.lineWidth = Math.max(2, w * 0.035);
  [[0.05, 0.12, 0.95, 0.42], [0.35, -0.05, 0.62, 1.05], [-0.05, 0.9, 0.7, 0.55], [0.7, -0.05, 0.9, 1.05]].forEach(([a, b2, c, d]) => {
    g.beginPath(); g.moveTo(x + w * a, y + h * b2); g.lineTo(x + w * c, y + h * d); g.stroke();
  });
  if (detail){
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = Math.max(1, w * 0.012);
    for (let i = 0; i < 9; i++){ g.beginPath(); g.moveTo(x + w * (i / 9), y); g.lineTo(x + w * (i / 9 + 0.12), y + h); g.stroke(); }
    g.fillStyle = '#f6c56b'; g.fillRect(x + w * 0.52, y + h * 0.18, w * 0.06, h * 0.08); g.fillRect(x + w * 0.12, y + h * 0.62, w * 0.05, h * 0.07);
  }
  /* the pin */
  const px = x + w * 0.56, py = y + h * 0.46, pr = Math.min(w, h) * 0.13;
  g.fillStyle = '#e8463a'; g.beginPath(); g.arc(px, py - pr, pr, Math.PI, 0); g.lineTo(px, py + pr * 0.9); g.closePath(); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(px, py - pr, pr * 0.42, 0, Math.PI * 2); g.fill();
  g.restore();
}

/* one app icon: a white rounded tile with a simple drawing of its own */
function drawIcon(g, app, x, y, s){
  const r = s * 0.2;
  shadowed(g, () => { g.fillStyle = '#ffffff'; g.beginPath(); g.roundRect(x, y, s, s, r); g.fill(); }, s * 0.12, s * 0.04);
  const p = s * 0.14, ix = x + p, iy = y + p, is = s - 2 * p, ir = r * 0.7;
  const tile = (c1, c2) => { const gr = g.createLinearGradient(0, iy, 0, iy + is); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.beginPath(); g.roundRect(ix, iy, is, is, ir); g.fill(); };
  const cx = ix + is / 2, cy = iy + is / 2, u = is / 10;
  g.lineCap = 'round'; g.lineJoin = 'round';
  switch (app.id){
    case 'maps': drawMap(g, ix, iy, is, is, ir, false); break;
    case 'camera':
      tile('#ffb04a', '#f07e1e'); g.fillStyle = '#fff';
      g.beginPath(); g.roundRect(cx - 3.4 * u, cy - 2 * u, 6.8 * u, 4.8 * u, u); g.fill(); g.fillRect(cx - 1.2 * u, cy - 3 * u, 2.4 * u, 1.4 * u);
      g.fillStyle = '#f07e1e'; g.beginPath(); g.arc(cx, cy + 0.4 * u, 1.6 * u, 0, Math.PI * 2); g.fill(); break;
    case 'music':
      tile('#5b8dff', '#2f5fe0'); g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.lineWidth = u * 0.9;
      g.beginPath(); g.moveTo(cx - 1.4 * u, cy + 2.2 * u); g.lineTo(cx - 1.4 * u, cy - 3 * u); g.lineTo(cx + 2.8 * u, cy - 3.8 * u); g.lineTo(cx + 2.8 * u, cy + 1.4 * u); g.stroke();
      g.beginPath(); g.ellipse(cx - 2.5 * u, cy + 2.4 * u, 1.4 * u, 1.1 * u, -0.4, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(cx + 1.7 * u, cy + 1.6 * u, 1.4 * u, 1.1 * u, -0.4, 0, Math.PI * 2); g.fill(); break;
    case 'settings':
      tile('#c9ced8', '#9aa2b1'); g.fillStyle = '#fff';
      for (let i = 0; i < 8; i++){ g.save(); g.translate(cx, cy); g.rotate(i * Math.PI / 4); g.fillRect(-0.8 * u, -3.6 * u, 1.6 * u, 2 * u); g.restore(); }
      g.beginPath(); g.arc(cx, cy, 2.6 * u, 0, Math.PI * 2); g.fill(); g.fillStyle = '#9aa2b1'; g.beginPath(); g.arc(cx, cy, 1.1 * u, 0, Math.PI * 2); g.fill(); break;
    case 'mail':
      tile('#7cc6ff', '#3d97e6'); g.fillStyle = '#fff'; g.beginPath(); g.roundRect(cx - 3.4 * u, cy - 2.3 * u, 6.8 * u, 4.6 * u, 0.6 * u); g.fill();
      g.strokeStyle = '#3d97e6'; g.lineWidth = u * 0.6; g.beginPath(); g.moveTo(cx - 3 * u, cy - 1.9 * u); g.lineTo(cx, cy + 0.4 * u); g.lineTo(cx + 3 * u, cy - 1.9 * u); g.stroke(); break;
    case 'notes':
      tile('#ffe27a', '#f5c531'); g.fillStyle = '#fffdf2'; g.beginPath(); g.roundRect(cx - 3 * u, cy - 3.4 * u, 6 * u, 6.8 * u, 0.5 * u); g.fill();
      g.strokeStyle = '#e0b23a'; g.lineWidth = u * 0.4; for (let i = 0; i < 4; i++){ g.beginPath(); g.moveTo(cx - 2 * u, cy - 1.8 * u + i * 1.4 * u); g.lineTo(cx + 2 * u, cy - 1.8 * u + i * 1.4 * u); g.stroke(); } break;
    case 'web':
      tile('#5fd0c5', '#24a59a'); g.strokeStyle = '#fff'; g.lineWidth = u * 0.6;
      g.beginPath(); g.arc(cx, cy, 3.2 * u, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.ellipse(cx, cy, 1.4 * u, 3.2 * u, 0, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(cx - 3.2 * u, cy); g.lineTo(cx + 3.2 * u, cy); g.stroke(); break;
    case 'avatar':
      tile('#9fe0ff', '#4fb3ee'); g.save(); g.beginPath(); g.roundRect(ix, iy, is, is, ir); g.clip(); drawAvatar(g, cx, cy, is * 1.05, AVATAR_DEFAULT, 'face'); g.restore(); break;
    case 'ranks':   /* a classic racing cup */
      tile('#ffd866', '#f2a91c'); g.fillStyle = '#fff';
      g.beginPath(); g.moveTo(cx - 2.6 * u, cy - 3.4 * u); g.lineTo(cx + 2.6 * u, cy - 3.4 * u); g.bezierCurveTo(cx + 2.6 * u, cy + 0.6 * u, cx + 1.2 * u, cy + 1.4 * u, cx, cy + 1.4 * u); g.bezierCurveTo(cx - 1.2 * u, cy + 1.4 * u, cx - 2.6 * u, cy + 0.6 * u, cx - 2.6 * u, cy - 3.4 * u); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = u * 0.7;
      g.beginPath(); g.arc(cx - 2.7 * u, cy - 1.8 * u, 1.3 * u, Math.PI * 0.5, Math.PI * 1.5); g.stroke();
      g.beginPath(); g.arc(cx + 2.7 * u, cy - 1.8 * u, 1.3 * u, -Math.PI * 0.5, Math.PI * 0.5); g.stroke();
      g.fillRect(cx - 0.5 * u, cy + 1.2 * u, u, 1.4 * u);
      g.beginPath(); g.roundRect(cx - 2 * u, cy + 2.5 * u, 4 * u, 1.2 * u, 0.3 * u); g.fill();
      g.fillStyle = '#f2a91c'; g.font = '700 ' + (2.4 * u) + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('1', cx, cy - 1.4 * u); break;
    case 'photos':
      tile('#ff8fb3', '#e9578a'); g.fillStyle = '#fff'; g.beginPath(); g.roundRect(cx - 3.2 * u, cy - 2.6 * u, 6.4 * u, 5.2 * u, 0.6 * u); g.fill();
      g.fillStyle = '#e9578a'; g.beginPath(); g.moveTo(cx - 2.6 * u, cy + 2 * u); g.lineTo(cx - 0.6 * u, cy - 0.6 * u); g.lineTo(cx + 0.6 * u, cy + 0.8 * u); g.lineTo(cx + 1.4 * u, cy); g.lineTo(cx + 2.6 * u, cy + 2 * u); g.closePath(); g.fill();
      g.beginPath(); g.arc(cx + 1.5 * u, cy - 1.3 * u, 0.7 * u, 0, Math.PI * 2); g.fill(); break;
  }
  if (!app.on){ g.fillStyle = 'rgba(243,245,250,.55)'; g.beginPath(); g.roundRect(x, y, s, s, r); g.fill(); }   /* not switched on yet */
}
/* green corner brackets around the selected app */
function brackets(g, x, y, s){
  const o = s * 0.1, L = s * 0.24, k = [[x - o, y - o, 1, 1], [x + s + o, y - o, -1, 1], [x - o, y + s + o, 1, -1], [x + s + o, y + s + o, -1, -1]];
  g.strokeStyle = '#3fd27f'; g.lineWidth = s * 0.07; g.lineCap = 'round'; g.lineJoin = 'round';
  shadowed(g, () => k.forEach(([px, py, dx, dy]) => { g.beginPath(); g.moveTo(px + dx * L, py); g.lineTo(px, py); g.lineTo(px, py + dy * L); g.stroke(); }), s * 0.12, 0);
}

function drawBottom(g, w, h){
  backdrop(g, w, h);
  /* toolbar of small shortcuts along the top */
  const tb = h * 0.115;
  shadowed(g, () => { g.fillStyle = 'rgba(255,255,255,.94)'; g.fillRect(0, 0, w, tb); }, 10, 2);
  const glyphs = ['#9aa7bd', '#f2b632', '#f29b3a', '#4fc3a1', '#4f8ff2', '#7bc75b', '#b0b7c6'];
  glyphs.forEach((c, i) => {
    const gx = w * 0.09 + i * w * 0.12, gy = tb / 2;
    g.fillStyle = c; g.beginPath(); g.roundRect(gx - tb * 0.3, gy - tb * 0.3, tb * 0.6, tb * 0.6, tb * 0.16); g.fill();
    g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(gx, gy, tb * 0.12, 0, Math.PI * 2); g.fill();
  });
  /* the grid of apps: 4 across, 2 down, with the next page peeking at the edges */
  const s = h * 0.27, gap = s * 0.2, cols = 4, gridW = cols * s + (cols - 1) * gap;
  const x0 = (w - gridW) / 2, y0 = tb + h * 0.075;
  [[-1, 0], [-1, 1], [cols, 0], [cols, 1]].forEach(([c, r2]) => {   /* half-hidden tiles of the next pages */
    g.globalAlpha = 0.55; shadowed(g, () => { g.fillStyle = '#fff'; g.beginPath(); g.roundRect(x0 + c * (s + gap), y0 + r2 * (s + gap), s, s, s * 0.2); g.fill(); }, s * 0.1, s * 0.03); g.globalAlpha = 1;
  });
  APPS.forEach((app, i) => {
    const c = i % cols, r2 = Math.floor(i / cols), x = x0 + c * (s + gap), y = y0 + r2 * (s + gap);
    drawIcon(g, app, x, y, s);
    if (i === sel) brackets(g, x, y, s);
  });
  /* the button at the bottom */
  const bh = h * 0.12, by = h - bh - h * 0.02;
  shadowed(g, () => { const gr = g.createLinearGradient(0, by, 0, by + bh); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#e4e8ef'); g.fillStyle = gr; g.beginPath(); g.roundRect(w * 0.04, by, w * 0.92, bh, bh * 0.35); g.fill(); }, 8, 2);
  g.fillStyle = '#4a5160'; g.font = '600 ' + Math.round(bh * 0.5) + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('Open', w / 2, by + bh / 2 + 2);
  vignette(g, w, h);
}

function drawTop(g, w, h){
  backdrop(g, w, h);
  /* status bar: signal, mail, date and time in london, battery */
  const sb = h * 0.085;
  g.fillStyle = 'rgba(255,255,255,.92)'; g.fillRect(0, 0, w, sb);
  g.fillStyle = 'rgba(120,130,150,.3)'; g.fillRect(0, sb, w, 2);
  const u = sb / 10;
  g.fillStyle = '#5c8fe6'; for (let i = 0; i < 4; i++) g.fillRect(w * 0.02 + i * 2.2 * u, sb * 0.75 - (i + 1) * 1.6 * u, 1.5 * u, (i + 1) * 1.6 * u);
  const now = new Date(), fmt = (o) => new Intl.DateTimeFormat('en-GB', Object.assign({ timeZone: 'Europe/London' }, o)).format(now);
  g.fillStyle = '#4a5160'; g.font = '600 ' + Math.round(sb * 0.58) + 'px ' + FONT; g.textBaseline = 'middle'; g.textAlign = 'right';
  const me = store.user();
  if (me){ g.textAlign = 'left'; g.fillText(me.name + '  ·  ' + me.points + ' pts', w * 0.02 + 10 * u, sb / 2 + 1); g.textAlign = 'right'; }
  g.fillText(fmt({ day: '2-digit', month: '2-digit' }) + ' (' + fmt({ weekday: 'short' }) + ')   ' + fmt({ hour: '2-digit', minute: '2-digit', hour12: false }), w * 0.9, sb / 2 + 1);
  g.strokeStyle = '#4a5160'; g.lineWidth = u * 0.7; g.strokeRect(w * 0.925, sb * 0.28, w * 0.05, sb * 0.46);
  g.fillStyle = '#5cc77b'; g.fillRect(w * 0.929, sb * 0.34, w * 0.035, sb * 0.34); g.fillStyle = '#4a5160'; g.fillRect(w * 0.976, sb * 0.4, u * 0.8, sb * 0.2);
  /* the selected app's banner */
  const bw = w * 0.62, bh = h * 0.66, bx = (w - bw) / 2, by = sb + (h - sb - bh) / 2 - h * 0.02;
  shadowed(g, () => { g.fillStyle = '#fff'; g.beginPath(); g.roundRect(bx - h * 0.02, by - h * 0.02, bw + h * 0.04, bh + h * 0.04, h * 0.07); g.fill(); }, h * 0.06, h * 0.02);
  const app = APPS[sel];
  if (app.id === 'maps') drawMap(g, bx, by, bw, bh, h * 0.055, true);
  else {
    g.fillStyle = '#f6f8fc'; g.beginPath(); g.roundRect(bx, by, bw, bh, h * 0.055); g.fill();
    drawIcon(g, app, bx + bw / 2 - bh * 0.3, by + bh * 0.12, bh * 0.6);
  }
  /* its name on a pill */
  const label = app.name, fs = Math.round(h * 0.08); g.font = '700 ' + fs + 'px ' + FONT;
  const lw = g.measureText(label).width + fs * 1.4, lx = bx + bw * 0.06, ly = by + bh - fs * 1.9;
  shadowed(g, () => { g.fillStyle = 'rgba(255,255,255,.96)'; g.beginPath(); g.roundRect(lx, ly, lw, fs * 1.45, fs * 0.72); g.fill(); }, 10, 3);
  g.fillStyle = '#2f6fd8'; g.textAlign = 'left'; g.fillText(label, lx + fs * 0.7, ly + fs * 0.78);
  vignette(g, w, h);
}

/* each screen is a canvas; painters[kind] decides what is on it (the menu now, the game later) */
const screens = {};
const painters = { top: drawTop, bottom: drawBottom };
function screen(wmm, hmm, kind){
  const grp = new THREE.Group(), px = 12;
  const tex = canvasTex(Math.round(wmm * px), Math.round(hmm * px), (g, w, h) => painters[kind](g, w, h));
  const lcd = new THREE.Mesh(new THREE.PlaneGeometry(wmm, hmm), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(wmm, hmm), M.glass);
  glass.position.z = 0.12; glass.raycast = () => {};   /* clicks go through the glass to the screen */
  grp.add(lcd, glass);
  lcd.userData.kind = kind;
  screens[kind] = { tex, lcd };
  return grp;
}
function paint(kind){
  const s = screens[kind]; if (!s) return;
  const c = s.tex.image, g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
  painters[kind](g, c.width, c.height); s.tex.needsUpdate = true;
}
/* the clock on the top screen keeps time */
setInterval(() => paint('top'), 30000);
const tickers = [];
const BUTTONS = [];   /* the physical buttons you can press: d-pad, A B X Y, select, home, start */

/* =========================================================
   bottom half: built lying in XY (y = 0 at the hinge edge, y < 0 toward you), face at z = TB,
   then tipped flat onto the table
   ========================================================= */
const bottom = new THREE.Group();
bottom.rotation.x = -Math.PI / 2;
scene.add(bottom);
{
  const B = bottom, Z = TB;
  B.add(at(slab(W, D, RC, TB, 3.2, M.shell), 0, -D / 2, 0));
  /* matte inner plate, a hair above the shell */
  B.add(at(slab(W - 5, D - 12, RC - 2, 0.25, 0.1, M.inner), 0, -D / 2 - 3.5, Z - 0.22));

  /* touch screen in a gloss-black frame */
  B.add(at(slab(89, 67.5, 2.6, 0.6, 0.2, M.gloss), 0, -45.5, Z));
  B.add(at(screen(84, 63, 'bottom'), 0, -45.5, Z + 0.95));

  /* select / home / start strip under the screen */
  B.add(at(slab(82, 6.6, 2.2, 0.5, 0.15, M.ring), 0, -86.3, Z));
  [['SELECT', -26.6], ['HOME', 0], ['START', 26.6]].forEach(([t, x]) => {
    const k = new THREE.Mesh(new RoundedBoxGeometry(25, 4.8, 1.4, 3, 0.5), M.key);
    B.add(at(k, x, -86.3, Z + 0.7)); k.castShadow = true; k.userData.btn = t.toLowerCase(); BUTTONS.push(k);
    B.add(at(print(t === 'HOME' ? '⌂  HOME' : t, 22, 3.2, { size: 0.66, spacing: 2, color: 'rgba(170,170,166,.9)' }), x, -86.3, Z + 1.42));
  });

  /* circle pad: grey cap in a dark ring */
  B.add(at(disc(11.4, 1.2, M.ring), -61.5, -27, Z + 0.4));
  const cap = disc(8.7, 2.6, M.pad); B.add(at(cap, -61.5, -27, Z + 1.5));
  const dimple = new THREE.Mesh(new THREE.TorusGeometry(6.5, 0.32, 8, 48), M.pad); B.add(at(dimple, -61.5, -27, Z + 2.8));

  /* d-pad */
  B.add(at(disc(10.8, 0.5, M.ring), -61.5, -61, Z + 0.1));
  const armA = new THREE.Mesh(new RoundedBoxGeometry(18.4, 5.9, 2.1, 3, 0.8), M.key);
  const armB = new THREE.Mesh(new RoundedBoxGeometry(5.9, 18.4, 2.1, 3, 0.8), M.key);
  [armA, armB].forEach((a) => { a.castShadow = true; B.add(at(a, -61.5, -61, Z + 1.0)); a.userData.btn = 'dpad'; BUTTONS.push(a); });
  [[0, 5.9], [0, -5.9], [-5.9, 0], [5.9, 0]].forEach(([dx, dy]) => {   /* little raised lines on each arm */
    const l = new THREE.Mesh(new THREE.BoxGeometry(dx ? 2.9 : 0.6, dy ? 2.9 : 0.6, 0.25), M.ring);
    B.add(at(l, -61.5 + dx, -61 + dy, Z + 2.1));
  });

  /* A B X Y */
  const cx = 61.5, cy = -29.5, o = 8.9;
  [['X', 0, o], ['B', 0, -o], ['Y', -o, 0], ['A', o, 0]].forEach(([t, dx, dy]) => {
    B.add(at(disc(5.0, 0.5, M.ring), cx + dx, cy + dy, Z + 0.1));
    const key = disc(4.3, 2.1, M.key); key.userData.btn = t.toLowerCase(); BUTTONS.push(key); B.add(at(key, cx + dx, cy + dy, Z + 1.0));
    const face = new THREE.Mesh(new THREE.CircleGeometry(3.8, 40), new THREE.MeshBasicMaterial({
      transparent: true, depthWrite: false,
      map: canvasTex(128, 128, (g) => {
        g.strokeStyle = 'rgba(210,210,205,.55)'; g.lineWidth = 4; g.beginPath(); g.arc(64, 64, 58, 0, Math.PI * 2); g.stroke();
        g.fillStyle = 'rgba(225,225,220,.92)'; g.font = '500 64px "Helvetica Neue", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, 64, 68);
      }) }));
    B.add(at(face, cx + dx, cy + dy, Z + 2.07));
  });

  /* power button and its ring, bottom right */
  B.add(at(disc(3.9, 0.4, M.ring), 62, -71, Z + 0.1));
  B.add(at(disc(3.0, 1.0, M.key), 62, -71, Z + 0.4));
  B.add(at(print('⏻', 4.4, 4.4, { size: 0.7, color: 'rgba(170,170,166,.7)' }), 62, -71, Z + 0.92));

  /* status leds on the front edge */
  [50, 56, 62].forEach((x, i) => {
    const l = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.6, 1.2), i === 1 ? M.led : M.hole);
    B.add(at(l, x, -D + 0.05, TB * 0.45));
  });

  /* shoulder buttons poking out at the back corners */
  [-1, 1].forEach((s) => {
    const sh = new THREE.Mesh(new RoundedBoxGeometry(30, 7, 6.5, 3, 2.4), M.hinge);
    sh.castShadow = true; B.add(at(sh, s * (W / 2 - 19), 1.2, TB * 0.5));
  });

  /* hinge knuckles on both ends */
  [-1, 1].forEach((s) => {
    const k = new THREE.Mesh(new THREE.CylinderGeometry(5.9, 5.9, 24, 40), M.hinge);
    k.rotation.z = Math.PI / 2; k.castShadow = true;
    B.add(at(k, s * (W / 2 - 15), -HZ, HY));
    const web = new THREE.Mesh(new RoundedBoxGeometry(24, 9, 6, 2, 1.5), M.hinge);
    B.add(at(web, s * (W / 2 - 15), -HZ + 0.5, HY - 3.5));
  });
}

/* =========================================================
   top half: pivots on the hinge. built standing up (y = up from the hinge), face toward +z
   ========================================================= */
const hinge = new THREE.Group();
hinge.position.set(0, HY, HZ);
scene.add(hinge);
const top = new THREE.Group();
hinge.add(top);
{
  const T = top, Z = TT / 2, H = D - 2;           /* face at z = TT/2, shell from y = 2 to y = D */
  const midY = 2 + H / 2 + 4;
  /* middle hinge barrel */
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.6, W - 2 * 27.5, 48), M.hinge);
  barrel.rotation.z = Math.PI / 2; barrel.castShadow = true; T.add(barrel);
  [-1, 1].forEach((s) => {   /* a thin dark seam where the barrel meets the knuckles */
    const seam = new THREE.Mesh(new THREE.CylinderGeometry(5.3, 5.3, 0.6, 40), M.hole);
    seam.rotation.z = Math.PI / 2; T.add(at(seam, s * (W / 2 - 27.2), 0, 0));
  });

  const shell = slab(W, H - 6, RC, TT, 2.8, M.shell);
  T.add(at(shell, 0, midY, -TT / 2));
  T.add(at(slab(W - 5, H - 15, RC - 2, 0.25, 0.1, M.inner), 0, midY + 1.5, Z - 0.22));

  /* the big screen in its gloss frame */
  const sy = 50;
  T.add(at(slab(114, 73, 3, 0.6, 0.2, M.gloss), 0, sy, Z));
  T.add(at(screen(106.5, 64, 'top'), 0, sy, Z + 0.95));

  /* inner camera and the two little sensors either side */
  T.add(at(disc(2.4, 0.6, M.ring), 0, 89.5, Z + 0.2));
  T.add(at(disc(1.5, 0.8, M.gloss), 0, 89.5, Z + 0.35));
  [-46, 46].forEach((x) => T.add(at(disc(1.1, 0.6, M.ring), x, 89.5, Z + 0.2)));

  /* speakers: rings of tiny holes */
  [-1, 1].forEach((s) => {
    const hx = s * 67, hy = sy + 6;
    [[0, 1], [2.1, 6], [4.2, 12]].forEach(([r, n]) => {
      for (let i = 0; i < n; i++){
        const a = (i / n) * Math.PI * 2 + (r > 3 ? 0.26 : 0);
        const h = new THREE.Mesh(new THREE.CircleGeometry(0.55, 14), M.hole);
        T.add(at(h, hx + Math.cos(a) * r, hy + Math.sin(a) * r, Z + 0.08));
      }
    });
  });

  /* depth slider on the right of the screen, with its printed marks */
  T.add(at(slab(2.6, 18, 1.1, 0.4, 0.1, M.hole), 75.2, 36, Z));
  T.add(at(new THREE.Mesh(new RoundedBoxGeometry(3.4, 4.6, 2.4, 2, 0.8), M.slider), 75.2, 42.5, Z + 0.9));
  T.add(at(print('3D', 6, 3, { size: 0.8, weight: 600, color: 'rgba(150,150,146,.85)' }), 69.5, 42.5, Z + 0.08));
  T.add(at(print('OFF', 6, 2.6, { size: 0.72, color: 'rgba(150,150,146,.85)' }), 69.5, 29.5, Z + 0.08));
}

/* =========================================================
   motion: the lid opens when the page loads; double-click to open or close; drag to turn
   ========================================================= */
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let angle = reduce ? OPEN : SHUT, goal = OPEN;
function toggleLid(){ goal = goal === OPEN ? SHUT : OPEN; }
hinge.rotation.x = angle;

function fit(){
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  /* narrow windows: step back so the whole console fits */
  const need = w / h < 1 ? 330 / (w / h) * 0.85 : 330;
  camera.fov = 28; camera.updateProjectionMatrix();
  const dir = camera.position.clone().sub(controls.target).normalize();
  if (!fit.done){ camera.position.copy(controls.target).add(dir.multiplyScalar(Math.max(390, need * 1.2))); fit.done = true; }
}
addEventListener('resize', fit); fit();

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (Math.abs(goal - angle) > 1e-4){
    angle += (goal - angle) * (1 - Math.exp(-dt * 4.2));
    hinge.rotation.x = angle;
  }
  tickers.forEach((f) => f(dt));
  controls.update();
  renderer.render(scene, camera);
});

/* =========================================================
   the maps app: "guess my hometown". world -> south america -> peru -> lima region -> lima, ending on san isidro.
   starts at 100 points, every wrong pick costs 4. click straight on the 3D screens.
   ========================================================= */
const ES = (() => { try { return localStorage.getItem('lang') === 'es'; } catch (e) { return false; } })();
const game = { data: null, mode: 'menu', level: 0, score: 100, wrong: new Set(), hover: null, flash: null, busy: false, paths: null };
const START = 100, COST = 4;
const hitCtx = document.createElement('canvas').getContext('2d');
fetch('games/hometown.json').then((r) => r.json()).then((d) => { game.data = d; });

function nameOf(L, n){ return ES && L.names_es && L.names_es[n] ? L.names_es[n] : n; }
function buildPaths(L){
  return L.regions.map((r) => { const p = new Path2D(); r.p.forEach((ring) => { p.moveTo(ring[0], ring[1]); for (let i = 2; i < ring.length; i += 2) p.lineTo(ring[i], ring[i + 1]); p.closePath(); }); return p; });
}
/* where the map sits on the top screen, and how big */
function mapBox(L, w, h){
  const v = L.view || [0, 0, L.w, L.h], vw = v[2] - v[0], vh = v[3] - v[1];
  const ax = w * 0.03, ay = h * 0.15, aw = w * 0.94, ah = h * 0.82;
  const sc = Math.min(aw / vw, ah / vh);
  return { sc, ox: ax + (aw - vw * sc) / 2 - v[0] * sc, oy: ay + (ah - vh * sc) / 2 - v[1] * sc, clip: [ax, ay, aw, ah] };
}

function drawGameTop(g, w, h){
  const L = game.data.levels[game.level];
  g.fillStyle = '#f7f8fb'; g.fillRect(0, 0, w, h);
  /* header: the question and the score */
  const fs = Math.round(h * 0.062);
  g.fillStyle = '#1d2433'; g.font = '700 ' + fs + 'px ' + FONT; g.textBaseline = 'middle'; g.textAlign = 'left';
  g.fillText(L.q[ES ? 1 : 0], w * 0.04, h * 0.075);
  g.fillStyle = '#8b93a5'; g.font = '600 ' + Math.round(fs * 0.8) + 'px ' + FONT; g.textAlign = 'right';
  g.fillText((ES ? 'puntos: ' : 'score: ') + game.score, w * 0.96, h * 0.075);
  /* the map */
  const b = mapBox(L, w, h);
  g.save(); g.beginPath(); g.rect(...b.clip); g.clip();
  g.strokeStyle = '#d3d7df'; g.lineWidth = 3; g.strokeRect(...b.clip);
  g.translate(b.ox, b.oy); g.scale(b.sc, b.sc);
  L.regions.forEach((r, i) => {
    const won = game.flash && game.flash.ok && game.flash.i === i;
    g.fillStyle = won ? '#4cc574' : game.wrong.has(i) ? '#ef7f74' : !r.c ? '#eef0f3' : game.hover === i ? '#c9d6ec' : '#e2e5eb';
    g.fill(game.paths[i]);
    g.strokeStyle = '#ffffff'; g.lineWidth = 2.2 / b.sc; g.stroke(game.paths[i]);
  });
  /* names of what's been picked, so a miss teaches something */
  g.textAlign = 'center'; g.textBaseline = 'middle';
  L.regions.forEach((r, i) => {
    const won = game.flash && game.flash.ok && game.flash.i === i;
    if (!won && !game.wrong.has(i)) return;
    const f = Math.round(h * 0.04) / b.sc;
    g.font = '700 ' + f + 'px ' + FONT; g.lineWidth = f * 0.28; g.strokeStyle = 'rgba(255,255,255,.9)'; g.fillStyle = won ? '#1f7a43' : '#a3271c';
    g.strokeText(nameOf(L, r.n), r.l[0], r.l[1]); g.fillText(nameOf(L, r.n), r.l[0], r.l[1]);
  });
  g.restore();
}
function drawGameBottom(g, w, h){
  const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#f3f5fa'); grd.addColorStop(1, '#e1e6ef');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#1d2433'; g.font = '700 ' + Math.round(h * 0.085) + 'px ' + FONT;
  g.fillText(ES ? 'adivina mi ciudad' : 'guess my hometown', w / 2, h * 0.14);
  /* five steps */
  const n = game.data.levels.length;
  for (let i = 0; i < n; i++){
    const x = w / 2 + (i - (n - 1) / 2) * w * 0.1, y = h * 0.3, done = i < game.level || game.mode === 'done';
    g.fillStyle = done ? '#4cc574' : i === game.level ? '#5b8dff' : '#cfd5e0';
    g.beginPath(); g.arc(x, y, h * 0.028, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = '#8b93a5'; g.font = '600 ' + Math.round(h * 0.06) + 'px ' + FONT; g.fillText(ES ? 'puntos' : 'score', w / 2, h * 0.45);
  g.fillStyle = '#2f6fd8'; g.font = '700 ' + Math.round(h * 0.2) + 'px ' + FONT; g.fillText(String(game.score), w / 2, h * 0.6);
  g.fillStyle = '#8b93a5'; g.font = '500 ' + Math.round(h * 0.045) + 'px ' + FONT;
  g.fillText(ES ? 'cada fallo resta 4' : 'every miss costs 4', w / 2, h * 0.74);
  if (game.mode === 'done') twoButtons(g, w, h, ES ? 'Inicio' : 'Home', ES ? 'Jugar otra vez' : 'Play again');
  else bottomButton(g, w, h, ES ? 'Volver' : 'Back');
}
function twoButtons(g, w, h, left, right){
  const bh = h * 0.12, by = h - bh - h * 0.02;
  [[w * 0.04, left, false], [w * 0.52, right, true]].forEach(([x, label, main]) => {
    shadowed(g, () => { const gr = g.createLinearGradient(0, by, 0, by + bh); gr.addColorStop(0, main ? '#6b9bff' : '#ffffff'); gr.addColorStop(1, main ? '#3f74ea' : '#e4e8ef'); g.fillStyle = gr; g.beginPath(); g.roundRect(x, by, w * 0.44, bh, bh * 0.35); g.fill(); }, 8, 2);
    g.fillStyle = main ? '#fff' : '#4a5160'; g.font = '600 ' + Math.round(bh * 0.5) + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(label, x + w * 0.22, by + bh / 2 + 2);
  });
}
function bottomButton(g, w, h, label){
  const bh = h * 0.12, by = h - bh - h * 0.02;
  shadowed(g, () => { const gr = g.createLinearGradient(0, by, 0, by + bh); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#e4e8ef'); g.fillStyle = gr; g.beginPath(); g.roundRect(w * 0.04, by, w * 0.92, bh, bh * 0.35); g.fill(); }, 8, 2);
  g.fillStyle = '#4a5160'; g.font = '600 ' + Math.round(bh * 0.5) + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(label, w / 2, by + bh / 2 + 2);
}
function drawDoneTop(g, w, h){
  const L = game.data.levels[game.data.levels.length - 1];
  drawGameTop(g, w, h);
  g.fillStyle = 'rgba(247,248,251,.86)'; g.fillRect(0, 0, w, h);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#1f7a43'; g.font = '700 ' + Math.round(h * 0.1) + 'px ' + FONT;
  g.fillText(ES ? '¡Esa es mi casa!' : "That's home!", w / 2, h * 0.38);
  g.fillStyle = '#1d2433'; g.font = '600 ' + Math.round(h * 0.06) + 'px ' + FONT;
  g.fillText('San Isidro, Lima, ' + (ES ? 'Perú' : 'Peru'), w / 2, h * 0.53);
  g.fillStyle = '#2f6fd8'; g.font = '700 ' + Math.round(h * 0.075) + 'px ' + FONT;
  g.fillText((ES ? 'puntos: ' : 'score: ') + game.score + ' / ' + START, w / 2, h * 0.68);
  const me = store.user();
  if (me){ g.fillStyle = '#8b93a5'; g.font = '600 ' + Math.round(h * 0.045) + 'px ' + FONT;
    g.fillText((ES ? 'sumados a tu total: ' : 'added to your total: ') + me.points + ' pts', w / 2, h * 0.79); }
  void L;
}

function setLevel(i){ game.level = i; game.wrong = new Set(); game.hover = null; game.flash = null; game.paths = buildPaths(game.data.levels[i]); }
function startGame(){
  if (!game.data) return;
  game.mode = 'game'; game.score = START; setLevel(0);
  painters.top = drawGameTop; painters.bottom = drawGameBottom; paint('top'); paint('bottom');
  if (goal !== OPEN) goal = OPEN;
  focusCamera(true);
}
function quitGame(){
  game.mode = 'menu'; painters.top = drawTop; painters.bottom = drawBottom; paint('top'); paint('bottom');
  focusCamera(false);
}
function pick(i){
  const L = game.data.levels[game.level], r = L.regions[i];
  if (!r || !r.c || game.busy || game.wrong.has(i)) return;
  if (r.n === L.answer){
    game.flash = { i, ok: true }; game.busy = true; paint('top');
    setTimeout(() => {
      game.busy = false;
      if (game.level + 1 < game.data.levels.length){ setLevel(game.level + 1); paint('top'); paint('bottom'); }
      else { game.mode = 'done'; painters.top = drawDoneTop; store.addPoints(game.score).then(() => { paint('top'); paint('bottom'); }); }
    }, 1100);
  } else {
    game.wrong.add(i); game.score = Math.max(0, game.score - COST); paint('top'); paint('bottom');
  }
}

/* pointer -> which screen, and where on it */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function screenAt(e){
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects([screens.top.lcd, screens.bottom.lcd], false)[0];
  if (!hit || !hit.uv) return null;
  const c = screens[hit.object.userData.kind].tex.image;
  return { kind: hit.object.userData.kind, x: hit.uv.x * c.width, y: (1 - hit.uv.y) * c.height, w: c.width, h: c.height };
}
function regionAt(p){
  const L = game.data.levels[game.level], b = mapBox(L, p.w, p.h);
  const [ax, ay, aw, ah] = b.clip; if (p.x < ax || p.y < ay || p.x > ax + aw || p.y > ay + ah) return null;
  const dx = (p.x - b.ox) / b.sc, dy = (p.y - b.oy) / b.sc;
  for (let i = L.regions.length - 1; i >= 0; i--) if (L.regions[i].c && hitCtx.isPointInPath(game.paths[i], dx, dy)) return i;
  return null;
}
/* the menu: where each app tile and the open button sit (same maths as drawBottom) */
function menuTarget(p){
  const { w, h } = p, tb = h * 0.115, s = h * 0.27, gap = s * 0.2, cols = 4, gridW = cols * s + (cols - 1) * gap;
  const x0 = (w - gridW) / 2, y0 = tb + h * 0.075, bh = h * 0.12, by = h - bh - h * 0.02;
  if (p.y > by && p.y < by + bh && p.x > w * 0.04 && p.x < w * 0.96) return 'open';
  for (let i = 0; i < APPS.length; i++){
    const x = x0 + (i % cols) * (s + gap), y = y0 + Math.floor(i / cols) * (s + gap);
    if (p.x > x && p.x < x + s && p.y > y && p.y < y + s) return APPS[i];
  }
  return null;
}
function isButton(p){ const bh = p.h * 0.12, by = p.h - bh - p.h * 0.02; return p.y > by && p.y < by + bh; }

let downAt = null;
renderer.domElement.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;   /* that was a drag */
  const b = buttonAt(e); if (b){ press(b.name, b.mesh); return; }
  const p = screenAt(e); if (!p) return;
  if (game.mode === 'menu'){
    const t = p.kind === 'bottom' && menuTarget(p);
    if (t === 'open') openApp(APPS[sel].id); else if (t){ sel = APPS.indexOf(t); paint('top'); paint('bottom'); if (t.on) openApp(t.id); }
  } else if (p.kind === 'top' && game.mode === 'game'){
    const i = regionAt(p); if (i != null) pick(i);
  } else if (game.mode === 'avatar'){
    if (p.kind === 'bottom') avatarClick(avatarTarget(p));
  } else if (p.kind === 'bottom' && isButton(p)){
    if (game.mode === 'done' && p.x > p.w / 2) startGame(); else quitGame();
  }
});
renderer.domElement.addEventListener('pointermove', (e) => {
  const p = screenAt(e);
  let pointer = !!buttonAt(e);
  if (p && game.mode === 'menu' && p.kind === 'bottom'){ const t = menuTarget(p); pointer = t === 'open' || !!(t && t.on); }
  if (p && game.mode !== 'menu' && p.kind === 'bottom') pointer = game.mode === 'avatar' ? !!avatarTarget(p) : isButton(p);
  if (game.mode === 'game'){
    const i = p && p.kind === 'top' ? regionAt(p) : null;
    if (i !== game.hover && !game.busy){ game.hover = i; paint('top'); }
    pointer = pointer || i != null;
  }
  renderer.domElement.style.cursor = pointer ? 'pointer' : '';
});
renderer.domElement.addEventListener('dblclick', (e) => { if (!screenAt(e) && !buttonAt(e) && game.mode === 'menu') toggleLid(); });

/* while playing, the camera leans in to face the top screen; going back returns it */
/* the view the page opens with: every app returns here, whatever angle you left it at */
const home = { pos: null, target: null };
setTimeout(() => { home.pos = camera.position.clone(); home.target = controls.target.clone(); }, 0);
let tween = null;
function focusCamera(on){
  const hint = document.querySelector('.hint'); if (hint) hint.style.opacity = on ? '0' : '';
  let toPos, toTarget;
  if (on){
    const c = new THREE.Vector3(), n = new THREE.Vector3(0, 0, 1);
    hinge.rotation.x = angle = OPEN;   /* aim at where the lid will be */
    hinge.updateMatrixWorld(true);
    screens.top.lcd.getWorldPosition(c);
    n.applyQuaternion(screens.top.lcd.getWorldQuaternion(new THREE.Quaternion()));
    /* frame both screens, so the buttons on the touch screen (back, home, play again) stay in view */
    const cb = new THREE.Vector3(); screens.bottom.lcd.getWorldPosition(cb);
    const mid = c.clone().lerp(cb, 0.42), span = c.distanceTo(cb) + 64 + 30;
    const fitH = (span / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const fitW = (106.5 * 1.25 / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / camera.aspect;
    const dist = Math.max(fitH, fitW, controls.minDistance + 5);
    const dir = n.clone().add(new THREE.Vector3(0, 0.55, 0.35)).normalize();
    toTarget = mid; toPos = mid.clone().add(dir.multiplyScalar(dist));
  } else { toPos = home.pos.clone(); toTarget = home.target.clone(); }
  tween = { t: 0, p0: camera.position.clone(), t0: controls.target.clone(), p1: toPos, t1: toTarget };
}
tickers.push((dt) => {
  if (!tween) return;
  tween.t = Math.min(1, tween.t + dt / 0.9);
  const k = 1 - Math.pow(1 - tween.t, 3);
  camera.position.lerpVectors(tween.p0, tween.p1, k); controls.target.lerpVectors(tween.t0, tween.t1, k);
  if (tween.t >= 1) tween = null;
});

/* =========================================================
   apps: maps (the game), rankings (trophy), settings (gear)
   ========================================================= */
let pendingApp = null;
function openApp(id){
  if (!store.user()){ pendingApp = id; openSheet('auth'); return; }   /* sign in first, then the app opens */
  if (id === 'maps') startGame();
  else if (id === 'ranks') openRanks();
  else if (id === 'settings') openSheet('settings');
  else if (id === 'avatar') openAvatar();
}

/* ---------- rankings: everyone's total, best first ---------- */
let board = [];
function openRanks(){
  store.ranking().then((r) => {
    board = r; game.mode = 'ranks';
    painters.top = drawRanksTop; painters.bottom = drawRanksBottom; paint('top'); paint('bottom');
    if (goal !== OPEN) goal = OPEN;
    focusCamera(true);
  });
}
function trophy(g, cx, cy, s, color){
  g.fillStyle = color; g.strokeStyle = color; g.lineWidth = s * 0.09;
  g.beginPath(); g.moveTo(cx - s * 0.3, cy - s * 0.42); g.lineTo(cx + s * 0.3, cy - s * 0.42);
  g.bezierCurveTo(cx + s * 0.3, cy + s * 0.05, cx + s * 0.14, cy + s * 0.15, cx, cy + s * 0.15);
  g.bezierCurveTo(cx - s * 0.14, cy + s * 0.15, cx - s * 0.3, cy + s * 0.05, cx - s * 0.3, cy - s * 0.42); g.fill();
  g.beginPath(); g.arc(cx - s * 0.31, cy - s * 0.22, s * 0.14, Math.PI * 0.5, Math.PI * 1.5); g.stroke();
  g.beginPath(); g.arc(cx + s * 0.31, cy - s * 0.22, s * 0.14, -Math.PI * 0.5, Math.PI * 0.5); g.stroke();
  g.fillRect(cx - s * 0.05, cy + s * 0.13, s * 0.1, s * 0.16);
  g.beginPath(); g.roundRect(cx - s * 0.22, cy + s * 0.28, s * 0.44, s * 0.13, s * 0.03); g.fill();
}
function drawRanksTop(g, w, h){
  const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#fff8e6'); grd.addColorStop(1, '#f3ead2');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  trophy(g, w * 0.07, h * 0.085, h * 0.11, '#f2a91c');
  g.fillStyle = '#1d2433'; g.font = '700 ' + Math.round(h * 0.062) + 'px ' + FONT; g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillText(ES ? 'Ranking' : 'Rankings', w * 0.12, h * 0.085);
  const me = store.user(), rows = board.slice(0, 8), rh = h * 0.098, y0 = h * 0.18;
  if (!rows.length){ g.fillStyle = '#8b93a5'; g.font = '600 ' + Math.round(h * 0.05) + 'px ' + FONT; g.textAlign = 'center'; g.fillText(ES ? 'Aún nadie ha jugado' : 'Nobody has played yet', w / 2, h * 0.5); return; }
  const medal = ['#f2b51c', '#aeb6c2', '#cd8a4f'];
  rows.forEach((r, i) => {
    const y = y0 + i * rh, mine = me && r.name === me.name;
    g.fillStyle = mine ? 'rgba(91,141,255,.16)' : i % 2 ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.9)';
    g.beginPath(); g.roundRect(w * 0.04, y, w * 0.92, rh * 0.86, rh * 0.25); g.fill();
    const cy = y + rh * 0.43, fs = Math.round(rh * 0.46);
    if (i < 3) trophy(g, w * 0.085, cy, rh * 0.62, medal[i]);
    else { g.fillStyle = '#8b93a5'; g.font = '700 ' + fs + 'px ' + FONT; g.textAlign = 'center'; g.fillText(String(i + 1), w * 0.085, cy + 2); }
    g.save(); g.beginPath(); g.arc(w * 0.155, cy, rh * 0.38, 0, Math.PI * 2); g.fillStyle = '#dff1fb'; g.fill(); g.clip(); drawAvatar(g, w * 0.155, cy + rh * 0.04, rh * 1.0, r.avatar || AVATAR_DEFAULT, 'face'); g.restore();
    g.fillStyle = '#1d2433'; g.font = (mine ? '700 ' : '600 ') + fs + 'px ' + FONT; g.textAlign = 'left'; g.fillText(r.name, w * 0.2, cy + 2);
    g.fillStyle = '#2f6fd8'; g.font = '700 ' + fs + 'px ' + FONT; g.textAlign = 'right'; g.fillText(r.points + ' pts', w * 0.93, cy + 2);
  });
}
function drawRanksBottom(g, w, h){
  const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#f3f5fa'); grd.addColorStop(1, '#e1e6ef');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  const me = store.user(); g.textAlign = 'center'; g.textBaseline = 'middle';
  if (me){
    const pos = board.findIndex((r) => r.name === me.name) + 1;
    g.fillStyle = '#8b93a5'; g.font = '600 ' + Math.round(h * 0.06) + 'px ' + FONT; g.fillText(me.name, w / 2, h * 0.14);
    drawAvatar(g, w / 2, h * 0.37, h * 0.36, me.avatar || AVATAR_DEFAULT); trophy(g, w / 2 + h * 0.2, h * 0.47, h * 0.12, '#f2a91c');
    g.fillStyle = '#1d2433'; g.font = '700 ' + Math.round(h * 0.11) + 'px ' + FONT; g.fillText('#' + (pos || '-'), w / 2, h * 0.6);
    g.fillStyle = '#2f6fd8'; g.font = '700 ' + Math.round(h * 0.06) + 'px ' + FONT;
    g.fillText(me.points + ' pts · ' + me.games + (ES ? ' partidas' : (me.games === 1 ? ' game' : ' games')), w / 2, h * 0.73);
  }
  bottomButton(g, w, h, ES ? 'Volver' : 'Back');
}

/* ---------- the sheet: sign in / create account, and settings ---------- */
const $ = (id) => document.getElementById(id);
const sheet = $('sheet'), form = $('sheet-form'), err = $('s-err');
const T = (en, es) => (ES ? es : en);
const NAME_OK = /^[\p{L}\p{N}_ .-]{3,16}$/u;
let sheetMode = 'auth', tab = 'a';
function show(id, on){ $(id).hidden = !on; }
function layoutSheet(){
  const auth = sheetMode === 'auth', a = tab === 'a';
  err.textContent = ''; err.className = 'err';
  $('tab-a').setAttribute('aria-selected', a); $('tab-b').setAttribute('aria-selected', !a);
  if (auth){
    $('s-title').textContent = T('Welcome', 'Bienvenido');
    $('s-sub').textContent = a ? T('Sign in to keep your points.', 'Inicia sesión para guardar tus puntos.') : T('Pick a name and a password. Your points add up every game.', 'Elige un nombre y una contraseña. Tus puntos se suman en cada juego.');
    $('tab-a').textContent = T('Log in', 'Entrar'); $('tab-b').textContent = T('Create account', 'Crear cuenta');
    show('f-name', true); $('f-name').firstChild.textContent = T('Name', 'Nombre'); show('f-old', false); show('f-pass', true); show('f-rep', !a);
    $('f-pass').firstChild.textContent = T('Password', 'Contraseña'); $('f-rep').firstChild.textContent = T('Repeat password', 'Repite la contraseña');
    form.pass.autocomplete = a ? 'current-password' : 'new-password';
    $('s-go').textContent = a ? T('Log in', 'Entrar') : T('Create account', 'Crear cuenta');
    show('s-close', EMBED); show('s-out', false);
  } else {
    $('s-title').innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#6c7486" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/></svg>' + T('Settings', 'Configuración');
    $('s-sub').textContent = T('Signed in as ', 'Sesión de ') + (store.user() || {}).name + '.';
    $('tab-a').textContent = T('Change name', 'Cambiar nombre'); $('tab-b').textContent = T('Change password', 'Cambiar contraseña');
    show('f-name', a); show('f-old', !a); show('f-pass', !a); show('f-rep', !a);
    $('f-name').firstChild.textContent = T('New name', 'Nombre nuevo');
    $('f-pass').firstChild.textContent = T('New password', 'Contraseña nueva'); $('f-rep').firstChild.textContent = T('Repeat new password', 'Repite la contraseña nueva');
    form.pass.autocomplete = 'new-password';
    if (a) form.name.value = (store.user() || {}).name || '';
    $('s-go').textContent = a ? T('Save name', 'Guardar nombre') : T('Save password', 'Guardar contraseña');
    show('s-close', true); show('s-out', true);
  }
  ['old', 'pass', 'rep'].forEach((n) => { form[n].value = ''; });
}
function openSheet(mode){
  sheetMode = mode; tab = 'a'; layoutSheet(); sheet.hidden = false;
  setTimeout(() => (sheetMode === 'auth' || tab === 'a' ? form.name : form.old).focus(), 50);
}
function closeSheet(){ sheet.hidden = true; paint('top'); paint('bottom'); }
$('tab-a').addEventListener('click', () => { tab = 'a'; layoutSheet(); });
$('tab-b').addEventListener('click', () => { tab = 'b'; layoutSheet(); });
$('s-close').addEventListener('click', () => { pendingApp = null; closeSheet(); });
$('s-out').addEventListener('click', async () => { await store.logOut(); if (game.mode !== 'menu') quitGame(); openSheet('auth'); paint('top'); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheet.hidden && sheetMode === 'settings') closeSheet(); });

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = form.name.value.trim(), old = form.old.value, pass = form.pass.value, rep = form.rep.value;
  const fail = (m) => { err.className = 'err'; err.textContent = m; };
  const needName = sheetMode === 'auth' || tab === 'a', needPass = sheetMode === 'auth' || tab === 'b';
  const newPass = (sheetMode === 'auth' && tab === 'b') || (sheetMode === 'settings' && tab === 'b');
  if (needName && !NAME_OK.test(name)) return fail(T('Names are 3 to 16 letters or numbers.', 'El nombre debe tener de 3 a 16 letras o números.'));
  if (needPass && pass.length < 6) return fail(T('Passwords need at least 6 characters.', 'La contraseña necesita al menos 6 caracteres.'));
  if (newPass && pass !== rep) return fail(T("The two passwords don't match.", 'Las dos contraseñas no coinciden.'));
  $('s-go').disabled = true;
  try {
    if (sheetMode === 'auth' && tab === 'a') await store.logIn(name, pass);
    else if (sheetMode === 'auth') await store.signUp(name, pass);
    else if (tab === 'a') await store.rename(name);
    else await store.setPassword(old, pass);
    if (sheetMode === 'settings'){ err.className = 'err ok'; err.textContent = T('Saved.', 'Guardado.'); $('s-sub').textContent = T('Signed in as ', 'Sesión de ') + store.user().name + '.'; ['old', 'pass', 'rep'].forEach((n) => { form[n].value = ''; }); paint('top'); }
    else { closeSheet(); if (pendingApp){ const a = pendingApp; pendingApp = null; openApp(a); } }
  } catch (x) {
    fail(x === 'confirm' ? T('Sign-ups need email confirmation switched off in Supabase.', 'Falta desactivar la confirmación por email en Supabase.') : x === 'net' ? T('Could not reach the server, try again.', 'No se pudo conectar con el servidor, inténtalo de nuevo.') : x === 'taken' ? T('That name is taken.', 'Ese nombre ya existe.') : x === 'wrong' ? (sheetMode === 'auth' ? T('Wrong name or password.', 'Nombre o contraseña incorrectos.') : T('Current password is wrong.', 'La contraseña actual no es correcta.')) : T('Something went wrong, try again.', 'Algo salió mal, inténtalo de nuevo.'));
  } finally { $('s-go').disabled = false; }
});

/* when the console switches on and nobody is signed in, ask */
const booted = Date.now();
store.ready.then(() => { paint('top'); if (!store.user() && !EMBED) setTimeout(() => openSheet('auth'), Math.max(0, (reduce ? 0 : 1300) - (Date.now() - booted))); });

/* ---------- avatar editor: parts on the touch screen, the character alive in 3D on the top screen ---------- */
const AV_TABS = [
  { key: 'face', en: 'Face', es: 'Cara', n: AV.face, view: 'face' },
  { key: 'skin', en: 'Skin', es: 'Piel', n: AV.skin.length, color: AV.skin },
  { key: 'hair', en: 'Hair', es: 'Pelo', n: AV.hair, view: 'face' },
  { key: 'hairColor', en: 'Colour', es: 'Color', n: AV.hairColor.length, color: AV.hairColor },
  { key: 'brows', en: 'Brows', es: 'Cejas', n: AV.brows, view: 'face' },
  { key: 'eyes', en: 'Eyes', es: 'Ojos', n: AV.eyes, view: 'face' },
  { key: 'nose', en: 'Nose', es: 'Nariz', n: AV.nose, view: 'face' },
  { key: 'mouth', en: 'Mouth', es: 'Boca', n: AV.mouth, view: 'face' },
  { key: 'glasses', en: 'Glasses', es: 'Lentes', n: AV.glasses, view: 'face' },
  { key: 'hat', en: 'Hat', es: 'Gorro', n: AV.hat, view: 'face' },
  { key: 'shirt', en: 'Shirt', es: 'Polo', n: AV.shirt.length, color: AV.shirt },
];
const ed = { tab: 0, draft: null, saving: false };
const topRT = new THREE.WebGLRenderTarget(1278, 768, { samples: 4 }); topRT.texture.colorSpace = THREE.SRGBColorSpace;
const bgCanvas = document.createElement('canvas'); bgCanvas.width = 1278; bgCanvas.height = 768;
const bgTex = new THREE.CanvasTexture(bgCanvas); bgTex.colorSpace = THREE.SRGBColorSpace;
function paintAvatarBackdrop(){
  const g = bgCanvas.getContext('2d'), w = bgCanvas.width, h = bgCanvas.height;
  const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#eef8ff'); grd.addColorStop(1, '#cfe5f6');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(w / 2, h * 0.92, w * 0.17, h * 0.045, 0, 0, Math.PI * 2); g.fill();
  const me = store.user();
  g.fillStyle = '#1d2433'; g.font = '700 ' + Math.round(h * 0.06) + 'px ' + FONT; g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillText(ES ? 'Tu personaje' : 'Your avatar', w * 0.04, h * 0.085);
  if (me){ g.fillStyle = '#5b6375'; g.font = '600 ' + Math.round(h * 0.05) + 'px ' + FONT; g.textAlign = 'right'; g.fillText(me.name, w * 0.96, h * 0.085); }
  bgTex.needsUpdate = true;
}
function rebuildLive(){
  if (avRig){ avScene.remove(avRig); disposeTree(avRig); }
  avRig = buildAvatar(ed.draft, faceCanvas, faceTex); avScene.add(avRig);
}
let canvasMap = null, blinkAt = 0, blinking = false;
function openAvatar(){
  ed.tab = 0; ed.draft = avatarOf((store.user() || {}).avatar); game.mode = 'avatar';
  paintAvatarBackdrop(); rebuildLive();
  canvasMap = screens.top.lcd.material.map; screens.top.lcd.material.map = topRT.texture; screens.top.lcd.material.needsUpdate = true;
  painters.bottom = drawAvatarBottom; paint('bottom');
  if (goal !== OPEN) goal = OPEN;
  focusCamera(true);
}
function closeAvatar(){
  if (canvasMap){ screens.top.lcd.material.map = canvasMap; screens.top.lcd.material.needsUpdate = true; canvasMap = null; }
  if (avRig){ avScene.remove(avRig); disposeTree(avRig); avRig = null; }
}
/* while editing: the character breathes, sways, looks about and blinks */
tickers.push((dt) => {
  if (game.mode !== 'avatar' || !avRig) return;
  const t = performance.now() / 1000;
  avRig.position.y = Math.sin(t * 2.1) * 0.04;
  avRig.rotation.y = Math.sin(t * 0.6) * 0.28;
  avRig.userData.head.rotation.z = Math.sin(t * 0.9) * 0.05;
  avRig.userData.head.rotation.x = Math.sin(t * 0.7) * 0.04;
  if (!blinking && t > blinkAt){ blinking = true; paintFace(faceCanvas.getContext('2d'), 1024, 512, ed.draft, true); faceTex.needsUpdate = true;
    setTimeout(() => { blinking = false; blinkAt = performance.now() / 1000 + 2 + Math.random() * 3; if (game.mode === 'avatar'){ paintFace(faceCanvas.getContext('2d'), 1024, 512, ed.draft, false); faceTex.needsUpdate = true; } }, 130); }
  frame(avCam, 'body', 1278 / 768);
  avScene.background = bgTex;
  renderer.setRenderTarget(topRT); renderer.render(avScene, avCam); renderer.setRenderTarget(null);
});

/* layout of the touch screen, shared by drawing and clicking: two rows of tabs, 4x2 options, back / save */
function avLayout(w, h){
  const rows = [AV_TABS.slice(0, 6), AV_TABS.slice(6)], tabs = [];
  rows.forEach((row, ri) => { const tw = w * 0.92 / 6; row.forEach((t, i) => { const off = (6 - row.length) * tw / 2; tabs.push({ x: w * 0.04 + off + i * tw + 3, y: h * 0.025 + ri * h * 0.105, w: tw - 6, h: h * 0.09 }); }); });
  const s = h * 0.245, gap = s * 0.16, cols = 4, gridW = cols * s + (cols - 1) * gap, x0 = (w - gridW) / 2, y0 = h * 0.245;
  const opts = []; for (let i = 0; i < 8; i++) opts.push({ x: x0 + (i % cols) * (s + gap), y: y0 + Math.floor(i / cols) * (s + gap), w: s, h: s });
  const bh = h * 0.11, by = h - bh - h * 0.02;
  return { tabs, opts, back: { x: w * 0.04, y: by, w: w * 0.44, h: bh }, save: { x: w * 0.52, y: by, w: w * 0.44, h: bh } };
}
function drawAvatarBottom(g, w, h){
  const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#f3f5fa'); grd.addColorStop(1, '#e1e6ef');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  const L = avLayout(w, h), tab = AV_TABS[ed.tab];
  g.textAlign = 'center'; g.textBaseline = 'middle';
  L.tabs.forEach((r, i) => {
    const on = i === ed.tab;
    g.fillStyle = on ? '#5b8dff' : 'rgba(255,255,255,.92)'; g.beginPath(); g.roundRect(r.x, r.y, r.w, r.h, r.h * 0.32); g.fill();
    g.fillStyle = on ? '#fff' : '#5b6375'; g.font = '700 ' + Math.round(r.h * 0.4) + 'px ' + FONT;
    g.fillText(ES ? AV_TABS[i].es : AV_TABS[i].en, r.x + r.w / 2, r.y + r.h / 2 + 1);
  });
  for (let i = 0; i < tab.n; i++){
    const r = L.opts[i];
    shadowed(g, () => { g.fillStyle = '#fff'; g.beginPath(); g.roundRect(r.x, r.y, r.w, r.h, r.w * 0.2); g.fill(); }, r.w * 0.1, r.w * 0.03);
    if (tab.color){ g.fillStyle = tab.color[i]; g.beginPath(); g.arc(r.x + r.w / 2, r.y + r.h / 2, r.w * 0.3, 0, Math.PI * 2); g.fill(); g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 2; g.stroke(); }
    else {
      const look = Object.assign({}, ed.draft, { [tab.key]: i });
      g.save(); g.beginPath(); g.roundRect(r.x, r.y, r.w, r.h, r.w * 0.2); g.clip();
      drawAvatar(g, r.x + r.w / 2, r.y + r.h / 2, r.w * 1.02, look, tab.view); g.restore();
    }
    if (ed.draft[tab.key] === i) brackets(g, r.x, r.y, r.w);
  }
  const btn = (r, label, main) => {
    shadowed(g, () => { const gr = g.createLinearGradient(0, r.y, 0, r.y + r.h); gr.addColorStop(0, main ? '#6b9bff' : '#ffffff'); gr.addColorStop(1, main ? '#3f74ea' : '#e4e8ef'); g.fillStyle = gr; g.beginPath(); g.roundRect(r.x, r.y, r.w, r.h, r.h * 0.35); g.fill(); }, 8, 2);
    g.fillStyle = main ? '#fff' : '#4a5160'; g.font = '600 ' + Math.round(r.h * 0.5) + 'px ' + FONT; g.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 2);
  };
  btn(L.back, ES ? 'Volver' : 'Back', false);
  btn(L.save, ed.saving ? '…' : (ES ? 'Guardar' : 'Save'), true);
}
function avatarTarget(p){
  const L = avLayout(p.w, p.h), inside = (r) => p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h;
  for (let i = 0; i < L.tabs.length; i++) if (inside(L.tabs[i])) return { tab: i };
  for (let i = 0; i < AV_TABS[ed.tab].n; i++) if (inside(L.opts[i])) return { opt: i };
  if (inside(L.back)) return 'back';
  if (inside(L.save)) return 'save';
  return null;
}
function avatarClick(t){
  if (!t || ed.saving) return;
  if (t === 'back'){ closeAvatar(); quitGame(); return; }
  if (t === 'save'){
    ed.saving = true; paint('bottom');
    store.setAvatar(ed.draft).catch(() => {}).then(() => { ed.saving = false; closeAvatar(); quitGame(); });
    return;
  }
  if (t.tab != null) ed.tab = t.tab;
  if (t.opt != null){ ed.draft[AV_TABS[ed.tab].key] = t.opt; rebuildLive(); }
  paint('bottom');
}
/* ---------- the physical buttons work too ----------
   d-pad moves the selection in the menu, A / SELECT / START open it, B goes back, HOME always goes home.
   the keyboard does the same: arrows, enter, escape, h. */
function buttonAt(e){
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(BUTTONS, false)[0];
  if (!hit) return null;
  let name = hit.object.userData.btn;
  if (name === 'dpad'){   /* which arm of the cross: compare the hit point with the cross's centre */
    const q = bottom.worldToLocal(hit.point.clone()), dx = q.x + 61.5, dy = q.y + 61;
    if (Math.hypot(dx, dy) < 2.2) return null;
    name = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'up' : 'down');
  }
  return { name, mesh: hit.object };
}
function sink(mesh){   /* the button dips for a moment */
  if (!mesh || mesh.userData.down) return;
  mesh.userData.down = true; mesh.position.z -= 0.6;
  setTimeout(() => { mesh.position.z += 0.6; mesh.userData.down = false; }, 130);
}
function press(name, mesh){
  sink(mesh);
  if (!sheet.hidden) return;
  if (game.mode === 'avatar' && (name === 'home' || name === 'b')){ closeAvatar(); quitGame(); return; }
  if (name === 'home'){ if (game.mode !== 'menu') quitGame(); return; }
  if (game.mode === 'menu'){
    const cols = 4, n = APPS.length;
    if (name === 'left' && sel % cols) sel--;
    if (name === 'right' && sel % cols < cols - 1 && sel + 1 < n) sel++;
    if (name === 'up' && sel - cols >= 0) sel -= cols;
    if (name === 'down' && sel + cols < n) sel += cols;
    if (['a', 'select', 'start'].includes(name) && APPS[sel].on) openApp(APPS[sel].id);
    if (['left', 'right', 'up', 'down'].includes(name)){ paint('top'); paint('bottom'); }
    return;
  }
  if (game.mode === 'done'){ if (['a', 'start', 'select'].includes(name)) startGame(); if (name === 'b') quitGame(); return; }
  if (name === 'b') quitGame();
}
addEventListener('keydown', (e) => {
  if (!sheet.hidden || e.target.tagName === 'INPUT') return;
  const k = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', Enter: 'a', ' ': 'a', Escape: 'b', Backspace: 'b', h: 'home', H: 'home' }[e.key];
  if (!k) return;
  e.preventDefault(); press(k, null);
});
