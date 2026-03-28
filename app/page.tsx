export const runtime = 'edge';
import { getToken } from 'next-auth/jwt';
import { headers, cookies } from 'next/headers';
import InputForm from '@/components/InputForm';
import NavBar from '@/components/NavBar';

export default async function Home() {
  // In edge runtime, read session from JWT token
  let user = null;
  try {
    const cookieStore = await cookies();
    const sessionToken =
      cookieStore.get('__Secure-next-auth.session-token')?.value ??
      cookieStore.get('next-auth.session-token')?.value;

    if (sessionToken) {
      // Just pass minimal user info for navbar
      // Full session handled client-side via useSession
      user = { name: null, email: null, image: null };
    }
  } catch {}

  return (
    <main className="max-w-2xl mx-auto px-5 py-10">
      <NavBar user={user} />
      <header className="text-center mb-10 mt-6">
        <h1 className="text-3xl font-bold tracking-tight mb-1">
          Chinese Name Generator
        </h1>
        <p className="text-amber-400 tracking-[0.2em] text-sm mb-4">中文名字生成器</p>
        <p className="text-zinc-400 text-sm leading-relaxed max-w-md mx-auto">
          Discover a meaningful Chinese name that resonates with your identity.
          Names are crafted from classical characters with rich cultural significance.
        </p>
      </header>
      <InputForm />
      <footer className="mt-14 text-center text-xs text-zinc-600 leading-relaxed">
        Names are generated from classical Chinese characters with curated meanings.
        <br />
        Phonetic suggestions are inspired by your name&apos;s sounds, not direct transliteration.
      </footer>
    </main>
  );
}
