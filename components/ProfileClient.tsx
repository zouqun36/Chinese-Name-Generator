'use client';


import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ProfileClientProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

interface UsageData {
  used: number;
  limit: number;
  remaining: number;
  tier: string;
}

interface HistoryItem {
  id: string;
  original_name: string | null;
  gender: string | null;
  created_at: number;
  generatedNames: Array<{ chinese: string; pinyin: string; meaning: string }>;
}

interface FavoriteItem {
  id: string;
  chinese_name: string;
  pinyin: string | null;
  meaning: string | null;
  style: string | null;
  created_at: number;
}

export default function ProfileClient({ user }: ProfileClientProps) {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'favorites'>('overview');
  const [dataLoaded, setDataLoaded] = useState({ history: false, favorites: false });

  useEffect(() => {
    fetch('/api/usage').then((r) => r.json()).then((d) => setUsage(d as UsageData)).catch(console.error);
  }, []);

  useEffect(() => {
    if (activeTab === 'history' && !dataLoaded.history) {
      fetch('/api/history')
        .then((r) => r.json())
        .then((d: any) => { setHistory(d.history ?? []); setDataLoaded((p) => ({ ...p, history: true })); })
        .catch(console.error);
    }
    if (activeTab === 'favorites' && !dataLoaded.favorites) {
      fetch('/api/favorites')
        .then((r) => r.json())
        .then((d: any) => { setFavorites(d.favorites ?? []); setDataLoaded((p) => ({ ...p, favorites: true })); })
        .catch(console.error);
    }
  }, [activeTab]);

  const tierBadge = {
    anonymous: { label: 'Guest', color: 'bg-gray-100 text-gray-600' },
    free: { label: 'Free', color: 'bg-blue-100 text-blue-700' },
    pro: { label: 'Pro ⭐', color: 'bg-amber-100 text-amber-700' },
  };
  const tier = (usage?.tier ?? 'free') as keyof typeof tierBadge;
  const badge = tierBadge[tier];

  const removeFavorite = async (chineseName: string) => {
    await fetch('/api/favorites', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chineseName }),
    });
    setFavorites((prev) => prev.filter((f) => f.chinese_name !== chineseName));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-amber-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-gray-500 hover:text-gray-800 text-sm flex items-center gap-1">
          ← Back to Generator
        </Link>
        <button onClick={() => { window.location.href = '/api/auth/signout'; }} className="text-sm text-red-500 hover:text-red-700">
          Sign out
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* User Card */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-4">
            {user.image ? (
              <img src={user.image} alt="avatar" className="w-16 h-16 rounded-full" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-400 to-amber-400 flex items-center justify-center text-white text-2xl font-bold">
                {user.name?.[0] ?? '?'}
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-900">{user.name ?? 'User'}</h2>
              <p className="text-gray-500 text-sm">{user.email}</p>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
                {badge.label}
              </span>
            </div>
          </div>

          {usage && (
            <div className="mt-5">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Today&apos;s generations</span>
                <span className="font-medium text-gray-800">{usage.used} / {usage.limit}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-400 to-amber-400 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (usage.used / usage.limit) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">{usage.remaining} remaining today</p>
            </div>
          )}

          {tier !== 'pro' && (
            <Link
              href="/pricing"
              className="mt-4 block w-full text-center bg-gradient-to-r from-red-500 to-amber-500 text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Upgrade to Pro — $2.99/mo →
            </Link>
          )}
        </div>

        {/* Tabs */}
        <div className="flex bg-white rounded-xl shadow-sm mb-4 p-1">
          {(['overview', 'history', 'favorites'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all capitalize ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-red-500 to-amber-500 text-white'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {tab}
              {tab === 'favorites' && favorites.length > 0 && (
                <span className="ml-1 text-xs">({favorites.length})</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800">Account Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-red-500">{usage?.limit ?? '—'}</p>
                  <p className="text-xs text-gray-500 mt-1">Daily Limit</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-amber-500">{tier === 'pro' ? '50' : '5'}</p>
                  <p className="text-xs text-gray-500 mt-1">Max Favorites</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-green-500">{tier === 'pro' ? '365' : '30'}</p>
                  <p className="text-xs text-gray-500 mt-1">History Days</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-purple-500">{tier === 'pro' ? '✓' : '✗'}</p>
                  <p className="text-xs text-gray-500 mt-1">Audio + Export</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-4">Generation History</h3>
              {!dataLoaded.history ? (
                <div className="text-center py-8 text-gray-400 text-sm">Loading…</div>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-4xl mb-3">📜</div>
                  <p className="text-sm">No history yet. Generate some names!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => (
                    <div key={item.id} className="border border-gray-100 rounded-xl p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-sm text-gray-500">
                          {item.original_name ? `For: ${item.original_name}` : 'Anonymous'}{' '}
                          {item.gender && `· ${item.gender}`}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(item.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {item.generatedNames.slice(0, 3).map((n, i) => (
                          <span key={i} className="text-lg font-bold text-gray-800">{n.chinese}</span>
                        ))}
                        {item.generatedNames.length > 3 && (
                          <span className="text-sm text-gray-400 self-center">+{item.generatedNames.length - 3} more</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'favorites' && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-4">
                Saved Favorites
                {usage && <span className="ml-2 text-sm font-normal text-gray-400">({favorites.length}/{tier === 'pro' ? 50 : 5})</span>}
              </h3>
              {!dataLoaded.favorites ? (
                <div className="text-center py-8 text-gray-400 text-sm">Loading…</div>
              ) : favorites.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-4xl mb-3">⭐</div>
                  <p className="text-sm">No favorites yet. Star a name from the generator!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {favorites.map((fav) => (
                    <div key={fav.id} className="border border-gray-100 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{fav.chinese_name}</p>
                        {fav.pinyin && <p className="text-sm text-amber-500">{fav.pinyin}</p>}
                        {fav.meaning && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{fav.meaning}</p>}
                      </div>
                      <button
                        onClick={() => removeFavorite(fav.chinese_name)}
                        className="text-gray-300 hover:text-red-400 transition-colors ml-4 text-xl"
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
