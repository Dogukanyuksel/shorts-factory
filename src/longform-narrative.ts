import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { ChannelId } from "./catalog.js";

export type ActKind = "hook" | "mechanism" | "failure" | "comparison";

export interface NarrativeBeat {
  id: string;
  actIndex: 0 | 1 | 2 | 3;
  actKind: ActKind;
  actTitle: string;
  /** Görsel sahne katmanı — her 20–30 saniyede bir farklı açı/katman göstermek için HTML sahnesine aktarılır. */
  visualPhase: string;
  caption: string;
  text: string;
  /** true → önceki perdeden yeni perdeye bağlayıcı anlatı köprüsü (konu sıfırlanmaz). */
  isBridge?: boolean;
}

export interface DerivedShortSpec {
  /** Uzun videonun hangi beat aralığından türetildiği (kendi başına anlaşılır 30–42 sn vitrin kesiti). */
  shortIndex: 0 | 1 | 2;
  slugSuffix: string;
  hook: string;
  partLabel: string;
  title: string;
  descriptionLead: string;
  tags: string[];
  /** Uzun videodaki beat ID'leri (sıralı, toplam ~30–42 sn). */
  beatIds: string[];
  /** Son 1.2 saniyede gösterilecek seri devamlılığı + abone CTA'sı. */
  ctaText: string;
}

export interface NarrativeLongformSpec {
  id: string;
  slug: string;
  channel: ChannelId;
  brandName: string;
  accentHex: string;
  title: string;
  descriptionLead: string;
  tags: string[];
  categoryId: string;
  nextEpisodeTeaser: string;
  beats: NarrativeBeat[];
  derivedShorts: DerivedShortSpec[];
}

