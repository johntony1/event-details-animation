/* ─────────────────────────────────────────────────────────
 * TIME PICKER POPOVER — ANIMATION STORYBOARD
 *
 * AM/PM pill:    layout-animated slide — spring 250ms bounce 0.15
 * ↑ / ↓ press:  number slides up/down out — spring 180ms
 * Scroll wheel:  same animation, direction-aware
 * ───────────────────────────────────────────────────────── */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'

const HOURS   = ['1','2','3','4','5','6','7','8','9','10','11','12']
const MINUTES = ['00','05','10','15','20','25','30','35','40','45','50','55']

const SHADOW = [
  '0px 0px 0px 1px rgba(51,51,51,0.04)',
  '0px 8px 24px -4px rgba(14,18,27,0.12)',
  '0px 2px 6px -1px rgba(14,18,27,0.06)',
].join(', ')

const numVariants = {
  enter:  (d: number) => ({ y: d * 14, opacity: 0 }),
  center:              { y: 0, opacity: 1 },
  exit:   (d: number) => ({ y: d * -14, opacity: 0 }),
} as const

const numSpring = { type: 'spring', duration: 0.18, bounce: 0 } as const

interface ColumnProps {
  value: string
  dir:   number
  onInc: () => void
  onDec: () => void
}

function Column({ value, dir, onInc, onDec }: ColumnProps) {
  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation()
    if (e.deltaY < 0) onInc(); else onDec()
  }

  const arrowCls = [
    'w-8 h-6 flex items-center justify-center rounded-[6px]',
    'text-[#c0c0c0] hover:text-[#5c5c5c] hover:bg-[#f0f0f0]',
    'active:scale-[0.88] transition-[colors,transform] duration-75',
  ].join(' ')

  return (
    <div className="flex flex-col items-center gap-[3px]" onWheel={handleWheel}>
      <button type="button" onClick={onInc} className={arrowCls} aria-label="Increment">
        <Icon icon="mingcute:up-small-line" width={14} height={14} />
      </button>

      <div className="h-8 w-10 overflow-hidden relative flex items-center justify-center select-none">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.span
            key={value}
            custom={dir}
            variants={numVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={numSpring}
            className="absolute text-[20px] font-semibold leading-none tracking-[-0.5px] text-[#171717] tabular-nums"
          >
            {value.padStart(2, '0')}
          </motion.span>
        </AnimatePresence>
      </div>

      <button type="button" onClick={onDec} className={arrowCls} aria-label="Decrement">
        <Icon icon="mingcute:down-small-line" width={14} height={14} />
      </button>
    </div>
  )
}

export interface TimePickerPopoverProps {
  initialH: string
  initialM: string
  initialP: 'AM' | 'PM'
  onApply:  (h: string, m: string, p: 'AM' | 'PM') => void
  onCancel: () => void
}

export function TimePickerPopover({
  initialH, initialM, initialP, onApply, onCancel,
}: TimePickerPopoverProps) {
  const [hour,   setHour]   = useState(initialH)
  const [minute, setMinute] = useState(() => {
    const snapped = Math.round(parseInt(initialM, 10) / 5) * 5
    return String(Math.min(snapped, 55)).padStart(2, '0')
  })
  const [period, setPeriod] = useState<'AM' | 'PM'>(initialP)
  const [hDir, setHDir] = useState(1)
  const [mDir, setMDir] = useState(1)

  const incHour = () => { setHDir(1);  setHour(h  => HOURS[(HOURS.indexOf(h)     + 1)  % 12]) }
  const decHour = () => { setHDir(-1); setHour(h  => HOURS[(HOURS.indexOf(h)     + 11) % 12]) }
  const incMin  = () => { setMDir(1);  setMinute(m => MINUTES[(MINUTES.indexOf(m) + 1)  % 12]) }
  const decMin  = () => { setMDir(-1); setMinute(m => MINUTES[(MINUTES.indexOf(m) + 11) % 12]) }

  return (
    <div
      className="bg-white rounded-[16px] border border-[#ebebeb] overflow-hidden"
      style={{ boxShadow: SHADOW }}
    >
      <div className="px-3 pt-3 pb-2 flex flex-col gap-3">

        {/* AM / PM segmented control */}
        <div className="flex bg-[#f7f7f7] rounded-[8px] p-[3px] gap-[3px]">
          {(['AM', 'PM'] as const).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className="relative flex-1 h-6 rounded-[6px] flex items-center justify-center focus-visible:outline-none"
            >
              {period === p && (
                <motion.div
                  layoutId="tp-period-pill"
                  className="absolute inset-0 bg-white rounded-[6px]"
                  style={{ boxShadow: '0px 1px 2px rgba(10,13,20,0.06)' }}
                  transition={{ type: 'spring', duration: 0.25, bounce: 0.15 }}
                />
              )}
              <span className={[
                'relative z-10 text-[12px] font-medium leading-none tracking-[-0.04px]',
                'transition-colors duration-100',
                period === p ? 'text-[#171717]' : 'text-[#c0c0c0]',
              ].join(' ')}>
                {p}
              </span>
            </button>
          ))}
        </div>

        {/* H : M columns */}
        <div className="flex items-center justify-center gap-1">
          <Column value={hour}   dir={hDir} onInc={incHour} onDec={decHour} />
          <span className="text-[20px] font-semibold text-[#c0c0c0] leading-none pb-[2px] select-none">:</span>
          <Column value={minute} dir={mDir} onInc={incMin}  onDec={decMin}  />
        </div>

      </div>

      {/* Footer */}
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
          onClick={() => onApply(hour, minute, period)}
          className="flex-1 flex items-center justify-center h-7 rounded-[8px] bg-[#335cff] text-[12px] font-medium leading-none tracking-[-0.04px] text-white active:scale-[0.97] transition-transform duration-75"
        >
          Apply
        </button>
      </div>
    </div>
  )
}
