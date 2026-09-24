import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { logAuthAction } from '@/lib/logging/semantic'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { prisma } from '@/lib/prisma'
import { findUserByEmail, isValidEmail, normalizeEmail } from '@/lib/auth-accounts'
import { sendVerificationEmail } from '@/lib/email-verification'
import { ensurePlatformDefaultModels } from '@/lib/providers/evolink/platform-defaults'
import { AFFILIATE_PROGRAM } from '@/lib/affiliate/program'
import { attributeReferral } from '@/lib/affiliate/service'
import { checkRateLimit, getClientIp, AUTH_REGISTER_LIMIT } from '@/lib/rate-limit'

export const POST = apiHandler(async (request: NextRequest) => {
  // 🛡️ IP 限流
  const ip = getClientIp(request)
  const rateResult = await checkRateLimit('auth:register', ip, AUTH_REGISTER_LIMIT)
  if (rateResult.limited) {
    logAuthAction('REGISTER', 'unknown', { error: 'Rate limited', ip })
    return NextResponse.json(
      { success: false, message: `Too many attempts. Please try again in ${rateResult.retryAfterSeconds} seconds.` },
      {
        status: 429,
        headers: { 'Retry-After': String(rateResult.retryAfterSeconds) },
      },
    )
  }

  const body = await request.json()
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const email = typeof body?.email === 'string' ? normalizeEmail(body.email) : ''
  const phone = typeof body?.phone === 'string' ? body.phone.trim() : ''

  // ── 入参校验：按字段逐一返回具体错误 ───────────────────────────
  if (!name) {
    logAuthAction('REGISTER', 'unknown', { error: 'Missing username' })
    throw new ApiError('INVALID_PARAMS', { field: 'name', reason: 'required' })
  }

  // Email is required: it's needed for password resets and payments.
  if (!email) {
    logAuthAction('REGISTER', name, { error: 'Missing email' })
    throw new ApiError('INVALID_PARAMS', { field: 'email', reason: 'required' })
  }

  if (!isValidEmail(email)) {
    logAuthAction('REGISTER', name, { error: 'Invalid email' })
    throw new ApiError('INVALID_PARAMS', { field: 'email', reason: 'invalid' })
  }

  if (!password) {
    logAuthAction('REGISTER', name, { error: 'Missing password' })
    throw new ApiError('INVALID_PARAMS', { field: 'password', reason: 'required' })
  }

  if (password.length < 6) {
    logAuthAction('REGISTER', name, { error: 'Password too short' })
    throw new ApiError('INVALID_PARAMS', {
      field: 'password',
      reason: 'tooShort',
      minLength: 6,
    })
  }

  // ── 用户已存在 → 409 CONFLICT（与 400 入参错误语义隔离）───────
  const existingUser = await prisma.user.findUnique({
    where: { name },
  })

  if (existingUser) {
    logAuthAction('REGISTER', name, { error: 'Username already taken' })
    throw new ApiError('CONFLICT', { field: 'name', reason: 'taken' })
  }

  if (await findUserByEmail(email)) {
    logAuthAction('REGISTER', name, { error: 'Email already registered' })
    throw new ApiError('CONFLICT', { field: 'email', reason: 'taken' })
  }

  // 哈希密码
  const hashedPassword = await bcrypt.hash(password, 12)

  // 创建用户（事务）
  const user = await prisma.$transaction(async (tx) => {
    // 创建用户
    const newUser = await tx.user.create({
      data: {
        name,
        password: hashedPassword,
        email,
        ...(phone && { phone }),
      }
    })

    // 💰 创建用户余额记录（初始余额为0）
    await tx.userBalance.create({
      data: {
        userId: newUser.id,
        balance: 0,
        frozenAmount: 0,
        totalSpent: 0
      }
    })

    return newUser
  })

  // Free credits are granted when the email is verified (stops throwaway accounts).
  await sendVerificationEmail({ id: user.id, email })
  await ensurePlatformDefaultModels(user.id)
  await attributeReferral(user.id, request.cookies.get(AFFILIATE_PROGRAM.cookieName)?.value)
  logAuthAction('REGISTER', name, { userId: user.id, success: true })

  return NextResponse.json(
    {
      message: "Account created",
      user: {
        id: user.id,
        name: user.name
      }
    },
    { status: 201 }
  )
})
