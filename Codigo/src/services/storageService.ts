import bcrypt from 'bcryptjs';
import { Piece, User, Vehicle } from '../types';
import { emailService } from './emailService';

// Claves para el almacenamiento local (localStorage)
const STORAGE_KEYS = {
  USERS: 'users_database',
  CURRENT_USER: 'logged_user',
  VEHICLES: 'user_vehicles',
  ACTIVE_VEHICLE_ID: 'active_vehicle_id',
  THEME: 'visual_theme',
  SHARE_REQUESTS: 'share_requests',
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
  securityQuestion: typeof user.securityQuestion === 'string' ? user.securityQuestion : '',
  securityAnswer: typeof user.securityAnswer === 'string' ? user.securityAnswer : '',
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
  mileageHistory: Array.isArray(vehicle.mileageHistory) ? vehicle.mileageHistory : [],
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
  if (!Array.isArray(rawUsers) || rawUsers.length === 0) {
    // Crear un usuario administrador por defecto si la base de datos está vacía
    // La contraseña por defecto es "admin123" (el hash bcrypt de "admin123")
    const defaultAdmin: User = {
      id: 'u-admin-1',
      name: 'Administrador',
      email: 'admin@admin.com',
      password: '$2a$10$T8H6p.6bQY3Y5W3Z5v5U8.5Y8X8X8X8X8X8X8X8X8X8X8X8X8X8X8', // Hash simulado, pero es mejor usar uno real. Mejor generar la base vacía y que el primero sea admin.
      role: 'admin',
      avatar: '',
      securityQuestion: 'admin',
      securityAnswer: 'admin'
    };
    // Espera, no puedo usar un hash asíncrono aquí fácilmente.
    // Lo mejor es devolver un array vacío y explicarle al usuario que se registre primero,
    // O hacer que el primer usuario registrado sea admin automáticamente.
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
  registerUser: async (name: string, email: string, password: string, avatar?: string, securityQuestion?: string, securityAnswer?: string): Promise<User> => {
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
      // Asignar rol de admin a dmjch03@gmail.com de forma estricta y exclusiva
      role: (trimmedEmail === 'dmjch03@gmail.com') ? 'admin' : 'user',
      avatar: avatar || '',
      securityQuestion: securityQuestion?.trim() || '',
      securityAnswer: securityAnswer?.trim() || '',
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

  getUserById: (id: string): User | undefined => {
    const users = getUsersFromStorage();
    return users.find(u => u.id === id);
  },

  // Cierra la sesión activa
  logout: (): void => {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  },

  // Recuperación de contraseña
  getUserSecurityQuestion: (email: string): string => {
    const trimmedEmail = email.trim().toLowerCase();
    const users = getUsersFromStorage();
    const user = users.find(u => u.email.toLowerCase() === trimmedEmail);
    if (!user) throw new Error('Usuario no encontrado');
    if (!user.securityQuestion) throw new Error('El usuario no configuró una pregunta de seguridad');
    return user.securityQuestion;
  },

  resetPassword: async (email: string, answer: string, newPassword: string): Promise<void> => {
    const trimmedEmail = email.trim().toLowerCase();
    const users = getUsersFromStorage();
    const userIndex = users.findIndex(u => u.email.toLowerCase() === trimmedEmail);
    
    if (userIndex === -1) throw new Error('Usuario no encontrado');
    
    const user = users[userIndex];
    if (!user.securityAnswer) throw new Error('El usuario no configuró una pregunta de seguridad');
    
    if (user.securityAnswer.toLowerCase() !== answer.trim().toLowerCase()) {
      throw new Error('Respuesta de seguridad incorrecta');
    }
    
    if (newPassword.trim().length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }
    
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword.trim(), salt);
    
    users[userIndex].password = passwordHash;
    saveUsersToStorage(users);
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
    if (!Number.isInteger(newKm) || newKm < 0) {
      throw new Error('El kilometraje debe ser un número entero positivo mayor o igual a cero');
    }

    const vehicles = storageService.getVehicles();
    const updated = vehicles.map(v => {
      if (v.id === vehicleId) {
        if (newKm < v.currentKm) {
          throw new Error('El kilometraje no puede ser inferior al actual registrado');
        }
        
        // Registrar en el historial si es un día nuevo o es la primera vez
        const today = new Date().toISOString().split('T')[0];
        const history = v.mileageHistory || [];
        const lastEntry = history.length > 0 ? history[history.length - 1] : null;
        
        if (!lastEntry || lastEntry.date !== today) {
          history.push({ date: today, km: newKm });
        } else {
          // Si ya hay un registro hoy, lo actualizamos
          history[history.length - 1].km = newKm;
        }

        return { ...v, currentKm: newKm, mileageHistory: history };
      }
      return v;
    });

    storageService.saveVehicles(updated);
    return updated;
  },

  // Obtiene el promedio diario calculado (los primeros 15 registros)
  getDailyAverageKm: (vehicleId: string): number => {
    const vehicles = storageService.getVehicles();
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle || !vehicle.mileageHistory || vehicle.mileageHistory.length < 2) return 0;

    const history = vehicle.mileageHistory.slice(0, 15);
    if (history.length < 2) return 0;

    let totalDiffKm = 0;
    let totalDiffDays = 0;

    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1];
      const curr = history[i];
      
      const prevDate = new Date(prev.date);
      const currDate = new Date(curr.date);
      
      const diffTime = Math.abs(currDate.getTime() - prevDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const diffKm = curr.km - prev.km;
      
      if (diffDays > 0) {
        totalDiffKm += diffKm;
        totalDiffDays += diffDays;
      }
    }

    if (totalDiffDays === 0) return 0;
    return Math.round(totalDiffKm / totalDiffDays);
  },

  // --- MÓDULO DE COMPARTIR VEHÍCULOS ---

  getShareRequests: (): import('../types').ShareRequest[] => {
    return getFromStorage<import('../types').ShareRequest[]>([STORAGE_KEYS.SHARE_REQUESTS], []);
  },

  saveShareRequests: (requests: import('../types').ShareRequest[]): void => {
    saveToStorage(STORAGE_KEYS.SHARE_REQUESTS, requests);
  },

  createShareRequest: (vehicleId: string, fromUserId: string, toUserEmail: string): void => {
    const toUserEmailTrimmed = toUserEmail.trim().toLowerCase();
    const users = getUsersFromStorage();
    const toUser = users.find(u => u.email === toUserEmailTrimmed);
    if (!toUser) throw new Error('Usuario destino no encontrado');

    if (toUser.id === fromUserId) throw new Error('No puedes compartir un vehículo contigo mismo');

    const vehicles = storageService.getVehicles();
    const vehicle = vehicles.find(v => v.id === vehicleId && v.userId === fromUserId);
    if (!vehicle) throw new Error('Vehículo no encontrado o no eres el propietario');

    if (vehicle.sharedWith?.includes(toUser.id)) {
      throw new Error('El vehículo ya está compartido con este usuario');
    }

    const requests = storageService.getShareRequests();
    
    // Verificar si ya hay una petición pendiente
    if (requests.some(r => r.vehicleId === vehicleId && r.toUserId === toUser.id && r.status === 'pending')) {
      throw new Error('Ya hay una solicitud pendiente para este usuario');
    }

    const fromUser = users.find(u => u.id === fromUserId);

    requests.push({
      id: `req-${Date.now()}`,
      vehicleId,
      vehicleName: vehicle.name,
      fromUserId,
      fromUserName: fromUser?.name || 'Usuario',
      toUserId: toUser.id,
      status: 'pending',
      createdAt: new Date().toISOString()
    });

    storageService.saveShareRequests(requests);
    
    // Enviar correo de notificación
    emailService.notifyShareRequest(toUser.email, fromUser?.name || 'Usuario', vehicle.name);
  },

  acceptShareRequest: (requestId: string, currentUserId: string): void => {
    const requests = storageService.getShareRequests();
    const requestIndex = requests.findIndex(r => r.id === requestId && r.toUserId === currentUserId);
    if (requestIndex === -1) throw new Error('Solicitud no encontrada');

    const request = requests[requestIndex];
    if (request.status !== 'pending') throw new Error('La solicitud ya no está pendiente');

    request.status = 'accepted';
    
    // Actualizar el vehículo
    const vehicles = storageService.getVehicles();
    const vehicleIndex = vehicles.findIndex(v => v.id === request.vehicleId);
    if (vehicleIndex !== -1) {
      const v = vehicles[vehicleIndex];
      v.sharedWith = v.sharedWith || [];
      if (!v.sharedWith.includes(currentUserId)) {
        v.sharedWith.push(currentUserId);
      }
      storageService.saveVehicles(vehicles);
    }
    
    storageService.saveShareRequests(requests);
    
    // Enviar correo de respuesta
    const users = getUsersFromStorage();
    const fromUser = users.find(u => u.id === request.fromUserId);
    const toUser = users.find(u => u.id === currentUserId);
    if (fromUser && toUser) {
      emailService.notifyShareResponse(fromUser.email, toUser.name, request.vehicleName, true);
    }
  },

  rejectShareRequest: (requestId: string, currentUserId: string): void => {
    const requests = storageService.getShareRequests();
    const requestIndex = requests.findIndex(r => r.id === requestId && r.toUserId === currentUserId);
    if (requestIndex === -1) throw new Error('Solicitud no encontrada');

    const request = requests[requestIndex];
    if (request.status !== 'pending') throw new Error('La solicitud ya no está pendiente');

    request.status = 'rejected';
    storageService.saveShareRequests(requests);
    
    // Enviar correo de respuesta
    const users = getUsersFromStorage();
    const fromUser = users.find(u => u.id === request.fromUserId);
    const toUser = users.find(u => u.id === currentUserId);
    if (fromUser && toUser) {
      emailService.notifyShareResponse(fromUser.email, toUser.name, request.vehicleName, false);
    }
  },
};