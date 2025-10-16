import { Customer, Payment } from '../types';
import { formatPolicyNumber } from './policyHelpers';

/**
 * Generate PDF document for customer data
 * Uses browser's print functionality for PDF generation
 */
export async function generateCustomerPDF(customer: Customer, payments: Payment[] = []): Promise<void> {
    // Create a new window for PDF content
    const printWindow = window.open('', '_blank');

    if (!printWindow) {
        throw new Error('Unable to open print window. Please allow popups for this site.');
    }

    // Calculate total payments
    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.payment_amount), 0);
    const paymentCount = payments.length;

    // Generate HTML content
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Customer Data - ${customer.firstName} ${customer.surname}</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    padding: 40px;
                    background: white;
                    color: #333;
                    line-height: 1.6;
                }

                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 3px solid #2563eb;
                    padding-bottom: 20px;
                }

                .header h1 {
                    color: #1e40af;
                    font-size: 28px;
                    margin-bottom: 5px;
                }

                .header p {
                    color: #6b7280;
                    font-size: 14px;
                }

                .section {
                    margin-bottom: 25px;
                    page-break-inside: avoid;
                }

                .section-title {
                    background: #dbeafe;
                    padding: 10px 15px;
                    font-size: 16px;
                    font-weight: 600;
                    color: #1e40af;
                    border-left: 4px solid #2563eb;
                    margin-bottom: 15px;
                }

                .info-grid {
                    display: grid;
                    grid-template-columns: 200px 1fr;
                    gap: 10px 20px;
                    margin-left: 15px;
                }

                .info-label {
                    font-weight: 600;
                    color: #4b5563;
                }

                .info-value {
                    color: #1f2937;
                }

                .participants {
                    margin-left: 15px;
                }

                .participant-card {
                    background: #f9fafb;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    padding: 15px;
                    margin-bottom: 15px;
                }

                .participant-header {
                    font-weight: 600;
                    color: #1f2937;
                    margin-bottom: 10px;
                    font-size: 15px;
                }

                .participant-info {
                    display: grid;
                    grid-template-columns: 150px 1fr;
                    gap: 8px;
                    font-size: 13px;
                }

                .payment-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-left: 15px;
                    font-size: 13px;
                }

                .payment-table th {
                    background: #f3f4f6;
                    padding: 10px;
                    text-align: left;
                    font-weight: 600;
                    border-bottom: 2px solid #d1d5db;
                    color: #374151;
                }

                .payment-table td {
                    padding: 10px;
                    border-bottom: 1px solid #e5e7eb;
                }

                .payment-table tr:hover {
                    background: #f9fafb;
                }

                .summary-box {
                    background: #f0fdf4;
                    border: 2px solid #86efac;
                    border-radius: 8px;
                    padding: 15px;
                    margin: 20px 15px;
                }

                .summary-box h3 {
                    color: #166534;
                    margin-bottom: 10px;
                }

                .summary-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                }

                .summary-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 5px 0;
                }

                .summary-label {
                    font-weight: 600;
                    color: #15803d;
                }

                .summary-value {
                    color: #166534;
                }

                .footer {
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 2px solid #e5e7eb;
                    text-align: center;
                    color: #6b7280;
                    font-size: 12px;
                }

                .status-badge {
                    display: inline-block;
                    padding: 4px 12px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: 600;
                }

                .status-active {
                    background: #dcfce7;
                    color: #166534;
                }

                .status-suspended {
                    background: #fef3c7;
                    color: #92400e;
                }

                .status-express {
                    background: #dbeafe;
                    color: #1e40af;
                }

                @media print {
                    body {
                        padding: 20px;
                    }

                    .no-print {
                        display: none;
                    }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Stone River Insurance</h1>
                <p>Customer Policy Information Report</p>
                <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            </div>

            <!-- Policy Information -->
            <div class="section">
                <div class="section-title">Policy Information</div>
                <div class="info-grid">
                    <div class="info-label">Policy Number:</div>
                    <div class="info-value">${formatPolicyNumber(customer.policyNumber)}</div>

                    <div class="info-label">Status:</div>
                    <div class="info-value">
                        <span class="status-badge status-${customer.status.toLowerCase()}">${customer.status}</span>
                    </div>

                    <div class="info-label">Funeral Package:</div>
                    <div class="info-value">${customer.funeralPackage}</div>

                    <div class="info-label">Monthly Premium:</div>
                    <div class="info-value">$${customer.totalPremium.toFixed(2)}</div>

                    <div class="info-label">Inception Date:</div>
                    <div class="info-value">${customer.inceptionDate}</div>

                    <div class="info-label">Cover Start Date:</div>
                    <div class="info-value">${customer.coverDate}</div>
                </div>
            </div>

            <!-- Personal Information -->
            <div class="section">
                <div class="section-title">Personal Information</div>
                <div class="info-grid">
                    <div class="info-label">Full Name:</div>
                    <div class="info-value">${customer.firstName} ${customer.surname}</div>

                    <div class="info-label">ID Number:</div>
                    <div class="info-value">${customer.idNumber}</div>

                    <div class="info-label">Date of Birth:</div>
                    <div class="info-value">${customer.dateOfBirth}</div>

                    <div class="info-label">Gender:</div>
                    <div class="info-value">${customer.gender}</div>

                    <div class="info-label">Phone Number:</div>
                    <div class="info-value">${customer.phone}</div>

                    <div class="info-label">Email:</div>
                    <div class="info-value">${customer.email || 'N/A'}</div>

                    <div class="info-label">Street Address:</div>
                    <div class="info-value">${customer.streetAddress}</div>

                    <div class="info-label">Town:</div>
                    <div class="info-value">${customer.town}</div>

                    <div class="info-label">Postal Address:</div>
                    <div class="info-value">${customer.postalAddress}</div>
                </div>
            </div>

            <!-- Participants -->
            ${customer.participants && customer.participants.length > 0 ? `
            <div class="section">
                <div class="section-title">Covered Participants (${customer.participants.length})</div>
                <div class="participants">
                    ${customer.participants.map((p, index) => `
                        <div class="participant-card">
                            <div class="participant-header">
                                ${index + 1}. ${p.firstName} ${p.surname}
                                ${p.suffix ? `<span style="color: #6b7280;">(${p.suffix})</span>` : ''}
                            </div>
                            <div class="participant-info">
                                <div class="info-label">Relationship:</div>
                                <div class="info-value">${p.relationship}</div>

                                <div class="info-label">ID Number:</div>
                                <div class="info-value">${p.idNumber || 'N/A'}</div>

                                <div class="info-label">Date of Birth:</div>
                                <div class="info-value">${p.dateOfBirth}</div>

                                <div class="info-label">Gender:</div>
                                <div class="info-value">${p.gender}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            <!-- Payment Summary -->
            ${payments.length > 0 ? `
            <div class="section">
                <div class="section-title">Payment Summary</div>
                <div class="summary-box">
                    <h3>Financial Overview</h3>
                    <div class="summary-grid">
                        <div class="summary-item">
                            <span class="summary-label">Total Payments Made:</span>
                            <span class="summary-value">${paymentCount}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Total Amount Paid:</span>
                            <span class="summary-value">$${totalPaid.toFixed(2)}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Last Payment Date:</span>
                            <span class="summary-value">${new Date(payments[0].payment_date).toLocaleDateString()}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Last Payment Amount:</span>
                            <span class="summary-value">$${parseFloat(payments[0].payment_amount).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">Payment History</div>
                <table class="payment-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Period</th>
                            <th>Method</th>
                            <th>Reference</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${payments.slice(0, 20).map(payment => `
                            <tr>
                                <td>${new Date(payment.payment_date).toLocaleDateString()}</td>
                                <td>$${parseFloat(payment.payment_amount).toFixed(2)}</td>
                                <td>${payment.payment_period}</td>
                                <td>${payment.payment_method}</td>
                                <td>${payment.receipt_number || 'N/A'}</td>
                            </tr>
                        `).join('')}
                        ${payments.length > 20 ? `
                            <tr>
                                <td colspan="5" style="text-align: center; color: #6b7280; font-style: italic;">
                                    ... and ${payments.length - 20} more payment(s)
                                </td>
                            </tr>
                        ` : ''}
                    </tbody>
                </table>
            </div>
            ` : `
            <div class="section">
                <div class="section-title">Payment History</div>
                <div style="margin-left: 15px; padding: 20px; background: #fef3c7; border-radius: 8px; color: #92400e;">
                    No payment history available for this policy.
                </div>
            </div>
            `}

            <div class="footer">
                <p><strong>Stone River Insurance</strong></p>
                <p>This is a computer-generated document and does not require a signature.</p>
                <p>For inquiries, please contact your assigned agent or visit our office.</p>
            </div>

            <script>
                window.onload = function() {
                    window.print();
                };

                window.onafterprint = function() {
                    window.close();
                };
            </script>
        </body>
        </html>
    `;

    // Write content to the new window
    printWindow.document.write(htmlContent);
    printWindow.document.close();
}
