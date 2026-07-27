import bcrypt from 'bcryptjs';
import { Piece, User, Vehicle } from '../types';

// Claves para el almacenamiento local (localStorage)
const STORAGE_KEYS = {
  USERS: 'users_database',
  CURRENT_USER: 'logged_user',
  VEHICLES: 'user_vehicles',
  ACTIVE_VEHICLE_ID: 'active_vehicle_id',
  THEME: 'visual_theme',
};

const LEGACY_KEYS = {
  USERS: 'app_users_db',
};

const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase());

const normalizeUser = (user: Partial<User>, fallbackId?: string): User => ({
  id: typeof user.id === 'string' && user.id ? user.id : fallbackId || `u-${Date.now()}`,
  name: typeof user.name === 'string' ? user.name.trim() : '',
  email: typeof user.email === 'string' ? user.email.trim().toLowerCase() : '',
  password: typeof user.password === 'string' ? user.password : '',
  role: user.role === 'admin' ? 'admin' : 'user',
  avatar: typeof user.avatar === 'string' ? user.avatar : '',
});

const normalizePiece = (piece: Partial<Piece>): Piece => ({
  id: typeof piece.id === 'string' && piece.id ? piece.id : `p-${Date.now()}`,
  name: typeof piece.name === 'string' && piece.name.trim() ? piece.name.trim() : 'Pieza',
  category: (piece.category as Piece['category']) || 'motor',
  lifeKm: Number.isFinite(piece.lifeKm) ? piece.lifeKm! : 0,
  lifeMonths: Number.isFinite(piece.lifeMonths) ? piece.lifeMonths! : 0,
  lastChangeKm: Number.isFinite(piece.lastChangeKm) ? piece.lastChangeKm! : 0,
  lastChangeDate: typeof piece.lastChangeDate === 'string' ? piece.lastChangeDate : new Date().toISOString().split('T')[0],
});

const normalizeVehicle = (vehicle: Partial<Vehicle>, fallbackId?: string): Vehicle => ({
  id: typeof vehicle.id === 'string' && vehicle.id ? vehicle.id : fallbackId || `v-${Date.now()}`,
  userId: typeof vehicle.userId === 'string' && vehicle.userId ? vehicle.userId : 'unknown-user',
  name: typeof vehicle.name === 'string' && vehicle.name.trim() ? vehicle.name.trim() : 'Mi Vehículo',
  brand: typeof vehicle.brand === 'string' && vehicle.brand.trim() ? vehicle.brand.trim() : 'Marca',
  model: typeof vehicle.model === 'string' && vehicle.model.trim() ? vehicle.model.trim() : 'Modelo',
  year: Number.isInteger(vehicle.year) ? vehicle.year! : new Date().getFullYear(),
  plate: typeof vehicle.plate === 'string' ? vehicle.plate.trim().toUpperCase() : '',
  vin: typeof vehicle.vin === 'string' ? vehicle.vin.trim().toUpperCase() : '',
  initialKm: Number.isFinite(vehicle.initialKm) && vehicle.initialKm! >= 0 ? vehicle.initialKm! : 0,
  currentKm: Number.isFinite(vehicle.currentKm) && vehicle.currentKm! >= 0 ? vehicle.currentKm! : 0,
  pieces: Array.isArray(vehicle.pieces) ? vehicle.pieces.map(normalizePiece) : [],
});

// Funciones auxiliares para leer y escribir en localStorage
const getFromStorage = <T>(keys: string | string[], defaultValue: T): T => {
  const keyList = Array.isArray(keys) ? keys : [keys];

  for (const key of keyList) {
    try {
      const data = localStorage.getItem(key);
      if (data !== null) {
        return data ? JSON.parse(data) : defaultValue;
      }
    } catch {
      continue;
    }
  }

  return defaultValue;
};

const saveToStorage = <T>(key: string, data: T): void => {
  localStorage.setItem(key, JSON.stringify(data));
};

const getUsersFromStorage = (): User[] => {
  const rawUsers = getFromStorage<User[]>([STORAGE_KEYS.USERS, LEGACY_KEYS.USERS], []);
  if (!Array.isArray(rawUsers)) {
    return [];
  }

  return rawUsers
    .filter((u): u is any => Boolean(u) && typeof u === 'object')
    .map((u, index) => normalizeUser(u, `u-${Date.now()}-${index}`));
};

