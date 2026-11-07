# AYNI - Plataforma de Colaboración Vecinal y Resiliencia Comunitaria
*Propuesta y Prototipo para la Hackathon UTP – El Comercio 2026*

Ayni es una plataforma web y aplicativo móvil diseñada para conectar vecinos y comunidades locales bajo dos ejes centrales:
1. **Economía y empleabilidad de proximidad:** Descubrimiento de oficios locales (electricistas, gasfiteros, etc.) con contrataciones seguras y reputación verificada.
2. **Solidaridad y funcionamiento offline-first:** Red comunitaria para avisos vecinales, peticiones solidarias de emergencia y simulación de conectividad store-and-forward / BLE mesh cuando cae el Internet.

---

## 🚀 Módulos Implementados en el Prototipo

- **Servicios y Oficios:** Filtros por especialidad, zonas aproximadas de cobertura y solicitud directa de servicios.
- **Trazabilidad y Reputación Verificada:** Flujo donde solo un cliente con servicio completado puede emitir una reseña calificada de 1 a 5 estrellas.
- **Ayuda Solidaria:** Peticiones ciudadanas ante emergencias (agua, alimentos, herramientas) con estados de atención.
- **Tablón Comunitario:** Avisos sobre incidentes de servicios básicos (luz, agua) corroborables por otros vecinos.
- **Mapa de Cobertura Aproximada:** Protección de privacidad sin divulgar coordenadas residenciales exactas.
- **Centro Offline y BLE Mesh:** Simulación interactiva de cola local en almacenamiento aislado, saltos de retransmisión Store-and-Forward y sincronización con el servidor central.

---

## 💻 Instrucciones para Ejecutar

### 1. Aplicación Móvil / Frontend (React + Vite + Capacitor)
```bash
# Instalar dependencias
npm install

# Iniciar interfaz móvil en navegador
npm run dev

# Sincronizar cambios a Android nativo
npm run sync:mobile
```

### 2. Backend API (FastAPI + SQLite/PostgreSQL)
```bash
# Entrar a la carpeta backend
cd backend

# Crear y activar entorno virtual Python
python -m venv .venv
.venv\Scripts\Activate.ps1    # En Windows PowerShell
# source .venv/bin/activate    # En Linux / Mac

# Instalar dependencias del backend
pip install -r requirements.txt

# Iniciar servidor API con auto-reload
uvicorn app.main:app --reload --port 8000
```
- **Documentación Swagger:** `http://127.0.0.1:8000/docs`
- **Health check:** `http://127.0.0.1:8000/health`
- **Usuarios de prueba:** `maria@ayni.pe`, `jose@ayni.pe`, `rosa@ayni.pe`, `pedro@ayni.pe` (clave: `ayni1234`)

---

## 🛠️ Stack Tecnológico Unificado

- **Frontend & Móvil:** React 19 + TypeScript + Vite + Capacitor (Android Nativo) + Leaflet / OpenStreetMap + Lucide Icons
- **Backend:** Python + FastAPI + SQLAlchemy + Pydantic v2 + OAuth2 / JWT
- **Persistencia:** SQLite (Local) / PostgreSQL + PostGIS (Producción)
- **Offline / Resiliencia:** Arquitectura Offline-First con encolamiento local y sincronización idempotente Store-and-Forward (`/api/v1/sync/batch`)
