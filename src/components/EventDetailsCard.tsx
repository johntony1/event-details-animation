/* ─────────────────────────────────────────────────────────
 * EVENT DETAILS CARD — ANIMATION STORYBOARD
 *
 * Mount sequence:
 *    0ms  wrapper fade + scale 0.96→1
 *   80ms  heading y –6→0
 *  160ms  card y 10→0
 *  260ms  rows 1–4 (100ms stagger, y 6→0)
 *  660ms  description body opacity fade
 *
 * Hover (value chip):
 *  bg:      opacity 0→1 — 150ms ease-out
 *  pencil:  width 0→30, scale 0.25→1, blur 4→0 — spring 300ms
 *
 * Edit (click pencil):
 *  chip pulse: scale 1→1.02→1 — spring bounce
 *  pencil:  collapses out (width 30→0)
 *  check:   width 0→30, scale 0.25→1, blur 4→0 — spring 300ms
 *  close:   same, 40ms stagger
 *  input:   auto-focuses, auto-sizes via ghost span
 *  Enter / click ✓  → confirm  |  Escape / click × → cancel
 * ───────────────────────────────────────────────────────── */

import { useState, useRef, useLayoutEffect, useEffect } from 'react'
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion'
import { Icon } from '@iconify/react'
import { CalendarPopover } from './CalendarPopover'
import { TimePickerPopover } from './TimePickerPopover'

// ─── Date helpers ──────────────────────────────────────────
function parseDateStr(str: string): Date {
  const d = new Date(str)
  return isNaN(d.getTime()) ? new Date() : d
}
function formatDateStr(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  }).format(date)
}

// ─── Timing (seconds) ─────────────────────────────────────
const T = {
  wrapper:   0,
  heading:   0.08,
  card:      0.16,
  row1:      0.26,
  row2:      0.36,
  row3:      0.46,
  descLabel: 0.56,
  descBody:  0.66,
} as const

// ─── Transitions ──────────────────────────────────────────
const mountSpring = { type: 'spring', duration: 0.45, bounce: 0 }  as const
const softFade    = { duration: 0.3,  ease: [0.2, 0, 0, 1] }       as const
const bgFade      = { duration: 0.15, ease: [0.2, 0, 0, 1] }       as const
const iconPop     = { type: 'spring', duration: 0.3, bounce: 0 }   as const
const iconPopLate = { type: 'spring', duration: 0.3, bounce: 0, delay: 0.04 } as const

// ─── Card shadow (Figma exact) ─────────────────────────────
const CARD_SHADOW = [
  '0px 0px 0px 1px rgba(51,51,51,0.04)',
  '0px 16px 8px -8px rgba(51,51,51,0.01)',
  '0px 12px 6px -6px rgba(51,51,51,0.02)',
  '0px 5px 5px -2.5px rgba(51,51,51,0.08)',
  '0px 1px 3px -1.5px rgba(51,51,51,0.16)',
  'inset 0px -0.5px 0.5px 0px rgba(51,51,51,0.08)',
].join(', ')

// ─── Text classes ──────────────────────────────────────────
const labelCls = 'text-[14px] font-normal  leading-5 tracking-[-0.084px] text-[#5c5c5c] whitespace-nowrap'
const valueCls = 'text-[14px] font-medium  leading-5 tracking-[-0.084px] text-[#5c5c5c] whitespace-nowrap'

// ─── Collapsible icon slot (width 0→30) ───────────────────
interface IconSlotProps {
  visible: boolean
  transition?: object
  children: React.ReactNode
}
function IconSlot({ visible, transition = iconPop, children }: IconSlotProps) {
  return (
    <motion.span
      className="relative z-10 flex items-center overflow-hidden shrink-0"
      animate={{ width: visible ? 30 : 0 }}
      transition={transition}
    >
      <motion.span
        className="flex items-center pl-[10px] shrink-0"
        animate={{
          opacity: visible ? 1 : 0,
          scale:   visible ? 1 : 0.25,
          filter:  visible ? 'blur(0px)' : 'blur(4px)',
        }}
        transition={transition}
      >
        {children}
      </motion.span>
    </motion.span>
  )
}

// ─── Row ──────────────────────────────────────────────────
interface RowProps {
  icon: string
  label: string
  value: string
  delay: number
  chipRounded?: string
  ariaLabel?: string
  pickerType?: 'calendar'
}

