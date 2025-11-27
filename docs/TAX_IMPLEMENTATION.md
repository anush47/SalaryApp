# Tax Implementation Guide - SalaryApp

## Overview

SalaryApp now includes a comprehensive tax calculation system based on Sri Lankan APIT (Advance Personal Income Tax) regulations, effective from April 1, 2025.

## Key Features

✅ **Automatic Tax Calculation** - Tax is automatically calculated during salary generation
✅ **Progressive Tax System** - Implements Sri Lankan tax slabs with rates from 0% to 36%
✅ **Customizable Configuration** - Admin can update tax rates and slabs without code changes
✅ **Company-Specific Overrides** - Companies can have custom tax configurations
✅ **Tax Preview API** - Employers can preview tax calculations before processing
✅ **EPF Integration** - Properly deducts EPF 8% before calculating tax
✅ **Stamp Duty** - Automatically applies Rs. 25 stamp duty when applicable

## Tax Calculation Formula

```
1. Gross Salary = Basic + Holiday Pay + Additions (affecting earnings)
2. Total Earnings = Gross Salary + OT + All Additions (for EPF calculation)
3. EPF 8% = Total Earnings × 0.08
4. Taxable Income = Gross Salary - EPF 8%
5. Apply progressive tax slabs to Taxable Income
6. APIT = Progressive tax calculated from slabs
7. Stamp Duty = Rs. 25 (if Gross Salary >= Rs. 50,000)
8. Total Tax = APIT + Stamp Duty
9. Final Salary = Total Earnings - EPF 8% - Total Tax - Other Deductions - No Pay
```

## Sri Lankan Tax Slabs 2025 (Effective April 1, 2025)

| Monthly Taxable Income Range | Tax Rate |
|------------------------------|----------|
| Rs. 0 - 150,000              | 0% (Personal Relief) |
| Rs. 150,001 - 233,333        | 6%       |
| Rs. 233,334 - 275,000        | 18%      |
| Rs. 275,001 - 316,667        | 24%      |
| Rs. 316,668 - 358,333        | 30%      |
| Above Rs. 358,333            | 36%      |

**Key Updates from 2024:**
- Personal relief increased from Rs. 100,000 to Rs. 150,000 monthly
- Annual personal relief: Rs. 1,800,000 (up from Rs. 1,200,000)

## Example Tax Calculation

**For monthly salary of Rs. 300,000:**

```
Gross Salary:             Rs. 300,000
EPF 8%:                  -Rs.  24,000
Taxable Income:           Rs. 276,000

Tax Breakdown (Progressive):
  0% on first Rs. 150,000   = Rs.      0
  6% on next Rs. 83,333     = Rs.  5,000
 18% on next Rs. 41,667     = Rs.  7,500
 24% on last Rs. 1,000      = Rs.    240

APIT:                     Rs.  12,740
Stamp Duty:              +Rs.      25
Total Tax:                Rs.  12,765

Net Salary:               Rs. 263,235
Effective Tax Rate:       4.26%
```

## Files Created/Modified

### New Files

1. **`src/app/lib/taxCalculation.tsx`** - Core tax calculation logic
   - `getTaxConfiguration()` - Fetch active tax config
   - `calculateProgressiveTax()` - Progressive APIT calculation
   - `calculateStampDuty()` - Stamp duty calculation
   - `calculateTax()` - Main tax calculation function
   - `previewTax()` - Quick tax preview for testing

2. **`src/app/api/tax-configuration/route.tsx`** - Tax config CRUD API
   - `GET` - Fetch tax configuration
   - `POST` - Create new tax configuration (admin only)
   - `PUT` - Update tax configuration (admin only)
   - `DELETE` - Deactivate tax configuration (admin only)

3. **`src/app/api/tax-configuration/preview/route.tsx`** - Tax preview API
   - `POST` - Preview tax calculation for given salary components

4. **`scripts/migration-tax-2025.js`** - Migration script
   - Creates/updates default 2025 tax configuration
   - Includes detailed example calculations

5. **`docs/TAX_IMPLEMENTATION.md`** - This documentation

### Modified Files

1. **`src/app/models/TaxConfiguration.tsx`**
   - Added `companyId` field for company-specific configs
   - Added `isDefault` boolean flag
   - Updated default personal allowance to Rs. 150,000/month
   - Updated indexes for better performance

