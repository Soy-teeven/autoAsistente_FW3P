import bcrypt from 'bcryptjs';
import { User, Vehicle } from '../types';

const STORAGE_KEYS = {
  USERS: 'app_users_db',
  CURRENT_USER: 'logged_user',
  VEHICLES: 'user_vehicles',
  ACTIVE_VEHICLE_ID: 'active_vehicle_id',
  THEME: 'visual_theme',
};

const getFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

const saveToStorage = <T>(key: string, data: T): void => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const storageService = {
  // --- USUARIOS & AUTENTICACIÓN (RF01, RF02, RNF01) ---
  registerUser: async (name: string, email: string, password: string, avatar?: string): Promise<User> => {
    const users = getFromStorage<User[]>(STORAGE_KEYS.USERS, []);
    
    // Validación de unicidad de correo (RF01)
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('El correo electrónico ya se encuentra registrado');
    }

    // Cifrado de contraseña obligatorio con bcryptjs (RNF01 / RF01)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser: User = {
      id: `u-${Date.now()}`,
      name,
      email,
      password: passwordHash,
      role: 'user',
      avatar: avatar || ''
    };

    users.push(newUser);
    saveToStorage(STORAGE_KEYS.USERS, users);
    saveToStorage(STORAGE_KEYS.CURRENT_USER, newUser);
    return newUser;
  },

  loginUser: async (email: string, password: string): Promise<User> => {
    const users = getFromStorage<User[]>(STORAGE_KEYS.USERS, []);
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      throw new Error('Credenciales inválidas');
    }

    // Validación de credenciales cifradas (RF02)
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Credenciales inválidas');
    }

    saveToStorage(STORAGE_KEYS.CURRENT_USER, user);
    return user;
  },

  getCurrentUser: (): User | null => {
    return getFromStorage<User | null>(STORAGE_KEYS.CURRENT_USER, null);
  },

  logout: (): void => {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  },

  // --- PERSISTENCIA LOCAL (RNF03) ---
  getVehicles: (): Vehicle[] => {
    return getFromStorage<Vehicle[]>(STORAGE_KEYS.VEHICLES, []);
  },

  saveVehicles: (vehicles: Vehicle[]): void => {
    saveToStorage(STORAGE_KEYS.VEHICLES, vehicles);
  },

  updateVehicleKm: (vehicleId: string, newKm: number): Vehicle[] => {
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
  }
};