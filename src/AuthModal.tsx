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
  const [fullName, setFullName] = useState('');
  const [reniecLoading, setReniecLoading] = useState(false);
  const [reniecSource, setReniecSource] = useState<'reniec' | 'mock' | null>(null);
  const [regError, setRegError] = useState('');

  const [phone, setPhone] = useState('');

  const [regEmail, setRegEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [sendingCode, setSendingCode] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const docLen = docType === 'DNI' ? 8 : 9;

  const resetReg = () => {
    setRegStep(1); setDocNumber(''); setFullName(''); setReniecSource(null);
    setPhone(''); setRegEmail(''); setCode(''); setCodeSent(false); setDevCode(null);
    setRegError('');
  };

  // Paso 1 → buscar en RENIEC y pasar al paso 2
  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    if (docNumber.length !== docLen) {
      setRegError(`El ${docType} debe tener ${docLen} dígitos.`);
      return;
    }
    // CE no se consulta en RENIEC: el usuario escribe su nombre.
    if (docType === 'CE') {
      if (!fullName.trim()) { setRegError('Escribe tus nombres y apellidos.'); return; }
      setRegStep(2);
      return;
    }
    setReniecLoading(true);
    try {
      const r = await api.lookupDni(docNumber);
      setFullName(r.nombre_completo);
      setReniecSource(r.source);
      setRegStep(2);
    } catch (err: any) {
      setRegError(err?.message || 'No se pudo consultar el DNI. Escribe tu nombre manualmente.');
      // Permitir continuar manual si RENIEC falla
      setReniecSource(null);
    } finally {
      setReniecLoading(false);
    }
  };

  // Paso 2 → teléfono
  const handleStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    if (!fullName.trim()) { setRegError('Confirma tus nombres y apellidos.'); return; }
    if (phone.length !== 9) { setRegError('El teléfono debe tener 9 dígitos.'); return; }
    setRegStep(3);
  };

  // Paso 3a → enviar código al correo
  const sendCode = async () => {
    setRegError('');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(regEmail.trim())) {
      setRegError('Ingresa un correo válido.');
      return;
    }
    setSendingCode(true);
    try {
      const r = await api.requestEmailCode(regEmail.trim());
      setCodeSent(true);
      setDevCode(r.dev_code || null); // en modo demo llega el código aquí
    } catch (err: any) {
      setRegError(err?.message || 'No se pudo enviar el código.');
    } finally {
      setSendingCode(false);
    }
  };

  // Paso 3b → verificar código y crear cuenta
  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    if (code.length < 6) { setRegError('Ingresa el código de 6 dígitos.'); return; }
    setFinishing(true);
    try {
      await api.verifyEmailCode(regEmail.trim(), code.trim());
      // La contraseña inicial es el número de documento (se puede cambiar luego).
      await api.register({
        display_name: fullName.trim(),
        email: regEmail.trim(),
        phone: phone,
        password: docNumber,
        role: 'vecino',
      });
      onSuccess({
        name: fullName.trim(),
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

  const onlyDigits = (v: string, max: number) => v.replace(/\D/g, '').slice(0, max);

  // ============================ RENDER ============================
  return (
    <div className="sh-overlay">
      <div className="sh-screen">

        {/* ---------- BANNER ---------- */}
        <div className="sh-banner">
          {(view === 'register') && (
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
          <img
            className="sh-banner-img"
            src="/shalom-login-banner.png"
            alt="Bienvenido a Ayni"
          />
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
                  autoComplete="email"
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
              {/* Stepper 1-2-3 */}
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

              <h2 className="sh-reg-title">¡Únete fácil, rápido<br /><strong>y seguro</strong> a Ayni!</h2>

              {/* -------- PASO 1: Documento + RENIEC -------- */}
              {regStep === 1 && (
                <form onSubmit={handleStep1}>
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

                  {docType === 'CE' && (
                    <div className="sh-field sh-floating">
                      <input className="sh-input" placeholder=" " value={fullName} onChange={(e) => setFullName(e.target.value)} />
                      <label>Nombres y apellidos</label>
                    </div>
                  )}

                  {regError && <div className="sh-error">{regError}</div>}

                  <button type="submit" className="sh-btn-primary" disabled={reniecLoading}>
                    {reniecLoading
                      ? (<><Loader2 size={18} className="sh-spin" /> Consultando RENIEC…</>)
                      : (<><Search size={18} /> {docType === 'DNI' ? 'Buscar mis datos' : 'Continuar'}</>)}
                  </button>
                </form>
              )}

              {/* -------- PASO 2: Nombre confirmado + teléfono -------- */}
              {regStep === 2 && (
                <form onSubmit={handleStep2}>
                  <div className="sh-name-card">
                    <span className="sh-name-label">
                      {reniecSource === 'reniec' ? '✓ Datos verificados en RENIEC' : reniecSource === 'mock' ? 'Datos de prueba (demo)' : 'Tus datos'}
                    </span>
                    <input
                      className="sh-name-input"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>

                  <div className="sh-field sh-floating">
                    <input
                      className="sh-input"
                      inputMode="numeric"
                      placeholder=" "
                      value={phone}
                      onChange={(e) => setPhone(onlyDigits(e.target.value, 9))}
                    />
                    <label>Número de celular</label>
                    <span className="sh-count">{phone.length}/9</span>
                  </div>

                  {regError && <div className="sh-error">{regError}</div>}

                  <button type="submit" className="sh-btn-primary">Continuar</button>
                </form>
              )}

              {/* -------- PASO 3: Correo + código -------- */}
              {regStep === 3 && (
                <form onSubmit={handleFinish}>
                  <div className="sh-field sh-field-icon sh-floating">
                    <input
                      type="email"
                      className="sh-input"
                      placeholder=" "
                      value={regEmail}
                      onChange={(e) => { setRegEmail(e.target.value); setCodeSent(false); }}
                      disabled={codeSent}
                    />
                    <label>Correo electrónico</label>
                    {!codeSent && (
                      <button type="button" className="sh-inline-btn" onClick={sendCode} disabled={sendingCode}>
                        {sendingCode ? '…' : 'Enviar'}
                      </button>
                    )}
                  </div>

                  {codeSent && (
                    <>
                      <p className="sh-hint">
                        Te enviamos un código de 6 dígitos a <strong>{regEmail}</strong>.{' '}
                        <span className="sh-link-red" onClick={sendCode}>Reenviar</span>
                      </p>
                      {devCode && (
                        <div className="sh-dev-code">Modo demo — tu código es: <strong>{devCode}</strong></div>
                      )}
                      <div className="sh-field sh-floating">
                        <input
                          className="sh-input sh-code"
                          inputMode="numeric"
                          placeholder=" "
                          value={code}
                          onChange={(e) => setCode(onlyDigits(e.target.value, 6))}
                        />
                        <label>Código de verificación</label>
                      </div>
                    </>
                  )}

                  {regError && <div className="sh-error">{regError}</div>}

                  <button type="submit" className="sh-btn-primary" disabled={!codeSent || finishing}>
                    {finishing ? 'Creando cuenta…' : 'Verificar y crear cuenta'}
                  </button>
                  <p className="sh-note-small">Tu contraseña inicial será tu número de documento. Podrás cambiarla luego.</p>
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
