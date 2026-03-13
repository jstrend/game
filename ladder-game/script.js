/* ===== 사운드 (Web Audio API) ===== */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function resumeAudio() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playTone({ freq = 440, type = 'sine', duration = 0.1, volume = 0.18, decay = 0.08 } = {}) {
  resumeAudio();
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + duration + decay);
}

const SFX = {
  // 이동 중 틱틱 소리
  tick() { playTone({ freq: 520 + Math.random() * 80, type: 'triangle', duration: 0.06, volume: 0.12 }); },

  // 가로선 건널 때 통통 소리
  bridge() {
    playTone({ freq: 700, type: 'sine', duration: 0.12, volume: 0.22 });
    setTimeout(() => playTone({ freq: 900, type: 'sine', duration: 0.1, volume: 0.18 }), 60);
  },

  // 도착! 팡 소리
  arrive() {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => playTone({ freq: f, type: 'sine', duration: 0.25, volume: 0.25 }), i * 80)
    );
  },

  // 게임 시작 소리
  start() {
    [330, 392, 494, 659].forEach((f, i) =>
      setTimeout(() => playTone({ freq: f, type: 'triangle', duration: 0.18, volume: 0.2 }), i * 60)
    );
  },

  // 컨페티 팡파레
  fanfare() {
    const melody = [523, 659, 784, 659, 784, 1047];
    melody.forEach((f, i) =>
      setTimeout(() => playTone({ freq: f, type: 'sine', duration: 0.22, volume: 0.28 }), i * 100)
    );
  },
};

/* ===== 플레이어 캐릭터 ===== */
const PLAYER_CHARS = ['🐱','🐶','🐸','🐰','🐼','🦊','🐧','🐨'];

/* ===== 플레이어 색상 팔레트 ===== */
const PLAYER_COLORS = [
  { line: '#818cf8', glow: 'rgba(99,102,241,0.7)',  ball: '#6366f1' },
  { line: '#f472b6', glow: 'rgba(236,72,153,0.7)',  ball: '#ec4899' },
  { line: '#fbbf24', glow: 'rgba(245,158,11,0.7)',  ball: '#f59e0b' },
  { line: '#34d399', glow: 'rgba(16,185,129,0.7)',  ball: '#10b981' },
  { line: '#60a5fa', glow: 'rgba(59,130,246,0.7)',  ball: '#3b82f6' },
  { line: '#fb923c', glow: 'rgba(249,115,22,0.7)',  ball: '#f97316' },
  { line: '#2dd4bf', glow: 'rgba(20,184,166,0.7)',  ball: '#14b8a6' },
  { line: '#c084fc', glow: 'rgba(168,85,247,0.7)',  ball: '#a855f7' },
];

/* ===== 상태 ===== */
const state = {
  players: [],
  results: [],
  bridges: [],
  paths: {},
  rows: 10,
};

/* ===== DOM ===== */
const playerInput  = document.getElementById('player-input');
const resultInput  = document.getElementById('result-input');
const addPlayerBtn = document.getElementById('add-player-btn');
const addResultBtn = document.getElementById('add-result-btn');
const playersList  = document.getElementById('players-list');
const resultsList  = document.getElementById('results-list');
const countHint    = document.getElementById('count-hint');
const startBtn     = document.getElementById('start-btn');

const inputSection  = document.getElementById('input-section');
const ladderSection = document.getElementById('ladder-section');
const resultSection = document.getElementById('result-section');

const canvas       = document.getElementById('ladder-canvas');
const ctx          = canvas.getContext('2d');
const playerLabels = document.getElementById('player-labels');
const resultLabels = document.getElementById('result-labels');
const animateBtn   = document.getElementById('animate-btn');
const resetBtn     = document.getElementById('reset-btn');

const resultTbody  = document.getElementById('result-tbody');
const shareBtn     = document.getElementById('share-btn');
const newGameBtn   = document.getElementById('new-game-btn');
const shareMsg     = document.getElementById('share-msg');

/* ===== Canvas 설정 ===== */
let COL_W  = 90;
let ROW_H  = 44;
const PAD_X  = 60;
const PAD_Y  = 28;
const LINE_W = 5;
let   BALL_R = 11;

