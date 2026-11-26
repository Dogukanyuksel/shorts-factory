export type ChannelId = "physics" | "explainer";

export type PhysicsNiche =
  | "physics-ring"
  | "duel-balls"
  | "sorting-race"
  | "marble-drop"
  | "pendulum-wave"
  | "ball-grow"
  | "double-pendulum"
  | "gravity-orbit"
  | "maze-race"
  | "domino-chain"
  | "wave-interference"
  | "fourier-draw"
  | "pi-collisions"
  | "brachistochrone"
  | "langtons-ant"
  | "metronome-sync"
  | "monty-hall"
  | "gravity-compare"
  | "giant-vs-swarm"
  | "spin-illusion"
  | "doubling-ladder";

export type PhysicsJob = {
  id: string;
  channel: "physics";
  niche: PhysicsNiche;
  seed: number;
  seconds: number;
  hook: string;
  narration: string;
  title: string;
  description: string;
  tags: string[];
  categoryId: string;
};

export type ExplainerJob = {
  id: string;
  channel: "explainer";
  episode: string;
  title: string;
  description: string;
  tags: string[];
  categoryId: string;
};

export type PublishJob = PhysicsJob | ExplainerJob;

export const PHYSICS_ROTATION: PhysicsNiche[] = [
  "physics-ring",
  "duel-balls",
  "gravity-compare",
  "giant-vs-swarm",
  "pi-collisions",
  "brachistochrone",
  "sorting-race",
  "langtons-ant",
  "double-pendulum",
  "metronome-sync",
  "marble-drop",
  "monty-hall",
  "gravity-orbit",
  "pendulum-wave",
  "maze-race",
  "ball-grow",
  "domino-chain",
  "wave-interference",
  "fourier-draw",
];

/**
 * Kanal 1 (Kinetic Lab) için 12 FARKLI mekanikli YPP-dostu küratörlü katalog.
 * Ardışık iki video ASLA aynı simülasyon şablonunu tekrarlamaz.
 * Her videoda benzersiz İngilizce sesli bilim/matematik anlatımı vardır.
 */
