import { useEffect, useRef, useState } from 'react';

export default function PdfViewer({ pdfBytes }) {
  const iframeRef = useRef(null);
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!pdfBytes) return;
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [pdfBytes]);

  if (!url) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
        <p className="text-gray-400 text-sm">Generando vista previa…</p>
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      src={url}
      className="w-full rounded-lg shadow-lg border border-gray-200"
      style={{ height: '800px' }}
      title="Vista previa cotización"
    />
  );
}
