export interface User {
  id: string;
  name: string;
  role: 'vecino' | 'proveedor';
  neighborhood: string;
  district: string;
  avatar: string;
  bio?: string;
  verified: boolean;
}

export interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
}

export interface ServiceItem {
  id: string;
  providerId: string;
  providerName: string;
  categoryId: string;
  title: string;
  description: string;
  priceType: 'quote' | 'fixed';
  priceAmount?: number;
  neighborhood: string;
  rating: number;
  reviewCount: number;
  jobsCompleted: number;
  coverageArea: string;
  status: 'published' | 'paused';
}

export type BookingStatus =
  | 'solicitado'
  | 'en_revision'
  | 'aceptado'
  | 'en_camino'
  | 'en_proceso'
  | 'completado'
  | 'rechazado'
  | 'cancelado';

export interface BookingTimeline {
  sentAt: string;
  reviewedAt?: string;
  acceptedAt?: string;
  onTheWayAt?: string;
  inProgressAt?: string;
  completedAt?: string;
}

export interface Booking {
  id: string;
  serviceId: string;
  serviceTitle: string;
  clientId: string;
  clientName: string;
  providerId: string;
  providerName: string;
  status: BookingStatus;
  date: string;
  hasReview: boolean;
  notes?: string;
  address?: string;
  scheduledDate?: string;
  photos?: string[];
  rejectionReason?: string;
  timeline?: BookingTimeline;
}

export interface Review {
  id: string;
  bookingId: string;
  reviewerName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface CommunityPost {
  id: string;
  authorName: string;
  authorId?: string;
  category: 'corte_agua' | 'corte_luz' | 'seguridad' | 'actividad' | 'general';
  title: string;
  body: string;
  neighborhood: string;
  verificationStatus: 'reportado' | 'corroborado' | 'oficial';
  date: string;
  corroborations: number;
  expiresAt?: string; // Fecha y hora límite hasta cuándo debe mostrarse (ISO)
  chatThreadId?: string;
}

export interface HelpRequest {
  id: string;
  authorName: string;
  authorId: string;
  type: 'agua' | 'alimentos' | 'herramientas' | 'transporte' | 'cuidado' | 'otro';
  description: string;
  urgency: 'alta' | 'media' | 'baja';
  neighborhood: string;
  status: 'abierta' | 'en_coordinacion' | 'atendida';
  date: string;
  helperName?: string;
  isOfflineCreated?: boolean;
  expiresAt?: string; // Fecha y hora límite de expiración (ISO)
  chatThreadId?: string;
}

export type OfflineHopsStep = 'guardado' | 'enviando' | 'recibido' | 'sincronizado';

export interface OfflineEnvelope {
  id: string;
  type: 'help_request' | 'booking_status';
  title?: string;
  description?: string;
  payload?: any;
  createdAt: string;
  timeAgo?: string;
  status: 'local' | 'retransmitido' | 'sincronizado';
  step?: OfflineHopsStep;
  hops: number;
  hopLimit: number;
  expiresIn?: string;
  statusText?: string;
  statusSubtext?: string;
}

export interface CommunityActivity {
  id: string;
  title: string;
  organizer: string;
  date: string;
  badge: string;
  badgeType: 'open' | 'solidarity' | 'meeting';
  description: string;
  buttonText: string;
  participantsCount: number;
  joined?: boolean;
  expiresAt?: string; // Fecha y hora límite de expiración (ISO)
  chatThreadId?: string;
}

// Estructura de Chat estilo WhatsApp para Avisos, Ayudas y Actividades
export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  senderRole?: 'vecino' | 'autor' | 'oficial';
  text: string;
  createdAt: string; // ISO
  timestampLabel: string; // ej. "11:45 a. m."
  isPinned?: boolean;
  isEdited?: boolean;
  editedAt?: string;
  deletedForEveryone?: boolean;
  deletedForUserIds?: string[];
  mediaUrl?: string; // Foto o video adjunto estilo WhatsApp
  mediaType?: 'image' | 'video';
}

export interface ChatThread {
  id: string;
  itemType: 'aviso' | 'ayuda' | 'actividad';
  itemId: string;
  itemTitle: string;
  neighborhood: string;
  pinnedMessageId?: string;
  joinedUserIds: string[];
}

// Sistema funcional de notificaciones y permisos
export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: 'aviso' | 'ayuda' | 'servicio' | 'chat' | 'sistema';
  date: string;
  read: boolean;
  linkTab?: 'avisos' | 'ayuda' | 'servicios' | 'actividades';
  chatThreadId?: string;
  serviceId?: string;
}


