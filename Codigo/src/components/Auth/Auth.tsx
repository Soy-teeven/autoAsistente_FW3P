import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { FaEnvelope, FaLock, FaUser, FaExclamationTriangle, FaCheckCircle, FaCar, FaShieldAlt } from 'react-icons/fa';
import { User } from '../../types';
import { storageService } from '../../services/storageService';

import styles from './Auth.module.css';

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim().toLowerCase());

const loginSchema = z.object({
  email: z.string().trim().min(1, { message: "El correo es obligatorio" }).refine((value) => isValidEmail(value), { message: "Formato de correo inválido" }),
  password: z.string().trim().min(1, { message: "La contraseña es obligatoria" })
});

const registerSchema = z.object({
  name: z.string().trim().min(2, { message: "El nombre debe tener al menos 2 letras" })
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, { message: "El nombre debe contener solo letras y espacios" })
    .refine((value) => value.split(/\s+/).filter(Boolean).length >= 2, {
      message: "Ingresa nombre y apellido para continuar"
    }),
  email: z.string().trim().min(1, { message: "El correo es obligatorio" }).refine((value) => isValidEmail(value), { message: "Formato de correo inválido" }),
  password: z.string().trim().min(6, { message: "La contraseña debe tener al menos 6 caracteres" }).refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), {
    message: "La contraseña debe incluir letras y números"
  }),
  securityQuestion: z.string().trim().min(5, { message: "La pregunta de seguridad es obligatoria (mín. 5 caracteres)" }),
  securityAnswer: z.string().trim().min(2, { message: "La respuesta es obligatoria" }),
  role: z.enum(['user', 'admin']),
  avatar: z.string().optional()
});

interface AuthProps {
  onLoginSuccess: (user: User) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [expectedCode, setExpectedCode] = useState('');
  const [tempRegData, setTempRegData] = useState<any>(null);

  // Forgot password states
  const [fpStep, setFpStep] = useState(1);
  const [fpEmail, setFpEmail] = useState('');
  const [fpQuestion, setFpQuestion] = useState('');
  const [fpAnswer, setFpAnswer] = useState('');
  const [fpNewPassword, setFpNewPassword] = useState('');

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

  const onLogin = async (data: z.infer<typeof loginSchema>) => {
    setApiError(null);
    setSuccessMsg(null);
    
    try {
      const user = await storageService.loginUser(data.email, data.password);
      onLoginSuccess(user);
    } catch (err: any) {
      setApiError(err.message || 'Credenciales inválidas');
    }
  };

  const onRegister = (data: z.infer<typeof registerSchema>) => {
    setApiError(null);
    setSuccessMsg(null);

    // En lugar de registrar inmediatamente, iniciamos la validación de email
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setExpectedCode(code);
    setTempRegData(data);
    setIsVerifyingEmail(true);
    
    // Simulación de envío de correo
    console.log(`[Email Mock] Enviando código ${code} al correo ${data.email}`);
    setSuccessMsg(`Se ha enviado un código de verificación a ${data.email}. (Para esta prueba, revisa la consola)`);
  };

