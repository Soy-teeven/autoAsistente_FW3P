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
  FaChevronDown
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

export const MOCK_VEHICLES: Vehicle[] = [
  {
    id: 'v1',
    userId: 'u-user-1',
    name: 'Toyota Corolla 2020',
    brand: 'Toyota',
    model: 'Corolla',
    year: 2020,
    plate: 'ABC-1234',
    vin: '1HGCR2F83HA123456',
    initialKm: 10000,
    currentKm: 45000,
    pieces: [
      { id: 'p1', name: 'Pastillas de Freno Delanteras', category: 'frenos', lifeKm: 30000, lifeMonths: 24, lastChangeKm: 18000, lastChangeDate: '2024-05-10' },
      { id: 'p2', name: 'Amortiguadores Traseros', category: 'suspensión', lifeKm: 60000, lifeMonths: 48, lastChangeKm: 0, lastChangeDate: '2020-01-15' },
      { id: 'p3', name: 'Aceite Sintético 5W-30', category: 'motor', lifeKm: 10000, lifeMonths: 12, lastChangeKm: 42000, lastChangeDate: '2025-11-20' },
      { id: 'p4', name: 'Líquido de Transmisión', category: 'transmisión', lifeKm: 80000, lifeMonths: 60, lastChangeKm: 10000, lastChangeDate: '2021-06-12' },
      { id: 'p5', name: 'Batería 12V LTH', category: 'eléctrico', lifeKm: 50000, lifeMonths: 36, lastChangeKm: 15000, lastChangeDate: '2023-02-18' },
      { id: 'p6', name: 'Neumáticos Delanteros Michelin', category: 'neumáticos', lifeKm: 40000, lifeMonths: 48, lastChangeKm: 12000, lastChangeDate: '2022-09-05' },
      { id: 'p7', name: 'Líquido Refrigerante', category: 'enfriamiento', lifeKm: 50000, lifeMonths: 24, lastChangeKm: 10000, lastChangeDate: '2024-01-10' },
      { id: 'p8', name: 'Alineación y Balanceo', category: 'dirección', lifeKm: 10000, lifeMonths: 6, lastChangeKm: 40000, lastChangeDate: '2026-03-01' },
    ]
  },
  {
    id: 'v2',
    userId: 'u-user-1',
    name: 'Mazda 3 Sport 2018',
    brand: 'Mazda',
    model: '3 Sport',
    year: 2018,
    plate: 'XYZ-9876',
    vin: 'JM1BN1U52K1987654',
    initialKm: 20000,
    currentKm: 98000,
    pieces: [
      { id: 'p21', name: 'Discos de Freno Delanteros', category: 'frenos', lifeKm: 50000, lifeMonths: 36, lastChangeKm: 50000, lastChangeDate: '2021-08-20' },
      { id: 'p22', name: 'Bujías de Iridio', category: 'motor', lifeKm: 80000, lifeMonths: 48, lastChangeKm: 20000, lastChangeDate: '2020-03-10' },
      { id: 'p23', name: 'Neumáticos Deportivos Toyo', category: 'neumáticos', lifeKm: 35000, lifeMonths: 36, lastChangeKm: 70000, lastChangeDate: '2024-02-15' },
    ]
  }
];

export interface DashboardProps {
  role: 'user' | 'admin';
  setRole: (role: 'user' | 'admin') => void;
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
}

export const Dashboard: React.FC<DashboardProps> = ({
  role,
  setRole,
  activeVehicleId,
  setActiveVehicleId,
  activeCategory,
  setActiveCategory,
  vehicles,
  onOpenMileageModal,
  onOpenMaintenanceModal,
  onUpdatePiece,
  highlightedPieceId,
  setHighlightedPieceId
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
    return vehicles.find(v => v.id === activeVehicleId) || vehicles[0] || MOCK_VEHICLES[0];
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
    const safeVehicle = selectedVehicle && typeof selectedVehicle === 'object' ? selectedVehicle : MOCK_VEHICLES[0];
    const piecesToFilter = activeCategory === 'todas'
      ? (Array.isArray(safeVehicle.pieces) ? safeVehicle.pieces : [])
      : (Array.isArray(safeVehicle.pieces) ? safeVehicle.pieces.filter(p => p.category === activeCategory) : []);

    return piecesToFilter
      .filter((piece): piece is Piece => Boolean(piece) && typeof piece === 'object')
      .map(piece => {
        const wearInfo = calculatePieceWear(piece, safeVehicle.currentKm);
        return { piece, wearInfo };
      })
      .sort((a, b) => b.wearInfo.wearPercentage - a.wearInfo.wearPercentage);
  }, [selectedVehicle, activeCategory]);

  return (
    <div className={styles.dashboardContainer}>
      <header className={styles.headerSection}>
        <div className={styles.titleContainer}>
          <h1>Control de Mantenimiento</h1>
          <p className="d-flex align-items-center gap-2">
            Supervisa el desgaste de las piezas de tu coche en tiempo real.
            <span 
              className={`badge cursor-pointer ${role === 'admin' ? 'bg-danger' : 'bg-primary'}`} 
              onClick={() => setRole(role === 'user' ? 'admin' : 'user')}
              title="Haz clic para alternar rol"
            >
              Rol: {role.toUpperCase()}
            </span>
          </p>
        </div>

        {/* RF05: Selector de vehículo activo en barra superior */}
        <div className={styles.vehicleSelectorWrapper}>
          <div className={styles.vehicleIconPill}>
            <FaCar />
          </div>
          <div className={styles.vehicleSelectorMain}>
            <span className={styles.vehicleSelectLabel}>Vehículo Activo</span>
            <select 
              id="vehicle-active-select"
              className={styles.vehicleSelect} 
              value={activeVehicleId}
              onChange={(e) => setActiveVehicleId(e.target.value)}
              aria-label="Seleccionar Vehículo Activo"
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
            title="Actualizar Kilometraje del Vehículo Activo"
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
                  <article 
                    id={piece.id}
                    key={piece.id} 
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
                        <FaChevronDown />
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
