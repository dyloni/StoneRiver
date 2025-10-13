import React, { useState, useEffect, useMemo } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { supabase } from '../utils/supabase';
import { sendSMS } from '../services/smsService';

interface PaymentReminder {
  id: number;
  customer_id: number;
  policy_number: string;
  customer_name: string;
  phone_number: string;
  premium_amount: number;
  premium_period: string;
  last_payment_date: string | null;
  next_due_date: string;
  last_reminder_sent: string | null;
  reminder_days_before: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface ReminderLog {
  id: number;
  reminder_type: string;
  customer_id: number;
  phone_number: string;
  message: string;
  status: string;
  sent_at: string;
  error_message: string | null;
}

const AdminReminders: React.FC = () => {
  const [paymentReminders, setPaymentReminders] = useState<PaymentReminder[]>([]);
  const [reminderLogs, setReminderLogs] = useState<ReminderLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [selectedReminders, setSelectedReminders] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [remindersRes, logsRes] = await Promise.all([
        supabase.from('payment_reminders').select('*').order('next_due_date', { ascending: true }),
        supabase.from('reminder_logs').select('*').eq('reminder_type', 'payment').order('sent_at', { ascending: false }).limit(50)
      ]);

      if (remindersRes.data) setPaymentReminders(remindersRes.data);
      if (logsRes.data) setReminderLogs(logsRes.data);
    } catch (error) {
      console.error('Error loading reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReminders = useMemo(() => {
    return paymentReminders.filter(reminder => {
      const matchesSearch = searchTerm === '' ||
        reminder.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reminder.policy_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reminder.phone_number.includes(searchTerm);

      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'enabled' && reminder.enabled) ||
        (statusFilter === 'disabled' && !reminder.enabled);

      return matchesSearch && matchesStatus;
    });
  }, [paymentReminders, searchTerm, statusFilter]);

  const toggleReminder = (id: number) => {
    const newSelected = new Set(selectedReminders);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedReminders(newSelected);
  };

  const toggleAll = () => {
    if (selectedReminders.size === filteredReminders.length) {
      setSelectedReminders(new Set());
    } else {
      setSelectedReminders(new Set(filteredReminders.map(r => r.id)));
    }
  };

  const sendTestReminder = async (reminder: PaymentReminder) => {
    setSending(true);
    try {
      const message = `Hi ${reminder.customer_name}, this is a reminder that your premium payment of $${reminder.premium_amount} for policy ${reminder.policy_number} is due on ${reminder.next_due_date}. Please make payment to avoid service interruption. - StoneRiver`;

      const result = await sendSMS(reminder.phone_number, message, 'STONERIVER', 'T');

      await supabase.from('reminder_logs').insert({
        reminder_type: 'payment',
        customer_id: reminder.customer_id,
        phone_number: reminder.phone_number,
        message: message,
        status: result.status === 'S' ? 'sent' : 'failed',
        error_message: result.status === 'F' ? result.remarks : null
      });

      if (result.status === 'S') {
        await supabase.from('payment_reminders')
          .update({ last_reminder_sent: new Date().toISOString() })
          .eq('id', reminder.id);
        alert('Reminder sent successfully!');
      } else {
        alert('Failed to send reminder: ' + result.remarks);
      }

      await loadData();
    } catch (error) {
      console.error('Error sending reminder:', error);
      alert('Error sending reminder: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSending(false);
    }
  };

  const sendBulkReminders = async () => {
    if (selectedReminders.size === 0) {
      alert('Please select at least one reminder to send');
      return;
    }

    if (!confirm(`Send reminders to ${selectedReminders.size} customer(s)?`)) {
      return;
    }

    setSending(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const id of selectedReminders) {
        const reminder = paymentReminders.find(r => r.id === id);
        if (!reminder) continue;

        const message = `Hi ${reminder.customer_name}, this is a reminder that your premium payment of $${reminder.premium_amount} for policy ${reminder.policy_number} is due on ${reminder.next_due_date}. Please make payment to avoid service interruption. - StoneRiver`;

        try {
          const result = await sendSMS(reminder.phone_number, message, 'STONERIVER', 'T');

          await supabase.from('reminder_logs').insert({
            reminder_type: 'payment',
            customer_id: reminder.customer_id,
            phone_number: reminder.phone_number,
            message: message,
            status: result.status === 'S' ? 'sent' : 'failed',
            error_message: result.status === 'F' ? result.remarks : null
          });

          if (result.status === 'S') {
            await supabase.from('payment_reminders')
              .update({ last_reminder_sent: new Date().toISOString() })
              .eq('id', reminder.id);
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          console.error('Error sending to', reminder.phone_number, error);
          failCount++;
        }
      }

      alert(`Reminders sent!\nSuccess: ${successCount}\nFailed: ${failCount}`);
      setSelectedReminders(new Set());
      await loadData();
    } finally {
      setSending(false);
    }
  };

  const toggleReminderEnabled = async (id: number, enabled: boolean) => {
    try {
      await supabase.from('payment_reminders')
        .update({ enabled: !enabled })
        .eq('id', id);
      await loadData();
    } catch (error) {
      console.error('Error toggling reminder:', error);
      alert('Failed to update reminder status');
    }
  };

  const getDaysUntilDue = (dueDate: string): number => {
    const due = new Date(dueDate);
    const now = new Date();
    const diff = due.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-brand-text-primary">Payment Reminders</h1>
        <div className="flex gap-3">
          <Button onClick={loadData} variant="ghost" size="sm" disabled={loading}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>
          {selectedReminders.size > 0 && (
            <Button onClick={sendBulkReminders} disabled={sending}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Send {selectedReminders.size} Reminder{selectedReminders.size !== 1 ? 's' : ''}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-medium">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <p className="text-3xl font-bold text-blue-900">{paymentReminders.length}</p>
              <p className="text-sm font-semibold text-blue-700">Total Reminders</p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-medium">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-3xl font-bold text-green-900">{paymentReminders.filter(r => r.enabled).length}</p>
              <p className="text-sm font-semibold text-green-700">Active</p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-medium">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-3xl font-bold text-amber-900">{paymentReminders.filter(r => getDaysUntilDue(r.next_due_date) <= 3 && getDaysUntilDue(r.next_due_date) >= 0).length}</p>
              <p className="text-sm font-semibold text-amber-700">Due Soon</p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-medium">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-3xl font-bold text-red-900">{paymentReminders.filter(r => getDaysUntilDue(r.next_due_date) < 0).length}</p>
              <p className="text-sm font-semibold text-red-700">Overdue</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search by name, policy, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-5 py-3 pl-11 bg-slate-50 border border-brand-border/50 rounded-xl focus:ring-2 focus:ring-brand-pink focus:border-transparent transition-all shadow-inner-soft font-medium"
              />
              <svg className="w-5 h-5 text-brand-text-secondary absolute left-4 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-5 py-3 bg-slate-50 border border-brand-border/50 rounded-xl focus:ring-2 focus:ring-brand-pink focus:border-transparent transition-all shadow-inner-soft font-medium"
            >
              <option value="all">All Status</option>
              <option value="enabled">Active Only</option>
              <option value="disabled">Disabled Only</option>
            </select>
            <Button onClick={toggleAll} variant="outline">
              {selectedReminders.size === filteredReminders.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-brand-pink border-t-transparent"></div>
              <p className="mt-4 text-brand-text-secondary font-medium">Loading reminders...</p>
            </div>
          ) : filteredReminders.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-brand-text-secondary/30 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <p className="text-brand-text-secondary font-medium">No payment reminders found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReminders.map((reminder) => {
                const daysUntil = getDaysUntilDue(reminder.next_due_date);
                const isOverdue = daysUntil < 0;
                const isDueSoon = daysUntil <= 3 && daysUntil >= 0;

                return (
                  <div
                    key={reminder.id}
                    className={`p-4 rounded-xl border transition-all hover:shadow-soft ${
                      !reminder.enabled
                        ? 'bg-slate-50 border-slate-300 opacity-60'
                        : isOverdue
                        ? 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200'
                        : isDueSoon
                        ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200'
                        : 'bg-white border-brand-border/50'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={selectedReminders.has(reminder.id)}
                        onChange={() => toggleReminder(reminder.id)}
                        className="w-5 h-5 text-brand-pink focus:ring-brand-pink border-brand-border/50 rounded cursor-pointer mt-1"
                        disabled={!reminder.enabled}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="font-bold text-brand-text-primary text-lg">{reminder.customer_name}</h3>
                            <p className="text-sm text-brand-text-secondary font-medium mt-1">
                              Policy: {reminder.policy_number} | {reminder.phone_number}
                            </p>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-sm font-semibold text-brand-text-primary">
                                ${reminder.premium_amount} / {reminder.premium_period}
                              </span>
                              <span className={`text-sm font-bold ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-amber-600' : 'text-green-600'}`}>
                                {isOverdue
                                  ? `${Math.abs(daysUntil)} days overdue`
                                  : daysUntil === 0
                                  ? 'Due today'
                                  : `Due in ${daysUntil} days`}
                              </span>
                            </div>
                            {reminder.last_reminder_sent && (
                              <p className="text-xs text-brand-text-secondary mt-2">
                                Last sent: {new Date(reminder.last_reminder_sent).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => sendTestReminder(reminder)}
                              disabled={sending || !reminder.enabled}
                            >
                              Send Now
                            </Button>
                            <Button
                              size="sm"
                              variant={reminder.enabled ? 'ghost' : 'secondary'}
                              onClick={() => toggleReminderEnabled(reminder.id, reminder.enabled)}
                            >
                              {reminder.enabled ? 'Disable' : 'Enable'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-bold text-brand-text-primary mb-4 flex items-center gap-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Recent Activity
        </h2>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {reminderLogs.length === 0 ? (
            <p className="text-center text-brand-text-secondary py-8">No activity yet</p>
          ) : (
            reminderLogs.map((log) => (
              <div
                key={log.id}
                className={`p-3 rounded-xl border ${
                  log.status === 'sent'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    log.status === 'sent' ? 'bg-green-500' : 'bg-red-500'
                  }`}>
                    {log.status === 'sent' ? (
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-brand-text-primary">{log.phone_number}</p>
                    <p className="text-sm text-brand-text-secondary mt-1">{log.message.substring(0, 100)}...</p>
                    <p className="text-xs text-brand-text-secondary mt-1">
                      {new Date(log.sent_at).toLocaleString()}
                    </p>
                    {log.error_message && (
                      <p className="text-xs text-red-600 mt-1 font-medium">{log.error_message}</p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};

export default AdminReminders;
