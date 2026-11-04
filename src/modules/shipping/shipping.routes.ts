import { Router } from 'express';
import {
    calculateShipping,
    createShipment,
    getShipmentByTracking,
    getShipmentByOrder,
    updateShipmentStatus,
    getAllShipments,
    createZone,
    getZones,
    updateZone,
    deleteZone,
    createMethod,
    getMethods,
    updateMethod,
    deleteMethod,
} from './shipping.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { roleMiddleware } from '../../middlewares/role.middleware';

const router = Router();

router.post('/calculate', calculateShipping);
router.get('/track/:trackingNumber', getShipmentByTracking);

router.get('/order/:orderId', authMiddleware, getShipmentByOrder);

router.get('/shipments', authMiddleware, roleMiddleware(['admin']), getAllShipments);
router.post('/shipments', authMiddleware, roleMiddleware(['admin']), createShipment);
router.put('/shipments/:trackingNumber/status', authMiddleware, roleMiddleware(['admin']), updateShipmentStatus);

router.post('/zones', authMiddleware, roleMiddleware(['admin']), createZone);
router.get('/zones', authMiddleware, roleMiddleware(['admin']), getZones);
router.put('/zones/:id', authMiddleware, roleMiddleware(['admin']), updateZone);
router.delete('/zones/:id', authMiddleware, roleMiddleware(['admin']), deleteZone);

router.post('/methods', authMiddleware, roleMiddleware(['admin']), createMethod);
router.get('/methods', getMethods);
router.put('/methods/:id', authMiddleware, roleMiddleware(['admin']), updateMethod);
router.delete('/methods/:id', authMiddleware, roleMiddleware(['admin']), deleteMethod);

export default router;