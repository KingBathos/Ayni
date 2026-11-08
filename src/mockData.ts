import { ServiceItem, CommunityPost, HelpRequest, Booking, ServiceCategory, CommunityActivity, ChatMessage, AppNotification } from './types';

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
    corroborations: 12,
    expiresAt: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
    chatThreadId: 'chat-post-1'
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
    corroborations: 5,
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    chatThreadId: 'chat-post-2'
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
    date: 'Hace 1 hora',
    expiresAt: new Date(Date.now() + 10 * 3600 * 1000).toISOString(),
    chatThreadId: 'chat-help-1'
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
    helperName: 'Pedro Quispe',
    expiresAt: new Date(Date.now() + 18 * 3600 * 1000).toISOString(),
    chatThreadId: 'chat-help-2'
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
  },
  {
    id: 'bk-rec-201',
    serviceId: 'srv-2',
    serviceTitle: 'Gasfitería rápida y detección de fugas',
    clientId: 'usr-c2',
    clientName: 'Rosa Meléndez (Vecina Sector 4)',
    providerId: 'usr-me',
    providerName: 'Tú (Profesional)',
    status: 'en_revision',
    date: 'Hoy, 02:29 p. m.',
    hasReview: false,
    notes: 'Tengo una fuga constante en la tubería bajo el lavadero. Requiere cambio de llave y empaques.',
    address: 'Pasaje Sol 142, San Borja',
    scheduledDate: 'Hoy, lo antes posible',
    timeline: {
      sentAt: 'Hoy, 02:29 p. m.',
      reviewedAt: 'Hoy, 02:30 p. m.'
    }
  },
  {
    id: 'bk-rec-202',
    serviceId: 'srv-1',
    serviceTitle: 'Reparaciones e Instalaciones Eléctricas de Emergencia',
    clientId: 'usr-c3',
    clientName: 'Carlos Rivas (Vecino Mz F)',
    providerId: 'usr-me',
    providerName: 'Tú (Profesional)',
    status: 'en_revision',
    date: 'Hoy, 01:15 p. m.',
    hasReview: false,
    notes: 'Se bajó la llave general y no sube. Por favor revisar el tablero de entrada.',
    address: 'Calle Andrea del Sarto 280, San Borja',
    scheduledDate: 'Hoy a partir de las 4:00 PM',
    timeline: {
      sentAt: 'Hoy, 01:15 p. m.',
      reviewedAt: 'Hoy, 01:20 p. m.'
    }
  },
  {
    id: 'bk-hist-1',
    serviceId: 'srv-3',
    serviceTitle: 'Carpintería y armado de muebles en melamina',
    clientId: 'usr-me',
    clientName: 'María (Tú)',
    providerId: 'usr-p3',
    providerName: 'Pedro Quispe',
    status: 'completado',
    date: 'Ayer, 4:10 p. m.',
    hasReview: true,
    notes: 'Armado de estante de cocina de 3 niveles.',
    address: 'Ciclovía Malachowsky, San Borja',
    scheduledDate: 'Ayer, 4:00 p. m.',
    timeline: {
      sentAt: 'Ayer, 3:30 p. m.',
      reviewedAt: 'Ayer, 3:35 p. m.',
      acceptedAt: 'Ayer, 3:40 p. m.',
      onTheWayAt: 'Ayer, 3:55 p. m.',
      inProgressAt: 'Ayer, 4:10 p. m.'
    }
  }
];

export const INITIAL_ACTIVITIES: CommunityActivity[] = [
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
    joined: false,
    expiresAt: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
    chatThreadId: 'chat-act-1'
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
    joined: false,
    expiresAt: new Date(Date.now() + 96 * 3600 * 1000).toISOString(),
    chatThreadId: 'chat-act-2'
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
    joined: false,
    expiresAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    chatThreadId: 'chat-act-3'
  }
];

