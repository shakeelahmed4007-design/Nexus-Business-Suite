import { type Invoice } from './invoices';

export function downloadInvoicePDF(invoice: Invoice) {
  const items = invoice.items && invoice.items.length > 0 ? invoice.items : [
    { name: 'Standard Service / Product Item', qty: 1, price: invoice.amount || invoice.total }
  ];

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Invoice_${invoice.id.slice(0, 8)}_${invoice.customer.replace(/\s+/g, '_')}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    @media print {
      html, body {
        width: 210mm;
        height: 297mm;
        background: #ffffff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .no-print {
        display: none !important;
      }
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #f8fafc;
      padding: 20px;
    }
    .page-container {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      padding: 40px;
      border-radius: 16px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
      border: 1px solid #e2e8f0;
      position: relative;
    }
    
    /* Top Decorative Bar */
    .top-bar {
      height: 6px;
      background: linear-gradient(90deg, #2563eb 0%, #4f46e5 50%, #06b6d4 100%);
      border-radius: 6px 6px 0 0;
      margin: -40px -40px 32px -40px;
    }

    /* Header Section */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 24px;
      border-bottom: 2px solid #f1f5f9;
    }
    .brand-title {
      font-size: 26px;
      font-weight: 900;
      color: #1e293b;
      letter-spacing: -0.8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .brand-title span {
      color: #2563eb;
    }
    .brand-subtitle {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 2px;
    }
    .company-details {
      font-size: 12px;
      color: #64748b;
      line-height: 1.5;
      margin-top: 8px;
    }

    .invoice-title-block {
      text-align: right;
    }
    .invoice-badge {
      font-size: 32px;
      font-weight: 900;
      color: #2563eb;
      letter-spacing: 1px;
      line-height: 1;
    }
    .invoice-num {
      font-size: 13px;
      font-weight: 600;
      color: #475569;
      margin-top: 4px;
    }
    .status-pill {
      display: inline-block;
      margin-top: 8px;
      padding: 4px 14px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status-paid { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
    .status-overdue { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
    .status-sent { background: #dbeafe; color: #1d4ed8; border: 1px solid #bfdbfe; }

    /* Info Grid */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin: 28px 0;
    }
    .info-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px 20px;
    }
    .card-label {
      font-size: 10px;
      font-weight: 800;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 6px;
    }
    .customer-name {
      font-size: 17px;
      font-weight: 800;
      color: #0f172a;
    }
    .customer-sub {
      font-size: 12px;
      color: #64748b;
      margin-top: 2px;
    }
    .date-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      color: #334155;
      padding: 3px 0;
    }
    .date-row strong {
      color: #0f172a;
    }

    /* Items Table */
    .table-container {
      margin-bottom: 28px;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    thead th {
      background: #2563eb;
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 12px 16px;
      text-align: left;
    }
    thead th.text-right { text-align: right; }
    thead th.text-center { text-align: center; }
    
    tbody tr {
      border-bottom: 1px solid #f1f5f9;
    }
    tbody tr:nth-child(even) {
      background: #f8fafc;
    }
    tbody td {
      padding: 14px 16px;
      color: #334155;
    }
    tbody td.text-right { text-align: right; }
    tbody td.text-center { text-align: center; }
    tbody td.item-name {
      font-weight: 700;
      color: #0f172a;
    }

    /* Financial Summary */
    .summary-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 32px;
      gap: 24px;
    }
    .payment-info {
      flex: 1;
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 12px;
      padding: 16px;
    }
    .payment-title {
      font-size: 11px;
      font-weight: 800;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .payment-detail {
      font-size: 12px;
      color: #64748b;
      line-height: 1.6;
    }

    .totals-card {
      width: 280px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 18px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.03);
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      color: #64748b;
      margin-bottom: 8px;
    }
    .total-row.grand-total {
      border-top: 2px solid #e2e8f0;
      padding-top: 10px;
      margin-top: 10px;
      font-size: 17px;
      font-weight: 900;
      color: #2563eb;
    }

    /* Signatures Section */
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
      padding-top: 24px;
      border-top: 1px solid #e2e8f0;
    }
    .sig-box {
      width: 200px;
      text-align: center;
    }
    .sig-line {
      border-bottom: 1px solid #94a3b8;
      margin-bottom: 8px;
      height: 40px;
    }
    .sig-label {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
    }

    /* Footer */
    .footer {
      margin-top: 32px;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
    }
  </style>
</head>
<body>

  <div class="page-container">
    <div class="top-bar"></div>

    <!-- Header -->
    <div class="header">
      <div>
        <div class="brand-title">Nexus <span>Suite</span></div>
        <div class="brand-subtitle">Official Business Tax Invoice</div>
        <div class="company-details">
          123 Business Suite Tower, Main Clifton, Karachi, Pakistan<br/>
          NTN: 8294710-9 | Phone: +92 21 111-639-871<br/>
          Email: billing@nexus-suite.com
        </div>
      </div>

      <div class="invoice-title-block">
        <div class="invoice-badge">INVOICE</div>
        <div class="invoice-num"># ${invoice.id}</div>
        <div class="status-pill ${
          invoice.status === 'Paid' ? 'status-paid' : invoice.status === 'Overdue' ? 'status-overdue' : 'status-sent'
        }">${invoice.status}</div>
      </div>
    </div>

    <!-- Info Cards -->
    <div class="info-grid">
      <div class="info-card">
        <div class="card-label">Billed To Customer</div>
        <div class="customer-name">${invoice.customer || 'Valued Customer'}</div>
        <div class="customer-sub">Account ID: CUST-${(invoice.customer || 'GEN').slice(0, 5).toUpperCase()}</div>
      </div>

      <div class="info-card">
        <div class="card-label">Invoice Timeline</div>
        <div class="date-row"><span>Issue Date:</span> <strong>${invoice.date}</strong></div>
        <div class="date-row"><span>Due Date:</span> <strong>${invoice.dueDate}</strong></div>
        <div class="date-row"><span>Payment Term:</span> <strong>Net 14 Days</strong></div>
      </div>
    </div>

    <!-- Table -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th class="text-center" style="width: 45px;">#</th>
            <th>Item Description</th>
            <th class="text-center" style="width: 80px;">Qty</th>
            <th class="text-right" style="width: 130px;">Unit Price</th>
            <th class="text-right" style="width: 140px;">Total Amount</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map(
              (item, idx) => `
            <tr>
              <td class="text-center" style="color: #94a3b8; font-weight: 600;">${idx + 1}</td>
              <td class="item-name">${item.name}</td>
              <td class="text-center">${item.qty}</td>
              <td class="text-right">PKR ${Number(item.price).toLocaleString()}</td>
              <td class="text-right" style="font-weight: 700; color: #0f172a;">PKR ${(item.qty * item.price).toLocaleString()}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>

    <!-- Summary Section -->
    <div class="summary-section">
      <div class="payment-info">
        <div class="payment-title">💳 Bank Payment Details</div>
        <div class="payment-detail">
          <strong>Bank:</strong> Meezan Bank Ltd<br/>
          <strong>Account Title:</strong> Nexus Business Suite Pvt Ltd<br/>
          <strong>Account No:</strong> 0102-0104829101<br/>
          <strong>IBAN:</strong> PK36MEZN0001020104829101
        </div>
      </div>

      <div class="totals-card">
        <div class="total-row"><span>Subtotal</span><span>PKR ${invoice.amount.toLocaleString()}</span></div>
        <div class="total-row"><span>Sales Tax</span><span>PKR ${invoice.tax.toLocaleString()}</span></div>
        <div class="total-row grand-total"><span>Grand Total</span><span>PKR ${invoice.total.toLocaleString()}</span></div>
      </div>
    </div>

    <!-- Signatures -->
    <div class="signatures">
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-label">Authorized Signatory</div>
      </div>
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-label">Customer Acceptance</div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p><strong>Thank you for doing business with Nexus Business Suite!</strong></p>
      <p style="margin-top: 3px;">Computer-generated tax invoice. No signature required for validation.</p>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
}

export function downloadInvoicesSummaryPDF(invoices: Invoice[]) {
  if (invoices.length > 0) {
    // If top button clicked, print/download the primary invoice in full single-invoice layout
    downloadInvoicePDF(invoices[0]);
  }
}
