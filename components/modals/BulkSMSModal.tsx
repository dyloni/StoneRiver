import React, { useState, useMemo } from 'react';
import { Customer } from '../../types';
import Button from '../ui/Button';
import { sendBulkSMS } from '../../services/smsService';

interface BulkSMSModalProps {
  customers: Customer[];
  onClose: () => void;
}

const BulkSMSModal: React.FC<BulkSMSModalProps> = ({ customers, onClose }) => {
  const [message, setMessage] = useState('');
  const [senderId, setSenderId] = useState('STONERIVER');
  const [smsType, setSmsType] = useState<'P' | 'T'>('T');
  const [selectedCustomers, setSelectedCustomers] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{
    successful: number;
    failed: number;
    results: Array<{ phone: string; status: string; remarks: string }>;
  } | null>(null);

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return customers;
    const lowercased = searchTerm.toLowerCase();
    return customers.filter(
      (c) =>
        `${c.firstName} ${c.surname}`.toLowerCase().includes(lowercased) ||
        (c.phone && c.phone.toLowerCase().includes(lowercased))
    );
  }, [customers, searchTerm]);

  const toggleCustomer = (customerId: number) => {
    const newSelected = new Set(selectedCustomers);
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId);
    } else {
      newSelected.add(customerId);
    }
    setSelectedCustomers(newSelected);
  };

  const toggleAll = () => {
    const customersWithPhones = filteredCustomers.filter(
      (c) => c.phone && c.phone.trim() !== ''
    );

    if (selectedCustomers.size === customersWithPhones.length) {
      setSelectedCustomers(new Set());
    } else {
      setSelectedCustomers(new Set(customersWithPhones.map((c) => c.id)));
    }
  };

  const handleSend = async () => {
    if (selectedCustomers.size === 0) {
      alert('Please select at least one customer');
      return;
    }

    if (!message.trim()) {
      alert('Please enter a message');
      return;
    }

    setIsSending(true);
    setSendResult(null);

    try {
      const selectedCustomersList = customers.filter((c) => selectedCustomers.has(c.id));

      const phoneNumbers = selectedCustomersList
        .filter((c) => c.phone && c.phone.trim() !== '')
        .map((c) => {
          let phone = c.phone.replace(/\D/g, '');
          if (phone.startsWith('0')) {
            phone = '263' + phone.substring(1);
          } else if (!phone.startsWith('263')) {
            phone = '263' + phone;
          }
          return phone;
        });

      if (phoneNumbers.length === 0) {
        alert('None of the selected customers have valid phone numbers');
        setIsSending(false);
        return;
      }

      const result = await sendBulkSMS(phoneNumbers, message, senderId, smsType);
      setSendResult(result);
    } catch (error) {
      alert('Error sending SMS: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSending(false);
    }
  };

  const characterCount = message.length;
  const messagePartCount = Math.ceil(characterCount / 160);

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-elevated border border-brand-border/50 animate-scale-in">
        <div className="p-6 border-b border-brand-border/50 bg-gradient-to-r from-brand-pink/5 to-brand-accent/5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-brand-pink to-brand-dark-pink rounded-xl flex items-center justify-center shadow-medium">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-brand-text-primary">Send Bulk SMS</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-brand-text-secondary hover:text-brand-danger hover:bg-brand-danger/5 rounded-xl transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {sendResult ? (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-green-200/50 rounded-2xl p-6 shadow-soft">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-medium">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-green-800">SMS Campaign Complete</h3>
                    <p className="text-sm text-green-700 mt-1">Your messages have been processed</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-green-200/50">
                    <p className="text-2xl font-bold text-green-700">{sendResult.successful}</p>
                    <p className="text-sm text-green-600 font-medium">Successfully Sent</p>
                  </div>
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-red-200/50">
                    <p className="text-2xl font-bold text-red-700">{sendResult.failed}</p>
                    <p className="text-sm text-red-600 font-medium">Failed</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-brand-text-primary flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Detailed Results
                </h4>
                <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                  {sendResult.results.map((result, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-xl border transition-all hover:shadow-soft ${
                        result.status === 'success'
                          ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-green-200/50'
                          : 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          result.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                        }`}>
                          {result.status === 'success' ? (
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-brand-text-primary">{result.phone}</p>
                          <p className="text-sm text-brand-text-secondary mt-1">{result.remarks}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-brand-border/50">
                <Button onClick={onClose}>Close</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-brand-text-primary mb-2">
                    SMS Type
                  </label>
                  <select
                    value={smsType}
                    onChange={(e) => setSmsType(e.target.value as 'P' | 'T')}
                    className="w-full px-5 py-3 bg-slate-50 border border-brand-border/50 rounded-xl focus:ring-2 focus:ring-brand-pink focus:border-transparent transition-all shadow-inner-soft font-medium"
                  >
                    <option value="T">Transactional</option>
                    <option value="P">Promotional</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-brand-text-primary mb-2">
                    Sender ID
                  </label>
                  <input
                    type="text"
                    value={senderId}
                    onChange={(e) => setSenderId(e.target.value)}
                    className="w-full px-5 py-3 bg-slate-50 border border-brand-border/50 rounded-xl focus:ring-2 focus:ring-brand-pink focus:border-transparent transition-all shadow-inner-soft font-medium"
                    placeholder="STONERIVER"
                    maxLength={11}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-brand-text-primary mb-2">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-5 py-3 bg-slate-50 border border-brand-border/50 rounded-xl focus:ring-2 focus:ring-brand-pink focus:border-transparent transition-all shadow-inner-soft font-medium resize-none"
                  rows={4}
                  placeholder="Type your message here..."
                />
                <div className="flex items-center justify-between mt-2 px-1">
                  <p className="text-xs text-brand-text-secondary font-medium">
                    {characterCount} characters
                  </p>
                  <p className="text-xs text-brand-text-secondary font-medium">
                    {messagePartCount} SMS {messagePartCount === 1 ? 'part' : 'parts'}
                  </p>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-semibold text-brand-text-primary flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Select Recipients
                    <span className="px-2.5 py-1 bg-gradient-to-r from-brand-pink to-brand-dark-pink text-white text-xs font-bold rounded-full ml-1 shadow-soft">
                      {selectedCustomers.size}
                    </span>
                  </label>
                  <button
                    onClick={toggleAll}
                    className="text-sm text-brand-pink hover:text-brand-dark-pink font-semibold transition-colors"
                  >
                    {selectedCustomers.size === filteredCustomers.filter(c => c.phone && c.phone.trim() !== '').length
                      ? 'Deselect All'
                      : 'Select All'}
                  </button>
                </div>

                <div className="relative mb-3">
                  <input
                    type="text"
                    placeholder="Search by name or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-5 py-3 pl-11 bg-slate-50 border border-brand-border/50 rounded-xl focus:ring-2 focus:ring-brand-pink focus:border-transparent transition-all shadow-inner-soft font-medium"
                  />
                  <svg className="w-5 h-5 text-brand-text-secondary absolute left-4 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                <div className="border border-brand-border/50 rounded-2xl max-h-80 overflow-y-auto shadow-inner-soft">
                  {filteredCustomers.length === 0 ? (
                    <div className="p-8 text-center">
                      <svg className="w-16 h-16 text-brand-text-secondary/30 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <p className="text-brand-text-secondary font-medium">No customers found</p>
                    </div>
                  ) : (
                    filteredCustomers.map((customer) => {
                      const hasValidPhone = customer.phone && customer.phone.trim() !== '';
                      return (
                        <div
                          key={customer.id}
                          className={`flex items-center p-4 hover:bg-slate-50 border-b last:border-b-0 border-brand-border/30 transition-colors ${
                            !hasValidPhone ? 'opacity-40' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedCustomers.has(customer.id)}
                            onChange={() => toggleCustomer(customer.id)}
                            className="w-5 h-5 text-brand-pink focus:ring-brand-pink border-brand-border/50 rounded cursor-pointer mr-4"
                            disabled={!hasValidPhone}
                          />
                          <div className="flex-1">
                            <p className="font-semibold text-brand-text-primary">
                              {customer.firstName} {customer.surname}
                            </p>
                            <p className={`text-sm mt-1 font-medium ${hasValidPhone ? 'text-brand-text-secondary' : 'text-red-500'}`}>
                              {hasValidPhone ? customer.phone : 'No phone number'}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {!sendResult && (
          <div className="p-6 border-t border-brand-border/50 bg-slate-50/50 flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={isSending || selectedCustomers.size === 0}>
              {isSending ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Send to {selectedCustomers.size} {selectedCustomers.size === 1 ? 'Recipient' : 'Recipients'}
                </span>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkSMSModal;
