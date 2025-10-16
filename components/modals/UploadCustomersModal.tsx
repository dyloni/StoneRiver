import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { parseCustomersFile, generateUploadTemplate, parseDependentsFile } from '../../utils/csvHelpers';
import { processStoneRiverFile } from '../../utils/stoneRiverFileProcessor';
import { Customer, Agent } from '../../types';
import Button from '../ui/Button';
import * as XLSX from 'xlsx';

interface UploadCustomersModalProps {
    onClose: () => void;
    onUploadSuccess?: (newCustomers: Customer[]) => void;
}

type FileType = 'stone-river' | 'customers' | 'dependents' | 'unknown';

const UploadCustomersModal: React.FC<UploadCustomersModalProps> = ({ onClose, onUploadSuccess }) => {
    const { state } = useData();
    const [file, setFile] = useState<File | null>(null);
    const [errors, setErrors] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [assignmentMode, setAssignmentMode] = useState<'file' | 'specific' | 'shared'>('file');
    const [selectedAgent, setSelectedAgent] = useState<number | null>(null);
    const [detectedFileType, setDetectedFileType] = useState<FileType | null>(null);

    useEffect(() => {
        console.log('UploadCustomersModal - agents loaded:', state.agents);
        console.log('UploadCustomersModal - agents count:', state.agents?.length);
    }, [state.agents]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setErrors([]);

            const fileType = await detectFileFormat(selectedFile);
            setDetectedFileType(fileType);
        }
    };

    const detectFileFormat = async (file: File): Promise<FileType> => {
        try {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer);
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData: any[] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

            if (jsonData.length === 0) return 'unknown';

            const headers = jsonData[0] as string[];
            const normalizedHeaders = headers.map(h => String(h || '').toLowerCase().trim().replace(/[^a-z0-9]/g, ''));

            if (workbook.SheetNames.length === 3 &&
                (workbook.SheetNames[0] === 'P' || workbook.SheetNames[0].includes('Policy')) &&
                (workbook.SheetNames[1] === 'PHnD' || workbook.SheetNames[1].includes('Dependent')) &&
                (workbook.SheetNames[2] === 'R' || workbook.SheetNames[2].includes('Receipt'))) {
                return 'stone-river';
            }

            const hasInceptionDate = normalizedHeaders.some(h =>
                ['inceptiondate', 'startdate', 'policydate', 'coverdate'].includes(h)
            );
            const hasPolicyNumber = normalizedHeaders.some(h =>
                ['policynumber', 'policyno', 'policy'].includes(h)
            );
            const hasIDNumber = normalizedHeaders.some(h =>
                ['idnumber', 'idno', 'nationalid'].includes(h)
            );
            const hasRelationship = normalizedHeaders.some(h =>
                ['relationship', 'type'].includes(h)
            );

            if (hasPolicyNumber && hasRelationship) {
                const dataRows = jsonData.slice(1);
                const hasSelfRelationship = dataRows.some(row => {
                    const relationshipIndex = headers.findIndex(h =>
                        String(h || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '') === 'relationship'
                    );
                    return relationshipIndex >= 0 && String(row[relationshipIndex] || '').toLowerCase() === 'self';
                });

                if (hasSelfRelationship || hasInceptionDate) {
                    return 'customers';
                } else {
                    return 'dependents';
                }
            }

            if (hasIDNumber && headers.length >= 3) {
                return 'customers';
            }

            return 'unknown';
        } catch (error) {
            console.log('File format detection failed', error);
            return 'unknown';
        }
    };

    const handleProcessFile = async () => {
        if (!file) {
            setErrors(['Please select a file to upload.']);
            return;
        }

        if (!detectedFileType) {
            setErrors(['Unable to detect file type. Please ensure your file is properly formatted.']);
            return;
        }

        setIsProcessing(true);

        try {
            if (detectedFileType === 'stone-river') {
                console.log('Processing Stone River DB format...');
                const result = await processStoneRiverFile(file);

                if (result.errors.length > 0) {
                    const errorMessages = result.errors.map(
                        e => `Row ${e.row} (${e.sheet}): ${e.error}`
                    );
                    setErrors(errorMessages);
                }

                console.log(`Stone River import complete: ${result.customers.length} customers, ${result.participants.length} participants, ${result.payments.length} payments`);
                if (onUploadSuccess) {
                    onUploadSuccess(result.customers);
                }
                setIsProcessing(false);
            } else if (detectedFileType === 'dependents') {
                console.log('Processing dependents file...');
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const fileData = e.target?.result;
                    if (fileData) {
                        try {
                            const { updatedCustomers, errors: parseErrors } = parseDependentsFile(
                                fileData,
                                state.customers
                            );
                            if (parseErrors.length > 0) {
                                setErrors(parseErrors);
                            } else {
                                if (onUploadSuccess) {
                                    onUploadSuccess(updatedCustomers);
                                }
                                alert(`Successfully uploaded dependents for ${updatedCustomers.length} policies`);
                                onClose();
                            }
                        } catch (err: any) {
                            setErrors([`An unexpected error occurred: ${err.message}`]);
                        }
                    }
                    setIsProcessing(false);
                };
                reader.onerror = () => {
                    setErrors(['Failed to read the file.']);
                    setIsProcessing(false);
                };
                reader.readAsBinaryString(file);
            } else if (detectedFileType === 'customers') {
                console.log('Processing customers file...');
                const reader = new FileReader();
                reader.onload = (e) => {
                    const fileData = e.target?.result;
                    if (fileData) {
                        try {
                            const { customers, updatedCustomers, errors: parseErrors } = parseCustomersFile(
                                fileData,
                                state.agents,
                                state.customers,
                                assignmentMode,
                                selectedAgent
                            );
                            if (parseErrors.length > 0) {
                                setErrors(parseErrors);
                            }
                            if (onUploadSuccess) {
                                onUploadSuccess([...customers, ...updatedCustomers]);
                            }
                        } catch (err: any) {
                            setErrors([`An unexpected error occurred: ${err.message}`]);
                        }
                    }
                    setIsProcessing(false);
                };
                reader.onerror = () => {
                    setErrors(['Failed to read the file.']);
                    setIsProcessing(false);
                };
                reader.readAsBinaryString(file);
            } else {
                setErrors(['Unknown file format. Please use a valid template.']);
                setIsProcessing(false);
            }
        } catch (err: any) {
            setErrors([`Processing failed: ${err.message}`]);
            setIsProcessing(false);
        }
    };

    const getFileTypeLabel = () => {
        switch (detectedFileType) {
            case 'stone-river':
                return { text: 'Stone River Database Format', color: 'bg-purple-100 text-purple-800 border-purple-200' };
            case 'customers':
                return { text: 'Customer Import File', color: 'bg-blue-100 text-blue-800 border-blue-200' };
            case 'dependents':
                return { text: 'Dependents Import File', color: 'bg-green-100 text-green-800 border-green-200' };
            case 'unknown':
                return { text: 'Unknown Format', color: 'bg-red-100 text-red-800 border-red-200' };
            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-center p-4">
            <div className="bg-brand-surface rounded-2xl shadow-xl p-6 w-full max-w-lg">
                <h3 className="text-2xl font-bold text-brand-text-primary mb-4">Import Data</h3>
                <p className="text-brand-text-secondary mb-2">Upload an XLSX file with your data.</p>
                <p className="text-brand-text-secondary mb-4">
                    The system automatically detects whether you're uploading customers, dependents, or Stone River database files.
                </p>

                <Button variant="secondary" onClick={generateUploadTemplate} className="mb-4">
                    Download Template
                </Button>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-brand-text-primary mb-2">Agent Assignment</label>
                    <select
                        value={assignmentMode}
                        onChange={(e) => setAssignmentMode(e.target.value as 'file' | 'specific' | 'shared')}
                        className="block w-full px-4 py-3 text-brand-text-primary bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink focus:border-brand-pink"
                    >
                        <option value="file">Use agent from file</option>
                        <option value="specific">Assign to specific agent</option>
                        <option value="shared">Share across all agents</option>
                    </select>
                </div>

                {assignmentMode === 'specific' && (
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-brand-text-primary mb-2">Select Agent</label>
                        <select
                            value={selectedAgent || ''}
                            onChange={(e) => setSelectedAgent(Number(e.target.value))}
                            className="block w-full px-4 py-3 text-brand-text-primary bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink focus:border-brand-pink"
                        >
                            <option value="">Select an agent</option>
                            {state.agents && state.agents.length > 0 ? (
                                state.agents.map(agent => (
                                    <option key={agent.id} value={agent.id}>
                                        {agent.firstName} {agent.surname}
                                    </option>
                                ))
                            ) : (
                                <option disabled>No agents available</option>
                            )}
                        </select>
                        {state.agents && state.agents.length === 0 && (
                            <p className="text-sm text-red-500 mt-1">No agents found. Please ensure agents are loaded.</p>
                        )}
                    </div>
                )}

                <div>
                    <label htmlFor="file-upload" className="sr-only">Choose file</label>
                    <input type="file" id="file-upload" accept=".xlsx, .xls" onChange={handleFileChange} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-pink/10 file:text-brand-pink hover:file:bg-brand-pink/20" />
                </div>

                {detectedFileType && getFileTypeLabel() && (
                    <div className={`mt-4 p-3 rounded-lg border ${getFileTypeLabel()!.color}`}>
                        <p className="text-sm font-semibold">Detected: {getFileTypeLabel()!.text}</p>
                        {detectedFileType === 'dependents' && (
                            <p className="text-xs mt-1">This file will add dependents to existing policies</p>
                        )}
                        {detectedFileType === 'customers' && (
                            <p className="text-xs mt-1">This file will create or update customer policies</p>
                        )}
                        {detectedFileType === 'stone-river' && (
                            <p className="text-xs mt-1">This file contains customers, dependents, and payment data</p>
                        )}
                        {detectedFileType === 'unknown' && (
                            <p className="text-xs mt-1">Unable to determine file format. Please check your file.</p>
                        )}
                    </div>
                )}

                {errors.length > 0 && (
                    <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-h-40 overflow-y-auto">
                        <strong className="font-bold">Errors Found:</strong>
                        <ul className="list-disc list-inside">
                            {errors.map((error, index) => <li key={index}>{error}</li>)}
                        </ul>
                    </div>
                )}

                <div className="flex justify-end pt-4 mt-6 space-x-3">
                    <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
                    <Button
                        onClick={handleProcessFile}
                        disabled={!file || isProcessing || (assignmentMode === 'specific' && !selectedAgent)}
                    >
                        {isProcessing ? 'Processing...' : 'Upload and Validate'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default UploadCustomersModal;