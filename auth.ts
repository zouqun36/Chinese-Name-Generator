import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { getDB, upsertUser } from '@/lib/db';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Sync user to D1 on every sign-in
      const db = getDB();
      if (db && user.email) {
        try {
          await upsertUser(db, {
            email: user.email,
            name: user.name ?? null,
            avatar: user.image ?? null,
            googleId: (profile as any)?.sub ?? null,
          });
        } catch (err) {
          console.error('Failed to upsert user to D1:', err);
          // Don't block sign-in if DB write fails
        }
      }
      return true;
    },
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.googleId = (profile as any).sub;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).googleId = token.googleId;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});
