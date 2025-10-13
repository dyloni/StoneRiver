import React from 'react';
import Card from '../components/ui/Card';

const AdminReminders: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-text-primary">Reminders</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-xl font-bold text-brand-text-primary mb-4">Payment Reminders</h2>
          <p className="text-gray-600 mb-4">
            Automated payment reminders are sent to customers with upcoming or overdue payments.
          </p>
          <div className="space-y-2">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900">Due Soon</p>
              <p className="text-xs text-blue-700">Sent 3 days before due date</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm font-medium text-yellow-900">Overdue</p>
              <p className="text-xs text-yellow-700">Sent on due date</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-sm font-medium text-red-900">Final Notice</p>
              <p className="text-xs text-red-700">Sent 7 days after due date</p>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-brand-text-primary mb-4">Birthday Reminders</h2>
          <p className="text-gray-600 mb-4">
            Automated birthday wishes are sent to customers and their dependents.
          </p>
          <div className="space-y-2">
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm font-medium text-green-900">Birthday Wishes</p>
              <p className="text-xs text-green-700">Sent on customer's birthday</p>
            </div>
            <div className="p-3 bg-teal-50 rounded-lg">
              <p className="text-sm font-medium text-teal-900">Dependent Birthdays</p>
              <p className="text-xs text-teal-700">Sent on dependent's birthday</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-xl font-bold text-brand-text-primary mb-4">Reminder Settings</h2>
        <p className="text-gray-600">
          Reminders are automatically managed by the system. Edge functions check and send reminders on schedule.
        </p>
      </Card>
    </div>
  );
};

export default AdminReminders;
