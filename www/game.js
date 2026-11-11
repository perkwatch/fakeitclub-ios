/* ============================================================
   FAKE IT CLUB — a social deduction party game.
   One device, passed around the table. Some clubmates are faking it.
   Fully local: no accounts, no servers, no purchases. Ever.
   ============================================================ */
'use strict';

/* ---------- tiny utils ---------- */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = rnd(i + 1); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function toast(msg, ms = 2400) {
  const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toast._h); toast._h = setTimeout(() => t.classList.add('hidden'), ms);
}
function show(id) {
  $$('.screen').forEach(s => s.classList.remove('active'));
  $('#screen-' + id).classList.add('active');
  window.scrollTo(0, 0);
}
/* sound — tiny WebAudio bleeps, no assets */
let AC = null;
function beep(freq = 660, dur = 0.09, type = 'sine', vol = 0.12) {
  if (!P.settings.sound) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, AC.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + dur);
    o.connect(g).connect(AC.destination); o.start(); o.stop(AC.currentTime + dur);
  } catch (e) { /* sound is decoration, never a blocker */ }
}
const sfx = {
  tap: () => beep(620, .06),
  good: () => { beep(660, .08); setTimeout(() => beep(880, .1), 80); },
  bad: () => beep(190, .18, 'sawtooth', .08),
  alarm: () => { beep(880, .12, 'square', .09); setTimeout(() => beep(880, .12, 'square', .09), 150); },
  coin: () => { beep(1180, .07); setTimeout(() => beep(1560, .1), 70); },
};

/* ---------- catalog data ---------- */
const COLORS = [
  { id: 'ruby',   name: 'Ruby Red',   hex: '#e33e5a', price: 0 },
  { id: 'ocean',  name: 'Ocean Blue', hex: '#3e7de3', price: 0 },
  { id: 'leaf',   name: 'Leaf Green', hex: '#43b968', price: 0 },
  { id: 'sunny',  name: 'Sunny Gold', hex: '#e8a91c', price: 0 },
  { id: 'grape',  name: 'Grape Soda', hex: '#8b46c7', price: 40 },
  { id: 'mint',   name: 'Mint Chip',  hex: '#37c8a3', price: 40 },
  { id: 'coral',  name: 'Coral Pop',  hex: '#ff7a59', price: 60 },
  { id: 'sky',    name: 'Sky Light',  hex: '#59b7ff', price: 60 },
  { id: 'rose',   name: 'Rose Pink',  hex: '#ff6fb5', price: 90 },
  { id: 'lime',   name: 'Lime Zest',  hex: '#a4d233', price: 90 },
  { id: 'onyx',   name: 'Onyx Black', hex: '#3a3f4a', price: 140 },
  { id: 'pearl',  name: 'Pearl White',hex: '#e9e6df', price: 140 },
];
const HATS = [
  { id: 'none',    name: 'No Hat',    emoji: '',   price: 0 },
  { id: 'cap',     name: 'Ball Cap',  emoji: '🧢', price: 30 },
  { id: 'party',   name: 'Party Hat', emoji: '🎉', price: 30 },
  { id: 'flower',  name: 'Flower',    emoji: '🌸', price: 50 },
  { id: 'antenna', name: 'Antenna',   emoji: '📡', price: 70 },
  { id: 'halo',    name: 'Halo',      emoji: '😇', price: 100 },
  { id: 'horns',   name: 'Horns',     emoji: '😈', price: 100 },
  { id: 'wizard',  name: 'Wizard Hat',emoji: '🧙', price: 150 },
  { id: 'pirate',  name: 'Pirate Hat',emoji: '🏴‍☠️', price: 180 },
  { id: 'crown',   name: 'Crown',     emoji: '👑', price: 300 },
];
const DECOR = [
  { id: 'plant',  name: 'Club Plant',   emoji: '🪴', price: 50 },
  { id: 'disco',  name: 'Disco Ball',   emoji: '🪩', price: 120 },
  { id: 'couch',  name: 'Velvet Couch', emoji: '🛋️', price: 150 },
  { id: 'arcade', name: 'Arcade Cabinet',emoji: '🕹️', price: 200 },
  { id: 'neon',   name: 'Neon Sign',    emoji: '💡', price: 220 },
  { id: 'rug',    name: 'Persian Rug',  emoji: '🟥', price: 260 },
  { id: 'trophy', name: 'Gold Trophy',  emoji: '🏆', price: 350 },
  { id: 'banner', name: 'Club Banner',  emoji: '🎏', price: 400 },
];
const FACES = ['🙂', '😎', '🤠', '🥳', '😺', '🦊', '🐸', '🐵', '🦉', '🐙', '🤖', '👽'];
const BOT_NAMES = ['Ruby', 'Moss', 'Pepper', 'Juno', 'Silas', 'Wren', 'Otto', 'Veda', 'Cleo', 'Bram', 'Noor', 'Ezra'];
const BOT_TRAITS = ['chatty', 'quiet', 'sharp', 'wanderer', 'helper'];

/* The clubhouse: 3x3 rooms. Tasks live at stations. */
const ROOMS = [
  { id: 'lobby',   name: 'Lobby',   emoji: '🛎️' },
  { id: 'arcade',  name: 'Arcade',  emoji: '🕹️' },
  { id: 'kitchen', name: 'Kitchen', emoji: '🍹' },
  { id: 'lounge',  name: 'Lounge',  emoji: '🛋️' },
  { id: 'studio',  name: 'Studio',  emoji: '🎙️' },
  { id: 'library', name: 'Library', emoji: '📚' },
  { id: 'rooftop', name: 'Rooftop', emoji: '🌃' },
  { id: 'vault',   name: 'Vault',   emoji: '🔐' },
  { id: 'garden',  name: 'Garden',  emoji: '🌿' },
];
const roomById = id => ROOMS.find(r => r.id === id);
function adjacent(a, b) {
  const ia = ROOMS.findIndex(r => r.id === a), ib = ROOMS.findIndex(r => r.id === b);
  const ax = ia % 3, ay = (ia / 3) | 0, bx = ib % 3, by = (ib / 3) | 0;
  return Math.abs(ax - bx) + Math.abs(ay - by) === 1;
}
/* path steps between rooms (BFS over the 3x3 grid) */
function roomDist(a, b) {
  if (a === b) return 0;
  const seen = { [a]: 0 }; const q = [a];
  while (q.length) {
    const cur = q.shift();
    for (const r of ROOMS) if (adjacent(cur, r.id) && !(r.id in seen)) {
      seen[r.id] = seen[cur] + 1; if (r.id === b) return seen[r.id]; q.push(r.id);
    }
  }
  return 99;
}
function stepToward(from, to) {
  if (from === to) return from;
  let best = from, bd = 99;
  for (const r of ROOMS) if (adjacent(from, r.id)) {
    const d = roomDist(r.id, to); if (d < bd) { bd = d; best = r.id; }
  }
  return best;
}
/* stations: id, room, label, mini-game type */
const TASK_TYPES = ['tap', 'hold', 'odd', 'slider', 'memory'];
const STATIONS = [
  { id: 'st-bell',    room: 'lobby',   label: 'Polish the front bell' },
  { id: 'st-sign',    room: 'lobby',   label: 'Straighten the club sign' },
  { id: 'st-cab',     room: 'arcade',  label: 'Fix the high-score cabinet' },
  { id: 'st-pin',     room: 'arcade',  label: 'Unjam the pinball machine' },
  { id: 'st-drink',   room: 'kitchen', label: 'Restock the drink cooler' },
  { id: 'st-snack',   room: 'kitchen', label: 'Plate the snack trays' },
  { id: 'st-pillow',  room: 'lounge',  label: 'Fluff the lounge pillows' },
  { id: 'st-board',   room: 'lounge',  label: 'Set up the board game' },
  { id: 'st-mic',     room: 'studio',  label: 'Tune the studio mic' },
  { id: 'st-tape',    room: 'studio',  label: 'Rewind the demo tapes' },
  { id: 'st-shelf',   room: 'library', label: 'Shelve the returned books' },
  { id: 'st-globe',   room: 'library', label: 'Dust the reading globe' },
  { id: 'st-lights',  room: 'rooftop', label: 'String the rooftop lights' },
  { id: 'st-scope',   room: 'rooftop', label: 'Align the telescope' },
  { id: 'st-ledger',  room: 'vault',   label: 'Count the club ledger' },
  { id: 'st-safe',    room: 'vault',   label: 'Oil the safe hinges' },
  { id: 'st-fern',    room: 'garden',  label: 'Water the ferns' },
  { id: 'st-lantern', room: 'garden',  label: 'Light the garden lanterns' },
];