export const CURATED_PHYSICS_JOBS: PhysicsJob[] = [
  {
    id: "physics-ring-seed101",
    channel: "physics",
    niche: "physics-ring",
    seed: 101,
    seconds: 24,
    hook: "CAN IT SHATTER ALL 7 RINGS?",
    narration:
      "Each spinning ring rotates in the opposite direction, and every collision transfers kinetic energy back into the ball. Watch how fast it accelerates once the inner barriers break.",
    title: "Can 1 Ball Shatter 7 Counter-Rotating Rings? #shorts",
    description:
      "A deterministic 2D rigid-body physics simulation where a single elastic sphere bounces inside seven counter-rotating rings. Each bounce triggers a pentatonic note and builds momentum toward the final escape.\n\n#shorts #physics #simulation #science",
    tags: ["physics simulation", "satisfying physics", "kinetic energy", "shorts", "science"],
    categoryId: "28",
  },
  {
    id: "duel-balls-seed102",
    channel: "physics",
    niche: "duel-balls",
    seed: 102,
    seconds: 24,
    hook: "CYAN VS MAGENTA: WHO SURVIVES?",
    narration:
      "Two elastic spheres start with identical energy inside a shrinking arena. Tiny differences in their launch angles compound into complete chaos in under thirty seconds. Pick your color.",
    title: "Cyan vs Magenta: Chaos Theory Arena Duel #shorts",
    description:
      "Even with nearly identical starting speeds, sensitive dependence on initial conditions sends these two simulated spheres on completely different paths. Watch who takes the final point.\n\n#shorts #chaos #physics #simulation",
    tags: ["chaos theory", "physics duel", "ball simulation", "shorts", "science"],
    categoryId: "28",
  },
  {
    id: "gravity-compare-seed201",
    channel: "physics",
    niche: "gravity-compare",
    seed: 201,
    seconds: 24,
    hook: "MOON VS EARTH VS JUPITER",
    narration:
      "Drop three identical balls from the same height on the Moon, Earth, and Jupiter. On Jupiter, gravity is over fifteen times stronger than on the Moon — watch how fast the bounce counter explodes.",
    title: "Dropping a Ball on the Moon vs Earth vs Jupiter #shorts",
    description:
      "3-way split-screen gravity comparison: Moon (1.6 m/s²) vs Earth (9.8 m/s²) vs Jupiter (24.8 m/s²). Watch all three simultaneously!\n\n#shorts #space #gravity #physics #nasa",
    tags: ["planet gravity", "moon vs earth vs jupiter", "physics simulation", "space", "shorts"],
    categoryId: "28",
  },
  {
    id: "giant-vs-swarm-seed202",
    channel: "physics",
    niche: "giant-vs-swarm",
    seed: 202,
    seconds: 24,
    hook: "1 GIANT BALL VS 100 TINY BALLS",
    narration:
      "One massive sphere enters a circular arena packed with a hundred tiny balls. Watch how momentum transfers from the heavy giant into the swarm, launching tiny particles at supersonic speeds.",
    title: "1 Giant Heavy Ball vs 100 Tiny Balls (Physics Simulation) #shorts",
    description:
      "Elastic momentum transfer in a 2D circular arena: 1 heavy sphere (45x mass) colliding with 100 lightweight particles.\n\n#shorts #physics #simulation #satisfying #science",
    tags: ["physics simulation", "momentum transfer", "elastic collision", "satisfying", "shorts"],
    categoryId: "28",
  },
  {
    id: "pi-collisions-seed113",
    channel: "physics",
    niche: "pi-collisions",
    seed: 113,
    seconds: 24,
    hook: "COUNT THE CLACKS...",
    narration:
      "These two blocks only bounce, yet the number of collisions spells out the digits of pi. Make the big block a hundred times heavier, and you unlock one more digit.",
    title: "These Two Blocks Calculate Pi Just By Colliding #shorts",
    description:
      "Galperin's billiard theorem in action: two elastic blocks colliding against a wall naturally compute 31, 314, and 3,141 — the exact digits of Pi.\n\n#shorts #pi #math #physics",
    tags: ["pi collisions", "mathematics", "physics simulation", "science", "shorts"],
    categoryId: "28",
  },
  {
    id: "brachistochrone-seed114",
    channel: "physics",
    niche: "brachistochrone",
    seed: 114,
    seconds: 24,
    hook: "SHORTEST ISN'T FASTEST",
    narration:
      "Four balls, four ramps, and the straight line is the slowest. The curve called a cycloid wins every time because it trades distance for early speed.",
    title: "The Straight Line LOSES This Gravity Race #shorts",
    description:
      "The Brachistochrone problem proved that the shortest path between two points is NOT the fastest under gravity. Watch the cycloid curve overtake the straight ramp every single time.\n\n#shorts #brachistochrone #physics #math",
    tags: ["brachistochrone", "cycloid", "gravity race", "physics", "shorts"],
    categoryId: "28",
  },
  {
    id: "langtons-ant-seed115",
    channel: "physics",
    niche: "langtons-ant",
    seed: 115,
    seconds: 24,
    hook: "WAIT FOR STEP 10,000...",
    narration:
      "This ant follows just two rules: turn right on white, left on black. For ten thousand steps it looks like chaos, then it suddenly builds a perfect highway, and no one fully knows why.",
    title: "This Ant Goes Crazy… Then Builds a Highway #shorts",
    description:
      "Langton's Ant is a two-rule cellular automaton that wanders chaotically for 10,000 steps before spontaneously locking into a repeating 104-step diagonal highway.\n\n#shorts #langtonsant #chaos #computerscience",
    tags: ["langtons ant", "cellular automata", "chaos theory", "math", "shorts"],
    categoryId: "28",
  },
  {
    id: "metronome-sync-seed116",
    channel: "physics",
    niche: "metronome-sync",
    seed: 116,
    seconds: 24,
    hook: "THEY SYNC THEMSELVES...",
    narration:
      "Thirty-two metronomes start completely out of step. The board they sit on moves just slightly, and those tiny pushes pull every beat into perfect sync.",
    title: "32 Metronomes Start in Chaos… Then This Happens #shorts",
    description:
      "Coupled Kuramoto oscillators on a freely sliding board transfer microscopic momentum pulses until 32 random rhythms lock into 100% unison.\n\n#shorts #metronomes #physics #synchronization",
    tags: ["metronome sync", "kuramoto model", "physics", "satisfying", "shorts"],
    categoryId: "28",
  },
  {
    id: "monty-hall-seed117",
    channel: "physics",
    niche: "monty-hall",
    seed: 117,
    seconds: 24,
    hook: "SWITCH OR STAY?",
    narration:
      "Three doors, one prize, and the host opens a losing door. Switching wins two out of three times, and these thousand simulated games prove it.",
    title: "1,000 Games Prove Your Brain Is Wrong (Monty Hall) #shorts",
    description:
      "The most counterintuitive probability paradox in math: watch 1,000 live simulated games prove why switching doors doubles your odds from 33.3% to 66.7%.\n\n#shorts #montyhall #probability #math",
    tags: ["monty hall problem", "probability", "math paradox", "statistics", "shorts"],
    categoryId: "28",
  },
  {
    id: "sorting-race-seed103",
    channel: "physics",
    niche: "sorting-race",
    seed: 103,
    seconds: 24,
    hook: "WHICH ALGORITHM WINS THE RACE?",
    narration:
      "Every time you search your phone or stream a video, sorting algorithms run in the background. Watch how a divide-and-conquer algorithm crushes brute force in real time.",
    title: "Sorting Algorithms Racing Side by Side #shorts",
    description:
      "Visualizing time complexity in action: watch classic computer science sorting algorithms compete on the exact same shuffled array, with every comparison mapped to pitch.\n\n#shorts #computerscience #algorithms #coding",
    tags: ["sorting algorithm", "computer science", "visualization", "coding", "shorts"],
    categoryId: "28",
  },
  {
    id: "double-pendulum-seed104",
    channel: "physics",
    niche: "double-pendulum",
    seed: 104,
    seconds: 24,
    hook: "0.001 RADIANS APART — WATCH CHAOS",
    narration:
      "Both double pendulums are released from almost the exact same angle — separated by just one thousandth of a radian. For a few seconds they look identical, and then chaos theory tears them completely apart.",
    title: "Released 0.001 Radians Apart — Chaos Theory in Action #shorts",
    description:
      "A classic demonstration of deterministic chaos: two double pendulums with nearly identical initial angles trace matching arcs before diverging exponentially into completely unrelated trajectories.\n\n#shorts #chaostheory #physics #math",
    tags: ["double pendulum", "chaos theory", "butterfly effect", "physics", "shorts"],
    categoryId: "28",
  },
  {
    id: "marble-drop-seed105",
    channel: "physics",
    niche: "marble-drop",
    seed: 105,
    seconds: 24,
    hook: "WHICH MARBLE WINS THE GAUNTLET?",
    narration:
      "Gravity pulls every marble with the exact same acceleration, yet peg collisions turn a simple drop into a Galton-board probability race. Watch which lane breaks away at the bottom.",
    title: "Gravity Marble Gauntlet: Probability in Motion #shorts",
    description:
      "Inspired by the Galton board and real-world collision mechanics, these marbles navigate a multi-stage obstacle gauntlet under uniform gravity. Every peg bounce shifts the odds.\n\n#shorts #marblerace #physics #probability",
    tags: ["marble race", "galton board", "gravity simulation", "physics", "shorts"],
    categoryId: "28",
  },
  {
    id: "gravity-orbit-seed106",
    channel: "physics",
    niche: "gravity-orbit",
    seed: 106,
    seconds: 24,
    hook: "THE UNSOLVABLE 3-BODY PROBLEM",
    narration:
      "Two planets orbiting each other are easy to predict forever. Add a third body and Newton's gravity becomes mathematically unsolvable — creating wild gravitational slingshots that never repeat.",
    title: "The Unsolvable 3-Body Gravity Problem Visualized #shorts",
    description:
      "Three glowing masses interacting solely through Newton's law of universal gravitation. Watch how close encounters trigger dramatic gravitational slingshots across space.\n\n#shorts #threebodyproblem #space #physics",
    tags: ["three body problem", "orbital mechanics", "gravity", "astronomy", "shorts"],
    categoryId: "28",
  },
  {
    id: "pendulum-wave-seed107",
    channel: "physics",
    niche: "pendulum-wave",
    seed: 107,
    seconds: 24,
    hook: "WAIT FOR THE PERFECT SYNC...",
    narration:
      "Fifteen uncoupled pendulums with slightly different lengths create traveling waves, double helices, and total chaos — before snapping back into perfect harmony at the end.",
    title: "15 Pendulums Go From Chaos to Perfect Sync #shorts",
    description:
      "A pendulum wave happens when each pendulum completes one extra oscillation per cycle compared to its neighbor. Watch phase alignment emerge out of apparent randomness.\n\n#shorts #pendulum #physics #waves",
    tags: ["pendulum wave", "harmonic motion", "physics", "satisfying", "shorts"],
    categoryId: "28",
  },
  {
    id: "maze-race-seed108",
    channel: "physics",
    niche: "maze-race",
    seed: 108,
    seconds: 24,
    hook: "BLIND SEARCH VS A* AI PATHFINDING",
    narration:
      "On the left, Breadth-First Search blindly floods every single corridor. On the right, the A-star heuristic algorithm estimates distance to the goal — the exact math behind GPS navigation and game AI.",
    title: "BFS Flood Fill vs A* Pathfinding AI Maze Race #shorts",
    description:
      "A side-by-side computer science race comparing blind Breadth-First Search against A* heuristic pathfinding on the exact same randomly generated maze.\n\n#shorts #algorithms #pathfinding #computerscience",
    tags: ["a star algorithm", "pathfinding", "maze solver", "computer science", "shorts"],
    categoryId: "28",
  },
  {
    id: "ball-grow-seed109",
    channel: "physics",
    niche: "ball-grow",
    seed: 109,
    seconds: 24,
    hook: "IT GROWS ON EVERY SINGLE BOUNCE",
    narration:
      "Every wall collision expands the ball's radius by a fixed percentage. That turns simple bouncing into exponential growth until the sphere completely fills the circle.",
    title: "Exponential Growth: Ball Expands Every Bounce #shorts",
    description:
      "Exponential growth looks slow at first and then happens all at once. Watch how a fixed radius gain per bounce accelerates the collision frequency until there is zero room left.\n\n#shorts #math #physics #exponential",
    tags: ["exponential growth", "math visualization", "physics simulation", "shorts"],
    categoryId: "28",
  },
  {
    id: "domino-chain-seed110",
    channel: "physics",
    niche: "domino-chain",
    seed: 110,
    seconds: 24,
    hook: "1 TINY DOMINO TOPPLES A GIANT",
    narration:
      "A single domino can knock over another domino one and a half times its own size. That geometric energy amplification means a chain of just twenty-nine dominoes could topple the Empire State Building.",
    title: "Exponential Domino Chain: Tiny Push, Giant Crash #shorts",
    description:
      "Each domino stores gravitational potential energy waiting to be released by a tiny nudge. Watch geometric scaling amplify a whisper-light tap into a massive final impact.\n\n#shorts #physics #domino #energy",
    tags: ["domino effect", "exponential scaling", "potential energy", "physics", "shorts"],
    categoryId: "28",
  },
  {
    id: "wave-interference-seed111",
    channel: "physics",
    niche: "wave-interference",
    seed: 111,
    seconds: 24,
    hook: "WHEN TWO WAVES CANCEL EACH OTHER",
    narration:
      "When two wave crests meet, they amplify into a glowing bright peak. When a crest meets a trough, they erase each other completely — the exact same physics behind Wi-Fi dead zones and noise-canceling headphones.",
    title: "Wave Interference: How Two Waves Create Silence & Light #shorts",
    description:
      "Visualizing constructive and destructive wave interference from two coherent oscillators. Watch bright antinodes and dark nodal lines shift dynamically as frequency sweeps.\n\n#shorts #waves #physics #optics",
    tags: ["wave interference", "physics", "constructive interference", "science", "shorts"],
    categoryId: "28",
  },
  {
    id: "fourier-draw-seed112",
    channel: "physics",
    niche: "fourier-draw",
    seed: 112,
    seconds: 24,
    hook: "DRAWING ANY SHAPE USING ONLY CIRCLES",
    narration:
      "Joseph Fourier proved that almost any shape or sound wave in the universe can be built by stacking rotating circles at different speeds. Watch these harmonic epicycles trace pure geometry out of thin air.",
    title: "Fourier Transform: Drawing Complex Shapes With Circles #shorts",
    description:
      "A real-time visualization of Fourier epicycles — rotating harmonic vectors summed tip-to-tail to trace intricate geometric paths. The mathematical backbone of MP3, JPEG, and 5G.\n\n#shorts #fourier #math #visualization",
    tags: ["fourier transform", "epicycles", "mathematics", "visual math", "shorts"],
    categoryId: "28",
  },
];

