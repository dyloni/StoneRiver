import React, { useState } from 'react';
import Button from '../ui/Button';
import { supabase } from '../../utils/supabase';

const FormInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
    <input {...props} className={`block w-full px-4 py-3 text-brand-text-primary bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink focus:border-brand-pink ${props.className}`} />
);

const FormTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
    <textarea {...props} className={`block w-full px-4 py-3 text-brand-text-primary bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink focus:border-brand-pink ${props.className}`} />
);

interface AddPackageModalProps {
    packageType: 'funeral' | 'medical' | 'cashback';
    onClose: () => void;
    onSuccess: () => void;
}

const AddPackageModal: React.FC<AddPackageModalProps> = ({ packageType, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        package_key: '',
        display_name: '',
        description: '',
        price: '',
        sum_assured: '',
        payout: '',
        benefits: '',
        rules: '',
        sort_order: '0'
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const benefitsArray = formData.benefits.trim()
                ? formData.benefits.split('\n').filter(b => b.trim())
                : [];

            const rulesArray = formData.rules.trim()
                ? formData.rules.split('\n').filter(r => r.trim())
                : [];

            const { error } = await supabase
                .from('package_configurations')
                .insert({
                    package_type: packageType,
                    package_key: formData.package_key.toUpperCase().replace(/\s+/g, '_'),
                    display_name: formData.display_name,
                    description: formData.description,
                    price: parseFloat(formData.price) || 0,
                    sum_assured: parseFloat(formData.sum_assured) || 0,
                    payout: parseFloat(formData.payout) || 0,
                    benefits: benefitsArray,
                    rules: rulesArray,
                    sort_order: parseInt(formData.sort_order) || 0,
                    is_active: true
                });

            if (error) {
                alert('Error adding package: ' + error.message);
            } else {
                onSuccess();
                onClose();
            }
        } catch (err) {
            console.error('Error:', err);
            alert('An error occurred while adding the package.');
        } finally {
            setLoading(false);
        }
    };

    const getTypeLabel = () => {
        switch (packageType) {
            case 'funeral': return 'Funeral Package';
            case 'medical': return 'Medical Package';
            case 'cashback': return 'Cash Back Add-on';
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
                    <h2 className="text-2xl font-bold text-brand-text-primary">Add {getTypeLabel()}</h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Package Key *</label>
                        <FormInput
                            type="text"
                            name="package_key"
                            value={formData.package_key}
                            onChange={handleChange}
                            placeholder="e.g., PREMIUM, CB5"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">Unique identifier (will be auto-formatted to uppercase with underscores)</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Display Name *</label>
                        <FormInput
                            type="text"
                            name="display_name"
                            value={formData.display_name}
                            onChange={handleChange}
                            placeholder="e.g., Premium Package"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <FormTextarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Package description..."
                            rows={2}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Price ($) *</label>
                            <FormInput
                                type="number"
                                step="0.01"
                                name="price"
                                value={formData.price}
                                onChange={handleChange}
                                placeholder="0.00"
                                required
                            />
                        </div>

                        {packageType === 'funeral' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sum Assured ($)</label>
                                <FormInput
                                    type="number"
                                    step="0.01"
                                    name="sum_assured"
                                    value={formData.sum_assured}
                                    onChange={handleChange}
                                    placeholder="0.00"
                                />
                            </div>
                        )}

                        {packageType === 'cashback' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Payout ($)</label>
                                <FormInput
                                    type="number"
                                    step="0.01"
                                    name="payout"
                                    value={formData.payout}
                                    onChange={handleChange}
                                    placeholder="0.00"
                                />
                            </div>
                        )}
                    </div>

                    {packageType === 'funeral' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Benefits</label>
                                <FormTextarea
                                    name="benefits"
                                    value={formData.benefits}
                                    onChange={handleChange}
                                    placeholder="One benefit per line..."
                                    rows={4}
                                />
                                <p className="text-xs text-gray-500 mt-1">Enter one benefit per line</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Rules</label>
                                <FormTextarea
                                    name="rules"
                                    value={formData.rules}
                                    onChange={handleChange}
                                    placeholder="One rule per line..."
                                    rows={4}
                                />
                                <p className="text-xs text-gray-500 mt-1">Enter one rule per line</p>
                            </div>
                        </>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                        <FormInput
                            type="number"
                            name="sort_order"
                            value={formData.sort_order}
                            onChange={handleChange}
                            placeholder="0"
                        />
                        <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                        <Button type="button" onClick={onClose} variant="outline" disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Adding...' : 'Add Package'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddPackageModal;
