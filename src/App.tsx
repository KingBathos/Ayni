import React, { useState, useRef, useEffect, useCallback } from 'react';
import { App as CapApp } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Network } from '@capacitor/network';
import {
  Store, MapPin, Wifi, WifiOff, Radio, Users, HeartHandshake,
  AlertTriangle, Star, CheckCircle2, Plus, PlusCircle, Search, RefreshCw,
  Info, User as UserIcon, ShieldCheck,
  Bell, ChevronRight, Heart, Clock, Bookmark, CreditCard, Settings,
  HelpCircle, LogOut, ArrowLeft, Camera, Calendar, Send, Navigation,
  Zap, Wrench, Hammer, Sparkles, GraduationCap, Utensils, MoreHorizontal,
  Phone, MessageCircle, CheckCircle, Circle, ThumbsUp, Droplet, Megaphone,
  CalendarDays, HandHeart, Shield, X, ChevronDown, Check, XCircle, AlertCircle, Trash2, Image as ImageIcon,
  Pin, Edit2, CheckCheck, BellRing, Hourglass, Play, Inbox, Moon, Sun, Home
} from 'lucide-react';
import {
  INITIAL_SERVICES, INITIAL_COMMUNITY_POSTS, INITIAL_HELP_REQUESTS,
  INITIAL_BOOKINGS, INITIAL_CATEGORIES, INITIAL_ACTIVITIES,
  INITIAL_CHAT_MESSAGES, INITIAL_NOTIFICATIONS
} from './mockData';
import { ServiceItem, HelpRequest, Booking, OfflineEnvelope, CommunityPost, CommunityActivity, ChatMessage, AppNotification } from './types';
import { AuthModal } from './AuthModal';
import { AyniMap } from './AyniMap';
import { LocationAddressPicker } from './LocationAddressPicker';
import { InteractiveTutorial } from './InteractiveTutorial';
import { api } from './api';
import './App.css';

const CAT_CSS: Record<string, string> = {
  electricidad: 'elec', gasfiteria: 'gasf', carpinteria: 'carp',
  limpieza: 'limp', educacion: 'edu', comida: 'food'
};

const PRO_INITIALS: Record<string, string> = {
  'usr-p1': 'JR', 'usr-p2': 'CM', 'usr-p3': 'PQ'
};

type ViewType =
  | 'welcome'
  | 'home'
  | 'explore'
  | 'requests'
  | 'map'
  | 'profile'
  | 'pro-detail'
  | 'request-form'
  | 'tracking'
  | 'offline';

// Pestañas de comunidad en el orden exacto solicitado: Avisos -> Ayuda -> Actividades
type CommunityTabType = 'avisos' | 'ayuda' | 'actividades';

