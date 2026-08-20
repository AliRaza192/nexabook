---
name: inventory-management
description: >
  Tracks stock levels, manages batches, handles valuations, and generates inventory reports.
  Use when: "check stock", "inventory", "stock level", "product list", "warehouse",
  "stock check karo", "inventory report", "batch tracking", "stock adjustment".
  Do NOT use for: creating purchase orders, sales invoices, or manufacturing BOM.
---

# Inventory Management Skill

## Goal

Maintain accurate stock records across warehouses with proper valuation, batch tracking, and compliance with Pakistani business practices.

## When to Use

- User wants to check stock levels
- User says "stock check karo" or "inventory dikhao"
- User wants to adjust stock
- User wants stock valuation report
- User wants batch or serial number tracking

## Instructions

### Step 1: Check Stock Levels

Query `warehouseStock` table:
- Per warehouse stock
- Total stock across all warehouses
- Reorder level status

Present:
```
Product: Widget A (SKU: WDG-001)
Warehouse 1: 500 units
Warehouse 2: 300 units
────────────────────────
Total: 800 units
Reorder Level: 200 units
Status: ✅ Above reorder level
```

### Step 2: Track Stock Movements

Every stock change creates a `stockMovements` record:
- `productId`, `warehouseId`
- `type`: IN | OUT | TRANSFER | ADJUSTMENT
- `quantity` (positive for IN, negative for OUT)
- `referenceType`: SALE | PURCHASE | TRANSFER | ADJUSTMENT | PRODUCTION
- `referenceId`: link to source document
- `unitCost`: cost at time of movement
- `totalCost`: quantity × unitCost

### Step 3: FIFO/Weighted Average Valuation

#### FIFO (First-In-First-Out):
- Oldest stock consumed first
- Track cost layers per product
- More accurate but complex

#### Weighted Average:
- Average cost of all stock
- `Average Cost = Total Cost / Total Quantity`
- Simpler, commonly used

Query `stockValuationLogs` for valuation history.

### Step 4: Batch Tracking

For batch-tracked products:
- Record batch number on every movement
- Track expiry dates
- Track manufacturing dates
- FEFO (First-Expiry-First-Out) for expiry-sensitive items

Query `productBatches` table:
```
Product: Medicine X
Batch: B001 | Qty: 100 | Mfg: 2026-01-01 | Exp: 2027-01-01
Batch: B002 | Qty: 50  | Mfg: 2026-03-01 | Exp: 2027-03-01
```

### Step 5: Serial Number Tracking

For serial-numbered products:
- Unique serial per unit
- Track warranty period
- Track location/status per serial

Query `serialNumbers` table.

### Step 6: Stock Adjustment

When physical count differs from system:
1. Create `stockAdjustments` record
2. Add `stockAdjustmentLines` with reason
3. Create `stockMovements` (type: ADJUSTMENT)
4. Update `warehouseStock`
5. Create journal entry if value changes

Common reasons:
- Damage
- Theft
- Found (extra stock)
- Counting error
- Quality rejection

### Step 7: Physical Stock Count (Stocktake)

Process:
1. Create `stockCounts` record
2. Add `stockCountItems` with counted quantities
3. Compare with system quantities
4. Show variance (counted - system)
5. Generate adjustment entries for variances
6. Lock counted period

### Step 8: Low Stock Alerts

Check against reorder levels:
```
For each product:
  If totalStock < reorderLevel:
    Alert: "Product X is below reorder level"
    Suggest: "Current: 50, Reorder Level: 200, Shortfall: 150"
    Action: Create purchase order suggestion
```

### Step 9: Inter-Warehouse Transfer

Process:
1. Create `stockTransfers` record
2. Add `stockTransferItems` with quantities
3. Reduce stock from source warehouse (OUT movement)
4. Increase stock in destination warehouse (IN movement)
5. If transfer in transit, track status

### Step 10: COGS Calculation

For each sale:
```
COGS = Quantity Sold × Unit Cost

Unit Cost depends on valuation method:
- FIFO: Cost of oldest available stock
- Weighted Average: Current average cost
```

Update `stockMovements` with COGS amount.

### Step 11: Expiry Management

For batch-tracked products:
- Flag batches expiring within 30/60/90 days
- Suggest markdown or return
- Block sale of expired stock (if configured)
- Generate expiry report

## Edge Cases

- **Negative stock:** Alert but allow (backorder scenario)
- **Zero-cost items:** Free samples, promotional items
- **Multi-UOM:** Convert using `uomConversions` table
- **Composite products:** Deduct component stock on sale (kit products)
- **Consignment stock:** Track separately from owned stock
- **Damaged goods:** Separate stock location for damaged items

## References

- [Valuation Methods](references/valuation-methods.md)
- [Batch Tracking](references/batch-tracking.md)
