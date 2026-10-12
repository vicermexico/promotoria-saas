import { useEffect, useState } from 'react'
import { Wallet, X, Copy, Upload, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { ApiResponse } from '@/lib/api'
import { useSaldo } from './useSaldo'
import { useNavigate } from 'react-router-dom'

interface BankInfo {
  bank: string
  holder: string
  clabe: string
  account: string
  instructions: string
}

const mxn = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

function Dato({ label, value }: { label: string; value: string }) {
  if (!value) return null
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success('Copiado')
    } catch {
      toast.error('No se pudo copiar')
    }
  }
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground break-all">{value}</p>
      </div>
      <button type="button" onClick={copiar} className="p-2 rounded-lg hover:bg-accent shrink-0" title="Copiar">
        <Copy size={16} />
      </button>
    </div>
  )
}

function RecargaModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [bank, setBank] = useState<BankInfo | null>(null)
  const [monto, setMonto] = useState('')
  const [referencia, setReferencia] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    api
      .get<ApiResponse<BankInfo>>('/balance/bank-info')
      .then((r) => {
        if (r.ok) setBank(r.data)
      })
      .catch(() => undefined)
  }, [])

  const sinDatos = !!bank && !bank.clabe && !bank.account

  const enviar = async () => {
    const m = Number(monto)
    if (!Number.isFinite(m) || m < 1) {
      toast.error('Escribe el monto que depositaste (minimo $1).')
      return
    }
    if (!file) {
      toast.error('Adjunta el comprobante de tu transferencia o deposito.')
      return
    }
    setEnviando(true)
    try {
      const fd = new FormData()
      fd.append('amount', String(m))
      if (referencia.trim()) fd.append('reference', referencia.trim())
      fd.append('receipt', file)
      const res = await api.upload<ApiResponse<unknown>>('/balance/topups', fd)
      if (!res.ok) {
        toast.error(res.message || 'No se pudo enviar la recarga')
        return
      }
      toast.success(res.message || 'Recarga enviada. Se acreditara cuando sea aprobada.')
      onDone()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo enviar la recarga')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card text-foreground rounded-xl border border-border w-full max-w-md max-h-[90vh] overflow-auto p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recargar saldo</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent">
            <X size={18} />
          </button>
        </div>

        <div className="rounded-lg border border-border p-3">
          <p className="text-sm font-medium mb-1">1. Haz tu transferencia o deposito a:</p>
          {!bank ? (
            <p className="text-sm text-muted-foreground">Cargando datos...</p>
          ) : sinDatos ? (
            <p className="text-sm text-muted-foreground">
              Aun no hay datos bancarios configurados. Contacta a soporte para recargar.
            </p>
          ) : (
            <div className="divide-y divide-border">
              <Dato label="Banco" value={bank.bank} />
              <Dato label="Titular" value={bank.holder} />
              <Dato label="CLABE" value={bank.clabe} />
              <Dato label="Cuenta" value={bank.account} />
              {bank.instructions && <p className="text-xs text-muted-foreground pt-2">{bank.instructions}</p>}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">2. Sube tu comprobante</p>
          <div>
            <label className="block text-sm mb-1">Monto depositado (MXN)</label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="500.00"
              className="w-full px-4 py-2.5 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Referencia o clave de rastreo (opcional)</label>
            <input
              type="text"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              className="w-full px-4 py-2.5 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-border rounded-lg cursor-pointer hover:bg-accent text-sm">
              <Upload size={16} />
              <span className="truncate">{file ? file.name : 'Elegir foto o PDF del comprobante'}</span>
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </div>

        <button
          type="button"
          onClick={enviar}
          disabled={enviando || sinDatos}
          className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {enviando && <Loader2 size={16} className="animate-spin" />}
          {enviando ? 'Enviando...' : 'Enviar recarga'}
        </button>
        <p className="text-xs text-muted-foreground text-center">
          Tu saldo se actualiza cuando revisemos y aprobemos el comprobante.
        </p>
      </div>
    </div>
  )
}

/** Barra fija con el saldo. Solo aparece para clientes prepago. */
export function BarraSaldo() {
  const { summary, reload } = useSaldo()
  const navigate = useNavigate()
  const [abierto, setAbierto] = useState(false)

  useEffect(() => {
    const h = () => setAbierto(true)
    window.addEventListener('saldo:recargar', h)
    return () => window.removeEventListener('saldo:recargar', h)
  }, [])

  useEffect(() => {
    const t = setInterval(() => {
      reload()
    }, 60000)
    return () => clearInterval(t)
  }, [reload])

  if (!summary || summary.vc_payment_mode !== 'PREPAGO') return null

  const saldo = Number(summary.f_balance)

  return (
    <>
      <div className="shrink-0 flex items-center justify-between gap-3 px-4 lg:px-6 py-2 border-b border-border bg-primary/5">
        <div className="flex items-center gap-2 min-w-0">
          <Wallet size={18} className="text-primary shrink-0" />
          <span className="text-sm text-muted-foreground shrink-0">Tu saldo:</span>
          <span className="text-base font-bold tabular-nums text-foreground">{mxn(saldo)}</span>
          <button type="button" onClick={() => navigate('/mi-saldo')} className="text-xs text-primary underline shrink-0 ml-1">
            Ver historial
          </button>
          {summary.pending_topups > 0 && (
            <span className="text-xs text-muted-foreground truncate">
              ({summary.pending_topups} recarga{summary.pending_topups === 1 ? '' : 's'} en revision)
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-medium shrink-0"
        >
          Recargar
        </button>
      </div>
      {abierto && (
        <RecargaModal
          onClose={() => setAbierto(false)}
          onDone={() => {
            setAbierto(false)
            reload()
          }}
        />
      )}
    </>
  )
}
