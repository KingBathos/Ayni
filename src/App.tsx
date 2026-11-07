import React, { useState } from 'react';
import {
  Store, MapPin, Wifi, WifiOff, Radio, Users, HeartHandshake,
  AlertTriangle, Star, CheckCircle2, Plus, Search, RefreshCw,
  Info, User as UserIcon, ShieldCheck, BatteryMedium, SignalHigh,
  Droplets, Utensils, Wrench, Car, Heart, HelpCircle, Phone
} from 'lucide-react';
import {
  INITIAL_SERVICES, INITIAL_COMMUNITY_POSTS, INITIAL_HELP_REQUESTS,
  INITIAL_BOOKINGS, INITIAL_CATEGORIES
} from './mockData';
import { ServiceItem, HelpRequest, Booking, OfflineEnvelope } from './types';
import { AuthModal } from './AuthModal';
import './App.css';

const HELP_TYPE_ICONS: Record<string, React.ReactNode> = {
  agua: <Droplets size={18} color="#2563eb" />,
  alimentos: <Utensils size={18} color="#ea580c" />,
  herramientas: <Wrench size={18} color="#6d28d9" />,
  transporte: <Car size={18} color="#0d9488" />,
  cuidado: <Heart size={18} color="#db2777" />,
  otro: <HelpCircle size={18} color="#64748b" />,
};

const HELP_TYPE_LABELS: Record<string, string> = {
  agua: '💧 Agua potable',
  alimentos: '🍞 Alimentos',
  herramientas: '🔧 Herramientas',
  transporte: '🚗 Transporte',
  cuidado: '❤️ Cuidado',
  otro: '📦 Otro apoyo',
};

