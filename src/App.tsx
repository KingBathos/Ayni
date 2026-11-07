import React, { useState } from 'react';
import { 
  Store, 
  MapPin, 
  Wifi, 
  WifiOff, 
  Radio, 
  Users, 
  HeartHandshake, 
  AlertTriangle, 
  Star, 
  CheckCircle2, 
  Plus, 
  Search, 
  RefreshCw,
  Info,
  User as UserIcon,
  ShieldCheck,
  BatteryMedium,
  SignalHigh
} from 'lucide-react';
import { 
  INITIAL_SERVICES, 
  INITIAL_COMMUNITY_POSTS, 
  INITIAL_HELP_REQUESTS, 
  INITIAL_BOOKINGS, 
  INITIAL_CATEGORIES 
} from './mockData';
import { ServiceItem, HelpRequest, CommunityPost, Booking, OfflineEnvelope } from './types';
import { AuthModal } from './AuthModal';
import './App.css';

export function App() {
  // Mobile Bottom Tabs: 'services' | 'solidarity' | 'community' | 'map' | 'offline'
  const [activeTab, setActiveTab] = useState<'services' | 'solidarity' | 'community' | 'map' | 'offline'>('services');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  
  // Current Authenticated User state (Starts with user logged in, can switch)
  const [currentUser, setCurrentUser] = useState<{
    name: string;
    documentNumber: string;
    neighborhood: string;
    district: string;
  } | null>({
    name: 'María Quispe',
    documentNumber: '72345678',
    neighborhood: 'Sector Central / Santa Rosa',
    district: 'San Juan de Lurigancho'
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const selectedNeighborhood = currentUser ? currentUser.neighborhood : 'Sector Central';

  // Core Data States
  const [services, setServices] = useState<ServiceItem[]>(INITIAL_SERVICES);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>(INITIAL_COMMUNITY_POSTS);
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>(INITIAL_HELP_REQUESTS);
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [offlineQueue, setOfflineQueue] = useState<OfflineEnvelope[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modals
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<Booking | null>(null);

  // Forms
  const [newService, setNewService] = useState({
    title: '',
    categoryId: 'electricidad',
    description: '',
    priceAmount: 30,
    priceType: 'fixed' as 'fixed' | 'quote',
    coverageArea: 'Radio 2 km'
  });

  const [newHelp, setNewHelp] = useState({
    type: 'agua' as 'agua' | 'alimentos' | 'herramientas' | 'transporte' | 'otro',
    description: '',
    urgency: 'alta' as 'alta' | 'media' | 'baja',
  });

  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: ''
  });

  // Action: Request service
  const handleRequestService = (srv: ServiceItem) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    const newBooking: Booking = {
      id: `bk-${Date.now()}`,
      serviceId: srv.id,
      serviceTitle: srv.title,
      clientId: currentUser.documentNumber,
      clientName: currentUser.name,
      providerId: srv.providerId,
      providerName: srv.providerName,
      status: 'solicitado',
      date: 'Hoy, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      hasReview: false,
      notes: 'Solicitud realizada a través de la app Ayni.'
    };
    setBookings([newBooking, ...bookings]);
    alert(`¡Solicitud enviada a ${srv.providerName}!`);
  };

  const handleCompleteBooking = (bookingId: string) => {
    setBookings(bookings.map(b => b.id === bookingId ? { ...b, status: 'completado' } : b));
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingForReview) return;

    setBookings(bookings.map(b => 
      b.id === selectedBookingForReview.id ? { ...b, hasReview: true } : b
    ));

    setServices(services.map(srv => {
      if (srv.id === selectedBookingForReview.serviceId) {
        const newCount = srv.reviewCount + 1;
        const newRating = Number(((srv.rating * srv.reviewCount + reviewForm.rating) / newCount).toFixed(1));
        return { ...srv, reviewCount: newCount, rating: newRating, jobsCompleted: srv.jobsCompleted + 1 };
      }
      return srv;
    }));

    setIsReviewModalOpen(false);
    setSelectedBookingForReview(null);
    setReviewForm({ rating: 5, comment: '' });
    alert('¡Valoración verificada registrada!');
  };

  // Help Request (Online/Offline)
  const handleCreateHelp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    const req: HelpRequest = {
      id: `help-${Date.now()}`,
      authorName: currentUser.name,
      authorId: currentUser.documentNumber,
      type: newHelp.type,
      description: newHelp.description,
      urgency: newHelp.urgency,
      neighborhood: selectedNeighborhood,
      status: 'abierta',
      date: 'Ahora mismo',
      isOfflineCreated: !isOnline
    };

    if (isOnline) {
      setHelpRequests([req, ...helpRequests]);
      alert('¡Solicitud de auxilio publicada!');
    } else {
      const envelope: OfflineEnvelope = {
        id: `env-${Date.now()}`,
        type: 'help_request',
        payload: req,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'local',
        hops: 0,
        hopLimit: 4
      };
      setOfflineQueue([envelope, ...offlineQueue]);
      setHelpRequests([req, ...helpRequests]);
      alert('⚠️ Guardado en SQLite local. Listo para retransmitir por BLE Store-and-Forward.');
    }

    setIsHelpModalOpen(false);
    setNewHelp({ type: 'agua', description: '', urgency: 'alta' });
  };

  // Create Service
  const handleCreateService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    const serviceItem: ServiceItem = {
      id: `srv-${Date.now()}`,
      providerId: currentUser.documentNumber,
      providerName: currentUser.name,
      categoryId: newService.categoryId,
      title: newService.title,
      description: newService.description,
      priceType: newService.priceType,
      priceAmount: Number(newService.priceAmount),
      neighborhood: selectedNeighborhood,
      rating: 5.0,
      reviewCount: 0,
      jobsCompleted: 0,
      coverageArea: newService.coverageArea,
      status: 'published'
    };
    setServices([serviceItem, ...services]);
    setIsServiceModalOpen(false);
    setNewService({
      title: '',
      categoryId: 'electricidad',
      description: '',
      priceAmount: 30,
      priceType: 'fixed',
      coverageArea: 'Radio 2 km'
    });
    alert('¡Servicio publicado!');
  };

  // Mesh relay simulation
  const handleSimulateMeshRelay = (envelopeId: string) => {
    setOfflineQueue(offlineQueue.map(env => {
      if (env.id === envelopeId) {
        return { 
          ...env, 
          hops: env.hops + 1, 
          status: 'retransmitido' 
        };
      }
      return env;
    }));
  };

  const handleSyncOnline = () => {
    if (!isOnline) {
      alert('Activa la conexión para sincronizar con la nube central.');
      return;
    }
    setOfflineQueue(offlineQueue.map(env => ({ ...env, status: 'sincronizado' })));
    alert('¡Cola de paquetes sincronizada!');
  };

  const filteredServices = services.filter(srv => {
    const matchesCategory = selectedCategory === 'all' || srv.categoryId === selectedCategory;
    const matchesSearch = srv.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          srv.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          srv.providerName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="mobile-device-wrapper">
      
      {/* Phone Status Bar (Mock Native iOS/Android) */}
      <div className="phone-status-bar">
        <span>09:41</span>
        <div className="status-notch"></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <SignalHigh size={12} />
          <BatteryMedium size={14} />
        </div>
      </div>

      {/* Top Mobile Header */}
      <header className="mobile-header">
        <div className="mobile-brand-pill" onClick={() => setIsAuthModalOpen(true)}>
          <div className="mobile-mini-rings">
            <div className="m-ring red"></div>
            <div className="m-ring gold"></div>
          </div>
          <div className="mobile-logo-text">
            <span style={{ color: '#c0152f' }}>a</span>
            <span style={{ color: '#e59d18' }}>y</span>
            <span style={{ color: '#c0152f' }}>n</span>
            <span style={{ color: '#e59d18' }}>i</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            className={`offline-pill ${isOnline ? 'online' : 'offline'}`}
            onClick={() => setIsOnline(!isOnline)}
            title="Toca para simular corte de Internet"
          >
            {isOnline ? (
              <>
                <Wifi size={12} />
                <span>Online</span>
              </>
            ) : (
              <>
                <WifiOff size={12} />
                <span>Offline BLE</span>
              </>
            )}
          </button>

          <div 
            onClick={() => setIsAuthModalOpen(true)}
            style={{ 
              width: '30px', 
              height: '30px', 
              borderRadius: '50%', 
              background: '#f1f5f9', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              cursor: 'pointer',
              border: '1.5px solid #cbd5e1'
            }}
          >
            <UserIcon size={16} color="#334155" />
          </div>
        </div>
      </header>

      {/* Offline Alert Strip */}
      {!isOnline && (
        <div className="mobile-offline-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Radio size={14} color="#b91c1c" />
            <span>Sin Internet: Operando vía BLE local</span>
          </div>
          <button 
            onClick={() => setActiveTab('offline')}
            style={{ background: 'none', border: 'none', color: '#c0152f', fontWeight: 'bold', fontSize: '0.7rem', cursor: 'pointer' }}
          >
            Ver cola ({offlineQueue.filter(q => q.status !== 'sincronizado').length})
          </button>
        </div>
      )}

      {/* Mobile Screen Scrollable View */}
      <div className="mobile-screen-body">

        {/* ================= TAB 1: SERVICIOS Y OFICIOS ================= */}
        {activeTab === 'services' && (
          <div>
            {/* Search Input */}
            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '12px', color: '#94a3b8' }} />
              <input 
                type="text" 
                placeholder="Buscar electricista, gasfitero..."
                className="m-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Category horizontal scrolling pills */}
            <div className="horizontal-scroll">
              <button 
                className={`m-pill ${selectedCategory === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('all')}
              >
                Todos
              </button>
              {INITIAL_CATEGORIES.map(cat => (
                <button 
                  key={cat.id} 
                  className={`m-pill ${selectedCategory === cat.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Service Cards */}
            {filteredServices.map(srv => (
              <div key={srv.id} className="m-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <span className="m-badge m-badge-primary">
                    {INITIAL_CATEGORIES.find(c => c.id === srv.categoryId)?.name || 'Oficio'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.75rem', fontWeight: 700, color: '#b45309' }}>
                    <Star size={13} fill="#f59e0b" color="#f59e0b" />
                    <span>{srv.rating}</span>
                    <span style={{ color: '#94a3b8', fontWeight: 'normal' }}>({srv.reviewCount})</span>
                  </div>
                </div>

                <h4 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: '4px', color: '#0f172a' }}>
                  {srv.title}
                </h4>

                <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '10px', lineHeight: '1.3' }}>
                  {srv.description}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#64748b', marginBottom: '10px' }}>
                  <MapPin size={12} color="#c0152f" />
                  <span>{srv.neighborhood}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                  <div>
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'block' }}>Estimado</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#c0152f' }}>
                      {srv.priceType === 'fixed' ? `S/ ${srv.priceAmount}` : 'A cotizar'}
                    </span>
                  </div>
                  <button className="m-btn m-btn-primary" style={{ padding: '6px 12px' }} onClick={() => handleRequestService(srv)}>
                    Solicitar
                  </button>
                </div>
              </div>
            ))}

            {/* My Active Bookings Section */}
            <div style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <ShieldCheck size={16} color="#c0152f" />
                <h4 style={{ fontSize: '0.88rem', fontWeight: 700 }}>Tus Solicitudes & Calificación</h4>
              </div>

              {bookings.map(b => (
                <div key={b.id} className="m-card" style={{ background: '#fff', borderLeft: '4px solid #c0152f' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{b.serviceTitle}</span>
                    <span className="m-badge m-badge-gold">{b.status}</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '8px' }}>
                    Técnico: <strong>{b.providerName}</strong> • {b.date}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                    {b.status === 'en_proceso' || b.status === 'solicitado' ? (
                      <button 
                        className="m-btn m-btn-outline" 
                        style={{ fontSize: '0.72rem', padding: '4px 8px' }}
                        onClick={() => handleCompleteBooking(b.id)}
                      >
                        <CheckCircle2 size={12} color="#10b981" /> Marcar Trabajo Listo
                      </button>
                    ) : !b.hasReview ? (
                      <button 
                        className="m-btn m-btn-primary" 
                        style={{ fontSize: '0.72rem', padding: '4px 8px' }}
                        onClick={() => {
                          setSelectedBookingForReview(b);
                          setIsReviewModalOpen(true);
                        }}
                      >
                        <Star size={12} /> Calificar (Verificada)
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700 }}>✓ Evaluado</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 2: AYUDA SOLIDARIA ================= */}
        {activeTab === 'solidarity' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Red de Auxilio Vecinal</h3>
                <p style={{ fontSize: '0.72rem', color: '#64748b' }}>Cadena de favores no comercial</p>
              </div>
              <button className="m-btn m-btn-primary" style={{ padding: '6px 10px', fontSize: '0.75rem' }} onClick={() => setIsHelpModalOpen(true)}>
                <Plus size={14} /> Pedir Ayuda
              </button>
            </div>

            {helpRequests.map(req => (
              <div key={req.id} className="m-card" style={{ borderLeft: req.urgency === 'alta' ? '4px solid #ef4444' : '4px solid #e59d18' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <span className={`m-badge ${req.urgency === 'alta' ? 'm-badge-urgent' : 'm-badge-gold'}`}>
                      {req.urgency.toUpperCase()}
                    </span>
                    <span className="m-badge m-badge-primary">{req.type}</span>
                  </div>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{req.date}</span>
                </div>

                <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', margin: '6px 0' }}>
                  {req.description}
                </p>

                <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '8px' }}>
                  Por: <strong>{req.authorName}</strong> ({req.neighborhood})
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '6px' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    {req.status === 'abierta' ? 'Esperando apoyo' : `En curso con ${req.helperName}`}
                  </span>

                  {req.status === 'abierta' && (
                    <button 
                      className="m-btn m-btn-outline" 
                      style={{ fontSize: '0.72rem', padding: '4px 8px' }}
                      onClick={() => {
                        setHelpRequests(helpRequests.map(h => h.id === req.id ? { ...h, status: 'en_coordinacion', helperName: currentUser?.name || 'Tú' } : h));
                        alert('¡Apoyo ofrecido!');
                      }}
                    >
                      <HeartHandshake size={12} color="#c0152f" /> Apoyar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ================= TAB 3: TABLÓN COMUNITARIO ================= */}
        {activeTab === 'community' && (
          <div>
            <div style={{ marginBottom: '12px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Avisos y Alertas Barriales</h3>
              <p style={{ fontSize: '0.72rem', color: '#64748b' }}>Cortes de servicios y noticias de la zona</p>
            </div>

            {communityPosts.map(post => (
              <div key={post.id} className="m-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span className={`m-badge ${post.verificationStatus === 'corroborado' ? 'm-badge-success' : 'm-badge-gold'}`}>
                    {post.verificationStatus === 'corroborado' ? '✓ Corroborado' : 'Aviso vecinal'}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{post.date}</span>
                </div>

                <h4 style={{ fontSize: '0.88rem', fontWeight: 700, margin: '4px 0', color: '#0f172a' }}>
                  {post.title}
                </h4>

                <p style={{ fontSize: '0.78rem', color: '#475569', marginBottom: '8px' }}>
                  {post.body}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: '#94a3b8' }}>
                  <span>{post.authorName}</span>
                  <button 
                    className="m-btn m-btn-outline" 
                    style={{ fontSize: '0.68rem', padding: '3px 6px' }}
                    onClick={() => {
                      setCommunityPosts(communityPosts.map(p => p.id === post.id ? { ...p, corroborations: p.corroborations + 1, verificationStatus: 'corroborado' } : p));
                    }}
                  >
                    👍 Corroborar ({post.corroborations})
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ================= TAB 4: MAPA ================= */}
        {activeTab === 'map' && (
          <div>
            <div style={{ marginBottom: '10px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Mapa de Proximidad Vecinal</h3>
              <p style={{ fontSize: '0.72rem', color: '#64748b' }}>Privacidad garantizada: no muestra domicilios exactos</p>
            </div>

            <div className="mobile-map-box">
              <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(255,255,255,0.95)', padding: '4px 8px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 700 }}>
                {selectedNeighborhood}
              </div>

              <div className="m-pin" style={{ top: '30%', left: '35%' }} onClick={() => alert('Electricista: José Ramírez')}>
                <Store size={12} color="#c0152f" />
                <span>José (Luz)</span>
              </div>

              <div className="m-pin" style={{ top: '55%', left: '60%' }} onClick={() => alert('Gasfitería: Carmen Morales')}>
                <Store size={12} color="#c0152f" />
                <span>Carmen (Agua)</span>
              </div>

              <div className="m-pin solidarity" style={{ top: '75%', left: '40%' }} onClick={() => alert('Alerta de Agua Potable')}>
                <AlertTriangle size={12} color="#e59d18" />
                <span>Auxilio Agua</span>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 5: CENTRO OFFLINE & BLE ================= */}
        {activeTab === 'offline' && (
          <div>
            <div style={{ marginBottom: '12px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Centro de Red Offline (BLE)</h3>
              <p style={{ fontSize: '0.72rem', color: '#64748b' }}>Store-and-forward tolerante a desastres y cortes</p>
            </div>

            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '10px', borderRadius: '10px', marginBottom: '12px', fontSize: '0.72rem', color: '#991b1b' }}>
              <Radio size={14} style={{ display: 'inline', marginRight: '4px' }} />
              <strong>Protocolo Mesh Directo:</strong> Los teléfonos intercambian sobres cifrados vía Bluetooth al cruzarse en la calle.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
              <button className="m-btn m-btn-outline" style={{ fontSize: '0.75rem' }} onClick={handleSyncOnline}>
                <RefreshCw size={12} /> Sincronizar cola al servidor
              </button>
            </div>

            {offlineQueue.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 10px', color: '#94a3b8', fontSize: '0.78rem' }}>
                <Radio size={30} style={{ margin: '0 auto 6px', display: 'block', opacity: 0.4 }} />
                No hay paquetes en espera. Todo sincronizado.
              </div>
            ) : (
              offlineQueue.map(item => (
                <div key={item.id} className="m-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Sobre {item.id.slice(-6)}</span>
                    <span className={`m-badge ${item.status === 'sincronizado' ? 'm-badge-success' : 'm-badge-gold'}`}>
                      {item.status.toUpperCase()}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.74rem', color: '#64748b' }}>
                    {item.payload.description}
                  </p>

                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', margin: '4px 0' }}>
                    Saltos: {item.hops} de {item.hopLimit} • {item.createdAt}
                  </div>

                  {item.status !== 'sincronizado' && (
                    <button 
                      className="m-btn m-btn-primary" 
                      style={{ fontSize: '0.7rem', padding: '4px 8px', marginTop: '6px', width: '100%' }}
                      onClick={() => handleSimulateMeshRelay(item.id)}
                    >
                      <Radio size={12} /> Simular Salto Bluetooth Vecino (+1 Salto)
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

      </div>

      {/* Floating Action Button for Services tab */}
      {activeTab === 'services' && (
        <button 
          className="mobile-fab" 
          onClick={() => setIsServiceModalOpen(true)}
          title="Ofrecer Servicio"
        >
          <Plus size={24} />
        </button>
      )}

      {/* Mobile Bottom Navigation Bar (5 Primary Tabs) */}
      <nav className="mobile-bottom-nav">
        <button 
          className={`nav-item-btn ${activeTab === 'services' ? 'active' : ''}`}
          onClick={() => setActiveTab('services')}
        >
          <Store size={20} />
          <span>Servicios</span>
        </button>

        <button 
          className={`nav-item-btn ${activeTab === 'solidarity' ? 'active' : ''}`}
          onClick={() => setActiveTab('solidarity')}
        >
          <HeartHandshake size={20} />
          <span>Solidaridad</span>
          {helpRequests.filter(h => h.status === 'abierta').length > 0 && <div className="nav-dot" />}
        </button>

        <button 
          className={`nav-item-btn ${activeTab === 'community' ? 'active' : ''}`}
          onClick={() => setActiveTab('community')}
        >
          <Users size={20} />
          <span>Comunidad</span>
        </button>

        <button 
          className={`nav-item-btn ${activeTab === 'map' ? 'active' : ''}`}
          onClick={() => setActiveTab('map')}
        >
          <MapPin size={20} />
          <span>Mapa</span>
        </button>

        <button 
          className={`nav-item-btn ${activeTab === 'offline' ? 'active' : ''}`}
          onClick={() => setActiveTab('offline')}
        >
          <Radio size={20} />
          <span>Offline BLE</span>
          {offlineQueue.filter(q => q.status !== 'sincronizado').length > 0 && <div className="nav-dot" />}
        </button>
      </nav>

      {/* ================= MODAL DE INICIO DE SESIÓN / REGISTRO ================= */}
      {isAuthModalOpen && (
        <AuthModal 
          onSuccess={(user) => {
            setCurrentUser(user);
            setIsAuthModalOpen(false);
          }}
          onClose={() => setIsAuthModalOpen(false)}
        />
      )}

      {/* Modal: Publicar Servicio */}
      {isServiceModalOpen && (
        <div className="auth-overlay">
          <div className="auth-card" style={{ maxWidth: '360px', padding: '24px 20px' }}>
            <button className="auth-close-btn" onClick={() => setIsServiceModalOpen(false)}>✕</button>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px', textTransform: 'uppercase', color: '#0f172a' }}>
              Ofrecer Servicio Local
            </h3>
            <form onSubmit={handleCreateService} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="auth-field">
                <label>OFICIO O ESPECIALIDAD</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Ej: Pintor de interiores"
                  className="auth-input"
                  value={newService.title}
                  onChange={e => setNewService({ ...newService, title: e.target.value })}
                />
              </div>

              <div className="auth-field">
                <label>CATEGORÍA</label>
                <div className="select-wrapper">
                  <select 
                    className="auth-input select-input"
                    value={newService.categoryId}
                    onChange={e => setNewService({ ...newService, categoryId: e.target.value })}
                  >
                    {INITIAL_CATEGORIES.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <div className="select-arrow">▼</div>
                </div>
              </div>

              <div className="auth-field">
                <label>DESCRIPCIÓN</label>
                <textarea 
                  required 
                  rows={2}
                  className="auth-input"
                  placeholder="Detalla lo que realizas..."
                  value={newService.description}
                  onChange={e => setNewService({ ...newService, description: e.target.value })}
                />
              </div>

              <div className="auth-field">
                <label>TARIFA ESTIMADA (S/)</label>
                <input 
                  type="number" 
                  min={5}
                  className="auth-input mono-font"
                  value={newService.priceAmount}
                  onChange={e => setNewService({ ...newService, priceAmount: Number(e.target.value) })}
                />
              </div>

              <button type="submit" className="auth-submit-btn" style={{ marginTop: '6px' }}>
                PUBLICAR OFICIO
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Solicitar Ayuda Mutua */}
      {isHelpModalOpen && (
        <div className="auth-overlay">
          <div className="auth-card" style={{ maxWidth: '360px', padding: '24px 20px' }}>
            <button className="auth-close-btn" onClick={() => setIsHelpModalOpen(false)}>✕</button>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px', color: '#c0152f' }}>
              SOLICITAR AYUDA MUTUA
            </h3>
            <p style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '12px' }}>
              Petición solidaria comunitaria sin fines de lucro.
            </p>

            <form onSubmit={handleCreateHelp} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="auth-field">
                <label>RECURSO REQUERIDO</label>
                <div className="select-wrapper">
                  <select 
                    className="auth-input select-input"
                    value={newHelp.type}
                    onChange={e => setNewHelp({ ...newHelp, type: e.target.value as any })}
                  >
                    <option value="agua">Agua potable</option>
                    <option value="alimentos">Alimentos / Raciones</option>
                    <option value="herramientas">Herramientas / Escaleras</option>
                    <option value="transporte">Traslado / Transporte</option>
                    <option value="cuidado">Cuidado de personas</option>
                    <option value="otro">Otro auxilio</option>
                  </select>
                  <div className="select-arrow">▼</div>
                </div>
              </div>

              <div className="auth-field">
                <label>NIVEL DE URGENCIA</label>
                <div className="select-wrapper">
                  <select 
                    className="auth-input select-input"
                    value={newHelp.urgency}
                    onChange={e => setNewHelp({ ...newHelp, urgency: e.target.value as any })}
                  >
                    <option value="alta">Alta (Emergencia inmediata)</option>
                    <option value="media">Media (Dentro del día)</option>
                    <option value="baja">Baja (Sin urgencia crítica)</option>
                  </select>
                  <div className="select-arrow">▼</div>
                </div>
              </div>

              <div className="auth-field">
                <label>¿QUÉ SE NECESITA?</label>
                <textarea 
                  required 
                  rows={2}
                  className="auth-input"
                  placeholder="Explica brevemente para que un vecino pueda coordinar..."
                  value={newHelp.description}
                  onChange={e => setNewHelp({ ...newHelp, description: e.target.value })}
                />
              </div>

              <button type="submit" className="auth-submit-btn" style={{ marginTop: '6px' }}>
                {isOnline ? 'PUBLICAR AL BARRIO' : 'GUARDAR EN COLA OFFLINE'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Calificar Servicio */}
      {isReviewModalOpen && selectedBookingForReview && (
        <div className="auth-overlay">
          <div className="auth-card" style={{ maxWidth: '360px', padding: '24px 20px' }}>
            <button className="auth-close-btn" onClick={() => setIsReviewModalOpen(false)}>✕</button>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px', color: '#0f172a' }}>
              VALORACIÓN VERIFICADA
            </h3>
            <p style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '12px' }}>
              Para <strong>{selectedBookingForReview.providerName}</strong>
            </p>

            <form onSubmit={handleSubmitReview} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="auth-field">
                <label>CALIFICACIÓN</label>
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                  {[1, 2, 3, 4, 5].map(val => (
                    <button 
                      key={val} 
                      type="button"
                      onClick={() => setReviewForm({ ...reviewForm, rating: val })}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                    >
                      <Star 
                        size={24} 
                        fill={val <= reviewForm.rating ? '#f59e0b' : 'none'} 
                        color="#f59e0b" 
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="auth-field">
                <label>COMENTARIO</label>
                <textarea 
                  required 
                  rows={2}
                  className="auth-input"
                  placeholder="¿Cómo fue la calidad y puntualidad?"
                  value={reviewForm.comment}
                  onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })}
                />
              </div>

              <button type="submit" className="auth-submit-btn">
                ENVIAR CALIFICACIÓN
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
