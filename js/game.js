import {
  createBoard, makeWall, makeHome, makeLettuce, makeTurtle,
  makeTear, makeStar, turtleCenter,
  positionTurtle, commandIcon, TILE, GRID
} from './svg.js';
import {
  parseCommands, describeCommandHebrew, DIRECTION_VECTORS
} from './parser.js';
import {
  isSupported, startRecognition, stopRecognition,
  speak, cancelSpeech
} from './speech.js';

const LEVELS = [
  {
    name: 'tutorial',
    rows: [
      '......',
      '......',
      '......',
      '..L...',
      '..T...',
      '......'
    ],
    facing: 'up'
  },
  {
    name: 'level-1',
    rows: [
      '......',
      '......',
      '..L...',
      '......',
      '......',
      '..T...'
    ],
    facing: 'up'
  },
  {
    name: 'level-2',
    rows: [
      '......',
      '....L.',
      '......',
      '......',
      '.T....',
      '......'
    ],
    facing: 'up'
  },
  {
    name: 'level-3',
    rows: [
      '.....L',
      '......',
      'WWWWW.',
      '......',
      '......',
      'T.....'
    ],
    facing: 'up'
  },
  {
    name: 'level-4',
    rows: [
      '......',
      '..L...',
      '.WWW..',
      '.W.W..',
      '.W.W..',
      '.....T'
    ],
    facing: 'up'
  }
];

const state = {
  levelIndex: 0,
  turtle: null,
  start: null,
  lettuce: null,
  walls: null,
  queue: [],
  phase: 'idle',
  boardSvg: null,
  turtleEl: null,
  lettuceEl: null
};

const els = {};

let audioCtx = null;
function ac() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function thud() {
  const c = ac();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(80, c.currentTime);
  gain.gain.setValueAtTime(0.5, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.12);
}

function crunch() {
  const c = ac();
  const dur = 0.15;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1800;
  filter.Q.value = 1;
  const gain = c.createGain();
  gain.gain.value = 0.4;
  src.connect(filter).connect(gain).connect(c.destination);
  src.start();
}

function victory() {
  const c = ac();
  const notes = [523, 659, 784, 1047];
  notes.forEach((f, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'triangle';
    osc.frequency.value = f;
    const t = c.currentTime + i * 0.12;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  });
}

