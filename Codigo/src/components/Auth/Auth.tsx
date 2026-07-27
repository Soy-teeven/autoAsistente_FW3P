import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { FaEnvelope, FaLock, FaUser, FaExclamationTriangle, FaUserShield, FaCheckCircle, FaCar, FaShieldAlt } from 'react-icons/fa';
import bcrypt from 'bcryptjs';
import { User } from '../../types';

import styles from './Auth.module.css';

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim().toLowerCase());

const loginSchema = z.object({
  email: z.string().trim().min(1, { message: "El correo es obligatorio" }).refine((value) => isValidEmail(value), { message: "Formato de correo inválido" }),
  password: z.string().trim().min(1, { message: "La contraseña es obligatoria" })
});

const registerSchema = z.object({
  name: z.string().trim().min(2, { message: "El nombre debe tener al menos 2 letras" }).refine((value) => value.split(/\s+/).filter(Boolean).length >= 2, {
    message: "Ingresa nombre y apellido para continuar"
  }),
  email: z.string().trim().min(1, { message: "El correo es obligatorio" }).refine((value) => isValidEmail(value), { message: "Formato de correo inválido" }),
  password: z.string().trim().min(6, { message: "La contraseña debe tener al menos 6 caracteres" }).refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), {
    message: "La contraseña debe incluir letras y números"
  }),
  role: z.enum(['user', 'admin']),
  avatar: z.string().optional()
});

interface AuthProps {
  onLoginSuccess: (user: User) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [avatarBase64, setAvatarBase64] = useState<string>('');

