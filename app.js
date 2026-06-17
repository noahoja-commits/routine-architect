import { facts, prebuiltRoutines } from './db.js';
import { generateRoutine } from './generator.js';

// Application State Management
let customRoutines = JSON.parse(localStorage.getItem('custom_routines')) || [];
let completions = JSON.parse(localStorage.getItem('routine_completions')) || [];
let userStreak = parseInt(localStorage.getItem('user_streak')) || 0;
let userLongestStreak = parseInt(localStorage.getItem('user_longest_streak')) || 0;
let lastCompletionDate = localStorage.getItem('last_completion_date') || "";

// Active Player State
let activeRoutine = null;
let currentStepIndex = 0;
let timerInterval = null;
let timerSecondsRemaining = 0;
let timerDurationTotal = 0;
let isPlaying = false;

// Custom Builder State
let creatorSteps = [];

// DOM Elements
const navLinks = document.querySelectorAll('.nav-link');
const panels = document.querySelectorAll('.view-panel');
const prebuiltGrid = document.getElementById('prebuilt-library-grid');
const streakValues = document.querySelectorAll('#sidebar-streak-value');
const themeDarkBtn = document.getElementById('theme-dark-btn');
const themeLightBtn = document.getElementById('theme-light-btn');

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupTheme();
  renderLibrary();
  setupGenerator();
  setupPlayer();
  setupCreator();
  setupTracker();
  updateStreakDisplay();
});

// 1. Navigation Controller
function setupNavigation() {
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.dataset.target;
      switchPanel(target);
    });
  });
}

function switchPanel(panelId) {
  // Update nav links active state
  navLinks.forEach(link => {
    if (link.dataset.target === panelId) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Update panels display
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
    themeDarkBtn.classList.add('active');
    themeLightBtn.classList.remove('active');
  });

  themeLightBtn.addEventListener('click', () => {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('theme', 'light');
    themeLightBtn.classList.add('active');
    themeDarkBtn.classList.remove('active');
  });
}

