'use strict';

/* ===================================================================
   STATE
=================================================================== */
const TEAM_COLORS = [
  '#6366f1', '#f43f5e', '#10b981', '#f59e0b',
  '#3b82f6', '#ec4899'
];

const DEFAULT_CATEGORIES = [
  '동물', '음식', '나라', '색깔', '직업',
  '스포츠', '과일', '영화', '계절에 어울리는 것', '회사에서 쓰는 말'
];

let state = {
  categories: [...DEFAULT_CATEGORIES],
  teamCount: 2,
  teams: [
    { name: '팀A', color: TEAM_COLORS[0] },
    { name: '팀B', color: TEAM_COLORS[1] }
  ],
  totalRounds: 5,
  timerSeconds: 30,

  // game runtime
  currentRound: 1,
  currentTeamIndex: 0,
  scores: [],        // scores[teamIndex] = total
  currentCategory: '',
  timerRunning: false,
  timeLeft: 30,
  timerInterval: null,
  roundScores: [],   // roundScores[teamIndex] = score this round
};

/* ===================================================================
   AUDIO (Web Audio API)
=================================================================== */
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(frequency, duration, type = 'sine', volume = 0.4, startTime = null) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = frequency;
    const t = startTime !== null ? startTime : ctx.currentTime;
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.start(t);
    osc.stop(t + duration);
  } catch (e) { /* silent fail */ }
}

function playStartBeep() {
  playTone(880, 0.12, 'square', 0.3);
  setTimeout(() => playTone(1100, 0.15, 'square', 0.35), 130);
}

function playTickSound() {
  playTone(660, 0.06, 'square', 0.2);
}

function playUrgentBeep() {
  playTone(880, 0.08, 'square', 0.4);
  setTimeout(() => playTone(880, 0.08, 'square', 0.4), 120);
}

function playBuzzer() {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.8);
    gain.gain.setValueAtTime(0.6, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.9);
  } catch (e) { }
}

function playFanfare() {
  const notes = [
    [523, 0.12], [523, 0.12], [523, 0.12], [415, 0.09], [622, 0.3],
    [523, 0.12], [415, 0.09], [622, 0.5]
  ];
  try {
    const ctx = getAudioCtx();
    let t = ctx.currentTime + 0.05;
    notes.forEach(([freq, dur]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.45, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.start(t); osc.stop(t + dur + 0.01);
      t += dur + 0.02;
    });
  } catch (e) { }
}

/* ===================================================================
   SETUP SCREEN
=================================================================== */
function renderCategoryList() {
  const el = document.getElementById('category-list');
  el.innerHTML = '';
  state.categories.forEach((cat, i) => {
    const chip = document.createElement('div');
    chip.className = 'category-chip active';
    chip.innerHTML = `<span>${cat}</span><button class="del-btn" onclick="deleteCategory(${i})" title="삭제">✕</button>`;
    el.appendChild(chip);
  });
}

function addCustomCategory() {
  const input = document.getElementById('custom-category-input');
  const val = input.value.trim();
  if (!val) return;
  if (state.categories.includes(val)) {
    input.style.borderColor = '#f87171';
    setTimeout(() => (input.style.borderColor = ''), 1000);
    return;
  }
  state.categories.push(val);
  input.value = '';
  renderCategoryList();
}

function deleteCategory(index) {
  if (state.categories.length <= 1) return; // 최소 1개
  state.categories.splice(index, 1);
  renderCategoryList();
}

document.getElementById('custom-category-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') addCustomCategory();
});

function changeTeamCount(delta) {
  const next = state.teamCount + delta;
  if (next < 2 || next > 6) return;
  state.teamCount = next;

  // Sync teams array
  while (state.teams.length < state.teamCount) {
    const idx = state.teams.length;
    state.teams.push({ name: `팀${String.fromCharCode(65 + idx)}`, color: TEAM_COLORS[idx] });
  }

  document.getElementById('team-count-display').textContent = state.teamCount;
  renderTeamInputs();
}

function renderTeamInputs() {
  const el = document.getElementById('team-inputs');
  el.innerHTML = '';
  for (let i = 0; i < state.teamCount; i++) {
    const div = document.createElement('div');
    div.className = 'team-input-item';
    div.innerHTML = `
      <div class="team-color-dot" style="background:${state.teams[i].color}; color:${state.teams[i].color};"></div>
      <input type="text" value="${state.teams[i].name}" maxlength="10"
             oninput="state.teams[${i}].name=this.value" placeholder="팀 이름" />
    `;
    el.appendChild(div);
  }
}