/**
 * Kanal 2 (Clear Mechanics) — 30 hazır İngilizce mühendislik & bilim açıklayıcı bölüm!
 * Günde 2 video = 15 gün kesintisiz, günde 1 video = 1 ay kesintisiz özgün YPP içeriği.
 */
export const EXPLAINER_JOBS: ExplainerJob[] = [
  {
    id: "explainer-pin-tumbler-lock",
    channel: "explainer",
    episode: "pin-tumbler-lock",
    title: "Why Does ONLY Your Key Open Your Door? #shorts",
    description:
      "Inside every standard door lock are spring-loaded driver pins and key pins split at different heights. Only the exact cuts on your key align every split along the shear line so the cylinder can turn.\n\n#shorts #howitworks #engineering #science",
    tags: ["how locks work", "pin tumbler lock", "engineering", "how it works", "shorts"],
    categoryId: "27",
  },
  {
    id: "explainer-airplane-wing",
    channel: "explainer",
    episode: "airplane-wing",
    title: "How Does 400 Tons of Metal Float in Thin Air? #shorts",
    description:
      "An airplane wing's curved airfoil shape and angle of attack accelerate airflow over the top and deflect air downward, creating a pressure difference that generates massive upward lift.\n\n#shorts #aviation #howitworks #engineering",
    tags: ["how airplanes fly", "aerodynamics", "lift", "engineering", "shorts"],
    categoryId: "27",
  },
  {
    id: "explainer-tape-measure-hook",
    channel: "explainer",
    episode: "tape-measure-hook",
    title: "Your Tape Measure's Loose Hook Isn't Broken #shorts",
    description:
      "That wobbly metal hook slides by exactly its own thickness so both inside push measurements and outside pull measurements stay 100% accurate. Bonus: the slot grips a nail head!\n\n#shorts #engineering #howitworks #tools",
    tags: ["tape measure", "engineering design", "how it works", "everyday genius", "shorts"],
    categoryId: "27",
  },
  {
    id: "explainer-airplane-vacuum-toilet",
    channel: "explainer",
    episode: "airplane-vacuum-toilet",
    title: "Why Airplane Toilets Are So LOUD #shorts",
    description:
      "Airplane toilets don't flush with heavy water tanks — they use a low-pressure vacuum tank under the floor. When the valve snaps open, pressurized cabin air rushes in with a roar.\n\n#shorts #aviation #howitworks #engineering",
    tags: ["airplane toilet", "aviation engineering", "vacuum physics", "how it works", "shorts"],
    categoryId: "27",
  },
  {
    id: "explainer-earth-to-marble",
    channel: "explainer",
    episode: "earth-to-marble",
    title: "What If Earth Were Compressed to the Size of a Marble? #shorts",
    description:
      "Crush Earth's entire 6-septillion-kilogram mass down to 18 millimeters wide and you cross the Schwarzschild radius — turning our planet into a black hole while the Moon keeps orbiting normally.\n\n#shorts #nasa #space #blackhole #physics",
    tags: ["black hole", "schwarzschild radius", "nasa", "space physics", "shorts"],
    categoryId: "27",
  },
  {
    id: "explainer-sun-black-hole",
    channel: "explainer",
    episode: "sun-black-hole",
    title: "If the Sun Turned Into a Black Hole, Earth Wouldn't Get Sucked In #shorts",
    description:
      "Black holes aren't cosmic vacuum cleaners: if the Sun became a black hole of the exact same mass, Earth's orbit wouldn't change at all — we'd just freeze in total darkness.\n\n#shorts #space #blackhole #nasa #science",
    tags: ["sun black hole", "orbital mechanics", "space myth", "astronomy", "shorts"],
    categoryId: "27",
  },
  {
    id: "explainer-light-speed-mars",
    channel: "explainer",
    episode: "light-speed-mars",
    title: "How Painfully Slow the Speed of Light Looks in Space #shorts",
    description:
      "At 299,792 kilometers per second, light circles Earth 7.5 times every second — yet it takes 1.3 seconds to reach the Moon and over 12 minutes to crawl to Mars.\n\n#shorts #speedoflight #space #nasa #physics",
    tags: ["speed of light", "space scale", "mars", "nasa", "shorts"],
    categoryId: "27",
  },
  {
    id: "explainer-key-fob-rolling-code",
    channel: "explainer",
    episode: "key-fob-rolling-code",
    title: "Why Thieves Can't Just Record Your Car Key #shorts",
    description:
      "Modern car keys use rolling-code cryptography: your fob and car share a secret counter so every unlock generates a one-time code, instantly rejecting replayed recordings.\n\n#shorts #cars #cybersecurity #howitworks",
    tags: ["rolling code", "car key", "cryptography", "automotive engineering", "shorts"],
    categoryId: "27",
  },
  {
    id: "explainer-tuned-mass-damper",
    channel: "explainer",
    episode: "tuned-mass-damper",
    title: "The 660-Ton Ball Keeping This Skyscraper Standing #shorts",
    description:
      "Suspended near the top of Taipei 101 is a 660-ton steel tuned mass damper. During typhoons and earthquakes, it swings out of phase with the tower while hydraulic dampers turn sway into heat.\n\n#shorts #skyscrapers #civilengineering #howitworks",
    tags: ["tuned mass damper", "taipei 101", "civil engineering", "physics", "shorts"],
    categoryId: "27",
  },
  {
    id: "explainer-pop-up-toaster",
    channel: "explainer",
    episode: "pop-up-toaster",
    title: "How Your Toaster Knows When to Pop #shorts",
    description:
      "Pushing the lever loads a spring while an electromagnet holds the bread down as nichrome wires glow red. When the circuit timer cuts power to the magnet, the spring launches your toast! (Older models used a bimetallic strip.)\n\n#shorts #toaster #engineering #howitworks",
    tags: ["how toasters work", "electromagnet", "everyday engineering", "how it works", "shorts"],
    categoryId: "27",
  },
  {
    id: "explainer-noise-canceling",
    channel: "explainer",
    episode: "noise-canceling",
    title: "Noise-Canceling Headphones Don't Block Sound — They Erase It #shorts",
    description:
      "Active noise cancellation uses tiny microphones to measure incoming sound waves and instantly plays an inverted anti-noise wave. When peak meets trough, destructive interference cancels the sound.\n\n#shorts #physics #howitworks #technology",
    tags: ["noise canceling", "sound waves", "destructive interference", "tech explained", "shorts"],
    categoryId: "27",
  },
  {
    id: "explainer-car-differential",
    channel: "explainer",
    episode: "car-differential",
    title: "Why Don't Your Car's Wheels Skid Every Time You Turn? #shorts",
    description:
      "During a turn, your outer wheels must travel farther than your inner wheels. The mechanical differential uses spider gears to split engine torque while letting each wheel spin at its own speed.\n\n#shorts #cars #engineering #howitworks",
    tags: ["car differential", "mechanical engineering", "how cars work", "gears", "shorts"],
    categoryId: "27",
  },
  {
    id: "explainer-touchscreen",
    channel: "explainer",
    episode: "touchscreen",
    title: "How Your Phone Screen Senses Electricity in Your Finger #shorts",
    description:
      "Capacitive touchscreens hold a tiny invisible electrostatic grid across the glass. Because your fingertip conducts electricity, touching the glass alters local capacitance at exact X-Y coordinates.\n\n#shorts #technology #howitworks #science",
    tags: ["how touchscreens work", "capacitive touch", "smartphones", "electronics", "shorts"],
    categoryId: "27",
  },
  {
    id: "explainer-submarine",
    channel: "explainer",
    episode: "submarine",
    title: "How a 10,000-Ton Submarine Sinks and Rises on Command #shorts",
    description:
      "Submarines control buoyancy using ballast tanks. Flooding the tanks with seawater makes the sub denser than water to dive; blasting compressed air back in pushes water out to surface.\n\n#shorts #submarine #physics #engineering",
    tags: ["how submarines work", "buoyancy", "ballast tanks", "engineering", "shorts"],
    categoryId: "27",
  },
  {
    id: "explainer-qr-code",
    channel: "explainer",
    episode: "qr-code",
    title: "You Can Destroy 30% of a QR Code and It Still Scans #shorts",
    description:
      "QR codes use Reed-Solomon error correction math to store redundant data across the grid. Even if coffee spills or scratches wipe out nearly a third of the pattern, your camera reconstructs the link.\n\n#shorts #qrcode #computerscience #howitworks",
    tags: ["how qr codes work", "reed solomon", "computer science", "tech explained", "shorts"],
    categoryId: "27",
  },
  {
    id: "explainer-mechanical-watch",
    channel: "explainer",
    episode: "mechanical-watch",
    title: "No Battery, No Chip — How a Mechanical Watch Tracks Every Second #shorts",
    description:
      "A coiled mainspring stores mechanical energy while the balance wheel and escapement release it in precise, rhythmic ticks — regulating gears that sweep the seconds, minutes, and hours.\n\n#shorts #watches #engineering #howitworks",
    tags: ["mechanical watch", "escapement", "horology", "engineering", "shorts"],
    categoryId: "27",
  },
  {
    id: "explainer-wifi-walls",
    channel: "explainer",
    episode: "wifi-walls",
    title: "Why Can Wi-Fi Pass Through Walls When Light Can't? #shorts",
    description:
      "Visible light and Wi-Fi are both electromagnetic waves, but Wi-Fi wavelengths are millions of times longer. Drywall absorbs short visible wavelengths while letting longer 2.4 GHz radio waves pass through.\n\n#shorts #wifi #physics #howitworks",
    tags: ["how wifi works", "electromagnetic spectrum", "radio waves", "physics", "shorts"],
    categoryId: "27",
  },
  {
    id: "explainer-bulletproof-vest",
    channel: "explainer",
    episode: "bulletproof-vest",
    title: "How Fabric Thinner Than a Book Stops a Bullet #shorts",
    description:
      "Kevlar fibers are woven into a tight molecular net five times stronger than steel by weight. On impact, the weave stretches and spreads the bullet's kinetic energy across the entire panel.\n\n#shorts #kevlar #engineering #howitworks",
    tags: ["bulletproof vest", "kevlar", "materials science", "engineering", "shorts"],
    categoryId: "27",
  },
  // --- 20 Yeni Mühendislik & Bilim Bölümü (#11 - #30) ---
  {
    id: "explainer-jet-engine",
    channel: "explainer",
    episode: "jet-engine",
    title: "How a Jet Engine Generates 100,000 Pounds of Thrust #shorts",
    description:
      "Suck, squeeze, bang, blow: inside a modern turbofan jet engine, giant intake blades compress incoming air, ignite fuel at over 1,500°C, and blast exhaust backward to launch airliners across continents.\n\n#shorts #aviation #jetengine #engineering",
    tags: ["how jet engines work", "turbofan", "aerospace engineering", "aviation", "shorts"],
    categoryId: "27",
  },
  {
    id: "explainer-mri-scanner",
    channel: "explainer",
    episode: "mri-scanner",
    title: "How an MRI Sees Inside Your Body Without X-Rays #shorts",
    description:
      "An MRI uses superconducting magnets 60,000 times stronger than Earth's magnetic field to align hydrogen protons in your body's water, then listens to the radio echoes they emit as they snap back.\n\n#shorts #mri #medicaltech #science",
    tags: ["how mri works", "medical engineering", "physics", "science explained", "shorts"],
    categoryId: "27",
  },
  {
    id: "explainer-gps-satellites",
    channel: "explainer",
    episode: "gps-satellites",
    title: "How GPS Pinpoints You Within 3 Meters From Space #shorts",
    description:
      "GPS satellites broadcast ultra-precise atomic clock timestamps at the speed of light. By measuring tiny nanosecond arrival delays from at least four satellites, your phone trilaterates your exact spot on Earth.\n\n#shorts #gps #space #engineering",
    tags: ["how gps works", "satellites", "trilateration", "technology explained", "shorts"],
    categoryId: "27",
  },
  {
    id: "explainer-lithium-battery",
    channel: "explainer",
    episode: "lithium-battery",
    title: "What Actually Happens Inside Your Phone Battery? #shorts",
    description:
      "When your phone runs, lithium ions shuttle through an electrolyte separator from anode to cathode while forcing electrons through your phone's circuit. Plugging in the charger pushes them right back.\n\n#shorts #battery #technology #engineering",
    tags: ["lithium ion battery", "how batteries work", "chemistry", "tech explained", "shorts"],
    categoryId: "27",
  },
  {
    id: "explainer-airbag",
    channel: "explainer",
    episode: "airbag",
    title: "How a Car Airbag Inflates in Just 30 Milliseconds #shorts",
    description:
      "Faster than the blink of an eye, an accelerometer detects violent deceleration, fires an igniter, and triggers a controlled chemical reaction that floods the cushion with nitrogen gas before impact.\n\n#shorts #airbag #cars #engineering",
    tags: ["how airbags work", "car safety", "automotive engineering", "science", "shorts"],
    categoryId: "27",
  },
  {
    id: "explainer-fiber-optic",
    channel: "explainer",
    episode: "fiber-optic",
    title: "How Fiber Optic Cables Carry the Internet at Light Speed #shorts",
    description:
      "Instead of electricity in copper, fiber optics fire billions of laser pulses per second through hair-thin glass strands. Total internal reflection traps the light even around bends across entire oceans.\n\n#shorts #fiberoptic #internet #physics",
    tags: ["fiber optic", "total internal reflection", "internet", "optics", "shorts"],
    categoryId: "27",
  },
  {
    id: "explainer-hydraulic-press",
    channel: "explainer",
    episode: "hydraulic-press",
    title: "How a Hydraulic Press Crushes Solid Steel Using Liquid #shorts",
    description:
      "Because liquid is virtually incompressible, Pascal's Law multiplies force proportionally to piston area: a small push on a narrow piston becomes hundreds of tons of crushing power on a wide piston.\n\n#shorts #hydraulicpress #physics #engineering",
    tags: ["hydraulic press", "pascals law", "mechanical engineering", "physics", "shorts"],
    categoryId: "27",
  },
  {
    id: "explainer-rocket-nozzle",
    channel: "explainer",
    episode: "rocket-nozzle",
    title: "Why Every Rocket Nozzle Is Shaped Like a Bell #shorts",
    description:
      "A De Laval nozzle squeezes hot combustion gas to Mach 1 at its narrow throat, then expands it through a sculpted bell — turning chaotic heat pressure into a razor-straight supersonic exhaust jet.\n\n#shorts #rockets #space #aerospace",
    tags: ["rocket nozzle", "de laval nozzle", "aerospace", "rocket science", "shorts"],
    categoryId: "27",
  },
  {
    id: "explainer-automatic-transmission",
    channel: "explainer",
    episode: "automatic-transmission",
    title: "How an Automatic Transmission Shifts Gears Without a Clutch #shorts",
    description:
      "Inside an automatic gearbox sits a planetary gearset: a central sun gear, orbiting planet gears, and an outer ring gear. Locking different members changes speed and torque ratios seamlessly.\n\n#shorts #cars #transmission #engineering",
    tags: ["automatic transmission", "planetary gears", "how cars work", "engineering", "shorts"],
    categoryId: "27",
  },
  {
    id: "explainer-solar-panel",
    channel: "explainer",
    episode: "solar-panel",
    title: "How Solar Panels Turn Sunlight Directly Into Electricity #shorts",
    description:
      "When photons from the sun hit a silicon P-N junction, they knock electrons loose. The cell's built-in electric field sweeps those electrons in one direction, creating clean direct current with zero moving parts.\n\n#shorts #solar #renewableenergy #physics",
    tags: ["how solar panels work", "photovoltaic", "renewable energy", "physics", "shorts"],
    categoryId: "27",
  },
  {
    id: "explainer-microwave-oven",
    channel: "explainer",
    episode: "microwave-oven",
    title: "Why Microwaves Heat Your Food While the Plate Stays Cool #shorts",
    description:
      "A magnetron floods the cavity with 2.45 GHz electromagnetic waves that flip polar water molecules billions of times per second, generating friction heat directly inside the food.\n\n#shorts #microwave #physics #science",
    tags: ["how microwaves work", "magnetron", "physics", "everyday science", "shorts"],
    categoryId: "27",
  },
  {
    id: "explainer-seatbelt-lock",
    channel: "explainer",
    episode: "seatbelt-lock",
    title: "How Your Seatbelt Moves Freely Yet Locks Instantly in a Crash #shorts",
    description:
      "Pull gently and the retractor spool spins smoothly. Slam the brakes and a weighted pendulum swings forward, snapping a steel pawl into ratchet teeth to lock the belt solid in milliseconds.\n\n#shorts #seatbelt #engineering #cars",
    tags: ["how seatbelts work", "car safety", "mechanical engineering", "how it works", "shorts"],
    categoryId: "27",
  },
  {
    id: "explainer-disc-brake",
    channel: "explainer",
    episode: "disc-brake",
    title: "How Disc Brakes Stop a 2-Ton Car in Seconds #shorts",
    description:
      "Pressing the pedal pressurizes brake fluid, forcing caliper pistons to clamp high-friction pads against a spinning steel rotor — converting deadly kinetic energy directly into thermal heat.\n\n#shorts #brakes #cars #engineering",
    tags: ["disc brakes", "automotive engineering", "friction", "how cars work", "shorts"],
    categoryId: "27",
  },
  {
    id: "explainer-electric-motor",
    channel: "explainer",
    episode: "electric-motor",
    title: "How Electric Motors Deliver Instant 100% Torque #shorts",
    description:
      "By rapidly flipping the polarity of copper stator electromagnets around a permanent-magnet rotor, an electric motor pulls and pushes the shaft in a continuous circle with over 90% efficiency.\n\n#shorts #electricmotor #ev #engineering",
    tags: ["how electric motors work", "electromagnetism", "ev tech", "engineering", "shorts"],
    categoryId: "27",
  },
  {
    id: "explainer-barcode-scanner",
    channel: "explainer",
    episode: "barcode-scanner",
    title: "How a Barcode Scanner Reads Stripes in a Split Second #shorts",
    description:
      "A sweeping red laser hits white bars that reflect light back and black bars that absorb it. A photodiode converts that flashing reflection pattern into crisp binary 1s and 0s.\n\n#shorts #barcode #technology #howitworks",
    tags: ["how barcode scanners work", "laser", "binary", "tech explained", "shorts"],
    categoryId: "27",
  },
  {
    id: "explainer-induction-cooktop",
    channel: "explainer",
    episode: "induction-cooktop",
    title: "How an Induction Stove Boils Water While Staying Cool to Touch #shorts",
    description:
      "A hidden copper coil creates a rapidly oscillating magnetic field that passes straight through the glass and induces swirling eddy currents inside the iron pan — turning the pan itself into the heater.\n\n#shorts #induction #physics #engineering",
    tags: ["induction cooktop", "eddy currents", "electromagnetism", "physics", "shorts"],
    categoryId: "27",
  },
  {
    id: "explainer-suspension-bridge",
    channel: "explainer",
    episode: "suspension-bridge",
    title: "How Suspension Bridges Hold Thousands of Tons on Cables #shorts",
    description:
      "Vertical suspender ropes transfer roadway weight into colossal parabolic main cables under pure tension, channeling millions of pounds safely down the towers in compression and into deep bedrock anchorages.\n\n#shorts #bridges #civilengineering #howitworks",
    tags: ["suspension bridge", "civil engineering", "tension and compression", "architecture", "shorts"],
    categoryId: "27",
  },
  {
    id: "explainer-maglev-train",
    channel: "explainer",
    episode: "maglev-train",
    title: "How a Maglev Train Flies at 600 km/h With Zero Wheels #shorts",
    description:
      "Superconducting magnets levitate the train centimeters above the track to eliminate rolling friction completely, while alternating magnetic poles in the guideway pull and push it at airplane speeds.\n\n#shorts #maglev #trains #engineering",
    tags: ["maglev train", "magnetic levitation", "superconductors", "engineering", "shorts"],
    categoryId: "27",
  },
  {
    id: "explainer-heart-pacemaker",
    channel: "explainer",
    episode: "heart-pacemaker",
    title: "How a Tiny Pacemaker Keeps a Heart Beating for Years #shorts",
    description:
      "A microchip and battery smaller than a matchbox listen to your heart's natural electrical ECG wave every millisecond. The instant a beat is missed, it fires a gentle micro-pulse to keep blood flowing.\n\n#shorts #pacemaker #biomedical #science",
    tags: ["heart pacemaker", "biomedical engineering", "ecg", "medical science", "shorts"],
    categoryId: "27",
  },
  {
    id: "explainer-lidar-sensor",
    channel: "explainer",
    episode: "lidar-sensor",
    title: "How Self-Driving Cars Map the World in 3D With Lasers #shorts",
    description:
      "LiDAR spins and fires millions of invisible infrared laser pulses every second. By timing each reflection down to the nanosecond, the car builds a centimeter-accurate live 3D point cloud.\n\n#shorts #lidar #selfdriving #technology",
    tags: ["how lidar works", "self driving cars", "autonomous vehicles", "tech explained", "shorts"],
    categoryId: "27",
  },
];

