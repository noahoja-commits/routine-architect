import { facts, prebuiltRoutines } from './db.js';
import { generateRoutine } from './generator.js';

// Escape user-supplied strings before inserting via innerHTML (XSS guard)
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

// Minimal non-blocking toast (bottom-center pill, auto-dismiss)
let _toastTimer = null;
function showToast(msg) {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.className = 'app-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('visible');
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => {
    toast.classList.remove('visible');
  }, 2500);
}

// Application State Management
let customRoutines = JSON.parse(localStorage.getItem('custom_routines')) || [];
let completions = JSON.parse(localStorage.getItem('routine_completions')) || [];
let userStreak = parseInt(localStorage.getItem('user_streak')) || 0;
let userLongestStreak = parseInt(localStorage.getItem('user_longest_streak')) || 0;
let lastCompletionDate = localStorage.getItem('last_completion_date') || "";

// XP & Level State (New Gamification System)
let userXP = parseInt(localStorage.getItem('user_xp')) || 0;

// Active Player State
let activeRoutine = null;
let currentStepIndex = 0;
let timerInterval = null;
let timerSecondsRemaining = 0;
let timerDurationTotal = 0;
let timerEndTimestamp = 0;
let isPlaying = false;

// Audio Variables (Unlocked and procedurally synthesized offline)
let audioContext = null;
let ambientGainNode = null;
let brownNoiseNode = null;
let binauralOscL = null;
let binauralOscR = null;
let pulseOsc = null;
let pulseLfo = null;
let isAmbientPlaying = false;

// Pre-flight Adjuster State
let preflightSteps = [];
let preflightRoutine = null;

// Custom Builder State
let creatorSteps = [];

// Calendar view state (which month the tracker calendar is showing)
let calendarViewYear = new Date().getFullYear();
let calendarViewMonth = new Date().getMonth(); // 0-indexed

// DOM Elements
let navLinks, panels, prebuiltGrid, streakValues, themeDarkBtn, themeLightBtn, voiceToggle;

// Initialize Application
function init() {
  navLinks = document.querySelectorAll('.nav-link');
  panels = document.querySelectorAll('.view-panel');
  prebuiltGrid = document.getElementById('prebuilt-library-grid');
  streakValues = document.querySelectorAll('#sidebar-streak-value');
  themeDarkBtn = document.getElementById('theme-dark-btn');
  themeLightBtn = document.getElementById('theme-light-btn');
  voiceToggle = document.getElementById('player-voice-toggle');
  
  setupNavigation();
  setupTheme();
  renderLibrary();
  setupGenerator();
  setupPlayer();
  setupCreator();
  setupTracker();
  setupFactExplorer();
  setupPreflightAdjuster();
  setupAmbientController();
  setupPlanner();          // Templates + Weekly Schedule + Reminders
  setupTrackerExtras();    // Year heatmap + deep analytics + today step checklist
  updateStreakDisplay();
  updateLevelingUI();
  loadDailyScienceFact();
  
  document.body.addEventListener('click', initAudioContext, { once: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  // Defer to a macrotask so the rest of this module (later top-level `let`
  // declarations like calendarNavWired/schedule/stepLog) finishes evaluating
  // first — calling init() synchronously here hits a Temporal Dead Zone.
  setTimeout(init, 0);
}

// Helper to initialize and resume Web Audio Context safely
function initAudioContext() {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
    }
  } catch (err) {
    console.warn('Audio Context blocked or not supported on this browser.', err);
  }
}

// Physical haptic thumps (Web Vibration API)
function vibratePattern(pattern) {
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (err) {
      // Catch and ignore safety exceptions
    }
  }
}

// Daily Science Fact Banner Loader
function loadDailyScienceFact() {
  const banner = document.getElementById('daily-fact-banner');
  const bannerText = document.getElementById('daily-fact-banner-text');
  const closeBtn = document.getElementById('daily-fact-close-btn');

  if (!banner || !bannerText || !closeBtn) return;

  if (sessionStorage.getItem('daily_fact_closed') === 'true') {
    banner.style.display = 'none';
    return;
  }

  const keys = Object.keys(facts);
  if (keys.length === 0) return;

  // Stably select fact based on current day of the year
  const today = new Date();
  const daySeed = today.getFullYear() * 1000 + today.getMonth() * 100 + today.getDate();
  const randomIndex = daySeed % keys.length;
  const factKey = keys[randomIndex];
  const fact = facts[factKey];

  if (fact) {
    bannerText.innerHTML = `<strong>${fact.title}</strong>: ${fact.text} <em>(${fact.source})</em>`;
    banner.style.display = 'flex';
  }

  closeBtn.addEventListener('click', () => {
    banner.style.display = 'none';
    sessionStorage.setItem('daily_fact_closed', 'true');
    vibratePattern([50]); // subtle haptic click on dismiss
  });
}

// 1. Navigation Controller
function setupNavigation() {
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.dataset.target;
      vibratePattern([40]); // Subtle click vibe
      switchPanel(target);
    });
  });
}

function switchPanel(panelId) {
  navLinks.forEach(link => {
    if (link.dataset.target === panelId) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    } else {
      link.classList.remove('active');
      link.removeAttribute('aria-current');
    }
  });

  panels.forEach(panel => {
    if (panel.id === `panel-${panelId}`) {
      panel.classList.add('active');
    } else {
      panel.classList.remove('active');
    }
  });
}

// 2. Theme Controller
function setupTheme() {
  const currentTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);
  
  if (currentTheme === 'light') {
    themeLightBtn.classList.add('active');
    themeDarkBtn.classList.remove('active');
  } else {
    themeDarkBtn.classList.add('active');
    themeLightBtn.classList.remove('active');
  }

  themeDarkBtn.addEventListener('click', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
    vibratePattern([40]);
    themeDarkBtn.classList.add('active');
    themeLightBtn.classList.remove('active');
  });

  themeLightBtn.addEventListener('click', () => {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('theme', 'light');
    vibratePattern([40]);
    themeLightBtn.classList.add('active');
    themeDarkBtn.classList.remove('active');
  });
}

// 3. Discover Library Panel
function renderLibrary() {
  prebuiltGrid.innerHTML = '';
  const allRoutines = [...prebuiltRoutines, ...customRoutines];

  allRoutines.forEach(routine => {
    const card = document.createElement('div');
    card.className = 'card';
    
    const iconMap = {
      // Default clock
      'clock': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
      'sunrise': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 18a5 5 0 0 0-10 0"></path><line x1="12" y1="2" x2="12" y2="9"></line><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"></line><line x1="1" y1="18" x2="3" y2="18"></line><line x1="21" y1="18" x2="23" y2="18"></line><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"></line><line x1="23" y1="22" x2="1" y2="22"></line><polyline points="8 6 12 2 16 6"></polyline></svg>',
      'code': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>',
      'moon': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>',
      'activity': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>',
      'sparkles': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v1M12 20v1M3 12h1M20 12h1M18.36 5.64l-.7.7M6.34 17.66l-.7.7M18.36 18.36l-.7-.7M6.34 6.34l-.7-.7M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/></svg>',
      // Keys emitted by the generator
      'home': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>',
      'heart': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>',
      'book-open': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>',
      'coffee': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>',
      'wind': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"></path></svg>',
      'dollar-sign': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>'
    };
    let svgIcon = iconMap[routine.icon] || iconMap['clock'];

    card.innerHTML = `
      <div class="card-icon">${svgIcon}</div>
      <h3 class="card-title">${escapeHtml(routine.title)}</h3>
      <p class="card-desc">${escapeHtml(routine.description)}</p>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem;">
        <span class="card-badge">${escapeHtml(routine.category)}</span>
        <span style="font-family:var(--font-mono); font-size:0.8rem; color:var(--text-secondary); font-weight:600;">⏱️ ${routine.duration} mins</span>
      </div>

      <div class="card-meta">
        <span>Score: <strong style="color:var(--accent);">${routine.stats.scientificScore}% Valid</strong></span>
        <button class="card-btn" data-id="${routine.id}">Launch</button>
      </div>
    `;

    card.querySelector('.card-btn').addEventListener('click', () => {
      initAudioContext();
      vibratePattern([50]);
      openPreflightAdjuster(routine); // Launches Pre-flight Customizer Modal
    });

    prebuiltGrid.appendChild(card);
  });
}

// 4. Smart Generator Panel
function setupGenerator() {
  const form = document.getElementById('generator-form');
  const promptTextarea = document.getElementById('generator-prompt');
  const generatorLoading = document.getElementById('generator-loading');
  const generatorResult = document.getElementById('generator-result');
  const resultStepsContainer = document.getElementById('result-steps-container');
  const resultTitle = document.getElementById('result-title');
  const resultDesc = document.getElementById('result-desc');
  const startBtn = document.getElementById('result-start-btn');
  const printBtn = document.getElementById('result-print-btn');
  
  const factTitle = document.getElementById('result-fact-title');
  const factText = document.getElementById('result-fact-text');
  const factSource = document.getElementById('result-fact-source');

  let currentGeneratedRoutine = null;

  document.querySelectorAll('.suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      promptTextarea.value = chip.textContent;
      promptTextarea.focus();
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const promptVal = promptTextarea.value.trim();
    if (!promptVal) return;
    
    generatorResult.style.display = 'none';
    generatorLoading.style.display = 'block';

    setTimeout(() => {
      generatorLoading.style.display = 'none';
      
      try {
        currentGeneratedRoutine = generateRoutine(promptVal);
        
        document.getElementById('generator-duration').value = currentGeneratedRoutine.duration;
        document.getElementById('generator-difficulty').value = currentGeneratedRoutine.difficulty;

        resultTitle.textContent = currentGeneratedRoutine.title;
        resultDesc.textContent = currentGeneratedRoutine.description;
        
        renderSteps(currentGeneratedRoutine.steps);
        generatorResult.style.display = 'block';
      } catch (err) {
        console.error(err);
        showToast("Failed to compile routine. Please try a simpler phrasing.");
      }
    }, 1200);
  });

  function renderSteps(steps) {
    resultStepsContainer.innerHTML = '';
    
    steps.forEach((step, idx) => {
      const stepCard = document.createElement('div');
      stepCard.className = `step-card ${idx === 0 ? 'active' : ''}`;
      
      stepCard.innerHTML = `
        <div class="step-time-badge">${step.duration} min</div>
        <div class="step-details">
          <h4 class="step-title">${escapeHtml(step.title)}</h4>
          <p class="step-desc">${escapeHtml(step.desc)}</p>
          <div class="step-meta-row">
            <span>Timing: <strong>${step.time}</strong></span>
            <span class="step-fact-trigger" data-factkey="${step.factKey}">
              💡 Science Fact
            </span>
          </div>
        </div>
      `;

      stepCard.addEventListener('click', () => {
        document.querySelectorAll('.step-card').forEach(c => c.classList.remove('active'));
        stepCard.classList.add('active');
        loadFactToSidePanel(step.factKey);
      });

      resultStepsContainer.appendChild(stepCard);
    });

    if (steps.length > 0) {
      loadFactToSidePanel(steps[0].factKey);
    }
  }

  function loadFactToSidePanel(factKey) {
    const fact = facts[factKey];
    if (fact) {
      factTitle.textContent = fact.title;
      factText.textContent = fact.text;
      factSource.textContent = `Source: ${fact.source}`;
    } else {
      factTitle.textContent = "Clinical Justification";
      factText.textContent = "This custom activity block is arranged to balance active cognitive effort with neural recovery phases, preventing system fatigue.";
      factSource.textContent = "Cognitive Ergonomics Research";
    }
  }

  startBtn.addEventListener('click', () => {
    initAudioContext();
    if (currentGeneratedRoutine) {
      openPreflightAdjuster(currentGeneratedRoutine); // Launch Customizer
    }
  });

  printBtn.addEventListener('click', () => {
    window.print();
  });
}

