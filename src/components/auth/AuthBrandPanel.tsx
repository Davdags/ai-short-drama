/**
 * Brand visuals for the sign-in, sign-up and password pages: real pictures made with
 * NucleusArt (from the Prompt Library) instead of a plain gradient, and the free-credit
 * offer up front. <AuthBrandPanel> is the desktop right half; <AuthMobileHero> the strip
 * shown above the form on phones.
 */

const MOSAIC = [
  'the-quiet-assistant',
  'lagos-traffic-proposal',
  'the-night-market-promise',
  'letters-from-seat-14b',
  'the-group-chat',
  'the-will-reading',
]

const BENEFITS = [
  'Your story becomes a script, cast and storyboard',
  'Realistic, anime or comic looks',
  'See the price of every step before you click',
]

function Picture({ slug, className = '' }: { slug: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/images/prompts/${slug}.jpg`} alt="" loading="lazy" className={`h-full w-full object-cover ${className}`} />
  )
}

export function FreeCreditsBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-[#5b12c4] shadow-sm ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-[#8020fc]" aria-hidden />
      150 free credits when you sign up
    </span>
  )
}

export function AuthBrandPanel({ headline, description }: { headline: string; description: string }) {
  return (
    <div className="relative hidden overflow-hidden rounded-l-3xl bg-[#130826] lg:flex lg:w-1/2">
      <div className="absolute inset-0 grid grid-cols-3 gap-2 p-2 opacity-60">
        {MOSAIC.map((slug, index) => (
          <div key={slug} className={`overflow-hidden rounded-2xl ${index % 2 ? 'translate-y-10' : ''}`}>
            <Picture slug={slug} />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-[#130826] via-[#130826]/85 to-[#130826]/20" />
      <div className="relative z-10 mt-auto max-w-lg p-12">
        <FreeCreditsBadge />
        <h2 className="mt-5 whitespace-pre-line text-4xl font-extrabold leading-tight text-white">{headline}</h2>
        <p className="mt-3 text-lg text-white/75">{description}</p>
        <ul className="mt-6 space-y-2">
          {BENEFITS.map((benefit) => (
            <li key={benefit} className="flex items-center gap-2 text-sm text-white/85">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#8020fc] text-[10px] text-white">✓</span>
              {benefit}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function AuthMobileHero() {
  return (
    <div className="relative -mx-5 -mt-8 mb-8 h-40 overflow-hidden sm:-mx-8 lg:hidden">
      <div className="grid h-full grid-cols-3 gap-1">
        {MOSAIC.slice(0, 3).map((slug) => <Picture key={slug} slug={slug} />)}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-white via-white/30 to-transparent" />
      <FreeCreditsBadge className="absolute bottom-3 left-5 sm:left-8" />
    </div>
  )
}
