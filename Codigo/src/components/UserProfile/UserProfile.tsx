import React, { useState } from 'react';
import { FaUser, FaCamera, FaEnvelope, FaShieldAlt, FaSignOutAlt, FaPalette, FaSun, FaMoon } from 'react-icons/fa';
import { User } from '../../types';

import styles from './UserProfile.module.css';

interface UserProfileProps {
  user: User;
  onLogout: () => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  user,
  onLogout,
  theme,
  setTheme
}) => {
  const [avatar, setAvatar] = useState<string | null>(() => {
    return user.avatar || localStorage.getItem(`user_avatar_${user.email}`) || null;
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert("Por favor selecciona un archivo de imagen válido.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setAvatar(base64String);
      localStorage.setItem(`user_avatar_${user.email}`, base64String);
      
      const db: User[] = JSON.parse(localStorage.getItem('users_database') || '[]');
      const updatedDb = db.map(u => u.email === user.email ? { ...u, avatar: base64String } : u);
      localStorage.setItem('users_database', JSON.stringify(updatedDb));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={styles.profileContainer}>
      <div className={styles.profileCard}>
        <header className={styles.profileHeader}>
          <div className={styles.avatarContainer}>
            {avatar ? (
              <img src={avatar} alt="Avatar de usuario" className={styles.avatarImage} />
            ) : (
              <div className={styles.avatarPlaceholder}>
                <FaUser />
              </div>
            )}
            
            <label htmlFor="avatar-file-input" className={styles.cameraBtn} title="Cambiar Foto de Perfil (Base64)">
              <FaCamera />
              <input 
                id="avatar-file-input" 
                type="file" 
                accept="image/*" 
                onChange={handleAvatarChange} 
                className={styles.hiddenInput}
                aria-label="Cargar nueva foto de perfil"
              />
            </label>
          </div>
          
          <h2 className={styles.userName}>{user.name}</h2>
          <span className={`badge ${user.role === 'admin' ? 'bg-danger' : 'bg-primary'} ${styles.roleBadge}`}>
            <FaShieldAlt className="me-1" />
            {user.role === 'admin' ? 'Administrador' : 'Conductor'}
          </span>
        </header>

        <section className={styles.infoSection}>
          <div className={styles.infoRow}>
            <FaEnvelope className={styles.infoIcon} />
            <div className={styles.infoContent}>
              <span className={styles.infoLabel}>Correo Registrado</span>
              <span className={styles.infoValue}>{user.email}</span>
            </div>
          </div>
        </section>

        {/* RF03 - Selector de tema visual dinámico */}
        <section className={styles.themeSection}>
          <h3 className={styles.sectionTitle}>
            <FaPalette className="me-2 text-info" />
            Tema de la Interfaz (RF03)
          </h3>
          <div className={styles.themeButtons}>
            <button 
              className={`${styles.themeBtn} ${theme === 'light' ? styles.themeBtnActive : ''}`}
              onClick={() => setTheme('light')}
            >
              <FaSun className="me-2" /> Claro
            </button>
            <button 
              className={`${styles.themeBtn} ${theme === 'dark' ? styles.themeBtnActive : ''}`}
              onClick={() => setTheme('dark')}
            >
              <FaMoon className="me-2" /> Oscuro
            </button>
          </div>
        </section>

        <footer className={styles.profileFooter}>
          <button 
            className="btn-duo-3d btn-duo-danger w-100"
            onClick={onLogout}
            title="Cerrar sesión de mi cuenta"
          >
            <FaSignOutAlt className="me-2" />
            Cerrar Sesión
          </button>
        </footer>
      </div>
    </div>
  );
};
