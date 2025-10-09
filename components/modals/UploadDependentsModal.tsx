import React, { useState } from 'react';
import Button from '../ui/Button';
import * as XLSX from 'xlsx';
import { Customer, Participant } from '../../types';
import { useData } from '../../contexts/DataContext';
import { supabaseService } from '../../services/supabaseService';
import { calculatePremiumComponents } from '../../utils/policyHelpers';

interface UploadDependentsModalProps {
    onClose: () => void;
}

const UploadDependentsModal: React.FC<UploadDependentsModalProps> = ({ onClose }) => {
    const { state, dispatch } = useData();
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);

    const handleDownloadTemplate = () => {
        const template = [
            {
                'Policy Number': 'SR12345',
                'First Name': 'John',
                'Surname': 'Doe',
                'Relationship': 'Child',
                'ID Number': '123456789',
                'Date of Birth': '2010-01-15',
                'Gender': 'Male',
                'Phone': '+263771234567',
                'Email': 'john.doe@example.com',
                'Street Address': '123 Main St',
                'Town': 'Harare',
                'Postal Address': 'P.O. Box 123',
                'Medical Package': 'None',
                'CashBack Addon': 'None',
            },
        ];

        const worksheet = XLSX.utils.json_to_sheet(template);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Dependents Template');
        XLSX.writeFile(workbook, 'dependents_upload_template.xlsx');
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
                    const customersToUpdate: Customer[] = [];

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

                        if (!row['First Name'] || !row['Surname']) {
                            uploadErrors.push(`Row ${rowNum}: First Name and Surname are required`);
                            continue;
                        }

                        const newParticipant: Participant = {
                            id: Date.now() + i,
                            uuid: crypto.randomUUID(),
                            firstName: row['First Name']?.toString().trim(),
                            surname: row['Surname']?.toString().trim(),
                            relationship: row['Relationship']?.toString().trim() || 'Child',
                            idNumber: row['ID Number']?.toString().trim() || '',
                            dateOfBirth: row['Date of Birth'] ?
                                (row['Date of Birth'] instanceof Date ?
                                    row['Date of Birth'].toISOString().split('T')[0] :
                                    row['Date of Birth'].toString().trim()) : '',
                            gender: (row['Gender']?.toString().trim() || 'Male') as 'Male' | 'Female',
                            phone: row['Phone']?.toString().trim() || '',
                            email: row['Email']?.toString().trim() || '',
                            streetAddress: row['Street Address']?.toString().trim() || customer.streetAddress,
                            town: row['Town']?.toString().trim() || customer.town,
                            postalAddress: row['Postal Address']?.toString().trim() || customer.postalAddress,
                            medicalPackage: row['Medical Package']?.toString().trim() || 'None',
                            cashBackAddon: row['CashBack Addon']?.toString().trim() || 'None',
                        };

                        const existingCustomerUpdate = customersToUpdate.find(c => c.id === customer.id);
                        if (existingCustomerUpdate) {
                            existingCustomerUpdate.participants.push(newParticipant);
                        } else {
                            customersToUpdate.push({
                                ...customer,
                                participants: [...customer.participants, newParticipant],
                            });
                        }
                    }

                    if (uploadErrors.length > 0) {
                        setErrors(uploadErrors);
                        setLoading(false);
                        return;
                    }

                    for (const customer of customersToUpdate) {
                        const premiumComponents = calculatePremiumComponents(customer);
                        const updatedCustomer: Customer = {
                            ...customer,
                            ...premiumComponents,
                            lastUpdated: new Date().toISOString(),
                        };

                        await supabaseService.saveCustomer(updatedCustomer);
                        dispatch({ type: 'UPDATE_CUSTOMER', payload: updatedCustomer });
                    }

                    alert(`Successfully uploaded ${jsonData.length} dependent(s)`);
                    onClose();
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
                <h3 className="text-2xl font-bold text-brand-text-primary mb-4">Upload Dependents</h3>

                <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-semibold text-blue-900 mb-2">Instructions:</h4>
                        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                            <li>Download the template file below</li>
                            <li>Fill in the dependent details (ensure Policy Number matches existing policies)</li>
                            <li>Upload the completed file</li>
                            <li>Dependents will be automatically linked to their policies</li>
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
                            <ul className="list-disc list-inside space-y-1 text-sm text-red-800">
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
                        {loading ? 'Uploading...' : 'Upload Dependents'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default UploadDependentsModal;
