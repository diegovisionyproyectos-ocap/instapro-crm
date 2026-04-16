import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import SignaturePad from '../components/SignaturePad';
import PdfViewer from '../components/PdfViewer';
import { generarPDF, downloadPdfBytes, calcTotales } from '../utils/pdfGenerator';
import { decodeDataFromUrl, getCotizacion, updateCotizacion } from '../utils/storage';

export default function ClientPage() {
  const { encoded } = useParams();
  const [datos, setDatos] = useState(null);
  const [pdfBytes, setPdfBytes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [firmado, setFirmado] = useState(false);
  const [firmaDataUrl, setFirmaDataUrl] = useState(null);
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const sigRef = useRef(null);

  useEffect(() => {
    async function init() {
      try {
        const decodedData = decodeDataFromUrl(encoded);
        let data = decodedData;

        if (!data) {
          data = getCotizacion(encoded);
        }

        if (!data) {
          setError('No se encontro la cotizacion. El link puede haber expirado o ser invalido.');
          setLoading(false);
          return;
        }

        const persistedData = data.id ? getCotizacion(data.id) : null;
        if (persistedData) {
          data = { ...decodedData, ...persistedData };
        }

        const savedSignature = data?.firmaDataUrl || null;
        setDatos(data);
        setFirmaDataUrl(savedSignature);
        setFirmado(Boolean(savedSignature || data?.firmado));
        setEmail(data?.clienteCorreo || '');

        const bytes = await generarPDF(data, savedSignature);
        setPdfBytes(bytes);
      } catch (e) {
        console.error(e);
        setError('Error al cargar la cotizacion.');
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
    setFirmaDataUrl(dataUrl);
    setLoading(true);

    try {
      const bytes = await generarPDF(datos, dataUrl);
      const firmadoAt = new Date().toISOString();
      const updatedData = { ...datos, firmaDataUrl: dataUrl, firmado: true, firmadoAt };

      setPdfBytes(bytes);
      setFirmado(true);
      setDatos(updatedData);

      if (datos?.id) {
        updateCotizacion(datos.id, {
          firmaDataUrl: dataUrl,
          firmado: true,
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
    const nombre = datos?.clienteNombre || 'cotizacion';
    const suffix = firmado ? '_firmada' : '';
    return `Cotizacion_InstaPro_${nombre.replace(/\s+/g, '_')}${suffix}.pdf`;
  }

  function handleDescargar() {
    if (!pdfBytes) return;
    downloadPdfBytes(pdfBytes, getDownloadName());
  }

  function handleWhatsApp() {
    const msg = encodeURIComponent('Hola! Acabo de revisar y firmar mi cotizacion. Pueden comunicarse conmigo para proceder.');
    window.open(`https://wa.me/50370547633?text=${msg}`, '_blank');
  }

  function handleEnviarCorreo() {
    if (!email) {
      alert('Ingrese su correo electronico.');
      return;
    }

    if (pdfBytes) {
      downloadPdfBytes(pdfBytes, getDownloadName());
    }

    const nombre = datos?.clienteNombre || 'cotizacion';
    const subject = encodeURIComponent(`Cotizacion INSTAPRO - ${nombre}`);
    const body = encodeURIComponent(
      'Adjunto encontraras la cotizacion en PDF.\n\n' +
      'El archivo se descargo automaticamente para que puedas adjuntarlo a este correo.'
    );

    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    setEmailSent(true);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-instapro-blue border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-600">Cargando cotizacion...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">!</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Cotizacion no encontrada</h2>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const { total } = calcTotales(datos?.items || [], parseFloat(datos?.descuento) || 0);
  const fmt = (n) => `$${Number(n).toFixed(2)}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-instapro-blue text-white px-6 py-4 flex items-center justify-between shadow">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-instapro-yellow rounded-full flex items-center justify-center text-instapro-blue font-bold text-lg">I</div>
          <div>
            <p className="font-bold text-lg leading-tight">INSTAPRO</p>
            <p className="text-xs opacity-70">Tu cotizacion esta lista</p>
          </div>
        </div>
        {firmado && (
          <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
            FIRMADA
          </span>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-xl shadow p-6">
          <h1 className="text-2xl font-bold text-instapro-blue mb-1">
            Hola, {datos?.clienteNombre || 'cliente'}
          </h1>
          <p className="text-gray-600 text-sm">
            Aqui esta tu cotizacion de INSTAPRO. Puedes revisarla, firmarla y descargarla.
          </p>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <InfoBox label="Fecha" value={datos?.fechaEmision} />
            <InfoBox label="Valida hasta" value={datos?.validaHasta} />
            <InfoBox label="Vendedor" value={datos?.vendedor} />
            <InfoBox label="Total" value={fmt(total)} big />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-instapro-blue font-bold text-lg mb-4 border-b border-instapro-lightblue pb-2">
            Tu Cotizacion
          </h2>
          {pdfBytes && <PdfViewer pdfBytes={pdfBytes} />}
        </div>

        <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-3">
          <button
            onClick={handleDescargar}
            disabled={!pdfBytes}
            className="bg-instapro-blue text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-900 transition disabled:opacity-50 flex items-center gap-2"
          >
            Descargar PDF
          </button>
          <button
            onClick={handleWhatsApp}
            className="bg-green-500 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-green-600 transition flex items-center gap-2"
          >
            <WhatsAppIcon /> Contactar a INSTAPRO
          </button>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-instapro-blue font-bold text-lg mb-3">
            Enviarme la cotizacion por correo
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
              Firmar cotizacion
            </h2>
            <p className="text-gray-500 text-sm mb-4">
              Al firmar, aprueba esta cotizacion. Su firma quedara registrada en el PDF.
            </p>
            <SignaturePad ref={sigRef} onClear={() => setFirmaDataUrl(null)} />
            <button
              onClick={handleFirmar}
              disabled={loading}
              className="mt-4 bg-instapro-yellow text-instapro-blue px-6 py-3 rounded-lg font-bold hover:bg-yellow-400 transition disabled:opacity-50 w-full md:w-auto"
            >
              {loading ? 'Insertando firma...' : 'Firmar y aprobar cotizacion'}
            </button>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-xl shadow p-6 text-center">
            <div className="text-5xl mb-3">OK</div>
            <h2 className="text-xl font-bold text-green-700 mb-2">Cotizacion firmada</h2>
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
