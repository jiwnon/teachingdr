import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

const isProduction = process.env.NEXTAUTH_URL?.includes('report-mate.org');

const sharedCookieOptions = isProduction
  ? { httpOnly: true, sameSite: 'lax' as const, path: '/', secure: true, domain: '.report-mate.org' }
  : { httpOnly: true, sameSite: 'lax' as const, path: '/', secure: false };

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? '';
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  cookies: isProduction ? {
    sessionToken: { name: '__Secure-authjs.session-token', options: sharedCookieOptions },
    callbackUrl: { name: '__Secure-authjs.callback-url', options: sharedCookieOptions },
    csrfToken: { name: '__Host-authjs.csrf-token', options: { ...sharedCookieOptions, domain: undefined } },
    pkceCodeVerifier: { name: '__Secure-authjs.pkce.code_verifier', options: sharedCookieOptions },
    state: { name: '__Secure-authjs.state', options: sharedCookieOptions },
  } : undefined,
});