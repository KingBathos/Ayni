import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, Navigation, Store, AlertTriangle, Star, CheckCircle } from 'lucide-react';
import { ServiceItem, HelpRequest } from './types';

interface AyniMapProps {
  services: ServiceItem[];
  helpRequests: HelpRequest[];
  onSelectService: (service: ServiceItem) => void;
  neighborhood?: string;
}

// Coordenadas base en Santa Rosa / Lima, Perú
const DEFAULT_CENTER: [number, number] = [-11.8085, -77.1650];

// Coordenadas simuladas para los marcadores cercanos
const SERVICE_COORDS: Record<string, [number, number]> = {
  'srv-1': [-11.8062, -77.1630], // José (Electricidad)
  'srv-2': [-11.8105, -77.1675], // Carmen (Gasfitería)
  'srv-3': [-11.8040, -77.1685], // Pedro (Carpintería)
};

const HELP_COORDS: Record<string, [number, number]> = {
  'help-1': [-11.8090, -77.1620], // Agua potable
  'help-2': [-11.8120, -77.1645], // Escalera telescópica
};

export const AyniMap: React.FC<AyniMapProps> = ({
  services,
  helpRequests,
  onSelectService,
  neighborhood = 'Sector Central / Santa Rosa'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [searchFilter, setSearchFilter] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'services' | 'help'>('all');

  // Inicializar el mapa Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: DEFAULT_CENTER,
        zoom: 15,
        zoomControl: false,
      });

      // Añadir capa de OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);

      // Capa para los marcadores interactivos
      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;

      mapInstanceRef.current = map;

      // Forzar ajuste de tamaño por si el contenedor tardó en renderizarse
      setTimeout(() => {
        map.invalidateSize();
      }, 300);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Actualizar marcadores cuando cambian los filtros o datos
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    const q = searchFilter.toLowerCase().trim();

    // 1. Marcador de "Mi ubicación" (Punto azul pulsante)
    const userLocationIcon = L.divIcon({
      className: 'ayni-user-marker',
      html: `
        <div style="position: relative; width: 22px; height: 22px;">
          <div style="position: absolute; inset: 0; background: rgba(59, 130, 246, 0.35); border-radius: 50%; animation: pulse 2s infinite;"></div>
          <div style="position: absolute; inset: 3px; background: #2563EB; border: 2.5px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>
        </div>
      `,
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });

    L.marker(DEFAULT_CENTER, { icon: userLocationIcon })
      .addTo(markersLayer)
      .bindPopup(`
        <div style="font-family: inherit; font-size: 0.85rem; padding: 2px;">
          <strong>📍 Estás aquí</strong><br/>
          <span style="color: #6b7280; font-size: 0.78rem;">${neighborhood}</span>
        </div>
      `);

    // 2. Marcadores de Servicios (Profesionales verificados)
    if (filterType === 'all' || filterType === 'services') {
      services.forEach((srv, index) => {
        const titleMatch = srv.title.toLowerCase().includes(q) || srv.providerName.toLowerCase().includes(q);
        if (!titleMatch) return;

        // Si no tiene coordenada exacta, calcular una cercana alrededor del centro
        const coords = SERVICE_COORDS[srv.id] || [
          DEFAULT_CENTER[0] + (Math.sin(index + 1) * 0.004),
          DEFAULT_CENTER[1] + (Math.cos(index + 1) * 0.005)
        ];

        const shortName = srv.providerName.split('(')[0].trim();
        const catName = srv.categoryId.charAt(0).toUpperCase() + srv.categoryId.slice(1);

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

        // Al hacer click, permitir ver el perfil completo
        marker.on('click', () => {
          onSelectService(srv);
        });
      });
    }

    // 3. Marcadores de Solicitudes de Ayuda (Solidaridad comunitaria)
    if (filterType === 'all' || filterType === 'help') {
      helpRequests.forEach((req, index) => {
        const descMatch = req.description.toLowerCase().includes(q);
        if (!descMatch) return;

        const coords = HELP_COORDS[req.id] || [
          DEFAULT_CENTER[0] - (Math.cos(index + 2) * 0.003),
          DEFAULT_CENTER[1] - (Math.sin(index + 2) * 0.004)
        ];

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
              <span>⚠️</span>
              <span>${req.type.toUpperCase()}: ${req.description.slice(0, 20)}...</span>
            </div>
          `,
          iconSize: [0, 0],
          iconAnchor: [0, 0]
        });

        L.marker(coords, { icon: helpIcon })
          .addTo(markersLayer)
          .bindPopup(`
            <div style="font-family: inherit; font-size: 0.85rem; padding: 4px; max-width: 220px;">
              <div style="color: #D83B35; font-weight: 800; margin-bottom: 4px;">🤝 Solicitud de Ayuda</div>
              <p style="margin: 0 0 6px; color: #374151; font-size: 0.8rem; line-height: 1.3;">${req.description}</p>
              <div style="font-size: 0.72rem; color: #6b7280;">👤 ${req.authorName} &nbsp;•&nbsp; 📍 ${req.neighborhood}</div>
            </div>
          `);
      });
    }
  }, [searchFilter, filterType, services, helpRequests, neighborhood, onSelectService]);

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(DEFAULT_CENTER, 15, { duration: 1.2 });
    }
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
          <Search size={18} color="#9ca3af" />
          <input
            type="text"
            placeholder="Buscar en el mapa..."
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '0.9rem',
              color: '#1f2937'
            }}
          />
          {searchFilter && (
            <button
              onClick={() => setSearchFilter('')}
              style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '0.9rem' }}
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
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: filterType === 'all' ? '#D83B35' : '#ffffff',
              color: filterType === 'all' ? '#ffffff' : '#4b5563',
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
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: filterType === 'services' ? '#D83B35' : '#ffffff',
              color: filterType === 'services' ? '#ffffff' : '#4b5563',
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
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: filterType === 'help' ? '#FF875C' : '#ffffff',
              color: filterType === 'help' ? '#ffffff' : '#4b5563',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
            }}
          >
            🤝 Auxilio ({helpRequests.length})
          </button>
        </div>
      </div>

      {/* Chip de Barrio actual (inferior izquierdo) */}
      <div style={{
        position: 'absolute',
        bottom: 18,
        left: 14,
        zIndex: 10,
        background: '#ffffff',
        padding: '6px 12px',
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: 700,
        color: '#374151',
        boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: 5
      }}>
        <MapPin size={13} color="#D83B35" /> {neighborhood}
      </div>

      {/* Botón flotante para recentrar ubicación (inferior derecho) */}
      <button
        onClick={handleRecenter}
        title="Centrar en mi ubicación"
        style={{
          position: 'absolute',
          bottom: 18,
          right: 14,
          zIndex: 10,
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: '#ffffff',
          border: 'none',
          boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: '#252B3A'
        }}
      >
        <Navigation size={20} color="#D83B35" />
      </button>
    </div>
  );
};