  const handleVerifyEmailAndRegister = async () => {
    if (verificationCode !== expectedCode) {
      setApiError("El código de verificación es incorrecto.");
      return;
    }

    try {
      const data = tempRegData;
      await storageService.registerUser(
        data.name, 
        data.email, 
        data.password, 
        avatarBase64, 
        data.securityQuestion, 
        data.securityAnswer
      );
      
      resetRegForm();
      setAvatarBase64('');
      setIsRegister(false);
      setIsVerifyingEmail(false);
      setTempRegData(null);
      setVerificationCode('');
      setSuccessMsg("¡Registro exitoso! Por favor inicia sesión con tus credenciales.");
      setApiError(null);
    } catch (err: any) {
      setApiError(err.message || 'Error al registrar usuario');
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setSuccessMsg(null);
    
    try {
      if (fpStep === 1) {
        // Validar correo y obtener pregunta
        const question = storageService.getUserSecurityQuestion(fpEmail);
        setFpQuestion(question);
        setFpStep(2);
      } else if (fpStep === 2) {
        // Validar respuesta y cambiar contraseña
        await storageService.resetPassword(fpEmail, fpAnswer, fpNewPassword);
        setSuccessMsg('Contraseña actualizada correctamente. Puedes iniciar sesión.');
        setIsForgotPassword(false);
        setFpStep(1);
        setFpEmail('');
        setFpAnswer('');
        setFpNewPassword('');
      }
    } catch (err: any) {
      setApiError(err.message);
    }
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

        {!isForgotPassword && !isVerifyingEmail && (
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
        )}

        <div className={styles.formContent}>
          {isForgotPassword ? (
            <form onSubmit={handleForgotPasswordSubmit} className={styles.authForm}>
              <h3 className="text-center mb-4">Recuperar Contraseña</h3>
              
              {fpStep === 1 ? (
                <div className={styles.formGroup}>
                  <label className={styles.fieldLabel}>Ingresa tu Correo Electrónico:</label>
                  <div className={styles.inputWrapper}>
                    <FaEnvelope className={styles.inputIcon} />
                    <input 
                      type="email" 
                      placeholder="ejemplo@correo.com" 
                      className={styles.authInput}
                      value={fpEmail}
                      onChange={(e) => setFpEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.fieldLabel}>Pregunta de Seguridad:</label>
                    <p className="fw-bold mb-2 text-primary">{fpQuestion}</p>
                    <div className={styles.inputWrapper}>
                      <FaShieldAlt className={styles.inputIcon} />
                      <input 
                        type="text" 
                        placeholder="Tu respuesta" 
                        className={styles.authInput}
                        value={fpAnswer}
                        onChange={(e) => setFpAnswer(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.fieldLabel}>Nueva Contraseña:</label>
                    <div className={styles.inputWrapper}>
                      <FaLock className={styles.inputIcon} />
                      <input 
                        type="password" 
                        placeholder="Mínimo 6 caracteres" 
                        className={styles.authInput}
                        value={fpNewPassword}
                        onChange={(e) => setFpNewPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                </>
              )}

              <button type="submit" className="btn-duo-3d btn-duo-primary w-100 mt-3">
                {fpStep === 1 ? 'Continuar' : 'Restablecer Contraseña'}
              </button>
              
              <button 
                type="button" 
                className="btn btn-link text-decoration-none text-muted w-100 mt-2"
                onClick={() => { setIsForgotPassword(false); setFpStep(1); setApiError(null); }}
              >
                Volver a Iniciar Sesión
              </button>
            </form>
          ) : isVerifyingEmail ? (
            <div className={styles.authForm}>
              <h3 className="text-center mb-4">Validar Correo</h3>
              <p className="text-center text-muted mb-4">
                Ingresa el código de 6 dígitos que enviamos a tu correo para verificar tu cuenta.
              </p>
              
              <div className={styles.formGroup}>
                <div className={styles.inputWrapper}>
                  <FaShieldAlt className={styles.inputIcon} />
                  <input 
                    type="text" 
                    placeholder="Código de verificación" 
                    className={styles.authInput}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    maxLength={6}
                  />
                </div>
              </div>
              
              <button 
                type="button" 
                className="btn-duo-3d btn-duo-primary w-100 mt-3"
                onClick={handleVerifyEmailAndRegister}
                disabled={verificationCode.length !== 6}
              >
                Verificar y Completar Registro
              </button>
              
              <button 
                type="button" 
                className="btn btn-link text-decoration-none text-muted w-100 mt-2"
                onClick={() => setIsVerifyingEmail(false)}
              >
                Cancelar
              </button>
            </div>
          ) : !isRegister ? (
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

              <button 
                type="button" 
                className="btn btn-link text-decoration-none text-muted w-100 mt-2"
                onClick={() => { setIsForgotPassword(true); setApiError(null); setSuccessMsg(null); }}
              >
                ¿Olvidaste tu contraseña?
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

              <div className={styles.formGroup}>
                <label className={styles.fieldLabel}>Pregunta de Seguridad (Para recuperar clave):</label>
                <div className={styles.inputWrapper}>
                  <FaShieldAlt className={styles.inputIcon} />
                  <input 
                    type="text" 
                    placeholder="Ej. Nombre de tu primera mascota" 
                    className={`${styles.authInput} ${regErrors.securityQuestion ? styles.inputError : ''}`}
                    {...regRegister("securityQuestion")}
                  />
                </div>
                {regErrors.securityQuestion && (
                  <span className={styles.errorSpan}>{regErrors.securityQuestion.message}</span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.fieldLabel}>Respuesta de Seguridad:</label>
                <div className={styles.inputWrapper}>
                  <FaLock className={styles.inputIcon} />
                  <input 
                    type="text" 
                    placeholder="Respuesta secreta" 
                    className={`${styles.authInput} ${regErrors.securityAnswer ? styles.inputError : ''}`}
                    {...regRegister("securityAnswer")}
                  />
                </div>
                {regErrors.securityAnswer && (
                  <span className={styles.errorSpan}>{regErrors.securityAnswer.message}</span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.fieldLabel}>Foto de Perfil - Opcional:</label>
                <div className={styles.inputWrapper}>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className={styles.fileInput}
                  />
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

      </motion.div>
    </div>
  );
};
