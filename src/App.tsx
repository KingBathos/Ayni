import React, { useState, useRef, useEffect, useCallback } from 'react';
import { App as CapApp } from '@capacitor/app';
import {
  Store, MapPin, Wifi, WifiOff, Radio, Users, HeartHandshake,
  AlertTriangle, Star, CheckCircle2, Plus, Search, RefreshCw,
  Info, User as UserIcon, ShieldCheck,
  Bell, ChevronRight, Heart, Clock, Bookmark, CreditCard, Settings,
  HelpCircle, LogOut, ArrowLeft, Camera, Calendar, Send, Navigation,
  Zap, Wrench, Hammer, Sparkles, GraduationCap, Utensils, MoreHorizontal,
  Phone, MessageCircle, CheckCircle, Circle, ThumbsUp
} from 'lucide-react';
import {
  INITIAL_SERVICES, INITIAL_COMMUNITY_POSTS, INITIAL_HELP_REQUESTS,
  INITIAL_BOOKINGS, INITIAL_CATEGORIES
} from './mockData';
import { ServiceItem, HelpRequest, Booking, OfflineEnvelope, CommunityPost } from './types';
import { AuthModal } from './AuthModal';
import { AyniMap } from './AyniMap';
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

export function App() {
  const [view, setView] = useState<ViewType>(() => {
    try {
      const done = localStorage.getItem('ayni_onboarding_completed');
      return done === 'true' ? 'home' : 'welcome';
    } catch {
      return 'welcome';
    }
  });

  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStageText, setLoadingStageText] = useState('Iniciando recursos de Ayni...');
  const [isResourcesLoaded, setIsResourcesLoaded] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const [currentUser, setCurrentUser] = useState<{
    name: string; documentNumber: string; neighborhood: string; district: string;
  } | null>(null);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [services, setServices] = useState<ServiceItem[]>(INITIAL_SERVICES);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>(INITIAL_COMMUNITY_POSTS);
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>(INITIAL_HELP_REQUESTS);
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [offlineQueue, setOfflineQueue] = useState<OfflineEnvelope[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Pestaña en Mis Solicitudes (Boceto 10)
  const [requestsTab, setRequestsTab] = useState<'current' | 'history'>('current');

  // Modal Calificar Servicio (Boceto 15)
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [rateScore, setRateScore] = useState(5);
  const [rateComment, setRateComment] = useState('');
  const [rateTags, setRateTags] = useState<string[]>(['Puntual', 'Trabajo impecable']);

  // Modals de Publicar
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [newHelp, setNewHelp] = useState({ type: 'agua', description: '', urgency: 'alta' });
  const [newService, setNewService] = useState({
    title: '', categoryId: 'electricidad', description: '', priceAmount: 35, priceType: 'fixed' as 'fixed' | 'quote', coverageArea: 'Radio 2 km'
  });
  const [requestDesc, setRequestDesc] = useState('');

  // Sincronización offline en curso
  const [isSyncing, setIsSyncing] = useState(false);
  const [userRole, setUserRole] = useState<'vecino' | 'proveedor'>('vecino');

  // Carga inicial y sincronización con Backend FastAPI
  useEffect(() => {
    const syncWithBackend = async () => {
      try {
        const backendOnline = await api.isOnline();
        if (!backendOnline) return;
        setIsOnline(true);

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

  const selectedNeighborhood = currentUser?.neighborhood || 'Ciclovía Malachowsky, San Borja';
  const userName = currentUser?.name || 'María';
  const userInitial = userName.charAt(0).toUpperCase();

  const viewRef = useRef(view);
  viewRef.current = view;

  const previousViewRef = useRef<ViewType>('home');

  const modalsRef = useRef({
    isAuthModalOpen,
    isHelpModalOpen,
    isServiceModalOpen,
    isRateModalOpen
  });
  modalsRef.current = {
    isAuthModalOpen,
    isHelpModalOpen,
    isServiceModalOpen,
    isRateModalOpen
  };

  const navigateTo = (nextView: ViewType) => {
    if (view !== nextView) {
      previousViewRef.current = view;
      setView(nextView);
    }
  };

  const handleBack = useCallback(() => {
    const { isAuthModalOpen, isHelpModalOpen, isServiceModalOpen, isRateModalOpen } = modalsRef.current;
    if (isRateModalOpen) { setIsRateModalOpen(false); return; }
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

    const newItem: ServiceItem = {
      id: `srv-${Date.now()}`,
      providerId: currentUser?.documentNumber || 'usr-me',
      providerName: `${userName} (Tú)`,
      categoryId: newService.categoryId,
      title: newService.title,
      description: newService.description,
      priceType: newService.priceType,
      priceAmount: newService.priceAmount,
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
          price_amount: newItem.priceAmount,
          coverage_area: newItem.coverageArea
        });
      }
    } catch {}
    alert('✅ Tu servicio ha sido publicado para tus vecinos.');
  };

  // Crear solicitud de ayuda solidaria
  const handleCreateHelp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHelp.description.trim()) return;

    const newReq: HelpRequest = {
      id: `help-${Date.now()}`,
      authorName: userName,
      authorId: currentUser?.documentNumber || 'usr-me',
      type: newHelp.type as any,
      description: newHelp.description,
      urgency: newHelp.urgency as any,
      neighborhood: selectedNeighborhood,
      status: 'abierta',
      date: 'Recién publicado'
    };

    setHelpRequests([newReq, ...helpRequests]);
    setIsHelpModalOpen(false);
    setNewHelp({ type: 'agua', description: '', urgency: 'alta' });

    if (!isOnline) {
      setOfflineQueue(prev => [
        {
          id: `msg-${Date.now().toString(36)}`,
          type: 'help_request',
          payload: newReq,
          createdAt: new Date().toISOString(),
          status: 'local',
          hops: 1,
          hopLimit: 5
        },
        ...prev
      ]);
      alert('💾 Pedido guardado en este teléfono. Se transmitirá por malla BLE cuando haya dispositivos cercanos.');
    } else {
      alert('📢 Tu pedido de ayuda solidaria ha sido enviado al vecindario.');
    }
  };

  // Solicitar contratación de servicio
  const handleRequestService = () => {
    if (!selectedService) return;
    const newBk: Booking = {
      id: `bk-${Date.now()}`,
      serviceId: selectedService.id,
      serviceTitle: selectedService.title,
      clientId: currentUser?.documentNumber || 'usr-me',
      clientName: userName,
      providerId: selectedService.providerId,
      providerName: selectedService.providerName,
      status: 'en_proceso',
      date: 'Hoy, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      hasReview: false,
      notes: requestDesc
    };

    setBookings([newBk, ...bookings]);
    setSelectedBooking(newBk);
    setRequestDesc('');
    navigateTo('tracking');
  };

  // Enviar calificación
  const handleSubmitRating = () => {
    if (selectedBooking) {
      setBookings(bookings.map(b => b.id === selectedBooking.id ? { ...b, hasReview: true, status: 'completado' } : b));
    }
    setIsRateModalOpen(false);
    alert('⭐ ¡Muchas gracias! Tu reseña ayuda a fortalecer la confianza vecinal.');
  };

  // Disparar sincronización offline BLE
  const handleSyncOffline = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setOfflineQueue([]);
      alert('📡 Sincronización exitosa: Se sincronizaron los paquetes con la red vecinal y el servidor central.');
    }, 1800);
  };

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

  // ============================ RENDER ============================
  return (
    <div className="phone">

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
                  try {
                    localStorage.setItem('ayni_onboarding_completed', 'true');
                  } catch {}
                  navigateTo('home');
                  setIsAuthModalOpen(true);
                }}
              >
                Comenzar
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========== HOME SCREEN (Boceto 05) ========== */}
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
                  onClick={() => navigateTo('offline')}
                  title="Centro de Conectividad (BLE)"
                  style={!isOnline ? { background: '#FEF3C7' } : { background: '#E8F8F0' }}
                >
                  {isOnline ? <Wifi size={17} color="#2E9D72" /> : <WifiOff size={17} color="#D83B35" />}
                </button>
                <button className="icon-circle" style={{ position: 'relative' }}>
                  <Bell size={17} color="#4B5563" />
                  <span style={{ position: 'absolute', top: 8, right: 8, width: 7, height: 7, borderRadius: '50%', background: '#D83B35' }} />
                </button>
              </div>
            </div>

            <div className="loc-chip" onClick={() => navigateTo('map')}>
              <MapPin size={14} color="#D83B35" />
              <span>{selectedNeighborhood}</span>
              <ChevronRight size={14} color="#D83B35" />
            </div>

            <div className="search-bar" onClick={() => navigateTo('explore')}>
              <Search size={18} color="#9CA3AF" />
              <input type="text" placeholder="Buscar servicios..." readOnly style={{ cursor: 'pointer' }} />
            </div>
          </header>

          {!isOnline && (
            <div className="off-banner" onClick={() => navigateTo('offline')} style={{ cursor: 'pointer' }}>
              <Radio size={16} />
              <span>Sin Internet — Modo offline activado (Toca para ver malla BLE)</span>
            </div>
          )}

          <div className="body">
            <div className="body-pad">

              {/* Categorías (Boceto 05) */}
              <div className="sec"><h3>Categorías</h3></div>
              <div className="cat-grid">
                {INITIAL_CATEGORIES.map(c => (
                  <div key={c.id} className="cat-item" onClick={() => { setSelectedCategory(c.id); navigateTo('explore'); }}>
                    <div className={`cat-icon ${CAT_CSS[c.id] || ''}`}>
                      {renderCategoryIcon(c.id)}
                    </div>
                    <div className="cat-label">{c.name}</div>
                  </div>
                ))}
                <div className="cat-item" onClick={() => { setSelectedCategory('all'); navigateTo('explore'); }}>
                  <div className="cat-icon more">
                    <MoreHorizontal size={20} color="#6B7280" />
                  </div>
                  <div className="cat-label">Ver todas</div>
                </div>
              </div>

              {/* Banner Promocional Oficial (Boceto 05) */}
              <div className="promo-banner">
                <h4>✨ Descuentos especiales</h4>
                <p>en servicios del hogar esta semana</p>
              </div>

              {/* Profesionales Destacados (Boceto 05) */}
              <div className="sec">
                <h3>Profesionales destacados</h3>
                <button className="sec-link" onClick={() => navigateTo('explore')}>Ver todos</button>
              </div>

              {services.slice(0, 3).map(srv => (
                <div key={srv.id} className="feat-pro" onClick={() => openProDetail(srv)}>
                  <div className="feat-pro-photo">
                    {PRO_INITIALS[srv.providerId] || 'PR'}
                  </div>
                  <div className="feat-pro-info">
                    <div className="feat-pro-name">
                      {srv.providerName.split('(')[0].trim()}
                      <CheckCircle size={14} color="#2E9D72" />
                    </div>
                    <div className="feat-pro-meta">
                      <Star size={12} fill="#F59E0B" color="#F59E0B" /> {srv.rating} &nbsp;·&nbsp;
                      {srv.coverageArea}
                    </div>
                  </div>
                  <ChevronRight size={18} color="#d1d5db" />
                </div>
              ))}

              {/* Avisos Comunitarios del Barrio (Boceto 13) */}
              <div className="sec" style={{ marginTop: 18 }}>
                <h3>📢 Avisos del barrio</h3>
                <button className="sec-link">Ver todos</button>
              </div>

              {communityPosts.slice(0, 2).map(post => (
                <div key={post.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span
                      className="tag"
                      style={{
                        background: post.verificationStatus === 'corroborado' ? '#E8F8F0' : '#FEF3C7',
                        color: post.verificationStatus === 'corroborado' ? '#2E9D72' : '#92400E',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 6
                      }}
                    >
                      {post.verificationStatus === 'corroborado' ? '✅ Corroborado por vecinos' : '⚠️ Reportado'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>{post.date}</span>
                  </div>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 700, margin: '6px 0', color: 'var(--carbon)' }}>{post.title}</h4>
                  <p style={{ fontSize: '0.82rem', color: '#4B5563', lineHeight: 1.4 }}>{post.body}</p>
                  <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: '#6B7280' }}>👤 {post.authorName}</span>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => {
                        setCommunityPosts(communityPosts.map(p => p.id === post.id ? { ...p, corroborations: p.corroborations + 1, verificationStatus: 'corroborado' } : p));
                      }}
                    >
                      <ThumbsUp size={13} /> Confirmar ({post.corroborations})
                    </button>
                  </div>
                </div>
              ))}

              {/* Solicitudes de Ayuda Vecinal Solidaria (Boceto 12) */}
              <div className="sec" style={{ marginTop: 18 }}>
                <h3>🤝 Ayuda vecinal mutua</h3>
                <button className="sec-link" onClick={() => setIsHelpModalOpen(true)}>+ Pedir ayuda</button>
              </div>

              {helpRequests.slice(0, 2).map(req => (
                <div key={req.id} className={`help-card ${req.urgency === 'alta' ? 'urgent' : ''}`}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <span
                      className="tag"
                      style={{
                        background: req.urgency === 'alta' ? '#FEE2E2' : '#FEF3C7',
                        color: req.urgency === 'alta' ? '#D83B35' : '#92400E',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 6
                      }}
                    >
                      {req.urgency === 'alta' ? '🚨 Urgente' : '⏳ Hoy'}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--carbon)', marginBottom: 4 }}>{req.description}</p>
                  <div style={{ fontSize: '0.78rem', color: '#6B7280' }}>
                    👤 {req.authorName} &nbsp;·&nbsp; 📍 {req.neighborhood}
                  </div>
                  {req.status === 'abierta' && (
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ marginTop: 10, width: '100%', borderColor: '#FF875C', color: '#D83B35' }}
                      onClick={() => {
                        setHelpRequests(helpRequests.map(h => h.id === req.id ? { ...h, status: 'en_coordinacion', helperName: userName } : h));
                        alert('🤝 ¡Muchas gracias por tu solidaridad vecinal!');
                      }}
                    >
                      🤝 Yo puedo ayudar
                    </button>
                  )}
                </div>
              ))}

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
                      <span>📍 {srv.coverageArea}</span>
                      <span style={{ fontWeight: 700, color: 'var(--coral)' }}>Desde S/ {srv.priceAmount || '30'}</span>
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
                <div className="prof-stat-val">🛠️ {selectedService.jobsCompleted}</div>
                <div className="prof-stat-label">Trabajos</div>
              </div>
              <div className="prof-stat">
                <div className="prof-stat-val">📍 {selectedService.coverageArea.split(' ').pop()}</div>
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
                <h4 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: 6, color: 'var(--carbon)' }}>Tarifa estimada</h4>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--coral)' }}>
                  {selectedService.priceType === 'fixed' ? `S/ ${selectedService.priceAmount} / hora` : 'A cotizar según diagnóstico'}
                </div>
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
              <div className="feat-pro" style={{ marginBottom: 16 }}>
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

              <div className="field">
                <label>Adjuntar fotos (opcional)</label>
                <button type="button" className="btn btn-outline btn-block" style={{ borderStyle: 'dashed' }}>
                  <Camera size={18} color="#9CA3AF" /> Agregar fotos del problema
                </button>
              </div>

              <div className="field">
                <label>Barrio / Dirección aproximada</label>
                <div className="finput" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#4B5563' }}>
                  <MapPin size={16} color="var(--coral)" />
                  {selectedNeighborhood}
                </div>
              </div>

              <div className="field">
                <label>Fecha y horario preferido</label>
                <div className="finput" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#4B5563' }}>
                  <Calendar size={16} color="#6B7280" />
                  Hoy lo antes posible
                </div>
              </div>

              <button
                className="btn btn-coral btn-block"
                style={{ borderRadius: 'var(--radius-full)', marginTop: 12 }}
                onClick={handleRequestService}
              >
                <Send size={18} /> Confirmar y enviar solicitud
              </button>
            </div>
          </div>
        </>
      )}

      {/* ========== SEGUIMIENTO DE SERVICIO EN VIVO (Boceto 09) ========== */}
      {view === 'tracking' && (
        <>
          <div className="top-bar" style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 12 }}>
            <button className="icon-circle" onClick={handleBack}><ArrowLeft size={18} /></button>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--carbon)' }}>Seguimiento de servicio</h3>
          </div>

          <div className="body">
            <div className="body-pad">
              <div className="card">
                <div className="timeline">
                  {[
                    { label: 'Solicitud enviada', sub: 'Hoy, 9:20 a. m.', done: true },
                    { label: 'En revisión', sub: 'Hoy, 9:25 a. m.', done: true },
                    { label: 'Aceptada', sub: 'Hoy, 9:30 a. m.', done: true },
                    { label: 'Profesional en camino', sub: 'Llegará en aprox. 15 min', active: true },
                    { label: 'Servicio en proceso', sub: '', pending: true },
                    { label: 'Finalizado y calificado', sub: '', pending: true },
                  ].map((step, i) => (
                    <div key={i} className={`tl-step ${step.done ? 'done' : ''}`}>
                      <div className={`tl-dot ${step.done ? 'done' : step.active ? 'active' : 'pending'}`}>
                        {step.done ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                      </div>
                      <div className="tl-content">
                        <h4>{step.label}</h4>
                        {step.sub && <p>{step.sub}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tarjeta de contacto del profesional */}
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="feat-pro-photo" style={{ width: 44, height: 44 }}>
                    {selectedService ? PRO_INITIALS[selectedService.providerId] || 'PR' : 'PR'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--carbon)', fontSize: '0.92rem' }}>
                      {selectedService?.providerName.split('(')[0].trim() || 'José Ramírez'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#6B7280' }}>
                      Llegando en bicicleta / ~15 min
                    </div>
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    <a href="tel:999888777" className="icon-circle" style={{ background: '#E8F8F0' }}>
                      <Phone size={16} color="#2E9D72" />
                    </a>
                    <a href="https://wa.me/51999888777" target="_blank" rel="noreferrer" className="icon-circle" style={{ background: '#FFF7ED' }}>
                      <MessageCircle size={16} color="#FF875C" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Botón para finalizar y calificar servicio */}
              <button
                className="btn btn-coral btn-block"
                style={{ borderRadius: 'var(--radius-full)', marginTop: 8 }}
                onClick={() => setIsRateModalOpen(true)}
              >
                ⭐ Completar y calificar servicio
              </button>
            </div>
          </div>
        </>
      )}

      {/* ========== MIS SOLICITUDES (Boceto 10) ========== */}
      {view === 'requests' && (
        <>
          <div className="top-bar" style={{ borderBottom: '1px solid var(--gray-200)', paddingBottom: 14 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--carbon)' }}>Mis solicitudes</h3>
          </div>

          <div className="body">
            <div className="body-pad">
              {/* Segmented tabs */}
              <div className="seg-tabs">
                <button
                  className={`seg-tab ${requestsTab === 'current' ? 'active' : ''}`}
                  onClick={() => setRequestsTab('current')}
                >
                  En curso ({bookings.filter(b => b.status !== 'completado').length})
                </button>
                <button
                  className={`seg-tab ${requestsTab === 'history' ? 'active' : ''}`}
                  onClick={() => setRequestsTab('history')}
                >
                  Historial ({bookings.filter(b => b.status === 'completado').length})
                </button>
              </div>

              {bookings.filter(b => requestsTab === 'current' ? b.status !== 'completado' : b.status === 'completado').length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF' }}>
                  <Store size={40} style={{ margin: '0 auto 8px', opacity: 0.4, display: 'block' }} />
                  <p style={{ fontWeight: 700 }}>No hay solicitudes en esta sección</p>
                  <p style={{ fontSize: '0.82rem' }}>Explora servicios cercanos de tu barrio</p>
                </div>
              ) : (
                bookings
                  .filter(b => requestsTab === 'current' ? b.status !== 'completado' : b.status === 'completado')
                  .map(b => (
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, color: 'var(--carbon)', fontSize: '0.92rem' }}>{b.serviceTitle}</span>
                        <span
                          className="tag"
                          style={{
                            background: b.status === 'completado' ? '#E8F8F0' : '#FEF3C7',
                            color: b.status === 'completado' ? '#2E9D72' : '#92400E',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 6
                          }}
                        >
                          {b.status === 'completado' ? '✅ Finalizado' : '🚚 En camino'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#6B7280', marginTop: 4 }}>
                        👤 {b.providerName} &nbsp;·&nbsp; 🕒 {b.date}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </>
      )}

      {/* ========== MAPA DE SERVICIOS Y AYUDA (Boceto 11) ========== */}
      {view === 'map' && (
        <>
          <div className="top-bar" style={{ borderBottom: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 14 }}>
            <MapPin size={20} color="var(--coral)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--carbon)' }}>Mapa de servicios y ayuda</h3>
          </div>

          <div className="body" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
            <AyniMap
              services={services}
              helpRequests={helpRequests}
              neighborhood={selectedNeighborhood}
              onSelectService={openProDetail}
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
              {/* Tarjeta oscura oficial de Boceto 14 */}
              <div className="off-dark-card">
                <div className="off-dark-icon">
                  <Radio size={24} />
                </div>
                <div className="off-dark-info">
                  <h3>{isOnline ? 'Conexión a Internet activa' : 'Sin Internet'}</h3>
                  <p>Tus datos se guardan de forma segura en este teléfono</p>
                </div>
              </div>

              {/* Resumen cola */}
              <div className="off-grid-metrics">
                <div className="off-metric-box">
                  <div className="off-metric-val coral">{offlineQueue.length > 0 ? offlineQueue.length : 2}</div>
                  <div className="off-metric-lbl">Pendientes por sincronizar</div>
                </div>
                <div className="off-metric-box">
                  <div className="off-metric-val green">1</div>
                  <div className="off-metric-lbl">Sincronizado con servidor</div>
                </div>
              </div>

              <div className="sec">
                <h3>Estado de tus envíos por malla</h3>
              </div>

              {/* Tarjeta de envío de paquete BLE */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <strong style={{ fontSize: '0.92rem', color: 'var(--carbon)' }}>Solicitud de ayuda · Agua potable</strong>
                    <div style={{ fontSize: '0.74rem', color: '#6B7280', marginTop: 2 }}>
                      ID msg-7f3a · Saltos 1 de 5 · Caduca en 23 h
                    </div>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>Hace 2 min</span>
                </div>

                {/* Hops timeline */}
                <div className="off-hops-timeline">
                  <div className="off-hop-line" />
                  <div className="off-hop-step">
                    <div className="off-hop-dot done"><CheckCircle2 size={12} /></div>
                    <span className="off-hop-lbl">Guardado</span>
                  </div>
                  <div className="off-hop-step">
                    <div className="off-hop-dot active"><Circle size={10} /></div>
                    <span className="off-hop-lbl">Enviando</span>
                  </div>
                  <div className="off-hop-step">
                    <div className="off-hop-dot"><Circle size={10} /></div>
                    <span className="off-hop-lbl">Recibido</span>
                  </div>
                  <div className="off-hop-step">
                    <div className="off-hop-dot"><Circle size={10} /></div>
                    <span className="off-hop-lbl">Sincroniz.</span>
                  </div>
                </div>

                <div className="off-status-box">
                  <Radio size={16} color="#FF875C" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <strong>Enviando a dispositivo cercano…</strong>
                    <span>Buscando teléfono de vecino para saltar por BLE.</span>
                  </div>
                </div>
              </div>

              {/* Dispositivos cercanos BLE */}
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 20, background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Radio size={20} color="#6D28D9" />
                </div>
                <div>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--carbon)', display: 'block' }}>Dispositivos cercanos (BLE)</strong>
                  <span style={{ fontSize: '0.76rem', color: '#6B7280' }}>1 teléfono compatible a ~8 m</span>
                </div>
                <span
                  style={{
                    marginLeft: 'auto',
                    background: '#E8F8F0',
                    color: '#2E9D72',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 10
                  }}
                >
                  Activo
                </span>
              </div>

              {/* Botón sincronizar ahora */}
              <button
                className="btn btn-coral btn-block"
                style={{ borderRadius: 'var(--radius-full)', marginTop: 14 }}
                disabled={isSyncing}
                onClick={handleSyncOffline}
              >
                <RefreshCw size={18} className={isSyncing ? 'sh-spin' : ''} />
                {isSyncing ? 'Sincronizando malla…' : 'Sincronizar ahora'}
              </button>

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
          <div className="top-bar" style={{ textAlign: 'center', borderBottom: '1px solid var(--gray-200)', paddingBottom: 18 }}>
            <div className="header-avatar" style={{ width: 64, height: 64, fontSize: '1.5rem', margin: '0 auto 10px' }}>
              {userInitial}
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--carbon)' }}>{userName}</h3>
            <p style={{ fontSize: '0.82rem', color: '#6B7280' }}>{currentUser?.documentNumber ? `Doc: ${currentUser.documentNumber}` : 'maria@ayni.pe'}</p>
            <span className="verified-badge" style={{ marginTop: 6, display: 'inline-flex' }}>
              <CheckCircle size={12} /> Vecino Verificado Ayni
            </span>
          </div>

          <div className="body">
            <div className="body-pad">
              {/* Selector de Rol Vecino / Proveedor */}
              <div className="seg-tabs" style={{ marginBottom: 14 }}>
                <button
                  className={`seg-tab ${userRole === 'vecino' ? 'active' : ''}`}
                  onClick={() => setUserRole('vecino')}
                >
                  Modo Vecino
                </button>
                <button
                  className={`seg-tab ${userRole === 'proveedor' ? 'active' : ''}`}
                  onClick={() => setUserRole('proveedor')}
                >
                  Modo Proveedor
                </button>
              </div>

              <div className="card" style={{ padding: '4px 14px' }}>
                {[
                  { icon: <Store size={18} color="var(--coral)" />, label: 'Mis solicitudes', action: () => navigateTo('requests') },
                  { icon: <Radio size={18} color="#D83B35" />, label: 'Centro Offline (BLE)', action: () => navigateTo('offline') },
                  { icon: <Heart size={18} color="#ec4899" />, label: 'Favoritos del barrio', action: () => {} },
                  { icon: <MapPin size={18} color="var(--green)" />, label: `Zona: ${selectedNeighborhood}`, action: () => navigateTo('map') },
                  { icon: <CreditCard size={18} color="#6366f1" />, label: 'Métodos de pago comunitarios', action: () => {} },
                ].map((item, i) => (
                  <div key={i} className="profile-menu-item" onClick={item.action}>
                    <div className="profile-menu-icon">{item.icon}</div>
                    <span className="profile-menu-text">{item.label}</span>
                    <ChevronRight size={18} color="var(--gray-300)" />
                  </div>
                ))}
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
                        alert(isUp ? '✅ ¡Conexión exitosa con el Backend!' : '⚠️ Servidor guardado, pero no responde en este momento.');
                        window.location.reload();
                      }
                    }
                  },
                  {
                    icon: <Clock size={18} color="var(--orange)" />,
                    label: 'Reiniciar pantalla de bienvenida (Demo)',
                    action: () => {
                      try {
                        localStorage.removeItem('ayni_onboarding_completed');
                      } catch {}
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

      {/* ===== FAB FLOTANTE (+) PARA PUBLICAR (Boceto 05) ===== */}
      {(view === 'home' || view === 'explore') && (
        <button className="fab" onClick={() => setIsServiceModalOpen(true)} title="Publicar servicio u oficio">
          <Plus size={24} />
        </button>
      )}

      {/* ===== NAVEGACIÓN INFERIOR (Boceto 05) ===== */}
      {view !== 'welcome' && view !== 'request-form' && view !== 'tracking' && view !== 'pro-detail' && view !== 'offline' && (
        <nav className="bnav">
          <button className={`bnav-btn ${view === 'home' ? 'active' : ''}`} onClick={() => navigateTo('home')}>
            <Store size={22} /><span>Inicio</span>
          </button>
          <button className={`bnav-btn ${view === 'explore' ? 'active' : ''}`} onClick={() => navigateTo('explore')}>
            <Search size={22} /><span>Explorar</span>
          </button>
          <button className={`bnav-btn ${view === 'requests' ? 'active' : ''}`} onClick={() => navigateTo('requests')}>
            <Clock size={22} /><span>Solicitudes</span>
            {bookings.length > 0 && <div className="bnav-dot" />}
          </button>
          <button className={`bnav-btn ${view === 'map' ? 'active' : ''}`} onClick={() => navigateTo('map')}>
            <MapPin size={22} /><span>Mapa</span>
          </button>
          <button className={`bnav-btn ${view === 'profile' ? 'active' : ''}`} onClick={() => navigateTo('profile')}>
            <UserIcon size={22} /><span>Perfil</span>
          </button>
        </nav>
      )}

      {/* ===== MODAL DE CALIFICAR SERVICIO (Boceto 15) ===== */}
      {isRateModalOpen && (
        <div className="modal-bg">
          <div className="modal-card">
            <button className="modal-close" onClick={() => setIsRateModalOpen(false)}>✕</button>
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

      {/* ===== AUTH MODAL (Mantiene login/registro y agrega ubicación híbrida) ===== */}
      {isAuthModalOpen && (
        <AuthModal onSuccess={handleLogin} onClose={() => setIsAuthModalOpen(false)} />
      )}

      {/* ===== MODAL: PUBLICAR SERVICIO (Boceto 16) ===== */}
      {isServiceModalOpen && (
        <div className="modal-bg">
          <div className="modal-card">
            <button className="modal-close" onClick={() => setIsServiceModalOpen(false)}>✕</button>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 16, color: 'var(--coral)' }}>
              📋 Ofrecer mi servicio
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
                  <span className="fselect-arrow">▼</span>
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
                <label>Precio estimado por hora (S/)</label>
                <input
                  type="number"
                  min={5}
                  className="finput"
                  value={newService.priceAmount}
                  onChange={e => setNewService({ ...newService, priceAmount: Number(e.target.value) })}
                />
              </div>
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
            <button className="modal-close" onClick={() => setIsHelpModalOpen(false)}>✕</button>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 4, color: 'var(--coral)' }}>
              🤝 Pedir ayuda al barrio
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#6B7280', marginBottom: 16 }}>Solidario, gratuito y colaborativo</p>
            <form onSubmit={handleCreateHelp}>
              <div className="field">
                <label>¿Qué necesitas?</label>
                <div className="fselect-wrap">
                  <select className="finput fselect" value={newHelp.type} onChange={e => setNewHelp({ ...newHelp, type: e.target.value })}>
                    <option value="agua">💧 Agua potable</option>
                    <option value="alimentos">🍞 Alimentos / Viandas</option>
                    <option value="herramientas">🔧 Herramientas</option>
                    <option value="transporte">🚗 Transporte / Auxilio</option>
                    <option value="otro">📦 Otro apoyo vecinal</option>
                  </select>
                  <span className="fselect-arrow">▼</span>
                </div>
              </div>
              <div className="field">
                <label>¿Qué tan urgente es?</label>
                <div className="fselect-wrap">
                  <select className="finput fselect" value={newHelp.urgency} onChange={e => setNewHelp({ ...newHelp, urgency: e.target.value })}>
                    <option value="alta">🚨 Muy urgente</option>
                    <option value="media">⏳ Hoy</option>
                    <option value="baja">📋 No urgente</option>
                  </select>
                  <span className="fselect-arrow">▼</span>
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
              <button type="submit" className="btn btn-coral btn-block" style={{ borderRadius: 'var(--radius-full)', marginTop: 4 }}>
                {isOnline ? '📢 Publicar pedido de auxilio' : '💾 Guardar en malla BLE'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
