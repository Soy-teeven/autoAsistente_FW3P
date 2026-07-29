import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { FaSlidersH, FaTimes, FaCheckCircle, FaRoad, FaCalendarAlt, FaWrench } from 'react-icons/fa';
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
import { Piece } from '../../types';

import styles from '../MileageModal/MileageModal.module.css';

interface PieceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  piece: Piece;
  onUpdatePiece: (updatedPiece: Piece) => void;
}

const pieceSchema = z.object({
  lifeKm: z.union([z.string(), z.number()])
    .refine(val => val !== '' && !isNaN(Number(val)) && Number(val) > 0, { message: "Requerido (mayor a 0)" })
    .transform(val => Number(val)),
  lifeMonths: z.union([z.string(), z.number()])
    .refine(val => val !== '' && !isNaN(Number(val)) && Number(val) > 0, { message: "Requerido (mayor a 0)" })
    .transform(val => Number(val)),
  lastChangeKm: z.union([z.string(), z.number()])
    .refine(val => val !== '' && !isNaN(Number(val)) && Number(val) >= 0, { message: "Requerido (no negativo)" })
    .transform(val => Number(val)),
  lastChangeDate: z.string()
    .min(1, { message: "La fecha es obligatoria" })
});

type PieceFormValues = z.infer<typeof pieceSchema>;

export const PieceEditModal: React.FC<PieceEditModalProps> = ({
  isOpen,
  onClose,
  piece,
  onUpdatePiece
}) => {
  const isNewPiece = piece.id.startsWith('p-new-');

  const {
    register,
    handleSubmit,
    formState: { errors, isValid }
  } = useForm<PieceFormValues>({
    resolver: zodResolver(pieceSchema),
    mode: "onChange",
    defaultValues: {
      lifeKm: isNewPiece ? ('' as any) : piece.lifeKm,
      lifeMonths: isNewPiece ? ('' as any) : piece.lifeMonths,
      lastChangeKm: isNewPiece ? ('' as any) : piece.lastChangeKm,
      lastChangeDate: isNewPiece ? '' : piece.lastChangeDate
    }
  });

  const onSubmit = (data: PieceFormValues) => {
    onUpdatePiece({
      ...piece,
      lifeKm: data.lifeKm,
      lifeMonths: data.lifeMonths,
      lastChangeKm: data.lastChangeKm,
      lastChangeDate: data.lastChangeDate
    });
    alert(`Tolerancias de fábrica actualizadas para "${piece.name}".`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <motion.div 
        className={styles.modalContainer}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", duration: 0.3 }}
      >
        <button className={styles.closeButton} onClick={onClose} aria-label="Cerrar">
          <FaTimes />
        </button>

        <header className={styles.modalHeader}>
          <div className={styles.iconWrapper}>
            {piece.category === 'frenos' && <GiStopSign />}
            {piece.category === 'suspensión' && <GiSuspensionBridge />}
            {piece.category === 'motor' && <GiGears />}
            {piece.category === 'transmisión' && <GiGearStickPattern />}
            {piece.category === 'eléctrico' && <GiElectric />}
            {piece.category === 'neumáticos' && <GiCarWheel />}
            {piece.category === 'enfriamiento' && <GiSnowflake2 />}
            {piece.category === 'dirección' && <GiSteeringWheel />}
            {!['frenos', 'suspensión', 'motor', 'transmisión', 'eléctrico', 'neumáticos', 'enfriamiento', 'dirección'].includes(piece.category) && <FaWrench />}
          </div>
          <h3>Asignación de Tolerancias</h3>
          <p className={styles.subtitle}>Componente: <strong>{piece.name}</strong></p>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className={styles.modalForm}>
          <div className="row g-3 mb-3">
            <div className="col-12">
              <label className={styles.inputLabel}>Vida Útil de Fábrica (Km):</label>
              <div className={styles.inputWrapper}>
                <FaRoad className={styles.inputIcon} />
                <input 
                  type="number" 
                  className={styles.numberInput}
                  placeholder="Ej: 50000"
                  {...register("lifeKm")}
                />
              </div>
              {errors.lifeKm && <span className={styles.errorMessage}>{errors.lifeKm.message}</span>}
            </div>

            <div className="col-12">
              <label className={styles.inputLabel}>Vida Útil de Fábrica (Meses):</label>
              <div className={styles.inputWrapper}>
                <FaCalendarAlt className={styles.inputIcon} />
                <input 
                  type="number" 
                  className={styles.numberInput}
                  placeholder="Ej: 36"
                  {...register("lifeMonths")}
                />
              </div>
              {errors.lifeMonths && <span className={styles.errorMessage}>{errors.lifeMonths.message}</span>}
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-12">
              <label className={styles.inputLabel}>Km en Último Cambio:</label>
              <div className={styles.inputWrapper}>
                <FaRoad className={styles.inputIcon} />
                <input 
                  type="number" 
                  className={styles.numberInput}
                  placeholder="Ej: 85000"
                  {...register("lastChangeKm")}
                />
              </div>
              {errors.lastChangeKm && <span className={styles.errorMessage}>{errors.lastChangeKm.message}</span>}
            </div>

            <div className="col-12">
              <label className={styles.inputLabel}>Fecha de Último Cambio:</label>
              <div className={styles.inputWrapper}>
                <FaCalendarAlt className={styles.inputIcon} />
                <input 
                  type="date" 
                  className={styles.numberInput}
                  max={new Date().toISOString().split('T')[0]}
                  {...register("lastChangeDate")}
                />
              </div>
              {errors.lastChangeDate && <span className={styles.errorMessage}>{errors.lastChangeDate.message}</span>}
            </div>
          </div>

          <footer className={styles.modalFooter}>
            <button type="button" className="btn-duo-3d btn-duo-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-duo-3d btn-duo-primary" disabled={!isValid}>
              <FaCheckCircle className="me-1" />
              Guardar Tolerancias
            </button>
          </footer>
        </form>
      </motion.div>
    </div>
  );
};
