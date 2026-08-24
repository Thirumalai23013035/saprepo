# Procurement Match API

## Run

```bash
npm install
copy .env.example .env
npm run dev
```

## Entities

- `Supplier`
- `PurchaseOrder` with line items
- `GoodsReceipt` with received line quantities
- `Invoice` with billed line items
- `MatchResult` with decision, risk score, discrepancies, confidence, and recommendations

## Endpoints

- `GET /health`
- `POST|GET /api/suppliers`
- `POST|GET /api/purchase-orders`
- `POST|GET /api/goods-receipts`
- `POST|GET /api/invoices`
- `GET /api/invoices/:id`
- `POST /api/invoices/:id/match`
- `POST /api/invoices/:id/approve`
- `PATCH /api/invoices/:id/resolve`
- `GET /api/analytics/dashboard`
- `GET /api/analytics/exceptions`
