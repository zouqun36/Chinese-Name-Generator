'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { GeneratedName } from '@/lib/nameGenerator';

interface Props {
  name: GeneratedName;
  index: number;
}

const STYLE_ICONS: Record<string, string> = {
  classic: '🏛️',
  nature: '🌿',
  modern: '✨',
  poetic: '📜',
  lucky: '🔴',
};

export default function NameCard({ name, index }: Props) {
  const { data: session } = useSession();
  const [favorited, setFavorited] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleFavorite = async () => {
    if (!session?.user) return;
    setLoading(true);
    try {
      const method = favorited ? 'DELETE' : 'POST';
      const res = await fetch('/api/favorites', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chineseName: name.chinese,
          pinyin: name.pinyin,
          meaning: name.meaning,
          style: name.style,
        }),
      });
      if (res.ok) {
        setFavorited(!favorited);
      } else if (res.status === 429) {
        alert('Favorite limit reached. Upgrade to Pro for more!');
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="group relative bg-zinc-800/60 border border-zinc-700 rounded-2xl p-6 hover:border-amber-500/60 hover:translate-x-1 transition-all duration-200">
      {/* Index badge */}
      <span className="absolute top-4 right-5 text-xs text-zinc-600 font-semibold tracking-wider">
        #{index + 1}
      </span>

      {/* Chinese name */}
      <div className="text-4xl font-bold tracking-[0.2em] text-zinc-100 mb-1">
        {name.chinese}
      </div>

      {/* Pinyin */}
      <div className="text-base text-amber-400 tracking-wide mb-3">
        {name.pinyin}
      </div>

      {/* Breakdown */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="text-xs px-3 py-1 rounded-full border border-zinc-600 text-zinc-400">
          {name.surname}{' '}
          <em className="not-italic text-violet-400">{name.surnamePinyin}</em>{' '}
          — surname
        </span>
        <span className="text-xs px-3 py-1 rounded-full border border-zinc-600 text-zinc-400">
          {name.given}{' '}
          <em className="not-italic text-violet-400">{name.givenPinyin}</em>{' '}
          — given name
        </span>
      </div>

      {/* Meaning */}
      <div className="text-sm text-zinc-400 border-t border-zinc-700 pt-3 leading-relaxed">
        <span className="text-amber-500/60 mr-1">✦</span>
        {name.meaning}
      </div>

      {/* Bottom row: style badge + favorite button */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500/80 border border-amber-500/20 capitalize tracking-wide">
            {STYLE_ICONS[name.style]} {name.style}
          </span>
          {name.phonemeInspired && (
            <span className="text-[11px] px-2.5 py-0.5 rounded-full border border-zinc-600 text-zinc-500">
              phonetically inspired
            </span>
          )}
        </div>

        {/* Favorite button — only show when logged in */}
        {session?.user && (
          <button
            onClick={toggleFavorite}
            disabled={loading}
            title={favorited ? 'Remove from favorites' : 'Save to favorites'}
            className={`text-lg transition-all hover:scale-110 disabled:opacity-50 ${
              favorited ? 'text-amber-400' : 'text-zinc-600 hover:text-amber-400'
            }`}
          >
            {favorited ? '★' : '☆'}
          </button>
        )}
      </div>
    </div>
  );
}
