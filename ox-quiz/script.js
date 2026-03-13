/* =====================================================
   O/X 퀴즈 — script.js
   ===================================================== */

'use strict';

// ─── 상태 ────────────────────────────────────────────
const TEAM_COLORS = ['color-0','color-1','color-2','color-3','color-4','color-5'];
const HEX_COLORS  = ['#6366f1','#f59e0b','#10b981','#ef4444','#3b82f6','#ec4899'];

const state = {
  questions: [],          // { text, answer }[]
  teams: [],              // { name, eliminated }[]
  currentQ: 0,
  revealed: false,
  teamChoices: {},        // { teamIdx: 'O'|'X' }
  gameActive: false,
};

// ─── 기본 예시 문제 ──────────────────────────────────
const DEFAULT_QUESTIONS = [
  // ── 건강/생활 상식 ──
  { text: '물은 하루에 8잔(약 2리터) 마시는 것이 권장된다.', answer: 'O' },
  { text: '체온은 겨드랑이보다 입 안이 더 높게 측정된다.', answer: 'O' },
  { text: '식후 바로 눕는 것은 소화에 도움이 된다.', answer: 'X' },
  { text: '비타민 C는 체내에 저장되어 오래 유지된다.', answer: 'X' },
  { text: '아침 식사를 거르면 점심에 과식할 가능성이 높아진다.', answer: 'O' },
  { text: '카페인은 커피보다 녹차에 더 많이 들어 있다.', answer: 'X' },
  { text: '손을 씻을 때 비누 없이 물만으로도 대부분의 세균이 제거된다.', answer: 'X' },
  { text: '수면 중에도 칼로리가 소모된다.', answer: 'O' },
  { text: '근육통은 운동 직후보다 1~2일 뒤에 더 심해질 수 있다.', answer: 'O' },
  { text: '스트레칭은 운동 전보다 운동 후에 더 효과적이다.', answer: 'O' },
  { text: '콜레스테롤은 무조건 몸에 해롭다.', answer: 'X' },
  { text: '눈을 비비면 시력이 나빠질 수 있다.', answer: 'O' },
  { text: '설탕보다 꿀이 혈당을 더 천천히 올린다.', answer: 'X' },
  { text: '30분 이상 낮잠은 오히려 피로감을 높일 수 있다.', answer: 'O' },
  { text: '스마트폰 화면을 어두운 곳에서 보면 눈이 나빠진다.', answer: 'X' },

  // ── 직장/비즈니스 상식 ──
  { text: '대한민국 법정 근로시간은 주 40시간이다.', answer: 'O' },
  { text: '연차 유급휴가는 입사 첫 해부터 최대 15일이 주어진다.', answer: 'X' },
  { text: '회사는 직원의 동의 없이 연봉을 삭감할 수 없다.', answer: 'O' },
  { text: '퇴직금은 1년 이상 근무한 모든 직원에게 지급된다.', answer: 'O' },
  { text: '명함을 받을 때는 두 손으로 받는 것이 예의다.', answer: 'O' },
  { text: '이메일 CC와 BCC는 수신자가 서로를 볼 수 있다.', answer: 'X' },
  { text: '회의 중 스마트폰을 테이블에 올려두는 것은 무례한 행동이다.', answer: 'O' },
  { text: '국민연금은 직원이 전액 부담한다.', answer: 'X' },
  { text: '직장 내 괴롭힘 금지법은 5인 이상 사업장에 적용된다.', answer: 'O' },
  { text: '업무상 재해는 출퇴근 중 사고도 포함된다.', answer: 'O' },

  // ── IT/디지털 상식 ──
  { text: 'Wi-Fi는 Wireless Fidelity의 약자다.', answer: 'X' },
  { text: '1GB는 1024MB이다.', answer: 'O' },
  { text: 'HTML은 프로그래밍 언어이다.', answer: 'X' },
  { text: 'PDF는 어도비(Adobe)가 만든 파일 형식이다.', answer: 'O' },
  { text: 'QR코드는 일본에서 처음 개발되었다.', answer: 'O' },
  { text: '엑셀에서 Ctrl+Z는 저장 단축키다.', answer: 'X' },
  { text: 'URL은 인터넷 주소를 의미한다.', answer: 'O' },
  { text: '스마트폰 배터리는 완전 방전 후 충전해야 오래 간다.', answer: 'X' },
  { text: 'AI의 딥러닝은 인간의 뇌 신경망을 모방한 기술이다.', answer: 'O' },
  { text: 'USB는 Universal Serial Bus의 약자다.', answer: 'O' },

  // ── 일반 상식 ──
  { text: '지구는 태양 주위를 공전한다.', answer: 'O' },
  { text: '인간의 몸에서 가장 큰 장기는 심장이다.', answer: 'X' },
  { text: '소금은 전기를 통하지 않는다.', answer: 'X' },
  { text: '달은 지구보다 작다.', answer: 'O' },
  { text: '타조는 날지 못하는 새다.', answer: 'O' },
  { text: '대한민국의 국화는 무궁화다.', answer: 'O' },
  { text: '서울은 대한민국 면적의 10%를 차지한다.', answer: 'X' },
  { text: '바나나는 나무 열매가 아니라 풀 열매다.', answer: 'O' },
  { text: '빛의 속도는 소리의 속도보다 빠르다.', answer: 'O' },
  { text: '다이아몬드는 탄소로만 이루어져 있다.', answer: 'O' },
];