const INFINITE_ANGLES: Record<
  PhysicsNiche,
  { hooks: string[]; narrations: string[]; titlePrefix: string; topic: string }
> = {
  "physics-ring": {
    hooks: ["7 RINGS VS GRAVITY", "ENERGY TRANSFER TEST", "CAN IT BREAK RING 7?"],
    narrations: [
      "Watch how rotational timing and elastic bounces combine to break through seven nested barriers.",
      "Every collision boosts speed slightly — notice how quickly the final three rings shatter.",
    ],
    titlePrefix: "7-Ring Physics Escape Simulation",
    topic: "elastic collisions and rotational timing",
  },
  "duel-balls": {
    hooks: ["CHAOS DUEL SIMULATION", "WHO TAKES THE ARENA?", "TWO BALLS, ONE WINNER"],
    narrations: [
      "Two simulated spheres with identical starting energy collide until only one claims the arena.",
      "Tiny angle differences create completely unpredictable trajectories in this 2D collision duel.",
    ],
    titlePrefix: "2D Elastic Collision Duel",
    topic: "conservation of momentum and chaos theory",
  },
  "sorting-race": {
    hooks: ["ALGORITHM SPEED TEST", "WHICH SORT WINS?", "LIVE CODE RACE"],
    narrations: [
      "Watch classic sorting algorithms race on a brand-new shuffled dataset in real time.",
      "Every comparison plays a musical tone so you can literally hear time complexity in action.",
    ],
    titlePrefix: "Sorting Algorithm Speed Race",
    topic: "computer science time complexity",
  },
  "marble-drop": {
    hooks: ["GRAVITY GAUNTLET RACE", "PROBABILITY IN MOTION", "PICK YOUR WINNING LANE"],
    narrations: [
      "Uniform gravity meets hundreds of peg collisions — pick a color and see if probability favors it.",
      "Just like a Galton board, tiny early deflections decide the entire marble race.",
    ],
    titlePrefix: "Gravity Marble Gauntlet",
    topic: "gravity and collision probability",
  },
  "pendulum-wave": {
    hooks: ["HARMONIC WAVE SYNC", "CHAOS TO ORDER", "15 PENDULUMS IN SYNC"],
    narrations: [
      "Fifteen independent pendulums drift into waves, spirals, and chaos before realigning on cue.",
      "No strings connect them — pure harmonic phase math creates every pattern you see.",
    ],
    titlePrefix: "15-Pendulum Harmonic Wave",
    topic: "simple harmonic motion and wave phase",
  },
  "ball-grow": {
    hooks: ["EXPONENTIAL BOUNCE TEST", "GROWING EVERY HIT", "ZERO SPACE LEFT"],
    narrations: [
      "Each wall collision expands the sphere, shrinking its free path until bounces accelerate rapidly.",
      "Watch how steady per-bounce growth turns into rapid compression inside a fixed boundary.",
    ],
    titlePrefix: "Exponential Bounce Growth",
    topic: "exponential growth and collision frequency",
  },
  "double-pendulum": {
    hooks: ["BUTTERFLY EFFECT LIVE", "CHAOTIC DOUBLE PENDULUM", "0.001 RADIANS APART"],
    narrations: [
      "Two double pendulums start almost identically — watch sensitive dependence on initial conditions explode into chaos.",
      "Even with zero randomness, nonlinear gravity makes long-term prediction completely impossible.",
    ],
    titlePrefix: "Chaotic Double Pendulum Divergence",
    topic: "deterministic chaos and sensitive initial conditions",
  },
  "gravity-orbit": {
    hooks: ["3-BODY GRAVITY SLINGSHOT", "ORBITAL CHAOS LIVE", "NEWTON'S 3-BODY DANCE"],
    narrations: [
      "Three masses pull on each other under pure Newtonian gravity — watch how close passes launch violent slingshots.",
      "No closed-form formula can predict this three-body orbit over long spans of time.",
    ],
    titlePrefix: "3-Body Gravitational Dance",
    topic: "Newtonian orbital mechanics and gravitational slingshots",
  },
  "maze-race": {
    hooks: ["BFS VS A* AI RACE", "HEURISTIC AI VS FLOOD FILL", "WHICH SOLVER WINS?"],
    narrations: [
      "Watch how A-star's distance heuristic cuts straight through a brand-new maze while blind search explores every dead end.",
      "This exact pathfinding duel powers modern GPS routing, robotics, and video game navigation.",
    ],
    titlePrefix: "Maze Solver Race: BFS vs A* AI",
    topic: "heuristic pathfinding and graph search algorithms",
  },
  "domino-chain": {
    hooks: ["EXPONENTIAL DOMINO POWER", "TINY TAP, GIANT CRASH", "ENERGY AMPLIFICATION"],
    narrations: [
      "Each falling domino releases stored potential energy to topple a larger neighbor in a geometric cascade.",
      "Watch how a tiny initial tap scales up step by step into a colossal final impact.",
    ],
    titlePrefix: "Exponential Domino Cascade",
    topic: "gravitational potential energy and geometric amplification",
  },
  "wave-interference": {
    hooks: ["CONSTRUCTIVE VS DESTRUCTIVE", "DUAL WAVE INTERFERENCE", "RESONANCE PATTERNS LIVE"],
    narrations: [
      "Two synchronized wave emitters sweep frequency — creating glowing constructive peaks and silent destructive nodes.",
      "Watch wave superposition sculpt shifting geometric interference patterns in real time.",
    ],
    titlePrefix: "Dual-Source Wave Interference",
    topic: "wave superposition and resonance",
  },
  "fourier-draw": {
    hooks: ["FOURIER EPICYCLES ART", "PURE CIRCLES DRAW SHAPES", "HARMONIC MATH IN MOTION"],
    narrations: [
      "Stack rotating harmonic circles at different frequencies and their tip can trace almost any closed curve in mathematics.",
      "Watch Fourier synthesis build complex geometry out of nothing but spinning circles.",
    ],
    titlePrefix: "Fourier Epicycles Geometry",
    topic: "Fourier series and harmonic synthesis",
  },
  "pi-collisions": {
    hooks: ["COUNT THE CLACKS...", "BLOCKS CALCULATE PI", "3 → 31 → 314 → 3141"],
    narrations: [
      "Two elastic blocks colliding with a wall naturally count out the exact digits of Pi.",
      "Multiply the heavy block's mass by one hundred and you unlock another digit of Pi.",
    ],
    titlePrefix: "Two Blocks Calculating Pi",
    topic: "Galperin's billiard theorem and elastic collisions",
  },
  "brachistochrone": {
    hooks: ["SHORTEST ISN'T FASTEST", "STRAIGHT LINE LOSES", "CYCLOID VS STRAIGHT"],
    narrations: [
      "The shortest path between two points is not the fastest under gravity — watch the cycloid curve steal the lead.",
      "Trading distance for an early gravity boost lets the curved track crush the straight ramp.",
    ],
    titlePrefix: "Brachistochrone Gravity Race",
    topic: "calculus of variations and the cycloid curve",
  },
  "langtons-ant": {
    hooks: ["WAIT FOR STEP 10,000...", "TWO RULES → HIGHWAY", "CHAOS TO ORDER"],
    narrations: [
      "Two tiny rules create ten thousand steps of pure chaos — until an infinite diagonal highway suddenly emerges.",
      "Watch order spontaneously crystallize out of randomness in Langton's Ant.",
    ],
    titlePrefix: "Langton's Ant Chaos Highway",
    topic: "cellular automata and emergent complexity",
  },
  "metronome-sync": {
    hooks: ["THEY SYNC THEMSELVES...", "32 METRONOMES IN SYNC", "CHAOS TO UNISON"],
    narrations: [
      "Thirty-two random metronomes share tiny pushes through a sliding board until every beat snaps into perfect unison.",
      "Watch Kuramoto synchronization turn thirty-two chaotic rhythms into a single hypnotic pulse.",
    ],
    titlePrefix: "32 Metronomes Self-Sync",
    topic: "coupled oscillators and spontaneous synchronization",
  },
  "monty-hall": {
    hooks: ["SWITCH OR STAY?", "1,000 GAMES PROVE IT", "33% VS 66.7%"],
    narrations: [
      "One thousand simulated games settle the Monty Hall debate once and for all — switching doors doubles your odds.",
      "Watch the live win bars lock onto 33 percent for staying versus 67 percent for switching.",
    ],
    titlePrefix: "Monty Hall 1,000-Game Proof",
    topic: "conditional probability and the Monty Hall paradox",
  },
  "gravity-compare": {
    hooks: ["MOON VS EARTH VS JUPITER", "3 PLANETS · 1 DROP", "JUPITER GRAVITY IS INSANE"],
    narrations: [
      "Watch three identical balls bounce under Moon, Earth, and Jupiter gravity side by side.",
      "Jupiter pulls over fifteen times harder than the Moon — count how many extra bounces it gets.",
    ],
    titlePrefix: "Planet Gravity 3-Way Comparison",
    topic: "planetary surface gravity across the Solar System",
  },
  "giant-vs-swarm": {
    hooks: ["1 GIANT VS 100 TINY BALLS", "MOMENTUM TRANSFER CHAOS", "HEAVY VS SWARM"],
    narrations: [
      "One heavy sphere transfers its momentum into a swarm of a hundred tiny particles.",
      "Watch conservation of momentum catapult lightweight balls across the arena.",
    ],
    titlePrefix: "1 Giant Ball vs 100 Tiny Balls",
    topic: "elastic momentum transfer and kinetic energy",
  },
  "spin-illusion": {
    hooks: ["REVERSE THE SPIN WITH YOUR MIND", "WHICH WAY IS IT SPINNING?", "CAN YOU MAKE IT SPIN BOTH WAYS?"],
    narrations: [
      "There is no right answer. Your brain chooses the direction, and with focus you can flip it.",
      "Without depth cues, your visual system has to guess. Stare at the center and make it reverse.",
    ],
    titlePrefix: "Your Mind Can Reverse This Spin",
    topic: "bistable perception and the kinetic depth effect",
  },
  "doubling-ladder": {
    hooks: ["HOW MANY FOLDS TO REACH THE MOON?", "GUESS BEFORE IT LANDS", "THE POWER OF DOUBLING"],
    narrations: [
      "Every step doubles it. Guess the number before it lands.",
      "Exponential growth starts invisible, then explodes past everything you know.",
    ],
    titlePrefix: "How Many Doublings Does It Take?",
    topic: "exponential growth and the power of doubling",
  },
};

