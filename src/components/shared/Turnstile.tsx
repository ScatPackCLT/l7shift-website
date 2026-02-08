'use client'

import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    turnstile: {
      render: (container: string | HTMLElement, options: TurnstileOptions) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
      getResponse: (widgetId: string) => string | undefined
    }
    onTurnstileLoad?: () => void
  }
}

interface TurnstileOptions {
  sitekey: string
  callback?: (token: string) => void
  'error-callback'?: () => void
  'expired-callback'?: () => void
  theme?: 'light' | 'dark' | 'auto'
  size?: 'normal' | 'compact' | 'invisible'
  action?: string
}

// Site key is inlined at build time from env
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''

interface TurnstileWidgetProps {
  onVerify?: (token: string) => void
  onError?: () => void
  onExpired?: () => void
  className?: string
  siteKey?: string
}

export function TurnstileWidget({ onVerify, onError, onExpired, className, siteKey }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [isReady, setIsReady] = useState(false)

  // Use refs for callbacks to avoid re-rendering widget on callback changes
  const onVerifyRef = useRef(onVerify)
  const onErrorRef = useRef(onError)
  const onExpiredRef = useRef(onExpired)

  // Keep refs updated
  onVerifyRef.current = onVerify
  onErrorRef.current = onError
  onExpiredRef.current = onExpired

  const key = siteKey || TURNSTILE_SITE_KEY

  // Load Turnstile script
  useEffect(() => {
    if (!key) {
      console.warn('[Turnstile] No site key configured')
      return
    }

    if (typeof window === 'undefined') return

    // Check if script already loaded
    if (window.turnstile) {
      setIsReady(true)
      return
    }

    // Check if script is loading
    if (document.querySelector('#turnstile-script')) {
      // Wait for it to load
      const checkReady = setInterval(() => {
        if (window.turnstile) {
          setIsReady(true)
          clearInterval(checkReady)
        }
      }, 100)
      return () => clearInterval(checkReady)
    }

    // Load the script
    const script = document.createElement('script')
    script.id = 'turnstile-script'
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad'
    script.async = true

    window.onTurnstileLoad = () => {
      setIsReady(true)
    }

    document.head.appendChild(script)
  }, [key])

  // Render widget when ready
  useEffect(() => {
    if (!isReady || !key || !containerRef.current || !window.turnstile) return

    // Remove existing widget if any
    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current)
      } catch {
        // Ignore
      }
    }

    try {
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: key,
        theme: 'dark',
        callback: (token: string) => {
          onVerifyRef.current?.(token)
        },
        'error-callback': () => {
          onErrorRef.current?.()
        },
        'expired-callback': () => {
          onExpiredRef.current?.()
        },
      })
    } catch (err) {
      console.error('[Turnstile] Render error:', err)
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {
          // Ignore
        }
      }
    }
  }, [isReady, key]) // Removed callback dependencies - using refs instead

  if (!key) return null

  return <div ref={containerRef} className={className} />
}

// Hook for programmatic usage
export function useTurnstile() {
  const [token, setToken] = useState<string | null>(null)

  return {
    token,
    setToken,
    isConfigured: !!TURNSTILE_SITE_KEY,
    siteKey: TURNSTILE_SITE_KEY
  }
}
