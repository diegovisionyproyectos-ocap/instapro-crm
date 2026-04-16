'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { MapMarker } from './MapClient';

function FlyToSelected({ markerId, markers, userLocation }: {
  markerId: string | null;
  markers: MapMarker[];
  userLocation: [number, number] | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (markerId) {
      const m = markers.find(x => x.id === markerId);
      if (m) map.flyTo([m.lat, m.lng], 14, { duration: 1 });
    }
  }, [markerId, markers, map]);

  useEffect(() => {
    if (userLocation) map.flyTo(userLocation, 13, { duration: 1.5 });
  }, [userLocation, map]);

  return null;
}

interface Props {
  markers: MapMarker[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  userLocation: [number, number] | null;
}

export default function LeafletMap({ markers, selectedId, onSelect, userLocation }: Props) {
  const center: [number, number] =
    userLocation ??
    (markers.length > 0 ? [markers[0].lat, markers[0].lng] : [-34.6037, -58.3816]);

  return (
    <MapContainer
      center={center}
      zoom={userLocation ? 13 : markers.length === 1 ? 14 : 5}
      style={{ height: '100%', width: '100%' }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyToSelected markerId={selectedId} markers={markers} userLocation={userLocation} />

      {/* User location */}
      {userLocation && (
        <>
          <CircleMarker center={userLocation} radius={22}
            pathOptions={{ color: '#3b82f6', weight: 0, fillColor: '#3b82f6', fillOpacity: 0.12 }}
            interactive={false} />
          <CircleMarker center={userLocation} radius={13}
            pathOptions={{ color: '#3b82f6', weight: 0, fillColor: '#3b82f6', fillOpacity: 0.22 }}
            interactive={false} />
          <CircleMarker center={userLocation} radius={7}
            pathOptions={{ color: 'white', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }}>
            <Popup><div className="text-sm font-semibold text-blue-700">📍 Tu ubicación</div></Popup>
          </CircleMarker>
        </>
      )}

      {/* Pulse rings for "live" markers — rendered as separate siblings BEFORE the main marker */}
      {markers.filter(m => m.pulse).map((m) => (
        <CircleMarker
          key={`pulse-${m.id}`}
          center={[m.lat, m.lng]}
          radius={26}
          pathOptions={{ color: m.color, weight: 2, fillColor: m.color, fillOpacity: 0.15 }}
          interactive={false}
        />
      ))}

      {/* Main markers */}
      {markers.map((m) => {
        const isSelected = m.id === selectedId;
        return (
          <CircleMarker
            key={m.id}
            center={[m.lat, m.lng]}
            radius={isSelected ? 18 : 12}
            pathOptions={{
              color: 'white',
              weight: isSelected ? 3 : 2,
              fillColor: m.color,
              fillOpacity: isSelected ? 1 : 0.88,
            }}
            eventHandlers={{ click: () => onSelect(m.id) }}
          >
            <Popup>
              <div className="text-sm min-w-[160px]">
                <p className="font-bold text-slate-800">{m.label}</p>
                <p className="text-slate-500 text-xs">{m.sublabel}</p>
                <span
                  className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{ background: m.color + '22', color: m.color }}
                >
                  {m.tag}
                </span>
                {m.date && (
                  <p className="text-slate-400 text-xs mt-1">
                    {new Date(m.date + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                    {m.time ? ` · ${m.time.slice(0, 5)} hs` : ''}
                  </p>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
