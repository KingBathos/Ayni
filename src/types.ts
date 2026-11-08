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
  category: 'corte_agua' | 'corte_luz' | 'seguridad' | 'actividad' | 'general';
  title: string;
  body: string;
  neighborhood: string;
  verificationStatus: 'reportado' | 'corroborado' | 'oficial';
  date: string;
  corroborations: number;
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
}

export interface OfflineEnvelope {
  id: string;
  type: 'help_request' | 'booking_status';
  payload: any;
  createdAt: string;
  status: 'local' | 'retransmitido' | 'sincronizado';
  hops: number;
  hopLimit: number;
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
}


