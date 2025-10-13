import React from 'react';
import Button from '../ui/Button';

interface ForgotPasswordModalProps {
    onClose: () => void;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-brand-surface rounded-2xl shadow-xl p-8 w-full max-w-md">
                <h3 className="text-2xl font-bold text-brand-text-primary mb-2">Forgot Password?</h3>
                <p className="text-sm text-brand-text-secondary mb-6">
                    Contact your administrator to reset your password.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-blue-800">
                        For security reasons, password resets must be requested through your system administrator.
                    </p>
                </div>
                <div className="flex justify-end">
                     <Button onClick={onClose} className="w-full sm:w-auto">
                        Got it
                     </Button>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordModal;