/* ===== 팔레트 ===== */
const COLORS = [
  { bg: '#6366f1', glow: 'rgba(99,102,241,0.6)' },
  { bg: '#ec4899', glow: 'rgba(236,72,153,0.6)' },
  { bg: '#f59e0b', glow: 'rgba(245,158,11,0.6)' },
  { bg: '#10b981', glow: 'rgba(16,185,129,0.6)' },
  { bg: '#3b82f6', glow: 'rgba(59,130,246,0.6)' },
  { bg: '#f97316', glow: 'rgba(249,115,22,0.6)' },
  { bg: '#14b8a6', glow: 'rgba(20,184,166,0.6)' },
  { bg: '#a855f7', glow: 'rgba(168,85,247,0.6)' },
  { bg: '#e11d48', glow: 'rgba(225,29,72,0.6)' },
  { bg: '#0ea5e9', glow: 'rgba(14,165,233,0.6)' },
];
const CHARS = ['🐱','🐶','🐸','🐰','🐼','🦊','🐧','🐨','🐯','🦁'];

/* ===== 사운드 ===== */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function resumeAudio() { if (audioCtx.state === 'suspended') audioCtx.resume(); }
function playTone({ freq=440, type='sine', dur=0.15, vol=0.2 }) {
  resumeAudio();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.type = type; osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
  osc.start(); osc.stop(audioCtx.currentTime + dur + 0.05);
}

const SFX = {
  tick(speed) {
    const freq = 300 + speed * 0.3;
    playTone({ freq, type: 'triangle', dur: 0.04, vol: 0.1 });
  },
  result() {
    [523, 659, 784, 1047, 1319].forEach((f, i) =>
      setTimeout(() => playTone({ freq: f, type: 'sine', dur: 0.28, vol: 0.25 }), i * 90)
    );
  },
  add() { playTone({ freq: 880, type: 'sine', dur: 0.1, vol: 0.15 }); },
};

