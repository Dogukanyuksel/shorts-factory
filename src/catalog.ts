export type ChannelId = "physics" | "explainer";

export type PhysicsNiche =
  | "physics-ring"
  | "duel-balls"
  | "sorting-race"
  | "marble-drop"
  | "pendulum-wave"
  | "ball-grow";

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

const PHYSICS_ROTATION: PhysicsNiche[] = [
  "physics-ring",
  "duel-balls",
  "sorting-race",
  "marble-drop",
  "pendulum-wave",
  "ball-grow",
];

/**
 * Kanal 1 (Physics & Simulations) için YPP-dostu küratörlü açılış havuzu.
 * Her video farklı mekanik + benzersiz İngilizce sesli fizik/algoritma yorumu + özgün açıklama taşır.
 * Ardışık iki video ASLA aynı simülasyon şablonunu tekrarlamaz.
 */
export const CURATED_PHYSICS_JOBS: PhysicsJob[] = [
  {
    id: "physics-ring-seed101",
    channel: "physics",
    niche: "physics-ring",
    seed: 101,
    seconds: 32,
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
    seconds: 32,
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
    id: "sorting-race-seed103",
    channel: "physics",
    niche: "sorting-race",
    seed: 103,
    seconds: 32,
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
    id: "marble-drop-seed104",
    channel: "physics",
    niche: "marble-drop",
    seed: 104,
    seconds: 32,
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
    id: "pendulum-wave-seed105",
    channel: "physics",
    niche: "pendulum-wave",
    seed: 105,
    seconds: 32,
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
    id: "ball-grow-seed106",
    channel: "physics",
    niche: "ball-grow",
    seed: 106,
    seconds: 32,
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
    id: "physics-ring-seed107",
    channel: "physics",
    niche: "physics-ring",
    seed: 107,
    seconds: 32,
    hook: "MOMENTUM VS 7 SPINNING BARRIERS",
    narration:
      "Angular momentum keeps all seven rings rotating in alternating directions while gravity pulls the ball downward. Only a direct hit through the narrow gap shatters each layer.",
    title: "Angular Momentum vs 7 Spinning Rings #shorts",
    description:
      "Watch how gravity and elastic reflections interact inside seven counter-rotating barriers. Each shattered ring shifts the acoustic scale upward.\n\n#shorts #physics #mechanics #simulation",
    tags: ["angular momentum", "physics engine", "ring escape", "shorts"],
    categoryId: "28",
  },
  {
    id: "duel-balls-seed108",
    channel: "physics",
    niche: "duel-balls",
    seed: 108,
    seconds: 32,
    hook: "ELASTIC COLLISION SHOWDOWN",
    narration:
      "In a perfectly elastic collision, both momentum and kinetic energy are conserved. Watch how a single glancing hit completely reverses who controls the arena.",
    title: "Elastic Collision Duel: Who Takes the Final Hit? #shorts",
    description:
      "A physics-based head-to-head duel demonstrating conservation of momentum in 2D elastic collisions. Every impact plays a harmonic note proportional to speed.\n\n#shorts #physics #collisions #science",
    tags: ["elastic collision", "conservation of momentum", "physics duel", "shorts"],
    categoryId: "28",
  },
  {
    id: "sorting-race-seed109",
    channel: "physics",
    niche: "sorting-race",
    seed: 109,
    seconds: 32,
    hook: "O(N LOG N) VS O(N²) IN 30 SECONDS",
    narration:
      "Why do computer scientists obsess over Big-O notation? Because as the data grows, an N-squared algorithm falls hopelessly behind an N-log-N algorithm. Watch the gap explode.",
    title: "Why Big-O Notation Matters: Live Algorithm Race #shorts",
    description:
      "Comparing quadratic vs linearithmic sorting algorithms on randomized data. Hear the sound of sorted order emerging as comparisons drop to zero.\n\n#shorts #algorithms #programming #compsci",
    tags: ["big o notation", "sorting visualization", "programming", "shorts"],
    categoryId: "28",
  },
  {
    id: "marble-drop-seed110",
    channel: "physics",
    niche: "marble-drop",
    seed: 110,
    seconds: 32,
    hook: "GRAVITY GAUNTLET: PICK YOUR COLOR",
    narration:
      "A tiny bounce at the top of the course changes every collision below it. That is the butterfly effect playing out in a thirty-second marble drop.",
    title: "The Butterfly Effect in a 30-Second Marble Drop #shorts",
    description:
      "Watch how microscopic differences at the starting gate compound through dozens of rigid-body peg collisions to decide the winner.\n\n#shorts #butterflyeffect #marblerace #physics",
    tags: ["butterfly effect", "marble drop", "physics", "shorts"],
    categoryId: "28",
  },
  {
    id: "pendulum-wave-seed111",
    channel: "physics",
    niche: "pendulum-wave",
    seed: 111,
    seconds: 32,
    hook: "HOW WAVES FORM WITHOUT TOUCHING",
    narration:
      "None of these pendulums touch each other, yet your brain sees a flowing sine wave and a spinning double helix. It is pure math — just phase differences in simple harmonic motion.",
    title: "These Pendulums Never Touch — Yet They Form a Wave #shorts",
    description:
      "Simple harmonic motion with carefully tuned frequencies produces mesmerizing optical illusions: traveling waves, opposing rows, and full phase realignment.\n\n#shorts #physics #math #illusion",
    tags: ["harmonic motion", "pendulum", "math art", "physics", "shorts"],
    categoryId: "28",
  },
  {
    id: "ball-grow-seed112",
    channel: "physics",
    niche: "ball-grow",
    seed: 112,
    seconds: 32,
    hook: "EVERY BOUNCE = FASTER COLLISIONS",
    narration:
      "As the sphere expands inside a fixed boundary, its free travel distance shrinks. Fewer pixels to travel means collisions happen exponentially faster right before the finale.",
    title: "Why Collisions Accelerate as Space Runs Out #shorts",
    description:
      "As free path length approaches zero, collision frequency spikes dramatically — the same geometric principle behind gas pressure in compressed containers.\n\n#shorts #physics #geometry #simulation",
    tags: ["gas pressure", "geometry", "physics simulation", "shorts"],
    categoryId: "28",
  },
];

/**
 * Kanal 2 (How It Works) — 10 hazır İngilizce mühendislik/bilim açıklayıcı bölüm.
 * YPP açısından en yüksek özgünlük ve en yüksek RPM kategorisi.
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
];

const INFINITE_ANGLES: Record<PhysicsNiche, { hooks: string[]; narrations: string[]; titlePrefix: string; topic: string }> = {
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
};

/**
 * Yayınlanmamış bir sonraki videoyu seçer.
 * - `physics`: Önce 12 küratörlü bölümü sırayla verir, bittikten sonra 6 mekaniği dönüşümlü olarak sonsuz üretir.
 * - `explainer`: 10 How-It-Works bölümünü sırayla verir (hepsi bitince null döner).
 */
export function pickNextJob(channel: ChannelId, publishedIds: Set<string>): PublishJob | null {
  if (channel === "explainer") {
    return EXPLAINER_JOBS.find((j) => !publishedIds.has(j.id)) ?? null;
  }

  const curated = CURATED_PHYSICS_JOBS.find((j) => !publishedIds.has(j.id));
  if (curated) return curated;

  // Küratörlü liste tamamlandıysa 6 farklı format arasında dönüşümlü sonsuz üretim
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
        seconds: 32,
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
