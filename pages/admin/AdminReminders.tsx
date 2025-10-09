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

export function AdminReminders() {
  const [logs, setLogs] = useState<ReminderLog[]>([]);
  const [stats, setStats] = useState<ReminderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [testingBirthday, setTestingBirthday] = useState(false);
  const [testingPayment, setTestingPayment] = useState(false);
  const [filter, setFilter] = useState<'all' | 'birthday' | 'payment'>('all');

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
        .select('id, enabled');

      const { data: paymentReminders } = await supabase
        .from('payment_reminders')
        .select('id, enabled');

      const today = new Date().toISOString().split('T')[0];
      const todayLogs = (logsData || []).filter(log =>
        log.sent_at && log.sent_at.startsWith(today)
      );

      const statsData: ReminderStats = {
        total_birthday_reminders: birthdayReminders?.length || 0,
        total_payment_reminders: paymentReminders?.length || 0,
        active_birthday_reminders: birthdayReminders?.filter(r => r.enabled).length || 0,
        active_payment_reminders: paymentReminders?.filter(r => r.enabled).length || 0,
        sent_today: todayLogs.filter(log => log.status === 'sent').length,
        failed_today: todayLogs.filter(log => log.status === 'failed').length,
      };

      setLogs(logsData || []);
      setStats(statsData);
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

      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">How Automatic Reminders Work</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Birthday reminders are sent automatically at 8:00 AM UTC daily</li>
          <li>Payment reminders are sent automatically at 9:00 AM UTC daily</li>
          <li>Birthday reminders are sent once per year on the person's birthday</li>
          <li>Payment reminders are sent based on the "reminder_days_before" setting (default: 3 days)</li>
          <li>All reminders are logged in the system for tracking and auditing</li>
          <li>Use the test buttons above to manually trigger reminder checks</li>
        </ul>
      </Card>
    </div>
  );
}