const BUILTIN_SCENARIOS = [
  { id: 'classic', builtin: true, name: 'Classic Clubhouse', memberName: 'Clubmates', fakerName: 'Fakers',
    fakerTable: { 4: 1, 5: 1, 6: 2, 7: 2, 8: 2, 9: 3, 10: 3 }, taskMult: 2, crisisTurns: 10, confirmEjects: true,
    flavor: 'A regular night at the club — except a few of your clubmates are faking it.' },
  { id: 'masquerade', builtin: true, name: 'Masquerade Ball', memberName: 'Guests', fakerName: 'Impostors',
    fakerTable: { 4: 1, 5: 1, 6: 2, 7: 2, 8: 2, 9: 3, 10: 3 }, taskMult: 2, crisisTurns: 10, confirmEjects: true,
    flavor: 'Masks on, everyone smiling. Some of the guests were never invited.' },
  { id: 'heist', builtin: true, name: 'Vault Heist Night', memberName: 'Crew', fakerName: 'Inside Jobs',
    fakerTable: { 4: 1, 5: 2, 6: 2, 7: 2, 8: 3, 9: 3, 10: 3 }, taskMult: 2, crisisTurns: 8, confirmEjects: false,
    flavor: 'The club vault is full and the crew is nervous. Someone on the inside is working an angle — and voted-out players keep their secrets.' },
  { id: 'chill', builtin: true, name: 'Slow Sunday', memberName: 'Clubmates', fakerName: 'Fakers',
    fakerTable: { 4: 1, 5: 1, 6: 1, 7: 2, 8: 2, 9: 2, 10: 2 }, taskMult: 1, crisisTurns: 14, confirmEjects: true,
    flavor: 'A lazy day, a light workload, and all the time in the world to watch each other.' },
];

/* ---------- persistent profile ---------- */
const SAVE_KEY = 'fakeitclub_save_v1';
function defaultSave() {
  return {
    name: 'Newcomer', xp: 0, coins: 0,
    colorId: 'ruby', hatId: 'none',
    ownedColors: ['ruby', 'ocean', 'leaf', 'sunny'],
    ownedHats: ['none'], ownedDecor: [],
    scenarios: [],
    settings: { sound: true, chatter: true },
    stats: { games: 0, memberWins: 0, fakerWins: 0, tasksDone: 0, correctVotes: 0, timesTagged: 0, meetingsCalled: 0 },
  };
}
let P;
try { P = Object.assign(defaultSave(), JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); }
catch (e) { P = defaultSave(); }
P.settings = Object.assign({ sound: true, chatter: true }, P.settings || {});
P.stats = Object.assign(defaultSave().stats, P.stats || {});
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(P)); } catch (e) { /* private mode etc. */ } }
const colorOf = id => COLORS.find(c => c.id === id) || COLORS[0];
const hatOf = id => HATS.find(h => h.id === id) || HATS[0];
function levelOf(xp) { return Math.floor(Math.sqrt(xp / 60)) + 1; }
function xpForLevel(l) { return 60 * (l - 1) * (l - 1); }
function avatarHTML(colorId, hatId, face, ghost) {
  const c = colorOf(colorId), h = hatOf(hatId);
  return `<div class="avatar${ghost ? ' ghostly' : ''}" style="background:${c.hex}">${h.emoji ? `<span class="hat">${h.emoji}</span>` : ''}${face}</div>`;
}
function tokenHTML(p, isMe) {
  const c = colorOf(p.colorId), h = hatOf(p.hatId);
  return `<div class="token${isMe ? ' me' : ''}${p.state !== 'alive' ? ' ghostly' : ''}${p.state === 'tagged' ? ' found' : ''}" style="background:${c.hex}" title="${p.name}">${h.emoji ? `<span class="hat">${h.emoji}</span>` : ''}${p.face}</div>`;
}

/* ---------- hub ---------- */
function renderHub() {
  $('#hub-avatar').outerHTML = avatarHTML(P.colorId, P.hatId, '🙂', false).replace('class="avatar"', 'class="avatar" id="hub-avatar"');
  $('#hub-name').textContent = P.name;
  const lvl = levelOf(P.xp);
  $('#hub-level').textContent = 'Level ' + lvl + ' clubmate';
  const cur = xpForLevel(lvl), next = xpForLevel(lvl + 1);
  $('#hub-xpfill').style.width = clamp(((P.xp - cur) / (next - cur)) * 100, 0, 100) + '%';
  $('#hub-xp').textContent = P.xp + ' XP · ' + (next - P.xp) + ' to level ' + (lvl + 1);
  $('#hub-coins').textContent = P.coins;
  $('#scene-you').innerHTML = avatarHTML(P.colorId, P.hatId, '🙂', false);
  $('#scene-decor').innerHTML = P.ownedDecor.length
    ? P.ownedDecor.map(id => (DECOR.find(d => d.id === id) || {}).emoji || '').join('')
    : '<span style="font-size:14px;color:var(--dim)">Win rounds, earn coins, make this place yours.</span>';
}
function addXP(n) { const before = levelOf(P.xp); P.xp += n; if (levelOf(P.xp) > before) { toast('⭐ Level up! You are now level ' + levelOf(P.xp), 3000); sfx.coin(); } }
function addCoins(n) { P.coins += n; }

/* ---------- lobby ---------- */
let lobby = { scenarioId: 'classic', seats: 7, humans: [] };
function allScenarios() { return BUILTIN_SCENARIOS.concat(P.scenarios); }
function scenarioById(id) { return allScenarios().find(s => s.id === id) || BUILTIN_SCENARIOS[0]; }
function fakerCountFor(sc, seats) {
  if (sc.fakerTable) return sc.fakerTable[seats] || 2;
  return clamp(Math.round(sc.fakers * seats / 10), 1, seats - 2);
}
function renderLobby() {
  const chips = $('#scenario-chips'); chips.innerHTML = '';
  allScenarios().forEach(sc => {
    const b = document.createElement('button');
    b.className = 'chip' + (sc.id === lobby.scenarioId ? ' sel' : '');
    b.textContent = sc.name;
    b.onclick = () => { lobby.scenarioId = sc.id; sfx.tap(); renderLobby(); };
    chips.appendChild(b);
  });
  const sc = scenarioById(lobby.scenarioId);
  $('#scenario-desc').textContent = sc.flavor + ` (${sc.memberName} vs ${sc.fakerName})`;
  $('#seats-out').textContent = lobby.seats;
  $('#faker-hint').textContent = `${fakerCountFor(sc, lobby.seats)} of the ${lobby.seats} clubmates will secretly be ${sc.fakerName}. The rest are ${sc.memberName}.`;
  const list = $('#human-list'); list.innerHTML = '';
  lobby.humans.forEach((h, i) => {
    const row = document.createElement('div'); row.className = 'human-row';
    row.innerHTML = `${avatarHTML(h.colorId, 'none', h.face, false)}<span class="nm"></span>`;
    row.querySelector('.nm').textContent = h.name;
    const x = document.createElement('button'); x.textContent = '✕'; x.title = 'Remove';
    x.onclick = () => { lobby.humans.splice(i, 1); renderLobby(); };
    row.appendChild(x); list.appendChild(row);
  });
}
/* game.js continues in part 2 */

