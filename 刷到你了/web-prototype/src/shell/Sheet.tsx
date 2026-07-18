import { useEffect, useId, type ReactNode } from 'react'
import { X } from 'lucide-react'

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const titleId = useId()
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [onClose])
  return <div className="sheet-layer"><button className="sheet-backdrop" aria-label="关闭弹层" onClick={onClose} /><section className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}><header><h2 id={titleId}>{title}</h2><button aria-label="关闭" onClick={onClose}><X /></button></header>{children}</section></div>
}
