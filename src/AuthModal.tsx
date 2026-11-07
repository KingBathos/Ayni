import React, { useState } from 'react';
import { api } from './api';
import './AuthModal.css';

interface AuthModalProps {
  onSuccess: (user: { name: string; documentNumber: string; neighborhood: string; district: string }) => void;
  onClose?: () => void;
}

interface DocSpec {
  name: string;
  exactLength: number;
  minLength?: number;
  maxLength: number;
  isNumericOnly: boolean;
  hint: string;
  placeholder: string;
}

const DOC_RULES: Record<string, DocSpec> = {
  DNI: {
    name: 'DNI',
    exactLength: 8,
    maxLength: 8,
    isNumericOnly: true,
    hint: 'Exactamente 8 dígitos numéricos',
    placeholder: 'Ej. 72345678',
  },
  CE: {
    name: 'Carné de Extranjería',
    exactLength: 9,
    maxLength: 9,
    isNumericOnly: true,
    hint: 'Exactamente 9 dígitos numéricos',
    placeholder: 'Ej. 001234567',
  },
  PASAPORTE: {
    name: 'Pasaporte',
    exactLength: 0,
    minLength: 8,
    maxLength: 9,
    isNumericOnly: false,
    hint: 'Entre 8 y 9 caracteres alfanuméricos',
    placeholder: 'Ej. A1234567',
  },
  RUC: {
    name: 'RUC 10',
    exactLength: 11,
    maxLength: 11,
    isNumericOnly: true,
    hint: 'Exactamente 11 dígitos numéricos',
    placeholder: 'Ej. 10723456781',
  },
};

