import React, { useState } from 'react';
import {
  Users, HeartHandshake, ShieldCheck, Megaphone,
  MessageCircle, Wrench, CheckCircle2, Clock,
  MapPin, Radio, ArrowRight, ArrowLeft, Check,
  Navigation, Circle, ThumbsUp, X
} from 'lucide-react';

interface InteractiveTutorialProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function InteractiveTutorial({ onComplete, onSkip }: InteractiveTutorialProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;

  // Estados interactivos para cada paso
  // Paso 1: Rol de participación
  const [selectedRole, setSelectedRole] = useState<'client' | 'provider' | 'both' | null>('both');

  // Paso 2: Aviso simulado
  const [corroborated, setCorroborated] = useState(false);
  const [corroborationsCount, setCorroborationsCount] = useState(12);
  const [showSimulatedChat, setShowSimulatedChat] = useState(false);

  // Paso 3: Tarifa simulada
  const [tutorialPriceType, setTutorialPriceType] = useState<'fixed' | 'quote'>('fixed');

  // Paso 4: Pedido interactivo
  const [orderActionStatus, setOrderActionStatus] = useState<'pending' | 'accepted' | 'rejected'>('pending');

  // Paso 5: Radio de mapa interactivo
  const [selectedRadius, setSelectedRadius] = useState<'1' | '2' | '5'>('2');
  const [isOfflineSimulated, setIsOfflineSimulated] = useState(false);

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <div className="tutorial-overlay">
      <div className="tutorial-container">
        {/* Cabecera del tutorial */}
        <div className="tutorial-top-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 900, color: 'var(--coral)', fontSize: '1.05rem', letterSpacing: '-0.5px' }}>
              ayni
            </span>
            <span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 700 }}>
              · Tutorial guiado
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="tutorial-step-pill">
              {currentStep} de {totalSteps}
            </span>
            <button
              type="button"
              className="tutorial-skip-btn"
              onClick={onSkip}
              aria-label="Saltar tutorial"
            >
              Omitir
            </button>
          </div>
        </div>

        {/* Barra de progreso de pasos */}
        <div className="tutorial-progress-track">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`tutorial-progress-seg ${i + 1 <= currentStep ? 'active' : ''}`}
            />
          ))}
        </div>

        {/* Contenido interactivo según el paso actual */}
        <div className="tutorial-content-scroll">
          {/* PASO 1: Identidad y Reciprocidad */}
          {currentStep === 1 && (
            <div className="tutorial-step-view">
              <div className="tutorial-icon-circle" style={{ background: '#FEE2E2', color: 'var(--coral)' }}>
                <HeartHandshake size={28} />
              </div>

              <h2 className="tutorial-title">Bienvenido a Ayni</h2>
              <p className="tutorial-tagline">“Hoy por ti, mañana por mí”</p>
              <p className="tutorial-desc">
                Ayni es la red vecinal diseñada para fortalecer la confianza comunitaria y resolver necesidades del día a día directamente entre vecinos.
              </p>

              {/* Elemento Interactivo 1 */}
              <div className="tutorial-interactive-box">
                <span className="tutorial-box-label">Prueba interactiva · Elige cómo participarás:</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  <button
                    type="button"
                    className={`tutorial-choice-btn ${selectedRole === 'client' ? 'active' : ''}`}
                    onClick={() => setSelectedRole('client')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Users size={16} color="var(--coral)" />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.84rem' }}>Busco oficios y servicios</div>
                        <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>Electricidad, gasfitería, reparaciones</div>
                      </div>
                    </div>
                    {selectedRole === 'client' ? <CheckCircle2 size={16} color="var(--coral)" /> : <Circle size={16} color="#D1D5DB" />}
                  </button>

                  <button
                    type="button"
                    className={`tutorial-choice-btn ${selectedRole === 'provider' ? 'active' : ''}`}
                    onClick={() => setSelectedRole('provider')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Wrench size={16} color="var(--coral)" />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.84rem' }}>Ofrezco mis servicios u oficios</div>
                        <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>Publico mis habilidades para mi barrio</div>
                      </div>
                    </div>
                    {selectedRole === 'provider' ? <CheckCircle2 size={16} color="var(--coral)" /> : <Circle size={16} color="#D1D5DB" />}
                  </button>

                  <button
                    type="button"
                    className={`tutorial-choice-btn ${selectedRole === 'both' ? 'active' : ''}`}
                    onClick={() => setSelectedRole('both')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ShieldCheck size={16} color="var(--coral)" />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.84rem' }}>Ambos (Vecino activo)</div>
                        <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>Contrato y también ofrezco apoyo vecinal</div>
                      </div>
                    </div>
                    {selectedRole === 'both' ? <CheckCircle2 size={16} color="var(--coral)" /> : <Circle size={16} color="#D1D5DB" />}
                  </button>
                </div>

                <div className="tutorial-feedback-chip">
                  <Check size={13} color="#059669" />
                  <span>
                    {selectedRole === 'client' && 'Podrás solicitar servicios rápidos y dar seguimiento en vivo.'}
                    {selectedRole === 'provider' && 'Podrás revisar pedidos de vecinos y aceptar encargos.'}
                    {selectedRole === 'both' && 'Tendrás acceso integral a solicitar y ofrecer servicios vecinales.'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* PASO 2: Avisos y Chat Vecinal */}
          {currentStep === 2 && (
            <div className="tutorial-step-view">
              <div className="tutorial-icon-circle" style={{ background: '#FEF3C7', color: '#D97706' }}>
                <Megaphone size={28} />
              </div>

              <h2 className="tutorial-title">Avisos y Chat Vecinal</h2>
              <p className="tutorial-tagline">Información verificada en tiempo real</p>
              <p className="tutorial-desc">
                Cortes de agua, avisos de seguridad y faenas vecinales. Los vecinos corroboran la información y coordinan en chats comunitarios dedicados.
              </p>

              {/* Elemento Interactivo 2 */}
              <div className="tutorial-interactive-box">
                <span className="tutorial-box-label">Prueba interactiva · Simulación de aviso vecinal:</span>

                <div className="tutorial-card-preview">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#D97706', fontWeight: 800, textTransform: 'uppercase' }}>
                        Corte de agua imprevisto
                      </span>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--carbon)', margin: '2px 0' }}>
                        Sector 4 / Sedapal confirma cisterna
                      </h4>
                    </div>
                    <span style={{ fontSize: '0.72rem', background: '#E0F2FE', color: '#0369A1', padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>
                      En curso
                    </span>
                  </div>

                  <p style={{ fontSize: '0.78rem', color: '#4B5563', margin: '6px 0 10px 0' }}>
                    Cisterna pasará frente al parque principal a las 5:00 PM. Máximo 3 baldes por familia.
                  </p>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      type="button"
                      className={`btn ${corroborated ? 'btn-coral' : 'btn-outline'}`}
                      style={{ fontSize: '0.75rem', padding: '6px 12px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                      onClick={() => {
                        if (!corroborated) {
                          setCorroborated(true);
                          setCorroborationsCount(prev => prev + 1);
                        } else {
                          setCorroborated(false);
                          setCorroborationsCount(prev => prev - 1);
                        }
                      }}
                    >
                      <ThumbsUp size={13} />
                      {corroborated ? 'Corroborado por ti' : 'Corroborar'} ({corroborationsCount})
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ fontSize: '0.75rem', padding: '6px 12px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                      onClick={() => setShowSimulatedChat(!showSimulatedChat)}
                    >
                      <MessageCircle size={13} color="var(--coral)" />
                      {showSimulatedChat ? 'Ocultar chat' : 'Ver chat vecinal'}
                    </button>
                  </div>

                  {showSimulatedChat && (
                    <div style={{ marginTop: 10, padding: '8px 10px', background: '#F9FAFB', borderRadius: 8, border: '1px solid var(--gray-200)', fontSize: '0.74rem' }}>
                      <div style={{ color: 'var(--coral)', fontWeight: 700, marginBottom: 2 }}>Junta Vecinal Mz F:</div>
                      <div style={{ color: '#374151' }}>Vecinos, recuerden tener listos sus baldes limpios antes de las 5:00 PM.</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PASO 3: Oficios Locales y Modalidad de Cobro */}
          {currentStep === 3 && (
            <div className="tutorial-step-view">
              <div className="tutorial-icon-circle" style={{ background: '#E0E7FF', color: '#4338CA' }}>
                <Wrench size={28} />
              </div>

              <h2 className="tutorial-title">Oficios y Servicios Vecinales</h2>
              <p className="tutorial-tagline">Tarifas claras sin sorpresas</p>
              <p className="tutorial-desc">
                Contrata gasfiteros, electricistas y carpinteros de tu propio sector. Cada servicio cuenta con dos modalidades transparentes de cobro:
              </p>

              {/* Elemento Interactivo 3 */}
              <div className="tutorial-interactive-box">
                <span className="tutorial-box-label">Prueba interactiva · Toca una modalidad para ver su funcionamiento:</span>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8, marginBottom: 12 }}>
                  <button
                    type="button"
                    className={`tutorial-choice-btn ${tutorialPriceType === 'fixed' ? 'active' : ''}`}
                    onClick={() => setTutorialPriceType('fixed')}
                    style={{ padding: '10px 8px' }}
                  >
                    <div style={{ fontWeight: 800, fontSize: '0.8rem', color: tutorialPriceType === 'fixed' ? 'var(--coral)' : 'var(--carbon)' }}>
                      Precio fijo
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#6B7280' }}>Tarifa cerrada o por hora</div>
                  </button>

                  <button
                    type="button"
                    className={`tutorial-choice-btn ${tutorialPriceType === 'quote' ? 'active' : ''}`}
                    onClick={() => setTutorialPriceType('quote')}
                    style={{ padding: '10px 8px' }}
                  >
                    <div style={{ fontWeight: 800, fontSize: '0.8rem', color: tutorialPriceType === 'quote' ? 'var(--coral)' : 'var(--carbon)' }}>
                      A cotizar en el lugar
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#6B7280' }}>Tras visita previa</div>
                  </button>
                </div>

                <div className="tutorial-card-preview" style={{ background: tutorialPriceType === 'quote' ? '#F0FDF4' : '#FFF7ED', borderColor: tutorialPriceType === 'quote' ? '#BBF7D0' : '#FFEDD5' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--carbon)' }}>
                      {tutorialPriceType === 'fixed' ? 'Gasfitería Express' : 'Instalación y Detección de Fugas'}
                    </span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: tutorialPriceType === 'quote' ? '#166534' : 'var(--coral)' }}>
                      {tutorialPriceType === 'fixed' ? 'S/ 35.00 / hora' : 'A cotizar en el lugar'}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.74rem', color: tutorialPriceType === 'quote' ? '#15803D' : '#C2410C', marginTop: 4, margin: '4px 0 0' }}>
                    {tutorialPriceType === 'fixed'
                      ? 'Tarifa fijada de antemano para trabajos de duración estándar.'
                      : 'El profesional se acerca primero al domicilio para evaluar la labor y acordar el monto final.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* PASO 4: Pedidos Recibidos y Seguimiento */}
          {currentStep === 4 && (
            <div className="tutorial-step-view">
              <div className="tutorial-icon-circle" style={{ background: '#DCFCE7', color: '#15803D' }}>
                <Clock size={28} />
              </div>

              <h2 className="tutorial-title">Seguimiento y Pedidos</h2>
              <p className="tutorial-tagline">Gestión de encargos en tiempo real</p>
              <p className="tutorial-desc">
                Sigue el trayecto del profesional cuando va hacia tu domicilio. Y en tu pestaña <strong>Pedidos recibidos</strong>, puedes aceptar o rechazar solicitudes de tus vecinos.
              </p>

              {/* Elemento Interactivo 4 */}
              <div className="tutorial-interactive-box">
                <span className="tutorial-box-label">Prueba interactiva · Simula responder a un pedido recibido:</span>

                <div className="tutorial-card-preview">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--carbon)' }}>
                      Rosa Meléndez (Vecina)
                    </div>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 6,
                      background: orderActionStatus === 'accepted' ? '#E8F8F0' : orderActionStatus === 'rejected' ? '#FEE2E2' : '#FEF3C7',
                      color: orderActionStatus === 'accepted' ? '#059669' : orderActionStatus === 'rejected' ? '#DC2626' : '#B45309'
                    }}>
                      {orderActionStatus === 'accepted' ? 'En camino' : orderActionStatus === 'rejected' ? 'Rechazado' : 'Por aceptar'}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.76rem', color: '#4B5563', margin: '4px 0 10px 0' }}>
                    "Tengo una fuga debajo del lavadero en Pasaje Sol. ¿Puedes venir hoy?"
                  </p>

                  {orderActionStatus === 'pending' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <button
                        type="button"
                        className="btn-accept"
                        style={{ padding: '8px', fontSize: '0.78rem' }}
                        onClick={() => setOrderActionStatus('accepted')}
                      >
                        <Check size={14} /> Aceptar encargo
                      </button>
                      <button
                        type="button"
                        className="btn-reject"
                        style={{ padding: '8px', fontSize: '0.78rem' }}
                        onClick={() => setOrderActionStatus('rejected')}
                      >
                        <X size={14} /> Rechazar
                      </button>
                    </div>
                  )}

                  {orderActionStatus === 'accepted' && (
                    <div style={{ background: '#E8F8F0', padding: '8px 10px', borderRadius: 8, fontSize: '0.75rem', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle2 size={15} />
                      ¡Encargo aceptado! Has notificado al cliente que estás en camino.
                    </div>
                  )}

                  {orderActionStatus === 'rejected' && (
                    <div style={{ background: '#FEE2E2', padding: '8px 10px', borderRadius: 8, fontSize: '0.75rem', color: '#DC2626', fontWeight: 600 }}>
                      Encargo rechazado cordialmente. Se archivará en tu historial.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PASO 5: Mapa GPS y Modo Resiliencia Offline */}
          {currentStep === 5 && (
            <div className="tutorial-step-view">
              <div className="tutorial-icon-circle" style={{ background: '#FEE2E2', color: 'var(--coral)' }}>
                <MapPin size={28} />
              </div>

              <h2 className="tutorial-title">Mapa en Vivo y Resiliencia</h2>
              <p className="tutorial-tagline">Siempre conectados, incluso sin Internet</p>
              <p className="tutorial-desc">
                Filtra servicios y alertas por radio de cercanía con tu GPS real. Y ante caídas de luz o señal, el protocolo offline BLE Mesh mantiene comunicada a la comunidad.
              </p>

              {/* Elemento Interactivo 5 */}
              <div className="tutorial-interactive-box">
                <span className="tutorial-box-label">Prueba interactiva · Ajusta el radio de cobertura:</span>

                <div style={{ display: 'flex', gap: 8, margin: '8px 0 12px 0' }}>
                  {(['1', '2', '5'] as const).map(rad => (
                    <button
                      key={rad}
                      type="button"
                      className={`tutorial-radius-btn ${selectedRadius === rad ? 'active' : ''}`}
                      onClick={() => setSelectedRadius(rad)}
                    >
                      <Navigation size={12} />
                      Radio {rad} km
                    </button>
                  ))}
                </div>

                <div className="tutorial-card-preview" style={{ textAlign: 'center', padding: '14px 10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6 }}>
                    <Radio size={16} color={isOfflineSimulated ? '#F59E0B' : '#059669'} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--carbon)' }}>
                      {isOfflineSimulated ? 'Modo Offline BLE Mesh Activo' : 'Red Vecinal Online Sincronizada'}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.74rem', color: '#6B7280', margin: '0 0 10px 0' }}>
                    Mostrando servicios en un radio de <strong>{selectedRadius} km</strong> a la redonda de tu posición.
                  </p>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ fontSize: '0.74rem', padding: '6px 14px', borderRadius: 20 }}
                    onClick={() => setIsOfflineSimulated(!isOfflineSimulated)}
                  >
                    {isOfflineSimulated ? 'Volver a modo Online' : 'Simular emergencia sin conexión'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Barra de navegación inferior del tutorial */}
        <div className="tutorial-footer">
          {currentStep > 1 ? (
            <button
              type="button"
              className="btn btn-outline tutorial-nav-btn"
              onClick={handlePrev}
            >
              <ArrowLeft size={16} /> Atrás
            </button>
          ) : (
            <div style={{ width: 80 }} />
          )}

          <button
            type="button"
            className="btn btn-coral tutorial-next-btn"
            onClick={handleNext}
          >
            {currentStep < totalSteps ? (
              <>Siguiente <ArrowRight size={16} /></>
            ) : (
              <>¡Comenzar a usar Ayni! <Check size={16} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
