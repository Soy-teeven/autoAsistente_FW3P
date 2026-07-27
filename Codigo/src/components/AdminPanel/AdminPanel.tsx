import React, { useState, useMemo, useEffect } from 'react';
import { FaUsers, FaCar, FaWrench, FaDollarSign, FaShieldAlt, FaLock } from 'react-icons/fa';
import { Vehicle, MaintenanceRecord } from '../../types';

import styles from './AdminPanel.module.css';

interface AdminUser {
  name: string;
  email: string;
  role: 'user' | 'admin';
  avatar?: string;
}

const normalizeUsers = (value: unknown): AdminUser[] => {
  if (!Array.isArray(value)) {
    return [
      { name: 'Admin General', email: 'admin@car.com', role: 'admin' },
      { name: 'Juan Conductor', email: 'conductor@car.com', role: 'user' },
    ];
  }

  return value
    .filter((item): item is Partial<AdminUser> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      name: typeof item.name === 'string' && item.name.trim() ? item.name.trim() : 'Usuario',
      email: typeof item.email === 'string' && item.email.trim() ? item.email.trim().toLowerCase() : 'sin-email@local',
      role: item.role === 'admin' ? 'admin' : 'user',
      avatar: typeof item.avatar === 'string' ? item.avatar : '',
    }));
};

const normalizeMaintenances = (value: unknown): MaintenanceRecord[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Partial<MaintenanceRecord> => Boolean(item) && typeof item === 'object')
    .map((item, index) => ({
      id: typeof item.id === 'string' && item.id ? item.id : `m-${Date.now()}-${index}`,
      vehicleId: typeof item.vehicleId === 'string' && item.vehicleId ? item.vehicleId : `v-${index}`,
      vehicleName: typeof item.vehicleName === 'string' && item.vehicleName.trim() ? item.vehicleName.trim() : 'Vehículo',
      pieceId: typeof item.pieceId === 'string' && item.pieceId ? item.pieceId : `p-${index}`,
      pieceName: typeof item.pieceName === 'string' && item.pieceName.trim() ? item.pieceName.trim() : 'Pieza',
      type: item.type === 'Correctivo' ? 'Correctivo' : 'Preventivo',
      date: typeof item.date === 'string' && item.date.trim() ? item.date.trim() : new Date().toISOString().split('T')[0],
      km: Number.isFinite(item.km) && item.km! >= 0 ? item.km! : 0,
      cost: Number.isFinite(item.cost) && item.cost! >= 0 ? item.cost! : 0,
      provider: typeof item.provider === 'string' && item.provider.trim() ? item.provider.trim() : 'Sin proveedor',
    }));
};

interface AdminPanelProps {
  userRole: 'user' | 'admin';
  vehicles: Vehicle[];
  onRedirectToDashboard: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  userRole,
  vehicles,
  onRedirectToDashboard
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'vehicles' | 'mantenimientos'>('users');

  // RF12: Bloqueo de seguridad si el rol es 'user'
  useEffect(() => {
    if (userRole !== 'admin') {
      alert("⚠️ Acceso denegado: El Panel de Administración está reservado exclusivamente para usuarios con rol 'admin'.");
      onRedirectToDashboard();
    }
  }, [userRole, onRedirectToDashboard]);

  // Cargar lista de usuarios registrados en LocalStorage
  const users = useMemo(() => {
    try {
      const localUsers = localStorage.getItem('users_database');
      return normalizeUsers(localUsers ? JSON.parse(localUsers) : null);
    } catch {
      return normalizeUsers(null);
    }
  }, []);

  // Cargar historial de mantenimientos globales de LocalStorage
  const maintenances: MaintenanceRecord[] = useMemo(() => {
    try {
      const history = localStorage.getItem('maintenance_history');
      return normalizeMaintenances(history ? JSON.parse(history) : null);
    } catch {
      return normalizeMaintenances(null);
    }
  }, [vehicles]);

  // KPI: Inversión Total Acumulada
  const totalInvestment = useMemo(() => {
    return maintenances.reduce((acc, curr) => acc + (curr.cost || 0), 0);
  }, [maintenances]);