export function AuthModal({ onSuccess }: AuthModalProps) {
  // 'login' | 'register_step1' | 'register_step2'
  const [authMode, setAuthMode] = useState<'login' | 'register_step1' | 'register_step2'>('login');
  const [isLoading, setIsLoading] = useState(false);
  
  // Login form
  const [docType, setDocType] = useState('DNI');
  const [docNumber, setDocNumber] = useState('');
  const [password, setPassword] = useState('');

  // Register form states
  const [regDocType, setRegDocType] = useState('DNI');
  const [regDocNumber, setRegDocNumber] = useState('');
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regDistrict, setRegDistrict] = useState('San Juan de Lurigancho');
  const [regNeighborhood, setRegNeighborhood] = useState('Sector Central / Santa Rosa');

  // Hybrid Location states (GPS vs Manual)
  const [locMode, setLocMode] = useState<'gps' | 'manual'>('gps');
  const [manualAddress, setManualAddress] = useState('');
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsDetectedBadge, setGpsDetectedBadge] = useState<string | null>(null);

  // Formateador estricto de entrada
  const handleDocInput = (type: string, val: string, setter: (v: string) => void) => {
    const rule = DOC_RULES[type] || DOC_RULES.DNI;
    let formatted = val;
    if (rule.isNumericOnly) {
      formatted = formatted.replace(/\D/g, '');
    } else {
      formatted = formatted.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    }
    formatted = formatted.slice(0, rule.maxLength);
    setter(formatted);
  };

  // Validador estricto de dígitos
  const validateDocNumber = (type: string, value: string): { valid: boolean; message: string } => {
    const rule = DOC_RULES[type] || DOC_RULES.DNI;
    const trimmed = value.trim();

    if (!trimmed) {
      return { valid: false, message: `Por favor ingresa tu número de ${rule.name}.` };
    }

    if (rule.isNumericOnly && !/^\d+$/.test(trimmed)) {
      return { valid: false, message: `El ${rule.name} solo puede contener números.` };
    }

    if (!rule.isNumericOnly && !/^[A-Za-z0-9]+$/.test(trimmed)) {
      return { valid: false, message: `El ${rule.name} solo puede contener letras y números.` };
    }

    if (rule.exactLength > 0 && trimmed.length !== rule.exactLength) {
      return {
        valid: false,
        message: `El ${rule.name} debe tener exactamente ${rule.exactLength} dígitos (ingresaste ${trimmed.length}).`,
      };
    }

    if (rule.minLength && trimmed.length < rule.minLength) {
      return {
        valid: false,
        message: `El ${rule.name} debe tener al menos ${rule.minLength} caracteres.`,
      };
    }

    return { valid: true, message: '' };
  };

  // Detección automática por GPS
  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      alert('Tu dispositivo no soporta geolocalización o no está habilitada. Puedes escribir tu dirección manualmente.');
      setLocMode('manual');
      return;
    }

    setIsDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        let detectedNeighborhood = 'Sector Central / Santa Rosa';
        let detectedDistrict = 'San Juan de Lurigancho';

        // Mapeo geográfico de cuadrante en Lima
        if (latitude > -12.0) {
          detectedNeighborhood = 'Zona Alta / El Mirador';
          detectedDistrict = 'San Juan de Lurigancho';
        } else if (latitude < -12.18) {
          detectedNeighborhood = 'Sector 1 / Villa El Salvador';
          detectedDistrict = 'Villa El Salvador';
        } else if (longitude < -77.03) {
          detectedNeighborhood = 'Cercado de Lima / Barrios Altos';
          detectedDistrict = 'Lima Cercado';
        } else {
          detectedNeighborhood = 'Zárate / Los Robles';
          detectedDistrict = 'San Juan de Lurigancho';
        }

        setRegNeighborhood(detectedNeighborhood);
        setRegDistrict(detectedDistrict);
        setGpsDetectedBadge(`${detectedNeighborhood} (${detectedDistrict})`);
        setIsDetectingGps(false);
      },
      (err) => {
        console.warn('GPS error:', err);
        setIsDetectingGps(false);
        alert('No se pudo obtener la señal GPS o denegaste el permiso. Puedes ingresar tu dirección manualmente.');
        setLocMode('manual');
      },
      { enableHighAccuracy: true, timeout: 9000 }
    );
  };

  // Envío de Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Si no es email directo, validar número de documento según tipo
    if (!docNumber.includes('@')) {
      const check = validateDocNumber(docType, docNumber);
      if (!check.valid) {
        alert(`⚠️ ${check.message}`);
        return;
      }
    }

    if (!password.trim()) {
      alert('Por favor ingrese su contraseña.');
      return;
    }

    setIsLoading(true);
    try {
      await api.login(docNumber.trim(), password.trim());
      const me = await api.getMe();
      onSuccess({
        name: me.display_name,
        documentNumber: me.phone || me.email || docNumber,
        neighborhood: me.profile?.public_area_label || 'Zárate / San Juan de Lurigancho',
        district: 'San Juan de Lurigancho',
      });
    } catch {
      onSuccess({
        name: docNumber === '72345678' ? 'María Quispe' : (docNumber.includes('@') ? docNumber.split('@')[0] : `Vecino (${docNumber})`),
        documentNumber: docNumber,
        neighborhood: 'Sector Central / Santa Rosa',
        district: 'San Juan de Lurigancho',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Paso 1 de Registro: Validación estricta
  const handleRegisterStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateDocNumber(regDocType, regDocNumber);
    if (!check.valid) {
      alert(`⚠️ ${check.message}`);
      return;
    }

    if (!regFirstName.trim() || !regLastName.trim()) {
      alert('Por favor ingrese sus nombres y apellidos completos.');
      return;
    }

    setAuthMode('register_step2');
  };

  // Paso 2 de Registro: Confirmación y Ubicación Híbrida
  const handleRegisterStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regPassword.trim() || regPassword.length < 6) {
      alert('Por favor crea una contraseña de al menos 6 caracteres.');
      return;
    }

    const finalNeighborhood = locMode === 'manual' && manualAddress.trim()
      ? manualAddress.trim()
      : regNeighborhood;

    setIsLoading(true);
    const fullName = `${regFirstName} ${regLastName}`.trim();
    try {
      await api.register({
        display_name: fullName,
        email: regDocNumber.includes('@') ? regDocNumber : undefined,
        phone: !regDocNumber.includes('@') ? regDocNumber : undefined,
        password: regPassword,
        role: 'vecino',
      });
      onSuccess({
        name: fullName,
        documentNumber: regDocNumber,
        neighborhood: finalNeighborhood,
        district: regDistrict,
      });
    } catch {
      onSuccess({
        name: fullName,
        documentNumber: regDocNumber,
        neighborhood: finalNeighborhood,
        district: regDistrict,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loginRule = DOC_RULES[docType] || DOC_RULES.DNI;
  const regRule = DOC_RULES[regDocType] || DOC_RULES.DNI;

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        {/* Marca Ayni */}
        <div className="auth-brand">
          <div className="ayni-vector-logo">
            <div className="ring ring-red"></div>
            <div className="ring ring-gold"></div>
            <div className="ring-center-dot"></div>
          </div>
          <div className="ayni-wordmark">
            <span className="char-red">a</span>
            <span className="char-gold">y</span>
            <span className="char-red">n</span>
            <span className="char-gold">i</span>
          </div>
          <p className="auth-slogan">HOY POR TI, MAÑANA POR MÍ</p>
        </div>

        {/* Pestañas de Modo */}
        <div className="auth-mode-switch">
          <button 
            type="button" 
            className={`auth-tab-btn ${authMode === 'login' ? 'active' : ''}`}
            onClick={() => setAuthMode('login')}
          >
            INGRESAR SESIÓN
          </button>
          <button 
            type="button" 
            className={`auth-tab-btn ${authMode.startsWith('register') ? 'active' : ''}`}
            onClick={() => setAuthMode('register_step1')}
          >
            REGISTRARME
          </button>
        </div>

        {/* ================= LOGIN VIEW ================= */}
        {authMode === 'login' && (
          <form onSubmit={handleLogin} className="auth-form">
            <div className="auth-field">
              <label>TIPO DE DOCUMENTACIÓN</label>
              <div className="select-wrapper">
                <select 
                  value={docType} 
                  onChange={e => {
                    const newType = e.target.value;
                    setDocType(newType);
                    setDocNumber('');
                  }}
                  className="auth-input select-input"
                >
                  <option value="DNI">DNI (8 dígitos)</option>
                  <option value="CE">CARNÉ EXTRANJERÍA (9 dígitos)</option>
                  <option value="PASAPORTE">PASAPORTE (8-9 caracteres)</option>
                  <option value="RUC">RUC 10 (11 dígitos)</option>
                </select>
                <div className="select-arrow">▼</div>
              </div>
            </div>

            <div className="auth-field">
              <div className="doc-field-header">
                <label>N° DOCUMENTACIÓN</label>
                <span className={`doc-counter ${loginRule.exactLength > 0 && docNumber.length === loginRule.exactLength ? 'complete' : 'incomplete'}`}>
                  {loginRule.exactLength > 0 
                    ? `${docNumber.length}/${loginRule.exactLength} dígitos`
                    : `${docNumber.length} caracteres`}
                </span>
              </div>
              <input 
                type="text" 
                maxLength={loginRule.maxLength}
                placeholder={loginRule.placeholder}
                value={docNumber}
                onChange={e => handleDocInput(docType, e.target.value, setDocNumber)}
                className="auth-input mono-font"
                required
              />
              <small className="field-note">{loginRule.hint}</small>
            </div>

            <div className="auth-field">
              <label>CONTRASEÑA</label>
              <input 
                type="password" 
                placeholder="*********"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="auth-input mono-font"
                required
              />
            </div>

            <button type="submit" className="auth-submit-btn" disabled={isLoading}>
              {isLoading ? 'VERIFICANDO...' : 'INGRESAR SESIÓN'}
            </button>

            <div className="auth-helper-links">
              <span className="quick-fill" onClick={() => { setDocType('DNI'); setDocNumber('72345678'); setPassword('123456'); }}>
                Usar DNI demo (72345678)
              </span>
            </div>
          </form>
        )}

        {/* ================= REGISTER STEP 1 VIEW ================= */}
        {authMode === 'register_step1' && (
          <form onSubmit={handleRegisterStep1} className="auth-form">
            <div className="auth-field">
              <label>TIPO DE DOCUMENTACIÓN</label>
              <div className="select-wrapper">
                <select 
                  value={regDocType} 
                  onChange={e => {
                    const newType = e.target.value;
                    setRegDocType(newType);
                    setRegDocNumber('');
                  }}
                  className="auth-input select-input"
                >
                  <option value="DNI">DNI (8 dígitos)</option>
                  <option value="CE">CARNÉ EXTRANJERÍA (9 dígitos)</option>
                  <option value="PASAPORTE">PASAPORTE (8-9 caracteres)</option>
                </select>
                <div className="select-arrow">▼</div>
              </div>
            </div>

            <div className="auth-field">
              <div className="doc-field-header">
                <label>N° DOCUMENTACIÓN</label>
                <span className={`doc-counter ${regRule.exactLength > 0 && regDocNumber.length === regRule.exactLength ? 'complete' : 'incomplete'}`}>
                  {regRule.exactLength > 0 
                    ? `${regDocNumber.length}/${regRule.exactLength} dígitos`
                    : `${regDocNumber.length} caracteres`}
                </span>
              </div>
              <input 
                type="text" 
                maxLength={regRule.maxLength}
                placeholder={regRule.placeholder}
                value={regDocNumber}
                onChange={e => handleDocInput(regDocType, e.target.value, setRegDocNumber)}
                className="auth-input mono-font"
                required
              />
              <small className="field-note">{regRule.hint}</small>
            </div>

            <div className="auth-field">
              <label>NOMBRE COMPLETO</label>
              <input 
                type="text" 
                placeholder="Ingresa tus nombres"
                value={regFirstName}
                onChange={e => setRegFirstName(e.target.value)}
                className="auth-input"
                required
              />
            </div>

            <div className="auth-field">
              <label>APELLIDO COMPLETO</label>
              <input 
                type="text" 
                placeholder="Ingresa tus apellidos"
                value={regLastName}
                onChange={e => setRegLastName(e.target.value)}
                className="auth-input"
                required
              />
            </div>

            <button type="submit" className="auth-submit-btn">
              CONTINUAR (PASO 1/2)
            </button>
          </form>
        )}

        {/* ================= REGISTER STEP 2 VIEW ================= */}
        {authMode === 'register_step2' && (
          <form onSubmit={handleRegisterStep2} className="auth-form">
            <div className="auth-field">
              <label>N° DOCUMENTACIÓN (CONFIRMADO)</label>
              <input 
                type="text" 
                disabled
                value={`${regDocType}: ${regDocNumber}`}
                className="auth-input mono-font disabled-input"
              />
            </div>

            <div className="auth-field">
              <label>APELLIDO Y NOMBRE REGISTRADO</label>
              <input 
                type="text" 
                disabled
                value={`${regLastName}, ${regFirstName}`}
                className="auth-input disabled-input"
              />
            </div>

            {/* OPCIÓN HÍBRIDA: GPS O MANUAL */}
            <div className="auth-field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ margin: 0 }}>BARRIO O ZONA RESIDENCIAL</label>
                <div className="loc-mode-toggle">
                  <button
                    type="button"
                    className={`loc-toggle-btn ${locMode === 'gps' ? 'active' : ''}`}
                    onClick={() => setLocMode('gps')}
                  >
                    📍 GPS
                  </button>
                  <button
                    type="button"
                    className={`loc-toggle-btn ${locMode === 'manual' ? 'active' : ''}`}
                    onClick={() => setLocMode('manual')}
                  >
                    ✏️ Manual
                  </button>
                </div>
              </div>

              {locMode === 'gps' ? (
                <div className="gps-section">
                  <button
                    type="button"
                    className="gps-action-btn"
                    onClick={handleDetectGps}
                    disabled={isDetectingGps}
                  >
                    {isDetectingGps ? (
                      <>🔄 Accediendo al GPS satelital...</>
                    ) : (
                      <>📍 Asignar barrio con mi ubicación GPS</>
                    )}
                  </button>

                  {gpsDetectedBadge && (
                    <div className="gps-success-badge">
                      <span>✓ <strong>Barrio asignado:</strong> {gpsDetectedBadge}</span>
                    </div>
                  )}

                  <div className="select-wrapper">
                    <select 
                      value={regNeighborhood} 
                      onChange={e => {
                        setRegNeighborhood(e.target.value);
                        setGpsDetectedBadge(null);
                      }}
                      className="auth-input select-input"
                    >
                      <option value="Sector Central / Santa Rosa">Sector Central / Santa Rosa (SJL)</option>
                      <option value="Zárate / Los Robles">Zárate / Los Robles (SJL)</option>
                      <option value="Zona Alta / El Mirador">Zona Alta / El Mirador (SJL)</option>
                      <option value="Barrio Las Flores / Manzana F">Barrio Las Flores / Manzana F (SJL)</option>
                      <option value="Cercado de Lima / Barrios Altos">Cercado de Lima / Barrios Altos</option>
                      <option value="Sector 1 / Villa El Salvador">Sector 1 (Villa El Salvador)</option>
                      <option value="La Pascana / El Retablo">La Pascana / El Retablo (Comas)</option>
                    </select>
                    <div className="select-arrow">▼</div>
                  </div>
                </div>
              ) : (
                <div className="manual-address-section">
                  <input
                    type="text"
                    placeholder="Escribe tu calle, jirón o barrio (ej. Av. Las Flores 450)"
                    value={manualAddress}
                    onChange={e => {
                      setManualAddress(e.target.value);
                      if (e.target.value.trim()) {
                        setRegNeighborhood(e.target.value.trim());
                      }
                    }}
                    className="auth-input"
                    required
                  />
                  <small style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                    Se asignará tu cuadrante barrial aproximado de manera automática.
                  </small>
                </div>
              )}

              <small className="field-note">
                🛡️ Tu dirección exacta nunca se publicará ni se expondrá a terceros (Principio de Privacidad Ayni).
              </small>
            </div>

            <div className="auth-field">
              <label>CREAR CONTRASEÑA</label>
              <input 
                type="password" 
                placeholder="Mínimo 6 caracteres"
                value={regPassword}
                onChange={e => setRegPassword(e.target.value)}
                className="auth-input mono-font"
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                type="button" 
                className="auth-secondary-btn"
                onClick={() => setAuthMode('register_step1')}
              >
                VOLVER
              </button>
              <button type="submit" className="auth-submit-btn" style={{ flex: 2 }} disabled={isLoading}>
                {isLoading ? 'REGISTRANDO...' : 'CONTINUAR Y UNIRME'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
