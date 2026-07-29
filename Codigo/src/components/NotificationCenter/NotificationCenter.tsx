import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBell, FaCheck, FaExclamationTriangle, FaCheckDouble } from 'react-icons/fa';
import { Piece } from '../../types';
import { storageService } from '../../services/storageService';

import styles from './NotificationCenter.module.css';

// Props para el Centro de Notificaciones
interface NotificationCenterProps {
  pieces: Piece[];
  currentKm: number;
  vehicleId: string;
  readIds: string[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: (ids: string[]) => void;
  onSelectNotification: (pieceId: string, category: string) => void;
  currentUserId: string;
  onShareRequestAction: () => void;
  isAdmin?: boolean;
  allVehicles?: import('../../types').Vehicle[];
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  pieces,
  currentKm,
  vehicleId,
  readIds,
  onMarkAsRead,
  onMarkAllAsRead,
  onSelectNotification,
  currentUserId,
  onShareRequestAction,
  isAdmin,
  allVehicles = []
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [shareRequests, setShareRequests] = useState<import('../../types').ShareRequest[]>([]);
  const [adminGlobalAlerts, setAdminGlobalAlerts] = useState<any[]>([]);
  
  const loadShareRequests = () => {
    try {
      const allReqs = storageService.getShareRequests();
      setShareRequests(allReqs.filter((r: any) => r.toUserId === currentUserId && r.status === 'pending'));

      if (isAdmin) {
        // Usa allVehicles si está disponible, de lo contrario lee de storage
        const vehicles = allVehicles.length > 0 ? allVehicles : storageService.getVehicles();
        const storedUsers = localStorage.getItem('users_database');
        const users = storedUsers ? JSON.parse(storedUsers) : [];
        const globalAlerts: any[] = [];

        vehicles.forEach((v: import('../../types').Vehicle) => {
          v.pieces.forEach(p => {
            const safeCurrentKm = Number.isFinite(v.currentKm) ? v.currentKm : 0;
            const safeLastChangeKm = Number.isFinite(p.lastChangeKm) ? p.lastChangeKm : 0;
            const kmDriven = Math.max(0, safeCurrentKm - safeLastChangeKm);
            const wearPercentage = Math.round(Math.max((kmDriven / (p.lifeKm || 10000)), 0) * 100);
            
            if (wearPercentage >= 75) {
              const owner = users.find((u: any) => u.id === v.userId);
              globalAlerts.push({
                id: p.id + v.id,
                name: p.name,
                category: p.category,
                wearPercentage,
                status: wearPercentage >= 90 ? 'red' : 'yellow',
                isRead: Array.isArray(readIds) && readIds.includes(p.id + v.id),
                vehicleName: v.name,
                ownerName: owner ? owner.name : 'Desconocido',
                ownerEmail: owner ? owner.email : ''
              });
            }
          });
        });

        setAdminGlobalAlerts(globalAlerts.sort((a, b) => b.wearPercentage - a.wearPercentage));
      }
    } catch (e) {
      // Ignore
    }
  };

  useEffect(() => {
    loadShareRequests();
  }, [currentUserId, pieces, currentKm, isAdmin, allVehicles]); // Recargar cuando los vehículos cambien

  useEffect(() => {
    if (isOpen) {
      loadShareRequests();
    }
  }, [isOpen]);

  // RF10 & RF11: Alertas automáticas para amarillo (warning) y rojo (danger) con filtrado seguro
  const userAlerts = useMemo(() => {
    if (isAdmin) return []; // El admin usa adminGlobalAlerts en su lugar
    if (!Array.isArray(pieces)) return [];

    return pieces.map(piece => {
      const safeCurrentKm = Number.isFinite(currentKm) ? currentKm : 0;
      const safeLastChangeKm = Number.isFinite(piece.lastChangeKm) ? piece.lastChangeKm : 0;
      const safeLifeKm = (Number.isFinite(piece.lifeKm) && piece.lifeKm > 0) ? piece.lifeKm : 10000;
      const safeLifeMonths = (Number.isFinite(piece.lifeMonths) && piece.lifeMonths > 0) ? piece.lifeMonths : 12;

      const kmDriven = Math.max(0, safeCurrentKm - safeLastChangeKm);
      const wearKmRatio = kmDriven / safeLifeKm;

      let monthsElapsed = 0;
      try {
        const lastChangeDateObj = new Date(piece.lastChangeDate);
        if (!isNaN(lastChangeDateObj.getTime())) {
          const currentDateObj = new Date();
          monthsElapsed = (currentDateObj.getFullYear() - lastChangeDateObj.getFullYear()) * 12 
            + (currentDateObj.getMonth() - lastChangeDateObj.getMonth());
          if (monthsElapsed < 0) monthsElapsed = 0;
        }
      } catch (e) {
        monthsElapsed = 0;
      }

      const wearTimeRatio = monthsElapsed / safeLifeMonths;
      let wearPercentage = Math.round(Math.max(wearKmRatio, wearTimeRatio) * 100);

      // Calcular proyección basada en el promedio diario si hay datos
      if (vehicleId) {
        try {
          const avgDaily = storageService.getDailyAverageKm(vehicleId);
          if (avgDaily > 0) {
            // Proyección a 7 días
            const projectedKmDriven = kmDriven + (avgDaily * 7);
            const projectedWearPercentage = Math.round((projectedKmDriven / safeLifeKm) * 100);
            if (projectedWearPercentage > wearPercentage) {
              wearPercentage = projectedWearPercentage;
            }
          }
        } catch (e) {
          // Fallback a cálculo normal
        }
      }

      const boundedWear = Math.max(0, Math.min(100, isNaN(wearPercentage) ? 0 : wearPercentage));

      let status: 'yellow' | 'red' | null = null;
      if (boundedWear >= 90) {
        status = 'red';
      } else if (boundedWear >= 75) {
        status = 'yellow';
      }

      return {
        id: piece.id,
        name: piece.name,
        category: piece.category,
        wearPercentage: boundedWear,
        status,
        isRead: Array.isArray(readIds) && readIds.includes(piece.id)
      };
    }).filter(alert => alert.status !== null)
    .sort((a, b) => {
      // Priorizar no leídas y luego severidad (rojo primero)
      if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
      if (a.status !== b.status) return a.status === 'red' ? -1 : 1;
      return b.wearPercentage - a.wearPercentage;
    });
  }, [pieces, currentKm, readIds, isAdmin]);

  const displayAlerts = isAdmin ? adminGlobalAlerts : userAlerts;

  // Contador de alertas no leídas para el Badge
  const unreadCount = useMemo(() => {
    return displayAlerts.filter(a => !a.isRead).length + shareRequests.length;
  }, [displayAlerts, shareRequests]);

  // H3 - Control y libertad: Cerrar el menú haciendo clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAlertClick = (alertId: string, category: string) => {
    onMarkAsRead(alertId);
    onSelectNotification(alertId, category);
    setIsOpen(false);
  };

