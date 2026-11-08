import { ServiceItem, CommunityPost, HelpRequest, Booking, Review, ServiceCategory } from './types';

export const INITIAL_CATEGORIES: ServiceCategory[] = [
  { id: 'electricidad', name: 'Electricidad', icon: 'Zap' },
  { id: 'gasfiteria', name: 'Gasfitería', icon: 'Wrench' },
  { id: 'carpinteria', name: 'Carpintería / Mueblería', icon: 'Hammer' },
  { id: 'limpieza', name: 'Limpieza y Cuidado', icon: 'Sparkles' },
  { id: 'educacion', name: 'Clases / Tutoría', icon: 'GraduationCap' },
  { id: 'comida', name: 'Alimentos / Viandas', icon: 'Utensils' },
];

export const INITIAL_SERVICES: ServiceItem[] = [
  {
    id: 'srv-1',
    providerId: 'usr-p1',
    providerName: 'José Ramírez (Técnico Certificado)',
    categoryId: 'electricidad',
    title: 'Reparaciones e Instalaciones Eléctricas de Emergencia',
    description: 'Diagnóstico de cortocircuitos, instalación de tableros, cableado general y luces led. Atención rápida en el sector.',
    priceType: 'fixed',
    priceAmount: 45,
    neighborhood: 'Zona B - San Juan / Los Robles',
    rating: 4.9,
    reviewCount: 14,
    jobsCompleted: 19,
    coverageArea: 'Radio de 3 km a la redonda',
    status: 'published'
  },
  {
    id: 'srv-2',
    providerId: 'usr-p2',
    providerName: 'Carmen Morales',
    categoryId: 'gasfiteria',
    title: 'Gasfitería rápida y detección de fugas',
    description: 'Cambio de grifería, desatoros, termos y bombas de agua para domicilios y pequeños locales.',
    priceType: 'quote',
    priceAmount: 35,
    neighborhood: 'Sector Central / Santa Rosa',
    rating: 4.8,
    reviewCount: 9,
    jobsCompleted: 12,
    coverageArea: 'Barrio Central y adyacentes',
    status: 'published'
  },
  {
    id: 'srv-3',
    providerId: 'usr-p3',
    providerName: 'Pedro Quispe',
    categoryId: 'carpinteria',
    title: 'Carpintería y armado de muebles en melamina',
    description: 'Reparación de puertas descuadradas, bisagras, armado de estantes y muebles de cocina.',
    priceType: 'quote',
    neighborhood: 'Zona Alta / El Mirador',
    rating: 5.0,
    reviewCount: 6,
    jobsCompleted: 8,
    coverageArea: 'Distrito completo',
    status: 'published'
  }
];

export const INITIAL_COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: 'post-1',
    authorName: 'Junta Vecinal Manzana F',
    category: 'corte_agua',
    title: 'Corte imprevisto de agua en Sector 4',
    body: 'Sedapal ha informado reparación de matriz principal. Camión cisterna pasará a las 5:00 PM frente al parque principal.',
    neighborhood: 'Sector Central / Santa Rosa',
    verificationStatus: 'corroborado',
    date: 'Hace 45 min',
    corroborations: 12
  },
  {
    id: 'post-2',
    authorName: 'Rosa Meléndez',
    category: 'seguridad',
    title: 'Alumbrado público sin funcionar en Pasaje Sol',
    body: 'Por favor transitar con precaución en la noche. Ya fue reportado a la cuadrilla municipal.',
    neighborhood: 'Zona B - San Juan',
    verificationStatus: 'reportado',
    date: 'Hace 2 horas',
    corroborations: 5
  }
];

export const INITIAL_HELP_REQUESTS: HelpRequest[] = [
  {
    id: 'help-1',
    authorName: 'Familia Mendoza',
    authorId: 'usr-c1',
    type: 'agua',
    description: 'Adulto mayor necesita 2 bidones de agua potable por corte prolongado. No puede cargar peso.',
    urgency: 'alta',
    neighborhood: 'Sector Central / Santa Rosa',
    status: 'abierta',
    date: 'Hace 1 hora'
  },
  {
    id: 'help-2',
    authorName: 'Lucas Huamán',
    authorId: 'usr-c2',
    type: 'herramientas',
    description: 'Préstamo de escalera telescópica por 2 horas para reparar canaleta antes de la lluvia.',
    urgency: 'media',
    neighborhood: 'Zona Alta / El Mirador',
    status: 'en_coordinacion',
    date: 'Hace 3 horas',
    helperName: 'Pedro Quispe'
  }
];

export const INITIAL_BOOKINGS: Booking[] = [
  {
    id: 'bk-101',
    serviceId: 'srv-1',
    serviceTitle: 'Reparaciones e Instalaciones Eléctricas de Emergencia',
    clientId: 'usr-me',
    clientName: 'María (Tú)',
    providerId: 'usr-p1',
    providerName: 'José Ramírez (Técnico Certificado)',
    status: 'en_camino',
    date: 'Hoy, 9:20 a. m.',
    hasReview: false,
    notes: 'Revisión urgente de térmico de la cocina.',
    address: 'Ciclovía Malachowsky, San Borja',
    scheduledDate: 'Hoy lo antes posible',
    timeline: {
      sentAt: 'Hoy, 9:20 a. m.',
      reviewedAt: 'Hoy, 9:25 a. m.',
      acceptedAt: 'Hoy, 9:30 a. m.',
      onTheWayAt: 'Hoy, 9:35 a. m.'
    }
  }
];

export const INITIAL_ACTIVITIES = [
  {
    id: 'act-1',
    title: 'Faena Comunal: Limpieza y Mantenimiento de Parque',
    organizer: 'Comité Vecinal Sector 3',
    date: 'Este Sábado · 8:00 AM',
    badge: 'Convocatoria abierta',
    badgeType: 'open' as const,
    description: 'Traer escobas, rastrillos y bolsas. La municipalidad aportará pintura y plantones para áreas verdes.',
    buttonText: 'Participar en la faena',
    participantsCount: 18,
    joined: false
  },
  {
    id: 'act-2',
    title: 'Olla Común y Taller de Nutrición Vecinal',
    organizer: 'Comité de Madres Unidas',
    date: 'Domingo · 12:30 PM',
    badge: 'Solidario',
    badgeType: 'solidarity' as const,
    description: 'Almuerzo solidario para adultos mayores y personas vulnerables de la zona. Se reciben aportes de víveres secos.',
    buttonText: 'Aportar víveres',
    participantsCount: 26,
    joined: false
  },
  {
    id: 'act-3',
    title: 'Reunión de Coordinación Vecinal y Alarma Comunitaria',
    organizer: 'Junta de Delegados',
    date: 'Viernes · 7:00 PM',
    badge: 'Presencial y Virtual',
    badgeType: 'meeting' as const,
    description: 'Balance de gestión de seguridad ciudadana y pruebas sonoras del nuevo sistema de sirenas comunitarias.',
    buttonText: 'Ver enlace de Zoom',
    participantsCount: 34,
    joined: false
  }
];

