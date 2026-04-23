/* ─────────────────────────────────────────────────────────
 * CALENDAR POPOVER — ANIMATION STORYBOARD
 *
 * Month slide:  x ±16→0, opacity 0→1 — spring 250ms
 * Day select:   whileTap scale 0.88 — spring 200ms
 * Day hover:    bg + text — 100ms ease-out (CSS)
 * ───────────────────────────────────────────────────────── */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'

const slideSpring  = { type: 'spring', duration: 0.25, bounce: 0 }   as const
const selectSpring = { type: 'spring', duration: 0.2,  bounce: 0.3 } as const

const DAY_LABELS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const

type CalDay = { date: Date; inMonth: boolean }

function getCalendarDays(year: number, month: number): CalDay[] {
  const first = new Date(year, month, 1)
  const last  = new Date(year, month + 1, 0)
  const startOffset = (first.getDay() + 6) % 7 // Mon=0 … Sun=6

  const days: CalDay[] = []
  for (let i = startOffset - 1; i >= 0; i--)
    days.push({ date: new Date(year, month, -i), inMonth: false })
  for (let d = 1; d <= last.getDate(); d++)
    days.push({ date: new Date(year, month, d), inMonth: true })
  let d = 1
  while (days.length % 7 !== 0)
    days.push({ date: new Date(year, month + 1, d++), inMonth: false })
  return days
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth()  === b.getMonth()
    && a.getDate()   === b.getDate()
}

const slideVariants = {
  enter:  (d: number) => ({ x: d * 14, opacity: 0 }),
  center:              { x: 0, opacity: 1 },
  exit:   (d: number) => ({ x: d * -14, opacity: 0 }),
} as const

interface CalendarPopoverProps {
  initialDate: Date
  onApply:  (date: Date) => void
  onCancel: () => void
}

export function CalendarPopover({ initialDate, onApply, onCancel }: CalendarPopoverProps) {
  const [viewDate, setViewDate] = useState(
    () => new Date(initialDate.getFullYear(), initialDate.getMonth(), 1)
  )
  const [selected, setSelected] = useState(initialDate)
  const [dir, setDir] = useState(0)

  const year  = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const goPrev = () => { setDir(-1); setViewDate(new Date(year, month - 1, 1)) }
  const goNext = () => { setDir(1);  setViewDate(new Date(year, month + 1, 1)) }

  const monthLabel = new Intl.DateTimeFormat('en-US', {
    month: 'long', year: 'numeric',
  }).format(viewDate)

  const days  = getCalendarDays(year, month)
  const weeks = Array.from(
    { length: days.length / 7 },
    (_, i) => days.slice(i * 7, i * 7 + 7)
  )

  return (
    <div
      className="bg-white rounded-[16px] border border-[#ebebeb] overflow-hidden"
      style={{
        boxShadow: [
          '0px 0px 0px 1px rgba(51,51,51,0.04)',
          '0px 8px 24px -4px rgba(14,18,27,0.12)',
          '0px 2px 6px -1px rgba(14,18,27,0.06)',
        ].join(', '),
      }}
    >
      {/* ── Picker ── */}
      <div className="px-3 pt-3 pb-2 flex flex-col gap-[6px]">

        {/* Month nav */}
        <div className="flex items-center gap-1 bg-[#f7f7f7] rounded-[8px] p-[4px]">
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous month"
            className="shrink-0 w-6 h-6 bg-white rounded-[6px] flex items-center justify-center active:scale-[0.9] transition-transform duration-75"
            style={{ boxShadow: '0px 1px 2px 0px rgba(10,13,20,0.06)' }}
          >
            <Icon icon="mingcute:left-small-line" width={14} height={14} className="text-[#5c5c5c]" />
          </button>

          <AnimatePresence mode="wait" custom={dir}>
            <motion.span
              key={monthLabel}
              className="flex-1 text-[12px] font-medium leading-4 tracking-[-0.04px] text-[#5c5c5c] text-center select-none"
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={slideSpring}
            >
              {monthLabel}
            </motion.span>
          </AnimatePresence>

          <button
            type="button"
            onClick={goNext}
            aria-label="Next month"
            className="shrink-0 w-6 h-6 bg-white rounded-[6px] flex items-center justify-center active:scale-[0.9] transition-transform duration-75"
            style={{ boxShadow: '0px 1px 2px 0px rgba(10,13,20,0.06)' }}
          >
            <Icon icon="mingcute:right-small-line" width={14} height={14} className="text-[#5c5c5c]" />
          </button>
        </div>

        {/* Day labels */}
        <div className="flex">
          {DAY_LABELS.map(lbl => (
            <div key={lbl} className="flex-1 flex items-center justify-center h-5">
              <span className="text-[10px] font-semibold leading-none tracking-[0.04em] text-[#c0c0c0] uppercase">
                {lbl}
              </span>
            </div>
          ))}
        </div>

        {/* Day grid — slides on month change */}
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={`${year}-${month}`}
            className="flex flex-col gap-[2px]"
            custom={dir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={slideSpring}
          >
            {weeks.map((week, wi) => (
              <div key={wi} className="flex">
                {week.map(({ date, inMonth }, di) => {
                  const isActive = isSameDay(date, selected)
                  return (
                    <motion.button
                      key={di}
                      type="button"
                      disabled={!inMonth}
                      onClick={() => inMonth && setSelected(date)}
                      whileTap={inMonth && !isActive ? { scale: 0.88 } : {}}
                      transition={selectSpring}
                      className={[
                        'group flex-1 flex items-center justify-center h-[26px] rounded-[7px] transition-colors duration-75',
                        isActive   ? 'bg-[#335cff]'
                        : !inMonth ? 'cursor-default'
                                   : 'hover:bg-[#f3f3f3]',
                      ].join(' ')}
                    >
                      <span className={[
                        'text-[13px] font-medium leading-none tracking-[-0.04px] transition-colors duration-75',
                        isActive   ? 'text-white'
                        : !inMonth ? 'text-[#d8d8d8]'
                                   : 'text-[#5c5c5c] group-hover:text-[#171717]',
                      ].join(' ')}>
                        {date.getDate()}
                      </span>
                    </motion.button>
                  )
                })}
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Footer ── */}
      <div className="px-3 pb-3 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 flex items-center justify-center h-7 rounded-[8px] border border-[#e8e8e8] bg-white text-[12px] font-medium leading-none tracking-[-0.04px] text-[#5c5c5c] active:scale-[0.97] transition-transform duration-75"
          style={{ boxShadow: '0px 1px 2px 0px rgba(10,13,20,0.04)' }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onApply(selected)}
          className="flex-1 flex items-center justify-center h-7 rounded-[8px] bg-[#335cff] text-[12px] font-medium leading-none tracking-[-0.04px] text-white active:scale-[0.97] transition-transform duration-75"
        >
          Apply
        </button>
      </div>
    </div>
  )
}