  const handleMarkAll = () => {
    const unreadAlertIds = displayAlerts.filter(a => !a.isRead).map(a => a.id);
    if (unreadAlertIds.length > 0) {
      onMarkAllAsRead(unreadAlertIds);
    }
  };

  const handleAcceptShare = (reqId: string) => {
    try {
      storageService.acceptShareRequest(reqId, currentUserId);
      loadShareRequests();
      onShareRequestAction();
    } catch (e: any) {
      alert(`Error al aceptar: ${e.message}`);
    }
  };

  const handleRejectShare = (reqId: string) => {
    try {
      storageService.rejectShareRequest(reqId, currentUserId);
      loadShareRequests();
    } catch (e: any) {
      alert(`Error al rechazar: ${e.message}`);
    }
  };

  return (
    <div className={styles.notificationWrapper} ref={dropdownRef}>
      {/* Botón de Campana (H4 - Consistencia y H1 - Visibilidad de estado con badge) */}
      <button 
        className={`${styles.bellButton} ${isOpen ? styles.bellActive : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
        title="Centro de Alertas y Notificaciones"
        aria-expanded={isOpen}
        aria-label={`Notificaciones, ${unreadCount} no leídas`}
      >
        <FaBell />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span 
              className={styles.badge}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 15 }}
            >
              {unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Desplegable de Notificaciones */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className={styles.dropdownMenu}
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            role="region"
            aria-label="Panel de notificaciones"
          >
            {/* Header del dropdown */}
            <header className={styles.dropdownHeader}>
              <h3>Notificaciones</h3>
              {unreadCount > 0 && (
                // H3 - Control y libertad del usuario: botón para limpiar todas las alertas no leídas
                <button 
                  className={styles.markAllButton}
                  onClick={handleMarkAll}
                  title="Marcar todas como leídas"
                >
                  <FaCheckDouble className="me-1" />
                  Leídas
                </button>
              )}
            </header>

            {/* Listado de alertas */}
            <div className={styles.notificationsList}>
              {/* Solicitudes de Compartir */}
              {shareRequests.map(req => (
                <div key={req.id} className={`${styles.notificationItem} ${styles.itemUnread}`} style={{ borderLeft: '4px solid #007bff' }}>
                  <div className={styles.itemContent} style={{ flexGrow: 1 }}>
                    <div className={styles.itemTitle}>Invitación a vehículo</div>
                    <div className={styles.itemMeta}>
                      <span className="fw-bold">{req.fromUserName}</span> te invitó a ver "{req.vehicleName}"
                    </div>
                    <div className="d-flex gap-2 mt-2">
                      <button className="btn btn-sm btn-primary w-50 py-1" onClick={() => handleAcceptShare(req.id)}>Aceptar</button>
                      <button className="btn btn-sm btn-outline-secondary w-50 py-1" onClick={() => handleRejectShare(req.id)}>Rechazar</button>
                    </div>
                  </div>
                </div>
              ))}

              {displayAlerts.length > 0 || shareRequests.length > 0 ? (
                displayAlerts.map((alert) => {
                  const alertColorClass = alert.status === 'red' ? styles.indicatorRed : styles.indicatorYellow;
                  
                  return (
                    <div 
                      key={alert.id} 
                      className={`${styles.notificationItem} ${alert.isRead ? styles.itemRead : styles.itemUnread}`}
                      onClick={() => !isAdmin && handleAlertClick(alert.id, alert.category)}
                      role="button"
                      tabIndex={0}
                      title={`Ir a la pieza: ${alert.name}`}
                    >
                      <div className={`${styles.statusIndicator} ${alertColorClass}`} aria-hidden="true" />
                      <div className={styles.itemContent}>
                        <div className={styles.itemTitle}>
                          {isAdmin ? `${alert.vehicleName} (${alert.ownerName}) - ${alert.name}` : alert.name}
                        </div>
                        <div className={styles.itemMeta}>
                          <FaExclamationTriangle className="me-1 text-muted" />
                          Desgaste del <span className="fw-bold">{alert.wearPercentage}%</span>
                        </div>
                        <p className={styles.itemMeta} style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                          {isAdmin 
                            ? `La pieza está ${alert.status === 'red' ? 'vencida' : 'próxima a vencer'}.`
                            : alert.status === 'red'
                            ? `Ha superado su límite de desgaste recomendado. Por favor, programe un mantenimiento urgente.`
                            : `Está próxima a requerir un cambio. Vaya planificando su mantenimiento.`
                          }
                        </p>
                      </div>
                      {!alert.isRead && (
                        <button 
                          className={styles.checkButton}
                          onClick={(e) => {
                            e.stopPropagation(); // Evitar redirección si solo marca como leída
                            onMarkAsRead(alert.id);
                          }}
                          title="Marcar como leída"
                          aria-label="Marcar notificación como leída"
                        >
                          <FaCheck />
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                // H9 - Estado vacío amigable
                <div className={styles.emptyState}>
                  <FaBell className={styles.emptyIcon} />
                  <p className="fw-bold m-0">¡Todo en orden!</p>
                  <p className="text-muted small">No hay notificaciones pendientes.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
