/**
 * Stock Event Handlers
 *
 * Handles events related to inventory: low stock and expiring batches.
 */

import { eventBus, createEvent } from "../event-bus";
import { EVENT_TYPES, StockLowEvent, StockExpiringEvent } from "../types";

/**
 * Register all stock event handlers
 */
export function registerStockHandlers(): void {
  // When stock is low → create reorder suggestion
  eventBus.on(EVENT_TYPES.STOCK_LOW, async (event) => {
    const { productId, productName, currentStock, reorderLevel } =
      event.data as StockLowEvent["data"];
    console.log(
      `[StockHandler] Low stock alert: ${productName} (${currentStock}/${reorderLevel})`
    );
    // TODO: Create purchase order suggestion
    // TODO: Notify purchasing department
    // TODO: Update dashboard alert
  });

  // When stock is expiring → suggest markdown or disposal
  eventBus.on(EVENT_TYPES.STOCK_EXPIRING, async (event) => {
    const { productId, batchNumber, expiryDate, quantity } =
      event.data as StockExpiringEvent["data"];
    console.log(
      `[StockHandler] Expiring stock: batch ${batchNumber}, ${quantity} units, expires ${expiryDate}`
    );
    // TODO: Suggest markdown pricing
    // TODO: Notify warehouse manager
    // TODO: Block further sales if expired
  });
}
