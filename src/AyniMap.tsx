import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Search, MapPin, Navigation, Store, Star, HeartHandshake, X,
  Megaphone, CalendarDays, Compass, CheckCircle2
} from 'lucide-react';
import { ServiceItem, HelpRequest, CommunityPost, CommunityActivity } from './types';

interface AyniMapProps {
  services: ServiceItem[];
  helpRequests: HelpRequest[];
  communityPosts?: CommunityPost[];
  activities?: CommunityActivity[];
  onSelectService: (service: ServiceItem) => void;
  onSelectHelp?: (help: HelpRequest) => void;
  onSelectPost?: (post: CommunityPost) => void;
  onSelectActivity?: (act: CommunityActivity) => void;
  neighborhood?: string;
  userCoords?: [number, number] | null;
  onLocationDetected?: (coords: [number, number], name: string) => void;
  isDarkMode?: boolean;
}

// Coordenadas de contingencia (Lima Metropolitana / San Borja)
const FALLBACK_CENTER: [number, number] = [-12.1096, -77.0057];

// Fórmula de Haversine para calcular distancia en km
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(distKm: number): string {
  if (distKm < 1) {
    return `${Math.round(distKm * 1000)} m`;
  }
  return `${distKm.toFixed(1)} km`;
}

interface UnifiedMapItem {
  id: string;
  kind: 'service' | 'post' | 'help' | 'activity';
  title: string;
  subtitle: string;
  desc: string;
  badge?: string;
  rating?: number;
  coords: [number, number];
  distanceKm: number;
  raw: any;
}