// 5. Active Routine Player Controller
function setupPlayer() {
  const prevBtn = document.getElementById('player-prev-btn');
  const playBtn = document.getElementById('player-play-btn');
  const nextBtn = document.getElementById('player-next-btn');
  const cancelBtn = document.getElementById('player-cancel-btn');

  playBtn.addEventListener('click', () => {
    initAudioContext();
    vibratePattern([50]);
    togglePlayPause();
  });
  
  prevBtn.addEventListener('click', () => {
    initAudioContext();
    vibratePattern([40]);
    moveStep(-1);
  });
  
  nextBtn.addEventListener('click', () => {
    initAudioContext();
    vibratePattern([40]);
    moveStep(1);
  });
  
  cancelBtn.addEventListener('click', () => {
    vibratePattern([60]);
    resetPlayer();
  });
}

function loadRoutineIntoPlayer(routine) {
  if (!routine.steps || routine.steps.length === 0) {
    showToast("This routine has no steps to play.");
    return;
  }
  
  activeRoutine = routine;
  currentStepIndex = 0;
  isPlaying = false;
  
  if (timerInterval) clearInterval(timerInterval);
  
  const emptyState = document.getElementById('player-empty-state');
  const activeState = document.getElementById('player-active-state');
  const statScienceVal = document.getElementById('player-stat-science-val');
  const statScienceBar = document.getElementById('player-stat-science-bar');
  const statFocusVal = document.getElementById('player-stat-focus-val');
  const statFocusBar = document.getElementById('player-stat-focus-bar');
  const statPhysVal = document.getElementById('player-stat-phys-val');
  const statPhysBar = document.getElementById('player-stat-phys-bar');

  emptyState.style.display = 'none';
  activeState.style.display = 'block';
  document.getElementById('player-active-dot').style.display = 'block';
  
  statScienceVal.textContent = `${routine.stats.scientificScore}%`;
  statScienceBar.style.width = `${routine.stats.scientificScore}%`;
  statFocusVal.textContent = `${routine.stats.focusRequired}%`;
  statFocusBar.style.width = `${routine.stats.focusRequired}%`;
  statPhysVal.textContent = `${routine.stats.physicalIntensity}%`;
  statPhysBar.style.width = `${routine.stats.physicalIntensity}%`;

  loadStep(0);
}

function loadStep(idx) {
  if (!activeRoutine || idx < 0 || idx >= activeRoutine.steps.length) return;
  
  currentStepIndex = idx;
  const step = activeRoutine.steps[currentStepIndex];
  
  document.getElementById('player-routine-title').textContent = activeRoutine.title;
  document.getElementById('player-step-title').textContent = step.title;
  document.getElementById('player-step-desc').textContent = step.desc;
  
  timerDurationTotal = step.duration * 60;
  timerSecondsRemaining = timerDurationTotal;
  
  updateTimerText();
  updateProgressRing();
  loadFactForPlayer(step.factKey);
  renderPlayerTimeline(); // Redraw checklist
  speakStep(step);
  
  // Update procedural soundscape if currently playing
  if (isAmbientPlaying) {
    playAmbientSoundscape();
  }
}

function loadFactForPlayer(factKey) {
  const factTitle = document.getElementById('player-fact-title');
  const factText = document.getElementById('player-fact-text');
  const factSource = document.getElementById('player-fact-source');

  const fact = facts[factKey];
  if (fact) {
    factTitle.textContent = fact.title;
    factText.textContent = fact.text;
    factSource.textContent = `Source: ${fact.source}`;
  } else {
    factTitle.textContent = "Active Performance Phase";
    factText.textContent = "Executing planned activities using custom time blocks. Sustained attention maintains synaptic firing and reinforces mental focus pathways.";
    factSource.textContent = "Somatic Habituation Models";
  }
}

