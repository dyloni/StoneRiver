import React from 'react';
import { NormalizedSheet, SheetType } from '../../utils/intelligentExcelProcessor';

interface ExcelPreviewTableProps {
    sheet: NormalizedSheet;
    maxRows?: number;
}

const getSheetTypeColor = (type: SheetType): string => {
    switch (type) {
        case 'policyholder':
            return 'bg-blue-100 text-blue-800 border-blue-300';
        case 'dependent':
            return 'bg-green-100 text-green-800 border-green-300';
        case 'receipt':
            return 'bg-purple-100 text-purple-800 border-purple-300';
        default:
            return 'bg-gray-100 text-gray-800 border-gray-300';
    }
};

const getSheetTypeIcon = (type: SheetType): string => {
    switch (type) {
        case 'policyholder':
            return '👤';
        case 'dependent':
            return '👨‍👩‍👧‍👦';
        case 'receipt':
            return '🧾';
        default:
            return '📄';
    }
};

const ExcelPreviewTable: React.FC<ExcelPreviewTableProps> = ({ sheet, maxRows = 5 }) => {
    const displayData = sheet.data.slice(0, maxRows);
    const hasMoreRows = sheet.data.length > maxRows;

    return (
        <div className="border border-gray-300 rounded-lg overflow-hidden mb-4">
            {/* Header */}
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-300">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{getSheetTypeIcon(sheet.sheetType)}</span>
                        <div>
                            <h3 className="font-semibold text-gray-900">
                                {sheet.originalSheetName}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-xs px-2 py-1 rounded border ${getSheetTypeColor(sheet.sheetType)}`}>
                                    {sheet.sheetType.toUpperCase()}
                                </span>
                                <span className="text-xs text-gray-600">
                                    {sheet.rowCount} rows
                                </span>
                                <span className="text-xs text-gray-600">
                                    {sheet.headers.length} columns
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Field Mapping Info */}
            {sheet.unmappedFields.length > 0 && (
                <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
                    <div className="flex items-start gap-2">
                        <span className="text-yellow-600 mt-0.5">⚠️</span>
                        <div className="text-sm text-yellow-800">
                            <strong>Unmapped columns ({sheet.unmappedFields.length}):</strong>
                            <div className="mt-1 flex flex-wrap gap-1">
                                {sheet.unmappedFields.slice(0, 5).map((field, idx) => (
                                    <span key={idx} className="bg-yellow-100 px-2 py-0.5 rounded text-xs">
                                        {field}
                                    </span>
                                ))}
                                {sheet.unmappedFields.length > 5 && (
                                    <span className="text-xs text-yellow-700">
                                        +{sheet.unmappedFields.length - 5} more
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Data Preview Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-gray-100 border-b border-gray-300">
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                #
                            </th>
                            {sheet.headers.slice(0, 8).map((header, idx) => (
                                <th
                                    key={idx}
                                    className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                                >
                                    {header.replace(/_/g, ' ')}
                                </th>
                            ))}
                            {sheet.headers.length > 8 && (
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                    +{sheet.headers.length - 8} more
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {displayData.map((row, rowIdx) => (
                            <tr
                                key={rowIdx}
                                className={`border-b border-gray-200 ${
                                    rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                } hover:bg-blue-50`}
                            >
                                <td className="px-3 py-2 text-gray-500 font-medium">
                                    {rowIdx + 1}
                                </td>
                                {sheet.headers.slice(0, 8).map((header, colIdx) => (
                                    <td key={colIdx} className="px-3 py-2 text-gray-900">
                                        {row[header] !== null && row[header] !== undefined && row[header] !== ''
                                            ? String(row[header]).length > 30
                                                ? String(row[header]).substring(0, 30) + '...'
                                                : String(row[header])
                                            : '-'}
                                    </td>
                                ))}
                                {sheet.headers.length > 8 && (
                                    <td className="px-3 py-2 text-gray-400 text-xs">
                                        ...
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            {hasMoreRows && (
                <div className="bg-gray-50 px-4 py-2 border-t border-gray-300 text-center text-sm text-gray-600">
                    Showing {maxRows} of {sheet.rowCount} rows
                    {sheet.rowCount > maxRows && (
                        <span className="ml-2 text-xs text-gray-500">
                            ({sheet.rowCount - maxRows} more rows not shown)
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};

export default ExcelPreviewTable;
