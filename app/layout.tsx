'use client'

import './globals.css'
import { useEffect, useState } from 'react'
import { Toaster } from 'sonner'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light'

    const saved = localStorage.getItem('theme')
    if (saved === 'dark' || saved === 'light') return saved

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
  }

  return (
    <html lang="es">
      <body className="selection-gold">
        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          title="Cambiar tema"
          aria-label="Cambiar tema"
        >
          Tema
        </button>
        {children}
        <Toaster position="top-center" expand={false} richColors closeButton theme={theme} />
      </body>
    </html>
  )
}