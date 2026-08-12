'use client';

/**
 * ═══════════════════════════════════════════════════════════════
 * CheckoutModal — pago por transferencia con verificacion de comprobante
 * ═══════════════════════════════════════════════════════════════
 *
 * PASOS
 *   1. BANK   — datos bancarios del vendedor, con copiar al portapapeles
 *   2. UPLOAD — drag & drop del comprobante; si es imagen, OCR en el
 *               navegador antes de enviar
 *   3. RESULT — resultado del triage con los datos extraidos
 *
 * POR QUE EL OCR CORRE ACA Y NO EN EL SERVIDOR: ver src/lib/ocr-client.ts.
 * El servidor re-parsea y re-puntua todo lo que recibe: este componente
 * nunca decide si un pago es valido.
 */

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  FileCheck2,
  FileUp,
  Loader2,
  ScanLine,
  Shield,
  X,
} from 'lucide-react';
import { formatCents } from '@/lib/money';
import { recognizeImage, shouldRunClientOcr } from '@/lib/ocr-client';
import { useToast } from '@/components/ui/Toast';
import { MAX_UPLOAD_BYTES, ACCEPTED_RECEIPT_TYPES } from '@/lib/constants';

type Step = 'BANK' | 'UPLOAD' | 'RESULT';

interface ScoreRow {
  key: string;
  value: string;
  ok: boolean;
  warn: boolean;
}

interface VerifyResponse {
  ok: boolean;
  message: string;
  receiptStatus?: string;
  orderStatus?: string;
  score?: number;
  rows?: ScoreRow[];
  flags?: string[];
}

export interface SellerBank {
  holder: string | null;
  cuit: string | null;
  cbu: string | null;
  alias: string | null;
}

interface CheckoutModalProps {
  orderId: string;
  reference: string;
  productTitle: string;
  /** Total en centavos */
  totalAmount: number;
  sellerName: string;
  sellerBank: SellerBank;
  onClose: () => void;
}

