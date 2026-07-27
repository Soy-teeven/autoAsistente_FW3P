export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // Hash con bcryptjs
  role: UserRole;
  avatar?: string; // Base64
}

export interface Piece {
  id: string;
  name: string;
  category: 'frenos' | 'suspensión' | 'motor' | 'transmisión' | 'eléctrico' | 'neumáticos' | 'enfriamiento' | 'dirección';
  lifeKm: number;
  lifeMonths: number;
  lastChangeKm: number;
  lastChangeDate: string; // Formato YYYY-MM-DD
}

export interface Vehicle {
  id: string;
  userId: string;
  name: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  vin: string; // 17 caracteres
  initialKm: number;
  currentKm: number;
  pieces: Piece[];
}

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  vehicleName: string;
  pieceId: string;
  pieceName: string;
  type: 'Preventivo' | 'Correctivo';
  date: string;
  km: number;
  cost: number;
  provider: string;
}

// --- TIPOS ADICIONALES PARA EL BACKEND Y LÓGICA DE NEGOCIO ---

export type TrafficLight = 'green' | 'yellow' | 'red';

export interface WearStatus {
  pieceId: string;
  wearKmPercent: number;
  wearMonthsPercent: number;
  currentLifePercent: number; // Max(wearKmPercent, wearMonthsPercent)
  status: TrafficLight;
  statusLabel: 'Óptimo' | 'Precaución' | 'Crítico';
  remainingKm: number;
  kmDrivenSinceChange: number;
}

export interface AppNotification {
  id: string;
  userId: string;
  vehicleId: string;
  pieceId: string;
  title: string;
  message: string;
  type: 'warning' | 'danger';
  isRead: boolean;
  createdAt: string;
}