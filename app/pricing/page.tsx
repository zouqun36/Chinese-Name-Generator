'use client';

import { Suspense, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

// ── PayPal Button ────────────────────────────────────────────────────────────
function PayPalButton({ plan, disabled }: { plan: 'monthly' | 'yearly'; disabled: boolean }) {
  const [loading, setLoading] = useState(false);
  const { data: session } = useSession();

  const handlePayPal = async () => {
    if (!session?.user) { signIn('google'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json() as any;
      if (data.approveUrl) {
        window.location.href = data.approveUrl;
      } else {
        alert('PayPal unavailable. Please try again.');
      }
    } catch {
      alert('PayPal unavailable. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePayPal}
      disabled={disabled || loading}
      className="w-full py-2.5 rounded-xl bg-[#0070BA] hover:bg-[#003087] text-white font-bold text-sm transition disabled:opacity-60 flex items-center justify-center gap-2"
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z"/>
        </svg>
      )}
      {loading ? 'Redirecting...' : 'Pay with PayPal'}
    </button>
  );
}

// ── Pricing Inner ────────────────────────────────────────────────────────────
function PricingInner() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const canceled = searchParams.get('canceled') === '1';
  const paypalSuccess = searchParams.get('paypal') === 'success';
  const [stripeLoading, setStripeLoading] = useState<'monthly' | 'yearly' | null>(null);

  // Handle PayPal return with orderId
  const orderId = searchParams.get('token'); // PayPal returns ?token=ORDER_ID
  const plan = searchParams.get('plan');

  const handleStripeCheckout = async (plan: 'monthly' | 'yearly') => {
    if (!session?.user) { signIn('google'); return; }
    setStripeLoading(plan);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json() as any;
      if (data.url) window.location.href = data.url;
      else alert('Something went wrong. Please try again.');
    } catch {
      alert('Something went wrong. Please try again.');
    } finally {
      setStripeLoading(null);
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

      {paypalSuccess && (
        <div className="bg-green-900/30 border border-green-700 rounded-xl p-4 mb-8 text-sm text-green-300 text-center">
          🎉 Payment successful! Your Pro access is now active.
          <Link href="/profile" className="ml-2 underline hover:text-green-100">View profile →</Link>
        </div>
      )}

      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-3">Simple, Transparent Pricing</h1>
        <p className="text-zinc-400">Choose the plan that works for you · Pay with Card or PayPal</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-16">
        {/* Free */}
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
            <Link href="/" className="block w-full py-3 rounded-xl bg-zinc-800 text-center text-sm">You&apos;re signed in ✓</Link>
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
          <div className="mb-1">
            <span className="text-3xl font-bold">$2.99</span>
            <span className="text-lg text-zinc-400">/mo</span>
          </div>
          <div className="text-sm text-amber-400 font-medium mb-5">or $19.99/year — save 44%</div>

          <ul className="space-y-3 mb-6 text-sm">
            <li className="flex items-start gap-2"><span className="text-amber-500">✓</span><span>50 generations per day</span></li>
            <li className="flex items-start gap-2"><span className="text-amber-500">✓</span><span>1-year history</span></li>
            <li className="flex items-start gap-2"><span className="text-amber-500">✓</span><span>Save up to 50 favorites</span></li>
            <li className="flex items-start gap-2"><span className="text-amber-500">✓</span><span>Name pronunciation audio</span></li>
            <li className="flex items-start gap-2"><span className="text-amber-500">✓</span><span>Export as image</span></li>
          </ul>

          {/* Plan toggle */}
          <div className="space-y-2 mb-3">
            {/* Stripe */}
            <div className="space-y-1.5">
              <p className="text-xs text-zinc-500 font-medium">Pay with Card (Stripe)</p>
              <button
                onClick={() => handleStripeCheckout('monthly')}
                disabled={stripeLoading !== null}
                className="w-full py-2 rounded-xl bg-amber-500 text-zinc-900 font-bold hover:bg-amber-400 transition text-sm disabled:opacity-60"
              >
                {stripeLoading === 'monthly' ? 'Redirecting...' : '$2.99 / month'}
              </button>
              <button
                onClick={() => handleStripeCheckout('yearly')}
                disabled={stripeLoading !== null}
                className="w-full py-2 rounded-xl border-2 border-amber-500 text-amber-400 font-bold hover:bg-amber-500/10 transition text-sm disabled:opacity-60"
              >
                {stripeLoading === 'yearly' ? 'Redirecting...' : '$19.99 / year'}
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-2 my-2">
              <div className="flex-1 h-px bg-zinc-700" />
              <span className="text-xs text-zinc-500">or</span>
              <div className="flex-1 h-px bg-zinc-700" />
            </div>

            {/* PayPal */}
            <div className="space-y-1.5">
              <p className="text-xs text-zinc-500 font-medium">Pay with PayPal</p>
              <PayPalButton plan="monthly" disabled={stripeLoading !== null} />
              <PayPalButton plan="yearly" disabled={stripeLoading !== null} />
            </div>
          </div>

          <p className="text-xs text-zinc-500 text-center">Secure payment · Cancel anytime</p>
        </div>
      </div>

      {/* Feature comparison table */}
      <div className="max-w-2xl mx-auto mb-16">
        <h2 className="text-xl font-bold text-center mb-6">Feature Comparison</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left p-4 text-zinc-400 font-medium">Feature</th>
                <th className="text-center p-4 text-zinc-400 font-medium">Free</th>
                <th className="text-center p-4 text-zinc-400 font-medium">Registered</th>
                <th className="text-center p-4 text-amber-400 font-medium">Pro ⭐</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {[
                ['Generations/day', '3', '10', '50'],
                ['Names per batch', '5', '5', '5'],
                ['History', '✗', '30 days', '1 year'],
                ['Favorites', '✗', '5', '50'],
                ['Name pronunciation', '✗', '✗', '✓'],
                ['Export as image', '✗', '✗', '✓'],
                ['Priority support', '✗', '✗', '✓'],
              ].map(([feature, free, reg, pro]) => (
                <tr key={feature}>
                  <td className="p-4 text-zinc-300">{feature}</td>
                  <td className="p-4 text-center text-zinc-500">{free}</td>
                  <td className="p-4 text-center text-zinc-400">{reg}</td>
                  <td className="p-4 text-center text-amber-400 font-medium">{pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-8">FAQ</h2>
        <div className="space-y-4">
          {[
            ['What happens when my Pro subscription expires?', 'You can still view your saved history and favorites in read-only mode. Your account reverts to the free registered tier (10 gen/day).'],
            ['Can I cancel anytime?', 'Yes! For Stripe subscriptions, cancel via the Stripe portal. For PayPal one-time payments, access lasts for the paid period.'],
            ['What payment methods do you accept?', 'Credit/debit cards via Stripe, and PayPal (including PayPal balance, linked bank accounts, and PayPal credit).'],
            ['Is there a free trial?', 'The free tier gives you 3 generations/day with no sign-up. Registered accounts get 10/day — try it before going Pro.'],
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
