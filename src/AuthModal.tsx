import React, { useState } from 'react';
import { api } from './api';
import './AuthModal.css';

interface AuthModalProps {
  onSuccess: (user: { name: string; documentNumber: string; neighborhood: string; district: string }) => void;
  onClose: () => void;
}

export function AuthModal({ onSuccess, onClose }: AuthModalProps) {
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docNumber.trim() || !password.trim()) {
      alert('Por favor complete su número de documento o correo y contraseña');
      return;
    }

    setIsLoading(true);
    try {
      // Intentar login real contra el backend si está activo
      await api.login(docNumber.trim(), password.trim());
      const me = await api.getMe();
      onSuccess({
        name: me.display_name,
        documentNumber: me.phone || me.email || docNumber,
        neighborhood: me.profile?.public_area_label || 'Zárate / San Juan de Lurigancho',
        district: 'San Juan de Lurigancho'
      });
    } catch {
      // Modo offline / fallback demo
      onSuccess({
        name: docNumber === '72345678' ? 'María Quispe' : (docNumber.includes('@') ? docNumber.split('@')[0] : `Vecino (${docNumber})`),
        documentNumber: docNumber,
        neighborhood: 'Sector Central / Santa Rosa',
        district: 'San Juan de Lurigancho'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regDocNumber.trim() || !regFirstName.trim() || !regLastName.trim()) {
      alert('Por favor ingrese su documento, nombres y apellidos completos.');
      return;
    }
    setAuthMode('register_step2');
  };

  const handleRegisterStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regPassword.trim()) {
      alert('Por favor cree una contraseña segura.');
      return;
    }

    setIsLoading(true);
    const fullName = `${regFirstName} ${regLastName}`.trim();
    try {
      // Intentar registro real en el backend
      await api.register({
        display_name: fullName,
        email: regDocNumber.includes('@') ? regDocNumber : undefined,
        phone: !regDocNumber.includes('@') ? regDocNumber : undefined,
        password: regPassword,
        role: 'vecino'
      });
      onSuccess({
        name: fullName,
        documentNumber: regDocNumber,
        neighborhood: regNeighborhood,
        district: regDistrict
      });
    } catch {
      // Fallback offline
      onSuccess({
        name: fullName,
        documentNumber: regDocNumber,
        neighborhood: regNeighborhood,
        district: regDistrict
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        {/* Close button */}
        <button className="auth-close-btn" onClick={onClose} title="Cerrar">✕</button>

        {/* Brand identity from image */}
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

        {/* TABS */}
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
                  onChange={e => setDocType(e.target.value)}
                  className="auth-input select-input"
                >
                  <option value="DNI">DNI</option>
                  <option value="CE">CARNÉ EXTRANJERÍA</option>
                  <option value="PASAPORTE">PASAPORTE</option>
                  <option value="RUC">RUC 10</option>
                </select>
                <div className="select-arrow">▼</div>
              </div>
            </div>

            <div className="auth-field">
              <label>N° DOCUMENTACIÓN</label>
              <input 
                type="text" 
                maxLength={12}
                placeholder="00000000"
                value={docNumber}
                onChange={e => setDocNumber(e.target.value)}
                className="auth-input mono-font"
                required
              />
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

            <button type="submit" className="auth-submit-btn">
              INGRESAR SESIÓN
            </button>

            <div className="auth-helper-links">
              <span className="quick-fill" onClick={() => { setDocNumber('72345678'); setPassword('123456'); }}>
                Usar cuenta demo de prueba
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
                  onChange={e => setRegDocType(e.target.value)}
                  className="auth-input select-input"
                >
                  <option value="DNI">DNI</option>
                  <option value="CE">CARNÉ EXTRANJERÍA</option>
                  <option value="PASAPORTE">PASAPORTE</option>
                </select>
                <div className="select-arrow">▼</div>
              </div>
            </div>

            <div className="auth-field">
              <label>N° DOCUMENTACIÓN</label>
              <input 
                type="text" 
                maxLength={12}
                placeholder="00000000"
                value={regDocNumber}
                onChange={e => setRegDocNumber(e.target.value)}
                className="auth-input mono-font"
                required
              />
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
                value={regDocNumber}
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

            <div className="auth-field">
              <label>BARRIO O ZONA RESIDENCIAL</label>
              <div className="select-wrapper">
                <select 
                  value={regNeighborhood} 
                  onChange={e => setRegNeighborhood(e.target.value)}
                  className="auth-input select-input"
                >
                  <option value="Sector Central / Santa Rosa">Sector Central / Santa Rosa</option>
                  <option value="Zona B - San Juan / Los Robles">Zona B - San Juan / Los Robles</option>
                  <option value="Zona Alta / El Mirador">Zona Alta / El Mirador</option>
                  <option value="Barrio Las Flores / Manzana F">Barrio Las Flores / Manzana F</option>
                </select>
                <div className="select-arrow">▼</div>
              </div>
              <small className="field-note">Tu dirección exacta nunca se publicará (Principio de Privacidad Ayni).</small>
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
              <button type="submit" className="auth-submit-btn" style={{ flex: 2 }}>
                CONTINUAR Y UNIRME
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

