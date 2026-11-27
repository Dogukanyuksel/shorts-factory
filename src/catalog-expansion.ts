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
  { brandName: string; guardNeedle: string; ytHandle: string; playlistTitle: string; accentHex: string }
> = {
  wealth: {
    brandName: "Wealth Mechanics",
    guardNeedle: "wealth mechanics",
    ytHandle: "@wealthmechanicsshorts",
    playlistTitle: "Compound Math & Money Visualized | Wealth Mechanics",
    accentHex: "#10b981",
  },
  bio: {
    brandName: "Bio Mechanics",
    guardNeedle: "bio mechanics",
    ytHandle: "@biomechanicsshorts",
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
];

export function pickNextExpansionJob(
  channel: ExpansionChannelId,
  publishedIds: Set<string>,
): ExpansionJob | null {
  return EXPANSION_JOBS.find((j) => j.channel === channel && !publishedIds.has(j.id)) ?? null;
}