function computeLayout() {
  const n       = state.players.length;
  const wrapper = document.querySelector('.canvas-wrapper');
  const availW  = (wrapper ? wrapper.clientWidth : window.innerWidth) - 32;
  const availH  = Math.max(420, window.innerHeight - 320);

  COL_W  = n > 1 ? Math.floor((availW - PAD_X * 2) / (n - 1)) : availW;
  COL_W  = Math.max(80, Math.min(COL_W, 220));
  ROW_H  = Math.floor(availH / state.rows);
  ROW_H  = Math.max(36, Math.min(ROW_H, 90));
  BALL_R = Math.max(9, Math.min(Math.floor(COL_W / 9), 14));
}

/* ===== 참가자 / 결과 관리 ===== */
function addItem(list, input, maxCount, renderFn) {
  const val = input.value.trim();
  if (!val) return;
  if (list.length >= maxCount) { input.value = ''; return; }
  if (list.includes(val)) { input.value = ''; return; }
  list.push(val);
  input.value = '';
  renderFn();
  updateStartBtn();
}

function removeItem(list, index, renderFn) {
  list.splice(index, 1);
  renderFn();
  updateStartBtn();
}

function renderTags(list, container, renderFn, isResult = false) {
  container.innerHTML = '';
  list.forEach((item, i) => {
    const tag = document.createElement('span');
    tag.className = isResult ? 'tag tag-result' : `tag tag-${i % 8}`;
    tag.innerHTML = `${item} <button class="remove-btn" aria-label="삭제">×</button>`;
    tag.querySelector('.remove-btn').addEventListener('click', () => removeItem(list, i, renderFn));
    container.appendChild(tag);
  });
}

const renderPlayers = () => renderTags(state.players, playersList, renderPlayers, false);
const renderResults = () => renderTags(state.results, resultsList, renderResults, true);

function updateStartBtn() {
  const n = state.players.length;
  const r = state.results.length;
  startBtn.disabled = !(n >= 2 && n <= 8 && n === r);
  if (n !== r && (n > 0 || r > 0)) {
    countHint.textContent = `참가자 ${n}명 / 결과 ${r}개 — 수가 같아야 합니다`;
    countHint.style.color = '#f472b6';
  } else {
    countHint.textContent = '참가자 수와 결과 수가 같아야 합니다';
    countHint.style.color = '';
  }
}

addPlayerBtn.addEventListener('click', () => addItem(state.players, playerInput, 8, renderPlayers));
addResultBtn.addEventListener('click', () => addItem(state.results, resultInput, 8, renderResults));
playerInput.addEventListener('keydown', e => { if (e.key === 'Enter') addItem(state.players, playerInput, 8, renderPlayers); });
resultInput.addEventListener('keydown', e => { if (e.key === 'Enter') addItem(state.results, resultInput, 8, renderResults); });

/* ===== 사다리 생성 ===== */
function generateBridges(numCols, numRows) {
  const bridges = [];
  for (let row = 0; row < numRows; row++) {
    const used = new Set();
    for (let col = 0; col < numCols - 1; col++) {
      if (used.has(col) || used.has(col + 1)) continue;
      if (Math.random() < 0.45) {
        bridges.push({ col, row });
        used.add(col);
        used.add(col + 1);
      }
    }
  }
  for (let row = 0; row < numRows; row++) {
    if (!bridges.some(b => b.row === row) && Math.random() < 0.6) {
      const col = Math.floor(Math.random() * (numCols - 1));
      bridges.push({ col, row });
    }
  }
  return bridges;
}

function computePaths(numCols, numRows, bridges) {
  const paths = {};
  for (let start = 0; start < numCols; start++) {
    let col = start;
    for (let row = 0; row < numRows; row++) {
      const right = bridges.find(b => b.col === col && b.row === row);
      const left  = bridges.find(b => b.col === col - 1 && b.row === row);
      if (right) col++;
      else if (left) col--;
    }
    paths[start] = col;
  }
  return paths;
}

/* ===== Canvas 좌표 ===== */
function colX(col) { return PAD_X + col * COL_W; }
function rowY(row) { return PAD_Y + row * ROW_H; }

