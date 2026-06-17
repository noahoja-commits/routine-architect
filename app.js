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
let timerEndTimestamp = 0; // Fixed: Tracks exact timestamp to prevent mobile background drift
let isPlaying = false;
let audioContext = null; // Fixed: Primed AudioContext for iOS/Chrome chimes

// Custom Builder State
let creatorSteps = [];

// DOM Elements
const navLinks = document.querySelectorAll('.nav-link');
const panels = document.querySelectorAll('.view-panel');
const prebuiltGrid = document.getElementById('prebuilt-library-grid');
const streakValues = document.querySelectorAll('#sidebar-streak-value');
const themeDarkBtn = document.getElementById('theme-dark-btn');
const themeLightBtn = document.getElementById('theme-light-btn');

// Voice Coach Toggle
const voiceToggle = document.getElementById('player-voice-toggle');

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupTheme();
  renderLibrary();
  setupGenerator();
  setupPlayer();
  setupCreator();
  setupTracker();
  setupFactExplorer();
  updateStreakDisplay();
  
  // Prime audio context on any first body tap to comply with browser restrictions
  document.body.addEventListener('click', initAudioContext, { once: true });
});

// Helper to initialize and resume Web Audio Context
function initAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume().then(() => console.log('AudioContext successfully unlocked.'));
  }
}

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
      initAudioContext();
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
    const promptVal = promptTextarea.value.trim();
    if (!promptVal) return;
    
    // Show Loading Spinner
    generatorResult.style.display = 'none';
    generatorLoading.style.display = 'block';

    setTimeout(() => {
      generatorLoading.style.display = 'none';
      
      try {
        currentGeneratedRoutine = generateRoutine(promptVal);
        
        // Update inputs with extracted properties if needed
        document.getElementById('generator-duration').value = currentGeneratedRoutine.duration;
        document.getElementById('generator-difficulty').value = currentGeneratedRoutine.difficulty;

        // Render Results
        resultTitle.textContent = currentGeneratedRoutine.title;
        resultDesc.textContent = currentGeneratedRoutine.description;
        
        renderSteps(currentGeneratedRoutine.steps);
        generatorResult.style.display = 'block';
      } catch (err) {
        console.error(err);
        alert("Failed to compile routine. Please try a simpler phrasing.");
      }
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
    } else {
      // Fallback
      factTitle.textContent = "Clinical Justification";
      factText.textContent = "This custom activity block is arranged to balance active cognitive effort with neural recovery phases, preventing system fatigue.";
      factSource.textContent = "Cognitive Ergonomics Research";
    }
  }

  // Start Playing Generated Routine
  startBtn.addEventListener('click', () => {
    initAudioContext();
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

  playBtn.addEventListener('click', () => {
    initAudioContext();
    togglePlayPause();
  });
  
  prevBtn.addEventListener('click', () => {
    initAudioContext();
    moveStep(-1);
  });
  
  nextBtn.addEventListener('click', () => {
    initAudioContext();
    moveStep(1);
  });
  
  cancelBtn.addEventListener('click', resetPlayer);

  window.loadRoutineIntoPlayer = function(routine) {
    if (!routine.steps || routine.steps.length === 0) {
      alert("This routine has no steps to play.");
      return;
    }
    
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
    
    // TTS voice announcement
    speakStep(step);
  }

  function loadFactForPlayer(factKey) {
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
    timerTime.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function updateProgressRing() {
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
      
      // Fixed: Anchor timer to exact end-timestamp to prevent background sleeping drift
      timerEndTimestamp = Date.now() + (timerSecondsRemaining * 1000);
      
      timerInterval = setInterval(tickTimer, 200); // Poll rapidly to keep display synced
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'block';
      timerStatus.textContent = 'Remaining';
    }
  }

  function tickTimer() {
    // Calculate exact remaining time against the absolute end-timestamp
    const remaining = Math.max(0, Math.round((timerEndTimestamp - Date.now()) / 1000));
    timerSecondsRemaining = remaining;
    
    updateTimerText();
    updateProgressRing();

    if (timerSecondsRemaining <= 0) {
      clearInterval(timerInterval);
      playChime();
      
      // Auto move to next step or finish
      if (currentStepIndex + 1 < activeRoutine.steps.length) {
        setTimeout(() => {
          loadStep(currentStepIndex + 1);
          if (isPlaying) {
            timerEndTimestamp = Date.now() + (timerSecondsRemaining * 1000);
            timerInterval = setInterval(tickTimer, 200);
          }
        }, 800); // minor buffer for audio chime playout
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
    
    // Log routine completion
    logRoutineCompletion(activeRoutine);
    
    alert(`Congratulations! You have completed: "${activeRoutine.title}"! Your habit history and streaks are updated.`);
    
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
    
    // Stop any reading voice
    window.speechSynthesis.cancel();
  }

  // Synthesize Chime Sound via Web Audio API using the global AudioContext
  function playChime() {
    initAudioContext();
    if (!audioContext) return;
    
    try {
      const now = audioContext.currentTime;
      
      // First tone (G5)
      const osc1 = audioContext.createOscillator();
      const gain1 = audioContext.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(783.99, now); // G5
      gain1.gain.setValueAtTime(0.1, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc1.connect(gain1);
      gain1.connect(audioContext.destination);
      osc1.start();
      osc1.stop(now + 0.3);
      
      // Second tone (C6)
      setTimeout(() => {
        if (!audioContext || audioContext.state === 'suspended') return;
        const now2 = audioContext.currentTime;
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1046.50, now2); // C6
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

  // Text-To-Speech step announcer
  function speakStep(step) {
    if (!voiceToggle.checked) return;
    
    try {
      window.speechSynthesis.cancel(); // kill any active speech first
      
      const announcement = `Starting: ${step.title}. ${step.desc}`;
      const utterance = new SpeechSynthesisUtterance(announcement);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      
      // Try to bind an English voice if cached
      const voices = window.speechSynthesis.getVoices();
      const bestVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural')));
      if (bestVoice) utterance.voice = bestVoice;
      
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("Speech Synthesis failed to run:", err);
    }
  }
}

// 6. Habit Tracker & Analytics Controller
function setupTracker() {
  updateTrackerUI();
  setupBackupRestore();
}

function logRoutineCompletion(routine) {
  const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  const record = {
    id: routine.id,
    title: routine.title,
    score: routine.stats.scientificScore,
    date: todayStr,
    timestamp: Date.now()
  };
  
  completions.push(record);
  localStorage.setItem('routine_completions', JSON.stringify(completions));
  
  calculateStreaks(todayStr);
  updateTrackerUI();
  updateStreakDisplay();
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
}

function updateTrackerUI() {
  const totalCompletedEl = document.getElementById('stats-total-completions');
  const currentStreakEl = document.getElementById('stats-current-streak');
  const longestStreakEl = document.getElementById('stats-longest-streak');
  const avgScoreEl = document.getElementById('stats-avg-score');
  const historyList = document.getElementById('tracker-history-list');
  
  totalCompletedEl.textContent = completions.length;
  currentStreakEl.textContent = `${userStreak} Days`;
  longestStreakEl.textContent = `${userLongestStreak} Days`;
  
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

  // Render Calendar and Compliance charts
  renderCalendarGridJune2026();
  renderWeeklyComplianceChart();
}

// Fixed: Prevents future date completion logging
function toggleCompletionOnDate(dateStr) {
  const selectedDate = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(23, 59, 59, 999); // Set to end of today
  
  if (selectedDate > today) {
    alert("Focus Error: You cannot record routine completions for future dates.");
    return;
  }

  const existingIndex = completions.findIndex(c => c.date === dateStr);
  if (existingIndex > -1) {
    // Remove completion
    completions.splice(existingIndex, 1);
  } else {
    // Add manual log
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

function renderCalendarGridJune2026() {
  const gridContainer = document.getElementById('calendar-days-grid');
  const headerLabels = Array.from(gridContainer.children).slice(0, 7);
  gridContainer.innerHTML = '';
  headerLabels.forEach(hl => gridContainer.appendChild(hl));
  
  // June 2026 starts on Monday (index 1). Days: 30
  for (let i = 0; i < 1; i++) {
    const emptyDay = document.createElement('div');
    emptyDay.className = 'calendar-day inactive';
    gridContainer.appendChild(emptyDay);
  }
  
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
    
    dayDiv.addEventListener('click', () => {
      toggleCompletionOnDate(dayStr);
    });
    
    gridContainer.appendChild(dayDiv);
  }
}

// Renders the 7-Day compliance trends via dynamic SVG vector bars
function renderWeeklyComplianceChart() {
  const container = document.getElementById('weekly-compliance-chart-container');
  if (!container) return;

  const stats = [];
  const today = new Date();
  
  // Build last 7 days list
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const count = completions.filter(c => c.date === dateStr).length;
    const label = d.toLocaleDateString('en-US', { weekday: 'short' });
    stats.push({ count, label });
  }

  const maxVal = Math.max(...stats.map(s => s.count), 2); // default scale top is 2
  
  let svg = `<svg viewBox="0 0 500 130" width="100%" height="100%">
    <!-- Gridlines -->
    <line class="chart-grid-line" x1="30" y1="20" x2="480" y2="20"></line>
    <line class="chart-grid-line" x1="30" y1="60" x2="480" y2="60"></line>
    <line class="chart-grid-line" x1="30" y1="100" x2="480" y2="100"></line>
    <line class="chart-axis-line" x1="30" y1="100" x2="480" y2="100"></line>
  `;

  stats.forEach((item, idx) => {
    const x = 50 + idx * 60;
    const barHeight = (item.count / maxVal) * 75; // Max height inside SVG box is 75px
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
    if (sDur <= 0 || isNaN(sDur)) {
      alert("Please enter a valid positive duration.");
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
          <div class="builder-step-title">${idx + 1}. ${step.title} (${step.duration} mins)</div>
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
      alert("Validation Error: Please add at least one step to build a routine.");
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
    
    alert(`Success! Your custom routine "${rTitle}" has been saved to the library.`);
    switchPanel('dashboard');
  });
}

// 8. Data Vault Backup & Restore Handler
function setupBackupRestore() {
  const backupBtn = document.getElementById('tracker-backup-btn');
  const restoreBtn = document.getElementById('tracker-restore-btn');
  const restoreInput = document.getElementById('tracker-restore-input');

  backupBtn.addEventListener('click', () => {
    const backupData = {
      completions,
      customRoutines,
      userStreak,
      userLongestStreak,
      lastCompletionDate
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
        
        // Strict structure validation
        if (data && Array.isArray(data.completions) && Array.isArray(data.customRoutines)) {
          localStorage.setItem('routine_completions', JSON.stringify(data.completions));
          localStorage.setItem('custom_routines', JSON.stringify(data.customRoutines));
          localStorage.setItem('user_streak', (data.userStreak || 0).toString());
          localStorage.setItem('user_longest_streak', (data.userLongestStreak || 0).toString());
          localStorage.setItem('last_completion_date', data.lastCompletionDate || "");

          completions = data.completions;
          customRoutines = data.customRoutines;
          userStreak = parseInt(data.userStreak) || 0;
          userLongestStreak = parseInt(data.userLongestStreak) || 0;
          lastCompletionDate = data.lastCompletionDate || "";

          renderLibrary();
          updateTrackerUI();
          updateStreakDisplay();

          alert("Vault restored successfully! Data updated.");
        } else {
          alert("Restore Failed: Invalid backup format. Missing core dataset arrays.");
        }
      } catch (err) {
        alert("Restore Failed: Error parsing file. Ensure it is a valid JSON file.");
      }
    };
    reader.readAsText(file);
    restoreInput.value = ''; // clear input
  });
}

// 9. Science Vault Explorer Modal
function setupFactExplorer() {
  const openBtn = document.getElementById('open-fact-explorer-btn');
  const modal = document.getElementById('fact-explorer-modal');
  const closeBtn = document.getElementById('fact-explorer-close-btn');
  const searchInput = document.getElementById('fact-explorer-search');
  const listContainer = document.getElementById('fact-explorer-list');

  openBtn.addEventListener('click', () => {
    modal.style.display = 'flex';
    // Trigger transition opacity
    setTimeout(() => {
      modal.classList.add('active');
    }, 10);
    renderExplorerList("");
  });

  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
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
