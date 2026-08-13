/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const icon = L.divIcon({
  className: 'bg-transparent',
  html: `<div style="background:#10b981;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:bold;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);">🏔</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -20],
});

export function MapView({ treks, onSelectTrek }: { treks: any[]; onSelectTrek?: (trek: any) => void }) {
  const center: [number, number] = useMemo(() => {
    if (treks.length === 0) return [20, 78];
    const valid = treks.filter((t: any) => t.lat && t.lng);
    if (valid.length === 0) return [20, 78];
    const lat = valid.reduce((s: number, t: any) => s + t.lat, 0) / valid.length;
    const lng = valid.reduce((s: number, t: any) => s + t.lng, 0) / valid.length;
    return [lat, lng];
  }, [treks]);

  return (
    <div className="rounded-2xl overflow-hidden border border-black/10 h-[500px] md:h-[600px] w-full">
      <MapContainer center={center} zoom={5} scrollWheelZoom={true} className="h-full w-full" style={{ background: '#f0f0f0' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {treks.filter((t: any) => t.lat && t.lng).map((trek: any) => (
          <Marker key={trek.id} position={[trek.lat, trek.lng] as [number, number]} icon={icon}>
            <Popup>
              <div className="text-center" style={{ minWidth: 180 }}>
                <img src={trek.image} alt={trek.title} style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: '4px 0' }}>{trek.title}</h3>
                <p style={{ fontSize: 12, color: '#666', margin: '2px 0' }}>{trek.location}</p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, fontSize: 11, color: '#888', margin: '6px 0' }}>
                  <span>{trek.duration}</span>
                  <span>{trek.distance}</span>
                  <span>₹{trek.price}</span>
                </div>
                <button onClick={() => onSelectTrek?.(trek)}
                  style={{ marginTop: 6, padding: '6px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  View Details
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