/**
 * Yayınlanmamış bir sonraki videoyu seçer.
 * - `physics`: Önce 12 farklı mekanikli küratörlü bölümü sırayla verir, sonra 12 mekaniği dönüşümlü sonsuz üretir.
 * - `explainer`: 30 How-It-Works bölümünü sırayla verir (hepsi bitince null döner).
 */
export function pickNextJob(channel: ChannelId, publishedIds: Set<string>): PublishJob | null {
  if (channel === "explainer") {
    return EXPLAINER_JOBS.find((j) => !publishedIds.has(j.id)) ?? null;
  }

  const curated = CURATED_PHYSICS_JOBS.find((j) => !publishedIds.has(j.id));
  if (curated) return curated;

  let index = CURATED_PHYSICS_JOBS.length;
  while (index < 10_000) {
    const niche = PHYSICS_ROTATION[index % PHYSICS_ROTATION.length];
    const seed = 200 + index;
    const id = `${niche}-seed${seed}`;
    if (!publishedIds.has(id)) {
      const meta = INFINITE_ANGLES[niche];
      const hook = meta.hooks[index % meta.hooks.length];
      const narration = meta.narrations[index % meta.narrations.length];
      return {
        id,
        channel: "physics",
        niche,
        seed,
        seconds: 24,
        hook,
        narration,
        title: `${meta.titlePrefix} #${seed - 199} #shorts`,
        description: `Deterministic 60fps physics & math visualization exploring ${meta.topic} (Run #${seed - 199}). Every collision is synthesized in real time.\n\n#shorts #physics #simulation #science`,
        tags: ["physics simulation", "science", "math", niche.replace("-", " "), "shorts"],
        categoryId: "28",
      };
    }
    index++;
  }
  return null;
}

