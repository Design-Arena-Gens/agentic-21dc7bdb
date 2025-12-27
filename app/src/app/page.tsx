"use client";

import type { ChangeEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

type Tone = "Professional" | "Friendly" | "Bold";

type DailyEntry = {
  id: string;
  date: string;
  headline: string;
  wins: string;
  metrics: string;
  focus: string;
  insight: string;
  gratitude: string;
  callToAction: string;
  tone: Tone;
  hashtags: string[];
  mood: string;
};

const STORAGE_KEY = "linkedin-daily-entries";

const CTA_OPTIONS = [
  "What are you tackling today?",
  "Curious how others are handling similar challenges—drop a note.",
  "If this resonates, let's compare notes.",
  "Open to feedback or intros. Let’s connect.",
];

const TONE_OPENERS: Record<Tone, string> = {
  Professional: "Daily leadership check-in:",
  Friendly: "Hey LinkedIn fam, today's story:",
  Bold: "Momentum report:",
};

const TONE_CLOSERS: Record<Tone, string> = {
  Professional: "Let's keep raising the bar.",
  Friendly: "Rooting for everyone building momentum!",
  Bold: "We move fast and stay loud.",
};

const HASHTAG_CATALOG: Record<string, string[]> = {
  Momentum: ["#DailyUpdate", "#Momentum", "#BuildInPublic"],
  Leadership: ["#Leadership", "#GrowthMindset", "#Teamwork"],
  Product: ["#ProductManagement", "#CustomerVoice", "#UX"],
  Marketing: ["#Marketing", "#ContentStrategy", "#BrandBuilding"],
  Startup: ["#Startups", "#FounderLife", "#ScaleUp"],
  Career: ["#CareerGrowth", "#LearningEveryday", "#ProfessionalDevelopment"],
};

const DAILY_SPARKS = [
  "What unexpected insight did you pick up from a teammate or customer today?",
  "What's one decision you made that the future version of you will thank you for?",
  "Share a small win that hints at a much bigger shift.",
  "How are you keeping your team energized heading into tomorrow?",
  "Call out someone who made your day easier and explain why it mattered.",
];

const emptyEntry = (): DailyEntry => {
  const today = new Date();
  const iso = today.toISOString().slice(0, 10);
  return {
    id: `entry-${today.getTime()}`,
    date: iso,
    headline: `Day ${formatDayCount(today)} momentum`,
    wins: "",
    metrics: "",
    focus: "",
    insight: "",
    gratitude: "",
    callToAction: CTA_OPTIONS[0],
    tone: "Professional",
    hashtags: ["#DailyUpdate", "#Momentum"],
    mood: "Energized",
  };
};

function parseISODate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function formatDayCount(date: Date) {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = Math.floor(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
      Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) /
      (1000 * 60 * 60 * 24)
  );
  return diff + 1;
}

function computeStreak(entries: DailyEntry[]) {
  const sorted = [...entries].sort(
    (a, b) => parseISODate(b.date).getTime() - parseISODate(a.date).getTime()
  );
  if (!sorted.length) return 0;

  let streak = 0;
  let cursor = parseISODate(sorted[0].date);
  cursor.setHours(0, 0, 0, 0);

  sorted.forEach((entry) => {
    const entryDate = parseISODate(entry.date);
    entryDate.setHours(0, 0, 0, 0);
    if (entryDate.getTime() === cursor.getTime()) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else if (entryDate.getTime() > cursor.getTime()) {
      cursor = new Date(entryDate);
      cursor.setDate(cursor.getDate() - 1);
      if (entryDate.getTime() === parseISODate(sorted[0].date).getTime()) {
        streak = 1;
      } else {
        streak = 0;
      }
    }
  });

  return streak;
}

function generatePost(entry: DailyEntry) {
  const date = parseISODate(entry.date);
  const friendlyDate = date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const lines = [
    `${TONE_OPENERS[entry.tone]} ${friendlyDate}.`,
    entry.headline && entry.headline.trim().length
      ? entry.headline.trim()
      : "",
    entry.wins && entry.wins.trim().length
      ? `🚀 Wins: ${entry.wins.trim()}`
      : "",
    entry.metrics && entry.metrics.trim().length
      ? `📊 Signal: ${entry.metrics.trim()}`
      : "",
    entry.focus && entry.focus.trim().length
      ? `🎯 Next up: ${entry.focus.trim()}`
      : "",
    entry.insight && entry.insight.trim().length
      ? `💡 Insight: ${entry.insight.trim()}`
      : "",
    entry.gratitude && entry.gratitude.trim().length
      ? `🙏 Gratitude: ${entry.gratitude.trim()}`
      : "",
    entry.callToAction,
    TONE_CLOSERS[entry.tone],
    entry.hashtags.length ? entry.hashtags.join(" ") : "",
  ];

  return lines.filter((line) => line.trim().length > 0).join("\n\n");
}

