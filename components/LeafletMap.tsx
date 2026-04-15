'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Contact, ContactStatus } from '@/lib/types';

// Fix leaflet default icon paths broken by webpack
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)['_getIconUrl'];
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const PIN_COLORS: Record<ContactStatus, string> = {
  customer: '#10b981',   // emerald — cliente
  prospect: '#f59e0b',   // amber — prospecto
  lead: '#6366f1',       // indigo — lead
  inactive: '#94a3b8',   // slate — inactivo
};

function makeIcon(color: string, isCustomer: boolean) {
  const size = isCustomer ? 36 : 28;
  const svg = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" width="${size}" height="${size}">
      <path d="M12 0C7.58 0 4 3.58 4 8c0 5.25 8 16 8 16s8-10.75 8-16c0-4.42-3.58-8-8-8z"
        fill="${color}" stroke="white" stroke-width="1.5"/>
      ${isCustomer
        ? `<path d="M9 8l2 2 4-4" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
        : `<circle cx="12" cy="8" r="3" fill="white"/>`}
    </svg>
  `);
  return L.divIcon({
    html: `<img src="data:image/svg+xml,${svg}" width="${size}" height="${size}" />`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

const STATUS_LABELS: Record<ContactStatus, string> = {
  lead: 'Lead',
  prospect: 'Prospecto',
  customer: 'Cliente',
  inactive: 'Inactivo',
};

interface Props {
  contacts: Contact[];
}

export default function LeafletMap({ contacts }: Props) {
  const mapped = contacts.filter((c) => c.lat && c.lng);
  const center: [number, number] = mapped.length > 0
    ? [mapped[0].lat!, mapped[0].lng!]
    : [40.4168, -3.7038]; // Madrid fallback

  // Force Leaflet CSS to load
  useEffect(() => {}, []);

  return (
    <MapContainer
      center={center}
      zoom={6}
      style={{ height: '100%', width: '100%', borderRadius: '1rem' }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {mapped.map((c) => (
        <Marker
          key={c.id}
          position={[c.lat!, c.lng!]}
          icon={makeIcon(PIN_COLORS[c.status], c.status === 'customer')}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-bold text-slate-800">{c.name}</p>
              <p className="text-slate-500 text-xs">{c.company}</p>
              <p className="text-slate-500 text-xs">{c.city}</p>
              <span
                className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{ background: PIN_COLORS[c.status] + '22', color: PIN_COLORS[c.status] }}
              >
                {STATUS_LABELS[c.status]}
              </span>
              {c.email && <p className="text-xs text-slate-400 mt-1">{c.email}</p>}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