export type EngagementKit = {
  episodeNumber: number;
  introCta: string;
  optionAKey: string;
  optionBKey: string;
  optionA: string;
  optionB: string;
  pollLine: string;
  commentPrompt: string;
  enrichedDescription: string;
};

export const PHYSICS_LABELS: Record<PhysicsNiche, string> = {
  "physics-ring": "7-Ring Escape",
  "duel-balls": "Chaos Arena Duel",
  "sorting-race": "Sorting Race",
  "marble-drop": "Marble Drop",
  "pendulum-wave": "Pendulum Wave",
  "ball-grow": "Growing Ball",
  "double-pendulum": "Double Pendulum",
  "gravity-orbit": "3-Body Gravity",
  "maze-race": "A* Maze Race",
  "domino-chain": "Giant Dominoes",
  "wave-interference": "Wave Interference",
  "fourier-draw": "Fourier Epicycles",
  "pi-collisions": "Blocks Calculate Pi",
  "brachistochrone": "Fastest Ramp Race",
  "langtons-ant": "Langton's Ant",
  "metronome-sync": "32 Metronomes Sync",
  "monty-hall": "Monty Hall Paradox",
  "gravity-compare": "Moon vs Earth vs Jupiter",
  "giant-vs-swarm": "1 Giant vs 100 Balls",
  "spin-illusion": "Reverse The Spin Illusion",
  "doubling-ladder": "How Many Doublings?",
};