// 선택된 문제 은행 인덱스
const selectedBankIdx = new Set();

// ─── 초기화 ──────────────────────────────────────────
(function init() {
  ['팀1', '팀2', '팀3', '팀4'].forEach(name => state.teams.push({ name, eliminated: false }));
  renderBankList();
  renderQuestions();
  renderTeams();
  updateStartBtn();
})();

// ─── 문제 은행 ────────────────────────────────────────
function renderBankList() {
  const list = document.getElementById('bank-list');
  list.innerHTML = '';
  DEFAULT_QUESTIONS.forEach((q, i) => {
    const li = document.createElement('li');
    const selected = selectedBankIdx.has(i);
    li.className = 'bank-item' + (selected ? ' bank-selected' : '');
    li.innerHTML = `
      <span class="bank-check">${selected ? '✅' : '☐'}</span>
      <span class="bank-text">${escHtml(q.text)}</span>
      <span class="q-answer ${q.answer}">${q.answer}</span>
    `;
    li.addEventListener('click', () => toggleBank(i));
    list.appendChild(li);
  });
}

function toggleBank(idx) {
  if (selectedBankIdx.has(idx)) {
    selectedBankIdx.delete(idx);
    // 선택된 문제 목록에서도 제거
    const q = DEFAULT_QUESTIONS[idx];
    const pos = state.questions.findIndex(sq => sq.text === q.text);
    if (pos !== -1) state.questions.splice(pos, 1);
  } else {
    if (state.questions.length >= 20) return;
    selectedBankIdx.add(idx);
    state.questions.push({ ...DEFAULT_QUESTIONS[idx] });
  }
  playTick();
  renderBankList();
  renderQuestions();
  updateStartBtn();
}

function selectAllBank() {
  DEFAULT_QUESTIONS.forEach((q, i) => {
    if (!selectedBankIdx.has(i) && state.questions.length < 20) {
      selectedBankIdx.add(i);
      state.questions.push({ ...q });
    }
  });
  renderBankList();
  renderQuestions();
  updateStartBtn();
}

function deselectAllBank() {
  selectedBankIdx.clear();
  // 커스텀 문제(은행에 없는 것)는 유지
  state.questions = state.questions.filter(sq =>
    !DEFAULT_QUESTIONS.some(dq => dq.text === sq.text)
  );
  renderBankList();
  renderQuestions();
  updateStartBtn();
}

// ─── 화면 전환 ───────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ─── 문제 관리 ───────────────────────────────────────
let selectedAnswer = '';

function selectAnswer(val) {
  selectedAnswer = val;
  document.getElementById('answer-btn-o').classList.toggle('selected', val === 'O');
  document.getElementById('answer-btn-x').classList.toggle('selected', val === 'X');
  playTick();
}

function addQuestion() {
  const text = document.getElementById('new-question-text').value.trim();
  if (!text) { shake('new-question-text'); return; }
  if (!selectedAnswer) { shake('answer-btn-o'); return; }
  if (state.questions.length >= 20) { alert('문제는 최대 20개까지 입력 가능합니다.'); return; }

  state.questions.push({ text, answer: selectedAnswer });
  document.getElementById('new-question-text').value = '';
  selectedAnswer = '';
  document.getElementById('answer-btn-o').classList.remove('selected');
  document.getElementById('answer-btn-x').classList.remove('selected');
  renderQuestions();
  updateStartBtn();
  playTick();
}

function deleteQuestion(idx) {
  state.questions.splice(idx, 1);
  renderQuestions();
  updateStartBtn();
}