/* ============================================================
   THE ROUND
   Turn-based: every clubmate takes a turn (move up to 2 rooms,
   then one action). Positions are public — it's a clubhouse,
   everyone sees everyone. Secrets live in the actions.
   ============================================================ */
let G = null; // game state

function newGame() {
  const sc = scenarioById(lobby.scenarioId);
  const seats = lobby.seats;
  const nFakers = fakerCountFor(sc, seats);
  const players = [];
  const usedColors = shuffle(COLORS.map(c => c.id));
  const usedFaces = shuffle(FACES);
  const botNames = shuffle(BOT_NAMES);
  lobby.humans.forEach((h, i) => {
    players.push({ id: 'p' + i, name: h.name, human: true, colorId: h.colorId, hatId: i === 0 ? P.hatId : 'none', face: h.face, isYou: i === 0 });
  });
  for (let i = players.length; i < seats; i++) {
    players.push({ id: 'p' + i, name: botNames[i - lobby.humans.length], human: false,
      colorId: usedColors[i % usedColors.length], hatId: 'none', face: usedFaces[i % usedFaces.length],
      trait: pick(BOT_TRAITS) });
  }
  shuffle(players).slice(0, nFakers).forEach(p => p.role = 'faker');
  players.forEach(p => { if (!p.role) p.role = 'member'; });
  const tasksNeeded = Math.round(seats * sc.taskMult * 0.9);
  const stations = shuffle(STATIONS).slice(0, Math.min(STATIONS.length, tasksNeeded + 4)).map((s, i) => ({
    ...s, type: TASK_TYPES[i % TASK_TYPES.length], done: false,
  }));
  G = {
    sc, players, stations, tasksNeeded, tasksDone: 0,
    turnIdx: rnd(players.length), turnNo: 0,
    crisis: null, // { turnsLeft, fixRooms:[a,b], fixed:Set, kind }
    crisisCooldown: 0,
    log: [],          // private-ish event records used to build the case file
    caseNotes: [],    // public notes for meetings
    emergencyUsed: {}, // playerId -> count
    over: false, winner: null,
    stats: { tasksByYou: 0 },
    phase: 'reveal', revealIdx: 0,
    meeting: null,
  };
  players.forEach(p => { p.room = 'lobby'; p.state = 'alive'; p.reported = false; p.suspicion = 0; p.turnsAsGhost = 0; });
  G.order = players.slice(); // fixed turn order
}

/* ---------- flow helpers ---------- */
function passGate(title, text, emoji, cb) {
  $('#pass-title').textContent = title;
  $('#pass-text').textContent = text;
  $('#pass-emoji').textContent = emoji;
  show('pass');
  $('#btn-pass-ok').onclick = () => { sfx.tap(); cb(); };
}
function alivePlayers() { return G.players.filter(p => p.state === 'alive'); }
function aliveOf(role) { return G.players.filter(p => p.state === 'alive' && p.role === role); }
function playerById(id) { return G.players.find(p => p.id === id); }

function startReveal() {
  const humans = G.players.filter(p => p.human);
  let i = 0;
  const step = () => {
    if (i >= humans.length) { beginTurns(); return; }
    const p = humans[i++];
    passGate(`Pass to ${p.name}`, 'Only ' + p.name + ' should look at the next screen.', '📱', () => {
      $('#reveal-for').textContent = p.name + ', you are a…';
      const isF = p.role === 'faker';
      $('#reveal-emoji').textContent = isF ? '🕶️' : '🎭';
      const roleEl = $('#reveal-role');
      roleEl.textContent = isF ? G.sc.fakerName.slice(0, -1) || G.sc.fakerName : G.sc.memberName.slice(0, -1) || G.sc.memberName;
      roleEl.className = 'reveal-role ' + (isF ? 'faker' : 'member');
      $('#reveal-desc').textContent = isF
        ? 'Blend in. Pretend to work. Tag out the ' + G.sc.memberName + ' when nobody is watching, and run a crisis down to zero.'
        : 'Finish club tasks to fill the task bar. Watch everyone. Vote the ' + G.sc.fakerName + ' out.';
      $('#reveal-team').textContent = isF
        ? (aliveOf('faker').length > 1 ? 'Your fellow ' + G.sc.fakerName + ': ' + aliveOf('faker').filter(x => x !== p).map(x => x.name).join(', ') : 'You are the only one. Play it cool.')
        : G.sc.flavor;
      show('reveal');
      $('#btn-reveal-ok').onclick = () => { sfx.tap(); step(); };
    });
  };
  step();
}

/* ---------- turn engine ---------- */
function currentPlayer() { return G.order[G.turnIdx % G.order.length]; }
function beginTurns() { G.phase = 'play'; show('game'); nextTurn(); }
function nextTurn() {
  if (G.over) return;
  // skip ejected players; ghosts still take (task-only) turns
  let guard = 0;
  while (currentPlayer().state === 'out' && guard++ < 50) G.turnIdx++;
  const p = currentPlayer();
  G.turnNo++;
  if (G.crisis) {
    G.crisis.turnsLeft--;
    if (G.crisis.turnsLeft <= 0) { endGame('faker', '⏰ The crisis hit zero. Nobody fixed it in time — the ' + G.sc.fakerName + ' played the club perfectly.'); return; }
  }
  if (G.crisisCooldown > 0) G.crisisCooldown--;
  renderGame(p);
  if (p.human) {
    passGate(`${p.name}, your turn`, p.state === 'ghost'
      ? 'You are a ghost in the Lounge. You can still finish tasks — help the club win from beyond.'
      : 'Move up to 2 rooms, then take one action. Your role stays secret.', p.face,
      () => { show('game'); humanTurn(p); });
  } else {
    later(() => botTurn(p), 650);
  }
}
function endTurn() {
  checkWin();
  if (G.over) return;
  G.turnIdx++;
  nextTurn();
}
function checkWin() {
  if (G.over) return;
  const f = aliveOf('faker').length, m = aliveOf('member').length;
  if (f === 0) { endGame('member', '🎉 Every one of the ' + G.sc.fakerName + ' is out of the club.'); return; }
  if (f >= m) { endGame('faker', '🕶️ The ' + G.sc.fakerName + ' now match the ' + G.sc.memberName + ' still standing. The club belongs to them.'); return; }
  if (G.tasksDone >= G.tasksNeeded) { endGame('member', '✅ Task bar full — the club ran itself beautifully, and the ' + G.sc.fakerName + ' never stood a chance.'); return; }
}
function note(text) { G.caseNotes.push({ turn: G.turnNo, text }); }
/* schedule work for THIS game only — a stale timer from a finished round must never act on a new one */
function later(fn, ms) { const g = G; setTimeout(() => { if (G === g && !g.over) fn(); }, ms); }
function tick(text) { const t = $('#ticker'); if (t) t.innerHTML = text; }