const PHYSICS_CTAS: Record<PhysicsNiche, string> = {
  "physics-ring": "PREDICT: WILL IT BREAK RING 7?",
  "duel-balls": "PICK YOUR COLOR: CYAN OR MAGENTA?",
  "sorting-race": "GUESS WHICH ALGORITHM WINS",
  "marble-drop": "PICK YOUR WINNING MARBLE COLOR",
  "pendulum-wave": "WATCH UNTIL THE FINAL SYNC",
  "ball-grow": "GUESS HOW MANY BOUNCES IT TAKES",
  "double-pendulum": "SPOT THE EXACT MOMENT CHAOS HITS",
  "gravity-orbit": "WAIT FOR THE GRAVITY SLINGSHOT",
  "maze-race": "CAN BLIND SEARCH BEAT A* AI?",
  "domino-chain": "WAIT FOR THE FINAL MONOLITH",
  "wave-interference": "WAIT FOR PERFECT RESONANCE",
  "fourier-draw": "GUESS THE SHAPE BEFORE 50%",
  "pi-collisions": "WATCH THE CLACK COUNTER",
  "brachistochrone": "WHICH RAMP WINS? PICK A COLOR",
  "langtons-ant": "WAIT FOR THE HIGHWAY TO APPEAR",
  "metronome-sync": "WATCH ALL 32 LOCK TOGETHER",
  "monty-hall": "WOULD YOU SWITCH OR STAY?",
  "gravity-compare": "WATCH ALL 3 PLANETS AT ONCE",
  "giant-vs-swarm": "COUNT THE ELASTIC COLLISIONS",
  "spin-illusion": "CAN YOU FLIP IT BOTH WAYS?",
  "doubling-ladder": "GUESS THE NUMBER BEFORE IT LANDS",
};

