import React, { useState } from 'react';
import {
  Store, MapPin, Wifi, WifiOff, Radio, Users, HeartHandshake,
  AlertTriangle, Star, CheckCircle2, Plus, Search, RefreshCw,
  Info, User as UserIcon, ShieldCheck, BatteryMedium, SignalHigh,
  Bell, ChevronRight, Heart, Clock, Bookmark, CreditCard, Settings,
  HelpCircle, LogOut, ArrowLeft, Camera, Calendar, Send, Navigation,
  Zap, Wrench, Hammer, Sparkles, GraduationCap, Utensils, MoreHorizontal,
  Phone, MessageCircle, CheckCircle, Circle
} from 'lucide-react';
import {
  INITIAL_SERVICES, INITIAL_COMMUNITY_POSTS, INITIAL_HELP_REQUESTS,
  INITIAL_BOOKINGS, INITIAL_CATEGORIES
} from './mockData';
import { ServiceItem, HelpRequest, Booking, OfflineEnvelope } from './types';
import { AuthModal } from './AuthModal';
import './App.css';

const CAT_EMOJIS: Record<string, string> = {
  electricidad: '⚡', gasfiteria: '🔧', carpinteria: '🪚',
  limpieza: '✨', educacion: '📚', comida: '🍽️'
};

const CAT_CSS: Record<string, string> = {
  electricidad: 'elec', gasfiteria: 'gasf', carpinteria: 'carp',
  limpieza: 'limp', educacion: 'edu', comida: 'food'
};

const PRO_INITIALS: Record<string, string> = {
  'usr-p1': 'JR', 'usr-p2': 'CM', 'usr-p3': 'PQ'
};

const PRO_EMOJIS: Record<string, string> = {
  'usr-p1': '👷', 'usr-p2': '👩‍🔧', 'usr-p3': '🪚'
};

type ViewType = 'welcome' | 'home' | 'explore' | 'requests' | 'map' | 'profile' | 'pro-detail' | 'request-form' | 'tracking';

