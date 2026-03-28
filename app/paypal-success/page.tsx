'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function PayPalSuccessInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing your payment…');

  useEffect(() => {
    const token = searchParams.get('token'); // PayPal order ID
    const plan = searchParams.get('plan');

    if (!token) {
      setStatus('error');
      setMessage('Missing order information.');
      return;
    }

    fetch('/api/paypal/capture-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: token, plan }),
    })
      .then((r) => r.json() as any)
      .then((data) => {
        if (data.success) {
          setStatus('success');
          setMessage('Payment successful! Redirecting to your profile…');
          setTimeout(() => router.push('/profile?paypal=success'), 2000);
        } else {
          setStatus('error');
          setMessage(data.error ?? 'Payment capture failed. Please contact support.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Network error. Please contact support.');
      });
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 max-w-md w-full text-center">
        {status === 'processing' && (
          <>
            <div className="w-12 h-12 border-4 border-zinc-700 border-t-amber-500 rounded-full animate-spin mx-auto mb-6" />
            <h2 className="text-xl font-bold mb-2">Processing Payment</h2>
            <p className="text-zinc-400 text-sm">{message}</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-xl font-bold text-green-400 mb-2">Payment Successful!</h2>
            <p className="text-zinc-400 text-sm">{message}</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-xl font-bold text-red-400 mb-2">Payment Failed</h2>
            <p className="text-zinc-400 text-sm mb-6">{message}</p>
            <a href="/pricing" className="text-amber-400 hover:underline text-sm">← Back to Pricing</a>
          </>
        )}
      </div>
    </div>
  );
}

export default function PayPalSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-zinc-700 border-t-amber-500 rounded-full animate-spin" />
      </div>
    }>
      <PayPalSuccessInner />
    </Suspense>
  );
}
