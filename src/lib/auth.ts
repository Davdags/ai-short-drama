import { PrismaAdapter } from "@next-auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
// next-auth v4 type exports have compatibility issues with some TS configs;
// AuthOptions/NextAuthOptions may fail to resolve. Using `any` as workaround.
import bcrypt from "bcryptjs"
import { ensureUserBalance, findUserByEmail, findUserByLogin, generateUniqueUsername, normalizeEmail } from './auth-accounts'
import { cookies } from "next/headers"
import { AFFILIATE_PROGRAM } from './affiliate/program'
import { attributeReferral } from './affiliate/service'
import { markEmailVerified } from './email-verification'
import { ensurePlatformDefaultModels } from './providers/evolink/platform-defaults'
import { logAuthAction } from './logging/semantic'
import { prisma } from './prisma'

const baseAdapter = PrismaAdapter(prisma)

/** The referral code cookie set by /api/affiliate/click; OAuth sign-ups run inside the NextAuth route. */
async function readReferralCookie(): Promise<string | undefined> {
  try {
    return (await cookies()).get(AFFILIATE_PROGRAM.cookieName)?.value
  } catch {
    return undefined
  }
}

/** Google sign-in is enabled only once its credentials are configured. */
export const isGoogleAuthConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const authOptions: any = {
  adapter: {
    ...baseAdapter,
    // The stock adapter uses findUnique on email, which requires a unique column; ours isn't.
    getUserByEmail: (email: string) => findUserByEmail(email),
    // OAuth sign-ups: `name` is a unique username here, and every user needs a balance row.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async createUser(data: any) {
      const user = await baseAdapter.createUser!({
        ...data,
        email: data.email ? normalizeEmail(data.email) : data.email,
        name: await generateUniqueUsername(data.name || data.email || 'creator'),
      })
      await ensureUserBalance(user.id)
      // Google has already verified the email: mark it verified and grant the sign-up credits.
      await markEmailVerified(user.id)
      await attributeReferral(user.id, await readReferralCookie())
      logAuthAction('REGISTER', user.name, { userId: user.id, success: true, provider: 'oauth' })
      return user
    },
  },
  // 🔥 允许从任意 Host 访问（解决局域网访问问题）
  trustHost: true,
  // 🔥 根据 URL 协议决定是否使用 Secure Cookie
  // 局域网 HTTP 访问时需要关闭，否则 Cookie 无法设置
  useSecureCookies: (process.env.NEXTAUTH_URL || '').startsWith('https://'),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          logAuthAction('LOGIN', credentials?.username || 'unknown', { error: 'Missing credentials' })
          return null
        }

        // The "username" field accepts either an email address or a username.
        const user = await findUserByLogin(credentials.username)

        if (!user || !user.password) {
          logAuthAction('LOGIN', credentials.username, { error: 'User not found' })
          return null
        }

        if (user.suspendedAt) {
          logAuthAction('LOGIN', credentials.username, { userId: user.id, error: 'Account suspended' })
          return null
        }

        // 验证密码
        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

        if (!isPasswordValid) {
          logAuthAction('LOGIN', credentials.username, { error: 'Invalid password' })
          return null
        }

        logAuthAction('LOGIN', user.name, { userId: user.id, success: true })

        return {
          id: user.id,
          name: user.name,
        }
      }
    }),
    ...(isGoogleAuthConfigured
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
            // Google verifies email ownership, so a Google login may attach to an existing account with that email.
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/auth/signin",
  },
  events: {
    // Central EvoLink account: make sure every account has usable model choices.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async signIn({ user }: any) {
      if (user?.id) await ensurePlatformDefaultModels(user.id)
    },
  },
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async jwt({ token, user }: any) {
      if (user) {
        // JWT extends Record<string,unknown> — any string key is assignable
        token.id = user.id
      }
      return token
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: any) {
      if (token && session.user) {
        // token.id is a custom field; cast to access it
        ;(session.user as typeof session.user & { id?: string }).id = token.id as string
      }
      return session
    }
  }
}