  if (userRole !== 'admin') {
    return (
      <div className="alert alert-danger m-4 p-4 text-center">
        <FaLock className="fs-1 mb-3 text-danger" />
        <h3 className="fw-bold">Acceso Denegado (RF12)</h3>
        <p>No posees los permisos de Administrador para visualizar estas estadísticas globales.</p>
        <button className="btn-duo-3d btn-duo-primary mt-2" onClick={onRedirectToDashboard}>
          Volver al Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className={styles.adminContainer}>
      <header className={styles.adminHeader}>
        <div className={styles.iconWrapper}>
          <FaShieldAlt />
        </div>
        <h2>Panel Global de Administración (RF12)</h2>
        <p>Monitoreo consolidado del parque automotor, usuarios e inversión global.</p>
      </header>

      {/* Tarjetas KPI de Resumen Estadístico */}
      <section className={styles.kpiContainer}>
        <div className={`${styles.kpiCard} ${styles.kpiBlue}`}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Inversión Global</span>
            <FaDollarSign className={styles.kpiIcon} />
          </div>
          <div className={styles.kpiValue}>${totalInvestment.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className={styles.kpiSub}>Inversión acumulada en repuestos</div>
        </div>

        <div className={`${styles.kpiCard} ${styles.kpiGreen}`}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Parque Vehicular</span>
            <FaCar className={styles.kpiIcon} />
          </div>
          <div className={styles.kpiValue}>{vehicles.length}</div>
          <div className={styles.kpiSub}>Total de vehículos en sistema</div>
        </div>

        <div className={`${styles.kpiCard} ${styles.kpiOrange}`}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Mantenimientos</span>
            <FaWrench className={styles.kpiIcon} />
          </div>
          <div className={styles.kpiValue}>{maintenances.length}</div>
          <div className={styles.kpiSub}>Intervenciones registradas</div>
        </div>
      </section>

      {/* Tabs para explorar tablas */}
      <nav className={styles.tabsContainer} aria-label="Tablas de administración">
        <button
          className={`${styles.tabBtn} ${activeTab === 'users' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <FaUsers className="me-2" />
          Usuarios ({users.length})
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'vehicles' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('vehicles')}
        >
          <FaCar className="me-2" />
          Parque Vehicular ({vehicles.length})
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'mantenimientos' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('mantenimientos')}
        >
          <FaWrench className="me-2" />
          Mantenimientos ({maintenances.length})
        </button>
      </nav>

      {/* Tablas de Datos */}
      <main className={styles.tableCard}>
        {activeTab === 'users' && (
          <div className={styles.tableResponsive}>
            <table className={styles.customTable}>
              <thead>
                <tr>
                  <th>Avatar</th>
                  <th>Nombre Usuario</th>
                  <th>Correo de Contacto</th>
                  <th>Rol Asignado</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u: AdminUser, idx: number) => (
                  <tr key={idx}>
                    <td>
                      {u.avatar ? (
                        <img src={u.avatar} alt="Avatar" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <span className="badge bg-secondary">Sin Avatar</span>
                      )}
                    </td>
                    <td className="fw-bold">{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`badge ${u.role === 'admin' ? 'bg-danger' : 'bg-primary'}`}>
                        {u.role ? u.role.toUpperCase() : 'USER'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'vehicles' && (
          <div className={styles.tableResponsive}>
            <table className={styles.customTable}>
              <thead>
                <tr>
                  <th>Vehículo</th>
                  <th>Marca / Modelo / Año</th>
                  <th>Placa</th>
                  <th>VIN</th>
                  <th>Km Actual</th>
                  <th>Piezas Monitoreadas</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v: Vehicle) => (
                  <tr key={v.id}>
                    <td className="fw-bold">{v.name}</td>
                    <td>{v.brand || 'N/A'} {v.model || ''} ({v.year || 'N/A'})</td>
                    <td><code>{v.plate}</code></td>
                    <td><code>{v.vin || 'N/A'}</code></td>
                    <td>{v.currentKm.toLocaleString()} km</td>
                    <td><span className="badge bg-info text-dark">{v.pieces.length} Piezas</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'mantenimientos' && (
          <div className={styles.tableResponsive}>
            <table className={styles.customTable}>
              <thead>
                <tr>
                  <th>Vehículo</th>
                  <th>Pieza Intervenida</th>
                  <th>Tipo</th>
                  <th>Fecha</th>
                  <th>Km Servicio</th>
                  <th>Costo</th>
                  <th>Proveedor / Taller</th>
                </tr>
              </thead>
              <tbody>
                {maintenances.map((m: MaintenanceRecord) => (
                  <tr key={m.id}>
                    <td>{m.vehicleName}</td>
                    <td className="fw-bold">{m.pieceName}</td>
                    <td>
                      <span className={`badge ${m.type === 'Preventivo' ? 'bg-success' : 'bg-warning text-dark'}`}>
                        {m.type}
                      </span>
                    </td>
                    <td>{m.date}</td>
                    <td>{m.km.toLocaleString()} km</td>
                    <td className="fw-bold text-success">${m.cost.toFixed(2)}</td>
                    <td>{m.provider}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};
