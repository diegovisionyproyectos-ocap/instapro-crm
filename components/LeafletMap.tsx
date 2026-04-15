'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { Contact, ContactStatus } from '@/lib/types';

const PIN_COLORS: Record<ContactStatus, string> = {
  customer: '#10b981',
  prospect: '#f59e0b',
  lead: '#6366f1',
  inactive: '#94a3b8',
};

const STATUS_LABELS: Record<ContactStatus, string> = {
  customer: 'Cliente activo',
  prospect: 'Prospecto',
  lead: 'Lead',
  inactive: 'Inactivo',
};

function FlyTo({ contact }: { contact: Contact | null }) {
  const map = useMap();
  useEffect(() => {
    if (contact?.lat && contact?.lng) {
      map.flyTo([contact.lat, contact.lng], 14, { duration: 1 });
    }
  }, [contact, map]);
  return null;
}

interface Props {
  contacts: Contact[];
  selected: Contact | null;
  onSelect: (c: Contact) => void;
}

export default function LeafletMap({ contacts, selected, onSelect }: Props) {
  const mapped = contacts.filter((c) => c.lat && c.lng);
  const center: [number, number] =
    mapped.length > 0 ? [mapped[0].lat!, mapped[0].lng!] : [40.4168, -3.7038];

  return (
    <MapContainer
      center={center}
      zoom={6}
      style={{ height: '100%', width: '100%' }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyTo contact={selected} />
      {mapped.map((c) => {
        const isSelected = selected?.id === c.id;
        const color = PIN_COLORS[c.status];
        return (
          <CircleMarker
            key={c.id}
            center={[c.lat!, c.lng!]}
            radius={isSelected ? 18 : c.status === 'customer' ? 14 : 11}
            pathOptions={{
              color: 'white',
              weight: isSelected ? 3 : 2,
              fillColor: color,
              fillOpacity: isSelected ? 1 : 0.85,
            }}
            eventHandlers={{ click: () => onSelect(c) }}
          >
            <Popup>
              <div className="text-sm min-w-[160px]">
                <p className="font-bold text-slate-800">{c.name}</p>
                <p className="text-slate-500 text-xs">{c.company}</p>
                <p className="text-slate-400 text-xs mt-0.5">📍 {c.city}</p>
                <span
                  className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{ background: color + '22', color }}
                >
                  {STATUS_LABELS[c.status]}
                </span>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
