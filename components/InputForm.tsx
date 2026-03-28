"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import { Style, Gender } from "@/lib/nameData";
import { GeneratedName, generateNames } from "@/lib/nameGenerator";
import NameResults from "./NameResults";

const STYLES: { value: Style; label: string; icon: string; desc: string }[] = [
  { value: "classic", label: "Classic",  icon: "🏛️", desc: "Confucian virtues, timeless elegance" },
  { value: "nature",  label: "Nature",   icon: "🌿", desc: "Mountains, rivers, flora & fauna" },
  { value: "modern",  label: "Modern",   icon: "✨", desc: "Contemporary, bright & energetic" },
  { value: "poetic",  label: "Poetic",   icon: "📜", desc: "Literary arts, ink & verse" },
  { value: "lucky",   label: "Lucky",    icon: "🔴", desc: "Fortune, prosperity & good omens" },
];

const GENDERS: { value: Gender; label: string }[] = [
  { value: "male",    label: "Masculine" },
  { value: "female",  label: "Feminine" },
  { value: "neutral", label: "Neutral" },
];

// 农历春节日期数据 (1900-2050)
const LUNAR_NEW_YEAR: Record<number, string> = {
  1900: "01-31", 1901: "02-19", 1902: "02-08", 1903: "01-29", 1904: "02-16", 1905: "02-04", 1906: "01-25", 1907: "02-13", 1908: "02-02", 1909: "01-22",
  1910: "02-10", 1911: "01-30", 1912: "02-18", 1913: "02-06", 1914: "01-26", 1915: "02-14", 1916: "02-03", 1917: "01-23", 1918: "02-11", 1919: "02-01",
  1920: "02-20", 1921: "02-08", 1922: "01-28", 1923: "02-16", 1924: "02-05", 1925: "01-24", 1926: "02-13", 1927: "02-02", 1928: "01-23", 1929: "02-10",
  1930: "01-30", 1931: "02-17", 1932: "02-06", 1933: "01-26", 1934: "02-14", 1935: "02-04", 1936: "01-24", 1937: "02-11", 1938: "01-31", 1939: "02-19",
  1940: "02-08", 1941: "01-27", 1942: "02-15", 1943: "02-05", 1944: "01-25", 1945: "02-13", 1946: "02-02", 1947: "01-22", 1948: "02-10", 1949: "01-29",
  1950: "02-17", 1951: "02-06", 1952: "01-27", 1953: "02-14", 1954: "02-03", 1955: "01-24", 1956: "02-12", 1957: "01-31", 1958: "02-18", 1959: "02-08",
  1960: "01-28", 1961: "02-15", 1962: "02-05", 1963: "01-25", 1964: "02-13", 1965: "02-02", 1966: "01-21", 1967: "02-09", 1968: "01-30", 1969: "02-17",
  1970: "02-06", 1971: "01-27", 1972: "02-15", 1973: "02-03", 1974: "01-23", 1975: "02-11", 1976: "01-31", 1977: "02-18", 1978: "02-07", 1979: "01-28",
  1980: "02-16", 1981: "02-05", 1982: "01-25", 1983: "02-13", 1984: "02-02", 1985: "02-20", 1986: "02-09", 1987: "01-29", 1988: "02-17", 1989: "02-06",
  1990: "01-27", 1991: "02-15", 1992: "02-04", 1993: "01-23", 1994: "02-10", 1995: "01-31", 1996: "02-19", 1997: "02-07", 1998: "01-28", 1999: "02-16",
  2000: "02-05", 2001: "01-24", 2002: "02-12", 2003: "02-01", 2004: "01-22", 2005: "02-09", 2006: "01-29", 2007: "02-18", 2008: "02-07", 2009: "01-26",
  2010: "02-14", 2011: "02-03", 2012: "01-23", 2013: "02-10", 2014: "01-31", 2015: "02-19", 2016: "02-08", 2017: "01-28", 2018: "02-16", 2019: "02-05",
  2020: "01-25", 2021: "02-12", 2022: "02-01", 2023: "01-22", 2024: "02-10", 2025: "01-29", 2026: "02-17", 2027: "02-06", 2028: "01-26", 2029: "02-13",
  2030: "02-03", 2031: "01-23", 2032: "02-11", 2033: "01-31", 2034: "02-19", 2035: "02-08", 2036: "01-28", 2037: "02-15", 2038: "02-04", 2039: "01-24",
  2040: "02-12", 2041: "02-01", 2042: "01-22", 2043: "02-10", 2044: "01-30", 2045: "02-17", 2046: "02-06", 2047: "01-26", 2048: "02-14", 2049: "02-02",
  2050: "01-23",
};

