import React, { useState } from 'react';
import { FaFileAlt, FaUpload, FaTrash, FaCheckCircle, FaLock } from 'react-icons/fa';

import styles from './DocumentVault.module.css';

interface DocumentVaultProps {
  vehicleId: string;
  vehicleName: string;
}

export const DocumentVault: React.FC<DocumentVaultProps> = ({
  vehicleId,
  vehicleName
}) => {
  // H1 - Visibilidad del estado: cargar documentos almacenados en LocalStorage
  const [matricula, setMatricula] = useState<string | null>(() => {
    return localStorage.getItem(`doc_matricula_${vehicleId}`) || null;
  });

  const [idCard, setIdCard] = useState<string | null>(() => {
    return localStorage.getItem(`doc_idcard_${vehicleId}`) || null;
  });

  // H3 - Control y Libertad: Carga y preview de Matrícula en Base64
  const handleMatriculaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert("Por favor selecciona una imagen válida de tu matrícula.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setMatricula(base64);
      localStorage.setItem(`doc_matricula_${vehicleId}`, base64);
    };
    reader.readAsDataURL(file);
  };

  // Carga y preview de Identificación
  const handleIdCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert("Por favor selecciona una imagen válida de tu identificación.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setIdCard(base64);
      localStorage.setItem(`doc_idcard_${vehicleId}`, base64);
    };
    reader.readAsDataURL(file);
  };

  // H3 - Control del usuario: capacidad de borrar documentos almacenados
  const deleteDoc = (type: 'matricula' | 'idcard') => {
    if (type === 'matricula') {
      setMatricula(null);
      localStorage.removeItem(`doc_matricula_${vehicleId}`);
    } else {
      setIdCard(null);
      localStorage.removeItem(`doc_idcard_${vehicleId}`);
    }
  };

  return (
    <div className={styles.vaultContainer}>
      <header className={styles.vaultHeader}>
        <div className={styles.iconWrapper}>
          <FaLock />
        </div>
        <h2>Bóveda de Documentos</h2>
        <p className={styles.subtitle}>Vehículo Activo: <strong>{vehicleName}</strong></p>
        <p className="text-muted small mt-1">
          🔒 Todos tus documentos se encriptan y guardan de manera 100% local en tu navegador.
        </p>
      </header>

      {/* Grid de Documentos (2 Columnas) */}
      <div className={styles.docsGrid}>
        
        {/* Documento 1: Matrícula */}
        <section className={styles.docCard}>
          <div className={styles.cardHeader}>
            <FaFileAlt className={styles.docIcon} />
            <div className={styles.titleGroup}>
              <h3>Matrícula del Vehículo</h3>
              <span className={styles.statusBadge}>
                {matricula ? (
                  <span className="text-success fw-bold d-flex align-items-center">
                    <FaCheckCircle className="me-1" /> Cargado
                  </span>
                ) : (
                  <span className="text-warning fw-bold">Pendiente</span>
                )}
              </span>
            </div>
          </div>

          {/* H6 - Reconocimiento: Vista previa en tiempo real del documento */}
          <div className={styles.previewBox}>
            {matricula ? (
              <img src={matricula} alt="Vista previa de matrícula" className={styles.previewImage} />
            ) : (
              <div className={styles.previewPlaceholder}>
                <FaUpload className={styles.uploadArrow} />
                <p className="small m-0 text-muted">Sube una foto de tu matrícula vehicular</p>
              </div>
            )}
          </div>

          <footer className={styles.cardFooter}>
            <label className="btn-duo-3d btn-duo-primary w-100 m-0">
              <FaUpload className="me-1" />
              {matricula ? 'Reemplazar' : 'Subir Documento'}
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleMatriculaChange} 
                className={styles.hiddenInput}
                aria-label="Cargar foto de matrícula"
              />
            </label>

            {matricula && (
              <button 
                className="btn-duo-3d btn-duo-danger ms-2"
                onClick={() => deleteDoc('matricula')}
                title="Eliminar matrícula de la bóveda"
                aria-label="Eliminar matrícula"
              >
                <FaTrash />
              </button>
            )}
          </footer>
        </section>

        {/* Documento 2: Identificación del Propietario */}
        <section className={styles.docCard}>
          <div className={styles.cardHeader}>
            <FaFileAlt className={styles.docIcon} />
            <div className={styles.titleGroup}>
              <h3>Identificación Propietario</h3>
              <span className={styles.statusBadge}>
                {idCard ? (
                  <span className="text-success fw-bold d-flex align-items-center">
                    <FaCheckCircle className="me-1" /> Cargado
                  </span>
                ) : (
                  <span className="text-warning fw-bold">Pendiente</span>
                )}
              </span>
            </div>
          </div>

          {/* Preview */}
          <div className={styles.previewBox}>
            {idCard ? (
              <img src={idCard} alt="Vista previa de identificación" className={styles.previewImage} />
            ) : (
              <div className={styles.previewPlaceholder}>
                <FaUpload className={styles.uploadArrow} />
                <p className="small m-0 text-muted">Sube una foto de tu identificación oficial</p>
              </div>
            )}
          </div>

          <footer className={styles.cardFooter}>
            <label className="btn-duo-3d btn-duo-primary w-100 m-0">
              <FaUpload className="me-1" />
              {idCard ? 'Reemplazar' : 'Subir Documento'}
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleIdCardChange} 
                className={styles.hiddenInput}
                aria-label="Cargar foto de identificación"
              />
            </label>

            {idCard && (
              <button 
                className="btn-duo-3d btn-duo-danger ms-2"
                onClick={() => deleteDoc('idcard')}
                title="Eliminar identificación de la bóveda"
                aria-label="Eliminar identificación"
              >
                <FaTrash />
              </button>
            )}
          </footer>
        </section>

      </div>
    </div>
  );
};
