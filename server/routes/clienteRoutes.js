import { Router } from 'express';
import {
  getClientes, getStats, getOpciones, getClienteById, getHistorial,
  createCliente, updateCliente, toggleClienteStatus
} from '../controllers/clienteController.js';
import { verifyToken } from '../middleware/auth.js';
import { errorHandler } from '../utils/http.js';

const router = Router();

// Administrador, Encargado y Vendedor pueden gestionar clientes,

router.use(verifyToken);

router.get('/', getClientes);                      
router.get('/stats', getStats);
router.get('/opciones', getOpciones);
router.get('/:id', getClienteById);//Detalle Cliente
router.get('/:id/historial', getHistorial);         
router.post('/', createCliente);                    
router.put('/:id', updateCliente);                  
router.patch('/:id/status', toggleClienteStatus);   

router.use(errorHandler);

export default router;

