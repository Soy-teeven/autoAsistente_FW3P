import { useState, useMemo, useEffect } from 'react';
import { Dashboard, MOCK_VEHICLES } from './components/Dashboard/Dashboard';
import { MileageModal } from './components/MileageModal/MileageModal';
import { NotificationCenter } from './components/NotificationCenter/NotificationCenter';
import { Auth } from './components/Auth/Auth';
import { UserProfile } from './components/UserProfile/UserProfile';
import { VehicleForm } from './components/VehicleForm/VehicleForm';
import { MaintenanceForm } from './components/MaintenanceForm/MaintenanceForm';
import { AdminPanel } from './components/AdminPanel/AdminPanel';
import { User, Vehicle, Piece } from './types';

import { FaWrench, FaPlusCircle, FaUser, FaShieldAlt, FaSun, FaMoon, FaBars, FaCar } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const readStoredJSON = <T,>(key: string, fallback: T): T => {
  try {
    const rawValue = localStorage.getItem(key);
    if (rawValue === null) {
      return fallback;
    }
    return JSON.parse(rawValue) as T;
  } catch {
    return fallback;
  }
};

const normalizeStoredUser = (value: unknown): User | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<User>;
  const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
  const email = typeof candidate.email === 'string' ? candidate.email.trim().toLowerCase() : '';

  if (!name || !email) {
    return null;
  }

  return {
    id: typeof candidate.id === 'string' && candidate.id ? candidate.id : `u-${Date.now()}`,
    name,
    email,
    password: typeof candidate.password === 'string' ? candidate.password : '',
    role: candidate.role === 'admin' ? 'admin' : 'user',
    avatar: typeof candidate.avatar === 'string' ? candidate.avatar : '',
  };
};

const normalizeStoredVehicles = (value: unknown, fallback: Vehicle[]): Vehicle[] => {
  if (!Array.isArray(value)) {
    return fallback;
  }

  return value
    .filter((item): item is Partial<Vehicle> => Boolean(item) && typeof item === 'object')
    .map((item, index) => {
      const candidate = item as Partial<Vehicle>;
      return {
        id: typeof candidate.id === 'string' && candidate.id ? candidate.id : `v-${Date.now()}-${index}`,
        userId: typeof candidate.userId === 'string' && candidate.userId ? candidate.userId : 'unknown-user',
        name: typeof candidate.name === 'string' && candidate.name.trim() ? candidate.name.trim() : 'Mi Vehículo',
        brand: typeof candidate.brand === 'string' && candidate.brand.trim() ? candidate.brand.trim() : 'Marca',
        model: typeof candidate.model === 'string' && candidate.model.trim() ? candidate.model.trim() : 'Modelo',
        year: Number.isInteger(candidate.year) ? candidate.year! : new Date().getFullYear(),
        plate: typeof candidate.plate === 'string' ? candidate.plate.trim().toUpperCase() : 'ABC-1234',
        vin: typeof candidate.vin === 'string' ? candidate.vin.trim().toUpperCase() : `1HGCR2F83HA${Math.floor(100000 + Math.random() * 900000)}`,
        initialKm: Number.isFinite(candidate.initialKm) && candidate.initialKm! >= 0 ? candidate.initialKm! : 0,
        currentKm: Number.isFinite(candidate.currentKm) && candidate.currentKm! >= 0 ? candidate.currentKm! : 0,
        pieces: Array.isArray(candidate.pieces)
          ? candidate.pieces.filter((piece): piece is Partial<Piece> => Boolean(piece) && typeof piece === 'object').map((piece, pieceIndex) => ({
              id: typeof piece.id === 'string' && piece.id ? piece.id : `p-${Date.now()}-${pieceIndex}`,
              name: typeof piece.name === 'string' && piece.name.trim() ? piece.name.trim() : 'Pieza',
              category: (piece.category as Piece['category']) || 'motor',
              lifeKm: Number.isFinite(piece.lifeKm) && piece.lifeKm! >= 0 ? piece.lifeKm! : 0,
              lifeMonths: Number.isFinite(piece.lifeMonths) && piece.lifeMonths! >= 0 ? piece.lifeMonths! : 0,
              lastChangeKm: Number.isFinite(piece.lastChangeKm) && piece.lastChangeKm! >= 0 ? piece.lastChangeKm! : 0,
              lastChangeDate: typeof piece.lastChangeDate === 'string' ? piece.lastChangeDate : new Date().toISOString().split('T')[0],
            }))
          : [],
      };
    });
};

