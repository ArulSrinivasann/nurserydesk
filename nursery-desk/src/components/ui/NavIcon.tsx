import {
  choiceGlyph,
  isChoosableIcon,
  useNavIconChoices,
} from '@/components/ui/navIconChoices'
import type { ReactNode } from 'react'

export const NAV_ICON_NAMES = [
  'dashboard',
  'school',
  'classes',
  'students',
  'admissions',
  'fees',
  'otherFees',
  'collect',
  'report',
  'enquiries',
  'messages',
  'attendance',
  'updates',
  'progress',
  'document',
  'child',
  'plans',
] as const

export type NavIconName = (typeof NAV_ICON_NAMES)[number]

type Props = {
  name: NavIconName
  className?: string
}

const FILLS: Record<NavIconName, string> = {
  dashboard: '#F3E6C8',
  school: '#EBDCC4',
  classes: '#FFC93C',
  students: '#FFB3C7',
  admissions: '#A8E6C1',
  fees: '#FFD3A0',
  otherFees: '#FFC93C',
  collect: '#A8E6C1',
  report: '#F3E6C8',
  enquiries: '#EBDCC4',
  messages: '#9FD8FF',
  attendance: '#A8E6C1',
  updates: '#F3E6C8',
  progress: '#FFC93C',
  document: '#FFB3C7',
  child: '#A8E6C1',
  plans: '#FFD3A0',
}

const outline = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.65,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function fillLayer(fill: string, d: string) {
  return <path fill={fill} stroke="none" d={d} />
}

