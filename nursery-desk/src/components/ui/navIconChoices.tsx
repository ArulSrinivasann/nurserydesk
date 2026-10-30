import { cn } from '@/lib/cn'
import { useSyncExternalStore, type ReactNode } from 'react'

export const CHOOSABLE_ICONS = ['enquiries', 'report', 'fees', 'collect', 'otherFees'] as const
export type ChoosableIcon = (typeof CHOOSABLE_ICONS)[number]

export const ICON_OPTION_GROUPS: Array<{
  name: ChoosableIcon
  title: string
  options: ReadonlyArray<{ id: string; label: string }>
}> = [
  {
    name: 'report',
    title: 'Attendance report',
    options: [
      { id: 'calendar', label: 'Calendar check' },
      { id: 'bars', label: 'Bar chart' },
      { id: 'checklist', label: 'Checklist' },
      { id: 'graph', label: 'Line graph' },
      { id: 'pie', label: 'Pie chart' },
      { id: 'roll', label: 'Class roll' },
      { id: 'clock', label: 'Clock' },
      { id: 'grid', label: 'Table' },
    ],
  },
]

const DEFAULTS: Record<ChoosableIcon, string> = {
  enquiries: 'question',
  report: 'calendar',
  fees: 'coin',
  collect: 'wallet',
  otherFees: 'tag',
}

const FILLS: Record<ChoosableIcon, string> = {
  enquiries: '#EBDCC4',
  report: '#F3E6C8',
  fees: '#FFD3A0',
  collect: '#A8E6C1',
  otherFees: '#FFC93C',
}

const KEY = 'nd-nav-icon-choices'
const EVENT = 'nd-nav-icon-choices'

let cachedRaw: string | null = null
let cachedChoices: Record<ChoosableIcon, string> = DEFAULTS

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

function optionIds(name: ChoosableIcon): string[] {
  const group = ICON_OPTION_GROUPS.find((item) => item.name === name)
  return group ? group.options.map((option) => option.id) : []
}

function readChoices(): Record<ChoosableIcon, string> {
  if (typeof window === 'undefined') return DEFAULTS
  const raw = window.sessionStorage.getItem(KEY) ?? ''
  if (raw === cachedRaw) return cachedChoices
  const next = { ...DEFAULTS }
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>
      for (const name of CHOOSABLE_ICONS) {
        const id = parsed[name]
        if (typeof id === 'string' && optionIds(name).includes(id)) next[name] = id
      }
    } catch {
      cachedRaw = raw
      cachedChoices = DEFAULTS
      return DEFAULTS
    }
  }
  cachedRaw = raw
  cachedChoices = next
  return next
}

export function getNavIconChoices(): Record<ChoosableIcon, string> {
  return readChoices()
}

export function setNavIconChoice(name: ChoosableIcon, id: string) {
  const next = { ...readChoices(), [name]: id }
  window.sessionStorage.setItem(KEY, JSON.stringify(next))
  window.dispatchEvent(new Event(EVENT))
}

function subscribeChoices(onStoreChange: () => void) {
  window.addEventListener(EVENT, onStoreChange)
  window.addEventListener('storage', onStoreChange)
  return () => {
    window.removeEventListener(EVENT, onStoreChange)
    window.removeEventListener('storage', onStoreChange)
  }
}

export function useNavIconChoices(): Record<ChoosableIcon, string> {
  return useSyncExternalStore(subscribeChoices, readChoices, () => DEFAULTS)
}

export function isChoosableIcon(name: string): name is ChoosableIcon {
  return (CHOOSABLE_ICONS as readonly string[]).includes(name)
}

function rupee(x: number, y: number, scale = 1) {
  const s = (n: number) => n * scale
  return (
    <>
      <path {...outline} d={`M${x} ${y + s(1.5)}h${s(7.4)}`} />
      <path {...outline} d={`M${x} ${y + s(4.6)}h${s(5.5)}`} />
      <path {...outline} d={`M${x + s(2)} ${y}v${s(4.8)}L${x + s(8.1)} ${y + s(10.8)}`} />
    </>
  )
}

