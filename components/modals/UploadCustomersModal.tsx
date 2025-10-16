import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { parseCustomersFile, generateUploadTemplate } from '../../utils/csvHelpers';
import { processStoneRiverFile } from '../../utils/stoneRiverFileProcessor';
import { Customer, Agent } from '../../types';
import Button from '../ui/Button';
import * as XLSX from 'xlsx';

interface UploadCustomersModalProps {
    onClose: () => void;
    onUploadSuccess: (newCustomers: Customer[]) => void;
}

const UploadCustomersModal: React.FC<UploadCustomersModalProps> = ({ onClose, onUploadSuccess }) => {
    const { state } = useData();
    const [file, setFile] = useState<File | null>(null);
    const [errors, setErrors] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [assignmentMode, setAssignmentMode] = useState<'file' | 'specific' | 'shared'>('file');
    const [selectedAgent, setSelectedAgent] = useState<number | null>(null);

    useEffect(() => {
        console.log('UploadCustomersModal - agents loaded:', state.agents);
        console.log('UploadCustomersModal - agents count:', state.agents?.length);
    }, [state.agents]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
            setErrors([]);
        }
    };

    const detectFileFormat = async (file: File): Promise<'stone-river' | 'standard'> => {
        try {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer);

            if (workbook.SheetNames.length === 3 &&
                (workbook.SheetNames[0] === 'P' || workbook.SheetNames[0].includes('Policy')) &&
                (workbook.SheetNames[1] === 'PHnD' || workbook.SheetNames[1].includes('Dependent')) &&
                (workbook.SheetNames[2] === 'R' || workbook.SheetNames[2].includes('Receipt'))) {
                return 'stone-river';
            }
        } catch (error) {
            console.log('File format detection failed, using standard parser', error);
        }
        return 'standard';
    };

    const handleProcessFile = async () => {
        if (!file) {
            setErrors(['Please select a file to upload.']);
            return;
        }

        setIsProcessing(true);

        try {
            const format = await detectFileFormat(file);

            if (format === 'stone-river') {
                console.log('Detected Stone River DB format - processing with automatic mapping...');
                const result = await processStoneRiverFile(file);

                if (result.errors.length > 0) {
                    const errorMessages = result.errors.map(
                        e => `Row ${e.row} (${e.sheet}): ${e.error}`
                    );
                    setErrors(errorMessages);
                }

                console.log(`Stone River import complete: ${result.customers.length} customers, ${result.participants.length} participants, ${result.payments.length} payments`);
                onUploadSuccess(result.customers);
                setIsProcessing(false);
            } else {
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
                            onUploadSuccess([...customers, ...updatedCustomers]);
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
            }
        } catch (err: any) {
            setErrors([`Processing failed: ${err.message}`]);
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-center p-4">
            <div className="bg-brand-surface rounded-2xl shadow-xl p-6 w-full max-w-lg">
                <h3 className="text-2xl font-bold text-brand-text-primary mb-4">Import Customers</h3>
                <p className="text-brand-text-secondary mb-2">Upload an XLSX file with customer and participant data.</p>
                <p className="text-brand-text-secondary mb-4">
                    Supports both Stone River DB format (3 pages: P, PHnD, R) and standard template format. The system will automatically detect and process the correct format.
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