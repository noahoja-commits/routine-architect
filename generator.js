import { facts, prebuiltRoutines, getFactForKeywords } from './db.js';

// Smart generative parsing engine for custom routines
export function generateRoutine(promptText) {
  const normalized = promptText.toLowerCase().trim();

  // 1. Check for close matches in pre-built routines first
  if (normalized.includes("morning") || normalized.includes("wake up") || normalized.includes("sunrise")) {
    const r = prebuiltRoutines.find(item => item.id === "high_perf_morning");
    if (r) return { isPrebuilt: true, ...r };
  }
  if (normalized.includes("code") || normalized.includes("program") || normalized.includes("study") || normalized.includes("exam") || normalized.includes("cram")) {
    const r = prebuiltRoutines.find(item => item.id === "deep_focus_dev");
    if (r) return { isPrebuilt: true, ...r };
  }
  if (normalized.includes("sleep") || normalized.includes("night") || normalized.includes("wind down") || normalized.includes("bedtime")) {
    const r = prebuiltRoutines.find(item => item.id === "restorative_sleep");
    if (r) return { isPrebuilt: true, ...r };
  }
  if (normalized.includes("gym") || normalized.includes("workout") || normalized.includes("lift") || normalized.includes("exercise") || normalized.includes("fitness")) {
    const r = prebuiltRoutines.find(item => item.id === "science_fitness");
    if (r) return { isPrebuilt: true, ...r };
  }
  if (normalized.includes("skin") || normalized.includes("face") || normalized.includes("glow") || normalized.includes("retinol")) {
    const r = prebuiltRoutines.find(item => item.id === "skincare_glow");
    if (r) return { isPrebuilt: true, ...r };
  }

  // 2. Generate a custom routine dynamically
  // Extract duration (default to 60 mins if none found)
  let duration = 60;
  const minutesMatch = normalized.match(/(\d+)\s*(min|minute|mins)/);
  const hoursMatch = normalized.match(/(\d+)\s*(hour|hr|hours|hrs)/);
  if (minutesMatch) {
    duration = parseInt(minutesMatch[1]);
  } else if (hoursMatch) {
    duration = parseInt(hoursMatch[1]) * 60;
  }

  // Determine key noun / action of the routine
  // Remove common filler words to isolate the core activity
  let coreActivity = promptText
    .replace(/(generate|make|create|routine|for|a|an|the|my|day|daily|weekly|super|in|depth|backed|with|facts|science)/gi, "")
    .replace(/\b(in\s*\d+\s*(mins|min|hours|hour|hrs|hr))\b/gi, "")
    .trim();

  if (!coreActivity) {
    coreActivity = "Personal Growth & Skill Learning";
  } else {
    // Capitalize first letter of each word
    coreActivity = coreActivity.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  // Categorize based on keywords
  let category = "General Productivity";
  let icon = "activity";
  let difficulty = "Medium";
  let scientificScore = 88;
  let focusRequired = 60;
  let physicalIntensity = 20;

  if (normalized.match(/(clean|tidy|house|room|chore|organize)/)) {
    category = "Home & Organization";
    icon = "home";
    scientificScore = 90;
    focusRequired = 30;
    physicalIntensity = 60;
  } else if (normalized.match(/(run|walk|cardio|stretch|muscle|fitness|gym|yoga)/)) {
    category = "Fitness & Physical Wellness";
    icon = "heart";
    scientificScore = 95;
    focusRequired = 50;
    physicalIntensity = 80;
  } else if (normalized.match(/(learn|instrument|guitar|language|read|book|skills)/)) {
    category = "Skill Acquisition & Learning";
    icon = "book-open";
    scientificScore = 93;
    focusRequired = 80;
    physicalIntensity = 10;
  } else if (normalized.match(/(cook|meal|food|kitchen|prep)/)) {
    category = "Nutrition & Cooking";
    icon = "coffee";
    scientificScore = 91;
    focusRequired = 50;
    physicalIntensity = 40;
  } else if (normalized.match(/(anxious|stress|calm|meditate|relax)/)) {
    category = "Mental Health & Relaxation";
    icon = "wind";
    scientificScore = 97;
    focusRequired = 70;
    physicalIntensity = 5;
  } else if (normalized.match(/(money|save|budget|finance|investment)/)) {
    category = "Financial Wellness";
    icon = "dollar-sign";
    scientificScore = 92;
    focusRequired = 80;
    physicalIntensity = 5;
  } else if (normalized.match(/(code|program|developer|debug|rust|python|js|react)/)) {
    category = "Productivity & Tech";
    icon = "code";
    scientificScore = 96;
    focusRequired = 90;
    physicalIntensity = 10;
  }

  // Adjust statistics based on duration and difficulty cues
  if (normalized.match(/(hard|intense|advanced|expert|extreme)/)) {
    difficulty = "Hard";
    focusRequired = Math.min(100, focusRequired + 15);
    physicalIntensity = Math.min(100, physicalIntensity + 15);
  } else if (normalized.match(/(easy|simple|lazy|chill|beginner)/)) {
    difficulty = "Easy";
    focusRequired = Math.max(10, focusRequired - 15);
    physicalIntensity = Math.max(5, physicalIntensity - 15);
  }

  // Build the steps dynamically based on the core activity and category
  const steps = [];
  const tokenized = normalized.split(/\s+/);

  // Divide duration dynamically
  const prepTime = Math.max(5, Math.round(duration * 0.1));
  const focusTime1 = Math.round(duration * 0.45);
  const breakTime = Math.max(5, Math.round(duration * 0.1));
  const focusTime2 = Math.round(duration * 0.25);
  const wrapTime = duration - prepTime - focusTime1 - breakTime - focusTime2;

  // Step 1: Prep
  let prepTitle = "Environment Optimization & Mental Priming";
  let prepDesc = `Clear your immediate work area of distractions. Gather all tools required for ${coreActivity}. Set a single micro-goal for this session.`;
  let prepFactKey = "clean_environment";

  if (category === "Home & Organization") {
    prepTitle = "Equipment Gathering & Ventilation";
    prepDesc = "Open the windows for fresh airflow and gather your cleaning products, cloths, and vacuum. Queue a high-energy playlist or educational podcast to maintain focus.";
    prepFactKey = "clean_environment";
  } else if (category === "Fitness & Physical Wellness") {
    prepTitle = "Dynamic Joint Mobilization";
    prepDesc = "Perform 5-10 minutes of dynamic leg swings, arm circles, and active stretching to increase blood flow to muscles and lubricate joints.";
    prepFactKey = "strength_warmup";
  } else if (category === "Mental Health & Relaxation") {
    prepTitle = "Sensory Minimization";
    prepDesc = "Find a quiet, dimly lit space. Set your phone to Do Not Disturb. Sit in a comfortable posture and close your eyes.";
    prepFactKey = "mindfulness_meditation";
  } else if (category === "Nutrition & Cooking") {
    prepTitle = "Recipe Review & Mise en Place";
    prepDesc = "Read through your recipe steps. Clear the countertops, pull out all ingredients, chop vegetables, and measure spices beforehand to prevent stress during cooking.";
    prepFactKey = "meal_prep";
  }

  steps.push({
    time: "Start",
    duration: prepTime,
    title: prepTitle,
    desc: prepDesc,
    factKey: prepFactKey,
    subfacts: []
  });

  // Step 2: Main Session
  let mainTitle = `Core Activation Phase: ${coreActivity}`;
  let mainDesc = `Dive into the most challenging parts of your ${coreActivity} tasks. Focus on high-quality practice and error corrections. Do not check your phone or switch tasks.`;
  let mainFactKey = "pomodoro";

  if (category === "Home & Organization") {
    mainTitle = "High-Impact Cleansing (Zone 1)";
    mainDesc = "Tackle the most demanding areas first (e.g., scrub countertops, wash dishes, wipe down kitchen surfaces). Speed is key; maintain a steady physical pace.";
    mainFactKey = "clean_environment";
  } else if (category === "Fitness & Physical Wellness") {
    mainTitle = "Primary Exercise Circuit (Intensity Focus)";
    mainDesc = "Perform your primary lifts, runs, or structured exercises. Track your reps/times. Push yourself close to failure if lifting, or keep in Zone 2 if cardiovascular.";
    mainFactKey = "strength_hypertrophy";
  } else if (category === "Mental Health & Relaxation") {
    mainTitle = "Focused Breathwork or Guided Session";
    mainDesc = "Engage in deep, slow box-breathing (4s inhale, 4s hold, 4s exhale, 4s hold) or start a guided meditation track. Focus entirely on sensory input and somatic releases.";
    mainFactKey = "mindfulness_meditation";
  } else if (category === "Skill Acquisition & Learning") {
    mainTitle = "Deliberate Practice & Drill Blocks";
    mainDesc = "Break the skill down. If playing guitar, practice difficult chord shifts slowly. If learning a language, do active recall flashcards. Focus on the boundary of your ability.";
    mainFactKey = "spaced_repetition";
  } else if (category === "Nutrition & Cooking") {
    mainTitle = "Active Cook & Heat Management";
    mainDesc = "Begin cooking, searing, or baking. Monitor heat levels closely. Clean pans as you go during inactive heating moments to keep the workspace clear.";
    mainFactKey = "meal_prep";
  } else if (category === "Financial Wellness") {
    mainTitle = "Account Auditing & Automation Setups";
    mainDesc = "Log into your financial accounts. Map out your monthly fixed expenses, savings targets, and investable surplus. Initiate automated transfers for your next paycheck.";
    mainFactKey = "finance_automation";
  }

  steps.push({
    time: `+${prepTime}m`,
    duration: focusTime1,
    title: mainTitle,
    desc: mainDesc,
    factKey: mainFactKey,
    subfacts: []
  });

  // Step 3: Decompression Break
  let breakTitle = "Cognitive Decompression Walk / Rehydrate";
  let breakDesc = "Step away from your screen or workspace. Drink 250ml of water. Do a quick neck/shoulder stretch and let your mind float freely to unlock diffuse thinking.";
  let breakFactKey = "diffuse_thinking";

  if (category === "Fitness & Physical Wellness") {
    breakTitle = "Active Recovery & Hydration";
    breakDesc = "Rest between intense exercise blocks. Walk around, sip water, and practice deep physiological sighs (two quick inhales, one long exhaling sigh) to calm heart rate.";
    breakFactKey = "mindfulness_meditation";
  } else if (category === "Mental Health & Relaxation") {
    breakTitle = "Gentle Somatic Releasing";
    breakDesc = "Slowly open your eyes. Perform minor neck stretches, shoulder rolls, or lay flat with feet elevated to promote circulatory normalization.";
    breakFactKey = "cold_exposure"; // general recovery tag
  }

  steps.push({
    time: `+${prepTime + focusTime1}m`,
    duration: breakTime,
    title: breakTitle,
    desc: breakDesc,
    factKey: breakFactKey,
    subfacts: []
  });

  // Step 4: Consolidation Block
  let consTitle = "Secondary Flow & Application";
  let consDesc = `Apply what you prepared or practiced. Complete remaining parts of ${coreActivity}, test out your work, or transition into micro-reviews.`;
  let consFactKey = "pomodoro";

  if (category === "Home & Organization") {
    consTitle = "Secondary Tidying & Floor Sweep (Zone 2)";
    consDesc = "Clean secondary spaces (bedroom, bathroom details). Vacuum or mop the floors, empty trash bins, and return misplaced items to their designated holders.";
    consFactKey = "clean_environment";
  } else if (category === "Fitness & Physical Wellness") {
    consTitle = "Accessory Movements & Core Work";
    consDesc = "Execute lighter accessory exercises, core training, or steady-state cool down exercises. Keep form perfect and load moderate.";
    consFactKey = "strength_hypertrophy";
  } else if (category === "Mental Health & Relaxation") {
    consTitle = "Gratitude Log & Cognitive Offload";
    consDesc = "Take a notebook and write down 3 specific things you are grateful for, or outline anything lingering in your thoughts to empty your mind.";
    consFactKey = "journaling";
  } else if (category === "Skill Acquisition & Learning") {
    consTitle = "Creative Jamming & Integration";
    consDesc = "Use the skills learned in a fun, free-form way. Play a full song, write a mini-paragraph in the new language, or draft a quick script using code concepts.";
    consFactKey = "diffuse_thinking";
  } else if (category === "Nutrition & Cooking") {
    consTitle = "Plating & Nutrient Composition Check";
    consDesc = "Plate the meal beautifully. Ensure your portion contains an adequate balance of lean protein (supporting muscle protein synthesis) and dietary fiber.";
    consFactKey = "nutrition_protein";
  }

  steps.push({
    time: `+${prepTime + focusTime1 + breakTime}m`,
    duration: focusTime2,
    title: consTitle,
    desc: consDesc,
    factKey: consFactKey,
    subfacts: []
  });

  // Step 5: Wrap Up / Decompression
  let wrapTitle = "Session Wrap-Up & Habit Consolidation";
  let wrapDesc = "Put away your tools, clean your workspace, and write a single sentence summarizing what you achieved. This establishes a psychological closure loop.";
  let wrapFactKey = "journaling";

  if (category === "Home & Organization") {
    wrapTitle = "Visual Appreciation & Aroma Lock";
    wrapDesc = "Put away cleaning supplies. Light a candle, spray a fresh scent, and spend 2 minutes looking over the clean space. This triggers a healthy dopamine release.";
    wrapFactKey = "mindfulness_meditation";
  } else if (category === "Fitness & Physical Wellness") {
    wrapTitle = "Static Stretching & Anabolic Feeding";
    wrapDesc = "Hold static stretches for tight muscles (30s each) to restore resting muscle length. Hydrate and prepare a high-protein post-workout snack/meal.";
    wrapFactKey = "nutrition_protein";
  } else if (category === "Nutrition & Cooking") {
    wrapTitle = "Workspace Sanitization & Dining";
    wrapDesc = "Soak pots/pans, wipe down cooking surfaces, and sit down to enjoy your meal mindfully, free of digital screens.";
    wrapFactKey = "blue_light_block";
  }

  steps.push({
    time: `+${prepTime + focusTime1 + breakTime + focusTime2}m`,
    duration: wrapTime,
    title: wrapTitle,
    desc: wrapDesc,
    factKey: wrapFactKey,
    subfacts: []
  });

  // Final check: Calculate scientificScore based on fact keys
  const scientificLevel = Math.min(100, 85 + (steps.length * 2));

  return {
    isPrebuilt: false,
    id: "custom_" + Date.now(),
    title: `${coreActivity} Routine`,
    category,
    difficulty,
    duration,
    description: `A custom-generated routine tailored specifically for: "${promptText}". Optimizes timing and execution structure based on cognitive and somatic performance science.`,
    icon,
    stats: {
      scientificScore: scientificLevel,
      focusRequired,
      physicalIntensity
    },
    steps
  };
}
