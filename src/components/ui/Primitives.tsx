import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from './Icon'
import type { IconName } from './Icon'
import { cx } from '@/lib/util'
import { useReveal } from '@/hooks'

/* ---------------- Button ---------------- */

type Variant = 'primary' | 'outline' | 'ghost' | 'quiet' | 'icon'
type Size = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: IconName
  iconRight?: IconName
  children?: ReactNode
  /** Renders as a router link while keeping the button styling. */
  to?: string
  full?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon, iconRight, children, className, to, full, ...rest },
  ref,
) {
  const cls = cx('btn', `btn--${variant}`, `btn--${size}`, full && 'btn--full', className)
  const inner = (
    <>
      {icon && <Icon name={icon} size={size === 'lg' ? 20 : 17} />}
      {children && <span className="btn__label">{children}</span>}
      {iconRight && <Icon name={iconRight} size={size === 'lg' ? 20 : 17} className="btn__trail" />}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={cls}>
        {inner}
      </Link>
    )
  }

  return (
    <button ref={ref} className={cls} {...rest}>
      {inner}
    </button>
  )
})

/* ---------------- Chip ---------------- */

export interface ChipProps {
  label: string
  selected?: boolean
  onClick?: () => void
  hue?: string
  /** Small text under the label, e.g. a mood blurb. */
  hint?: string
  size?: 'sm' | 'md'
  as?: 'button' | 'span'
}

export function Chip({ label, selected, onClick, hue, hint, size = 'md', as = 'button' }: ChipProps) {
  const style = hue ? ({ ['--chip-hue' as string]: hue } as React.CSSProperties) : undefined
  const cls = cx('chip', `chip--${size}`, selected && 'is-selected', hue && 'chip--hued')

  if (as === 'span') {
    return (
      <span className={cls} style={style}>
        <span className="chip__label">{label}</span>
      </span>
    )
  }

  return (
    <button type="button" className={cls} style={style} onClick={onClick} aria-pressed={selected}>
      <span className="chip__label">{label}</span>
      {hint && <span className="chip__hint">{hint}</span>}
    </button>
  )
}

/* ---------------- Reveal ---------------- */

export function Reveal({
  children,
  delay = 0,
  className,
  style,
  as: Tag = 'div',
}: {
  children: ReactNode
  delay?: number
  className?: string
  style?: React.CSSProperties
  as?: 'div' | 'section' | 'li' | 'article'
}) {
  const { ref, shown } = useReveal()
  return (
    <Tag
      ref={ref as never}
      className={cx('reveal', shown && 'is-in', className)}
      style={{ transitionDelay: `${delay}ms`, ...style }}
    >
      {children}
    </Tag>
  )
}

/* ---------------- Equalizer ---------------- */

/** Three animating bars. Marks the row that is currently playing. */
export function Equalizer({ playing = true }: { playing?: boolean }) {
  return (
    <span className={cx('eq', playing && 'is-playing')} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  )
}

/* ---------------- Empty state ---------------- */

export function EmptyState({
  title,
  body,
  action,
  icon = 'wave',
}: {
  title: string
  body: string
  action?: ReactNode
  icon?: IconName
}) {
  return (
    <div className="empty">
      <span className="empty__mark">
        <Icon name={icon} size={26} />
      </span>
      <h3 className="display display--3">{title}</h3>
      <p className="lede">{body}</p>
      {action}
    </div>
  )
}

/* ---------------- Logo ---------------- */

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={cx('logo', compact && 'logo--compact')}>
      <svg className="logo__mark" viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" strokeWidth="1.7" opacity="0.55" />
        <path
          d="M5.5 16Q9 7.5 12.5 16T19.5 16T26.5 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      {!compact && <span className="logo__word">Sonder</span>}
    </span>
  )
}

/* ---------------- Metric ---------------- */

export function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="metric">
      <span className="metric__value display display--3">{value}</span>
      <span className="metric__label mono">{label}</span>
      {hint && <span className="metric__hint">{hint}</span>}
    </div>
  )
}
