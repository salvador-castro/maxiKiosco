// /Users/salvacastro/Desktop/maxikiosco/src/components/layout/LayoutPOS.tsx
'use client'

import React from 'react'

export default function LayoutPOS({ children }: { children: React.ReactNode }) {
  return (
    <main className='mx-auto w-full max-w-6xl px-4 py-6'>
      <div className='rounded-2xl border border-slate-800 bg-slate-950 p-4'>
        <h1 className='text-lg font-semibold text-slate-100 mb-4'>POS</h1>
        {children}
      </div>
    </main>
  )
}