function changeSetting(key, delta) {
  if (key === 'rounds') {
    state.totalRounds = Math.max(1, Math.min(10, state.totalRounds + delta));
    document.getElementById('rounds-display').textContent = state.totalRounds;
  } else if (key === 'timer') {
    state.timerSeconds = Math.max(10, Math.min(120, state.timerSeconds + delta));
    document.getElementById('timer-display').textContent = state.timerSeconds;
  }
}

function startGame() {
  if (state.categories.length === 0) return;

  // Sync team names from inputs
  const inputs = document.querySelectorAll('#team-inputs input');
  inputs.forEach((inp, i) => {
    if (inp.value.trim()) state.teams[i].name = inp.value.trim();
  });

  // Init scores
  state.scores = new Array(state.teamCount).fill(0);
  state.currentRound = 1;
  state.currentTeamIndex = 0;
  state.turnsDone = 0;

  showScreen('screen-game');
  updateScoreboard();
  prepareRound();
}

/* ===================================================================
   GAME SCREEN
=================================================================== */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function pickRandomCategory() {
  return state.categories[Math.floor(Math.random() * state.categories.length)];
}

function prepareRound() {
  state.timerRunning = false;
  state.timeLeft = state.timerSeconds;
  clearInterval(state.timerInterval);

  // Pick category
  state.currentCategory = pickRandomCategory();
  document.getElementById('category-name').textContent = state.currentCategory;

  // Update labels
  document.getElementById('round-badge').textContent =
    `ROUND ${state.currentRound} / ${state.totalRounds}`;
  const team = state.teams[state.currentTeamIndex];
  document.getElementById('current-team-label').textContent = `${team.name}의 차례`;

  // Reset timer display
  document.getElementById('timer-number').textContent = state.timerSeconds;
  document.getElementById('timer-number').style.color = '';
  document.querySelector('.timer-center').classList.remove('shaking');

  // Show start button, hide score input
  document.getElementById('game-controls').style.display = 'flex';
  document.getElementById('score-input-area').style.display = 'none';

  // Reset start button
  const btn = document.getElementById('start-btn');
  btn.textContent = '▶ 타이머 시작';
  btn.disabled = false;

  drawTimer(state.timerSeconds, state.timerSeconds, false);
}

function startRound() {
  if (state.timerRunning) return;
  state.timerRunning = true;

  const btn = document.getElementById('start-btn');
  btn.disabled = true;
  btn.textContent = '진행 중...';

  playStartBeep();

  const total = state.timerSeconds;
  state.timeLeft = total;

  state.timerInterval = setInterval(() => {
    state.timeLeft--;

    // Sound cues
    if (state.timeLeft > 3 && state.timeLeft % 5 === 0) {
      playTickSound();
    }
    if (state.timeLeft <= 3 && state.timeLeft > 0) {
      playUrgentBeep();
    }

    // Update display
    const numEl = document.getElementById('timer-number');
    numEl.textContent = state.timeLeft;

    if (state.timeLeft <= 10) {
      numEl.style.color = '#f87171';
      document.querySelector('.timer-center').classList.add('shaking');
    }

    drawTimer(state.timeLeft, total, state.timeLeft <= 10);

    if (state.timeLeft <= 0) {
      clearInterval(state.timerInterval);
      onTimerEnd();
    }
  }, 1000);
}

function onTimerEnd() {
  state.timerRunning = false;
  playBuzzer();

  const numEl = document.getElementById('timer-number');
  numEl.textContent = '';
  document.querySelector('.timer-center').innerHTML = '<span class="time-end-text">TIME!</span>';
  document.querySelector('.timer-center').classList.remove('shaking');

  drawTimer(0, state.timerSeconds, false);

  // Hide start button
  document.getElementById('game-controls').style.display = 'none';

  // Show score inputs after short delay
  setTimeout(showScoreInputs, 600);
}

function showScoreInputs() {
  const area = document.getElementById('score-input-area');
  const grid = document.getElementById('score-inputs-grid');
  area.style.display = 'block';
  grid.innerHTML = '';

  state.roundScores = new Array(state.teamCount).fill(0);

  for (let i = 0; i < state.teamCount; i++) {
    const team = state.teams[i];
    const div = document.createElement('div');
    div.className = 'score-input-item';
    div.innerHTML = `
      <div class="team-label">
        <span class="score-dot" style="background:${team.color};"></span>
        ${team.name}
      </div>
      <div class="stepper">
        <button class="stepper-btn" onclick="changeRoundScore(${i}, -1)">−</button>
        <span id="round-score-${i}">0</span>
        <button class="stepper-btn" onclick="changeRoundScore(${i}, 1)">+</button>
      </div>
    `;
    grid.appendChild(div);
  }
}

