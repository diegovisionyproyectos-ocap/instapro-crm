export default function AppNav() {
  const linkClass = 'px-3 py-2 rounded-lg text-sm font-medium transition hover:bg-white/10';

  return (
    <div className="bg-slate-900 text-white border-b border-slate-700 px-4 py-2">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-2">
        <a href="/#/" className={linkClass}>Cotizacion</a>
        <a href="/#/recibo" className={linkClass}>Recibo de Pago</a>
        <a href="/#/calibrar" className={linkClass}>Calibrar cotizacion</a>
        <a href="/#/calibrar-recibo" className={linkClass}>Calibrar recibo</a>
        <a href="/recibo_pago.pdf" target="_blank" rel="noreferrer" className={linkClass}>Ver recibo base</a>
      </div>
    </div>
  );
}
