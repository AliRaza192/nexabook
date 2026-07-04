# spec.md — Inventory FTE

## Goal

Automate inventory management for Pakistani SMEs: real-time stock tracking, reorder alerts, batch/serial tracking, COGS calculation, and stock valuation. Prevent stockouts and provide accurate costing data.

## User Scenarios

- When a sales invoice is posted, then stock is auto-deducted from the warehouse
- When a purchase bill is posted, then stock is auto-added to the warehouse
- When stock falls below reorder level, then alert is sent via NexaBot
- When an item has batch or serial numbers, then tracking is enforced on every transaction
- When month-end arrives, then COGS and stock valuation are calculated and available
- When physical stock count is performed, then variances are detected and adjustment entries created
- When stock is transferred between warehouses, then both warehouses are updated atomically

## Functional Requirements

### FR-1: Real-Time Stock Tracking
- Track stock levels per item per warehouse
- Auto-deduct stock when sales invoice is posted
- Auto-add stock when purchase bill is posted
- Handle stock transfers between warehouses (deduct source, add destination)
- Track stock adjustments (damage, expiry, theft, correction)
- Support multiple units of measurement per item (e.g., box of 12, individual each)

### FR-2: Reorder Management
- Set reorder level (minimum before alert) per item
- Set minimum and maximum stock levels per item
- Auto-generate purchase suggestions when stock falls below reorder level
- Track lead time per supplier for reorder calculations
- Send low stock alerts via NexaBot with item name, current quantity, and reorder level

### FR-3: Batch and Serial Tracking
- Track batch numbers for pharmaceuticals, food items, and perishables
- Track serial numbers for electronics and high-value items
- Enforce FIFO (First In, First Out) batch selection for sales
- Track batch expiry dates and block sale of expired batches
- Generate batch-wise stock reports showing quantity and value per batch

### FR-4: COGS Calculation
- Calculate Cost of Goods Sold using FIFO method
- Track landed cost (purchase price plus freight plus duties)
- Generate COGS report per period (monthly/quarterly/yearly)
- Link COGS entries to relevant expense accounts automatically
- Support weighted average cost as alternative for non-batched items

### FR-5: Stock Valuation
- FIFO valuation report showing stock value by item
- Weighted average valuation report
- Stock on hand report by warehouse
- Stock age analysis (how long each item has been in stock)
- Dead stock identification (no movement in 90+ days)

### FR-6: Stock Adjustments
- Physical stock count entry form
- Variance detection (book quantity versus physical count)
- Adjustment journal entries auto-generated (Debit/Credit Adjustment account)
- Approval workflow for adjustments exceeding threshold amount
- Audit trail for all adjustments with reason and authorizer

## Edge Cases

- Negative stock (configurable: allow or block per organization)
- Item with multiple UOM (convert between box and each using conversion factor)
- Batch expiry detected during sale (block expired batch, allow valid batch)
- Stock transfer between warehouses (two atomic entries, both succeed or both fail)
- Customer return (reverse the deduction, add back to stock)
- Stock adjustment for damaged goods (write-off entry)
- Item with both batch and serial tracking (serial belongs to a batch)
- Opening stock import (initial balance without journal entry)

## Out of Scope

- Barcode scanning hardware integration (UI-only for now)
- Warehouse layout or bin management
- Production or manufacturing bill of materials (BOM)
- Multi-currency inventory valuation (PKR only)
- Integration with physical inventory devices (counting machines)
- Demand forecasting (future AI feature)

## Acceptance Criteria

- [ ] Stock auto-deducted when sales invoice is posted
- [ ] Stock auto-added when purchase bill is posted
- [ ] Reorder alerts triggered within 1 minute of stock falling below threshold
- [ ] Batch tracking enforces FIFO selection
- [ ] COGS calculated correctly using FIFO method
- [ ] Stock valuation equals quantity multiplied by unit cost
- [ ] All stock queries filter by `orgId`
- [ ] Stock adjustments generate balanced journal entries
- [ ] TypeScript: 0 errors
- [ ] All tests pass (`npm run test`)

## Skills

### inventory-stock-tracking
**Description:** Tracks real-time stock levels per item per warehouse. Fires on invoice posting, bill posting, and stock movements.
- Input: Transaction type, item, quantity, warehouse
- Output: Updated stock level
- Guard: Never allow stock deduction below zero (unless org allows negative stock)

### inventory-reorder-alerts
**Description:** Monitors stock levels and sends reorder alerts. Fires on stock change or on schedule.
- Input: Current stock levels, reorder levels
- Output: Low stock alerts via NexaBot
- Guard: Only alert once per item per day (no spam)

### inventory-batch-serial
**Description:** Manages batch and serial number tracking. Fires on stock movements involving tracked items.
- Input: Item, batch/serial number, quantity
- Output: Batch allocation, expiry check
- Guard: Never allocate expired batch to a sale

### inventory-cogs-valuation
**Description:** Calculates COGS and stock valuation using FIFO. Fires on period-end or report request.
- Input: Stock transactions, period
- Output: COGS report, valuation report
- Guard: Always use consistent costing method within a period