function changeRoundScore(teamIndex, delta) {
  state.roundScores[teamIndex] = Math.max(0, (state.roundScores[teamIndex] || 0) + delta);
  document.getElementById(`round-score-${teamIndex}`).textContent = state.roundScores[teamIndex];
}

function submitScores() {
  // Add round scores to total
  for (let i = 0; i < state.teamCount; i++) {
    state.scores[i] += state.roundScores[i] || 0;
  }
  updateScoreboard();
  state.turnsDone = (state.turnsDone || 0) + 1;

  const totalTurns = state.totalRounds * state.teamCount;

  if (state.turnsDone >= totalTurns) {
    showResult();
    return;
  }

  // Advance team/round
  state.currentTeamIndex++;
  if (state.currentTeamIndex >= state.teamCount) {
    state.currentTeamIndex = 0;
    state.currentRound++;
  }

  // Reset timer center display
  const tc = document.querySelector('.timer-center');
  if (tc) {
    tc.innerHTML = `<span id="timer-number">${state.timerSeconds}</span><span class="timer-unit">초</span>`;
  }
  prepareRound();
}

function updateScoreboard() {
  const sb = document.getElementById('scoreboard');

  // Sort teams by score for ranking display
  const ranked = state.teams.slice(0, state.teamCount).map((t, i) => ({
    name: t.name,
    color: t.color,
    score: state.scores[i] || 0,
    originalIndex: i
  })).sort((a, b) => b.score - a.score);

  sb.innerHTML = '<div class="scoreboard-title">점수판</div>';
  ranked.forEach((t, rank) => {
    const card = document.createElement('div');
    card.className = 'score-card' + (rank === 0 && t.score > 0 ? ' leader' : '');
    card.style.setProperty('--team-color', t.color);
    card.style.cssText += ``;
    // color bar via pseudo handled by border-left
    card.style.borderLeft = `3px solid ${t.color}`;
    card.innerHTML = `
      <div class="team-rank">${rank === 0 ? '👑 1위' : `${rank + 1}위`}</div>
      <div class="team-name-sc">${t.name}</div>
      <div class="team-score" style="color:${t.color}">${t.score}</div>
    `;
    sb.appendChild(card);
  });
}