function confetti() {
  const cols = ['#a78bfa','#f472b6','#fbbf24','#34d399','#60a5fa','#fb923c'];
  for (let i = 0; i < 80; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.cssText = `
      left:${Math.random()*100}vw;
      background:${cols[Math.floor(Math.random()*cols.length)]};
      width:${6+Math.random()*8}px; height:${6+Math.random()*8}px;
      border-radius:${Math.random()>.5?'50%':'2px'};
      animation-duration:${1.5+Math.random()*2}s;
      animation-delay:${Math.random()*0.6}s;
    `;
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

/* ===== 상태 ===== */
const members  = [];
const history  = [];
let spinning   = false;
let angle      = 0;   // 현재 휠 각도 (라디안)
let animId     = null;

/* ===== DOM ===== */
const nameInput    = document.getElementById('name-input');
const addBtn       = document.getElementById('add-btn');
const memberList   = document.getElementById('member-list');
const resetBtn     = document.getElementById('reset-btn');
const spinBtn      = document.getElementById('spin-btn');
const canvas       = document.getElementById('wheel-canvas');
const ctx          = canvas.getContext('2d');
const resultOverlay = document.getElementById('result-overlay');
const resultChar   = document.getElementById('result-char');
const resultName   = document.getElementById('result-name');
const closeBtn     = document.getElementById('close-btn');
const historySection = document.getElementById('history-section');
const historyList  = document.getElementById('history-list');
const clearHistoryBtn = document.getElementById('clear-history-btn');
const countHint    = document.getElementById('count-hint');

/* ===== 캔버스 크기 ===== */
function getWheelSize() {
  const max = Math.min(window.innerWidth - 320, window.innerHeight - 260, 560);
  return Math.max(260, max);
}

/* ===== 멤버 관리 ===== */
function addMember() {
  const name = nameInput.value.trim();
  if (!name || members.includes(name) || members.length >= 10) { nameInput.value = ''; return; }
  members.push(name);
  nameInput.value = '';
  SFX.add();
  renderMemberList();
  drawWheel();
  updateSpinBtn();
}

function removeMember(idx) {
  members.splice(idx, 1);
  renderMemberList();
  drawWheel();
  updateSpinBtn();
}

function renderMemberList() {
  memberList.innerHTML = '';
  members.forEach((name, i) => {
    const div = document.createElement('div');
    div.className = 'member-item';
    const color = COLORS[i % COLORS.length].bg;
    div.innerHTML = `
      <span class="member-dot" style="background:${color}"></span>
      <span class="member-name">${CHARS[i % CHARS.length]} ${name}</span>
      <button class="member-remove" data-idx="${i}">×</button>`;
    memberList.appendChild(div);
  });
  memberList.querySelectorAll('.member-remove').forEach(btn =>
    btn.addEventListener('click', () => removeMember(Number(btn.dataset.idx)))
  );
  countHint.textContent = members.length < 2
    ? `${members.length}명 — 2명 이상 추가하세요`
    : `${members.length}명 등록됨`;
}

function updateSpinBtn() { spinBtn.disabled = members.length < 2 || spinning; }

addBtn.addEventListener('click', addMember);
nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') addMember(); });
resetBtn.addEventListener('click', () => { members.length = 0; renderMemberList(); drawWheel(); updateSpinBtn(); });

/* ===== 휠 그리기 ===== */
function drawWheel(rot = angle) {
  const size = getWheelSize();
  canvas.width = canvas.height = size;
  const cx = size / 2, cy = size / 2, r = size / 2 - 8;

  ctx.clearRect(0, 0, size, size);

  if (members.length === 0) {
    // 빈 휠
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = `${size * 0.07}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('참가자를 추가하세요', cx, cy);
    return;
  }

  const n   = members.length;
  const arc = (Math.PI * 2) / n;

  // 세그먼트
  members.forEach((name, i) => {
    const start = rot + i * arc - Math.PI / 2;
    const end   = start + arc;
    const color = COLORS[i % COLORS.length];

    // 채우기
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, end);
    ctx.closePath();
    ctx.fillStyle = color.bg;
    ctx.shadowColor = color.glow;
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;

    // 경계선
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, end);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 캐릭터 + 이름
    const midAngle = start + arc / 2;
    const textR    = r * 0.65;
    const tx = cx + textR * Math.cos(midAngle);
    const ty = cy + textR * Math.sin(midAngle);

    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(midAngle + Math.PI / 2);

    // 이모지
    const emojiSize = Math.max(14, Math.min(size * 0.07, arc * r * 0.5));
    ctx.font = `${emojiSize}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(CHARS[i % CHARS.length], 0, -emojiSize * 0.7);

    // 이름
    const fontSize = Math.max(10, Math.min(size * 0.045, emojiSize * 0.85));
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.fillText(name, 0, emojiSize * 0.5);
    ctx.shadowBlur = 0;

    ctx.restore();
  });

  // 중앙 원
  const hubR = size * 0.085;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, hubR);
  grad.addColorStop(0, '#fff');
  grad.addColorStop(1, '#a78bfa');
  ctx.beginPath();
  ctx.arc(cx, cy, hubR, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.shadowColor = 'rgba(167,139,250,0.8)';
  ctx.shadowBlur = 20;
  ctx.fill();
  ctx.shadowBlur = 0;

  // 중앙 SPIN 텍스트
  ctx.fillStyle = '#1a1a2e';
  ctx.font = `bold ${size * 0.038}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SPIN', cx, cy);

  // 외곽 링
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 4;
  ctx.stroke();
}

/* ===== 스핀 ===== */
function spin() {
  if (spinning || members.length < 2) return;
  resumeAudio();
  spinning = true;
  spinBtn.disabled = true;

  // 목표: 랜덤 세그먼트에 정확히 멈추기
  const n         = members.length;
  const arc       = (Math.PI * 2) / n;
  const target    = Math.floor(Math.random() * n);  // 멈출 세그먼트 인덱스
  // 포인터는 12시(위) = -π/2, 각 세그먼트의 중심각 계산
  const segCenter = target * arc;
  // 여러 바퀴 + 목표 위치로 회전
  const totalSpin = Math.PI * 2 * (6 + Math.random() * 4) + (Math.PI * 2 - segCenter) - angle % (Math.PI * 2) + Math.PI / 2;
  const startAngle = angle;
  const endAngle   = angle + totalSpin;

  const duration   = 4000 + Math.random() * 1500; // 4~5.5초
  const startTime  = performance.now();
  let lastTickAngle = angle;

  function easeOut(t) {
    // cubic ease-out
    return 1 - Math.pow(1 - t, 3);
  }

  function frame(now) {
    const elapsed  = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    angle = startAngle + totalSpin * easeOut(progress);

    // 틱 사운드 (빠를 때만)
    const speed = Math.abs(angle - lastTickAngle) * (180 / Math.PI);
    if (speed > 4) { SFX.tick(speed); }
    lastTickAngle = angle;

    drawWheel(angle);

    if (progress < 1) {
      animId = requestAnimationFrame(frame);
    } else {
      angle = endAngle;
      drawWheel(angle);
      spinning = false;
      showResult(target);
    }
  }
  animId = requestAnimationFrame(frame);
}

/* ===== 결과 표시 ===== */
function showResult(idx) {
  const name = members[idx];
  const char = CHARS[idx % CHARS.length];

  resultChar.textContent = char;
  resultName.textContent = name;
  resultOverlay.classList.remove('hidden');

  SFX.result();
  confetti();

  // 히스토리
  history.push({ name, char, time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) });
  renderHistory();
}

function renderHistory() {
  if (history.length === 0) { historySection.classList.add('hidden'); return; }
  historySection.classList.remove('hidden');
  historyList.innerHTML = '';
  history.slice().reverse().forEach(h => {
    const chip = document.createElement('div');
    chip.className = 'history-chip';
    chip.innerHTML = `${h.char} <strong>${h.name}</strong> <span>${h.time}</span>`;
    historyList.appendChild(chip);
  });
}

closeBtn.addEventListener('click', () => {
  resultOverlay.classList.add('hidden');
  updateSpinBtn();
});

clearHistoryBtn.addEventListener('click', () => {
  history.length = 0;
  renderHistory();
});

spinBtn.addEventListener('click', spin);

/* ===== 창 리사이즈 ===== */
window.addEventListener('resize', () => drawWheel(angle));

/* ===== 초기 렌더링 ===== */
drawWheel();
renderMemberList();
