'use strict';

/* ============================================================
   DATA
   ============================================================ */
const DEFAULT_QUESTIONS = [
  { question: '야근 vs 주말 출근', a: '야근 (평일 늦게까지)', b: '주말 출근 (주말이 날아감)' },
  { question: '발표 vs 보고서 작성', a: '발표 (모두 앞에서 떨기)', b: '보고서 작성 (혼자 글 쓰기)' },
  { question: '회식 vs 혼밥', a: '팀 회식 (분위기 맞추기)', b: '혼밥 (조용히 혼자 먹기)' },
  { question: '상사의 잔소리 vs 동료의 무관심', a: '상사의 잔소리 (지겹지만 관심)', b: '동료의 무관심 (편하지만 외로움)' },
  { question: '재택근무 vs 사무실 출근', a: '재택근무 (집이 곧 사무실)', b: '사무실 출근 (퇴근 후 칼퇴)' },
  { question: '연봉 10% 인상 vs 연차 10일 추가', a: '연봉 10% 인상 💰', b: '연차 10일 추가 🏖️' },
  { question: '까다로운 상사 vs 무능한 동료', a: '까다롭지만 유능한 상사', b: '좋은 사람이지만 무능한 동료' },
  { question: '일 잘하는 팀 vs 사이 좋은 팀', a: '일 잘하는 팀 (성과는 최고)', b: '사이 좋은 팀 (분위기는 최고)' },
];

/* ============================================================
   STATE
   ============================================================ */
let questions = JSON.parse(localStorage.getItem('bvQuestions') || 'null') || DEFAULT_QUESTIONS.map(q => ({ ...q }));
let currentIndex = 0;
let votes = { a: 0, b: 0 };
let hasVoted = false;
let resultVisible = false;
let soundEnabled = true;

/* ============================================================
   AUDIO ENGINE (Web Audio API)
   ============================================================ */
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, type, duration, volume = 0.3, delay = 0) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    gain.gain.setValueAtTime(0, ctx.currentTime + delay);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration + 0.05);
  } catch (e) { /* silent fail */ }
}

function playNoise(duration, volume = 0.15, delay = 0) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioCtx();
    const bufLen = ctx.sampleRate * duration;
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    src.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    src.start(ctx.currentTime + delay);
    src.stop(ctx.currentTime + delay + duration + 0.05);
  } catch (e) { /* silent fail */ }
}

function soundVoteA() {
  playTone(440, 'sine', 0.15, 0.25);
  playTone(554, 'sine', 0.12, 0.18, 0.06);
}
function soundVoteB() {
  playTone(494, 'sine', 0.15, 0.25);
  playTone(622, 'sine', 0.12, 0.18, 0.06);
}

function soundReveal() {
  // Drum roll
  for (let i = 0; i < 16; i++) {
    const interval = 0.06 - i * 0.003;
    playNoise(0.04, 0.08 + i * 0.005, i * interval);
  }
  // Reveal chord
  const base = 1.1;
  playTone(523, 'sine', 0.5, 0.3, base);
  playTone(659, 'sine', 0.5, 0.25, base + 0.05);
  playTone(784, 'sine', 0.5, 0.25, base + 0.1);
  playTone(1047,'sine', 0.4, 0.2, base + 0.15);
}

function soundWin() {
  // Fanfare-like
  const notes = [523,659,784,1047,1319];
  notes.forEach((f, i) => {
    playTone(f, 'triangle', 0.25, 0.28, i * 0.1);
  });
  for (let i = 0; i < 6; i++) {
    playNoise(0.05, 0.06, i * 0.15 + 0.35);
  }
}

/* ============================================================
   PERSISTENCE
   ============================================================ */
function saveQuestions() {
  localStorage.setItem('bvQuestions', JSON.stringify(questions));
}

/* ============================================================
   RENDER HELPERS
   ============================================================ */
