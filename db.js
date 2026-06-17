// Database of scientific facts, modular steps, and pre-built routines

export const facts = {
  hydration: {
    title: "Immediate Hydration & Cortisol Clearance",
    text: "Drinking 500ml of water immediately upon waking stimulates cellular metabolism, offsets overnight dehydration, and helps clear accumulated adenosine (the sleepiness chemical), aligning with the natural morning cortisol spike.",
    source: "Stanford Neurobiology / Dr. Andrew Huberman",
    category: "Morning / Physical"
  },
  light_exposure: {
    title: "Morning Sunlight & Circadian Alignment",
    text: "Getting 10-15 minutes of viewing outdoor sunlight (not through a window) within an hour of waking triggers a timed release of cortisol, boosts daytime alertness, and sets a timer for melatonin release ~16 hours later, optimizing sleep latency.",
    source: "Journal of Circadian Rhythms (2021)",
    category: "Morning / Sleep"
  },
  delay_caffeine: {
    title: "Caffeine Delay for Adenosine Regulation",
    text: "Delaying caffeine intake by 90-120 minutes after waking allows adenosine receptors to clear naturally. Ingesting caffeine too early binds receptors and causes a severe afternoon crash when caffeine wears off.",
    source: "Sleep Medicine Reviews, Vol. 45",
    category: "Nutrition / Physiology"
  },
  cold_exposure: {
    title: "Deliberate Cold Exposure & Dopamine",
    text: "A 1-3 minute cold shower or plunge (around 50-60°F) triggers a long-lasting (2.5x) elevation in baseline dopamine, epinephrine, and norepinephrine, significantly boosting mood, focus, and thermogenesis.",
    source: "European Journal of Applied Physiology (2000)",
    category: "Recovery / Mental"
  },
  pomodoro: {
    title: "Ultradian Rhythms & Focus Blocks",
    text: "Human focus naturally operates in 90-minute ultradian cycles. Breaking work into 50-minute blocks with 10-minute breaks or 90-minute sprints matches brain physiology, preventing prefrontal cortex fatigue.",
    source: "Harvard Business Review / Cognitive Performance Research",
    category: "Productivity"
  },
  diffuse_thinking: {
    title: "Diffuse Mode & Creative Insight",
    text: "Moving away from active problem solving to engage in low-attention tasks (walking, washing dishes) allows the brain to switch to 'diffuse mode', forming non-obvious neural connections and solving complex bugs/problems.",
    source: "A Mind for Numbers - Dr. Barbara Oakley",
    category: "Productivity / Coding"
  },
  active_recovery: {
    title: "Zone 2 Cardio & Neurogenesis",
    text: "30-45 minutes of Zone 2 cardio (conversational pace) increases mitochondrial density, improves brain-derived neurotrophic factor (BDNF) for learning, and lowers systemic inflammation.",
    source: "Medicine & Science in Sports & Exercise (2020)",
    category: "Fitness / Health"
  },
  spaced_repetition: {
    title: "Spaced Repetition & Synaptic Consolidation",
    text: "Reviewing material just as you are about to forget it (using flashcards or active recall) strengthens neural pathways. It shifts information from short-term working memory to long-term cortical storage.",
    source: "Memory: A Contribution to Experimental Psychology",
    category: "Learning / Study"
  },
  blue_light_block: {
    title: "Evening Blue-Light Avoidance & Melatonin",
    text: "Exposure to high-intensity blue light (screens/overhead lighting) past 8 PM suppresses melatonin synthesis by simulating daylight, disrupting the sleep architecture (deep and REM phases).",
    source: "Proceedings of the National Academy of Sciences (PNAS)",
    category: "Sleep"
  },
  journaling: {
    title: "Cognitive Offloading & Anxiety Reduction",
    text: "Writing down thoughts, anxiety triggers, or tomorrow's to-do list before sleep unburdens working memory, lowering active amygdala firing and accelerating sleep onset.",
    source: "Journal of Experimental Psychology (2018)",
    category: "Mental Health / Sleep"
  },
  skin_hyaluronic: {
    title: "Transepidermal Water Loss (TEWL) Mitigation",
    text: "Applying Hyaluronic Acid onto damp skin creates a humectant barrier that binds up to 1,000 times its weight in water, drawing moisture into the stratum corneum rather than letting it evaporate.",
    source: "Journal of Clinical and Aesthetic Dermatology",
    category: "Skincare"
  },
  skin_retinol: {
    title: "Retinoid-Induced Cellular Turnover",
    text: "Retinol stimulates cellular renewal and increases collagen synthesis. It must be applied at night because UV light destabilizes the molecule and renders it ineffective, while increasing photosensitivity.",
    source: "Clinical Interventions in Aging (2006)",
    category: "Skincare"
  },
  skin_spf: {
    title: "UV Radiation & Photoaging Prevention",
    text: "Broad-spectrum SPF 30+ prevents UV-induced collagen degradation, DNA damage, and hyperpigmentation. 80% of visible skin aging is caused by daily, low-level UV exposure.",
    source: "Journal of Cosmetic Dermatology (2019)",
    category: "Skincare"
  },
  strength_warmup: {
    title: "Dynamic Muscle Recruitment & Joint Lubrication",
    text: "Dynamic warmups raise muscle temperature, reduce viscosity, and increase synovial fluid in joints, reducing injury rates and maximizing peak power output compared to static stretching.",
    source: "Journal of Strength and Conditioning Research",
    category: "Fitness"
  },
  strength_hypertrophy: {
    title: "Progressive Overload & Muscle Hypertrophy",
    text: "Muscular adaptations depend on mechanical tension. Working sets within 1-3 reps of failure (RPE 7-9) stimulate type-II muscle fibers and trigger hypertrophy signaling pathways (mTORC1).",
    source: "Journal of Applied Physiology (2016)",
    category: "Fitness"
  },
  nutrition_protein: {
    title: "Muscle Protein Synthesis & Thermic Effect",
    text: "Ingesting 1.6 - 2.2g of protein per kg of body weight daily stimulates muscle protein synthesis. Protein has a thermic effect of 20-30%, meaning the body burns significant energy just digesting it.",
    source: "International Society of Sports Nutrition (ISSN) Position Stand",
    category: "Nutrition"
  },
  mindfulness_meditation: {
    title: "Parasympathetic Activation & Vagal Tone",
    text: "Just 10 minutes of daily mindfulness meditation reduces gray-matter density in the amygdala (fear center) and increases prefrontal cortex density, enhancing emotional regulation and focus.",
    source: "Psychiatry Research: Neuroimaging (2011)",
    category: "Mental Health"
  },
  meal_prep: {
    title: "Prefrontal Preservation & Nutritional Compliance",
    text: "Deciding what to eat when hungry leads to 'decision fatigue', drawing on depleted prefrontal cortex resources and leading to high-calorie, low-nutrient impulse eating. Pre-planning completely mitigates this.",
    source: "Appetite Journal (2017)",
    category: "Nutrition / Habits"
  },
  clean_environment: {
    title: "Visual Clutter & Cognitive Overload",
    text: "A cluttered environment overloads the visual cortex, competing for neural representation and reducing working memory capacity and task-switching efficiency.",
    source: "Journal of Neuroscience (2011)",
    category: "Productivity / Mental"
  },
  finance_automation: {
    title: "Automated Saving & Hedonic Adaptation",
    text: "Automating savings transfers 'out of sight, out of mind' exploits loss aversion. It prevents spending expansion (lifestyle creep) by adjusting your perceived baseline income.",
    source: "Journal of Economic Behavior & Organization",
    category: "Finance / Behavior"
  }
};