/* ===================================================================
   TIMER CANVAS
=================================================================== */
function drawTimer(timeLeft, total, danger) {
  const canvas = document.getElementById('timer-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const cx = W / 2, cy = H / 2;
  const R = W / 2 - 18;
  const lineW = 14;

  ctx.clearRect(0, 0, W, H);

  // Background track
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = lineW;
  ctx.stroke();

  // Progress arc
  const frac = total > 0 ? timeLeft / total : 0;
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + frac * Math.PI * 2;

  if (frac > 0) {
    const gradient = ctx.createLinearGradient(cx - R, cy, cx + R, cy);
    if (danger) {
      gradient.addColorStop(0, '#f87171');
      gradient.addColorStop(1, '#dc2626');
    } else {
      gradient.addColorStop(0, '#6366f1');
      gradient.addColorStop(1, '#a78bfa');
    }

    ctx.beginPath();
    ctx.arc(cx, cy, R, startAngle, endAngle);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = lineW;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Glow effect
    ctx.shadowBlur = danger ? 20 : 12;
    ctx.shadowColor = danger ? '#f87171' : '#6366f1';
    ctx.beginPath();
    ctx.arc(cx, cy, R, startAngle, endAngle);
    ctx.strokeStyle = danger ? 'rgba(248,113,113,0.3)' : 'rgba(99,102,241,0.3)';
    ctx.lineWidth = lineW + 6;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Dot at tip
  if (frac > 0.01) {
    const dotAngle = endAngle;
    const dx = cx + R * Math.cos(dotAngle);
    const dy = cy + R * Math.sin(dotAngle);
    ctx.beginPath();
    ctx.arc(dx, dy, lineW / 2 + 1, 0, Math.PI * 2);
    ctx.fillStyle = danger ? '#f87171' : '#a78bfa';
    ctx.shadowBlur = 15;
    ctx.shadowColor = danger ? '#f87171' : '#a78bfa';
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

/* ===================================================================
   RESULT SCREEN
=================================================================== */
function showResult() {
  showScreen('screen-result');

  const ranked = state.teams.slice(0, state.teamCount).map((t, i) => ({
    name: t.name,
    color: t.color,
    score: state.scores[i] || 0
  })).sort((a, b) => b.score - a.score);

  const winner = ranked[0];
  document.getElementById('winner-name').textContent = winner.name;
  document.getElementById('winner-name').style.background =
    `linear-gradient(135deg, ${winner.color}, #fbbf24)`;
  document.getElementById('winner-name').style.webkitBackgroundClip = 'text';
  document.getElementById('winner-name').style.webkitTextFillColor = 'transparent';
  document.getElementById('winner-name').style.backgroundClip = 'text';

  // Final scoreboard
  const fs = document.getElementById('final-scoreboard');
  fs.innerHTML = '';
  const medals = ['🥇', '🥈', '🥉'];
  ranked.forEach((t, i) => {
    const row = document.createElement('div');
    row.className = 'final-score-row' + (i === 0 ? ' winner-row' : '');
    row.innerHTML = `
      <span class="final-rank">${medals[i] || (i + 1) + '위'}</span>
      <span class="final-team-name">
        <span style="width:10px;height:10px;border-radius:50%;background:${t.color};display:inline-block;"></span>
        ${t.name}
      </span>
      <span class="final-score-val" style="color:${t.color}">${t.score}점</span>
    `;
    fs.appendChild(row);
  });

  // Play fanfare & confetti
  playFanfare();
  startConfetti(winner.color);
}

function restartGame() {
  stopConfetti();
  // Keep settings, reset scores
  state.scores = new Array(state.teamCount).fill(0);
  state.currentRound = 1;
  state.currentTeamIndex = 0;
  state.turnsDone = 0;
  showScreen('screen-game');

  const tc = document.querySelector('.timer-center');
  tc.innerHTML = `<span id="timer-number">${state.timerSeconds}</span><span class="timer-unit">초</span>`;

  updateScoreboard();
  prepareRound();
}

function goSetup() {
  stopConfetti();
  showScreen('screen-setup');
}

/* ===================================================================
   CONFETTI
=================================================================== */
let confettiCanvas = null;
let confettiCtx = null;
let confettiParticles = [];
let confettiAnimId = null;

function startConfetti(winnerColor) {
  if (!confettiCanvas) {
    confettiCanvas = document.createElement('canvas');
    confettiCanvas.id = 'confetti-canvas';
    document.body.appendChild(confettiCanvas);
  }
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
  confettiCtx = confettiCanvas.getContext('2d');

  const colors = [winnerColor, '#fbbf24', '#a78bfa', '#6366f1', '#34d399', '#f43f5e', '#38bdf8'];
  confettiParticles = [];

  for (let i = 0; i < 180; i++) {
    confettiParticles.push({
      x: Math.random() * confettiCanvas.width,
      y: -10 - Math.random() * 200,
      w: 6 + Math.random() * 8,
      h: 10 + Math.random() * 10,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 3,
      vy: 2 + Math.random() * 4,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.2,
      opacity: 0.8 + Math.random() * 0.2
    });
  }

  animateConfetti();
}

function animateConfetti() {
  const c = confettiCanvas;
  if (!c) return;
  confettiCtx.clearRect(0, 0, c.width, c.height);

  let alive = false;
  confettiParticles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.rotation += p.rotSpeed;
    p.vy += 0.05;

    if (p.y < c.height + 20) alive = true;

    confettiCtx.save();
    confettiCtx.translate(p.x, p.y);
    confettiCtx.rotate(p.rotation);
    confettiCtx.globalAlpha = p.opacity;
    confettiCtx.fillStyle = p.color;
    confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    confettiCtx.restore();
  });

  if (alive) {
    confettiAnimId = requestAnimationFrame(animateConfetti);
  } else {
    stopConfetti();
  }
}

function stopConfetti() {
  if (confettiAnimId) {
    cancelAnimationFrame(confettiAnimId);
    confettiAnimId = null;
  }
  if (confettiCanvas) {
    confettiCanvas.remove();
    confettiCanvas = null;
  }
}


/* ===================================================================
   INIT
=================================================================== */
function init() {
  renderCategoryList();
  renderTeamInputs();
  drawTimer(state.timerSeconds, state.timerSeconds, false);

  // Draw initial timer on setup (none visible yet, but ready)
}

init();
