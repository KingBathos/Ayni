import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, Navigation, Store, AlertTriangle, Star, CheckCircle, RefreshCw } from 'lucide-react';
import { ServiceItem, HelpRequest } from './types';

interface AyniMapProps {
  services: ServiceItem[];
  helpRequests: HelpRequest[];
  onSelectService: (service: ServiceItem) => void;
  neighborhood?: string;
  userCoords?: [number, number] | null;
  onLocationDetected?: (coords: [number, number], name: string) => void;
}

// Coordenadas de contingencia (Lima Metropolitana) si GPS no está habilitado
const FALLBACK_CENTER: [number, number] = [-12.0464, -77.0428];

export const AyniMap: React.FC<AyniMapProps> = ({
  services,
  helpRequests,
  onSelectService,
  neighborhood = 'Mi ubicación actual',
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

        // Reverse Geocoding real con OpenStreetMap Nominatim
        let placeName = 'Mi ubicación actual';
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords[0]}&lon=${coords[1]}&zoom=16&addressdetails=1`,
            { headers: { 'Accept-Language': 'es' } }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const local = addr.suburb || addr.neighbourhood || addr.residential || addr.road || addr.city_district || addr.quarter || 'Barrio Local';
            const city = addr.city || addr.town || addr.county || 'Lima';
            placeName = `${local}, ${city}`;
          }
        } catch {
          placeName = `GPS (${coords[0].toFixed(4)}, ${coords[1].toFixed(4)})`;
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

  // Al montar, detectar GPS real si no tenemos coords
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

  // Actualizar marcadores distribuidos alrededor de la ubicación real del usuario
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
          <strong style="color: #2563EB;">📍 Tu ubicación GPS real</strong><br/>
          <span style="color: #4B5563; font-size: 0.8rem;">${realNeighborhood}</span>
        </div>
      `);

    // 2. Marcadores de Servicios (distribuidos en el barrio real del usuario: ~150m a 450m)
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
              gap: 5px;
              background: #ffffff;
              padding: 5px 10px;
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
              <span style="color: #D83B35; font-size: 0.85rem;">🏪</span>
              <span>${shortName}</span>
              <span style="color: #F59E0B; font-size: 0.72rem;">★ ${srv.rating}</span>
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

    // 3. Marcadores de Ayuda Vecinal Solidaria (alrededor de la ubicación real del usuario)
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
              gap: 5px;
              background: #FFF7EF;
              padding: 5px 10px;
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
              <span>🤝</span>
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
              <div style="color: #D83B35; font-weight: 800; margin-bottom: 4px;">🤝 Ayuda Vecinal Cercana</div>
              <p style="margin: 0 0 6px; color: #374151; font-size: 0.8rem; line-height: 1.3;">${req.description}</p>
              <div style="font-size: 0.74rem; color: #6B7280;">👤 ${req.authorName} &nbsp;·&nbsp; 📍 A ~250m de ti</div>
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
            placeholder="Buscar en tu zona real..."
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
              style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '0.9rem' }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Chips de filtro rápido */}
        <div style={{ display: 'flex', gap: 6, pointerEvents: 'auto', overflowX: 'auto', scrollbarWidth: 'none' }}>
          <button
            onClick={() => setFilterType('all')}
            style={{
              padding: '6px 14px',
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
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '0.78rem',
              fontFamily: 'inherit',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: filterType === 'services' ? '#D83B35' : '#ffffff',
              color: filterType === 'services' ? '#ffffff' : '#4B5563',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
            }}
          >
            🏪 Servicios ({services.length})
          </button>
          <button
            onClick={() => setFilterType('help')}
            style={{
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '0.78rem',
              fontFamily: 'inherit',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: filterType === 'help' ? '#FF875C' : '#ffffff',
              color: filterType === 'help' ? '#ffffff' : '#4B5563',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
            }}
          >
            🤝 Auxilio ({helpRequests.length})
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
        padding: '7px 14px',
        borderRadius: '12px',
        fontSize: '0.76rem',
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
        title="Centrar en mi ubicación real GPS"
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
