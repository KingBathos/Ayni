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
  Clock, 
  Plus, 
  Search, 
  Filter, 
  Send, 
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Info,
  User as UserIcon,
  LogOut,
  LogIn
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
  const [activeTab, setActiveTab] = useState<'services' | 'community' | 'solidarity' | 'map' | 'offline'>('services');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  
  // Current Authenticated User state
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
  const selectedNeighborhood = currentUser ? currentUser.neighborhood : 'Sector Central / Santa Rosa';
  
  // Data states
  const [services, setServices] = useState<ServiceItem[]>(INITIAL_SERVICES);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>(INITIAL_COMMUNITY_POSTS);
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>(INITIAL_HELP_REQUESTS);
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [offlineQueue, setOfflineQueue] = useState<OfflineEnvelope[]>([]);
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Modals
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<Booking | null>(null);
  
  // Form States
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

  // Action: Request service (Creates a booking)
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
      date: 'Recién solicitado',
      hasReview: false,
      notes: 'Solicitud realizada a través de la red vecinal.'
    };
    setBookings([newBooking, ...bookings]);
    alert(`¡Solicitud enviada a ${srv.providerName}! Podrás verla en tus contrataciones activas.`);
  };

  // Action: Complete service
  const handleCompleteBooking = (bookingId: string) => {
    setBookings(bookings.map(b => b.id === bookingId ? { ...b, status: 'completado' } : b));
  };

  // Action: Add Review (Verified reputation)
  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingForReview) return;

    setBookings(bookings.map(b => 
      b.id === selectedBookingForReview.id ? { ...b, hasReview: true } : b
    ));

    // Update provider's review count
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
    alert('¡Valoración verificada registrada con éxito! Solo clientes con servicios cerrados pueden calificar.');
  };

  // Action: Create Help Request (Supports OFFLINE-FIRST)
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
      alert('¡Solicitud de ayuda solidaria publicada en la red comunitaria!');
    } else {
      // Offline queue simulation
      const envelope: OfflineEnvelope = {
        id: `env-${Date.now()}`,
        type: 'help_request',
        payload: req,
        createdAt: new Date().toLocaleTimeString(),
        status: 'local',
        hops: 0,
        hopLimit: 4
      };
      setOfflineQueue([envelope, ...offlineQueue]);
      setHelpRequests([req, ...helpRequests]);
      alert('⚠️ Sin conexión: Tu solicitud se ha guardado en el almacenamiento local SQLite/Store-and-forward. Se transmitirá por radio BLE o sincronizará cuando haya red.');
    }

    setIsHelpModalOpen(false);
    setNewHelp({ type: 'agua', description: '', urgency: 'alta' });
  };

  // Action: Create New Service
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
    alert('¡Tu servicio ha sido publicado en el catálogo vecinal!');
  };

  // Offline mesh simulation triggers
  const handleSimulateMeshRelay = (envelopeId: string) => {
    setOfflineQueue(offlineQueue.map(env => {
      if (env.id === envelopeId) {
        const nextHops = env.hops + 1;
        return { 
          ...env, 
          hops: nextHops, 
          status: 'retransmitido' 
        };
      }
      return env;
    }));
  };

  const handleSyncOnline = () => {
    if (!isOnline) {
      alert('Debes activar la conexión a Internet primero para sincronizar con el servidor central.');
      return;
    }
    setOfflineQueue(offlineQueue.map(env => ({ ...env, status: 'sincronizado' })));
    alert('¡Todos los paquetes locales pendientes han sido sincronizados con la API central de Ayni!');
  };

  // Filtered Services
  const filteredServices = services.filter(srv => {
    const matchesCategory = selectedCategory === 'all' || srv.categoryId === selectedCategory;
    const matchesSearch = srv.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          srv.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          srv.providerName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="brand-section">
          {/* Logo brand with identical colors */}
          <div className="header-logo-container" onClick={() => setIsAuthModalOpen(true)} title="Ver Identidad Ayni">
            <div className="header-mini-rings">
              <div className="mini-ring red"></div>
              <div className="mini-ring gold"></div>
            </div>
            <div>
              <span className="header-brand-name">
                <span style={{ color: '#c0152f' }}>a</span>
                <span style={{ color: '#e59d18' }}>y</span>
                <span style={{ color: '#c0152f' }}>n</span>
                <span style={{ color: '#e59d18' }}>i</span>
              </span>
              <span className="header-brand-tagline">Hoy por ti, mañana por mí</span>
            </div>
          </div>
        </div>

        <div className="header-status-bar">
          <div className="location-chip">
            <MapPin size={16} />
            <span>{selectedNeighborhood}</span>
          </div>

          <button 
            className={`offline-toggle-btn ${isOnline ? 'online' : 'offline'}`}
            onClick={() => setIsOnline(!isOnline)}
            title="Alternar simulación de conectividad a Internet"
          >
            {isOnline ? (
              <>
                <Wifi size={16} />
                <span>En Línea</span>
              </>
            ) : (
              <>
                <WifiOff size={16} />
                <span>Modo Offline (BLE)</span>
              </>
            )}
          </button>

          {currentUser ? (
            <div className="user-profile-badge" onClick={() => setIsAuthModalOpen(true)}>
              <UserIcon size={16} />
              <span className="user-profile-name">{currentUser.name}</span>
            </div>
          ) : (
            <button className="btn btn-primary" style={{ padding: '6px 14px' }} onClick={() => setIsAuthModalOpen(true)}>
              <LogIn size={14} /> Ingresar
            </button>
          )}
        </div>
      </header>

      {/* Offline Alert Strip */}
      {!isOnline && (
        <div className="offline-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Radio size={18} />
            <strong>Operando en modo de emergencia / sin conectividad:</strong> Las funciones esenciales se guardan localmente y operan vía BLE/Mesh vecinal.
          </div>
          <button 
            className="btn btn-outline" 
            style={{ padding: '4px 10px', fontSize: '0.75rem', borderColor: '#fde68a' }}
            onClick={() => setActiveTab('offline')}
          >
            Ver Centro de Conectividad ({offlineQueue.filter(q => q.status !== 'sincronizado').length} pendientes)
          </button>
        </div>
      )}

      {/* Navigation tabs */}
      <nav className="nav-bar">
        <button 
          className={`nav-tab ${activeTab === 'services' ? 'active' : ''}`}
          onClick={() => setActiveTab('services')}
        >
          <Store size={18} />
          <span>Servicios y Oficios</span>
        </button>

        <button 
          className={`nav-tab ${activeTab === 'solidarity' ? 'active' : ''}`}
          onClick={() => setActiveTab('solidarity')}
        >
          <HeartHandshake size={18} />
          <span>Ayuda Solidaria</span>
          {helpRequests.filter(h => h.status === 'abierta').length > 0 && (
            <span className="badge badge-warning">{helpRequests.filter(h => h.status === 'abierta').length}</span>
          )}
        </button>

        <button 
          className={`nav-tab ${activeTab === 'community' ? 'active' : ''}`}
          onClick={() => setActiveTab('community')}
        >
          <Users size={18} />
          <span>Tablón Comunitario</span>
        </button>

        <button 
          className={`nav-tab ${activeTab === 'map' ? 'active' : ''}`}
          onClick={() => setActiveTab('map')}
        >
          <MapPin size={18} />
          <span>Mapa de Cobertura</span>
        </button>

        <button 
          className={`nav-tab ${activeTab === 'offline' ? 'active' : ''}`}
          onClick={() => setActiveTab('offline')}
        >
          <Radio size={18} />
          <span>Centro Offline & BLE</span>
          {offlineQueue.filter(q => q.status !== 'sincronizado').length > 0 && (
            <span className="badge badge-danger">{offlineQueue.filter(q => q.status !== 'sincronizado').length}</span>
          )}
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="main-content">
        
        {/* ================= TAB 1: SERVICIOS Y ECONOMÍA LOCAL ================= */}
        {activeTab === 'services' && (
          <div>
            <div className="section-header">
              <div>
                <h2 className="section-title">Oportunidades y Servicios Locales</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  Conecta con trabajadores y técnicos de tu propio barrio sin comisiones abusivas.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-primary" onClick={() => setIsServiceModalOpen(true)}>
                  <Plus size={16} /> Ofrecer un Servicio
                </button>
              </div>
            </div>

            {/* Filter Pills & Search */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', minWidth: '260px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="Buscar por oficio, técnico o palabra clave..." 
                  className="form-control"
                  style={{ paddingLeft: '36px' }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button 
                  className={`pill-filter ${selectedCategory === 'all' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('all')}
                >
                  Todas las categorías
                </button>
                {INITIAL_CATEGORIES.map(cat => (
                  <button 
                    key={cat.id} 
                    className={`pill-filter ${selectedCategory === cat.id ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* List of Services */}
            <div className="grid-3">
              {filteredServices.map(srv => (
                <div key={srv.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <span className="badge badge-primary">
                        {INITIAL_CATEGORIES.find(c => c.id === srv.categoryId)?.name || 'Oficio'}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 'bold', color: '#b45309' }}>
                        <Star size={15} fill="#f59e0b" color="#f59e0b" />
                        <span>{srv.rating}</span>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>({srv.reviewCount})</span>
                      </div>
                    </div>

                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px', color: '#1e293b' }}>
                      {srv.title}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '12px', lineHeight: '1.4' }}>
                      {srv.description}
                    </p>

                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      <strong>Proveedor:</strong> {srv.providerName}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                      <MapPin size={14} />
                      <span>{srv.neighborhood} • {srv.coverageArea}</span>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Tarifa estimada</span>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>
                        {srv.priceType === 'fixed' ? `S/ ${srv.priceAmount}` : 'A cotizar'}
                      </span>
                    </div>

                    <button className="btn btn-primary" onClick={() => handleRequestService(srv)}>
                      Solicitar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* User's Bookings & Verifiable Reputation Flow */}
            <div style={{ marginTop: '36px' }}>
              <div className="section-header">
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={20} color="var(--primary)" />
                  Tus Contrataciones y Reputación Verificada
                </h3>
              </div>

              <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                    <tr>
                      <th style={{ padding: '12px 16px' }}>Servicio</th>
                      <th style={{ padding: '12px 16px' }}>Proveedor</th>
                      <th style={{ padding: '12px 16px' }}>Fecha</th>
                      <th style={{ padding: '12px 16px' }}>Estado</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map(b => (
                      <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>{b.serviceTitle}</td>
                        <td style={{ padding: '12px 16px' }}>{b.providerName}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{b.date}</td>
                        <td style={{ padding: '12px 16px' }}>
                          {b.status === 'completado' && <span className="badge badge-success">Completado</span>}
                          {b.status === 'en_proceso' && <span className="badge badge-warning">En proceso</span>}
                          {b.status === 'solicitado' && <span className="badge badge-primary">Solicitado</span>}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          {b.status === 'en_proceso' || b.status === 'solicitado' ? (
                            <button 
                              className="btn btn-outline" 
                              style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                              onClick={() => handleCompleteBooking(b.id)}
                            >
                              <CheckCircle2 size={14} color="#10b981" /> Marcar Realizado
                            </button>
                          ) : !b.hasReview ? (
                            <button 
                              className="btn btn-primary" 
                              style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                              onClick={() => {
                                setSelectedBookingForReview(b);
                                setIsReviewModalOpen(true);
                              }}
                            >
                              <Star size={14} /> Dejar Valoración
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>
                              ✓ Calificado
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: AYUDA SOLIDARIA ================= */}
        {activeTab === 'solidarity' && (
          <div>
            <div className="section-header">
              <div>
                <h2 className="section-title">Cadena de Favores y Solidaridad Vecinal</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  Peticiones no comerciales de asistencia ante emergencias o necesidades comunitarias.
                </p>
              </div>
              <button className="btn btn-primary" onClick={() => setIsHelpModalOpen(true)}>
                <Plus size={16} /> Solicitar Ayuda Mutua
              </button>
            </div>

            <div className="grid-2">
              {helpRequests.map(req => (
                <div key={req.id} className="card" style={{ borderLeft: req.urgency === 'alta' ? '4px solid #ef4444' : '4px solid #f59e0b' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span className={`badge ${req.urgency === 'alta' ? 'badge-danger' : 'badge-warning'}`}>
                        Urgencia {req.urgency.toUpperCase()}
                      </span>
                      <span className="badge badge-primary">
                        Necesidad: {req.type.toUpperCase()}
                      </span>
                      {req.isOfflineCreated && (
                        <span className="badge badge-warning" title="Creado sin conexión a Internet">
                          <Radio size={12} /> Creado Offline
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{req.date}</span>
                  </div>

                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>{req.description}</h3>

                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                    <span>Publicado por <strong>{req.authorName}</strong> en <em>{req.neighborhood}</em></span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                    <span style={{ fontSize: '0.82rem' }}>
                      Estado: <strong>{req.status === 'abierta' ? 'Esperando voluntario' : req.status === 'en_coordinacion' ? `Coordinando con ${req.helperName}` : 'Atendida'}</strong>
                    </span>

                    {req.status === 'abierta' && (
                      <button 
                        className="btn btn-outline" 
                        style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                        onClick={() => {
                          setHelpRequests(helpRequests.map(h => h.id === req.id ? { ...h, status: 'en_coordinacion', helperName: currentUser?.name || 'Tú' } : h));
                          alert('¡Gracias por brindar tu ayuda! Se ha abierto el canal de coordinación.');
                        }}
                      >
                        <HeartHandshake size={14} color="var(--primary)" /> Ofrecer mi apoyo
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 3: TABLÓN COMUNITARIO ================= */}
        {activeTab === 'community' && (
          <div>
            <div className="section-header">
              <div>
                <h2 className="section-title">Anuncios y Alertas Comunitarias</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  Avisos de cortes de suministros, comunicados vecinales y reportes oficiales verificados.
                </p>
              </div>
            </div>

            <div className="grid-2">
              {communityPosts.map(post => (
                <div key={post.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span className={`badge ${post.verificationStatus === 'corroborado' ? 'badge-success' : 'badge-warning'}`}>
                      {post.verificationStatus === 'corroborado' ? '✓ Corroborado por vecinos' : 'Aviso reportado'}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{post.date}</span>
                  </div>

                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '8px', color: '#1e293b' }}>
                    {post.title}
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: '#475569', marginBottom: '12px' }}>
                    {post.body}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span>Emisor: <strong>{post.authorName}</strong> ({post.neighborhood})</span>
                    <button 
                      className="btn btn-outline" 
                      style={{ fontSize: '0.75rem', padding: '4px 8px' }}
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
          </div>
        )}

        {/* ================= TAB 4: MAPA DE COBERTURA ================= */}
        {activeTab === 'map' && (
          <div>
            <div className="section-header">
              <div>
                <h2 className="section-title">Mapa Comunitario de Proximidad</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  Muestra zonas y cobertura aproximada protegiendo la privacidad y domicilio exacto de los vecinos.
                </p>
              </div>
            </div>

            <div className="map-canvas">
              <div style={{ position: 'absolute', top: '16px', left: '16px', background: 'rgba(255,255,255,0.95)', padding: '8px 14px', borderRadius: '8px', fontSize: '0.82rem', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                <strong>Sector:</strong> {selectedNeighborhood} • Cuadrante Seguro
              </div>

              {/* Mock interactive pins */}
              <div className="map-node" style={{ top: '35%', left: '30%' }} onClick={() => alert('Electricista: José Ramírez\nCobertura: Radio 3km\nValoración: 4.9')}>
                <Store size={14} color="var(--primary)" />
                <span>José Ramírez (Electricidad)</span>
              </div>

              <div className="map-node" style={{ top: '60%', left: '55%' }} onClick={() => alert('Gasfitería: Carmen Morales\nCobertura: Sector Central\nValoración: 4.8')}>
                <Store size={14} color="var(--primary)" />
                <span>Carmen Morales (Gasfitería)</span>
              </div>

              <div className="map-node solidarity" style={{ top: '45%', left: '75%' }} onClick={() => alert('Alerta Solidaria: Familia Mendoza necesita agua potable')}>
                <AlertTriangle size={14} color="#ef4444" />
                <span>Urgente: Agua Potable</span>
              </div>

              <div className="map-node" style={{ top: '75%', left: '25%' }} onClick={() => alert('Carpintería: Pedro Quispe\nCobertura: Todo el distrito')}>
                <Store size={14} color="var(--primary)" />
                <span>Pedro Quispe (Melamina)</span>
              </div>

              <div style={{ position: 'absolute', bottom: '16px', right: '16px', background: 'rgba(255,255,255,0.9)', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Simulación cartográfica OpenStreetMap / PostGIS
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 5: CENTRO OFFLINE & STORE-AND-FORWARD ================= */}
        {activeTab === 'offline' && (
          <div>
            <div className="section-header">
              <div>
                <h2 className="section-title">Centro de Conectividad & Protocolo Resiliente (BLE/Mesh)</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  Arquitectura tolerante a desconexiones: almacena en cola local, retransmite por saltos (Store-and-Forward) y sincroniza al volver Internet.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-outline" onClick={handleSyncOnline}>
                  <RefreshCw size={16} /> Sincronizar Cola al Servidor
                </button>
              </div>
            </div>

            <div style={{ background: '#f1f5f9', padding: '16px', borderRadius: 'var(--radius)', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
              <Info size={24} color="var(--primary)" />
              <div style={{ fontSize: '0.85rem', color: '#334155' }}>
                <strong>¿Cómo funciona el diferenciador técnico de Ayni?</strong><br />
                En casos de cortes masivos de red (desastres, fallas de suministro), los mensajes se firman en sobres criptográficos locales. Al cruzarte físicamente con otro vecino que tenga la app con Bluetooth LE activado, los paquetes se intercambian de forma anónima hasta alcanzar un nodo con conexión a Internet.
              </div>
            </div>

            <div className="card">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '14px' }}>
                Cola Local de Retransmisión (Sobres en Espera de Tránsito)
              </h3>

              {offlineQueue.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  <Radio size={36} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.5 }} />
                  No hay paquetes pendientes en la cola local. Todas las solicitudes están sincronizadas con la nube.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {offlineQueue.map(item => (
                    <div key={item.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Sobre #{item.id}</span>
                          <span className={`badge ${item.status === 'sincronizado' ? 'badge-success' : item.status === 'retransmitido' ? 'badge-primary' : 'badge-warning'}`}>
                            {item.status.toUpperCase()}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          <strong>Contenido:</strong> Solicitud de {item.payload.type} - "{item.payload.description.slice(0, 45)}..."
                        </p>
                        <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          Saltos efectuados: <strong>{item.hops}</strong> de máx {item.hopLimit} • Creado: {item.createdAt}
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        {item.status !== 'sincronizado' && (
                          <button 
                            className="btn btn-outline" 
                            style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                            onClick={() => handleSimulateMeshRelay(item.id)}
                            title="Simula que este teléfono transmitió por Bluetooth el paquete a un vecino cercano"
                          >
                            <Radio size={14} /> Simular Salto Bluetooth (+1 Salto)
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ================= MODAL DE INICIO DE SESIÓN / REGISTRO (IDENTIDAD AYNI) ================= */}
      {isAuthModalOpen && (
        <AuthModal 
          onSuccess={(user) => {
            setCurrentUser(user);
            setIsAuthModalOpen(false);
          }}
          onClose={() => setIsAuthModalOpen(false)}
        />
      )}

      {/* ================= MODAL: PUBLICAR SERVICIO ================= */}
      {isServiceModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>Publicar Oferta de Servicio Vecinal</h3>
            <form onSubmit={handleCreateService}>
              <div className="form-group">
                <label>Título del Servicio o Habilidad</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej: Reparación de cerraduras y puertas"
                  className="form-control"
                  value={newService.title}
                  onChange={e => setNewService({ ...newService, title: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Categoría</label>
                <select 
                  className="form-control"
                  value={newService.categoryId}
                  onChange={e => setNewService({ ...newService, categoryId: e.target.value })}
                >
                  {INITIAL_CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Descripción detallada</label>
                <textarea 
                  required
                  rows={3}
                  placeholder="Explica qué incluye, experiencia o herramientas..."
                  className="form-control"
                  value={newService.description}
                  onChange={e => setNewService({ ...newService, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Tipo de Precio</label>
                  <select 
                    className="form-control"
                    value={newService.priceType}
                    onChange={e => setNewService({ ...newService, priceType: e.target.value as any })}
                  >
                    <option value="fixed">Monto fijo (S/)</option>
                    <option value="quote">A cotizar según visita</option>
                  </select>
                </div>

                {newService.priceType === 'fixed' && (
                  <div className="form-group">
                    <label>Precio Base (S/)</label>
                    <input 
                      type="number"
                      min={5}
                      className="form-control"
                      value={newService.priceAmount}
                      onChange={e => setNewService({ ...newService, priceAmount: Number(e.target.value) })}
                    />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Zona de Cobertura Aproximada (sin dirección exacta)</label>
                <input 
                  type="text"
                  placeholder="Ej: Barrio Los Cedros y manzanas adyacentes"
                  className="form-control"
                  value={newService.coverageArea}
                  onChange={e => setNewService({ ...newService, coverageArea: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsServiceModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Publicar Servicio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: SOLICITUD DE AYUDA ================= */}
      {isHelpModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>Solicitud de Ayuda Solidaria</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Para pedidos de auxilio, colaboración no comercial y suministros de emergencia.
            </p>

            <form onSubmit={handleCreateHelp}>
              <div className="form-group">
                <label>Tipo de Recurso Requerido</label>
                <select 
                  className="form-control"
                  value={newHelp.type}
                  onChange={e => setNewHelp({ ...newHelp, type: e.target.value as any })}
                >
                  <option value="agua">Agua potable</option>
                  <option value="alimentos">Alimentos / Raciones</option>
                  <option value="herramientas">Herramientas / Escaleras</option>
                  <option value="transporte">Traslado / Transporte de emergencia</option>
                  <option value="cuidado">Cuidado de adultos mayores o niños</option>
                  <option value="otro">Otro apoyo comunitario</option>
                </select>
              </div>

              <div className="form-group">
                <label>Nivel de Urgencia</label>
                <select 
                  className="form-control"
                  value={newHelp.urgency}
                  onChange={e => setNewHelp({ ...newHelp, urgency: e.target.value as any })}
                >
                  <option value="alta">Alta (Emergencia inmediata)</option>
                  <option value="media">Media (Dentro del día)</option>
                  <option value="baja">Baja (Sin urgencia crítica)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Descripción de lo que necesitas</label>
                <textarea 
                  required
                  rows={3}
                  placeholder="Detalla de forma breve y clara lo requerido para que un vecino pueda coordinar contigo..."
                  className="form-control"
                  value={newHelp.description}
                  onChange={e => setNewHelp({ ...newHelp, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsHelpModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {isOnline ? 'Publicar Solicitud' : 'Guardar en Cola Offline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: VALORACIÓN VERIFICADA ================= */}
      {isReviewModalOpen && selectedBookingForReview && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>
              Valoración Verificada de Servicio
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Estás evaluando a <strong>{selectedBookingForReview.providerName}</strong> por el servicio <em>{selectedBookingForReview.serviceTitle}</em>.
            </p>

            <form onSubmit={handleSubmitReview}>
              <div className="form-group">
                <label>Puntuación (1 a 5 estrellas)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[1, 2, 3, 4, 5].map(val => (
                    <button 
                      key={val} 
                      type="button"
                      onClick={() => setReviewForm({ ...reviewForm, rating: val })}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                    >
                      <Star 
                        size={28} 
                        fill={val <= reviewForm.rating ? '#f59e0b' : 'none'} 
                        color="#f59e0b" 
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Comentario y opinión para la comunidad</label>
                <textarea 
                  required
                  rows={3}
                  placeholder="¿Cómo fue la atención, puntualidad y cumplimiento del técnico?"
                  className="form-control"
                  value={reviewForm.comment}
                  onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsReviewModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirmar y Publicar Reseña
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
