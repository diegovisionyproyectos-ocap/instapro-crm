import { useRef, forwardRef, useImperativeHandle } from 'react';
import ReactSignatureCanvas from 'react-signature-canvas';

function getTrimmedSignatureDataUrl(signatureCanvas) {
  const sourceCanvas = signatureCanvas?.getCanvas?.();
  if (!sourceCanvas) return null;

  const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  const { width, height } = sourceCanvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[((y * width + x) * 4) + 3];
      if (alpha > 0) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) return null;

  const padding = 8;
  const cropX = Math.max(0, minX - padding);
  const cropY = Math.max(0, minY - padding);
  const cropWidth = Math.min(width - cropX, (maxX - minX) + 1 + (padding * 2));
  const cropHeight = Math.min(height - cropY, (maxY - minY) + 1 + (padding * 2));

  const trimmedCanvas = document.createElement('canvas');
  trimmedCanvas.width = cropWidth;
  trimmedCanvas.height = cropHeight;

  const trimmedCtx = trimmedCanvas.getContext('2d');
  if (!trimmedCtx) return null;

  trimmedCtx.drawImage(
    sourceCanvas,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight
  );

  return trimmedCanvas.toDataURL('image/png');
}

const SignaturePad = forwardRef(function SignaturePad({ onSign, onClear }, ref) {
  const sigRef = useRef(null);

  useImperativeHandle(ref, () => ({
    getDataUrl: () => {
      if (sigRef.current && !sigRef.current.isEmpty()) {
        return getTrimmedSignatureDataUrl(sigRef.current);
      }
      return null;
    },
    isEmpty: () => sigRef.current?.isEmpty() ?? true,
    clear: () => {
      sigRef.current?.clear();
      onClear?.();
    },
  }));

  return (
    <div className="space-y-2">
      <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-white">
        <ReactSignatureCanvas
          ref={sigRef}
          penColor="#1e3a6e"
          canvasProps={{
            width: 480,
            height: 160,
            className: 'signature-canvas w-full',
            style: { width: '100%', height: '160px' },
          }}
          onEnd={() => {
            if (sigRef.current && !sigRef.current.isEmpty()) {
              onSign?.(getTrimmedSignatureDataUrl(sigRef.current));
            }
          }}
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            sigRef.current?.clear();
            onClear?.();
          }}
          className="text-sm text-gray-500 hover:text-red-500 underline"
        >
          Borrar firma
        </button>
        <span className="text-gray-300">|</span>
        <span className="text-xs text-gray-400 self-center">
          Dibuje su firma con el mouse o con el dedo
        </span>
      </div>
    </div>
  );
});

export default SignaturePad;
