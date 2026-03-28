'use client';

import { Suspense, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function PricingInner() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const canceled = searchParams.get('canceled') === '1';
  const [loading, setLoading] = useState<'monthly' | 'yearly' | null>(null);

  const handleCheckout = async (plan: 'monthly' | 'yearly') => {
    if (!session?.user) {
      signIn('google');
      return;
    }
    setLoading(plan);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json() as any;
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Something went wrong. Please try again.');
      }
    } catch {
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <main className="max-w-5xl mx-auto px-5 py-14">
      <div className="mb-8">
        <Link href="/" className="text-zinc-500 hover:text-zinc-300 text-sm">← Back to Generator</Link>
      </div>

      {canceled && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 mb-8 text-sm text-red-300 text-center">
          Payment was canceled. No charge was made.
        </div>
      )}

      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-3">Simple, Transparent Pricing</h1>
        <p className="text-zinc-400">Choose the plan that works for you</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-16">
        {/* Free / Anonymous */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-7">
          <h3 className="text-xl font-bold mb-2">Free</h3>
          <div className="text-3xl font-bold mb-1">$0</div>
          <p className="text-zinc-500 text-sm mb-6">No sign-up needed</p>
          <ul className="space-y-3 mb-6 text-sm">
            <li className="flex items-start gap-2"><span className="text-green-500">✓</span><span>3 generations per day</span></li>
            <li className="flex items-start gap-2"><span className="text-green-500">✓</span><span>5 names per generation</span></li>
            <li className="flex items-start gap-2"><span className="text-zinc-600">✗</span><span className="text-zinc-600">No history</span></li>
            <li className="flex items-start gap-2"><span className="text-zinc-600">✗</span><span className="text-zinc-600">No favorites</span></li>
          </ul>
          <Link href="/" className="block w-full py-3 rounded-xl border border-zinc-700 hover:border-zinc-500 transition text-center text-sm">
            Get Started
          </Link>
        </div>

        {/* Registered */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-7">
          <h3 className="text-xl font-bold mb-2">Registered</h3>
          <div className="text-3xl font-bold mb-1">$0</div>
          <p className="text-zinc-500 text-sm mb-6">Sign up free</p>
          <ul className="space-y-3 mb-6 text-sm">
            <li className="flex items-start gap-2"><span className="text-green-500">✓</span><span>10 generations per day</span></li>
            <li className="flex items-start gap-2"><span className="text-green-500">✓</span><span>30-day history</span></li>
            <li className="flex items-start gap-2"><span className="text-green-500">✓</span><span>Save up to 5 favorites</span></li>
            <li className="flex items-start gap-2"><span className="text-zinc-600">✗</span><span className="text-zinc-600">No audio / export</span></li>
          </ul>
          {session?.user ? (
            <Link href="/" className="block w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition text-center text-sm">
              You&apos;re signed in ✓
            </Link>
          ) : (
            <button onClick={() => signIn('google')} className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition text-sm">
              Sign Up Free
            </button>
          )}
        </div>

        {/* Pro */}
        <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-2 border-amber-500 rounded-2xl p-7 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-zinc-900 px-4 py-1 rounded-full text-xs font-bold">
            POPULAR
          </div>
          <h3 className="text-xl font-bold mb-2">Pro</h3>
          <div className="mb-4 space-y-1">
            <div className="text-3xl font-bold">$2.99<span className="text-lg text-zinc-400">/mo</span></div>
            <div className="text-sm text-amber-400 font-medium">or $19.99/year — save 44%</div>
          </div>
          <ul className="space-y-3 mb-6 text-sm">
            <li className="flex items-start gap-2"><span className="text-amber-500">✓</span><span>50 generations per day</span></li>
            <li className="flex items-start gap-2"><span className="text-amber-500">✓</span><span>1-year history</span></li>
            <li className="flex items-start gap-2"><span className="text-amber-500">✓</span><span>Save up to 50 favorites</span></li>
            <li className="flex items-start gap-2"><span className="text-amber-500">✓</span><span>Name pronunciation audio</span></li>
            <li className="flex items-start gap-2"><span className="text-amber-500">✓</span><span>Export as image</span></li>
          </ul>
          <div className="space-y-2">
            <button
              onClick={() => handleCheckout('monthly')}
              disabled={loading !== null}
              className="w-full py-2.5 rounded-xl bg-amber-500 text-zinc-900 font-bold hover:bg-amber-400 transition text-sm disabled:opacity-60"
            >
              {loading === 'monthly' ? 'Redirecting...' : 'Subscribe Monthly — $2.99/mo'}
            </button>
            <button
              onClick={() => handleCheckout('yearly')}
              disabled={loading !== null}
              className="w-full py-2.5 rounded-xl border-2 border-amber-500 text-amber-400 font-bold hover:bg-amber-500/10 transition text-sm disabled:opacity-60"
            >
              {loading === 'yearly' ? 'Redirecting...' : 'Subscribe Yearly — $19.99/yr'}
            </button>
          </div>
          <p className="text-xs text-zinc-500 mt-3 text-center">Secure payment via Stripe · Cancel anytime</p>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {[
            ['What happens when my Pro subscription expires?', 'You can still view your saved history and favorites in read-only mode. Your account reverts to the free registered tier (10 gen/day).'],
            ['Can I cancel anytime?', 'Yes! Cancel anytime from your profile or via the Stripe customer portal. You keep Pro access until the end of your billing period.'],
            ['What payment methods do you accept?', 'We accept all major credit cards (Visa, Mastercard, Amex) via Stripe. We do not store card information.'],
            ['Is there a free trial?', 'The free tier lets you try the generator right away with no sign-up. Registered accounts get 10 generations/day for free — a great way to see if Pro is right for you.'],
          ].map(([q, a]) => (
            <details key={q} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <summary className="font-semibold cursor-pointer">{q}</summary>
              <p className="mt-3 text-sm text-zinc-400">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </main>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-zinc-500">Loading…</div>}>
      <PricingInner />
    </Suspense>
  );
}
