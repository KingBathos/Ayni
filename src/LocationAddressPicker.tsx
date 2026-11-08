import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as L from 'leaflet';
import { MapPin, Navigation, X, Search, Check, Loader2, ArrowLeft } from 'lucide-react';

interface SuggestionItem {
  id: string;
  title: string;
  subtitle: string;
  distance?: string;
  coords: [number, number];
}

interface LocationAddressPickerProps {
  value: string;
  onChange: (address: string, coords?: [number, number]) => void;
  userCoords?: [number, number] | null;
  isDarkMode?: boolean;
  placeholder?: string;
}

// Direcciones populares de referencia en San Borja / Lima para autocompletado instantáneo offline
const POPULAR_LOCAL_PLACES: SuggestionItem[] = [
  { id: 'p1', title: 'Avenida Malachowsky, 433', subtitle: 'Distrital San Borja', distance: '56 m', coords: [-12.0954, -77.0016] },
  { id: 'p2', title: 'Ciclovía Malachowsky', subtitle: 'Distrital San Borja', distance: '120 m', coords: [-12.0950, -77.0012] },
  { id: 'p3', title: 'Av. San Borja Sur, 240', subtitle: 'San Borja', distance: '350 m', coords: [-12.0980, -77.0040] },
  { id: 'p4', title: 'Av. San Borja Norte, 580', subtitle: 'San Borja', distance: '600 m', coords: [-12.0910, -76.9990] },
  { id: 'p5', title: 'Av. Aviación, 2800', subtitle: 'San Borja / Estación La Cultura', distance: '850 m', coords: [-12.0870, -77.0035] },
  { id: 'p6', title: 'Av. Javier Prado Este, 2465', subtitle: 'San Borja', distance: '1.1 km', coords: [-12.0855, -76.9980] },
  { id: 'p7', title: 'Calle Las Artes Norte, 320', subtitle: 'San Borja', distance: '720 m', coords: [-12.0895, -77.0020] },
  { id: 'p8', title: 'Jr. Fray Luis de León, 410', subtitle: 'Torres de Limatambo, San Borja', distance: '400 m', coords: [-12.0965, -77.0030] },
  { id: 'p9', title: 'Parque de la Familia', subtitle: 'San Borja', distance: '500 m', coords: [-12.0940, -76.9975] },
  { id: 'p10', title: 'Real Plaza Primavera', subtitle: 'Angamos / Aviación', distance: '900 m', coords: [-12.1120, -77.0020] }
];

