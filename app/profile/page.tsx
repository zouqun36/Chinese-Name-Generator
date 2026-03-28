export const runtime = 'edge';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ProfileClient from '@/components/ProfileClient';

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const sessionToken =
    cookieStore.get('__Secure-next-auth.session-token')?.value ??
    cookieStore.get('next-auth.session-token')?.value;

  if (!sessionToken) {
    redirect('/login');
  }

  // Pass empty user — client will fill via useSession
  return <ProfileClient user={{ name: null, email: null, image: null }} />;
}