2. **`src/app/api/salaries/generate/salaryGeneration.tsx`**
   - Integrated tax calculation into salary generation flow
   - Tax automatically calculated for all salary records
   - Tax details stored in `salary.taxes` object

## Database Schema

### TaxConfiguration Model

```typescript
{
  year: Number,                    // e.g., 2025
  country: String,                 // "LK" for Sri Lanka
  companyId: ObjectId?,            // Optional: for company-specific config
  isDefault: Boolean,              // True for global default
  taxSlabs: [{
    min: Number,                   // Minimum amount for slab
    max: Number,                   // Maximum amount for slab (Infinity for last)
    rate: Number,                  // Tax rate percentage
    fixedAmount: Number            // Fixed amount (usually 0)
  }],
  personalAllowance: {
    monthly: Number,               // Rs. 150,000
    annual: Number                 // Rs. 1,800,000
  },
  qualifyingPaymentRelief: {
    epfRate: Number,               // 0.08 (8%)
    maxMonthly: Number?            // Optional max
  },
  stampDuty: {
    threshold: Number,             // Rs. 50,000
    amount: Number                 // Rs. 25
  },
  otherDeductions: [],             // Future extensibility
  isActive: Boolean,
  effectiveFrom: Date,             // April 1, 2025
  effectiveTo: Date?               // Optional end date
}
```

### Salary Model (Tax Fields)

```typescript
{
  // ... other salary fields
  taxes: {
    apitAmount: Number,            // APIT tax amount
    stampDuty: Number,             // Stamp duty amount
    totalTax: Number,              // Total tax (APIT + stamp duty)
    taxableIncome: Number,         // Income after EPF deduction
    grossSalary: Number            // Gross salary before tax
  }
}
```

## API Endpoints

### 1. Get Tax Configuration

```http
GET /api/tax-configuration?companyId={id}&year={year}
```

**Access:** Admin, Employer
**Query Parameters:**
- `companyId` (optional): Get company-specific config
- `year` (optional): Filter by year (default: current year)

**Response:**
```json
{
  "success": true,
  "taxConfiguration": { ... },
  "source": "company-specific" | "global-default"
}
```

### 2. Create Tax Configuration

```http
POST /api/tax-configuration
```

**Access:** Admin only
**Body:**
```json
{
  "year": 2025,
  "country": "LK",
  "companyId": "optional",
  "taxSlabs": [...],
  "personalAllowance": {
    "monthly": 150000,
    "annual": 1800000
  },
  "qualifyingPaymentRelief": {
    "epfRate": 0.08
  },
  "stampDuty": {
    "threshold": 50000,
    "amount": 25
  },
  "effectiveFrom": "2025-04-01"
}
```

### 3. Update Tax Configuration

```http
PUT /api/tax-configuration
```

**Access:** Admin only
**Body:**
```json
{
  "id": "tax_config_id",
  "taxSlabs": [...],
  // ... other fields to update
}
```

### 4. Preview Tax Calculation

```http
POST /api/tax-configuration/preview
```

**Access:** Admin, Employer
**Body (Simple):**
```json
{
  "monthlySalary": 300000,
  "companyId": "optional"
}
```

**Body (Detailed):**
```json
{
  "basic": 180000,
  "holidayPay": 10000,
  "additions": [
    {
      "name": "Transport",
      "amount": 5000,
      "affectTotalEarnings": true
    }
  ],
  "ot": 15000,
  "companyId": "optional",
  "period": "2025-01"
}
```

**Response:**
```json
{
  "success": true,
  "taxCalculation": {
    "grossSalary": 300000,
    "totalEarnings": 300000,
    "epfEmployee": {
      "amount": 24000,
      "percentage": 8
    },
    "taxableIncome": 276000,
    "incomeAfterAllowance": 276000,
    "apit": {
      "amount": 12740,
      "breakdown": [
        {
          "slab": "Rs. 0 - Rs. 150,000",
          "rate": 0,
          "taxableAmount": 150000,
          "taxAmount": 0
        },
        // ... more slabs
      ]
    },
    "stampDuty": {
      "amount": 25
    },
    "totalTax": 12765,
    "netSalary": 263235
  },
  "summary": {
    "grossSalary": "Rs. 300,000",
    "totalTax": "Rs. 12,765",
    "netSalary": "Rs. 263,235",
    "effectiveTaxRate": "4.26%"
  }
}
```

## Setup Instructions

### 1. Run Migration Script

```bash
node scripts/migration-tax-2025.js
```

