import { useEffect, useMemo } from 'react';
import { CircleMarker, MapContainer, TileLayer, Tooltip as MapTip, useMap } from 'react-leaflet';
import type { LatLngBoundsExpression, LatLngTuple } from 'leaflet';
import type { Lead } from '../types';
import { STAGE_COLORS } from '../lib/constants';

function FitBounds({ points }: { points: LatLngTuple[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 1) map.setView(points[0], 14);
    else if (points.length > 1) map.fitBounds(points as LatLngBoundsExpression, { padding: [30, 30], maxZoom: 14 });
  }, [map, points]);
  return null;
}

interface Props { leads: Lead[]; selectedId: string | null; onSelect: (id: string) => void }

export default function LeadMap({ leads, selectedId, onSelect }: Props) {
  const located = useMemo(() => leads.filter((l) => l.lat != null && l.lng != null), [leads]);
  const points = useMemo<LatLngTuple[]>(() => located.map((l) => [l.lat as number, l.lng as number]), [located]);

  return (
    <div className="card relative min-h-[300px] overflow-hidden sm:min-h-[340px]" role="region" aria-label="Map of leads">
      <MapContainer className="!absolute inset-0" center={[30.3753, 69.3451]} zoom={5} scrollWheelZoom>
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitBounds points={points} />
        {located.map((l) => (
          <CircleMarker
            key={l.id}
            center={[l.lat as number, l.lng as number]}
            radius={l.id === selectedId ? 11 : 7}
            pathOptions={{ color: '#ffffff', weight: 2, fillColor: STAGE_COLORS[l.stage], fillOpacity: 0.95 }}
            eventHandlers={{ click: () => onSelect(l.id) }}
          >
            <MapTip>{l.name}</MapTip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
