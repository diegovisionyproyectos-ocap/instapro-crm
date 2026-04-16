import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import InstaProLogo from '../components/InstaProLogo';
import SignaturePad from '../components/SignaturePad';
import PdfViewer from '../components/PdfViewer';
import { generarReciboPDF, downloadReciboPdfBytes, calcTotalesRecibo } from '../utils/receiptGenerator';
import { decodeDataFromUrl, getRecibo, updateRecibo } from '../utils/storage';

export default function ReceiptClientPage() {
  const { encoded } = useParams();
  const [datos, setDatos]     = useState(null);
  const [pdfBytes, setPdfBytes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [firmado, setFirmado] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const sigRef = useRef(null);

  useEffect(() => {
    async function init() {
      try {
        const decodedData = decodeDataFromUrl(encoded);
        let data = decodedData;

        if (!data) {
          data = getRecibo(encoded);
        }

        if (!data) {
          setError('No se encontró el recibo. El link puede haber expirado o ser inválido.');
          setLoading(false);
          return;
        }

        const persisted = data.id ? getRecibo(data.id) : null;
        if (persisted) {
          data = { ...decodedData, ...persisted };
        }

        const savedSignature = data?.firmaDataUrl || null;
        setDatos(data);
        setFirmado(Boolean(savedSignature || data?.firmado));
        setEmail(data?.clienteCorreo || '');

        const bytes = await generarReciboPDF(data, savedSignature);
        setPdfBytes(bytes);
      } catch (e) {
        console.error(e);
        setError('Error al cargar el recibo.');
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [encoded]);

  async function handleFirmar() {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      alert('Por favor, dibuje su firma antes de confirmar.');
      return;
    }

    const dataUrl = sigRef.current.getDataUrl();
    setLoading(true);

    try {
      const firmadoAt = new Date().toISOString();
      const updatedData = {
        ...datos,
        firmaDataUrl: dataUrl,
        firmado: true,
        firmaFecha: datos?.firmaFecha || new Date().toLocaleDateString('es-SV'),
        firmadoAt,
      };
      const bytes = await generarReciboPDF(updatedData, dataUrl);

      setPdfBytes(bytes);
      setFirmado(true);
      setDatos(updatedData);

      if (datos?.id) {
        updateRecibo(datos.id, {
          firmaDataUrl: dataUrl,
          firmado: true,
          firmaFecha: updatedData.firmaFecha,
          firmadoAt,
        });
      }
    } catch (e) {
      console.error(e);
      alert('Error al insertar la firma.');
    } finally {
      setLoading(false);
    }
  }

  function getDownloadName() {
    const nombre = datos?.clienteNombre || 'recibo';
    const suffix = firmado ? '_firmado' : '';
    return `Recibo_InstaPro_${nombre.replace(/\s+/g, '_')}${suffix}.pdf`;
  }

  function handleDescargar() {
    if (!pdfBytes) return;
    downloadReciboPdfBytes(pdfBytes, getDownloadName());
  }

  function handleWhatsApp() {
    const msg = encodeURIComponent(
      firmado
        ? 'Hola, ya revise y firme mi recibo de pago de INSTAPRO.'
        : 'Hola, acabo de revisar mi recibo de pago de INSTAPRO.'
    );
    window.open(`https://wa.me/50370547633?text=${msg}`, '_blank');
  }

  function handleEnviarCorreo() {
    if (!email) {
      alert('No hay correo electrónico asociado a este recibo.');
      return;
    }
    if (pdfBytes) {
      downloadReciboPdfBytes(pdfBytes, getDownloadName());
    }
    const nombre  = datos?.clienteNombre || 'cliente';
    const subject = encodeURIComponent(`Recibo de Pago INSTAPRO - ${nombre}`);
    const body    = encodeURIComponent(
      'Adjunto encontrarás el recibo de pago en PDF.\n\n' +
      'El archivo se descargó automáticamente para que puedas adjuntarlo a este correo.'
    );
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    setEmailSent(true);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-instapro-blue border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-600">Cargando recibo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">!</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Recibo no encontrado</h2>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const { subtotal, anticipo, valorPendiente, total } =
    calcTotalesRecibo(datos?.items || [], parseFloat(datos?.anticipoPct || 50));
  const fmt = (n) => `$${Number(n).toFixed(2)}`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-instapro-blue text-white px-6 py-4 flex items-center justify-between shadow">
        <InstaProLogo subtitle="Tu recibo de pago" compact />
        <span className={`text-white text-xs font-bold px-3 py-1 rounded-full ${firmado ? 'bg-green-500' : 'bg-slate-500'}`}>
          {firmado ? 'FIRMADO' : 'RECIBO'}
        </span>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Info rápida */}
        <div className="bg-white rounded-xl shadow p-6">
          <h1 className="text-2xl font-bold text-instapro-blue mb-1">
            Hola, {datos?.clienteNombre || 'cliente'}
          </h1>
          <p className="text-gray-600 text-sm">
            Aquí está tu recibo de pago de INSTAPRO. Puedes descargarlo o enviártelo por correo.
          </p>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <InfoBox label="Fecha" value={datos?.fechaEmision} />
            <InfoBox label="Anticipo pagado" value={fmt(anticipo)} big />
            <InfoBox label="Valor pendiente" value={fmt(valorPendiente)} />
            <InfoBox label="TOTAL" value={fmt(total)} big />
          </div>
        </div>

        {/* PDF */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-instapro-blue font-bold text-lg mb-4 border-b border-instapro-lightblue pb-2">
            Tu Recibo de Pago
          </h2>
          {pdfBytes && <PdfViewer pdfBytes={pdfBytes} />}
        </div>

        {/* Botones */}
        <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-3">
          <button
            onClick={handleDescargar}
            disabled={!pdfBytes}
            className="bg-instapro-blue text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-900 transition disabled:opacity-50 flex items-center gap-2"
          >
            ⬇️ Descargar PDF
          </button>
          <button
            onClick={handleWhatsApp}
            className="bg-green-500 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-green-600 transition flex items-center gap-2"
          >
            <WhatsAppIcon /> Contactar a INSTAPRO
          </button>
          {datos?.clienteCorreo && (
            <button
              onClick={handleEnviarCorreo}
              className="bg-instapro-yellow text-instapro-blue px-5 py-2.5 rounded-lg font-bold hover:bg-yellow-400 transition flex items-center gap-2"
            >
              ✉️ Enviarme por correo
            </button>
          )}
        </div>

        {/* Instalación */}
        {(datos?.fechaInstalacion || datos?.horaAsignada || datos?.ubicacionServicio) && (
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-instapro-blue font-bold text-lg mb-3 border-b border-instapro-lightblue pb-2">
              🔧 Información de Instalación
            </h2>
            <div className="space-y-2 text-sm text-gray-700">
              {datos.fechaInstalacion && (
                <p><span className="font-semibold text-gray-900">Fecha de instalación:</span> {datos.fechaInstalacion}</p>
              )}
              {datos.horaAsignada && (
                <p><span className="font-semibold text-gray-900">Hora asignada:</span> {datos.horaAsignada}</p>
              )}
              {datos.ubicacionServicio && (
                <p><span className="font-semibold text-gray-900">Ubicación:</span> {datos.ubicacionServicio}</p>
              )}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-instapro-blue font-bold text-lg mb-3">
            Enviarme el recibo por correo
          </h2>
          <div className="flex gap-3">
            <input
              type="email"
              placeholder="tucorreo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-instapro-blue"
            />
            <button
              onClick={handleEnviarCorreo}
              className="bg-instapro-yellow text-instapro-blue px-4 py-2 rounded-lg font-bold text-sm hover:bg-yellow-400 transition"
            >
              Enviar
            </button>
          </div>
          {emailSent && (
            <p className="text-green-600 text-sm mt-2">
              Se descargo el PDF y se abrio tu cliente de correo para adjuntarlo.
            </p>
          )}
        </div>

        {!firmado ? (
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-instapro-blue font-bold text-lg mb-2">
              Firmar recibo
            </h2>
            <p className="text-gray-500 text-sm mb-4">
              Al firmar, confirmas la recepcion y aprobacion de este recibo. La firma quedara registrada en el PDF.
            </p>
            <SignaturePad ref={sigRef} onClear={() => {}} />
            <button
              onClick={handleFirmar}
              disabled={loading}
              className="mt-4 bg-instapro-yellow text-instapro-blue px-6 py-3 rounded-lg font-bold hover:bg-yellow-400 transition disabled:opacity-50 w-full md:w-auto"
            >
              {loading ? 'Insertando firma...' : 'Firmar recibo'}
            </button>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-xl shadow p-6 text-center">
            <div className="text-5xl mb-3">OK</div>
            <h2 className="text-xl font-bold text-green-700 mb-2">Recibo firmado</h2>
            <p className="text-green-600 text-sm mb-4">
              Tu firma fue insertada en el PDF y quedo guardada en este equipo.
            </p>
            <button
              onClick={handleDescargar}
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700 transition"
            >
              Descargar PDF firmado
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

function InfoBox({ label, value, big = false }) {
  return (
    <div className="bg-instapro-lightblue rounded-lg p-3">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className={`font-bold text-instapro-blue ${big ? 'text-lg' : 'text-sm'}`}>{value || '-'}</p>
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
