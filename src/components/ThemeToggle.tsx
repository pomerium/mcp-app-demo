import React, { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'
import { cn } from '../lib/utils'

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)

  // After mounting, we can safely show the theme toggle
  useEffect(() => {
    setMounted(true)
    const isDark =
      document.documentElement.classList.contains('dark') ||
      window.matchMedia('(prefers-color-scheme: dark)').matches
    setIsDarkMode(isDark)
  }, [])

  useEffect(() => {
    if (!mounted) return

    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode, mounted])

  // Prevent hydration mismatch by not rendering anything until mounted
  if (!mounted) {
    return (
      <button
        className={cn(
          'rounded-full p-2 transition-colors',
          'hover:bg-gray-200 dark:hover:bg-gray-700',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400',
        )}
        aria-label="Theme toggle"
      />
    )
  }

  return (
    <button
      onClick={() => setIsDarkMode(!isDarkMode)}
      className={cn(
        'rounded-full p-2 transition-colors',
        'hover:bg-gray-200 dark:hover:bg-gray-700',
        'focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400',
      )}
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDarkMode ? (
        <Sun className="h-5 w-5 text-amber-500" />
      ) : (
        <Moon className="h-5 w-5 text-indigo-600" />
      )}
    </button>
  )
}
