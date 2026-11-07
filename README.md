# AYNI - Plataforma de Colaboración Vecinal y Resiliencia Comunitaria
*Propuesta y Prototipo para la Hackathon UTP – El Comercio 2026*

Ayni es una plataforma web y móvil diseñada para conectar vecinos y comunidades locales bajo dos ejes centrales:
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

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm run dev

# 3. Compilar para producción
npm run build
```

---

## 🛠️ Stack Tecnológico

- **Frontend:** React 19 + TypeScript + Vite + Lucide Icons
- **Offline / Local Data:** Arquitectura offline-first con SQLite / Store-and-Forward ready
- **Base de Datos Recomendada:** PostgreSQL + PostGIS (incluye script SQL en la documentación)
