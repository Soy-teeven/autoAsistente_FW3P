export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // bcryptjs hash
  role: 'user' | 'admin';
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