function updateProgress() {
  const total = questions.length;
  const current = currentIndex + 1;
  document.getElementById('progressLabel').textContent = `${current} / ${total}`;
  const pct = total > 1 ? (currentIndex / (total - 1)) * 100 : 100;
  document.getElementById('progressFill').style.width = `${pct}%`;
}

function loadQuestion() {
  if (questions.length === 0) {
    document.getElementById('questionText').textContent = '문제가 없습니다. 문제를 추가해 주세요.';
    document.getElementById('choiceA').textContent = 'A';
    document.getElementById('choiceB').textContent = 'B';
    return;
  }
  const q = questions[currentIndex];
  document.getElementById('questionNumber').textContent = `Q.${currentIndex + 1}`;
  document.getElementById('questionText').textContent = q.question;
  document.getElementById('choiceA').textContent = q.a;
  document.getElementById('choiceB').textContent = q.b;
  document.getElementById('resultChoiceA').textContent = q.a;
  document.getElementById('resultChoiceB').textContent = q.b;
}

function resetVoteUI() {
  votes = { a: 0, b: 0 };
  hasVoted = false;
  resultVisible = false;

  // Show vote area, hide result
  document.getElementById('voteArea').style.display = 'flex';
  document.getElementById('resultArea').style.display = 'none';

  // Reset buttons
  const btnA = document.getElementById('voteA');
  const btnB = document.getElementById('voteB');
  btnA.classList.remove('voted-self', 'voted-other');
  btnB.classList.remove('voted-self', 'voted-other');

  // Bars to 0
  document.getElementById('barA').style.width = '0%';
  document.getElementById('barB').style.width = '0%';

  // Control buttons
  document.getElementById('btnReveal').style.display = 'none';
  document.getElementById('btnNext').textContent = '다음 문제 →';
}

function showResult(animated = true) {
  resultVisible = true;
  const total = votes.a + votes.b;
  const pctA = total === 0 ? 0 : Math.round((votes.a / total) * 100);
  const pctB = total === 0 ? 0 : 100 - pctA;

  document.getElementById('statsA').textContent = `${votes.a}표 · ${pctA}%`;
  document.getElementById('statsB').textContent = `${votes.b}표 · ${pctB}%`;

  const rowA = document.getElementById('resultRowA');
  const rowB = document.getElementById('resultRowB');
  const tieEl = document.getElementById('resultTie');

  rowA.classList.remove('winner');
  rowB.classList.remove('winner');
  tieEl.style.display = 'none';

  if (votes.a > votes.b) {
    rowA.classList.add('winner');
    if (pctA >= 70) setTimeout(soundWin, 1200);
  } else if (votes.b > votes.a) {
    rowB.classList.add('winner');
    if (pctB >= 70) setTimeout(soundWin, 1200);
  } else {
    tieEl.style.display = 'block';
  }

  document.getElementById('resultArea').style.display = 'flex';
  document.getElementById('btnReveal').style.display = 'none';

  if (animated) {
    // Animate bars after short delay
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById('barA').style.width = `${pctA}%`;
        document.getElementById('barB').style.width = `${pctB}%`;
      });
    });
  } else {
    document.getElementById('barA').style.width = `${pctA}%`;
    document.getElementById('barB').style.width = `${pctB}%`;
  }
}

/* ============================================================
   MANAGE MODAL
   ============================================================ */
function renderQuestionList() {
  const list = document.getElementById('questionList');
  list.innerHTML = '';
  if (questions.length === 0) {
    list.innerHTML = '<p style="color:var(--text-secondary);font-size:0.85rem;text-align:center;">질문이 없습니다.</p>';
    return;
  }
  questions.forEach((q, i) => {
    const item = document.createElement('div');
    item.className = 'question-item';
    item.innerHTML = `
      <div class="question-item-num">${i + 1}</div>
      <div class="question-item-text">
        <strong>${escHtml(q.question)}</strong>
        <span>A: ${escHtml(q.a)} &nbsp;|&nbsp; B: ${escHtml(q.b)}</span>
      </div>
      <button class="btn-delete" data-idx="${i}" title="삭제">✕</button>
    `;
    list.appendChild(item);
  });
  list.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      questions.splice(idx, 1);
      saveQuestions();
      if (currentIndex >= questions.length && currentIndex > 0) currentIndex = questions.length - 1;
      renderQuestionList();
      loadQuestion();
      updateProgress();
      resetVoteUI();
    });
  });
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ============================================================
   EVENT LISTENERS
   ============================================================ */