export const INITIAL_CHAT_MESSAGES: Record<string, ChatMessage[]> = {
  'chat-post-1': [
    {
      id: 'msg-p1-1',
      threadId: 'chat-post-1',
      senderId: 'usr-junta',
      senderName: 'Junta Vecinal Manzana F',
      senderRole: 'oficial',
      text: 'Vecinos, Sedapal confirmó que la cisterna llegará a las 5:00 PM en el parque principal frente a la loza deportiva. Lleven recipientes limpios.',
      createdAt: new Date(Date.now() - 35 * 60000).toISOString(),
      timestampLabel: '11:20 a. m.',
      isPinned: true
    },
    {
      id: 'msg-p1-2',
      threadId: 'chat-post-1',
      senderId: 'usr-c2',
      senderName: 'Carlos Rivas',
      senderRole: 'vecino',
      text: '¿Saben si habrá límite de baldes por familia?',
      createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
      timestampLabel: '11:30 a. m.'
    },
    {
      id: 'msg-p1-3',
      threadId: 'chat-post-1',
      senderId: 'usr-junta',
      senderName: 'Junta Vecinal Manzana F',
      senderRole: 'oficial',
      text: 'Máximo 3 baldes grandes por vivienda en la primera vuelta para que alcance a todos los pasajes.',
      createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
      timestampLabel: '11:40 a. m.'
    }
  ],
  'chat-post-2': [
    {
      id: 'msg-p2-1',
      threadId: 'chat-post-2',
      senderId: 'usr-rosa',
      senderName: 'Rosa Meléndez',
      senderRole: 'autor',
      text: 'Pasaje Sol está totalmente a oscuras desde anoche. Por favor acompañar a los escolares.',
      createdAt: new Date(Date.now() - 80 * 60000).toISOString(),
      timestampLabel: '10:45 a. m.',
      isPinned: true
    },
    {
      id: 'msg-p2-2',
      threadId: 'chat-post-2',
      senderId: 'usr-enel',
      senderName: 'Serenazgo Cuadrante 3',
      senderRole: 'oficial',
      text: 'Móvil de serenazgo estará apostado en la esquina entre 7:00 PM y 10:00 PM.',
      createdAt: new Date(Date.now() - 40 * 60000).toISOString(),
      timestampLabel: '11:25 a. m.'
    }
  ],
  'chat-help-1': [
    {
      id: 'msg-h1-1',
      threadId: 'chat-help-1',
      senderId: 'usr-c1',
      senderName: 'Familia Mendoza',
      senderRole: 'autor',
      text: 'Mi mamá tiene 78 años y no puede cargar los bidones desde la pista. Se agradece cualquier mano solidaria.',
      createdAt: new Date(Date.now() - 50 * 60000).toISOString(),
      timestampLabel: '11:05 a. m.'
    },
    {
      id: 'msg-h1-2',
      threadId: 'chat-help-1',
      senderId: 'usr-juan',
      senderName: 'Juan Diego (Vecino Mz G)',
      senderRole: 'vecino',
      text: 'Hola Familia Mendoza, voy saliendo del trabajo y les llevo 2 bidones llenos en mi carretilla a las 4:30 PM.',
      createdAt: new Date(Date.now() - 20 * 60000).toISOString(),
      timestampLabel: '11:35 a. m.'
    }
  ],
  'chat-act-1': [
    {
      id: 'msg-a1-1',
      threadId: 'chat-act-1',
      senderId: 'usr-comite3',
      senderName: 'Comité Vecinal Sector 3',
      senderRole: 'oficial',
      text: 'Punto de encuentro: Puerta 2 del Parque Central a las 8:00 AM en punto. Habrá refrigerio para los voluntarios.',
      createdAt: new Date(Date.now() - 120 * 60000).toISOString(),
      timestampLabel: '09:00 a. m.',
      isPinned: true
    }
  ]
};

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    title: 'Corte imprevisto de agua en Sector 4',
    body: 'Sedapal informó reparación de matriz. Camión cisterna pasará a las 5:00 PM.',
    type: 'aviso',
    date: 'Hace 45 min',
    read: false,
    linkTab: 'avisos',
    chatThreadId: 'chat-post-1'
  },
  {
    id: 'notif-2',
    title: 'Nuevo mensaje en el chat vecinal',
    body: 'Juan Diego respondió a la petición de agua de Familia Mendoza.',
    type: 'chat',
    date: 'Hace 20 min',
    read: false,
    chatThreadId: 'chat-help-1'
  },
  {
    id: 'notif-3',
    title: 'Estado de servicio de Gasfitería',
    body: 'Carmen Morales ha aceptado tu encargo y se encuentra en camino.',
    type: 'servicio',
    date: 'Hace 1 hora',
    read: false,
    linkTab: 'servicios'
  },
  {
    id: 'notif-4',
    title: 'Faena Comunal este Sábado',
    body: 'Se necesitan voluntarios para la limpieza del parque comunal a las 8:00 AM.',
    type: 'aviso',
    date: 'Hace 3 horas',
    read: true,
    linkTab: 'actividades',
    chatThreadId: 'chat-act-1'
  }
];