function updateTimerText() {
  const mins = Math.floor(timerSecondsRemaining / 60);
  const secs = timerSecondsRemaining % 60;
  document.getElementById('player-timer-time').textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function updateProgressRing() {
  const progressRing = document.getElementById('timer-progress-ring');
  const circumference = 565.48;
  const progress = timerSecondsRemaining / timerDurationTotal;
  const offset = circumference * (1 - progress);
  progressRing.style.strokeDashoffset = offset;
}

function togglePlayPause() {
  const playIcon = document.getElementById('play-icon');
  const pauseIcon = document.getElementById('pause-icon');
  const timerStatus = document.getElementById('player-timer-status');

  if (isPlaying) {
    isPlaying = false;
    clearInterval(timerInterval);
    playIcon.style.display = 'block';
    pauseIcon.style.display = 'none';
    timerStatus.textContent = 'Paused';
  } else {
    isPlaying = true;
    timerEndTimestamp = Date.now() + (timerSecondsRemaining * 1000);
    timerInterval = setInterval(tickTimer, 200);
    playIcon.style.display = 'none';
    pauseIcon.style.display = 'block';
    timerStatus.textContent = 'Remaining';
  }
}

function tickTimer() {
  // Guard against the timer firing after a reset cleared the active routine
  if (!activeRoutine) {
    clearInterval(timerInterval);
    return;
  }
  const remaining = Math.max(0, Math.round((timerEndTimestamp - Date.now()) / 1000));
  timerSecondsRemaining = remaining;
  
  updateTimerText();
  updateProgressRing();

  if (timerSecondsRemaining <= 0) {
    clearInterval(timerInterval);
    playChime();
    
    if (currentStepIndex + 1 < activeRoutine.steps.length) {
      setTimeout(() => {
        loadStep(currentStepIndex + 1);
        if (isPlaying) {
          timerEndTimestamp = Date.now() + (timerSecondsRemaining * 1000);
          timerInterval = setInterval(tickTimer, 200);
        }
      }, 800);
    } else {
      setTimeout(completeActiveRoutine, 800);
    }
  }
}

function moveStep(direction) {
  clearInterval(timerInterval);
  const targetIdx = currentStepIndex + direction;
  if (targetIdx >= 0 && targetIdx < activeRoutine.steps.length) {
    loadStep(targetIdx);
    if (isPlaying) {
      timerEndTimestamp = Date.now() + (timerSecondsRemaining * 1000);
      timerInterval = setInterval(tickTimer, 200);
    }
  } else if (targetIdx >= activeRoutine.steps.length) {
    completeActiveRoutine();
  }
}

function completeActiveRoutine() {
  isPlaying = false;
  clearInterval(timerInterval);
  playChime();
  stopAmbientSoundscape();
  document.getElementById('ambient-sound-toggle').checked = false;
  
  vibratePattern([200, 100, 200, 100, 300]); // Triumphant completion pattern
  
  logRoutineCompletion(activeRoutine);
  showToast(`Completed "${activeRoutine.title}" — earned ${activeRoutine.duration * 10} XP!`);

  resetPlayer();
  switchPanel('tracker');
}

function resetPlayer() {
  isPlaying = false;
  if (timerInterval) clearInterval(timerInterval);
  activeRoutine = null;
  currentStepIndex = 0;
  
  stopAmbientSoundscape();
  document.getElementById('ambient-sound-toggle').checked = false;
  
  document.getElementById('play-icon').style.display = 'block';
  document.getElementById('pause-icon').style.display = 'none';
  
  document.getElementById('player-empty-state').style.display = 'block';
  document.getElementById('player-active-state').style.display = 'none';
  document.getElementById('player-active-dot').style.display = 'none';
  
  window.speechSynthesis.cancel();
}

function playChime() {
  initAudioContext();
  vibratePattern([100, 80, 100]); // double tap haptic on step transition
  if (!audioContext) return;
  
  try {
    const now = audioContext.currentTime;
    
    const osc1 = audioContext.createOscillator();
    const gain1 = audioContext.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(783.99, now);
    gain1.gain.setValueAtTime(0.1, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(audioContext.destination);
    osc1.start();
    osc1.stop(now + 0.3);
    
    setTimeout(() => {
      if (!audioContext || audioContext.state === 'suspended') return;
      const now2 = audioContext.currentTime;
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1046.50, now2);
      gain2.gain.setValueAtTime(0.1, now2);
      gain2.gain.exponentialRampToValueAtTime(0.01, now2 + 0.4);
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.start();
      osc2.stop(now2 + 0.4);
    }, 150);
  } catch (err) {
    console.warn("Chime playback error:", err);
  }
}

function speakStep(step) {
  if (!voiceToggle || !voiceToggle.checked) return;
  
  try {
    window.speechSynthesis.cancel();
    
    const announcement = `Starting: ${step.title}. ${step.desc}`;
    const utterance = new SpeechSynthesisUtterance(announcement);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    
    const voices = window.speechSynthesis.getVoices();
    const bestVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural')));
    if (bestVoice) utterance.voice = bestVoice;
    
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn("Speech Synthesis failed to run:", err);
  }
}

// Renders the pulsing active checklist timeline on player side panel
function renderPlayerTimeline() {
  const stepsContainer = document.getElementById('player-timeline-steps');
  if (!stepsContainer || !activeRoutine) return;

  stepsContainer.innerHTML = '';

  activeRoutine.steps.forEach((step, idx) => {
    const node = document.createElement('div');
    let stateClass = '';
    
    if (idx === currentStepIndex) {
      stateClass = 'active';
    } else if (idx < currentStepIndex) {
      stateClass = 'completed';
    }

    node.className = `timeline-step-node ${stateClass}`;
    node.innerHTML = `
      <div class="timeline-indicator"></div>
      <span class="timeline-step-text">${idx + 1}. ${escapeHtml(step.title)} (${step.duration} min)</span>
    `;

    // Click to Jump directly to step
    node.addEventListener('click', () => {
      initAudioContext();
      loadStep(idx);
      if (isPlaying) {
        timerEndTimestamp = Date.now() + (timerSecondsRemaining * 1000);
      }
    });

    stepsContainer.appendChild(node);
  });
}

// 6. Habit Tracker & Analytics Controller
function setupTracker() {
  updateTrackerUI();
  setupBackupRestore();
}

function logRoutineCompletion(routine) {
  const todayStr = new Date().toISOString().split('T')[0];
  
  const record = {
    id: routine.id,
    title: routine.title,
    score: routine.stats.scientificScore,
    date: todayStr,
    timestamp: Date.now()
  };
  
  completions.push(record);
  localStorage.setItem('routine_completions', JSON.stringify(completions));
  
  // Calculate XP points: 10 XP per minute focused
  const xpEarned = routine.duration * 10;
  userXP += xpEarned;
  localStorage.setItem('user_xp', userXP.toString());
  
  calculateStreaks(todayStr);
  updateTrackerUI();
  updateStreakDisplay();
  updateLevelingUI();
}

function calculateStreaks(todayStr) {
  if (lastCompletionDate === todayStr) {
    return;
  }

  if (lastCompletionDate) {
    const lastDate = new Date(lastCompletionDate);
    const currentDate = new Date(todayStr);
    const diffTime = Math.abs(currentDate - lastDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      userStreak++;
    } else if (diffDays > 1) {
      userStreak = 1;
    }
  } else {
    userStreak = 1;
  }
  
  if (userStreak > userLongestStreak) {
    userLongestStreak = userStreak;
  }
  
  lastCompletionDate = todayStr;
  
  localStorage.setItem('user_streak', userStreak.toString());
  localStorage.setItem('user_longest_streak', userLongestStreak.toString());
  localStorage.setItem('last_completion_date', lastCompletionDate);
}

function updateStreakDisplay() {
  streakValues.forEach(elem => {
    elem.textContent = `${userStreak} Day${userStreak === 1 ? '' : 's'}`;
  });
  const mobileStreak = document.getElementById('mobile-header-streak-badge');
  if (mobileStreak) {
    mobileStreak.textContent = `🔥 ${userStreak}`;
  }
}

function updateTrackerUI() {
  const totalCompletedEl = document.getElementById('stats-total-completions');
  const currentStreakEl = document.getElementById('stats-current-streak');
  const longestStreakEl = document.getElementById('stats-longest-streak');
  const avgScoreEl = document.getElementById('stats-avg-score');
  const historyList = document.getElementById('tracker-history-list');
  
  if (totalCompletedEl) totalCompletedEl.textContent = completions.length;
  if (currentStreakEl) currentStreakEl.textContent = `${userStreak} Days`;
  if (longestStreakEl) longestStreakEl.textContent = `${userLongestStreak} Days`;
  
  if (avgScoreEl) {
    if (completions.length > 0) {
      const totalScore = completions.reduce((acc, curr) => acc + curr.score, 0);
      avgScoreEl.textContent = `${Math.round(totalScore / completions.length)}%`;
    } else {
      avgScoreEl.textContent = '0%';
    }
  }
  
  if (historyList) {
    historyList.innerHTML = '';
    if (completions.length === 0) {
      historyList.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding-top:3rem;">No routines completed yet. Load a routine in the Player and run it to record history.</p>';
    } else {
      const sortedCompletions = [...completions].sort((a,b) => b.timestamp - a.timestamp);
      sortedCompletions.forEach(item => {
        const logDiv = document.createElement('div');
        logDiv.style.padding = '0.75rem 1rem';
        logDiv.style.borderBottom = '1px solid var(--border-color)';
        logDiv.style.display = 'flex';
        logDiv.style.justifyContent = 'space-between';
        logDiv.style.alignItems = 'center';
        logDiv.innerHTML = `
          <div>
            <strong style="font-size:0.9rem;">${escapeHtml(item.title)}</strong>
            <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:0.1rem;">Date: ${escapeHtml(item.date)}</div>
          </div>
          <span class="card-badge" style="background:var(--accent-glow); color:var(--accent); font-size:0.65rem;">Score: ${item.score}%</span>
        `;
        historyList.appendChild(logDiv);
      });
    }
  }

  renderCalendarGridJune2026();
  renderWeeklyComplianceChart();
  renderCategoryDonutChart();
  if (typeof renderTrackerExtras === 'function') renderTrackerExtras();
}

// Game Progression Engine
function getRankInfo(xp) {
  const level = Math.floor(xp / 500) + 1; // 500 XP per level
  const xpInLevel = xp % 500;
  
  const ranks = [
    { name: "Circadian Novice", emoji: "🌱" },
    { name: "Habit Builder", emoji: "🧱" },
    { name: "Dopamine Miner", emoji: "⚡" },
    { name: "Focus Monk", emoji: "🧘" },
    { name: "Flow State Master", emoji: "🌊" },
    { name: "Biological Master", emoji: "👑" }
  ];
  
  const rank = ranks[Math.min(level - 1, ranks.length - 1)];
  return { level, xpInLevel, name: rank.name, emoji: rank.emoji };
}

function updateLevelingUI() {
  const info = getRankInfo(userXP);
  
  // Sidebar elements
  const sidebarLevelVal = document.getElementById('sidebar-level-value');
  const sidebarRankTitle = document.getElementById('sidebar-rank-title');
  const sidebarRankEmoji = document.getElementById('sidebar-rank-emoji');
  if (sidebarLevelVal) sidebarLevelVal.textContent = `Level ${info.level}`;
  if (sidebarRankTitle) sidebarRankTitle.textContent = info.name;
  if (sidebarRankEmoji) sidebarRankEmoji.textContent = info.emoji;
  
  // Dashboard Level card
  const userLevelBadge = document.getElementById('user-level-badge');
  const userRankEmoji = document.getElementById('user-rank-emoji');
  const userRankTitle = document.getElementById('user-rank-title');
  const userXpText = document.getElementById('user-xp-text');
  const userXpProgressBar = document.getElementById('user-xp-progress-bar');
  const badgesContainer = document.getElementById('user-badges-container');
  
  if (userLevelBadge) userLevelBadge.textContent = `Lvl ${info.level}`;
  if (userRankEmoji) userRankEmoji.textContent = info.emoji;
  if (userRankTitle) userRankTitle.textContent = info.name;
  if (userXpText) userXpText.textContent = `${info.xpInLevel} / 500 XP`;
  if (userXpProgressBar) userXpProgressBar.style.width = `${(info.xpInLevel / 500) * 100}%`;
  
  if (badgesContainer) {
    badgesContainer.innerHTML = '';
    const badgeRanks = [
      { name: "Novice", emoji: "🌱" },
      { name: "Builder", emoji: "🧱" },
      { name: "Miner", emoji: "⚡" },
      { name: "Monk", emoji: "🧘" },
      { name: "Flow", emoji: "🌊" },
      { name: "Master", emoji: "👑" }
    ];
    
    badgeRanks.forEach((b, idx) => {
      const unlocked = info.level > idx;
      const bDiv = document.createElement('div');
      bDiv.className = 'badge-icon';
      if (!unlocked) {
        bDiv.style.opacity = '0.22';
        bDiv.title = `Locked (Unlocks at Lvl ${idx + 1})`;
      } else {
        bDiv.title = `Unlocked at Level ${idx + 1}`;
      }
      bDiv.innerHTML = `<span>${b.emoji}</span><span>${b.name}</span>`;
      badgesContainer.appendChild(bDiv);
    });
  }

  // Update mobile sticky top header elements
  const mobileEmoji = document.getElementById('mobile-header-rank-emoji');
  const mobileLevel = document.getElementById('mobile-header-level-badge');
  if (mobileEmoji) mobileEmoji.textContent = info.emoji;
  if (mobileLevel) mobileLevel.textContent = `Lvl ${info.level}`;
}

// Category Donut Chart builder
function renderCategoryDonutChart() {
  const container = document.getElementById('category-donut-chart-container');
  const legend = document.getElementById('category-chart-legend');
  if (!container || !legend) return;
  
  const catColors = {
    "Morning & Wakeup": "#6366f1",
    "Productivity & Tech": "#d946ef",
    "Health & Sleep": "#14b8a6",
    "Fitness & Wellness": "#10b981",
    "General Productivity": "#f59e0b"
  };
  
  const counts = {};
  let total = 0;
  
  completions.forEach(c => {
    let category = "General Productivity";
    const routine = [...prebuiltRoutines, ...customRoutines].find(r => r.id === c.id);
    if (routine) category = routine.category;
    
    counts[category] = (counts[category] || 0) + 1;
    total++;
  });
  
  if (total === 0) {
    container.innerHTML = '<span style="font-size:0.75rem; color:var(--text-muted);">No completions yet</span>';
    legend.innerHTML = '<span style="font-size:0.7rem; color:var(--text-muted);">Complete a routine to map categories</span>';
    return;
  }
  
  let strokeAccum = 0;
  const radius = 35;
  const circ = 2 * Math.PI * radius; // ~219.9
  
  let svg = `<svg viewBox="0 0 100 100" width="100%" height="100%">`;
  let legendHtml = "";
  
  Object.keys(counts).forEach(cat => {
    const count = counts[cat];
    const percentage = count / total;
    const strokeLength = percentage * circ;
    const strokeOffset = circ - strokeLength + strokeAccum;
    const color = catColors[cat] || "#a1a1aa";
    
    svg += `
      <circle class="donut-slice" cx="50" cy="50" r="${radius}" fill="transparent" 
              stroke="${color}" stroke-width="9" 
              stroke-dasharray="${circ}" stroke-dashoffset="${strokeOffset}" 
              transform="rotate(-90 50 50)"></circle>
    `;
    
    strokeAccum -= strokeLength;
    
    legendHtml += `
      <div style="display:flex; align-items:center; gap:0.4rem;">
        <span class="legend-dot" style="background:${color};"></span>
        <span style="white-space:nowrap;">${cat.split('&')[0].trim()}: <strong>${Math.round(percentage * 100)}%</strong></span>
      </div>
    `;
  });
  
  svg += `<circle cx="50" cy="50" r="26" fill="var(--bg-surface)"></circle>
    <text x="50" y="52" text-anchor="middle" font-family="var(--font-display)" font-weight="800" font-size="12" fill="var(--text-primary)">${total}</text>
    <text x="50" y="63" text-anchor="middle" font-family="var(--font-sans)" font-size="7" fill="var(--text-secondary)">TOTAL</text>
  </svg>`;
  
  container.innerHTML = svg;
  legend.innerHTML = legendHtml;
}

function toggleCompletionOnDate(dateStr) {
  const selectedDate = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  if (selectedDate > today) {
    showToast("You cannot record completions for future dates.");
    return;
  }

  const existingIndex = completions.findIndex(c => c.date === dateStr);
  if (existingIndex > -1) {
    completions.splice(existingIndex, 1);
  } else {
    completions.push({
      id: "manual_log",
      title: "Manual Activity Log",
      score: 90,
      date: dateStr,
      timestamp: Date.now()
    });
  }
  
  localStorage.setItem('routine_completions', JSON.stringify(completions));
  recalculateAllStreaks();
  updateTrackerUI();
  updateStreakDisplay();
}

// Wire up Prev/Next month navigation buttons once
let calendarNavWired = false;
function setupCalendarNav() {
  if (calendarNavWired) return;
  const prevBtn = document.getElementById('calendar-prev-btn');
  const nextBtn = document.getElementById('calendar-next-btn');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      vibratePattern([40]);
      calendarViewMonth--;
      if (calendarViewMonth < 0) { calendarViewMonth = 11; calendarViewYear--; }
      renderCalendarGrid();
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      vibratePattern([40]);
      calendarViewMonth++;
      if (calendarViewMonth > 11) { calendarViewMonth = 0; calendarViewYear++; }
      renderCalendarGrid();
    });
  }
  calendarNavWired = true;
}

