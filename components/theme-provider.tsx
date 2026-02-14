'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
  useTheme,
} from 'next-themes'
import { getStoredPalette, applyPalette } from '@/lib/theme-config'

function PaletteInitializer({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (!mounted) return
    const palette = getStoredPalette()
    // Small delay to let next-themes apply the class first
    const timer = setTimeout(() => applyPalette(palette), 50)
    return () => clearTimeout(timer)
  }, [mounted, resolvedTheme])

  return <>{children}</>
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      <PaletteInitializer>{children}</PaletteInitializer>
    </NextThemesProvider>
  )
}
