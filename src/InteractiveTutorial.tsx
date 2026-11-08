import React, { useState } from 'react';
import {
  HeartHandshake, HandHeart, ShieldCheck, Megaphone,
  MessageCircle, Wrench, CheckCircle2, Clock,
  MapPin, Radio, ArrowRight, ArrowLeft, Check,
  Navigation, Circle, ThumbsUp, X, Users, Store,
  Sparkles, Droplet, Hammer, AlertTriangle, WifiOff, Phone
} from 'lucide-react';

interface InteractiveTutorialProps {
  onComplete: () => void;
  onSkip: () => void;
  isDarkMode?: boolean;
}

export function InteractiveTutorial({ onComplete, onSkip, isDarkMode = false }: InteractiveTutorialProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 6;

  // Estados interactivos para cada paso
  // Paso 1: Exploración de los 3 pilares
  const [activePillar, setActivePillar] = useState<'solidaridad' | 'alertas' | 'oficios'>('solidaridad');

  // Paso 2: Ayuda solidaria gratuita simulada
  const [helpedStatus, setHelpedStatus] = useState(false);

  // Paso 3: Aviso vecinal simulado
  const [corroborated, setCorroborated] = useState(false);
  const [corroborationsCount, setCorroborationsCount] = useState(12);
  const [showSimulatedChat, setShowSimulatedChat] = useState(false);

  // Paso 4: Faena comunal simulada
  const [joinedActivity, setJoinedActivity] = useState(false);
  const [participantsCount, setParticipantsCount] = useState(18);

  // Paso 5: El adicional (oficios con precio fijo o a cotizar en el lugar)
  const [tutorialPriceType, setTutorialPriceType] = useState<'fixed' | 'quote'>('fixed');

  // Paso 6: Resiliencia Offline exclusiva para Pedir Ayuda
  const [offlineHelpBroadcasted, setOfflineHelpBroadcasted] = useState(false);

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
            <span style={{ fontWeight: 900, color: 'var(--coral)', fontSize: '1.15rem', letterSpacing: '-0.5px' }}>
              ayni
            </span>
            <span style={{ fontSize: '0.75rem', color: isDarkMode ? '#94A3B8' : '#6B7280', fontWeight: 700 }}>
              · Red Vecinal Solidaria
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="tutorial-step-pill">
              Paso {currentStep} de {totalSteps}
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
          {/* PASO 1: Identidad comunitaria y Pilares de Ayni */}
          {currentStep === 1 && (
            <div className="tutorial-step-view">
              <div className="tutorial-icon-circle" style={{ background: isDarkMode ? 'rgba(255, 90, 95, 0.16)' : '#FFF1F2', color: 'var(--coral)' }}>
                <HeartHandshake size={32} />
              </div>

              <h2 className="tutorial-title">Bienvenido a Ayni</h2>
              <p className="tutorial-tagline">“Hoy por ti, mañana por mí”</p>
              <p className="tutorial-desc">
                Ayni <strong>no es una bolsa de trabajo</strong>. Es una red de <strong>apoyo mutuo vecinal y solidaridad barrial</strong> para cuidarnos entre vecinos, donde el adicional es ofrecer y contratar oficios de confianza.
              </p>

              {/* Elemento Interactivo 1: Tocar los 3 pilares */}
              <div className="tutorial-interactive-box">
                <span className="tutorial-box-label">Toca un pilar para explorar cómo funciona:</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                  <button
                    type="button"
                    className={`tutorial-choice-btn ${activePillar === 'solidaridad' ? 'active' : ''}`}
                    onClick={() => setActivePillar('solidaridad')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="tutorial-mini-icon" style={{ background: isDarkMode ? 'rgba(34, 197, 94, 0.18)' : '#ECFDF5', color: isDarkMode ? '#4ADE80' : '#059669' }}>
                        <HandHeart size={18} />
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <div className="tutorial-choice-title">1. Apoyo Solidario Gratuito</div>
                        <div className="tutorial-choice-sub">Agua potable, préstamo de herramientas, ayuda a adultos mayores</div>
                      </div>
                    </div>
                    {activePillar === 'solidaridad' ? <CheckCircle2 size={18} color="var(--coral)" /> : <Circle size={18} color={isDarkMode ? '#475569' : '#D1D5DB'} />}
                  </button>

                  <button
                    type="button"
                    className={`tutorial-choice-btn ${activePillar === 'alertas' ? 'active' : ''}`}
                    onClick={() => setActivePillar('alertas')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="tutorial-mini-icon" style={{ background: isDarkMode ? 'rgba(245, 158, 11, 0.18)' : '#FFFBEB', color: isDarkMode ? '#FCD34D' : '#D97706' }}>
                        <ShieldCheck size={18} />
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <div className="tutorial-choice-title">2. Alertas y Seguridad Barrial</div>
                        <div className="tutorial-choice-sub">Cortes de servicios y chat vecinal verificado en tiempo real</div>
                      </div>
                    </div>
                    {activePillar === 'alertas' ? <CheckCircle2 size={18} color="var(--coral)" /> : <Circle size={18} color={isDarkMode ? '#475569' : '#D1D5DB'} />}
                  </button>

                  <button
                    type="button"
                    className={`tutorial-choice-btn ${activePillar === 'oficios' ? 'active' : ''}`}
                    onClick={() => setActivePillar('oficios')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="tutorial-mini-icon" style={{ background: isDarkMode ? 'rgba(99, 102, 241, 0.18)' : '#EEF2FF', color: isDarkMode ? '#818CF8' : '#4F46E5' }}>
                        <Store size={18} />
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <div className="tutorial-choice-title">3. El Adicional: Oficios Vecinales</div>
                        <div className="tutorial-choice-sub">Contratar al técnico de tu cuadra a precio fijo o a cotizar en el lugar</div>
                      </div>
                    </div>
                    {activePillar === 'oficios' ? <CheckCircle2 size={18} color="var(--coral)" /> : <Circle size={18} color={isDarkMode ? '#475569' : '#D1D5DB'} />}
                  </button>
                </div>

                <div className="tutorial-feedback-chip" style={{
                  background: isDarkMode ? 'rgba(34, 197, 94, 0.16)' : '#ECFDF5',
                  border: `1px solid ${isDarkMode ? 'rgba(34, 197, 94, 0.4)' : '#A7F3D0'}`,
                  color: isDarkMode ? '#86EFAC' : '#065F46'
                }}>
                  <Check size={14} color={isDarkMode ? '#4ADE80' : '#059669'} />
                  <span>
                    {activePillar === 'solidaridad' && 'La solidaridad es 100% gratuita: pedir o dar una mano solidaria sin dinero de por medio.'}
                    {activePillar === 'alertas' && 'Los vecinos corroboran la información para evitar falsas alarmas y coordinar soluciones.'}
                    {activePillar === 'oficios' && 'Economía circular: apoyas los ingresos del electricista o gasfitero de tu propio barrio.'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* PASO 2: Ayuda Solidaria Mutua (100% Gratuita) */}
          {currentStep === 2 && (
            <div className="tutorial-step-view">
              <div className="tutorial-icon-circle" style={{ background: isDarkMode ? 'rgba(34, 197, 94, 0.18)' : '#ECFDF5', color: isDarkMode ? '#4ADE80' : '#059669' }}>
                <HandHeart size={32} />
              </div>

              <h2 className="tutorial-title">Apoyo Solidario Gratuito</h2>
              <p className="tutorial-tagline">Colaboración barrial sin costo monetario</p>
              <p className="tutorial-desc">
                ¿Te cortaron el agua y necesitas bidones? ¿Requieres una escalera telescópica prestada por unas horas? Pide ayuda solidaria o responde a un vecino en necesidad.
              </p>

              {/* Elemento Interactivo 2 */}
              <div className="tutorial-interactive-box">
                <span className="tutorial-box-label">Prueba interactiva · Pedido solidario en tu barrio:</span>

                <div className="tutorial-card-preview">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: isDarkMode ? '#4ADE80' : '#059669', fontWeight: 800, textTransform: 'uppercase' }}>
                        Auxilio Vecinal · 100% Gratuito
                      </span>
                      <h4 style={{ fontSize: '1.02rem', fontWeight: 800, color: isDarkMode ? '#F8FAFC' : '#0F172A', margin: '2px 0', lineHeight: 1.3 }}>
                        Adulto mayor necesita 2 bidones de agua
                      </h4>
                      <div style={{ fontSize: '0.78rem', color: isDarkMode ? '#94A3B8' : '#64748B', fontWeight: 600 }}>
                        Familia Mendoza · Sector Central
                      </div>
                    </div>
                    <span style={{ fontSize: '0.72rem', background: isDarkMode ? 'rgba(239, 68, 68, 0.18)' : '#FEF2F2', color: isDarkMode ? '#FCA5A5' : '#991B1B', border: `1px solid ${isDarkMode ? 'rgba(239, 68, 68, 0.4)' : '#FECACA'}`, padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>
                      Urgente
                    </span>
                  </div>

                  <p style={{ fontSize: '0.86rem', color: isDarkMode ? '#CBD5E1' : '#334155', margin: '8px 0 12px 0', lineHeight: 1.5 }}>
                    "Mi mamá tiene 78 años y no puede cargar los bidones desde la pista por corte de Sedapal. Agradecemos cualquier mano solidaria."
                  </p>

                  {!helpedStatus ? (
                    <button
                      type="button"
                      className="btn btn-coral btn-block"
                      style={{ fontSize: '0.8rem', padding: '9px 14px', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      onClick={() => setHelpedStatus(true)}
                    >
                      <HandHeart size={15} /> Ofrecer mi ayuda solidaria
                    </button>
                  ) : (
                    <div style={{ background: isDarkMode ? 'rgba(34, 197, 94, 0.16)' : '#ECFDF5', border: `1px solid ${isDarkMode ? 'rgba(34, 197, 94, 0.4)' : '#A7F3D0'}`, padding: '10px 12px', borderRadius: 10, color: isDarkMode ? '#86EFAC' : '#065F46', fontSize: '0.76rem', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <CheckCircle2 size={16} color={isDarkMode ? '#4ADE80' : '#059669'} style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <strong>¡Gracias por tu apoyo solidario!</strong> Te has conectado con la Familia Mendoza y se habilitó el chat vecinal para coordinar la entrega.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PASO 3: Alertas Vecinales y Chat Comunitario */}
          {currentStep === 3 && (
            <div className="tutorial-step-view">
              <div className="tutorial-icon-circle" style={{ background: isDarkMode ? 'rgba(245, 158, 11, 0.18)' : '#FEF3C7', color: isDarkMode ? '#FCD34D' : '#D97706' }}>
                <Megaphone size={32} />
              </div>

              <h2 className="tutorial-title">Avisos y Coordinación en Vivo</h2>
              <p className="tutorial-tagline">Información corroborada directamente por vecinos</p>
              <p className="tutorial-desc">
                Cortes de servicios públicos, fallas de alumbrado o temas de seguridad. Cada aviso es corroborado por la comunidad y tiene su propio chat vecinal para coordinar.
              </p>

              {/* Elemento Interactivo 3 */}
              <div className="tutorial-interactive-box">
                <span className="tutorial-box-label">Prueba interactiva · Corrobora y abre el chat:</span>

                <div className="tutorial-card-preview">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: isDarkMode ? '#FCD34D' : '#D97706', fontWeight: 800, textTransform: 'uppercase' }}>
                        Aviso de Servicio
                      </span>
                      <h4 style={{ fontSize: '1.02rem', fontWeight: 800, color: isDarkMode ? '#F8FAFC' : '#0F172A', margin: '2px 0', lineHeight: 1.3 }}>
                        Corte imprevisto de agua en Sector 4
                      </h4>
                      <div style={{ fontSize: '0.78rem', color: isDarkMode ? '#94A3B8' : '#64748B', fontWeight: 600 }}>
                        Junta Vecinal Manzana F · Sector Central
                      </div>
                    </div>
                    <span style={{ fontSize: '0.72rem', background: isDarkMode ? 'rgba(59, 130, 246, 0.18)' : '#EFF6FF', color: isDarkMode ? '#93C5FD' : '#1E40AF', border: `1px solid ${isDarkMode ? 'rgba(59, 130, 246, 0.4)' : '#BFDBFE'}`, padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                      Vigente
                    </span>
                  </div>

                  <p style={{ fontSize: '0.86rem', color: isDarkMode ? '#CBD5E1' : '#334155', margin: '6px 0 10px 0', lineHeight: 1.5 }}>
                    Sedapal confirmó que la cisterna llegará al parque principal a las 5:00 PM. Máximo 3 baldes por familia.
                  </p>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      type="button"
                      className={`btn ${corroborated ? 'btn-coral' : 'btn-outline'}`}
                      style={{ fontSize: '0.75rem', padding: '7px 12px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 5 }}
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
                      style={{ fontSize: '0.75rem', padding: '7px 12px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                      onClick={() => setShowSimulatedChat(!showSimulatedChat)}
                    >
                      <MessageCircle size={13} color="var(--coral)" />
                      {showSimulatedChat ? 'Ocultar chat' : 'Ver chat vecinal'}
                    </button>
                  </div>

                  {showSimulatedChat && (
                    <div style={{ marginTop: 10, padding: '10px', background: isDarkMode ? '#111827' : '#F9FAFB', borderRadius: 8, border: `1px solid ${isDarkMode ? '#233044' : 'var(--gray-200)'}`, fontSize: '0.76rem' }}>
                      <div style={{ color: 'var(--coral)', fontWeight: 700, marginBottom: 2 }}>Junta Vecinal Mz F:</div>
                      <div style={{ color: isDarkMode ? '#E2E8F0' : '#1F2937' }}>"Vecinos, lleven baldes limpios y respeten el turno para los adultos mayores."</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PASO 4: Faenas y Actividades Colectivas */}
          {currentStep === 4 && (
            <div className="tutorial-step-view">
              <div className="tutorial-icon-circle" style={{ background: isDarkMode ? 'rgba(59, 130, 246, 0.18)' : '#EFF6FF', color: isDarkMode ? '#60A5FA' : '#1D4ED8' }}>
                <Users size={32} />
              </div>

              <h2 className="tutorial-title">Faenas y Trabajo Colectivo</h2>
              <p className="tutorial-tagline">Mejorando el barrio entre todos</p>
              <p className="tutorial-desc">
                En Ayni se organizan faenas comunales, jornadas de limpieza de áreas verdes, ollas comunes y comités barriales. Todos colaboran por el bienestar de su entorno.
              </p>

              {/* Elemento Interactivo 4 */}
              <div className="tutorial-interactive-box">
                <span className="tutorial-box-label">Prueba interactiva · Convocatoria comunal:</span>

                <div className="tutorial-card-preview">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: isDarkMode ? '#93C5FD' : '#1D4ED8', fontWeight: 800, textTransform: 'uppercase' }}>
                        Convocatoria abierta
                      </span>
                      <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: isDarkMode ? '#F8FAFC' : '#111827', margin: '2px 0' }}>
                        Faena: Limpieza y Mantenimiento de Parque
                      </h4>
                      <div style={{ fontSize: '0.74rem', color: isDarkMode ? '#94A3B8' : '#6B7280' }}>
                        Comité Vecinal Sector 3 · Este Sábado 8:00 AM
                      </div>
                    </div>
                    <span style={{ fontSize: '0.72rem', background: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE', color: isDarkMode ? '#93C5FD' : '#1E40AF', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                      Faena
                    </span>
                  </div>

                  <p style={{ fontSize: '0.78rem', color: isDarkMode ? '#CBD5E1' : '#374151', margin: '8px 0 10px 0', lineHeight: 1.4 }}>
                    Traer escobas, bolsas y palas. La municipalidad aportará plantones y pintura para las bancas del parque.
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: isDarkMode ? '#CBD5E1' : '#4B5563' }}>
                      {participantsCount} vecinos participando
                    </span>

                    <button
                      type="button"
                      className={`btn ${joinedActivity ? 'btn-coral' : 'btn-outline'}`}
                      style={{ fontSize: '0.78rem', padding: '7px 14px', borderRadius: 8 }}
                      onClick={() => {
                        if (!joinedActivity) {
                          setJoinedActivity(true);
                          setParticipantsCount(prev => prev + 1);
                        } else {
                          setJoinedActivity(false);
                          setParticipantsCount(prev => prev - 1);
                        }
                      }}
                    >
                      {joinedActivity ? '¡Inscrito en la faena!' : 'Sumarme a la faena'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PASO 5: El Adicional: Oficios Vecinales de Confianza (SIN PARTE OFFLINE) */}
          {currentStep === 5 && (
            <div className="tutorial-step-view">
              <div className="tutorial-icon-circle" style={{ background: isDarkMode ? 'rgba(255, 90, 95, 0.16)' : '#FFF1F2', color: 'var(--coral)' }}>
                <Store size={32} />
              </div>

              <h2 className="tutorial-title">Oficios Vecinales de Confianza</h2>
              <p className="tutorial-tagline">El complemento económico para técnicos de tu barrio</p>
              <p className="tutorial-desc">
                Como <strong>adicional a la ayuda solidaria</strong>, si requieres un trabajo técnico especializado puedes contratar a vecinos de confianza con total transparencia en el cobro:
              </p>

              {/* Elemento Interactivo 5 */}
              <div className="tutorial-interactive-box">
                <span className="tutorial-box-label">Prueba interactiva · Dos modalidades de cobro vecinal:</span>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8, marginBottom: 10 }}>
                  <button
                    type="button"
                    className={`tutorial-choice-btn ${tutorialPriceType === 'fixed' ? 'active' : ''}`}
                    onClick={() => setTutorialPriceType('fixed')}
                    style={{ padding: '8px 10px' }}
                  >
                    <div>
                      <div className="tutorial-choice-title">Precio fijo</div>
                      <div className="tutorial-choice-sub">Tarifa en Soles por hora</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`tutorial-choice-btn ${tutorialPriceType === 'quote' ? 'active' : ''}`}
                    onClick={() => setTutorialPriceType('quote')}
                    style={{ padding: '8px 10px' }}
                  >
                    <div>
                      <div className="tutorial-choice-title">A cotizar en el lugar</div>
                      <div className="tutorial-choice-sub">Tras revisión previa</div>
                    </div>
                  </button>
                </div>

                <div className="tutorial-card-preview" style={{
                  background: tutorialPriceType === 'quote'
                    ? (isDarkMode ? 'rgba(34, 197, 94, 0.12)' : '#F0FDF4')
                    : (isDarkMode ? 'rgba(245, 158, 11, 0.12)' : '#FFF7ED'),
                  borderColor: tutorialPriceType === 'quote'
                    ? (isDarkMode ? 'rgba(34, 197, 94, 0.35)' : '#BBF7D0')
                    : (isDarkMode ? 'rgba(245, 158, 11, 0.35)' : '#FFEDD5')
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: isDarkMode ? '#F8FAFC' : '#111827' }}>
                      {tutorialPriceType === 'fixed' ? 'Electricista de Emergencia' : 'Gasfitería y Fugas Complejas'}
                    </span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: tutorialPriceType === 'quote' ? (isDarkMode ? '#86EFAC' : '#166534') : 'var(--coral)' }}>
                      {tutorialPriceType === 'fixed' ? 'S/ 45.00 / hora' : 'A cotizar en el lugar'}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.74rem', color: tutorialPriceType === 'quote' ? (isDarkMode ? '#86EFAC' : '#15803D') : (isDarkMode ? '#FCD34D' : '#C2410C'), margin: '4px 0 0' }}>
                    {tutorialPriceType === 'fixed'
                      ? 'Tarifa acordada de antemano para trabajos puntuales y definidos.'
                      : 'El vecino técnico se acerca primero a tu domicilio para evaluar la labor y acordar el presupuesto final en el lugar.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* PASO 6: Resiliencia Offline: Pedir Ayuda sin Internet (PASO APARTE Y EXCLUSIVO PARA PEDIR AYUDA) */}
          {currentStep === 6 && (
            <div className="tutorial-step-view">
              <div className="tutorial-icon-circle" style={{ background: isDarkMode ? 'rgba(239, 68, 68, 0.18)' : '#FEF2F2', color: isDarkMode ? '#F87171' : '#DC2626' }}>
                <Radio size={32} />
              </div>

              <h2 className="tutorial-title">Pedir Ayuda sin Internet</h2>
              <p className="tutorial-tagline" style={{ color: isDarkMode ? '#FF7B75' : '#DC2626' }}>
                Protocolo Offline BLE Mesh exclusivo para emergencias
              </p>
              <p className="tutorial-desc">
                La función sin internet de Ayni <strong>funciona únicamente cuando se pide o coordina ayuda solidaria</strong> ante emergencias. Si hay un sismo, huaico o apagón masivo sin señal celular, tu pedido de ayuda viaja por la malla Bluetooth de vecino a vecino.
              </p>

              {/* Elemento Interactivo 6 */}
              <div className="tutorial-interactive-box">
                <span className="tutorial-box-label">Prueba interactiva · Simula pedir ayuda en una emergencia:</span>

                <div className="tutorial-card-preview" style={{
                  background: isDarkMode ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
                  borderColor: isDarkMode ? 'rgba(239, 68, 68, 0.35)' : '#FECACA',
                  marginTop: 8
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <WifiOff size={18} color={isDarkMode ? '#F87171' : '#DC2626'} />
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.82rem', color: isDarkMode ? '#FCA5A5' : '#991B1B' }}>
                        Sin conexión a internet ni red celular
                      </div>
                      <div style={{ fontSize: '0.72rem', color: isDarkMode ? '#F87171' : '#B91C1C' }}>
                        Emergencia barrial detectada · Malla BLE activa
                      </div>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.76rem', color: isDarkMode ? '#CBD5E1' : '#4B5563', margin: '6px 0 10px 0', lineHeight: 1.35 }}>
                    Caso: Necesitas agua potable de emergencia o botiquín y no hay línea telefónica.
                  </p>

                  {!offlineHelpBroadcasted ? (
                    <button
                      type="button"
                      className="btn btn-coral btn-block"
                      style={{ fontSize: '0.78rem', padding: '9px 12px', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#DC2626' }}
                      onClick={() => setOfflineHelpBroadcasted(true)}
                    >
                      <Radio size={15} /> Emitir Pedido de Auxilio Offline (BLE)
                    </button>
                  ) : (
                    <div style={{ background: isDarkMode ? 'rgba(34, 197, 94, 0.16)' : '#ECFDF5', border: `1px solid ${isDarkMode ? 'rgba(34, 197, 94, 0.4)' : '#A7F3D0'}`, padding: '10px 12px', borderRadius: 10, color: isDarkMode ? '#86EFAC' : '#065F46', fontSize: '0.76rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, marginBottom: 2 }}>
                        <CheckCircle2 size={16} color={isDarkMode ? '#4ADE80' : '#059669'} />
                        ¡Señal de auxilio transmitida con éxito!
                      </div>
                      <div style={{ lineHeight: 1.35 }}>
                        Tu pedido saltó por Bluetooth Mesh a <strong>3 teléfonos de vecinos cercanos</strong> a ~15 metros. Cuando un vecino con señal reciba el salto, la alerta se sincroniza automáticamente.
                      </div>
                    </div>
                  )}
                </div>

                <div style={{
                  background: isDarkMode ? 'rgba(245, 158, 11, 0.12)' : '#F9FAFB',
                  border: `1px solid ${isDarkMode ? 'rgba(245, 158, 11, 0.35)' : 'var(--gray-200)'}`,
                  borderRadius: 8,
                  padding: '8px 10px',
                  marginTop: 10,
                  fontSize: '0.72rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 6
                }}>
                  <AlertTriangle size={14} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ color: isDarkMode ? '#CBD5E1' : '#6B7280' }}>
                    <strong style={{ color: isDarkMode ? '#FCD34D' : '#374151' }}>Importante:</strong> Los oficios y servicios comerciales requieren conexión a internet. La red offline está reservada con prioridad absoluta para <strong style={{ color: isDarkMode ? '#FCD34D' : '#374151' }}>salvar vidas y auxilio vecinal</strong>.
                  </span>
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