export const NARRATIVE_LONGFORM_SPECS: NarrativeLongformSpec[] = [
  // =========================================================================
  // CLEAR MECHANICS — DEEP DIVE #1: 4-STROKE ENGINE (4:00–4:45)
  // =========================================================================
  {
    id: "narrative-explainer-four-stroke-engine",
    slug: "four-stroke-engine-deep-dive",
    channel: "explainer",
    brandName: "CLEAR MECHANICS",
    accentHex: "#38bdf8",
    title: "How a 4-Stroke Engine Survives 7,000 Explosions Per Minute (Animated Deep Dive)",
    descriptionLead:
      "How does a single copper-alloy piston survive over a hundred controlled explosions every second without melting? In this 4-act animated engineering deep dive, we dissect the intake-to-exhaust cycle, push the engine past its redline breaking point, and compare 4-Stroke, Wankel Rotary, and Electric motors side by side.",
    tags: ["4 stroke engine", "how engines work", "mechanical engineering", "animation", "clear mechanics"],
    categoryId: "27",
    nextEpisodeTeaser: "Next up on Clear Mechanics: Why Impossible Non-Round Gears Multiply Force by 15,625x.",
    beats: [
      // ACT 1: HOOK & PROBLEM (0:00–0:45)
      {
        id: "a1-hook-1",
        actIndex: 0,
        actKind: "hook",
        actTitle: "1. The 7,000 RPM Survival Problem",
        visualPhase: "overview-cutaway",
        caption: "116 EXPLOSIONS / SECOND",
        text: "Right now, under the hood of a highway car, a metal piston is slamming up and down over a hundred times every single second.",
      },
      {
        id: "a1-hook-2",
        actIndex: 0,
        actKind: "hook",
        actTitle: "1. The 7,000 RPM Survival Problem",
        visualPhase: "thermal-zoom",
        caption: "2,500°C INSIDE METAL",
        text: "Each explosion inside that cylinder peaks above two thousand five hundred degrees Celsius — hot enough to melt solid aluminum in seconds.",
      },
      {
        id: "a1-hook-3",
        actIndex: 0,
        actKind: "hook",
        actTitle: "1. The 7,000 RPM Survival Problem",
        visualPhase: "timing-preview",
        caption: "MILLIMETER TIMING",
        text: "So why doesn't the engine destroy itself? The answer is a four-step mechanical choreography timed down to a fraction of a millisecond.",
      },
      // ACT 2: CORE MECHANISM (0:45–2:15)
      {
        id: "a2-bridge",
        actIndex: 1,
        actKind: "mechanism",
        actTitle: "2. Inside the Four-Stroke Cycle",
        visualPhase: "intake-stroke",
        caption: "STROKE 1: INTAKE",
        isBridge: true,
        text: "To see how that timing works, let's slow the engine down fifty times and follow a single drop of fuel through all four strokes.",
      },
      {
        id: "a2-intake",
        actIndex: 1,
        actKind: "mechanism",
        actTitle: "2. Inside the Four-Stroke Cycle",
        visualPhase: "intake-stroke",
        caption: "VACUUM PULLS AIR + FUEL",
        text: "First, the intake valve opens while the piston plunges downward. That expanding cavity creates low pressure, pulling a precise mist of air and fuel straight into the chamber.",
      },
      {
        id: "a2-compression",
        actIndex: 1,
        actKind: "mechanism",
        actTitle: "2. Inside the Four-Stroke Cycle",
        visualPhase: "compression-stroke",
        caption: "STROKE 2: 10:1 COMPRESSION",
        text: "Next, both valves snap shut as the crankshaft drives the piston back up. The trapped air-fuel mixture is squeezed into one tenth of its original volume, spiking pressure and temperature.",
      },
      {
        id: "a2-power",
        actIndex: 1,
        actKind: "mechanism",
        actTitle: "2. Inside the Four-Stroke Cycle",
        visualPhase: "power-stroke",
        caption: "STROKE 3: SPARK & POWER",
        text: "Just before top dead center, the spark plug fires a forty-thousand-volt arc. The compressed gas ignites into an expanding fireball, slamming the piston down with tons of force.",
      },
      {
        id: "a2-exhaust",
        actIndex: 1,
        actKind: "mechanism",
        actTitle: "2. Inside the Four-Stroke Cycle",
        visualPhase: "exhaust-stroke",
        caption: "STROKE 4: EXHAUST",
        text: "Finally, the exhaust valve opens on the upward return stroke, sweeping burned gases out so the next breath of fresh air can enter. Two full crank turns, one power pulse.",
      },
      {
        id: "a2-camshaft",
        actIndex: 1,
        actKind: "mechanism",
        actTitle: "2. Inside the Four-Stroke Cycle",
        visualPhase: "cam-ratio-diagram",
        caption: "2:1 CAMSHAFT GEAR",
        text: "Notice the secret gear ratio at the top: the camshaft spins at exactly half the crankshaft speed, guaranteeing each valve opens only once every two rotations.",
      },
      // ACT 3: LIMIT STATE & FAILURE MODE (2:15–3:45)
      {
        id: "a3-bridge",
        actIndex: 2,
        actKind: "failure",
        actTitle: "3. Pushing Past the Breaking Point",
        visualPhase: "knock-detonation",
        caption: "WHAT BREAKS AT REDLINE?",
        isBridge: true,
        text: "That choreography runs effortlessly at three thousand RPM. Now let's look at what happens when we push this exact system past its physical breaking point.",
      },
      {
        id: "a3-knock",
        actIndex: 2,
        actKind: "failure",
        actTitle: "3. Pushing Past the Breaking Point",
        visualPhase: "knock-detonation",
        caption: "ENGINE KNOCK SHOCKWAVE",
        text: "If pressure and heat rise too fast, pockets of fuel self-ignite before the spark even fires. Two supersonic flame fronts collide inside the cylinder, hammering the piston crown with destructive shockwaves.",
      },
      {
        id: "a3-valve-float",
        actIndex: 2,
        actKind: "failure",
        actTitle: "3. Pushing Past the Breaking Point",
        visualPhase: "valve-float",
        caption: "VALVE FLOAT COLLISION",
        text: "Push RPM even higher and the steel valve springs physically run out of time to snap closed. The rising piston catches an open valve mid-air — bending steel in a single millisecond.",
      },
      {
        id: "a3-thermal",
        actIndex: 2,
        actKind: "failure",
        actTitle: "3. Pushing Past the Breaking Point",
        visualPhase: "thermal-expansion",
        caption: "THERMAL SEIZURE",
        text: "Meanwhile, without oil film and coolant channels pulling heat away, the aluminum piston expands faster than the iron wall until microscopic friction welds them solid.",
      },
      // ACT 4: COMPARATIVE SUMMARY & SERIES BRIDGE (3:45–4:30)
      {
        id: "a4-bridge",
        actIndex: 3,
        actKind: "comparison",
        actTitle: "4. 4-Stroke vs Rotary vs Electric",
        visualPhase: "compare-4way",
        caption: "EFFICIENCY SHOWDOWN",
        isBridge: true,
        text: "Because reciprocating pistons constantly stop and reverse direction, engineers spent a century trying to beat them. Let's compare four rival designs running side by side.",
      },
      {
        id: "a4-compare",
        actIndex: 3,
        actKind: "comparison",
        actTitle: "4. 4-Stroke vs Rotary vs Electric",
        visualPhase: "compare-4way",
        caption: "35% GAS VS 92% ELECTRIC",
        text: "A typical four-stroke engine converts roughly thirty-five percent of fuel energy into motion, losing the rest as heat. A brushless electric motor skips combustion entirely and hits over ninety-two percent efficiency.",
      },
      {
        id: "a4-outro",
        actIndex: 3,
        actKind: "comparison",
        actTitle: "4. 4-Stroke vs Rotary vs Electric",
        visualPhase: "series-outro",
        caption: "NEXT: IMPOSSIBLE GEARS",
        text: "Yet liquid fuel still packs massive energy per kilogram, keeping the four-stroke alive for over a century. Subscribe to Clear Mechanics — next we break down non-round Fibonacci gears that multiply force fifteen thousand times.",
      },
    ],
    derivedShorts: [
      {
        shortIndex: 0,
        slugSuffix: "short-1-four-strokes",
        hook: "4 STROKES IN 30 SECONDS",
        partLabel: "PART 1 / 3 · FULL 4-MIN VIDEO ↓",
        title: "How 1 Piston Survives 7,000 Explosions/Min (3D Cutaway) #shorts",
        descriptionLead:
          "Watch all four strokes — Intake, Compression, Power, Exhaust — slowed down 50x so you can see the exact millisecond timing.",
        tags: ["4 stroke engine", "how engines work", "engineering", "shorts"],
        beatIds: ["a1-hook-1", "a2-intake", "a2-compression", "a2-power", "a2-exhaust"],
        ctaText: "PART 2: REDLINE FAILURE → SUBSCRIBE",
      },
      {
        shortIndex: 1,
        slugSuffix: "short-2-valve-float",
        hook: "WHAT HAPPENS PAST REDLINE?",
        partLabel: "PART 2 / 3 · FULL 4-MIN VIDEO ↓",
        title: "What Actually Breaks When You Over-Rev an Engine? #shorts",
        descriptionLead:
          "Engine knock shockwaves and valve float: watch the exact millisecond an open valve collides with a rising piston.",
        tags: ["engine knock", "valve float", "redline", "engineering", "shorts"],
        beatIds: ["a3-bridge", "a3-knock", "a3-valve-float"],
        ctaText: "PART 3: GAS VS EV → SUBSCRIBE",
      },
      {
        shortIndex: 2,
        slugSuffix: "short-3-engine-battle",
        hook: "35% GAS VS 92% ELECTRIC",
        partLabel: "PART 3 / 3 · FULL 4-MIN VIDEO ↓",
        title: "4-Stroke vs Rotary vs Electric: The Real Efficiency Gap #shorts",
        descriptionLead:
          "Why does a gas engine lose 65% of its energy as heat while a brushless electric motor hits 92% efficiency?",
        tags: ["engine efficiency", "ev vs gas", "wankel rotary", "engineering", "shorts"],
        beatIds: ["a4-bridge", "a4-compare", "a4-outro"],
        ctaText: "WATCH FULL 4-MIN DEEP DIVE ↓",
      },
    ],
  },

  // =========================================================================
  // CLEAR MECHANICS — DEEP DIVE #2: IMPOSSIBLE GEARS & 15,625:1 TORQUE
  // =========================================================================
  {
    id: "narrative-explainer-gear-ratios",
    slug: "gear-ratios-and-torque-deep-dive",
    channel: "explainer",
    brandName: "CLEAR MECHANICS",
    accentHex: "#38bdf8",
    title: "Why Impossible Gears Can Multiply Force by 15,625x (Animated Engineering Deep Dive)",
    descriptionLead:
      "Six tiny gears can turn a finger twist into force strong enough to bend solid steel — and non-round Fibonacci gears can mesh smoothly without ever jamming. In this 4-act deep dive, we break down gear ratios, golden-ratio spiral geometry, tooth-fracture failure limits, and planetary vs standard gearboxes.",
    tags: ["gear ratio", "fibonacci gears", "mechanical advantage", "engineering", "clear mechanics"],
    categoryId: "27",
    nextEpisodeTeaser: "Next up on Clear Mechanics: How a 660-Ton Steel Pendulum Saves Skyscrapers from Earthquakes.",
    beats: [
      {
        id: "g1-hook-1",
        actIndex: 0,
        actKind: "hook",
        actTitle: "1. The 15,625-Turn Puzzle",
        visualPhase: "six-gear-cascade",
        caption: "15,625 CRANKS = 1 TURN",
        text: "Imagine turning a small hand crank fifteen thousand six hundred and twenty-five times, just to make the final golden gear rotate once.",
      },
      {
        id: "g1-hook-2",
        actIndex: 0,
        actKind: "hook",
        actTitle: "1. The 15,625-Turn Puzzle",
        visualPhase: "torque-multiplier",
        caption: "SPEED TRADED FOR FORCE",
        text: "Why would any engineer build a machine that moves slower than a glacier? Because every time you cut speed by five, you multiply turning force by five.",
      },
      {
        id: "g1-hook-3",
        actIndex: 0,
        actKind: "hook",
        actTitle: "1. The 15,625-Turn Puzzle",
        visualPhase: "non-round-teaser",
        caption: "GEARS DON'T HAVE TO BE ROUND",
        text: "And even wilder: gears do not even have to be circular to mesh seamlessly. Let's uncover the hidden geometry behind mechanical advantage.",
      },
      {
        id: "g2-bridge",
        actIndex: 1,
        actKind: "mechanism",
        actTitle: "2. How Teeth Multiply Torque",
        visualPhase: "involute-mesh",
        caption: "INVOLUTE TOOTH CURVE",
        isBridge: true,
        text: "To understand how six stages stack into fifteen thousand to one, start with a single pair of meshing teeth.",
      },
      {
        id: "g2-ratio",
        actIndex: 1,
        actKind: "mechanism",
        actTitle: "2. How Teeth Multiply Torque",
        visualPhase: "involute-mesh",
        caption: "5:1 PER STAGE → 5⁶ = 15,625",
        text: "A small ten-tooth pinion driving a fifty-tooth wheel rotates five times for every single turn of the big gear. Mount another ten-tooth pinion on that same shaft, and the ratios multiply — not add.",
      },
      {
        id: "g2-fibonacci",
        actIndex: 1,
        actKind: "mechanism",
        actTitle: "2. How Teeth Multiply Torque",
        visualPhase: "fibonacci-spiral",
        caption: "r₁(θ₁) + r₂(θ₂) = D",
        text: "Now bend the rules with Fibonacci spiral gears. Even though their radius grows exponentially, their two contact radii always sum to the exact shaft distance D — creating a pulsing speed wave with zero jamming.",
      },
      {
        id: "g2-energy",
        actIndex: 1,
        actKind: "mechanism",
        actTitle: "2. How Teeth Multiply Torque",
        visualPhase: "power-balance",
        caption: "POWER = TORQUE × SPEED",
        text: "Physics never gives a free lunch: mechanical power equals torque times angular speed. Extreme torque is simply energy concentrated into a tiny, unstoppable angle.",
      },
      {
        id: "g3-bridge",
        actIndex: 2,
        actKind: "failure",
        actTitle: "3. Friction, Backlash & Tooth Shear",
        visualPhase: "friction-loss",
        caption: "THE REAL-WORLD LIMIT",
        isBridge: true,
        text: "On paper you could chain twenty gears together and lift a mountain with one finger. Now let's see why real metal gears shatter long before that.",
      },
      {
        id: "g3-friction",
        actIndex: 2,
        actKind: "failure",
        actTitle: "3. Friction, Backlash & Tooth Shear",
        visualPhase: "friction-loss",
        caption: "COMPOUNDING FRICTION",
        text: "Every single gear mesh loses roughly three to five percent of its energy to sliding friction and heat. Across too many stages, friction steals more energy than your hand puts in.",
      },
      {
        id: "g3-shear",
        actIndex: 2,
        actKind: "failure",
        actTitle: "3. Friction, Backlash & Tooth Shear",
        visualPhase: "tooth-fracture",
        caption: "ROOT BENDING STRESS",
        text: "Worse yet, all that multiplied torque concentrates onto one tiny millimeter of steel at the root of the final tooth. Exceed the steel's yield strength and the tooth snaps clean off.",
      },
      {
        id: "g4-bridge",
        actIndex: 3,
        actKind: "comparison",
        actTitle: "4. Spur vs Planetary vs Spiral",
        visualPhase: "gearbox-compare",
        caption: "3 GEAR ARCHITECTURES",
        isBridge: true,
        text: "To survive extreme torque without snapping teeth, engineers evolved smarter layouts. Compare three classic designs side by side.",
      },
      {
        id: "g4-compare",
        actIndex: 3,
        actKind: "comparison",
        actTitle: "4. Spur vs Planetary vs Spiral",
        visualPhase: "gearbox-compare",
        caption: "PLANETARY SHARES THE LOAD",
        text: "Standard spur gears put all the load on one contact point. Planetary gearboxes split that exact torque across three or four orbiting planet gears — packing massive strength into automatic transmissions and rocket actuators.",
      },
      {
        id: "g4-outro",
        actIndex: 3,
        actKind: "comparison",
        actTitle: "4. Spur vs Planetary vs Spiral",
        visualPhase: "series-outro",
        caption: "SUBSCRIBE FOR NEXT DEEP DIVE",
        text: "From wristwatches to wind turbines, geometry turns whisper-light motion into industrial power. Subscribe to Clear Mechanics for the next engineering breakdown.",
      },
    ],
    derivedShorts: [
      {
        shortIndex: 0,
        slugSuffix: "short-1-15625-cranks",
        hook: "15,625 CRANKS FOR 1 TURN",
        partLabel: "PART 1 / 3 · FULL 4-MIN VIDEO ↓",
        title: "Why 6 Tiny Gears Multiply Your Force 15,625 Times #shorts",
        descriptionLead:
          "Each stage slows down 5x and multiplies torque 5x — watch how 5⁶ creates unstoppable mechanical advantage.",
        tags: ["gear ratio", "torque", "mechanics", "shorts"],
        beatIds: ["g1-hook-1", "g1-hook-2", "g2-ratio"],
        ctaText: "PART 2: IMPOSSIBLE GEARS → SUBSCRIBE",
      },
      {
        shortIndex: 1,
        slugSuffix: "short-2-fibonacci-mesh",
        hook: "HOW DO THESE NOT JAM?!",
        partLabel: "PART 2 / 3 · FULL 4-MIN VIDEO ↓",
        title: "Non-Round Fibonacci Gears Explained in 30 Seconds #shorts",
        descriptionLead:
          "The hidden equation r₁(θ₁) + r₂(θ₂) = D that lets golden-ratio spiral gears spin smoothly without ever locking up.",
        tags: ["fibonacci gears", "math", "engineering", "shorts"],
        beatIds: ["g1-hook-3", "g2-fibonacci", "g2-energy"],
        ctaText: "PART 3: WHEN STEEL SNAPS → SUBSCRIBE",
      },
      {
        shortIndex: 2,
        slugSuffix: "short-3-tooth-shear",
        hook: "WHY GEARS SNAP UNDER LOAD",
        partLabel: "PART 3 / 3 · FULL 4-MIN VIDEO ↓",
        title: "Why Planetary Gears Beat Standard Gears Every Time #shorts",
        descriptionLead:
          "Root bending stress snaps single-contact spur teeth — see how planetary gearboxes split the load across four gears.",
        tags: ["planetary gears", "gear failure", "engineering", "shorts"],
        beatIds: ["g3-bridge", "g3-shear", "g4-compare"],
        ctaText: "WATCH FULL 4-MIN DEEP DIVE ↓",
      },
    ],
  },

  // =========================================================================
  // KINETIC LAB — DEEP DIVE #1: 100 DOUBLE PENDULUMS & BUTTERFLY EFFECT
  // =========================================================================
  {
    id: "narrative-physics-butterfly-effect",
    slug: "butterfly-effect-chaos-deep-dive",
    channel: "physics",
    brandName: "KINETIC LAB",
    accentHex: "#f472b6",
    title: "Why 0.001° Destroys Predictability: 100 Double Pendulums Explained (60fps Deep Dive)",
    descriptionLead:
      "Release 100 double pendulums separated by just one thousandth of a degree. For five seconds they move as one — then deterministic physics explodes into pure rainbow chaos. In this 4-act physics deep dive, we visualize phase space, measure the Lyapunov divergence cliff, and compare single vs chaotic systems.",
    tags: ["butterfly effect", "double pendulum", "chaos theory", "physics simulation", "kinetic lab"],
    categoryId: "28",
    nextEpisodeTeaser: "Next up on Kinetic Lab: How Pure Sound Frequencies Sculpt 2,600 Sand Grains Into Sacred Geometry.",
    beats: [
      {
        id: "p1-hook-1",
        actIndex: 0,
        actKind: "hook",
        actTitle: "1. The 0.001° Illusion",
        visualPhase: "unified-drop",
        caption: "100 PENDULUMS · 0.001° APART",
        text: "We just dropped one hundred double pendulums at the exact same instant, separated by less than one thousandth of a degree.",
      },
      {
        id: "p1-hook-2",
        actIndex: 0,
        actKind: "hook",
        actTitle: "1. The 0.001° Illusion",
        visualPhase: "unified-drop",
        caption: "IDENTICAL FOR 5 SECONDS",
        text: "To the human eye, they look like a single solid beam swinging cleanly under gravity. Zero randomness, zero wind, pure Newton's laws.",
      },
      {
        id: "p1-hook-3",
        actIndex: 0,
        actKind: "hook",
        actTitle: "1. The 0.001° Illusion",
        visualPhase: "first-split",
        caption: "THEN CHAOS DETONATES",
        text: "Yet just seven seconds later, that microscopic gap explodes into a violent rainbow fan where no two pendulums ever agree again.",
      },
      {
        id: "p2-bridge",
        actIndex: 1,
        actKind: "mechanism",
        actTitle: "2. Coupled Energy & Phase Space",
        visualPhase: "energy-exchange",
        caption: "TWO ARMS FIGHTING FOR ENERGY",
        isBridge: true,
        text: "Why does adding just one extra hinge turn a predictable grandfather clock into an uncontrollable chaos machine? Watch the energy vectors.",
      },
      {
        id: "p2-transfer",
        actIndex: 1,
        actKind: "mechanism",
        actTitle: "2. Coupled Energy & Phase Space",
        visualPhase: "energy-exchange",
        caption: "NONLINEAR WHIP EFFECT",
        text: "In a single pendulum, potential and kinetic energy trade places smoothly forever. In a double pendulum, the upper arm whips energy violently into the lower arm, creating nonlinear feedback every swing.",
      },
      {
        id: "p2-phase",
        actIndex: 1,
        actKind: "mechanism",
        actTitle: "2. Coupled Energy & Phase Space",
        visualPhase: "phase-space-plot",
        caption: "PHASE SPACE TRAJECTORY",
        text: "Plot the two angles side by side in phase space and you see the hidden geometry: tiny errors stretch exponentially along unstable saddle points whenever the lower arm nearly flips over the top.",
      },
      {
        id: "p3-bridge",
        actIndex: 2,
        actKind: "failure",
        actTitle: "3. The Prediction Horizon Cliff",
        visualPhase: "lyapunov-cliff",
        caption: "EXPONENTIAL DIVERGENCE",
        isBridge: true,
        text: "Now let's measure how fast predictability collapses as we track the angular spread across all one hundred pendulums.",
      },
      {
        id: "p3-lyapunov",
        actIndex: 2,
        actKind: "failure",
        actTitle: "3. The Prediction Horizon Cliff",
        visualPhase: "lyapunov-cliff",
        caption: "SPREAD DOUBLES EVERY 0.6s",
        text: "Mathematicians measure this explosion with the Lyapunov exponent. Here, the error roughly doubles every half second — turning a millionth of a degree into a full three-hundred-sixty-degree scatter in seconds.",
      },
      {
        id: "p3-weather",
        actIndex: 2,
        actKind: "failure",
        actTitle: "3. The Prediction Horizon Cliff",
        visualPhase: "rainbow-chaos-full",
        caption: "WHY WEATHER CAPS AT ~14 DAYS",
        text: "This is the exact mathematical wall behind weather forecasting. Even if we measured Earth's atmosphere to atomic precision, nonlinear fluid turbulence hits its prediction horizon in about two weeks.",
      },
      {
        id: "p4-bridge",
        actIndex: 3,
        actKind: "comparison",
        actTitle: "4. Order vs Chaos Side by Side",
        visualPhase: "order-vs-chaos-split",
        caption: "LOW ENERGY VS HIGH ENERGY",
        isBridge: true,
        text: "Does a double pendulum always fall into chaos? Not quite. Watch what happens when we compare low-energy swings against high-energy drops.",
      },
      {
        id: "p4-compare",
        actIndex: 3,
        actKind: "comparison",
        actTitle: "4. Order vs Chaos Side by Side",
        visualPhase: "order-vs-chaos-split",
        caption: "CHAOS NEEDS ENERGY THRESHOLD",
        text: "At small angles on the left, the pendulums stay locked together in quasi-periodic harmony. Cross the energy threshold on the right, and deterministic equations unlock infinite visual complexity.",
      },
      {
        id: "p4-outro",
        actIndex: 3,
        actKind: "comparison",
        actTitle: "4. Order vs Chaos Side by Side",
        visualPhase: "series-outro",
        caption: "NEXT: SOUND SCULPTS SAND",
        text: "Chaos isn't randomness — it is hidden sensitivity built right into the laws of physics. Subscribe to Kinetic Lab — next we watch pure sound frequencies sculpt thousands of sand grains into sacred geometry.",
      },
    ],
    derivedShorts: [
      {
        shortIndex: 0,
        slugSuffix: "short-1-exact-split",
        hook: "SPOT THE EXACT SPLIT SECOND",
        partLabel: "PART 1 / 3 · FULL 4-MIN VIDEO ↓",
        title: "100 Pendulums Dropped 0.001° Apart: Watch Second 7 #shorts",
        descriptionLead:
          "Pure Newton's laws, zero randomness — watch 100 identical pendulums stay locked for 5 seconds before exploding into rainbow chaos.",
        tags: ["butterfly effect", "double pendulum", "chaos theory", "shorts"],
        beatIds: ["p1-hook-1", "p1-hook-2", "p1-hook-3"],
        ctaText: "PART 2: WHY WEATHER FAILS → SUBSCRIBE",
      },
      {
        shortIndex: 1,
        slugSuffix: "short-2-weather-wall",
        hook: "WHY WEATHER CAPS AT 14 DAYS",
        partLabel: "PART 2 / 3 · FULL 4-MIN VIDEO ↓",
        title: "The Math Wall That Breaks Every Weather Forecast #shorts",
        descriptionLead:
          "The Lyapunov exponent doubles tiny errors every 0.6 seconds — the exact same math that caps Earth's weather forecasts at two weeks.",
        tags: ["lyapunov exponent", "weather chaos", "physics", "shorts"],
        beatIds: ["p3-bridge", "p3-lyapunov", "p3-weather"],
        ctaText: "PART 3: ORDER VS CHAOS → SUBSCRIBE",
      },
      {
        shortIndex: 2,
        slugSuffix: "short-3-order-vs-chaos",
        hook: "LOW ENERGY VS HIGH ENERGY",
        partLabel: "PART 3 / 3 · FULL 4-MIN VIDEO ↓",
        title: "Order vs Chaos: One Energy Threshold Changes Everything #shorts",
        descriptionLead:
          "Left: low-angle double pendulums stay locked in harmony. Right: cross the energy threshold and chaos detonates.",
        tags: ["order vs chaos", "physics simulation", "science", "shorts"],
        beatIds: ["p4-bridge", "p4-compare", "p4-outro"],
        ctaText: "WATCH FULL 4-MIN DEEP DIVE ↓",
      },
    ],
  },

  // =========================================================================
  // KINETIC LAB — DEEP DIVE #2: CHLADNI RESONANCE & SOUND GEOMETRY
  // =========================================================================
  {
    id: "narrative-physics-sound-geometry",
    slug: "resonance-and-sound-geometry-deep-dive",
    channel: "physics",
    brandName: "KINETIC LAB",
    accentHex: "#f472b6",
    title: "How Pure Sound Frequencies Sculpt Matter (Chladni & Resonance Deep Dive)",
    descriptionLead:
      "How can an invisible sound wave organize 2,600 chaotic sand grains into razor-sharp mathematical geometry — and shatter solid glass or sway bridges? In this 4-act physics deep dive, we sweep from 432 Hz to 4,096 Hz, map standing-wave nodal lines, and simulate catastrophic resonance.",
    tags: ["chladni plate", "cymatics", "resonance", "standing waves", "kinetic lab"],
    categoryId: "28",
    nextEpisodeTeaser: "Next up on Kinetic Lab: 1,000 Spheres vs Spinning Gears — Probability Meets Chaos.",
    beats: [
      {
        id: "s1-hook-1",
        actIndex: 0,
        actKind: "hook",
        actTitle: "1. Sound Made Visible",
        visualPhase: "sand-scatter-432",
        caption: "2,600 GRAINS · 432 HZ",
        text: "Scatter two thousand six hundred golden sand grains randomly across a dark metal plate, then play one pure frequency.",
      },
      {
        id: "s1-hook-2",
        actIndex: 0,
        actKind: "hook",
        actTitle: "1. Sound Made Visible",
        visualPhase: "sand-lock-864",
        caption: "INSTANT SACRED GEOMETRY",
        text: "In less than two seconds, invisible acoustic waves sweep the chaos into symmetrical geometric art that looks engineered by hand.",
      },
      {
        id: "s1-hook-3",
        actIndex: 0,
        actKind: "hook",
        actTitle: "1. Sound Made Visible",
        visualPhase: "sand-lock-1440",
        caption: "ONLY AT EXACT FREQUENCIES",
        text: "Change the pitch by just a few Hertz and the pattern dissolves. Hit the next natural frequency, and an even sharper mandala snaps into focus.",
      },
      {
        id: "s2-bridge",
        actIndex: 1,
        actKind: "mechanism",
        actTitle: "2. Standing Waves & Silent Nodes",
        visualPhase: "wave-cross-section",
        caption: "ANTINODES VS SILENT NODES",
        isBridge: true,
        text: "To see why sand obeys sound, slice the vibrating metal plate sideways and watch the standing wave underneath.",
      },
      {
        id: "s2-nodes",
        actIndex: 1,
        actKind: "mechanism",
        actTitle: "2. Standing Waves & Silent Nodes",
        visualPhase: "wave-cross-section",
        caption: "GRAINS FLEE VIBRATION",
        text: "Waves bouncing off the plate's edges collide and cancel along fixed dead zones called nodal lines. Everywhere else, the metal bucks violently upward, launching sand until it falls into the silent valleys.",
      },
      {
        id: "s2-equation",
        actIndex: 1,
        actKind: "mechanism",
        actTitle: "2. Standing Waves & Silent Nodes",
        visualPhase: "chladni-equation",
        caption: "cos(mπx)cos(nπy) = cos(nπx)cos(mπy)",
        text: "Each stable pattern is an exact mathematical eigenmode controlled by two whole numbers, m and n. Higher frequencies pack more half-waves across the plate, multiplying the geometric complexity.",
      },
      {
        id: "s3-bridge",
        actIndex: 2,
        actKind: "failure",
        actTitle: "3. When Resonance Turns Destructive",
        visualPhase: "resonance-buildup",
        caption: "AMPLITUDE RUNAWAY",
        isBridge: true,
        text: "On a Chladni plate, resonance makes harmless art. Now watch what happens when energy keeps pumping into a structure at its exact natural frequency.",
      },
      {
        id: "s3-shatter",
        actIndex: 2,
        actKind: "failure",
        actTitle: "3. When Resonance Turns Destructive",
        visualPhase: "resonance-shatter",
        caption: "RESONANCE SHATTER POINT",
        text: "Every wave arrives in perfect phase with the previous oscillation, stacking energy cycle after cycle. Without damping, amplitude spikes past the material's elastic limit until glass shatters or steel buckles.",
      },
      {
        id: "s4-bridge",
        actIndex: 3,
        actKind: "comparison",
        actTitle: "4. 432 Hz to 4,096 Hz Spectrum",
        visualPhase: "mode-gallery-4way",
        caption: "4 EIGENMODES SIDE BY SIDE",
        isBridge: true,
        text: "Now compare all four resonant eigenmodes side by side as we sweep across three full octaves of sound.",
      },
      {
        id: "s4-compare",
        actIndex: 3,
        actKind: "comparison",
        actTitle: "4. 432 Hz to 4,096 Hz Spectrum",
        visualPhase: "mode-gallery-4way",
        caption: "HIGHER PITCH = FINER LATTICE",
        text: "From simple cross-waves at four hundred thirty-two Hertz to intricate crystalline lattices at four thousand ninety-six Hertz, the exact same wave equation governs violin tops, laser cavities, and quantum orbitals.",
      },
      {
        id: "s4-outro",
        actIndex: 3,
        actKind: "comparison",
        actTitle: "4. 432 Hz to 4,096 Hz Spectrum",
        visualPhase: "series-outro",
        caption: "SUBSCRIBE FOR NEXT SIMULATION",
        text: "Sound isn't just something you hear — it is moving geometry. Subscribe to Kinetic Lab for our next 60fps physics deep dive.",
      },
    ],
    derivedShorts: [
      {
        shortIndex: 0,
        slugSuffix: "short-1-sound-geometry",
        hook: "SOUND TURNS SAND TO ART",
        partLabel: "PART 1 / 3 · FULL 4-MIN VIDEO ↓",
        title: "2,600 Sand Grains Snapping Into Sound Geometry #shorts",
        descriptionLead:
          "Play 432 Hz, 864 Hz, and 1,440 Hz on a vibrating metal plate and watch random sand snap into mathematical symmetry.",
        tags: ["chladni", "cymatics", "sound waves", "shorts"],
        beatIds: ["s1-hook-1", "s1-hook-2", "s1-hook-3"],
        ctaText: "PART 2: WHY IT HAPPENS → SUBSCRIBE",
      },
      {
        shortIndex: 1,
        slugSuffix: "short-2-silent-nodes",
        hook: "THE HIDDEN EQUATION IN SOUND",
        partLabel: "PART 2 / 3 · FULL 4-MIN VIDEO ↓",
        title: "Why Sand Only Hides on Silent Nodal Lines #shorts",
        descriptionLead:
          "Slice the metal plate sideways: sand gets launched off vibrating antinodes and settles along the silent standing-wave nodes.",
        tags: ["standing waves", "physics", "chladni equation", "shorts"],
        beatIds: ["s2-bridge", "s2-nodes", "s2-equation"],
        ctaText: "PART 3: RESONANCE SHATTER → SUBSCRIBE",
      },
      {
        shortIndex: 2,
        slugSuffix: "short-3-resonance-shatter",
        hook: "WHEN SOUND SHATTERS SOLID MATTER",
        partLabel: "PART 3 / 3 · FULL 4-MIN VIDEO ↓",
        title: "How One Pure Frequency Shatters Solid Structures #shorts",
        descriptionLead:
          "When every wave arrives in phase with a structure's natural frequency, amplitude snowballs until the elastic limit snaps.",
        tags: ["resonance", "physics", "waves", "shorts"],
        beatIds: ["s3-bridge", "s3-shatter", "s4-compare"],
        ctaText: "WATCH FULL 4-MIN DEEP DIVE ↓",
      },
    ],
  },

  // =========================================================================
  // CLEAR MECHANICS — DEEP DIVE #3: JET ENGINE (TURBOFAN)
  // =========================================================================
  {
    id: "narrative-explainer-jet-engine",
    slug: "jet-engine-deep-dive",
    channel: "explainer",
    brandName: "CLEAR MECHANICS",
    accentHex: "#38bdf8",
    title: "How a Jet Engine Sucks In 1 Ton of Air Every Second (3D Cutaway Deep Dive)",
    descriptionLead:
      "Every single second, a modern airliner turbofan swallows over a ton of freezing air, compresses it 40x, and fires it through turbine blades glowing hotter than their own melting point. In this 4-act deep dive, we dissect Suck-Squeeze-Bang-Blow, compressor stalls, and Turbofan vs Ramjet vs Rocket engines.",
    tags: ["jet engine", "turbofan", "aviation engineering", "how it works", "clear mechanics"],
    categoryId: "27",
    nextEpisodeTeaser: "Next up on Clear Mechanics: How a 660-Ton Steel Ball Saves Skyscrapers from Earthquakes.",
    beats: [
      {
        id: "j1-hook-1",
        actIndex: 0,
        actKind: "hook",
        actTitle: "1. The 1-Ton-Per-Second Vacuum",
        visualPhase: "fan-intake-overview",
        caption: "1.2 TONS OF AIR / SECOND",
        text: "Every single second at takeoff, one giant airliner turbofan swallows more than a full metric ton of freezing air.",
      },
      {
        id: "j1-hook-2",
        actIndex: 0,
        actKind: "hook",
        actTitle: "1. The 1-Ton-Per-Second Vacuum",
        visualPhase: "bypass-ratio-cutaway",
        caption: "85% NEVER TOUCHES FIRE",
        text: "Here is the shock most passengers never realize: over eighty-five percent of that air completely bypasses the fire core, acting like a ducted giant propeller.",
      },
      {
        id: "j1-hook-3",
        actIndex: 0,
        actKind: "hook",
        actTitle: "1. The 1-Ton-Per-Second Vacuum",
        visualPhase: "hot-core-glow",
        caption: "HOTTER THAN MELTING POINT",
        text: "Meanwhile, the fifteen percent that enters the core burns hotter than the melting point of the nickel turbine blades themselves. How does it survive?",
      },
      {
        id: "j2-bridge",
        actIndex: 1,
        actKind: "mechanism",
        actTitle: "2. Suck, Squeeze, Bang, Blow",
        visualPhase: "compressor-stages",
        caption: "40:1 PRESSURE SQUEEZE",
        isBridge: true,
        text: "To see how continuous thrust works with zero pistons, follow a single air molecule straight through the four core stages.",
      },
      {
        id: "j2-compressor",
        actIndex: 1,
        actKind: "mechanism",
        actTitle: "2. Suck, Squeeze, Bang, Blow",
        visualPhase: "compressor-stages",
        caption: "14 SPINNING BLADE STAGES",
        text: "First, alternating rows of spinning rotors and stationary stators squeeze the air to forty times atmospheric pressure, heating it to six hundred degrees before a single drop of fuel even enters.",
      },
      {
        id: "j2-combustor",
        actIndex: 1,
        actKind: "mechanism",
        actTitle: "2. Suck, Squeeze, Bang, Blow",
        visualPhase: "combustor-flame",
        caption: "CONTINUOUS 1,700°C RING",
        text: "Next, fuel nozzles spray a fine mist into an annular combustion ring. Unlike a car engine that explodes in pulses, a jet combustor burns continuously like a locked tornado.",
      },
      {
        id: "j2-turbine-cooling",
        actIndex: 1,
        actKind: "mechanism",
        actTitle: "2. Suck, Squeeze, Bang, Blow",
        visualPhase: "blade-cooling-pores",
        caption: "MICROSCOPIC AIR FILM",
        text: "That superheated gas slams into single-crystal turbine blades spinning at ten thousand RPM. Microscopic laser-drilled pores bleed cooler air across each blade's skin, forming an invisible thermal shield.",
      },
      {
        id: "j3-bridge",
        actIndex: 2,
        actKind: "failure",
        actTitle: "3. Compressor Stall & Surge",
        visualPhase: "compressor-stall",
        caption: "WHEN AIRFLOW REVERSES",
        isBridge: true,
        text: "All of that power depends on air moving strictly one way. Now watch what happens when airflow disrupts and the engine chokes.",
      },
      {
        id: "j3-stall",
        actIndex: 2,
        actKind: "failure",
        actTitle: "3. Compressor Stall & Surge",
        visualPhase: "compressor-stall",
        caption: "SUPERSONIC BACKFIRE",
        text: "If crosswinds or rapid throttle changes stall the compressor blades, forty atmospheres of hot gas violently blasts backward out the front intake — triggering loud booms and flames.",
      },
      {
        id: "j3-containment",
        actIndex: 2,
        actKind: "failure",
        actTitle: "3. Compressor Stall & Surge",
        visualPhase: "blade-containment",
        caption: "KEVLAR CONTAINMENT RING",
        text: "And if a titanium fan blade snaps at full thrust, a Kevlar-wrapped containment ring must trap a missile-speed shard inside the nacelle so it never pierces the cabin.",
      },
      {
        id: "j4-bridge",
        actIndex: 3,
        actKind: "comparison",
        actTitle: "4. Turbofan vs Ramjet vs Rocket",
        visualPhase: "propulsion-compare",
        caption: "3 PROPULSION GIANTS",
        isBridge: true,
        text: "Why do airliners use giant turbofans while Mach 5 jets use ramjets and spacecraft use rockets? Compare all three side by side.",
      },
      {
        id: "j4-compare",
        actIndex: 3,
        actKind: "comparison",
        actTitle: "4. Turbofan vs Ramjet vs Rocket",
        visualPhase: "propulsion-compare",
        caption: "EFFICIENCY VS MACH 25",
        text: "Turbofans dominate subsonic efficiency by moving huge masses of bypass air. Ramjets ditch moving blades entirely above Mach 3, while rockets carry their own oxygen to fire in the vacuum of space.",
      },
      {
        id: "j4-outro",
        actIndex: 3,
        actKind: "comparison",
        actTitle: "4. Turbofan vs Ramjet vs Rocket",
        visualPhase: "series-outro",
        caption: "SUBSCRIBE FOR NEXT DEEP DIVE",
        text: "A jet engine is controlled lightning wrapped in aerospace alloys. Subscribe to Clear Mechanics for our next 3D engineering deep dive.",
      },
    ],
    derivedShorts: [
      {
        shortIndex: 0,
        slugSuffix: "short-1-bypass-secret",
        hook: "85% OF JET AIR SKIPS FIRE",
        partLabel: "PART 1 / 3 · FULL 4-MIN VIDEO ↓",
        title: "The Surprising Secret Inside Every Airliner Jet Engine #shorts",
        descriptionLead:
          "Over 85% of the air swallowed by a turbofan never enters the combustion chamber — see why bypass air creates most of the thrust.",
        tags: ["jet engine", "turbofan", "aviation", "shorts"],
        beatIds: ["j1-hook-1", "j1-hook-2", "j2-compressor"],
        ctaText: "PART 2: WHY BLADES DON'T MELT → SUBSCRIBE",
      },
      {
        shortIndex: 1,
        slugSuffix: "short-2-blade-cooling",
        hook: "HOTTER THAN MELTING POINT",
        partLabel: "PART 2 / 3 · FULL 4-MIN VIDEO ↓",
        title: "How Jet Blades Survive Gas Hotter Than Their Melting Point #shorts",
        descriptionLead:
          "Microscopic laser-drilled cooling pores bleed a thin film of air over single-crystal turbine blades spinning at 10,000 RPM.",
        tags: ["turbine blades", "jet engine", "engineering", "shorts"],
        beatIds: ["j1-hook-3", "j2-combustor", "j2-turbine-cooling"],
        ctaText: "PART 3: COMPRESSOR STALL → SUBSCRIBE",
      },
      {
        shortIndex: 2,
        slugSuffix: "short-3-compressor-stall",
        hook: "WHAT IS A JET COMPRESSOR STALL?",
        partLabel: "PART 3 / 3 · FULL 4-MIN VIDEO ↓",
        title: "When 40 Atmospheres Blast Backward Out of a Jet Engine #shorts",
        descriptionLead:
          "Watch how airflow reversal triggers a violent compressor surge — and how Turbofans compare to Ramjets and Rockets.",
        tags: ["compressor stall", "jet surge", "aviation", "shorts"],
        beatIds: ["j3-bridge", "j3-stall", "j4-compare"],
        ctaText: "WATCH FULL 4-MIN DEEP DIVE ↓",
      },
    ],
  },

  // =========================================================================
  // KINETIC LAB — DEEP DIVE #3: BLACK HOLE GRAVITY & SPAGHETTIFICATION
  // =========================================================================
  {
    id: "narrative-physics-black-hole-gravity",
    slug: "black-hole-gravity-deep-dive",
    channel: "physics",
    brandName: "KINETIC LAB",
    accentHex: "#f472b6",
    title: "What Actually Happens If You Fall Into a Black Hole? (60fps Gravity Deep Dive)",
    descriptionLead:
      "Approach a black hole's event horizon and spacetime bends light into glowing rings while time itself slows to a crawl. In this 4-act physics deep dive, we simulate Schwarzschild orbits, gravitational lensing, tidal spaghettification, and compare Earth, Sun, and Sagittarius A*.",
    tags: ["black hole", "general relativity", "spaghettification", "physics simulation", "kinetic lab"],
    categoryId: "28",
    nextEpisodeTeaser: "Next up on Kinetic Lab: 1,000 Spheres vs Spinning Gears — Probability Meets Chaos.",
    beats: [
      {
        id: "b1-hook-1",
        actIndex: 0,
        actKind: "hook",
        actTitle: "1. The Point of No Return",
        visualPhase: "event-horizon-glow",
        caption: "ESCAPE VELOCITY > LIGHT",
        text: "A black hole is not a cosmic vacuum cleaner — it is a region where mass bends spacetime so steeply that even light cannot climb out.",
      },
      {
        id: "b1-hook-2",
        actIndex: 0,
        actKind: "hook",
        actTitle: "1. The Point of No Return",
        visualPhase: "gravitational-lensing",
        caption: "LIGHT BENDS AROUND IT",
        text: "Look closely at the glowing halo: you are actually seeing the back side of the accretion disc bent over the top and bottom by pure gravity.",
      },
      {
        id: "b1-hook-3",
        actIndex: 0,
        actKind: "hook",
        actTitle: "1. The Point of No Return",
        visualPhase: "photon-sphere",
        caption: "PHOTON SPHERE ORBIT",
        text: "Just outside the event horizon sits the photon sphere, where light beams orbit in circles — meaning if you hovered there, you could see the back of your own head.",
      },
      {
        id: "b2-bridge",
        actIndex: 1,
        actKind: "mechanism",
        actTitle: "2. Spacetime Curvature & Accretion",
        visualPhase: "spacetime-funnel-3d",
        caption: "3D GRAVITY WELL",
        isBridge: true,
        text: "To understand why orbiting matter heats up brighter than a billion stars, visualize spacetime curving into a 3D funnel.",
      },
      {
        id: "b2-accretion",
        actIndex: 1,
        actKind: "mechanism",
        actTitle: "2. Spacetime Curvature & Accretion",
        visualPhase: "accretion-spiral",
        caption: "FRICTION AT 30% LIGHT SPEED",
        text: "As gas spirals inward, conservation of angular momentum whips inner rings near the speed of light. Violent friction superheats the plasma to millions of degrees, firing relativistic jets from the poles.",
      },
      {
        id: "b2-time-dilation",
        actIndex: 1,
        actKind: "mechanism",
        actTitle: "2. Spacetime Curvature & Accretion",
        visualPhase: "time-dilation-clocks",
        caption: "TIME SLOWS TO ZERO",
        text: "At the same time, Einstein's general relativity slows your clock compared to a distant observer. To someone watching from afar, you appear to freeze and fade red right at the horizon.",
      },
      {
        id: "b3-bridge",
        actIndex: 2,
        actKind: "failure",
        actTitle: "3. Tidal Spaghettification",
        visualPhase: "spaghettification-stretch",
        caption: "GRAVITY GRADIENT RIP",
        isBridge: true,
        text: "Crossing the horizon might feel quiet at first for a supermassive giant — until the tidal gravity gradient hits its breaking point.",
      },
      {
        id: "b3-stretch",
        actIndex: 2,
        actKind: "failure",
        actTitle: "3. Tidal Spaghettification",
        visualPhase: "spaghettification-stretch",
        caption: "STRETCHED INTO ATOMS",
        text: "Because gravity grows with inverse-square distance, the pull on your feet becomes millions of times stronger than on your head. Matter stretches vertically and crushes sideways into a single-atom stream.",
      },
      {
        id: "b4-bridge",
        actIndex: 3,
        actKind: "comparison",
        actTitle: "4. Earth vs Sun vs Sagittarius A*",
        visualPhase: "schwarzschild-scale",
        caption: "SCHWARZSCHILD RADII",
        isBridge: true,
        text: "How small would you have to crush ordinary objects to turn them into black holes? Compare three cosmic scales side by side.",
      },
      {
        id: "b4-compare",
        actIndex: 3,
        actKind: "comparison",
        actTitle: "4. Earth vs Sun vs Sagittarius A*",
        visualPhase: "schwarzschild-scale",
        caption: "9 MM VS 3 KM VS 12 MILLION KM",
        text: "Crush Earth to a nine-millimeter marble and it collapses into a black hole. The Sun would shrink to three kilometers, while our galaxy's Sagittarius A* spans twelve million kilometers across.",
      },
      {
        id: "b4-outro",
        actIndex: 3,
        actKind: "comparison",
        actTitle: "4. Earth vs Sun vs Sagittarius A*",
        visualPhase: "series-outro",
        caption: "SUBSCRIBE FOR NEXT DEEP DIVE",
        text: "Black holes are nature's ultimate physics laboratory. Subscribe to Kinetic Lab for our next 60fps simulation deep dive.",
      },
    ],
    derivedShorts: [
      {
        shortIndex: 0,
        slugSuffix: "short-1-photon-sphere",
        hook: "SEE THE BACK OF YOUR HEAD",
        partLabel: "PART 1 / 3 · FULL 4-MIN VIDEO ↓",
        title: "Why Light Orbits in Circles Around a Black Hole #shorts",
        descriptionLead:
          "At the photon sphere, gravity bends light into closed orbits — bending the back of the accretion disc right into your view.",
        tags: ["black hole", "photon sphere", "relativity", "shorts"],
        beatIds: ["b1-hook-1", "b1-hook-2", "b1-hook-3"],
        ctaText: "PART 2: TIME STOPS → SUBSCRIBE",
      },
      {
        shortIndex: 1,
        slugSuffix: "short-2-spaghettification",
        hook: "WHAT SPAGHETTIFICATION DOES",
        partLabel: "PART 2 / 3 · FULL 4-MIN VIDEO ↓",
        title: "Why a Black Hole Stretches You Into a Single Atom Stream #shorts",
        descriptionLead:
          "Inverse-square tidal forces pull your feet millions of times harder than your head — watch spaghettification simulated live.",
        tags: ["spaghettification", "black hole", "physics", "shorts"],
        beatIds: ["b2-time-dilation", "b3-bridge", "b3-stretch"],
        ctaText: "PART 3: EARTH TO 9MM → SUBSCRIBE",
      },
      {
        shortIndex: 2,
        slugSuffix: "short-3-earth-9mm",
        hook: "CRUSH EARTH TO 9 MILLIMETERS",
        partLabel: "PART 3 / 3 · FULL 4-MIN VIDEO ↓",
        title: "Earth vs Sun vs Sagittarius A*: Black Hole Size Scale #shorts",
        descriptionLead:
          "9 millimeters for Earth, 3 kilometers for the Sun, 12 million kilometers for our galaxy's supermassive giant.",
        tags: ["schwarzschild radius", "space scale", "black hole", "shorts"],
        beatIds: ["b4-bridge", "b4-compare", "b4-outro"],
        ctaText: "WATCH FULL 4-MIN DEEP DIVE ↓",
      },
    ],
  },
];

export function pickNarrativeLongform(
  channel: ChannelId,
  publishedIds: Set<string>,
): NarrativeLongformSpec | null {
  for (const spec of NARRATIVE_LONGFORM_SPECS) {
    if (spec.channel !== channel) continue;
    if (publishedIds.has(spec.id)) continue;
    const htmlPath = resolve("niches", "longform-deep-dive", `${spec.slug}.html`);
    if (existsSync(htmlPath)) return spec;
  }
  return null;
}

export function getNarrativeLongformBySlug(slug: string): NarrativeLongformSpec | null {
  return NARRATIVE_LONGFORM_SPECS.find((s) => s.slug === slug) ?? null;
}