/* ---------- rendering ---------- */
function renderGame(p) {
  $('#taskbar-label').textContent = `Club tasks — ${G.tasksDone}/${G.tasksNeeded}`;
  $('#taskfill').style.width = clamp(G.tasksDone / G.tasksNeeded * 100, 0, 100) + '%';
  const cb = $('#crisis-banner');
  if (G.crisis) {
    cb.classList.remove('hidden');
    const fixedCount = G.crisis.fixed.size;
    cb.textContent = `🚨 CRISIS: ${G.crisis.kind} — ${G.crisis.turnsLeft} turns left · fixed ${fixedCount}/${G.crisis.fixRooms.length} (go to ${G.crisis.fixRooms.filter(r => !G.crisis.fixed.has(r)).map(r => roomById(r).name).join(' & ') || '—'})`;
  } else cb.classList.add('hidden');
  $('#turn-banner').textContent = p ? `${p.face} ${p.name}'s turn${p.state === 'ghost' ? ' (ghost)' : ''}` : '';
  const map = $('#map'); map.innerHTML = '';
  ROOMS.forEach(r => {
    const div = document.createElement('div');
    div.className = 'room' + (p && p.room === r.id ? ' here' : '') + (p && p._movesLeft > 0 && adjacent(p.room, r.id) ? ' reachable' : '');
    const sts = G.stations.filter(s => s.room === r.id);
    div.innerHTML = `<span class="room-emoji">${r.emoji}</span> <span class="room-name">${r.name}</span>` +
      (sts.length ? `<div class="stations">${sts.map(s => `<div class="${s.done ? 'done' : ''}">${s.done ? '✓' : '•'} ${s.label}</div>`).join('')}</div>` : '') +
      `<div class="tokens">${G.players.filter(x => x.room === r.id && x.state !== 'out').map(x => tokenHTML(x, p === x)).join('')}</div>`;
    div.onclick = () => onRoomTap(r.id);
    map.appendChild(div);
  });
}
/* game.js continues in part 3 */

/* ---------- human turn ---------- */
function humanTurn(p) {
  p._movesLeft = 2;
  renderGame(p);
  renderActions(p);
  tick(p.state === 'ghost'
    ? '👻 Ghost turn: tap a highlighted room to drift (2 moves), then do a task if you land on one.'
    : 'Tap a highlighted room to move (2 moves). Then pick one action below — or end your turn.');
}
function onRoomTap(roomId) {
  const p = currentPlayer();
  if (!p || !p.human || p._movesLeft === undefined || p._movesLeft <= 0) return;
  if (!adjacent(p.room, roomId)) { if (roomId !== p.room) toast('You can only move one room at a time.'); return; }
  p.room = roomId; p._movesLeft--; sfx.tap();
  maybeDiscover(p);
  renderGame(p); renderActions(p);
}
function maybeDiscover(p) {
  const found = G.players.find(x => x.room === p.room && x.state === 'tagged');
  if (found) tick(`😱 ${p.name} found ${found.name} slumped in the ${roomById(p.room).name}! Use the Report action to call a meeting.`);
}
function stationHere(p) { return G.stations.filter(s => s.room === p.room && !s.done); }
function renderActions(p) {
  const panel = $('#action-panel'); panel.innerHTML = '';
  const add = (label, cls, fn, disabled) => {
    const b = document.createElement('button');
    b.className = 'btn ' + (cls || ''); b.innerHTML = label; b.disabled = !!disabled;
    b.onclick = () => { fn(); };
    panel.appendChild(b); return b;
  };
  const ghost = p.state === 'ghost';
  const sts = stationHere(p);
  if (sts.length) {
    const s = sts[0];
    add(`✅ Do task: ${s.label}`, '', () => startTask(p, s, false));
    if (p.role === 'faker' && !ghost) add(`🎭 Fake the task: ${s.label}`, '', () => startTask(p, s, true));
  }
  if (!ghost) {
    if (p.role === 'faker') {
      const targets = alivePlayers().filter(x => x !== p && x.room === p.room && x.role !== 'faker');
      targets.forEach(t => add(`🕶️ Tag out ${t.name} (you're alone with them: ${G.players.filter(x => x.room === p.room && x.state === 'alive').length <= 2 ? 'yes' : 'NO — witnesses here!'})`, 'btn-danger', () => doTag(p, t)));
      if (!G.crisis && G.crisisCooldown === 0) {
        if (p.room === 'studio' || p.room === 'vault') add('💥 Start a CRISIS from this panel', 'btn-crisis', () => startCrisis(p));
        else add('💥 Crisis panels are in the Studio and the Vault', '', () => toast('Move to the Studio 🎙️ or the Vault 🔐 to start a crisis.'), true);
      }
      if (G.crisis && G.crisis.fixRooms.includes(p.room) && !G.crisis.fixed.has(p.room))
        add('🛠️ "Fix" the crisis here (pretend — actually fixes it, keeps your cover)', 'btn-fix', () => doFix(p));
    } else {
      if (G.crisis && G.crisis.fixRooms.includes(p.room) && !G.crisis.fixed.has(p.room))
        add('🛠️ Fix the crisis here!', 'btn-fix', () => doFix(p));
    }
    const found = G.players.find(x => x.room === p.room && x.state === 'tagged');
    if (found) add(`🚨 Report ${found.name} — call a meeting`, 'btn-danger', () => startMeeting(p, 'report', found));
    if (p.room === 'lobby' && (G.emergencyUsed[p.id] || 0) < 1)
      add('🔔 Emergency buzzer — call a meeting', '', () => { G.emergencyUsed[p.id] = 1; P.stats.meetingsCalled++; startMeeting(p, 'buzzer', null); });
  }
  add('⏭️ End turn', 'btn-ghost', () => { p._movesLeft = undefined; endTurn(); });
}

/* ---------- actions ---------- */
function witnessesOf(actor, room) {
  return G.players.filter(x => x !== actor && x.room === room && x.state === 'alive');
}
function doTag(actor, target) {
  target.state = 'tagged'; target.taggedAt = G.turnNo; target.taggedIn = actor.room; target.taggedBy = actor.id;
  const wits = witnessesOf(actor, actor.room).filter(x => x !== target);
  wits.forEach(w => {
    if (w.human) note(`${w.name} saw ${actor.name} tag out ${target.name} in the ${roomById(actor.room).name}!`);
    else if (w.trait === 'sharp' || Math.random() < 0.5) { w._sawTag = actor.id; note(`${w.name} was in the ${roomById(actor.room).name} when ${target.name} got tagged out.`); }
  });
  G.log.push({ type: 'tag', actor: actor.id, target: target.id, room: actor.room, turn: G.turnNo });
  if (target.isYou) P.stats.timesTagged++;
  $('#action-panel').innerHTML = '';
  if (wits.length === 0) note(`${target.name} was last seen heading toward the ${roomById(actor.room).name}.`);
  tick(`🕶️ ${target.name} has been tagged out… quietly. For now.`);
  sfx.bad();
  actor._movesLeft = undefined;
  later(endTurn, 900);
}
function startCrisis(actor) {
  const kinds = ['Sound system blown', 'Sprinkler fault', 'Power flicker — breaker tripped'];
  const fixRooms = shuffle(ROOMS.filter(r => r.id !== actor.room).map(r => r.id)).slice(0, 2);
  G.crisis = { kind: pick(kinds), turnsLeft: G.sc.crisisTurns, fixRooms, fixed: new Set(), by: actor.id };
  $('#action-panel').innerHTML = '';
  note(`A crisis started: "${G.crisis.kind}". The fix points are the ${fixRooms.map(r => roomById(r).name).join(' and the ')}.`);
  sfx.alarm();
  tick(`🚨 CRISIS! ${G.crisis.kind}! Fix it in the ${fixRooms.map(r => roomById(r).name).join(' and the ')} before the counter runs out!`);
  actor._movesLeft = undefined;
  renderGame(currentPlayer());
  later(endTurn, 1200);
}
function doFix(p) {
  $('#action-panel').innerHTML = '';
  G.crisis.fixed.add(p.room);
  note(`${p.name} fixed the crisis panel in the ${roomById(p.room).name}.`);
  if (G.crisis.fixed.size >= G.crisis.fixRooms.length) {
    note('The crisis was fixed in time.'); G.crisis = null; G.crisisCooldown = 4;
    tick('✅ Crisis fixed! The club breathes again.');
    sfx.good();
  } else tick(`🛠️ ${p.name} fixed one panel. One to go!`);
  p._movesLeft = undefined;
  renderGame(p);
  later(endTurn, 900);
}