This will:
- Create/update the default 2025 tax configuration
- Display tax slabs and example calculations
- Set effective date to April 1, 2025

### 2. Verify Configuration

Check that the tax configuration was created successfully in MongoDB:

```javascript
db.taxconfigurations.find({ year: 2025, isDefault: true })
```

### 3. Test Tax Calculation

Use the preview API to test tax calculations:

```bash
curl -X POST http://localhost:3000/api/tax-configuration/preview \
  -H "Content-Type: application/json" \
  -d '{"monthlySalary": 300000}'
```

### 4. Generate Salary with Tax

When generating salaries, tax will be automatically calculated and included in the salary record.

## Admin Configuration

### Updating Tax Rates

Admins can update tax rates through the API without code changes:

1. **Fetch current configuration:**
   ```http
   GET /api/tax-configuration?year=2025
   ```

2. **Update configuration:**
   ```http
   PUT /api/tax-configuration
   ```
   Body: Include the configuration ID and updated fields

3. **Changes apply immediately** to new salary calculations

### Company-Specific Tax Configuration

If a company needs custom tax rates:

1. **Create company-specific config:**
   ```http
   POST /api/tax-configuration
   ```
   Body: Include `companyId` in the request

2. **System will prioritize** company-specific config over global default

3. **Fall back to global** if company-specific config doesn't exist

## Salary Generation Flow (Updated)

1. Calculate basic salary, OT, holiday pay
2. Calculate leave deductions (no-pay leaves)
3. Apply payment structure (additions/deductions)
4. **Calculate EPF 8% deduction**
5. **Calculate progressive APIT tax**
6. **Apply stamp duty if applicable**
7. Calculate final salary
8. Store tax details in `salary.taxes` object

## Tax Calculation in Payslips

The `salary.taxes` object contains all tax-related information for payslip generation:

```typescript
{
  apitAmount: 12740,        // Display as "APIT Tax"
  stampDuty: 25,            // Display as "Stamp Duty"
  totalTax: 12765,          // Display as "Total Tax"
  taxableIncome: 276000,    // For reference
  grossSalary: 300000       // For reference
}
```

## Testing Scenarios

### Test Case 1: Low Income (Below Tax Threshold)

```
Salary: Rs. 140,000
Expected: No tax (below Rs. 150,000 after EPF)
```

### Test Case 2: Medium Income

```
Salary: Rs. 200,000
Expected: Tax on amount above Rs. 150,000 at 6%
```

### Test Case 3: High Income

```
Salary: Rs. 500,000
Expected: Progressive tax across multiple slabs
```

### Test Case 4: With Additions/Deductions

```
Basic: Rs. 180,000
Transport: Rs. 20,000 (affects earnings)
OT: Rs. 30,000
Expected: Tax calculated on total earnings
```

## Troubleshooting

### Issue: No tax configuration found

**Solution:** Run the migration script:
```bash
node scripts/migration-tax-2025.js
```

### Issue: Tax calculation seems incorrect

**Checklist:**
1. Verify tax configuration is active
2. Check if company has custom tax config
3. Ensure EPF 8% is being deducted first
4. Verify additions are marked correctly (affectTotalEarnings)
5. Use preview API to debug calculation

### Issue: Tax not appearing in salary

**Checklist:**
1. Ensure salary generation is using updated code
2. Check `salary.taxes` object in database
3. Verify tax configuration effective date
4. Check console for any errors during calculation

## Future Enhancements

- [ ] Admin UI for managing tax configurations
- [ ] Tax report generation
- [ ] Annual tax summary for employees
- [ ] Tax exemption management
- [ ] Multiple tax years support
- [ ] Tax history tracking
- [ ] Employer tax contribution (EPF 12%, ETF 3%)

## References

- [Inland Revenue Department - APIT Tax Tables](https://www.ird.gov.lk/en/publications/sitepages/apit_tax_tables.aspx?menuid=1502)
- [BizAdvisor - APIT Guide](https://bizadvisor.lk/handbook/APIT-advance-personal-income-tax-srilanka)
- [Tax Changes Sri Lanka 2025](https://bizadvisor.lk/blog/tax-changes-sri-lanka-2025)

## Support

For issues or questions:
1. Check this documentation
2. Review the migration script output
3. Test with preview API
4. Check tax configuration in database
5. Review salary generation logs

---

**Last Updated:** November 28, 2025
**Effective Tax Configuration:** April 1, 2025
**Version:** 1.0