const ZODIAC_ANIMALS = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"];

function getChineseZodiac(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const monthDay = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const lunarNewYear = LUNAR_NEW_YEAR[year];
  let zodiacYear = year;
  if (lunarNewYear && monthDay < lunarNewYear) zodiacYear = year - 1;
  const index = (zodiacYear - 1900) % 12;
  return ZODIAC_ANIMALS[index];
}

function formatBirthday(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
}

// ── Upgrade Modal ────────────────────────────────────────────────────────────
interface UpgradeModalProps {
  tier: 'anonymous' | 'free';
  onClose: () => void;
}

function UpgradeModal({ tier, onClose }: UpgradeModalProps) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 max-w-sm w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🀄</div>
          <h3 className="text-xl font-bold mb-2">Daily Limit Reached</h3>
          <p className="text-zinc-400 text-sm">
            {tier === 'anonymous'
              ? "You've used all 3 free generations for today."
              : "You've used all 10 free generations for today."}
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {tier === 'anonymous' && (
            <button
              onClick={() => signIn('google')}
              className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-sm font-medium transition"
            >
              Sign in free → Get 10/day
            </button>
          )}
          <Link
            href="/pricing"
            className="block w-full py-3 rounded-xl bg-amber-500 text-zinc-900 font-bold text-sm text-center hover:bg-amber-400 transition"
            onClick={onClose}
          >
            Upgrade to Pro — 50/day ⭐
          </Link>
        </div>

        <p className="text-center text-xs text-zinc-600">
          Resets tomorrow · <button onClick={onClose} className="underline hover:text-zinc-400">dismiss</button>
        </p>
      </div>
    </div>
  );
}

