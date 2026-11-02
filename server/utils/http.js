export class AppError extends Error {
  constructor(message, status = 400, errors = null) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.errors = errors; // mensaje para errores de validación
  }
}

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      success: false,
      message: err.message,
      ...(err.errors ? { errors: err.errors } : {})
    });
  }
  console.error(`Error en ${req.method} ${req.originalUrl}:`, err);
  return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
}