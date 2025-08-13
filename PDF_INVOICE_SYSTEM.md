# 📄 Enhanced PDF Invoice System

Your auction platform now has a professional PDF invoice generation system with company branding, banking details, and comprehensive styling.

## 🎯 **Features**

### ✅ **Professional Design**
- Company branding and logo support
- Professional color scheme (Amber/Gray theme)
- Responsive layout with proper spacing
- Two-column layout for invoice details

### ✅ **Complete Company Information**
- **Company Name**: ALL4YOU AUCTIONEERS
- **Tagline**: Professional Auction Services  
- **Contact Details**: Email, phone, website
- **Legal Information**: VAT & Company registration numbers

### ✅ **Comprehensive Banking Details**
- **Bank**: First National Bank (FNB)
- **Account Name**: ALL4YOU AUCTIONEERS (PTY) LTD
- **Account Number**: 123456789
- **Branch Code**: 250655 (Johannesburg Central)
- **Account Type**: Business Current Account
- **SWIFT Code**: FIRNZAJJ

### ✅ **Invoice Types**
- **Buyer Invoices**: For auction winners (with 15% commission + VAT)
- **Seller Invoices**: For consigners (with 10% commission deduction)

## 🚀 **How to Use**

### 1. **Upload Company Logo** (Optional)
```bash
# Upload your company logo (PNG format recommended)
POST /api/company/logo/upload
Authorization: Bearer {admin_token}
Content-Type: multipart/form-data
Body: logo file
```

### 2. **Generate Buyer Invoice**
```bash
POST /api/invoices/generate/buyer/{auctionId}/{userEmail}
Authorization: Bearer {token}
```

### 3. **Generate Seller Invoice** (Admin only)
```bash
POST /api/invoices/generate/seller/{auctionId}/{userEmail}
Authorization: Bearer {admin_token}
```

### 4. **Download Invoice PDF**
```bash
GET /api/invoices/download/{invoiceId}
```

## 🧪 **Testing the System**

### Generate Sample Invoices
```bash
# Test buyer invoice
POST /api/invoices/test-pdf/generate-sample
Authorization: Bearer {admin_token}

# Test seller invoice  
POST /api/invoices/test-pdf/generate-seller-sample
Authorization: Bearer {admin_token}
```

## 📁 **File Structure**

```
api/
├── utils/
│   └── invoicePDFGenerator.js      # Enhanced PDF generator
├── api/
│   ├── invoices/
│   │   ├── index.js                # Main invoice endpoints
│   │   └── test-pdf.js             # Testing endpoints
│   └── company/
│       └── logo.js                 # Logo management
├── config/
│   └── company-config.json         # Company configuration
├── assets/
│   └── logo.png                    # Company logo (upload here)
└── uploads/
    └── invoices/                   # Generated PDF storage
```

## ⚙️ **Configuration**

### Update Company Details
Edit `api/config/company-config.json` to update:
- Company information
- Banking details  
- Invoice colors and styling
- Payment terms
- Commission rates

### Update Banking Information
```json
{
  "banking": {
    "bankName": "Your Bank Name",
    "accountName": "YOUR COMPANY NAME",
    "accountNumber": "1234567890",
    "branchCode": "123456",
    "branchName": "Your Branch",
    "accountType": "Business Current Account",
    "swiftCode": "YOURCODE"
  }
}
```

## 📧 **Email Integration**

Invoices are automatically emailed to customers with:
- PDF attachment
- Payment instructions
- Banking details  
- Due date reminders

## 🎨 **Customization**

### Logo
- Upload PNG/JPG logo via `/api/company/logo/upload`
- Optimal size: 200x200px
- Will be automatically resized in PDF

### Colors
Update the color scheme in `company-config.json`:
```json
{
  "invoice": {
    "colors": {
      "primary": "#f59e0b",     // Company color
      "secondary": "#374151",   // Text color
      "success": "#059669",     // Total amount
      "muted": "#6b7280",       // Secondary text
      "light": "#f3f4f6",       // Table background
      "border": "#e5e7eb"       // Borders
    }
  }
}
```

## 💰 **Commission Structure**

- **Buyer Commission**: 15% + 15% VAT
- **Seller Commission**: 10% (no VAT on payouts)
- **Payment Terms**: 
  - Buyers: 7 days
  - Sellers: 14 days

## 📊 **Invoice Content**

Each PDF includes:
1. **Company Header** with logo and branding
2. **Invoice Details** (number, date, due date, status)
3. **Customer Information** 
4. **Items Table** with lot details and pricing
5. **Totals Section** with VAT breakdown
6. **Banking Information** with payment instructions
7. **Terms & Conditions**
8. **Professional Footer**

## 🔐 **Security**

- Admin authentication required for seller invoices
- Users can only generate their own buyer invoices
- PDF files stored securely in uploads directory
- Banking details displayed prominently for payments

## 📈 **Sample Data**

The system includes sample invoice generation for testing:
- Sample buyer invoice with 3 lots
- Sample seller invoice with 2 lots
- Realistic pricing and commission calculations

## 🎯 **Next Steps**

1. **Upload your company logo**
2. **Update banking details** in `company-config.json`
3. **Test with sample invoices**
4. **Generate real invoices** for your auctions
5. **Monitor email delivery** and customer payments

Your professional PDF invoice system is now ready for production use! 🚀