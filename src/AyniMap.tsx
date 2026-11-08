import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, Navigation, Store, AlertTriangle, Star, CheckCircle, HeartHandshake, X } from 'lucide-react';
import { ServiceItem, HelpRequest } from './types';

interface AyniMapProps {
  services: ServiceItem[];
  helpRequests: HelpRequest[];
  onSelectService: (service: ServiceItem) => void;
  neighborhood?: string;
  userCoords?: [number, number] | null;
  onLocationDetected?: (coords: [number, number], name: string) => void;
}

// Coordenadas de contingencia (Lima Metropolitana / San Borja)
const FALLBACK_CENTER: [number, number] = [-12.1096, -77.0057];

export const AyniMap: React.FC<AyniMapProps> = ({
  services,
  helpRequests,
  onSelectService,
  neighborhood = 'Ciclovía Malachowsky, San Borja',
  userCoords: propUserCoords,
  onLocationDetected
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [realCoords, setRealCoords] = useState<[number, number]>(propUserCoords || FALLBACK_CENTER);
  const [realNeighborhood, setRealNeighborhood] = useState<string>(neighborhood);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'services' | 'help'>('all');

  // Función para obtener la posición real del dispositivo mediante GPS
  const detectRealPosition = useCallback(async (shouldFly = false) => {
    setIsLocating(true);
    if (!('geolocation' in navigator)) {
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setRealCoords(coords);

        let placeName = 'Ciclovía Malachowsky, San Borja';
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords[0]}&lon=${coords[1]}&zoom=16&addressdetails=1`,
            { headers: { 'Accept-Language': 'es' } }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const local = addr.suburb || addr.neighbourhood || addr.residential || addr.road || addr.city_district || addr.quarter;
            const city = addr.city || addr.town || addr.county || 'Lima';
            if (local) {
              placeName = `${local}, ${city}`;
            }
          }
        } catch {
          // Si falla, mapeo limpio
          if (coords[0] < -12.08 && coords[0] > -12.13 && coords[1] < -76.98 && coords[1] > -77.03) {
            placeName = 'Ciclovía Malachowsky, San Borja';
          }
        }

        setRealNeighborhood(placeName);
        if (onLocationDetected) {
          onLocationDetected(coords, placeName);
        }

        if (mapInstanceRef.current && shouldFly) {
          mapInstanceRef.current.flyTo(coords, 16, { duration: 1.2 });
        }
        setIsLocating(false);
      },
      (err) => {
        console.warn('GPS error o denegado, usando coordenadas base:', err);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, [onLocationDetected]);

  // Si nos pasan coords por prop, actualizarlas
  useEffect(() => {
    if (propUserCoords) {
      setRealCoords(propUserCoords);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView(propUserCoords, 16);
      }
    }
  }, [propUserCoords]);

  // Al montar, detectar GPS real
  useEffect(() => {
    detectRealPosition(true);
  }, [detectRealPosition]);

  // Inicializar Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: realCoords,
        zoom: 16,
        zoomControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);

      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;
      mapInstanceRef.current = map;

      setTimeout(() => {
        map.invalidateSize();
      }, 350);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Actualizar marcadores vectoriales limpios alrededor de la ubicación real del usuario
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    const q = searchFilter.toLowerCase().trim();
    const [userLat, userLng] = realCoords;

    // 1. Marcador del usuario (Punto azul real pulsante con halo)
    const userLocationIcon = L.divIcon({
      className: 'ayni-user-marker',
      html: `
        <div style="position: relative; width: 26px; height: 26px;">
          <div style="position: absolute; inset: 0; background: rgba(59, 130, 246, 0.35); border-radius: 50%; animation: pulse 2s infinite;"></div>
          <div style="position: absolute; inset: 4px; background: #2563EB; border: 2.5px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.35);"></div>
        </div>
      `,
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });

    L.marker([userLat, userLng], { icon: userLocationIcon })
      .addTo(markersLayer)
      .bindPopup(`
        <div style="font-family: inherit; font-size: 0.85rem; padding: 4px;">
          <strong style="color: #2563EB;">Tu ubicación actual</strong><br/>
          <span style="color: #4B5563; font-size: 0.8rem;">${realNeighborhood}</span>
        </div>
      `);

    // 2. Marcadores de Servicios (Vectoriales, sin emojis)
    if (filterType === 'all' || filterType === 'services') {
      const offsets = [
        [0.0022, 0.0018],
        [-0.0025, -0.0020],
        [0.0016, -0.0031],
        [-0.0018, 0.0025],
        [0.0030, -0.0012]
      ];

      services.forEach((srv, index) => {
        const titleMatch = srv.title.toLowerCase().includes(q) || srv.providerName.toLowerCase().includes(q);
        if (!titleMatch) return;

        const offset = offsets[index % offsets.length];
        const coords: [number, number] = [userLat + offset[0], userLng + offset[1]];
        const shortName = srv.providerName.split('(')[0].trim();

        const serviceIcon = L.divIcon({
          className: 'ayni-service-pin',
          html: `
            <div style="
              display: inline-flex;
              align-items: center;
              gap: 6px;
              background: #ffffff;
              padding: 5px 11px;
              border-radius: 16px;
              font-family: inherit;
              font-size: 0.75rem;
              font-weight: 700;
              color: #252B3A;
              border: 2px solid #D83B35;
              box-shadow: 0 4px 12px rgba(0,0,0,0.15);
              white-space: nowrap;
              cursor: pointer;
              transform: translate(-50%, -100%);
            ">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#D83B35" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 9l1.6-5h14.8L21 9"/>
                <path d="M4 9v11h16V9"/>
                <path d="M10 20v-6h4v6"/>
              </svg>
              <span>${shortName}</span>
              <span style="color: #F59E0B; font-size: 0.72rem; display: inline-flex; align-items: center; gap: 2px;">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                ${srv.rating}
              </span>
            </div>
          `,
          iconSize: [0, 0],
          iconAnchor: [0, 0]
        });

        const marker = L.marker(coords, { icon: serviceIcon }).addTo(markersLayer);
        marker.on('click', () => {
          onSelectService(srv);
        });
      });
    }

    // 3. Marcadores de Ayuda Vecinal Solidaria (Vectoriales, sin emojis)
    if (filterType === 'all' || filterType === 'help') {
      const helpOffsets = [
        [-0.0014, 0.0022],
        [0.0028, 0.0015],
        [-0.0020, -0.0018]
      ];

      helpRequests.forEach((req, index) => {
        const descMatch = req.description.toLowerCase().includes(q);
        if (!descMatch) return;

        const offset = helpOffsets[index % helpOffsets.length];
        const coords: [number, number] = [userLat + offset[0], userLng + offset[1]];

        const helpIcon = L.divIcon({
          className: 'ayni-help-pin',
          html: `
            <div style="
              display: inline-flex;
              align-items: center;
              gap: 6px;
              background: #FFF7EF;
              padding: 5px 11px;
              border-radius: 16px;
              font-family: inherit;
              font-size: 0.75rem;
              font-weight: 700;
              color: #92400E;
              border: 2px solid #FF875C;
              box-shadow: 0 4px 12px rgba(255, 135, 92, 0.25);
              white-space: nowrap;
              cursor: pointer;
              transform: translate(-50%, -100%);
            ">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FF875C" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
              </svg>
              <span>${req.type.toUpperCase()}: ${req.description.slice(0, 22)}…</span>
            </div>
          `,
          iconSize: [0, 0],
          iconAnchor: [0, 0]
        });

        L.marker(coords, { icon: helpIcon })
          .addTo(markersLayer)
          .bindPopup(`
            <div style="font-family: inherit; font-size: 0.85rem; padding: 4px; max-width: 230px;">
              <div style="color: #D83B35; font-weight: 800; margin-bottom: 4px;">Ayuda Vecinal Cercana</div>
              <p style="margin: 0 0 6px; color: #374151; font-size: 0.8rem; line-height: 1.3;">${req.description}</p>
              <div style="font-size: 0.74rem; color: #6B7280;">Vecino: ${req.authorName} &nbsp;·&nbsp; A ~250m de ti</div>
            </div>
          `);
      });
    }
  }, [searchFilter, filterType, services, helpRequests, realCoords, realNeighborhood, onSelectService]);

  const handleRecenter = () => {
    detectRealPosition(true);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '520px', display: 'flex', flexDirection: 'column' }}>
      {/* Contenedor del mapa real OpenStreetMap */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', flex: 1, zIndex: 1 }} />

      {/* Barra de búsqueda y filtros flotantes sobre el mapa */}
      <div style={{
        position: 'absolute',
        top: 14,
        left: 14,
        right: 14,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none'
      }}>
        {/* Input de búsqueda */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: '#ffffff',
          borderRadius: '14px',
          padding: '10px 14px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
          pointerEvents: 'auto'
        }}>
          <Search size={18} color="#9CA3AF" />
          <input
            type="text"
            placeholder="Buscar en tu zona..."
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '0.9rem',
              color: '#1F2937'
            }}
          />
          {searchFilter && (
            <button
              onClick={() => setSearchFilter('')}
              style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Chips de filtro rápido */}
        <div style={{ display: 'flex', gap: 6, pointerEvents: 'auto', overflowX: 'auto', scrollbarWidth: 'none' }}>
          <button
            onClick={() => setFilterType('all')}
            style={{
              padding: '7px 16px',
              borderRadius: '9999px',
              fontSize: '0.78rem',
              fontFamily: 'inherit',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: filterType === 'all' ? '#D83B35' : '#ffffff',
              color: filterType === 'all' ? '#ffffff' : '#4B5563',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
            }}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterType('services')}
            style={{
              padding: '7px 16px',
              borderRadius: '9999px',
              fontSize: '0.78rem',
              fontFamily: 'inherit',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: filterType === 'services' ? '#D83B35' : '#ffffff',
              color: filterType === 'services' ? '#ffffff' : '#4B5563',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5
            }}
          >
            <Store size={14} /> Servicios ({services.length})
          </button>
          <button
            onClick={() => setFilterType('help')}
            style={{
              padding: '7px 16px',
              borderRadius: '9999px',
              fontSize: '0.78rem',
              fontFamily: 'inherit',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: filterType === 'help' ? '#FF875C' : '#ffffff',
              color: filterType === 'help' ? '#ffffff' : '#4B5563',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5
            }}
          >
            <HeartHandshake size={14} /> Auxilio ({helpRequests.length})
          </button>
        </div>
      </div>

      {/* Chip de Barrio actual real (inferior izquierdo) */}
      <div style={{
        position: 'absolute',
        bottom: 18,
        left: 14,
        zIndex: 10,
        background: '#ffffff',
        padding: '8px 14px',
        borderRadius: '12px',
        fontSize: '0.78rem',
        fontWeight: 700,
        color: '#252B3A',
        boxShadow: '0 3px 12px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: 6
      }}>
        <MapPin size={14} color="#D83B35" />
        <span>{realNeighborhood}</span>
      </div>

      {/* Botón flotante para recentrar en GPS real (inferior derecho) */}
      <button
        onClick={handleRecenter}
        disabled={isLocating}
        title="Centrar en mi ubicación actual"
        style={{
          position: 'absolute',
          bottom: 18,
          right: 14,
          zIndex: 10,
          width: 46,
          height: 46,
          borderRadius: '50%',
          background: '#ffffff',
          border: 'none',
          boxShadow: '0 4px 16px rgba(0,0,0,0.22)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: '#D83B35'
        }}
      >
        <Navigation size={21} className={isLocating ? 'sh-spin' : ''} />
      </button>
    </div>
  );
};