export const prebuiltRoutines = [
  {
    id: "high_perf_morning",
    title: "Ultimate High-Performance Morning Routine",
    category: "Morning & Wakeup",
    difficulty: "Medium",
    duration: 90, // minutes
    description: "Designed to optimize circadian biology, kickstart energy levels, and establish high-focus baselines using clinically backed habits.",
    icon: "sunrise",
    stats: {
      scientificScore: 98,
      focusRequired: 60,
      physicalIntensity: 40
    },
    steps: [
      {
        time: "07:00 AM",
        duration: 10,
        title: "Circadian Awakening & Rehydration",
        desc: "Drink 500ml of mineral/filtered water. Step outside and look in the general direction of the sun for 5-10 minutes. Do not stare directly, and avoid sunglasses.",
        factKey: "hydration",
        subfacts: ["light_exposure"]
      },
      {
        time: "07:10 AM",
        duration: 15,
        title: "Dynamic Mobility Flow",
        desc: "Engage in light movement (cat-cow, lunges, shoulder pass-throughs) to warm up core body temperature, signaling to the brain that it is time to be active.",
        factKey: "strength_warmup",
        subfacts: []
      },
      {
        time: "07:25 AM",
        duration: 5,
        title: "Deliberate Cold Exposure",
        desc: "Take a 2-minute cold shower. Focus on slow, controlled exhales to bypass the initial hyperventilation response.",
        factKey: "cold_exposure",
        subfacts: []
      },
      {
        time: "07:30 AM",
        duration: 15,
        title: "Mindfulness & Goal Alignment",
        desc: "Spend 10 minutes meditating (focusing on the breath). Follow up with 5 minutes of cognitive offloading: write down 3 primary targets for the day.",
        factKey: "mindfulness_meditation",
        subfacts: ["journaling"]
      },
      {
        time: "07:45 AM",
        duration: 45,
        title: "Deep Work Session (First Block)",
        desc: "Work on your highest-priority, most difficult task of the day. Put your phone in another room. Delay caffeine until the end of this block.",
        factKey: "pomodoro",
        subfacts: ["delay_caffeine"]
      }
    ]
  },
  {
    id: "deep_focus_dev",
    title: "Deep Focus Programming & Study Block",
    category: "Productivity & Tech",
    difficulty: "Hard",
    duration: 180,
    description: "An intensive routine for software developers, students, and writers to maximize complex coding output, learning absorption, and debug efficiency.",
    icon: "code",
    stats: {
      scientificScore: 95,
      focusRequired: 90,
      physicalIntensity: 10
    },
    steps: [
      {
        time: "Block Start",
        duration: 10,
        title: "Workspace Sanitization & Task Setup",
        desc: "Clear physical clutter from your desk. Launch only the browser tabs and IDE files necessary for the specific feature you are building.",
        factKey: "clean_environment",
        subfacts: []
      },
      {
        time: "+10 mins",
        duration: 50,
        title: "Deep Coding Block (Focus Alpha)",
        desc: "Begin active coding or reading. Block all notifications. Use distraction-blocking apps if necessary.",
        factKey: "pomodoro",
        subfacts: []
      },
      {
        time: "+60 mins",
        duration: 10,
        title: "Active Decompression Break",
        desc: "Stand up, stretch, and walk away from screens. Drink water. Do not check social media, as it keeps your prefrontal cortex engaged.",
        factKey: "diffuse_thinking",
        subfacts: []
      },
      {
        time: "+70 mins",
        duration: 50,
        title: "Deep Coding Block (Focus Beta)",
        desc: "Resume implementation or debugging. If stuck on a bug, outline the problem on a physical notepad rather than clicking through lines randomly.",
        factKey: "pomodoro",
        subfacts: []
      },
      {
        time: "+120 mins",
        duration: 15,
        title: "Diffuse Mode Walk & Hydrate",
        desc: "Go outside for a quick 10-15 minute walk. Let your mind wander. This is when creative insights and bug solutions typically manifest.",
        factKey: "diffuse_thinking",
        subfacts: ["active_recovery"]
      },
      {
        time: "+135 mins",
        duration: 30,
        title: "Spaced Repetition Review & Documentation",
        desc: "Document the code written, commit changes, and review your personal knowledge base (Anki, flashcards, or study guides) for active retention.",
        factKey: "spaced_repetition",
        subfacts: []
      },
      {
        time: "+165 mins",
        duration: 15,
        title: "Retrospective & Cleanup",
        desc: "Write down a brief 'handoff note' to yourself outlining exactly where you left off. This reduces start friction for your next session.",
        factKey: "journaling",
        subfacts: []
      }
    ]
  },
  {
    id: "restorative_sleep",
    title: "Deep Restorative Sleep Prep",
    category: "Health & Sleep",
    difficulty: "Easy",
    duration: 60,
    description: "Prepare the body and brain for optimal deep and REM sleep cycles by actively reducing sensory stimuli, core temperature, and cognitive load.",
    icon: "moon",
    stats: {
      scientificScore: 99,
      focusRequired: 20,
      physicalIntensity: 10
    },
    steps: [
      {
        time: "09:30 PM",
        duration: 15,
        title: "Digital Sunset & Light Dimming",
        desc: "Turn off overhead lighting. Switch to amber/red lamps. Place phone on its charger outside the bedroom or set it to 'Do Not Disturb' across the room.",
        factKey: "blue_light_block",
        subfacts: []
      },
      {
        time: "09:45 PM",
        duration: 15,
        title: "Cognitive Offload & Planning",
        desc: "Spend 5-10 minutes writing down a raw brain-dump of things on your mind, plus tomorrow's schedule. This removes the need for your brain to rehearse them overnight.",
        factKey: "journaling",
        subfacts: []
      },
      {
        time: "10:00 PM",
        duration: 20,
        title: "Hot Bath/Shower & Somatic Prep",
        desc: "Take a warm shower or bath. The heat dilates blood vessels, sending blood to the extremities, which causes your core body temperature to plunge rapidly upon exiting—a key trigger for sleep.",
        factKey: "cold_exposure",
        subfacts: []
      },
      {
        time: "10:20 PM",
        duration: 10,
        title: "Passive Stretches & Deep Breathing",
        desc: "Perform 10 minutes of light floor stretches (child's pose, hamstring stretch) combined with double-inhale, long-sigh physiological sighs to activate the vagus nerve.",
        factKey: "mindfulness_meditation",
        subfacts: []
      }
    ]
  },
  {
    id: "science_fitness",
    title: "Science-Backed Workout & Nutrition Flow",
    category: "Fitness & Wellness",
    difficulty: "Hard",
    duration: 90,
    description: "A comprehensive hypertrophy and energy-optimized training session with integrated pre- and post-workout nutritional alignment.",
    icon: "activity",
    stats: {
      scientificScore: 96,
      focusRequired: 70,
      physicalIntensity: 95
    },
    steps: [
      {
        time: "Pre-Workout",
        duration: 15,
        title: "Dynamic Neuromuscular Warmup",
        desc: "Perform 5 mins of light cardio followed by leg swings, arm circles, and low-intensity movements mimicking your primary exercises. Prime the central nervous system.",
        factKey: "strength_warmup",
        subfacts: []
      },
      {
        time: "Workout Start",
        duration: 50,
        title: "Resistance Training (Progressive Overload)",
        desc: "Focus on compound movements (Squats, Presses, Pulls). Record weight and reps. Rest 2-3 minutes between sets to maximize ATP-CP recovery. Keep sets within 2 RIR.",
        factKey: "strength_hypertrophy",
        subfacts: []
      },
      {
        time: "Workout End",
        duration: 10,
        title: "Zone 1 Cool-Down & Diaphragmatic Breath",
        desc: "Hop on a bike or walk slowly. Perform 5 minutes of deep breathing to quickly down-regulate your central nervous system from sympathetic to parasympathetic.",
        factKey: "mindfulness_meditation",
        subfacts: []
      },
      {
        time: "Post-Workout",
        duration: 15,
        title: "Anabolic Window Feeding",
        desc: "Consume 30-40g of rapid-digesting protein (whey/plant protein) alongside simple carbohydrates to restore muscle glycogen and spark repair processes.",
        factKey: "nutrition_protein",
        subfacts: []
      }
    ]
  },
  {
    id: "skincare_glow",
    title: "Anti-Aging & Barrier Repair Skincare",
    category: "Health & Sleep",
    difficulty: "Easy",
    duration: 15,
    description: "A derm-validated morning & night combination routine aimed at skin hydration, cellular repair, and barrier preservation.",
    icon: "sparkles",
    stats: {
      scientificScore: 94,
      focusRequired: 30,
      physicalIntensity: 5
    },
    steps: [
      {
        time: "Morning",
        duration: 5,
        title: "Cleanse, Hydrate & Protect",
        desc: "Wash face with water or a gentle cleanser. Apply Hyaluronic Acid to damp skin. Follow with a Vitamin C antioxidant serum, moisturizer, and broad-spectrum SPF 30+.",
        factKey: "skin_spf",
        subfacts: ["skin_hyaluronic"]
      },
      {
        time: "Night",
        duration: 10,
        title: "Double Cleansing & Nightly Repair",
        desc: "Cleanse with an oil cleanser to remove SPF/sebum, followed by a water-based cleanser. Apply Hyaluronic Acid to damp skin, wait for it to dry, apply a pea-sized amount of Retinol, then lock it in with a ceramide cream.",
        factKey: "skin_retinol",
        subfacts: ["skin_hyaluronic"]
      }
    ]
  }
];