const saveUsersToStorage = (users: User[]): void => {
  saveToStorage(STORAGE_KEYS.USERS, users);
};

export const storageService = {
  // --- MÓDULO DE AUTENTICACIÓN Y USUARIOS ---

  // Registra un nuevo usuario encriptando su contraseña
  registerUser: async (name: string, email: string, password: string, avatar?: string): Promise<User> => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedName || trimmedName.length < 2) {
      throw new Error('El nombre debe tener al menos 2 caracteres');
    }

    if (!isValidEmail(trimmedEmail)) {
      throw new Error('Formato de correo inválido');
    }

    if (trimmedPassword.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }

    const users = getUsersFromStorage();

    if (users.some(u => u.email.toLowerCase() === trimmedEmail)) {
      throw new Error('El correo electrónico ya se encuentra registrado');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(trimmedPassword, salt);

    const newUser: User = {
      id: `u-${Date.now()}`,
      name: trimmedName,
      email: trimmedEmail,
      password: passwordHash,
      role: 'user',
      avatar: avatar || '',
    };

    users.push(newUser);
    saveUsersToStorage(users);
    saveToStorage(STORAGE_KEYS.CURRENT_USER, newUser);
    return newUser;
  },

  // Valida las credenciales e inicia sesión
  loginUser: async (email: string, password: string): Promise<User> => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!isValidEmail(trimmedEmail)) {
      throw new Error('Formato de correo inválido');
    }

    const users = getUsersFromStorage();
    const user = users.find(u => u.email.toLowerCase() === trimmedEmail);

    if (!user) {
      throw new Error('Credenciales inválidas');
    }

    const isMatch = await bcrypt.compare(trimmedPassword, user.password);
    if (!isMatch) {
      throw new Error('Credenciales inválidas');
    }

    saveToStorage(STORAGE_KEYS.CURRENT_USER, user);
    return user;
  },

  // Retorna la sesión del usuario actual
  getCurrentUser: (): User | null => {
    const current = getFromStorage<User | null>([STORAGE_KEYS.CURRENT_USER], null);
    if (!current || typeof current !== 'object') {
      return null;
    }

    return normalizeUser(current, current.id || `u-${Date.now()}`);
  },

  // Cierra la sesión activa
  logout: (): void => {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  },

  // --- MÓDULO DE GESTIÓN DE VEHÍCULOS ---

  // Obtiene los vehículos guardados
  getVehicles: (): Vehicle[] => {
    const rawVehicles = getFromStorage<Vehicle[]>([STORAGE_KEYS.VEHICLES], []);
    if (!Array.isArray(rawVehicles)) {
      return [];
    }

    return rawVehicles
      .filter((v): v is any => Boolean(v) && typeof v === 'object')
      .map((v, index) => normalizeVehicle(v, `v-${Date.now()}-${index}`));
  },

  // Guarda la lista completa de vehículos
  saveVehicles: (vehicles: Vehicle[]): void => {
    const normalizedVehicles = vehicles.map((vehicle, index) => normalizeVehicle(vehicle, `v-${Date.now()}-${index}`));

    if (normalizedVehicles.some(v => v.currentKm < v.initialKm)) {
      throw new Error('El kilometraje actual no puede ser menor al kilometraje inicial');
    }

    saveToStorage(STORAGE_KEYS.VEHICLES, normalizedVehicles);
  },

  // Actualiza el kilometraje validando que no sea inferior al registrado
  updateVehicleKm: (vehicleId: string, newKm: number): Vehicle[] => {
    if (!Number.isFinite(newKm) || newKm < 0) {
      throw new Error('El kilometraje debe ser un número mayor o igual a cero');
    }

    const vehicles = storageService.getVehicles();
    const updated = vehicles.map(v => {
      if (v.id === vehicleId) {
        if (newKm < v.currentKm) {
          throw new Error('El kilometraje no puede ser inferior al actual registrado');
        }
        return { ...v, currentKm: newKm };
      }
      return v;
    });

    storageService.saveVehicles(updated);
    return updated;
  },
};