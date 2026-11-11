// Todo el texto del landing vive aquí: para cambiar contenido no hay que tocar el JSX.

export const CONTACTO = {
  correo: 'contacto@contapyme.com',      // ← cámbialo por el real
  telefono: '+52 477 000 0000',          // ← cámbialo por el real (teléfono o WhatsApp)
  horario: 'Lunes a viernes, 9:00 a 18:00 h'
};

export const NAV_LINKS = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'funciones', label: 'Funciones' },
  { id: 'beneficios', label: 'Beneficios' },
  { id: 'nosotros', label: 'Nosotros' },
  { id: 'contacto', label: 'Contacto' }
];

//Funciones
export const CATEGORIAS = [
  {
    icon: 'Building2',
    titulo: 'Administración del negocio',
    texto: 'Organiza la información base de tu empresa en un solo lugar.',
    items: ['Clientes', 'Proveedores', 'Productos y servicios', 'Categorías']
  },
  {
    icon: 'ClipboardList',
    titulo: 'Control de operaciones',
    texto: 'Registra el día a día comercial y mantén tus existencias al corriente.',
    items: ['Inventario', 'Ventas', 'Compras', 'Devoluciones']
  },
  {
    icon: 'Wallet',
    titulo: 'Control financiero',
    texto: 'Sabe cuánto entra, cuánto sale y qué tienes pendiente de cobrar y pagar.',
    items: ['Ingresos', 'Gastos', 'Caja y efectivo', 'Cuentas por cobrar', 'Cuentas por pagar']
  },
  {
    icon: 'ChartLine',
    titulo: 'Análisis y seguimiento',
    texto: 'Consulta cómo va tu negocio y recibe avisos de lo importante.',
    items: ['Reportes administrativos', 'Reportes de ventas y compras', 'Reportes de inventario', 'Notificaciones y alertas']
  }
];

export const BENEFICIOS = [
  { icon: 'Database', titulo: 'Información centralizada', texto: 'Mantén los datos de las operaciones del negocio organizados en un mismo sistema.' },
  { icon: 'Workflow', titulo: 'Procesos conectados', texto: 'Al registrar una venta, el sistema actualiza el inventario y registra el ingreso correspondiente según el funcionamiento definido.' },
  { icon: 'ChartLine', titulo: 'Mejor control del negocio', texto: 'Consulta las operaciones registradas y detecta productos con poco inventario o pagos pendientes.' },
  { icon: 'Smartphone', titulo: 'Acceso desde web y móvil', texto: 'Utiliza la plataforma web para la administración y la aplicación móvil para las operaciones rápidas previstas en el proyecto.' }
];

export const PLATAFORMAS = [
  {
    icon: 'Monitor',
    titulo: 'Plataforma web',
    estado: 'Disponible',
    destacada: false,
    texto: 'Administración de usuarios, clientes, proveedores, compras, inventario, operaciones y reportes.',
    puntos: ['Usuarios, roles y permisos', 'Clientes, proveedores y catálogo de productos', 'Compras, ventas e inventario', 'Reportes e indicadores del negocio']
  },
  {
    icon: 'Smartphone',
    titulo: 'Aplicación móvil',
    estado: 'En desarrollo',      // cambia a 'Disponible' cuando se publique
    destacada: true,
    texto: 'Registro rápido de ventas y gastos, consulta de inventario y acceso a funciones autorizadas.',
    puntos: ['Registro rápido de ventas y gastos', 'Consulta de inventario', 'Alertas y resumen del día', 'Funciones según tu rol']
  }
];

export const PASOS = [
  { titulo: 'Contáctanos', texto: 'La empresa se comunica por teléfono o correo electrónico para conocer el sistema.' },
  { titulo: 'Conoce el servicio', texto: 'Te explicamos los módulos y las funciones que puede utilizar tu empresa.' },
  { titulo: 'Confirma tu contratación', texto: 'Una vez que aceptas el servicio, acordamos los detalles necesarios.' },
  { titulo: 'Recibe tus credenciales', texto: 'Configuramos la cuenta y facilitamos el acceso inicial de forma segura.' },
  { titulo: 'Comienza a utilizar ContaPyme', texto: 'El administrador de la empresa entra al sistema y configura a sus usuarios.' }
];

export const FAQS = [
  { pregunta: '¿Qué es ContaPyme?', respuesta: 'ContaPyme es un sistema de administración y contabilidad para pequeñas y medianas empresas. Reúne clientes, proveedores, productos, inventario, ventas, compras, ingresos, gastos y reportes en una sola plataforma web, con una aplicación móvil para operaciones rápidas.' },
  { pregunta: '¿Cómo puedo obtener una cuenta?', respuesta: 'Contáctanos por teléfono o correo. Te explicamos el servicio y, al confirmar tu contratación, nuestro equipo crea tu cuenta y te entrega las credenciales de acceso.' },
  { pregunta: '¿Puedo registrar a mis empleados?', respuesta: 'Sí. El administrador de tu empresa puede dar de alta usuarios y asignarles un rol con los permisos que necesiten.' },
  { pregunta: '¿Mis datos estarán separados de los de otras empresas?', respuesta: 'Cada empresa accede con sus propias credenciales. Al contratar te explicamos cómo se organiza y protege tu información.' },
  { pregunta: '¿Puedo cambiar mi contraseña?', respuesta: 'Sí. Puedes cambiarla desde tu cuenta cuando lo necesites, y si la olvidas puedes recuperarla desde la pantalla de inicio de sesión.' }
];
