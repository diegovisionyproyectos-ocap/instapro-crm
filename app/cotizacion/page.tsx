import './cotizacion.css';

export default function CotizacionPage() {
  return (
    <div className="h-screen bg-slate-50">
      <iframe
        src="/cotizador/index.html"
        title="Cotizador InstaPro"
        className="w-full h-full border-0"
      />
    </div>
  );
}
