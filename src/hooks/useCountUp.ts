'use client'

import { useState, useEffect, useRef } from 'react'

interface UseCountUpOptions {
  end: number
  duration?: number
  decimals?: number
  startOnView?: boolean
}

export function useCountUp({ end, duration = 2000, decimals = 0, startOnView = true }: UseCountUpOptions) {
  const [count, setCount] = useState(0)
  const [isInView, setIsInView] = useState(false)
  const [hasAnimated, setHasAnimated] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Track visibility
  useEffect(() => {
    if (!startOnView || !ref.current) {
      setIsInView(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
        }
      },
      { threshold: 0.2 }
    )

    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [startOnView])

  // Animate when both in view AND data is ready
  useEffect(() => {
    if (!isInView || end === 0 || hasAnimated) return

    setHasAnimated(true)
    const startTime = Date.now()

    const tick = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = end * eased

      setCount(Number(current.toFixed(decimals)))

      if (progress < 1) {
        requestAnimationFrame(tick)
      }
    }

    requestAnimationFrame(tick)
  }, [isInView, end, duration, decimals, hasAnimated])

  return { count, ref }
}
