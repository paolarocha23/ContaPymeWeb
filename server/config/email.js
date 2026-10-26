import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let transporter = null;

if (process.env.SMTP_HOST && process.env.SMTP_USER) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

/**
 * Enviar código de verificación de 2 pasos
 */
export async function send2FACode(email, username, code) {
  const subject = `ContaPyme - Tu código de verificación en 2 pasos: ${code}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #4f46e5; margin: 0; font-size: 26px;">ContaPyme</h1>
        <p style="color: #64748b; margin-top: 4px; font-size: 14px;">Seguridad de la Cuenta</p>
      </div>
      <p style="font-size: 16px; color: #1e293b;">Hola <strong>${username}</strong>,</p>
      <p style="font-size: 15px; color: #475569; line-height: 1.5;">
        Has solicitado iniciar sesión en el sistema ContaPyme. Introduce el siguiente código de verificación en 2 pasos para completar el acceso:
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <span style="display: inline-block; font-size: 34px; font-weight: 700; letter-spacing: 8px; color: #4f46e5; background: #eef2ff; padding: 14px 28px; border-radius: 10px; border: 1px dashed #6366f1;">
          ${code}
        </span>
      </div>
      <p style="font-size: 13px; color: #64748b; line-height: 1.4;">
        Este código es válido durante <strong>10 minutos</strong>. Si tú no realizaste esta solicitud, te sugerimos cambiar tu contraseña de inmediato.
      </p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 12px; color: #94a3b8; text-align: center;">
        ContaPyme &copy; ${new Date().getFullYear()} - Sistema de Gestión Contable y Comercial
      </p>
    </div>
  `;

  console.log(`\n======================================================`);
  console.log(`📧 [CORREO 2FA] Enviando a: ${email} (${username})`);
  console.log(`🔑 CÓDIGO DE VERIFICACIÓN 2FA: [ ${code} ]`);
  console.log(`======================================================\n`);

  // Si no hay configuración SMTP, usar fallback de consola (para desarrollo)
  if (!transporter) {
    console.warn('⚠️ SMTP no configurado – usando fallback de consola para 2FA');
    console.log(`Código 2FA (fallback): ${code}`);
    return { sent: false, fallbackCode: code, mode: 'console_fallback' };
  }
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"ContaPyme" <no-reply@contapyme.com>',
      to: email,
      subject,
      html
    });
    console.log(`✅ Correo 2FA enviado vía SMTP a ${email}`);
    return { sent: true, mode: 'smtp' };
  } catch (err) {
    console.warn(`❌ Falló envío SMTP 2FA (${err.message}); usando fallback de consola`);
    console.log(`Código 2FA (fallback): ${code}`);
    return { sent: false, fallbackCode: code, mode: 'console_fallback' };
  }
}

/**
 * Enviar token/enlace de recuperación de contraseña
 */
export async function sendPasswordResetEmail(email, username, token, resetUrl) {
  const subject = `ContaPyme - Recuperación de Contraseña`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #4f46e5; margin: 0; font-size: 26px;">ContaPyme</h1>
        <p style="color: #64748b; margin-top: 4px; font-size: 14px;">Restablecimiento de Contraseña</p>
      </div>
      <p style="font-size: 16px; color: #1e293b;">Hola <strong>${username}</strong>,</p>
      <p style="font-size: 15px; color: #475569; line-height: 1.5;">
        Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en ContaPyme.
      </p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${resetUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 12px 24px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px;">
          Restablecer Contraseña
        </a>
      </div>
      <p style="font-size: 13px; color: #64748b; line-height: 1.4;">
        O si lo prefieres, copia y pega el siguiente código/token en el formulario de restablecimiento:
      </p>
      <div style="background-color: #f1f5f9; padding: 10px 14px; border-radius: 6px; font-family: monospace; font-size: 13px; word-break: break-all; color: #334155;">
        ${token}
      </div>
      <p style="font-size: 13px; color: #64748b; margin-top: 14px;">
        Este enlace y token expiran en <strong>1 hora</strong>. Si no solicitaste este cambio, puedes ignorar este mensaje.
      </p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 12px; color: #94a3b8; text-align: center;">
        ContaPyme &copy; ${new Date().getFullYear()} - Sistema de Gestión Contable y Comercial
      </p>
    </div>
  `;

  console.log(`\n======================================================`);
  console.log(`📧 [RECUPERAR CONTRASEÑA] Enviando a: ${email} (${username})`);
  console.log(`🔗 TOKEN DE RECUPERACIÓN: ${token}`);
  console.log(`🌐 ENLACE DIRECTO: ${resetUrl}`);
  console.log(`======================================================\n`);

  if (transporter) {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"ContaPyme" <no-reply@contapyme.com>',
        to: email,
        subject,
        html
      });
      console.log(` Correo de recuperación enviado vía SMTP exitosamente a ${email}`);
      return { sent: true, mode: 'smtp' };
    } catch (err) {
      console.warn(` No se pudo enviar vía SMTP (${err.message}). Se usó fallback en consola.`);
      return { sent: false, fallbackToken: token, mode: 'console_fallback' };
    }
  }

  return { sent: false, fallbackToken: token, mode: 'console' };
}
