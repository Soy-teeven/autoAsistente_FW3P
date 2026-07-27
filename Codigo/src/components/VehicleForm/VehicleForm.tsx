import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FaCar, FaIdCard, FaRoad, FaPlusCircle, FaBarcode, FaCalendar, FaTag } from 'react-icons/fa';
import { Vehicle, Piece } from '../../types';

import styles from './VehicleForm.module.css';

const createVehicleSchema = (existingVehicles: Vehicle[]) => z.object({
  name: z.string().trim().min(2, { message: "El apodo del auto debe tener al menos 2 caracteres" }),
  brand: z.string().trim().min(2, { message: "La marca debe tener al menos 2 caracteres" }),
  model: z.string().trim().min(1, { message: "El modelo es obligatorio" }),
  year: z.coerce.number({ invalid_type_error: "El año debe ser número" })
    .int({ message: "Año debe ser número entero" })
    .min(1900, { message: "Año inválido (mínimo 1900)" })
    .max(new Date().getFullYear() + 1, { message: "Año no puede ser futuro" }),
  plate: z.string().trim()
    .min(6, { message: "La placa debe tener al menos 6 caracteres" })
    .max(10, { message: "La placa no debe exceder 10 caracteres" })
    .regex(/^[A-Z0-9-]+$/, { message: "La placa solo puede contener letras, números y guiones" })
    .toUpperCase()
    .refine((value) => !existingVehicles.some(v => v.plate.toUpperCase() === value), {
      message: "Esta placa ya está registrada en otro vehículo"
    }),
  vin: z.string().trim()
    .length(17, { message: "El VIN debe tener exactamente 17 caracteres (letras y números)" })
    .regex(/^[A-Z0-9]+$/, { message: "El VIN solo puede contener letras y números" })
    .toUpperCase()
    .refine((value) => !existingVehicles.some(v => v.vin.toUpperCase() === value), {
      message: "Este VIN ya está registrado en otro vehículo"
    }),
  initialKm: z.coerce.number({ invalid_type_error: "Debe ser un número" })
    .nonnegative({ message: "El kilometraje inicial no puede ser negativo" }),
  currentKm: z.coerce.number({ invalid_type_error: "Debe ser un número" })
    .nonnegative({ message: "El kilometraje actual no puede ser negativo" })
}).refine(data => data.currentKm >= data.initialKm, {
  message: "El kilometraje actual no puede ser menor al kilometraje inicial",
  path: ["currentKm"]
});

type VehicleFormValues = z.infer<ReturnType<typeof createVehicleSchema>>;

interface VehicleFormProps {
  userId: string;
  existingVehicles: Vehicle[];
  onAddVehicle: (newVehicle: Vehicle) => void;
  onNavigateToDashboard: () => void;
}