// 3. Discover Library Panel
function renderLibrary() {
  prebuiltGrid.innerHTML = '';
  
  // Combine prebuilt and custom routines
  const allRoutines = [...prebuiltRoutines, ...customRoutines];

  allRoutines.forEach(routine => {
    const card = document.createElement('div');
    card.className = 'card';
    
    // Choose appropriate SVG icon based on routine icon string
    let svgIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';
    if (routine.icon === 'sunrise') {
      svgIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 18a5 5 0 0 0-10 0M12 2v7M4.22 10.22l1.42 1.42M1M12 12h-3m13 0h-3M18.36 10.22l-1.42 1.42"></svg>';
    } else if (routine.icon === 'code') {
      svgIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>';
    } else if (routine.icon === 'moon') {
      svgIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
    } else if (routine.icon === 'activity') {
      svgIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>';
    } else if (routine.icon === 'sparkles') {
      svgIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v1M12 20v1M3 12h1M20 12h1M18.36 5.64l-.7.7M6.34 17.66l-.7.7M18.36 18.36l-.7-.7M6.34 6.34l-.7-.7M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/></svg>';
    }

    card.innerHTML = `
      <div class="card-icon">${svgIcon}</div>
      <h3 class="card-title">${routine.title}</h3>
      <p class="card-desc">${routine.description}</p>
      
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem;">
        <span class="card-badge">${routine.category}</span>
        <span style="font-family:var(--font-mono); font-size:0.8rem; color:var(--text-secondary); font-weight:600;">⏱️ ${routine.duration} mins</span>
      </div>

      <div class="card-meta">
        <span>Score: <strong style="color:var(--accent);">${routine.stats.scientificScore}% Valid</strong></span>
        <button class="card-btn" data-id="${routine.id}">Launch</button>
      </div>
    `;

    // Add Launch Button Event
    card.querySelector('.card-btn').addEventListener('click', () => {
      loadRoutineIntoPlayer(routine);
      switchPanel('player');
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
  
  // Side fact panel in generator
  const factTitle = document.getElementById('result-fact-title');
  const factText = document.getElementById('result-fact-text');
  const factSource = document.getElementById('result-fact-source');

  let currentGeneratedRoutine = null;

  // Suggestion Chips Click
  document.querySelectorAll('.suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      promptTextarea.value = chip.textContent;
      promptTextarea.focus();
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const promptVal = promptTextarea.value;
    
    // Show Loading Spinner
    generatorResult.style.display = 'none';
    generatorLoading.style.display = 'block';

    // Premium delay to simulate deep analysis
    setTimeout(() => {
      generatorLoading.style.display = 'none';
      
      // Call generator function
      currentGeneratedRoutine = generateRoutine(promptVal);
      
      // Update inputs with extracted properties if needed
      document.getElementById('generator-duration').value = currentGeneratedRoutine.duration;
      document.getElementById('generator-difficulty').value = currentGeneratedRoutine.difficulty;

      // Render Results
      resultTitle.textContent = currentGeneratedRoutine.title;
      resultDesc.textContent = currentGeneratedRoutine.description;
      
      renderSteps(currentGeneratedRoutine.steps);
      
      generatorResult.style.display = 'block';
    }, 1200);
  });

  // Render list of steps in generator panel
  function renderSteps(steps) {
    resultStepsContainer.innerHTML = '';
    
    steps.forEach((step, idx) => {
      const stepCard = document.createElement('div');
      stepCard.className = `step-card ${idx === 0 ? 'active' : ''}`;
      
      stepCard.innerHTML = `
        <div class="step-time-badge">${step.duration} min</div>
        <div class="step-details">
          <h4 class="step-title">${step.title}</h4>
          <p class="step-desc">${step.desc}</p>
          <div class="step-meta-row">
            <span>Timing: <strong>${step.time}</strong></span>
            <span class="step-fact-trigger" data-factkey="${step.factKey}">
              💡 Science Fact
            </span>
          </div>
        </div>
      `;

      // Select step details
      stepCard.addEventListener('click', () => {
        document.querySelectorAll('.step-card').forEach(c => c.classList.remove('active'));
        stepCard.classList.add('active');
        loadFactToSidePanel(step.factKey);
      });

      resultStepsContainer.appendChild(stepCard);
    });

    // Auto load first step's fact
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
    }
  }

  // Start Playing Generated Routine
  startBtn.addEventListener('click', () => {
    if (currentGeneratedRoutine) {
      loadRoutineIntoPlayer(currentGeneratedRoutine);
      switchPanel('player');
    }
  });

  // Print PDF Layout
  printBtn.addEventListener('click', () => {
    window.print();
  });
}

// 5. Active Routine Player Panel
function setupPlayer() {
  const emptyState = document.getElementById('player-empty-state');
  const activeState = document.getElementById('player-active-state');
  const gotoLibBtn = document.getElementById('player-goto-library-btn');
  
  const routineTitle = document.getElementById('player-routine-title');
  const stepTitle = document.getElementById('player-step-title');
  const stepDesc = document.getElementById('player-step-desc');
  const timerTime = document.getElementById('player-timer-time');
  const timerStatus = document.getElementById('player-timer-status');
  const progressRing = document.getElementById('timer-progress-ring');
  
  const prevBtn = document.getElementById('player-prev-btn');
  const playBtn = document.getElementById('player-play-btn');
  const nextBtn = document.getElementById('player-next-btn');
  const cancelBtn = document.getElementById('player-cancel-btn');
  
  const playIcon = document.getElementById('play-icon');
  const pauseIcon = document.getElementById('pause-icon');
  
  const factTitle = document.getElementById('player-fact-title');
  const factText = document.getElementById('player-fact-text');
  const factSource = document.getElementById('player-fact-source');
  
  const statScienceVal = document.getElementById('player-stat-science-val');
  const statScienceBar = document.getElementById('player-stat-science-bar');
  const statFocusVal = document.getElementById('player-stat-focus-val');
  const statFocusBar = document.getElementById('player-stat-focus-bar');
  const statPhysVal = document.getElementById('player-stat-phys-val');
  const statPhysBar = document.getElementById('player-stat-phys-bar');

  gotoLibBtn.addEventListener('click', () => switchPanel('dashboard'));

  playBtn.addEventListener('click', togglePlayPause);
  prevBtn.addEventListener('click', () => moveStep(-1));
  nextBtn.addEventListener('click', () => moveStep(1));
  cancelBtn.addEventListener('click', resetPlayer);

  window.loadRoutineIntoPlayer = function(routine) {
    activeRoutine = routine;
    currentStepIndex = 0;
    isPlaying = false;
    
    // Clear existing intervals
    if (timerInterval) clearInterval(timerInterval);
    
    // Show active state
    emptyState.style.display = 'none';
    activeState.style.display = 'block';
    document.getElementById('player-active-dot').style.display = 'block';
    
    // Load analytical bar metrics
    statScienceVal.textContent = `${routine.stats.scientificScore}%`;
    statScienceBar.style.width = `${routine.stats.scientificScore}%`;
    statFocusVal.textContent = `${routine.stats.focusRequired}%`;
    statFocusBar.style.width = `${routine.stats.focusRequired}%`;
    statPhysVal.textContent = `${routine.stats.physicalIntensity}%`;
    statPhysBar.style.width = `${routine.stats.physicalIntensity}%`;

    loadStep(0);
  };

  function loadStep(idx) {
    if (!activeRoutine || idx < 0 || idx >= activeRoutine.steps.length) return;
    
    currentStepIndex = idx;
    const step = activeRoutine.steps[currentStepIndex];
    
    routineTitle.textContent = activeRoutine.title;
    stepTitle.textContent = step.title;
    stepDesc.textContent = step.desc;
    
    // Setup durations
    timerDurationTotal = step.duration * 60; // in seconds
    timerSecondsRemaining = timerDurationTotal;
    
    updateTimerText();
    updateProgressRing();
    loadFactForPlayer(step.factKey);
  }

  function loadFactForPlayer(factKey) {
    const fact = facts[factKey];
    if (fact) {
      factTitle.textContent = fact.title;
      factText.textContent = fact.text;
      factSource.textContent = `Source: ${fact.source}`;
    }
  }

  function updateTimerText() {
    const mins = Math.floor(timerSecondsRemaining / 60);
    const secs = timerSecondsRemaining % 60;
    timerTime.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function updateProgressRing() {
    // 2 * PI * r (r=90) => circumference = 565.48
    const circumference = 565.48;
    const progress = timerSecondsRemaining / timerDurationTotal;
    const offset = circumference * (1 - progress);
    progressRing.style.strokeDashoffset = offset;
  }

  function togglePlayPause() {
    if (!activeRoutine) return;

    if (isPlaying) {
      // Pause
      isPlaying = false;
      clearInterval(timerInterval);
      playIcon.style.display = 'block';
      pauseIcon.style.display = 'none';
      timerStatus.textContent = 'Paused';
    } else {
      // Play
      isPlaying = true;
      timerInterval = setInterval(tickTimer, 1000);
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'block';
      timerStatus.textContent = 'Remaining';
    }
  }

  function tickTimer() {
    if (timerSecondsRemaining <= 0) {
      clearInterval(timerInterval);
      playChime();
      
      // Auto move to next step or finish
      if (currentStepIndex + 1 < activeRoutine.steps.length) {
        loadStep(currentStepIndex + 1);
        if (isPlaying) {
          timerInterval = setInterval(tickTimer, 1000);
        }
      } else {
        completeActiveRoutine();
      }
    } else {
      timerSecondsRemaining--;
      updateTimerText();
      updateProgressRing();
    }
  }

  function moveStep(direction) {
    clearInterval(timerInterval);
    const targetIdx = currentStepIndex + direction;
    if (targetIdx >= 0 && targetIdx < activeRoutine.steps.length) {
      loadStep(targetIdx);
      if (isPlaying) {
        timerInterval = setInterval(tickTimer, 1000);
      }
    } else if (targetIdx >= activeRoutine.steps.length) {
      completeActiveRoutine();
    }
  }

  function completeActiveRoutine() {
    isPlaying = false;
    clearInterval(timerInterval);
    playChime();
    
    // Log routine completion
    logRoutineCompletion(activeRoutine);
    
    alert(`Congratulations! You have completed the routine: "${activeRoutine.title}"! Your habit history and streaks are updated.`);
    
    resetPlayer();
    switchPanel('tracker');
  }

  function resetPlayer() {
    isPlaying = false;
    if (timerInterval) clearInterval(timerInterval);
    activeRoutine = null;
    currentStepIndex = 0;
    
    playIcon.style.display = 'block';
    pauseIcon.style.display = 'none';
    
    emptyState.style.display = 'block';
    activeState.style.display = 'none';
    document.getElementById('player-active-dot').style.display = 'none';
  }

  // Synthesize Chime Sound via Web Audio API
  function playChime() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      // First tone (G5)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(783.99, audioCtx.currentTime); // G5
      gain1.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start();
      osc1.stop(audioCtx.currentTime + 0.3);
      
      // Second tone (C6)
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1046.50, audioCtx.currentTime); // C6
        gain2.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.4);
      }, 150);
    } catch (err) {
      console.warn("Audio Context blocked or not supported on this browser.", err);
    }
  }
}