function renderCalendarGrid() {
  const gridContainer = document.getElementById('calendar-days-grid');
  if (!gridContainer) return;

  setupCalendarNav();

  const year = calendarViewYear;
  const month = calendarViewMonth; // 0-indexed

  // Update the month/year label
  const monthLabel = document.getElementById('calendar-month-name');
  if (monthLabel) {
    monthLabel.textContent = new Date(year, month, 1).toLocaleDateString('en-US', {
      month: 'long', year: 'numeric'
    });
  }

  // Preserve the weekday header labels (first 7 children)
  const headerLabels = Array.from(gridContainer.children).filter(el => el.classList && el.classList.contains('calendar-day-label'));
  gridContainer.innerHTML = '';
  headerLabels.forEach(hl => gridContainer.appendChild(hl));

  const firstWeekday = new Date(year, month, 1).getDay(); // 0=Sun .. 6=Sat
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Leading blank cells so day 1 lands on the correct weekday
  for (let i = 0; i < firstWeekday; i++) {
    const emptyDay = document.createElement('div');
    emptyDay.className = 'calendar-day inactive';
    gridContainer.appendChild(emptyDay);
  }

  const completedDates = completions.map(c => c.date);
  const now = new Date();
  const isCurrentMonth = (now.getFullYear() === year && now.getMonth() === month);
  const todayNum = now.getDate();

  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const dayStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
    const isCompleted = completedDates.includes(dayStr);
    const isToday = isCurrentMonth && dayNum === todayNum;

    const dayDiv = document.createElement('div');
    dayDiv.className = `calendar-day ${isCompleted ? 'completed' : ''} ${isToday ? 'today' : ''}`.trim();
    dayDiv.style.cursor = 'pointer';
    dayDiv.dataset.date = dayStr;

    dayDiv.innerHTML = `
      <span>${dayNum}</span>
      ${isCompleted ? '<div class="calendar-day-dot"></div>' : ''}
    `;

    dayDiv.addEventListener('click', () => {
      toggleCompletionOnDate(dayStr);
    });

    gridContainer.appendChild(dayDiv);
  }
}

// Recompute current + longest streak from the full set of completion dates.
// (Previously referenced but never defined — toggling a calendar day threw.)
function recalculateAllStreaks() {
  const uniqueDates = [...new Set(completions.map(c => c.date))].sort(); // ascending YYYY-MM-DD
  if (uniqueDates.length === 0) {
    userStreak = 0;
    userLongestStreak = 0;
    lastCompletionDate = "";
  } else {
    // Longest run of consecutive calendar days anywhere in the history
    let longest = 1, run = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const prev = new Date(uniqueDates[i - 1] + "T00:00:00");
      const cur = new Date(uniqueDates[i] + "T00:00:00");
      const diffDays = Math.round((cur - prev) / 86400000);
      run = diffDays === 1 ? run + 1 : 1;
      if (run > longest) longest = run;
    }
    userLongestStreak = Math.max(longest, userLongestStreak);

    // Current streak: consecutive days ending today or yesterday
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const dateSet = new Set(uniqueDates);
    lastCompletionDate = uniqueDates[uniqueDates.length - 1];

    if (dateSet.has(todayStr) || dateSet.has(yesterdayStr)) {
      let cur = dateSet.has(todayStr) ? new Date(todayStr + "T00:00:00") : new Date(yesterdayStr + "T00:00:00");
      let streak = 0;
      while (dateSet.has(cur.toISOString().split('T')[0])) {
        streak++;
        cur = new Date(cur.getTime() - 86400000);
      }
      userStreak = streak;
    } else {
      userStreak = 0;
    }
  }

  localStorage.setItem('user_streak', userStreak.toString());
  localStorage.setItem('user_longest_streak', userLongestStreak.toString());
  localStorage.setItem('last_completion_date', lastCompletionDate);
}

// Backwards-compatible alias for the original call site
function renderCalendarGridJune2026() {
  renderCalendarGrid();
}

function renderWeeklyComplianceChart() {
  const container = document.getElementById('weekly-compliance-chart-container');
  if (!container) return;

  const stats = [];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const count = completions.filter(c => c.date === dateStr).length;
    const label = d.toLocaleDateString('en-US', { weekday: 'short' });
    stats.push({ count, label });
  }

  const maxVal = Math.max(...stats.map(s => s.count), 2);
  
  let svg = `<svg viewBox="0 0 500 130" width="100%" height="100%">
    <line class="chart-grid-line" x1="30" y1="20" x2="480" y2="20"></line>
    <line class="chart-grid-line" x1="30" y1="60" x2="480" y2="60"></line>
    <line class="chart-grid-line" x1="30" y1="100" x2="480" y2="100"></line>
    <line class="chart-axis-line" x1="30" y1="100" x2="480" y2="100"></line>
  `;

  stats.forEach((item, idx) => {
    const x = 50 + idx * 60;
    const barHeight = (item.count / maxVal) * 75;
    const y = 100 - barHeight;

    svg += `
      <rect class="chart-bar" x="${x}" y="${y}" width="26" height="${barHeight}" rx="4"></rect>
      <text class="chart-value-text" x="${x + 13}" y="${y - 6}">${item.count}</text>
      <text class="chart-text" x="${x + 13}" y="118" text-anchor="middle">${item.label}</text>
    `;
  });

  svg += `</svg>`;
  container.innerHTML = svg;
}

// 7. Custom Routine Creator Controller
function setupCreator() {
  const form = document.getElementById('creator-routine-form');
  const factSelect = document.getElementById('creator-step-fact');
  const addStepBtn = document.getElementById('creator-add-step-btn');
  const stepsContainer = document.getElementById('creator-steps-container');
  const emptyPreview = document.getElementById('creator-empty-preview');

  if (!factSelect) return;

  factSelect.innerHTML = '';
  Object.keys(facts).forEach(key => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = `${facts[key].category} - ${facts[key].title}`;
    factSelect.appendChild(opt);
  });

  addStepBtn.addEventListener('click', () => {
    const titleInput = document.getElementById('creator-step-title');
    const durInput = document.getElementById('creator-step-duration');
    const descInput = document.getElementById('creator-step-desc');
    const factVal = factSelect.value;
    
    const sTitle = titleInput.value.trim();
    const sDur = parseInt(durInput.value);
    const sDesc = descInput.value.trim();
    
    if (!sTitle) {
      showToast("Please enter a step title.");
      return;
    }
    if (sDur <= 0 || isNaN(sDur)) {
      showToast("Please enter a valid positive duration.");
      return;
    }

    const step = {
      title: sTitle,
      duration: sDur,
      desc: sDesc || "Execute planned activity block.",
      factKey: factVal,
      time: stepsToTimeLabel(creatorSteps)
    };

    creatorSteps.push(step);
    
    titleInput.value = '';
    durInput.value = '10';
    descInput.value = '';
    
    renderCreatorSteps();
  });

  function stepsToTimeLabel(stepsList) {
    let elapsed = 0;
    stepsList.forEach(s => elapsed += s.duration);
    return elapsed === 0 ? "Start" : `+${elapsed} mins`;
  }

  function renderCreatorSteps() {
    stepsContainer.innerHTML = '';
    
    if (creatorSteps.length === 0) {
      emptyPreview.style.display = 'block';
      stepsContainer.style.display = 'none';
      return;
    }

    emptyPreview.style.display = 'none';
    stepsContainer.style.display = 'flex';

    creatorSteps.forEach((step, idx) => {
      const row = document.createElement('div');
      row.className = 'builder-step-row';
      row.innerHTML = `
        <div class="builder-step-details">
          <div class="builder-step-title">${idx + 1}. ${escapeHtml(step.title)} (${step.duration} mins)</div>
          <div class="builder-step-meta">Timing: ${step.time} | Fact: <strong>${facts[step.factKey] ? facts[step.factKey].title : 'Default Performance'}</strong></div>
        </div>
        <button class="btn-icon" style="width:32px; height:32px; color:var(--danger); border-color:transparent;" title="Remove Step">
          <svg viewBox="0 0 24 24" style="width:16px; height:16px; fill:none; stroke:currentColor; stroke-width:2.5;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      `;

      row.querySelector('button').addEventListener('click', () => {
        creatorSteps.splice(idx, 1);
        
        let sum = 0;
        creatorSteps.forEach(s => {
          s.time = sum === 0 ? "Start" : `+${sum} mins`;
          sum += s.duration;
        });

        renderCreatorSteps();
      });

      stepsContainer.appendChild(row);
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const rTitle = document.getElementById('creator-title').value.trim();
    const rDesc = document.getElementById('creator-desc').value.trim();
    const rCat = document.getElementById('creator-category').value;
    const rDiff = document.getElementById('creator-difficulty').value;
    
    if (creatorSteps.length === 0) {
      showToast("Please add at least one step to build a routine.");
      return;
    }

    const totalDuration = creatorSteps.reduce((acc, curr) => acc + curr.duration, 0);
    const scientificScore = Math.min(100, 80 + (creatorSteps.length * 3));
    
    const customRoutine = {
      id: "custom_" + Date.now(),
      title: rTitle,
      category: rCat,
      difficulty: rDiff,
      duration: totalDuration,
      description: rDesc,
      icon: "activity",
      stats: {
        scientificScore: scientificScore,
        focusRequired: rDiff === 'Easy' ? 30 : (rDiff === 'Medium' ? 65 : 90),
        physicalIntensity: rCat.includes('Fitness') ? 80 : 20
      },
      steps: [...creatorSteps]
    };

    customRoutines.push(customRoutine);
    localStorage.setItem('custom_routines', JSON.stringify(customRoutines));
    
    form.reset();
    creatorSteps = [];
    renderCreatorSteps();
    renderLibrary();
    if (typeof refreshScheduleRoutineOptions === 'function') refreshScheduleRoutineOptions();

    showToast(`Saved "${rTitle}" to your library.`);
    switchPanel('dashboard');
  });
}