export function getFactForKeywords(keywords) {
  const keywordMap = {
    water: "hydration",
    drink: "hydration",
    hydrate: "hydration",
    sun: "light_exposure",
    morning: "light_exposure",
    circadian: "light_exposure",
    light: "light_exposure",
    coffee: "delay_caffeine",
    caffeine: "delay_caffeine",
    cold: "cold_exposure",
    shower: "cold_exposure",
    pomodoro: "pomodoro",
    sprint: "pomodoro",
    focus: "pomodoro",
    work: "pomodoro",
    bug: "diffuse_thinking",
    code: "diffuse_thinking",
    creative: "diffuse_thinking",
    stuck: "diffuse_thinking",
    walk: "active_recovery",
    cardio: "active_recovery",
    heart: "active_recovery",
    learn: "spaced_repetition",
    study: "spaced_repetition",
    memorize: "spaced_repetition",
    review: "spaced_repetition",
    sleep: "blue_light_block",
    night: "blue_light_block",
    evening: "blue_light_block",
    bed: "blue_light_block",
    screen: "blue_light_block",
    anxious: "journaling",
    stress: "journaling",
    write: "journaling",
    mind: "journaling",
    skin: "skin_spf",
    sunscreen: "skin_spf",
    wrinkle: "skin_retinol",
    retinol: "skin_retinol",
    dry: "skin_hyaluronic",
    cream: "skin_hyaluronic",
    gym: "strength_hypertrophy",
    lift: "strength_hypertrophy",
    muscle: "strength_hypertrophy",
    protein: "nutrition_protein",
    eat: "nutrition_protein",
    diet: "nutrition_protein",
    warmup: "strength_warmup",
    stretch: "strength_warmup",
    meditate: "mindfulness_meditation",
    calm: "mindfulness_meditation",
    meal: "meal_prep",
    cook: "meal_prep",
    clean: "clean_environment",
    room: "clean_environment",
    tidy: "clean_environment",
    save: "finance_automation",
    money: "finance_automation",
    budget: "finance_automation"
  };

  for (let kw of keywords) {
    const word = kw.toLowerCase().trim();
    if (keywordMap[word]) {
      return facts[keywordMap[word]];
    }
  }

  // Fallback to a random general fact
  const keys = Object.keys(facts);
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  return facts[randomKey];
}
