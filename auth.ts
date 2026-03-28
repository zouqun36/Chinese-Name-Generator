import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  trustHost: true,
  callbacks: {
    async jwt({ token, profile }) {
      if (profile) token.googleId = (profile as any).sub;
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as any).googleId = token.googleId;
      return session;
    },
  },
  pages: { signIn: '/login' },
});