export function App() {
  const [view, setView] = useState<ViewType>('welcome');
  const [isOnline, setIsOnline] = useState(true);

  const [currentUser, setCurrentUser] = useState<{
    name: string; documentNumber: string; neighborhood: string; district: string;
  } | null>(null);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [services, setServices] = useState<ServiceItem[]>(INITIAL_SERVICES);
  const [communityPosts, setCommunityPosts] = useState(INITIAL_COMMUNITY_POSTS);
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>(INITIAL_HELP_REQUESTS);
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [offlineQueue, setOfflineQueue] = useState<OfflineEnvelope[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Modals
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [newHelp, setNewHelp] = useState({ type: 'agua', description: '', urgency: 'alta' });
  const [newService, setNewService] = useState({ title: '', categoryId: 'electricidad', description: '', priceAmount: 30, priceType: 'fixed' as 'fixed' | 'quote', coverageArea: 'Radio 2 km' });
  const [requestDesc, setRequestDesc] = useState('');

  const selectedNeighborhood = currentUser?.neighborhood || 'Lima, Perú';
  const userName = currentUser?.name || 'Vecino';
  const userInitial = userName.charAt(0).toUpperCase();

  // ——— Login handler ———
  const handleLogin = (user: any) => {
    setCurrentUser(user);
    setIsAuthModalOpen(false);
    setView('home');
  };

  // ——— Actions ———
  const handleRequestService = () => {
    if (!currentUser || !selectedService) return;
    const b: Booking = {
      id: `bk-${Date.now()}`, serviceId: selectedService.id, serviceTitle: selectedService.title,
      clientId: currentUser.documentNumber, clientName: currentUser.name,
      providerId: selectedService.providerId, providerName: selectedService.providerName,
      status: 'solicitado',
      date: 'Hoy, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      hasReview: false, notes: requestDesc
    };
    setBookings([b, ...bookings]);
    setRequestDesc('');
    setSelectedBooking(b);
    setView('tracking');
  };

  const handleCreateHelp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const req: HelpRequest = {
      id: `help-${Date.now()}`, authorName: currentUser.name, authorId: currentUser.documentNumber,
      type: newHelp.type as any, description: newHelp.description, urgency: newHelp.urgency as any,
      neighborhood: selectedNeighborhood, status: 'abierta', date: 'Ahora', isOfflineCreated: !isOnline
    };
    setHelpRequests([req, ...helpRequests]);
    setIsHelpModalOpen(false);
    setNewHelp({ type: 'agua', description: '', urgency: 'alta' });
    alert(isOnline ? '✅ ¡Pedido publicado!' : '💾 Guardado sin Internet.');
  };

  const handleCreateService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const s: ServiceItem = {
      id: `srv-${Date.now()}`, providerId: currentUser.documentNumber, providerName: currentUser.name,
      categoryId: newService.categoryId, title: newService.title, description: newService.description,
      priceType: newService.priceType, priceAmount: Number(newService.priceAmount),
      neighborhood: selectedNeighborhood, rating: 5.0, reviewCount: 0, jobsCompleted: 0,
      coverageArea: newService.coverageArea, status: 'published'
    };
    setServices([s, ...services]);
    setIsServiceModalOpen(false);
    setNewService({ title: '', categoryId: 'electricidad', description: '', priceAmount: 30, priceType: 'fixed', coverageArea: 'Radio 2 km' });
    alert('✅ ¡Servicio publicado!');
  };

  const filteredServices = services.filter(srv => {
    const cat = selectedCategory === 'all' || srv.categoryId === selectedCategory;
    const q = searchQuery.toLowerCase();
    const txt = srv.title.toLowerCase().includes(q) || srv.providerName.toLowerCase().includes(q);
    return cat && txt;
  });

  const openProDetail = (srv: ServiceItem) => {
    setSelectedService(srv);
    setView('pro-detail');
  };

  // ——— Render ———
  return (
    <div className="phone">

      {/* Status Bar */}
      <div className="sbar">
        <span style={{ fontWeight: 700 }}>9:41</span>
        <div className="sbar-notch" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <SignalHigh size={14} />
          {isOnline ? <Wifi size={14} /> : <WifiOff size={14} color="#D83B35" />}
          <BatteryMedium size={16} />
        </div>
      </div>

      {/* ========== WELCOME SCREEN ========== */}
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
            La ayuda que necesitas, más cerca.
          </p>

          <div className="welcome-features">
            <div className="welcome-feat">
              <div className="welcome-feat-icon"><CheckCircle size={16} color="#2E9D72" /></div>
              Profesionales verificados
            </div>
            <div className="welcome-feat">
              <div className="welcome-feat-icon"><Clock size={16} color="#FF875C" /></div>
              Solicita en segundos
            </div>
            <div className="welcome-feat">
              <div className="welcome-feat-icon"><MapPin size={16} color="#D83B35" /></div>
              Encuentra cerca de ti
            </div>
            <div className="welcome-feat">
              <div className="welcome-feat-icon"><Star size={16} color="#F59E0B" /></div>
              Califica y confía
            </div>
          </div>

          <button className="btn btn-coral btn-block" style={{ marginBottom: 12, borderRadius: 'var(--radius-full)' }}
            onClick={() => { setIsAuthModalOpen(true); }}>
            Comenzar
          </button>
          <button style={{ background: 'none', border: 'none', color: 'var(--gray-500)', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer' }}
            onClick={() => setIsAuthModalOpen(true)}>
            Iniciar sesión
          </button>
        </div>
      )}

      {/* ========== HOME SCREEN ========== */}
      {view === 'home' && (
        <>
          <header className="app-header">
            <div className="header-top">
              <div className="header-greeting">
                <div className="header-avatar">{userInitial}</div>
                <div className="greeting-text">
                  <h2>Hola, {userName.split(' ')[0]} 👋</h2>
                  <div className="greeting-sub">¿Qué necesitas hoy?</div>
                </div>
              </div>
              <div className="header-icons">
                <button className={`icon-circle`} onClick={() => setIsOnline(!isOnline)}
                  style={!isOnline ? { background: '#fef2f2' } : {}}>
                  {isOnline ? <Wifi size={16} color="#2E9D72" /> : <WifiOff size={16} color="#D83B35" />}
                </button>
                <button className="icon-circle"><Bell size={16} color="#6b7280" /></button>
              </div>
            </div>

            <div className="loc-chip" onClick={() => {}}>
              <MapPin size={14} /> {selectedNeighborhood} <ChevronRight size={14} />
            </div>

            <div className="search-bar" onClick={() => setView('explore')}>
              <Search size={18} color="#9ca3af" />
              <input type="text" placeholder="Buscar servicios..." readOnly
                style={{ cursor: 'pointer' }} />
            </div>
          </header>

          {!isOnline && (
            <div className="off-banner">
              <Radio size={16} />
              Sin Internet — Modo offline activado
            </div>
          )}

          <div className="body">
            <div className="body-pad">

              {/* Category Grid */}
              <div className="sec"><h3>Categorías</h3></div>
              <div className="cat-grid">
                {INITIAL_CATEGORIES.map(c => (
                  <div key={c.id} className="cat-item" onClick={() => { setSelectedCategory(c.id); setView('explore'); }}>
                    <div className={`cat-icon ${CAT_CSS[c.id] || ''}`}>
                      {CAT_EMOJIS[c.id] || '📋'}
                    </div>
                    <div className="cat-label">{c.name}</div>
                  </div>
                ))}
                <div className="cat-item" onClick={() => { setSelectedCategory('all'); setView('explore'); }}>
                  <div className="cat-icon more"><MoreHorizontal size={20} color="#6b7280" /></div>
                  <div className="cat-label">Ver todas</div>
                </div>
              </div>

              {/* Promo Banner */}
              <div className="promo-banner">
                <h4>✨ Descuentos especiales</h4>
                <p>en servicios del hogar esta semana</p>
              </div>

              {/* Featured Professionals */}
              <div className="sec">
                <h3>Profesionales destacados</h3>
                <button className="sec-link" onClick={() => setView('explore')}>Ver todos</button>
              </div>

              {services.slice(0, 3).map(srv => (
                <div key={srv.id} className="feat-pro" onClick={() => openProDetail(srv)}>
                  <div className="feat-pro-photo">
                    {PRO_EMOJIS[srv.providerId] || '👤'}
                  </div>
                  <div className="feat-pro-info">
                    <div className="feat-pro-name">
                      {srv.providerName.split('(')[0].trim()}
                      <CheckCircle size={14} color="#2E9D72" />
                    </div>
                    <div className="feat-pro-meta">
                      <Star size={12} fill="#F59E0B" color="#F59E0B" /> {srv.rating} &nbsp;•&nbsp;
                      📍 {srv.coverageArea}
                    </div>
                  </div>
                  <ChevronRight size={18} color="#d1d5db" />
                </div>
              ))}

              {/* Community alerts */}
              <div className="sec" style={{ marginTop: 16 }}>
                <h3>📢 Avisos del barrio</h3>
                <button className="sec-link">Ver todos</button>
              </div>

              {communityPosts.slice(0, 2).map(post => (
                <div key={post.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span className={`tag ${post.verificationStatus === 'corroborado' ? 'tag-green' : 'tag-gold'}`}
                      style={{ background: post.verificationStatus === 'corroborado' ? 'var(--green-light)' : '#FEF3C7', color: post.verificationStatus === 'corroborado' ? 'var(--green)' : '#92400E' }}>
                      {post.verificationStatus === 'corroborado' ? '✅ Confirmado' : '⚠️ Nuevo aviso'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>{post.date}</span>
                  </div>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 700, margin: '6px 0', color: 'var(--carbon)' }}>{post.title}</h4>
                  <p style={{ fontSize: '0.82rem', color: 'var(--gray-600)', lineHeight: 1.4 }}>{post.body}</p>
                  <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--gray-500)' }}>👤 {post.authorName}</span>
                    <button className="btn btn-outline btn-sm" onClick={() => {
                      setCommunityPosts(communityPosts.map(p => p.id === post.id ? { ...p, corroborations: p.corroborations + 1, verificationStatus: 'corroborado' } : p));
                    }}>
                      👍 Confirmar ({post.corroborations})
                    </button>
                  </div>
                </div>
              ))}

              {/* Help Requests */}
              <div className="sec" style={{ marginTop: 16 }}>
                <h3>🤝 Solicitudes de ayuda</h3>
                <button className="sec-link" onClick={() => setIsHelpModalOpen(true)}>+ Pedir</button>
              </div>

              {helpRequests.slice(0, 2).map(req => (
                <div key={req.id} className={`help-card ${req.urgency === 'alta' ? 'urgent' : ''}`}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <span className="tag" style={{ background: req.urgency === 'alta' ? '#fef2f2' : '#FEF3C7', color: req.urgency === 'alta' ? '#b91c1c' : '#92400E' }}>
                      {req.urgency === 'alta' ? '🚨 Urgente' : '⏰ Hoy'}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--carbon)', marginBottom: 4 }}>{req.description}</p>
                  <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)' }}>
                    👤 {req.authorName} &nbsp;•&nbsp; 📍 {req.neighborhood}
                  </div>
                  {req.status === 'abierta' && (
                    <button className="btn btn-outline btn-sm" style={{ marginTop: 8, width: '100%' }}
                      onClick={() => {
                        setHelpRequests(helpRequests.map(h => h.id === req.id ? { ...h, status: 'en_coordinacion', helperName: userName } : h));
                        alert('🤝 ¡Gracias por ayudar!');
                      }}>
                      🤝 Yo puedo ayudar
                    </button>
                  )}
                </div>
              ))}

            </div>
          </div>
        </>
      )}

      {/* ========== EXPLORE / SEARCH SCREEN ========== */}
      {view === 'explore' && (
        <>
          <div style={{ background: 'var(--white)', padding: '10px 18px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <button className="icon-circle" onClick={() => setView('home')}><ArrowLeft size={18} /></button>
              <div className="search-bar" style={{ flex: 1 }}>
                <Search size={18} color="#9ca3af" />
                <input type="text" placeholder="Buscar servicios..." value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)} autoFocus />
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
                  <div className="srv-photo">{PRO_EMOJIS[srv.providerId] || '👤'}</div>
                  <div className="srv-info">
                    <div className="srv-top">
                      <span className="verified-badge"><CheckCircle size={10} /> Verificado</span>
                      <span className="srv-rating"><Star size={12} fill="#F59E0B" color="#F59E0B" /> {srv.rating} ({srv.reviewCount})</span>
                    </div>
                    <div className="srv-title">{srv.title}</div>
                    <div className="srv-meta">
                      <span>📍 {srv.coverageArea}</span>
                      <span>Desde S/ {srv.priceAmount || '—'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ========== PROFESSIONAL DETAIL ========== */}
      {view === 'pro-detail' && selectedService && (
        <>
          <div style={{ background: 'var(--white)', padding: '8px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button className="icon-circle" onClick={() => setView('explore')}><ArrowLeft size={18} /></button>
            <button className="icon-circle"><Heart size={18} color="#d1d5db" /></button>
          </div>

          <div className="prof-header">
            <div className="prof-photo">{PRO_EMOJIS[selectedService.providerId] || '👤'}</div>
            <div className="prof-name">
              {selectedService.providerName.split('(')[0].trim()}
              <CheckCircle size={18} color="#2E9D72" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 4 }}>
              <Star size={14} fill="#F59E0B" color="#F59E0B" />
              <span style={{ fontWeight: 800, color: 'var(--carbon)' }}>{selectedService.rating}</span>
              <span style={{ color: 'var(--gray-400)', fontSize: '0.82rem' }}>({selectedService.reviewCount} reseñas)</span>
            </div>

            <div className="prof-tags">
              <span className="ptag">{INITIAL_CATEGORIES.find(c => c.id === selectedService.categoryId)?.name}</span>
              <span className="ptag">Instalaciones</span>
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
                <h4 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: 6, color: 'var(--carbon)' }}>Sobre mí</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--gray-600)', lineHeight: 1.5 }}>
                  {selectedService.description}
                </p>
              </div>

              <div className="card">
                <h4 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: 6, color: 'var(--carbon)' }}>Precio estimado</h4>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--coral)' }}>
                  {selectedService.priceType === 'fixed' ? `Desde S/ ${selectedService.priceAmount}` : 'A cotizar'}
                </div>
              </div>

              <button className="btn btn-coral btn-block" style={{ borderRadius: 'var(--radius-full)' }}
                onClick={() => setView('request-form')}>
                Solicitar servicio
              </button>
            </div>
          </div>
        </>
      )}

      {/* ========== SERVICE REQUEST FORM ========== */}
      {view === 'request-form' && selectedService && (
        <>
          <div style={{ background: 'var(--white)', padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="icon-circle" onClick={() => setView('pro-detail')}><ArrowLeft size={18} /></button>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--carbon)' }}>Solicitar servicio</h3>
          </div>

          <div className="body">
            <div className="body-pad">
              {/* Professional summary */}
              <div className="feat-pro" style={{ marginBottom: 16 }}>
                <div className="feat-pro-photo">{PRO_EMOJIS[selectedService.providerId] || '👤'}</div>
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
                <label>Describe tu problema</label>
                <textarea className="finput" rows={3} placeholder="Cuéntanos más detalles..."
                  value={requestDesc} onChange={e => setRequestDesc(e.target.value)} />
              </div>

              <div className="field">
                <label>Adjuntar fotos (opcional)</label>
                <button className="btn btn-outline btn-block" style={{ borderStyle: 'dashed' }}>
                  <Camera size={18} color="var(--gray-400)" /> Agregar fotos
                </button>
              </div>

              <div className="field">
                <label>Ubicación</label>
                <div className="finput" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'var(--gray-600)' }}>
                  <MapPin size={16} color="var(--coral)" />
                  {selectedNeighborhood}
                  <ChevronRight size={16} color="var(--gray-400)" style={{ marginLeft: 'auto' }} />
                </div>
              </div>

              <div className="field">
                <label>Fecha y horario</label>
                <div className="finput" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'var(--gray-400)' }}>
                  <Calendar size={16} />
                  Selecciona una fecha
                  <ChevronRight size={16} style={{ marginLeft: 'auto' }} />
                </div>
              </div>

              <button className="btn btn-coral btn-block" style={{ borderRadius: 'var(--radius-full)', marginTop: 8 }}
                onClick={handleRequestService}>
                <Send size={18} /> Enviar solicitud
              </button>
            </div>
          </div>
        </>
      )}

      {/* ========== TRACKING SCREEN ========== */}
      {view === 'tracking' && (
        <>
          <div style={{ background: 'var(--white)', padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="icon-circle" onClick={() => setView('requests')}><ArrowLeft size={18} /></button>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--carbon)' }}>Seguimiento de servicio</h3>
          </div>

          <div className="body">
            <div className="body-pad">
              <div className="card">
                <div className="timeline">
                  {[
                    { label: 'Solicitud enviada', sub: 'Hoy, 9:20 a. m.', done: true },
                    { label: 'En revisión', sub: 'Hoy, 9:35 a. m.', done: true },
                    { label: 'Aceptada', sub: 'Hoy, 9:40 a. m.', active: true },
                    { label: 'Profesional en camino', sub: '', pending: true },
                    { label: 'Servicio en proceso', sub: '', pending: true },
                    { label: 'Finalizado', sub: '', pending: true },
                  ].map((step, i) => (
                    <div key={i} className={`tl-step ${step.done ? 'done' : ''}`}>
                      <div className={`tl-dot ${step.done ? 'done' : step.active ? 'active' : 'pending'}`}>
                        {step.done ? <CheckCircle2 size={14} /> : step.active ? <Circle size={14} /> : <Circle size={14} />}
                      </div>
                      <div className="tl-content">
                        <h4>{step.label}</h4>
                        {step.sub && <p>{step.sub}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Professional ETA card */}
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="feat-pro-photo" style={{ width: 44, height: 44 }}>
                    {selectedService ? PRO_EMOJIS[selectedService.providerId] || '👤' : '👤'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--carbon)', fontSize: '0.92rem' }}>
                      {selectedService?.providerName.split('(')[0].trim() || 'Profesional'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)' }}>
                      Llegará en ~25 min
                    </div>
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    <button className="icon-circle" style={{ background: '#ecfdf5' }}>
                      <Phone size={16} color="#2E9D72" />
                    </button>
                    <button className="icon-circle" style={{ background: '#fff7ed' }}>
                      <MessageCircle size={16} color="#FF875C" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Mini map */}
              <div style={{ background: 'var(--gray-200)', borderRadius: 16, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-500)', fontSize: '0.85rem', fontWeight: 600 }}>
                <Navigation size={20} style={{ marginRight: 6 }} /> Mapa de seguimiento en vivo
              </div>
            </div>
          </div>
        </>
      )}

      {/* ========== REQUESTS LIST (Solicitudes) ========== */}
      {view === 'requests' && (
        <>
          <div style={{ background: 'var(--white)', padding: '12px 18px', borderBottom: '1px solid var(--gray-200)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--carbon)' }}>Mis solicitudes</h3>
          </div>

          <div className="body">
            <div className="body-pad">
              {bookings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--gray-400)' }}>
                  <Store size={40} style={{ margin: '0 auto 8px', opacity: 0.4, display: 'block' }} />
                  <p style={{ fontWeight: 700 }}>Aún no tienes solicitudes</p>
                  <p style={{ fontSize: '0.82rem' }}>Explora servicios cercanos</p>
                </div>
              ) : (
                bookings.map(b => (
                  <div key={b.id} className="card" style={{ cursor: 'pointer' }}
                    onClick={() => { setSelectedBooking(b); setSelectedService(services.find(s => s.id === b.serviceId) || null); setView('tracking'); }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: 'var(--carbon)', fontSize: '0.92rem' }}>{b.serviceTitle}</span>
                      <span className="tag" style={{
                        background: b.status === 'completado' ? 'var(--green-light)' : '#FEF3C7',
                        color: b.status === 'completado' ? 'var(--green)' : '#92400E'
                      }}>
                        {b.status === 'completado' ? '✅ Listo' : b.status === 'en_proceso' ? '🔄 En curso' : '📨 Enviado'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--gray-500)' }}>
                      👤 {b.providerName} &nbsp;•&nbsp; 🕐 {b.date}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* ========== MAP ========== */}
      {view === 'map' && (
        <>
          <div style={{ background: 'var(--white)', padding: '12px 18px', borderBottom: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <MapPin size={20} color="var(--coral)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--carbon)' }}>Mapa</h3>
          </div>

          <div className="body" style={{ padding: 0 }}>
            <div className="map-box" style={{ borderRadius: 0, height: '100%', minHeight: 700 }}>
              <div style={{ position: 'absolute', top: 14, left: 14, right: 14 }}>
                <div className="search-bar" style={{ background: 'var(--white)', boxShadow: 'var(--shadow-md)' }}>
                  <Search size={18} color="#9ca3af" />
                  <input type="text" placeholder="Buscar en el mapa..." />
                </div>
              </div>

              <div style={{ position: 'absolute', top: 80, left: 14, background: 'white', padding: '4px 10px', borderRadius: 10, fontSize: '0.78rem', fontWeight: 700, boxShadow: 'var(--shadow-sm)' }}>
                📍 {selectedNeighborhood}
              </div>

              <div className="map-pin" style={{ top: '35%', left: '30%' }} onClick={() => { setSelectedService(services[0]); setView('pro-detail'); }}>
                <Store size={12} color="var(--coral)" /> José (Electricidad)
              </div>
              <div className="map-pin" style={{ top: '55%', left: '65%' }} onClick={() => { setSelectedService(services[1]); setView('pro-detail'); }}>
                <Store size={12} color="var(--coral)" /> Carmen (Gasfitería)
              </div>
              <div className="map-pin solidarity" style={{ top: '70%', left: '40%' }}>
                <AlertTriangle size={12} color="var(--orange)" /> Auxilio: Agua
              </div>
            </div>
          </div>
        </>
      )}

      {/* ========== PROFILE ========== */}
      {view === 'profile' && (
        <>
          <div style={{ background: 'var(--white)', padding: '24px 18px', textAlign: 'center', borderBottom: '1px solid var(--gray-200)' }}>
            <div className="header-avatar" style={{ width: 64, height: 64, fontSize: '1.5rem', margin: '0 auto 10px' }}>
              {userInitial}
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--carbon)' }}>{userName}</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--gray-500)' }}>{currentUser?.documentNumber}@ayni.pe</p>
            <span className="verified-badge" style={{ marginTop: 6, display: 'inline-flex' }}>
              <CheckCircle size={12} /> Usuario verificado
            </span>
          </div>

          <div className="body">
            <div className="body-pad">
              <div className="card" style={{ padding: '4px 14px' }}>
                {[
                  { icon: <Store size={18} color="var(--coral)" />, label: 'Mis solicitudes', action: () => setView('requests') },
                  { icon: <Heart size={18} color="#ec4899" />, label: 'Favoritos', action: () => {} },
                  { icon: <MapPin size={18} color="var(--green)" />, label: 'Direcciones guardadas', action: () => {} },
                  { icon: <CreditCard size={18} color="#6366f1" />, label: 'Métodos de pago', action: () => {} },
                  { icon: <Bell size={18} color="var(--orange)" />, label: 'Notificaciones', action: () => {} },
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
                  { icon: <HelpCircle size={18} color="var(--gray-500)" />, label: 'Ayuda y soporte' },
                  { icon: <Settings size={18} color="var(--gray-500)" />, label: 'Configuración' },
                  { icon: <Radio size={18} color="var(--coral)" />, label: 'Centro Offline (BLE)' },
                ].map((item, i) => (
                  <div key={i} className="profile-menu-item">
                    <div className="profile-menu-icon">{item.icon}</div>
                    <span className="profile-menu-text">{item.label}</span>
                    <ChevronRight size={18} color="var(--gray-300)" />
                  </div>
                ))}
              </div>

              <button className="btn btn-outline btn-block" style={{ marginTop: 16, color: 'var(--coral)' }}
                onClick={() => { setCurrentUser(null); setView('welcome'); }}>
                <LogOut size={18} /> Cerrar sesión
              </button>
            </div>
          </div>
        </>
      )}

      {/* ===== FAB (on home & explore) ===== */}
      {(view === 'home' || view === 'explore') && (
        <button className="fab" onClick={() => setIsServiceModalOpen(true)} title="Ofrecer servicio">
          <Plus size={24} />
        </button>
      )}

      {/* ===== BOTTOM NAV (when not on welcome/forms) ===== */}
      {view !== 'welcome' && view !== 'request-form' && view !== 'tracking' && view !== 'pro-detail' && (
        <nav className="bnav">
          <button className={`bnav-btn ${view === 'home' ? 'active' : ''}`} onClick={() => setView('home')}>
            <Store size={22} /><span>Inicio</span>
          </button>
          <button className={`bnav-btn ${view === 'explore' ? 'active' : ''}`} onClick={() => setView('explore')}>
            <Search size={22} /><span>Explorar</span>
          </button>
          <button className={`bnav-btn ${view === 'requests' ? 'active' : ''}`} onClick={() => setView('requests')}>
            <Clock size={22} /><span>Solicitudes</span>
            {bookings.length > 0 && <div className="bnav-dot" />}
          </button>
          <button className={`bnav-btn ${view === 'map' ? 'active' : ''}`} onClick={() => setView('map')}>
            <MapPin size={22} /><span>Mapa</span>
          </button>
          <button className={`bnav-btn ${view === 'profile' ? 'active' : ''}`} onClick={() => setView('profile')}>
            <UserIcon size={22} /><span>Perfil</span>
          </button>
        </nav>
      )}

      {/* ===== AUTH MODAL ===== */}
      {isAuthModalOpen && (
        <AuthModal onSuccess={handleLogin} onClose={() => setIsAuthModalOpen(false)} />
      )}

      {/* ===== MODAL: NUEVO SERVICIO ===== */}
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
                <input type="text" required className="finput" placeholder="Ej: Pintor de interiores"
                  value={newService.title} onChange={e => setNewService({ ...newService, title: e.target.value })} />
              </div>
              <div className="field">
                <label>Categoría</label>
                <div className="fselect-wrap">
                  <select className="finput fselect" value={newService.categoryId}
                    onChange={e => setNewService({ ...newService, categoryId: e.target.value })}>
                    {INITIAL_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <span className="fselect-arrow">▼</span>
                </div>
              </div>
              <div className="field">
                <label>Descripción</label>
                <textarea required rows={2} className="finput" placeholder="Describe tu experiencia..."
                  value={newService.description} onChange={e => setNewService({ ...newService, description: e.target.value })} />
              </div>
              <div className="field">
                <label>Precio estimado (S/)</label>
                <input type="number" min={5} className="finput" value={newService.priceAmount}
                  onChange={e => setNewService({ ...newService, priceAmount: Number(e.target.value) })} />
              </div>
              <button type="submit" className="btn btn-coral btn-block" style={{ borderRadius: 'var(--radius-full)', marginTop: 4 }}>
                Publicar servicio
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL: PEDIR AYUDA ===== */}
      {isHelpModalOpen && (
        <div className="modal-bg">
          <div className="modal-card">
            <button className="modal-close" onClick={() => setIsHelpModalOpen(false)}>✕</button>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 4, color: 'var(--coral)' }}>
              🤝 Pedir ayuda al barrio
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--gray-500)', marginBottom: 16 }}>Solidario y gratuito</p>
            <form onSubmit={handleCreateHelp}>
              <div className="field">
                <label>¿Qué necesitas?</label>
                <div className="fselect-wrap">
                  <select className="finput fselect" value={newHelp.type} onChange={e => setNewHelp({ ...newHelp, type: e.target.value })}>
                    <option value="agua">💧 Agua potable</option>
                    <option value="alimentos">🍞 Alimentos</option>
                    <option value="herramientas">🔧 Herramientas</option>
                    <option value="transporte">🚗 Transporte</option>
                    <option value="otro">📦 Otro</option>
                  </select>
                  <span className="fselect-arrow">▼</span>
                </div>
              </div>
              <div className="field">
                <label>¿Qué tan urgente es?</label>
                <div className="fselect-wrap">
                  <select className="finput fselect" value={newHelp.urgency} onChange={e => setNewHelp({ ...newHelp, urgency: e.target.value })}>
                    <option value="alta">🚨 Muy urgente</option>
                    <option value="media">⏰ Hoy</option>
                    <option value="baja">📋 No urgente</option>
                  </select>
                  <span className="fselect-arrow">▼</span>
                </div>
              </div>
              <div className="field">
                <label>Cuéntanos más</label>
                <textarea required rows={2} className="finput" placeholder="Describe lo que necesitas..."
                  value={newHelp.description} onChange={e => setNewHelp({ ...newHelp, description: e.target.value })} />
              </div>
              <button type="submit" className="btn btn-coral btn-block" style={{ borderRadius: 'var(--radius-full)', marginTop: 4 }}>
                {isOnline ? '📢 Publicar pedido' : '💾 Guardar sin internet'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
