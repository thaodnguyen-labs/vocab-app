type MascotState = 'idle' | 'happy' | 'waving'
type MascotSize = 'sm' | 'md' | 'lg'

const sizePx: Record<MascotSize, number> = {
  sm: 48,
  md: 80,
  lg: 128,
}

export default function Mascot({
  state = 'idle',
  size = 'md',
  message,
  className = '',
}: {
  state?: MascotState
  size?: MascotSize
  message?: string
  className?: string
}) {
  const px = sizePx[size]

  return (
    <div className={`flex items-end gap-3 ${className}`}>
      <svg
        width={px}
        height={px}
        viewBox="0 0 100 100"
        aria-label="Vocab buddy mascot"
        className="shrink-0"
      >
        {/* Body */}
        <ellipse cx="50" cy="62" rx="32" ry="30" fill="var(--brand-green)" />
        {/* Belly */}
        <ellipse cx="50" cy="68" rx="20" ry="20" fill="var(--tint-green)" />
        {/* Head tufts */}
        <path d="M24 38 L30 22 L36 36 Z" fill="var(--brand-green-dark)" />
        <path d="M76 38 L70 22 L64 36 Z" fill="var(--brand-green-dark)" />
        {/* Eyes */}
        <circle cx="40" cy="50" r="9" fill="white" />
        <circle cx="60" cy="50" r="9" fill="white" />
        {state === 'happy' ? (
          <>
            <path
              d="M35 50 Q40 45 45 50"
              stroke="var(--foreground)"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M55 50 Q60 45 65 50"
              stroke="var(--foreground)"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
          </>
        ) : (
          <>
            <circle cx="40" cy="50" r="3.5" fill="var(--foreground)" />
            <circle cx="60" cy="50" r="3.5" fill="var(--foreground)" />
            <circle cx="41" cy="48.5" r="1.2" fill="white" />
            <circle cx="61" cy="48.5" r="1.2" fill="white" />
          </>
        )}
        {/* Beak */}
        <path
          d="M46 58 L54 58 L50 66 Z"
          fill="var(--brand-amber)"
          stroke="var(--brand-amber-dark)"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {/* Cheeks (happy/waving) */}
        {state !== 'idle' && (
          <>
            <circle cx="32" cy="60" r="4" fill="var(--brand-rose)" opacity="0.5" />
            <circle cx="68" cy="60" r="4" fill="var(--brand-rose)" opacity="0.5" />
          </>
        )}
        {/* Arm */}
        {state === 'waving' ? (
          <path
            d="M82 50 Q92 40 88 28"
            stroke="var(--brand-green-dark)"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="-10 82 50"
              to="20 82 50"
              dur="0.6s"
              repeatCount="indefinite"
              values="-10 82 50;20 82 50;-10 82 50"
            />
          </path>
        ) : (
          <ellipse cx="20" cy="66" rx="6" ry="10" fill="var(--brand-green-dark)" />
        )}
        {/* Feet */}
        <ellipse cx="42" cy="92" rx="6" ry="3" fill="var(--brand-amber-dark)" />
        <ellipse cx="58" cy="92" rx="6" ry="3" fill="var(--brand-amber-dark)" />
      </svg>

      {message && (
        <div className="relative bg-card border-2 border-border rounded-2xl px-3 py-2 text-sm text-foreground font-medium max-w-[200px]">
          <span
            aria-hidden
            className="absolute left-[-8px] bottom-4 w-0 h-0"
            style={{
              borderTop: '6px solid transparent',
              borderBottom: '6px solid transparent',
              borderRight: '8px solid var(--border)',
            }}
          />
          <span
            aria-hidden
            className="absolute left-[-5px] bottom-4 w-0 h-0"
            style={{
              borderTop: '6px solid transparent',
              borderBottom: '6px solid transparent',
              borderRight: '8px solid var(--card)',
            }}
          />
          {message}
        </div>
      )}
    </div>
  )
}
