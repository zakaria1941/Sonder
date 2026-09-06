import { useEffect, useRef } from 'react'
import { useReducedMotion } from '@/hooks'
import { cx } from '@/lib/util'

/**
 * The Signal.
 *
 * One waveform threads the whole product: it breathes under the hero,
 * reacts as you pick a mood, becomes the progress meter while a playlist
 * is being built, and ends up as the seek bar in the player. Same
 * component, same maths, four jobs — which is the argument the interface
 * is making, that a feeling and a sound are the same shape.
 */

export interface SignalProps {
  /** 0..1 — how far the wave swings. Driven by mood or track energy. */
  amplitude?: number
  /** 0..1 — how jagged. Low is smooth and sad, high is busy and bright. */
  complexity?: number
  /** Animation rate multiplier. */
  speed?: number
  /** 0..1 — when set, everything before it is drawn in the accent colour. */
  progress?: number
  variant?: 'line' | 'bars'
  /** Frozen waveforms still render, they just do not move. */
  active?: boolean
  height?: number
  barGap?: number
  barWidth?: number
  seed?: number
  className?: string
  /** Draws a soft bloom under the stroke. Off for small UI. */
  glow?: boolean
  dim?: boolean
}

export function Signal({
  amplitude = 0.55,
  complexity = 0.5,
  speed = 1,
  progress,
  variant = 'line',
  active = true,
  height = 120,
  barGap = 3,
  barWidth = 3,
  seed = 1,
  className,
  glow = true,
  dim = false,
}: SignalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const reduced = useReducedMotion()

  // Latest props without restarting the animation loop on every change.
  const props = useRef({ amplitude, complexity, speed, progress, variant, active, barGap, barWidth, seed, glow, dim })
  props.current = { amplitude, complexity, speed, progress, variant, active, barGap, barWidth, seed, glow, dim }

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = 0
    let h = 0
    let raf = 0
    let visible = true
    let t = 0

    const readAccent = () => {
      const styles = getComputedStyle(document.documentElement)
      return {
        accent: styles.getPropertyValue('--accent').trim() || '#FF6A45',
        rgb: styles.getPropertyValue('--accent-rgb').trim() || '255, 106, 69',
      }
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = wrap.getBoundingClientRect()
      width = Math.max(1, rect.width)
      h = Math.max(1, rect.height)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    /** Sum of three detuned sines with an edge taper, so the line lands flat at both ends. */
    const sample = (x: number, time: number, p: typeof props.current) => {
      const taper = Math.sin(Math.PI * x) ** 0.65
      const c = p.complexity
      const a =
        Math.sin(x * 6.2 + time * 1.0 + p.seed) * 0.62 +
        Math.sin(x * (11 + c * 14) - time * 1.45 + p.seed * 2.3) * (0.22 + c * 0.3) +
        Math.sin(x * (19 + c * 26) + time * 2.1 + p.seed * 4.1) * (0.09 + c * 0.22)
      return a * taper * p.amplitude
    }

    const draw = () => {
      const p = props.current
      const { accent, rgb } = readAccent()
      ctx.clearRect(0, 0, width, h)
      const mid = h / 2
      const swing = h * 0.42

      if (p.variant === 'bars') {
        const step = p.barWidth + p.barGap
        const count = Math.max(1, Math.floor(width / step))
        const cut = p.progress === undefined ? count : Math.round(p.progress * count)
        for (let i = 0; i < count; i++) {
          const x = i / (count - 1 || 1)
          const v = Math.abs(sample(x, t, p))
          const bh = Math.max(2, v * swing * 2)
          const played = i < cut
          ctx.fillStyle = played ? accent : dimColour(rgb, p.dim)
          ctx.globalAlpha = played ? 1 : 0.5
          const bx = i * step
          const by = mid - bh / 2
          roundRect(ctx, bx, by, p.barWidth, bh, p.barWidth / 2)
          ctx.fill()
        }
        ctx.globalAlpha = 1
        return
      }

      // Line variant
      const points: Array<[number, number]> = []
      const steps = Math.min(280, Math.max(60, Math.round(width / 4)))
      for (let i = 0; i <= steps; i++) {
        const x = i / steps
        points.push([x * width, mid - sample(x, t, p) * swing])
      }

      const stroke = (from: number, to: number, colour: string, alpha: number, blur: number) => {
        if (to <= from) return
        ctx.beginPath()
        ctx.moveTo(points[from][0], points[from][1])
        for (let i = from + 1; i <= to; i++) {
          const [x0, y0] = points[i - 1]
          const [x1, y1] = points[i]
          ctx.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
        }
        ctx.strokeStyle = colour
        ctx.globalAlpha = alpha
        ctx.lineWidth = 1.6
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        if (blur > 0 && p.glow) {
          ctx.shadowColor = `rgba(${rgb}, 0.85)`
          ctx.shadowBlur = blur
        } else {
          ctx.shadowBlur = 0
        }
        ctx.stroke()
        ctx.shadowBlur = 0
        ctx.globalAlpha = 1
      }

      if (p.progress === undefined) {
        stroke(0, steps, accent, p.dim ? 0.4 : 0.9, 12)
      } else {
        const cut = Math.round(p.progress * steps)
        stroke(cut, steps, dimColour(rgb, true), 0.42, 0)
        stroke(0, cut, accent, 1, 14)
      }
    }

    const loop = () => {
      const p = props.current
      if (visible && p.active && !reduced) t += 0.016 * p.speed
      draw()
      raf = requestAnimationFrame(loop)
    }

    resize()
    const ro = new ResizeObserver(() => {
      resize()
      draw()
    })
    ro.observe(wrap)

    const io =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver((entries) => {
            visible = entries[0].isIntersecting
          })
        : null
    io?.observe(wrap)

    // Paint one frame synchronously so the waveform exists even where
    // requestAnimationFrame never runs (reduced motion, a background tab).
    draw()
    if (!reduced) raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io?.disconnect()
    }
  }, [reduced])

  return (
    <div ref={wrapRef} className={cx('signal', className)} style={{ height }} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  )
}

function dimColour(rgb: string, dim: boolean | undefined): string {
  return dim ? `rgba(${rgb}, 0.28)` : 'rgba(239, 235, 227, 0.22)'
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}