// ── Usage Badge ──────────────────────────────────────────────────────────────
interface UsageBadgeProps {
  remaining: number;
  limit: number;
}
function UsageBadge({ remaining, limit }: UsageBadgeProps) {
  const pct = remaining / limit;
  const color = pct === 0 ? 'text-red-400' : pct <= 0.3 ? 'text-amber-400' : 'text-zinc-400';
  return (
    <span className={`text-xs ${color}`}>
      {remaining}/{limit} left today
    </span>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function InputForm() {
  const { data: session } = useSession();
  const [originalName, setOriginalName] = useState("");
  const [gender, setGender]     = useState<Gender>("neutral");
  const [styles, setStyles]     = useState<Style[]>([]);
  const [birthday, setBirthday] = useState("");
  const [names, setNames]       = useState<GeneratedName[]>([]);
  const [error, setError]       = useState("");
  const [generated, setGenerated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [usage, setUsage]       = useState<{ remaining: number; limit: number; tier: 'anonymous' | 'free' | 'pro' } | null>(null);

  function toggleStyle(s: Style) {
    setStyles((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

  async function handleGenerate() {
    if (styles.length === 0) {
      setError("Please select at least one style.");
      return;
    }
    setError("");
    setIsLoading(true);

    try {
      // Check & increment usage
      const res = await fetch('/api/usage', { method: 'POST' });
      const data = await res.json();

      if (res.status === 429) {
        setShowUpgrade(true);
        setIsLoading(false);
        return;
      }

      setUsage({ remaining: data.remaining, limit: data.limit, tier: data.tier });
      setNames(generateNames(originalName, gender, styles));
      setGenerated(true);
    } catch {
      // If API fails, still generate (graceful degradation)
      setNames(generateNames(originalName, gender, styles));
      setGenerated(true);
    } finally {
      setIsLoading(false);
    }
  }

  function handleRefresh() {
    if (styles.length === 0) return;
    setNames(generateNames(originalName, gender, styles));
  }

  return (
    <>
      {showUpgrade && usage && (
        <UpgradeModal tier={usage.tier as 'anonymous' | 'free'} onClose={() => setShowUpgrade(false)} />
      )}

      <div className="space-y-6">
        {/* Input card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-7 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">Your Details</h2>
            {usage && <UsageBadge remaining={usage.remaining} limit={usage.limit} />}
          </div>

          {/* Name */}
          <div className="mb-5">
            <label className="block text-sm text-zinc-400 mb-2">Your name</label>
            <input
              type="text"
              value={originalName}
              onChange={(e) => setOriginalName(e.target.value)}
              placeholder="e.g. Emily, James, Sofia…"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-600 text-sm outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Birthday */}
          <div className="mb-5">
            <label className="block text-sm text-zinc-400 mb-2">Birthday</label>
            <input
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 text-sm outline-none focus:border-amber-500 transition-colors [color-scheme:dark]"
            />
            {birthday && (
              <div className="mt-2 text-xs text-zinc-500">
                {formatBirthday(birthday)} · 生肖: {getChineseZodiac(birthday)}
              </div>
            )}
          </div>

          {/* Gender */}
          <div className="mb-5">
            <label className="block text-sm text-zinc-400 mb-2">Gender</label>
            <div className="flex gap-2 flex-wrap">
              {GENDERS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setGender(value)}
                  className={`px-5 py-2 rounded-xl text-sm border transition-all cursor-pointer ${
                    gender === value
                      ? "border-violet-500 bg-violet-500/15 text-violet-300"
                      : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-500"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Style */}
          <div className="mb-2">
            <label className="block text-sm text-zinc-400 mb-2">
              Style <span className="text-zinc-600 text-xs">(required)</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {STYLES.map(({ value, label, icon, desc }) => {
                const active = styles.includes(value);
                return (
                  <button
                    key={value}
                    onClick={() => toggleStyle(value)}
                    className={`flex flex-col items-start gap-1 p-4 rounded-xl border text-left cursor-pointer transition-all ${
                      active
                        ? "border-amber-500 bg-amber-500/10"
                        : "border-zinc-700 bg-zinc-800 hover:border-zinc-500"
                    }`}
                  >
                    <span className="text-xl">{icon}</span>
                    <span className={`text-sm font-semibold ${active ? "text-amber-400" : "text-zinc-200"}`}>{label}</span>
                    <span className="text-xs text-zinc-500 leading-snug">{desc}</span>
                  </button>
                );
              })}
            </div>
            {error && <p className="mt-3 text-red-400 text-sm">{error}</p>}
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3 flex-wrap items-center">
            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="flex items-center gap-2 px-7 py-3 rounded-xl bg-amber-500 text-zinc-900 font-semibold text-sm hover:bg-amber-400 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-500/20 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
            >
              {isLoading ? (
                <><span className="w-4 h-4 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full animate-spin" /> Generating…</>
              ) : (
                <>✦ Generate Names</>
              )}
            </button>
            {!session?.user && (
              <p className="text-xs text-zinc-600">
                <button onClick={() => signIn('google')} className="text-amber-500 hover:text-amber-400 underline">Sign in</button>
                {' '}for 10/day
              </p>
            )}
          </div>
        </div>

        {/* Results */}
        {generated && names.length > 0 && (
          <NameResults names={names} onRefresh={handleRefresh} />
        )}
      </div>
    </>
  );
}