function icons(fill: string): Record<NavIconName, ReactNode> {
  return {
    dashboard: (
      <>
        <rect fill={fill} stroke="none" x="4.2" y="4.2" width="6.6" height="6.6" rx="1.4" />
        <rect fill={fill} stroke="none" x="13.2" y="4.2" width="6.6" height="6.6" rx="1.4" />
        <rect fill={fill} stroke="none" x="4.2" y="13.2" width="6.6" height="6.6" rx="1.4" />
        <rect fill={fill} stroke="none" x="13.2" y="13.2" width="6.6" height="6.6" rx="1.4" />
        <rect {...outline} x="4.2" y="4.2" width="6.6" height="6.6" rx="1.4" />
        <rect {...outline} x="13.2" y="4.2" width="6.6" height="6.6" rx="1.4" />
        <rect {...outline} x="4.2" y="13.2" width="6.6" height="6.6" rx="1.4" />
        <rect {...outline} x="13.2" y="13.2" width="6.6" height="6.6" rx="1.4" />
      </>
    ),
    school: (
      <>
        {fillLayer(fill, 'M2.8 10.6 12 3.8 21.2 10.6V20.4H2.8z')}
        <path {...outline} d="M3.2 10.7 12 4 20.8 10.7V20.2H3.2z" />
        <circle {...outline} cx="12" cy="8.1" r="1.45" />
        <rect {...outline} x="5.5" y="12.4" width="3.5" height="3.1" rx="0.5" />
        <rect {...outline} x="15" y="12.4" width="3.5" height="3.1" rx="0.5" />
        <path {...outline} d="M10.2 20.2v-5.2h3.6v5.2" />
        <path {...outline} d="M12 4V2.15" />
        {fillLayer(fill, 'M12 2.15 16.6 3.45 12 4.75z')}
        <path {...outline} d="M12 2.15 16.6 3.45 12 4.75" />
      </>
    ),
    classes: (
      <>
        <rect fill={fill} stroke="none" x="3.4" y="5" width="17.2" height="11.4" rx="1.5" />
        <rect {...outline} x="3.4" y="5" width="17.2" height="11.4" rx="1.5" />
        <path {...outline} d="M3.4 16.4h17.2M6.8 19.2h10.4" />
        <path {...outline} d="M7.2 8.6h6.8M7.2 11.4h9.2M7.2 14.2h4.8" />
      </>
    ),
    students: (
      <>
        <circle fill={fill} stroke="none" cx="9" cy="8.1" r="2.7" />
        <circle fill={fill} stroke="none" cx="16.4" cy="9.1" r="2.1" />
        <circle {...outline} cx="9" cy="8.1" r="2.7" />
        <path {...outline} d="M4.5 18.8c.5-2.6 2.2-4.1 4.5-4.1 2.3 0 4 1.5 4.5 4.1" />
        <circle {...outline} cx="16.4" cy="9.1" r="2.1" />
        <path {...outline} d="M15.2 14.8c1.6.3 3 1.4 3.5 3.6" />
      </>
    ),
    admissions: (
      <>
        {fillLayer(fill, 'M3 10.2 12 5 21 10.2 12 15.4z')}
        {fillLayer(fill, 'M7.2 12.6v2.2c0 2.5 2.1 4 4.8 4s4.8-1.5 4.8-4v-2.2')}
        <path {...outline} d="M3.2 10.2 12 5.2 20.8 10.2 12 15.2z" />
        <path {...outline} d="M7.4 12.8v2.1c0 2.3 2 3.7 4.6 3.7s4.6-1.4 4.6-3.7v-2.1" />
        <path {...outline} d="M20.8 10.2v6" />
        <path {...outline} d="M19.5 16.6c.5 1.3 2.1 1.3 2.6 0" />
      </>
    ),
    fees: (
      <>
        <circle fill={fill} stroke="none" cx="12" cy="12" r="9.2" />
        <text
          x="12"
          y="12.2"
          textAnchor="middle"
          dominantBaseline="central"
          fill="currentColor"
          stroke="none"
          fontFamily="Nunito, ui-sans-serif, system-ui, sans-serif"
          fontSize="13.5"
          fontWeight="800"
        >
          ₹
        </text>
      </>
    ),
    otherFees: (
      <>
        <rect fill={fill} stroke="none" x="3.6" y="8.4" width="16.8" height="3.8" rx="1" />
        <path
          fill={fill}
          stroke="none"
          d="M4.4 12.2h15.2v8a1.6 1.6 0 0 1-1.6 1.6H6a1.6 1.6 0 0 1-1.6-1.6z"
        />
        <path
          fill={fill}
          stroke="none"
          d="M12 8.4H8a2.4 2.4 0 0 1 0-4.8C10.8 3.6 12 8.4 12 8.4z"
        />
        <path
          fill={fill}
          stroke="none"
          d="M12 8.4h4a2.4 2.4 0 0 0 0-4.8C13.2 3.6 12 8.4 12 8.4z"
        />
        <rect {...outline} x="3.6" y="8.4" width="16.8" height="3.8" rx="1" />
        <path {...outline} d="M4.4 12.2v8A1.6 1.6 0 0 0 6 21.8h12a1.6 1.6 0 0 0 1.6-1.6v-8" />
        <path {...outline} d="M12 8.4v13.4" />
        <path {...outline} d="M12 8.4H8a2.4 2.4 0 0 1 0-4.8C10.8 3.6 12 8.4 12 8.4z" />
        <path {...outline} d="M12 8.4h4a2.4 2.4 0 0 0 0-4.8C13.2 3.6 12 8.4 12 8.4z" />
      </>
    ),
    collect: (
      <>
        <rect fill={fill} stroke="none" x="3.2" y="6.2" width="17.6" height="11.8" rx="1.8" />
        <rect {...outline} x="3.2" y="6.2" width="17.6" height="11.8" rx="1.8" />
        <path {...outline} d="M3.2 10.4h17.6" />
        <rect {...outline} x="5.4" y="12.8" width="3.6" height="2.4" rx="0.5" />
        <path {...outline} d="M14.2 14.2h4.2" />
      </>
    ),
    report: (
      <>
        <rect fill={fill} stroke="none" x="4.2" y="5.6" width="15.6" height="14.2" rx="1.8" />
        <rect {...outline} x="4.2" y="5.6" width="15.6" height="14.2" rx="1.8" />
        <path {...outline} d="M8.2 4.2v3M15.8 4.2v3M4.2 9.6h15.6" />
        <path {...outline} d="M8.6 14.4 10.8 16.4 15.6 11.8" />
      </>
    ),
    enquiries: (
      <>
        {fillLayer(
          fill,
          'M3.6 5.6c0-.9.7-1.6 1.6-1.6h2.2c.4 0 .8.3.9.7l.9 3.5c.1.4 0 .8-.3 1.1l-1 .8c-.3.2-.4.6-.3 1 1.3 3.2 3.8 5.7 7 7 .4.1.8 0 1-.3l.8-1c.3-.3.7-.4 1.1-.3l3.5.9c.4.1.7.5.7.9v2.2c0 .9-.7 1.6-1.6 1.6h-1.4C9.9 21.1 3 14.2 3 5.8V5.6z',
        )}
        <path
          {...outline}
          d="M5.2 4.2h2.2c.5 0 .9.3 1 .8l.9 3.5c.1.4 0 .8-.3 1.1l-1.1.8c-.2.2-.3.5-.2.8 1.4 3.4 4.1 6.1 7.5 7.5.3.1.6 0 .8-.2l.8-1.1c.3-.3.7-.4 1.1-.3l3.5.9c.5.1.8.5.8 1v2.2c0 .9-.7 1.6-1.6 1.6h-1.5C9.4 21.8 2.4 14.8 2.4 5.8V5.2c0-.9.7-1.6 1.6-1.6h1.2z"
        />
      </>
    ),
    messages: (
      <>
        {fillLayer(fill, 'M6.4 9.2a5.6 5.6 0 0 1 11.2 0V15H6.4z')}
        <path {...outline} d="M6.4 9.2a5.6 5.6 0 0 1 11.2 0" />
        <path {...outline} d="M6.4 9.2V15M17.6 9.2V15" />
        <path {...outline} d="M4.6 16.6h14.8" />
        <path {...outline} d="M10 16.6a2 2 0 0 0 4 0" />
        <path {...outline} d="M12 3.6v1.8" />
      </>
    ),
    attendance: (
      <>
        <circle fill={fill} stroke="none" cx="12" cy="12" r="8.1" />
        <circle {...outline} cx="12" cy="12" r="8.1" />
        <path {...outline} d="M8.3 12.2 10.9 14.8 16.1 9.5" />
      </>
    ),
    updates: (
      <>
        {fillLayer(fill, 'M6.2 4.4h9.2v10.2l-3.8 3.8H6.2z')}
        <path {...outline} d="M6.3 4.6h8.8A1.4 1.4 0 0 1 16.5 6v9.2L13.2 18.6H6.3A1.3 1.3 0 0 1 5 17.3V5.9A1.3 1.3 0 0 1 6.3 4.6z" />
        <path {...outline} d="M8.4 9.4h5.8M8.4 12.8h4" />
      </>
    ),
    progress: (
      <>
        {fillLayer(fill, 'M12 3.6 13.7 8.4l5 .4-3.8 3.2 1.2 4.7L12 14.1 7.9 16.7l1.2-4.7-3.8-3.2 5-.4z')}
        <path
          {...outline}
          d="M12 4 13.7 8.6l5 .4-3.8 3.2 1.2 4.6L12 14.2 7.9 16.8l1.2-4.6-3.8-3.2 5-.4z"
        />
      </>
    ),
    document: (
      <>
        {fillLayer(fill, 'M6.8 3.6h7l4.8 4.8v10.6H6.8z')}
        <path {...outline} d="M7.2 3.8h6.4L18.4 8.7v10.2A1.2 1.2 0 0 1 17.2 20.1H7.2A1.2 1.2 0 0 1 6 18.9V5A1.2 1.2 0 0 1 7.2 3.8z" />
        <path {...outline} d="M13.6 3.9V8.6h4.6M8.7 12.8h6.2M8.7 16h4" />
      </>
    ),
    child: (
      <>
        <circle fill={fill} stroke="none" cx="12" cy="8.2" r="3.1" />
        <circle {...outline} cx="12" cy="8.2" r="3.1" />
        <path {...outline} d="M6.3 19.4c.7-3 2.8-4.5 5.7-4.5s5 1.5 5.7 4.5" />
      </>
    ),
    plans: (
      <>
        {fillLayer(fill, 'M5.4 10 12 5.2 18.6 10v8.4L12 20.4 5.4 18.4z')}
        <path {...outline} d="M5.5 10.2 12 5.5l6.5 4.7v8.2L12 20.3l-6.5-1.9z" />
        <path {...outline} d="M12 10.4v6" />
      </>
    ),
  }
}

export function NavIcon({ name, className }: Props) {
  const choices = useNavIconChoices()
  const fill = FILLS[name]
  const locked =
    name === 'enquiries' ||
    name === 'fees' ||
    name === 'messages' ||
    name === 'collect' ||
    name === 'otherFees'
  const glyph =
    !locked && isChoosableIcon(name) ? choiceGlyph(name, choices[name], fill) : icons(fill)[name]

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className ?? 'h-5 w-5 shrink-0'}
    >
      {glyph}
    </svg>
  )
}
