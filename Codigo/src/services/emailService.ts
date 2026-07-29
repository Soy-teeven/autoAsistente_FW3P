import emailjs from '@emailjs/browser';

/**
 * Servicio para envío de correos electrónicos usando EmailJS.
 */

const EMAILJS_SERVICE_ID = 'service_2qw3nkf';
const EMAILJS_TEMPLATE_USER_MAINTENANCE = 'template_jk2h6tj';
const EMAILJS_TEMPLATE_ADMIN_NOTIFICATION = 'template_nkr97ow';

// TODO: Reemplazar con la Public Key real de EmailJS
const EMAILJS_PUBLIC_KEY = 'fSKeSyU3IkW9kIxie'; 

export const emailService = {
  // Notificación al usuario de su propio vehículo
  notifyMaintenanceDue: async (toEmail: string, userName: string, vehicleName: string, pieceName: string, type: 'Próximo' | 'Vencido', currentKm: number) => {
    try {
      const templateParams = {
        email: toEmail,
        nombre: userName || 'Usuario',
        vehiculo: vehicleName,
        mantenimiento: pieceName,
        fecha: new Date().toLocaleDateString('es-ES'),
        kilometraje: currentKm,
        observacion: type === 'Vencido' 
          ? 'La pieza ha superado su límite de desgaste recomendado.' 
          : 'La pieza está próxima a requerir un cambio.'
      };

      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_USER_MAINTENANCE,
        templateParams,
        EMAILJS_PUBLIC_KEY
      );
      console.log('Correo de usuario enviado exitosamente');
    } catch (error) {
      console.error('Error al enviar correo de usuario:', error);
    }
  },

  // Notificación al administrador sobre el vehículo de un usuario
  notifyAdminMaintenance: async (adminEmail: string, userName: string, userEmail: string, vehicleName: string, pieceName: string, currentKm: number) => {
    try {
      const templateParams = {
        nombre: userName || 'Usuario',
        user_email: userEmail, // Correo del cliente
        admin_email: adminEmail, // Correo del administrador
        email: userEmail, // Email del cliente para que salga en el cuerpo del mensaje
        vehiculo: vehicleName,
        pieza: pieceName,
        kilometraje: currentKm,
        fecha: new Date().toLocaleDateString('es-ES')
      };

      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ADMIN_NOTIFICATION,
        templateParams,
        EMAILJS_PUBLIC_KEY
      );
      console.log('Correo de administrador enviado exitosamente');
    } catch (error) {
      console.error('Error al enviar correo a administrador:', error);
    }
  },

  notifyShareRequest: (toEmail: string, fromUserName: string, vehicleName: string) => {
    // Si tienes un template para esto, lo puedes agregar de manera similar.
    console.log(`Mock: Invitación enviada a ${toEmail} para ver ${vehicleName}`);
  },

  notifyShareResponse: (toEmail: string, fromUserName: string, vehicleName: string, accepted: boolean) => {
    // Si tienes un template para esto, lo puedes agregar de manera similar.
    console.log(`Mock: Respuesta de invitación enviada a ${toEmail}`);
  }
};
