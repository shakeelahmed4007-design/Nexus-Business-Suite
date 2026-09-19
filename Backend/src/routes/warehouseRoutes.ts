import { Router } from 'express';
import { WarehouseController } from '../controllers/warehouseController';

const router = Router();
const controller = new WarehouseController();

// ----------------------------------------------------------------------------
// Location Management
// ----------------------------------------------------------------------------
router.get('/locations', (req, res) => controller.getLocations(req, res));
router.post('/locations', (req, res) => controller.createLocation(req, res));
router.put('/locations/:location_id', (req, res) => controller.updateLocation(req, res));
router.get('/locations/:location_id/inventory', (req, res) => controller.getLocationInventory(req, res));

// ----------------------------------------------------------------------------
// Inventory Visibility & Matrix
// ----------------------------------------------------------------------------
router.get('/inventory/multi-location-matrix', (req, res) => controller.getMultiLocationMatrix(req, res));
router.get('/inventory/product/:product_id/locations', (req, res) => controller.getProductLocations(req, res));
router.get('/inventory/location/:location_id/products', (req, res) => controller.getLocationInventory(req, res));
router.get('/inventory/total-across-locations/:product_id', (req, res) => controller.getTotalAcrossLocations(req, res));
router.post('/inventory/set-stock', (req, res) => controller.setProductLocationStock(req, res));

// ----------------------------------------------------------------------------
// Stock Transfers
// ----------------------------------------------------------------------------
router.post('/transfers', (req, res) => controller.initiateTransfer(req, res));
router.get('/transfers', (req, res) => controller.getTransfers(req, res));
router.get('/transfers/in-transit', (req, res) => controller.getInTransitInventory(req, res));
router.get('/transfers/:transfer_id', (req, res) => controller.getTransferById(req, res));
router.put('/transfers/:transfer_id/mark-in-transit', (req, res) => controller.markInTransit(req, res));
router.put('/transfers/:transfer_id/receive', (req, res) => controller.receiveTransfer(req, res));
router.post('/transfers/:transfer_id/reverse', (req, res) => controller.reverseTransfer(req, res));

// ----------------------------------------------------------------------------
// Rebalancing
// ----------------------------------------------------------------------------
router.get('/rebalancing/suggestions', (req, res) => controller.getRebalancingSuggestions(req, res));
router.post('/rebalancing/apply-suggestion/:suggestion_id', (req, res) => controller.applyRebalancingSuggestion(req, res));

// ----------------------------------------------------------------------------
// Cycle Counting
// ----------------------------------------------------------------------------
router.post('/cycle-count/start/:location_id', (req, res) => controller.startCycleCount(req, res));
router.post('/cycle-count/record', (req, res) => controller.recordCycleCount(req, res));
router.get('/cycle-count/variances', (req, res) => controller.getCycleCountVariances(req, res));

// ----------------------------------------------------------------------------
// Reports
// ----------------------------------------------------------------------------
router.get('/reports/sales-by-location', (req, res) => controller.getSalesByLocation(req, res));
router.get('/reports/stock-levels-by-location', (req, res) => controller.getStockLevelsByLocation(req, res));
router.get('/reports/transfers-analysis', (req, res) => controller.getTransfersAnalysis(req, res));
router.get('/reports/product-movement/:product_id', (req, res) => controller.getProductMovementHistory(req, res));

// ----------------------------------------------------------------------------
// POS Multi-Location Integration
// ----------------------------------------------------------------------------
router.post('/pos/check-location-stock', (req, res) => controller.checkPosStock(req, res));
router.post('/pos/record-location-sale', (req, res) => controller.recordPosSale(req, res));

export default router;
