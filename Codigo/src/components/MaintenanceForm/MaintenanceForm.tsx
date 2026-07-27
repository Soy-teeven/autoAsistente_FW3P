import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FaWrench, FaTools, FaCalendarAlt, FaRoad, FaDollarSign, FaTimes } from 'react-icons/fa';
import { Piece } from '../../types';

import styles from './MaintenanceForm.module.css';

const createMaintenanceSchema = (currentVehicleKm: number) => z.object({
  type: z.enum(['Preventivo', 'Correctivo']),
  date: z.string().trim().min(1, { message: "La fecha es obligatoria" }).refine((value) => {
    const selectedDate = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    return !Number.isNaN(selectedDate.getTime()) && selectedDate <= today;
  }, { message: "La fecha no puede ser futura" }),
  km: z.coerce.number({
    invalid_type_error: "Debe ser un número"
  })
  .int({ message: "Debe ser un número entero" })
  .positive({ message: "El kilometraje debe ser mayor a cero" })
  .refine((value) => value <= currentVehicleKm, {
    message: `El kilometraje no puede superar el odómetro actual (${currentVehicleKm} km)`
  }),
  cost: z.coerce.number({
    invalid_type_error: "Debe ser un número"
  })
  .positive({ message: "El costo debe ser mayor a cero" }),
  provider: z.string().trim().min(3, { message: "Especifica el taller o proveedor (mínimo 3 letras)" })
});

type MaintenanceFormValues = z.infer<ReturnType<typeof createMaintenanceSchema>>;

interface MaintenanceFormProps {
  isOpen: boolean;
  onClose: () => void;
  piece: Piece;
  currentVehicleKm: number;
  onRecordMaintenance: (pieceId: string, lastChangeKm: number, lastChangeDate: string, cost: number, provider: string, type: 'Preventivo' | 'Correctivo') => void;
}

export const MaintenanceForm: React.FC<MaintenanceFormProps> = ({
  isOpen,
  onClose,
  piece,
  currentVehicleKm,
  onRecordMaintenance
}) => {
  const maintenanceSchema = createMaintenanceSchema(currentVehicleKm);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset
  } = useForm<MaintenanceFormValues>({
    resolver: zodResolver(maintenanceSchema),
    mode: "onChange",
    defaultValues: {
      type: 'Preventivo',
      date: new Date().toISOString().split('T')[0],
      km: currentVehicleKm,
      cost: 50,
      provider: ''
    }
  });

  const onSubmit = (data: MaintenanceFormValues) => {
    // Registrar el mantenimiento
    onRecordMaintenance(
      piece.id,
      data.km,
      data.date,
      data.cost,
      data.provider,
      data.type
    );
    
    // Alerta lúdica estilo Duolingo
    alert(`Mantenimiento registrado con éxito para "${piece.name}". El desgaste ha vuelto al 0%.`);
    reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div 
        className={styles.modalContainer}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="maint-modal-title"
      >
        <button 
          className={styles.closeButton} 
          onClick={onClose}
          aria-label="Cerrar modal"
        >
          <FaTimes />
        </button>

        {/* Cabecera */}
        <header className={styles.modalHeader}>
          <div className={styles.iconWrapper}>
            <FaWrench />
          </div>
          <h2 id="maint-modal-title">Registrar Mantenimiento</h2>
          <p className={styles.subtitle}>Componente: <strong>{piece.name}</strong></p>
        </header>

        {/* Formulario (H5 - Prevención de errores con Zod) */}
        <form onSubmit={handleSubmit(onSubmit)} className={styles.modalForm}>
          
          <div className={styles.formRow}>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label htmlFor="type-select" className={styles.inputLabel}>Tipo de Servicio:</label>
              <select 
                id="type-select"
                className={styles.textSelect}
                {...register("type")}
              >
                <option value="Preventivo">Preventivo</option>
                <option value="Correctivo">Correctivo</option>
              </select>
            </div>

            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label htmlFor="date-input" className={styles.inputLabel}>Fecha de Intervención:</label>
              <div className={styles.inputWrapper}>
                <FaCalendarAlt className={styles.inputIcon} />
                <input 
                  id="date-input"
                  type="date"
                  className={styles.textInput}
                  {...register("date")}
                />
              </div>
              {errors.date && (
                <span className={styles.errorMessage}>{errors.date.message}</span>
              )}
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label htmlFor="maint-km-input" className={styles.inputLabel}>Kilometraje Registrado:</label>
              <div className={styles.inputWrapper}>
                <FaRoad className={styles.inputIcon} />
                <input 
                  id="maint-km-input"
                  type="number"
                  placeholder={currentVehicleKm.toString()}
                  className={`${styles.textInput} ${errors.km ? styles.inputError : ''}`}
                  {...register("km")}
                />
              </div>
              {errors.km && (
                <span className={styles.errorMessage}>{errors.km.message}</span>
              )}
            </div>

            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label htmlFor="cost-input" className={styles.inputLabel}>Costo del Servicio ($):</label>
              <div className={styles.inputWrapper}>
                <FaDollarSign className={styles.inputIcon} />
                <input 
                  id="cost-input"
                  type="number"
                  step="0.01"
                  placeholder="50"
                  className={`${styles.textInput} ${errors.cost ? styles.inputError : ''}`}
                  {...register("cost")}
                />
              </div>
              {errors.cost && (
                <span className={styles.errorMessage}>{errors.cost.message}</span>
              )}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="provider-input" className={styles.inputLabel}>Taller / Proveedor:</label>
            <div className={styles.inputWrapper}>
              <FaTools className={styles.inputIcon} />
              <input 
                id="provider-input"
                type="text"
                placeholder="Ej. Taller Mecánico Central"
                className={`${styles.textInput} ${errors.provider ? styles.inputError : ''}`}
                {...register("provider")}
              />
            </div>
            {errors.provider && (
              <span className={styles.errorMessage}>{errors.provider.message}</span>
            )}
          </div>

          <p className={styles.helpText}>
            * Al completar el registro, los contadores de kilometraje y tiempo de la pieza se reiniciarán a partir de la nueva lectura, restableciendo su barra de desgaste en el Dashboard.
          </p>

          {/* Footer Botonera */}
          <footer className={styles.modalFooter}>
            <button 
              type="button" 
              className="btn-duo-3d btn-duo-secondary" 
              onClick={onClose}
              style={{ flex: 1 }}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn-duo-3d btn-duo-primary"
              disabled={!isValid}
              style={{ flex: 1 }}
            >
              Registrar
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};
