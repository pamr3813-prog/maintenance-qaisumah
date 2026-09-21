import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'

export interface SearchOption {
  value: string
  label: string
  group?: string
}

/**
 * قائمة منسدلة قابلة للكتابة — اكتب للتصفية بدل التمرير في مئات الخيارات.
 * تدعم التجميع optgroup عبر حقل group، والاختيار بالماوس أو لوحة المفاتيح (سهم لأعلى/أسفل + Enter).
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  clearable = true,
  className = '',
}: {
  options: SearchOption[]
  value: string
  onChange: (v: string) => void
  placeholder?: string
  clearable?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.group?.toLowerCase().includes(q))
  }, [options, query])

  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  useEffect(() => { setActive(0) }, [query, open])

  function choose(v: string) {
    onChange(v)
    setOpen(false)
    setQuery('')
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[active]) choose(filtered[active].value) }
    else if (e.key === 'Escape') { setOpen(false); setQuery('') }
  }

  // تجميع المعروض حسب group مع الحفاظ على الترتيب
  const grouped = useMemo(() => {
    const out: Array<{ group?: string; items: Array<{ opt: SearchOption; idx: number }> }> = []
    filtered.forEach((opt, idx) => {
      const last = out[out.length - 1]
      if (last && last.group === opt.group) last.items.push({ opt, idx })
      else out.push({ group: opt.group, items: [{ opt, idx }] })
    })
    return out
  }, [filtered])

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {open ? (
        <input
          ref={inputRef}
          autoFocus
          className="flex h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder ?? '…'}
        />
      ) : (
        <button
          type="button"
          className="flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-background px-3 text-sm hover:bg-muted/50"
          onClick={() => setOpen(true)}
        >
          <span className={`truncate ${selected ? '' : 'text-muted-foreground'}`}>
            {selected ? selected.label : (placeholder ?? '—')}
          </span>
          <span className="flex items-center gap-1">
            {clearable && selected && (
              <X
                className="size-3.5 text-muted-foreground hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); onChange(''); }}
              />
            )}
            <ChevronDown className="size-4 text-muted-foreground" />
          </span>
        </button>
      )}

      {open && (
        <div className="absolute z-50 mt-1 max-h-64 w-full max-w-[calc(100vw-2rem)] min-w-56 overflow-auto rounded-md border bg-popover shadow-lg">
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">—</div>
          )}
          {grouped.map((g, gi) => (
            <div key={gi}>
              {g.group && (
                <div className="sticky top-0 bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                  {g.group}
                </div>
              )}
              {g.items.map(({ opt, idx }) => (
                <div
                  key={opt.value}
                  className={`cursor-pointer px-3 py-1.5 text-sm ${idx === active ? 'bg-accent' : ''} ${opt.value === value ? 'font-semibold text-primary' : ''}`}
                  onMouseEnter={() => setActive(idx)}
                  onMouseDown={(e) => { e.preventDefault(); choose(opt.value); }}
                >
                  {opt.label}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