function formatEpisodeLabel(slug: string): string {
  return slug
    .split("-")
    .map((w) => (w === "mri" || w === "gps" || w === "qr" ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

/**
 * Her video için etkileşim & algoritma güçlendirme paketi üretir:
 * - İlk 3 sn tahmin/yorum CTA'sı
 * - Son 3 sn A) / B) sonraki video oylaması
 * - Instagram otomatik ilk yorum + YouTube açıklama anketi
 * - Clear Mechanics seri bölüm numarası (EP. 03 vb.)
 */
export function getEngagementKit(job: PublishJob): EngagementKit {
  if (job.channel === "physics") {
    const idx = PHYSICS_ROTATION.indexOf(job.niche);
    const keyA = PHYSICS_ROTATION[(idx + 1) % PHYSICS_ROTATION.length];
    const keyB = PHYSICS_ROTATION[(idx + 3) % PHYSICS_ROTATION.length];
    const optA = PHYSICS_LABELS[keyA];
    const optB = PHYSICS_LABELS[keyB];
    const pollLine = `A) ${optA}  •  B) ${optB}`;
    const commentPrompt = `VOTE NEXT SIMULATION 👇\nA) ${optA}\nB) ${optB}\nComment A or B & Subscribe so you don't miss the winner! 🔔`;
    const enrichedDescription = `${job.description}\n\n${commentPrompt}`;
    const epNum = Math.max(1, job.seed - 100);
    return {
      episodeNumber: epNum,
      introCta: PHYSICS_CTAS[job.niche],
      optionAKey: keyA,
      optionBKey: keyB,
      optionA: optA,
      optionB: optB,
      pollLine,
      commentPrompt,
      enrichedDescription,
    };
  }

  const epIdx = Math.max(0, EXPLAINER_JOBS.findIndex((e) => e.id === job.id));
  const nextA = EXPLAINER_JOBS[(epIdx + 1) % EXPLAINER_JOBS.length];
  const nextB = EXPLAINER_JOBS[(epIdx + 2) % EXPLAINER_JOBS.length];
  const optA = formatEpisodeLabel(nextA.episode);
  const optB = formatEpisodeLabel(nextB.episode);
  const pollLine = `A) ${optA}  •  B) ${optB}`;
  const commentPrompt = `VOTE NEXT EPISODE 👇\nA) ${optA}\nB) ${optB}\nComment A or B & Subscribe so you don't miss the winner! 🔔`;
  const enrichedDescription = `${job.description}\n\n${commentPrompt}`;
  return {
    episodeNumber: epIdx + 1,
    introCta: `EP. ${String(epIdx + 1).padStart(2, "0")}`,
    optionAKey: nextA.episode,
    optionBKey: nextB.episode,
    optionA: optA,
    optionB: optB,
    pollLine,
    commentPrompt,
    enrichedDescription,
  };
}

/**
 * Yorum oylamasından kazanan A veya B anahtarına göre bir sonraki yayını öne alır.
 * - `explainer`: o bölüm henüz yayınlanmadıysa onu döndürür.
 * - `physics`: o nişin küratörlü bölümü yayınlanmadıysa onu, yayınlandıysa yeni seed ile taze bir bölüm üretir.
 */
export function pickJobByKey(
  channel: ChannelId,
  key: string,
  publishedIds: Set<string>,
): PublishJob | null {
  if (channel === "explainer") {
    return EXPLAINER_JOBS.find((j) => j.episode === key && !publishedIds.has(j.id)) ?? null;
  }

  if (!PHYSICS_ROTATION.includes(key as PhysicsNiche)) return null;
  const niche = key as PhysicsNiche;
  const curated = CURATED_PHYSICS_JOBS.find((j) => j.niche === niche && !publishedIds.has(j.id));
  if (curated) return curated;

  for (let seed = 300; seed < 9000; seed++) {
    const id = `${niche}-seed${seed}`;
    if (!publishedIds.has(id)) {
      const meta = INFINITE_ANGLES[niche];
      const hook = meta.hooks[seed % meta.hooks.length];
      const narration = meta.narrations[seed % meta.narrations.length];
      return {
        id,
        channel: "physics",
        niche,
        seed,
        seconds: 24,
        hook,
        narration,
        title: `YOU VOTED FOR THIS: ${meta.titlePrefix} #shorts`.slice(0, 100),
        description: `Requested by your comments! Deterministic 60fps visualization exploring ${meta.topic}.\n\n#shorts #physics #simulation #science`,
        tags: ["physics simulation", "science", "math", niche.replace("-", " "), "shorts"],
        categoryId: "28",
      };
    }
  }
  return null;
}