export function choiceGlyph(name: ChoosableIcon, id: string, fill: string): ReactNode {
  const glyphs: Record<ChoosableIcon, Record<string, ReactNode>> = {
    enquiries: {
      question: (
        <>
          {fillLayer(
            fill,
            'M4.4 4.8h15.2A1.8 1.8 0 0 1 21.4 6.6v8.2a1.8 1.8 0 0 1-1.8 1.8H10.2L5 20.2v-3.6H4.4A1.8 1.8 0 0 1 2.6 14.8V6.6A1.8 1.8 0 0 1 4.4 4.8z',
          )}
          <path
            {...outline}
            d="M4.6 5h14.8A1.6 1.6 0 0 1 21 6.6v8a1.6 1.6 0 0 1-1.6 1.6H10L5.2 19.8v-3.6H4.6A1.6 1.6 0 0 1 3 14.6V6.6A1.6 1.6 0 0 1 4.6 5z"
          />
          <path {...outline} d="M10.6 8.8c0-1.2.9-2 2.1-2s2.1.8 2.1 1.9c0 1-.8 1.5-2.1 2.1v.7" />
          <path {...outline} d="M12.7 14.1h.2" />
        </>
      ),
      chats: (
        <>
          <path fill={fill} stroke="none" d="M9.2 4.4h10.2A1.6 1.6 0 0 1 21 6v6.4a1.6 1.6 0 0 1-1.6 1.6h-2.2v2.4L13.8 14H9.2A1.6 1.6 0 0 1 7.6 12.4V6A1.6 1.6 0 0 1 9.2 4.4z" />
          <path {...outline} d="M9.4 4.6h9.8A1.4 1.4 0 0 1 20.6 6v6.2a1.4 1.4 0 0 1-1.4 1.4h-2.2v2.2L14 14.2H9.4A1.4 1.4 0 0 1 8 12.8V6A1.4 1.4 0 0 1 9.4 4.6z" />
          <path fill={fill} stroke="none" d="M3.2 9.2h10.4A1.6 1.6 0 0 1 15.2 10.8v6.2A1.6 1.6 0 0 1 13.6 18.6H8.2L4.2 21.2v-2.6H3.2A1.6 1.6 0 0 1 1.6 17V10.8A1.6 1.6 0 0 1 3.2 9.2z" />
          <path {...outline} d="M3.4 9.4h10A1.4 1.4 0 0 1 14.8 10.8v6a1.4 1.4 0 0 1-1.4 1.4H8.2L4.4 20.8v-2.4H3.4A1.4 1.4 0 0 1 2 17V10.8A1.4 1.4 0 0 1 3.4 9.4z" />
          <path {...outline} d="M7.6 13.4h.2M10.2 13.4h.2M12.8 13.4h.2" />
        </>
      ),
      headset: (
        <>
          <path fill={fill} stroke="none" d="M5.2 12.2A6.8 6.8 0 0 1 12 5.4a6.8 6.8 0 0 1 6.8 6.8v2.4H5.2z" />
          <path {...outline} d="M5.4 12.4A6.6 6.6 0 0 1 12 5.8a6.6 6.6 0 0 1 6.6 6.6" />
          <rect fill={fill} stroke="none" x="3.4" y="11.6" width="3.4" height="6.2" rx="1.2" />
          <rect {...outline} x="3.4" y="11.6" width="3.4" height="6.2" rx="1.2" />
          <rect fill={fill} stroke="none" x="17.2" y="11.6" width="3.4" height="6.2" rx="1.2" />
          <rect {...outline} x="17.2" y="11.6" width="3.4" height="6.2" rx="1.2" />
          <path {...outline} d="M20.6 17.6v1.2A2.2 2.2 0 0 1 18.4 21H12" />
        </>
      ),
      form: (
        <>
          {fillLayer(fill, 'M6.6 3.6h10.8v16.6l-2.4-1-2.2 1-2.2-1-2.4 1-1.6-.7z')}
          <path
            {...outline}
            d="M7 3.8h10A1.2 1.2 0 0 1 18.2 5v14.6l-2.4-1.1-2.4 1.2-2.4-1.2-2.4 1.1V5A1.2 1.2 0 0 1 7 3.8z"
          />
          <path {...outline} d="M10.2 8.8c0-.9.7-1.5 1.6-1.5s1.6.6 1.6 1.4c0 .8-.6 1.1-1.6 1.6v.5" />
          <path {...outline} d="M11.8 12.6h.2M9.4 15.4h5.4" />
        </>
      ),
      phone: (
        <>
          <rect fill={fill} stroke="none" x="7.2" y="3.2" width="9.6" height="17.6" rx="2.2" />
          <rect {...outline} x="7.2" y="3.2" width="9.6" height="17.6" rx="2.2" />
          <path {...outline} d="M10 5.2h4" />
          <circle {...outline} cx="12" cy="17.6" r="1.1" />
        </>
      ),
      person: (
        <>
          <circle fill={fill} stroke="none" cx="9.4" cy="8" r="3" />
          <circle {...outline} cx="9.4" cy="8" r="3" />
          <path {...outline} d="M4.2 19.2c.6-3.2 2.6-4.8 5.2-4.8s4.6 1.6 5.2 4.8" />
          <path {...outline} d="M16.2 8.4c0-1.1.8-1.8 1.9-1.8s1.9.7 1.9 1.7c0 .9-.7 1.3-1.9 1.9v.6" />
          <path {...outline} d="M18.1 13.4h.2" />
        </>
      ),
      mailbox: (
        <>
          <rect fill={fill} stroke="none" x="3.4" y="8.2" width="17.2" height="10.4" rx="1.8" />
          <rect {...outline} x="3.4" y="8.2" width="17.2" height="10.4" rx="1.8" />
          <path {...outline} d="M3.4 11.2 12 16.2 20.6 11.2" />
          <path {...outline} d="M17.6 8.2V5.2h2.6" />
        </>
      ),
      search: (
        <>
          <circle fill={fill} stroke="none" cx="10.6" cy="10.6" r="6.2" />
          <circle {...outline} cx="10.6" cy="10.6" r="6.2" />
          <path {...outline} d="M15.2 15.2 20.2 20.2" />
          <path {...outline} d="M9.2 8.8c0-.9.7-1.5 1.5-1.5.9 0 1.5.6 1.5 1.4 0 .8-.6 1.2-1.5 1.7v.5" />
          <path {...outline} d="M10.7 12.8h.2" />
        </>
      ),
    },
    report: {
      calendar: (
        <>
          <rect fill={fill} stroke="none" x="4.2" y="5.6" width="15.6" height="14.2" rx="1.8" />
          <rect {...outline} x="4.2" y="5.6" width="15.6" height="14.2" rx="1.8" />
          <path {...outline} d="M8.2 4.2v3M15.8 4.2v3M4.2 9.6h15.6" />
          <path {...outline} d="M8.6 14.4 10.8 16.4 15.6 11.8" />
        </>
      ),
      bars: (
        <>
          {fillLayer(fill, 'M4.6 15.2h3.1V20H4.6zM10.4 11.2h3.2V20h-3.2zM16.3 7.2h3.1V20h-3.1z')}
          <path {...outline} d="M5.2 19.4V14.6h2.6V19.4zM10.7 19.4V10.6h2.6V19.4zM16.2 19.4V6.6h2.6V19.4z" />
        </>
      ),
      checklist: (
        <>
          <rect fill={fill} stroke="none" x="5.2" y="3.6" width="13.6" height="17" rx="1.6" />
          <rect {...outline} x="5.2" y="3.6" width="13.6" height="17" rx="1.6" />
          <path {...outline} d="M9.2 3.6h5.6v2.2H9.2z" />
          <path {...outline} d="M8 10.2 9.4 11.6 12 9" />
          <path {...outline} d="M13.4 10.6h3.2" />
          <path {...outline} d="M8 15 9.4 16.4 12 13.8" />
          <path {...outline} d="M13.4 15.4h3.2" />
        </>
      ),
      graph: (
        <>
          <rect fill={fill} stroke="none" x="3.6" y="4.2" width="16.8" height="15.6" rx="1.8" />
          <rect {...outline} x="3.6" y="4.2" width="16.8" height="15.6" rx="1.8" />
          <path {...outline} d="M6.4 15.4 9.6 11.6 12.4 13.4 17.4 8.2" />
          <path {...outline} d="M6.4 8.2v7.2h11" />
        </>
      ),
      pie: (
        <>
          <circle {...outline} cx="12" cy="12" r="8.2" />
          <path fill={fill} stroke="none" d="M12 12 12 3.8A8.2 8.2 0 0 1 19.5 16.2Z" />
          <path {...outline} d="M12 12 12 3.8A8.2 8.2 0 0 1 19.5 16.2Z" />
        </>
      ),
      roll: (
        <>
          <circle fill={fill} stroke="none" cx="7.4" cy="7.2" r="2.2" />
          <circle {...outline} cx="7.4" cy="7.2" r="2.2" />
          <path {...outline} d="M4.2 13.2c.4-2 1.6-3 3.2-3s2.8 1 3.2 3" />
          <path {...outline} d="M12.6 7.4h6.8M12.6 10.2h5.2" />
          <circle fill={fill} stroke="none" cx="7.4" cy="16.2" r="2.2" />
          <circle {...outline} cx="7.4" cy="16.2" r="2.2" />
          <path {...outline} d="M12.6 15.2h6.8M12.6 18h4.4" />
        </>
      ),
      clock: (
        <>
          <circle fill={fill} stroke="none" cx="12" cy="12" r="8.2" />
          <circle {...outline} cx="12" cy="12" r="8.2" />
          <path {...outline} d="M12 6.2v1.6M12 16.2v1.6M6.2 12h1.6M16.2 12h1.6" />
          <path {...outline} d="M12 8.2v4.2l3.2 1.8" />
        </>
      ),
      grid: (
        <>
          <rect fill={fill} stroke="none" x="3.6" y="4.2" width="16.8" height="15.6" rx="1.6" />
          <rect {...outline} x="3.6" y="4.2" width="16.8" height="15.6" rx="1.6" />
          <path {...outline} d="M3.6 9.4h16.8M3.6 14.6h16.8M10 4.2v15.6M14.8 4.2v15.6" />
        </>
      ),
    },
    fees: {
      coin: (
        <>
          <circle fill={fill} stroke="none" cx="12" cy="12" r="8.2" />
          <circle {...outline} cx="12" cy="12" r="8.2" />
          {rupee(8.3, 6.6)}
        </>
      ),
      note: (
        <>
          <rect fill={fill} stroke="none" x="3.2" y="6.4" width="17.6" height="11.2" rx="1.8" />
          <rect {...outline} x="3.2" y="6.4" width="17.6" height="11.2" rx="1.8" />
          <circle {...outline} cx="7.2" cy="12" r="1.5" />
          {rupee(9.6, 7.4, 0.92)}
        </>
      ),
      invoice: (
        <>
          {fillLayer(fill, 'M6.4 3.4h7.2L18.4 8.2v12.2H6.4z')}
          <path {...outline} d="M6.8 3.6h6.6L18 8.4v11.8A1.2 1.2 0 0 1 16.8 21.4H6.8A1.2 1.2 0 0 1 5.6 20.2V4.8A1.2 1.2 0 0 1 6.8 3.6z" />
          <path {...outline} d="M13.4 3.7v4.6h4.6" />
          <path {...outline} d="M8.4 13.2h3.2M8.4 16.2h5.6" />
          {rupee(8.2, 7.6, 0.72)}
        </>
      ),
      stack: (
        <>
          <ellipse fill={fill} stroke="none" cx="12" cy="8.2" rx="7.4" ry="3.2" />
          <ellipse {...outline} cx="12" cy="8.2" rx="7.4" ry="3.2" />
          <path fill={fill} stroke="none" d="M4.6 8.2v4.4c0 1.8 3.3 3.2 7.4 3.2s7.4-1.4 7.4-3.2V8.2" />
          <path {...outline} d="M4.6 8.2v4.4c0 1.8 3.3 3.2 7.4 3.2s7.4-1.4 7.4-3.2V8.2" />
          <path fill={fill} stroke="none" d="M4.6 12.6v3.2c0 1.8 3.3 3.2 7.4 3.2s7.4-1.4 7.4-3.2v-3.2" />
          <path {...outline} d="M4.6 12.6v3.2c0 1.8 3.3 3.2 7.4 3.2s7.4-1.4 7.4-3.2v-3.2" />
          <path {...outline} d="M10.2 7.2h3.6M11.2 6.2v2.2" />
        </>
      ),
      piggy: (
        <>
          <ellipse fill={fill} stroke="none" cx="12" cy="13" rx="8" ry="5.6" />
          <ellipse {...outline} cx="12" cy="13" rx="8" ry="5.6" />
          <circle {...outline} cx="6.4" cy="11.2" r="0.6" />
          <path {...outline} d="M4.2 13.2h-1.4M19.8 10.2 21.4 8.8" />
          <path {...outline} d="M7.4 18.2v1.6M16.6 18.2v1.6" />
          <path {...outline} d="M10.4 10.4h3.2" />
        </>
      ),
      calculator: (
        <>
          <rect fill={fill} stroke="none" x="5.4" y="3.2" width="13.2" height="17.6" rx="1.8" />
          <rect {...outline} x="5.4" y="3.2" width="13.2" height="17.6" rx="1.8" />
          <rect {...outline} x="7.4" y="5.2" width="9.2" height="3.2" rx="0.6" />
          <path {...outline} d="M8.2 11.2h.2M12 11.2h.2M15.8 11.2h.2M8.2 14.2h.2M12 14.2h.2M15.8 14.2h.2M8.2 17.2h.2M12 17.2h.2M15.8 17.2h.2" />
        </>
      ),
      bank: (
        <>
          {fillLayer(fill, 'M4.4 9.2 12 4.4 19.6 9.2v10.4H4.4z')}
          <path {...outline} d="M4.6 9.4 12 4.6 19.4 9.4V19.4H4.6z" />
          <path {...outline} d="M8.2 12.4v4.8M12 12.4v4.8M15.8 12.4v4.8M4.6 19.4h14.8" />
        </>
      ),
      purse: (
        <>
          <path fill={fill} stroke="none" d="M5.2 9.4h13.6v9.4A2 2 0 0 1 16.8 20.8H7.2A2 2 0 0 1 5.2 18.8z" />
          <path {...outline} d="M5.4 9.6h13.2v9.2A1.8 1.8 0 0 1 16.8 20.6H7.2A1.8 1.8 0 0 1 5.4 18.8z" />
          <path {...outline} d="M8.2 9.6V8.2A3.8 3.8 0 0 1 12 4.4 3.8 3.8 0 0 1 15.8 8.2v1.4" />
          <path {...outline} d="M10.6 14.2h2.8" />
        </>
      ),
    },
    collect: {
      wallet: (
        <>
          <rect fill={fill} stroke="none" x="3.4" y="7.2" width="17.2" height="11.6" rx="2" />
          <rect {...outline} x="3.4" y="7.2" width="17.2" height="11.6" rx="2" />
          <path {...outline} d="M3.4 11h17.2" />
          <path fill={fill} stroke="none" d="M14.2 11h6.4v5.2h-6.4a2.6 2.6 0 0 1 0-5.2z" />
          <path {...outline} d="M14.4 11.2h6.2v4.8h-6.2a2.4 2.4 0 0 1 0-4.8z" />
          <circle {...outline} cx="16.8" cy="13.6" r="0.7" />
        </>
      ),
      card: (
        <>
          <rect fill={fill} stroke="none" x="3.2" y="6.2" width="17.6" height="11.8" rx="1.8" />
          <rect {...outline} x="3.2" y="6.2" width="17.6" height="11.8" rx="1.8" />
          <path {...outline} d="M3.2 10.4h17.6" />
          <rect {...outline} x="5.4" y="12.8" width="3.6" height="2.4" rx="0.5" />
          <path {...outline} d="M14.2 14.2h4.2" />
        </>
      ),
      cash: (
        <>
          <rect fill={fill} stroke="none" x="4.6" y="5.2" width="15.6" height="10.2" rx="1.6" />
          <rect {...outline} x="4.6" y="5.2" width="15.6" height="10.2" rx="1.6" />
          <rect fill={fill} stroke="none" x="3.4" y="8.2" width="15.6" height="10.4" rx="1.6" />
          <rect {...outline} x="3.4" y="8.2" width="15.6" height="10.4" rx="1.6" />
          {rupee(7.4, 9.2, 0.86)}
        </>
      ),
      hand: (
        <>
          <circle fill={fill} stroke="none" cx="15.6" cy="7.4" r="3.6" />
          <circle {...outline} cx="15.6" cy="7.4" r="3.6" />
          <path {...outline} d="M14.2 6.2h2.6M14.2 7.6h2M14.8 5.4v2.2L17 9.4" />
          <path fill={fill} stroke="none" d="M4.2 13.2h3.2l1.6-2.2h2.2a1.6 1.6 0 0 1 1.6 1.6v6.8H4.2z" />
          <path {...outline} d="M4.4 19.4V13.4h2.8l1.7-2.3h2.1A1.4 1.4 0 0 1 12.4 12.5v6.9" />
          <path {...outline} d="M12.4 14.6h2.2a1.6 1.6 0 0 1 0 3.2h-2.2" />
        </>
      ),
      tray: (
        <>
          <path fill={fill} stroke="none" d="M4.2 14.2 7 8.4h10l2.8 5.8v4.2H4.2z" />
          <path {...outline} d="M4.4 14.4 7.2 8.6h9.6l2.8 5.8v4H4.4z" />
          <path {...outline} d="M4.4 14.4h15.2" />
          {rupee(8.6, 10.4, 0.7)}
        </>
      ),
      pos: (
        <>
          <rect fill={fill} stroke="none" x="5.6" y="3.4" width="12.8" height="17.2" rx="1.6" />
          <rect {...outline} x="5.6" y="3.4" width="12.8" height="17.2" rx="1.6" />
          <rect {...outline} x="7.6" y="5.4" width="8.8" height="4.4" rx="0.6" />
          <path {...outline} d="M8.4 12.6h.2M12 12.6h.2M15.6 12.6h.2M8.4 15.4h.2M12 15.4h.2M15.6 15.4h.2" />
        </>
      ),
      upi: (
        <>
          <rect fill={fill} stroke="none" x="6.6" y="3.2" width="10.8" height="17.6" rx="2" />
          <rect {...outline} x="6.6" y="3.2" width="10.8" height="17.6" rx="2" />
          {rupee(8.4, 7.6, 0.78)}
          <path {...outline} d="M10.6 18.4h2.8" />
        </>
      ),
      register: (
        <>
          <rect fill={fill} stroke="none" x="4.2" y="9.2" width="15.6" height="10.4" rx="1.6" />
          <rect {...outline} x="4.2" y="9.2" width="15.6" height="10.4" rx="1.6" />
          <rect fill={fill} stroke="none" x="7.4" y="3.6" width="9.2" height="5.6" rx="1.2" />
          <rect {...outline} x="7.4" y="3.6" width="9.2" height="5.6" rx="1.2" />
          <path {...outline} d="M6.4 13.2h11.2M6.4 16.2h7.2" />
        </>
      ),
    },
    otherFees: {
      tag: (
        <>
          {fillLayer(fill, 'M4.4 4.4h8.6L20.2 12 13 19.2H4.4z')}
          <path {...outline} d="M4.6 4.6h8.2L19.8 12 12.8 19H4.6z" />
          <circle {...outline} cx="8.6" cy="8.6" r="1.35" />
        </>
      ),
      receipt: (
        <>
          {fillLayer(fill, 'M6.2 3.6h11.6v16.8l-1.6-1-1.6 1-1.6-1-1.6 1-1.6-1-1.6 1-1.6-1z')}
          <path {...outline} d="M6.4 3.8h11.2v16.2l-1.6-1-1.6 1-1.6-1-1.6 1-1.6-1-1.6 1-1.6-1z" />
          <path {...outline} d="M8.8 8h6.4M8.8 11.2h6.4M8.8 14.4h4.2" />
        </>
      ),
      plus: (
        <>
          <circle fill={fill} stroke="none" cx="12" cy="12" r="8.2" />
          <circle {...outline} cx="12" cy="12" r="8.2" />
          <path {...outline} d="M12 8.2v7.6M8.2 12h7.6" />
        </>
      ),
      bag: (
        <>
          <path fill={fill} stroke="none" d="M6.2 8.4h11.6l-1 11H7.2z" />
          <path {...outline} d="M6.4 8.6h11.2L16.6 19.2H7.4z" />
          <path {...outline} d="M9 8.6V7.2A3 3 0 0 1 12 4.2 3 3 0 0 1 15 7.2v1.4" />
        </>
      ),
      coupon: (
        <>
          <path
            fill={fill}
            stroke="none"
            d="M3.4 7.2h17.2v9.6H3.4z"
          />
          <path {...outline} d="M3.6 7.4h16.8v9.2H3.6z" />
          <path {...outline} d="M12 7.4v9.2" strokeDasharray="2 2" />
          <circle {...outline} cx="8.2" cy="12" r="1.3" />
        </>
      ),
      gift: (
        <>
          <rect fill={fill} stroke="none" x="4.4" y="10.2" width="15.2" height="9.4" rx="1.4" />
          <rect {...outline} x="4.4" y="10.2" width="15.2" height="9.4" rx="1.4" />
          <path {...outline} d="M4.4 14h15.2M12 10.2v9.4" />
          <path {...outline} d="M8.2 10.2c0-2.4 1.8-4.2 3.8-3.2 2-1 3.8.8 3.8 3.2" />
        </>
      ),
      list: (
        <>
          <rect fill={fill} stroke="none" x="4.2" y="3.8" width="15.6" height="16.4" rx="1.6" />
          <rect {...outline} x="4.2" y="3.8" width="15.6" height="16.4" rx="1.6" />
          <path {...outline} d="M8 8.4h8M8 12h8M8 15.6h5.2" />
          <path {...outline} d="M16.4 14.8v4.2M14.4 16.9h4" />
        </>
      ),
      coins: (
        <>
          <circle fill={fill} stroke="none" cx="9.2" cy="13.4" r="6.2" />
          <circle {...outline} cx="9.2" cy="13.4" r="6.2" />
          <circle fill={fill} stroke="none" cx="15.2" cy="10.2" r="5.6" />
          <circle {...outline} cx="15.2" cy="10.2" r="5.6" />
          <path {...outline} d="M13.4 8.4h3.4M14.2 7.4v2.2" />
        </>
      ),
    },
  }

  return glyphs[name][id] ?? glyphs[name][DEFAULTS[name]]
}

export function ChoiceIcon({
  name,
  optionId,
  className,
}: {
  name: ChoosableIcon
  optionId: string
  className?: string
}) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className ?? 'h-5 w-5 shrink-0'}>
      {choiceGlyph(name, optionId, FILLS[name])}
    </svg>
  )
}

export function NavIconPicker() {
  const selected = useNavIconChoices()

  return (
    <div className="grid gap-6">
      {ICON_OPTION_GROUPS.map((group) => (
        <section key={group.name}>
          <h2 className="mt-0 mb-3">{group.title}</h2>
          <div className="grid max-w-[720px] gap-2 sm:grid-cols-2">
            {group.options.map((option, index) => {
              const active = selected[group.name] === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setNavIconChoice(group.name, option.id)}
                  className={cn(
                    'flex items-center gap-3 rounded-control px-3 py-2.5 text-left text-[16px] font-semibold',
                    active ? 'bg-nav-active-bg text-nav-active' : 'bg-primary-tint text-muted',
                  )}
                >
                  <span className="w-6 text-[13px] font-bold text-ink">{index + 1}.</span>
                  <ChoiceIcon name={group.name} optionId={option.id} className="h-8 w-8 shrink-0" />
                  {option.label}
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
