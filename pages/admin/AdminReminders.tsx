import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { supabase } from '../../utils/supabase';

interface ReminderLog {
  id: number;
  reminder_type: string;
  customer_id: number;
  phone_number: string;
  message: string;
  status: string;
  sent_at: string;
  error_message?: string;
}

interface ReminderStats {
  total_birthday_reminders: number;
  total_payment_reminders: number;
  active_birthday_reminders: number;
  active_payment_reminders: number;
  sent_today: number;
  failed_today: number;
}

interface BirthdayReminder {
  id: number;
  customer_id: number;
  participant_name: string;
  date_of_birth: string;
  phone_number: string;
  enabled: boolean;
}

interface PaymentReminder {
  id: number;
  customer_id: number;
  policy_number: string;
  customer_name: string;
  phone_number: string;
  premium_amount: number;
  next_due_date: string;
  enabled: boolean;
}

export function AdminReminders() {
  const [logs, setLogs] = useState<ReminderLog[]>([]);
  const [stats, setStats] = useState<ReminderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [testingBirthday, setTestingBirthday] = useState(false);
  const [testingPayment, setTestingPayment] = useState(false);
  const [syncingReminders, setSyncingReminders] = useState(false);
  const [filter, setFilter] = useState<'all' | 'birthday' | 'payment'>('all');
  const [view, setView] = useState<'logs' | 'upcoming'>('upcoming');
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<BirthdayReminder[]>([]);
  const [upcomingPayments, setUpcomingPayments] = useState<PaymentReminder[]>([]);

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    try {
      setLoading(true);

      let logsQuery = supabase
        .from('reminder_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(50);

      if (filter !== 'all') {
        logsQuery = logsQuery.eq('reminder_type', filter);
      }

      const { data: logsData, error: logsError } = await logsQuery;

      if (logsError) throw logsError;

      const { data: birthdayReminders } = await supabase
        .from('birthday_reminders')
        .select('*')
        .eq('enabled', true);

      const { data: paymentReminders } = await supabase
        .from('payment_reminders')
        .select('*')
        .eq('enabled', true);

      const today = new Date();
      const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
      const todayDay = String(today.getDate()).padStart(2, '0');
      const next30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      const upcomingBirthdayReminders = (birthdayReminders || []).filter((reminder: BirthdayReminder) => {
        const dobParts = reminder.date_of_birth.split('-');
        if (dobParts.length !== 3) return false;
        const dobMonth = dobParts[1];
        const dobDay = dobParts[2];

        const birthdayThisYear = new Date(today.getFullYear(), parseInt(dobMonth) - 1, parseInt(dobDay));
        const birthdayNextYear = new Date(today.getFullYear() + 1, parseInt(dobMonth) - 1, parseInt(dobDay));

        const diffThisYear = birthdayThisYear.getTime() - today.getTime();
        const diffNextYear = birthdayNextYear.getTime() - today.getTime();
        const daysDiffThisYear = Math.ceil(diffThisYear / (1000 * 60 * 60 * 24));
        const daysDiffNextYear = Math.ceil(diffNextYear / (1000 * 60 * 60 * 24));

        return (daysDiffThisYear >= 0 && daysDiffThisYear <= 30) || (daysDiffNextYear >= 0 && daysDiffNextYear <= 30);
      }).sort((a, b) => {
        const aDate = new Date(a.date_of_birth);
        const bDate = new Date(b.date_of_birth);
        const aMonth = aDate.getMonth();
        const aDay = aDate.getDate();
        const bMonth = bDate.getMonth();
        const bDay = bDate.getDate();

        const currentMonth = today.getMonth();
        const currentDay = today.getDate();

        let aDiff = (aMonth - currentMonth) * 31 + (aDay - currentDay);
        let bDiff = (bMonth - currentMonth) * 31 + (bDay - currentDay);

        if (aDiff < 0) aDiff += 365;
        if (bDiff < 0) bDiff += 365;

        return aDiff - bDiff;
      });

      const upcomingPaymentReminders = (paymentReminders || []).filter((reminder: PaymentReminder) => {
        const dueDate = new Date(reminder.next_due_date);
        return dueDate >= today && dueDate <= next30Days;
      }).sort((a, b) => new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime());

      const todayStr = today.toISOString().split('T')[0];
      const todayLogs = (logsData || []).filter(log =>
        log.sent_at && log.sent_at.startsWith(todayStr)
      );

      const statsData: ReminderStats = {
        total_birthday_reminders: birthdayReminders?.length || 0,
        total_payment_reminders: paymentReminders?.length || 0,
        active_birthday_reminders: birthdayReminders?.length || 0,
        active_payment_reminders: paymentReminders?.length || 0,
        sent_today: todayLogs.filter(log => log.status === 'sent').length,
        failed_today: todayLogs.filter(log => log.status === 'failed').length,
      };

      setLogs(logsData || []);
      setStats(statsData);
      setUpcomingBirthdays(upcomingBirthdayReminders);
      setUpcomingPayments(upcomingPaymentReminders);
    } catch (error) {
      console.error('Error loading reminder data:', error);
    } finally {
      setLoading(false);
    }
  };

  const testBirthdayReminders = async () => {
    setTestingBirthday(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-birthday-reminders`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (result.success) {
        alert(`Birthday reminders checked!\nSent: ${result.summary.success}\nFailed: ${result.summary.failed}\nSkipped: ${result.summary.skipped}`);
      } else {
        alert(`Error: ${result.error}`);
      }

      await loadData();
    } catch (error) {
      console.error('Error testing birthday reminders:', error);
      alert('Failed to test birthday reminders');
    } finally {
      setTestingBirthday(false);
    }
  };

  const testPaymentReminders = async () => {
    setTestingPayment(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-payment-reminders`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (result.success) {
        alert(`Payment reminders checked!\nSent: ${result.summary.success}\nFailed: ${result.summary.failed}\nSkipped: ${result.summary.skipped}`);
      } else {
        alert(`Error: ${result.error}`);
      }

      await loadData();
    } catch (error) {
      console.error('Error testing payment reminders:', error);
      alert('Failed to test payment reminders');
    } finally {
      setTestingPayment(false);
    }
  };

  const syncReminders = async () => {
    setSyncingReminders(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-reminders`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (result.success) {
        alert(`Reminders synced successfully!\nBirthday Reminders: ${result.birthdayReminders}\nPayment Reminders: ${result.paymentReminders}`);
      } else {
        alert(`Error: ${result.error}`);
      }

      await loadData();
    } catch (error) {
      console.error('Error syncing reminders:', error);
      alert('Failed to sync reminders');
    } finally {
      setSyncingReminders(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">Loading reminders...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Automated Reminders</h1>
        <div className="flex gap-3">
          <Button
            onClick={syncReminders}
            disabled={syncingReminders}
          >
            {syncingReminders ? 'Syncing...' : 'Sync Reminders from Customers'}
          </Button>
          <Button
            onClick={testBirthdayReminders}
            disabled={testingBirthday}
            variant="secondary"
          >
            {testingBirthday ? 'Testing...' : 'Test Birthday Reminders'}
          </Button>
          <Button
            onClick={testPaymentReminders}
            disabled={testingPayment}
            variant="secondary"
          >
            {testingPayment ? 'Testing...' : 'Test Payment Reminders'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Birthday Reminders</h3>
          <p className="text-3xl font-bold text-blue-600">{stats?.active_birthday_reminders}</p>
          <p className="text-xs text-gray-500 mt-1">of {stats?.total_birthday_reminders} total</p>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Payment Reminders</h3>
          <p className="text-3xl font-bold text-green-600">{stats?.active_payment_reminders}</p>
          <p className="text-xs text-gray-500 mt-1">of {stats?.total_payment_reminders} total</p>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Sent Today</h3>
          <p className="text-3xl font-bold text-gray-900">{stats?.sent_today}</p>
          <p className="text-xs text-red-500 mt-1">{stats?.failed_today} failed</p>
        </Card>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setView('upcoming')}
          className={`px-4 py-2 rounded text-sm font-medium ${
            view === 'upcoming'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Upcoming Reminders
        </button>
        <button
          onClick={() => setView('logs')}
          className={`px-4 py-2 rounded text-sm font-medium ${
            view === 'logs'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Reminder Logs
        </button>
      </div>

      {view === 'upcoming' ? (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Birthday Reminders (Next 30 Days)</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date of Birth
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Message Preview
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {upcomingBirthdays.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                        No upcoming birthdays in the next 30 days
                      </td>
                    </tr>
                  ) : (
                    upcomingBirthdays.map((reminder) => (
                      <tr key={reminder.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {reminder.participant_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(reminder.date_of_birth).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {reminder.phone_number}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-md truncate">
                          Happy Birthday {reminder.participant_name}! Wishing you a wonderful day...
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Payment Reminders (Next 30 Days)</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Policy Number
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount Due
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Message Preview
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {upcomingPayments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        No upcoming payment reminders in the next 30 days
                      </td>
                    </tr>
                  ) : (
                    upcomingPayments.map((reminder) => (
                      <tr key={reminder.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {reminder.customer_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {reminder.policy_number}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-semibold">
                          ${reminder.premium_amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(reminder.next_due_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {reminder.phone_number}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-md truncate">
                          Dear {reminder.customer_name}, your premium payment of ${reminder.premium_amount.toFixed(2)} for policy {reminder.policy_number}...
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Reminder Logs</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded text-sm ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('birthday')}
                className={`px-3 py-1 rounded text-sm ${
                  filter === 'birthday'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Birthday
              </button>
              <button
                onClick={() => setFilter('payment')}
                className={`px-3 py-1 rounded text-sm ${
                  filter === 'payment'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Payment
              </button>
            </div>
          </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Message
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sent At
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No reminder logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        log.reminder_type === 'birthday'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {log.reminder_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{log.phone_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-md truncate">
                      {log.message}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        log.status === 'sent'
                          ? 'bg-green-100 text-green-800'
                          : log.status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {log.status}
                      </span>
                      {log.error_message && (
                        <p className="text-xs text-red-600 mt-1">{log.error_message}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(log.sent_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        </Card>
      )}

      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">How Automatic Reminders Work</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li><strong>Sync Reminders:</strong> Click "Sync Reminders from Customers" to scrape all customer data and generate reminder entries</li>
          <li><strong>Birthday Reminders:</strong> Generated from all participants' dates of birth in customer records</li>
          <li><strong>Payment Reminders:</strong> Generated from policy premium amounts, inception dates, and last payment dates</li>
          <li><strong>Personalized Messages:</strong> Each reminder includes customer name, policy details, and relevant information</li>
          <li><strong>Manual Sending:</strong> Review generated reminders and messages before sending (automatic sending can be configured)</li>
          <li><strong>Test Functions:</strong> Use test buttons to manually check and send reminders for today's date</li>
          <li>All reminders are logged in the system for tracking and auditing</li>
        </ul>
      </Card>
    </div>
  );
}
