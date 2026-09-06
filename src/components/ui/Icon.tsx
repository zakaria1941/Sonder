import type { ReactElement, SVGProps } from 'react'

/**
 * Hand-drawn icon set. No icon library — a single consistent stroke
 * weight across every glyph is most of what stops an interface from
 * looking assembled out of parts.
 */

export type IconName =
  | 'play'
  | 'pause'
  | 'next'
  | 'prev'
  | 'shuffle'
  | 'repeat'
  | 'heart'
  | 'heart-filled'
  | 'volume'
  | 'volume-off'
  | 'search'
  | 'close'
  | 'more'
  | 'plus'
  | 'check'
  | 'chevron-right'
  | 'chevron-left'
  | 'chevron-down'
  | 'arrow-right'
  | 'arrow-up'
  | 'wave'
  | 'home'
  | 'compass'
  | 'wand'
  | 'library'
  | 'user'
  | 'send'
  | 'trash'
  | 'edit'
  | 'clock'
  | 'refresh'
  | 'sliders'

const PATHS: Record<IconName, ReactElement> = {
  play: (
    <path
      d="M7 4.8v14.4a.6.6 0 0 0 .92.5l11.3-7.2a.6.6 0 0 0 0-1L7.92 4.3A.6.6 0 0 0 7 4.8Z"
      fill="currentColor"
      stroke="none"
    />
  ),
  pause: (
    <>
      <rect x="6.5" y="4.5" width="4" height="15" rx="1.2" fill="currentColor" stroke="none" />
      <rect x="13.5" y="4.5" width="4" height="15" rx="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  next: (
    <>
      <path
        d="M5 5.6v12.8a.5.5 0 0 0 .77.42l9.6-6.4a.5.5 0 0 0 0-.84l-9.6-6.4A.5.5 0 0 0 5 5.6Z"
        fill="currentColor"
        stroke="none"
      />
      <rect x="17" y="5" width="2.4" height="14" rx="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  prev: (
    <>
      <path
        d="M19 5.6v12.8a.5.5 0 0 1-.77.42l-9.6-6.4a.5.5 0 0 1 0-.84l9.6-6.4a.5.5 0 0 1 .77.42Z"
        fill="currentColor"
        stroke="none"
      />
      <rect x="4.6" y="5" width="2.4" height="14" rx="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  shuffle: (
    <>
      <path d="M3 7h3.2c1.4 0 2.2.7 3 1.9l4.6 6.4c.8 1.1 1.6 1.7 3 1.7H21" />
      <path d="M3 17h3.2c1.4 0 2.2-.6 3-1.7l.9-1.2" />
      <path d="M14 8.2l.8-1.1c.8-1.2 1.6-1.9 3-1.9H21" />
      <path d="M18.6 3.5 21.5 6l-2.9 2.5M18.6 14.5 21.5 17l-2.9 2.5" />
    </>
  ),
  repeat: (
    <>
      <path d="M17 3.5 20 6l-3 2.5" />
      <path d="M20 6H7.5A3.5 3.5 0 0 0 4 9.5V11" />
      <path d="M7 20.5 4 18l3-2.5" />
      <path d="M4 18h12.5a3.5 3.5 0 0 0 3.5-3.5V13" />
    </>
  ),
  heart: <path d="M12 20.2s-7.6-4.6-7.6-9.7A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.6 2.9c0 5.1-7.6 9.7-7.6 9.7Z" />,
  'heart-filled': (
    <path
      d="M12 20.2s-7.6-4.6-7.6-9.7A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.6 2.9c0 5.1-7.6 9.7-7.6 9.7Z"
      fill="currentColor"
    />
  ),
  volume: (
    <>
      <path d="M4 9.5h3L11.5 6v12L7 14.5H4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1Z" />
      <path d="M15.4 9.2a4 4 0 0 1 0 5.6M18.2 6.6a8 8 0 0 1 0 10.8" />
    </>
  ),
  'volume-off': (
    <>
      <path d="M4 9.5h3L11.5 6v12L7 14.5H4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1Z" />
      <path d="m16 9.6 5 4.8M21 9.6l-5 4.8" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.4" />
      <path d="m16 16 4.4 4.4" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
  more: (
    <>
      <circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m4.8 12.6 4.6 4.6L19.2 7.4" />,
  'chevron-right': <path d="m9 5 7 7-7 7" />,
  'chevron-left': <path d="m15 5-7 7 7 7" />,
  'chevron-down': <path d="m5 9 7 7 7-7" />,
  'arrow-right': <path d="M4 12h15m-5.5-5.5L19 12l-5.5 5.5" />,
  'arrow-up': <path d="M12 20V5m-5.5 5.5L12 5l5.5 5.5" />,
  wave: <path d="M2 12c1.6 0 1.6-6 3.2-6s1.6 12 3.2 12S10 6 11.6 6s1.6 12 3.2 12 1.6-9 3.2-9 1.6 3 3 3" />,
  home: (
    <>
      <path d="M4 10.4 12 4l8 6.4V19a1.4 1.4 0 0 1-1.4 1.4H5.4A1.4 1.4 0 0 1 4 19v-8.6Z" />
      <path d="M9.6 20.4v-6h4.8v6" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="m15.2 8.8-1.9 4.5-4.5 1.9 1.9-4.5 4.5-1.9Z" />
    </>
  ),
  wand: (
    <>
      <path d="M5 19 16.5 7.5" />
      <path d="M14.6 5.6 18.4 9.4" />
      <path d="M8 3.2v3M6.5 4.7h3M18 15.4v2.8M16.6 16.8h2.8" />
    </>
  ),
  library: (
    <>
      <rect x="3.6" y="4.4" width="4" height="15.2" rx="1.2" />
      <rect x="10" y="4.4" width="4" height="15.2" rx="1.2" />
      <path d="m17.2 6.4 3.4 13.2" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.4" r="3.8" />
      <path d="M4.8 20.2a7.4 7.4 0 0 1 14.4 0" />
    </>
  ),
  send: <path d="M20.4 3.6 3.8 10.2l6.6 2.6m10-9.2-6.6 16.8-2.8-7m9.4-9.8-9.4 9.8" />,
  trash: (
    <>
      <path d="M4.6 6.6h14.8M9.4 6.6V4.8a1 1 0 0 1 1-1h3.2a1 1 0 0 1 1 1v1.8" />
      <path d="M6.6 6.6 7.6 20a1 1 0 0 0 1 .9h6.8a1 1 0 0 0 1-.9l1-13.4" />
    </>
  ),
  edit: (
    <>
      <path d="M15.6 4.6 19.4 8.4 8.8 19H5v-3.8L15.6 4.6Z" />
      <path d="m13.8 6.4 3.8 3.8" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 7.4V12l3 1.8" />
    </>
  ),
  refresh: (
    <>
      <path d="M19.4 11a7.4 7.4 0 1 0-.6 4.6" />
      <path d="M20 5.6v5h-5" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 8h8M16 8h4M4 16h4M12 16h8" />
      <circle cx="14" cy="8" r="2" />
      <circle cx="10" cy="16" r="2" />
    </>
  ),
}

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  size?: number
}

export function Icon({ name, size = 20, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  )
}