// 8. Data Vault Backup & Restore Handler
function setupBackupRestore() {
  const backupBtn = document.getElementById('tracker-backup-btn');
  const restoreBtn = document.getElementById('tracker-restore-btn');
  const restoreInput = document.getElementById('tracker-restore-input');

  if (!backupBtn) return;

  backupBtn.addEventListener('click', () => {
    const backupData = {
      completions,
      customRoutines,
      userStreak,
      userLongestStreak,
      lastCompletionDate,
      userXP, // Backup XP as well
      schedule,
      stepLog,
      remindersEnabled
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `routine_architect_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });

  restoreBtn.addEventListener('click', () => {
    restoreInput.click();
  });

  restoreInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        
        if (data && Array.isArray(data.completions) && Array.isArray(data.customRoutines)) {
          localStorage.setItem('routine_completions', JSON.stringify(data.completions));
          localStorage.setItem('custom_routines', JSON.stringify(data.customRoutines));
          localStorage.setItem('user_streak', (data.userStreak || 0).toString());
          localStorage.setItem('user_longest_streak', (data.userLongestStreak || 0).toString());
          localStorage.setItem('last_completion_date', data.lastCompletionDate || "");
          localStorage.setItem('user_xp', (data.userXP || 0).toString());

          completions = data.completions;
          customRoutines = data.customRoutines;
          userStreak = parseInt(data.userStreak) || 0;
          userLongestStreak = parseInt(data.userLongestStreak) || 0;
          lastCompletionDate = data.lastCompletionDate || "";
          userXP = parseInt(data.userXP) || 0;

          if (Array.isArray(data.schedule)) {
            schedule = data.schedule;
            localStorage.setItem('ra_schedule', JSON.stringify(schedule));
          }
          if (data.stepLog && typeof data.stepLog === 'object') {
            stepLog = data.stepLog;
            localStorage.setItem('ra_step_log', JSON.stringify(stepLog));
          }
          if (typeof renderSchedule === 'function') renderSchedule();
          if (typeof renderTrackerExtras === 'function') renderTrackerExtras();

          renderLibrary();
          updateTrackerUI();
          updateStreakDisplay();
          updateLevelingUI();
          if (typeof refreshScheduleRoutineOptions === 'function') refreshScheduleRoutineOptions();

          showToast("Vault restored successfully! Data updated.");
        } else {
          showToast("Restore failed: invalid backup format.");
        }
      } catch (err) {
        showToast("Restore failed: could not parse file. Ensure it is valid JSON.");
      }
    };
    reader.readAsText(file);
    restoreInput.value = '';
  });
}

// 9. Science Vault Explorer Modal
function setupFactExplorer() {
  const openBtn = document.getElementById('open-fact-explorer-btn');
  const modal = document.getElementById('fact-explorer-modal');
  const closeBtn = document.getElementById('fact-explorer-close-btn');
  const searchInput = document.getElementById('fact-explorer-search');
  const listContainer = document.getElementById('fact-explorer-list');

  if (!openBtn) return;

  openBtn.addEventListener('click', () => {
    modal.style.display = 'flex';
    setTimeout(() => {
      modal.classList.add('active');
      searchInput.focus(); // focus first control on open
    }, 10);
    renderExplorerList("");
  });

  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
  });

  searchInput.addEventListener('input', (e) => {
    renderExplorerList(e.target.value.toLowerCase().trim());
  });

  function closeModal() {
    modal.classList.remove('active');
    setTimeout(() => {
      modal.style.display = 'none';
    }, 300);
    searchInput.value = '';
  }

  function renderExplorerList(query) {
    listContainer.innerHTML = '';
    
    Object.keys(facts).forEach(key => {
      const fact = facts[key];
      const match = !query || 
                    fact.title.toLowerCase().includes(query) || 
                    fact.text.toLowerCase().includes(query) ||
                    fact.category.toLowerCase().includes(query) ||
                    fact.source.toLowerCase().includes(query);
      
      if (match) {
        const factCard = document.createElement('div');
        factCard.className = 'fact-explorer-card';
        factCard.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
            <span class="card-badge" style="background:var(--accent-glow); color:var(--accent); font-size:0.65rem;">${fact.category}</span>
            <span style="font-family:var(--font-mono); font-size:0.65rem; color:var(--text-muted); font-weight:600;">Key: ${key}</span>
          </div>
          <h4 style="font-family:var(--font-display); font-weight:700; font-size:1rem; margin-bottom:0.4rem; color:var(--text-primary);">${fact.title}</h4>
          <p style="font-size:0.85rem; color:var(--text-secondary); line-height:1.5; margin-bottom:0.75rem;">${fact.text}</p>
          <div style="font-family:var(--font-mono); font-size:0.7rem; color:var(--text-muted);">Source: ${fact.source}</div>
        `;
        listContainer.appendChild(factCard);
      }
    });

    if (listContainer.children.length === 0) {
      listContainer.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:2rem 0;">No matching facts found in the science vault.</p>';
    }
  }
}

// 10. Pre-flight Adjuster Modal Controller (New Customizer)
function setupPreflightAdjuster() {
  const modal = document.getElementById('preflight-modal');
  const closeBtn = document.getElementById('preflight-close-btn');
  const addStepBtn = document.getElementById('preflight-add-step-btn');
  const launchBtn = document.getElementById('preflight-launch-btn');

  closeBtn.addEventListener('click', closePreflight);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closePreflight();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) closePreflight();
  });

  addStepBtn.addEventListener('click', () => {
    vibratePattern([40]);
    preflightSteps.push({
      title: "New Activity",
      duration: 10,
      desc: "Custom focus activity block.",
      factKey: "pomodoro",
      time: stepsToTimeLabel(preflightSteps)
    });
    renderPreflightSteps();
  });

  launchBtn.addEventListener('click', () => {
    vibratePattern([70]);
    if (preflightSteps.length === 0) {
      showToast("Please add at least one step to launch.");
      return;
    }
    closePreflight();
    
    // Launch edited routine in Active Player
    loadRoutineIntoPlayer({
      ...preflightRoutine,
      duration: preflightSteps.reduce((acc, s) => acc + s.duration, 0),
      steps: [...preflightSteps]
    });
    switchPanel('player');
  });

  function stepsToTimeLabel(list) {
    let elapsed = 0;
    list.forEach(s => elapsed += s.duration);
    return elapsed === 0 ? "Start" : `+${elapsed} mins`;
  }
}

function openPreflightAdjuster(routine) {
  preflightRoutine = JSON.parse(JSON.stringify(routine)); // deep clone
  preflightSteps = preflightRoutine.steps;

  const modal = document.getElementById('preflight-modal');
  document.getElementById('preflight-routine-title').textContent = `Customize: ${routine.title}`;
  
  renderPreflightSteps();
  
  modal.style.display = 'flex';
  setTimeout(() => {
    modal.classList.add('active');
    // Focus the first control in the dialog for keyboard users
    const firstControl = modal.querySelector('input, button, select, textarea');
    if (firstControl) firstControl.focus();
  }, 10);
}

function closePreflight() {
  const modal = document.getElementById('preflight-modal');
  modal.classList.remove('active');
  setTimeout(() => {
    modal.style.display = 'none';
  }, 300);
}

