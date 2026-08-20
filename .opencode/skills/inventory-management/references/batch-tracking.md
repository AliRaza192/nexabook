# Batch Tracking

## When Required
- Expiry-sensitive products (food, medicine)
- Quality control items
- Regulated products
- Products with manufacturing dates

## Batch Record
```
{
  productId: string,
  batchNumber: string,
  manufacturingDate: date,
  expiryDate: date,
  quantity: number,
  unitCost: number,
  warehouseId: string,
  status: ACTIVE | EXPIRED | CONSUMED
}
```

## FEFO (First-Expiry-First-Out)
- Sell nearest-expiry stock first
- System suggests batch on sale
- Block sale of expired stock (if configured)

## Tracking
- Record batch on every stock movement
- Track quantity per batch
- Alert on approaching expiry
- Report expired stock

## Expiry Alerts
- 30 days: Warning
- 15 days: Urgent
- Expired: Block sale, suggest disposal
