import { Pill } from '@/components/ui/Pill'
import { LEVEL_COLOURS, LEVEL_TONES, levelLabel } from '@/lib/attendance'

export function LevelPill({ level }: { level: number }) {
  if (level < 1) return <Pill>Not assessed</Pill>
  return <Pill tone={LEVEL_TONES[level - 1]}>{levelLabel(level)}</Pill>
}

export function LevelMeter({ level }: { level: number }) {
  const colour = LEVEL_COLOURS[Math.max(0, level - 1)] ?? '#d9dce6'
  return (
    <div className="flex gap-[3px]" aria-label={levelLabel(level)}>
      {[1, 2, 3, 4].map((n) => (
        <span
          key={n}
          className="block h-2 w-6 rounded"
          style={{ background: n <= level ? colour : '#d9dce6' }}
        />
      ))}
    </div>
  )
}

export function Trend({ value }: { value: 'improved' | 'dropped' | 'no_change' }) {
  if (value === 'improved') return <b className="text-success">↑ Improved</b>
  if (value === 'dropped') return <b className="text-danger">↓ Dropped</b>
  return <span className="text-muted">No change</span>
}

export function childName(row: { firstName: string; lastName: string | null }) {
  return `${row.firstName}${row.lastName ? ` ${row.lastName}` : ''}`
}
