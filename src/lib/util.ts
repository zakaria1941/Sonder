/** Deterministic 32-bit string hash — same input always yields the same art. */
export function hash(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Small seeded PRNG (mulberry32) so generated artwork is stable across reloads. */
export function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

/** 214 -> "3:34" */
export function duration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** 4820 -> "1 hr 20 min" */
export function runtime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  if (h === 0) return `${m} min`
  return `${h} hr ${m} min`
}

export function hexToRgb(hex: string): string {
  const v = hex.replace('#', '')
  const n = parseInt(
    v.length === 3
      ? v
          .split('')
          .map((c) => c + c)
          .join('')
      : v,
    16,
  )
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export function pick<T>(list: readonly T[], rand: () => number): T {
  return list[Math.floor(rand() * list.length) % list.length]
}

export function shuffle<T>(list: readonly T[], rand: () => number): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function unique<T>(list: T[]): T[] {
  return [...new Set(list)]
}

/** Unsplash delivery URL with our own crop + quality parameters. */
export function photo(id: string, w = 1200, opts: { h?: number; q?: number } = {}): string {
  const params = new URLSearchParams({
    auto: 'format',
    fit: 'crop',
    w: String(w),
    q: String(opts.q ?? 72),
  })
  if (opts.h) params.set('h', String(opts.h))
  return `https://images.unsplash.com/photo-${id}?${params.toString()}`
}

export function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
