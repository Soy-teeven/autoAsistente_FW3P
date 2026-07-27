import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaWrench, 
  FaRoad, 
  FaCalendarAlt, 
  FaExclamationTriangle, 
  FaCheckCircle, 
  FaInfoCircle, 
  FaSlidersH,
  FaCar,
  FaChevronUp
} from 'react-icons/fa';
import { 
  GiStopSign,
  GiSuspensionBridge,
  GiGears,
  GiGearStickPattern,
  GiElectric,
  GiCarWheel,
  GiSnowflake2,
  GiSteeringWheel
} from 'react-icons/gi';
import { Vehicle, Piece } from '../../types';
import { PieceEditModal } from '../PieceEditModal/PieceEditModal';

export type { Piece, Vehicle };

import styles from './Dashboard.module.css';

export const MOCK_VEHICLES: Vehicle[] = [];

export interface DashboardProps {
  activeVehicleId: string;
  setActiveVehicleId: (id: string) => void;
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  vehicles: Vehicle[];
  onOpenMileageModal: () => void;
  onOpenMaintenanceModal: (piece: Piece) => void;
  onUpdatePiece: (piece: Piece) => void;
  highlightedPieceId: string | null;
  setHighlightedPieceId: (id: string | null) => void;
  onNavigateToNewVehicle?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  activeVehicleId,
  setActiveVehicleId,
  activeCategory,
  setActiveCategory,
  vehicles,
  onOpenMileageModal,
  onOpenMaintenanceModal,
  onUpdatePiece,
  highlightedPieceId,
  setHighlightedPieceId,
  onNavigateToNewVehicle
}) => {
  const [editingPiece, setEditingPiece] = useState<Piece | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [prevIndex, setPrevIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const activeVehicleIndex = useMemo(() => {
    return vehicles.findIndex(v => v.id === activeVehicleId);
  }, [vehicles, activeVehicleId]);

  React.useEffect(() => {
    if (activeVehicleIndex !== -1 && activeVehicleIndex !== prevIndex) {
      setDirection(activeVehicleIndex > prevIndex ? 1 : -1);
      setPrevIndex(activeVehicleIndex);
    }
  }, [activeVehicleIndex, prevIndex]);

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 150 : -150,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 150 : -150,
      opacity: 0
    })
  };


  // Obtener vehículo seleccionado
  const selectedVehicle = useMemo(() => {
    return vehicles.find(v => v.id === activeVehicleId) || vehicles[0] || null;
  }, [vehicles, activeVehicleId]);

  const categories = [
    { id: 'todas', label: 'Todas', icon: <FaWrench /> },
    { id: 'frenos', label: 'Frenos', icon: <GiStopSign /> },
    { id: 'suspensión', label: 'Suspensión', icon: <GiSuspensionBridge /> },
    { id: 'motor', label: 'Motor', icon: <GiGears /> },
    { id: 'transmisión', label: 'Transmisión', icon: <GiGearStickPattern /> },
    { id: 'eléctrico', label: 'Eléctrico', icon: <GiElectric /> },
    { id: 'neumáticos', label: 'Neumáticos', icon: <GiCarWheel /> },
    { id: 'enfriamiento', label: 'Enfriamiento', icon: <GiSnowflake2 /> },
    { id: 'dirección', label: 'Dirección', icon: <GiSteeringWheel /> },
  ];

  // RF08 & RNF02: Motor de Cálculo de desgaste dinámico (Protegido contra NaN / división por cero)
  const calculatePieceWear = (piece: Piece, currentKm: number) => {
    const safeCurrentKm = Number.isFinite(currentKm) && currentKm >= 0 ? currentKm : 0;
    const safeLastChangeKm = Number.isFinite(piece.lastChangeKm) && piece.lastChangeKm >= 0 ? piece.lastChangeKm : 0;
    const safeLifeKm = (Number.isFinite(piece.lifeKm) && piece.lifeKm > 0) ? piece.lifeKm : 10000;
    const safeLifeMonths = (Number.isFinite(piece.lifeMonths) && piece.lifeMonths > 0) ? piece.lifeMonths : 12;

    const kmDrivenSinceChange = Math.max(0, safeCurrentKm - safeLastChangeKm);
    const wearKmRatio = safeLifeKm > 0 ? kmDrivenSinceChange / safeLifeKm : 0;

    let monthsElapsed = 0;
    try {
      const lastChangeDateObj = new Date(piece.lastChangeDate);
      if (!Number.isNaN(lastChangeDateObj.getTime())) {
        const currentDateObj = new Date();
        monthsElapsed = (currentDateObj.getFullYear() - lastChangeDateObj.getFullYear()) * 12
          + (currentDateObj.getMonth() - lastChangeDateObj.getMonth());
        if (monthsElapsed < 0) monthsElapsed = 0;
      }
    } catch {
      monthsElapsed = 0;
    }

    const wearTimeRatio = safeLifeMonths > 0 ? monthsElapsed / safeLifeMonths : 0;
    const wearPercentage = Math.round(Math.max(wearKmRatio, wearTimeRatio) * 100);
    const boundedWear = Math.max(0, Math.min(100, Number.isNaN(wearPercentage) ? 0 : wearPercentage));

    let status: 'green' | 'yellow' | 'red' = 'green';
    let statusLabel = 'Óptimo';
    if (boundedWear >= 90) {
      status = 'red';
      statusLabel = 'Crítico';
    } else if (boundedWear >= 75) {
      status = 'yellow';
      statusLabel = 'Precaución';
    }

    return {
      wearPercentage: boundedWear,
      status,
      statusLabel,
      kmDrivenSinceChange,
      monthsElapsed
    };
  };

  // RF08: Filtrado Y Ordenamiento por urgencia de desgaste (rojo -> amarillo -> verde)
  const sortedAndFilteredPieces = useMemo(() => {
    if (!selectedVehicle) return [];
    const piecesToFilter = activeCategory === 'todas' 
      ? selectedVehicle.pieces 
      : selectedVehicle.pieces.filter(p => p.category === activeCategory);

    return piecesToFilter
      .filter((piece): piece is Piece => Boolean(piece) && typeof piece === 'object')
      .map(piece => {
        const wearInfo = calculatePieceWear(piece, selectedVehicle.currentKm);
        return { piece, wearInfo };
      })
      .sort((a, b) => b.wearInfo.wearPercentage - a.wearInfo.wearPercentage);
  }, [selectedVehicle, activeCategory]);

  if (!selectedVehicle) {
    return (
      <div className={styles.dashboardContainer}>
        <header className={styles.headerSection}>
          <div className={styles.titleContainer}>
            <h1>Control de Mantenimiento</h1>
            <p className="d-flex align-items-center gap-2">
              Supervisa el desgaste de las piezas de tu coche en tiempo real.
            </p>
          </div>
        </header>

        <div className="alert alert-warning p-4 d-flex align-items-center gap-3" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '16px' }}>
          <div className="bg-warning text-dark p-3 rounded-circle d-flex align-items-center justify-content-center" style={{ width: 56, height: 56, flexShrink: 0 }}>
            <FaExclamationTriangle className="fs-3" />
          </div>
          <div>
            <h4 className="alert-heading fw-bold mb-1" style={{ color: 'var(--text-primary)' }}>Se necesita registrar un vehículo</h4>
            <p className="mb-3" style={{ color: 'var(--text-secondary)' }}>Es necesario registrar un vehículo en la aplicación para poder visualizar su estado y realizar el seguimiento de mantenimiento.</p>
            {onNavigateToNewVehicle && (
              <button 
                className="btn-duo-3d btn-duo-primary"
                onClick={onNavigateToNewVehicle}
                style={{ padding: '8px 16px', fontSize: '0.95rem', borderRadius: '12px' }}
              >
                Registrar un vehículo ahora
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dashboardContainer}>
      <header className={styles.headerSection}>
        <div className={styles.titleContainer}>
          <h1>Control de Mantenimiento</h1>
          <p className="d-flex align-items-center gap-2">
            Supervisa el desgaste de las piezas de tu coche en tiempo real.
          </p>
        </div>

        {/* RF05: Selector de vehículo activo en barra superior */}
        <div className={styles.vehicleSelectorWrapper}>
          <div className={styles.vehicleIconPill}>
            <FaCar />
          </div>
          <div className={styles.vehicleSelectorMain}>
            <span className={styles.vehicleSelectLabel}>Cambiar Vehículo ▾</span>
            <select 
              id="vehicle-active-select"
              className={styles.vehicleSelect} 
              value={activeVehicleId}
              onChange={(e) => setActiveVehicleId(e.target.value)}
              aria-label="Seleccionar Vehículo Seleccionado"
              title="Haz clic para seleccionar otro de tus vehículos registrados"
            >
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.plate})
                </option>
              ))}
            </select>
          </div>
          <button 
            className="btn-duo-3d btn-duo-primary ms-2"
            onClick={onOpenMileageModal}
            title="Actualizar Kilometraje del Vehículo Seleccionado"
            style={{ minHeight: '38px', padding: '4px 14px', fontSize: '0.85rem', borderRadius: '12px' }}
          >
            Actualizar Km
          </button>
        </div>
      </header>

      {/* Detalles técnicos del vehículo activo */}
      <div className="alert alert-info py-2 px-3 mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
        <span><FaCar className="me-2 text-primary" /> <strong>{selectedVehicle.brand || 'Toyota'} {selectedVehicle.model || 'Corolla'} ({selectedVehicle.year || 2020})</strong> | Placa: <code>{selectedVehicle.plate}</code> | VIN: <code>{selectedVehicle.vin || '1HGCR2F83HA123456'}</code></span>
        <span>Odómetro: <strong>{Number.isFinite(selectedVehicle.currentKm) ? selectedVehicle.currentKm.toLocaleString() : 0} km</strong> (Inicial: {Number.isFinite(selectedVehicle.initialKm) ? selectedVehicle.initialKm : 0} km)</span>
      </div>

      <nav className={styles.tabsContainer} aria-label="Categorías de Piezas">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`${styles.tabButton} ${activeCategory === cat.id ? styles.tabButtonActive : ''}`}
            aria-selected={activeCategory === cat.id}
            role="tab"
          >
            {cat.icon}
            <span>{cat.label}</span>
          </button>
        ))}
      </nav>

      <main>
        <AnimatePresence mode="wait" initial={false}>
          {sortedAndFilteredPieces.length > 0 ? (
            <motion.div 
              key={`${activeVehicleId}-${activeCategory}`}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 260, damping: 26 },
                opacity: { duration: 0.2 }
              }}
              className={styles.cardsGrid}
            >
              {sortedAndFilteredPieces.map(({ piece, wearInfo }) => {
                const { wearPercentage, status, statusLabel, kmDrivenSinceChange } = wearInfo;
                
                const urgencyClass = 
                  status === 'red' ? styles.urgencyRed : 
                  status === 'yellow' ? styles.urgencyYellow : 
                  styles.urgencyGreen;

                const progressColorClass = 
                  status === 'red' ? styles.progressRed : 
                  status === 'yellow' ? styles.progressYellow : 
                  styles.progressGreen;

                const isExpanded = piece.id === expandedCardId || piece.id === highlightedPieceId;

                return (
                  <div key={piece.id} className={styles.pieceCardWrapper}>
                    <article 
                      id={piece.id}
                      className={`${styles.pieceCard} ${status === 'red' ? styles.urgentPulse : ''} ${piece.id === highlightedPieceId ? styles.highlightedCard : ''} ${isExpanded ? styles.cardExpanded : ''}`}
                      style={{ position: 'relative' }}
                      onClick={() => {
                        if (piece.id === highlightedPieceId) {
                          setHighlightedPieceId(null);
                        }
                        setExpandedCardId(prev => prev === piece.id ? null : piece.id);
                      }}
                    >
                    {/* Front Panel (Always visible when not expanded/hovered) */}
                    <div className={styles.cardFrontContent}>
                      <div className={styles.cardHeader}>
                        <div className={styles.iconTitleGroup}>
                          <div className={styles.categoryIconWrapper} aria-hidden="true">
                            {piece.category === 'frenos' && <GiStopSign />}
                            {piece.category === 'suspensión' && <GiSuspensionBridge />}
                            {piece.category === 'motor' && <GiGears />}
                            {piece.category === 'transmisión' && <GiGearStickPattern />}
                            {piece.category === 'eléctrico' && <GiElectric />}
                            {piece.category === 'neumáticos' && <GiCarWheel />}
                            {piece.category === 'enfriamiento' && <GiSnowflake2 />}
                            {piece.category === 'dirección' && <GiSteeringWheel />}
                          </div>
                          <div className={styles.titleArea}>
                            <h3>{piece.name}</h3>
                            <span className={styles.categoryBadge}>{piece.category}</span>
                          </div>
                        </div>

                        {/* RF08: Semáforo Tricolor */}
                        <span className={`${styles.urgencyBadge} ${urgencyClass}`}>
                          {status === 'red' && <FaExclamationTriangle className="me-1" />}
                          {status === 'green' && <FaCheckCircle className="me-1" />}
                          {statusLabel}
                        </span>
                      </div>

                      <section className={styles.wearSection}>
                        <div className={styles.wearLabelRow}>
                          <span>Desgaste Estimado</span>
                          <span className="fw-bold">{wearPercentage}%</span>
                        </div>
                        <div className={styles.progressContainer} aria-valuenow={wearPercentage} aria-valuemin={0} aria-valuemax={100}>
                          <div 
                             className={`${styles.progressBar} ${progressColorClass}`}
                            style={{ width: `${wearPercentage}%` }}
                          />
                        </div>
                      </section>

                      {/* H8 - Visual indicator for expandable details */}
                      <div className={styles.expandIndicator}>
                        <span>Ver detalles y acciones</span>
                        <FaChevronUp />
                      </div>
                    </div>

                    {/* Back Panel / Slide-up Drawer (Covering the front content on hover/click) */}
                    <div className={styles.slideUpPanel}>
                      <div className={styles.slideUpHeader}>
                        <h4>{piece.name}</h4>
                      </div>

                      <section className={styles.detailsGrid}>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Último Cambio</span>
                          <span className={styles.detailValue}>
                            <FaRoad className="me-1 text-muted" /> {piece.lastChangeKm.toLocaleString()} km
                          </span>
                        </div>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Fecha Cambio</span>
                          <span className={styles.detailValue}>
                            <FaCalendarAlt className="me-1 text-muted" /> {new Date(piece.lastChangeDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Uso Transcurrido</span>
                          <span className={styles.detailValue}>
                            {kmDrivenSinceChange.toLocaleString()} km
                          </span>
                        </div>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Límite Fábrica</span>
                          <span className={styles.detailValue} title={`Vida esperada: ${piece.lifeKm} km o ${piece.lifeMonths} meses`}>
                            <FaInfoCircle className="me-1 text-info" /> {piece.lifeKm.toLocaleString()} km
                          </span>
                        </div>
                      </section>

                      <div className={styles.cardActions}>
                        {/* RF09: Registrar Mantenimiento */}
                        <button 
                          className="btn-duo-3d btn-duo-primary" 
                          style={{ flex: 1 }}
                          title={`Registrar mantenimiento para ${piece.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenMaintenanceModal(piece);
                          }}
                        >
                          <FaWrench className="me-1" />
                          <span>Mantenimiento</span>
                        </button>
                        
                        {/* RF07: Asignación de desgastes y tolerancias de fábrica */}
                        <button 
                          className="btn-duo-3d btn-duo-secondary"
                          title="Configurar límites de fábrica"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingPiece(piece);
                          }}
                        >
                          <FaSlidersH />
                        </button>
                      </div>
                    </div>
                  </article>
                  </div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div 
              className={styles.emptyState}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className={styles.emptyStateIcon}>
                <FaInfoCircle />
              </div>
              <h4>No se encontraron piezas</h4>
              <p>No existen componentes en la categoría "{activeCategory}".</p>
              <button 
                className="btn-duo-3d btn-duo-primary"
                onClick={() => setActiveCategory('todas')}
              >
                Ver Todas las Piezas
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* RF07: Modal de Tolerancias de fábrica */}
      {editingPiece && (
        <PieceEditModal 
          isOpen={!!editingPiece}
          onClose={() => setEditingPiece(null)}
          piece={editingPiece}
          onUpdatePiece={onUpdatePiece}
        />
      )}
    </div>
  );
};
