import React, { useState } from 'react';
import { processExcelFile, ProcessedExcelFile, NormalizedSheet } from '../../utils/intelligentExcelProcessor';
import ExcelPreviewTable from '../ui/ExcelPreviewTable';
import Button from '../ui/Button';

interface IntelligentUploadModalProps {
    onClose: () => void;
    onConfirm: (processedData: ProcessedExcelFile) => void;
}

type UploadStep = 'select' | 'preview' | 'processing';

const IntelligentUploadModal: React.FC<IntelligentUploadModalProps> = ({ onClose, onConfirm }) => {
    const [file, setFile] = useState<File | null>(null);
    const [step, setStep] = useState<UploadStep>('select');
    const [processedData, setProcessedData] = useState<ProcessedExcelFile | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setProcessedData(null);
        }
    };

    const handleAnalyzeFile = async () => {
        if (!file) return;

        setIsProcessing(true);
        setStep('processing');

        try {
            const result = await processExcelFile(file);
            setProcessedData(result);

            if (result.isValid) {
                setStep('preview');
            } else {
                setStep('select');
            }
        } catch (error: any) {
            console.error('File processing error:', error);
            setProcessedData({
                fileName: file.name,
                sheets: [],
                errors: [`Failed to process file: ${error.message}`],
                warnings: [],
                isValid: false
            });
            setStep('select');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirmUpload = () => {
        if (processedData && processedData.isValid) {
            onConfirm(processedData);
        }
    };

    const handleBackToSelect = () => {
        setStep('select');
        setProcessedData(null);
        setFile(null);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                    <h2 className="text-2xl font-bold text-white">
                        Intelligent Excel Import
                    </h2>
                    <p className="text-blue-100 text-sm mt-1">
                        Automatically detects and normalizes your data
                    </p>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Step 1: File Selection */}
                    {step === 'select' && (
                        <div className="max-w-2xl mx-auto">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                                <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                                    <span>✨</span>
                                    <span>Smart Features</span>
                                </h3>
                                <ul className="text-sm text-blue-800 space-y-1 ml-6 list-disc">
                                    <li>Reads all sheets in your Excel file</li>
                                    <li>Automatically detects column names (even if they differ slightly)</li>
                                    <li>Normalizes dates to YYYY-MM-DD format</li>
                                    <li>Cleans and validates all data</li>
                                    <li>Detects sheet types (policyholders, dependents, receipts)</li>
                                    <li>Shows preview before importing</li>
                                </ul>
                            </div>

                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                                <div className="mb-4">
                                    <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                </div>
                                <label htmlFor="intelligent-file-upload" className="cursor-pointer">
                                    <span className="text-lg font-medium text-gray-700">
                                        {file ? file.name : 'Choose Excel file'}
                                    </span>
                                    <p className="text-sm text-gray-500 mt-1">
                                        .xlsx or .xls files supported
                                    </p>
                                    <input
                                        type="file"
                                        id="intelligent-file-upload"
                                        accept=".xlsx, .xls"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                </label>
                                {file && (
                                    <Button
                                        onClick={handleAnalyzeFile}
                                        className="mt-4 bg-blue-600 hover:bg-blue-700"
                                    >
                                        Analyze File
                                    </Button>
                                )}
                            </div>

                            {/* Show errors if any */}
                            {processedData && !processedData.isValid && (
                                <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
                                    <h4 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                                        <span>❌</span>
                                        <span>Errors Detected</span>
                                    </h4>
                                    <ul className="text-sm text-red-800 space-y-1">
                                        {processedData.errors.map((error, idx) => (
                                            <li key={idx}>• {error}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 2: Processing */}
                    {step === 'processing' && (
                        <div className="max-w-md mx-auto text-center py-12">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                Analyzing Your File...
                            </h3>
                            <p className="text-gray-600">
                                Reading sheets, detecting columns, and normalizing data
                            </p>
                        </div>
                    )}

                    {/* Step 3: Preview */}
                    {step === 'preview' && processedData && processedData.isValid && (
                        <div>
                            {/* Summary */}
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                                <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                                    <span>✅</span>
                                    <span>File Processed Successfully</span>
                                </h3>
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                    <div>
                                        <p className="text-green-700 font-medium">File Name</p>
                                        <p className="text-green-900">{processedData.fileName}</p>
                                    </div>
                                    <div>
                                        <p className="text-green-700 font-medium">Sheets Found</p>
                                        <p className="text-green-900">{processedData.sheets.length}</p>
                                    </div>
                                    <div>
                                        <p className="text-green-700 font-medium">Total Rows</p>
                                        <p className="text-green-900">
                                            {processedData.sheets.reduce((sum, s) => sum + s.rowCount, 0)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Warnings */}
                            {processedData.warnings.length > 0 && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                                    <h4 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                                        <span>⚠️</span>
                                        <span>Warnings ({processedData.warnings.length})</span>
                                    </h4>
                                    <ul className="text-sm text-yellow-800 space-y-1">
                                        {processedData.warnings.map((warning, idx) => (
                                            <li key={idx}>• {warning}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Preview Tables */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Data Preview
                                </h3>
                                {processedData.sheets.map((sheet, idx) => (
                                    <ExcelPreviewTable key={idx} sheet={sheet} maxRows={5} />
                                ))}
                            </div>

                            {/* Instructions */}
                            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm text-blue-900">
                                    <strong>Review the data above.</strong> If everything looks correct, click "Confirm & Import" to proceed with the upload.
                                    The system will automatically map all fields to Stone River's standard format.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                    <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-600">
                            {step === 'preview' && processedData && (
                                <span>
                                    {processedData.sheets.length} sheet(s) • {' '}
                                    {processedData.sheets.reduce((sum, s) => sum + s.rowCount, 0)} row(s) ready
                                </span>
                            )}
                        </div>
                        <div className="flex gap-3">
                            {step === 'preview' && (
                                <Button
                                    onClick={handleBackToSelect}
                                    variant="secondary"
                                >
                                    Back
                                </Button>
                            )}
                            <Button
                                onClick={step === 'preview' ? handleConfirmUpload : onClose}
                                variant="secondary"
                            >
                                {step === 'preview' ? 'Cancel' : 'Close'}
                            </Button>
                            {step === 'preview' && processedData && processedData.isValid && (
                                <Button
                                    onClick={handleConfirmUpload}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    Confirm & Import
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IntelligentUploadModal;