/* ---------- task mini-games ---------- */
let taskCleanup = null;
function startTask(p, station, fake) {
  G.phase = 'task';
  show('task');
  $('#task-title').textContent = (fake ? '🎭 Faking: ' : '✅ Task: ') + station.label;
  $('#task-flavor').textContent = fake
    ? 'Look busy. If anyone is in the room with you, there is a chance they notice something is off…'
    : 'Finish it properly — the task bar only fills for real work.';
  const stage = $('#task-stage'); stage.innerHTML = '';
  if (taskCleanup) { taskCleanup(); taskCleanup = null; }
  const finish = success => {
    if (taskCleanup) { taskCleanup(); taskCleanup = null; }
    G.phase = 'play';
    show('game');
    if (fake) {
      const wits = witnessesOf(p, p.room);
      const caught = wits.length && Math.random() < 0.22;
      if (caught) {
        const w = pick(wits);
        note(`${w.name} watched ${p.name} at the ${station.label} station and something looked… off.`);
        tick('🎭 You faked it — but someone in the room squinted at you.');
      } else tick('🎭 You faked it. Nobody blinked.');
      sfx.tap();
    } else if (success) {
      station.done = true; G.tasksDone++;
      if (p.isYou) { P.stats.tasksDone++; G.stats.tasksByYou++; addXP(5); }
      note(`${p.name} finished "${station.label}" in the ${roomById(station.room).name}.`);
      tick(`✅ ${station.label} — done! Task bar: ${G.tasksDone}/${G.tasksNeeded}`);
      sfx.good();
    } else {
      tick('You stepped away — the task is still waiting.');
      sfx.tap();
    }
    p._movesLeft = undefined;
    renderGame(p);
    later(endTurn, 800);
  };
  $('#btn-task-quit').onclick = () => finish(false);
  if (fake) { runFakeTask(stage, () => finish(true)); return; }
  ({ tap: runTapTask, hold: runHoldTask, odd: runOddTask, slider: runSliderTask, memory: runMemoryTask })[station.type](stage, () => finish(true));
}
function runFakeTask(stage, done) {
  const msg = document.createElement('div'); msg.className = 'task-msg'; msg.textContent = 'Look busy… tap the station 3 times, slowly.';
  const b = document.createElement('button'); b.className = 'big-tap'; b.textContent = '🎭';
  let n = 0; b.onclick = () => { n++; sfx.tap(); b.textContent = ['🎭', '👀', '✨'][n - 1] || '✨'; if (n >= 3) done(); };
  stage.append(msg, b);
}
function runTapTask(stage, done) {
  const msg = document.createElement('div'); msg.className = 'task-msg'; msg.textContent = 'Tap the bell 6 times!';
  const b = document.createElement('button'); b.className = 'big-tap'; b.textContent = '🔔';
  let n = 0; b.onclick = () => { n++; sfx.tap(); msg.textContent = `Tap the bell 6 times! (${n}/6)`; if (n >= 6) done(); };
  stage.append(msg, b);
}
function runHoldTask(stage, done) {
  const msg = document.createElement('div'); msg.className = 'task-msg'; msg.textContent = 'Press and HOLD to charge it up.';
  const bar = document.createElement('div'); bar.className = 'holdbar';
  const fill = document.createElement('div'); fill.className = 'holdfill'; bar.appendChild(fill);
  const b = document.createElement('button'); b.className = 'btn btn-hero'; b.textContent = 'HOLD';
  let v = 0, iv = null;
  const start = e => { e.preventDefault(); if (iv) return; iv = setInterval(() => { v += 4; fill.style.width = v + '%'; if (v >= 100) { clearInterval(iv); iv = null; done(); } }, 50); };
  const stop = () => { if (iv) { clearInterval(iv); iv = null; } if (v < 100) { v = Math.max(0, v - 25); fill.style.width = v + '%'; } };
  b.addEventListener('pointerdown', start); b.addEventListener('pointerup', stop); b.addEventListener('pointerleave', stop);
  taskCleanup = () => { if (iv) clearInterval(iv); };
  stage.append(msg, bar, b);
}
function runOddTask(stage, done) {
  const msg = document.createElement('div'); msg.className = 'task-msg'; msg.textContent = 'One of these doesn\'t belong. Tap it!';
  const sets = [['🍎', '🍐', '🍊', '🚗'], ['🐶', '🐱', '🐭', '🍕'], ['⚽', '🏀', '🎾', '🍩'], ['🚕', '🚌', '🚲', '🐴']];
  const set = pick(sets); const oddIdx = 3;
  const grid = document.createElement('div'); grid.className = 'choice-grid';
  shuffle(set.map((e, i) => ({ e, odd: i === oddIdx }))).forEach(o => {
    const b = document.createElement('button'); b.className = 'choice'; b.textContent = o.e;
    b.onclick = () => { if (o.odd) { sfx.good(); done(); } else { sfx.bad(); msg.textContent = 'Nope — that one belongs. Try again!'; } };
    grid.appendChild(b);
  });
  stage.append(msg, grid);
}
function runSliderTask(stage, done) {
  const msg = document.createElement('div'); msg.className = 'task-msg'; msg.textContent = 'Stop the dial inside the green zone!';
  const zone = document.createElement('div'); zone.className = 'slider-zone';
  const z = document.createElement('div'); z.className = 'zone';
  const zl = 55 + rnd(30); z.style.left = zl + '%'; z.style.width = '16%'; zone.appendChild(z);
  const s = document.createElement('input'); s.type = 'range'; s.min = 0; s.max = 100; s.value = 0; s.className = 'task-slider';
  const b = document.createElement('button'); b.className = 'btn btn-hero'; b.textContent = 'Stop it here';
  b.onclick = () => { const v = +s.value; if (v >= zl && v <= zl + 16) { sfx.good(); done(); } else { sfx.bad(); msg.textContent = `So close — you stopped at ${v}. The green zone is still out there.`; } };
  stage.append(msg, zone, s, b);
}
function runMemoryTask(stage, done) {
  const msg = document.createElement('div'); msg.className = 'task-msg'; msg.textContent = 'Watch the lights…';
  const pad = document.createElement('div'); pad.className = 'flash-pad';
  const cols = ['#ff5a5a', '#ffc94d', '#37e0c8', '#8b46c7'];
  const cells = cols.map(c => { const b = document.createElement('button'); b.className = 'flash-cell'; b.style.background = c; pad.appendChild(b); return b; });
  const seq = [rnd(4), rnd(4), rnd(4)]; let step = 0, accepting = false;
  stage.append(msg, pad);
  let i = 0;
  const iv = setInterval(() => {
    cells.forEach(c => c.classList.remove('lit'));
    if (i < seq.length) { cells[seq[i]].classList.add('lit'); beep(440 + seq[i] * 120, .15); i++; }
    else { clearInterval(iv); setTimeout(() => cells.forEach(c => c.classList.remove('lit')), 250); accepting = true; msg.textContent = 'Now repeat the sequence!'; }
  }, 480);
  taskCleanup = () => clearInterval(iv);
  cells.forEach((c, idx) => c.onclick = () => {
    if (!accepting) return;
    c.classList.add('lit'); setTimeout(() => c.classList.remove('lit'), 180); beep(440 + idx * 120, .1);
    if (idx === seq[step]) { step++; if (step >= seq.length) { accepting = false; sfx.good(); done(); } }
    else { step = 0; sfx.bad(); msg.textContent = 'Wrong light — start the sequence over.'; }
  });
}
/* game.js continues in part 4 */