export function App() {
  const [activeTab, setActiveTab] = useState<'services' | 'solidarity' | 'community' | 'map' | 'offline'>('services');
  const [isOnline, setIsOnline] = useState(true);

  const [currentUser, setCurrentUser] = useState<{
    name: string; documentNumber: string; neighborhood: string; district: string;
  } | null>({
    name: 'María Quispe',
    documentNumber: '72345678',
    neighborhood: 'Sector Central / Santa Rosa',
    district: 'San Juan de Lurigancho'
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const selectedNeighborhood = currentUser?.neighborhood || 'Sector Central';

  const [services, setServices] = useState<ServiceItem[]>(INITIAL_SERVICES);
  const [communityPosts, setCommunityPosts] = useState(INITIAL_COMMUNITY_POSTS);
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>(INITIAL_HELP_REQUESTS);
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [offlineQueue, setOfflineQueue] = useState<OfflineEnvelope[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<Booking | null>(null);

  const [newService, setNewService] = useState({
    title: '', categoryId: 'electricidad', description: '',
    priceAmount: 30, priceType: 'fixed' as 'fixed' | 'quote', coverageArea: 'Radio 2 km'
  });

  const [newHelp, setNewHelp] = useState({
    type: 'agua' as string, description: '', urgency: 'alta' as string,
  });

  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });

  // ——— Actions ———

  const requireAuth = (): boolean => {
    if (!currentUser) { setIsAuthModalOpen(true); return false; }
    return true;
  };

  const handleRequestService = (srv: ServiceItem) => {
    if (!requireAuth()) return;
    const b: Booking = {
      id: `bk-${Date.now()}`, serviceId: srv.id, serviceTitle: srv.title,
      clientId: currentUser!.documentNumber, clientName: currentUser!.name,
      providerId: srv.providerId, providerName: srv.providerName,
      status: 'solicitado',
      date: 'Hoy, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      hasReview: false, notes: ''
    };
    setBookings([b, ...bookings]);
    alert(`✅ ¡Solicitud enviada a ${srv.providerName}!\nTe contactará pronto.`);
  };

  const handleCompleteBooking = (id: string) => {
    setBookings(bookings.map(b => b.id === id ? { ...b, status: 'completado' } : b));
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingForReview) return;
    setBookings(bookings.map(b =>
      b.id === selectedBookingForReview.id ? { ...b, hasReview: true } : b
    ));
    setServices(services.map(srv => {
      if (srv.id === selectedBookingForReview.serviceId) {
        const c = srv.reviewCount + 1;
        return { ...srv, reviewCount: c, rating: Number(((srv.rating * srv.reviewCount + reviewForm.rating) / c).toFixed(1)), jobsCompleted: srv.jobsCompleted + 1 };
      }
      return srv;
    }));
    setIsReviewModalOpen(false);
    setSelectedBookingForReview(null);
    setReviewForm({ rating: 5, comment: '' });
    alert('⭐ ¡Calificación registrada!\nGracias por tu opinión.');
  };

  const handleCreateHelp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireAuth()) return;
    const req: HelpRequest = {
      id: `help-${Date.now()}`, authorName: currentUser!.name, authorId: currentUser!.documentNumber,
      type: newHelp.type as any, description: newHelp.description, urgency: newHelp.urgency as any,
      neighborhood: selectedNeighborhood, status: 'abierta', date: 'Ahora mismo', isOfflineCreated: !isOnline
    };
    if (!isOnline) {
      const env: OfflineEnvelope = {
        id: `env-${Date.now()}`, type: 'help_request', payload: req,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'local', hops: 0, hopLimit: 4
      };
      setOfflineQueue([env, ...offlineQueue]);
    }
    setHelpRequests([req, ...helpRequests]);
    setIsHelpModalOpen(false);
    setNewHelp({ type: 'agua', description: '', urgency: 'alta' });
    alert(isOnline ? '✅ ¡Pedido de ayuda publicado!' : '📡 Guardado sin Internet.\nSe enviará por Bluetooth cuando se pueda.');
  };

  const handleCreateService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireAuth()) return;
    const s: ServiceItem = {
      id: `srv-${Date.now()}`, providerId: currentUser!.documentNumber, providerName: currentUser!.name,
      categoryId: newService.categoryId, title: newService.title, description: newService.description,
      priceType: newService.priceType, priceAmount: Number(newService.priceAmount),
      neighborhood: selectedNeighborhood, rating: 5.0, reviewCount: 0, jobsCompleted: 0,
      coverageArea: newService.coverageArea, status: 'published'
    };
    setServices([s, ...services]);
    setIsServiceModalOpen(false);
    setNewService({ title: '', categoryId: 'electricidad', description: '', priceAmount: 30, priceType: 'fixed', coverageArea: 'Radio 2 km' });
    alert('✅ ¡Tu servicio fue publicado!');
  };

  const filteredServices = services.filter(srv => {
    const cat = selectedCategory === 'all' || srv.categoryId === selectedCategory;
    const q = searchQuery.toLowerCase();
    const txt = srv.title.toLowerCase().includes(q) || srv.description.toLowerCase().includes(q) || srv.providerName.toLowerCase().includes(q);
    return cat && txt;
  });

  // ——— Render ———

  return (
    <div className="phone">

      {/* Status Bar */}
      <div className="statusbar">
        <span>9:41</span>
        <div className="notch" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <SignalHigh size={13} />
          <BatteryMedium size={15} />
        </div>
      </div>

      {/* Header */}
      <header className="top-header">
        <div className="logo-area" onClick={() => setIsAuthModalOpen(true)}>
          <div className="rings"><div className="r red" /><div className="r gold" /></div>
          <div className="logo-text">
            <span className="lr">a</span><span className="lg">y</span><span className="lr">n</span><span className="lg">i</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className={`conn-pill ${isOnline ? 'on' : 'off'}`} onClick={() => setIsOnline(!isOnline)}>
            {isOnline ? <><Wifi size={14} /> Con Internet</> : <><WifiOff size={14} /> Sin Internet</>}
          </button>
          <div className="avatar-btn" onClick={() => setIsAuthModalOpen(true)}>
            <UserIcon size={18} color="#475569" />
          </div>
        </div>
      </header>

      {/* Offline Banner */}
      {!isOnline && (
        <div className="offline-strip">
          <Radio size={16} />
          <span>Sin Internet — Todo se guarda en tu teléfono</span>
        </div>
      )}

      {/* Scrollable Screen */}
      <div className="screen">

        {/* ===== TAB: SERVICIOS ===== */}
        {activeTab === 'services' && (
          <div>
            {/* Search */}
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <Search size={18} style={{ position: 'absolute', left: 14, top: 15, color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="🔍 Buscar electricista, gasfitero..."
                className="big-search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Category pills */}
            <div className="pills">
              <button className={`pill ${selectedCategory === 'all' ? 'on' : ''}`} onClick={() => setSelectedCategory('all')}>
                Todos
              </button>
              {INITIAL_CATEGORIES.map(c => (
                <button key={c.id} className={`pill ${selectedCategory === c.id ? 'on' : ''}`} onClick={() => setSelectedCategory(c.id)}>
                  {c.name}
                </button>
              ))}
            </div>

            {/* Service Cards */}
            {filteredServices.map(srv => (
              <div key={srv.id} className="acard">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span className="tag tag-red">
                    {INITIAL_CATEGORIES.find(c => c.id === srv.categoryId)?.name}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 800, color: '#b45309', fontSize: '0.95rem' }}>
                    <Star size={16} fill="#f59e0b" color="#f59e0b" />
                    {srv.rating} <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '0.82rem' }}>({srv.reviewCount})</span>
                  </div>
                </div>

                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
                  {srv.title}
                </h3>

                <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.4, marginBottom: 10 }}>
                  {srv.description}
                </p>

                <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 4 }}>
                  👤 <strong>{srv.providerName}</strong>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 12 }}>
                  📍 {srv.neighborhood}
                </div>

                <div style={{ borderTop: '2px solid #f1f5f9', paddingTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Precio estimado</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--red)' }}>
                      {srv.priceType === 'fixed' ? `S/ ${srv.priceAmount}` : 'A cotizar'}
                    </div>
                  </div>
                  <button className="abtn abtn-primary" onClick={() => handleRequestService(srv)}>
                    📞 Solicitar
                  </button>
                </div>
              </div>
            ))}

            {/* Bookings Section */}
            {bookings.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <ShieldCheck size={20} color="var(--red)" />
                  <span style={{ fontSize: '1.05rem', fontWeight: 800 }}>Mis Solicitudes</span>
                </div>

                {bookings.map(b => (
                  <div key={b.id} className="acard" style={{ borderLeft: '5px solid var(--red)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>{b.serviceTitle}</span>
                      <span className={`tag ${b.status === 'completado' ? 'tag-green' : 'tag-gold'}`}>
                        {b.status === 'completado' ? '✅ Listo' : b.status === 'en_proceso' ? '🔄 En curso' : '📨 Enviado'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 8 }}>
                      👤 {b.providerName} &nbsp;•&nbsp; 🕐 {b.date}
                    </div>

                    {(b.status === 'en_proceso' || b.status === 'solicitado') && (
                      <button
                        className="abtn abtn-outline abtn-block"
                        onClick={() => handleCompleteBooking(b.id)}
                      >
                        <CheckCircle2 size={18} color="var(--green)" /> Marcar como terminado
                      </button>
                    )}

                    {b.status === 'completado' && !b.hasReview && (
                      <button
                        className="abtn abtn-primary abtn-block"
                        onClick={() => { setSelectedBookingForReview(b); setIsReviewModalOpen(true); }}
                      >
                        ⭐ Calificar al técnico
                      </button>
                    )}

                    {b.hasReview && (
                      <div style={{ textAlign: 'center', color: 'var(--green)', fontWeight: 800, fontSize: '0.92rem', padding: '8px 0' }}>
                        ✅ Ya calificaste este servicio
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== TAB: SOLIDARIDAD ===== */}
        {activeTab === 'solidarity' && (
          <div>
            <div className="sec-head">
              <div>
                <div className="sec-title">🤝 Ayuda entre Vecinos</div>
                <div className="sec-sub">Pedidos solidarios sin costo</div>
              </div>
              <button className="abtn abtn-primary" style={{ fontSize: '0.85rem', padding: '10px 14px' }} onClick={() => setIsHelpModalOpen(true)}>
                <Plus size={18} /> Pedir Ayuda
              </button>
            </div>

            {helpRequests.map(req => (
              <div key={req.id} className="acard" style={{ borderLeft: `5px solid ${req.urgency === 'alta' ? '#ef4444' : '#f59e0b'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span className={`tag ${req.urgency === 'alta' ? 'tag-red' : 'tag-gold'}`}>
                      {req.urgency === 'alta' ? '🚨 URGENTE' : req.urgency === 'media' ? '⏰ HOY' : '📋 BAJA'}
                    </span>
                    <span className="tag tag-gold">
                      {HELP_TYPE_LABELS[req.type] || req.type}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>{req.date}</span>
                </div>

                <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', margin: '8px 0' }}>
                  {req.description}
                </p>

                <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 10 }}>
                  👤 <strong>{req.authorName}</strong> &nbsp;📍 {req.neighborhood}
                </div>

                {req.isOfflineCreated && (
                  <div style={{ fontSize: '0.78rem', color: '#b91c1c', fontWeight: 700, marginBottom: 8 }}>
                    📡 Creado sin Internet — esperando envío
                  </div>
                )}

                <div style={{ borderTop: '2px solid #f1f5f9', paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: '#475569' }}>
                    {req.status === 'abierta'
                      ? '⏳ Esperando apoyo...'
                      : `✅ Coordinando con ${req.helperName}`}
                  </span>

                  {req.status === 'abierta' && (
                    <button
                      className="abtn abtn-primary"
                      style={{ fontSize: '0.82rem', padding: '8px 14px' }}
                      onClick={() => {
                        setHelpRequests(helpRequests.map(h =>
                          h.id === req.id ? { ...h, status: 'en_coordinacion', helperName: currentUser?.name || 'Tú' } : h
                        ));
                        alert('🤝 ¡Gracias por ayudar!\nCoordina con tu vecino.');
                      }}
                    >
                      🤝 Yo ayudo
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ===== TAB: COMUNIDAD ===== */}
        {activeTab === 'community' && (
          <div>
            <div className="sec-head">
              <div>
                <div className="sec-title">📢 Avisos del Barrio</div>
                <div className="sec-sub">Cortes de agua, luz y alertas</div>
              </div>
            </div>

            {communityPosts.map(post => (
              <div key={post.id} className="acard">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className={`tag ${post.verificationStatus === 'corroborado' ? 'tag-green' : 'tag-gold'}`}>
                    {post.verificationStatus === 'corroborado' ? '✅ Confirmado por vecinos' : '⚠️ Aviso nuevo'}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>{post.date}</span>
                </div>

                <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '6px 0' }}>
                  {post.category === 'corte_agua' ? '💧 ' : post.category === 'corte_luz' ? '💡 ' : post.category === 'seguridad' ? '🔒 ' : '📢 '}
                  {post.title}
                </h4>

                <p style={{ fontSize: '0.88rem', color: '#475569', marginBottom: 10, lineHeight: 1.4 }}>
                  {post.body}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                    👤 {post.authorName}
                  </span>
                  <button
                    className="abtn abtn-outline"
                    style={{ fontSize: '0.82rem', padding: '8px 12px' }}
                    onClick={() => {
                      setCommunityPosts(communityPosts.map(p =>
                        p.id === post.id ? { ...p, corroborations: p.corroborations + 1, verificationStatus: 'corroborado' } : p
                      ));
                    }}
                  >
                    👍 Confirmar ({post.corroborations})
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ===== TAB: MAPA ===== */}
        {activeTab === 'map' && (
          <div>
            <div style={{ marginBottom: 10 }}>
              <div className="sec-title">📍 Mapa del Barrio</div>
              <div className="sec-sub">Tu dirección exacta nunca se muestra</div>
            </div>

            <div className="map-box">
              <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(255,255,255,0.95)', padding: '6px 10px', borderRadius: 10, fontSize: '0.82rem', fontWeight: 800 }}>
                📍 {selectedNeighborhood}
              </div>

              <div className="pin" style={{ top: '30%', left: '32%' }} onClick={() => alert('⚡ José Ramírez\nElectricista\n⭐ 4.9')}>
                <Store size={14} color="var(--red)" />
                <span>José (Luz)</span>
              </div>
              <div className="pin" style={{ top: '55%', left: '60%' }} onClick={() => alert('🔧 Carmen Morales\nGasfitería\n⭐ 4.8')}>
                <Store size={14} color="var(--red)" />
                <span>Carmen (Agua)</span>
              </div>
              <div className="pin help-pin" style={{ top: '72%', left: '38%' }} onClick={() => alert('🚨 Familia Mendoza necesita agua potable')}>
                <AlertTriangle size={14} color="var(--gold)" />
                <span>Auxilio: Agua</span>
              </div>
              <div className="pin" style={{ top: '42%', left: '78%' }} onClick={() => alert('🪚 Pedro Quispe\nCarpintería\n⭐ 5.0')}>
                <Store size={14} color="var(--red)" />
                <span>Pedro (Muebles)</span>
              </div>
            </div>
          </div>
        )}

        {/* ===== TAB: OFFLINE & BLE ===== */}
        {activeTab === 'offline' && (
          <div>
            <div className="sec-head">
              <div>
                <div className="sec-title">📡 Centro Sin Internet</div>
                <div className="sec-sub">Tus mensajes se guardan aquí</div>
              </div>
              <button className="abtn abtn-outline" style={{ fontSize: '0.82rem' }} onClick={() => {
                if (!isOnline) { alert('⚠️ Activa Internet primero.'); return; }
                setOfflineQueue(offlineQueue.map(env => ({ ...env, status: 'sincronizado' })));
                alert('✅ ¡Todo sincronizado!');
              }}>
                <RefreshCw size={16} /> Sincronizar
              </button>
            </div>

            <div className="acard" style={{ background: '#fef2f2', borderColor: '#fecaca' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <Info size={22} color="var(--red)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: '0.85rem', color: '#7f1d1d', lineHeight: 1.4 }}>
                  <strong>¿Cómo funciona?</strong><br />
                  Cuando no hay Internet, tus mensajes se guardan en el teléfono.
                  Al acercarte a otro vecino con Bluetooth, se pasan automáticamente hasta llegar a alguien con señal.
                </div>
              </div>
            </div>

            {offlineQueue.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94a3b8' }}>
                <Radio size={36} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.4 }} />
                <p style={{ fontSize: '0.92rem', fontWeight: 700 }}>No hay mensajes pendientes</p>
                <p style={{ fontSize: '0.82rem' }}>Todo está al día ✅</p>
              </div>
            ) : (
              offlineQueue.map(item => (
                <div key={item.id} className="acard">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 800 }}>📩 Mensaje {item.id.slice(-4)}</span>
                    <span className={`tag ${item.status === 'sincronizado' ? 'tag-green' : item.status === 'retransmitido' ? 'tag-gold' : 'tag-red'}`}>
                      {item.status === 'sincronizado' ? '✅ Enviado' : item.status === 'retransmitido' ? '📡 En camino' : '💾 Guardado'}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: 4 }}>
                    {item.payload.description}
                  </p>

                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 8 }}>
                    Saltos: {item.hops} de {item.hopLimit} &nbsp;•&nbsp; {item.createdAt}
                  </div>

                  {item.status !== 'sincronizado' && (
                    <button
                      className="abtn abtn-primary abtn-block"
                      style={{ fontSize: '0.85rem' }}
                      onClick={() => {
                        setOfflineQueue(offlineQueue.map(env =>
                          env.id === item.id ? { ...env, hops: env.hops + 1, status: 'retransmitido' } : env
                        ));
                      }}
                    >
                      📡 Simular Envío por Bluetooth (+1 salto)
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

      </div>

      {/* FAB */}
      {activeTab === 'services' && (
        <button className="fab" onClick={() => setIsServiceModalOpen(true)} title="Ofrecer un servicio">
          <Plus size={26} />
        </button>
      )}

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <button className={`nav-btn ${activeTab === 'services' ? 'active' : ''}`} onClick={() => setActiveTab('services')}>
          <Store size={22} />
          <span>Servicios</span>
        </button>
        <button className={`nav-btn ${activeTab === 'solidarity' ? 'active' : ''}`} onClick={() => setActiveTab('solidarity')}>
          <HeartHandshake size={22} />
          <span>Ayuda</span>
          {helpRequests.filter(h => h.status === 'abierta').length > 0 && <div className="dot" />}
        </button>
        <button className={`nav-btn ${activeTab === 'community' ? 'active' : ''}`} onClick={() => setActiveTab('community')}>
          <Users size={22} />
          <span>Avisos</span>
        </button>
        <button className={`nav-btn ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')}>
          <MapPin size={22} />
          <span>Mapa</span>
        </button>
        <button className={`nav-btn ${activeTab === 'offline' ? 'active' : ''}`} onClick={() => setActiveTab('offline')}>
          <Radio size={22} />
          <span>Offline</span>
          {offlineQueue.filter(q => q.status !== 'sincronizado').length > 0 && <div className="dot" />}
        </button>
      </nav>

      {/* ===== AUTH MODAL ===== */}
      {isAuthModalOpen && (
        <AuthModal
          onSuccess={user => { setCurrentUser(user); setIsAuthModalOpen(false); }}
          onClose={() => setIsAuthModalOpen(false)}
        />
      )}

      {/* ===== MODAL: NUEVO SERVICIO ===== */}
      {isServiceModalOpen && (
        <div className="auth-overlay">
          <div className="auth-card" style={{ maxWidth: 380, padding: '24px 20px' }}>
            <button className="auth-close-btn" onClick={() => setIsServiceModalOpen(false)}>✕</button>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 14, color: 'var(--red)' }}>
              📋 Ofrecer mi Servicio
            </h3>
            <form onSubmit={handleCreateService} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="auth-field">
                <label>¿QUÉ HACES? (TU OFICIO)</label>
                <input type="text" required placeholder="Ej: Pintor de casas" className="auth-input" style={{ fontSize: '1rem' }}
                  value={newService.title} onChange={e => setNewService({ ...newService, title: e.target.value })} />
              </div>
              <div className="auth-field">
                <label>CATEGORÍA</label>
                <div className="select-wrapper">
                  <select className="auth-input select-input" style={{ fontSize: '1rem' }}
                    value={newService.categoryId} onChange={e => setNewService({ ...newService, categoryId: e.target.value })}>
                    {INITIAL_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <div className="select-arrow">▼</div>
                </div>
              </div>
              <div className="auth-field">
                <label>DESCRÍBELO EN POCAS PALABRAS</label>
                <textarea required rows={2} className="auth-input" style={{ fontSize: '1rem' }}
                  placeholder="Ej: Pinto paredes interiores y exteriores..."
                  value={newService.description} onChange={e => setNewService({ ...newService, description: e.target.value })} />
              </div>
              <div className="auth-field">
                <label>PRECIO ESTIMADO (S/)</label>
                <input type="number" min={5} className="auth-input mono-font" style={{ fontSize: '1.1rem' }}
                  value={newService.priceAmount} onChange={e => setNewService({ ...newService, priceAmount: Number(e.target.value) })} />
              </div>
              <button type="submit" className="auth-submit-btn" style={{ marginTop: 4 }}>
                PUBLICAR MI SERVICIO
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL: PEDIR AYUDA ===== */}
      {isHelpModalOpen && (
        <div className="auth-overlay">
          <div className="auth-card" style={{ maxWidth: 380, padding: '24px 20px' }}>
            <button className="auth-close-btn" onClick={() => setIsHelpModalOpen(false)}>✕</button>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 4, color: 'var(--red)' }}>
              🤝 Pedir Ayuda al Barrio
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 14 }}>Es gratis y solidario.</p>

            <form onSubmit={handleCreateHelp} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="auth-field">
                <label>¿QUÉ NECESITAS?</label>
                <div className="select-wrapper">
                  <select className="auth-input select-input" style={{ fontSize: '1rem' }}
                    value={newHelp.type} onChange={e => setNewHelp({ ...newHelp, type: e.target.value })}>
                    <option value="agua">💧 Agua potable</option>
                    <option value="alimentos">🍞 Alimentos</option>
                    <option value="herramientas">🔧 Herramientas</option>
                    <option value="transporte">🚗 Transporte</option>
                    <option value="cuidado">❤️ Cuidado de personas</option>
                    <option value="otro">📦 Otro</option>
                  </select>
                  <div className="select-arrow">▼</div>
                </div>
              </div>
              <div className="auth-field">
                <label>¿QUÉ TAN URGENTE ES?</label>
                <div className="select-wrapper">
                  <select className="auth-input select-input" style={{ fontSize: '1rem' }}
                    value={newHelp.urgency} onChange={e => setNewHelp({ ...newHelp, urgency: e.target.value })}>
                    <option value="alta">🚨 Muy urgente (ahora mismo)</option>
                    <option value="media">⏰ Hoy si es posible</option>
                    <option value="baja">📋 No es urgente</option>
                  </select>
                  <div className="select-arrow">▼</div>
                </div>
              </div>
              <div className="auth-field">
                <label>CUÉNTANOS MÁS</label>
                <textarea required rows={2} className="auth-input" style={{ fontSize: '1rem' }}
                  placeholder="Ej: Necesito 2 bidones de agua para mi abuelita..."
                  value={newHelp.description} onChange={e => setNewHelp({ ...newHelp, description: e.target.value })} />
              </div>
              <button type="submit" className="auth-submit-btn" style={{ marginTop: 4 }}>
                {isOnline ? '📢 PUBLICAR PEDIDO' : '💾 GUARDAR SIN INTERNET'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL: CALIFICAR ===== */}
      {isReviewModalOpen && selectedBookingForReview && (
        <div className="auth-overlay">
          <div className="auth-card" style={{ maxWidth: 380, padding: '24px 20px' }}>
            <button className="auth-close-btn" onClick={() => setIsReviewModalOpen(false)}>✕</button>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 4, color: '#0f172a' }}>
              ⭐ ¿Cómo te fue?
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 14 }}>
              Califica a <strong>{selectedBookingForReview.providerName}</strong>
            </p>

            <form onSubmit={handleSubmitReview} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                {[1, 2, 3, 4, 5].map(v => (
                  <button key={v} type="button" onClick={() => setReviewForm({ ...reviewForm, rating: v })}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                    <Star size={32} fill={v <= reviewForm.rating ? '#f59e0b' : 'none'} color="#f59e0b" />
                  </button>
                ))}
              </div>
              <div style={{ textAlign: 'center', fontSize: '1rem', fontWeight: 800, color: '#b45309' }}>
                {reviewForm.rating === 5 ? '¡Excelente!' : reviewForm.rating === 4 ? 'Muy bueno' : reviewForm.rating === 3 ? 'Regular' : reviewForm.rating === 2 ? 'Malo' : 'Muy malo'}
              </div>
              <div className="auth-field">
                <label>TU COMENTARIO</label>
                <textarea required rows={2} className="auth-input" style={{ fontSize: '1rem' }}
                  placeholder="¿Fue puntual? ¿Hizo buen trabajo?"
                  value={reviewForm.comment} onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })} />
              </div>
              <button type="submit" className="auth-submit-btn">
                ✅ ENVIAR CALIFICACIÓN
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