/* ===== 사다리 그리기 ===== */
function drawLadder(highlightedPaths = [], recompute = false) {
  if (recompute) computeLayout();
  const n = state.players.length;
  const canvasW = PAD_X * 2 + (n - 1) * COL_W;
  const canvasH = PAD_Y * 2 + state.rows * ROW_H;
  canvas.width  = canvasW;
  canvas.height = canvasH;

  // 배경
  const bgGrad = ctx.createLinearGradient(0, 0, 0, canvasH);
  bgGrad.addColorStop(0, 'rgba(15,52,96,0.6)');
  bgGrad.addColorStop(1, 'rgba(26,26,46,0.6)');
  ctx.fillStyle = bgGrad;
  ctx.beginPath();
  ctx.roundRect(0, 0, canvasW, canvasH, 12);
  ctx.fill();

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 세로선 — 반투명 흰색
  for (let i = 0; i < n; i++) {
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = LINE_W;
    ctx.beginPath();
    ctx.moveTo(colX(i), rowY(0));
    ctx.lineTo(colX(i), rowY(state.rows));
    ctx.stroke();

    // 상단 원형 마커
    ctx.beginPath();
    ctx.arc(colX(i), rowY(0), 5, 0, Math.PI * 2);
    ctx.fillStyle = PLAYER_COLORS[i % 8].ball;
    ctx.shadowColor = PLAYER_COLORS[i % 8].glow;
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // 가로선 — 보랏빛 글로우
  state.bridges.forEach(b => {
    const y = rowY(b.row) + ROW_H / 2;
    ctx.strokeStyle = 'rgba(167,139,250,0.55)';
    ctx.lineWidth = LINE_W - 1;
    ctx.shadowColor = 'rgba(167,139,250,0.6)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(colX(b.col),     y);
    ctx.lineTo(colX(b.col + 1), y);
    ctx.stroke();
    ctx.shadowBlur = 0;
  });

  // 강조 경로
  highlightedPaths.forEach((path, pIdx) => drawPathLines(path, pIdx));
}

function drawPathLines(pathCoords, colorIdx = 0) {
  if (pathCoords.length < 2) return;
  const color = PLAYER_COLORS[colorIdx % 8];
  ctx.strokeStyle = color.line;
  ctx.lineWidth = LINE_W + 1.5;
  ctx.shadowColor = color.glow;
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.moveTo(pathCoords[0].x, pathCoords[0].y);
  for (let i = 1; i < pathCoords.length; i++) {
    ctx.lineTo(pathCoords[i].x, pathCoords[i].y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
}

/* ===== 경로 좌표 ===== */
function getPathCoords(playerIdx) {
  const coords = [];
  let col = playerIdx;
  coords.push({ x: colX(col), y: rowY(0) });

  for (let row = 0; row < state.rows; row++) {
    const right = state.bridges.find(b => b.col === col && b.row === row);
    const left  = state.bridges.find(b => b.col === col - 1 && b.row === row);
    const midY  = rowY(row) + ROW_H / 2;

    if (right) {
      coords.push({ x: colX(col),     y: midY });
      coords.push({ x: colX(col + 1), y: midY });
      col++;
    } else if (left) {
      coords.push({ x: colX(col),     y: midY });
      coords.push({ x: colX(col - 1), y: midY });
      col--;
    } else {
      coords.push({ x: colX(col), y: midY });
    }
  }
  coords.push({ x: colX(col), y: rowY(state.rows) });
  return coords;
}

/* ===== 컨페티 ===== */
function launchConfetti() {
  const colors = ['#a78bfa','#f472b6','#fbbf24','#34d399','#60a5fa','#fb923c'];
  for (let i = 0; i < 60; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.left = Math.random() * 100 + 'vw';
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    el.style.width  = (6 + Math.random() * 8) + 'px';
    el.style.height = (6 + Math.random() * 8) + 'px';
    el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    el.style.animationDuration = (1.5 + Math.random() * 2) + 's';
    el.style.animationDelay = (Math.random() * 0.8) + 's';
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

/* ===== 도착점 하이라이트 ===== */
function flashArrival(x, y, col) {
  const label = resultLabels.children[col];
  if (label) {
    label.classList.add('label-flash');
    setTimeout(() => label.classList.remove('label-flash'), 1200);
  }
  const color = PLAYER_COLORS[col % 8];
  const char  = PLAYER_CHARS[col % 8];
  let frame = 0;
  const maxFrame = 28;

  function pulse() {
    if (frame > maxFrame) return;
    const progress = frame / maxFrame;
    const r = (BALL_R + 4) + frame * 3;
    const alpha = 1 - progress;

    // 팡! 원형 파동
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.strokeStyle = color.line;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 3;
    ctx.shadowColor = color.glow;
    ctx.shadowBlur = 16;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // 캐릭터 점프 효과 (살짝 튀어오름)
    const jumpY = y - Math.sin(progress * Math.PI) * 18;
    const scale = 1 + Math.sin(progress * Math.PI) * 0.4;
    const charSize = Math.max(18, BALL_R * 2.2) * scale;
    ctx.font = `${charSize}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(char, x, jumpY);

    frame++;
    requestAnimationFrame(pulse);
  }
  requestAnimationFrame(pulse);
}

/* ===== 애니메이션 ===== */
let animating = false;

function animateOne(playerIdx, coords, bgPaths, done) {
  let seg = 0;
  let t = 0;
  const color = PLAYER_COLORS[playerIdx % 8];

  let lastSoundSeg = -1;
  let lastSoundT   = -1;

  function step() {
    if (seg >= coords.length - 1) {
      const last = coords[coords.length - 1];
      SFX.arrive();
      flashArrival(last.x, last.y, state.paths[playerIdx]);
      done();
      return;
    }
    const from = coords[seg];
    const to   = coords[seg + 1];
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    const spd  = dist < 10 ? 1 : 0.045;
    t += spd;

    // 세그먼트 전환 시 소리
    if (t >= 1 && seg !== lastSoundSeg) {
      const isHoriz = Math.abs(to.y - from.y) < 2 && Math.abs(to.x - from.x) > 2;
      if (isHoriz) SFX.bridge(); else SFX.tick();
      lastSoundSeg = seg;
    }

    if (t >= 1) { t = 0; seg++; }

    const bx = from.x + (to.x - from.x) * t;
    const by = from.y + (to.y - from.y) * t;

    drawLadder(bgPaths.map((p, i) => ({ coords: p, idx: i })).map(o => o.coords));
    bgPaths.forEach((p, i) => drawPathLines(p, i));

    // 현재 경로
    const partial = [...coords.slice(0, seg + 1), { x: bx, y: by }];
    drawPathLines(partial, playerIdx);

    // 캐릭터 글로우 원 배경
    ctx.beginPath();
    ctx.arc(bx, by, BALL_R + 4, 0, Math.PI * 2);
    ctx.fillStyle = color.ball + '55';
    ctx.shadowColor = color.glow;
    ctx.shadowBlur = 22;
    ctx.fill();
    ctx.shadowBlur = 0;

    // 캐릭터 이모지
    const charSize = Math.max(18, BALL_R * 2.2);
    ctx.font = `${charSize}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(PLAYER_CHARS[playerIdx % 8], bx, by);

    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function animateAll() {
  if (animating) return;
  animating = true;
  animateBtn.disabled = true;

  const n = state.players.length;
  const allCoords = Array.from({ length: n }, (_, i) => getPathCoords(i));
  const completed = [];
  let current = 0;

  function next() {
    if (current >= n) {
      animating = false;
      drawLadder(allCoords);
      allCoords.forEach((c, i) => drawPathLines(c, i));
      showResults();
      launchConfetti();
      SFX.fanfare();
      return;
    }
    animateOne(current, allCoords[current], completed.map(i => allCoords[i]), () => {
      completed.push(current);
      current++;
      next();
    });
  }
  next();
}

function animateSingle(playerIdx) {
  if (animating) return;
  animating = true;
  const allCoords = Array.from({ length: state.players.length }, (_, i) => getPathCoords(i));
  const others = allCoords.filter((_, i) => i !== playerIdx);
  drawLadder(others);
  others.forEach((c, i) => drawPathLines(c, i < playerIdx ? i : i + 1));
  animateOne(playerIdx, allCoords[playerIdx], others, () => {
    animating = false;
    drawLadder(allCoords);
    allCoords.forEach((c, i) => drawPathLines(c, i));
  });
}

/* ===== 결과 표시 ===== */
function showResults() {
  resultTbody.innerHTML = '';
  Object.entries(state.paths).forEach(([pi, ri]) => {
    const playerIdx = Number(pi);
    const color = PLAYER_COLORS[playerIdx % 8];
    const tr = document.createElement('tr');
    const char = PLAYER_CHARS[playerIdx % 8];
    tr.innerHTML = `
      <td class="player-cell" style="color:${color.line}"><span class="result-char">${char}</span> ${state.players[playerIdx]}</td>
      <td><span class="result-badge">${state.results[ri]}</span></td>
      <td><button class="btn btn-replay" data-idx="${playerIdx}">▶ 다시 보기</button></td>`;
    resultTbody.appendChild(tr);
  });
  resultTbody.querySelectorAll('.btn-replay').forEach(btn => {
    btn.addEventListener('click', () => {
      ladderSection.scrollIntoView({ behavior: 'smooth' });
      animateSingle(Number(btn.dataset.idx));
    });
  });
  resultSection.classList.remove('hidden');
  resultSection.scrollIntoView({ behavior: 'smooth' });
}

/* ===== 레이블 렌더링 ===== */
function renderLabels() {
  const n = state.players.length;
  const canvasW = PAD_X * 2 + (n - 1) * COL_W;

  playerLabels.innerHTML = '';
  resultLabels.innerHTML = '';
  playerLabels.style.width = canvasW + 'px';
  resultLabels.style.width = canvasW + 'px';

  state.players.forEach((p, i) => {
    const el = document.createElement('div');
    el.className = `label-item label-c${i % 8}`;
    el.innerHTML = `<span class="char-emoji">${PLAYER_CHARS[i % 8]}</span><span class="char-name">${p}</span>`;
    el.style.left = colX(i) + 'px';
    playerLabels.appendChild(el);
  });

  for (let col = 0; col < n; col++) {
    const el = document.createElement('div');
    el.className = 'label-item';
    el.textContent = state.results[state.paths[col]];
    el.style.left = colX(col) + 'px';
    resultLabels.appendChild(el);
  }
}

/* ===== 게임 시작 ===== */
startBtn.addEventListener('click', () => {
  SFX.start();
  const n = state.players.length;
  state.rows = Math.max(8, n * 2);
  state.bridges = generateBridges(n, state.rows);
  state.paths   = computePaths(n, state.rows, state.bridges);

  inputSection.classList.add('hidden');
  ladderSection.classList.remove('hidden');
  resultSection.classList.add('hidden');
  animateBtn.disabled = false;

  computeLayout();
  renderLabels();
  drawLadder();
});

animateBtn.addEventListener('click', animateAll);

resetBtn.addEventListener('click', () => {
  const n = state.players.length;
  state.rows = Math.max(8, n * 2);
  state.bridges = generateBridges(n, state.rows);
  state.paths   = computePaths(n, state.rows, state.bridges);
  animateBtn.disabled = false;
  animating = false;
  resultSection.classList.add('hidden');
  computeLayout();
  renderLabels();
  drawLadder();
});

newGameBtn.addEventListener('click', () => {
  resultSection.classList.add('hidden');
  ladderSection.classList.add('hidden');
  inputSection.classList.remove('hidden');
});

/* ===== URL 공유 ===== */
function buildShareURL() {
  const url = new URL(window.location.href.split('?')[0]);
  url.searchParams.set('p', state.players.join(','));
  url.searchParams.set('r', state.results.join(','));
  url.searchParams.set('b', state.bridges.map(b => `${b.col}-${b.row}`).join(','));
  return url.toString();
}

function loadFromURL() {
  const params = new URLSearchParams(window.location.search);
  const p = params.get('p');
  const r = params.get('r');
  const b = params.get('b');
  if (!p || !r || !b) return;

  state.players = p.split(',').filter(Boolean).slice(0, 8);
  state.results = r.split(',').filter(Boolean).slice(0, 8);
  if (state.players.length !== state.results.length) return;

  state.bridges = b.split(',').filter(Boolean).map(s => {
    const [col, row] = s.split('-').map(Number);
    return { col, row };
  });
  state.rows  = Math.max(...state.bridges.map(b => b.row), 7) + 1;
  state.paths = computePaths(state.players.length, state.rows, state.bridges);

  renderPlayers();
  renderResults();
  updateStartBtn();

  inputSection.classList.add('hidden');
  ladderSection.classList.remove('hidden');
  computeLayout();
  renderLabels();
  drawLadder();
  showResults();
}

shareBtn.addEventListener('click', async () => {
  const url = buildShareURL();
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    prompt('링크를 복사하세요:', url);
    return;
  }
  shareMsg.classList.remove('hidden');
  setTimeout(() => shareMsg.classList.add('hidden'), 3000);
});

/* ===== 창 크기 변경 시 재렌더링 ===== */
window.addEventListener('resize', () => {
  if (animating || ladderSection.classList.contains('hidden')) return;
  computeLayout();
  renderLabels();
  drawLadder();
});

/* ===== 초기화 ===== */
loadFromURL();
