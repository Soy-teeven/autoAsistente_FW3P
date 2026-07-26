import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBell, FaCheck, FaExclamationTriangle, FaCheckDouble } from 'react-icons/fa';
import { Piece } from '../../types';

import styles from './NotificationCenter.module.css';

// Props para el Centro de Notificaciones
interface NotificationCenterProps {
  pieces: Piece[];
  currentKm: number;
  readIds: string[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: (ids: string[]) => void;
  onSelectNotification: (pieceId: string, category: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  pieces,
  currentKm,
  readIds,
  onMarkAsRead,
  onMarkAllAsRead,
  onSelectNotification
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // RF10 & RF11: Alertas automáticas para amarillo (warning) y rojo (danger) con filtrado seguro
  const alerts = useMemo(() => {
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
      const wearPercentage = Math.round(Math.max(wearKmRatio, wearTimeRatio) * 100);
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
  }, [pieces, currentKm, readIds]);

  // Contador de alertas no leídas para el Badge
  const unreadCount = useMemo(() => {
    return alerts.filter(a => !a.isRead).length;
  }, [alerts]);

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
    const unreadAlertIds = alerts.filter(a => !a.isRead).map(a => a.id);
    if (unreadAlertIds.length > 0) {
      onMarkAllAsRead(unreadAlertIds);
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
              {alerts.length > 0 ? (
                alerts.map((alert) => {
                  const alertColorClass = alert.status === 'red' ? styles.indicatorRed : styles.indicatorYellow;
                  
                  return (
                    // H6 - Reconocimiento antes que recuerdo: mostrar datos explícitos del desgaste
                    <div 
                      key={alert.id} 
                      className={`${styles.notificationItem} ${alert.isRead ? styles.itemRead : styles.itemUnread}`}
                      onClick={() => handleAlertClick(alert.id, alert.category)}
                      role="button"
                      tabIndex={0}
                      title={`Ir a la pieza: ${alert.name}`}
                    >
                      <div className={`${styles.statusIndicator} ${alertColorClass}`} aria-hidden="true" />
                      <div className={styles.itemContent}>
                        <div className={styles.itemTitle}>{alert.name}</div>
                        <div className={styles.itemMeta}>
                          <FaExclamationTriangle className="me-1 text-muted" />
                          Desgaste del <span className="fw-bold">{alert.wearPercentage}%</span>
                        </div>
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
                  <p className="text-muted small">No hay alertas de desgaste pendientes.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
