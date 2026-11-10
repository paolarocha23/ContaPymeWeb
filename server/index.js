import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import roleRoutes from './routes/roleRoutes.js';
import userRoutes from './routes/userRoutes.js';
import bitacoraRoutes from './routes/bitacoraRoutes.js';
import clienteRoutes from './routes/clienteRoutes.js';
import cuentasPorPagarRoutes from './routes/cuentasPorPagarRoutes.js';
import categoriaRoutes from './routes/categoriaRoutes.js';
import proveedorRoutes from './routes/proveedorRoutes.js';
import productoRoutes from './routes/productoRoutes.js';
import inventarioRoutes from './routes/inventarioRoutes.js';
import { initializeDatabase } from './config/init_db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Configuración de CORS
app.use(cors({
  origin: true, // Permite peticiones locales y desde otros sistemas
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Parser JSON con límite razonable
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Registro básico de peticiones en consola
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.originalUrl.startsWith('/api')) {
      console.log(`[${req.method}] ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Endpoint de verificación de estado y documentación de la API
app.get('/api', (req, res) => {
  res.json({
    name: 'ContaPyme REST API',
    version: '2.0.0',
    status: 'ONLINE',
    author: 'ContaPyme Security Team',
    endpoints: {
      auth: {
        login: 'POST /api/auth/login',
        verify2FA: 'POST /api/auth/verify-2fa',
        resend2FA: 'POST /api/auth/resend-2fa',
        logout: 'POST /api/auth/logout',
        forgotPassword: 'POST /api/auth/forgot-password',
        resetPassword: 'POST /api/auth/reset-password',
        changePassword: 'POST /api/auth/change-password (Requires Bearer token)',
        me: 'GET /api/auth/me (Requires Bearer token)'
      },
      roles: {
        list: 'GET /api/roles (?nombre=...)',
        get: 'GET /api/roles/:id',
        create: 'POST /api/roles',
        update: 'PUT /api/roles/:id',
        toggleStatus: 'PATCH /api/roles/:id/status',
        assignRole: 'PUT /api/roles/assign-user/:id_usuario'
      },
      users: {
        list: 'GET /api/users (?search=...&id_rol=...&estatus=...)',
        get: 'GET /api/users/:id',
        create: 'POST /api/users',
        update: 'PUT /api/users/:id',
        toggleStatus: 'PATCH /api/users/:id/status',
        adminResetPassword: 'POST /api/users/:id/reset-password-admin'
      },
      clientes: {
        list: 'GET /api/clientes (?q=...&estatus=...&ciudad=...&estado=...&colonia=...&adeudo=...)',
        stats: 'GET /api/clientes/stats',
        get: 'GET /api/clientes/:id (acepta C-0001 o ID numérico)',
        historial: 'GET /api/clientes/:id/historial',
        create: 'POST /api/clientes',
        update: 'PUT /api/clientes/:id',
        toggleStatus: 'PATCH /api/clientes/:id/status',
        /**delete: 'DELETE /api/clientes/:id'**/
        opciones: 'GET /api/clientes/opciones',
      },
      proveedores: {
        list: 'GET /api/proveedores (?q=...&estatus=...)',
        stats: 'GET /api/proveedores/stats',
        get: 'GET /api/proveedores/:id (acepta P-0001 o ID numérico)',
        create: 'POST /api/proveedores',
        update: 'PUT /api/proveedores/:id',
        toggleStatus: 'PATCH /api/proveedores/:id/status (no permite desactivar si tiene compras)'
      },
      
      categorias: {
        list: 'GET /api/categorias (?q=...&estatus=...)',
        stats: 'GET /api/categorias/stats',
        get: 'GET /api/categorias/:id (acepta CAT-0001 o ID numérico)',
        create: 'POST /api/categorias',
        update: 'PUT /api/categorias/:id',
        toggleStatus: 'PATCH /api/categorias/:id/status (no permite desactivar si tiene productos)'
      },
      productos: { 
        list: 'GET /api/productos (?q=...&estatus=...&id_categoria=...)',
        stats: 'GET /api/productos/stats',
        categorias: 'GET /api/productos/categorias',
        get: 'GET /api/productos/:id',
        create: 'POST /api/productos',
        update: 'PUT /api/productos/:id',
        toggleStatus: 'PATCH /api/productos/:id/status',
        delete: 'DELETE /api/productos/:id (solo si no tiene operaciones relacionadas)'
      },

      bitacora: {
        list: 'GET /api/bitacora (?accion=...&nombre_usuario=...&limit=50&offset=0)'
      },
      cuentasPorPagar: {
        list: 'GET /api/cxp',
        resumen: 'GET /api/cxp/resumen',
        get: 'GET /api/cxp/:id',
        pagos: 'GET /api/cxp/:id/pagos'
      },
      inventario: {
  list: 'GET /api/inventario',
  stats: 'GET /api/inventario/stats',
  categorias: 'GET /api/inventario/categorias',
  stockBajo: 'GET /api/inventario/stock-bajo',
  movimientos: 'GET /api/inventario/movimientos',
  get: 'GET /api/inventario/:id',
  entradas: 'POST /api/inventario/entradas',
  salidas: 'POST /api/inventario/salidas',
  ajustes: 'POST /api/inventario/ajustes'
}
    }
  });
});

// Montar Rutas
app.use('/api/auth', authRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/users', userRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/clients', clienteRoutes); // Alias en inglés
app.use('/api/bitacora', bitacoraRoutes);
app.use('/api/cxp', cuentasPorPagarRoutes);
app.use('/api/proveedores', proveedorRoutes);
app.use('/api/suppliers', proveedorRoutes); // Alias en inglés
app.use('/api/categorias', categoriaRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/inventario', inventarioRoutes);

// Manejador de rutas no encontradas 404 para la API
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      message: `Ruta API no encontrada: [${req.method}] ${req.originalUrl}`
    });
  }
  next();
});

// Manejador global de errores
app.use((err, req, res, next) => {
  console.error('Error no controlado en la aplicación:', err);
  res.status(500).json({
    success: false,
    message: 'Ocurrió un error inesperado en el servidor.',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Inicializar esquema de base de datos y arrancar el servidor
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n======================================================`);
      console.log(`SERVIDOR REST API CONTAPYME INICIADO`);
      console.log(`Puerto: ${PORT}`);
      console.log(`Base URL: http://localhost:${PORT}/api`);
      console.log(`======================================================\n`);
    });
  })
  .catch((err) => {
    console.error(
      'No se pudo iniciar el servidor porque la base de datos no está lista:',
      err.message
    );
    process.exit(1);
  });

export default app;
