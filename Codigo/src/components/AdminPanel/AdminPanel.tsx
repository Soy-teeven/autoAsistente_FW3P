import React, { useState, useMemo, useEffect } from 'react';
import { FaUsers, FaCar, FaWrench, FaDollarSign, FaShieldAlt, FaLock } from 'react-icons/fa';
import { Vehicle, MaintenanceRecord } from '../../types';
import { storageService } from '../../services/storageService';
import { emailService } from '../../services/emailService';

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
  const [activeTab, setActiveTab] = useState<'users' | 'vehiclesByUser' | 'vehicles' | 'mantenimientos' | 'adminAlerts'>('users');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  
  // Modals state
  const [editingUser, setEditingUser] = useState<AdminUser & { id: string } | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const [localUsers, setLocalUsers] = useState<any[]>([]);
  const [localMaintenances, setLocalMaintenances] = useState<MaintenanceRecord[]>([]);

  // Filters for Maintenances
  const [maintUserFilter, setMaintUserFilter] = useState<string>('');
  const [maintVehicleFilter, setMaintVehicleFilter] = useState<string>('');

  // RF12: Bloqueo de seguridad si el rol es 'user'
  useEffect(() => {
    if (userRole !== 'admin') {
      alert("⚠️ Acceso denegado: El Panel de Administración está reservado exclusivamente para usuarios con rol 'admin'.");
      onRedirectToDashboard();
    }
  }, [userRole, onRedirectToDashboard]);

  // Cargar lista de usuarios registrados en LocalStorage
  useEffect(() => {
    try {
      const storedUsers = localStorage.getItem('users_database');
      const parsed = storedUsers ? JSON.parse(storedUsers) : [];
      setLocalUsers(parsed);
    } catch {
      setLocalUsers([]);
    }
  }, []);

  const users = useMemo(() => {
    return normalizeUsers(localUsers);
  }, [localUsers]);

  // Cargar historial de mantenimientos globales de LocalStorage
  useEffect(() => {
    try {
      const history = localStorage.getItem('maintenance_history');
      setLocalMaintenances(normalizeMaintenances(history ? JSON.parse(history) : null));
    } catch {
      setLocalMaintenances([]);
    }
  }, [vehicles]);

  const maintenances = localMaintenances;

  // Filtered Maintenances
  const filteredMaintenances = useMemo(() => {
    return maintenances.filter(m => {
      // Find the vehicle to know its owner
      const vehicle = vehicles.find(v => v.id === m.vehicleId);
      if (maintUserFilter && vehicle?.userId !== maintUserFilter) return false;
      if (maintVehicleFilter && m.vehicleId !== maintVehicleFilter) return false;
      return true;
    });
  }, [maintenances, vehicles, maintUserFilter, maintVehicleFilter]);

  // KPI: Inversión Total Acumulada
  const totalInvestment = useMemo(() => {
    return maintenances.reduce((acc, curr) => acc + (curr.cost || 0), 0);
  }, [maintenances]);

  // Admin Alerts calculation
  const adminAlerts = useMemo(() => {
    const alerts: any[] = [];
    vehicles.forEach(v => {
      v.pieces.forEach(p => {
        const kmDriven = Math.max(0, v.currentKm - p.lastChangeKm);
        const wearPercentage = Math.round(Math.max((kmDriven / (p.lifeKm || 10000)), 0) * 100);
        if (wearPercentage >= 75) {
          const owner = localUsers.find(u => u.id === v.userId);
          alerts.push({
            vehicle: v.name,
            owner: owner ? owner.name : 'Desconocido',
            ownerEmail: owner ? owner.email : '',
            piece: p.name,
            wear: wearPercentage,
            currentKm: v.currentKm,
            status: wearPercentage >= 90 ? 'Vencido' : 'Próximo'
          });
        }
      });
    });
    return alerts;
  }, [vehicles, localUsers]);

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    const updatedUsers = localUsers.map(u => u.id === editingUser.id ? { ...u, name: editingUser.name, role: editingUser.role } : u);
    setLocalUsers(updatedUsers);
    localStorage.setItem('users_database', JSON.stringify(updatedUsers));
    setEditingUser(null);
  };

  const handleSaveVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;
    try {
      const allVehicles = storageService.getVehicles();
      const updated = allVehicles.map((v: Vehicle) => v.id === editingVehicle.id ? editingVehicle : v);
      storageService.saveVehicles(updated);
      setEditingVehicle(null);
      alert("Vehículo actualizado. Los cambios se verán reflejados al cambiar de pestaña o recargar.");
    } catch (err: any) {
      alert(`Error al guardar vehículo: ${err.message}`);
    }
  };

  const handleResendNotification = async (alertItem: any) => {
    if (!alertItem.ownerEmail) {
      alert("No se puede enviar correo: el usuario no tiene email registrado.");
      return;
    }
    try {
      await emailService.notifyMaintenanceDue(
        alertItem.ownerEmail, 
        alertItem.owner, 
        alertItem.vehicle, 
        alertItem.piece, 
        alertItem.status, 
        alertItem.currentKm
      );
      alert(`Correo enviado exitosamente a ${alertItem.owner} (${alertItem.ownerEmail}).`);
    } catch (e: any) {
      alert(`Error al reenviar el correo: ${e.message}`);
    }
  };

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
        <div className="d-flex justify-content-between align-items-center w-100">
          <div>
            <h2>Panel Global de Administración (RF12)</h2>
            <p>Monitoreo consolidado del parque automotor, usuarios e inversión global.</p>
          </div>
        </div>
      </header>

      {/* Tarjetas KPI de Resumen Estadístico */}
      <section className={styles.kpiContainer}>
        <div className={`${styles.kpiCard} ${styles.kpiBlue}`}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Ingresos Totales</span>
            <FaDollarSign className={styles.kpiIcon} />
          </div>
          <div className={styles.kpiValue}>${totalInvestment.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className={styles.kpiSub}>Inversión acumulada de clientes</div>
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
          className={`${styles.tabBtn} ${activeTab === 'vehiclesByUser' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('vehiclesByUser')}
        >
          <FaCar className="me-2" />
          Vehículos por Usuario
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
        <button
          className={`${styles.tabBtn} ${activeTab === 'adminAlerts' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('adminAlerts')}
        >
          <FaShieldAlt className="me-2" />
          Notificaciones ({adminAlerts.length})
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
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {localUsers.map((u: any, idx: number) => (
                  <tr key={u.id || idx}>
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
                    <td>
                      <button className="btn btn-sm btn-outline-primary" onClick={() => setEditingUser(u)}>Editar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'vehiclesByUser' && (
          <div className={styles.tableResponsive}>
            <div className="mb-3 p-3 bg-light rounded">
              <label className="fw-bold me-2">Seleccionar Usuario:</label>
              <select className="form-select w-auto d-inline-block" value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
                <option value="">-- Selecciona un usuario --</option>
                {localUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
              </select>
            </div>
            {selectedUserId ? (
              <table className={styles.customTable}>
                <thead>
                  <tr>
                    <th>Vehículo</th>
                    <th>Placa</th>
                    <th>Km Actual</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.filter(v => v.userId === selectedUserId).length > 0 ? (
                    vehicles.filter(v => v.userId === selectedUserId).map(v => (
                      <tr key={v.id}>
                        <td>{v.name}</td>
                        <td>{v.plate}</td>
                        <td>{v.currentKm} km</td>
                        <td>
                          <button className="btn btn-sm btn-outline-primary" onClick={() => setEditingVehicle(v)}>Editar</button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={4} className="text-center">Este usuario no tiene vehículos registrados.</td></tr>
                  )}
                </tbody>
              </table>
            ) : (
              <p className="text-muted text-center p-4">Selecciona un usuario para ver sus vehículos.</p>
            )}
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
                  <th>Acciones</th>
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
                    <td>
                      <button className="btn btn-sm btn-outline-primary" onClick={() => setEditingVehicle(v)}>Editar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'mantenimientos' && (
          <div className={styles.tableResponsive}>
            <div className="d-flex gap-3 mb-3 p-3 bg-light rounded">
              <div>
                <label className="fw-bold me-2">Filtrar por Cliente:</label>
                <select className="form-select w-auto d-inline-block" value={maintUserFilter} onChange={(e) => { setMaintUserFilter(e.target.value); setMaintVehicleFilter(''); }}>
                  <option value="">Todos los Clientes</option>
                  {localUsers.filter(u => u.role !== 'admin').map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="fw-bold me-2">Filtrar por Vehículo:</label>
                <select className="form-select w-auto d-inline-block" value={maintVehicleFilter} onChange={(e) => setMaintVehicleFilter(e.target.value)} disabled={!maintUserFilter}>
                  <option value="">Todos sus vehículos</option>
                  {vehicles.filter(v => v.userId === maintUserFilter).map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({v.plate})</option>
                  ))}
                </select>
              </div>
            </div>
            <table className={styles.customTable}>
              <thead>
                <tr>
                  <th>Cliente</th>
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
                {filteredMaintenances.length > 0 ? (
                  filteredMaintenances.map((m: MaintenanceRecord) => {
                    const vehicle = vehicles.find(v => v.id === m.vehicleId);
                    const owner = localUsers.find(u => u.id === vehicle?.userId);
                    return (
                      <tr key={m.id}>
                        <td>{owner ? owner.name : 'Desconocido'}</td>
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
                    );
                  })
                ) : (
                  <tr><td colSpan={8} className="text-center">No hay mantenimientos que coincidan con los filtros.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'adminAlerts' && (
          <div className={styles.tableResponsive}>
            <table className={styles.customTable}>
              <thead>
                <tr>
                  <th>Propietario</th>
                  <th>Vehículo</th>
                  <th>Pieza</th>
                  <th>Desgaste</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {adminAlerts.length > 0 ? (
                  adminAlerts.map((alertItem, idx) => (
                    <tr key={idx}>
                      <td>{alertItem.owner}</td>
                      <td className="fw-bold">{alertItem.vehicle}</td>
                      <td>{alertItem.piece}</td>
                      <td>{alertItem.wear}%</td>
                      <td>
                        <span className={`badge ${alertItem.status === 'Vencido' ? 'bg-danger' : 'bg-warning text-dark'}`}>
                          {alertItem.status}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-sm btn-outline-primary" onClick={() => handleResendNotification(alertItem)}>
                          ✉️ Reenviar Aviso
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={5} className="text-center">No hay alertas de mantenimiento pendientes.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Edit User Modal */}
      {editingUser && (
        <div className={styles.modalOverlay} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="bg-white p-4 rounded" style={{ width: '400px', maxWidth: '90%' }}>
            <h4>Editar Usuario</h4>
            <form onSubmit={handleSaveUser}>
              <div className="mb-3">
                <label className="form-label">Nombre</label>
                <input type="text" className="form-control" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} />
              </div>
              <div className="mb-3">
                <label className="form-label">Rol</label>
                <select className="form-select" value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as 'admin'|'user'})}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-primary">Guardar</button>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingUser(null)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Vehicle Modal */}
      {editingVehicle && (
        <div className={styles.modalOverlay} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="bg-white p-4 rounded" style={{ width: '500px', maxWidth: '90%' }}>
            <h4>Editar Vehículo</h4>
            <form onSubmit={handleSaveVehicle}>
              <div className="mb-3">
                <label className="form-label">Nombre / Alias</label>
                <input type="text" className="form-control" value={editingVehicle.name} onChange={e => setEditingVehicle({...editingVehicle, name: e.target.value})} />
              </div>
              <div className="row mb-3">
                <div className="col">
                  <label className="form-label">Marca</label>
                  <input type="text" className="form-control" value={editingVehicle.brand} onChange={e => setEditingVehicle({...editingVehicle, brand: e.target.value})} />
                </div>
                <div className="col">
                  <label className="form-label">Modelo</label>
                  <input type="text" className="form-control" value={editingVehicle.model} onChange={e => setEditingVehicle({...editingVehicle, model: e.target.value})} />
                </div>
              </div>
              <div className="row mb-3">
                <div className="col">
                  <label className="form-label">Placa</label>
                  <input type="text" className="form-control" value={editingVehicle.plate} onChange={e => setEditingVehicle({...editingVehicle, plate: e.target.value})} />
                </div>
                <div className="col">
                  <label className="form-label">Año</label>
                  <input type="number" className="form-control" value={editingVehicle.year} onChange={e => setEditingVehicle({...editingVehicle, year: Number(e.target.value)})} />
                </div>
              </div>
              <div className="d-flex gap-2 mt-4">
                <button type="submit" className="btn btn-primary">Guardar Cambios</button>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingVehicle(null)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