/* ---------- meetings & voting ---------- */
function startMeeting(caller, why, foundBody) {
  G.phase = 'meeting';
  sfx.alarm();
  if (foundBody) { foundBody.reported = true; foundBody.state = 'ghost'; note(`${caller.name} reported ${foundBody.name} in the ${roomById(foundBody.room).name}. ${foundBody.name} is now a ghost — they can still finish tasks.`); }
  else note(`${caller.name} hit the emergency buzzer in the Lobby.`);
  G.meeting = { caller: caller.id, why, votes: {}, voters: alivePlayers().slice() };
  show('meeting');
  $('#meeting-why').textContent = why === 'report'
    ? `${caller.name} found ${foundBody.name} tagged out in the ${roomById(foundBody.room).name} and called everyone in.`
    : `${caller.name} hit the emergency buzzer. Time to compare notes.`;
  const cf = $('#case-file');
  cf.innerHTML = G.caseNotes.length
    ? '<ul>' + G.caseNotes.slice(-10).map(n => `<li>${n.text}</li>`).join('') + '</ul>'
    : '<ul><li>No notes yet. Nobody has seen anything — or nobody is saying.</li></ul>';
  const stage = $('#meeting-stage'); stage.innerHTML = '';
  // bot table-talk: bots speak from their actual knowledge
  if (P.settings.chatter) {
    const talkers = shuffle(alivePlayers().filter(p => !p.human)).slice(0, 3);
    talkers.forEach(bot => {
      const line = botChatter(bot);
      if (line) { const d = document.createElement('div'); d.className = 'chatter'; d.innerHTML = `<b>${bot.name}:</b> `; d.append(document.createTextNode(line)); stage.appendChild(d); }
    });
  }
  const go = document.createElement('button'); go.className = 'btn btn-hero'; go.textContent = '🗳️ Start the vote';
  go.onclick = () => runVote(0);
  stage.appendChild(go);
  renderGame(caller);
}
function botChatter(bot) {
  // a bot that witnessed a tag says so (fakers lie low)
  const tagEvent = G.log.filter(e => e.type === 'tag').slice(-1)[0];
  if (bot._sawTag && bot._sawTag !== bot.id) {
    const culprit = playerById(bot._sawTag);
    if (culprit && Math.random() < 0.85) return `I was right there — I saw ${culprit.name} do it. Vote ${culprit.name}.`;
  }
  if (bot.role === 'faker') {
    const others = alivePlayers().filter(p => p !== bot && p.role !== 'faker');
    const target = others.length ? pick(others) : null;
    const lines = [
      target ? `${target.name} has been very quiet around the tasks. Just saying.` : 'I\'ve been doing tasks the whole time, ask anyone.',
      'I was nowhere near anything. I keep to the tasks.',
      target ? `Has anyone actually seen ${target.name} finish a task? Anyone?` : 'This is wasting task time.',
    ];
    return pick(lines);
  }
  if (tagEvent) {
    const t = playerById(tagEvent.target);
    return `${t.name} was fine not long ago. Whoever did it was close by — think about who you saw near the ${roomById(tagEvent.room).name}.`;
  }
  return pick([
    'Let\'s not throw an honest clubmate out on a hunch.',
    'I finished two tasks already. Check the bar — it\'s moving because of people like me.',
    'Whoever the fakers are, they\'re in this room sweating right now.',
  ]);
}
function suspicionScores() {
  // bots reason from the public record: proximity to tags, fake-task tells, crisis timing
  const scores = {};
  alivePlayers().forEach(p => scores[p.id] = Math.random() * 0.6);
  G.log.filter(e => e.type === 'tag').forEach(e => {
    const victim = playerById(e.target);
    G.players.forEach(p => {
      if (p.state === 'alive' && p.id !== e.actor && p.id !== e.target) {
        // anyone whose recent rooms overlap the tag room gets a little heat — the actor gets more, applied via sawTag below
      }
    });
    if (victim) scores[e.actor] = (scores[e.actor] || 0) + 0.0; // actor unknown publicly
  });
  G.caseNotes.forEach(n => {
    G.players.forEach(p => { if (n.text.includes('looked… off') && n.text.includes(p.name)) scores[p.id] = (scores[p.id] || 0) + 1.6; });
  });
  return scores;
}
function runVote(idx) {
  const stage = $('#meeting-stage');
  const voters = G.meeting.voters.filter(v => v.state !== 'out');
  if (idx >= voters.length) { tallyVotes(); return; }
  const v = voters[idx];
  if (!v.human) {
    // bot vote: fakers protect their own; members vote their suspicion; witnesses vote what they saw
    let choice = 'skip';
    if (v._sawTag) choice = v._sawTag;
    else if (v.role === 'faker') {
      const targets = alivePlayers().filter(p => p.role !== 'faker');
      choice = targets.length && Math.random() < 0.8 ? pick(targets).id : 'skip';
    } else {
      const sc = suspicionScores();
      let best = null, bs = 0.9;
      alivePlayers().forEach(p => { if (p !== v && (sc[p.id] || 0) > bs) { bs = sc[p.id]; best = p.id; } });
      choice = best || (Math.random() < 0.3 ? 'skip' : (pick(alivePlayers().filter(p => p !== v)) || {}).id || 'skip');
    }
    G.meeting.votes[v.id] = choice;
    runVote(idx + 1);
    return;
  }
  passGate(`${v.name}, your vote`, 'Nobody else look. Vote for who you think is faking it — or skip.', '🗳️', () => {
    show('meeting');
    stage.innerHTML = `<p class="hint">${v.name} is voting… (${idx + 1} of ${voters.length})</p>`;
    const grid = document.createElement('div'); grid.className = 'vote-grid';
    alivePlayers().forEach(p => {
      const b = document.createElement('button'); b.className = 'vote-btn';
      b.innerHTML = avatarHTML(p.colorId, p.hatId, p.face, p.state === 'ghost') + `<span></span>`;
      b.querySelector('span').textContent = p.name + (p === v ? ' (you)' : '') + (p.state === 'ghost' ? ' — ghost' : '');
      b.disabled = p === v;
      b.onclick = () => { G.meeting.votes[v.id] = p.id; sfx.tap(); runVote(idx + 1); };
      grid.appendChild(b);
    });
    const skip = document.createElement('button'); skip.className = 'btn btn-ghost'; skip.textContent = '⏭️ Skip — vote nobody out';
    skip.onclick = () => { G.meeting.votes[v.id] = 'skip'; runVote(idx + 1); };
    stage.append(grid, skip);
  });
}
function tallyVotes() {
  const stage = $('#meeting-stage');
  const counts = {};
  Object.entries(G.meeting.votes).forEach(([voter, choice]) => {
    if (choice !== 'skip') counts[choice] = (counts[choice] || 0) + 1;
  });
  const skips = Object.values(G.meeting.votes).filter(c => c === 'skip').length;
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  let resultHTML = '';
  let ejected = null;
  if (top.length && top[0][1] > skips && (top.length === 1 || top[0][1] > top[1][1])) {
    ejected = playerById(top[0][0]);
  }
  if (ejected) {
    ejected.state = 'out';
    const wasFaker = ejected.role === 'faker';
    // credit humans who voted correctly
    Object.entries(G.meeting.votes).forEach(([voter, choice]) => {
      const v = playerById(voter);
      if (v && v.isYou && choice === ejected.id && wasFaker) { P.stats.correctVotes++; addXP(10); }
    });
    note(`The club voted out ${ejected.name}${G.sc.confirmEjects ? ` — they were one of the ${wasFaker ? G.sc.fakerName : G.sc.memberName}.` : '.'}`);
    resultHTML = `The club votes out <b>${ejected.name}</b> (${top[0][1]} votes).` +
      (G.sc.confirmEjects
        ? (wasFaker ? `<br>🕶️ They WERE one of the ${G.sc.fakerName}!` : `<br>💔 They were an honest member of the ${G.sc.memberName}. The ${G.sc.fakerName} are still out there.`)
        : '<br>Their side stays a secret.');
    wasFaker ? sfx.good() : sfx.bad();
  } else {
    note('The vote ended with nobody ejected (tie or skip).');
    resultHTML = 'No one is voted out — ' + (skips >= (top[0] ? top[0][1] : 0) ? 'the club chose to skip.' : 'the vote tied.') + ' The night goes on…';
    sfx.tap();
  }
  stage.innerHTML = `<div class="result-line">${resultHTML}</div>`;
  const back = document.createElement('button'); back.className = 'btn btn-hero'; back.textContent = 'Back to the clubhouse floor';
  back.onclick = () => {
    G.phase = 'play'; save();
    checkWin();
    if (!G.over) { show('game'); G.turnIdx++; nextTurn(); }
  };
  stage.appendChild(back);
  renderGame(currentPlayer());
}

