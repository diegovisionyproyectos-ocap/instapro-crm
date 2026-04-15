'use client';

import { useEffect, useRef } from 'react';
import type { EventType } from '@/lib/types';

interface Marker {
  lat: number;
  lng: number;
  label: string;
  sub: string;
  type: EventType;
}

const TYPE_COLORS: Record<EventType, string> = {
  installation: '#3b82f6',
  delivery: '#f59e0b',
  visit: '#8b5cf6',
  meeting: '#6366f1',
  payment: '#10b981',
  other: '#64748b',
};

export default function CalendarMapView({ markers }: { markers: Marker[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    let L: any;
    const initMap = async () => {
      if (mapInstanceRef.current) {
        // Update markers on existing map
        mapInstanceRef.current._layers && Object.values(mapInstanceRef.current._layers).forEach((layer: any) => {
          if (layer.options && layer.options._isProjectMarker) {
            mapInstanceRef.current.removeLayer(layer);
          }
        });
        addMarkers(mapInstanceRef.current, L || (await import('leaflet')).default);
        return;
      }

      L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      const map = L.map(mapRef.current!, { zoomControl: true }).setView([-34.6, -58.4], 5);
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      addMarkers(map, L);
    };

    const addMarkers = (map: any, L: any) => {
      if (!L) return;
      const bounds: [number, number][] = [];

      markers.forEach((m) => {
        const color = TYPE_COLORS[m.type] || '#6366f1';
        const icon = L.divIcon({
          html: `<div style="
            width:36px;height:36px;border-radius:50%;background:${color};
            border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);
            display:flex;align-items:center;justify-content:center;
            color:white;font-size:14px;
          ">🔧</div>`,
          className: '',
          iconSize: [36, 36],
          iconAnchor: [18, 18],
          options: { _isProjectMarker: true },
        });

        const marker = L.marker([m.lat, m.lng], { icon, options: { _isProjectMarker: true } })
          .addTo(map)
          .bindPopup(`<strong>${m.label}</strong><br/><small>${m.sub}</small>`);

        bounds.push([m.lat, m.lng]);
      });

      if (bounds.length === 1) {
        map.setView(bounds[0], 14);
      } else if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    };

    initMap();
  }, [markers]);

  return (
    <div className="w-full h-full relative">
      {markers.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-10 pointer-events-none">
          <div className="text-4xl mb-2">📍</div>
          <p className="text-slate-400 text-sm font-medium">Sin ubicaciones este día</p>
          <p className="text-slate-300 text-xs mt-1">Selecciona un día con eventos</p>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