type State = {
  entry: DailyEntry;
  history: DailyEntry[];
};

function loadInitialState(): State {
  if (typeof window === "undefined") {
    return { entry: emptyEntry(), history: [] };
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return { entry: emptyEntry(), history: [] };
  }

  try {
    const parsed: DailyEntry[] = JSON.parse(stored);
    const todayIso = new Date().toISOString().slice(0, 10);
    const today = parsed.find((item) => item.date === todayIso);
    return { entry: today ? { ...today } : emptyEntry(), history: parsed };
  } catch (error) {
    console.error("Failed to parse stored entries", error);
    return { entry: emptyEntry(), history: [] };
  }
}

export default function Home() {
  const [state, setState] = useState<State>(loadInitialState);
  const { entry, history } = state;
  const [customHashtag, setCustomHashtag] = useState("");
  const [copied, setCopied] = useState(false);

  const setEntry = (
    updater: DailyEntry | ((prev: DailyEntry) => DailyEntry)
  ) => {
    setState((prev) => {
      const nextEntry =
        typeof updater === "function"
          ? (updater as (prev: DailyEntry) => DailyEntry)(prev.entry)
          : updater;
      return { ...prev, entry: nextEntry };
    });
  };

  const setHistory = (
    updater: DailyEntry[] | ((prev: DailyEntry[]) => DailyEntry[])
  ) => {
    setState((prev) => {
      const nextHistory =
        typeof updater === "function"
          ? (updater as (prev: DailyEntry[]) => DailyEntry[])(prev.history)
          : updater;
      return { ...prev, history: nextHistory };
    });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  const postPreview = useMemo(() => generatePost(entry), [entry]);
  const streak = useMemo(() => computeStreak(history), [history]);
  const sparkIndex = useMemo(() => {
    const day = parseISODate(entry.date);
    const seed = day.getDate();
    return seed % DAILY_SPARKS.length;
  }, [entry.date]);

  const handleField =
    (field: keyof DailyEntry) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setEntry((prev) => {
        if (field === "date") {
          const existing = history.find((item) => item.date === value);
          if (existing) {
            return { ...existing };
          }
          return { ...prev, date: value, id: prev.id || `entry-${Date.now()}` };
        }
        return { ...prev, [field]: value };
      });
    };

  const toggleHashtag = (tag: string) => {
    setEntry((prev) => {
      const exists = prev.hashtags.includes(tag);
      return {
        ...prev,
        hashtags: exists
          ? prev.hashtags.filter((value) => value !== tag)
          : [...prev.hashtags, tag],
      };
    });
  };

  const handleSave = () => {
    const payload = { ...entry, id: entry.id || `entry-${Date.now()}` };
    setEntry(payload);
    setHistory((prev) => {
      const updated = prev.filter((item) => item.date !== payload.date);
      return [...updated, payload];
    });
  };

  const handleCopy = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    await navigator.clipboard.writeText(postPreview);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUseHistory = (historic: DailyEntry) => {
    setEntry({ ...historic });
  };

  const handleNew = () => {
    const fresh = emptyEntry();
    setEntry(fresh);
  };

  const handleCustomHashtag = () => {
    const value = customHashtag.trim();
    if (!value) return;
    toggleHashtag(value.startsWith("#") ? value : `#${value}`);
    setCustomHashtag("");
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(circle_at_top,#1e293b,transparent_60%)] pb-20 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-12 lg:flex-row">
        <section className="flex-1 space-y-6">
          <header className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-blue-300">
                  LinkedIn Daily
                </p>
                <h1 className="text-3xl font-semibold text-white md:text-4xl">
                  Share your momentum in minutes
                </h1>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-blue-400/40 bg-blue-400/10 px-5 py-2 text-sm text-blue-200">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                {streak ? `Streak: ${streak} day${streak > 1 ? "s" : ""}` : "Start your streak"}
              </div>
            </div>
            <p className="mt-4 max-w-2xl text-sm text-slate-300">
              Convert your daily highlights into a polished LinkedIn Page update. Capture
              wins, signal momentum, and keep your community in the loop.
            </p>
            <div className="mt-4 rounded-xl border border-slate-700/60 bg-slate-900/50 p-4 text-slate-200">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Daily spark
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-100">
                {DAILY_SPARKS[sparkIndex]}
              </p>
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-2">
            <FieldCard
              title="Date"
              description="Lock in the day you're recapping."
            >
              <input
                type="date"
                value={entry.date}
                onChange={handleField("date")}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
              />
            </FieldCard>
            <FieldCard
              title="Tone"
              description="Choose the energy of your voice."
            >
              <div className="flex gap-2">
                {(["Professional", "Friendly", "Bold"] as Tone[]).map((tone) => (
                  <button
                    key={tone}
                    className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition ${
                      entry.tone === tone
                        ? "border-blue-400 bg-blue-500/10 text-blue-100"
                        : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
                    }`}
                    onClick={() => setEntry((prev) => ({ ...prev, tone }))}
                    type="button"
                  >
                    {tone}
                  </button>
                ))}
              </div>
            </FieldCard>
            <FieldCard
              title="Headline"
              description="Open with a crisp hook."
            >
              <input
                type="text"
                value={entry.headline}
                onChange={handleField("headline")}
                placeholder="Momentum hits different when the plan clicks."
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
              />
            </FieldCard>
            <FieldCard
              title="Today's wins"
              description="Shipments, decisions, breakthroughs."
            >
              <textarea
                value={entry.wins}
                onChange={handleField("wins")}
                placeholder="Closed the beta feedback loop with 12 calls and shipped the pricing page revamp."
                className="h-32 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
              />
            </FieldCard>
            <FieldCard
              title="Signal & metrics"
              description="Share data that proves traction."
            >
              <textarea
                value={entry.metrics}
                onChange={handleField("metrics")}
                placeholder="+18% demo conversions week-over-week • NPS back to 42 after onboarding tweaks."
                className="h-32 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
              />
            </FieldCard>
            <FieldCard
              title="What's next"
              description="Set expectations for tomorrow."
            >
              <textarea
                value={entry.focus}
                onChange={handleField("focus")}
                placeholder="Going live with the customer onboarding scorecard and refining the activation nurture."
                className="h-32 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
              />
            </FieldCard>
            <FieldCard
              title="Insight"
              description="Share the why behind your moves."
            >
              <textarea
                value={entry.insight}
                onChange={handleField("insight")}
                placeholder="Customers don't want more dashboards—they want the single metric that signals progress."
                className="h-32 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
              />
            </FieldCard>
            <FieldCard
              title="Shoutout or gratitude"
              description="Amplify the humans behind the progress."
            >
              <textarea
                value={entry.gratitude}
                onChange={handleField("gratitude")}
                placeholder="Shoutout to Priya for unblocking sales enablement with a fresh deck in 24 hours."
                className="h-32 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
              />
            </FieldCard>
            <FieldCard
              title="Call to action"
              description="Invite dialogue or collaboration."
            >
              <div className="flex flex-wrap gap-2">
                {CTA_OPTIONS.map((cta) => (
                  <button
                    key={cta}
                    type="button"
                    onClick={() => setEntry((prev) => ({ ...prev, callToAction: cta }))}
                    className={`rounded-full border px-4 py-2 text-xs transition ${
                      entry.callToAction === cta
                        ? "border-blue-400 bg-blue-500/10 text-blue-100"
                        : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    {cta}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={entry.callToAction}
                onChange={handleField("callToAction")}
                className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
              />
            </FieldCard>
          </div>

          <FieldCard
            title="Mood"
            description="Capture the vibe for your own dashboard."
          >
            <div className="flex flex-wrap gap-2">
              {["Energized", "Steady", "Curious", "Resilient", "Grateful"].map((mood) => (
                <button
                  key={mood}
                  type="button"
                  onClick={() => setEntry((prev) => ({ ...prev, mood }))}
                  className={`rounded-full border px-4 py-2 text-xs transition ${
                    entry.mood === mood
                      ? "border-amber-400 bg-amber-500/10 text-amber-100"
                      : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  {mood}
                </button>
              ))}
            </div>
          </FieldCard>

          <FieldCard
            title="Hashtags"
            description="Mix relevance with community tags."
          >
            <div className="flex flex-wrap gap-2">
              {Object.entries(HASHTAG_CATALOG).map(([group, tags]) => (
                <div
                  key={group}
                  className="rounded-2xl border border-slate-700 bg-slate-900/60 p-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    {group}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleHashtag(tag)}
                        className={`rounded-full border px-3 py-1 text-xs ${
                          entry.hashtags.includes(tag)
                            ? "border-emerald-400 bg-emerald-500/10 text-emerald-100"
                            : "border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500"
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={customHashtag}
                onChange={(event) => setCustomHashtag(event.target.value)}
                placeholder="#DailyLearning"
                className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
              />
              <button
                type="button"
                onClick={handleCustomHashtag}
                className="rounded-xl border border-emerald-400 bg-emerald-500/20 px-4 py-3 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/30"
              >
                Add
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Selected: {entry.hashtags.length ? entry.hashtags.join(", ") : "None yet"}
            </p>
          </FieldCard>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-xl border border-blue-400 bg-blue-500/20 px-5 py-3 text-sm font-medium text-blue-100 transition hover:bg-blue-500/30"
            >
              Save today&apos;s entry
            </button>
            <button
              type="button"
              onClick={handleNew}
              className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm text-slate-200 transition hover:border-slate-500"
            >
              Start fresh
            </button>
          </div>
        </section>

        <aside className="flex w-full flex-col gap-6 lg:w-96">
          <FieldCard
            title="LinkedIn preview"
            description="Copy-ready format for your Page."
            tone="surface"
          >
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <pre className="whitespace-pre-wrap text-sm leading-7 text-slate-100">
                {postPreview}
              </pre>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={handleCopy}
                className="flex-1 rounded-xl border border-emerald-400 bg-emerald-500/20 px-4 py-3 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/30"
              >
                {copied ? "Copied!" : "Copy to clipboard"}
              </button>
              <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-300">
                {postPreview.length} chars
              </span>
            </div>
          </FieldCard>

          <FieldCard
            title="History"
            description="Tap to reload a past update."
            tone="surface"
          >
            <div className="space-y-3">
              {!history.length && (
                <p className="text-sm text-slate-400">
                  Save entries to build your streak and repurpose updates.
                </p>
              )}
              {history
                .slice()
                .sort(
                  (a, b) =>
                    parseISODate(b.date).getTime() - parseISODate(a.date).getTime()
                )
                .map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleUseHistory(item)}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-900 p-3 text-left transition hover:border-slate-600"
                  >
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                      {parseISODate(item.date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <p className="mt-1 text-sm text-slate-100">
                      {item.headline || "Untitled update"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Mood: {item.mood} • {item.hashtags.length} tags
                    </p>
                  </button>
                ))}
            </div>
          </FieldCard>

          <FieldCard
            title="Posting playbook"
            description="Keep Page momentum healthy."
            tone="surface"
          >
            <ul className="space-y-3 text-sm text-slate-300">
              <li>
                Lead with signal: metrics or proof of progress grab attention in the
                first two lines.
              </li>
              <li>
                Keep paragraphs short so the post is scannable and mobile-friendly.
              </li>
              <li>
                Mention teammates by name when possible—LinkedIn boosts engagement when
                you spotlight people.
              </li>
              <li>
                Reuse high-performing posts in a newsletter or article at the end of the
                week to extend reach.
              </li>
            </ul>
          </FieldCard>
        </aside>
      </div>
    </div>
  );
}

type FieldCardProps = {
  title: string;
  description: string;
  children: ReactNode;
  tone?: "default" | "surface";
};

function FieldCard({ title, description, children, tone = "default" }: FieldCardProps) {
  return (
    <section
      className={`rounded-3xl border ${
        tone === "surface"
          ? "border-white/10 bg-white/5 backdrop-blur"
          : "border-slate-800 bg-slate-900/60 backdrop-blur"
      } p-5 shadow-[0_18px_35px_-25px_rgba(15,23,42,0.9)]`}
    >
      <header className="mb-4 space-y-1">
        <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-300">
          {title}
        </h2>
        <p className="text-xs text-slate-400">{description}</p>
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