export function App() {
  const [view, setView] = useState<ViewType>(() => {
    try {
      const done = localStorage.getItem('ayni_onboarding_completed');
      return done === 'true' ? 'home' : 'welcome';
    } catch {
      return 'welcome';
    }
  });

  // Pestaña inicial activa: 'avisos' (orden: avisos -> ayuda -> actividades)
  const [communityTab, setCommunityTab] = useState<CommunityTabType>('avisos');

  // Modo Oscuro (Persistente en localStorage)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('ayni_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
        document.body.style.backgroundColor = '#0B0F19';
      } else {
        document.documentElement.classList.remove('dark');
        document.body.style.backgroundColor = '#ffffff';
      }
    } catch {}
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      try {
        localStorage.setItem('ayni_theme', next ? 'dark' : 'light');
      } catch {}
      return next;
    });
  };

  // Conectividad real del dispositivo con soporte nativo de Capacitor Network
  const [deviceOnline, setDeviceOnline] = useState<boolean>(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine;
    }
    return true;
  });

  // El modo sin conexión se rige exclusivamente por el estado real de la red del dispositivo
  const isOnline = deviceOnline;

  useEffect(() => {
    // 1. Escuchar cambios de red con Capacitor Network (Modo avión / corte de datos / wifi)
    Network.getStatus().then(status => {
      setDeviceOnline(status.connected);
    }).catch(() => {});

    const netListenerPromise = Network.addListener('networkStatusChange', status => {
      setDeviceOnline(status.connected);
    });

    const handleOnline = () => setDeviceOnline(true);
    const handleOffline = () => setDeviceOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      netListenerPromise.then(l => l.remove()).catch(() => {});
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Ubicación del usuario: Nombre real oficial sin coordenadas crudas
  const [userCoords, setUserCoords] = useState<[number, number] | null>([-12.1096, -77.0057]);
  const [realLocationName, setRealLocationName] = useState<string>('Ciclovía Malachowsky, San Borja');

  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStageText, setLoadingStageText] = useState('Iniciando recursos de Ayni...');
  const [isResourcesLoaded, setIsResourcesLoaded] = useState(false);

  const [currentUser, setCurrentUser] = useState<{
    name: string; documentNumber: string; neighborhood: string; district: string;
  } | null>(null);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [isFavoritesModalOpen, setIsFavoritesModalOpen] = useState(false);

  const handleCompleteTutorial = () => {
    try {
      localStorage.setItem('ayni_onboarding_completed', 'true');
    } catch {}
    setIsTutorialActive(false);
    setView('home');
    if (!currentUser) {
      setIsAuthModalOpen(true);
    }
  };

  const handleSkipTutorial = () => {
    try {
      localStorage.setItem('ayni_onboarding_completed', 'true');
    } catch {}
    setIsTutorialActive(false);
    setView('home');
    if (!currentUser) {
      setIsAuthModalOpen(true);
    }
  };

  const [services, setServices] = useState<ServiceItem[]>(INITIAL_SERVICES);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>(INITIAL_COMMUNITY_POSTS);
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>(INITIAL_HELP_REQUESTS);
  const [activities, setActivities] = useState<CommunityActivity[]>(INITIAL_ACTIVITIES);
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);

  const [offlineQueue, setOfflineQueue] = useState<OfflineEnvelope[]>(() => {
    try {
      const saved = localStorage.getItem('ayni_offline_queue');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: 'msg-7f3a',
        type: 'help_request',
        title: 'Solicitud de ayuda · Agua potable',
        description: 'Adulto mayor necesita 2 bidones de agua potable por corte prolongado. No puede cargar peso.',
        createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        timeAgo: 'Hace 2 min',
        status: 'local',
        step: 'enviando',
        hops: 1,
        hopLimit: 5,
        expiresIn: 'Caduca en 23 h',
        statusText: 'Enviando a dispositivo cercano…',
        statusSubtext: 'Buscando teléfono de vecino para saltar por BLE.'
      },
      {
        id: 'msg-3b1c',
        type: 'booking_status',
        title: 'Contratación · Electricidad',
        description: 'Confirmado por el servidor · 3 saltos',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        timeAgo: 'Ayer',
        status: 'sincronizado',
        step: 'sincronizado',
        hops: 3,
        hopLimit: 5,
        expiresIn: 'Vigente',
        statusText: 'Sincronizado con servidor',
        statusSubtext: 'Confirmado por el servidor · 3 saltos'
      }
    ];
  });

  // Guardar offlineQueue en localStorage
  useEffect(() => {
    try {
      localStorage.setItem('ayni_offline_queue', JSON.stringify(offlineQueue));
    } catch {}
  }, [offlineQueue]);

  // Motor de propagación y confirmación automática por Malla BLE (No requiere presionar botones)
  useEffect(() => {
    const timer = setInterval(() => {
      setOfflineQueue(prevQueue => {
        let hasChanges = false;
        const nextQueue = prevQueue.map(item => {
          // Fase 1: De guardado -> enviando (inicia transmisión BLE a 2.4 GHz)
          if (item.step === 'guardado') {
            hasChanges = true;
            return {
              ...item,
              step: 'enviando' as const,
              statusText: 'Enviando a dispositivo cercano…',
              statusSubtext: 'Buscando teléfono de vecino para saltar por BLE.'
            };
          }
          // Fase 2: De enviando -> recibido por vecino cercano
          if (item.step === 'enviando') {
            hasChanges = true;
            return {
              ...item,
              step: 'recibido' as const,
              status: 'retransmitido' as const,
              hops: Math.min(item.hops + 1, item.hopLimit),
              statusText: 'Recibido por dispositivo cercano (Vecino)',
              statusSubtext: '✓ Teléfono de vecino confirmó: "Ya estoy recibiendo tu información y se está sincronizando con la red".'
            };
          }
          // Fase 3: De recibido -> sincronizado con servidor central
          if (item.step === 'recibido') {
            hasChanges = true;
            return {
              ...item,
              step: 'sincronizado' as const,
              status: 'sincronizado' as const,
              hops: Math.min(item.hops + 1, item.hopLimit),
              statusText: 'Sincronizado con servidor',
              statusSubtext: 'Confirmado por la red vecinal central · 3 saltos'
            };
          }
          return item;
        });

        return hasChanges ? nextQueue : prevQueue;
      });
    }, 2500);

    return () => clearInterval(timer);
  }, []);

  // Probar o reiniciar ciclo de propagación BLE en vivo (demostración rápida)
  const handleRestartMeshDemo = () => {
    const demoEnvelope: OfflineEnvelope = {
      id: `msg-${Math.random().toString(36).substring(2, 6)}`,
      type: 'help_request',
      title: 'Solicitud de ayuda · Agua potable',
      description: 'Adulto mayor necesita 2 bidones de agua potable por corte prolongado. No puede cargar peso.',
      createdAt: new Date().toISOString(),
      timeAgo: 'Justo ahora',
      status: 'local',
      step: 'guardado',
      hops: 1,
      hopLimit: 5,
      expiresIn: 'Caduca en 24 h',
      statusText: 'Guardado de forma segura en este teléfono',
      statusSubtext: 'Paquete sellado localmente. Iniciando transmisión automática por BLE...'
    };
    setOfflineQueue(prev => [demoEnvelope, ...prev.filter(x => x.id !== 'msg-7f3a')]);
  };

  // Modal para escribir ayuda de emergencia offline
  const [isOfflineHelpModalOpen, setIsOfflineHelpModalOpen] = useState(false);
  const [offlineEmergencyType, setOfflineEmergencyType] = useState('agua');
  const [offlineEmergencyDesc, setOfflineEmergencyDesc] = useState('');
  const [offlineEmergencyUrgency, setOfflineEmergencyUrgency] = useState<'alta' | 'media' | 'baja'>('alta');

  const handleCreateOfflineEmergency = (e: React.FormEvent) => {
    e.preventDefault();
    if (!offlineEmergencyDesc.trim()) {
      alert('Por favor describe brevemente qué ayuda de emergencia necesitas.');
      return;
    }

    const typeLabels: Record<string, string> = {
      agua: 'Agua potable',
      medicina: 'Medicinas / Primeros Auxilios',
      electricidad: 'Electricidad / Linterna',
      adulto: 'Auxilio a Adulto Mayor',
      alimento: 'Alimentos de Emergencia',
      otro: 'Auxilio Vecinal Urgente'
    };

    const label = typeLabels[offlineEmergencyType] || 'Auxilio General';
    const newMsgId = `msg-${Math.random().toString(36).substring(2, 6)}`;

    const newEnvelope: OfflineEnvelope = {
      id: newMsgId,
      type: 'help_request',
      title: `Solicitud de ayuda · ${label}`,
      description: offlineEmergencyDesc.trim(),
      createdAt: new Date().toISOString(),
      timeAgo: 'Justo ahora',
      status: 'local',
      step: 'guardado',
      hops: 1,
      hopLimit: 5,
      expiresIn: 'Caduca en 24 h',
      statusText: 'Guardado de forma segura en este teléfono',
      statusSubtext: 'Paquete sellado localmente. Iniciando transmisión automática por BLE...'
    };

    setOfflineQueue(prev => [newEnvelope, ...prev]);

    // Añadir a las solicitudes vecinales de la app
    const newReq: HelpRequest = {
      id: `req-${Date.now()}`,
      title: `Auxilio Emergencia (${label})`,
      authorName: currentUser?.name || userName,
      authorId: currentUser?.documentNumber || 'usr-local',
      type: (offlineEmergencyType === 'medicina' ? 'otro' : offlineEmergencyType === 'adulto' ? 'cuidado' : offlineEmergencyType) as any,
      description: offlineEmergencyDesc.trim(),
      urgency: offlineEmergencyUrgency,
      neighborhood: selectedNeighborhood,
      status: 'abierta',
      date: 'Recién publicado (Offline BLE)',
      isOfflineCreated: true,
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      chatThreadId: `chat-${Date.now()}`
    };
    setHelpRequests(prev => [newReq, ...prev]);

    setOfflineEmergencyDesc('');
    setIsOfflineHelpModalOpen(false);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [homeSearchQuery, setHomeSearchQuery] = useState('');
  const [confirmedPostIds, setConfirmedPostIds] = useState<string[]>([]);
  const [helpedRequestIds, setHelpedRequestIds] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Pestaña en Mis Solicitudes (3 opciones: En curso, Pedidos recibidos, Historial)
  const [requestsTab, setRequestsTab] = useState<'current' | 'received' | 'history'>('current');

  // Modal Calificar Servicio (Boceto 15)
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [rateScore, setRateScore] = useState(5);
  const [rateComment, setRateComment] = useState('');
  const [rateTags, setRateTags] = useState<string[]>(['Puntual', 'Trabajo impecable']);

  // Modals de Publicar
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);

  const [newHelp, setNewHelp] = useState({
    type: 'agua', description: '', urgency: 'alta', expiresHours: 24, customExpiresAt: ''
  });
  const [newNotice, setNewNotice] = useState({
    title: '', category: 'general', body: '', expiresHours: 24, customExpiresAt: ''
  });
  const [newService, setNewService] = useState({
    title: '', categoryId: 'electricidad', description: '', priceAmount: 35, priceType: 'fixed' as 'fixed' | 'quote', coverageArea: 'Radio 2 km'
  });
  // Modal de Prórroga / Extender vigencia
  const [extendModalItem, setExtendModalItem] = useState<{
    id: string; type: 'aviso' | 'ayuda' | 'actividad'; title: string; currentExpiresAt?: string;
  } | null>(null);

  // Estados del Chat Comunitario estilo WhatsApp
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>(INITIAL_CHAT_MESSAGES);
  const [activeChatThread, setActiveChatThread] = useState<{
    id: string; title: string; subtitle: string; itemType: 'aviso' | 'ayuda' | 'actividad';
  } | null>(null);
  const [joinedChats, setJoinedChats] = useState<string[]>(['chat-post-1', 'chat-help-1']);
  const [chatInputText, setChatInputText] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [isChatInfoOpen, setIsChatInfoOpen] = useState(false);
  const [isConfirmLeaveChatOpen, setIsConfirmLeaveChatOpen] = useState(false);
  const [isDeleteMsgDialogOpen, setIsDeleteMsgDialogOpen] = useState(false);
  const [deleteConfirmMode, setDeleteConfirmMode] = useState<'me' | 'everyone' | null>(null);
  const [pendingChatMedia, setPendingChatMedia] = useState<{ url: string; type: 'image' | 'video'; name: string } | null>(null);
  const [chatLightboxMedia, setChatLightboxMedia] = useState<string | null>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggeredRef = useRef(false);
  const [pinnedMessages, setPinnedMessages] = useState<Record<string, string>>({
    'chat-post-1': 'msg-p1-1',
    'chat-post-2': 'msg-p2-1',
    'chat-act-1': 'msg-a1-1'
  });

  // Centro de Notificaciones y Permiso del Teléfono
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [hasNotificationPermission, setHasNotificationPermission] = useState(false);

  // Estados para solicitar servicio (Boceto 08)
  const [requestDesc, setRequestDesc] = useState('');
  const [requestPhotos, setRequestPhotos] = useState<string[]>([]);
  const [requestAddress, setRequestAddress] = useState('');
  const [requestScheduleMode, setRequestScheduleMode] = useState<'asap' | 'scheduled'>('asap');
  const [requestScheduledDateTime, setRequestScheduledDateTime] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sincronización offline en curso
  const [isSyncing, setIsSyncing] = useState(false);
  const [userRole, setUserRole] = useState<'vecino' | 'proveedor'>('vecino');

  // Función para obtener la ubicación real y resolver el nombre del barrio sin mostrar coordenadas crudas
  const fetchRealLocation = useCallback(async () => {
    if (!('geolocation' in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserCoords([lat, lng]);

        let resolvedName = '';
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
            { headers: { 'Accept-Language': 'es' } }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const local = addr.suburb || addr.neighbourhood || addr.residential || addr.road || addr.city_district || addr.quarter;
            const city = addr.city || addr.town || addr.county || 'Lima';
            if (local) {
              resolvedName = `${local}, ${city}`;
            }
          }
        } catch {}

        // Fallback inteligente para distritos de Lima si no hay conexión de geocoding
        if (!resolvedName) {
          if (lat < -12.08 && lat > -12.13 && lng < -76.98 && lng > -77.03) {
            resolvedName = 'Ciclovía Malachowsky, San Borja';
          } else if (lat < -11.94 && lat > -12.05 && lng < -76.95 && lng > -77.05) {
            resolvedName = 'Sector Central, San Juan de Lurigancho';
          } else if (lat < -12.11 && lat > -12.17 && lng < -76.96 && lng > -77.03) {
            resolvedName = 'Chacarilla, Santiago de Surco';
          } else if (lat < -12.10 && lat > -12.14 && lng < -77.02 && lng > -77.05) {
            resolvedName = 'Reducto, Miraflores';
          } else {
            resolvedName = 'Ciclovía Malachowsky, San Borja';
          }
        }

        setRealLocationName(resolvedName);
        if (currentUser) {
          setCurrentUser(prev => prev ? { ...prev, neighborhood: resolvedName } : null);
        }
      },
      () => {
        setRealLocationName('Ciclovía Malachowsky, San Borja');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  }, [currentUser]);

  useEffect(() => {
    fetchRealLocation();
  }, [fetchRealLocation]);

  // Verificar permisos reales de notificación en el teléfono al iniciar
  useEffect(() => {
    LocalNotifications.checkPermissions()
      .then(res => {
        if (res.display === 'granted') {
          setHasNotificationPermission(true);
        }
      })
      .catch(() => {
        if ('Notification' in window && Notification.permission === 'granted') {
          setHasNotificationPermission(true);
        }
      });
  }, []);

  // Carga inicial y sincronización con Backend FastAPI
  useEffect(() => {
    const syncWithBackend = async () => {
      try {
        const backendOnline = await api.isOnline();
        if (!backendOnline) return;

        const remoteServices = await api.getServices();
        if (remoteServices && remoteServices.length > 0) {
          const mapped: ServiceItem[] = remoteServices.map((s: any) => ({
            id: String(s.id),
            providerId: String(s.provider_id),
            providerName: s.provider_name || 'Proveedor Verificado',
            categoryId: s.category_name ? s.category_name.toLowerCase().replace(/\s+/g, '_') : 'electricidad',
            title: s.title,
            description: s.description,
            priceType: s.price_type === 'fixed' ? 'fixed' : 'quote',
            priceAmount: s.price_amount ? Number(s.price_amount) : undefined,
            neighborhood: s.coverage_area || 'Lima, Perú',
            rating: s.rating_avg || 4.9,
            reviewCount: s.rating_count || 12,
            jobsCompleted: s.jobs_completed || 15,
            coverageArea: s.coverage_area || 'Radio 3 km',
            status: s.status === 'published' ? 'published' : 'paused'
          }));
          setServices(prev => {
            const remoteIds = new Set(mapped.map(m => m.id));
            return [...mapped, ...prev.filter(p => !remoteIds.has(p.id))];
          });
        }

        const remotePosts = await api.getCommunityPosts();
        if (remotePosts && remotePosts.length > 0) {
          const mappedPosts: CommunityPost[] = remotePosts.map((p: any) => ({
            id: String(p.id),
            authorName: p.author_name || 'Comunidad Vecinal',
            category: p.category || 'general',
            title: p.title,
            body: p.body,
            neighborhood: p.neighborhood_name || 'Sector Central',
            verificationStatus: p.verification_status || 'corroborado',
            date: 'Hoy',
            corroborations: p.corroborations || 6
          }));
          setCommunityPosts(prev => {
            const pIds = new Set(mappedPosts.map((mp: any) => mp.id));
            return [...mappedPosts, ...prev.filter(p => !pIds.has(p.id))];
          });
        }
      } catch {
        console.log('Backend no disponible, ejecutando en modo local/offline');
      }
    };
    syncWithBackend();
  }, []);

  // Animación fluida de precarga en Splash de bienvenida (Boceto 01)
  useEffect(() => {
    if (view !== 'welcome') return;

    setIsResourcesLoaded(false);
    setLoadingProgress(15);
    setLoadingStageText('Verificando base de datos local...');

    const t1 = setTimeout(() => {
      setLoadingProgress(45);
      setLoadingStageText('Cargando oficios y directorio vecinal...');
    }, 450);

    const t2 = setTimeout(() => {
      setLoadingProgress(80);
      setLoadingStageText('Iniciando protocolo de resiliencia y modo offline...');
    }, 950);

    const t3 = setTimeout(() => {
      setLoadingProgress(100);
      setLoadingStageText('¡Recursos listos para usar!');
      setIsResourcesLoaded(true);
    }, 1500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [view]);

  const selectedNeighborhood = realLocationName || (currentUser?.neighborhood || 'Ciclovía Malachowsky, San Borja');
  const userName = currentUser?.name || 'María';
  const userInitial = userName.charAt(0).toUpperCase();

  const viewRef = useRef(view);
  viewRef.current = view;

  const previousViewRef = useRef<ViewType>('home');

  const modalsRef = useRef({
    isAuthModalOpen,
    isTutorialActive,
    isFavoritesModalOpen,
    isHelpModalOpen,
    isServiceModalOpen,
    isRateModalOpen,
    isNoticeModalOpen,
    activeChatThread,
    isChatInfoOpen,
    isConfirmLeaveChatOpen,
    isDeleteMsgDialogOpen,
    deleteConfirmMode,
    selectedMessageId,
    chatLightboxMedia,
    isNotificationsOpen,
    extendModalItem
  });
  modalsRef.current = {
    isAuthModalOpen,
    isTutorialActive,
    isFavoritesModalOpen,
    isHelpModalOpen,
    isServiceModalOpen,
    isRateModalOpen,
    isNoticeModalOpen,
    activeChatThread,
    isChatInfoOpen,
    isConfirmLeaveChatOpen,
    isDeleteMsgDialogOpen,
    deleteConfirmMode,
    selectedMessageId,
    chatLightboxMedia,
    isNotificationsOpen,
    extendModalItem
  };

  const navigateTo = (nextView: ViewType) => {
    if (view !== nextView) {
      previousViewRef.current = view;
      if (nextView === 'request-form' && !requestAddress) {
        setRequestAddress(selectedNeighborhood || 'Ciclovía Malachowsky, San Borja');
      }
      setView(nextView);
    }
  };

  const handleBack = useCallback(() => {
    const {
      isAuthModalOpen, isTutorialActive, isFavoritesModalOpen, isHelpModalOpen, isServiceModalOpen,
      isRateModalOpen, isNoticeModalOpen, activeChatThread,
      isChatInfoOpen, isConfirmLeaveChatOpen, isDeleteMsgDialogOpen,
      deleteConfirmMode, selectedMessageId,
      chatLightboxMedia, isNotificationsOpen, extendModalItem
    } = modalsRef.current;
    if (chatLightboxMedia) { setChatLightboxMedia(null); return; }
    if (deleteConfirmMode) { setDeleteConfirmMode(null); return; }
    if (isDeleteMsgDialogOpen) { setIsDeleteMsgDialogOpen(false); return; }
    if (isConfirmLeaveChatOpen) { setIsConfirmLeaveChatOpen(false); return; }
    if (isChatInfoOpen) { setIsChatInfoOpen(false); return; }
    if (selectedMessageId) { setSelectedMessageId(null); return; }
    if (activeChatThread) { setActiveChatThread(null); return; }
    if (isTutorialActive) { setIsTutorialActive(false); return; }
    if (isFavoritesModalOpen) { setIsFavoritesModalOpen(false); return; }
    if (isNotificationsOpen) { setIsNotificationsOpen(false); return; }
    if (extendModalItem) { setExtendModalItem(null); return; }
    if (isRateModalOpen) { setIsRateModalOpen(false); return; }
    if (isNoticeModalOpen) { setIsNoticeModalOpen(false); return; }
    if (isHelpModalOpen) { setIsHelpModalOpen(false); return; }
    if (isServiceModalOpen) { setIsServiceModalOpen(false); return; }
    if (isAuthModalOpen) { setIsAuthModalOpen(false); return; }

    const current = viewRef.current;
    if (current === 'pro-detail') {
      setView('explore');
    } else if (current === 'request-form') {
      setView('pro-detail');
    } else if (current === 'tracking') {
      setView('requests');
    } else if (current === 'offline') {
      setView('home');
    } else if (current === 'explore' || current === 'requests' || current === 'map' || current === 'profile') {
      setView('home');
    } else {
      try {
        CapApp.exitApp();
      } catch {}
    }
  }, []);

  useEffect(() => {
    let sub: any;
    try {
      sub = CapApp.addListener('backButton', () => {
        handleBack();
      });
    } catch {}

    return () => {
      if (sub && typeof sub.remove === 'function') {
        sub.remove();
      }
    };
  }, [handleBack]);

  const handleLogin = (user: { name: string; documentNumber: string; neighborhood: string; district: string }) => {
    setCurrentUser(user);
    setIsAuthModalOpen(false);
  };

  // Crear servicio
  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newService.title.trim()) return;

    const isFixed = newService.priceType === 'fixed';
    const finalPrice = isFixed ? (Number(newService.priceAmount) || 35) : undefined;

    const newItem: ServiceItem = {
      id: `srv-${Date.now()}`,
      providerId: currentUser?.documentNumber || 'usr-me',
      providerName: `${userName} (Tú)`,
      categoryId: newService.categoryId,
      title: newService.title,
      description: newService.description,
      priceType: newService.priceType,
      priceAmount: finalPrice,
      neighborhood: selectedNeighborhood,
      rating: 5.0,
      reviewCount: 1,
      jobsCompleted: 1,
      coverageArea: newService.coverageArea,
      status: 'published'
    };

    setServices([newItem, ...services]);
    setIsServiceModalOpen(false);
    setNewService({ title: '', categoryId: 'electricidad', description: '', priceAmount: 35, priceType: 'fixed', coverageArea: 'Radio 2 km' });

    try {
      if (isOnline) {
        await api.createService({
          title: newItem.title,
          category_id: 1,
          description: newItem.description,
          price_type: newItem.priceType,
          price_amount: newItem.priceAmount
        });
      }
    } catch {}
    alert(isFixed ? 'Tu servicio con precio fijo ha sido publicado para tus vecinos.' : 'Tu servicio con cotización en el lugar ha sido publicado para tus vecinos.');
  };

  // Helper para calcular y formatear tiempo restante
  const formatTimeRemaining = (isoString?: string) => {
    if (!isoString) return 'Vigente';
    const diff = new Date(isoString).getTime() - Date.now();
    if (diff <= 0) return 'Vencido';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 1) return `Vence en ${days} días`;
    if (hours > 1) return `Vence en ${hours} h`;
    const minutes = Math.floor(diff / (1000 * 60));
    return `Vence en ${Math.max(1, minutes)} min`;
  };

  // Prórroga / Extender vigencia de publicación
  const handleExtendItem = (id: string, type: 'aviso' | 'ayuda' | 'actividad', additionalHours: number) => {
    const addMs = additionalHours * 60 * 60 * 1000;
    if (type === 'aviso') {
      setCommunityPosts(prev => prev.map(p => {
        if (p.id !== id) return p;
        const currentBase = p.expiresAt && new Date(p.expiresAt).getTime() > Date.now()
          ? new Date(p.expiresAt).getTime()
          : Date.now();
        return { ...p, expiresAt: new Date(currentBase + addMs).toISOString() };
      }));
    } else if (type === 'ayuda') {
      setHelpRequests(prev => prev.map(h => {
        if (h.id !== id) return h;
        const currentBase = h.expiresAt && new Date(h.expiresAt).getTime() > Date.now()
          ? new Date(h.expiresAt).getTime()
          : Date.now();
        return { ...h, expiresAt: new Date(currentBase + addMs).toISOString() };
      }));
    } else if (type === 'actividad') {
      setActivities(prev => prev.map(a => {
        if (a.id !== id) return a;
        const currentBase = a.expiresAt && new Date(a.expiresAt).getTime() > Date.now()
          ? new Date(a.expiresAt).getTime()
          : Date.now();
        return { ...a, expiresAt: new Date(currentBase + addMs).toISOString() };
      }));
    }
    setExtendModalItem(null);
    alert(`Publicación prorrogada por ${additionalHours} horas más.`);
  };

  // Crear solicitud de ayuda solidaria (Boceto 12)
  const handleCreateHelp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHelp.description.trim()) return;

    const expiresHours = newHelp.expiresHours || 24;
    const expiresAt = newHelp.customExpiresAt
      ? new Date(newHelp.customExpiresAt).toISOString()
      : new Date(Date.now() + expiresHours * 3600 * 1000).toISOString();

    const threadId = `chat-help-${Date.now()}`;
    const newReq: HelpRequest = {
      id: `help-${Date.now()}`,
      authorName: userName,
      authorId: currentUser?.documentNumber || 'usr-me',
      type: newHelp.type as any,
      description: newHelp.description,
      urgency: newHelp.urgency as any,
      neighborhood: selectedNeighborhood,
      status: 'abierta',
      date: 'Recién publicado',
      expiresAt,
      chatThreadId: threadId
    };

    setHelpRequests([newReq, ...helpRequests]);
    setIsHelpModalOpen(false);
    setNewHelp({ type: 'agua', description: '', urgency: 'alta', expiresHours: 24, customExpiresAt: '' });

    if (!isOnline) {
      setOfflineQueue(prev => [
        {
          id: `msg-${Date.now().toString(36)}`,
          type: 'help_request',
          title: `Solicitud de ayuda · ${newReq.title}`,
          description: newReq.description,
          timeAgo: 'Justo ahora',
          payload: newReq,
          createdAt: new Date().toISOString(),
          status: 'local',
          step: 'guardado',
          hops: 1,
          hopLimit: 5,
          expiresIn: 'Caduca en 24 h',
          statusText: 'Guardado de forma segura en este teléfono',
          statusSubtext: 'Paquete sellado localmente. Iniciando transmisión automática por BLE...'
        },
        ...prev
      ]);
      alert('Pedido guardado en este teléfono. Se transmitirá por malla BLE cuando haya dispositivos cercanos.');
    } else {
      alert('Tu pedido de ayuda solidaria ha sido enviado al vecindario.');
    }
  };

  // Crear nuevo aviso comunitario (Boceto 13)
  const handleCreateNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotice.title.trim() || !newNotice.body.trim()) return;

    const expiresHours = newNotice.expiresHours || 24;
    const expiresAt = newNotice.customExpiresAt
      ? new Date(newNotice.customExpiresAt).toISOString()
      : new Date(Date.now() + expiresHours * 3600 * 1000).toISOString();

    const threadId = `chat-post-${Date.now()}`;
    const post: CommunityPost = {
      id: `post-${Date.now()}`,
      authorName: `${userName} (Tú)`,
      authorId: currentUser?.documentNumber || 'usr-me',
      category: newNotice.category as any,
      title: newNotice.title,
      body: newNotice.body,
      neighborhood: selectedNeighborhood,
      verificationStatus: 'reportado',
      date: 'Recién publicado',
      corroborations: 1,
      expiresAt,
      chatThreadId: threadId
    };

    setCommunityPosts([post, ...communityPosts]);
    setIsNoticeModalOpen(false);
    setNewNotice({ title: '', category: 'general', body: '', expiresHours: 24, customExpiresAt: '' });
    alert('Aviso publicado en la comunidad.');
  };

  // Handlers para Chat Comunitario estilo WhatsApp Auténtico
  const handleOpenChat = (threadId: string, title: string, subtitle: string, itemType: 'aviso' | 'ayuda' | 'actividad') => {
    setActiveChatThread({ id: threadId, title, subtitle, itemType });
    setSelectedMessageId(null);
    setEditingMessageId(null);
    setIsChatInfoOpen(false);
    setIsConfirmLeaveChatOpen(false);
    setIsDeleteMsgDialogOpen(false);
    setDeleteConfirmMode(null);
    setPendingChatMedia(null);
    setHighlightedMsgId(null);
  };

  // Buscar y desplazarse hasta el mensaje fijado al hacer clic en el banner amarillo
  const handleScrollToMessage = (msgId: string) => {
    const el = document.getElementById(`chat-msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMsgId(msgId);
      setTimeout(() => {
        setHighlightedMsgId(null);
      }, 2000);
    }
  };

  const handleJoinChat = (threadId: string) => {
    if (!joinedChats.includes(threadId)) {
      setJoinedChats(prev => [...prev, threadId]);
      alert('Te has unido al chat vecinal. Ahora podrás participar y coordinar directamente.');
    }
  };

  const handleLeaveChat = (threadId: string) => {
    setJoinedChats(prev => prev.filter(id => id !== threadId));
    alert('Has salido del chat vecinal.');
  };

  // Pulsación prolongada estilo WhatsApp (~400ms para seleccionar mensaje)
  const handleBubblePressStart = (msgId: string) => {
    isLongPressTriggeredRef.current = false;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      setSelectedMessageId(msgId);
      if (navigator.vibrate) {
        try { navigator.vibrate(40); } catch {}
      }
    }, 400);
  };

  const handleBubblePressEnd = (msgId: string) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (!isLongPressTriggeredRef.current) {
      if (selectedMessageId) {
        if (selectedMessageId === msgId) {
          setSelectedMessageId(null);
        } else {
          setSelectedMessageId(msgId);
        }
      }
    }
  };

  const handleBubblePressCancel = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Adjuntar fotos y videos al chat
  const handleChatMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video');
    const reader = new FileReader();
    reader.onload = () => {
      setPendingChatMedia({
        url: reader.result as string,
        type: isVideo ? 'video' : 'image',
        name: file.name
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeChatThread) return;
    if (!chatInputText.trim() && !pendingChatMedia) return;

    const timeLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const currentUserId = currentUser?.documentNumber || 'usr-me';

    if (editingMessageId) {
      setChatMessages(prev => {
        const list = prev[activeChatThread.id] || [];
        return {
          ...prev,
          [activeChatThread.id]: list.map(m => m.id === editingMessageId ? {
            ...m,
            text: chatInputText.trim(),
            isEdited: true,
            editedAt: timeLabel
          } : m)
        };
      });
      setEditingMessageId(null);
      setChatInputText('');
      return;
    }

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      threadId: activeChatThread.id,
      senderId: currentUserId,
      senderName: `${userName} (Tú)`,
      senderRole: 'vecino',
      text: chatInputText.trim(),
      createdAt: new Date().toISOString(),
      timestampLabel: timeLabel,
      mediaUrl: pendingChatMedia?.url,
      mediaType: pendingChatMedia?.type
    };

    setChatMessages(prev => ({
      ...prev,
      [activeChatThread.id]: [...(prev[activeChatThread.id] || []), newMsg]
    }));

    if (!joinedChats.includes(activeChatThread.id)) {
      setJoinedChats(prev => [...prev, activeChatThread.id]);
    }

    setChatInputText('');
    setPendingChatMedia(null);
    setSelectedMessageId(null);
  };

  const handlePinMessage = (threadId: string, msgId: string) => {
    setPinnedMessages(prev => {
      if (prev[threadId] === msgId) {
        const next = { ...prev };
        delete next[threadId];
        return next;
      }
      return { ...prev, [threadId]: msgId };
    });
    setSelectedMessageId(null);
  };

  const handleStartEdit = (msg: ChatMessage) => {
    setEditingMessageId(msg.id);
    setChatInputText(msg.text);
    setSelectedMessageId(null);
  };

  const handleDeleteMessage = (msgId: string, mode: 'me' | 'everyone') => {
    if (!activeChatThread) return;
    const currentUserId = currentUser?.documentNumber || 'usr-me';

    setChatMessages(prev => {
      const list = prev[activeChatThread.id] || [];
      return {
        ...prev,
        [activeChatThread.id]: list.map(m => {
          if (m.id !== msgId) return m;
          if (mode === 'everyone') {
            return {
              ...m,
              deletedForEveryone: true,
              text: 'Este mensaje fue eliminado'
            };
          } else {
            return {
              ...m,
              deletedForUserIds: [...(m.deletedForUserIds || []), currentUserId]
            };
          }
        })
      };
    });
    setSelectedMessageId(null);
  };

  // Handlers para Notificaciones y Permisos
  const handleRequestNotificationPermission = async () => {
    try {
      const res = await LocalNotifications.requestPermissions();
      if (res.display === 'granted') {
        setHasNotificationPermission(true);
        await LocalNotifications.schedule({
          notifications: [
            {
              id: 101,
              title: 'Ayni Vecinal',
              body: '¡Notificaciones activadas en el teléfono! Recibirás alertas vecinales en tiempo real.',
              schedule: { at: new Date(Date.now() + 500) }
            }
          ]
        });
        alert('¡Notificaciones activadas en el teléfono con éxito!');
        return;
      }
    } catch {}

    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        setHasNotificationPermission(true);
        new Notification('Ayni Vecinal', {
          body: '¡Notificaciones activadas! Te avisaremos de emergencias y mensajes en tu sector.',
          icon: '/Ayni logo.png'
        });
        alert('¡Notificaciones web concedidas con éxito!');
      } else {
        alert('No se otorgaron permisos de notificación en el navegador.');
      }
    }
  };

  const handleTestNotification = async () => {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Date.now() % 100000,
            title: '🚨 Alerta Comunitaria: Prueba de Notificación',
            body: 'Ayni: El sistema de avisos vecinales y segundo plano funciona correctamente.',
            schedule: { at: new Date(Date.now() + 500) }
          }
        ]
      });
    } catch {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🚨 Alerta Comunitaria: Prueba', {
          body: 'Ayni: El sistema de avisos vecinales funciona correctamente.',
          icon: '/Ayni logo.png'
        });
      }
    }
    alert('Notificación de prueba enviada a tu dispositivo.');
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Helper para fecha mínima permitida (ahora mismo)
  const getMinDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setRequestPhotos(prev => [...prev, ev.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    setRequestPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleScheduleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) {
      setRequestScheduledDateTime('');
      return;
    }
    const selected = new Date(val).getTime();
    const now = new Date().getTime();
    if (selected < now - 60000) {
      alert('No puedes seleccionar una fecha u horario que ya pasó. Por favor elige un horario futuro.');
      setRequestScheduledDateTime(getMinDateTime());
      return;
    }
    setRequestScheduledDateTime(val);
  };

  // Solicitar contratación de servicio (Boceto 08)
  const handleRequestService = () => {
    if (!selectedService) return;

    if (requestScheduleMode === 'scheduled') {
      if (!requestScheduledDateTime) {
        alert('Por favor selecciona una fecha y horario para programar tu servicio.');
        return;
      }
      const selected = new Date(requestScheduledDateTime).getTime();
      const now = new Date().getTime();
      if (selected < now - 60000) {
        alert('La fecha u hora seleccionada ya pasó. Por favor elige una fecha futura.');
        setRequestScheduledDateTime(getMinDateTime());
        return;
      }
    }

    const effectiveAddress = requestAddress.trim() || selectedNeighborhood || 'Ciclovía Malachowsky, San Borja';
    const scheduleDisplay = requestScheduleMode === 'asap'
      ? 'Hoy lo antes posible'
      : new Date(requestScheduledDateTime).toLocaleDateString('es-PE', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

    const nowFormatted = 'Hoy, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newBk: Booking = {
      id: `bk-${Date.now()}`,
      serviceId: selectedService.id,
      serviceTitle: selectedService.title,
      clientId: currentUser?.documentNumber || 'usr-me',
      clientName: userName,
      providerId: selectedService.providerId,
      providerName: selectedService.providerName,
      status: 'en_revision', // Inicia en revisión: el profesional debe decidir si acepta o rechaza
      date: nowFormatted,
      hasReview: false,
      notes: requestDesc.trim() || 'Servicio estándar solicitado desde la app.',
      address: effectiveAddress,
      scheduledDate: scheduleDisplay,
      photos: [...requestPhotos],
      timeline: {
        sentAt: nowFormatted,
        reviewedAt: nowFormatted
      }
    };

    setBookings([newBk, ...bookings]);
    setSelectedBooking(newBk);
    setRequestDesc('');
    setRequestPhotos([]);
    setRequestScheduleMode('asap');
    setRequestScheduledDateTime('');
    navigateTo('tracking');
  };

  // Acciones de decisión del profesional (Simulación / Apartado)
  const handleAcceptBooking = (bkId: string) => {
    const timeNow = 'Hoy, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setBookings(prev => prev.map(b => {
      if (b.id !== bkId) return b;
      const updated: Booking = {
        ...b,
        status: 'en_camino',
        timeline: {
          ...b.timeline,
          sentAt: b.timeline?.sentAt || timeNow,
          reviewedAt: b.timeline?.reviewedAt || timeNow,
          acceptedAt: timeNow,
          onTheWayAt: timeNow
        }
      };
      if (selectedBooking?.id === bkId) {
        setSelectedBooking(updated);
      }
      return updated;
    }));
    alert('¡Encargo aceptado! Has confirmado el servicio. El cliente ha sido notificado y el profesional se encuentra en camino.');
  };

  const handleRejectBooking = (bkId: string) => {
    const reason = window.prompt(
      'Motivo del rechazo de solicitud (visible para el vecino):',
      'El profesional no cuenta con disponibilidad en el horario solicitado.'
    );
    if (reason === null) return;

    setBookings(prev => prev.map(b => {
      if (b.id !== bkId) return b;
      const updated: Booking = {
        ...b,
        status: 'rechazado',
        rejectionReason: reason.trim() || 'Horario no disponible'
      };
      if (selectedBooking?.id === bkId) {
        setSelectedBooking(updated);
      }
      return updated;
    }));
  };

  const handleAdvanceBookingStatus = (bkId: string, nextStatus: 'en_camino' | 'en_proceso' | 'completado') => {
    const timeNow = 'Hoy, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setBookings(prev => prev.map(b => {
      if (b.id !== bkId) return b;
      const updated: Booking = {
        ...b,
        status: nextStatus,
        timeline: {
          ...b.timeline,
          sentAt: b.timeline?.sentAt || timeNow,
          inProgressAt: nextStatus === 'en_proceso' ? timeNow : b.timeline?.inProgressAt
        }
      };
      if (selectedBooking?.id === bkId) {
        setSelectedBooking(updated);
      }
      return updated;
    }));
  };

  // Enviar calificación
  const handleSubmitRating = () => {
    if (selectedBooking) {
      setBookings(bookings.map(b => b.id === selectedBooking.id ? { ...b, hasReview: true, status: 'completado' } : b));
    }
    setIsRateModalOpen(false);
    alert('Muchas gracias. Tu reseña ayuda a fortalecer la confianza vecinal.');
  };

  // Disparar sincronización offline BLE
  const handleSyncOffline = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setOfflineQueue([]);
      alert('Sincronización exitosa: Se sincronizaron los paquetes con la red vecinal y el servidor central.');
    }, 1800);
  };

  // Participar en actividad comunitaria
  const handleToggleActivity = (id: string) => {
    setActivities(activities.map(act => {
      if (act.id === id) {
        const nextJoined = !act.joined;
        return {
          ...act,
          joined: nextJoined,
          participantsCount: nextJoined ? act.participantsCount + 1 : act.participantsCount - 1
        };
      }
      return act;
    }));
  };

  // Manejador de confirmación / corroboración de avisos
  const handleToggleConfirmNotice = (postId: string) => {
    if (confirmedPostIds.includes(postId)) {
      setConfirmedPostIds(prev => prev.filter(id => id !== postId));
      setCommunityPosts(communityPosts.map(p => p.id === postId ? {
        ...p,
        corroborations: Math.max(0, p.corroborations - 1)
      } : p));
    } else {
      setConfirmedPostIds(prev => [...prev, postId]);
      setCommunityPosts(communityPosts.map(p => p.id === postId ? {
        ...p,
        corroborations: p.corroborations + 1,
        verificationStatus: 'corroborado'
      } : p));
    }
  };

  // Manejador para brindar auxilio solidario
  const handleOfferHelp = (reqId: string) => {
    setHelpedRequestIds(prev => [...prev, reqId]);
    setHelpRequests(helpRequests.map(h => h.id === reqId ? { ...h, status: 'en_coordinacion', helperName: userName } : h));
    alert('Muchas gracias por solidarizarte con tu vecino. Ahora puedes coordinar la ayuda por el chat vecinal.');
  };

  // Filtros contextuales para la pantalla de Inicio
  const homeFilteredPosts = communityPosts
    .filter(post => !post.expiresAt || new Date(post.expiresAt).getTime() > Date.now())
    .filter(post => {
      if (!homeSearchQuery.trim()) return true;
      const q = homeSearchQuery.toLowerCase();
      return (
        post.title.toLowerCase().includes(q) ||
        post.body.toLowerCase().includes(q) ||
        post.authorName.toLowerCase().includes(q) ||
        post.neighborhood.toLowerCase().includes(q)
      );
    });

  const homeFilteredHelp = helpRequests
    .filter(req => !req.expiresAt || new Date(req.expiresAt).getTime() > Date.now())
    .filter(req => {
      if (!homeSearchQuery.trim()) return true;
      const q = homeSearchQuery.toLowerCase();
      return (
        req.description.toLowerCase().includes(q) ||
        req.authorName.toLowerCase().includes(q) ||
        req.neighborhood.toLowerCase().includes(q) ||
        req.type.toLowerCase().includes(q)
      );
    });

  const homeFilteredServices = services.filter(srv => {
    if (!homeSearchQuery.trim()) return true;
    const q = homeSearchQuery.toLowerCase();
    return (
      srv.title.toLowerCase().includes(q) ||
      srv.providerName.toLowerCase().includes(q) ||
      srv.coverageArea.toLowerCase().includes(q) ||
      (srv.description && srv.description.toLowerCase().includes(q))
    );
  });

  const homeFilteredActivities = activities
    .filter(act => !act.expiresAt || new Date(act.expiresAt).getTime() > Date.now())
    .filter(act => {
      if (!homeSearchQuery.trim()) return true;
      const q = homeSearchQuery.toLowerCase();
      return (
        act.title.toLowerCase().includes(q) ||
        act.description.toLowerCase().includes(q) ||
        act.organizer.toLowerCase().includes(q) ||
        act.badge.toLowerCase().includes(q)
      );
    });

  const filteredServices = services.filter(s => {
    const matchCat = selectedCategory === 'all' || s.categoryId === selectedCategory;
    const matchQuery = !searchQuery.trim() ||
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.providerName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchQuery;
  });

  const openProDetail = (srv: ServiceItem) => {
    setSelectedService(srv);
    navigateTo('pro-detail');
  };

  // Ícono de categoría para Boceto 05
  const renderCategoryIcon = (catId: string) => {
    switch (catId) {
      case 'electricidad': return <Zap size={20} color="#F59E0B" />;
      case 'gasfiteria': return <Wrench size={20} color="#3B82F6" />;
      case 'carpinteria': return <Hammer size={20} color="#EA580C" />;
      case 'limpieza': return <Sparkles size={20} color="#2E9D72" />;
      case 'educacion': return <GraduationCap size={20} color="#7C3AED" />;
      case 'comida': return <Utensils size={20} color="#FF875C" />;
      default: return <MoreHorizontal size={20} color="#6B7280" />;
    }
  };

  // Ícono de aviso según categoría (Boceto 13)
  const renderNoticeIcon = (category: string) => {
    switch (category) {
      case 'corte_agua': return <Droplet size={18} color="#3B82F6" />;
      case 'corte_luz': return <Zap size={18} color="#F59E0B" />;
      case 'seguridad': return <Shield size={18} color="#D83B35" />;
      default: return <Megaphone size={18} color="#FF875C" />;
    }
  };

  // ============================ RENDER ============================
  return (
    <div className={`phone ${isDarkMode ? 'dark-theme' : ''}`}>

      {/* ========== WELCOME SCREEN / CARGA INICIAL (Boceto 01) ========== */}
      {view === 'welcome' && (
        <div className="welcome-screen">
          <div className="welcome-rings">
            <div className="wr red" />
            <div className="wr gold" />
          </div>
          <div className="welcome-wordmark">
            <span style={{ color: '#D83B35' }}>a</span>
            <span style={{ color: '#FF875C' }}>y</span>
            <span style={{ color: '#D83B35' }}>n</span>
            <span style={{ color: '#FF875C' }}>i</span>
          </div>
          <p className="welcome-tagline">
            “Hoy por ti, mañana por mí”
          </p>

          <div className="welcome-features">
            <div className="welcome-feat">
              <div className="welcome-feat-icon"><Users size={16} color="#D83B35" /></div>
              Colaboración y oficios vecinales
            </div>
            <div className="welcome-feat">
              <div className="welcome-feat-icon"><HeartHandshake size={16} color="#D83B35" /></div>
              Red solidaria y auxilio mutuo
            </div>
            <div className="welcome-feat">
              <div className="welcome-feat-icon"><ShieldCheck size={16} color="#D83B35" /></div>
              Reputación y confianza verificada
            </div>
            <div className="welcome-feat">
              <div className="welcome-feat-icon"><Radio size={16} color="#D83B35" /></div>
              Resiliencia y modo offline (BLE)
            </div>
          </div>

          <div style={{ width: '100%', maxWidth: 310, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {!isResourcesLoaded ? (
              <div className="welcome-loading-container">
                <div className="welcome-progress-bar">
                  <div className="welcome-progress-fill" style={{ width: `${loadingProgress}%` }} />
                </div>
                <div className="welcome-loading-info">
                  <span className="welcome-loading-text">{loadingStageText}</span>
                  <span className="welcome-loading-pct">{loadingProgress}%</span>
                </div>
              </div>
            ) : (
              <button
                className="btn btn-coral btn-block fade-in-btn"
                style={{ borderRadius: 'var(--radius-full)' }}
                onClick={() => {
                  setIsTutorialActive(true);
                }}
              >
                Comenzar tutorial
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========== HOME SCREEN (Guía exacta de imagen 2: Hola, María / ¿Qué necesitas hoy?) ========== */}
      {view === 'home' && (
        <>
          <header className="app-header">
            <div className="header-top">
              <div className="header-greeting">
                <div className="header-avatar">{userInitial}</div>
                <div className="greeting-text">
                  <h2>Hola, {userName.split(' ')[0]}</h2>
                  <div className="greeting-sub">¿Qué necesitas hoy?</div>
                </div>
              </div>
              <div className="header-icons">
                <button
                  className="icon-circle"
                  style={{ position: 'relative' }}
                  onClick={() => setIsNotificationsOpen(true)}
                  aria-label="Abrir centro de notificaciones"
                >
                  <Bell size={20} strokeWidth={2.2} color="var(--carbon)" />
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="notif-badge-pill">{notifications.filter(n => !n.read).length}</span>
                  )}
                </button>
              </div>
            </div>

            {/* Chip de Ubicación Oficial: Nombre limpio sin coordenadas numéricas */}
            <div
              className="loc-chip"
              onClick={() => navigateTo('map')}
              title="Tu barrio actual"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              <MapPin size={15} color="#D83B35" />
              <span>{selectedNeighborhood}</span>
            </div>
          </header>

          {/* Opciones de Comunidad (Avisos -> Ayuda -> Actividades) */}
          <div className="com-tabs-bar">
            <button
              className={`com-tab-pill ${communityTab === 'avisos' ? 'active' : ''}`}
              onClick={() => setCommunityTab('avisos')}
            >
              <Megaphone size={19} strokeWidth={2.2} />
              <span>Avisos ({communityPosts.length})</span>
            </button>
            <button
              className={`com-tab-pill ${communityTab === 'ayuda' ? 'active' : ''}`}
              onClick={() => setCommunityTab('ayuda')}
            >
              <HeartHandshake size={19} strokeWidth={2.2} />
              <span>Ayuda ({helpRequests.length})</span>
            </button>
            <button
              className={`com-tab-pill ${communityTab === 'actividades' ? 'active' : ''}`}
              onClick={() => setCommunityTab('actividades')}
            >
              <CalendarDays size={19} strokeWidth={2.2} />
              <span>Actividades ({activities.length})</span>
            </button>
          </div>

          {/* Banner de Modo Offline con enlace al Centro de Conectividad (Boceto 14) */}
          {!isOnline && (
            <div className="off-banner" onClick={() => navigateTo('offline')} style={{ cursor: 'pointer' }}>
              <Radio size={16} />
              <span>Sin Internet — Modo offline activado (Toca para ver malla BLE)</span>
            </div>
          )}

          <div className="body">
            <div className="body-pad">

              {/* ===== TAB 1: AVISOS (Boceto 13) ===== */}
              {communityTab === 'avisos' && (
                <div>
                  <div className="sec">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Megaphone size={19} color="#D83B35" />
                      Avisos de la comunidad
                    </h3>
                    <button className="sec-link" onClick={() => setIsNoticeModalOpen(true)}>+ Publicar</button>
                  </div>

                  {homeFilteredPosts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '36px 16px', background: 'var(--white)', borderRadius: 16, margin: '8px 0', border: '1px dashed #E5E7EB' }}>
                      <Megaphone size={32} color="#D1D5DB" style={{ marginBottom: 8 }} />
                      <p style={{ margin: 0, fontWeight: 700, color: 'var(--carbon)', fontSize: '0.92rem' }}>
                        No hay avisos vecinales activos en este momento
                      </p>
                      <button className="btn btn-outline btn-sm" style={{ marginTop: 10, borderColor: 'var(--coral)', color: 'var(--coral)' }} onClick={() => setIsNoticeModalOpen(true)}>
                        + Publicar aviso
                      </button>
                    </div>
                  ) : (
                    homeFilteredPosts.map(post => {
                      const isNoticeConfirmed = confirmedPostIds.includes(post.id) || (Boolean(post.authorId) && post.authorId === (currentUser?.documentNumber || 'usr-me')) || post.authorName.includes('(Tú)');
                      const chatCount = chatMessages[post.chatThreadId || `chat-${post.id}`]?.filter(m => !m.deletedForUserIds?.includes(currentUser?.documentNumber || 'usr-me')).length || 0;

                      return (
                        <div key={post.id} className="card card-community">
                          <div className="card-header-row">
                            <div className={`card-icon-box ${post.category === 'corte_agua' ? 'icon-box-water' : post.category === 'seguridad' ? 'icon-box-sec' : 'icon-box-warn'}`}>
                              {renderNoticeIcon(post.category)}
                            </div>
                            <div className="card-headline-group">
                              <h4 className="card-title">
                                {post.title}
                              </h4>
                              <div className="card-meta">
                                <span>{post.authorName}</span>
                                <span>·</span>
                                <span>{post.date}</span>
                              </div>
                            </div>
                          </div>

                          <div className="card-badges-row">
                            <span className={`badge-com ${post.verificationStatus === 'corroborado' ? 'badge-corroborado' : 'badge-reportado'}`}>
                              {post.verificationStatus === 'corroborado' ? (
                                <><CheckCircle2 size={12} /> Corroborado</>
                              ) : (
                                <><AlertTriangle size={12} /> Reportado</>
                              )}
                            </span>
                            {post.authorName.toLowerCase().includes('junta') && (
                              <span className="badge-com badge-oficial">
                                <ShieldCheck size={12} /> Oficial
                              </span>
                            )}
                          </div>

                          <p className="card-body-text">
                            {post.body}
                          </p>

                          <div className="card-actions-row">
                            <span className="card-actions-meta">
                              <Users size={14} color="var(--gray-500)" />
                              <span><strong>{post.corroborations}</strong> vecinos confirmaron</span>
                            </span>
                            {isNoticeConfirmed ? (
                              <button
                                type="button"
                                className="btn-confirmado-pill"
                                onClick={() => handleToggleConfirmNotice(post.id)}
                                title="Confirmado por ti (toca para cancelar)"
                              >
                                <CheckCircle2 size={13} /> Confirmado por ti
                              </button>
                            ) : (
                              <button
                                className="btn-confirmar-aviso"
                                onClick={() => handleToggleConfirmNotice(post.id)}
                              >
                                <ThumbsUp size={13} /> Confirmar
                              </button>
                            )}
                          </div>

                          {/* Vigencia, Prórroga y Chat Vecinal: RECIÉN VISIBLE SI CONFIRMAS O ERES AUTOR */}
                          {isNoticeConfirmed && (
                            <div className="card-engagement-footer">
                              <span className="badge-expiry">
                                <Clock size={11} /> {formatTimeRemaining(post.expiresAt)}
                              </span>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <button
                                  type="button"
                                  className="btn-extend-chip"
                                  onClick={() => setExtendModalItem({ id: post.id, type: 'aviso', title: post.title, currentExpiresAt: post.expiresAt })}
                                >
                                  <Hourglass size={12} /> Prorrogar
                                </button>
                                <button
                                  type="button"
                                  className="btn-chat-prominent"
                                  onClick={() => handleOpenChat(
                                    post.chatThreadId || `chat-${post.id}`,
                                    post.title,
                                    `${post.neighborhood} · Chat vecinal`,
                                    'aviso'
                                  )}
                                >
                                  <MessageCircle size={15} />
                                  <span>Chat vecinal</span>
                                  <span className="chat-counter-badge">{chatCount}</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* ===== TAB 2: AYUDA (Boceto 13) ===== */}
              {communityTab === 'ayuda' && (
                <div>
                  <div className="sec">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <HeartHandshake size={19} color="#D83B35" />
                      Ayuda y auxilio mutuo
                    </h3>
                    <button className="sec-link" onClick={() => setIsHelpModalOpen(true)}>+ Pedir ayuda</button>
                  </div>

                  {homeFilteredHelp.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '36px 16px', background: 'var(--white)', borderRadius: 16, margin: '8px 0', border: '1px dashed #E5E7EB' }}>
                      <HeartHandshake size={32} color="#D1D5DB" style={{ marginBottom: 8 }} />
                      <p style={{ margin: 0, fontWeight: 700, color: 'var(--carbon)', fontSize: '0.92rem' }}>
                        No hay pedidos de ayuda pendientes en el barrio
                      </p>
                      <button className="btn btn-outline btn-sm" style={{ marginTop: 10, borderColor: 'var(--coral)', color: 'var(--coral)' }} onClick={() => setIsHelpModalOpen(true)}>
                        + Pedir auxilio o ayuda
                      </button>
                    </div>
                  ) : (
                    homeFilteredHelp.map(req => {
                      const isHelping = (req.status !== 'abierta') || req.authorId === (currentUser?.documentNumber || 'usr-me') || helpedRequestIds.includes(req.id);
                      const chatCount = chatMessages[req.chatThreadId || `chat-${req.id}`]?.filter(m => !m.deletedForUserIds?.includes(currentUser?.documentNumber || 'usr-me')).length || 0;

                      return (
                        <div key={req.id} className="card card-help">
                          <div className="card-header-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div className="card-headline-group">
                              <h4 className="card-title">{req.authorName}</h4>
                              <div className="card-meta">
                                <span>{req.neighborhood}</span>
                                <span>·</span>
                                <span>{req.date}</span>
                              </div>
                            </div>
                            <span className={`badge-com ${req.urgency === 'alta' ? 'badge-urgente' : 'badge-reportado'}`}>
                              {req.urgency === 'alta' ? (
                                <><AlertTriangle size={12} /> Urgencia alta</>
                              ) : (
                                <><Clock size={12} /> Urgencia media</>
                              )}
                            </span>
                          </div>

                          <p className="card-body-text">
                            {req.description}
                          </p>

                          <div className="card-actions-row">
                            <span className="badge-com badge-abierta">
                              {req.status === 'abierta' ? 'Abierta' : 'En coordinación'}
                            </span>

                            {req.status === 'abierta' ? (
                              <button
                                className="btn-puedo-ayudar"
                                onClick={() => handleOfferHelp(req.id)}
                              >
                                <HandHeart size={14} /> Puedo ayudar
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.80rem', fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: 5 }}>
                                <CheckCircle2 size={14} /> Ayuda en marcha: {req.helperName || userName}
                              </span>
                            )}
                          </div>

                          {/* Vigencia, Prórroga y Chat Vecinal: RECIÉN VISIBLE SI AYUDAS O ERES AUTOR */}
                          {isHelping && (
                            <div className="card-engagement-footer">
                              <span className="badge-expiry">
                                <Clock size={11} /> {formatTimeRemaining(req.expiresAt)}
                              </span>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <button
                                  type="button"
                                  className="btn-extend-chip"
                                  onClick={() => setExtendModalItem({ id: req.id, type: 'ayuda', title: `Ayuda: ${req.description.slice(0, 30)}...`, currentExpiresAt: req.expiresAt })}
                                >
                                  <Hourglass size={12} /> Prorrogar
                                </button>
                                <button
                                  type="button"
                                  className="btn-chat-prominent"
                                  onClick={() => handleOpenChat(
                                    req.chatThreadId || `chat-${req.id}`,
                                    `Ayuda: ${req.authorName}`,
                                    `${req.neighborhood} · Coordinación solidaria`,
                                    'ayuda'
                                  )}
                                >
                                  <MessageCircle size={15} />
                                  <span>Chat vecinal</span>
                                  <span className="chat-counter-badge">{chatCount}</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* ===== TAB 3: ACTIVIDADES VECINALES (Boceto 13) ===== */}
              {communityTab === 'actividades' && (
                <div>
                  <div className="sec">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CalendarDays size={19} color="#D83B35" />
                      Actividades vecinales
                    </h3>
                  </div>

                  {homeFilteredActivities.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '36px 16px', background: 'var(--white)', borderRadius: 16, margin: '8px 0', border: '1px dashed #E5E7EB' }}>
                      <CalendarDays size={32} color="#D1D5DB" style={{ marginBottom: 8 }} />
                      <p style={{ margin: 0, fontWeight: 700, color: 'var(--carbon)', fontSize: '0.92rem' }}>
                        No hay actividades vecinales registradas
                      </p>
                    </div>
                  ) : (
                    homeFilteredActivities.map(act => {
                      const isParticipating = Boolean(act.joined);
                      const chatCount = chatMessages[act.chatThreadId || `chat-${act.id}`]?.filter(m => !m.deletedForUserIds?.includes(currentUser?.documentNumber || 'usr-me')).length || 0;

                      return (
                        <div key={act.id} className="activity-card">
                          <div className="activity-header">
                            <div
                              className="activity-icon-box"
                              style={{
                                background: act.badgeType === 'open'
                                  ? (isDarkMode ? 'rgba(34, 197, 94, 0.16)' : '#ECFDF5')
                                  : act.badgeType === 'solidarity'
                                  ? (isDarkMode ? 'rgba(234, 88, 12, 0.16)' : '#FFF7ED')
                                  : (isDarkMode ? 'rgba(59, 130, 246, 0.16)' : '#EFF6FF'),
                                border: act.badgeType === 'open'
                                  ? (isDarkMode ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid #A7F3D0')
                                  : act.badgeType === 'solidarity'
                                  ? (isDarkMode ? '1px solid rgba(234, 88, 12, 0.35)' : '1px solid #FFEDD5')
                                  : (isDarkMode ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid #BFDBFE')
                              }}
                            >
                              {act.badgeType === 'open' ? <CalendarDays size={20} color="#16A34A" /> :
                               act.badgeType === 'solidarity' ? <Utensils size={20} color="#EA580C" /> :
                               <Users size={20} color="#2563EB" />}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <h4 className="activity-title">{act.title}</h4>
                              <div className="activity-meta">
                                <span>{act.organizer}</span>
                                <span>·</span>
                                <strong>{act.date}</strong>
                              </div>
                            </div>
                          </div>

                          <div className="card-badges-row">
                            <span
                              className="badge-com"
                              style={{
                                background: act.badgeType === 'open'
                                  ? (isDarkMode ? 'rgba(34, 197, 94, 0.18)' : '#ECFDF5')
                                  : act.badgeType === 'solidarity'
                                  ? (isDarkMode ? 'rgba(168, 85, 247, 0.18)' : '#F5F3FF')
                                  : (isDarkMode ? 'rgba(51, 65, 85, 0.35)' : '#F1F5F9'),
                                color: act.badgeType === 'open'
                                  ? (isDarkMode ? '#86EFAC' : '#065F46')
                                  : act.badgeType === 'solidarity'
                                  ? (isDarkMode ? '#D8B4FE' : '#5B21B6')
                                  : (isDarkMode ? '#CBD5E1' : '#334155'),
                                border: act.badgeType === 'open'
                                  ? (isDarkMode ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid #A7F3D0')
                                  : act.badgeType === 'solidarity'
                                  ? (isDarkMode ? '1px solid rgba(168, 85, 247, 0.35)' : '1px solid #DDD6FE')
                                  : (isDarkMode ? '1px solid rgba(51, 65, 85, 0.5)' : '1px solid #E2E8F0')
                              }}
                            >
                              {act.badge}
                            </span>
                          </div>

                          <p className="activity-desc">{act.description}</p>

                          <div className="activity-footer">
                            <span className="card-actions-meta">
                              <Users size={14} color="var(--gray-500)" />
                              <span><strong>{act.participantsCount}</strong> vecinos participando</span>
                            </span>
                            <button
                              className="btn btn-outline btn-sm"
                              style={{
                                height: 32,
                                borderRadius: 16,
                                padding: '0 16px',
                                fontSize: '0.78rem',
                                borderColor: act.joined ? (isDarkMode ? 'rgba(34, 197, 94, 0.5)' : '#16A34A') : 'var(--coral)',
                                color: act.joined ? (isDarkMode ? '#86EFAC' : '#16A34A') : 'var(--coral)',
                                background: act.joined ? (isDarkMode ? 'rgba(34, 197, 94, 0.18)' : '#ECFDF5') : 'transparent',
                                fontWeight: 700
                              }}
                              onClick={() => handleToggleActivity(act.id)}
                            >
                              {act.joined ? 'Inscrito' : act.buttonText}
                            </button>
                          </div>

                          {/* Vigencia, Prórroga y Chat Vecinal: RECIÉN VISIBLE SI PARTICIPAS EN LA FAENA */}
                          {isParticipating && (
                            <div className="card-engagement-footer">
                              <span className="badge-expiry">
                                <Clock size={11} /> {formatTimeRemaining(act.expiresAt)}
                              </span>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <button
                                  type="button"
                                  className="btn-extend-chip"
                                  onClick={() => setExtendModalItem({ id: act.id, type: 'actividad', title: act.title, currentExpiresAt: act.expiresAt })}
                                >
                                  <Hourglass size={12} /> Prorrogar
                                </button>
                                <button
                                  type="button"
                                  className="btn-chat-prominent"
                                  onClick={() => handleOpenChat(
                                    act.chatThreadId || `chat-${act.id}`,
                                    act.title,
                                    `${act.organizer} · Coordinación`,
                                    'actividad'
                                  )}
                                >
                                  <MessageCircle size={15} />
                                  <span>Chat de faena</span>
                                  <span className="chat-counter-badge">{chatCount}</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

            </div>
          </div>
        </>
      )}

      {/* ========== EXPLORAR SERVICIOS (Boceto 06) ========== */}
      {view === 'explore' && (
        <>
          <div className="top-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <button className="icon-circle" onClick={handleBack}><ArrowLeft size={18} /></button>
              <div className="search-bar" style={{ flex: 1 }}>
                <Search size={18} color="#9CA3AF" />
                <input
                  type="text"
                  placeholder="Buscar servicios..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="hpills">
              <button className={`hpill ${selectedCategory === 'all' ? 'on' : ''}`} onClick={() => setSelectedCategory('all')}>Todos</button>
              {INITIAL_CATEGORIES.map(c => (
                <button key={c.id} className={`hpill ${selectedCategory === c.id ? 'on' : ''}`} onClick={() => setSelectedCategory(c.id)}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="body">
            <div className="body-pad">
              {filteredServices.map(srv => (
                <div key={srv.id} className="srv-card" onClick={() => openProDetail(srv)}>
                  <div className="srv-photo">{PRO_INITIALS[srv.providerId] || 'PR'}</div>
                  <div className="srv-info">
                    <div className="srv-top">
                      <span className="verified-badge"><CheckCircle size={11} /> Verificado</span>
                      <span className="srv-rating"><Star size={12} fill="#F59E0B" color="#F59E0B" /> {srv.rating} ({srv.reviewCount})</span>
                    </div>
                    <div className="srv-title">{srv.title}</div>
                    <div className="srv-meta">
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <MapPin size={12} color="#9CA3AF" /> {srv.coverageArea}
                      </span>
                      <span style={{ fontWeight: 700, color: 'var(--coral)' }}>
                        {srv.priceType === 'quote' ? 'A cotizar en el lugar' : `Desde S/ ${srv.priceAmount || '30'}`}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ========== DETALLE DE PROVEEDOR (Boceto 07) ========== */}
      {view === 'pro-detail' && selectedService && (
        <>
          <div className="top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10 }}>
            <button className="icon-circle" onClick={handleBack}><ArrowLeft size={18} /></button>
            <button className="icon-circle"><Heart size={18} color="#D1D5DB" /></button>
          </div>

          <div className="prof-header">
            <div className="prof-photo">{PRO_INITIALS[selectedService.providerId] || 'PR'}</div>
            <div className="prof-name">
              {selectedService.providerName.split('(')[0].trim()}
              <CheckCircle size={18} color="#2E9D72" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 4 }}>
              <Star size={14} fill="#F59E0B" color="#F59E0B" />
              <span style={{ fontWeight: 800, color: 'var(--carbon)' }}>{selectedService.rating}</span>
              <span style={{ color: '#9CA3AF', fontSize: '0.82rem' }}>({selectedService.reviewCount} reseñas)</span>
            </div>

            <div className="prof-tags">
              <span className="ptag">{INITIAL_CATEGORIES.find(c => c.id === selectedService.categoryId)?.name}</span>
              <span className="ptag">Verificado Ayni</span>
            </div>

            <div className="prof-stats">
              <div className="prof-stat">
                <div className="prof-stat-val" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <Wrench size={15} color="#D83B35" /> {selectedService.jobsCompleted}
                </div>
                <div className="prof-stat-label">Trabajos</div>
              </div>
              <div className="prof-stat">
                <div className="prof-stat-val" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <MapPin size={15} color="#D83B35" /> {selectedService.coverageArea.split(' ').pop()}
                </div>
                <div className="prof-stat-label">Cobertura</div>
              </div>
            </div>
          </div>

          <div className="body">
            <div className="body-pad">
              <div className="card">
                <h4 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: 6, color: 'var(--carbon)' }}>Sobre el profesional</h4>
                <p style={{ fontSize: '0.85rem', color: '#4B5563', lineHeight: 1.5 }}>
                  {selectedService.description}
                </p>
              </div>

              <div className="card">
                <h4 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: 6, color: 'var(--carbon)' }}>
                  {selectedService.priceType === 'fixed' ? 'Tarifa estimada' : 'Modalidad de cobro'}
                </h4>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--coral)' }}>
                  {selectedService.priceType === 'fixed' ? `S/ ${selectedService.priceAmount || 35} / hora` : 'A cotizar en el lugar tras visita previa'}
                </div>
                <p style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: 4 }}>
                  {selectedService.priceType === 'fixed'
                    ? 'Tarifa por hora o monto de referencia acordado para este oficio.'
                    : 'El profesional evaluará el trabajo directamente en tu domicilio para brindarte el presupuesto final.'}
                </p>
              </div>

              {/* Reseñas comunitarias */}
              <div className="card">
                <h4 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: 8, color: 'var(--carbon)' }}>Opiniones de vecinos</h4>
                <div style={{ borderBottom: '1px solid #E5E7EB', paddingBottom: 8, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#6B7280' }}>
                    <strong>Juan P. (Barrio Central)</strong>
                    <span>Hace 2 días</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#4B5563', marginTop: 4 }}>
                    "Excelente trabajo. Llegó puntual y dejó todo limpio y en orden."
                  </p>
                </div>
              </div>

              <button
                className="btn btn-coral btn-block"
                style={{ borderRadius: 'var(--radius-full)', marginTop: 8 }}
                onClick={() => navigateTo('request-form')}
              >
                Solicitar servicio
              </button>
            </div>
          </div>
        </>
      )}

      {/* ========== SOLICITAR SERVICIO (Boceto 08) ========== */}
      {view === 'request-form' && selectedService && (
        <>
          <div className="top-bar" style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 12 }}>
            <button className="icon-circle" onClick={handleBack}><ArrowLeft size={18} /></button>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--carbon)' }}>Solicitar servicio</h3>
          </div>

          <div className="body">
            <div className="body-pad">
              <div className="feat-pro" style={{ marginBottom: 12 }}>
                <div className="feat-pro-photo">{PRO_INITIALS[selectedService.providerId] || 'PR'}</div>
                <div className="feat-pro-info">
                  <div className="feat-pro-name">
                    {selectedService.providerName.split('(')[0].trim()}
                    <Star size={12} fill="#F59E0B" color="#F59E0B" /> {selectedService.rating}
                  </div>
                  <div className="feat-pro-meta">
                    {INITIAL_CATEGORIES.find(c => c.id === selectedService.categoryId)?.name}
                  </div>
                </div>
              </div>

              {/* Resumen de tarifa y modalidad de cobro */}
              <div style={{
                background: selectedService.priceType === 'quote'
                  ? (isDarkMode ? 'rgba(34, 197, 94, 0.14)' : '#F0FDF4')
                  : (isDarkMode ? 'rgba(234, 88, 12, 0.14)' : '#FFF7ED'),
                border: `1px solid ${
                  selectedService.priceType === 'quote'
                    ? (isDarkMode ? 'rgba(34, 197, 94, 0.35)' : '#BBF7D0')
                    : (isDarkMode ? 'rgba(234, 88, 12, 0.35)' : '#FFEDD5')
                }`,
                borderRadius: 12,
                padding: '10px 14px',
                marginBottom: 14
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: isDarkMode ? '#CBD5E1' : 'var(--carbon)' }}>Modalidad de cobro</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: selectedService.priceType === 'quote' ? (isDarkMode ? '#86EFAC' : '#166534') : 'var(--coral)' }}>
                    {selectedService.priceType === 'quote' ? 'A cotizar en el lugar' : `S/ ${selectedService.priceAmount || 35} / hora`}
                  </span>
                </div>
                <p style={{ fontSize: '0.73rem', color: selectedService.priceType === 'quote' ? (isDarkMode ? '#A7F3D0' : '#15803D') : (isDarkMode ? '#FFAB8A' : '#C2410C'), margin: '4px 0 0 0' }}>
                  {selectedService.priceType === 'quote'
                    ? 'El profesional se acercará a tu domicilio para evaluar la labor y acordar el monto final.'
                    : 'Tarifa de referencia fijada por el profesional.'}
                </p>
              </div>

              <div className="field">
                <label>Describe tu necesidad</label>
                <textarea
                  className="finput"
                  rows={3}
                  placeholder="Cuéntanos qué problema tienes o qué necesitas reparar..."
                  value={requestDesc}
                  onChange={e => setRequestDesc(e.target.value)}
                />
              </div>

              {/* Input oculto para adjuntar fotos desde cámara o galería */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                style={{ display: 'none' }}
              />

              <div className="field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ margin: 0 }}>Adjuntar fotos (opcional)</label>
                  {requestPhotos.length > 0 && (
                    <span style={{ fontSize: '0.74rem', color: isDarkMode ? '#94A3B8' : '#6B7280' }}>
                      {requestPhotos.length} foto(s) agregada(s)
                    </span>
                  )}
                </div>

                {requestPhotos.length > 0 ? (
                  <div className="photo-previews">
                    {requestPhotos.map((photoUrl, idx) => (
                      <div key={idx} className="photo-thumb-card">
                        <img src={photoUrl} alt={`Foto ${idx + 1}`} className="photo-thumb-img" />
                        <button
                          type="button"
                          className="photo-thumb-del"
                          onClick={() => handleRemovePhoto(idx)}
                          aria-label="Eliminar foto"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="photo-add-more"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Plus size={16} />
                      <span>Más fotos</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn btn-outline btn-block"
                    style={{ borderStyle: 'dashed' }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera size={18} color="#9CA3AF" /> Agregar fotos del problema
                  </button>
                )}
              </div>

              <div className="field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ margin: 0 }}>Barrio / Dirección de atención</label>
                </div>
                <LocationAddressPicker
                  value={requestAddress}
                  onChange={(addr) => setRequestAddress(addr)}
                  userCoords={userCoords}
                  isDarkMode={isDarkMode}
                  placeholder="Escribe tu dirección o búscala en el mapa..."
                />
                <p style={{ fontSize: '0.72rem', color: isDarkMode ? '#94A3B8' : '#6B7280', marginTop: 6 }}>
                  Puedes cambiar o detallar la dirección exacta para que el profesional llegue sin demoras.
                </p>
              </div>

              <div className="field">
                <label>Fecha y horario preferido</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <button
                    type="button"
                    className={`com-tab-pill ${requestScheduleMode === 'asap' ? 'active' : ''}`}
                    style={{ height: 40, fontSize: '0.8rem', padding: '0 10px', justifyContent: 'center' }}
                    onClick={() => setRequestScheduleMode('asap')}
                  >
                    <Zap size={14} /> Lo antes posible
                  </button>
                  <button
                    type="button"
                    className={`com-tab-pill ${requestScheduleMode === 'scheduled' ? 'active' : ''}`}
                    style={{ height: 40, fontSize: '0.8rem', padding: '0 10px', justifyContent: 'center' }}
                    onClick={() => {
                      setRequestScheduleMode('scheduled');
                      if (!requestScheduledDateTime) setRequestScheduledDateTime(getMinDateTime());
                    }}
                  >
                    <Calendar size={14} /> Programar fecha
                  </button>
                </div>

                {requestScheduleMode === 'scheduled' ? (
                  <div>
                    <input
                      type="datetime-local"
                      min={getMinDateTime()}
                      className="finput"
                      style={{ fontFamily: 'inherit', fontSize: '0.86rem' }}
                      value={requestScheduledDateTime}
                      onChange={handleScheduleChange}
                    />
                    <p style={{ fontSize: '0.72rem', color: isDarkMode ? '#94A3B8' : '#6B7280', marginTop: 4 }}>
                      Solo puedes seleccionar fechas y horarios futuros.
                    </p>
                  </div>
                ) : (
                  <div className="finput" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    color: isDarkMode ? '#F8FAFC' : '#374151',
                    background: isDarkMode ? '#1E293B' : '#F9FAFB',
                    border: isDarkMode ? '1px solid #334155' : undefined
                  }}>
                    <Clock size={16} color="#10B981" />
                    <span style={{ fontSize: '0.86rem', fontWeight: 600 }}>Atención inmediata · Hoy lo antes posible</span>
                  </div>
                )}
              </div>

              <button
                className="btn btn-coral btn-block"
                style={{ borderRadius: 'var(--radius-full)', marginTop: 14 }}
                onClick={handleRequestService}
              >
                <Send size={18} /> Confirmar y enviar solicitud
              </button>
            </div>
          </div>
        </>
      )}

      {/* ========== SEGUIMIENTO DE SERVICIO EN VIVO (Boceto 09) ========== */}
      {view === 'tracking' && (() => {
        const curBk = selectedBooking || bookings[0];
        if (!curBk) {
          return (
            <>
              <div className="top-bar" style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 12 }}>
                <button className="icon-circle" onClick={handleBack}><ArrowLeft size={18} /></button>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--carbon)' }}>Seguimiento de servicio</h3>
              </div>
              <div className="body"><div className="body-pad" style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF' }}>No hay servicio activo en este momento.</div></div>
            </>
          );
        }

        const isPendingDecision = curBk.status === 'solicitado' || curBk.status === 'en_revision';
        const isRejected = curBk.status === 'rechazado';
        const isAccepted = curBk.status === 'aceptado';
        const isOnTheWay = curBk.status === 'en_camino';
        const isInProgress = curBk.status === 'en_proceso';
        const isCompleted = curBk.status === 'completado';

        const providerNameClean = curBk.providerName.split('(')[0].trim();

        // Construir la línea de tiempo paso a paso basada en el estado real
        const steps = [
          {
            label: 'Solicitud enviada',
            sub: curBk.timeline?.sentAt || curBk.date,
            done: true
          },
          {
            label: 'En revisión',
            sub: isPendingDecision
              ? `${providerNameClean} está evaluando tu solicitud...`
              : (isRejected ? 'Revisión finalizada' : (curBk.timeline?.reviewedAt || 'Hoy')),
            done: !isPendingDecision && !isRejected,
            active: isPendingDecision
          },
          {
            label: isRejected ? 'Solicitud rechazada' : 'Aceptada',
            sub: isRejected
              ? (curBk.rejectionReason || 'No disponible')
              : (isPendingDecision ? 'Esperando confirmación' : (curBk.timeline?.acceptedAt || 'Hoy')),
            done: isAccepted || isOnTheWay || isInProgress || isCompleted,
            active: false,
            rejected: isRejected,
            pending: isPendingDecision
          },
          {
            label: 'Profesional en camino',
            sub: isOnTheWay ? (curBk.timeline?.onTheWayAt ? `En camino · ${curBk.timeline.onTheWayAt}` : 'En camino al domicilio') : (isInProgress || isCompleted ? 'Llegó al punto' : ''),
            done: isInProgress || isCompleted,
            active: isOnTheWay,
            pending: isPendingDecision || isRejected || isAccepted
          },
          {
            label: 'Servicio en proceso',
            sub: isInProgress ? 'Trabajando en el domicilio' : (isCompleted ? 'Finalizado' : ''),
            done: isCompleted,
            active: isInProgress,
            pending: isPendingDecision || isRejected || isAccepted || isOnTheWay
          },
          {
            label: 'Finalizado y calificado',
            sub: isCompleted ? (curBk.hasReview ? 'Calificado con 5 estrellas' : 'Completado') : '',
            done: isCompleted && curBk.hasReview,
            active: isCompleted && !curBk.hasReview,
            pending: !isCompleted
          }
        ];

        return (
          <>
            <div className="top-bar" style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 12 }}>
              <button className="icon-circle" onClick={handleBack}><ArrowLeft size={18} /></button>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--carbon)' }}>Seguimiento de servicio</h3>
            </div>

            <div className="body">
              <div className="body-pad">
                {/* Resumen del encargo y dirección */}
                <div className="card" style={{ padding: '12px 14px', marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '0.74rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                        Servicio solicitado
                      </span>
                      <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--carbon)', margin: '2px 0 4px 0' }}>
                        {curBk.serviceTitle}
                      </h4>
                    </div>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: 20,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        background: isRejected
                          ? (isDarkMode ? 'rgba(239, 68, 68, 0.18)' : '#FEE2E2')
                          : isPendingDecision
                          ? (isDarkMode ? 'rgba(245, 158, 11, 0.18)' : '#FEF3C7')
                          : (isDarkMode ? 'rgba(34, 197, 94, 0.18)' : '#E8F8F0'),
                        color: isRejected
                          ? (isDarkMode ? '#FCA5A5' : '#DC2626')
                          : isPendingDecision
                          ? (isDarkMode ? '#FCD34D' : '#B45309')
                          : (isDarkMode ? '#86EFAC' : '#059669'),
                        border: isRejected
                          ? (isDarkMode ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid #FECACA')
                          : isPendingDecision
                          ? (isDarkMode ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid #FDE68A')
                          : (isDarkMode ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid #A7F3D0'),
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      {isRejected ? <XCircle size={12} /> : isPendingDecision ? <Clock size={12} /> : <CheckCircle2 size={12} />}
                      {isRejected ? 'Rechazado' : isPendingDecision ? 'En revisión' : 'Confirmado'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8, fontSize: '0.78rem', color: '#4B5563' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MapPin size={13} color="var(--coral)" />
                      <span>{curBk.address || 'Ciclovía Malachowsky, San Borja'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Calendar size={13} color="#6B7280" />
                      <span>{curBk.scheduledDate || 'Hoy lo antes posible'}</span>
                    </div>
                  </div>

                  {curBk.photos && curBk.photos.length > 0 && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--gray-100)' }}>
                      <span style={{ fontSize: '0.72rem', color: '#6B7280', fontWeight: 700, display: 'block', marginBottom: 6 }}>
                        Fotos adjuntas ({curBk.photos.length}):
                      </span>
                      <div className="photo-previews">
                        {curBk.photos.map((ph, idx) => (
                          <div key={idx} className="photo-thumb-card">
                            <img src={ph} alt={`Evidencia ${idx + 1}`} className="photo-thumb-img" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Timeline de progreso */}
                <div className="card">
                  <div className="timeline">
                    {steps.map((step, i) => (
                      <div key={i} className={`tl-step ${step.done ? 'done' : ''}`}>
                        <div
                          className={`tl-dot ${
                            step.done
                              ? 'done'
                              : step.rejected
                              ? 'rejected'
                              : step.active
                              ? 'active'
                              : 'pending'
                          }`}
                          style={step.rejected ? { background: '#FEE2E2', borderColor: '#DC2626', color: '#DC2626' } : undefined}
                        >
                          {step.done ? (
                            <CheckCircle2 size={14} />
                          ) : step.rejected ? (
                            <X size={14} color="#DC2626" />
                          ) : (
                            <Circle size={14} />
                          )}
                        </div>
                        <div className="tl-content">
                          <h4 style={step.rejected ? { color: '#DC2626' } : undefined}>{step.label}</h4>
                          {step.sub && <p style={step.rejected ? { color: '#B91C1C' } : undefined}>{step.sub}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Estado de espera del cliente mientras el profesional revisa */}
                {isPendingDecision && (
                  <div
                    className="card"
                    style={{
                      marginTop: 12,
                      border: isDarkMode ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid #FDE68A',
                      background: isDarkMode ? '#1E293B' : '#FFFBEB',
                      padding: '14px 16px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div
                        className="icon-circle"
                        style={{
                          background: isDarkMode ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7',
                          color: isDarkMode ? '#FCD34D' : '#B45309',
                          flexShrink: 0,
                          marginTop: 2
                        }}
                      >
                        <Clock size={18} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#92400E', margin: 0 }}>
                          Esperando confirmación del profesional
                        </h4>
                        <p style={{ fontSize: '0.8rem', color: '#B45309', marginTop: 4, lineHeight: 1.35, margin: '4px 0 0' }}>
                          Tu solicitud ha sido enviada a {providerNameClean}. Te notificaremos en cuanto acepte el encargo para iniciar el viaje a tu domicilio. Puedes revisar los pedidos recibidos en la sección Solicitudes.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* En caso de rechazo */}
                {isRejected && (
                  <div className="card" style={{ border: '1px solid #FCA5A5', background: '#FEF2F2', marginTop: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <AlertCircle size={22} color="#DC2626" style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#991B1B', margin: 0 }}>
                          El profesional no pudo tomar el encargo
                        </h4>
                        <p style={{ fontSize: '0.8rem', color: '#B91C1C', marginTop: 4, lineHeight: 1.35 }}>
                          {curBk.rejectionReason || 'No cuenta con disponibilidad para el horario solicitado.'}
                        </p>
                        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                          <button
                            type="button"
                            className="btn btn-coral"
                            style={{ fontSize: '0.78rem', padding: '8px 14px', borderRadius: 'var(--radius-full)' }}
                            onClick={() => navigateTo('explore')}
                          >
                            Ver otros profesionales
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{ fontSize: '0.78rem', padding: '8px 14px', borderRadius: 'var(--radius-full)' }}
                            onClick={() => navigateTo('request-form')}
                          >
                            Proponer otro horario
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tarjeta de contacto y controles para etapas aceptadas / en camino / en proceso */}
                {(isAccepted || isOnTheWay || isInProgress || isCompleted) && (
                  <>
                    <div className="card" style={{ marginTop: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="feat-pro-photo" style={{ width: 44, height: 44 }}>
                          {PRO_INITIALS[curBk.providerId] || 'PR'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: isDarkMode ? '#F8FAFC' : 'var(--carbon)', fontSize: '0.92rem' }}>
                            {providerNameClean}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: isDarkMode ? '#94A3B8' : '#6B7280' }}>
                            {isOnTheWay
                              ? 'Profesional en camino al domicilio'
                              : isInProgress
                              ? 'En tu domicilio · Servicio en proceso'
                              : isCompleted
                              ? 'Servicio concluido con éxito'
                              : 'Solicitud aceptada · Preparando visita'}
                          </div>
                        </div>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                          <a href="tel:999888777" className="icon-circle" style={{ background: isDarkMode ? 'rgba(34, 197, 94, 0.16)' : '#E8F8F0', border: isDarkMode ? '1px solid rgba(34, 197, 94, 0.35)' : 'none' }} aria-label="Llamar">
                            <Phone size={16} color={isDarkMode ? '#4ADE80' : '#2E9D72'} />
                          </a>
                          <a href="https://wa.me/51999888777" target="_blank" rel="noreferrer" className="icon-circle" style={{ background: isDarkMode ? 'rgba(255, 90, 95, 0.16)' : '#FFF7ED', border: isDarkMode ? '1px solid rgba(255, 90, 95, 0.35)' : 'none' }} aria-label="WhatsApp">
                            <MessageCircle size={16} color={isDarkMode ? '#FF875C' : '#FF875C'} />
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Botones de acción según la etapa */}
                    {isOnTheWay && (
                      <button
                        className="btn btn-block"
                        style={{ background: '#2563EB', color: '#ffffff', borderRadius: 'var(--radius-full)', marginTop: 8 }}
                        onClick={() => handleAdvanceBookingStatus(curBk.id, 'en_proceso')}
                      >
                        <CheckCircle2 size={16} /> Profesional llegó · Iniciar servicio
                      </button>
                    )}

                    {isInProgress && (
                      <button
                        className="btn btn-coral btn-block"
                        style={{ borderRadius: 'var(--radius-full)', marginTop: 8 }}
                        onClick={() => setIsRateModalOpen(true)}
                      >
                        Completar y calificar servicio
                      </button>
                    )}

                    {isCompleted && !curBk.hasReview && (
                      <button
                        className="btn btn-coral btn-block"
                        style={{ borderRadius: 'var(--radius-full)', marginTop: 8 }}
                        onClick={() => setIsRateModalOpen(true)}
                      >
                        <Star size={16} /> Calificar al profesional
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        );
      })()}

      {/* ========== MIS SOLICITUDES (Boceto 10 con 3 pestañas: En curso, Pedidos recibidos, Historial) ========== */}
      {view === 'requests' && (() => {
        const currentUserId = currentUser?.documentNumber || 'usr-me';

        // 1. Solicitudes realizadas por el usuario como cliente (En curso)
        const myClientBookings = bookings.filter(
          b => (b.clientId === currentUserId || b.clientId === 'usr-me') &&
               b.status !== 'completado' &&
               b.status !== 'rechazado'
        );

        // 2. Pedidos de servicio que otros vecinos han solicitado al usuario (Proveedor)
        const receivedBookings = bookings.filter(
          b => b.providerId === currentUserId || b.providerId === 'usr-me' || b.id.startsWith('bk-rec-')
        );
        const pendingReceivedCount = receivedBookings.filter(
          b => b.status === 'en_revision' || b.status === 'solicitado'
        ).length;

        // 3. Historial de servicios (completados o rechazados)
        const historyBookings = bookings.filter(
          b => b.status === 'completado' || b.status === 'rechazado'
        );

        return (
          <>
            <div className="top-bar" style={{ borderBottom: '1px solid var(--gray-200)', paddingBottom: 14 }}>
              <h2 style={{ fontSize: '1.30rem', fontWeight: 800, color: 'var(--carbon)', margin: 0, letterSpacing: '-0.3px' }}>Mis solicitudes</h2>
            </div>

            <div className="body">
              <div className="body-pad">
                <div className="seg-tabs">
                  <button
                    className={`seg-tab ${requestsTab === 'current' ? 'active' : ''}`}
                    onClick={() => setRequestsTab('current')}
                  >
                    En curso ({myClientBookings.length})
                  </button>
                  <button
                    className={`seg-tab ${requestsTab === 'received' ? 'active' : ''}`}
                    onClick={() => setRequestsTab('received')}
                  >
                    Pedidos recibidos ({receivedBookings.filter(b => b.status !== 'completado' && b.status !== 'rechazado').length})
                    {pendingReceivedCount > 0 && <span className="seg-tab-dot" />}
                  </button>
                  <button
                    className={`seg-tab ${requestsTab === 'history' ? 'active' : ''}`}
                    onClick={() => setRequestsTab('history')}
                  >
                    Historial ({historyBookings.length})
                  </button>
                </div>

                {/* PESTAÑA 1: EN CURSO (Servicios solicitados como cliente) */}
                {requestsTab === 'current' && (
                  myClientBookings.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF' }}>
                      <Store size={40} style={{ margin: '0 auto 8px', opacity: 0.4, display: 'block' }} />
                      <p style={{ fontWeight: 700, fontSize: '0.96rem', color: 'var(--carbon)' }}>No tienes solicitudes en curso</p>
                      <p style={{ fontSize: '0.82rem', color: '#64748B', marginTop: 4 }}>Explora servicios cercanos de tu barrio para pedir una atención</p>
                    </div>
                  ) : (
                    myClientBookings.map(b => (
                      <div
                        key={b.id}
                        className="card"
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          setSelectedBooking(b);
                          setSelectedService(services.find(s => s.id === b.serviceId) || null);
                          navigateTo('tracking');
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
                          <h4 className="card-title" style={{ fontSize: '1.02rem', margin: 0, flex: 1, minWidth: 0 }}>{b.serviceTitle}</h4>
                          <span
                            className="status-pill-chip"
                            style={{
                              background:
                                b.status === 'en_revision' || b.status === 'solicitado'
                                  ? (isDarkMode ? 'rgba(245, 158, 11, 0.16)' : '#FEF3C7')
                                  : b.status === 'en_proceso'
                                  ? (isDarkMode ? 'rgba(59, 130, 246, 0.16)' : '#DBEAFE')
                                  : (isDarkMode ? 'rgba(255, 135, 92, 0.16)' : '#FFEDD5'),
                              color:
                                b.status === 'en_revision' || b.status === 'solicitado'
                                  ? (isDarkMode ? '#FCD34D' : '#92400E')
                                  : b.status === 'en_proceso'
                                  ? (isDarkMode ? '#93C5FD' : '#1E40AF')
                                  : (isDarkMode ? '#FFAB8A' : '#9A3412'),
                              border:
                                b.status === 'en_revision' || b.status === 'solicitado'
                                  ? (isDarkMode ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid #FDE68A')
                                  : b.status === 'en_proceso'
                                  ? (isDarkMode ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid #BFDBFE')
                                  : (isDarkMode ? '1px solid rgba(255, 135, 92, 0.35)' : '1px solid #FED7AA'),
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '4px 10px',
                              borderRadius: 20,
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            {b.status === 'en_revision' || b.status === 'solicitado' ? (
                              <><Clock size={12} /> En revisión</>
                            ) : b.status === 'en_proceso' ? (
                              <><Zap size={12} /> En proceso</>
                            ) : (
                              <><Navigation size={12} /> En camino</>
                            )}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#6B7280', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <UserIcon size={12} color="#6B7280" />
                          <span>{b.providerName}</span>
                          <span>·</span>
                          <Clock size={12} color="#6B7280" />
                          <span>{b.date}</span>
                        </div>
                      </div>
                    ))
                  )
                )}

                {/* PESTAÑA 2: PEDIDOS RECIBIDOS (Encargos solicitados por vecinos para ti) */}
                {requestsTab === 'received' && (
                  receivedBookings.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF' }}>
                      <Inbox size={40} style={{ margin: '0 auto 8px', opacity: 0.4, display: 'block' }} />
                      <p style={{ fontWeight: 700 }}>No tienes pedidos de servicio recibidos</p>
                      <p style={{ fontSize: '0.82rem' }}>Cuando los vecinos soliciten tus oficios o servicios, aparecerán aquí para que los revises y aceptes.</p>
                    </div>
                  ) : (
                    receivedBookings.map(b => {
                      const isPending = b.status === 'en_revision' || b.status === 'solicitado';
                      const isAcceptedOnTheWay = b.status === 'en_camino';
                      const isInProgress = b.status === 'en_proceso';
                      const isDone = b.status === 'completado';
                      const isRejected = b.status === 'rechazado';

                      return (
                        <div key={b.id} className="received-order-card">
                          <div className="received-order-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                              <div className="received-client-avatar">
                                <UserIcon size={18} color="var(--carbon)" />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--carbon)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {b.clientName}
                                </div>
                                <div style={{ fontSize: '0.74rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Clock size={11} /> {b.date}
                                </div>
                              </div>
                            </div>

                            <span
                              className="status-pill-chip"
                              style={{
                                background:
                                  isPending ? (isDarkMode ? 'rgba(245, 158, 11, 0.16)' : '#FEF3C7') :
                                  isAcceptedOnTheWay ? (isDarkMode ? 'rgba(255, 135, 92, 0.16)' : '#FFEDD5') :
                                  isInProgress ? (isDarkMode ? 'rgba(59, 130, 246, 0.16)' : '#DBEAFE') :
                                  isDone ? (isDarkMode ? 'rgba(34, 197, 94, 0.16)' : '#E8F8F0') :
                                  (isDarkMode ? 'rgba(239, 68, 68, 0.16)' : '#FEE2E2'),
                                color:
                                  isPending ? (isDarkMode ? '#FCD34D' : '#B45309') :
                                  isAcceptedOnTheWay ? (isDarkMode ? '#FFAB8A' : 'var(--coral)') :
                                  isInProgress ? (isDarkMode ? '#93C5FD' : '#1D4ED8') :
                                  isDone ? (isDarkMode ? '#86EFAC' : '#2E9D72') :
                                  (isDarkMode ? '#FCA5A5' : '#DC2626'),
                                border:
                                  isPending ? (isDarkMode ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid #FDE68A') :
                                  isAcceptedOnTheWay ? (isDarkMode ? '1px solid rgba(255, 135, 92, 0.35)' : '1px solid #FED7AA') :
                                  isInProgress ? (isDarkMode ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid #BFDBFE') :
                                  isDone ? (isDarkMode ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid #A7F3D0') :
                                  (isDarkMode ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid #FECACA'),
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                padding: '4px 10px',
                                borderRadius: 20,
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                            >
                              {isPending ? <Clock size={12} /> : isAcceptedOnTheWay ? <Navigation size={12} /> : isInProgress ? <Zap size={12} /> : isDone ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                              {isPending ? 'Por aceptar' : isAcceptedOnTheWay ? 'En camino' : isInProgress ? 'En proceso' : isDone ? 'Completado' : 'Rechazado'}
                            </span>
                          </div>

                          <div className="received-order-body">
                            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--coral)', marginBottom: 4 }}>
                              {b.serviceTitle}
                            </div>
                            <p style={{ fontSize: '0.82rem', color: isDarkMode ? '#CBD5E1' : '#374151', margin: '4px 0 8px 0', lineHeight: 1.4 }}>
                              "{b.notes}"
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: '0.78rem', color: isDarkMode ? '#94A3B8' : '#4B5563', background: isDarkMode ? '#111827' : 'var(--gray-50)', padding: '8px 10px', borderRadius: 8, border: isDarkMode ? '1px solid #233044' : 'none' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <MapPin size={13} color="var(--coral)" style={{ flexShrink: 0 }} />
                                <span style={{ color: 'var(--carbon)', fontWeight: 600 }}>{b.address || 'Ciclovía Malachowsky, San Borja'}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Calendar size={13} color="#6B7280" style={{ flexShrink: 0 }} />
                                <span>Horario solicitado: <strong>{b.scheduledDate || 'Hoy lo antes posible'}</strong></span>
                              </div>
                            </div>

                            {b.photos && b.photos.length > 0 && (
                              <div style={{ marginTop: 8 }}>
                                <span style={{ fontSize: '0.72rem', color: '#6B7280', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                                  Fotos adjuntas por el vecino:
                                </span>
                                <div className="photo-previews">
                                  {b.photos.map((ph, idx) => (
                                    <div key={idx} className="photo-thumb-card">
                                      <img src={ph} alt={`Foto ${idx + 1}`} className="photo-thumb-img" />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Opciones de Aceptar o Rechazar el encargo */}
                          {isPending && (
                            <div className="decision-btn-group" style={{ marginTop: 12, display: 'flex', gap: 10 }}>
                              <button
                                type="button"
                                className="btn-accept"
                                style={{ flex: 1, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 700, fontSize: '0.84rem' }}
                                onClick={() => handleAcceptBooking(b.id)}
                              >
                                <Check size={16} /> Aceptar encargo
                              </button>
                              <button
                                type="button"
                                className="btn-reject"
                                style={{ flex: 1, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 700, fontSize: '0.84rem' }}
                                onClick={() => handleRejectBooking(b.id)}
                              >
                                <X size={16} /> Rechazar encargo
                              </button>
                            </div>
                          )}

                          {/* Si ya fue aceptado y está en camino */}
                          {isAcceptedOnTheWay && (
                            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: isDarkMode ? '#1E293B' : '#FFF7ED',
                                border: isDarkMode ? '1px solid rgba(255, 135, 92, 0.35)' : 'none',
                                padding: '8px 12px',
                                borderRadius: 8,
                                fontSize: '0.78rem',
                                color: isDarkMode ? '#FFAB8A' : 'var(--coral)',
                                fontWeight: 700
                              }}>
                                <span>Has aceptado este encargo · Estás en camino</span>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <a href="tel:999888777" className="icon-circle" style={{ width: 28, height: 28, background: isDarkMode ? '#111827' : '#E8F8F0', border: isDarkMode ? '1px solid #334155' : 'none' }} aria-label="Llamar">
                                    <Phone size={13} color="#2E9D72" />
                                  </a>
                                  <a href="https://wa.me/51999888777" target="_blank" rel="noreferrer" className="icon-circle" style={{ width: 28, height: 28, background: isDarkMode ? '#111827' : '#FFF7ED', border: isDarkMode ? '1px solid #334155' : 'none' }} aria-label="WhatsApp">
                                    <MessageCircle size={13} color="#FF875C" />
                                  </a>
                                </div>
                              </div>
                              <button
                                type="button"
                                className="btn btn-block"
                                style={{ background: '#2563EB', color: '#FFFFFF', borderRadius: 'var(--radius-full)', padding: '10px 14px', fontSize: '0.84rem' }}
                                onClick={() => handleAdvanceBookingStatus(b.id, 'en_proceso')}
                              >
                                <CheckCircle2 size={16} /> Llegué al domicilio · Iniciar servicio
                              </button>
                            </div>
                          )}

                          {/* Si está en proceso */}
                          {isInProgress && (
                            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#EFF6FF', padding: '8px 12px', borderRadius: 8, fontSize: '0.78rem', color: '#1D4ED8', fontWeight: 700 }}>
                                <span>Servicio en proceso en el domicilio</span>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <a href="tel:999888777" className="icon-circle" style={{ width: 28, height: 28, background: isDarkMode ? 'rgba(34, 197, 94, 0.16)' : '#E8F8F0', border: isDarkMode ? '1px solid rgba(34, 197, 94, 0.35)' : 'none' }} aria-label="Llamar">
                                    <Phone size={13} color={isDarkMode ? '#4ADE80' : '#2E9D72'} />
                                  </a>
                                  <a href="https://wa.me/51999888777" target="_blank" rel="noreferrer" className="icon-circle" style={{ width: 28, height: 28, background: isDarkMode ? 'rgba(255, 90, 95, 0.16)' : '#FFF7ED', border: isDarkMode ? '1px solid rgba(255, 90, 95, 0.35)' : 'none' }} aria-label="WhatsApp">
                                    <MessageCircle size={13} color={isDarkMode ? '#FF875C' : '#FF875C'} />
                                  </a>
                                </div>
                              </div>
                              <button
                                type="button"
                                className="btn btn-coral btn-block"
                                style={{ borderRadius: 'var(--radius-full)', padding: '10px 14px', fontSize: '0.84rem' }}
                                onClick={() => handleAdvanceBookingStatus(b.id, 'completado')}
                              >
                                <CheckCircle2 size={16} /> Finalizar trabajo
                              </button>
                            </div>
                          )}

                          {/* Concluido */}
                          {isDone && (
                            <div style={{ marginTop: 10, padding: '8px 12px', background: '#E8F8F0', borderRadius: 8, fontSize: '0.78rem', color: '#2E9D72', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <CheckCircle2 size={14} /> Trabajo concluido con éxito
                            </div>
                          )}

                          {/* Rechazado */}
                          {isRejected && (
                            <div style={{ marginTop: 10, padding: '8px 12px', background: '#FEE2E2', borderRadius: 8, fontSize: '0.78rem', color: '#DC2626', fontWeight: 600 }}>
                              Solicitud rechazada: {b.rejectionReason || 'No disponible'}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )
                )}

                {/* PESTAÑA 3: HISTORIAL */}
                {requestsTab === 'history' && (
                  historyBookings.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF' }}>
                      <Store size={40} style={{ margin: '0 auto 8px', opacity: 0.4, display: 'block' }} />
                      <p style={{ fontWeight: 700 }}>No hay servicios en el historial</p>
                      <p style={{ fontSize: '0.82rem' }}>Aquí aparecerán los servicios que hayan concluido o hayan sido rechazados</p>
                    </div>
                  ) : (
                    historyBookings.map(b => (
                      <div
                        key={b.id}
                        className="card"
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          setSelectedBooking(b);
                          setSelectedService(services.find(s => s.id === b.serviceId) || null);
                          navigateTo('tracking');
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, color: 'var(--carbon)', fontSize: '0.92rem', flex: 1, minWidth: 0 }}>{b.serviceTitle}</span>
                          <span
                            className="status-pill-chip"
                            style={{
                              background: b.status === 'completado'
                                ? (isDarkMode ? 'rgba(34, 197, 94, 0.16)' : '#E8F8F0')
                                : (isDarkMode ? 'rgba(239, 68, 68, 0.16)' : '#FEE2E2'),
                              color: b.status === 'completado'
                                ? (isDarkMode ? '#86EFAC' : '#2E9D72')
                                : (isDarkMode ? '#FCA5A5' : '#DC2626'),
                              border: b.status === 'completado'
                                ? (isDarkMode ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid #A7F3D0')
                                : (isDarkMode ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid #FECACA'),
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '4px 10px',
                              borderRadius: 20,
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3
                            }}
                          >
                            {b.status === 'completado' ? (
                              <><CheckCircle2 size={12} /> Finalizado</>
                            ) : (
                              <><XCircle size={12} /> Rechazado</>
                            )}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#6B7280', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <UserIcon size={12} color="#6B7280" />
                          <span>{b.providerId === 'usr-me' ? `Cliente: ${b.clientName}` : b.providerName}</span>
                          <span>·</span>
                          <Clock size={12} color="#6B7280" />
                          <span>{b.date}</span>
                        </div>
                        {b.status === 'rechazado' && b.rejectionReason && (
                          <div style={{ fontSize: '0.75rem', color: '#DC2626', marginTop: 6, fontStyle: 'italic' }}>
                            Motivo: {b.rejectionReason}
                          </div>
                        )}
                      </div>
                    ))
                  )
                )}
              </div>
            </div>
          </>
        );
      })()}

      {/* ========== MAPA DE SERVICIOS Y AYUDA (Boceto 11 con GPS REAL) ========== */}
      {view === 'map' && (
        <>
          <div className="top-bar" style={{ borderBottom: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 14 }}>
            <MapPin size={20} color="var(--coral)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--carbon)' }}>Mapa vecinal en vivo</h3>
          </div>

          <div className="body" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
            <AyniMap
              services={services.filter(s => s.status === 'published')}
              helpRequests={helpRequests.filter(h => !h.expiresAt || new Date(h.expiresAt).getTime() > Date.now())}
              communityPosts={communityPosts.filter(p => !p.expiresAt || new Date(p.expiresAt).getTime() > Date.now())}
              activities={activities.filter(a => !a.expiresAt || new Date(a.expiresAt).getTime() > Date.now())}
              neighborhood={selectedNeighborhood}
              userCoords={userCoords}
              isDarkMode={isDarkMode}
              onLocationDetected={(coords, name) => {
                setUserCoords(coords);
                setRealLocationName(name);
              }}
              onSelectService={openProDetail}
              onSelectHelp={(req) => {
                handleOpenChat(
                  req.chatThreadId || `chat-${req.id}`,
                  req.authorName,
                  `${req.neighborhood} · ${req.type.toUpperCase()}`,
                  'ayuda'
                );
              }}
              onSelectPost={(post) => {
                handleOpenChat(
                  post.chatThreadId || `chat-${post.id}`,
                  post.title,
                  `${post.neighborhood} · ${post.category}`,
                  'aviso'
                );
              }}
              onSelectActivity={(act) => {
                handleOpenChat(
                  act.chatThreadId || `chat-${act.id}`,
                  act.title,
                  `${act.organizer} · ${act.date}`,
                  'actividad'
                );
              }}
            />
          </div>
        </>
      )}

      {/* ========== CENTRO DE CONECTIVIDAD OFFLINE (Boceto 14) ========== */}
      {view === 'offline' && (
        <>
          <div className="top-bar" style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 14 }}>
            <button className="icon-circle" onClick={handleBack}><ArrowLeft size={18} /></button>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--carbon)' }}>Centro de conectividad</h3>
          </div>

          <div className="body">
            <div className="body-pad">
              <div className="off-dark-card">
                <div className="off-dark-icon">
                  <Radio size={24} />
                </div>
                <div className="off-dark-info">
                  <h3>{isOnline ? 'Conexión a Internet activa' : 'Sin Internet'}</h3>
                  <p>Tus datos se guardan de forma segura en este teléfono</p>
                </div>
              </div>

              <div className="off-grid-metrics">
                <div className="off-metric-box">
                  <div className="off-metric-val coral">
                    {offlineQueue.filter(q => q.step !== 'sincronizado').length}
                  </div>
                  <div className="off-metric-lbl">Pendientes por sincronizar</div>
                </div>
                <div className="off-metric-box">
                  <div className="off-metric-val green">
                    {offlineQueue.filter(q => q.step === 'sincronizado').length}
                  </div>
                  <div className="off-metric-lbl">Sincronizado con servidor</div>
                </div>
              </div>

              {/* Botones de acción: redactar auxilio y prueba en vivo de propagación BLE */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <button
                  type="button"
                  className="off-emergency-btn"
                  style={{ flex: 1, padding: '12px 14px' }}
                  onClick={() => setIsOfflineHelpModalOpen(true)}
                >
                  <PlusCircle size={18} />
                  <span>Escribir auxilio (BLE)</span>
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleRestartMeshDemo}
                  style={{
                    borderColor: 'var(--coral)',
                    color: 'var(--coral)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    padding: '0 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    borderRadius: 14
                  }}
                  title="Reiniciar o probar ciclo de propagación de malla BLE en vivo"
                >
                  <RefreshCw size={15} />
                  <span>Probar malla</span>
                </button>
              </div>

              <div className="sec" style={{ marginTop: 4 }}>
                <h3>Estado de tus envíos por malla</h3>
              </div>

              {offlineQueue.map(item => {
                const isGuardadoDone = item.step === 'guardado' || item.step === 'enviando' || item.step === 'recibido' || item.step === 'sincronizado';
                const isEnviandoActive = item.step === 'enviando';
                const isEnviandoDone = item.step === 'recibido' || item.step === 'sincronizado';
                const isRecibidoActive = item.step === 'recibido';
                const isRecibidoDone = item.step === 'sincronizado';
                const isSincronizadoDone = item.step === 'sincronizado';

                return (
                  <div key={item.id} className="card" style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <strong style={{ fontSize: '0.92rem', color: 'var(--carbon)' }}>{item.title}</strong>
                        <div style={{ fontSize: '0.74rem', color: '#6B7280', marginTop: 2 }}>
                          ID {item.id} · Saltos {item.hops} de {item.hopLimit} · {item.expiresIn || 'Caduca en 23 h'}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>{item.timeAgo}</span>
                    </div>

                    <div className="off-hops-timeline">
                      <div className="off-hop-line" />

                      {/* Paso 1: Guardado */}
                      <div className="off-hop-step">
                        <div className={`off-hop-dot ${isGuardadoDone ? 'done' : ''}`}>
                          <CheckCircle2 size={12} />
                        </div>
                        <span className="off-hop-lbl">Guardado</span>
                      </div>

                      {/* Paso 2: Enviando */}
                      <div className="off-hop-step">
                        <div className={`off-hop-dot ${isEnviandoDone ? 'done' : isEnviandoActive ? 'active' : ''}`}>
                          {isEnviandoDone ? <CheckCircle2 size={12} /> : <Circle size={10} />}
                        </div>
                        <span className="off-hop-lbl">Enviando</span>
                      </div>

                      {/* Paso 3: Recibido */}
                      <div className="off-hop-step">
                        <div
                          className={`off-hop-dot ${isRecibidoDone ? 'done' : isRecibidoActive ? 'done' : ''}`}
                          style={isRecibidoActive ? { background: '#2E9D72', borderColor: '#2E9D72', color: '#fff' } : {}}
                        >
                          {isRecibidoDone || isRecibidoActive ? <CheckCircle2 size={12} /> : <Circle size={10} />}
                        </div>
                        <span className="off-hop-lbl" style={isRecibidoActive ? { color: '#2E9D72', fontWeight: 700 } : {}}>
                          Recibido
                        </span>
                      </div>

                      {/* Paso 4: Sincronizado */}
                      <div className="off-hop-step">
                        <div
                          className={`off-hop-dot ${isSincronizadoDone ? 'done' : ''}`}
                          style={isSincronizadoDone ? { background: '#1D4ED8', borderColor: '#1D4ED8', color: '#fff' } : {}}
                        >
                          {isSincronizadoDone ? <CheckCircle2 size={12} /> : <Circle size={10} />}
                        </div>
                        <span className="off-hop-lbl" style={isSincronizadoDone ? { color: '#1D4ED8', fontWeight: 700 } : {}}>
                          Sincroniz.
                        </span>
                      </div>
                    </div>

                    <div className={`off-status-box ${item.step === 'recibido' ? 'recibido' : item.step === 'sincronizado' ? 'sincronizado' : ''}`}>
                      <Radio size={16} color={item.step === 'recibido' ? '#16A34A' : item.step === 'sincronizado' ? '#2563EB' : '#FF875C'} style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <strong>{item.statusText || 'Enviando a dispositivo cercano…'}</strong>
                        <span>{item.statusSubtext || 'Buscando teléfono de vecino para saltar por BLE.'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  background: isDarkMode ? 'rgba(109, 40, 217, 0.2)' : '#EDE9FE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Radio size={20} color={isDarkMode ? '#C4B5FD' : '#6D28D9'} />
                </div>
                <div>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--carbon)', display: 'block' }}>Dispositivos cercanos (BLE)</strong>
                  <span style={{ fontSize: '0.76rem', color: isDarkMode ? '#94A3B8' : '#6B7280' }}>1 teléfono compatible a ~8 m</span>
                </div>
                <span
                  style={{
                    marginLeft: 'auto',
                    background: isDarkMode ? 'rgba(34, 197, 94, 0.18)' : '#E8F8F0',
                    color: isDarkMode ? '#86EFAC' : '#2E9D72',
                    border: isDarkMode ? '1px solid rgba(34, 197, 94, 0.4)' : 'none',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 10
                  }}
                >
                  Activo
                </span>
              </div>

              {/* Indicador de transmisión automática por Malla BLE */}
              <div className="off-auto-sync-badge">
                <div className="off-auto-sync-pulse" />
                <div>
                  <strong>Malla BLE activa · Transmisión y confirmación automática</strong>
                  <div style={{ fontSize: '0.72rem', opacity: 0.9 }}>
                    Los saltos entre teléfonos ocurren automáticamente cuando los vecinos pasan cerca. No necesitas presionar ningún botón.
                  </div>
                </div>
              </div>

              <div className="off-disclaimer">
                <Info size={16} />
                <span>Bluetooth de baja energía opera sin internet pero depende del paso cercano de vecinos.</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ========== PERFIL (Boceto 17) ========== */}
      {view === 'profile' && (
        <>
          <div className="top-bar" style={{ textAlign: 'center', borderBottom: '1px solid var(--gray-200)', padding: '34px 18px 24px' }}>
            <div className="header-avatar" style={{ width: 76, height: 76, fontSize: '1.9rem', margin: '4px auto 18px', boxShadow: '0 6px 20px rgba(216, 59, 53, 0.35)' }}>
              {userInitial}
            </div>
            <h2 style={{ fontSize: '1.38rem', fontWeight: 800, color: 'var(--carbon)', margin: '8px 0 0', letterSpacing: '-0.3px' }}>{userName}</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--gray-500)', marginTop: 6, fontWeight: 500 }}>{currentUser?.documentNumber ? `DNI / Documento: ${currentUser.documentNumber}` : 'maria@ayni.pe'}</p>
            <span className="badge-com badge-corroborado" style={{ marginTop: 10, display: 'inline-flex', padding: '5px 14px', borderRadius: 20 }}>
              <CheckCircle size={13} /> Vecino Verificado Ayni
            </span>
          </div>

          <div className="body">
            <div className="body-pad">
              <div className="card" style={{ padding: '4px 14px' }}>
                {[
                  { icon: <Store size={18} color="var(--coral)" />, label: 'Mis solicitudes y pedidos', action: () => navigateTo('requests') },
                  { icon: <Radio size={18} color="#D83B35" />, label: 'Centro de Auxilio Offline (BLE)', action: () => navigateTo('offline') },
                  { icon: <Heart size={18} color="#ec4899" />, label: 'Favoritos del barrio', action: () => setIsFavoritesModalOpen(true) },
                  { icon: <MapPin size={18} color="var(--green)" />, label: `Zona: ${selectedNeighborhood}`, action: () => navigateTo('map') },
                ].map((item, i) => (
                  <div key={i} className="profile-menu-item" onClick={item.action}>
                    <div className="profile-menu-icon">{item.icon}</div>
                    <span className="profile-menu-text">{item.label}</span>
                    <ChevronRight size={18} color="var(--gray-300)" />
                  </div>
                ))}
              </div>

              {/* Preferencias de Visualización y Modo Nocturno / Red */}
              <div className="card" style={{ padding: '10px 16px', marginTop: 12 }}>
                <div style={{ fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--coral)', marginBottom: 8 }}>
                  Visualización y Red
                </div>

                {/* Switch Modo Nocturno / Oscuro */}
                <div className="profile-setting-toggle-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="profile-menu-icon" style={{ background: isDarkMode ? '#1E293B' : '#FEF3C7', color: isDarkMode ? '#F59E0B' : '#D97706' }}>
                      {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
                    </div>
                    <div>
                      <strong style={{ fontSize: '0.90rem', color: 'var(--carbon)' }}>Modo nocturno (Oscuro)</strong>
                      <div style={{ fontSize: '0.74rem', color: 'var(--gray-500)' }}>
                        {isDarkMode ? 'Tema oscuro activo en toda la app' : 'Tema claro activo'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`theme-toggle-switch ${isDarkMode ? 'on' : ''}`}
                    onClick={toggleDarkMode}
                    aria-label="Alternar modo oscuro"
                  >
                    <span className="theme-toggle-handle">
                      {isDarkMode ? <Moon size={12} /> : <Sun size={12} />}
                    </span>
                  </button>
                </div>


              </div>

              <div className="card" style={{ padding: '4px 14px', marginTop: 12 }}>
                {[
                  {
                    icon: <Settings size={18} color="#4B5563" />,
                    label: 'Configuración Servidor Backend API',
                    action: async () => {
                      const current = api.getBaseUrl();
                      const next = window.prompt('URL del Servidor Backend API (para celular o PC):', current);
                      if (next && next.trim() && next !== current) {
                        api.setApiBaseUrl(next.trim());
                        const isUp = await api.isOnline();
                        alert(isUp ? 'Conexión exitosa con el Backend.' : 'Servidor guardado, pero no responde en este momento.');
                        window.location.reload();
                      }
                    }
                  },
                  {
                    icon: <Navigation size={18} color="#D83B35" />,
                    label: 'Actualizar ubicación GPS',
                    action: () => {
                      fetchRealLocation();
                      alert('Consultando sensor de GPS...');
                    }
                  },
                  {
                    icon: <HelpCircle size={18} color="var(--coral)" />,
                    label: 'Ver tutorial interactivo de Ayni',
                    action: () => setIsTutorialActive(true)
                  },
                  {
                    icon: <RefreshCw size={18} color="#4B5563" />,
                    label: 'Restablecer primera vez / Demo',
                    action: () => {
                      try {
                        localStorage.removeItem('ayni_onboarding_completed');
                      } catch {}
                      setIsTutorialActive(false);
                      navigateTo('welcome');
                    }
                  },
                  { icon: <HelpCircle size={18} color="#4B5563" />, label: 'Acerca de Ayni (Hackathon UTP · El Comercio)', action: () => alert('Ayni - Plataforma de Resiliencia y Oficios Vecinales') },
                ].map((item, i) => (
                  <div key={i} className="profile-menu-item" onClick={item.action}>
                    <div className="profile-menu-icon">{item.icon}</div>
                    <span className="profile-menu-text">{item.label}</span>
                    <ChevronRight size={18} color="var(--gray-300)" />
                  </div>
                ))}
              </div>

              <button
                className="btn btn-outline btn-block"
                style={{ marginTop: 16, color: 'var(--coral)' }}
                onClick={() => {
                  api.clearToken();
                  setCurrentUser(null);
                  setIsAuthModalOpen(true);
                }}
              >
                <LogOut size={18} /> Cerrar sesión
              </button>
            </div>
          </div>
        </>
      )}

      {/* ===== FAB FLOTANTE (+) PARA PUBLICAR ===== */}
      {(view === 'home' || view === 'explore') && (
        <button
          className="fab"
          onClick={() => {
            if (view === 'explore') setIsServiceModalOpen(true);
            else if (communityTab === 'ayuda') setIsHelpModalOpen(true);
            else setIsNoticeModalOpen(true);
          }}
          title="Publicar en la comunidad"
        >
          <Plus size={28} strokeWidth={2.4} />
        </button>
      )}

      {/* ===== NAVEGACIÓN INFERIOR (Estilo WhatsApp / Instagram: Iconos prominentes y claros) ===== */}
      {view !== 'welcome' && view !== 'request-form' && view !== 'tracking' && view !== 'pro-detail' && view !== 'offline' && (
        <nav className="bnav">
          <button className={`bnav-btn ${view === 'home' ? 'active' : ''}`} onClick={() => navigateTo('home')}>
            <Home size={26} strokeWidth={view === 'home' ? 2.3 : 1.9} />
            <span>Inicio</span>
          </button>
          <button className={`bnav-btn ${view === 'explore' ? 'active' : ''}`} onClick={() => navigateTo('explore')}>
            <Search size={26} strokeWidth={view === 'explore' ? 2.3 : 1.9} />
            <span>Explorar</span>
          </button>
          <button className={`bnav-btn ${view === 'requests' ? 'active' : ''}`} onClick={() => navigateTo('requests')}>
            <Clock size={26} strokeWidth={view === 'requests' ? 2.3 : 1.9} />
            <span>Solicitudes</span>
            {bookings.length > 0 && <div className="bnav-dot" />}
          </button>
          <button className={`bnav-btn ${view === 'map' ? 'active' : ''}`} onClick={() => navigateTo('map')}>
            <MapPin size={26} strokeWidth={view === 'map' ? 2.3 : 1.9} />
            <span>Mapa</span>
          </button>
          <button className={`bnav-btn ${view === 'profile' ? 'active' : ''}`} onClick={() => navigateTo('profile')}>
            <UserIcon size={26} strokeWidth={view === 'profile' ? 2.3 : 1.9} />
            <span>Perfil</span>
          </button>
        </nav>
      )}

      {/* ===== MODAL DE CALIFICAR SERVICIO (Boceto 15) ===== */}
      {isRateModalOpen && (
        <div className="modal-bg">
          <div className="modal-card">
            <button className="modal-close" onClick={() => setIsRateModalOpen(false)} aria-label="Cerrar modal">
              <X size={20} />
            </button>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--carbon)', textAlign: 'center', marginBottom: 4 }}>
              Calificar servicio
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#6B7280', textAlign: 'center', marginBottom: 14 }}>
              ¿Cómo fue tu experiencia con el profesional?
            </p>

            <div className="rate-stars">
              {[1, 2, 3, 4, 5].map(st => (
                <button
                  key={st}
                  type="button"
                  className="rate-star-btn"
                  onClick={() => setRateScore(st)}
                >
                  <Star
                    size={32}
                    fill={st <= rateScore ? '#F59E0B' : '#E5E7EB'}
                    color={st <= rateScore ? '#F59E0B' : '#D1D5DB'}
                  />
                </button>
              ))}
            </div>

            <div className="rate-chips">
              {['Puntual', 'Amable', 'Trabajo impecable', 'Precio justo', 'Buena comunicación'].map(tag => (
                <button
                  key={tag}
                  type="button"
                  className={`rate-chip ${rateTags.includes(tag) ? 'selected' : ''}`}
                  onClick={() => {
                    if (rateTags.includes(tag)) setRateTags(rateTags.filter(t => t !== tag));
                    else setRateTags([...rateTags, tag]);
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>

            <div className="field">
              <label>Comentario vecinal (opcional)</label>
              <textarea
                className="finput"
                rows={3}
                placeholder="Escribe unas palabras para la comunidad..."
                value={rateComment}
                onChange={e => setRateComment(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="btn btn-coral btn-block"
              style={{ borderRadius: 'var(--radius-full)', marginTop: 8 }}
              onClick={handleSubmitRating}
            >
              Enviar calificación
            </button>
          </div>
        </div>
      )}

      {/* ===== MODAL: FAVORITOS DEL BARRIO ===== */}
      {isFavoritesModalOpen && (
        <div className="modal-bg">
          <div className="modal-card">
            <button className="modal-close" onClick={() => setIsFavoritesModalOpen(false)} aria-label="Cerrar modal">
              <X size={20} />
            </button>
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <div className="icon-circle" style={{ background: '#FDF2F8', color: '#DB2777', margin: '0 auto 8px', width: 48, height: 48 }}>
                <Heart size={24} fill="#DB2777" />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--carbon)', margin: 0 }}>
                Favoritos del barrio
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: 4, lineHeight: 1.35 }}>
                Tus contactos vecinales y técnicos de confianza guardados para pedir ayuda o solicitar servicios rápido sin buscarlos de nuevo en el mapa.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '55vh', overflowY: 'auto' }}>
              <div className="card" style={{ padding: '12px 14px', margin: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--carbon)', margin: 0 }}>
                      José Ramírez
                    </h4>
                    <span style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 700 }}>
                      Electricista Certificado · Zona B
                    </span>
                    <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: 2 }}>
                      Tarifa: S/ 45/h · Calificación: 4.9 (14 opiniones)
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <a href="tel:999888777" className="icon-circle" style={{ width: 32, height: 32, background: isDarkMode ? 'rgba(34, 197, 94, 0.16)' : '#E8F8F0', border: isDarkMode ? '1px solid rgba(34, 197, 94, 0.35)' : 'none' }} aria-label="Llamar">
                      <Phone size={14} color={isDarkMode ? '#4ADE80' : '#2E9D72'} />
                    </a>
                    <a href="https://wa.me/51999888777" target="_blank" rel="noreferrer" className="icon-circle" style={{ width: 32, height: 32, background: isDarkMode ? 'rgba(255, 90, 95, 0.16)' : '#FFF7ED', border: isDarkMode ? '1px solid rgba(255, 90, 95, 0.35)' : 'none' }} aria-label="WhatsApp">
                      <MessageCircle size={14} color={isDarkMode ? '#FF875C' : '#FF875C'} />
                    </a>
                  </div>
                </div>
              </div>

              <div className="card" style={{ padding: '12px 14px', margin: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: isDarkMode ? '#F8FAFC' : 'var(--carbon)', margin: 0 }}>
                      Carmen Morales
                    </h4>
                    <span style={{ fontSize: '0.74rem', color: isDarkMode ? '#86EFAC' : '#059669', fontWeight: 700 }}>
                      Gasfitería y Detección de Fugas · Sector Central
                    </span>
                    <div style={{ fontSize: '0.72rem', color: isDarkMode ? '#94A3B8' : '#6B7280', marginTop: 2 }}>
                      A cotizar en el lugar · Calificación: 4.8 (9 opiniones)
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <a href="tel:999888777" className="icon-circle" style={{ width: 32, height: 32, background: isDarkMode ? 'rgba(34, 197, 94, 0.16)' : '#E8F8F0', border: isDarkMode ? '1px solid rgba(34, 197, 94, 0.35)' : 'none' }} aria-label="Llamar">
                      <Phone size={14} color={isDarkMode ? '#4ADE80' : '#2E9D72'} />
                    </a>
                    <a href="https://wa.me/51999888777" target="_blank" rel="noreferrer" className="icon-circle" style={{ width: 32, height: 32, background: isDarkMode ? 'rgba(255, 90, 95, 0.16)' : '#FFF7ED', border: isDarkMode ? '1px solid rgba(255, 90, 95, 0.35)' : 'none' }} aria-label="WhatsApp">
                      <MessageCircle size={14} color={isDarkMode ? '#FF875C' : '#FF875C'} />
                    </a>
                  </div>
                </div>
              </div>

              <div className="card" style={{ padding: '12px 14px', margin: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: isDarkMode ? '#F8FAFC' : 'var(--carbon)', margin: 0 }}>
                      Pedro Quispe
                    </h4>
                    <span style={{ fontSize: '0.74rem', color: isDarkMode ? '#A5B4FC' : '#4F46E5', fontWeight: 700 }}>
                      Carpintería y Préstamo de Escalera · Zona Alta
                    </span>
                    <div style={{ fontSize: '0.72rem', color: isDarkMode ? '#94A3B8' : '#6B7280', marginTop: 2 }}>
                      Vecino solidario (Préstamo de herramientas)
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <a href="tel:999888777" className="icon-circle" style={{ width: 32, height: 32, background: isDarkMode ? 'rgba(34, 197, 94, 0.16)' : '#E8F8F0', border: isDarkMode ? '1px solid rgba(34, 197, 94, 0.35)' : 'none' }} aria-label="Llamar">
                      <Phone size={14} color={isDarkMode ? '#4ADE80' : '#2E9D72'} />
                    </a>
                    <a href="https://wa.me/51999888777" target="_blank" rel="noreferrer" className="icon-circle" style={{ width: 32, height: 32, background: isDarkMode ? 'rgba(255, 90, 95, 0.16)' : '#FFF7ED', border: isDarkMode ? '1px solid rgba(255, 90, 95, 0.35)' : 'none' }} aria-label="WhatsApp">
                      <MessageCircle size={14} color={isDarkMode ? '#FF875C' : '#FF875C'} />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-outline btn-block"
              style={{ marginTop: 14, borderRadius: 'var(--radius-full)' }}
              onClick={() => setIsFavoritesModalOpen(false)}
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* ===== TUTORIAL INTERACTIVO (Primera vez tras instalación o desde Perfil) ===== */}
      {isTutorialActive && (
        <InteractiveTutorial
          onComplete={handleCompleteTutorial}
          onSkip={handleSkipTutorial}
          isDarkMode={isDarkMode}
        />
      )}

      {/* ===== AUTH MODAL (Mantiene login/registro y agrega ubicación híbrida) ===== */}
      {isAuthModalOpen && (
        <AuthModal
          onSuccess={handleLogin}
          onClose={() => setIsAuthModalOpen(false)}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleDarkMode}
        />
      )}

      {/* ===== MODAL: PUBLICAR SERVICIO (Boceto 16) ===== */}
      {isServiceModalOpen && (
        <div className="modal-bg">
          <div className="modal-card">
            <button className="modal-close" onClick={() => setIsServiceModalOpen(false)} aria-label="Cerrar modal">
              <X size={20} />
            </button>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 16, color: 'var(--coral)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Store size={20} color="var(--coral)" /> Ofrecer mi servicio
            </h3>
            <form onSubmit={handleCreateService}>
              <div className="field">
                <label>¿Qué servicio ofreces?</label>
                <input
                  type="text"
                  required
                  className="finput"
                  placeholder="Ej: Pintor de interiores y exteriores"
                  value={newService.title}
                  onChange={e => setNewService({ ...newService, title: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Categoría</label>
                <div className="fselect-wrap">
                  <select
                    className="finput fselect"
                    value={newService.categoryId}
                    onChange={e => setNewService({ ...newService, categoryId: e.target.value })}
                  >
                    {INITIAL_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <ChevronDown size={14} className="fselect-arrow" />
                </div>
              </div>
              <div className="field">
                <label>Descripción y experiencia</label>
                <textarea
                  required
                  rows={2}
                  className="finput"
                  placeholder="Describe qué trabajos realizas y tu garantía..."
                  value={newService.description}
                  onChange={e => setNewService({ ...newService, description: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Modalidad de cobro</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => setNewService({ ...newService, priceType: 'fixed' })}
                    style={{
                      border: newService.priceType === 'fixed'
                        ? '2px solid var(--coral)'
                        : `1px solid ${isDarkMode ? '#334155' : 'var(--gray-300)'}`,
                      background: newService.priceType === 'fixed'
                        ? (isDarkMode ? 'rgba(255, 90, 95, 0.16)' : '#FFF5F4')
                        : (isDarkMode ? '#1E293B' : '#FFFFFF'),
                      borderRadius: 12,
                      padding: '12px 10px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 800, color: newService.priceType === 'fixed' ? 'var(--coral)' : (isDarkMode ? '#F8FAFC' : 'var(--carbon)') }}>
                        Precio fijo
                      </span>
                      {newService.priceType === 'fixed' ? (
                        <CheckCircle2 size={16} color="var(--coral)" />
                      ) : (
                        <Circle size={16} color={isDarkMode ? '#475569' : '#9CA3AF'} />
                      )}
                    </div>
                    <span style={{ fontSize: '0.73rem', color: isDarkMode ? '#94A3B8' : '#6B7280', lineHeight: 1.25 }}>
                      Tarifa cerrada o por hora en Soles
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewService({ ...newService, priceType: 'quote' })}
                    style={{
                      border: newService.priceType === 'quote'
                        ? '2px solid var(--coral)'
                        : `1px solid ${isDarkMode ? '#334155' : 'var(--gray-300)'}`,
                      background: newService.priceType === 'quote'
                        ? (isDarkMode ? 'rgba(255, 90, 95, 0.16)' : '#FFF5F4')
                        : (isDarkMode ? '#1E293B' : '#FFFFFF'),
                      borderRadius: 12,
                      padding: '12px 10px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 800, color: newService.priceType === 'quote' ? 'var(--coral)' : (isDarkMode ? '#F8FAFC' : 'var(--carbon)') }}>
                        A cotizar en el lugar
                      </span>
                      {newService.priceType === 'quote' ? (
                        <CheckCircle2 size={16} color="var(--coral)" />
                      ) : (
                        <Circle size={16} color={isDarkMode ? '#475569' : '#9CA3AF'} />
                      )}
                    </div>
                    <span style={{ fontSize: '0.73rem', color: isDarkMode ? '#94A3B8' : '#6B7280', lineHeight: 1.25 }}>
                      Al acercarse para evaluar el servicio
                    </span>
                  </button>
                </div>
              </div>

              {newService.priceType === 'fixed' ? (
                <div className="field">
                  <label>Precio estimado por hora o trabajo (S/)</label>
                  <input
                    type="number"
                    min={5}
                    required
                    className="finput"
                    placeholder="Ej: 35"
                    value={newService.priceAmount || ''}
                    onChange={e => setNewService({ ...newService, priceAmount: Number(e.target.value) })}
                  />
                  <p style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: 4 }}>
                    Esta tarifa se mostrará como monto de referencia para tus vecinos.
                  </p>
                </div>
              ) : (
                <div style={{ background: '#F9FAFB', border: '1px solid var(--gray-200)', borderRadius: 10, padding: '10px 12px', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <MapPin size={16} color="var(--coral)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <p style={{ fontSize: '0.76rem', color: '#4B5563', margin: 0, lineHeight: 1.35 }}>
                      Al solicitarte, te acercarás al domicilio del vecino para evaluar los requerimientos y brindarle tu cotización final en el lugar.
                    </p>
                  </div>
                </div>
              )}
              <button type="submit" className="btn btn-coral btn-block" style={{ borderRadius: 'var(--radius-full)', marginTop: 4 }}>
                Publicar servicio
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL: PEDIR AYUDA (Boceto 12) ===== */}
      {isHelpModalOpen && (
        <div className="modal-bg">
          <div className="modal-card">
            <button className="modal-close" onClick={() => setIsHelpModalOpen(false)} aria-label="Cerrar modal">
              <X size={20} />
            </button>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 4, color: 'var(--coral)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <HeartHandshake size={20} color="var(--coral)" /> Pedir ayuda al barrio
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#6B7280', marginBottom: 16 }}>Solidario, gratuito y colaborativo</p>
            <form onSubmit={handleCreateHelp}>
              <div className="field">
                <label>¿Qué necesitas?</label>
                <div className="fselect-wrap">
                  <select className="finput fselect" value={newHelp.type} onChange={e => setNewHelp({ ...newHelp, type: e.target.value })}>
                    <option value="agua">Agua potable</option>
                    <option value="alimentos">Alimentos / Viandas</option>
                    <option value="herramientas">Herramientas</option>
                    <option value="transporte">Transporte / Auxilio</option>
                    <option value="otro">Otro apoyo vecinal</option>
                  </select>
                  <ChevronDown size={14} className="fselect-arrow" />
                </div>
              </div>
              <div className="field">
                <label>¿Qué tan urgente es?</label>
                <div className="fselect-wrap">
                  <select className="finput fselect" value={newHelp.urgency} onChange={e => setNewHelp({ ...newHelp, urgency: e.target.value })}>
                    <option value="alta">Muy urgente</option>
                    <option value="media">Atención hoy</option>
                    <option value="baja">No urgente</option>
                  </select>
                  <ChevronDown size={14} className="fselect-arrow" />
                </div>
              </div>
              <div className="field">
                <label>Detalles de la solicitud</label>
                <textarea
                  required
                  rows={2}
                  className="finput"
                  placeholder="Explica qué apoyo requieres de tus vecinos..."
                  value={newHelp.description}
                  onChange={e => setNewHelp({ ...newHelp, description: e.target.value })}
                />
              </div>

              <div className="field">
                <label>Tiempo de vigencia / ¿Hasta cuándo necesitas la ayuda?</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 8 }}>
                  {[
                    { label: '12 Horas', hours: 12 },
                    { label: '24 Horas', hours: 24 },
                    { label: '3 Días', hours: 72 }
                  ].map(opt => (
                    <button
                      key={opt.hours}
                      type="button"
                      className={`com-tab-pill ${newHelp.expiresHours === opt.hours && !newHelp.customExpiresAt ? 'active' : ''}`}
                      style={{ height: 36, fontSize: '0.78rem', padding: '0 8px', justifyContent: 'center' }}
                      onClick={() => setNewHelp({ ...newHelp, expiresHours: opt.hours, customExpiresAt: '' })}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <input
                  type="datetime-local"
                  min={getMinDateTime()}
                  className="finput"
                  value={newHelp.customExpiresAt}
                  onChange={e => setNewHelp({ ...newHelp, customExpiresAt: e.target.value })}
                />
                <p style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: 4 }}>
                  Al vencer la fecha, el pedido se retirará automáticamente del muro.
                </p>
              </div>

              <button type="submit" className="btn btn-coral btn-block" style={{ borderRadius: 'var(--radius-full)', marginTop: 4 }}>
                {isOnline ? 'Publicar pedido de auxilio' : 'Guardar en malla BLE'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL: ESCRIBIR AYUDA DE EMERGENCIA OFFLINE (BLE) ===== */}
      {isOfflineHelpModalOpen && (
        <div className="modal-bg">
          <div className="modal-card">
            <button className="modal-close" onClick={() => setIsOfflineHelpModalOpen(false)} aria-label="Cerrar modal">
              <X size={20} />
            </button>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 4, color: 'var(--coral)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Radio size={22} color="var(--coral)" /> Escribir ayuda de emergencia
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#6B7280', marginBottom: 16 }}>
              Se guardará en este teléfono y se transmitirá <strong>automáticamente por Bluetooth (BLE)</strong> a los vecinos cercanos sin internet.
            </p>

            <form onSubmit={handleCreateOfflineEmergency}>
              <div className="field">
                <label>Tipo de auxilio</label>
                <div className="fselect-wrap">
                  <select
                    className="finput fselect"
                    value={offlineEmergencyType}
                    onChange={e => setOfflineEmergencyType(e.target.value)}
                  >
                    <option value="agua">Agua potable (Corte o emergencia)</option>
                    <option value="medicina">Botiquín / Primeros Auxilios</option>
                    <option value="electricidad">Electricidad / Linternas</option>
                    <option value="adulto">Auxilio para Adulto Mayor</option>
                    <option value="alimento">Alimentos no perecibles</option>
                    <option value="otro">Reparación o apoyo urgente</option>
                  </select>
                  <ChevronDown size={14} className="fselect-arrow" />
                </div>
              </div>

              <div className="field">
                <label>Detalle de la emergencia</label>
                <textarea
                  required
                  rows={3}
                  className="finput"
                  placeholder="Ej. Adulto mayor necesita 2 bidones de agua en Pasaje Sol mz F..."
                  value={offlineEmergencyDesc}
                  onChange={e => setOfflineEmergencyDesc(e.target.value)}
                />
              </div>

              <div className="field">
                <label>Nivel de urgencia</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                  {(['alta', 'media', 'baja'] as const).map(u => (
                    <button
                      key={u}
                      type="button"
                      className={`com-tab-pill ${offlineEmergencyUrgency === u ? 'active' : ''}`}
                      style={{ justifyContent: 'center', height: 36, fontSize: '0.78rem' }}
                      onClick={() => setOfflineEmergencyUrgency(u)}
                    >
                      {u === 'alta' ? 'Muy Alta' : u === 'media' ? 'Media' : 'Normal'}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{
                background: isDarkMode ? '#1E293B' : '#F3F4F6',
                border: isDarkMode ? '1px solid #334155' : 'none',
                borderRadius: 10,
                padding: '10px 12px',
                fontSize: '0.74rem',
                color: isDarkMode ? '#CBD5E1' : '#4B5563',
                marginBottom: 16
              }}>
                <strong>Propagación automática:</strong> Tu mensaje se enviará automáticamente de teléfono a teléfono vecino cada pocos segundos por Bluetooth Mesh.
              </div>

              <button
                type="submit"
                className="btn btn-coral btn-block"
                style={{ borderRadius: 'var(--radius-full)' }}
              >
                Transmitir auxilio por malla BLE
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL: PUBLICAR AVISO DE COMUNIDAD (Boceto 13) ===== */}
      {isNoticeModalOpen && (
        <div className="modal-bg">
          <div className="modal-card">
            <button className="modal-close" onClick={() => setIsNoticeModalOpen(false)} aria-label="Cerrar modal">
              <X size={20} />
            </button>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 4, color: 'var(--coral)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Megaphone size={20} color="var(--coral)" /> Publicar aviso comunitario
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#6B7280', marginBottom: 16 }}>Informa a los vecinos de tu sector</p>
            <form onSubmit={handleCreateNotice}>
              <div className="field">
                <label>Título del aviso</label>
                <input
                  type="text"
                  required
                  className="finput"
                  placeholder="Ej: Corte programado de agua en el sector"
                  value={newNotice.title}
                  onChange={e => setNewNotice({ ...newNotice, title: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Tipo de aviso</label>
                <div className="fselect-wrap">
                  <select
                    className="finput fselect"
                    value={newNotice.category}
                    onChange={e => setNewNotice({ ...newNotice, category: e.target.value })}
                  >
                    <option value="corte_agua">Corte de agua / Sedapal</option>
                    <option value="corte_luz">Corte de energía eléctrica</option>
                    <option value="seguridad">Seguridad ciudadana</option>
                    <option value="general">Aviso general</option>
                  </select>
                  <ChevronDown size={14} className="fselect-arrow" />
                </div>
              </div>
              <div className="field">
                <label>Detalle o mensaje</label>
                <textarea
                  required
                  rows={3}
                  className="finput"
                  placeholder="Detalla qué está sucediendo, horarios y recomendaciones..."
                  value={newNotice.body}
                  onChange={e => setNewNotice({ ...newNotice, body: e.target.value })}
                />
              </div>

              <div className="field">
                <label>Tiempo de vigencia / Expiración automática</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 8 }}>
                  {[
                    { label: '12 Horas', hours: 12 },
                    { label: '24 Horas', hours: 24 },
                    { label: '3 Días', hours: 72 }
                  ].map(opt => (
                    <button
                      key={opt.hours}
                      type="button"
                      className={`com-tab-pill ${newNotice.expiresHours === opt.hours && !newNotice.customExpiresAt ? 'active' : ''}`}
                      style={{ height: 36, fontSize: '0.78rem', padding: '0 8px', justifyContent: 'center' }}
                      onClick={() => setNewNotice({ ...newNotice, expiresHours: opt.hours, customExpiresAt: '' })}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <input
                  type="datetime-local"
                  min={getMinDateTime()}
                  className="finput"
                  value={newNotice.customExpiresAt}
                  onChange={e => setNewNotice({ ...newNotice, customExpiresAt: e.target.value })}
                />
                <p style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: 4 }}>
                  El aviso desaparecerá al vencer la fecha establecida para mantener limpia la comunidad.
                </p>
              </div>

              <button type="submit" className="btn btn-coral btn-block" style={{ borderRadius: 'var(--radius-full)', marginTop: 4 }}>
                Publicar en el barrio
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL: PRÓRROGA / EXTENDER VIGENCIA ===== */}
      {extendModalItem && (
        <div className="modal-bg">
          <div className="modal-card">
            <button className="modal-close" onClick={() => setExtendModalItem(null)} aria-label="Cerrar modal">
              <X size={20} />
            </button>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 4, color: 'var(--coral)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Hourglass size={20} color="var(--coral)" /> Prorrogar publicación
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#4B5563', marginBottom: 12 }}>
              <strong>{extendModalItem.title}</strong>
            </p>
            <p style={{ fontSize: '0.78rem', color: '#6B7280', marginBottom: 16 }}>
              Cualquier integrante de la comunidad puede explayar o extender la duración para que siga visible para todos los vecinos.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{ borderRadius: 12, padding: '12px', fontWeight: 700 }}
                onClick={() => handleExtendItem(extendModalItem.id, extendModalItem.type, 12)}
              >
                + 12 Horas
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ borderRadius: 12, padding: '12px', fontWeight: 700, borderColor: 'var(--coral)', color: 'var(--coral)' }}
                onClick={() => handleExtendItem(extendModalItem.id, extendModalItem.type, 24)}
              >
                + 24 Horas
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ borderRadius: 12, padding: '12px', fontWeight: 700 }}
                onClick={() => handleExtendItem(extendModalItem.id, extendModalItem.type, 72)}
              >
                + 3 Días
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ borderRadius: 12, padding: '12px', fontWeight: 700 }}
                onClick={() => handleExtendItem(extendModalItem.id, extendModalItem.type, 168)}
              >
                + 1 Semana
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: CHAT COMUNITARIO ESTILO WHATSAPP AUTÉNTICO ===== */}
      {activeChatThread && (() => {
        const currentUserId = currentUser?.documentNumber || 'usr-me';
        const msgs = (chatMessages[activeChatThread.id] || []).filter(
          m => !m.deletedForUserIds?.includes(currentUserId)
        );
        const pinnedId = pinnedMessages[activeChatThread.id];
        const pinnedMsg = msgs.find(m => m.id === pinnedId);
        const isJoined = joinedChats.includes(activeChatThread.id);
        const selectedMsg = msgs.find(m => m.id === selectedMessageId);

        return (
          <div className="chat-overlay">
            <div className="chat-modal-window">
              {/* Header WhatsApp o Barra de selección por pulsación prolongada */}
              {selectedMsg ? (
                <div className="chat-selection-bar">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                      type="button"
                      className="chat-sel-action-btn"
                      onClick={() => setSelectedMessageId(null)}
                      aria-label="Cerrar selección"
                    >
                      <X size={22} />
                    </button>
                    <span className="chat-selection-count">1</span>
                  </div>
                  <div className="chat-selection-actions">
                    <button
                      type="button"
                      className="chat-sel-action-btn"
                      onClick={() => handlePinMessage(activeChatThread.id, selectedMsg.id)}
                      title={pinnedId === selectedMsg.id ? 'Desfijar' : 'Fijar mensaje'}
                    >
                      <Pin size={20} />
                    </button>

                    {selectedMsg.senderId === currentUserId && !selectedMsg.deletedForEveryone && (
                      <button
                        type="button"
                        className="chat-sel-action-btn"
                        onClick={() => handleStartEdit(selectedMsg)}
                        title="Editar mensaje"
                      >
                        <Edit2 size={20} />
                      </button>
                    )}

                    <button
                      type="button"
                      className="chat-sel-action-btn"
                      onClick={() => setIsDeleteMsgDialogOpen(true)}
                      title="Eliminar mensaje"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="chat-whatsapp-header">
                  <button
                    type="button"
                    className="chat-back-btn"
                    onClick={() => setActiveChatThread(null)}
                    aria-label="Volver"
                  >
                    <ArrowLeft size={22} />
                  </button>
                  <div className="chat-avatar-circle">
                    {activeChatThread.title.slice(0, 2).toUpperCase()}
                  </div>
                  <div
                    className="chat-header-center"
                    onClick={() => setIsChatInfoOpen(true)}
                    title="Toca para ver info del grupo vecinal y salir del chat"
                  >
                    <div className="chat-header-title-wa">{activeChatThread.title}</div>
                    <div className="chat-header-sub-wa">
                      <span>{activeChatThread.subtitle}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Mensaje Fijado si existe - Tocarlo busca y muestra el mensaje */}
              {pinnedMsg && !selectedMsg && (
                <div
                  className="chat-pin-banner-wa"
                  onClick={() => handleScrollToMessage(pinnedMsg.id)}
                  title="Toca para ir al mensaje fijado en la conversación"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', flex: 1 }}>
                    <Pin size={13} color="var(--coral)" style={{ flexShrink: 0 }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <strong>{pinnedMsg.senderName}:</strong> {pinnedMsg.text}
                    </span>
                  </div>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: '#92400E', cursor: 'pointer', padding: 4 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePinMessage(activeChatThread.id, pinnedMsg.id);
                    }}
                    title="Desfijar mensaje"
                  >
                    <X size={15} />
                  </button>
                </div>
              )}

              {/* Lista de mensajes tipo WhatsApp con fondo auténtico */}
              <div
                className="chat-messages-container"
                onClick={() => {
                  if (selectedMessageId) setSelectedMessageId(null);
                }}
              >
                <div className="chat-date-pill">HOY</div>

                {!isJoined && (
                  <div style={{
                    background: isDarkMode ? 'rgba(245, 158, 11, 0.14)' : '#FEF3C7',
                    border: `1px solid ${isDarkMode ? 'rgba(245, 158, 11, 0.35)' : '#FDE68A'}`,
                    padding: '8px 12px',
                    borderRadius: 10,
                    fontSize: '0.78rem',
                    color: isDarkMode ? '#FDE68A' : '#92400E',
                    textAlign: 'center',
                    margin: '2px 0 6px 0'
                  }}>
                    Estás en modo lectura. Envía un mensaje o toca el título para unirte a la coordinación vecinal.
                  </div>
                )}

                {msgs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#6B7280', fontSize: '0.85rem' }}>
                    <MessageCircle size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                    <p>No hay mensajes en este chat aún.</p>
                    <p style={{ fontSize: '0.75rem' }}>¡Sé el primero en iniciar la conversación vecinal!</p>
                  </div>
                ) : (
                  msgs.map(m => {
                    const isMe = m.senderId === currentUserId;
                    const isPinned = pinnedId === m.id;
                    const isDeleted = m.deletedForEveryone;
                    const isSelected = selectedMessageId === m.id;
                    const isHighlighted = highlightedMsgId === m.id;

                    return (
                      <div key={m.id} id={`chat-msg-${m.id}`} className={`chat-bubble-row ${isMe ? 'me' : 'other'}`}>
                        <div
                          className={`chat-bubble-wa ${isSelected ? 'is-selected' : ''} ${isHighlighted ? 'highlight-flash' : ''}`}
                          style={isPinned ? { borderLeft: '3px solid var(--coral)' } : undefined}
                          onMouseDown={() => handleBubblePressStart(m.id)}
                          onMouseUp={() => handleBubblePressEnd(m.id)}
                          onMouseLeave={handleBubblePressCancel}
                          onTouchStart={() => handleBubblePressStart(m.id)}
                          onTouchEnd={() => handleBubblePressEnd(m.id)}
                          onTouchMove={handleBubblePressCancel}
                        >
                          {!isMe && <div className="chat-sender-wa">{m.senderName}</div>}

                          {isPinned && (
                            <div style={{ fontSize: '0.66rem', color: 'var(--coral)', display: 'flex', alignItems: 'center', gap: 3, marginBottom: 2 }}>
                              <Pin size={10} /> Mensaje fijado
                            </div>
                          )}

                          {/* Foto o Video adjunto */}
                          {m.mediaUrl && (
                            <div className="chat-media-container">
                              {m.mediaType === 'video' ? (
                                <video src={m.mediaUrl} controls className="chat-media-video" />
                              ) : (
                                <img
                                  src={m.mediaUrl}
                                  alt="Foto adjunta"
                                  className="chat-media-img"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setChatLightboxMedia(m.mediaUrl!);
                                  }}
                                />
                              )}
                            </div>
                          )}

                          <div className={isDeleted ? 'chat-bubble-deleted-wa' : 'chat-bubble-text'}>
                            {m.text}
                          </div>

                          <div className="chat-meta-wa">
                            {m.isEdited && <span style={{ fontSize: '0.62rem', color: '#9CA3AF' }}>(editado)</span>}
                            <span>{m.timestampLabel}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Barra inferior estilo WhatsApp con margen de seguridad para botones de movimiento Android */}
              <div className="chat-whatsapp-footer">
                {editingMessageId && (
                  <div className="chat-edit-indicator">
                    <span>Editando mensaje</span>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: '#92400E', cursor: 'pointer' }}
                      onClick={() => { setEditingMessageId(null); setChatInputText(''); }}
                    >
                      <X size={15} />
                    </button>
                  </div>
                )}

                {pendingChatMedia && (
                  <div className="chat-media-preview-bar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                      {pendingChatMedia.type === 'image' ? (
                        <img src={pendingChatMedia.url} alt="Vista previa" className="chat-media-preview-thumb" />
                      ) : (
                        <div style={{ width: 44, height: 44, background: '#111827', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>
                          <Play size={20} />
                        </div>
                      )}
                      <span style={{ fontSize: '0.78rem', color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {pendingChatMedia.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', padding: 4 }}
                      onClick={() => setPendingChatMedia(null)}
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}

                <form className="chat-input-controls-row" onSubmit={handleSendMessage}>
                  {/* Input exclusivo para abrir la CÁMARA nativa */}
                  <input
                    type="file"
                    ref={cameraInputRef}
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={handleChatMediaSelect}
                  />

                  {/* Input exclusivo para abrir la GALERÍA / Archivos */}
                  <input
                    type="file"
                    ref={galleryInputRef}
                    accept="image/*,video/*"
                    style={{ display: 'none' }}
                    onChange={handleChatMediaSelect}
                  />

                  <div className="chat-input-capsule">
                    <input
                      type="text"
                      className="chat-capsule-input"
                      placeholder={editingMessageId ? 'Escribe el texto corregido...' : 'Mensaje'}
                      value={chatInputText}
                      onChange={e => setChatInputText(e.target.value)}
                    />
                    <button
                      type="button"
                      className="chat-capsule-btn"
                      onClick={() => cameraInputRef.current?.click()}
                      title="Tomar foto con la cámara"
                      aria-label="Tomar foto con la cámara"
                    >
                      <Camera size={21} />
                    </button>
                    <button
                      type="button"
                      className="chat-capsule-btn"
                      onClick={() => galleryInputRef.current?.click()}
                      title="Seleccionar de galería"
                      aria-label="Seleccionar de galería"
                    >
                      <ImageIcon size={20} />
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="chat-send-btn-wa"
                    aria-label="Enviar"
                    disabled={!chatInputText.trim() && !pendingChatMedia}
                    style={{ opacity: (!chatInputText.trim() && !pendingChatMedia) ? 0.6 : 1 }}
                  >
                    <Send size={20} />
                  </button>
                </form>
              </div>

              {/* Modal de Información del Grupo Vecinal (Donde está oculta la opción Salir del Chat) */}
              {isChatInfoOpen && (
                <div className="chat-info-modal">
                  <div className="chat-info-header">
                    <button
                      type="button"
                      className="chat-back-btn"
                      onClick={() => setIsChatInfoOpen(false)}
                      aria-label="Cerrar información"
                    >
                      <ArrowLeft size={20} />
                    </button>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--carbon)' }}>
                      Info. del grupo vecinal
                    </div>
                  </div>

                  <div className="chat-info-card" style={{ textAlign: 'center', padding: '24px 16px' }}>
                    <div
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--orange), var(--coral))',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 12px',
                        boxShadow: '0 4px 10px rgba(216, 59, 53, 0.25)'
                      }}
                    >
                      {activeChatThread.itemType === 'ayuda' ? <HeartHandshake size={36} /> :
                       activeChatThread.itemType === 'aviso' ? <Megaphone size={36} /> :
                       <CalendarDays size={36} />}
                    </div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--carbon)', margin: '0 0 6px 0' }}>
                      {activeChatThread.title}
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: 0 }}>
                      {activeChatThread.subtitle}
                    </p>
                  </div>

                  <div className="chat-info-card">
                    <h4 style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--coral)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
                      Coordinación comunitaria
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.85rem', color: '#374151' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Shield size={16} color="var(--coral)" />
                        <span>Chat vecinal verificado en {selectedNeighborhood}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Users size={16} color="var(--coral)" />
                        <span>{msgs.length + 3} mensajes y actualizaciones de vecinos</span>
                      </div>
                    </div>
                  </div>

                  {/* Acciones del chat con separación respecto a los botones de navegación Android */}
                  <div className="chat-info-actions-box">
                    {isJoined ? (
                      <button
                        type="button"
                        className="btn"
                        style={{
                          width: '100%',
                          background: '#FEE2E2',
                          color: '#DC2626',
                          border: '1px solid #FCA5A5',
                          padding: '13px',
                          borderRadius: 14,
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          fontSize: '0.92rem'
                        }}
                        onClick={() => setIsConfirmLeaveChatOpen(true)}
                      >
                        <LogOut size={18} /> Salir del chat vecinal
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-coral"
                        style={{
                          width: '100%',
                          padding: '13px',
                          borderRadius: 14,
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          fontSize: '0.92rem'
                        }}
                        onClick={() => {
                          handleJoinChat(activeChatThread.id);
                          setIsChatInfoOpen(false);
                        }}
                      >
                        <Users size={18} /> Unirme a este chat
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Modal de confirmación para Salir del Chat */}
              {isConfirmLeaveChatOpen && (
                <div className="chat-delete-dialog-overlay" onClick={() => setIsConfirmLeaveChatOpen(false)}>
                  <div className="chat-delete-dialog" onClick={e => e.stopPropagation()}>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#111827' }}>
                      ¿Deseas salirte de este chat?
                    </h4>
                    <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#4B5563', lineHeight: 1.4 }}>
                      ¿Estás seguro de que deseas salirte de la conversación vecinal de "{activeChatThread.title}"? Ya no recibirás nuevos avisos ni podrás enviar mensajes en este hilo.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                      <button
                        type="button"
                        className="btn"
                        style={{ background: '#DC2626', color: '#FFFFFF', padding: '10px 14px', borderRadius: 10, fontWeight: 700, fontSize: '0.88rem' }}
                        onClick={() => {
                          handleLeaveChat(activeChatThread.id);
                          setIsConfirmLeaveChatOpen(false);
                          setIsChatInfoOpen(false);
                        }}
                      >
                        Sí, salir del chat
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ padding: '10px 14px', borderRadius: 10, fontWeight: 700, fontSize: '0.88rem' }}
                        onClick={() => setIsConfirmLeaveChatOpen(false)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal de confirmación para eliminar mensaje */}
              {isDeleteMsgDialogOpen && selectedMsg && (
                <div
                  className="chat-delete-dialog-overlay"
                  onClick={() => {
                    setIsDeleteMsgDialogOpen(false);
                    setDeleteConfirmMode(null);
                  }}
                >
                  <div className="chat-delete-dialog" onClick={e => e.stopPropagation()}>
                    {deleteConfirmMode === null ? (
                      <>
                        <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#111827' }}>
                          ¿Deseas eliminar este mensaje?
                        </h4>
                        <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#6B7280' }}>
                          Selecciona una opción para eliminar el mensaje:
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                          {selectedMsg.senderId === currentUserId && (
                            <button
                              type="button"
                              className="btn"
                              style={{ background: '#DC2626', color: '#FFFFFF', padding: '10px 14px', borderRadius: 10, fontWeight: 700, fontSize: '0.85rem' }}
                              onClick={() => setDeleteConfirmMode('everyone')}
                            >
                              Eliminar para todos
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{ padding: '10px 14px', borderRadius: 10, fontWeight: 700, fontSize: '0.85rem' }}
                            onClick={() => setDeleteConfirmMode('me')}
                          >
                            Eliminar para mí
                          </button>
                          <button
                            type="button"
                            style={{ background: 'none', border: 'none', color: '#6B7280', padding: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                            onClick={() => {
                              setIsDeleteMsgDialogOpen(false);
                              setDeleteConfirmMode(null);
                            }}
                          >
                            Cancelar
                          </button>
                        </div>
                      </>
                    ) : deleteConfirmMode === 'everyone' ? (
                      <>
                        <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#DC2626' }}>
                          ¿Eliminar para todos los vecinos?
                        </h4>
                        <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#4B5563', lineHeight: 1.4 }}>
                          ¿Estás seguro de querer eliminar este mensaje para todos? Se borrará permanentemente para ti y para todos los miembros de este chat vecinal.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                          <button
                            type="button"
                            className="btn"
                            style={{ background: '#DC2626', color: '#FFFFFF', padding: '10px 14px', borderRadius: 10, fontWeight: 700, fontSize: '0.85rem' }}
                            onClick={() => {
                              handleDeleteMessage(selectedMsg.id, 'everyone');
                              setIsDeleteMsgDialogOpen(false);
                              setDeleteConfirmMode(null);
                              setSelectedMessageId(null);
                            }}
                          >
                            Sí, eliminar para todos
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{ padding: '10px 14px', borderRadius: 10, fontWeight: 700, fontSize: '0.85rem' }}
                            onClick={() => setDeleteConfirmMode(null)}
                          >
                            Cancelar
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#111827' }}>
                          ¿Eliminar para ti?
                        </h4>
                        <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#4B5563', lineHeight: 1.4 }}>
                          ¿Estás seguro de querer eliminar este mensaje para ti? Solo se eliminará de tu vista en este teléfono, pero los demás vecinos aún podrán verlo.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                          <button
                            type="button"
                            className="btn"
                            style={{ background: '#DC2626', color: '#FFFFFF', padding: '10px 14px', borderRadius: 10, fontWeight: 700, fontSize: '0.85rem' }}
                            onClick={() => {
                              handleDeleteMessage(selectedMsg.id, 'me');
                              setIsDeleteMsgDialogOpen(false);
                              setDeleteConfirmMode(null);
                              setSelectedMessageId(null);
                            }}
                          >
                            Sí, eliminar para mí
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{ padding: '10px 14px', borderRadius: 10, fontWeight: 700, fontSize: '0.85rem' }}
                            onClick={() => setDeleteConfirmMode(null)}
                          >
                            Cancelar
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Visor a pantalla completa de fotos */}
              {chatLightboxMedia && (
                <div className="chat-lightbox-overlay" onClick={() => setChatLightboxMedia(null)}>
                  <button
                    type="button"
                    style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer' }}
                    onClick={() => setChatLightboxMedia(null)}
                    aria-label="Cerrar visor"
                  >
                    <X size={28} />
                  </button>
                  <img src={chatLightboxMedia} alt="Foto ampliada" className="chat-lightbox-img" onClick={e => e.stopPropagation()} />
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ===== MODAL: CENTRO DE NOTIFICACIONES FUNCIONAL ===== */}
      {isNotificationsOpen && (
        <div className="modal-bg">
          <div className="modal-card" style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell size={20} color="var(--coral)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: isDarkMode ? '#F8FAFC' : 'var(--carbon)', margin: 0 }}>
                  Notificaciones
                </h3>
              </div>
              <button className="modal-close" onClick={() => setIsNotificationsOpen(false)} aria-label="Cerrar modal">
                <X size={20} />
              </button>
            </div>

            {/* Banner de permiso: SE OCULTA COMPLETAMENTE SI YA SE OTORGARON LOS PERMISOS */}
            {!hasNotificationPermission && (
              <div style={{
                background: isDarkMode ? 'rgba(245, 158, 11, 0.14)' : '#FEF3C7',
                border: `1px solid ${isDarkMode ? 'rgba(245, 158, 11, 0.35)' : '#FDE68A'}`,
                borderRadius: 12,
                padding: '10px 12px',
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BellRing size={18} color="#F59E0B" />
                  <div style={{ fontSize: '0.78rem', color: isDarkMode ? '#FDE68A' : '#92400E' }}>
                    <strong>Permiso de notificaciones</strong>
                    <div style={{ color: isDarkMode ? '#CBD5E1' : '#92400E', fontSize: '0.74rem' }}>
                      Activa las notificaciones para recibir alertas vecinales en tu teléfono.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-coral"
                  style={{ fontSize: '0.74rem', padding: '6px 12px', borderRadius: 10, whiteSpace: 'nowrap', fontWeight: 700 }}
                  onClick={handleRequestNotificationPermission}
                >
                  Activar
                </button>
              </div>
            )}

            {/* Lista de Notificaciones */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
              {notifications.map(notif => (
                <div
                  key={notif.id}
                  className={`notif-card ${!notif.read ? 'unread' : ''}`}
                  onClick={() => {
                    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
                    if (notif.chatThreadId) {
                      setIsNotificationsOpen(false);
                      handleOpenChat(
                        notif.chatThreadId,
                        notif.title.replace(/^[^a-zA-Z0-9áéíóúÁÉÍÓÚ]+/, ''),
                        'Chat vecinal',
                        'aviso'
                      );
                    } else if (notif.linkTab) {
                      setIsNotificationsOpen(false);
                      if ((notif.linkTab as string) === 'servicios') {
                        navigateTo('explore');
                      } else {
                        setCommunityTab(notif.linkTab as CommunityTabType);
                        navigateTo('home');
                      }
                    }
                  }}
                >
                  {!notif.read && <div className="notif-unread-dot" />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="notif-title" style={{ fontSize: '0.86rem', fontWeight: 700, color: isDarkMode ? '#F8FAFC' : 'var(--carbon)', marginBottom: 2 }}>
                      {notif.title}
                    </div>
                    <div className="notif-body" style={{ fontSize: '0.78rem', color: isDarkMode ? '#CBD5E1' : '#4B5563', lineHeight: 1.35, marginBottom: 4 }}>
                      {notif.body}
                    </div>
                    <div className="notif-date" style={{ fontSize: '0.7rem', color: isDarkMode ? '#94A3B8' : '#9CA3AF' }}>
                      {notif.date}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Acciones de pie de página */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: isDarkMode ? '1px solid #233044' : '1px solid #E5E7EB' }}>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: isDarkMode ? '#94A3B8' : '#6B7280', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                onClick={handleMarkAllNotificationsRead}
              >
                Marcar todas como leídas
              </button>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: isDarkMode ? '#FF7B75' : 'var(--coral)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                onClick={handleTestNotification}
              >
                Probar notificación
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
