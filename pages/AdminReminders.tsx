import React from 'react';
import Card from '../components/ui/Card';

const AdminReminders: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reminders</h1>
        <p className="text-gray-600 mt-1">Manage payment and birthday reminders</p>
      </div>

      <Card>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔔</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Reminder System</h2>
          <p className="text-gray-600 mb-6">
            Automated reminders are configured and running via Edge Functions.
          </p>
          <div className="max-w-2xl mx-auto text-left space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-bold text-blue-900 mb-2">Payment Reminders</h3>
              <p className="text-sm text-blue-800">
                Automatic SMS reminders are sent to customers 7 days before payment due date
                and on the due date.
              </p>
            </div>
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <h3 className="font-bold text-purple-900 mb-2">Birthday Reminders</h3>
              <p className="text-sm text-purple-800">
                Birthday greetings are automatically sent to policy holders and participants
                on their special day.
              </p>
            </div>
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h3 className="font-bold text-gray-900 mb-2">Configuration</h3>
              <p className="text-sm text-gray-700">
                Reminders are managed through Supabase Edge Functions and run on scheduled intervals.
                Contact system administrator to modify reminder settings.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AdminReminders;