export const LocationAddressPicker: React.FC<LocationAddressPickerProps> = ({
  value,
  onChange,
  userCoords,
  isDarkMode = false,
  placeholder = 'Escribe tu dirección o búscala en el mapa...'
}) => {
  const safeCoords: [number, number] = userCoords || [-12.0952, -77.0014];
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>(POPULAR_LOCAL_PLACES);
  const [isLoadingGps, setIsLoadingGps] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Estados del selector interactivo de mapa (Point-on-Map)
  const [mapCenterCoords, setMapCenterCoords] = useState<[number, number]>(safeCoords);
  const [resolvedMapAddress, setResolvedMapAddress] = useState<string>(value || 'Avenida Malachowsky, 433, San Borja');
  const [isResolvingAddress, setIsResolvingAddress] = useState<boolean>(false);
  const [isPinFloating, setIsPinFloating] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Búsqueda dinámica con Nominatim cuando el usuario escribe
  const handleInputChange = (text: string) => {
    onChange(text);
    setIsDropdownOpen(true);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!text.trim()) {
      setSuggestions(POPULAR_LOCAL_PLACES);
      setIsSearching(false);
      return;
    }

    // Filtrar localmente primero para respuesta inmediata
    const localFiltered = POPULAR_LOCAL_PLACES.filter(p =>
      p.title.toLowerCase().includes(text.toLowerCase()) ||
      p.subtitle.toLowerCase().includes(text.toLowerCase())
    );
    setSuggestions(localFiltered.length > 0 ? localFiltered : POPULAR_LOCAL_PLACES);

    // Consulta con debounce a Nominatim
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const query = encodeURIComponent(`${text}, Lima, Peru`);
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&countrycodes=pe&limit=5&addressdetails=1`, {
          headers: { 'Accept-Language': 'es' }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const mapped: SuggestionItem[] = data.map((item: any, idx: number) => {
              const addr = item.address || {};
              const road = addr.road || addr.suburb || addr.neighbourhood || item.display_name.split(',')[0];
              const num = addr.house_number ? `, ${addr.house_number}` : '';
              const district = addr.city_district || addr.suburb || addr.city || 'Lima';
              return {
                id: `nom-${idx}`,
                title: `${road}${num}`,
                subtitle: `Distrital ${district}`,
                coords: [parseFloat(item.lat), parseFloat(item.lon)]
              };
            });
            setSuggestions(mapped);
          }
        }
      } catch {
        // En caso de fallo de red, mantener las sugerencias locales
      } finally {
        setIsSearching(false);
      }
    }, 350);
  };

  // Acción "Tu ubicación actual" (GPS)
  const handleSelectCurrentLocation = () => {
    setIsLoadingGps(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`, {
              headers: { 'Accept-Language': 'es' }
            });
            if (res.ok) {
              const data = await res.json();
              const addr = data.address || {};
              const road = addr.road || addr.suburb || addr.neighbourhood || 'Mi ubicación actual';
              const num = addr.house_number ? `, ${addr.house_number}` : '';
              const dist = addr.city_district || addr.suburb || 'San Borja';
              const full = `${road}${num}, ${dist}`;
              onChange(full, [lat, lon]);
            } else {
              onChange('Ciclovía Malachowsky, San Borja', [lat, lon]);
            }
          } catch {
            onChange('Ciclovía Malachowsky, San Borja', [lat, lon]);
          } finally {
            setIsLoadingGps(false);
            setIsDropdownOpen(false);
          }
        },
        () => {
          setIsLoadingGps(false);
          onChange('Ciclovía Malachowsky, San Borja', safeCoords);
          setIsDropdownOpen(false);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      setIsLoadingGps(false);
      onChange('Ciclovía Malachowsky, San Borja', safeCoords);
      setIsDropdownOpen(false);
    }
  };

  // Selección de sugerencia de la lista
  const handleSelectSuggestion = (item: SuggestionItem) => {
    onChange(`${item.title}, ${item.subtitle.replace('Distrital ', '')}`, item.coords);
    setIsDropdownOpen(false);
  };

  // Abrir Modal de Mapa Interactivo
  const handleOpenMapPicker = () => {
    setIsDropdownOpen(false);
    setIsMapModalOpen(true);
    setMapCenterCoords(safeCoords);
    setResolvedMapAddress(value || 'Avenida Malachowsky, 433, San Borja');
  };

  // Geocodificación inversa en tiempo real cuando el pin se detiene sobre el mapa
  const reverseGeocodeCenter = useCallback(async (lat: number, lng: number) => {
    setIsResolvingAddress(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
        headers: { 'Accept-Language': 'es' }
      });
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const road = addr.road || addr.suburb || addr.neighbourhood || addr.residential || 'Ubicación seleccionada';
        const num = addr.house_number ? `, ${addr.house_number}` : '';
        const dist = addr.city_district || addr.suburb || addr.city || 'San Borja';
        const formatted = `${road}${num}, ${dist}`;
        setResolvedMapAddress(formatted);
      } else {
        setResolvedMapAddress(`San Borja, Lima (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      }
    } catch {
      setResolvedMapAddress(`San Borja, Lima (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    } finally {
      setIsResolvingAddress(false);
    }
  }, []);

  // Inicializar Leaflet dentro del Modal de Mapa
  useEffect(() => {
    if (!isMapModalOpen || !mapElementRef.current) return;

    const timer = setTimeout(() => {
      if (!mapElementRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(mapElementRef.current, {
        center: mapCenterCoords,
        zoom: 17,
        zoomControl: false,
        attributionControl: false
      });

      // Google Maps Tiles con estilo oscuro / claro dinámico
      const tileUrl = 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=es';
      const tileLayer = L.tileLayer(tileUrl, {
        maxZoom: 20,
        subdomains: ['0', '1', '2', '3'],
        className: 'map-tiles'
      });

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

      // Eventos de arrastre del mapa
      map.on('movestart', () => {
        setIsPinFloating(true);
      });

      map.on('moveend', () => {
        setIsPinFloating(false);
        const center = map.getCenter();
        const coords: [number, number] = [center.lat, center.lng];
        setMapCenterCoords(coords);
        reverseGeocodeCenter(center.lat, center.lng);
      });

      mapInstanceRef.current = map;
      reverseGeocodeCenter(mapCenterCoords[0], mapCenterCoords[1]);
    }, 150);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isMapModalOpen, isDarkMode, reverseGeocodeCenter]);

  // Confirmar la ubicación elegida con el mapa
  const handleConfirmMapLocation = () => {
    onChange(resolvedMapAddress, mapCenterCoords);
    setIsMapModalOpen(false);
  };

  // Recentrar mapa en GPS
  const handleRecenterGps = () => {
    if (!mapInstanceRef.current) return;
    setIsResolvingAddress(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        mapInstanceRef.current?.setView([lat, lng], 17);
        setMapCenterCoords([lat, lng]);
        reverseGeocodeCenter(lat, lng);
      }, () => {
        mapInstanceRef.current?.setView(safeCoords, 17);
        setMapCenterCoords(safeCoords);
        reverseGeocodeCenter(safeCoords[0], safeCoords[1]);
      });
    } else {
      mapInstanceRef.current.setView(safeCoords, 17);
      setMapCenterCoords(safeCoords);
      reverseGeocodeCenter(safeCoords[0], safeCoords[1]);
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Barra de entrada de dirección con botón [Mapa] (Estilo App Móvil moderna) */}
      <div
        className="loc-picker-input-wrap"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: isDarkMode ? '#161F30' : '#FFFFFF',
          border: isDarkMode ? '1px solid #233044' : '1px solid #D1D5DB',
          borderRadius: 14,
          padding: '6px 8px 6px 10px',
          boxShadow: isDarkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.06)',
          transition: 'all 0.2s ease'
        }}
      >
        {/* Icono de pin / ubicación a la izquierda */}
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #FF5A5F 0%, #D83B35 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            flexShrink: 0
          }}
        >
          <MapPin size={17} />
        </div>

        {/* Input de texto para escribir la dirección */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => handleInputChange(e.target.value)}
          onFocus={() => setIsDropdownOpen(true)}
          placeholder={placeholder}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: '0.86rem',
            color: isDarkMode ? '#F8FAFC' : '#111827',
            padding: '4px 0',
            fontFamily: 'inherit'
          }}
        />

        {/* Botón para limpiar texto (X) si hay contenido */}
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              inputRef.current?.focus();
            }}
            style={{
              background: 'none',
              border: 'none',
              color: isDarkMode ? '#94A3B8' : '#9CA3AF',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label="Borrar texto"
          >
            <X size={16} />
          </button>
        )}

        {/* Botón [Mapa] para abrir el selector visual interactivo */}
        <button
          type="button"
          onClick={handleOpenMapPicker}
          className="btn-open-map-pill"
          style={{
            height: 32,
            padding: '0 12px',
            borderRadius: 10,
            background: isDarkMode ? '#1E293B' : '#F3F4F6',
            border: isDarkMode ? '1px solid #334155' : '1px solid #E5E7EB',
            color: isDarkMode ? '#F8FAFC' : '#1F2937',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            flexShrink: 0,
            transition: 'all 0.15s ease'
          }}
        >
          <Search size={13} color="var(--coral)" />
          <span>Mapa</span>
        </button>
      </div>

      {/* Menú desplegable de sugerencias y opción "Tu ubicación actual" */}
      {isDropdownOpen && (
        <div
          className="loc-picker-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: isDarkMode ? '#161F30' : '#FFFFFF',
            border: isDarkMode ? '1px solid #233044' : '1px solid #E5E7EB',
            borderRadius: 14,
            boxShadow: isDarkMode ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.12)',
            zIndex: 100,
            maxHeight: 280,
            overflowY: 'auto',
            padding: '6px 0'
          }}
        >
          {/* Opción fija superior: Tu ubicación por GPS */}
          <div
            onClick={handleSelectCurrentLocation}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 14px',
              cursor: 'pointer',
              borderBottom: isDarkMode ? '1px solid #233044' : '1px solid #F3F4F6',
              background: isDarkMode ? 'rgba(255, 90, 95, 0.08)' : 'rgba(216, 59, 53, 0.04)',
              transition: 'background 0.15s ease'
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: isDarkMode ? '#1E293B' : '#E8F8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10B981',
                flexShrink: 0
              }}
            >
              {isLoadingGps ? (
                <Loader2 size={16} className="sh-spin" />
              ) : (
                <Navigation size={16} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.84rem', fontWeight: 800, color: isDarkMode ? '#F8FAFC' : '#111827' }}>
                Tu ubicación
              </div>
              <div style={{ fontSize: '0.74rem', color: isDarkMode ? '#94A3B8' : '#6B7280' }}>
                Punto de partida según tu ubicación de GPS
              </div>
            </div>
          </div>

          {/* Estado de carga de búsqueda en tiempo real */}
          {isSearching && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', fontSize: '0.74rem', color: isDarkMode ? '#94A3B8' : '#6B7280' }}>
              <Loader2 size={14} className="sh-spin" />
              <span>Buscando direcciones cercanas...</span>
            </div>
          )}

          {/* Lista de direcciones sugeridas */}
          {suggestions.map((item) => (
            <div
              key={item.id}
              onClick={() => handleSelectSuggestion(item)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '9px 14px',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
                borderBottom: isDarkMode ? '1px solid rgba(255,255,255,0.03)' : '1px solid #F9FAFB'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = isDarkMode ? '#1E293B' : '#F9FAFB')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: isDarkMode ? '#1E293B' : '#F3F4F6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isDarkMode ? '#94A3B8' : '#6B7280',
                  flexShrink: 0
                }}
              >
                <MapPin size={15} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: isDarkMode ? '#F8FAFC' : '#1F2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.title}
                </div>
                <div style={{ fontSize: '0.73rem', color: isDarkMode ? '#94A3B8' : '#6B7280' }}>
                  {item.subtitle}
                </div>
              </div>
              {item.distance && (
                <div style={{ fontSize: '0.72rem', color: isDarkMode ? '#64748B' : '#9CA3AF', fontWeight: 600 }}>
                  {item.distance}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ===== MODAL DE MAPA INTERACTIVO CON PIN CENTRAL (Punto en el mapa) ===== */}
      {isMapModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            background: isDarkMode ? '#0B0E14' : '#FFFFFF'
          }}
        >
          {/* Barra superior con botón volver y título */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              background: isDarkMode ? '#161F30' : '#FFFFFF',
              borderBottom: isDarkMode ? '1px solid #233044' : '1px solid #E5E7EB',
              zIndex: 10
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                onClick={() => setIsMapModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: isDarkMode ? '#F8FAFC' : '#111827',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                aria-label="Volver"
              >
                <ArrowLeft size={22} />
              </button>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: isDarkMode ? '#F8FAFC' : '#111827' }}>
                  Fijar punto en el mapa
                </h3>
                <div style={{ fontSize: '0.72rem', color: isDarkMode ? '#94A3B8' : '#6B7280' }}>
                  Desplaza el mapa hasta ubicar el punto exacto
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsMapModalOpen(false)}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: isDarkMode ? '#1E293B' : '#F3F4F6',
                border: 'none',
                color: isDarkMode ? '#94A3B8' : '#6B7280',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              aria-label="Cerrar mapa"
            >
              <X size={18} />
            </button>
          </div>

          {/* Lienzo del mapa con el pin central fijo */}
          <div style={{ position: 'relative', flex: 1, width: '100%', overflow: 'hidden' }}>
            {/* Contenedor Leaflet */}
            <div ref={mapElementRef} style={{ width: '100%', height: '100%' }} />

            {/* Pin Fijo en el Centro del Mapa (Uber / Yango style) */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: `translate(-50%, ${isPinFloating ? '-125%' : '-100%'})`,
                pointerEvents: 'none',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                transition: 'transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50% 50% 50% 0',
                  transform: 'rotate(-45deg)',
                  background: 'linear-gradient(135deg, #FF5A5F 0%, #D83B35 100%)',
                  boxShadow: '0 6px 16px rgba(216, 59, 53, 0.45)',
                  border: '3px solid #FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    transform: 'rotate(45deg)'
                  }}
                />
              </div>
              {/* Sombra proyectada en el suelo debajo del pin */}
              <div
                style={{
                  width: 16,
                  height: 6,
                  borderRadius: '50%',
                  background: 'rgba(0, 0, 0, 0.35)',
                  marginTop: -3,
                  transform: isPinFloating ? 'scale(0.7)' : 'scale(1)',
                  transition: 'transform 0.15s ease'
                }}
              />
            </div>

            {/* Botón flotante para recentrar en GPS */}
            <button
              type="button"
              onClick={handleRecenterGps}
              style={{
                position: 'absolute',
                bottom: 20,
                right: 16,
                zIndex: 1000,
                width: 46,
                height: 46,
                borderRadius: '50%',
                background: isDarkMode ? '#161F30' : '#FFFFFF',
                border: isDarkMode ? '1px solid #233044' : 'none',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
                color: '#FF5A5F',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              aria-label="Recentrar en mi GPS"
            >
              <Navigation size={20} />
            </button>
          </div>

          {/* Tarjeta Inferior de Confirmación (Pregunta si ahí es el lugar exacto) */}
          <div
            style={{
              padding: '16px 18px',
              background: isDarkMode ? '#161F30' : '#FFFFFF',
              borderTop: isDarkMode ? '1px solid #233044' : '1px solid #E5E7EB',
              boxShadow: isDarkMode ? '0 -4px 20px rgba(0,0,0,0.5)' : '0 -4px 20px rgba(0,0,0,0.08)',
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}
          >
            <div>
              <div style={{ fontSize: '0.76rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--coral)', marginBottom: 4 }}>
                ¿Es este el lugar del servicio?
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: isDarkMode ? '#1E293B' : '#FEF2F2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--coral)',
                    flexShrink: 0,
                    marginTop: 2
                  }}
                >
                  {isResolvingAddress ? <Loader2 size={16} className="sh-spin" /> : <MapPin size={18} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '0.94rem',
                      fontWeight: 800,
                      color: isDarkMode ? '#F8FAFC' : '#111827',
                      lineHeight: 1.3
                    }}
                  >
                    {isResolvingAddress ? 'Detectando dirección exacta...' : resolvedMapAddress}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: isDarkMode ? '#94A3B8' : '#6B7280', marginTop: 2 }}>
                    Coordenadas: {mapCenterCoords[0].toFixed(5)}, {mapCenterCoords[1].toFixed(5)}
                  </div>
                </div>
              </div>
            </div>

            {/* Botón de confirmación para fijar esta dirección */}
            <button
              type="button"
              onClick={handleConfirmMapLocation}
              disabled={isResolvingAddress}
              className="btn btn-coral"
              style={{
                width: '100%',
                height: 46,
                borderRadius: 14,
                fontSize: '0.90rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 4px 14px rgba(216, 59, 53, 0.35)',
                cursor: 'pointer'
              }}
            >
              <Check size={18} />
              <span>Confirmar esta ubicación</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

