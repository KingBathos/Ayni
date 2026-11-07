/**
 * Cliente API para conectar con el backend de Ayni (FastAPI).
 * Diseñado con tolerancia a fallos: si el backend no está disponible o la app está offline,
 * devuelve o almacena los datos localmente.
 */
import { Capacitor } from '@capacitor/core';

const API_URL_KEY = 'ayni_api_base_url';

export function getApiBaseUrl(): string {
  try {
    const saved = localStorage.getItem(API_URL_KEY);
    if (saved) return saved.replace(/\/+$/, '');
  } catch {}

  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl) return envUrl.replace(/\/+$/, '');

  // En Android nativo, "localhost" apunta al propio teléfono, no a tu PC.
  // - EMULADOR de Android Studio: 10.0.2.2 es un alias que llega a tu PC (localhost del PC).
  //   Funciona sin configurar nada, por eso es el valor por defecto.
  // - CELULAR FÍSICO (mismo WiFi que la PC): usa la IP local de tu PC, p. ej.
  //   http://192.168.1.8:8000 — cámbiala desde la app en
  //   Perfil → "Configuración de Servidor API".
  if (Capacitor.isNativePlatform()) {
    return 'https://ayni-backend-e0ts.onrender.com';
  }

  return 'http://localhost:8000';
}

const TOKEN_KEY = 'ayni_auth_token';
const USER_KEY = 'ayni_auth_user';

export interface BackendUser {
  id: string;
  display_name: string;
  email?: string;
  phone?: string;
  role: string;
  status: string;
  created_at: string;
  profile?: {
    neighborhood_id?: number;
    bio?: string;
    public_area_label?: string;
    photo_url?: string;
  };
}

export interface BackendCategory {
  id: number;
  name: string;
  icon?: string;
}

export interface BackendService {
  id: string;
  provider_id: string;
  provider_name?: string;
  category_id: number;
  category_name?: string;
  title: string;
  description: string;
  price_type: 'quote' | 'fixed' | 'hourly' | 'free';
  price_amount?: number;
  neighborhood_id?: number;
  coverage_area?: string;
  rating_avg?: number;
  rating_count?: number;
  jobs_completed?: number;
  status: string;
  created_at: string;
}