function renderPreflightSteps() {
  const list = document.getElementById('preflight-steps-list');
  const durLabel = document.getElementById('preflight-total-duration');
  if (!list) return;

  list.innerHTML = '';
  let totalDur = 0;

  preflightSteps.forEach((step, idx) => {
    totalDur += step.duration;
    
    const div = document.createElement('div');
    div.className = 'preflight-step-item';
    div.innerHTML = `
      <div style="display:grid; grid-template-columns:1.5fr 1fr; gap:0.5rem; width:100%;">
        <div style="display:flex; flex-direction:column; gap:0.25rem;">
          <input type="text" class="form-input" style="font-weight:600; padding:0.4rem 0.6rem; font-size:0.85rem;" value="${escapeHtml(step.title)}" id="pf-title-${idx}">
          <input type="text" class="form-input" style="font-size:0.75rem; color:var(--text-secondary); padding:0.4rem 0.6rem;" value="${escapeHtml(step.desc)}" id="pf-desc-${idx}">
        </div>
        <div style="display:flex; align-items:center; gap:0.5rem; justify-content:flex-end;">
          <input type="number" class="form-input" style="width:60px; padding:0.4rem 0.6rem; font-size:0.85rem; font-family:var(--font-mono); text-align:center;" value="${step.duration}" min="1" id="pf-dur-${idx}">
          <span style="font-size:0.75rem; color:var(--text-muted); font-weight:600;">min</span>
        </div>
      </div>
      <button class="btn-icon" style="width:32px; height:32px; color:var(--danger); border-color:transparent; background:var(--bg-surface-elevated);" title="Remove Step">
        <svg viewBox="0 0 24 24" style="width:16px; height:16px; fill:none; stroke:currentColor; stroke-width:2.5;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    `;

    // Bind change updates dynamically
    div.querySelector(`#pf-title-${idx}`).addEventListener('input', (e) => {
      preflightSteps[idx].title = e.target.value;
    });
    div.querySelector(`#pf-desc-${idx}`).addEventListener('input', (e) => {
      preflightSteps[idx].desc = e.target.value;
    });
    div.querySelector(`#pf-dur-${idx}`).addEventListener('change', (e) => {
      let val = parseInt(e.target.value);
      if (isNaN(val) || val <= 0) val = 1;
      e.target.value = val;
      preflightSteps[idx].duration = val;
      
      let sum = 0;
      preflightSteps.forEach(s => {
        s.time = sum === 0 ? "Start" : `+${sum} mins`;
        sum += s.duration;
      });

      durLabel.textContent = `Total Duration: ${preflightSteps.reduce((acc, s) => acc + s.duration, 0)} mins`;
    });

    div.querySelector('button').addEventListener('click', () => {
      preflightSteps.splice(idx, 1);
      
      let sum = 0;
      preflightSteps.forEach(s => {
        s.time = sum === 0 ? "Start" : `+${sum} mins`;
        sum += s.duration;
      });

      renderPreflightSteps();
    });

    list.appendChild(div);
  });

  durLabel.textContent = `Total Duration: ${totalDur} mins`;
}

// 11. Offline Ambient Soundscapes Synthesizer (Web Audio API)
function setupAmbientController() {
  const toggle = document.getElementById('ambient-sound-toggle');
  const selector = document.getElementById('ambient-sound-select');
  const slider = document.getElementById('ambient-volume-slider');

  if (!toggle) return;

  toggle.addEventListener('change', () => {
    initAudioContext();
    if (toggle.checked) {
      playAmbientSoundscape();
    } else {
      stopAmbientSoundscape();
    }
  });

  selector.addEventListener('change', () => {
    if (toggle.checked) {
      playAmbientSoundscape();
    }
  });

  slider.addEventListener('input', (e) => {
    if (ambientGainNode && audioContext) {
      ambientGainNode.gain.setValueAtTime(parseFloat(e.target.value) * 0.4, audioContext.currentTime);
    }
  });
}

function playAmbientSoundscape() {
  initAudioContext();
  if (!audioContext) return;

  stopAmbientSoundscape(); // clear active soundscape
  
  // Activate CSS Equalizer visualizer
  const equalizer = document.getElementById('soundscape-equalizer');
  if (equalizer) equalizer.classList.add('active');

  ambientGainNode = audioContext.createGain();
  const volumeSlider = document.getElementById('ambient-volume-slider');
  const userVol = volumeSlider ? parseFloat(volumeSlider.value) : 0.5;
  ambientGainNode.gain.setValueAtTime(userVol * 0.4, audioContext.currentTime);
  ambientGainNode.connect(audioContext.destination);

  const type = document.getElementById('ambient-sound-select').value;
  if (type === 'brown') {
    brownNoiseNode = createBrownNoiseNode();
    brownNoiseNode.connect(ambientGainNode);
  } else if (type === 'binaural') {
    startBinauralBeats();
  } else if (type === 'pulse') {
    startCircadianPulse();
  }
  isAmbientPlaying = true;
}

function stopAmbientSoundscape() {
  // Deactivate CSS Equalizer visualizer
  const equalizer = document.getElementById('soundscape-equalizer');
  if (equalizer) equalizer.classList.remove('active');

  try {
    if (brownNoiseNode) {
      brownNoiseNode.disconnect();
      brownNoiseNode = null;
    }
    if (binauralOscL) {
      binauralOscL.stop();
      binauralOscL.disconnect();
      binauralOscL = null;
    }
    if (binauralOscR) {
      binauralOscR.stop();
      binauralOscR.disconnect();
      binauralOscR = null;
    }
    if (pulseOsc) {
      pulseOsc.stop();
      pulseOsc.disconnect();
      pulseOsc = null;
    }
    if (pulseLfo) {
      pulseLfo.stop();
      pulseLfo.disconnect();
      pulseLfo = null;
    }
    if (ambientGainNode) {
      ambientGainNode.disconnect();
      ambientGainNode = null;
    }
  } catch (err) {
    console.warn("Error stopping soundscape:", err);
  }
  isAmbientPlaying = false;
}

function createBrownNoiseNode() {
  const bufferSize = 4096;
  let lastOut = 0.0;
  
  const node = audioContext.createScriptProcessor(bufferSize, 0, 1);
  node.onaudioprocess = (e) => {
    const output = e.outputBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5;
    }
  };
  return node;
}

function startBinauralBeats() {
  binauralOscL = audioContext.createOscillator();
  binauralOscR = audioContext.createOscillator();
  
  const pannerL = audioContext.createStereoPanner ? audioContext.createStereoPanner() : null;
  const pannerR = audioContext.createStereoPanner ? audioContext.createStereoPanner() : null;
  
  binauralOscL.type = 'sine';
  binauralOscL.frequency.setValueAtTime(200, audioContext.currentTime); // 200Hz L
  
  binauralOscR.type = 'sine';
  binauralOscR.frequency.setValueAtTime(208, audioContext.currentTime); // 208Hz R (8Hz Detune)
  
  if (pannerL && pannerR) {
    pannerL.pan.setValueAtTime(-1, audioContext.currentTime);
    pannerR.pan.setValueAtTime(1, audioContext.currentTime);
    
    binauralOscL.connect(pannerL);
    pannerL.connect(ambientGainNode);
    
    binauralOscR.connect(pannerR);
    pannerR.connect(ambientGainNode);
  } else {
    binauralOscL.connect(ambientGainNode);
    binauralOscR.connect(ambientGainNode);
  }
  
  binauralOscL.start();
  binauralOscR.start();
}

function startCircadianPulse() {
  pulseOsc = audioContext.createOscillator();
  pulseLfo = audioContext.createOscillator();
  const lfoGain = audioContext.createGain();
  
  pulseOsc.type = 'triangle';
  pulseOsc.frequency.setValueAtTime(110, audioContext.currentTime);
  
  pulseLfo.type = 'sine';
  pulseLfo.frequency.setValueAtTime(0.2, audioContext.currentTime); // 5 second respiration swells
  
  lfoGain.gain.setValueAtTime(0.06, audioContext.currentTime);
  
  pulseLfo.connect(lfoGain);
  lfoGain.connect(ambientGainNode.gain);
  
  pulseOsc.connect(ambientGainNode);

  pulseOsc.start();
  pulseLfo.start();
}

/* ============================================================================
   12. PLANNER: Templates · Weekly Schedule · Reminders
   13. TRACKER EXTRAS: Year Heatmap · Deep Analytics · Today Step Checklist
   All client-side, localStorage-persisted, offline-safe. Reuses facts,
   prebuiltRoutines, customRoutines, openPreflightAdjuster, logRoutineCompletion.
============================================================================ */

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// --- Persisted feature state ---------------------------------------------
// schedule: [{ id, routineId, title, day (0-6), time "HH:MM", reminder (bool) }]
let schedule = JSON.parse(localStorage.getItem('ra_schedule')) || [];
// stepLog: { "YYYY-MM-DD": { "routineId": [bool, bool, ...] } }
let stepLog = JSON.parse(localStorage.getItem('ra_step_log')) || {};
let remindersEnabled = localStorage.getItem('ra_reminders_enabled') === 'true';
let firedReminders = JSON.parse(localStorage.getItem('ra_reminder_fired')) || {}; // { "YYYY-MM-DD|id": true }

function saveSchedule() { localStorage.setItem('ra_schedule', JSON.stringify(schedule)); }
function saveStepLog() { localStorage.setItem('ra_step_log', JSON.stringify(stepLog)); }

function allRoutines() { return [...prebuiltRoutines, ...customRoutines]; }
function findRoutine(id) { return allRoutines().find(r => r.id === id); }
function todayKey() { return new Date().toISOString().split('T')[0]; }
function dateKey(d) { return d.toISOString().split('T')[0]; }