document.getElementById('voteA').addEventListener('click', () => {
  if (hasVoted) return;
  hasVoted = true;
  votes.a++;
  soundVoteA();
  document.getElementById('voteA').classList.add('voted-self');
  document.getElementById('voteB').classList.add('voted-other');
  document.getElementById('btnReveal').style.display = 'inline-flex';
  setTimeout(() => {
    soundReveal();
    showResult(true);
  }, 600);
});

document.getElementById('voteB').addEventListener('click', () => {
  if (hasVoted) return;
  hasVoted = true;
  votes.b++;
  soundVoteB();
  document.getElementById('voteB').classList.add('voted-self');
  document.getElementById('voteA').classList.add('voted-other');
  document.getElementById('btnReveal').style.display = 'inline-flex';
  setTimeout(() => {
    soundReveal();
    showResult(true);
  }, 600);
});

document.getElementById('btnReveal').addEventListener('click', () => {
  if (resultVisible) return;
  soundReveal();
  showResult(true);
});

document.getElementById('btnNext').addEventListener('click', () => {
  if (questions.length === 0) return;
  currentIndex = (currentIndex + 1) % questions.length;
  loadQuestion();
  updateProgress();
  resetVoteUI();
});

document.getElementById('btnReset').addEventListener('click', () => {
  resetVoteUI();
});

// Manage modal
document.getElementById('btnManage').addEventListener('click', () => {
  renderQuestionList();
  document.getElementById('manageModal').style.display = 'flex';
});
document.getElementById('btnCloseModal').addEventListener('click', () => {
  document.getElementById('manageModal').style.display = 'none';
});
document.getElementById('manageModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('manageModal')) {
    document.getElementById('manageModal').style.display = 'none';
  }
});

document.getElementById('btnAddQuestion').addEventListener('click', () => {
  const q = document.getElementById('inputQuestion').value.trim();
  const a = document.getElementById('inputA').value.trim();
  const b = document.getElementById('inputB').value.trim();
  if (!q || !a || !b) {
    alert('질문과 A/B 선택지를 모두 입력해 주세요.');
    return;
  }
  questions.push({ question: q, a, b });
  saveQuestions();
  document.getElementById('inputQuestion').value = '';
  document.getElementById('inputA').value = '';
  document.getElementById('inputB').value = '';
  renderQuestionList();
  updateProgress();
});

// Sound toggle
document.getElementById('btnSound').addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  document.getElementById('btnSound').textContent = soundEnabled ? '🔊' : '🔇';
  document.getElementById('btnSound').title = soundEnabled ? '사운드 끄기' : '사운드 켜기';
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (document.getElementById('manageModal').style.display !== 'none') return;
  if (e.key === 'a' || e.key === 'A' || e.key === '1') document.getElementById('voteA').click();
  if (e.key === 'b' || e.key === 'B' || e.key === '2') document.getElementById('voteB').click();
  if (e.key === 'ArrowRight' || e.key === 'n' || e.key === 'N') document.getElementById('btnNext').click();
  if (e.key === 'r' || e.key === 'R') document.getElementById('btnReset').click();
  if (e.key === ' ') { e.preventDefault(); if (!resultVisible) document.getElementById('btnReveal').click(); }
});

/* ============================================================
   INIT
   ============================================================ */
function init() {
  loadQuestion();
  updateProgress();
  resetVoteUI();
}

init();
