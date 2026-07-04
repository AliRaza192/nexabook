# Invoice OCR — Feature Specification

## Goal
Extract invoice data from uploaded images (JPG/PNG/PDF) using Gemini Vision API. Auto-populate invoice form from image.

---

## User Scenarios

### Scenario 1: Upload Invoice Image
User uploads a photo of a supplier invoice. Gemini extracts: vendor name, invoice number, date, line items, total amount, tax. Auto-fills purchase invoice form.

### Scenario 2: Bulk Invoice Processing
User uploads 5 invoice images. System processes all, shows extracted data in a table. User reviews and confirms each. Saves time on manual data entry.

### Scenario 3: Low Confidence Flagging
Image is blurry. Gemini extracts data with 60% confidence. System flags as "Low Confidence — Please Review". User manually corrects errors before saving.

---

## Functional Requirements

### FR-1: Image Upload
- Accept JPG, PNG, PDF (max 10MB)
- Store securely on server
- Generate thumbnail for preview

### FR-2: Vision AI Extraction
- Send image to AI vision service
- Extract: vendorName, invoiceNumber, date, lineItems[], totalAmount, taxAmount
- Return structured JSON
- Rate limit: per service tier

### FR-3: Confidence Scoring
- Calculate confidence based on Gemini response quality
- Flag low confidence (<70%) items for manual review
- Show confidence badge on each extracted field

### FR-4: Auto-Fill Form
- Map extracted data to invoice form fields
- User can edit before saving
- Save as draft purchase invoice

---

## Edge Cases

- Blurry image: Low confidence, flag for review
- Urdu text: Gemini supports multi-language
- Multiple invoices in one image: Extract all
- Partial extraction: Fill what's available, mark rest as empty

---

## Out of Scope

- Real-time camera capture (future feature)
- Handwriting recognition (Gemini limitation)
- Multi-page PDF processing (single page only)
- Automatic invoice submission

---

## Acceptance Criteria

- [ ] Image upload works for JPG/PNG/PDF
- [ ] Gemini extracts data with >80% accuracy on clear images
- [ ] Low confidence items are flagged
- [ ] Extracted data auto-fills invoice form
- [ ] All existing functionality continues to work