// Science-backed starter templates (loadable + customizable via the Pre-flight adjuster)
const ROUTINE_TEMPLATES = [
  {
    id: 'tmpl_morning', icon: 'sunrise', category: 'Morning & Wakeup', difficulty: 'Medium', duration: 35,
    title: 'Circadian Morning Primer',
    description: 'Anchor your body clock: hydrate, get sunlight, move, and set intentions to ride the morning cortisol peak.',
    stats: { scientificScore: 97, focusRequired: 45, physicalIntensity: 35 },
    steps: [
      { time: 'Start', duration: 5, title: 'Rehydrate (500ml)', desc: 'Drink 500ml of water to clear adenosine and offset overnight dehydration.', factKey: 'hydration', subfacts: [] },
      { time: '+5 mins', duration: 10, title: 'Morning Sunlight', desc: 'Get 10 minutes of outdoor light (no sunglasses) to set your circadian timer.', factKey: 'light_exposure', subfacts: [] },
      { time: '+15 mins', duration: 10, title: 'Dynamic Mobility', desc: 'Light movement to raise core temperature and signal wakefulness.', factKey: 'strength_warmup', subfacts: [] },
      { time: '+25 mins', duration: 10, title: 'Intentions & Offload', desc: 'Write your 3 primary targets for the day to free working memory.', factKey: 'journaling', subfacts: [] }
    ]
  },
  {
    id: 'tmpl_deepwork', icon: 'code', category: 'Productivity & Tech', difficulty: 'Hard', duration: 120,
    title: 'Deep Work Ultradian Block',
    description: 'Two focused sprints separated by a diffuse-mode break — matched to your brain\'s 90-minute cycles.',
    stats: { scientificScore: 95, focusRequired: 92, physicalIntensity: 8 },
    steps: [
      { time: 'Start', duration: 10, title: 'Workspace Sanitize', desc: 'Clear clutter and open only what the task needs.', factKey: 'clean_environment', subfacts: [] },
      { time: '+10 mins', duration: 50, title: 'Focus Sprint A', desc: 'Single hardest task. Phone in another room, notifications off.', factKey: 'pomodoro', subfacts: [] },
      { time: '+60 mins', duration: 10, title: 'Diffuse Break', desc: 'Walk away from screens; let diffuse mode solve what focus could not.', factKey: 'diffuse_thinking', subfacts: [] },
      { time: '+70 mins', duration: 50, title: 'Focus Sprint B', desc: 'Resume implementation. Outline blockers on paper before clicking around.', factKey: 'pomodoro', subfacts: [] }
    ]
  },
  {
    id: 'tmpl_winddown', icon: 'moon', category: 'Health & Sleep', difficulty: 'Easy', duration: 45,
    title: 'Evening Wind-Down',
    description: 'Lower light, core temperature, and cognitive load to fall asleep faster and reach deeper sleep.',
    stats: { scientificScore: 98, focusRequired: 15, physicalIntensity: 10 },
    steps: [
      { time: 'Start', duration: 15, title: 'Digital Sunset', desc: 'Kill overhead lights, switch to amber lamps, phone out of reach.', factKey: 'blue_light_block', subfacts: [] },
      { time: '+15 mins', duration: 10, title: 'Brain Dump', desc: 'Write tomorrow\'s plan + anything on your mind so you stop rehearsing it.', factKey: 'journaling', subfacts: [] },
      { time: '+25 mins', duration: 20, title: 'Warm Shower + Breathing', desc: 'Warm shower then slow physiological sighs to drop core temp and calm the vagus nerve.', factKey: 'mindfulness_meditation', subfacts: [] }
    ]
  },
  {
    id: 'tmpl_exercise', icon: 'activity', category: 'Fitness & Wellness', difficulty: 'Hard', duration: 60,
    title: 'Strength + Recovery Session',
    description: 'Prime the nervous system, train with progressive overload, then refuel for muscle protein synthesis.',
    stats: { scientificScore: 96, focusRequired: 60, physicalIntensity: 90 },
    steps: [
      { time: 'Start', duration: 10, title: 'Dynamic Warmup', desc: 'Light cardio + movement prep to raise muscle temperature and prime the CNS.', factKey: 'strength_warmup', subfacts: [] },
      { time: '+10 mins', duration: 35, title: 'Progressive Overload Lifts', desc: 'Compound movements, sets within 1-3 reps of failure. Log weight + reps.', factKey: 'strength_hypertrophy', subfacts: [] },
      { time: '+45 mins', duration: 5, title: 'Cool-Down Breathing', desc: 'Slow diaphragmatic breathing to shift from sympathetic to parasympathetic.', factKey: 'mindfulness_meditation', subfacts: [] },
      { time: '+50 mins', duration: 10, title: 'Protein Refuel', desc: 'Consume 30-40g protein to drive muscle protein synthesis and recovery.', factKey: 'nutrition_protein', subfacts: [] }
    ]
  }
];

// ---------------------------------------------------------------------------
// PLANNER SETUP
// ---------------------------------------------------------------------------
function setupPlanner() {
  if (!document.getElementById('panel-planner')) return;
  renderTemplates();
  setupScheduleForm();
  renderSchedule();
  setupReminderToggle();

  // Reminder polling (only while tab is open — no push server, by design)
  setInterval(checkReminders, 30000);
  setTimeout(checkReminders, 3000);
}

function renderTemplates() {
  const grid = document.getElementById('templates-grid');
  if (!grid) return;
  grid.innerHTML = '';
  ROUTINE_TEMPLATES.forEach(t => {
    const card = document.createElement('div');
    card.className = 'card template-card';
    card.innerHTML = `
      <h3 class="card-title" style="font-size:1.1rem;">${escapeHtml(t.title)}</h3>
      <p class="card-desc">${escapeHtml(t.description)}</p>
      <div style="display:flex; gap:0.4rem; flex-wrap:wrap; margin-bottom:1rem;">
        <span class="card-badge">${escapeHtml(t.category)}</span>
        <span class="card-badge" style="background:var(--bg-surface-elevated); color:var(--text-secondary);">⏱️ ${t.duration} min</span>
        <span class="card-badge" style="background:var(--accent-glow); color:var(--accent);">${t.stats.scientificScore}% Valid</span>
      </div>
      <div style="display:flex; gap:0.5rem;">
        <button class="btn-primary template-load-btn" style="flex:1; padding:0.55rem;">Load & Customize</button>
        <button class="btn-secondary template-sched-btn" style="padding:0.55rem 0.8rem;" title="Add to weekly schedule">📅</button>
      </div>
    `;
    card.querySelector('.template-load-btn').addEventListener('click', () => {
      initAudioContext();
      vibratePattern([50]);
      openPreflightAdjuster(JSON.parse(JSON.stringify(t)));
    });
    card.querySelector('.template-sched-btn').addEventListener('click', () => {
      const sel = document.getElementById('schedule-routine-select');
      if (sel) { sel.value = t.id; showToast(`"${t.title}" selected — pick a day & time below.`); }
      document.getElementById('schedule-form-card')?.scrollIntoView({ behavior: 'smooth' });
    });
    grid.appendChild(card);
  });
}

// Populate the routine <select> (templates + library) — refreshed when custom routines change
function refreshScheduleRoutineOptions() {
  const sel = document.getElementById('schedule-routine-select');
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = '';
  const optgT = document.createElement('optgroup'); optgT.label = 'Templates';
  ROUTINE_TEMPLATES.forEach(t => {
    const o = document.createElement('option'); o.value = t.id; o.textContent = t.title; optgT.appendChild(o);
  });
  sel.appendChild(optgT);
  const optgL = document.createElement('optgroup'); optgL.label = 'Library';
  allRoutines().forEach(r => {
    const o = document.createElement('option'); o.value = r.id; o.textContent = r.title; optgL.appendChild(o);
  });
  sel.appendChild(optgL);
  if (prev) sel.value = prev;
}

function templateOrRoutine(id) {
  return ROUTINE_TEMPLATES.find(t => t.id === id) || findRoutine(id);
}

function setupScheduleForm() {
  refreshScheduleRoutineOptions();
  const addBtn = document.getElementById('schedule-add-btn');
  if (!addBtn) return;
  addBtn.addEventListener('click', () => {
    const sel = document.getElementById('schedule-routine-select');
    const dayEl = document.getElementById('schedule-day-select');
    const timeEl = document.getElementById('schedule-time-input');
    const remEl = document.getElementById('schedule-reminder-check');
    const r = templateOrRoutine(sel.value);
    if (!r) { showToast('Pick a routine first.'); return; }
    if (!timeEl.value) { showToast('Pick a start time.'); return; }
    schedule.push({
      id: 'sch_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      routineId: r.id,
      title: r.title,
      day: parseInt(dayEl.value),
      time: timeEl.value,
      reminder: remEl.checked
    });
    saveSchedule();
    renderSchedule();
    vibratePattern([50]);
    showToast(`Scheduled "${r.title}" on ${WEEKDAYS[parseInt(dayEl.value)]} at ${timeEl.value}.`);
  });
}

