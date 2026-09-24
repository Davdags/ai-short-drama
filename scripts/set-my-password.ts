/**
 * Owner password reset, for when email delivery is unavailable.
 *
 *   npx tsx --env-file=.env scripts/set-my-password.ts [username]
 *
 * Prompts for a new password in your own terminal (input is hidden), hashes it the
 * same way signup does, and marks the email verified so sign-in is not blocked.
 * The password is never logged, stored in shell history, or shown on screen.
 */
import bcrypt from 'bcryptjs'
import { createInterface } from 'node:readline'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function ask(question: string, hidden: boolean): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
  return new Promise((resolve) => {
    if (hidden) {
      const output = rl as unknown as { output: NodeJS.WriteStream; _writeToOutput: (s: string) => void }
      output._writeToOutput = function writeMasked(text: string) {
        // Echo the prompt itself, but never the typed characters.
        if (text.startsWith(question)) output.output.write(text)
      }
    }
    rl.question(question, (answer) => { rl.close(); process.stdout.write('\n'); resolve(answer) })
  })
}

async function main() {
  const username = process.argv[2] || 'davdags'
  const user = await prisma.user.findFirst({ where: { name: username }, select: { id: true, email: true } })
  if (!user) {
    console.error(`No account found with username "${username}".`)
    process.exitCode = 1
    return
  }

  console.log(`Account: ${username} (${user.email ?? 'no email'})\n`)
  const password = await ask('New password (at least 6 characters, typing is hidden): ', true)
  if (password.trim().length < 6) {
    console.error('Password must be at least 6 characters. Nothing was changed.')
    process.exitCode = 1
    return
  }
  const confirm = await ask('Type it once more to confirm: ', true)
  if (password !== confirm) {
    console.error('The two passwords did not match. Nothing was changed.')
    process.exitCode = 1
    return
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await bcrypt.hash(password, 12), emailVerified: new Date() },
  })

  console.log('\nDone. Password updated and email marked as verified.')
  console.log(`Sign in at http://localhost:3000/en/auth/signin as "${username}".`)
}

main()
  .catch((error) => { console.error('Failed:', error instanceof Error ? error.message : error) })
  .finally(() => prisma.$disconnect())