  const {
    register: loginRegister,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors, isValid: isLoginValid }
  } = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    mode: "onChange"
  });

  const {
    register: regRegister,
    handleSubmit: handleRegSubmit,
    formState: { errors: regErrors, isValid: isRegValid },
    reset: resetRegForm
  } = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
    defaultValues: {
      role: 'user'
    }
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setApiError('El archivo seleccionado debe ser una imagen');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setApiError('El archivo de imagen no debe superar los 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarBase64(reader.result as string);
      setApiError(null);
    };
    reader.readAsDataURL(file);
  };

  const onLogin = (data: z.infer<typeof loginSchema>) => {
    setApiError(null);
    setSuccessMsg(null);

    const cleanEmail = data.email.trim().toLowerCase();
    const cleanPassword = data.password.trim();

    let users: User[] = [];
    try {
      const storedValue = localStorage.getItem('users_database');
      users = storedValue ? JSON.parse(storedValue) : [];
    } catch {
      users = [];
    }

    if (!Array.isArray(users)) {
      users = [];
    }

    const adminHash = bcrypt.hashSync('password123', 10);
    const userHash = bcrypt.hashSync('password123', 10);

    if (users.length === 0) {
      users = [
        { id: 'u-admin-1', name: 'Admin General', email: 'admin@car.com', password: adminHash, role: 'admin', avatar: '' },
        { id: 'u-user-1', name: 'Juan Conductor', email: 'conductor@car.com', password: userHash, role: 'user', avatar: '' }
      ];
      localStorage.setItem('users_database', JSON.stringify(users));
    }

    const foundIndex = users.findIndex((u: User) => u && typeof u.email === 'string' && u.email.trim().toLowerCase() === cleanEmail);

    if (foundIndex === -1) {
      setApiError('Credenciales inválidas');
      return;
    }

    const foundUser = users[foundIndex];
    let isPasswordValid = false;

    try {
      if (foundUser.password && (foundUser.password.startsWith('$2a$') || foundUser.password.startsWith('$2b$'))) {
        isPasswordValid = bcrypt.compareSync(cleanPassword, foundUser.password);
      } else {
        isPasswordValid = cleanPassword === foundUser.password;
        if (isPasswordValid) {
          foundUser.password = bcrypt.hashSync(cleanPassword, 10);
          users[foundIndex] = foundUser;
          localStorage.setItem('users_database', JSON.stringify(users));
        }
      }
    } catch (err) {
      isPasswordValid = cleanPassword === foundUser.password;
    }

    if (isPasswordValid) {
      onLoginSuccess({
        ...foundUser,
        name: typeof foundUser.name === 'string' ? foundUser.name.trim() : 'Usuario',
        email: cleanEmail,
        role: foundUser.role === 'admin' ? 'admin' : 'user',
        avatar: typeof foundUser.avatar === 'string' ? foundUser.avatar : '',
      });
    } else {
      setApiError('Credenciales inválidas');
    }
  };

  const onRegister = (data: z.infer<typeof registerSchema>) => {
    setApiError(null);
    setSuccessMsg(null);

    const cleanEmail = data.email.trim().toLowerCase();
    const cleanName = data.name.trim();

    let users: User[] = [];
    try {
      const storedValue = localStorage.getItem('users_database');
      users = storedValue ? JSON.parse(storedValue) : [];
    } catch {
      users = [];
    }

    if (!Array.isArray(users)) {
      users = [];
    }

    const emailExists = users.some((u: User) => u && typeof u.email === 'string' && u.email.trim().toLowerCase() === cleanEmail);

    if (emailExists) {
      setApiError("El correo electrónico ya se encuentra registrado");
      return;
    }

    const hashedPassword = bcrypt.hashSync(data.password.trim(), 10);
    const userId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `u-${Date.now()}`;

    const newUser: User = {
      id: userId,
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword,
      role: data.role === 'admin' ? 'admin' : 'user',
      avatar: avatarBase64 || ''
    };

    users.push(newUser);
    localStorage.setItem('users_database', JSON.stringify(users));
    
    resetRegForm();
    setAvatarBase64('');
    setIsRegister(false);
    setSuccessMsg("¡Registro exitoso! Por favor inicia sesión con tus credenciales.");
  };

  const handleQuickLogin = (email: string) => {
    onLogin({ email, password: 'password123' });
  };

  return (
    <div className={styles.authContainer}>
      <motion.div 
        className={styles.authCard}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Cabecera elegante y sobria */}
        <div className={styles.logoWrapper}>
          <div className="bg-primary text-white p-3 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: 56, height: 56 }}>
            <FaCar className="fs-3" />
          </div>
          <h1 className={styles.appName}>iDrive</h1>
          <p className={styles.appSlogan}>Control y Mantenimiento Vehicular Preventivo</p>
        </div>

        <AnimatePresence>
          {successMsg && (
            <motion.div 
              className="alert alert-success d-flex align-items-center mb-3"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <FaCheckCircle className="me-2 flex-shrink-0" />
              <span>{successMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {apiError && (
            <motion.div 
              className={styles.apiErrorBox}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <FaExclamationTriangle className="me-2 flex-shrink-0" />
              <span>{apiError}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={styles.tabHeader}>
          <button 
            className={`${styles.tabBtn} ${!isRegister ? styles.tabBtnActive : ''}`}
            onClick={() => { setIsRegister(false); setApiError(null); setSuccessMsg(null); }}
          >
            Ingresar
          </button>
          <button 
            className={`${styles.tabBtn} ${isRegister ? styles.tabBtnActive : ''}`}
            onClick={() => { setIsRegister(true); setApiError(null); setSuccessMsg(null); }}
          >
            Registrarse
          </button>
        </div>

        <div className={styles.formContent}>
          {!isRegister ? (
            <form onSubmit={handleLoginSubmit(onLogin)} className={styles.authForm}>
              <div className={styles.formGroup}>
                <label className={styles.fieldLabel}>Correo Electrónico:</label>
                <div className={styles.inputWrapper}>
                  <FaEnvelope className={styles.inputIcon} />
                  <input 
                    type="email" 
                    placeholder="ejemplo@correo.com" 
                    className={`${styles.authInput} ${loginErrors.email ? styles.inputError : ''}`}
                    {...loginRegister("email")}
                  />
                </div>
                {loginErrors.email && (
                  <span className={styles.errorSpan}>{loginErrors.email.message}</span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.fieldLabel}>Contraseña:</label>
                <div className={styles.inputWrapper}>
                  <FaLock className={styles.inputIcon} />
                  <input 
                    type="password" 
                    placeholder="••••••" 
                    className={`${styles.authInput} ${loginErrors.password ? styles.inputError : ''}`}
                    {...loginRegister("password")}
                  />
                </div>
                {loginErrors.password && (
                  <span className={styles.errorSpan}>{loginErrors.password.message}</span>
                )}
              </div>

              <button 
                type="submit" 
                className="btn-duo-3d btn-duo-primary w-100 mt-3"
                disabled={!isLoginValid}
              >
                Iniciar Sesión
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegSubmit(onRegister)} className={styles.authForm}>
              <div className={styles.formGroup}>
                <label className={styles.fieldLabel}>Nombre Completo:</label>
                <div className={styles.inputWrapper}>
                  <FaUser className={styles.inputIcon} />
                  <input 
                    type="text" 
                    placeholder="Nombre y Apellido" 
                    className={`${styles.authInput} ${regErrors.name ? styles.inputError : ''}`}
                    {...regRegister("name")}
                  />
                </div>
                {regErrors.name && (
                  <span className={styles.errorSpan}>{regErrors.name.message}</span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.fieldLabel}>Correo Electrónico:</label>
                <div className={styles.inputWrapper}>
                  <FaEnvelope className={styles.inputIcon} />
                  <input 
                    type="email" 
                    placeholder="ejemplo@correo.com" 
                    className={`${styles.authInput} ${regErrors.email ? styles.inputError : ''}`}
                    {...regRegister("email")}
                  />
                </div>
                {regErrors.email && (
                  <span className={styles.errorSpan}>{regErrors.email.message}</span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.fieldLabel}>Contraseña:</label>
                <div className={styles.inputWrapper}>
                  <FaLock className={styles.inputIcon} />
                  <input 
                    type="password" 
                    placeholder="Mínimo 6 caracteres" 
                    className={`${styles.authInput} ${regErrors.password ? styles.inputError : ''}`}
                    {...regRegister("password")}
                  />
                </div>
                {regErrors.password && (
                  <span className={styles.errorSpan}>{regErrors.password.message}</span>
                )}
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className={styles.fieldLabel}>Rol de Usuario:</label>
                  <div className={styles.inputWrapper}>
                    <FaUserShield className={styles.inputIcon} />
                    <select className={styles.authInput} {...regRegister("role")}>
                      <option value="user">Usuario (Conductor)</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                </div>
                <div className="col-6">
                  <label className={styles.fieldLabel}>Foto (Base64):</label>
                  <div className={styles.inputWrapper}>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className={styles.fileInput}
                    />
                  </div>
                </div>
              </div>

              {avatarBase64 && (
                <div className="text-center mb-3">
                  <img src={avatarBase64} alt="Previsualización Avatar" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
                </div>
              )}

              <button 
                type="submit" 
                className="btn-duo-3d btn-duo-primary w-100 mt-2"
                disabled={!isRegValid}
              >
                Crear Cuenta
              </button>
            </form>
          )}
        </div>

        <div className={styles.demoAccounts}>
          <p className="small text-muted text-center m-0 mt-3 mb-2">
            <strong>Cuentas Demo (Contraseña: <code>password123</code>):</strong>
          </p>
          <div className="d-flex justify-content-center gap-2">
            <button 
              type="button" 
              className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
              onClick={() => handleQuickLogin('admin@car.com')}
            >
              <FaShieldAlt /> Admin
            </button>
            <button 
              type="button" 
              className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
              onClick={() => handleQuickLogin('conductor@car.com')}
            >
              <FaCar /> Usuario
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