export const api = {
  getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  setToken(token: string) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {}
  },

  clearToken() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {}
  },

  getStoredUser(): any | null {
    try {
      const data = localStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  setStoredUser(user: any) {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {}
  },

  setApiBaseUrl(url: string) {
    try {
      localStorage.setItem(API_URL_KEY, url.trim().replace(/\/+$/, ''));
    } catch {}
  },

  resetApiBaseUrl() {
    try {
      localStorage.removeItem(API_URL_KEY);
    } catch {}
  },

  getBaseUrl(): string {
    return getApiBaseUrl();
  },

  async isOnline(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`${getApiBaseUrl()}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      return false;
    }
  },

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!headers['Content-Type'] && !(options.body instanceof FormData) && !(options.body instanceof URLSearchParams)) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMsg = `Error ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMsg = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
        }
      } catch {}
      throw new Error(errorMsg);
    }

    return response.json();
  },

  // ——— Autenticación ———
  async login(username: string, password: string): Promise<{ access_token: string; token_type: string }> {
    const body = new URLSearchParams();
    body.append('username', username);
    body.append('password', password);

    const data = await this.request<{ access_token: string; token_type: string }>('/api/v1/auth/login', {
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (data.access_token) {
      this.setToken(data.access_token);
    }
    return data;
  },

  async register(userData: {
    display_name: string;
    email?: string;
    phone?: string;
    password: string;
    role?: string;
    neighborhood_id?: number;
  }): Promise<{ access_token: string }> {
    const data = await this.request<{ access_token: string }>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    if (data.access_token) {
      this.setToken(data.access_token);
    }
    return data;
  },

  async getMe(): Promise<BackendUser> {
    const user = await this.request<BackendUser>('/api/v1/users/me');
    this.setStoredUser(user);
    return user;
  },

  // ——— Catálogos y Geografía ———
  async getCategories(): Promise<BackendCategory[]> {
    return this.request<BackendCategory[]>('/api/v1/service-categories');
  },

  async getNeighborhoods(districtId?: number): Promise<any[]> {
    const url = districtId ? `/api/v1/neighborhoods?district_id=${districtId}` : '/api/v1/neighborhoods';
    return this.request<any[]>(url);
  },

  // ——— Servicios ———
  async getServices(params?: { category_id?: number; q?: string; neighborhood_id?: number }): Promise<any[]> {
    const query = new URLSearchParams();
    if (params?.category_id) query.append('category_id', String(params.category_id));
    if (params?.q) query.append('q', params.q);
    if (params?.neighborhood_id) query.append('neighborhood_id', String(params.neighborhood_id));
    
    const qs = query.toString();
    return this.request<any[]>(`/api/v1/services${qs ? `?${qs}` : ''}`);
  },

  async createService(serviceData: {
    category_id: number;
    title: string;
    description: string;
    price_type?: string;
    price_amount?: number;
    neighborhood_id?: number;
  }): Promise<any> {
    return this.request<any>('/api/v1/services', {
      method: 'POST',
      body: JSON.stringify(serviceData),
    });
  },

  // ——— Contrataciones (Bookings) ———
  async getBookings(): Promise<any[]> {
    return this.request<any[]>('/api/v1/bookings');
  },

  async createBooking(bookingData: { service_id: string; scheduled_at?: string; notes?: string }): Promise<any> {
    return this.request<any>('/api/v1/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  },

  async updateBookingStatus(bookingId: string, status: string): Promise<any> {
    return this.request<any>(`/api/v1/bookings/${bookingId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async reviewBooking(bookingId: string, rating: number, comment?: string): Promise<any> {
    return this.request<any>(`/api/v1/bookings/${bookingId}/reviews`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment }),
    });
  },

  // ——— Comunidad y Solidaridad ———
  async getCommunityPosts(): Promise<any[]> {
    return this.request<any[]>('/api/v1/community/posts');
  },

  async createCommunityPost(post: { category: string; title: string; body: string; neighborhood_id?: number }): Promise<any> {
    return this.request<any>('/api/v1/community/posts', {
      method: 'POST',
      body: JSON.stringify(post),
    });
  },

  async getHelpRequests(): Promise<any[]> {
    return this.request<any[]>('/api/v1/help-requests');
  },

  async createHelpRequest(help: { type: string; description: string; urgency?: string; neighborhood_id?: number }): Promise<any> {
    return this.request<any>('/api/v1/help-requests', {
      method: 'POST',
      body: JSON.stringify({
        category: help.type,
        title: `Solicitud de ${help.type}`,
        description: help.description,
        neighborhood_id: help.neighborhood_id,
      }),
    });
  },

  async updateHelpStatus(id: string, status: string): Promise<any> {
    return this.request<any>(`/api/v1/help-requests/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  // ——— Mapa y Proximidad ———
  async getMapServicesNear(lat: number, lng: number, radiusKm: number = 5): Promise<any[]> {
    return this.request<any[]>(`/api/v1/map/services/near?lat=${lat}&lng=${lng}&radius_km=${radiusKm}`);
  },

  // ——— Sincronización Offline ———
  async syncBatch(operations: any[]): Promise<any> {
    return this.request<any>('/api/v1/sync/batch', {
      method: 'POST',
      body: JSON.stringify({ operations }),
    });
  },

  async getSyncChanges(since?: string): Promise<any> {
    const qs = since ? `?since=${encodeURIComponent(since)}` : '';
    return this.request<any>(`/api/v1/sync/changes${qs}`);
  },

  // ——— RENIEC: consulta de DNI para autocompletar nombres ———
  async lookupDni(dni: string): Promise<{
    dni: string;
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string;
    nombre_completo: string;
    source: 'reniec' | 'mock';
  }> {
    return this.request(`/api/v1/reniec/dni/${encodeURIComponent(dni)}`);
  },

  // ——— Verificación de correo por código (OTP) ———
  async requestEmailCode(email: string): Promise<{ sent: boolean; channel: 'email' | 'dev'; dev_code?: string }> {
    return this.request('/api/v1/otp/email/request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async verifyEmailCode(email: string, code: string): Promise<{ verified: boolean }> {
    return this.request('/api/v1/otp/email/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
  },
};