function renderQuestions() {
  const list = document.getElementById('question-list');
  const count = document.getElementById('question-count');
  count.textContent = `${state.questions.length} / 20`;
  list.innerHTML = '';
  state.questions.forEach((q, i) => {
    const li = document.createElement('li');
    li.className = 'question-item';
    li.innerHTML = `
      <span class="q-num">${i + 1}</span>
      <span class="q-content">${escHtml(q.text)}</span>
      <span class="q-answer ${q.answer}">${q.answer}</span>
      <button class="del-btn" onclick="deleteQuestion(${i})">삭제</button>
    `;
    list.appendChild(li);
  });
}

// ─── 팀 관리 ─────────────────────────────────────────
function addTeam() {
  if (state.teams.length >= 6) { alert('팀은 최대 6개까지 추가할 수 있습니다.'); return; }
  const input = document.getElementById('new-team-name');
  const name = input.value.trim() || `팀${state.teams.length + 1}`;
  state.teams.push({ name, eliminated: false });
  input.value = '';
  renderTeams();
  updateStartBtn();
  playTick();
}

function deleteTeam(idx) {
  if (state.teams.length <= 2) { alert('팀은 최소 2개가 필요합니다.'); return; }
  state.teams.splice(idx, 1);
  renderTeams();
  updateStartBtn();
}

function renderTeams() {
  const list = document.getElementById('team-list');
  list.innerHTML = '';
  state.teams.forEach((t, i) => {
    const li = document.createElement('li');
    li.className = 'team-item';
    li.innerHTML = `
      <span class="team-dot ${TEAM_COLORS[i]}"></span>
      <span class="team-name-text">${escHtml(t.name)}</span>
      <button class="del-btn" onclick="deleteTeam(${i})">삭제</button>
    `;
    list.appendChild(li);
  });
}

function updateStartBtn() {
  const btn = document.getElementById('start-btn');
  const ok = state.questions.length >= 1 && state.teams.length >= 2;
  btn.disabled = !ok;
  btn.style.opacity = ok ? '1' : '0.5';
}

// ─── 게임 시작 ───────────────────────────────────────
function startGame() {
  if (state.questions.length < 1) return;
  if (state.teams.length < 2) return;

  // 팀 상태 초기화
  state.teams.forEach(t => t.eliminated = false);
  state.currentQ = 0;
  state.gameActive = true;

  showScreen('screen-game');
  loadQuestion();
  renderSurvivors();
  playTick();
}

function goSetup() {
  if (state.gameActive && !confirm('설정 화면으로 돌아가면 현재 게임이 초기화됩니다. 계속할까요?')) return;
  state.gameActive = false;
  showScreen('screen-setup');
}

// ─── 문제 로드 ───────────────────────────────────────
function loadQuestion() {
  const q = state.questions[state.currentQ];
  state.revealed = false;
  state.teamChoices = {};

  document.getElementById('game-q-index').textContent = state.currentQ + 1;
  document.getElementById('game-q-total').textContent = state.questions.length;
  document.getElementById('q-number').textContent = `Q${state.currentQ + 1}`;
  document.getElementById('q-text').textContent = q.text;

  // O/X 큰 버튼 상태 초기화
  document.getElementById('ox-o-btn').classList.remove('selected-ox');
  document.getElementById('ox-x-btn').classList.remove('selected-ox');
  document.getElementById('ox-o-btn').onclick = () => selectGlobalOX('O');
  document.getElementById('ox-x-btn').onclick = () => selectGlobalOX('X');

  // 정답 배너 숨김
  const banner = document.getElementById('answer-banner');
  banner.className = 'answer-banner hidden';

  // 버튼 상태
  document.getElementById('reveal-btn').style.display = '';
  document.getElementById('reveal-btn').disabled = false;
  document.getElementById('next-btn').style.display = 'none';

  // 팀 선택 카드 렌더
  renderTeamSelectionGrid();
}

// 큰 O/X 버튼 클릭 → 모든 활성 팀에 일괄 적용
function selectGlobalOX(val) {
  document.getElementById('ox-o-btn').classList.toggle('selected-ox', val === 'O');
  document.getElementById('ox-x-btn').classList.toggle('selected-ox', val === 'X');
  playTick();

  state.teams.forEach((t, i) => {
    if (!t.eliminated) {
      state.teamChoices[i] = val;
    }
  });
  updateTeamCards();
}