function sadSound() {
  const c = ac();
  const notes = [{ start: 520, end: 330 }, { start: 440, end: 260 }];
  notes.forEach((n, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'triangle';
    const t = c.currentTime + i * 0.38;
    osc.frequency.setValueAtTime(n.start, t);
    osc.frequency.exponentialRampToValueAtTime(n.end, t + 0.34);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.28, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.36);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.45);
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

const FACING_DEG = { up: 0, right: 90, down: 180, left: 270 };

function shortestDelta(fromDeg, toDeg) {
  let d = toDeg - fromDeg;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

function setTurtleTransform(x, y, deg) {
  const cx = x * TILE + TILE / 2;
  const cy = y * TILE + TILE / 2;
  state.turtleEl.setAttribute('transform', `translate(${cx} ${cy}) rotate(${deg})`);
}

function animateRotate(newFacing, duration) {
  const startDeg = FACING_DEG[state.turtle.facing];
  const endDeg = FACING_DEG[newFacing];
  const delta = shortestDelta(startDeg, endDeg);
  if (delta === 0) { state.turtle.facing = newFacing; return Promise.resolve(); }
  const startTime = performance.now();
  return new Promise(resolve => {
    function frame(t) {
      const elapsed = t - startTime;
      const p = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - p, 2);
      setTurtleTransform(state.turtle.x, state.turtle.y, startDeg + delta * ease);
      if (p < 1) requestAnimationFrame(frame);
      else {
        state.turtle.facing = newFacing;
        setTurtleTransform(state.turtle.x, state.turtle.y, endDeg);
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });
}

function animateMove(toX, toY, duration) {
  const startX = state.turtle.x;
  const startY = state.turtle.y;
  const deg = FACING_DEG[state.turtle.facing];
  const startTime = performance.now();
  return new Promise(resolve => {
    function frame(t) {
      const elapsed = t - startTime;
      const p = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - p, 2);
      const x = startX + (toX - startX) * ease;
      const y = startY + (toY - startY) * ease;
      setTurtleTransform(x, y, deg);
      if (p < 1) requestAnimationFrame(frame);
      else {
        state.turtle.x = toX;
        state.turtle.y = toY;
        setTurtleTransform(toX, toY, deg);
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });
}

function bumpIntoWall(dir, duration) {
  const startX = state.turtle.x;
  const startY = state.turtle.y;
  const deg = FACING_DEG[state.turtle.facing];
  const v = DIRECTION_VECTORS[dir];
  const startTime = performance.now();
  return new Promise(resolve => {
    function frame(t) {
      const elapsed = t - startTime;
      const p = Math.min(elapsed / duration, 1);
      const nudge = Math.sin(p * Math.PI) * 0.25;
      const x = startX + v.dx * nudge;
      const y = startY + v.dy * nudge;
      setTurtleTransform(x, y, deg);
      if (p < 1) requestAnimationFrame(frame);
      else { setTurtleTransform(startX, startY, deg); resolve(); }
    }
    requestAnimationFrame(frame);
  });
}

function dizzyWobble(duration) {
  const { cx, cy } = turtleCenter(state.turtle.x, state.turtle.y);
  const baseDeg = FACING_DEG[state.turtle.facing];
  const startTime = performance.now();
  return new Promise(resolve => {
    function frame(t) {
      const elapsed = t - startTime;
      const p = Math.min(elapsed / duration, 1);
      const sway = Math.sin(p * Math.PI * 5) * 5 * (1 - p * 0.6);
      state.turtleEl.setAttribute(
        'transform',
        `translate(${cx} ${cy}) rotate(${baseDeg + sway})`
      );
      if (p < 1) requestAnimationFrame(frame);
      else {
        setTurtleTransform(state.turtle.x, state.turtle.y, baseDeg);
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });
}

function dizzyStars(duration) {
  const { cx, cy } = turtleCenter(state.turtle.x, state.turtle.y);
  const orbitY = cy - 14;
  const rx = 30;
  const ry = 12;
  const numStars = 4;
  const stars = [];
  for (let i = 0; i < numStars; i++) {
    const s = makeStar();
    state.boardSvg.appendChild(s);
    stars.push({ el: s, phase: (i / numStars) * Math.PI * 2 });
  }
  const rotations = 2.2;
  const startTime = performance.now();
  return new Promise(resolve => {
    function frame(t) {
      const elapsed = t - startTime;
      const p = Math.min(elapsed / duration, 1);
      const theta = p * Math.PI * 2 * rotations;
      const popIn = Math.min(p * 4, 1);
      const fadeOut = p < 0.8 ? 1 : 1 - (p - 0.8) / 0.2;
      const opacity = popIn * fadeOut;
      for (const s of stars) {
        const angle = theta + s.phase;
        const x = cx + Math.cos(angle) * rx;
        const y = orbitY + Math.sin(angle) * ry;
        const depth = (Math.sin(angle) + 1) / 2;
        const scale = 0.7 + 0.35 * depth;
        const spin = angle * 40;
        s.el.setAttribute('transform', `translate(${x} ${y}) rotate(${spin}) scale(${scale})`);
        s.el.setAttribute('opacity', opacity);
      }
      if (p < 1) requestAnimationFrame(frame);
      else {
        for (const s of stars) s.el.remove();
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });
}

function wobbleTurtle(duration) {
  const { cx, cy } = turtleCenter(state.turtle.x, state.turtle.y);
  const baseDeg = { up: 0, right: 90, down: 180, left: 270 }[state.turtle.facing];
  const startTime = performance.now();
  return new Promise(resolve => {
    function frame(t) {
      const elapsed = t - startTime;
      const p = Math.min(elapsed / duration, 1);
      const wobble = Math.sin(p * Math.PI * 10) * 9 * (1 - p);
      state.turtleEl.setAttribute(
        'transform',
        `translate(${cx} ${cy}) rotate(${baseDeg + wobble})`
      );
      if (p < 1) requestAnimationFrame(frame);
      else {
        positionTurtle(state.turtleEl, state.turtle.x, state.turtle.y, state.turtle.facing);
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });
}

function dropTear(offsetX, delayMs, duration) {
  return new Promise(resolve => {
    setTimeout(() => {
      const { cx, cy } = turtleCenter(state.turtle.x, state.turtle.y);
      const tear = makeTear();
      state.boardSvg.appendChild(tear);
      const startX = cx + offsetX;
      const startY = cy - 18;
      const endY = startY + 56;
      const startTime = performance.now();
      function frame(t) {
        const elapsed = t - startTime;
        const p = Math.min(elapsed / duration, 1);
        const ease = p * p;
        const y = startY + (endY - startY) * ease;
        const scale = 0.4 + 0.6 * Math.min(p * 2, 1);
        const opacity = p < 0.8 ? 1 : 1 - (p - 0.8) / 0.2;
        tear.setAttribute('transform', `translate(${startX} ${y}) scale(${scale})`);
        tear.setAttribute('opacity', opacity);
        if (p < 1) requestAnimationFrame(frame);
        else { tear.remove(); resolve(); }
      }
      requestAnimationFrame(frame);
    }, delayMs);
  });
}

async function sadTurtle() {
  sadSound();
  speak('אוי, לא הגענו לחסה. בוא ננסה שוב.');
  await Promise.all([
    wobbleTurtle(1800),
    dropTear(-10, 150, 1100),
    dropTear(10,  450, 1100),
    dropTear(-8,  900, 1000)
  ]);
  await sleep(300);
}

function resetTurtleToStart() {
  const level = LEVELS[state.levelIndex];
  state.turtle = { x: state.start.x, y: state.start.y, facing: level.facing };
  positionTurtle(state.turtleEl, state.turtle.x, state.turtle.y, state.turtle.facing);
}

function parseLevel(level) {
  const walls = [];
  let start = null;
  let lettuce = null;
  for (let y = 0; y < level.rows.length; y++) {
    const row = level.rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === 'W') walls.push({ x, y });
      else if (ch === 'T') start = { x, y };
      else if (ch === 'L') lettuce = { x, y };
    }
  }
  return { walls, start, lettuce };
}

function loadLevel(index) {
  state.levelIndex = index;
  const level = LEVELS[index];
  const parsed = parseLevel(level);
  state.start = parsed.start;
  state.lettuce = parsed.lettuce;
  state.walls = parsed.walls;
  state.turtle = { ...parsed.start, facing: level.facing };
  state.queue = [];
  state.phase = 'idle';

  els.board.innerHTML = '';
  els.log.innerHTML = '';

  state.boardSvg = createBoard(els.board);
  state.boardSvg.appendChild(makeHome(state.start.x, state.start.y));
  state.lettuceEl = makeLettuce(state.lettuce.x, state.lettuce.y);
  state.boardSvg.appendChild(state.lettuceEl);
  for (const w of state.walls) {
    state.boardSvg.appendChild(makeWall(w.x, w.y));
  }
  state.turtleEl = makeTurtle();
  state.boardSvg.appendChild(state.turtleEl);
  positionTurtle(state.turtleEl, state.turtle.x, state.turtle.y, state.turtle.facing);

  els.levelLabel.textContent = index === 0 ? '🎓' : `${index}`;
}

function isWall(x, y) {
  return state.walls.some(w => w.x === x && w.y === y);
}
function inBounds(x, y) {
  return x >= 0 && x < GRID && y >= 0 && y < GRID;
}
function isLettuce(x, y) {
  return state.lettuce && state.lettuce.x === x && state.lettuce.y === y;
}

function setPulse(target, on) {
  if (on) target.classList.add('pulse');
  else target.classList.remove('pulse');
}

function setRecording(on) {
  if (on) els.mic.classList.add('recording');
  else els.mic.classList.remove('recording');
}

function enqueueIcon(cmd) {
  state.queue.push(cmd);
  els.log.appendChild(commandIcon(cmd.direction, cmd.count));
}

function clearQueueUI() {
  state.queue = [];
  els.log.innerHTML = '';
}

async function onMicClick() {
  if (state.phase === 'executing') return;
  if (!isSupported()) return;
  cancelSpeech();
  setPulse(els.mic, false);
  setPulse(els.go, false);
  setRecording(true);
  state.phase = 'recording';
  startRecognition({
    onResult: handleTranscript,
    onEnd: () => {
      setRecording(false);
    },
    onError: async () => {
      setRecording(false);
      await speak('לא הבנתי, אפשר לנסות שוב?');
    }
  });
}

async function handleTranscript(transcript) {
  const cmds = parseCommands(transcript);
  if (cmds.length === 0) {
    await speak('לא הבנתי, אפשר לנסות שוב?');
    return;
  }
  for (const cmd of cmds) {
    await speak(describeCommandHebrew(cmd));
    enqueueIcon(cmd);
  }
  if (state.levelIndex === 0) {
    await speak('יופי! עכשיו לחץ על כפתור קדימה.');
  }
  setPulse(els.go, true);
}

async function onGoClick() {
  if (state.phase === 'executing') return;
  if (state.queue.length === 0) return;
  setPulse(els.go, false);
  setPulse(els.mic, false);
  state.phase = 'executing';
  await executeQueue();
  state.phase = 'idle';
}

async function executeQueue() {
  for (const cmd of state.queue) {
    const vec = DIRECTION_VECTORS[cmd.direction];
    if (state.turtle.facing !== cmd.direction) {
      await animateRotate(cmd.direction, 220);
    }
    let blocked = false;
    for (let i = 0; i < cmd.count; i++) {
      const nx = state.turtle.x + vec.dx;
      const ny = state.turtle.y + vec.dy;
      if (!inBounds(nx, ny) || isWall(nx, ny)) {
        thud();
        await bumpIntoWall(cmd.direction, 260);
        await Promise.all([
          dizzyWobble(1400),
          dizzyStars(1400)
        ]);
        blocked = true;
        break;
      }
      await animateMove(nx, ny, 280);
      if (isLettuce(nx, ny)) {
        crunch();
        await sleep(220);
        if (state.lettuceEl && state.lettuceEl.parentNode) {
          state.lettuceEl.parentNode.removeChild(state.lettuceEl);
        }
        state.lettuce = null;
        victory();
        await winLevel();
        return;
      }
      await sleep(80);
    }
    if (blocked) continue;
  }
  await sadTurtle();
  clearQueueUI();
  resetTurtleToStart();
}

async function winLevel() {
  if (state.levelIndex === 0) {
    await speak('כל הכבוד! עכשיו נשחק במבוך.');
  } else if (state.levelIndex < LEVELS.length - 1) {
    await speak('כל הכבוד! בואו נמשיך.');
  } else {
    await speak('סיימת את כל המבוכים! כל הכבוד!');
  }
  await sleep(500);
  const next = state.levelIndex + 1;
  if (next < LEVELS.length) {
    loadLevel(next);
    if (next === 1) {
      await speak('מצא את החסה!');
    }
  } else {
    loadLevel(0);
    await runTutorialIntro();
  }
}

function onResetClick() {
  if (state.phase === 'executing') return;
  cancelSpeech();
  stopRecognition();
  setPulse(els.mic, false);
  setPulse(els.go, false);
  loadLevel(state.levelIndex);
}

async function runTutorialIntro() {
  await speak('שלום! בואו נלמד את הצב איך ללכת.');
  await speak('בשביל שהצב יזוז, אנחנו צריכים לתת לו פקודה.');
  await speak('תגיד: צעד אחד למעלה');
  setPulse(els.mic, true);
}

function init() {
  els.board = document.getElementById('board');
  els.log = document.getElementById('log');
  els.mic = document.getElementById('btn-mic');
  els.go = document.getElementById('btn-go');
  els.reset = document.getElementById('btn-reset');
  els.levelLabel = document.getElementById('level-label');
  els.unsupported = document.getElementById('unsupported');

  if (!isSupported()) {
    els.unsupported.hidden = false;
    els.mic.disabled = true;
    els.go.disabled = true;
    els.reset.disabled = true;
    return;
  }

  els.mic.addEventListener('click', onMicClick);
  els.go.addEventListener('click', onGoClick);
  els.reset.addEventListener('click', onResetClick);

  loadLevel(0);

  const bootstrap = () => {
    document.removeEventListener('click', bootstrap);
    try { ac().resume(); } catch {}
    runTutorialIntro();
  };
  document.addEventListener('click', bootstrap, { once: true });

  const hint = document.getElementById('start-hint');
  if (hint) hint.hidden = false;
  document.addEventListener('click', () => {
    if (hint) hint.hidden = true;
  }, { once: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