function Row({ icon, label, value: initialValue, delay, chipRounded = 'rounded-[8px]', ariaLabel, pickerType }: RowProps) {
  const [hovered,    setHovered]    = useState(false)
  const [isEditing,  setIsEditing]  = useState(false)
  const [editValue,  setEditValue]  = useState(initialValue)
  const [savedValue, setSavedValue] = useState(initialValue)
  const [inputWidth, setInputWidth] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)
  const ghostRef = useRef<HTMLSpanElement>(null)
  const rowRef   = useRef<HTMLDivElement>(null)
  const chipControls = useAnimationControls()

  // Keep ghost span in sync → measure width before paint
  useLayoutEffect(() => {
    if (ghostRef.current) setInputWidth(ghostRef.current.offsetWidth)
  }, [editValue])

  // Auto-focus input when entering text-edit mode
  useEffect(() => {
    if (isEditing && pickerType !== 'calendar') {
      const id = setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 40)
      return () => clearTimeout(id)
    }
  }, [isEditing, pickerType])

  // Close calendar on outside click or Escape
  useEffect(() => {
    if (!isEditing || pickerType !== 'calendar') return
    const onDown = (e: MouseEvent) => {
      if (!rowRef.current?.contains(e.target as Node)) cancelEdit()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelEdit()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown',   onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown',   onKey)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, pickerType])

  const enterEdit = () => {
    setSavedValue(editValue)
    setIsEditing(true)
    setHovered(false)
    chipControls.start({
      scale: [1, 1.02, 1],
      transition: { duration: 0.4, times: [0, 0.35, 1], ease: [0.34, 1.56, 0.64, 1] },
    })
  }

  const confirmEdit = () => {
    setSavedValue(editValue)
    setIsEditing(false)
  }

  const cancelEdit = () => {
    setEditValue(savedValue)
    setIsEditing(false)
  }

  const isCalendar = pickerType === 'calendar'

  return (
    <motion.div
      ref={rowRef}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...mountSpring, delay }}
      className="relative flex items-center justify-between"
    >
      {/* Calendar popover — floats above this row when editing */}
      {isCalendar && (
        <AnimatePresence>
          {isEditing && (
            <motion.div
              className="absolute bottom-full right-0 z-50 w-[220px] pb-1"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1,    y: 0 }}
              exit={{    opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: 'spring', duration: 0.35, bounce: 0.12 }}
              style={{ transformOrigin: 'bottom center' }}
            >
              <CalendarPopover
                initialDate={parseDateStr(editValue)}
                onApply={date => {
                  const s = formatDateStr(date)
                  setEditValue(s)
                  setSavedValue(s)
                  setIsEditing(false)
                }}
                onCancel={cancelEdit}
              />
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Left: row icon + label */}
      <div className="flex items-center gap-2">
        <Icon icon={icon} width={20} height={20} className="text-[#A4A4A4] shrink-0" />
        <span className={labelCls}>{label}</span>
      </div>

      {/* Right: value chip */}
      <motion.div
        animate={chipControls}
        className={`relative flex items-center px-3 py-2 ${chipRounded} cursor-default select-none`}
        onMouseEnter={() => !isEditing && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Chip background — visible on hover OR while editing */}
        <motion.div
          className={`absolute inset-0 ${chipRounded} bg-[#f7f7f7] pointer-events-none`}
          animate={{ opacity: hovered || isEditing ? 1 : 0 }}
          transition={bgFade}
        />

        {/* Ghost span — mirrors input text for width measurement */}
        <span
          ref={ghostRef}
          aria-hidden
          className={`absolute invisible pointer-events-none ${valueCls}`}
        >
          {editValue || 'x'}
        </span>

        {/* Value: input in text-edit mode, static span otherwise */}
        {isEditing && !isCalendar ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter')  confirmEdit()
              if (e.key === 'Escape') cancelEdit()
            }}
            className={`relative z-10 bg-transparent border-none outline-none p-0 ${valueCls}`}
            style={{ width: inputWidth || 'auto' }}
            aria-label={ariaLabel ?? `Edit ${label}`}
          />
        ) : (
          <span className={`relative z-10 ${valueCls}`}>{editValue}</span>
        )}

        {/* Pencil — visible on hover only */}
        <IconSlot visible={hovered && !isEditing} transition={iconPop}>
          <button
            type="button"
            aria-label={`Edit ${label}`}
            className="flex items-center focus-visible:outline-none"
            onClick={enterEdit}
            tabIndex={hovered ? 0 : -1}
          >
            <Icon icon="mingcute:pencil-line" width={20} height={20} className="text-[#A4A4A4]" />
          </button>
        </IconSlot>

        {/* Check + Close — only for text-edit mode (calendar has its own buttons) */}
        {!isCalendar && (
          <>
            <IconSlot visible={isEditing} transition={iconPop}>
              <button
                type="button"
                aria-label="Confirm"
                className="flex items-center focus-visible:outline-none active:scale-[0.96] transition-transform duration-75"
                onClick={confirmEdit}
                tabIndex={isEditing ? 0 : -1}
              >
                <Icon icon="mingcute:check-line" width={20} height={20} className="text-[#A4A4A4] hover:text-[#5c5c5c] transition-colors duration-150" />
              </button>
            </IconSlot>

            <IconSlot visible={isEditing} transition={isEditing ? iconPopLate : iconPop}>
              <button
                type="button"
                aria-label="Cancel"
                className="flex items-center focus-visible:outline-none active:scale-[0.96] transition-transform duration-75"
                onClick={cancelEdit}
                tabIndex={isEditing ? 0 : -1}
              >
                <Icon icon="mingcute:close-line" width={20} height={20} className="text-[#A4A4A4] hover:text-[#5c5c5c] transition-colors duration-150" />
              </button>
            </IconSlot>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}

// ─── Time row ─────────────────────────────────────────────
/* Storyboard — SPLIT animation (right side only, label stays):
 *
 * Both chips start at the same center x, then spring apart (cell-division):
 *   0ms   single chip: opacity 1→0  (80ms)
 *   0ms   start chip:  x +54→0, scale 0.9→1, opacity 0→1  spring 420ms bounce 0.26
 *  50ms   end chip:    x -54→0, scale 0.9→1               spring 420ms bounce 0.26
 * 100ms   check chip:  scale 0.72→1, opacity 0→1           spring 350ms bounce 0.32
 * Exit:   chips snap back to center (spring 220ms), single chip fades in
 *
 * Time picker popover:
 *   Opens above chip on click — scale 0.95→1, y 8→0, opacity 0→1 — spring 350ms
 *   Escape closes picker first, then cancels edit
 */
function TimeRow({ delay }: { delay: number }) {
  const [hovered,    setHovered]    = useState(false)
  const [isEditing,  setIsEditing]  = useState(false)
  const [start,      setStart]      = useState({ h: '8',  m: '00', p: 'AM' as 'AM' | 'PM' })
  const [end,        setEnd]        = useState({ h: '10', m: '00', p: 'PM' as 'AM' | 'PM' })
  const [openPicker, _setOpenPicker] = useState<'start' | 'end' | null>(null)

  const savedStart    = useRef({ h: '8',  m: '00', p: 'AM' as 'AM' | 'PM' })
  const savedEnd      = useRef({ h: '10', m: '00', p: 'PM' as 'AM' | 'PM' })
  const openPickerRef = useRef<'start' | 'end' | null>(null)
  const rowRef        = useRef<HTMLDivElement>(null)

  const setOpenPicker = (v: 'start' | 'end' | null) => {
    openPickerRef.current = v
    _setOpenPicker(v)
  }

  const displayValue = `${start.h}:${start.m} ${start.p} – ${end.h}:${end.m} ${end.p}`

  const enterEdit = () => {
    savedStart.current = { ...start }
    savedEnd.current   = { ...end }
    setOpenPicker(null)
    setIsEditing(true)
    setHovered(false)
  }

  const confirmEdit = () => {
    setOpenPicker(null)
    setIsEditing(false)
  }

  useEffect(() => {
    if (!isEditing) return
    const cancel = () => {
      setStart({ ...savedStart.current })
      setEnd({   ...savedEnd.current })
      openPickerRef.current = null
      _setOpenPicker(null)
      setIsEditing(false)
    }
    const onDown = (e: MouseEvent) => {
      if (!rowRef.current?.contains(e.target as Node)) cancel()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (openPickerRef.current !== null) setOpenPicker(null)
        else cancel()
      }
      if (e.key === 'Enter' && openPickerRef.current === null) confirmEdit()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown',   onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown',   onKey)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing])

  const splitSpring     = { type: 'spring', duration: 0.42, bounce: 0.26 } as const
  const splitSpringLate = { type: 'spring', duration: 0.42, bounce: 0.26, delay: 0.05 } as const
  const checkSpring     = { type: 'spring', duration: 0.35, bounce: 0.32, delay: 0.10 } as const
  const collapseSpring  = { type: 'spring', duration: 0.22, bounce: 0    } as const
  const pickerSpring    = { type: 'spring', duration: 0.35, bounce: 0.12 } as const

  const chipCls = (active: boolean) => [
    'w-[96px] shrink-0 flex items-center justify-between rounded-[12px] px-3 py-2',
    'cursor-pointer select-none transition-colors duration-100',
    active ? 'bg-[#efefef]' : 'bg-[#f7f7f7]',
  ].join(' ')

  return (
    <motion.div
      ref={rowRef}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...mountSpring, delay }}
      className="flex items-center justify-between"
    >
      {/* Left: label — always visible */}
      <div className="flex items-center gap-2 shrink-0">
        <Icon icon="mingcute:time-line" width={20} height={20} className="text-[#A4A4A4] shrink-0" />
        <span className={labelCls}>Time</span>
      </div>

      {/* Right: single ↔ split */}
      <div className="flex-1 flex justify-end min-w-0 ml-2">
        <AnimatePresence mode="wait" initial={false}>

          {/* Display chip */}
          {!isEditing && (
            <motion.div
              key="single"
              className="relative flex items-center px-3 py-2 rounded-[12px] cursor-default select-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.08 } }}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
            >
              <motion.div
                className="absolute inset-0 rounded-[12px] bg-[#f7f7f7] pointer-events-none"
                animate={{ opacity: hovered ? 1 : 0 }}
                transition={bgFade}
              />
              <span className={`relative z-10 ${valueCls}`}>{displayValue}</span>
              <IconSlot visible={hovered} transition={iconPop}>
                <button
                  type="button"
                  aria-label="Edit Time"
                  className="flex items-center focus-visible:outline-none"
                  onClick={enterEdit}
                  tabIndex={hovered ? 0 : -1}
                >
                  <Icon icon="mingcute:pencil-line" width={20} height={20} className="text-[#A4A4A4]" />
                </button>
              </IconSlot>
            </motion.div>
          )}

          {/* Split chips */}
          {isEditing && (
            <motion.div
              key="split"
              className="flex items-center gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
            >

              {/* Start chip */}
              <div className="relative">
                <motion.div
                  className={chipCls(openPicker === 'start')}
                  onClick={() => setOpenPicker(openPicker === 'start' ? null : 'start')}
                  initial={{ opacity: 0, x: 54,  scale: 0.9 }}
                  animate={{ opacity: 1, x: 0,   scale: 1   }}
                  exit={{    opacity: 0, x: 54,  scale: 0.9, transition: collapseSpring }}
                  transition={splitSpring}
                  whileTap={{ scale: 0.96, transition: { duration: 0.08 } }}
                >
                  <span className={`${valueCls} text-[#171717] tabular-nums`}>{start.h}:{start.m}</span>
                  <span className="text-[14px] font-medium leading-5 tracking-[-0.084px] text-[#A3A3A3]">{start.p}</span>
                </motion.div>
                <AnimatePresence>
                  {openPicker === 'start' && (
                    <motion.div
                      className="absolute bottom-full right-0 z-50 w-[192px] pb-1"
                      initial={{ opacity: 0, scale: 0.95, y: 8 }}
                      animate={{ opacity: 1, scale: 1,    y: 0 }}
                      exit={{    opacity: 0, scale: 0.95, y: 8 }}
                      transition={pickerSpring}
                      style={{ transformOrigin: 'bottom center' }}
                    >
                      <TimePickerPopover
                        initialH={start.h} initialM={start.m} initialP={start.p}
                        onApply={(h, m, p) => { setStart({ h, m, p }); setOpenPicker(null) }}
                        onCancel={() => setOpenPicker(null)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* End chip */}
              <div className="relative">
                <motion.div
                  className={chipCls(openPicker === 'end')}
                  onClick={() => setOpenPicker(openPicker === 'end' ? null : 'end')}
                  initial={{ opacity: 0, x: -54, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0,   scale: 1   }}
                  exit={{    opacity: 0, x: -54, scale: 0.9, transition: collapseSpring }}
                  transition={splitSpringLate}
                  whileTap={{ scale: 0.96, transition: { duration: 0.08 } }}
                >
                  <span className={`${valueCls} text-[#171717] tabular-nums`}>{end.h}:{end.m}</span>
                  <span className="text-[14px] font-medium leading-5 tracking-[-0.084px] text-[#A3A3A3]">{end.p}</span>
                </motion.div>
                <AnimatePresence>
                  {openPicker === 'end' && (
                    <motion.div
                      className="absolute bottom-full right-0 z-50 w-[192px] pb-1"
                      initial={{ opacity: 0, scale: 0.95, y: 8 }}
                      animate={{ opacity: 1, scale: 1,    y: 0 }}
                      exit={{    opacity: 0, scale: 0.95, y: 8 }}
                      transition={pickerSpring}
                      style={{ transformOrigin: 'bottom center' }}
                    >
                      <TimePickerPopover
                        initialH={end.h} initialM={end.m} initialP={end.p}
                        onApply={(h, m, p) => { setEnd({ h, m, p }); setOpenPicker(null) }}
                        onCancel={() => setOpenPicker(null)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Confirm chip */}
              <motion.button
                type="button"
                onClick={confirmEdit}
                aria-label="Confirm time"
                className="shrink-0 flex items-center bg-[#f7f7f7] rounded-[12px] px-3 py-2 focus-visible:outline-none"
                initial={{ opacity: 0, scale: 0.72 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{    opacity: 0, scale: 0.8, transition: { duration: 0.08 } }}
                transition={checkSpring}
                whileTap={{ scale: 0.88, transition: { duration: 0.08 } }}
              >
                <Icon icon="mingcute:check-line" width={20} height={20} className="text-[#A4A4A4] hover:text-[#5c5c5c] transition-colors duration-150" />
              </motion.button>

            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ─── Color swatches ───────────────────────────────────────
const COLOR_SWATCHES = [
  { color: '#ffffff', border: '#d4d4d0' },
  { color: '#f5f5f4', border: '#d4d4d0' },
  { color: '#a3a3a3', border: null },
  { color: '#57534e', border: null },
  { color: '#1c1917', border: null },
  { color: '#ef4444', border: null },
  { color: '#f97316', border: null },
  { color: '#f59e0b', border: null },
  { color: '#84cc16', border: null },
  { color: '#10b981', border: null },
  { color: '#06b6d4', border: null },
  { color: '#3b82f6', border: null },
  { color: '#6366f1', border: null },
  { color: '#8b5cf6', border: null },
  { color: '#a855f7', border: null },
  { color: '#ec4899', border: null },
  { color: '#f43f5e', border: null },
] as const

// ─── Floating toolbar button ──────────────────────────────
function ToolbarBtn({ ariaLabel, onClick, children }: {
  ariaLabel: string
  onClick:   () => void
  children:  React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onMouseDown={e => e.preventDefault()} // keep selection alive
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: 30, padding: '0 8px', minWidth: 30,
        background: 'transparent', border: 'none', cursor: 'pointer',
        borderRadius: 8, flexShrink: 0, transition: 'background 0.1s',
      }}
      onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)' }}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
    >
      {children}
    </button>
  )
}

const TbDivider = () => (
  <div style={{ width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.15)', margin: '0 2px', flexShrink: 0 }} />
)

// ─── Main card ─────────────────────────────────────────────
export function EventDetailsCard() {
  const [cardHovered, setCardHovered] = useState(false)
  const [descHovered, setDescHovered] = useState(false)
  const [descEditing, setDescEditing] = useState(false)
  const [descSelTb,   setDescSelTb]   = useState<{ x: number; y: number } | null>(null)

  const [descColorMode, setDescColorMode] = useState<'text' | 'highlight' | null>(null)
  const [descTextColor, setDescTextColor] = useState('#a3a3a3')
  const [descHlColor,   setDescHlColor]   = useState('#fca5a5')
  const [descLinkMode,  setDescLinkMode]  = useState(false)
  const [descLinkUrl,   setDescLinkUrl]   = useState('')

  const descRef          = useRef<HTMLDivElement>(null)
  const descTbRef        = useRef<HTMLDivElement>(null)
  const descLinkInputRef = useRef<HTMLInputElement>(null)
  const savedDescRange   = useRef<Range | null>(null)
  const descHtmlRef      = useRef(
    "A focused team check-in where everyone gets aligned on what’s moving, what’s stuck, and what’s next. We’ll quickly run through current sprint progress, highlight blockers, and flag anything that needs cross-team input."
  )

  const anyHovered = cardHovered || descHovered || descEditing

  // Seed innerHTML when switching into edit mode
  useEffect(() => {
    if (!descEditing || !descRef.current) return
    descRef.current.innerHTML = descHtmlRef.current
    descRef.current.focus()
    // Place cursor at end
    const range = document.createRange()
    range.selectNodeContents(descRef.current)
    range.collapse(false)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
  }, [descEditing])

  const handleDescMouseUp = () => {
    const sel = window.getSelection()
    if (sel && sel.toString().trim().length > 0 && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0)
      savedDescRange.current = range.cloneRange()
      const rect = range.getBoundingClientRect()
      setDescSelTb({ x: rect.left + rect.width / 2, y: rect.top })
    } else {
      setDescSelTb(null)
    }
  }

  const handleDescKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setDescSelTb(null)
      descRef.current?.blur()
      return
    }
    const sel = window.getSelection()
    if (sel && sel.toString().trim().length > 0 && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0)
      savedDescRange.current = range.cloneRange()
      const rect = range.getBoundingClientRect()
      setDescSelTb({ x: rect.left + rect.width / 2, y: rect.top })
    } else {
      setDescSelTb(null)
    }
  }

  const restoreDescSel = () => {
    if (!savedDescRange.current) return
    const sel = window.getSelection()
    if (sel) { sel.removeAllRanges(); sel.addRange(savedDescRange.current) }
  }

  const applyDescFormat = (cmd: string) => {
    descRef.current?.focus()
    restoreDescSel()
    document.execCommand(cmd)
    if (descRef.current) descHtmlRef.current = descRef.current.innerHTML
    setDescColorMode(null)
    setDescLinkMode(false)
    setDescSelTb(null)
  }

  const applyDescColor = (color: string) => {
    descRef.current?.focus()
    restoreDescSel()
    if (descColorMode === 'text') {
      document.execCommand('foreColor', false, color)
      setDescTextColor(color)
    } else {
      document.execCommand('hiliteColor', false, color)
      setDescHlColor(color)
    }
    if (descRef.current) descHtmlRef.current = descRef.current.innerHTML
    setDescColorMode(null)
    setDescSelTb(null)
  }

  const applyDescLink = (url: string) => {
    const trimmed = url.trim()
    if (!trimmed) return
    const finalUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    descRef.current?.focus()
    restoreDescSel()
    document.execCommand('createLink', false, finalUrl)
    if (descRef.current) descHtmlRef.current = descRef.current.innerHTML
    setDescLinkMode(false)
    setDescLinkUrl('')
    setDescSelTb(null)
  }

  const enterDescLinkMode = () => {
    setDescLinkMode(true)
    setDescLinkUrl('')
    setDescColorMode(null)
    setTimeout(() => descLinkInputRef.current?.focus(), 30)
  }

  return (
    <>
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...mountSpring, delay: T.wrapper }}
      className="flex flex-col gap-3 bg-[#f7f7f7] rounded-[20px] pt-3 pb-1 px-1 w-full"
      onMouseEnter={() => setCardHovered(true)}
      onMouseLeave={() => setCardHovered(false)}
    >
      {/* Heading */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...mountSpring, delay: T.heading }}
        className="px-3 flex items-center justify-between"
      >
        <span className="text-[14px] font-medium leading-5 tracking-[-0.084px] text-[#171717]">
          Setup events
        </span>

        {/* Close button — springs in when card is hovered */}
        <IconSlot visible={anyHovered} transition={iconPop}>
          <button
            type="button"
            aria-label="Dismiss"
            className="flex items-center focus-visible:outline-none active:scale-[0.96] transition-transform duration-75"
            tabIndex={anyHovered ? 0 : -1}
          >
            <Icon icon="mingcute:close-circle-fill" width={20} height={20} className="text-[#A4A4A4] hover:text-[#5c5c5c] transition-colors duration-150" />
          </button>
        </IconSlot>
      </motion.div>

      {/* White detail card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...mountSpring, delay: T.card }}
        className="bg-white rounded-[16px] p-3 flex flex-col gap-2"
        style={{ boxShadow: CARD_SHADOW }}
      >
        <Row icon="mingcute:notebook-2-line"  label="Title" value="Meeting with the Dev team" delay={T.row1} chipRounded="rounded-[8px]" />
        <Row icon="mingcute:calendar-2-line"  label="Date"  value="Apr 24, 2026"              delay={T.row2} chipRounded="rounded-[8px]" pickerType="calendar" />
        <TimeRow delay={T.row3} />

        {/* Description */}
        <div className="flex flex-col">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...mountSpring, delay: T.descLabel }}
            className="flex items-center gap-2 py-2"
          >
            <Icon icon="mingcute:list-check-3-line" width={20} height={20} className="text-[#A4A4A4] shrink-0 relative top-[1px] left-[1px]" />
            <span className={labelCls}>Description</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ ...softFade, delay: T.descBody }}
            className="relative py-2 cursor-text"
            onMouseEnter={() => setDescHovered(true)}
            onMouseLeave={() => setDescHovered(false)}
            onClick={() => !descEditing && setDescEditing(true)}
          >
            <motion.div
              className="absolute inset-0 rounded-[12px] bg-[#f7f7f7] pointer-events-none"
              animate={{ opacity: descHovered || descEditing ? 1 : 0 }}
              transition={bgFade}
            />

            {/* Display mode — plain div, always visible */}
            {!descEditing && (
              <div
                className="relative z-10 px-3 text-[14px] font-medium leading-5 tracking-[-0.084px] text-[#5c5c5c]"
                style={{ textWrap: 'pretty' } as React.CSSProperties}
                dangerouslySetInnerHTML={{ __html: descHtmlRef.current }}
              />
            )}

            {/* Edit mode — contentEditable, mounts on click */}
            {descEditing && (
              <div
                ref={descRef}
                contentEditable
                suppressContentEditableWarning
                onBlur={e => {
                  const rel = e.relatedTarget as Node | null
                  if (rel && descTbRef.current?.contains(rel)) return
                  if (descRef.current) descHtmlRef.current = descRef.current.innerHTML
                  setDescEditing(false)
                  setDescSelTb(null)
                  setDescColorMode(null)
                  setDescLinkMode(false)
                  setDescLinkUrl('')
                }}
                onMouseUp={handleDescMouseUp}
                onKeyUp={handleDescKeyUp}
                onInput={() => { if (descRef.current) descHtmlRef.current = descRef.current.innerHTML }}
                className="relative z-10 px-3 text-[14px] font-medium leading-5 tracking-[-0.084px] text-[#5c5c5c] outline-none"
                style={{ textWrap: 'pretty' } as React.CSSProperties}
                aria-label="Description"
                aria-multiline="true"
              />
            )}
          </motion.div>
        </div>
      </motion.div>
    </motion.div>

    {/* ── Floating selection toolbar (fixed, above selection) ── */}
    <AnimatePresence>
      {descSelTb && (
        <motion.div
          key="desc-toolbar"
          ref={descTbRef}
          role="toolbar"
          aria-label="Text formatting"
          style={{
            position:        'fixed',
            left:            descSelTb.x,
            top:             descSelTb.y - 52,
            zIndex:          200,
            display:         'flex',
            alignItems:      'center',
            height:          40,
            width:           descLinkMode ? 300 : undefined,
            backgroundColor: '#1c1c1c',
            borderRadius:    12,
            padding:         '0 5px',
            gap:             0,
            boxShadow:       '0 8px 24px rgba(0,0,0,0.28), 0 2px 6px rgba(0,0,0,0.18)',
            userSelect:      'none',
            overflow:        'hidden',
            transformOrigin: 'bottom center',
          }}
          initial={{ opacity: 0, scale: 0.88, y: 4, x: '-50%' }}
          animate={{ opacity: 1, scale: 1,    y: 0, x: '-50%' }}
          exit={{    opacity: 0, scale: 0.88, y: 4, x: '-50%' }}
          transition={{ type: 'spring', duration: 0.22, bounce: 0 }}
        >
          {descColorMode ? (
            /* ── Color palette panel ── */
            <>
              <ToolbarBtn ariaLabel="Back" onClick={() => setDescColorMode(null)}>
                <Icon icon="mingcute:left-line" width={13} color="#fff" />
              </ToolbarBtn>
              <TbDivider />
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, overflowX: 'auto', padding: '0 4px', scrollbarWidth: 'none' as const }}>
                {COLOR_SWATCHES.map(({ color, border }) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Color ${color}`}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => applyDescColor(color)}
                    style={{
                      width: 22, height: 22, borderRadius: '50%', border: 'none', cursor: 'pointer',
                      backgroundColor: color, flexShrink: 0,
                      outline: border ? `1.5px solid ${border}` : 'none',
                      outlineOffset: border ? '-1px' : '0',
                      transition: 'transform 0.1s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.2)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
                  />
                ))}
              </div>
            </>
          ) : descLinkMode ? (
            /* ── Link input panel ── */
            <>
              <ToolbarBtn ariaLabel="Back" onClick={() => { setDescLinkMode(false); setDescLinkUrl('') }}>
                <Icon icon="mingcute:left-line" width={13} color="#fff" />
              </ToolbarBtn>
              <TbDivider />
              <Icon icon="mingcute:link-line" width={14} color="rgba(255,255,255,0.5)" style={{ flexShrink: 0, marginLeft: 2 }} />
              <input
                ref={descLinkInputRef}
                type="url"
                value={descLinkUrl}
                onChange={e => setDescLinkUrl(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter')  { e.preventDefault(); applyDescLink(descLinkUrl) }
                  if (e.key === 'Escape') { setDescLinkMode(false); setDescLinkUrl('') }
                }}
                placeholder="Paste link…"
                style={{
                  flex: 1, minWidth: 0,
                  background: 'transparent', border: 'none', outline: 'none',
                  fontSize: 13, color: '#fff', fontFamily: 'inherit', caretColor: '#fff',
                }}
              />
              <ToolbarBtn ariaLabel="Apply link" onClick={() => applyDescLink(descLinkUrl)}>
                <Icon icon="mingcute:check-line" width={15} color="#fff" />
              </ToolbarBtn>
            </>
          ) : (
            /* ── Main toolbar ── */
            <>
              {/* Text color */}
              <ToolbarBtn ariaLabel="Text color" onClick={() => setDescColorMode('text')}>
                <span style={{ fontSize: 12.5, fontWeight: 500, color: '#fff' }}>Text</span>
                <span style={{ width: 11, height: 11, borderRadius: '50%', flexShrink: 0, backgroundColor: descTextColor, border: descTextColor === '#ffffff' ? '1px solid rgba(255,255,255,0.4)' : 'none', marginLeft: 3 }} />
              </ToolbarBtn>
              {/* Highlight */}
              <ToolbarBtn ariaLabel="Highlight" onClick={() => setDescColorMode('highlight')}>
                <span style={{ fontSize: 12.5, fontWeight: 500, color: '#fff' }}>Highlight</span>
                <span style={{ width: 11, height: 11, borderRadius: 3, flexShrink: 0, backgroundColor: descHlColor, marginLeft: 3 }} />
              </ToolbarBtn>
              <TbDivider />
              {/* Link */}
              <ToolbarBtn ariaLabel="Link" onClick={enterDescLinkMode}>
                <Icon icon="mingcute:link-line" width={15} color="#fff" />
              </ToolbarBtn>
              <TbDivider />
              {/* Bold */}
              <ToolbarBtn ariaLabel="Bold" onClick={() => applyDescFormat('bold')}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1 }}>B</span>
              </ToolbarBtn>
              {/* Italic */}
              <ToolbarBtn ariaLabel="Italic" onClick={() => applyDescFormat('italic')}>
                <span style={{ fontSize: 14, fontStyle: 'italic', color: '#fff', lineHeight: 1, fontFamily: 'Georgia, serif' }}>I</span>
              </ToolbarBtn>
              {/* Strikethrough */}
              <ToolbarBtn ariaLabel="Strikethrough" onClick={() => applyDescFormat('strikeThrough')}>
                <span style={{ fontSize: 14, textDecoration: 'line-through', color: '#fff', lineHeight: 1 }}>S</span>
              </ToolbarBtn>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
    </>
  )
}
