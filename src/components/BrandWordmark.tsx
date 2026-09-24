export const BRAND_NAME = 'NucleusArt'

/** "Nucleus" inherits the surrounding text colour; "Art" uses the brand violet, as in the logo. */
export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      Nucleus<span className="text-[#8020FC]">Art</span>
    </span>
  )
}