function App() {
  // --- Estados de Sesión (RF01 / RF02) ---
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    return normalizeStoredUser(readStoredJSON('logged_user', null));
  });

  // --- Estados de Negocio y UI ---
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    return normalizeStoredVehicles(readStoredJSON('user_vehicles', null), MOCK_VEHICLES);
  });

  const [activeVehicleId, setActiveVehicleId] = useState<string>(() => {
    const savedActiveVehicleId = localStorage.getItem('active_vehicle_id');
    const initialVehicles = normalizeStoredVehicles(readStoredJSON('user_vehicles', null), MOCK_VEHICLES);
    if (savedActiveVehicleId && initialVehicles.some(v => v.id === savedActiveVehicleId)) {
      return savedActiveVehicleId;
    }
    return initialVehicles[0]?.id || MOCK_VEHICLES[0].id;
  });

  const [activeCategory, setActiveCategory] = useState<string>('todas');
  const [activeSection, setActiveSection] = useState<'dashboard' | 'new-vehicle' | 'profile' | 'admin'>('dashboard');
  const [isMenuExpanded, setIsMenuExpanded] = useState(false);

  // Modales
  const [isMileageModalOpen, setIsMileageModalOpen] = useState(false);
  const [selectedPieceForMaint, setSelectedPieceForMaint] = useState<Piece | null>(null);

  // Historial de alertas marcadas como leídas
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('read_notifications');
    return saved ? JSON.parse(saved) : [];
  });

  const [highlightedPieceId, setHighlightedPieceId] = useState<string | null>(null);

  // Tema visual (RF03)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('visual_theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    localStorage.setItem('user_vehicles', JSON.stringify(vehicles));
  }, [vehicles]);

  useEffect(() => {
    localStorage.setItem('active_vehicle_id', activeVehicleId);
  }, [activeVehicleId]);

  useEffect(() => {
    localStorage.setItem('read_notifications', JSON.stringify(readNotificationIds));
  }, [readNotificationIds]);

  useEffect(() => {
    localStorage.setItem('visual_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (vehicles.length > 0 && !vehicles.some(v => v.id === activeVehicleId)) {
      setActiveVehicleId(vehicles[0].id);
    }
  }, [activeVehicleId, vehicles]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('logged_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('logged_user');
  };

  const activeVehicle = useMemo(() => {
    return vehicles.find(v => v.id === activeVehicleId) || vehicles[0] || MOCK_VEHICLES[0];
  }, [vehicles, activeVehicleId]);

  const handleUpdateKm = (newKm: number) => {
    if (!Number.isFinite(newKm) || newKm < 0) {
      return;
    }

    const currentVehicle = vehicles.find(v => v.id === activeVehicleId);
    if (!currentVehicle || newKm < currentVehicle.currentKm) {
      return;
    }

    setVehicles(prevVehicles => 
      prevVehicles.map(v => 
        v.id === activeVehicleId 
          ? { ...v, currentKm: newKm } 
          : v
      )
    );
  };

  const handleAddVehicle = (newVehicle: Vehicle) => {
    const normalizedVehicle: Vehicle = {
      ...newVehicle,
      plate: newVehicle.plate.trim().toUpperCase(),
      vin: newVehicle.vin.trim().toUpperCase(),
      currentKm: Math.max(newVehicle.currentKm, newVehicle.initialKm),
    };

    if (vehicles.some(v => v.plate.toUpperCase() === normalizedVehicle.plate || v.vin.toUpperCase() === normalizedVehicle.vin)) {
      return;
    }

    setVehicles(prev => [...prev, normalizedVehicle]);
    setActiveVehicleId(normalizedVehicle.id);
  };

  const handleUpdatePiece = (updatedPiece: Piece) => {
    setVehicles(prevVehicles => 
      prevVehicles.map(v => {
        if (v.id === activeVehicleId) {
          return {
            ...v,
            pieces: v.pieces.map(p => p.id === updatedPiece.id ? updatedPiece : p)
          };
        }
        return v;
      })
    );
  };

  const handleRecordMaintenance = (
    pieceId: string, 
    lastChangeKm: number, 
    lastChangeDate: string, 
    cost: number, 
    provider: string,
    type: 'Preventivo' | 'Correctivo'
  ) => {
    if (!activeVehicle || !pieceId || !lastChangeDate.trim()) {
      return;
    }

    if (!Number.isFinite(lastChangeKm) || lastChangeKm < 0 || !Number.isFinite(cost) || cost <= 0 || !provider.trim()) {
      return;
    }

    const selectedPiece = activeVehicle.pieces.find(p => p.id === pieceId);
    if (!selectedPiece) {
      return;
    }

    setVehicles(prevVehicles => 
      prevVehicles.map(v => {
        if (v.id === activeVehicleId) {
          return {
            ...v,
            pieces: v.pieces.map(p => 
              p.id === pieceId 
                ? { ...p, lastChangeKm, lastChangeDate } 
                : p
            )
          };
        }
        return v;
      })
    );

    try {
      const history = readStoredJSON('maintenance_history', [] as Array<Record<string, unknown>>);
      const newRecord = {
        id: `m-hist-${Date.now()}`,
        vehicleId: activeVehicle.id,
        vehicleName: activeVehicle.name,
        pieceId,
        pieceName: selectedPiece.name,
        type,
        date: lastChangeDate,
        km: lastChangeKm,
        cost,
        provider,
      };
      history.push(newRecord);
      localStorage.setItem('maintenance_history', JSON.stringify(history));
    } catch {
      // Ignorar si el historial no se puede persistir
    }

    setReadNotificationIds(prev => [...prev, pieceId]);
  };

  const handleMarkAsRead = (alertId: string) => {
    if (!readNotificationIds.includes(alertId)) {
      setReadNotificationIds(prev => [...prev, alertId]);
    }
  };

  const handleMarkAllAsRead = (alertIds: string[]) => {
    setReadNotificationIds(prev => [
      ...prev,
      ...alertIds.filter(id => !prev.includes(id))
    ]);
  };

  const handleSelectNotification = (pieceId: string, category: string) => {
    setActiveSection('dashboard');
    setActiveCategory(category);
    setHighlightedPieceId(pieceId);

    setTimeout(() => {
      const element = document.getElementById(pieceId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };

  if (!currentUser) {
    return <Auth onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div>
      {/* Navbar Superior Profesional */}
      <nav className="navbar navbar-expand-lg border-bottom" style={{ backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-color) !important', padding: '12px 0', zIndex: 10 }}>
        <div className="container d-flex justify-content-between align-items-center">
          <button 
            className="navbar-brand fw-bold fs-4 btn btn-link p-0 d-flex align-items-center gap-2" 
            style={{ fontFamily: 'var(--font-heading)', textDecoration: 'none', color: 'var(--text-primary)' }}
            onClick={() => setActiveSection('dashboard')}
          >
            <div className="bg-primary text-white p-2 rounded-3 d-flex align-items-center justify-content-center" style={{ width: 36, height: 36 }}>
              <FaCar className="fs-5" />
            </div>
            <span className="fw-extrabold tracking-tight">iDrive</span>
          </button>
          
          <div className="d-flex align-items-center gap-3">
            {/* Tema Rápido */}
            <button 
              className="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-center" 
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              title="Cambiar tema visual"
              style={{ width: '38px', height: '38px', borderRadius: '8px' }}
            >
              {theme === 'light' ? <FaMoon /> : <FaSun />}
            </button>

            {/* Centro de Notificaciones */}
            <NotificationCenter 
              pieces={activeVehicle.pieces}
              currentKm={activeVehicle.currentKm}
              readIds={readNotificationIds}
              onMarkAsRead={handleMarkAsRead}
              onMarkAllAsRead={handleMarkAllAsRead}
              onSelectNotification={handleSelectNotification}
            />

            {/* Usuario Activo Badge */}
            <span 
              className="badge p-2 cursor-pointer d-none d-md-inline-flex align-items-center gap-2"
              style={{ 
                fontFamily: 'var(--font-heading)', 
                backgroundColor: 'var(--bg-input)', 
                color: 'var(--text-primary)', 
                border: '1px solid var(--border-color)', 
                borderRadius: '8px',
                padding: '6px 12px'
              }}
              onClick={() => setActiveSection('profile')}
            >
              {currentUser.avatar ? (
                <img src={currentUser.avatar} alt="Avatar" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <FaUser className="text-secondary" />
              )}
              <span>{currentUser.name} ({currentUser.role.toUpperCase()})</span>
            </span>
          </div>
        </div>
      </nav>

      {/* Estructura Responsiva de la SPA */}
      <div className="app-container-row d-flex" style={{ minHeight: 'calc(100vh - 65px)', backgroundColor: 'var(--bg-app)', transition: 'background-color var(--transition-normal)' }}>
        
        {/* Menú Lateral (Sidebar) - Hover en TODO el área del menú */}
        <motion.aside 
          className="sidebar-nav p-3 border-end d-flex flex-column gap-2"
          animate={{ width: isMenuExpanded ? 240 : 80 }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          onMouseEnter={() => setIsMenuExpanded(true)}
          onMouseLeave={() => setIsMenuExpanded(false)}
          style={{ 
            backgroundColor: 'var(--bg-card)', 
            borderRight: '1px solid var(--border-color)',
            flexShrink: 0,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            zIndex: 5
          }}
        >
          {/* Hamburguesa Toggle */}
          <div 
            className="d-flex align-items-center gap-3 mb-3 cursor-pointer"
            onClick={() => setIsMenuExpanded(!isMenuExpanded)}
            style={{ 
              minHeight: '40px', 
              padding: '0 10px', 
              color: 'var(--text-primary)',
              fontSize: '1.2rem'
            }}
          >
            <FaBars className="text-secondary" />
            {isMenuExpanded && (
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}
              >
                Menú
              </motion.span>
            )}
          </div>

          <button 
            onClick={() => setActiveSection('dashboard')}
            className={`btn-duo-3d w-100 d-flex align-items-center gap-3 ${activeSection === 'dashboard' ? 'btn-duo-primary' : 'btn-duo-secondary'}`}
            style={{ padding: '10px 14px', justifyContent: isMenuExpanded ? 'flex-start' : 'center' }}
            title="Dashboard"
          >
            <FaWrench style={{ flexShrink: 0 }} />
            {isMenuExpanded && <span>Dashboard</span>}
          </button>


          <button 
            onClick={() => setActiveSection('new-vehicle')}
            className={`btn-duo-3d w-100 d-flex align-items-center gap-3 ${activeSection === 'new-vehicle' ? 'btn-duo-primary' : 'btn-duo-secondary'}`}
            style={{ padding: '10px 14px', justifyContent: isMenuExpanded ? 'flex-start' : 'center' }}
            title="Nuevo Vehículo"
          >
            <FaPlusCircle style={{ flexShrink: 0 }} />
            {isMenuExpanded && <span>Nuevo Vehículo</span>}
          </button>

          <button 
            onClick={() => setActiveSection('profile')}
            className={`btn-duo-3d w-100 d-flex align-items-center gap-3 ${activeSection === 'profile' ? 'btn-duo-primary' : 'btn-duo-secondary'}`}
            style={{ padding: '10px 14px', justifyContent: isMenuExpanded ? 'flex-start' : 'center' }}
            title="Mi Perfil"
          >
            <FaUser style={{ flexShrink: 0 }} />
            {isMenuExpanded && <span>Mi Perfil</span>}
          </button>

          {currentUser.role === 'admin' && (
            <button 
              onClick={() => setActiveSection('admin')}
              className={`btn-duo-3d w-100 d-flex align-items-center gap-3 ${activeSection === 'admin' ? 'btn-duo-danger' : 'btn-duo-secondary'}`}
              style={{ padding: '10px 14px', justifyContent: isMenuExpanded ? 'flex-start' : 'center' }}
              title="Panel Admin"
            >
              <FaShieldAlt style={{ flexShrink: 0 }} />
              {isMenuExpanded && <span>Panel Admin</span>}
            </button>
          )}

          <div className="mt-auto pt-3 border-top text-center text-secondary small">
            {isMenuExpanded ? (
               <span>Sistema iDrive v1.0</span>
            ) : (
              <span>v1.0</span>
            )}
          </div>
        </motion.aside>

        {/* Área de Contenido Principal */}
        <main className="main-content flex-grow-1 p-4" style={{ overflowY: 'auto' }}>
          <AnimatePresence mode="wait">
            {activeSection === 'dashboard' && (
              <Dashboard 
                key="dashboard"
                role={currentUser.role}
                setRole={(newRole) => {
                  const updated = { ...currentUser, role: newRole };
                  setCurrentUser(updated);
                  localStorage.setItem('logged_user', JSON.stringify(updated));

                  try {
                    const db = readStoredJSON('users_database', [] as User[]);
                    const sync = db.map((u: User) => u.email === currentUser.email ? { ...u, role: newRole } : u);
                    localStorage.setItem('users_database', JSON.stringify(sync));
                  } catch {
                    // Ignorar si no se puede actualizar la base de usuarios
                  }
                }}
                activeVehicleId={activeVehicleId}
                setActiveVehicleId={setActiveVehicleId}
                activeCategory={activeCategory}
                setActiveCategory={setActiveCategory}
                vehicles={vehicles}
                onOpenMileageModal={() => setIsMileageModalOpen(true)}
                onOpenMaintenanceModal={setSelectedPieceForMaint}
                onUpdatePiece={handleUpdatePiece}
                highlightedPieceId={highlightedPieceId}
                setHighlightedPieceId={setHighlightedPieceId}
              />
            )}


            {activeSection === 'new-vehicle' && (
              <VehicleForm 
                key="new-vehicle"
                userId={currentUser.id}
                existingVehicles={vehicles}
                onAddVehicle={handleAddVehicle}
                onNavigateToDashboard={() => setActiveSection('dashboard')}
              />
            )}

            {activeSection === 'profile' && (
              <UserProfile 
                key="profile"
                user={currentUser}
                onLogout={handleLogout}
                theme={theme}
                setTheme={setTheme}
              />
            )}

            {activeSection === 'admin' && (
              <AdminPanel 
                key="admin"
                userRole={currentUser.role}
                vehicles={vehicles}
                onRedirectToDashboard={() => setActiveSection('dashboard')}
              />
            )}
          </AnimatePresence>
        </main>

      </div>

      {/* --- Modales --- */}
      <AnimatePresence>
        {isMileageModalOpen && (
          <MileageModal 
            isOpen={isMileageModalOpen}
            onClose={() => setIsMileageModalOpen(false)}
            currentKm={activeVehicle.currentKm}
            vehicleName={activeVehicle.name}
            onUpdateKm={handleUpdateKm}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedPieceForMaint && (
          <MaintenanceForm 
            isOpen={!!selectedPieceForMaint}
            onClose={() => setSelectedPieceForMaint(null)}
            piece={selectedPieceForMaint}
            currentVehicleKm={activeVehicle.currentKm}
            onRecordMaintenance={handleRecordMaintenance}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;