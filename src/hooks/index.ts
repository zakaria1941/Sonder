import { useEffect, useRef, useState } from 'react'
import { hexToRgb } from '@/lib/util'

/**
 * Paints the whole interface in a mood's hue. Every accent in the app
 * reads from --accent, so setting it here repaints buttons, rules,
 * the waveform and the player in one move.
 */
export function useAccent(hex: string | undefined) {
  useEffect(() => {
    if (!hex) return
    const root = document.documentElement
    const prevHex = root.style.getPropertyValue('--accent')
    const prevRgb = root.style.getPropertyValue('--accent-rgb')
    root.style.setProperty('--accent', hex)
    root.style.setProperty('--accent-rgb', hexToRgb(hex))
    return () => {
      root.style.setProperty('--accent', prevHex || '#FF6A45')
      root.style.setProperty('--accent-rgb', prevRgb || '255, 106, 69')
    }
  }, [hex])
}

/** Reveals content once as it scrolls into frame. */
export function useReveal<T extends HTMLElement = HTMLDivElement>(threshold = 0.15) {
  const ref = useRef<T | null>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { threshold, rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])

  return { ref, shown }
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(query)
    const handler = () => setMatches(mq.matches)
    handler()
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [query])
  return matches
}

export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}

/** Cmd/Ctrl+K style shortcuts. */
export function useHotkey(key: string, handler: () => void, withMeta = true) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (e.key.toLowerCase() === key.toLowerCase() && (!withMeta || meta)) {
        e.preventDefault()
        handler()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [key, handler, withMeta])
}

/** Locks body scroll while an overlay is open. */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [active])
}

/** Types out a string, then holds. Used for the rotating hero placeholder. */
export function useTypewriter(phrases: string[], enabled = true) {
  const [text, setText] = useState('')
  const [phraseIndex, setPhraseIndex] = useState(0)

  useEffect(() => {
    if (!enabled || !phrases.length) return
    const phrase = phrases[phraseIndex % phrases.length]
    let char = 0
    let hold: number | undefined
    const typing = window.setInterval(() => {
      char += 1
      setText(phrase.slice(0, char))
      if (char >= phrase.length) {
        window.clearInterval(typing)
        hold = window.setTimeout(() => setPhraseIndex((i) => i + 1), 2600)
      }
    }, 34)
    return () => {
      window.clearInterval(typing)
      if (hold) window.clearTimeout(hold)
    }
  }, [phraseIndex, phrases, enabled])

  return text
}

/**
 * Keeps an overlay mounted long enough to play its closing animation.
 * CSS drives the motion, so if animations never run the element is simply
 * present or absent — it can never get stranded at opacity 0.
 */
export function usePresence(open: boolean, duration = 260) {
  const [present, setPresent] = useState(open)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (open) {
      setClosing(false)
      setPresent(true)
      return
    }
    if (!present) return
    setClosing(true)
    const id = window.setTimeout(() => {
      setPresent(false)
      setClosing(false)
    }, duration)
    return () => window.clearTimeout(id)
  }, [open, present, duration])

  return { present, closing }
}