/* ---------- bots ---------- */
function botTurn(p) {
  if (G.over) return;
  const ghost = p.state === 'ghost';
  const say = t => tick(t);
  // 1) crisis first for honest bots
  if (G.crisis && !ghost && p.role === 'member' && Math.random() < 0.85) {
    const need = G.crisis.fixRooms.find(r => !G.crisis.fixed.has(r));
    if (need) {
      moveBotToward(p, need, 2);
      if (p.room === need) { doFix(p); return; }
      say(`${p.face} ${p.name} is racing to fix the crisis.`); renderGame(p);
      return endTurn();
    }
  }
  if (p.role === 'faker' && !ghost) return botFakerTurn(p);
  // honest bot standing on an unreported tag-out reports it first
  const foundBody = G.players.find(x => x.room === p.room && x.state === 'tagged');
  if (foundBody && !ghost) { say(`${p.face} ${p.name} found ${foundBody.name}!`); renderGame(p); return startMeeting(p, 'report', foundBody); }
  // honest / ghost bot: go do a task
  const open = G.stations.filter(s => !s.done);
  if (open.length) {
    const target = open.reduce((a, b) => roomDist(p.room, a.room) <= roomDist(p.room, b.room) ? a : b);
    moveBotToward(p, target.room, 2);
    const here = G.stations.find(s => s.room === p.room && !s.done);
    if (here) {
      here.done = true; G.tasksDone++;
      note(`${p.name} finished "${here.label}" in the ${roomById(here.room).name}.`);
      say(`${p.face} ${p.name} finished a task: ${here.label}.`);
      renderGame(p);
      return endTurn();
    }
  }
  // report a body if standing on one
  const body = G.players.find(x => x.room === p.room && x.state === 'tagged');
  if (body && !ghost) { say(`${p.face} ${p.name} found ${body.name}!`); renderGame(p); return startMeeting(p, 'report', body); }
  moveBotToward(p, pick(ROOMS).id, 2);
  say(`${p.face} ${p.name} is looking around the club.`);
  renderGame(p);
  endTurn();
}
function moveBotToward(p, dest, steps) {
  for (let i = 0; i < steps && p.room !== dest; i++) {
    p.room = stepToward(p.room, dest);
    maybeDiscover(p);
  }
}
function botFakerTurn(p) {
  // tag opportunity: alone with exactly one member (or desperate)
  const roommates = alivePlayers().filter(x => x !== p && x.room === p.room);
  const memberHere = roommates.filter(x => x.role === 'member');
  const witnesses = roommates.length - memberHere.length;
  if (memberHere.length && witnesses === 0 && roommates.length === 1) { doTag(p, memberHere[0]); return; }
  if (memberHere.length && witnesses === 0 && Math.random() < 0.45) { doTag(p, memberHere[0]); return; }
  // start a crisis from a panel room when the math is friendly
  if (!G.crisis && G.crisisCooldown === 0 && (p.room === 'studio' || p.room === 'vault')) {
    const f = aliveOf('faker').length, m = aliveOf('member').length;
    if (f >= m - 1 || Math.random() < 0.4) { startCrisis(p); return; }
  }
  // drift toward a lone member, or blend at a station
  const lone = alivePlayers().filter(x => x.role === 'member' && G.players.filter(y => y.room === x.room && y.state === 'alive').length === 1);
  if (lone.length && Math.random() < 0.75) {
    moveBotToward(p, pick(lone).room, 2);
    const rm = alivePlayers().filter(x => x !== p && x.room === p.room && x.role === 'member');
    const w = alivePlayers().filter(x => x !== p && x.room === p.room).length - rm.length;
    if (rm.length && w === 0) { doTag(p, rm[0]); return; }
  } else {
    const open = G.stations.filter(s => !s.done);
    if (open.length) moveBotToward(p, pick(open).room, 2);
    else moveBotToward(p, pick(ROOMS).id, 2);
  }
  const here = G.stations.find(s => s.room === p.room && !s.done);
  if (here) {
    const wits = witnessesOf(p, p.room);
    if (wits.length && Math.random() < 0.22) note(`${pick(wits).name} watched ${p.name} at the ${here.label} station and something looked… off.`);
    tick(`🎭 ${p.name} looks busy at the ${here.label} station…`);
  } else tick(`${p.face} ${p.name} is drifting through the ${roomById(p.room).name}.`);
  renderGame(p);
  endTurn();
}

/* ---------- end of round ---------- */
function endGame(winner, sub) {
  G.over = true; G.winner = winner;
  show('end');
  const you = G.players.find(p => p.isYou);
  const youWon = you && ((winner === 'member' && you.role === 'member') || (winner === 'faker' && you.role === 'faker'));
  $('#end-emoji').textContent = winner === 'member' ? '🎉' : '🕶️';
  $('#end-title').textContent = winner === 'member' ? `The ${G.sc.memberName} win!` : `The ${G.sc.fakerName} take the club!`;
  $('#end-sub').textContent = sub;
  $('#end-roles').innerHTML = G.players.map(p =>
    `<div class="row">${avatarHTML(p.colorId, p.hatId, p.face, p.state !== 'alive')}<span class="who"></span><span class="tag ${p.role}">${p.role === 'faker' ? G.sc.fakerName : G.sc.memberName}</span>${p.state === 'out' ? '<span class="tag out">voted out</span>' : ''}</div>`
  ).join('');
  Array.from($('#end-roles').querySelectorAll('.who')).forEach((el, i) => el.textContent = G.players[i].name + (G.players[i].human ? '' : ' (bot)') + (G.players[i].isYou ? ' — you' : ''));
  // rewards for the device owner (seat 1 human)
  let xp = 20, coins = 10;
  if (youWon) { xp += you.role === 'faker' ? 100 : 80; coins += you.role === 'faker' ? 50 : 40; }
  xp += G.stats.tasksByYou * 5;
  P.stats.games++;
  if (youWon && you) { if (you.role === 'faker') P.stats.fakerWins++; else P.stats.memberWins++; }
  addXP(xp); addCoins(coins);
  $('#end-rewards').textContent = `You earned +${xp} XP and +🪙${coins} Club Coins${youWon ? ' — nice win!' : ''}`;
  save(); sfx.coin();
}
/* game.js continues in part 5 */

