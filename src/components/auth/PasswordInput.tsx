'use client'

import { useState, type InputHTMLAttributes } from 'react'

/** Password field with a Show/Hide button — mistyped passwords were a common sign-in failure. */
export function PasswordInput({ className = '', ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input {...props} type={visible ? 'text' : 'password'} className={`${className} pr-16`} />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute inset-y-0 right-0 px-4 text-xs font-semibold text-[#8020fc] hover:text-[#5b12c4]"
      >
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}
