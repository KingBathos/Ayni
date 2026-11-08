import React, { useState } from 'react';
import { Eye, EyeOff, ChevronLeft, Check, Search, Loader2 } from 'lucide-react';
import { api } from './api';
import './AuthModal.css';

interface AuthModalProps {
  onSuccess: (user: { name: string; documentNumber: string; neighborhood: string; district: string }) => void;
  onClose?: () => void;
}

const DEFAULT_NEIGHBORHOOD = 'Sector Central / Santa Rosa';
const DEFAULT_DISTRICT = 'San Juan de Lurigancho';

export function AuthModal({ onSuccess, onClose }: AuthModalProps) {
  const [view, setView] = useState<'login' | 'register'>('login');

  // ---------- LOGIN ----------
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!email.trim() || !password.trim()) {
      setLoginError('Ingresa tu correo y tu contraseña.');
      return;
    }
    setLoginLoading(true);
    try {
      await api.login(email.trim(), password.trim());
      const me = await api.getMe();
      onSuccess({
        name: me.display_name,
        documentNumber: me.phone || me.email || email,
        neighborhood: me.profile?.public_area_label || DEFAULT_NEIGHBORHOOD,
        district: DEFAULT_DISTRICT,
      });
    } catch (err: any) {
      setLoginError(err?.message || 'Correo o contraseña incorrectos.');
    } finally {
      setLoginLoading(false);
    }
  };

  // ---------- REGISTRO (3 pasos) ----------
  const [regStep, setRegStep] = useState<1 | 2 | 3>(1);
  const [docType, setDocType] = useState<'DNI' | 'CE'>('DNI');
  const [docNumber, setDocNumber] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [reniecLoading, setReniecLoading] = useState(false);
  const [reniecSource, setReniecSource] = useState<'reniec' | 'mock' | null>(null);
  const [regError, setRegError] = useState('');

  const [phone, setPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPassword2, setRegPassword2] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [codeChannel, setCodeChannel] = useState<'email' | 'dev'>('email');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [sendingCode, setSendingCode] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const docLen = docType === 'DNI' ? 8 : 9;
  const onlyDigits = (v: string, max: number) => v.replace(/\D/g, '').slice(0, max);

  const resetReg = () => {
    setRegStep(1); setDocNumber(''); setNombres(''); setApellidos(''); setReniecSource(null);
    setPhone(''); setRegEmail(''); setRegPassword(''); setRegPassword2('');
    setCode(''); setCodeSent(false); setDevCode(null); setRegError('');
  };

  // Paso 1 → consultar RENIEC (DNI) y pasar al formulario
  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    if (docNumber.length !== docLen) {
      setRegError(`El ${docType} debe tener ${docLen} dígitos.`);
      return;
    }
    if (docType === 'CE') {
      setReniecSource(null);
      setRegStep(2); // CE no se consulta; el usuario escribe su nombre
      return;
    }
    setReniecLoading(true);
    try {
      const r = await api.lookupDni(docNumber);
      setNombres(r.nombres);
      setApellidos(`${r.apellido_paterno} ${r.apellido_materno}`.trim());
      setReniecSource(r.source);
    } catch (err: any) {
      setRegError(err?.message || 'No se encontró el DNI. Puedes escribir tus datos manualmente.');
      setReniecSource(null);
    } finally {
      setReniecLoading(false);
      setRegStep(2);
    }
  };

  // Paso 2 → validar formulario, enviar código y pasar al paso 3
  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    if (!nombres.trim() || !apellidos.trim()) { setRegError('Completa tus nombres y apellidos.'); return; }
    if (phone.length !== 9) { setRegError('El teléfono debe tener 9 dígitos.'); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(regEmail.trim())) { setRegError('Ingresa un correo válido.'); return; }
    if (regPassword.length < 6) { setRegError('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (regPassword !== regPassword2) { setRegError('Las contraseñas no coinciden.'); return; }

    setSendingCode(true);
    try {
      const r = await api.requestEmailCode(regEmail.trim());
      setCodeChannel(r.channel);
      setDevCode(r.dev_code || null);
      setCodeSent(true);
      setRegStep(3);
    } catch (err: any) {
      setRegError(err?.message || 'No se pudo enviar el código. Intenta de nuevo.');
    } finally {
      setSendingCode(false);
    }
  };

  const resendCode = async () => {
    setRegError('');
    setSendingCode(true);
    try {
      const r = await api.requestEmailCode(regEmail.trim());
      setCodeChannel(r.channel);
      setDevCode(r.dev_code || null);
      setCodeSent(true);
    } catch (err: any) {
      setRegError(err?.message || 'No se pudo reenviar el código.');
    } finally {
      setSendingCode(false);
    }
  };

  // Paso 3 → verificar código y crear la cuenta
  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    if (code.length < 6) { setRegError('Ingresa el código de 6 dígitos.'); return; }
    setFinishing(true);
    const fullName = `${nombres} ${apellidos}`.replace(/\s+/g, ' ').trim();
    try {
      await api.verifyEmailCode(regEmail.trim(), code.trim());
      await api.register({
        display_name: fullName,
        email: regEmail.trim(),
        phone,
        password: regPassword,
        role: 'vecino',
      });
      onSuccess({
        name: fullName,
        documentNumber: docNumber,
        neighborhood: DEFAULT_NEIGHBORHOOD,
        district: DEFAULT_DISTRICT,
      });
    } catch (err: any) {
      setRegError(err?.message || 'No se pudo completar el registro.');
    } finally {
      setFinishing(false);
    }
  };

  // ============================ RENDER ============================
  return (
    <div className="sh-overlay">
      <div className="sh-screen">

        {/* ---------- HERO AYNI (Sin publicidad de Shalom) ---------- */}
        <div className="ayni-auth-hero">
          {view === 'register' && (
            <button
              type="button"
              className="sh-back"
              onClick={() => { if (regStep > 1) setRegStep((s) => (s - 1) as 1 | 2 | 3); else { resetReg(); setView('login'); } }}
              aria-label="Volver"
            >
              <ChevronLeft size={22} />
            </button>
          )}
          {view === 'login' && onClose && (
            <button type="button" className="sh-back" onClick={onClose} aria-label="Cerrar">
              <ChevronLeft size={22} />
            </button>
          )}

          <div className="ayni-auth-brand">
            <div className="ayni-auth-rings">
              <div className="ayni-wr red" />
              <div className="ayni-wr gold" />
            </div>
            <div className="ayni-auth-wordmark">
              <span style={{ color: '#D83B35' }}>a</span>
              <span style={{ color: '#FF875C' }}>y</span>
              <span style={{ color: '#D83B35' }}>n</span>
              <span style={{ color: '#FF875C' }}>i</span>
            </div>
            <p className="ayni-auth-tagline">“Hoy por ti, mañana por mí”</p>
          </div>
        </div>

        {/* ---------- TARJETA ---------- */}
        <div className="sh-card">

          {/* ===================== LOGIN ===================== */}
          {view === 'login' && (
            <form onSubmit={handleLogin} className="sh-form">
              <h1 className="sh-title">Iniciar sesión</h1>
              <p className="sh-subtitle">Ingresa tus datos para acceder a tu cuenta vecinal.</p>

              <div className="sh-field">
                <input
                  type="email"
                  className="sh-input"
                  placeholder="Correo electrónico"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  name="email"
                />
              </div>

              <div className="sh-field sh-field-icon">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="sh-input"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  name="password"
                />
                <button type="button" className="sh-eye" onClick={() => setShowPassword((s) => !s)} aria-label="Ver contraseña">
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <div className="sh-row-between">
                <label className="sh-check">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  <span>Recuérdame</span>
                </label>
                <span className="sh-link-red" onClick={() => alert('Escribe a soporte@ayni.pe para recuperar tu contraseña.')}>
                  Olvidé mi contraseña
                </span>
              </div>

              {loginError && <div className="sh-error">{loginError}</div>}

              <button type="submit" className="sh-btn-primary" disabled={loginLoading}>
                {loginLoading ? 'Verificando…' : 'Iniciar sesión'}
              </button>

              <p className="sh-foot">
                ¿No tienes una cuenta?{' '}
                <span className="sh-link-red" onClick={() => { resetReg(); setView('register'); }}>Regístrate</span>
              </p>
              <p className="sh-demo" onClick={() => { setEmail('maria@ayni.pe'); setPassword('ayni1234'); }}>
                Usar cuenta demo (maria@ayni.pe)
              </p>
            </form>
          )}

          {/* ===================== REGISTRO ===================== */}
          {view === 'register' && (
            <div className="sh-form">
              <div className="sh-stepper">
                {[1, 2, 3].map((n, i) => (
                  <React.Fragment key={n}>
                    <div className={`sh-step ${regStep >= n ? 'active' : ''}`}>
                      {regStep > n ? <Check size={16} /> : n}
                    </div>
                    {i < 2 && <div className={`sh-step-line ${regStep > n ? 'active' : ''}`} />}
                  </React.Fragment>
                ))}
              </div>

              {/* -------- PASO 1: Documento -------- */}
              {regStep === 1 && (
                <form onSubmit={handleStep1}>
                  <h2 className="sh-reg-title">¡Únete fácil, rápido<br /><strong>y seguro</strong> a Ayni!</h2>
                  <div className="sh-toggle">
                    <button type="button" className={`sh-toggle-opt ${docType === 'DNI' ? 'on' : ''}`} onClick={() => { setDocType('DNI'); setDocNumber(''); }}>DNI</button>
                    <button type="button" className={`sh-toggle-opt ${docType === 'CE' ? 'on' : ''}`} onClick={() => { setDocType('CE'); setDocNumber(''); }}>CE</button>
                  </div>

                  <div className="sh-field sh-floating">
                    <input
                      className="sh-input"
                      inputMode="numeric"
                      placeholder=" "
                      value={docNumber}
                      onChange={(e) => setDocNumber(onlyDigits(e.target.value, docLen))}
                    />
                    <label>{docType === 'DNI' ? 'Documento nacional de identidad' : 'Carné de extranjería'}</label>
                    <span className="sh-count">{docNumber.length}/{docLen}</span>
                  </div>

                  {regError && <div className="sh-error">{regError}</div>}

                  <button type="submit" className="sh-btn-primary" disabled={reniecLoading}>
                    {reniecLoading
                      ? (<><Loader2 size={18} className="sh-spin" /> Consultando RENIEC…</>)
                      : (<><Search size={18} /> {docType === 'DNI' ? 'Buscar mis datos' : 'Continuar'}</>)}
                  </button>
                </form>
              )}

              {/* -------- PASO 2: Formulario completo -------- */}
              {regStep === 2 && (
                <form onSubmit={handleStep2}>
                  <h2 className="sh-reg-title">Completa tus datos</h2>

                  {reniecSource ? (
                    /* DNI: datos de RENIEC, NO editables */
                    <div className="sh-reniec-box">
                      <span className="sh-ok-note"><Check size={14} /> Datos extraídos de RENIEC</span>
                      <div className="sh-reniec-field">
                        <span className="sh-reniec-lbl">Nombres</span>
                        <span className="sh-reniec-val">{nombres || '—'}</span>
                      </div>
                      <div className="sh-reniec-field">
                        <span className="sh-reniec-lbl">Apellidos</span>
                        <span className="sh-reniec-val">{apellidos || '—'}</span>
                      </div>
                    </div>
                  ) : (
                    /* CE o RENIEC no disponible: el usuario escribe */
                    <>
                      <div className="sh-field sh-floating">
                        <input className="sh-input" placeholder=" " value={nombres} onChange={(e) => setNombres(e.target.value)} autoComplete="given-name" />
                        <label>Nombres</label>
                      </div>
                      <div className="sh-field sh-floating">
                        <input className="sh-input" placeholder=" " value={apellidos} onChange={(e) => setApellidos(e.target.value)} autoComplete="family-name" />
                        <label>Apellidos</label>
                      </div>
                    </>
                  )}

                  <div className="sh-field sh-floating">
                    <input className="sh-input" inputMode="numeric" placeholder=" " value={phone} onChange={(e) => setPhone(onlyDigits(e.target.value, 9))} autoComplete="tel" />
                    <label>Número de celular</label>
                    <span className="sh-count">{phone.length}/9</span>
                  </div>

                  <div className="sh-field sh-floating">
                    <input type="email" className="sh-input" placeholder=" " value={regEmail} onChange={(e) => setRegEmail(e.target.value)} autoComplete="username" name="email" />
                    <label>Correo electrónico</label>
                  </div>

                  <div className="sh-field sh-field-icon sh-floating">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      className="sh-input"
                      placeholder=" "
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      autoComplete="new-password"
                      name="new-password"
                    />
                    <label>Crea una contraseña</label>
                    <button type="button" className="sh-eye" onClick={() => setShowRegPassword((s) => !s)} aria-label="Ver contraseña">
                      {showRegPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>

                  <div className="sh-field sh-floating">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      className="sh-input"
                      placeholder=" "
                      value={regPassword2}
                      onChange={(e) => setRegPassword2(e.target.value)}
                      autoComplete="new-password"
                      name="confirm-password"
                    />
                    <label>Repite la contraseña</label>
                  </div>

                  {regError && <div className="sh-error">{regError}</div>}

                  <button type="submit" className="sh-btn-primary" disabled={sendingCode}>
                    {sendingCode ? 'Enviando código…' : 'Continuar'}
                  </button>
                </form>
              )}

              {/* -------- PASO 3: Código -------- */}
              {regStep === 3 && (
                <form onSubmit={handleFinish}>
                  <h2 className="sh-reg-title">Verifica tu correo</h2>
                  <p className="sh-hint">
                    Ingresa el código de 6 dígitos que enviamos a <strong>{regEmail}</strong>.{' '}
                    <span className="sh-link-red" onClick={resendCode}>Reenviar</span>
                  </p>
                  {devCode && (
                    <div className="sh-dev-code">
                      {codeChannel === 'email'
                        ? <>También puedes usar este código: <strong>{devCode}</strong></>
                        : <>Modo demo — tu código es: <strong>{devCode}</strong></>}
                    </div>
                  )}

                  <div className="sh-field sh-floating">
                    <input
                      className="sh-input sh-code"
                      inputMode="numeric"
                      placeholder=" "
                      value={code}
                      onChange={(e) => setCode(onlyDigits(e.target.value, 6))}
                      autoComplete="one-time-code"
                    />
                    <label>Código de verificación</label>
                  </div>

                  {regError && <div className="sh-error">{regError}</div>}

                  <button type="submit" className="sh-btn-primary" disabled={finishing}>
                    {finishing ? 'Creando cuenta…' : 'Verificar y crear cuenta'}
                  </button>
                </form>
              )}

              <p className="sh-foot">
                ¿Ya tienes cuenta?{' '}
                <span className="sh-link-red" onClick={() => { resetReg(); setView('login'); }}>Inicia sesión</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
