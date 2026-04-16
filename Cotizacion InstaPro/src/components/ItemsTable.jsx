import { calcTotales } from '../utils/pdfGenerator';

const ITEM_EMPTY = { descripcion: '', cantidad: 1, precioUnitario: '' };

export default function ItemsTable({ items, onChange, descuento }) {
  const MAX_ROWS = 4;

  function updateItem(index, field, value) {
    const updated = items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    onChange(updated);
  }

  function addItem() {
    if (items.length < MAX_ROWS) {
      onChange([...items, { ...ITEM_EMPTY }]);
    }
  }

  function removeItem(index) {
    onChange(items.filter((_, i) => i !== index));
  }

  const { subtotal, descMonto, subtotalDesc, iva, total } = calcTotales(items, parseFloat(descuento) || 0);
  const fmt = (n) => `$${Number(n).toFixed(2)}`;

  return (
    <div className="space-y-3">
      {/* Table header */}
      <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-white bg-instapro-blue rounded px-2 py-2">
        <div className="col-span-5">Descripción</div>
        <div className="col-span-2 text-center">Cantidad</div>
        <div className="col-span-2 text-right">Precio unit.</div>
        <div className="col-span-2 text-right">Subtotal</div>
        <div className="col-span-1"></div>
      </div>

      {/* Rows */}
      {items.map((item, i) => {
        const sub = (parseFloat(item.precioUnitario) || 0) * (parseFloat(item.cantidad) || 0);
        return (
          <div key={i} className="grid grid-cols-12 gap-2 items-center">
            <input
              className="col-span-5 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-instapro-blue"
              placeholder={`Ítem ${i + 1}`}
              value={item.descripcion}
              onChange={e => updateItem(i, 'descripcion', e.target.value)}
            />
            <input
              className="col-span-2 border border-gray-300 rounded px-2 py-1.5 text-sm text-center focus:outline-none focus:border-instapro-blue"
              type="number"
              min="1"
              placeholder="1"
              value={item.cantidad}
              onChange={e => updateItem(i, 'cantidad', e.target.value)}
            />
            <div className="col-span-2 relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                className="w-full border border-gray-300 rounded pl-5 pr-2 py-1.5 text-sm text-right focus:outline-none focus:border-instapro-blue"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={item.precioUnitario}
                onChange={e => updateItem(i, 'precioUnitario', e.target.value)}
              />
            </div>
            <div className="col-span-2 text-right text-sm font-medium text-gray-700">
              {sub > 0 ? fmt(sub) : '—'}
            </div>
            <div className="col-span-1 flex justify-center">
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="text-red-400 hover:text-red-600 text-lg leading-none"
                  title="Eliminar ítem"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Add row button */}
      {items.length < MAX_ROWS && (
        <button
          type="button"
          onClick={addItem}
          className="text-instapro-blue text-sm font-medium hover:underline flex items-center gap-1"
        >
          + Agregar ítem
        </button>
      )}

      {/* Totals summary */}
      <div className="mt-4 border-t pt-4 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-medium">{fmt(subtotal)}</span>
        </div>
        {(parseFloat(descuento) || 0) > 0 && (
          <div className="flex justify-between text-red-600">
            <span>Descuento ({descuento}%)</span>
            <span>− {fmt(descMonto)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-600">Subtotal c/descuento</span>
          <span className="font-medium">{fmt(subtotalDesc)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">IVA (13%)</span>
          <span className="font-medium">{fmt(iva)}</span>
        </div>
        <div className="flex justify-between text-base font-bold text-instapro-blue border-t pt-2 mt-2">
          <span>TOTAL COTIZADO</span>
          <span>{fmt(total)}</span>
        </div>
      </div>
    </div>
  );
}
