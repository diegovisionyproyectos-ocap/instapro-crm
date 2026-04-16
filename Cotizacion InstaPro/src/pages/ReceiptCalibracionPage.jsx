import { useEffect, useRef, useState, useCallback } from 'react';
import AppNav from '../components/AppNav';
import { RECIBO_CAMPOS_META } from '../utils/receiptGenerator';

const SCALE = 1.5;
const API_URL = '/api/coords?type=recibo';
const TEMPLATE_URL = 'recibo_pago.pdf';
const DEFAULT_PAGE = { width: 595.5, height: 842.25 };

export default function ReceiptCalibracionPage() {
  const canvasRef = useRef(null);

  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [picking, setPicking] = useState(null);
  const [coords, setCoords] = useState(null);
  const [saveState, setSaveState] = useState('idle');
  const [lastSaved, setLastSaved] = useState(null);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE);

  const groups = RECIBO_CAMPOS_META.reduce((acc, m) => {
    const g = m.group || 'Otros';
    (acc[g] = acc[g] || []).push(m);
    return acc;
  }, {});

  useEffect(() => {
    fetch(API_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setCoords)
      .catch(() => {
        import('../utils/receiptCoords.json').then((m) => setCoords(m.default));
      });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const pdfjsLib = await import(
          /* @vite-ignore */
          'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.mjs'
        );
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';

        const data = await fetch(TEMPLATE_URL).then((r) => r.arrayBuffer());
        const pdf = await pdfjsLib.getDocument({ data }).promise;
        const page = await pdf.getPage(1);
        const baseViewport = page.getViewport({ scale: 1 });
        const renderViewport = page.getViewport({ scale: SCALE });

        if (cancelled) return;

        setPageSize({ width: baseViewport.width, height: baseViewport.height });

        const canvas = canvasRef.current;
        canvas.width = renderViewport.width;
        canvas.height = renderViewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: renderViewport }).promise;
        if (!cancelled) setPdfLoaded(true);
      } catch (e) {
        if (!cancelled) setPdfError(`Error cargando PDF: ${e.message}`);
      }
    }

    render();
    return () => { cancelled = true; };
  }, []);

  const toPdf = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const offsetX = e.nativeEvent.offsetX;
    const offsetY = e.nativeEvent.offsetY;
    const ratioX = canvas.width / pageSize.width;
    const ratioY = canvas.height / pageSize.height;
    const physicalX = offsetX * ratioX;
    const physicalY = offsetY * ratioY;

    return {
      x: Math.round(physicalX / SCALE),
      y: Math.round(pageSize.height - (physicalY / SCALE)),
    };
  }, [pageSize.height, pageSize.width]);

  function toScreen(pdfX, pdfY) {
    const canvas = canvasRef.current;
    if (!canvas) return { left: 0, top: 0 };

    const ratioX = canvas.width / pageSize.width;
    const ratioY = canvas.height / pageSize.height;
    const physicalX = pdfX * SCALE;
    const physicalY = (pageSize.height - pdfY) * SCALE;

    return {
      left: physicalX / ratioX,
      top: physicalY / ratioY,
    };
  }

  function handleMouseMove(e) {
    setCursor(toPdf(e));
  }

  function handleClick(e) {
    if (!picking || !coords) return;
    const { x, y } = toPdf(e);
    setCoords((prev) => ({
      ...prev,
      [picking]: { ...(prev[picking] || {}), x, y },
    }));
    setLastSaved({ key: picking, x, y });
    setTimeout(() => setLastSaved(null), 2000);
    setPicking(null);
  }

  async function guardar() {
    setSaveState('saving');
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(coords),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (text) {
        const json = JSON.parse(text);
        if (json.ok === false) throw new Error(json.error);
      }
      setSaveState('ok');
      setTimeout(() => setSaveState('idle'), 3000);
    } catch (e) {
      console.error(e);
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 4000);
    }
  }

  if (!coords) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col" style={{ height: '100vh' }}>
      <AppNav />

      <div className="bg-slate-800 border-b border-slate-700 px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap flex-shrink-0">
        <div>
          <h1 className="font-bold text-yellow-400">Calibracion de recibo de pago</h1>
          <p className="text-slate-400 text-xs">
            Ahora respeta el tamano real del PDF. Si el recibo es horizontal, aqui se vera horizontal.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SaveButton state={saveState} onClick={guardar} />
          <a href="recibo_pago.pdf" target="_blank" rel="noreferrer" className="bg-slate-600 hover:bg-slate-500 px-3 py-2 rounded-lg text-sm transition">
            Abrir PDF
          </a>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 bg-slate-800 border-r border-slate-700 overflow-y-auto flex-shrink-0">
          <div className="p-3 space-y-4">
            {Object.entries(groups).map(([groupName, fields]) => (
              <div key={groupName}>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
                  {groupName}
                </p>
                <div className="space-y-1">
                  {fields.map((meta) => {
                    const c = coords[meta.key];
                    const xy = c && typeof c === 'object' && 'x' in c ? c : null;
                    const isActive = picking === meta.key;

                    return (
                      <div
                        key={meta.key}
                        className={`rounded-lg px-2 py-1.5 border text-xs transition ${
                          isActive ? 'border-yellow-400 bg-yellow-900/30' : 'border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: meta.color }} />
                            <span className="text-white truncate">{meta.label}</span>
                          </div>
                          <button
                            onClick={() => setPicking(isActive ? null : meta.key)}
                            className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 transition ${
                              isActive ? 'bg-yellow-400 text-black font-bold' : 'bg-slate-600 hover:bg-yellow-500 hover:text-black'
                            }`}
                          >
                            {isActive ? 'X' : '📌'}
                          </button>
                        </div>
                        {xy && (
                          <div className="font-mono text-slate-400 mt-0.5 text-xs">
                            x:<span className="text-cyan-400 ml-0.5">{xy.x}</span>
                            <span className="mx-1">·</span>
                            y:<span className="text-cyan-400 ml-0.5">{xy.y}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-950">
          <div className="sticky top-0 z-20 bg-slate-800/90 backdrop-blur border-b border-slate-700 px-4 py-1.5 flex items-center gap-4 text-xs font-mono">
            <span className="text-slate-400">Cursor</span>
            <span className="text-green-400">x: <strong>{cursor.x}</strong></span>
            <span className="text-blue-400">y: <strong>{cursor.y}</strong></span>
            {picking && (
              <span className="ml-2 text-yellow-300 animate-pulse font-sans">
                Haz clic donde va: {RECIBO_CAMPOS_META.find((m) => m.key === picking)?.label}
              </span>
            )}
          </div>

          <div className="flex justify-center p-6 min-w-max">
            <div
              className="relative inline-block shadow-2xl"
              style={{ cursor: picking ? 'crosshair' : 'default' }}
              onMouseMove={handleMouseMove}
              onClick={handleClick}
            >
              {!pdfLoaded && !pdfError && (
                <div
                  className="bg-slate-800 rounded flex items-center justify-center"
                  style={{ width: `${pageSize.width}px`, height: `${pageSize.height}px` }}
                >
                  <div className="text-center">
                    <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">Cargando recibo...</p>
                  </div>
                </div>
              )}

              {pdfError && (
                <div
                  className="bg-slate-800 rounded flex items-center justify-center p-8"
                  style={{ width: `${pageSize.width}px`, height: `${pageSize.height}px` }}
                >
                  <p className="text-red-400 text-sm text-center">{pdfError}</p>
                </div>
              )}

              <canvas
                ref={canvasRef}
                className="block rounded"
                style={{
                  width: `${pageSize.width}px`,
                  height: `${pageSize.height}px`,
                  display: 'block',
                  border: '1px solid #ccc',
                }}
              />

              {pdfLoaded && RECIBO_CAMPOS_META.map((meta) => {
                const c = coords[meta.key];
                if (!c || typeof c !== 'object' || !('x' in c)) return null;
                const { left, top } = toScreen(c.x, c.y);
                const isActive = picking === meta.key;

                return (
                  <div
                    key={meta.key}
                    title={`${meta.label} (${c.x}, ${c.y})`}
                    style={{
                      position: 'absolute',
                      left: left - 7,
                      top: top - 7,
                      width: 14,
                      height: 14,
                      background: meta.color,
                      borderRadius: '50%',
                      border: isActive ? '2px solid white' : '1.5px solid rgba(0,0,0,0.35)',
                      boxShadow: isActive ? '0 0 0 4px rgba(255,200,0,0.5)' : '0 1px 3px rgba(0,0,0,0.4)',
                      pointerEvents: 'none',
                      zIndex: 10,
                      transition: 'all 0.15s',
                    }}
                  />
                );
              })}

              {lastSaved && (() => {
                const { left, top } = toScreen(lastSaved.x, lastSaved.y);
                const fieldMeta = RECIBO_CAMPOS_META.find((m) => m.key === lastSaved.key);
                return (
                  <div
                    style={{
                      position: 'absolute',
                      left: left - 12,
                      top: top - 12,
                      width: 24,
                      height: 24,
                      border: '2px solid #ff0000',
                      borderRadius: '50%',
                      pointerEvents: 'none',
                      zIndex: 15,
                      animation: 'pulse 0.5s ease-out',
                      background: 'rgba(255, 0, 0, 0.1)',
                    }}
                    title={`Guardado: ${fieldMeta?.label}`}
                  />
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SaveButton({ state, onClick }) {
  const states = {
    idle: { label: 'Guardar coordenadas', cls: 'bg-green-600 hover:bg-green-500' },
    saving: { label: 'Guardando...', cls: 'bg-green-700 opacity-70 cursor-not-allowed' },
    ok: { label: 'Guardado', cls: 'bg-green-500 cursor-default' },
    error: { label: 'Error al guardar', cls: 'bg-red-600 cursor-default' },
  };
  const s = states[state] || states.idle;

  return (
    <button
      onClick={state === 'idle' ? onClick : undefined}
      disabled={state === 'saving'}
      className={`${s.cls} text-white font-bold px-4 py-2 rounded-lg text-sm transition`}
    >
      {s.label}
    </button>
  );
}