// 6. Habit Tracker & Analytics Controller
function setupTracker() {
  updateTrackerUI();
}

function logRoutineCompletion(routine) {
  const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  // Save completion record
  const record = {
    id: routine.id,
    title: routine.title,
    score: routine.stats.scientificScore,
    date: todayStr,
    timestamp: Date.now()
  };
  
  completions.push(record);
  localStorage.setItem('routine_completions', JSON.stringify(completions));
  
  // Calculate streaks
  calculateStreaks(todayStr);
  
  updateTrackerUI();
  updateStreakDisplay();
}

function calculateStreaks(todayStr) {
  if (lastCompletionDate === todayStr) {
    // Already logged completion today, streak remains same
    return;
  }

  // Calculate day difference
  if (lastCompletionDate) {
    const lastDate = new Date(lastCompletionDate);
    const currentDate = new Date(todayStr);
    const diffTime = Math.abs(currentDate - lastDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      // Consecutive day
      userStreak++;
    } else if (diffDays > 1) {
      // Streak broken
      userStreak = 1;
    }
  } else {
    // First completion ever
    userStreak = 1;
  }
  
  // Record longest streak
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
}

function updateTrackerUI() {
  const totalCompletedEl = document.getElementById('stats-total-completions');
  const currentStreakEl = document.getElementById('stats-current-streak');
  const longestStreakEl = document.getElementById('stats-longest-streak');
  const avgScoreEl = document.getElementById('stats-avg-score');
  const historyList = document.getElementById('tracker-history-list');
  
  // Set simple values
  totalCompletedEl.textContent = completions.length;
  currentStreakEl.textContent = `${userStreak} Days`;
  longestStreakEl.textContent = `${userLongestStreak} Days`;
  
  // Calculate average scientific validity score
  if (completions.length > 0) {
    const totalScore = completions.reduce((acc, curr) => acc + curr.score, 0);
    avgScoreEl.textContent = `${Math.round(totalScore / completions.length)}%`;
  } else {
    avgScoreEl.textContent = '0%';
  }
  
  // Pop history log list
  historyList.innerHTML = '';
  if (completions.length === 0) {
    historyList.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding-top:3rem;">No routines completed yet. Load a routine in the Player and run it to record history.</p>';
  } else {
    // Show newest first
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
          <strong style="font-size:0.9rem;">${item.title}</strong>
          <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:0.1rem;">Date: ${item.date}</div>
        </div>
        <span class="card-badge" style="background:var(--accent-glow); color:var(--accent); font-size:0.65rem;">Score: ${item.score}%</span>
      `;
      historyList.appendChild(logDiv);
    });
  }

  // Render Calendar Grid for June 2026
  renderCalendarGridJune2026();
}

function renderCalendarGridJune2026() {
  const gridContainer = document.getElementById('calendar-days-grid');
  
  // Preserve first row of weekday headers (Sun, Mon, Tue...)
  const headerLabels = Array.from(gridContainer.children).slice(0, 7);
  gridContainer.innerHTML = '';
  headerLabels.forEach(hl => gridContainer.appendChild(hl));
  
  // June 2026 starts on Monday (index 1).
  // Days in month: 30
  
  // Add blank/empty days before Monday
  for (let i = 0; i < 1; i++) {
    const emptyDay = document.createElement('div');
    emptyDay.className = 'calendar-day inactive';
    gridContainer.appendChild(emptyDay);
  }
  
  // Render days
  const completedDates = completions.map(c => c.date);
  
  for (let dayNum = 1; dayNum <= 30; dayNum++) {
    const dayStr = `2026-06-${dayNum.toString().padStart(2, '0')}`;
    const isCompleted = completedDates.includes(dayStr);
    
    const dayDiv = document.createElement('div');
    dayDiv.className = `calendar-day ${isCompleted ? 'completed' : ''}`;
    dayDiv.style.cursor = 'pointer';
    dayDiv.dataset.date = dayStr;
    
    dayDiv.innerHTML = `
      <span>${dayNum}</span>
      ${isCompleted ? '<div class="calendar-day-dot"></div>' : ''}
    `;
    
    // Interactive toggling on calendar days
    dayDiv.addEventListener('click', () => {
      toggleCompletionOnDate(dayStr);
    });
    
    gridContainer.appendChild(dayDiv);
  }
}

function toggleCompletionOnDate(dateStr) {
  const existingIndex = completions.findIndex(c => c.date === dateStr);
  if (existingIndex > -1) {
    // Remove completion
    completions.splice(existingIndex, 1);
  } else {
    // Add dummy completion for manual override
    completions.push({
      id: "manual_log",
      title: "Manual Activity Log",
      score: 90,
      date: dateStr,
      timestamp: Date.now()
    });
  }
  
  localStorage.setItem('routine_completions', JSON.stringify(completions));
  
  // Re-adjust streaks based on actual history logs
  recalculateAllStreaks();
  
  updateTrackerUI();
  updateStreakDisplay();
}

function recalculateAllStreaks() {
  const sortedDates = [...new Set(completions.map(c => c.date))].sort();
  if (sortedDates.length === 0) {
    userStreak = 0;
    lastCompletionDate = "";
    localStorage.setItem('user_streak', "0");
    localStorage.setItem('last_completion_date', "");
    return;
  }
  
  let streak = 1;
  let maxStreak = 1;
  
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i-1]);
    const curr = new Date(sortedDates[i]);
    const diff = Math.ceil((curr - prev) / (1000 * 60 * 60 * 24));
    
    if (diff === 1) {
      streak++;
    } else if (diff > 1) {
      streak = 1;
    }
    
    if (streak > maxStreak) {
      maxStreak = streak;
    }
  }
  
  const todayStr = new Date().toISOString().split('T')[0];
  const lastLogged = sortedDates[sortedDates.length - 1];
  
  // If the last logged date is older than yesterday, the active streak resets to 0
  const lastDate = new Date(lastLogged);
  const today = new Date(todayStr);
  const diffFromToday = Math.ceil((today - lastDate) / (1000 * 60 * 60 * 24));
  
  if (diffFromToday > 1) {
    userStreak = 0;
  } else {
    userStreak = streak;
  }
  
  userLongestStreak = Math.max(userLongestStreak, maxStreak);
  lastCompletionDate = lastLogged;
  
  localStorage.setItem('user_streak', userStreak.toString());
  localStorage.setItem('user_longest_streak', userLongestStreak.toString());
  localStorage.setItem('last_completion_date', lastCompletionDate);
}

// 7. Custom Routine Creator Controller
function setupCreator() {
  const form = document.getElementById('creator-routine-form');
  const factSelect = document.getElementById('creator-step-fact');
  const addStepBtn = document.getElementById('creator-add-step-btn');
  const stepsContainer = document.getElementById('creator-steps-container');
  const emptyPreview = document.getElementById('creator-empty-preview');

  // Populate scientific fact options in selector
  factSelect.innerHTML = '';
  Object.keys(facts).forEach(key => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = `${facts[key].category} - ${facts[key].title}`;
    factSelect.appendChild(opt);
  });

  // Step adding event
  addStepBtn.addEventListener('click', () => {
    const titleInput = document.getElementById('creator-step-title');
    const durInput = document.getElementById('creator-step-duration');
    const descInput = document.getElementById('creator-step-desc');
    const factVal = factSelect.value;
    
    const sTitle = titleInput.value.trim();
    const sDur = parseInt(durInput.value);
    const sDesc = descInput.value.trim();
    
    if (!sTitle) {
      alert("Please enter a step title.");
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
    
    // Clear inputs
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
          <div class="builder-step-title">${idx + 1}. ${step.title} (${step.duration} mins)</div>
          <div class="builder-step-meta">Timing: ${step.time} | Fact: <strong>${facts[step.factKey].title}</strong></div>
        </div>
        <button class="btn-icon" style="width:32px; height:32px; color:var(--danger); border-color:transparent;" title="Remove Step">
          <svg viewBox="0 0 24 24" style="width:16px; height:16px; fill:none; stroke:currentColor; stroke-width:2.5;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      `;

      // Handle step removal
      row.querySelector('button').addEventListener('click', () => {
        creatorSteps.splice(idx, 1);
        
        // Recalculate relative timing labels
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

  // Handle entire custom routine submission
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const rTitle = document.getElementById('creator-title').value.trim();
    const rDesc = document.getElementById('creator-desc').value.trim();
    const rCat = document.getElementById('creator-category').value;
    const rDiff = document.getElementById('creator-difficulty').value;
    
    if (creatorSteps.length === 0) {
      alert("Please add at least one step to build a routine.");
      return;
    }

    // Calculate details
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
    
    // Reset form and steps preview
    form.reset();
    creatorSteps = [];
    renderCreatorSteps();
    
    // Refresh library grid page content
    renderLibrary();
    
    alert(`Success! Your custom routine "${rTitle}" has been saved to the library.`);
    
    // Go back to dashboard to see the new custom routine card
    switchPanel('dashboard');
  });
}