export const AyniMap: React.FC<AyniMapProps> = ({
  services,
  helpRequests,
  communityPosts = [],
  activities = [],
  onSelectService,
  onSelectHelp,
  onSelectPost,
  onSelectActivity,
  neighborhood = 'Ciclovía Malachowsky, San Borja',
  userCoords: propUserCoords,
  onLocationDetected,
  isDarkMode = false
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const radiusCircleRef = useRef<L.Circle | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [realCoords, setRealCoords] = useState<[number, number]>(propUserCoords || FALLBACK_CENTER);
  const [realNeighborhood, setRealNeighborhood] = useState<string>(neighborhood);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState('');
  
  // Filtro de tipo: Todos, Servicios, Avisos, Auxilios, Eventos
  const [filterType, setFilterType] = useState<'all' | 'services' | 'posts' | 'help' | 'activities'>('all');
  
  // Filtro de radio en km: null (sin límite), 0.5 (500m), 1 (1km), 2 (2km), 5 (5km)
  const [radiusFilter, setRadiusFilter] = useState<number | null>(null);

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
        console.warn('GPS error o denegado, usando base:', err);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, [onLocationDetected]);

  useEffect(() => {
    if (propUserCoords) {
      setRealCoords(propUserCoords);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView(propUserCoords, 16);
      }
    }
  }, [propUserCoords]);

  useEffect(() => {
    detectRealPosition(true);
  }, [detectRealPosition]);

  // Inicializar Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: realCoords,
        zoom: 15,
        zoomControl: false,
      });

      const tileUrl = 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=es';

      const tileLayer = L.tileLayer(tileUrl, {
        maxZoom: 20,
        subdomains: ['0', '1', '2', '3'],
        attribution: '&copy; Google Maps',
        className: 'map-tiles'
      });

      // Asegurar que cada tile reciba el filtro directamente en el elemento (indispensable para WebView en Android)
      tileLayer.on('tileload', (event: any) => {
        if (event.tile) {
          if (isDarkMode) {
            event.tile.style.filter = 'invert(100%) hue-rotate(185deg) brightness(88%) contrast(110%) saturate(85%)';
            event.tile.style.webkitFilter = 'invert(100%) hue-rotate(185deg) brightness(88%) contrast(110%) saturate(85%)';
          } else {
            event.tile.style.filter = '';
            event.tile.style.webkitFilter = '';
          }
        }
      });

      tileLayer.addTo(map);
      tileLayerRef.current = tileLayer;

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

  // Sincronizar estilo oscuro en todos los tiles cargados cuando el usuario cambia de modo
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const tiles = mapContainerRef.current.querySelectorAll<HTMLImageElement>('.leaflet-tile, .leaflet-tile-pane img');
    tiles.forEach(tile => {
      if (isDarkMode) {
        tile.style.filter = 'invert(100%) hue-rotate(185deg) brightness(88%) contrast(110%) saturate(85%)';
        tile.style.webkitFilter = 'invert(100%) hue-rotate(185deg) brightness(88%) contrast(110%) saturate(85%)';
      } else {
        tile.style.filter = '';
        tile.style.webkitFilter = '';
      }
    });
  }, [isDarkMode]);

  // FILTRADO ESTRICTO DE VIGENCIA:
  // Solo los avisos, auxilios y actividades NO vencidos aparecen en el mapa.
  // Cuando se vence su tiempo, desaparecen automáticamente.
  const activeItems = useMemo(() => {
    const now = Date.now();
    const [userLat, userLng] = realCoords;

    const unexpiredHelps = helpRequests.filter(
      h => !h.expiresAt || new Date(h.expiresAt).getTime() > now
    );
    const unexpiredPosts = communityPosts.filter(
      p => !p.expiresAt || new Date(p.expiresAt).getTime() > now
    );
    const unexpiredActivities = activities.filter(
      a => !a.expiresAt || new Date(a.expiresAt).getTime() > now
    );

    // Lista unificada
    const rawList: { kind: 'service' | 'post' | 'help' | 'activity'; raw: any }[] = [
      ...services.map(s => ({ kind: 'service' as const, raw: s })),
      ...unexpiredHelps.map(h => ({ kind: 'help' as const, raw: h })),
      ...unexpiredPosts.map(p => ({ kind: 'post' as const, raw: p })),
      ...unexpiredActivities.map(a => ({ kind: 'activity' as const, raw: a }))
    ];

    // Algoritmo de distribución radial en anillos concéntricos
    // Garantiza que cada marcador tenga coordenadas ÚNICAS y separadas (mínimo 350-500m entre sí)
    // evitando por completo el solapamiento de tarjetas y carteles.
    const rings = [
      { capacity: 6, radiusKm: 0.38, offset: 0.1 },
      { capacity: 8, radiusKm: 0.85, offset: 0.4 },
      { capacity: 10, radiusKm: 1.45, offset: 0.2 },
      { capacity: 12, radiusKm: 2.30, offset: 0.6 },
      { capacity: 16, radiusKm: 3.60, offset: 0.3 }
    ];

    return rawList.map((entry, index) => {
      let remaining = index;
      let chosenRing = rings[0];
      for (const ring of rings) {
        if (remaining < ring.capacity) {
          chosenRing = ring;
          break;
        }
        remaining -= ring.capacity;
      }

      const angle = (remaining * (2 * Math.PI / chosenRing.capacity)) + chosenRing.offset;
      const latOffset = chosenRing.radiusKm / 111;
      const lngOffset = chosenRing.radiusKm / (111 * Math.cos(userLat * Math.PI / 180));
      const itemLat = userLat + latOffset * Math.cos(angle);
      const itemLng = userLng + lngOffset * Math.sin(angle);
      const distance = calculateDistanceKm(userLat, userLng, itemLat, itemLng);

      if (entry.kind === 'service') {
        const s: ServiceItem = entry.raw;
        return {
          id: s.id,
          kind: 'service' as const,
          title: s.title,
          subtitle: s.providerName.split('(')[0].trim(),
          desc: s.description || `${s.coverageArea} · S/ ${s.priceAmount || 35}/h`,
          rating: s.rating,
          badge: 'Servicio',
          coords: [itemLat, itemLng] as [number, number],
          distanceKm: distance,
          raw: s
        };
      } else if (entry.kind === 'help') {
        const h: HelpRequest = entry.raw;
        return {
          id: h.id,
          kind: 'help' as const,
          title: `Ayuda: ${h.type.toUpperCase()}`,
          subtitle: h.authorName,
          desc: h.description,
          badge: `Urgencia ${h.urgency}`,
          coords: [itemLat, itemLng] as [number, number],
          distanceKm: distance,
          raw: h
        };
      } else if (entry.kind === 'post') {
        const p: CommunityPost = entry.raw;
        return {
          id: p.id,
          kind: 'post' as const,
          title: p.title,
          subtitle: p.authorName,
          desc: p.body,
          badge: p.verificationStatus.toUpperCase(),
          coords: [itemLat, itemLng] as [number, number],
          distanceKm: distance,
          raw: p
        };
      } else {
        const a: CommunityActivity = entry.raw;
        return {
          id: a.id,
          kind: 'activity' as const,
          title: a.title,
          subtitle: `${a.organizer} · ${a.date}`,
          desc: a.description,
          badge: a.badge,
          coords: [itemLat, itemLng] as [number, number],
          distanceKm: distance,
          raw: a
        };
      }
    });
  }, [services, helpRequests, communityPosts, activities, realCoords]);

  // Actualizar marcadores vectoriales y círculo de radio sobre el mapa
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();
    const [userLat, userLng] = realCoords;

    // Dibujar o remover el círculo de radio visual
    if (radiusCircleRef.current) {
      radiusCircleRef.current.remove();
      radiusCircleRef.current = null;
    }

    if (radiusFilter !== null) {
      const radiusMeters = radiusFilter * 1000;
      const circle = L.circle([userLat, userLng], {
        radius: radiusMeters,
        color: '#D83B35',
        fillColor: '#FF875C',
        fillOpacity: 0.08,
        weight: 1.5,
        dashArray: '5, 5'
      }).addTo(map);
      radiusCircleRef.current = circle;

      // Ajustar vista para abarcar el radio elegido
      map.fitBounds(circle.getBounds(), { padding: [30, 30], maxZoom: 16 });
    }

    // 1. Marcador del usuario (Punto azul real con halo pulsante)
    const userLocationIcon = L.divIcon({
      className: 'ayni-user-marker',
      html: `
        <div style="position: relative; width: 26px; height: 26px;">
          <div style="position: absolute; inset: 0; background: rgba(59, 130, 246, 0.35); border-radius: 50%;"></div>
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

    // 2. Filtrado por tipo, radio de distancia y búsqueda
    const q = searchFilter.toLowerCase().trim();

    const filteredItems = activeItems.filter(item => {
      // Filtro de tipo
      if (filterType === 'services' && item.kind !== 'service') return false;
      if (filterType === 'posts' && item.kind !== 'post') return false;
      if (filterType === 'help' && item.kind !== 'help') return false;
      if (filterType === 'activities' && item.kind !== 'activity') return false;

      // Filtro de radio de distancia
      if (radiusFilter !== null && item.distanceKm > radiusFilter) return false;

      // Filtro de texto de búsqueda
      if (q) {
        const text = `${item.title} ${item.subtitle} ${item.desc}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      return true;
    });

    // 3. Renderizar pines compactos que NUNCA se sobreponen
    filteredItems.forEach(item => {
      let pinColor = '#D83B35';
      let iconSvg = '';
      let actionLabel = 'Ver detalle';

      if (item.kind === 'service') {
        pinColor = '#D83B35';
        actionLabel = 'Ver profesional y solicitar';
        iconSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 9l1.6-5h14.8L21 9"/><path d="M4 9v11h16V9"/><path d="M10 20v-6h4v6"/></svg>`;
      } else if (item.kind === 'help') {
        pinColor = '#EA580C';
        actionLabel = 'Coordinar ayuda solidaria';
        iconSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`;
      } else if (item.kind === 'post') {
        pinColor = '#DC2626';
        actionLabel = 'Ver aviso y chat vecinal';
        iconSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>`;
      } else {
        pinColor = '#2563EB';
        actionLabel = 'Ver actividad vecinal';
        iconSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`;
      }

      // Pin compacto vertical de 34px que no invade el espacio horizontal de los vecinos
      const pinIcon = L.divIcon({
        className: 'ayni-compact-pin',
        html: `
          <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            cursor: pointer;
            transform: translate(-50%, -100%);
          ">
            <div style="
              width: 32px;
              height: 32px;
              border-radius: 50%;
              background: ${pinColor};
              border: 2px solid #FFFFFF;
              box-shadow: 0 3px 8px rgba(0,0,0,0.25);
              display: flex;
              align-items: center;
              justify-content: center;
              color: #FFFFFF;
            ">
              ${iconSvg}
            </div>
            <div style="
              background: ${isDarkMode ? '#161F30' : '#FFFFFF'};
              border: 1px solid ${pinColor};
              color: ${isDarkMode ? '#F8FAFC' : '#1F2937'};
              font-family: inherit;
              font-size: 0.7rem;
              font-weight: 700;
              padding: 2px 8px;
              border-radius: 8px;
              box-shadow: 0 2px 6px rgba(0,0,0,${isDarkMode ? '0.5' : '0.12'});
              margin-top: 2px;
              max-width: 95px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              text-align: center;
            ">
              ${item.subtitle.slice(0, 14)}
            </div>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
      });

      const marker = L.marker(item.coords, { icon: pinIcon }).addTo(markersLayer);

      // Popup limpio y detallado al tocar el marcador
      const popupHtml = `
        <div style="font-family: inherit; font-size: 0.85rem; padding: 4px; min-width: 210px; max-width: 250px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-size: 0.68rem; font-weight: 800; text-transform: uppercase; color: ${pinColor};">
              ${item.badge || item.kind}
            </span>
            <span style="font-size: 0.7rem; color: #6B7280; font-weight: 700;">
              A ${formatDistance(item.distanceKm)}
            </span>
          </div>
          <h4 style="margin: 0 0 4px; font-size: 0.94rem; font-weight: 800; color: ${isDarkMode ? '#F8FAFC' : '#111827'};">${item.title}</h4>
          <div style="font-size: 0.78rem; color: ${isDarkMode ? '#94A3B8' : '#6B7280'}; margin-bottom: 6px;">${item.subtitle}</div>
          <p style="margin: 0 0 10px; font-size: 0.78rem; color: ${isDarkMode ? '#CBD5E1' : '#374151'}; line-height: 1.35;">${item.desc}</p>
          <button id="btn-popup-${item.id}" style="
            width: 100%;
            background: ${pinColor};
            color: #FFFFFF;
            border: none;
            border-radius: 8px;
            padding: 8px 10px;
            font-size: 0.8rem;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 2px 5px rgba(0,0,0,0.15);
          ">
            ${actionLabel}
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-popup-${item.id}`);
        if (btn) {
          btn.onclick = () => {
            if (item.kind === 'service') {
              onSelectService(item.raw);
            } else if (item.kind === 'help' && onSelectHelp) {
              onSelectHelp(item.raw);
            } else if (item.kind === 'post' && onSelectPost) {
              onSelectPost(item.raw);
            } else if (item.kind === 'activity' && onSelectActivity) {
              onSelectActivity(item.raw);
            }
          };
        }
      });
    });
  }, [
    activeItems,
    searchFilter,
    filterType,
    radiusFilter,
    realCoords,
    realNeighborhood,
    onSelectService,
    onSelectHelp,
    onSelectPost,
    onSelectActivity,
    isDarkMode
  ]);

  const handleRecenter = () => {
    detectRealPosition(true);
  };

  // Contadores para los chips de filtro
  const counts = useMemo(() => {
    return {
      all: activeItems.length,
      services: activeItems.filter(i => i.kind === 'service').length,
      posts: activeItems.filter(i => i.kind === 'post').length,
      help: activeItems.filter(i => i.kind === 'help').length,
      activities: activeItems.filter(i => i.kind === 'activity').length
    };
  }, [activeItems]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '520px', display: 'flex', flexDirection: 'column' }}>
      {/* Contenedor del mapa real OpenStreetMap */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', flex: 1, zIndex: 1 }} />

      {/* Barra de búsqueda y filtros flotantes sobre el mapa */}
      <div style={{
        position: 'absolute',
        top: 12,
        left: 12,
        right: 12,
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
          background: isDarkMode ? '#161F30' : '#ffffff',
          borderRadius: '14px',
          padding: '10px 14px',
          boxShadow: isDarkMode ? '0 4px 16px rgba(0,0,0,0.45)' : '0 4px 15px rgba(0,0,0,0.12)',
          pointerEvents: 'auto',
          border: isDarkMode ? '1px solid #233044' : '1px solid #E5E7EB'
        }}>
          <Search size={18} color="#9CA3AF" />
          <input
            type="text"
            placeholder="Buscar en tu zona (oficio, aviso, auxilio)..."
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '0.88rem',
              color: isDarkMode ? '#F8FAFC' : '#1F2937'
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

        {/* Fila 1: Filtro de Tipo de Contenido (Servicios vs Avisos vs Auxilios vs Eventos) */}
        <div style={{ display: 'flex', gap: 6, pointerEvents: 'auto', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
          <button
            onClick={() => setFilterType('all')}
            style={{
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '0.76rem',
              fontWeight: 800,
              cursor: 'pointer',
              border: isDarkMode && filterType !== 'all' ? '1px solid #233044' : 'none',
              background: filterType === 'all' ? '#D83B35' : (isDarkMode ? '#161F30' : '#ffffff'),
              color: filterType === 'all' ? '#ffffff' : (isDarkMode ? '#CBD5E1' : '#374151'),
              boxShadow: isDarkMode ? '0 2px 6px rgba(0,0,0,0.3)' : '0 2px 6px rgba(0,0,0,0.1)',
              whiteSpace: 'nowrap'
            }}
          >
            Todos ({counts.all})
          </button>
          <button
            onClick={() => setFilterType('services')}
            style={{
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '0.76rem',
              fontWeight: 800,
              cursor: 'pointer',
              border: isDarkMode && filterType !== 'services' ? '1px solid #233044' : 'none',
              background: filterType === 'services' ? '#D83B35' : (isDarkMode ? '#161F30' : '#ffffff'),
              color: filterType === 'services' ? '#ffffff' : (isDarkMode ? '#CBD5E1' : '#374151'),
              boxShadow: isDarkMode ? '0 2px 6px rgba(0,0,0,0.3)' : '0 2px 6px rgba(0,0,0,0.1)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              whiteSpace: 'nowrap'
            }}
          >
            <Store size={13} /> Solo Servicios ({counts.services})
          </button>
          <button
            onClick={() => setFilterType('posts')}
            style={{
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '0.76rem',
              fontWeight: 800,
              cursor: 'pointer',
              border: isDarkMode && filterType !== 'posts' ? '1px solid #233044' : 'none',
              background: filterType === 'posts' ? '#DC2626' : (isDarkMode ? '#161F30' : '#ffffff'),
              color: filterType === 'posts' ? '#ffffff' : (isDarkMode ? '#CBD5E1' : '#374151'),
              boxShadow: isDarkMode ? '0 2px 6px rgba(0,0,0,0.3)' : '0 2px 6px rgba(0,0,0,0.1)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              whiteSpace: 'nowrap'
            }}
          >
            <Megaphone size={13} /> Solo Avisos ({counts.posts})
          </button>
          <button
            onClick={() => setFilterType('help')}
            style={{
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '0.76rem',
              fontWeight: 800,
              cursor: 'pointer',
              border: isDarkMode && filterType !== 'help' ? '1px solid #233044' : 'none',
              background: filterType === 'help' ? '#EA580C' : (isDarkMode ? '#161F30' : '#ffffff'),
              color: filterType === 'help' ? '#ffffff' : (isDarkMode ? '#CBD5E1' : '#374151'),
              boxShadow: isDarkMode ? '0 2px 6px rgba(0,0,0,0.3)' : '0 2px 6px rgba(0,0,0,0.1)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              whiteSpace: 'nowrap'
            }}
          >
            <HeartHandshake size={13} /> Auxilios ({counts.help})
          </button>
          <button
            onClick={() => setFilterType('activities')}
            style={{
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '0.76rem',
              fontWeight: 800,
              cursor: 'pointer',
              border: isDarkMode && filterType !== 'activities' ? '1px solid #233044' : 'none',
              background: filterType === 'activities' ? '#2563EB' : (isDarkMode ? '#161F30' : '#ffffff'),
              color: filterType === 'activities' ? '#ffffff' : (isDarkMode ? '#CBD5E1' : '#374151'),
              boxShadow: isDarkMode ? '0 2px 6px rgba(0,0,0,0.3)' : '0 2px 6px rgba(0,0,0,0.1)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              whiteSpace: 'nowrap'
            }}
          >
            <CalendarDays size={13} /> Eventos ({counts.activities})
          </button>
        </div>

        {/* Fila 2: Filtro de Radio de Distancia */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          pointerEvents: 'auto',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          background: isDarkMode ? 'rgba(22, 31, 48, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          border: isDarkMode ? '1px solid #233044' : 'none',
          padding: '4px 8px',
          borderRadius: '20px',
          boxShadow: isDarkMode ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.08)',
          width: 'fit-content'
        }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: isDarkMode ? '#94A3B8' : '#6B7280', display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 4 }}>
            <Compass size={12} color="#D83B35" /> Radio:
          </span>
          {[
            { label: 'Todo', val: null },
            { label: '500 m', val: 0.5 },
            { label: '1 km', val: 1 },
            { label: '2 km', val: 2 },
            { label: '5 km', val: 5 }
          ].map(r => (
            <button
              key={r.label}
              onClick={() => setRadiusFilter(r.val)}
              style={{
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
                background: radiusFilter === r.val ? '#D83B35' : 'transparent',
                color: radiusFilter === r.val ? '#ffffff' : (isDarkMode ? '#CBD5E1' : '#4B5563'),
                whiteSpace: 'nowrap',
                transition: 'background 0.12s'
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chip de Barrio actual real (inferior izquierdo) */}
      <div style={{
        position: 'absolute',
        bottom: 18,
        left: 14,
        zIndex: 10,
        background: isDarkMode ? '#161F30' : '#ffffff',
        border: isDarkMode ? '1px solid #233044' : 'none',
        padding: '8px 14px',
        borderRadius: '12px',
        fontSize: '0.78rem',
        fontWeight: 700,
        color: isDarkMode ? '#F8FAFC' : '#252B3A',
        boxShadow: isDarkMode ? '0 3px 12px rgba(0,0,0,0.45)' : '0 3px 12px rgba(0,0,0,0.15)',
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
          background: isDarkMode ? '#161F30' : '#ffffff',
          border: isDarkMode ? '1px solid #233044' : 'none',
          boxShadow: isDarkMode ? '0 4px 16px rgba(0,0,0,0.45)' : '0 4px 16px rgba(0,0,0,0.22)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: isDarkMode ? '#FF5A5F' : '#D83B35'
        }}
      >
        <Navigation size={21} className={isLocating ? 'sh-spin' : ''} />
      </button>
    </div>
  );
};