import React, { useState } from 'react';
import Button from '../ui/Button';
import * as XLSX from 'xlsx';
import { Payment, PaymentMethod } from '../../types';
import { useData } from '../../contexts/DataContext';
import { supabase } from '../../utils/supabase';

interface UploadReceiptsModalProps {
    onClose: () => void;
}

const UploadReceiptsModal: React.FC<UploadReceiptsModalProps> = ({ onClose }) => {
    const { state, dispatch } = useData();
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);

    const handleDownloadTemplate = () => {
        const template = [
            {
                'Policy Number': 'SR12345',
                'Amount': '50.00',
                'Payment Date': '2024-01-15',
                'Payment Period': '2024-01',
                'Payment Method': 'Cash',
                'Receipt URL': 'https://example.com/receipt.pdf',
            },
        ];

        const worksheet = XLSX.utils.json_to_sheet(template);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Receipts Template');
        XLSX.writeFile(workbook, 'receipts_upload_template.xlsx');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setErrors([]);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setErrors(['Please select a file to upload']);
            return;
        }

        setLoading(true);
        setErrors([]);

        try {
            const fileReader = new FileReader();
            fileReader.onload = async (e) => {
                try {
                    const data = e.target?.result;
                    const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);

                    const uploadErrors: string[] = [];
                    const paymentsToInsert: Payment[] = [];
                    let nextPaymentId = state.payments.length > 0 ? Math.max(...state.payments.map(p => p.id)) + 1 : 1;

                    for (let i = 0; i < jsonData.length; i++) {
                        const row: any = jsonData[i];
                        const rowNum = i + 2;

                        const rawPolicyNumber = row['Policy Number']?.toString().trim();
                        if (!rawPolicyNumber) {
                            uploadErrors.push(`Row ${rowNum}: Policy Number is required`);
                            continue;
                        }

                        const normalizedPolicyNumber = rawPolicyNumber.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

                        const customer = state.customers.find(c => {
                            const normalizedCustomerPolicy = c.policyNumber.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                            return normalizedCustomerPolicy === normalizedPolicyNumber;
                        });

                        if (!customer) {
                            uploadErrors.push(`Row ${rowNum}: Policy Number ${rawPolicyNumber} not found`);
                            continue;
                        }

                        const amount = parseFloat(row['Amount']?.toString().trim() || '0');
                        if (!amount || amount <= 0) {
                            uploadErrors.push(`Row ${rowNum}: Valid amount is required`);
                            continue;
                        }

                        let paymentDate = row['Payment Date'];
                        if (paymentDate instanceof Date) {
                            paymentDate = paymentDate.toISOString();
                        } else if (paymentDate) {
                            paymentDate = new Date(paymentDate).toISOString();
                        } else {
                            uploadErrors.push(`Row ${rowNum}: Payment Date is required`);
                            continue;
                        }

                        const paymentMethod = (row['Payment Method']?.toString().trim() || 'Cash') as PaymentMethod;
                        const paymentPeriod = row['Payment Period']?.toString().trim() || new Date(paymentDate).toISOString().substring(0, 7);

                        const agent = state.agents.find(a => a.id === customer.assignedAgentId);

                        const newPayment: Payment = {
                            id: nextPaymentId++,
                            customerId: customer.id,
                            policyNumber: customer.policyNumber,
                            agentId: agent?.id || 0,
                            amount: amount,
                            paymentDate: paymentDate,
                            paymentPeriod: paymentPeriod,
                            paymentMethod: paymentMethod,
                            receiptUrl: row['Receipt URL']?.toString().trim() || '',
                            createdAt: new Date().toISOString(),
                        };

                        paymentsToInsert.push(newPayment);
                    }

                    if (uploadErrors.length > 0) {
                        setErrors(uploadErrors);
                        setLoading(false);
                        return;
                    }

                    for (const payment of paymentsToInsert) {
                        const { error } = await supabase
                            .from('payments')
                            .insert({
                                id: payment.id,
                                customer_id: payment.customerId,
                                policy_number: payment.policyNumber,
                                agent_id: payment.agentId,
                                amount: payment.amount,
                                payment_date: payment.paymentDate,
                                payment_period: payment.paymentPeriod,
                                payment_method: payment.paymentMethod,
                                receipt_url: payment.receiptUrl,
                                created_at: payment.createdAt,
                            });

                        if (error) {
                            uploadErrors.push(`Error inserting payment for ${payment.policyNumber}: ${error.message}`);
                        } else {
                            dispatch({ type: 'ADD_PAYMENT', payload: payment });
                        }
                    }

                    if (uploadErrors.length > 0) {
                        setErrors(uploadErrors);
                    } else {
                        alert(`Successfully uploaded ${paymentsToInsert.length} receipt(s)`);
                        onClose();
                    }
                } catch (error) {
                    console.error('Error processing file:', error);
                    setErrors(['Error processing file. Please check the format and try again.']);
                } finally {
                    setLoading(false);
                }
            };

            fileReader.readAsBinaryString(file);
        } catch (error) {
            console.error('Error reading file:', error);
            setErrors(['Error reading file']);
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-brand-surface rounded-2xl shadow-xl p-6 w-full max-w-2xl">
                <h3 className="text-2xl font-bold text-brand-text-primary mb-4">Upload Legacy Receipts</h3>

                <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-semibold text-blue-900 mb-2">Instructions:</h4>
                        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                            <li>Download the template file below</li>
                            <li>Fill in the receipt details (ensure Policy Number matches existing policies)</li>
                            <li>Upload the completed file</li>
                            <li>Receipts will be automatically linked to their policies</li>
                        </ol>
                    </div>

                    <div className="flex justify-center">
                        <Button variant="secondary" onClick={handleDownloadTemplate}>
                            Download Template
                        </Button>
                    </div>

                    <div>
                        <label className="block text-base font-semibold text-brand-text-secondary mb-2">
                            Select File
                        </label>
                        <input
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleFileChange}
                            className="block w-full px-4 py-3 text-brand-text-primary bg-brand-surface border border-brand-border rounded-lg"
                        />
                        {file && (
                            <p className="text-sm text-brand-text-secondary mt-2">
                                Selected: {file.name}
                            </p>
                        )}
                    </div>

                    {errors.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <h4 className="font-semibold text-red-900 mb-2">Errors:</h4>
                            <ul className="list-disc list-inside space-y-1 text-sm text-red-800 max-h-40 overflow-y-auto">
                                {errors.map((error, idx) => (
                                    <li key={idx}>{error}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end pt-4 mt-6 space-y-2 space-y-reverse sm:space-y-0 sm:space-x-3">
                    <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleUpload} disabled={loading || !file}>
                        {loading ? 'Uploading...' : 'Upload Receipts'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default UploadReceiptsModal;
