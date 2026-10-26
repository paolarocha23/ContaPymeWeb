import pool from './db.js';
import bcrypt from 'bcryptjs';

export async function initializeDatabase() {
  console.log('🔄 Verificando y preparando esquema de base de datos...');
  try {
    // 1. Verificar si la columna `permisos` existe en `roles`
    const [cols] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'roles' 
        AND COLUMN_NAME = 'permisos'
    `);

    if (cols.length === 0) {
      console.log(' Agregando columna `permisos` a la tabla `roles`...');
      await pool.query('ALTER TABLE roles ADD COLUMN permisos JSON NULL AFTER descripcion');
    }

    // 2. Asignar permisos por defecto a los 3 roles predefinidos
    const adminPerms = JSON.stringify([
      "usuarios", "roles", "clientes", "proveedores", "productos",
      "inventario", "ventas", "compras", "ingresos", "gastos",
      "caja", "cxc", "cxp", "reportes", "bitacora"
    ]);

    const encargadoPerms = JSON.stringify([
      "clientes", "proveedores", "productos", "inventario",
      "ventas", "compras", "ingresos", "gastos", "caja", "cxc", "cxp"
    ]);

    const vendedorPerms = JSON.stringify([
      "ventas", "clientes", "productos_consulta", "caja"
    ]);

    await pool.query(`
      UPDATE roles SET permisos = ? WHERE nombre = 'Administrador' AND (permisos IS NULL OR permisos = 'null')
    `, [adminPerms]);

    await pool.query(`
      UPDATE roles SET permisos = ? WHERE nombre = 'Encargado' AND (permisos IS NULL OR permisos = 'null')
    `, [encargadoPerms]);

    await pool.query(`
      UPDATE roles SET permisos = ? WHERE nombre = 'Vendedor' AND (permisos IS NULL OR permisos = 'null')
    `, [vendedorPerms]);

    // 3. Crear tabla de códigos 2FA si no existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS codigos_2fa (
        id_codigo INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        id_usuario INT UNSIGNED NOT NULL,
        codigo VARCHAR(10) NOT NULL,
        expiracion DATETIME NOT NULL,
        usado TINYINT(1) NOT NULL DEFAULT 0,
        intentos TINYINT NOT NULL DEFAULT 0,
        fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_2fa_usuario (id_usuario),
        CONSTRAINT fk_2fa_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Códigos de verificación en 2 pasos';
    `);

    // 4. Verificar y actualizar la contraseña del usuario 'admin'
    const [adminUser] = await pool.query(`
      SELECT id_usuario, contrasena FROM usuarios WHERE nombre_usuario = 'admin' LIMIT 1
    `);

    if (adminUser.length > 0) {
      const currentHash = adminUser[0].contrasena;
      // Si tiene el placeholder o está vacío, hasheamos 'Admin1234!'
      if (currentHash === '$2b$12$PLACEHOLDER_HASH_CHANGE_ME' || !currentHash.startsWith('$2')) {
        console.log(' Generando hash bcrypt para usuario admin inicial (Admin1234!)...');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('Admin1234!', salt);
        await pool.query('UPDATE usuarios SET contrasena = ? WHERE id_usuario = ?', [
          hashedPassword,
          adminUser[0].id_usuario
        ]);
        console.log(' Contraseña de usuario admin actualizada correctamente.');
      }
    }

    console.log(' Esquema de base de datos verificado y listo.');
  } catch (err) {
    console.error(' Error al inicializar esquema de base de datos:', err);
  }
}
