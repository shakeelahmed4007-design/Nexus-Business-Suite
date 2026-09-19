import { Request, Response } from 'express';
import { WarehouseService } from '../services/warehouseService';

const warehouseService = new WarehouseService();

function getShopId(req: Request): string {
  return (
    (req.headers['x-shop-id'] as string) ||
    (req.query.shop_id as string) ||
    (req.body.shop_id as string) ||
    'shop-001'
  );
}

export class WarehouseController {
  // --------------------------------------------------------------------------
  // LOCATIONS
  // --------------------------------------------------------------------------
  async getLocations(req: Request, res: Response): Promise<void> {
    try {
      const shopId = getShopId(req);
      const includeInactive = req.query.include_inactive === 'true';
      const locations = await warehouseService.getLocations(shopId, includeInactive);
      res.json({ success: true, locations });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async createLocation(req: Request, res: Response): Promise<void> {
    try {
      const shopId = getShopId(req);
      const loc = await warehouseService.createLocation({ ...req.body, shop_id: shopId });
      res.status(201).json({ success: true, location: loc });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async updateLocation(req: Request, res: Response): Promise<void> {
    try {
      const shopId = getShopId(req);
      const { location_id } = req.params;
      const updated = await warehouseService.updateLocation(shopId, location_id, req.body);
      res.json({ success: true, location: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async getLocationInventory(req: Request, res: Response): Promise<void> {
    try {
      const shopId = getShopId(req);
      const { location_id } = req.params;
      const items = await warehouseService.getLocationProducts(shopId, location_id);
      res.json({ success: true, location_id, inventory: items });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // --------------------------------------------------------------------------
  // INVENTORY VISIBILITY
  // --------------------------------------------------------------------------
  async getMultiLocationMatrix(req: Request, res: Response): Promise<void> {
    try {
      const shopId = getShopId(req);
      const matrix = await warehouseService.getMultiLocationMatrix(shopId);
      res.json({ success: true, ...matrix });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getProductLocations(req: Request, res: Response): Promise<void> {
    try {
      const shopId = getShopId(req);
      const { product_id } = req.params;
      const locations = await warehouseService.getProductLocations(shopId, product_id);
      res.json({ success: true, product_id, locations });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getTotalAcrossLocations(req: Request, res: Response): Promise<void> {
    try {
      const shopId = getShopId(req);
      const { product_id } = req.params;
      const total = await warehouseService.getTotalAcrossLocations(shopId, product_id);
      res.json({ success: true, ...total });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async setProductLocationStock(req: Request, res: Response): Promise<void> {
    try {
      const shopId = getShopId(req);
      const { location_id, product_id, quantity, reorder_point, safety_stock } = req.body;
      const rec = await warehouseService.setProductLocationStock(
        shopId,
        location_id,
        product_id,
        quantity,
        reorder_point,
        safety_stock
      );
      res.json({ success: true, record: rec });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  // --------------------------------------------------------------------------
  // STOCK TRANSFERS
  // --------------------------------------------------------------------------
  async initiateTransfer(req: Request, res: Response): Promise<void> {
    try {
      const shopId = getShopId(req);
      const transfer = await warehouseService.initiateTransfer({ ...req.body, shop_id: shopId });
      res.status(201).json({ success: true, transfer });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async getTransfers(req: Request, res: Response): Promise<void> {
    try {
      const shopId = getShopId(req);
      const filters = {
        status: req.query.status as string,
        sourceId: req.query.source_location_id as string,
        destinationId: req.query.destination_location_id as string,
      };
      const transfers = await warehouseService.getTransfers(shopId, filters);
      res.json({ success: true, transfers });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getTransferById(req: Request, res: Response): Promise<void> {
    try {
      const shopId = getShopId(req);
      const { transfer_id } = req.params;
      const transfer = await warehouseService.getTransferById(shopId, transfer_id);
      if (!transfer) {
        res.status(404).json({ success: false, error: `Transfer ${transfer_id} not found` });
        return;
      }
      res.json({ success: true, transfer });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async markInTransit(req: Request, res: Response): Promise<void> {
    try {
      const shopId = getShopId(req);
      const { transfer_id } = req.params;
      const { user_id, notes } = req.body;
      const transfer = await warehouseService.markInTransit(shopId, transfer_id, user_id, notes);
      res.json({ success: true, transfer });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async receiveTransfer(req: Request, res: Response): Promise<void> {
    try {
      const shopId = getShopId(req);
      const { transfer_id } = req.params;
      const transfer = await warehouseService.receiveTransfer(shopId, transfer_id, req.body);
      res.json({ success: true, transfer });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async reverseTransfer(req: Request, res: Response): Promise<void> {
    try {
      const shopId = getShopId(req);
      const { transfer_id } = req.params;
      const { user_id, reason } = req.body;
      const transfer = await warehouseService.reverseTransfer(shopId, transfer_id, user_id, reason);
      res.json({ success: true, transfer });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async getInTransitInventory(req: Request, res: Response): Promise<void> {
    try {
      const shopId = getShopId(req);
      const inTransit = await warehouseService.getInTransitInventory(shopId);
      res.json({ success: true, in_transit: inTransit });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // --------------------------------------------------------------------------
  // REBALANCING
  // --------------------------------------------------------------------------
  async getRebalancingSuggestions(req: Request, res: Response): Promise<void> {
    try {
      const shopId = getShopId(req);
      const suggestions = await warehouseService.getRebalancingSuggestions(shopId);
      res.json({ success: true, suggestions });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async applyRebalancingSuggestion(req: Request, res: Response): Promise<void> {
    try {
      const shopId = getShopId(req);
      const { suggestion_id } = req.params;
      const transfer = await warehouseService.applyRebalancingSuggestion(shopId, suggestion_id, req.body.user_id);
      res.json({ success: true, transfer });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  // --------------------------------------------------------------------------
  // CYCLE COUNTING
  // --------------------------------------------------------------------------
  async startCycleCount(req: Request, res: Response): Promise<void> {
    try {
      const shopId = getShopId(req);
      const { location_id } = req.params;
      const items = await warehouseService.getLocationProducts(shopId, location_id);
      res.json({
        success: true,
        session_id: `ccs-${Date.now()}`,
        location_id,
        items_to_count: items,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async recordCycleCount(req: Request, res: Response): Promise<void> {
    try {
      const shopId = getShopId(req);
      const count = await warehouseService.recordCycleCount({ ...req.body, shop_id: shopId });
      res.json({ success: true, count });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async getCycleCountVariances(req: Request, res: Response): Promise<void> {
    try {
      const shopId = getShopId(req);
      const locationId = req.query.location_id as string | undefined;
      const variances = await warehouseService.getCycleCountVariances(shopId, locationId);
      res.json({ success: true, variances });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // --------------------------------------------------------------------------
  // REPORTS & MOVEMENTS
  // --------------------------------------------------------------------------
  async getSalesByLocation(req: Request, res: Response): Promise<void> {
    try {
      const shopId = getShopId(req);
      const report = await warehouseService.getSalesByLocationReport(shopId);
      res.json({ success: true, report });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getStockLevelsByLocation(req: Request, res: Response): Promise<void> {
    try {
      const shopId = getShopId(req);
      const locationId = req.query.location_id as string | undefined;
      const report = await warehouseService.getStockLevelsReport(shopId, locationId);
      res.json({ success: true, report });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getTransfersAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const shopId = getShopId(req);
      const report = await warehouseService.getTransferAnalysisReport(shopId);
      res.json({ success: true, report });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getProductMovementHistory(req: Request, res: Response): Promise<void> {
    try {
      const shopId = getShopId(req);
      const { product_id } = req.params;
      const movements = await warehouseService.getProductMovementHistory(shopId, product_id);
      res.json({ success: true, product_id, movements });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // --------------------------------------------------------------------------
  // POS INTEGRATION
  // --------------------------------------------------------------------------
  async checkPosStock(req: Request, res: Response): Promise<void> {
    try {
      const shopId = getShopId(req);
      const { location_id, product_id, quantity } = req.body;
      const check = await warehouseService.checkLocationStockForPos(
        shopId,
        location_id,
        product_id,
        Number(quantity) || 1
      );
      res.json({ success: true, ...check });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async recordPosSale(req: Request, res: Response): Promise<void> {
    try {
      const shopId = getShopId(req);
      const { location_id, items, sale_id } = req.body;
      const result = await warehouseService.recordPosSaleDeduction(shopId, location_id, items, sale_id);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}
