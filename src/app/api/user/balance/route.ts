import { NextResponse } from 'next/server'
import { getBalance } from '@/lib/billing'
import { BILLING_CURRENCY } from '@/lib/billing/currency'
import { requireUserAuth, isErrorResponse } from '@/lib/api-auth'
import { apiHandler } from '@/lib/api-errors'
import { prisma } from '@/lib/prisma'
import { isAdminUsername } from '@/lib/admin/access'

/**
 * GET /api/user/balance
 * 获取当前用户余额
 */
export const GET = apiHandler(async () => {
    // 🔐 统一权限验证
    const authResult = await requireUserAuth()
    if (isErrorResponse(authResult)) return authResult
    const { session } = authResult

    const [balance, account] = await Promise.all([
        getBalance(session.user.id),
        prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true, emailVerified: true, password: true } }),
    ])

    return NextResponse.json({
        success: true,
        currency: BILLING_CURRENCY,
        balance: balance.balance,
        frozenAmount: balance.frozenAmount,
        totalSpent: balance.totalSpent,
        // Sign-up credits are granted on email verification; the account menu prompts until then.
        emailVerified: Boolean(account?.emailVerified),
        hasEmail: Boolean(account?.email),
        // For the account page (never the hash itself).
        hasPassword: Boolean(account?.password),
        username: account?.name ?? null,
        isAdmin: isAdminUsername(account?.name),
        email: account?.email ?? null,
    })
})