export const VehicleForm: React.FC<VehicleFormProps> = ({
  userId,
  existingVehicles,
  onAddVehicle,
  onNavigateToDashboard
}) => {
  const vehicleSchema = createVehicleSchema(existingVehicles);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset
  } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    mode: "onChange"
  });

  const onSubmit = (data: VehicleFormValues) => {
    const today = new Date().toISOString().split('T')[0];

    // Piezas iniciales estándar asignadas con límites de fábrica
    const defaultPieces: Piece[] = [
      { id: `p-new-1-${Date.now()}`, name: 'Pastillas de Freno Delanteras', category: 'frenos', lifeKm: 30000, lifeMonths: 24, lastChangeKm: data.currentKm, lastChangeDate: today },
      { id: `p-new-2-${Date.now()}`, name: 'Aceite de Motor Sintético', category: 'motor', lifeKm: 10000, lifeMonths: 12, lastChangeKm: data.currentKm, lastChangeDate: today },
      { id: `p-new-3-${Date.now()}`, name: 'Neumáticos Delanteros', category: 'neumáticos', lifeKm: 40000, lifeMonths: 48, lastChangeKm: data.currentKm, lastChangeDate: today },
      { id: `p-new-4-${Date.now()}`, name: 'Amortiguadores Traseros', category: 'suspensión', lifeKm: 60000, lifeMonths: 48, lastChangeKm: data.currentKm, lastChangeDate: today },
      { id: `p-new-5-${Date.now()}`, name: 'Batería 12V', category: 'eléctrico', lifeKm: 50000, lifeMonths: 36, lastChangeKm: data.currentKm, lastChangeDate: today },
    ];

    const newVehicle: Vehicle = {
      id: `v-${Date.now()}`,
      userId,
      name: data.name,
      brand: data.brand,
      model: data.model,
      year: data.year,
      plate: data.plate,
      vin: data.vin,
      initialKm: data.initialKm,
      currentKm: data.currentKm,
      pieces: defaultPieces
    };

    onAddVehicle(newVehicle);
    reset();
    alert("Vehículo registrado exitosamente con sus datos técnicos.");
    onNavigateToDashboard();
  };

  return (
    <div className={styles.formContainer}>
      <div className={styles.formCard}>
        <header className={styles.formHeader}>
          <div className={styles.iconWrapper}>
            <FaCar />
          </div>
          <h2>Registrar Nuevo Vehículo (RF04)</h2>
          <p>Registra las especificaciones técnicas completas de tu automóvil.</p>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className={styles.vehicleForm}>
          {/* Apodo o Nombre Corto */}
          <div className={styles.formGroup}>
            <label htmlFor="name-input" className={styles.inputLabel}>
              Nombre o Apodo del Auto:
            </label>
            <div className={styles.inputWrapper}>
              <FaCar className={styles.inputIcon} />
              <input 
                id="name-input"
                type="text" 
                placeholder="Ej. Mi Corolla Diario" 
                className={`${styles.textInput} ${errors.name ? styles.inputError : ''}`}
                {...register("name")}
              />
            </div>
            {errors.name && <span className={styles.errorMessage}>{errors.name.message}</span>}
          </div>

          {/* Marca y Modelo */}
          <div className="row g-3">
            <div className="col-md-6">
              <div className={styles.formGroup}>
                <label className={styles.inputLabel}>Marca:</label>
                <div className={styles.inputWrapper}>
                  <FaTag className={styles.inputIcon} />
                  <input 
                    type="text" 
                    placeholder="Ej. Toyota, Mazda, Ford" 
                    className={`${styles.textInput} ${errors.brand ? styles.inputError : ''}`}
                    {...register("brand")}
                  />
                </div>
                {errors.brand && <span className={styles.errorMessage}>{errors.brand.message}</span>}
              </div>
            </div>

            <div className="col-md-6">
              <div className={styles.formGroup}>
                <label className={styles.inputLabel}>Modelo:</label>
                <div className={styles.inputWrapper}>
                  <FaCar className={styles.inputIcon} />
                  <input 
                    type="text" 
                    placeholder="Ej. Corolla, CX-5, Mustang" 
                    className={`${styles.textInput} ${errors.model ? styles.inputError : ''}`}
                    {...register("model")}
                  />
                </div>
                {errors.model && <span className={styles.errorMessage}>{errors.model.message}</span>}
              </div>
            </div>
          </div>

          {/* Año, Placa y VIN */}
          <div className="row g-3">
            <div className="col-md-4">
              <div className={styles.formGroup}>
                <label className={styles.inputLabel}>Año de Fabricación:</label>
                <div className={styles.inputWrapper}>
                  <FaCalendar className={styles.inputIcon} />
                  <input 
                    type="number" 
                    placeholder="Ej. 2021" 
                    className={`${styles.textInput} ${errors.year ? styles.inputError : ''}`}
                    {...register("year")}
                  />
                </div>
                {errors.year && <span className={styles.errorMessage}>{errors.year.message}</span>}
              </div>
            </div>

            <div className="col-md-4">
              <div className={styles.formGroup}>
                <label className={styles.inputLabel}>Placa / Matrícula:</label>
                <div className={styles.inputWrapper}>
                  <FaIdCard className={styles.inputIcon} />
                  <input 
                    type="text" 
                    placeholder="ABC-1234" 
                    className={`${styles.textInput} ${errors.plate ? styles.inputError : ''}`}
                    {...register("plate")}
                  />
                </div>
                {errors.plate && <span className={styles.errorMessage}>{errors.plate.message}</span>}
              </div>
            </div>

            <div className="col-md-4">
              <div className={styles.formGroup}>
                <label className={styles.inputLabel} title="Número de Chasis de 17 Caracteres">
                  VIN (17 Caracteres):
                </label>
                <div className={styles.inputWrapper}>
                  <FaBarcode className={styles.inputIcon} />
                  <input 
                    type="text" 
                    placeholder="1HGCR2F83HA000000" 
                    maxLength={17}
                    className={`${styles.textInput} ${errors.vin ? styles.inputError : ''}`}
                    {...register("vin")}
                  />
                </div>
                {errors.vin && <span className={styles.errorMessage}>{errors.vin.message}</span>}
              </div>
            </div>
          </div>

          {/* Kilometraje Inicial y Actual */}
          <div className="row g-3">
            <div className="col-md-6">
              <div className={styles.formGroup}>
                <label className={styles.inputLabel}>Kilometraje Inicial (Registro):</label>
                <div className={styles.inputWrapper}>
                  <FaRoad className={styles.inputIcon} />
                  <input 
                    type="number" 
                    placeholder="Ej. 0 o 35000" 
                    className={`${styles.textInput} ${errors.initialKm ? styles.inputError : ''}`}
                    {...register("initialKm")}
                  />
                  <span className={styles.inputUnit}>km</span>
                </div>
                {errors.initialKm && <span className={styles.errorMessage}>{errors.initialKm.message}</span>}
              </div>
            </div>

            <div className="col-md-6">
              <div className={styles.formGroup}>
                <label className={styles.inputLabel}>Kilometraje Actual (Odómetro):</label>
                <div className={styles.inputWrapper}>
                  <FaRoad className={styles.inputIcon} />
                  <input 
                    type="number" 
                    placeholder="Ej. 45000" 
                    className={`${styles.textInput} ${errors.currentKm ? styles.inputError : ''}`}
                    {...register("currentKm")}
                  />
                  <span className={styles.inputUnit}>km</span>
                </div>
                {errors.currentKm && <span className={styles.errorMessage}>{errors.currentKm.message}</span>}
              </div>
            </div>
          </div>

          <div className={styles.helpBox}>
            <span className="fw-bold">Nota (RF04):</span> Tu vehículo se guardará vinculado a tu cuenta activa y cargará sus métricas de desgaste.
          </div>

          <footer className={styles.formFooter}>
            <button 
              type="submit" 
              className="btn-duo-3d btn-duo-primary w-100"
              disabled={!isValid}
            >
              <FaPlusCircle className="me-2" />
              Guardar Vehículo
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};
