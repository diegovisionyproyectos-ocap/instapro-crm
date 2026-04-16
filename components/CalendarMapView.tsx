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

const TYPE_ICONS: Record<EventType, string> = {
  installation: '🔧', delivery: '📦', visit: '🔍',
  meeting: '📋', payment: '💰', other: '📌',
};

export default function CalendarMapView({ markers }: { markers: Marker[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);

  // Init map once
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const init = async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');
      leafletRef.current = L;

      const map = L.map(mapRef.current!, { zoomControl: true }).setView([-34.6, -58.4], 5);
      mapInstanceRef.current = map;
      layerGroupRef.current = L.layerGroup().addTo(map);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);
    };

    init();
  }, []);

  // Update markers whenever they change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = layerGroupRef.current;
    const L = leafletRef.current;
    if (!map || !group || !L) return;

    group.clearLayers();

    if (markers.length === 0) return;

    const bounds: [number, number][] = [];

    markers.forEach((m) => {
      const color = TYPE_COLORS[m.type] || '#6366f1';
      const icon = TYPE_ICONS[m.type] || '📌';

      const divIcon = L.divIcon({
        html: `<div style="
          width:40px;height:40px;border-radius:50%;background:${color};
          border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.25);
          display:flex;align-items:center;justify-content:center;font-size:16px;
        ">${icon}</div>`,
        className: '',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      L.marker([m.lat, m.lng], { icon: divIcon })
        .bindPopup(`<strong style="font-size:13px">${m.label}</strong><br/><small style="color:#64748b">${m.sub}</small>`)
        .addTo(group);

      bounds.push([m.lat, m.lng]);
    });

    if (bounds.length === 1) {
      map.setView(bounds[0], 14);
    } else {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [markers]);

  return (
    <div className="w-full h-full relative">
      {markers.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/90 z-10 pointer-events-none">
          <div className="text-4xl mb-2">📍</div>
          <p className="text-slate-400 text-sm font-medium">Sin ubicaciones este día</p>
          <p className="text-slate-300 text-xs mt-1">Seleccioná un día con eventos</p>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
