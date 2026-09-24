import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-errors'
import { isErrorResponse } from '@/lib/api-auth'
import { requireAdminAuth } from '@/lib/admin/access'
import { prisma } from '@/lib/prisma'
import { toMoneyNumber } from '@/lib/billing/money'

const PAGE_SIZE = 20

/** GET /api/admin/users?q=&page= — search users with their credits. */
export const GET = apiHandler(async (request: NextRequest) => {
  const auth = await requireAdminAuth()
  if (isErrorResponse(auth)) return auth

  const q = (request.nextUrl.searchParams.get('q') || '').trim()
  const page = Math.max(1, Number(request.nextUrl.searchParams.get('page')) || 1)
  const where = q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] } : {}

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        suspendedAt: true,
        createdAt: true,
        balance: { select: { balance: true, totalSpent: true } },
        _count: { select: { projects: true, tasks: true } },
      },
    }),
    prisma.user.count({ where }),
  ])

  return NextResponse.json({
    success: true,
    users: rows.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      verified: Boolean(user.emailVerified),
      suspended: Boolean(user.suspendedAt),
      createdAt: user.createdAt.toISOString(),
      credits: Math.round(toMoneyNumber(user.balance?.balance)),
      creditsSpent: Math.round(toMoneyNumber(user.balance?.totalSpent)),
      projects: user._count.projects,
      generations: user._count.tasks,
    })),
    pagination: { page, pageSize: PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) },
  })
})
