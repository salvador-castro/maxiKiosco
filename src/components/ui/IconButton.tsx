// /Users/salvacastro/Desktop/maxikiosco/src/components/ui/IconButton.tsx
'use client'

import React from 'react'

type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  title?: string
}

export default function IconButton({ className = '', ...props }: IconButtonProps) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 px-3 py-2 text-slate-100 ${className}`}
    />
  )
}