export function CheckoutModal({
  orderId,
  reference,
  productTitle,
  totalAmount,
  sellerName,
  sellerBank,
  onClose,
}: CheckoutModalProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>('BANK');
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const bankRows = [
    { key: 'Titular', value: sellerBank.holder ?? sellerName, copy: false },
    { key: 'CUIT', value: sellerBank.cuit ?? '—', copy: true },
    { key: 'Alias', value: sellerBank.alias ?? '—', copy: true },
    { key: 'CBU/CVU', value: sellerBank.cbu ?? '—', copy: true },
    { key: 'Monto', value: formatCents(totalAmount), copy: false },
    { key: 'Referencia', value: reference, copy: true },
  ];

  const copyValue = useCallback((value: string) => {
    void navigator.clipboard?.writeText(value);
    setCopied(value);
    setTimeout(() => setCopied(null), 1600);
  }, []);

  const pickFile = useCallback(
    (selected: File | undefined) => {
      if (!selected) return;
      if (selected.size > MAX_UPLOAD_BYTES) {
        toast('El archivo supera los 15 MB', 'error');
        return;
      }
      if (!ACCEPTED_RECEIPT_TYPES.includes(selected.type as (typeof ACCEPTED_RECEIPT_TYPES)[number])) {
        toast('Subi un PDF o una imagen JPG, PNG o WEBP', 'error');
        return;
      }
      setFile(selected);
    },
    [toast],
  );

  /** OCR en el navegador (si aplica) y envio al servidor. */
  const verify = useCallback(async () => {
    if (!file || busy) return;

    setBusy(true);
    setProgress(5);
    setProgressLabel('Preparando el archivo...');

    let clientText = '';

    // Solo las imagenes pasan por Tesseract: los PDF los lee el servidor
    if (shouldRunClientOcr(file)) {
      const ocr = await recognizeImage(file, ({ status, progress: p }) => {
        setProgressLabel(status);
        setProgress(Math.min(90, 10 + Math.round(p * 0.8)));
      });
      if (ocr.ok) {
        clientText = ocr.text;
      } else {
        // Sin OCR el servidor igual guarda el comprobante y lo manda a
        // revision manual: mejor eso que frenar la compra.
        toast('No pudimos leer la imagen. La mandamos a revision manual.', 'info');
      }
    }

    setProgress(94);
    setProgressLabel('Verificando con el servidor...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('orderId', orderId);
      formData.append('clientText', clientText);

      const response = await fetch('/api/ocr/verify', { method: 'POST', body: formData });
      const data = (await response.json()) as VerifyResponse;

      setProgress(100);
      setResult(data);
      setStep('RESULT');

      if (data.ok) router.refresh();
    } catch {
      toast('No pudimos enviar el comprobante. Revisá tu conexion.', 'error');
    } finally {
      setBusy(false);
    }
  }, [file, busy, orderId, router, toast]);

  const close = useCallback(() => {
    if (busy) return;
    onClose();
  }, [busy, onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] bg-void/90 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && close()}
      role="presentation"
    >
      <div className="min-h-full grid place-items-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="checkout-title"
          className="w-full max-w-md bg-void2 hairline rounded-3xl overflow-hidden animate-fade-up"
        >
          {/* Cabecera */}
          <div className="cutting-mat border-b border-mathi p-5 relative">
            <button
              onClick={close}
              disabled={busy}
              aria-label="Cerrar"
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-void/60 grid place-items-center disabled:opacity-40"
            >
              <X className="w-4 h-4" />
            </button>
            <p className="font-mono text-[9.5px] uppercase tracking-[.16em] text-chalk">
              Pago por transferencia
            </p>
            <h2 id="checkout-title" className="mt-2 text-lg font-extrabold leading-tight pr-8">
              {productTitle}
            </h2>
            <p className="mt-1 text-2xl font-extrabold tracking-tight">{formatCents(totalAmount)}</p>
          </div>

          <div className="p-5">
            {/* ══ PASO 1 ══ */}
            {step === 'BANK' && (
              <>
                <p className="font-mono text-[9.5px] uppercase tracking-[.16em] text-muted mb-3">
                  Transferí a esta cuenta
                </p>
                <div className="bg-void rounded-xl p-4">
                  {bankRows.map((row) => (
                    <div
                      key={row.key}
                      className="flex items-center gap-3 py-2 border-b border-line last:border-0"
                    >
                      <span className="text-[11.5px] text-muted w-20 shrink-0">{row.key}</span>
                      <span className="font-mono text-[12.5px] flex-1 truncate">{row.value}</span>
                      {row.copy && row.value !== '—' && (
                        <button
                          onClick={() => copyValue(row.value)}
                          className="text-[11.5px] text-chalk font-semibold shrink-0 flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          {copied === row.value ? 'Copiado' : 'Copiar'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 rounded-xl bg-amber/10 border border-amber/40">
                  <p className="font-mono text-[9px] uppercase tracking-[.14em] text-amber mb-1">
                    ◆ Importante
                  </p>
                  <p className="text-[12px] text-muted leading-relaxed">
                    Transferí el monto exacto. El sistema lee el comprobante y compara el importe: si
                    no coincide, la orden queda frenada.
                  </p>
                </div>

                <button
                  onClick={() => setStep('UPLOAD')}
                  className="mt-4 w-full py-3.5 rounded-xl bg-chalk text-void font-bold text-[15px] hover:bg-chalkd transition"
                >
                  Ya transferí, subir comprobante
                </button>
              </>
            )}

            {/* ══ PASO 2 ══ */}
            {step === 'UPLOAD' && (
              <>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    pickFile(e.dataTransfer.files[0]);
                  }}
                  className={`border-2 border-dashed rounded-xl p-7 text-center transition relative overflow-hidden ${
                    dragging ? 'border-chalk bg-chalk/5' : 'border-line'
                  } ${busy ? 'scanner' : ''}`}
                >
                  {busy ? (
                    <>
                      <ScanLine className="w-8 h-8 mx-auto text-chalk mb-2.5 animate-pulse" />
                      <p className="text-[13.5px] font-semibold">{progressLabel}</p>
                      <div className="mt-3 h-1.5 bg-void rounded-full overflow-hidden">
                        <div
                          className="h-full bg-chalk transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="font-mono text-[10px] text-muted mt-2">{progress}%</p>
                    </>
                  ) : file ? (
                    <div className="flex items-center gap-3 text-left">
                      <FileCheck2 className="w-7 h-7 text-jade shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold truncate">{file.name}</p>
                        <p className="font-mono text-[10.5px] text-muted">
                          {(file.size / 1024).toFixed(0)} KB
                        </p>
                      </div>
                      <button
                        onClick={() => inputRef.current?.click()}
                        className="text-[12px] text-chalk font-semibold shrink-0"
                      >
                        Cambiar
                      </button>
                    </div>
                  ) : (
                    <>
                      <FileUp className="w-8 h-8 mx-auto text-muted mb-2.5" />
                      <p className="text-[13.5px] font-semibold">Arrastrá el comprobante</p>
                      <p className="text-[11.5px] text-muted mt-0.5">PDF o imagen · hasta 15 MB</p>
                      <button
                        onClick={() => inputRef.current?.click()}
                        className="mt-3 px-4 py-2 rounded-lg bg-void3 hairline text-[13px] font-semibold hover:border-mathi transition"
                      >
                        Elegir archivo
                      </button>
                    </>
                  )}
                </div>

                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf,image/*"
                  className="hidden"
                  onChange={(e) => {
                    pickFile(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />

                <p className="mt-3 text-[11.5px] text-muted leading-relaxed">
                  Leemos automaticamente CUIT, fecha, monto y numero de operacion. Si es una foto, que
                  se vea nitido el importe.
                </p>

                <div className="flex gap-2.5 mt-4">
                  <button
                    onClick={() => setStep('BANK')}
                    disabled={busy}
                    className="px-4 py-3 rounded-xl bg-void3 hairline font-semibold text-[13.5px] disabled:opacity-40"
                  >
                    Volver
                  </button>
                  <button
                    onClick={verify}
                    disabled={!file || busy}
                    className="flex-1 py-3 rounded-xl bg-chalk text-void font-bold text-[14.5px] disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                    {busy ? 'Analizando...' : 'Verificar comprobante'}
                  </button>
                </div>
              </>
            )}

            {/* ══ PASO 3 ══ */}
            {step === 'RESULT' && result && (
              <div className="text-center">
                <div
                  className={`w-14 h-14 mx-auto rounded-2xl grid place-items-center mb-3 ${
                    result.ok
                      ? result.orderStatus === 'CONFIRMED'
                        ? 'bg-jade/15'
                        : 'bg-amber/15'
                      : 'bg-chalk/15'
                  }`}
                >
                  {result.ok ? (
                    result.orderStatus === 'CONFIRMED' ? (
                      <CheckCircle2 className="w-7 h-7 text-jade" />
                    ) : (
                      <Clock className="w-7 h-7 text-amber" />
                    )
                  ) : (
                    <AlertTriangle className="w-7 h-7 text-chalk" />
                  )}
                </div>

                <h3 className="text-lg font-extrabold">
                  {!result.ok
                    ? 'Revisá el comprobante'
                    : result.orderStatus === 'CONFIRMED'
                      ? 'Pago verificado'
                      : 'Comprobante en revision'}
                </h3>
                <p className="mt-1.5 text-[13.5px] text-muted leading-relaxed">{result.message}</p>

                {result.rows && result.rows.length > 0 && (
                  <div className="mt-4 bg-void rounded-xl p-4 text-left font-mono text-[11.5px] space-y-1.5">
                    <p className="text-muted uppercase tracking-[.14em] text-[9px] mb-2">
                      Datos extraidos
                    </p>
                    {result.rows.map((row) => (
                      <div key={row.key} className="flex justify-between gap-3">
                        <span className="text-muted">{row.key}</span>
                        <span className={row.ok ? 'text-jade' : row.warn ? 'text-amber' : 'text-chalk'}>
                          {row.value}
                        </span>
                      </div>
                    ))}
                    {typeof result.score === 'number' && (
                      <div className="pt-2 mt-2 border-t border-line">
                        <div className="h-1.5 bg-void2 rounded-full overflow-hidden mb-1.5">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              result.score >= 80 ? 'bg-jade' : result.score >= 50 ? 'bg-amber' : 'bg-chalk'
                            }`}
                            style={{ width: `${result.score}%` }}
                          />
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted">Confianza</span>
                          <span>{result.score}/100</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {result.flags && result.flags.length > 0 && (
                  <ul className="mt-3 space-y-1 text-left">
                    {result.flags.map((flag) => (
                      <li key={flag} className="text-[12px] text-amber flex gap-1.5">
                        <span>•</span>
                        <span>{flag}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-3 flex items-start gap-2 text-[11px] text-muted text-left">
                  <Shield className="w-3.5 h-3.5 shrink-0 mt-px" />
                  <span>
                    La verificacion automatica es una ayuda: el vendedor confirma el pago mirando su
                    cuenta antes de despachar.
                  </span>
                </div>

                <button
                  onClick={() => {
                    if (result.ok) {
                      onClose();
                      router.push('/pedidos');
                    } else {
                      setFile(null);
                      setResult(null);
                      setStep('UPLOAD');
                    }
                  }}
                  className={`mt-5 w-full py-3.5 rounded-xl font-bold text-[15px] ${
                    result.ok ? 'bg-chalk text-void hover:bg-chalkd' : 'bg-void3 hairline'
                  } transition`}
                >
                  {result.ok ? 'Ver mi pedido' : 'Subir otro comprobante'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
