export type ExpansionChannelId = "wealth" | "bio";

export interface ExpansionJob {
  id: string;
  channel: ExpansionChannelId;
  episode: string;
  title: string;
  description: string;
  tags: string[];
  categoryId: string;
}

export const EXPANSION_CHANNEL_META: Record<
  ExpansionChannelId,
  { brandName: string; guardNeedle: string; ytHandle: string; igHandle: string; playlistTitle: string; accentHex: string }
> = {
  wealth: {
    brandName: "Wealth Mechanics",
    guardNeedle: "wealth mechanics",
    ytHandle: "@wealthmechanicsshorts",
    igHandle: "wealthmechanics.hq",
    playlistTitle: "Compound Math & Money Visualized | Wealth Mechanics",
    accentHex: "#10b981",
  },
  bio: {
    brandName: "Bio Mechanics",
    guardNeedle: "bio mechanics",
    ytHandle: "@biomechanicshq",
    igHandle: "biomechanics.hq",
    playlistTitle: "Inside The Human Body | Bio Mechanics",
    accentHex: "#fb7185",
  },
};

export const EXPANSION_JOBS: ExpansionJob[] = [
  // ── WEALTH MECHANICS ($12–$22 RPM) ──
  {
    id: "wealth-compound-20-vs-35",
    channel: "wealth",
    episode: "wealth-compound-20-vs-35",
    title: "$100/Mo at Age 20 vs $500/Mo at Age 35: Who Wins? #shorts",
    description:
      "Time beats money in compound math: investing just $100/month starting at 20 outperforms $500/month starting at 35 by hundreds of thousands of dollars — while contributing 3x less cash.\n\n(Educational math simulation only — not financial advice.)\n\n#shorts #compoundinterest #personalfinance #investing",
    tags: ["compound interest", "investing math", "personal finance", "wealth mechanics", "shorts"],
    categoryId: "27",
  },
  {
    id: "wealth-inflation-erosion",
    channel: "wealth",
    episode: "wealth-inflation-erosion",
    title: "Why $10,000 Sitting in Cash Quietly Loses Half Its Power #shorts",
    description:
      "At 3.8% annual inflation, $10,000 in cash still says $10,000 on paper — yet loses over half its real purchasing power in 20 years while invested capital compounds upward.\n\n(Educational math visualization only — not financial advice.)\n\n#shorts #inflation #money #finance",
    tags: ["inflation explained", "purchasing power", "personal finance", "wealth math", "shorts"],
    categoryId: "27",
  },
  {
    id: "wealth-tax-brackets-myth",
    channel: "wealth",
    episode: "wealth-tax-brackets-myth",
    title: "The Tax Bracket Myth That Costs People Thousands #shorts",
    description:
      "Can a raise ever make you take home LESS money? No — marginal tax brackets work like separate buckets. Watch how ONLY your top dollars get taxed at the higher rate.\n\n#shorts #taxbrackets #money #personalfinance",
    tags: ["tax brackets", "marginal tax", "personal finance", "money myth", "shorts"],
    categoryId: "27",
  },
  {
    id: "wealth-luxury-vs-assets",
    channel: "wealth",
    episode: "wealth-luxury-vs-assets",
    title: "Same $30,000. Luxury First vs Assets First (5-Year Result) #shorts",
    description:
      "Two people start with $30,000: one buys a brand-new car that drops to $11,200 in 5 years, while the other buys a cash-flowing asset that grows to $48,500 and funds the car later.\n\n(Educational math simulation only — not financial advice.)\n\n#shorts #wealth #assets #personalfinance",
    tags: ["luxury vs assets", "assets vs liabilities", "personal finance", "wealth mechanics", "shorts"],
    categoryId: "27",
  },
  {
    id: "wealth-50-30-20-rule",
    channel: "wealth",
    episode: "wealth-50-30-20-rule",
    title: "The 50/30/20 Money Split That Builds Wealth on Any Salary #shorts",
    description:
      "Split every paycheck into 50% Needs, 30% Wants, and 20% Future — and watch how investing just $1,000/month compounds to $759,000 in 20 years even if your salary never changes.\n\n(Educational math simulation only — not financial advice.)\n\n#shorts #budgeting #personalfinance #wealth",
    tags: ["50 30 20 rule", "budgeting", "compound interest", "personal finance", "shorts"],
    categoryId: "27",
  },
  {
    id: "wealth-credit-card-trap",
    channel: "wealth",
    episode: "wealth-credit-card-trap",
    title: "Why Paying the Minimum on a $5,000 Credit Card Takes 16 Years #shorts",
    description:
      "At 24% APR, minimum payments barely dent your balance because interest refills the tank every single month. Adding just $100/mo extra cuts 12+ years and $6,300+ in interest.\n\n(Educational math simulation only — not financial advice.)\n\n#shorts #creditcard #debtfree #personalfinance",
    tags: ["credit card debt", "minimum payment trap", "24% apr", "personal finance", "shorts"],
    categoryId: "27",
  },
  {
    id: "wealth-rule-of-72",
    channel: "wealth",
    episode: "wealth-rule-of-72",
    title: "The 3-Second Math Trick That Predicts When Your Money Doubles #shorts",
    description:
      "Divide 72 by your annual return rate to know instantly when your money doubles: 1% takes 72 years, 4% takes 18 years, and 9% doubles every 8 years — turning $10K into $157K in 32 years.\n\n(Educational math visualization only — not financial advice.)\n\n#shorts #ruleof72 #investing #compoundinterest",
    tags: ["rule of 72", "compound math", "investing", "wealth mechanics", "shorts"],
    categoryId: "27",
  },
  {
    id: "wealth-rent-vs-buy-math",
    channel: "wealth",
    episode: "wealth-rent-vs-buy-math",
    title: "Renting vs Buying a $400,000 House: The Hidden Math #shorts",
    description:
      "Most people compare rent only to a mortgage payment — ignoring interest, property taxes, maintenance, and the opportunity cost of an $80,000 down payment. Watch where the real break-even crossover happens.\n\n(Educational math simulation only — not financial advice.)\n\n#shorts #rentvsbuy #realestate #personalfinance",
    tags: ["rent vs buy", "mortgage math", "home buying", "personal finance", "shorts"],
    categoryId: "27",
  },
  {
    id: "wealth-dividend-snowball",
    channel: "wealth",
    episode: "wealth-dividend-snowball",
    title: "How a Dividend Snowball Quietly Replaces Your Paycheck #shorts",
    description:
      "When dividends automatically buy more shares (DRIP), every payout generates its own future payouts — turning a tiny $150/year trickle into $18,000+/year passive income over 30 years.\n\n(Educational math visualization only — not financial advice.)\n\n#shorts #dividends #passiveincome #investing",
    tags: ["dividend snowball", "drip investing", "passive income", "compound interest", "shorts"],
    categoryId: "27",
  },
  {
    id: "wealth-sp500-30-years",
    channel: "wealth",
    episode: "wealth-sp500-30-years",
    title: "What Happened to $10,000 in the S&P 500 Through Every Crash #shorts",
    description:
      "2000 Dot-Com (-45%), 2008 Crisis (-50%), 2020 Crash (-34%): panic sellers locked in losses while staying invested turned $10,000 into $170,000+ over 30 years.\n\n(Educational historical math visualization only — not financial advice.)\n\n#shorts #sp500 #stockmarket #investing",
    tags: ["sp500", "stock market crash", "long term investing", "index funds", "shorts"],
    categoryId: "27",
  },

  // ── BIO MECHANICS ($8–$14 RPM) ──
  {
    id: "bio-heart-100k-beats",
    channel: "bio",
    episode: "bio-heart-100k-beats",
    title: "How Your Heart Pumps 100,000 Times a Day Without Resting #shorts",
    description:
      "Four muscular chambers, four one-way valves, and a built-in electrical pacemaker pump over 7,200 liters of blood through your body every single day without ever pausing.\n\n#shorts #humanbody #anatomy #science",
    tags: ["human heart", "how the heart works", "anatomy animation", "bio mechanics", "shorts"],
    categoryId: "28",
  },
  {
    id: "bio-caffeine-brain",
    channel: "bio",
    episode: "bio-caffeine-brain",
    title: "How Caffeine Actually Tricks Your Brain (And Why You Crash) #shorts",
    description:
      "Caffeine doesn't create new energy — it impersonates adenosine and plugs your brain's sleepiness receptors while tiredness quietly piles up behind the dam.\n\n#shorts #caffeine #neuroscience #humanbody",
    tags: ["how caffeine works", "adenosine", "brain science", "biology", "shorts"],
    categoryId: "28",
  },
  {
    id: "bio-immune-virus-hunt",
    channel: "bio",
    episode: "bio-immune-virus-hunt",
    title: "How Your Immune System Hunts Down a Virus in Real Time #shorts",
    description:
      "From frontline macrophages engulfing spike proteins to helper T-cells unleashing millions of custom Y-shaped antibodies — watch your microscopic defense army in action.\n\n#shorts #immunesystem #biology #science",
    tags: ["immune system", "antibodies", "virus", "medical animation", "shorts"],
    categoryId: "28",
  },
  {
    id: "bio-sleep-brain-wash",
    channel: "bio",
    episode: "bio-sleep-brain-wash",
    title: "What Actually Happens Inside Your Brain When You Sleep #shorts",
    description:
      "During deep sleep, your brain cells shrink by up to 60%, opening microscopic channels so cerebrospinal fluid can flush out toxic beta-amyloid waste — your brain's built-in dishwasher.\n\n#shorts #sleep #brain #neuroscience",
    tags: ["glymphatic system", "why we sleep", "brain science", "human body", "shorts"],
    categoryId: "28",
  },
  {
    id: "bio-sugar-60-minutes",
    channel: "bio",
    episode: "bio-sugar-60-minutes",
    title: "What One Can of Soda Does to Your Body in 60 Minutes #shorts",
    description:
      "Watch 10 teaspoons (39g) of liquid sugar hit your bloodstream in real time: rapid glucose spike, pancreas insulin surge, liver fat conversion, and the minute-55 energy crash.\n\n#shorts #sugar #healthscience #humanbody",
    tags: ["sugar in the body", "insulin spike", "soda effects", "biology animation", "shorts"],
    categoryId: "28",
  },
  {
    id: "bio-lungs-11000-liters",
    channel: "bio",
    episode: "bio-lungs-11000-liters",
    title: "Inside Your Lungs: How 480 Million Air Sacs Power Every Breath #shorts",
    description:
      "Every breath sends air down your bronchial tree into 480 million microscopic alveoli where oxygen crosses a 0.5-micron wall straight into red blood cells — 11,000 liters every single day.\n\n#shorts #lungs #anatomy #biology",
    tags: ["how lungs work", "alveoli", "respiratory system", "human anatomy", "shorts"],
    categoryId: "28",
  },
  {
    id: "bio-muscle-growth-tears",
    channel: "bio",
    episode: "bio-muscle-growth-tears",
    title: "How Lifting Weights Actually Rebuilds Bigger Muscles #shorts",
    description:
      "Muscles don't grow in the gym — heavy tension creates microscopic Z-disc tears that summon satellite stem cells during sleep and protein synthesis to fuse and thicken each fiber.\n\n#shorts #musclegrowth #hypertrophy #humanbody",
    tags: ["how muscles grow", "hypertrophy", "satellite cells", "biology", "shorts"],
    categoryId: "28",
  },
  {
    id: "bio-adrenaline-0-to-100",
    channel: "bio",
    episode: "bio-adrenaline-0-to-100",
    title: "What Happens Inside Your Body 0.2 Seconds After Fear Hits #shorts",
    description:
      "In 200 milliseconds, your amygdala fires down your spine to flood your bloodstream with adrenaline — dilating pupils, spiking heart rate to 150 BPM, and shunting blood straight to your muscles.\n\n#shorts #adrenaline #fightorflight #neuroscience",
    tags: ["adrenaline rush", "fight or flight", "amygdala", "human body", "shorts"],
    categoryId: "28",
  },
  {
    id: "bio-gut-brain-highway",
    channel: "bio",
    episode: "bio-gut-brain-highway",
    title: "Why Your Gut Is Literally Called Your Second Brain #shorts",
    description:
      "Over 500 million enteric neurons line your digestive tract, manufacturing 90% of your body's serotonin and sending 80% of all vagus nerve signals upward straight to your brain.\n\n#shorts #gutbrain #microbiome #neuroscience",
    tags: ["gut brain axis", "vagus nerve", "serotonin", "second brain", "shorts"],
    categoryId: "28",
  },
  {
    id: "bio-sitting-psoas-back",
    channel: "bio",
    episode: "bio-sitting-psoas-back",
    title: "Why Sitting All Day Destroys Your Lower Back (The Psoas Pull) #shorts",
    description:
      "Locked at 90 degrees all day, your Psoas Major hip flexor shortens by 25% — then yanks your lumbar spine forward the moment you stand, spiking L4–L5 disc pressure from 100 kg to 185 kg.\n\n#shorts #posture #backpain #biomechanics",
    tags: ["psoas muscle", "lower back pain", "sitting posture", "biomechanics", "shorts"],
    categoryId: "28",
  },
];

export function pickNextExpansionJob(
  channel: ExpansionChannelId,
  publishedIds: Set<string>,
  isEligible?: (job: ExpansionJob) => boolean,
): ExpansionJob | null {
  return (
    EXPANSION_JOBS.find(
      (j) => j.channel === channel && !publishedIds.has(j.id) && (!isEligible || isEligible(j)),
    ) ?? null
  );
}
