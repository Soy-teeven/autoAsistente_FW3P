import React, { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { FaRoad, FaExclamationTriangle, FaTimes, FaCheckCircle } from 'react-icons/fa';

import styles from './MileageModal.module.css';

interface MileageModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentKm: number;
  vehicleName: string;
  onUpdateKm: (newKm: number) => void;
}

// RF06 & RNF04: Validación Zod con mensaje de excepción exacto del ERS
const createMileageSchema = (currentKm: number) => z.object({
  mileage: z.coerce.number({
    invalid_type_error: "El kilometraje debe ser un número"
  })
  .int({ message: "El kilometraje debe ser un número entero" })
  .positive({ message: "El kilometraje debe ser mayor a cero" })
  // Excepción exacta especificada en RF06
  .min(currentKm, { message: 'El kilometraje no puede ser inferior al actual registrado' })
});

type MileageFormValues = z.infer<ReturnType<typeof createMileageSchema>>;

export const MileageModal: React.FC<MileageModalProps> = ({
  isOpen,
  onClose,
  currentKm,
  vehicleName,
  onUpdateKm
}) => {
  const mileageSchema = useMemo(() => createMileageSchema(currentKm), [currentKm]);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset
  } = useForm<MileageFormValues>({
    resolver: zodResolver(mileageSchema),
    mode: "onChange",
    defaultValues: {
      mileage: currentKm
    }
  });

  const onSubmit = (data: MileageFormValues) => {
    onUpdateKm(data.mileage);
    reset();
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
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <button 
          className={styles.closeButton} 
          onClick={onClose}
          aria-label="Cerrar modal"
        >
          <FaTimes />
        </button>

        <header className={styles.modalHeader}>
          <div className={styles.iconWrapper}>
            <FaRoad />
          </div>
          <h2 id="modal-title">Actualizar Kilometraje (RF06)</h2>
          <p className={styles.subtitle}>{vehicleName}</p>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className={styles.modalForm}>
          <div className={styles.infoBox}>
            <span className={styles.infoLabel}>Kilometraje Registrado Actualmente:</span>
            <span className={styles.infoValue}>{currentKm.toLocaleString()} km</span>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="mileage-input" className={styles.inputLabel}>
              Ingresa el nuevo Valor del Odómetro:
            </label>
            
            <div className={styles.inputWrapper}>
              <FaRoad className={styles.inputIcon} />
              <input 
                id="mileage-input"
                type="number" 
                placeholder={currentKm.toString()}
                className={`${styles.numberInput} ${errors.mileage ? styles.inputError : ''}`}
                {...register("mileage")}
                onKeyDown={(e) => {
                  if (['e', 'E', '+', '-', '.'].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
              />
              <span className={styles.unitSpan}>km</span>
            </div>

            {/* Excepción visualizada si km < actual */}
            {errors.mileage && (
              <motion.div 
                className={styles.errorMessage}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <FaExclamationTriangle className="me-1" />
                {errors.mileage.message}
              </motion.div>
            )}
          </div>

          <footer className={styles.modalFooter}>
            <button 
              type="button" 
              className="btn-duo-3d btn-duo-secondary" 
              onClick={onClose}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn-duo-3d btn-duo-primary"
              disabled={!isValid}
            >
              <FaCheckCircle className="me-1" />
              Guardar y Recalcular
            </button>
          </footer>
        </form>
      </motion.div>
    </div>
  );
};