function renderTeamSelectionGrid() {
  const grid = document.getElementById('team-selection-grid');
  grid.innerHTML = '';
  state.teams.forEach((t, i) => {
    const card = document.createElement('div');
    card.className = 'team-choice-card' + (t.eliminated ? ' eliminated' : '');
    card.id = `team-card-${i}`;
    card.innerHTML = `
      <div class="team-choice-name">
        <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${HEX_COLORS[i]};margin-right:5px;vertical-align:middle;"></span>
        ${escHtml(t.name)}
      </div>
      <div class="ox-choice-row">
        <button class="ox-choice-btn o-btn ${state.teamChoices[i]==='O'?'chosen':''}"
          onclick="setTeamChoice(${i},'O')">O</button>
        <button class="ox-choice-btn x-btn ${state.teamChoices[i]==='X'?'chosen':''}"
          onclick="setTeamChoice(${i},'X')">X</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

function setTeamChoice(teamIdx, val) {
  if (state.teams[teamIdx].eliminated) return;
  if (state.revealed) return;
  state.teamChoices[teamIdx] = val;
  updateTeamCards();
  playTick();
}

function updateTeamCards() {
  state.teams.forEach((t, i) => {
    const card = document.getElementById(`team-card-${i}`);
    if (!card) return;
    const oBtn = card.querySelector('.o-btn');
    const xBtn = card.querySelector('.x-btn');
    if (oBtn) oBtn.classList.toggle('chosen', state.teamChoices[i] === 'O');
    if (xBtn) xBtn.classList.toggle('chosen', state.teamChoices[i] === 'X');
  });
}

// ─── 정답 확인 ───────────────────────────────────────
function revealAnswer() {
  if (state.revealed) return;
  state.revealed = true;

  const correct = state.questions[state.currentQ].answer;
  const banner = document.getElementById('answer-banner');

  // 배너 표시
  banner.className = `answer-banner ${correct === 'O' ? 'correct-banner' : 'wrong-banner'}`;
  banner.querySelector('#answer-banner-text').textContent =
    `정답: ${correct === 'O' ? '⭕ O' : '❌ X'}`;

  // 팀별 판정
  let anyEliminated = false;
  state.teams.forEach((t, i) => {
    if (t.eliminated) return;
    const card = document.getElementById(`team-card-${i}`);
    const choice = state.teamChoices[i];
    if (choice === correct) {
      card && card.classList.add('correct-flash');
      playCorrect();
    } else {
      // 탈락
      t.eliminated = true;
      if (card) {
        card.classList.add('wrong-flash');
        setTimeout(() => card.classList.add('eliminated'), 620);
      }
      anyEliminated = true;
      playWrong();
    }
  });

  renderSurvivors();

  // 버튼 전환
  document.getElementById('reveal-btn').style.display = 'none';
  document.getElementById('next-btn').style.display = '';

  // 승패 판정
  const survivors = state.teams.filter(t => !t.eliminated);
  if (survivors.length <= 1 || state.currentQ >= state.questions.length - 1) {
    document.getElementById('next-btn').textContent = '결과 보기 →';
    document.getElementById('next-btn').onclick = showResult;
  } else {
    document.getElementById('next-btn').textContent = '다음 문제 →';
    document.getElementById('next-btn').onclick = nextQuestion;
  }
}

// ─── 다음 문제 ───────────────────────────────────────
function nextQuestion() {
  const survivors = state.teams.filter(t => !t.eliminated);
  if (survivors.length <= 1) { showResult(); return; }
  if (state.currentQ >= state.questions.length - 1) { showResult(); return; }
  state.currentQ++;
  loadQuestion();
}

// ─── 생존 팀 렌더 ────────────────────────────────────
function renderSurvivors() {
  const list = document.getElementById('survivors-list');
  list.innerHTML = '';
  state.teams.forEach((t, i) => {
    const chip = document.createElement('div');
    chip.className = 'survivor-chip' + (t.eliminated ? ' out' : '');
    chip.innerHTML = `<span style="width:8px;height:8px;border-radius:50%;background:${HEX_COLORS[i]};display:inline-block;"></span>${escHtml(t.name)}`;
    list.appendChild(chip);
  });
}

// ─── 결과 화면 ───────────────────────────────────────
function showResult() {
  const survivors = state.teams.filter(t => !t.eliminated);
  const trophy = document.getElementById('result-trophy');
  const title  = document.getElementById('result-title');
  const winner = document.getElementById('result-winner');
  const sub    = document.getElementById('result-subtitle');

  if (survivors.length === 0) {
    trophy.textContent = '😅';
    title.textContent = '공동 탈락!';
    winner.textContent = '모든 팀이 탈락했습니다';
    sub.textContent = '아쉽지만 다시 도전해보세요!';
  } else if (survivors.length === 1) {
    trophy.textContent = '🏆';
    title.textContent = '우승!';
    winner.textContent = survivors[0].name;
    sub.textContent = '최후의 1팀! 축하합니다!';
    startConfetti();
    playFanfare();
  } else {
    trophy.textContent = '🎉';
    title.textContent = '게임 종료!';
    winner.textContent = survivors.map(t => t.name).join(' · ');
    sub.textContent = `${survivors.length}팀이 끝까지 생존했습니다!`;
    startConfetti();
    playFanfare();
  }

  showScreen('screen-result');
}

function resetGame() {
  stopConfetti();
  state.teams.forEach(t => t.eliminated = false);
  state.currentQ = 0;
  state.revealed = false;
  state.teamChoices = {};
  state.gameActive = false;
  showScreen('screen-setup');
}

// ─── 컨페티 ──────────────────────────────────────────
let confettiAF = null;
let confettiParticles = [];

function startConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const COLORS = ['#6366f1','#a78bfa','#fbbf24','#34d399','#f87171','#38bdf8','#fb7185'];
  confettiParticles = Array.from({ length: 140 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * -canvas.height,
    w: 6 + Math.random() * 8,
    h: 10 + Math.random() * 8,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rot: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.12,
    vx: (Math.random() - 0.5) * 2.5,
    vy: 2.5 + Math.random() * 3.5,
    alpha: 1,
  }));

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    confettiParticles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.rotSpeed;
      if (p.y > canvas.height * 0.8) p.alpha = Math.max(0, p.alpha - 0.018);
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    confettiParticles = confettiParticles.filter(p => p.alpha > 0);
    if (confettiParticles.length > 0) {
      confettiAF = requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  confettiAF = requestAnimationFrame(draw);
}

function stopConfetti() {
  if (confettiAF) { cancelAnimationFrame(confettiAF); confettiAF = null; }
  const canvas = document.getElementById('confetti-canvas');
  if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}

// ─── Web Audio API 사운드 ────────────────────────────
let audioCtx = null;
function getAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function beep({ freq = 440, type = 'sine', duration = 0.15, gain = 0.35, delay = 0 } = {}) {
  try {
    const ctx = getAudio();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    gainNode.gain.setValueAtTime(0, ctx.currentTime + delay);
    gainNode.gain.linearRampToValueAtTime(gain, ctx.currentTime + delay + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration + 0.02);
  } catch (e) { /* 사운드 없이 진행 */ }
}

function playTick() {
  beep({ freq: 880, type: 'sine', duration: 0.08, gain: 0.2 });
}

function playCorrect() {
  beep({ freq: 523, type: 'triangle', duration: 0.12, gain: 0.35 });
  beep({ freq: 659, type: 'triangle', duration: 0.12, gain: 0.35, delay: 0.1 });
  beep({ freq: 784, type: 'triangle', duration: 0.18, gain: 0.35, delay: 0.2 });
}

function playWrong() {
  beep({ freq: 220, type: 'sawtooth', duration: 0.25, gain: 0.3 });
  beep({ freq: 180, type: 'sawtooth', duration: 0.3, gain: 0.25, delay: 0.2 });
}

function playFanfare() {
  const notes = [
    { freq: 523, delay: 0.0, dur: 0.15 },
    { freq: 659, delay: 0.15, dur: 0.15 },
    { freq: 784, delay: 0.30, dur: 0.15 },
    { freq: 1047,delay: 0.45, dur: 0.30 },
    { freq: 784, delay: 0.50, dur: 0.15 },
    { freq: 1047,delay: 0.65, dur: 0.50 },
  ];
  notes.forEach(n => beep({ freq: n.freq, type: 'triangle', duration: n.dur, gain: 0.4, delay: n.delay }));
}

// ─── 유틸 ─────────────────────────────────────────────
function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function shake(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.animation = 'none';
  requestAnimationFrame(() => {
    el.style.animation = 'wrongFlash 0.5s ease';
  });
}

// Enter 키로 팀/문제 추가
document.getElementById('new-team-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') addTeam();
});
document.getElementById('new-question-text').addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.ctrlKey) addQuestion();
});
