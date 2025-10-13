import React, { useMemo, useState } from 'react';
import { useData } from '../contexts/DataContext';
import Card from '../components/ui/Card';
import ViewRequestModal from '../components/modals/ViewRequestModal';
import { AppRequest, RequestStatus } from '../types';

const AdminRequests: React.FC = () => {
  const { requests, agents } = useData();
  const [selectedRequest, setSelectedRequest] = useState<AppRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>('all');

  const filteredRequests = useMemo(() => {
    if (statusFilter === 'all') return requests;
    return requests.filter(r => r.status === statusFilter);
  }, [requests, statusFilter]);

  const statusCounts = useMemo(() => {
    return {
      all: requests.length,
      [RequestStatus.PENDING]: requests.filter(r => r.status === RequestStatus.PENDING).length,
      [RequestStatus.APPROVED]: requests.filter(r => r.status === RequestStatus.APPROVED).length,
      [RequestStatus.REJECTED]: requests.filter(r => r.status === RequestStatus.REJECTED).length,
    };
  }, [requests]);

  const getAgentName = (agentId: number) => {
    const agent = agents?.find(a => a.id === agentId);
    return agent ? `${agent.firstName} ${agent.surname}` : `Agent #${agentId}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">All Requests</h1>
        <p className="text-gray-600 mt-1">{requests.length} total requests</p>
      </div>

      <Card>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              statusFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({statusCounts.all})
          </button>
          <button
            onClick={() => setStatusFilter(RequestStatus.PENDING)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              statusFilter === RequestStatus.PENDING
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pending ({statusCounts[RequestStatus.PENDING]})
          </button>
          <button
            onClick={() => setStatusFilter(RequestStatus.APPROVED)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              statusFilter === RequestStatus.APPROVED
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Approved ({statusCounts[RequestStatus.APPROVED]})
          </button>
          <button
            onClick={() => setStatusFilter(RequestStatus.REJECTED)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              statusFilter === RequestStatus.REJECTED
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Rejected ({statusCounts[RequestStatus.REJECTED]})
          </button>
        </div>
      </Card>

      <div className="grid gap-4">
        {filteredRequests.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No requests found</p>
            </div>
          </Card>
        ) : (
          filteredRequests
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map(request => (
              <Card
                key={request.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedRequest(request)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">
                        {request.requestType}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        request.status === RequestStatus.APPROVED
                          ? 'bg-green-100 text-green-800'
                          : request.status === RequestStatus.REJECTED
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {request.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Request ID:</span> #{request.id}
                      </div>
                      <div>
                        <span className="font-medium">Agent:</span> {getAgentName(request.agentId)}
                      </div>
                      <div>
                        <span className="font-medium">Submitted:</span>{' '}
                        {new Date(request.createdAt).toLocaleDateString()}
                      </div>
                      {request.requestType === 'Make Payment' && 'paymentAmount' in request && (
                        <div>
                          <span className="font-medium">Amount:</span> $
                          {request.paymentAmount.toFixed(2)}
                        </div>
                      )}
                    </div>
                    {request.adminNotes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-gray-700 mb-1">Admin Notes:</div>
                        <div className="text-sm text-gray-600">{request.adminNotes}</div>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <button
                      onClick={() => setSelectedRequest(request)}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {request.status === RequestStatus.PENDING ? 'Review' : 'View Details'}
                    </button>
                  </div>
                </div>
              </Card>
            ))
        )}
      </div>

      {selectedRequest && (
        <ViewRequestModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
        />
      )}
    </div>
  );
};

export default AdminRequests;