/* ---------- studio ---------- */
function renderStudio() {
  const list = $('#studio-list'); list.innerHTML = '';
  if (!P.scenarios.length) list.innerHTML = '<p class="hint">No custom scenarios yet — your creations land here.</p>';
  P.scenarios.forEach((sc, i) => {
    const d = document.createElement('div'); d.className = 'studio-item';
    d.innerHTML = `<span class="nm"></span>`;
    d.querySelector('.nm').textContent = `${sc.name} — ${sc.memberName} vs ${sc.fakerName}`;
    const x = document.createElement('button'); x.textContent = '🗑️'; x.title = 'Delete scenario';
    x.onclick = () => { P.scenarios.splice(i, 1); save(); renderStudio(); if (lobby.scenarioId === sc.id) lobby.scenarioId = 'classic'; };
    d.appendChild(x); list.appendChild(d);
  });
  $('#st-fakers-out').textContent = $('#st-fakers-range').value;
  const tm = { 1: 'Light', 2: 'Normal', 3: 'Heavy' };
  $('#st-tasks-out').textContent = tm[$('#st-tasks-range').value];
  $('#st-crisis-out').textContent = $('#st-crisis-range').value;
}

/* ---------- closet ---------- */
function renderCloset() {
  $('#closet-coins').textContent = P.coins;
  $('#closet-avatar').outerHTML = avatarHTML(P.colorId, P.hatId, '🙂', false).replace('class="avatar', 'class="avatar big').replace('id=', 'data-x=').replace('<div', '<div id="closet-avatar"');
  const grid = (el, items, owned, equippedId, onPick, renderSwatch) => {
    const g = $(el); g.innerHTML = '';
    items.forEach(it => {
      const d = document.createElement('div');
      d.className = 'shop-item' + (equippedId === it.id ? ' equipped' : '') + (owned.includes(it.id) ? '' : ' locked');
      d.innerHTML = `<div class="swatch">${renderSwatch(it)}</div><div class="nm">${it.name}</div><div class="pr">${equippedId === it.id ? 'On you' : owned.includes(it.id) ? 'Owned' : '🪙 ' + it.price}</div>`;
      d.onclick = () => onPick(it);
      g.appendChild(d);
    });
  };
  const buyOrEquip = (it, owned, equip) => {
    if (owned.includes(it.id)) { equip(it.id); sfx.tap(); }
    else if (P.coins >= it.price) { P.coins -= it.price; owned.push(it.id); equip(it.id); sfx.coin(); toast(`Unlocked: ${it.name}!`); }
    else { sfx.bad(); toast(`You need 🪙 ${it.price - P.coins} more coins for ${it.name}. Win rounds to earn them.`); return; }
    save(); renderCloset(); renderHub();
  };
  grid('#shop-colors', COLORS, P.ownedColors, P.colorId, it => buyOrEquip(it, P.ownedColors, id => P.colorId = id),
    it => `<span style="width:100%;height:100%;border-radius:50%;background:${it.hex};display:block"></span>`);
  grid('#shop-hats', HATS, P.ownedHats, P.hatId, it => buyOrEquip(it, P.ownedHats, id => P.hatId = id),
    it => it.emoji || '🚫');
  grid('#shop-decor', DECOR, P.ownedDecor, null, it => {
    if (P.ownedDecor.includes(it.id)) { toast('Already in the clubhouse.'); return; }
    buyOrEquip(it, P.ownedDecor, () => {});
  }, it => it.emoji);
}

/* ---------- stats ---------- */
function renderStats() {
  const s = P.stats;
  const rows = [
    [s.games, 'Rounds played'], [s.memberWins + s.fakerWins, 'Rounds won'],
    [s.memberWins, 'Wins as the honest side'], [s.fakerWins, 'Wins as a Faker'],
    [s.tasksDone, 'Tasks finished'], [s.correctVotes, 'Fakers caught by your vote'],
    [s.meetingsCalled, 'Meetings you called'], [levelOf(P.xp), 'Club level'],
  ];
  $('#stat-grid').innerHTML = rows.map(([n, l]) => `<div class="stat-box"><div class="num">${n}</div><div class="lbl">${l}</div></div>`).join('');
}

/* ---------- wiring ---------- */
function goHub() { renderHub(); show('hub'); }
$$('[data-nav="hub"]').forEach(b => b.onclick = goHub);
$('#btn-play').onclick = () => { renderLobby(); show('lobby'); };
$('#btn-studio').onclick = () => { renderStudio(); show('studio'); };
$('#btn-closet').onclick = () => { renderCloset(); show('closet'); };
$('#btn-stats').onclick = () => { renderStats(); show('stats'); };
$('#btn-howto').onclick = () => show('howto');
$('#btn-settings').onclick = () => {
  $('#set-name').value = P.name;
  $('#set-sound').checked = P.settings.sound;
  $('#set-chatter').checked = P.settings.chatter;
  show('settings');
};
$('#btn-save-settings').onclick = () => {
  const n = $('#set-name').value.trim();
  if (n) P.name = n;
  P.settings.sound = $('#set-sound').checked;
  P.settings.chatter = $('#set-chatter').checked;
  save(); toast('Saved.'); goHub();
};
$('#seats-range').addEventListener('input', e => { lobby.seats = +e.target.value; renderLobby(); });
$('#btn-add-human').onclick = () => {
  const inp = $('#human-name');
  const name = inp.value.trim();
  if (!name) { toast('Type a name first.'); return; }
  if (lobby.humans.length >= lobby.seats) { toast('The table is full — raise the seat count or remove someone.'); return; }
  const usedFaces = lobby.humans.map(h => h.face);
  lobby.humans.push({ name, face: FACES.find(f => !usedFaces.includes(f)) || '🙂', colorId: COLORS[lobby.humans.length % COLORS.length].id });
  inp.value = ''; renderLobby();
};
$('#human-name').addEventListener('keydown', e => { if (e.key === 'Enter') $('#btn-add-human').click(); });
$('#btn-deal').onclick = () => {
  if (!lobby.humans.length) lobby.humans.push({ name: P.name, face: '🙂', colorId: P.colorId });
  if (lobby.humans.length > lobby.seats) { toast('More people than seats — raise the seat count.'); return; }
  newGame();
  G.phase = 'reveal';
  sfx.good();
  startReveal();
};
$('#btn-again').onclick = () => { renderLobby(); show('lobby'); };
$('#btn-tohub').onclick = goHub;
['st-fakers-range', 'st-tasks-range', 'st-crisis-range'].forEach(id => $('#' + id).addEventListener('input', renderStudio));
$('#btn-save-scenario').onclick = () => {
  const name = $('#st-name').value.trim(), members = $('#st-members').value.trim(), fakers = $('#st-fakers').value.trim();
  if (!name || !members || !fakers) { toast('Give the scenario a name and name both sides.'); return; }
  if (P.scenarios.length >= 6) { toast('Six custom scenarios max — delete one to make room.'); return; }
  P.scenarios.push({
    id: 'custom-' + Date.now(), name, memberName: members, fakerName: fakers,
    fakers: +$('#st-fakers-range').value, taskMult: +$('#st-tasks-range').value,
    crisisTurns: +$('#st-crisis-range').value, confirmEjects: $('#st-confirm').checked,
    flavor: $('#st-flavor').value.trim() || 'A custom night at the club, written by you.',
  });
  save(); sfx.good(); toast('Scenario saved — find it in the lobby.');
  $('#st-name').value = $('#st-members').value = $('#st-fakers').value = $('#st-flavor').value = '';
  renderStudio();
};
$('#btn-wipe').onclick = () => {
  if (confirm('Erase your whole Fake It Club profile — coins, closet, scenarios, stats? This cannot be undone.')) {
    localStorage.removeItem(SAVE_KEY); P = defaultSave(); save(); toast('Fresh start. Welcome to the club.'); goHub();
  }
};

/* seed the owner's name into the lobby the first time */
if (!lobby.humans.length) lobby.humans.push({ name: P.name, face: '🙂', colorId: P.colorId });
renderHub();