function fmtTime(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

// Monday-anchored start of the current week
function startOfWeek() {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const diff = (day === 0 ? -6 : 1 - day); // shift to Monday
  d.setDate(d.getDate() + diff);
  return d;
}

function renderSchedule() {
  const grid = document.getElementById('weekly-schedule-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const weekStart = startOfWeek();
  const order = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun

  order.forEach((dow, colIdx) => {
    const colDate = new Date(weekStart); colDate.setDate(weekStart.getDate() + colIdx);
    const dKey = dateKey(colDate);
    const isToday = dKey === todayKey();

    const col = document.createElement('div');
    col.className = 'sched-col' + (isToday ? ' sched-col-today' : '');

    const items = schedule
      .filter(s => s.day === dow)
      .sort((a, b) => a.time.localeCompare(b.time));

    col.innerHTML = `<div class="sched-col-head">${WEEKDAYS[dow]}<span class="sched-col-date">${colDate.getDate()}</span></div>`;

    if (items.length === 0) {
      col.innerHTML += `<div class="sched-empty">—</div>`;
    }

    items.forEach(item => {
      const doneKey = `done|${dKey}|${item.id}`;
      const isDone = !!firedReminders[doneKey];
      const future = colDate > new Date(new Date().setHours(23, 59, 59, 999));
      const block = document.createElement('div');
      block.className = 'sched-block' + (isDone ? ' sched-done' : '');
      block.innerHTML = `
        <div class="sched-time">${fmtTime(item.time)}${item.reminder ? ' 🔔' : ''}</div>
        <div class="sched-title">${escapeHtml(item.title)}</div>
        <div class="sched-actions">
          <button class="sched-toggle" title="${isDone ? 'Mark missed' : 'Mark done'}">${isDone ? '✓ Done' : (future ? 'Upcoming' : 'Mark done')}</button>
          <button class="sched-remove" title="Remove from schedule">✕</button>
        </div>
      `;
      block.querySelector('.sched-toggle').addEventListener('click', () => {
        if (firedReminders[doneKey]) {
          delete firedReminders[doneKey];
        } else {
          firedReminders[doneKey] = true;
          // Mark a completion for analytics/streaks
          const r = templateOrRoutine(item.routineId);
          if (r) {
            completions.push({ id: r.id, title: r.title, score: r.stats.scientificScore, date: dKey, timestamp: Date.now() });
            localStorage.setItem('routine_completions', JSON.stringify(completions));
            recalculateAllStreaks();
            updateTrackerUI(); updateStreakDisplay();
          }
          vibratePattern([60]);
        }
        localStorage.setItem('ra_reminder_fired', JSON.stringify(firedReminders));
        renderSchedule();
      });
      block.querySelector('.sched-remove').addEventListener('click', () => {
        schedule = schedule.filter(s => s.id !== item.id);
        saveSchedule();
        renderSchedule();
      });
      col.appendChild(block);
    });

    grid.appendChild(col);
  });
}

// ---------------------------------------------------------------------------
// REMINDERS (Notification API — fires only while tab is open)
// ---------------------------------------------------------------------------
function setupReminderToggle() {
  const toggle = document.getElementById('reminders-toggle');
  const status = document.getElementById('reminders-status');
  if (!toggle) return;

  function reflect() {
    const supported = 'Notification' in window;
    if (!supported) {
      toggle.checked = false; toggle.disabled = true;
      status.textContent = 'Notifications are not supported in this browser.';
      return;
    }
    toggle.checked = remindersEnabled && Notification.permission === 'granted';
    if (Notification.permission === 'denied') {
      status.textContent = 'Notifications are blocked in your browser settings.';
    } else if (toggle.checked) {
      status.textContent = 'On — reminders fire while this tab is open.';
    } else {
      status.textContent = 'Off — enable to get step-time reminders (this tab must stay open).';
    }
  }

  toggle.addEventListener('change', async () => {
    if (toggle.checked) {
      if (!('Notification' in window)) return reflect();
      let perm = Notification.permission;
      if (perm === 'default') perm = await Notification.requestPermission();
      if (perm === 'granted') {
        remindersEnabled = true;
        localStorage.setItem('ra_reminders_enabled', 'true');
        showToast('Reminders enabled.');
      } else {
        remindersEnabled = false;
        localStorage.setItem('ra_reminders_enabled', 'false');
        showToast('Notification permission denied.');
      }
    } else {
      remindersEnabled = false;
      localStorage.setItem('ra_reminders_enabled', 'false');
    }
    reflect();
  });
  reflect();
}

function checkReminders() {
  if (!remindersEnabled || !('Notification' in window) || Notification.permission !== 'granted') return;
  const now = new Date();
  const dow = now.getDay();
  const dKey = todayKey();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  schedule.forEach(item => {
    if (!item.reminder || item.day !== dow) return;
    const [h, m] = item.time.split(':').map(Number);
    const itemMin = h * 60 + m;
    const key = `fired|${dKey}|${item.id}`;
    // Fire within a 2-minute window of the scheduled time, once per day
    if (nowMin >= itemMin && nowMin <= itemMin + 2 && !firedReminders[key]) {
      firedReminders[key] = true;
      localStorage.setItem('ra_reminder_fired', JSON.stringify(firedReminders));
      try {
        new Notification('⏰ ' + item.title, {
          body: `Time for your ${item.title} routine.`,
          icon: 'icon-192.png',
          tag: item.id
        });
      } catch (e) { /* ignore */ }
      vibratePattern([120, 60, 120]);
    }
  });
}

// ---------------------------------------------------------------------------
// TRACKER EXTRAS: Year heatmap · Deep analytics · Today step checklist
// ---------------------------------------------------------------------------
function setupTrackerExtras() {
  renderTrackerExtras();
}

function renderTrackerExtras() {
  renderYearHeatmap();
  renderDeepAnalytics();
  renderTodayChecklist();
}

// GitHub-style 53-week completion heatmap (last ~12 months)
function renderYearHeatmap() {
  const host = document.getElementById('year-heatmap');
  if (!host) return;

  // Count completions per day
  const counts = {};
  completions.forEach(c => { counts[c.date] = (counts[c.date] || 0) + 1; });

  // Start 52 weeks back, snapped to Sunday
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - (52 * 7) - today.getDay());

  const cell = 11, gap = 2.5, cols = 53;
  const topPad = 14, leftPad = 22;
  const w = leftPad + cols * (cell + gap);
  const h = topPad + 7 * (cell + gap);

  let rects = '';
  let monthLabels = '';
  let lastMonth = -1;

  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < 7; row++) {
      const d = new Date(start);
      d.setDate(start.getDate() + col * 7 + row);
      if (d > today) continue;
      const k = dateKey(d);
      const n = counts[k] || 0;
      let lvl = 0;
      if (n >= 1) lvl = 1; if (n >= 2) lvl = 2; if (n >= 3) lvl = 3; if (n >= 4) lvl = 4;
      const x = leftPad + col * (cell + gap);
      const y = topPad + row * (cell + gap);
      rects += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2" class="hm-cell hm-l${lvl}"><title>${k}: ${n} completion${n === 1 ? '' : 's'}</title></rect>`;
      if (row === 0 && d.getMonth() !== lastMonth) {
        lastMonth = d.getMonth();
        monthLabels += `<text x="${x}" y="10" class="hm-month">${d.toLocaleDateString('en-US', { month: 'short' })}</text>`;
      }
    }
  }

  host.innerHTML = `<svg viewBox="0 0 ${w} ${h}" width="100%" preserveAspectRatio="xMinYMin meet" style="min-width:680px;">${monthLabels}${rects}</svg>`;
}

// Deep analytics: completion rate, best/worst steps, most consistent weekday
function renderDeepAnalytics() {
  // 1) Most consistent weekday
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];
  completions.forEach(c => {
    const d = new Date(c.date + 'T00:00:00');
    dayCounts[d.getDay()]++;
  });
  const bestDayIdx = dayCounts.indexOf(Math.max(...dayCounts));
  const bestDayEl = document.getElementById('insight-best-day');
  if (bestDayEl) {
    bestDayEl.textContent = completions.length
      ? `${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][bestDayIdx]}`
      : '—';
  }

  // 2) 30-day completion rate (days with >=1 completion / 30)
  const set = new Set(completions.map(c => c.date));
  let active30 = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(Date.now() - i * 86400000);
    if (set.has(dateKey(d))) active30++;
  }
  const rate = Math.round((active30 / 30) * 100);
  const rateEl = document.getElementById('insight-rate-val');
  const rateBar = document.getElementById('insight-rate-bar');
  if (rateEl) rateEl.textContent = `${rate}%`;
  if (rateBar) rateBar.style.width = `${rate}%`;

  // 3) Best / worst step adherence from the per-step log
  const stepStats = {}; // "routineId::stepTitle" -> {done, total, title}
  Object.keys(stepLog).forEach(dk => {
    const dayMap = stepLog[dk];
    Object.keys(dayMap).forEach(rid => {
      const r = templateOrRoutine(rid);
      if (!r) return;
      dayMap[rid].forEach((checked, i) => {
        const st = r.steps[i];
        if (!st) return;
        const key = rid + '::' + i;
        if (!stepStats[key]) stepStats[key] = { done: 0, total: 0, title: st.title };
        stepStats[key].total++;
        if (checked) stepStats[key].done++;
      });
    });
  });

  const ranked = Object.values(stepStats)
    .filter(s => s.total >= 1)
    .map(s => ({ ...s, pct: Math.round((s.done / s.total) * 100) }))
    .sort((a, b) => b.pct - a.pct);

  const bestEl = document.getElementById('insight-best-step');
  const worstEl = document.getElementById('insight-worst-step');
  if (bestEl && worstEl) {
    if (ranked.length === 0) {
      bestEl.textContent = 'No step data yet';
      worstEl.textContent = 'Check off steps below to build insights';
    } else {
      const best = ranked[0], worst = ranked[ranked.length - 1];
      bestEl.textContent = `${best.title} (${best.pct}%)`;
      worstEl.textContent = `${worst.title} (${worst.pct}%)`;
    }
  }

  // 4) 14-day completion-rate sparkline (divs)
  const spark = document.getElementById('insight-sparkline');
  if (spark) {
    spark.innerHTML = '';
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const n = completions.filter(c => c.date === dateKey(d)).length;
      const bar = document.createElement('div');
      bar.className = 'spark-bar';
      bar.style.height = `${Math.min(100, 18 + n * 28)}%`;
      bar.style.opacity = n ? '1' : '0.25';
      bar.title = `${dateKey(d)}: ${n}`;
      spark.appendChild(bar);
    }
  }
}

// Today's scheduled routines → per-step checklist
function renderTodayChecklist() {
  const host = document.getElementById('today-step-checklist');
  if (!host) return;
  host.innerHTML = '';

  const dow = new Date().getDay();
  const dKey = todayKey();
  const todays = schedule.filter(s => s.day === dow).sort((a, b) => a.time.localeCompare(b.time));

  if (todays.length === 0) {
    host.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem; text-align:center; padding:1.5rem 0;">No routines scheduled for today. Add some in the <strong>Plan</strong> tab to check off steps here.</p>';
    return;
  }

  todays.forEach(item => {
    const r = templateOrRoutine(item.routineId);
    if (!r) return;
    if (!stepLog[dKey]) stepLog[dKey] = {};
    if (!stepLog[dKey][r.id]) stepLog[dKey][r.id] = r.steps.map(() => false);
    const checks = stepLog[dKey][r.id];

    const block = document.createElement('div');
    block.className = 'today-routine';
    const doneCount = checks.filter(Boolean).length;
    block.innerHTML = `
      <div class="today-routine-head">
        <span>${escapeHtml(r.title)} <span style="color:var(--text-muted); font-weight:500;">· ${fmtTime(item.time)}</span></span>
        <span class="today-progress">${doneCount}/${r.steps.length}</span>
      </div>
    `;
    r.steps.forEach((st, i) => {
      const row = document.createElement('label');
      row.className = 'today-step' + (checks[i] ? ' checked' : '');
      row.innerHTML = `
        <input type="checkbox" ${checks[i] ? 'checked' : ''}>
        <span class="today-step-box">✓</span>
        <span class="today-step-text">${escapeHtml(st.title)} <span style="color:var(--text-muted);">(${st.duration}m)</span></span>
      `;
      row.querySelector('input').addEventListener('change', (e) => {
        checks[i] = e.target.checked;
        saveStepLog();
        vibratePattern([35]);
        // If every step done, log a completion for the day (once)
        const allDone = checks.every(Boolean);
        const doneKey = `done|${dKey}|${item.id}`;
        if (allDone && !firedReminders[doneKey]) {
          firedReminders[doneKey] = true;
          localStorage.setItem('ra_reminder_fired', JSON.stringify(firedReminders));
          completions.push({ id: r.id, title: r.title, score: r.stats.scientificScore, date: dKey, timestamp: Date.now() });
          localStorage.setItem('routine_completions', JSON.stringify(completions));
          recalculateAllStreaks();
          updateStreakDisplay();
          showToast(`All steps done — "${r.title}" logged! 🔥`);
        }
        updateTrackerUI();
      });
      block.appendChild(row);
    });
    host.appendChild(block);
  });
}
