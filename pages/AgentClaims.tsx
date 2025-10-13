import React, { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import Card from '../components/ui/Card';
import ClaimDetailsModal from '../components/modals/ClaimDetailsModal';
import FileClaimModal from '../components/modals/FileClaimModal';
import { Claim, ClaimStatus } from '../types';

const AgentClaims: React.FC = () => {
  const { user } = useAuth();
  const { customers, claims } = useData();
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [showFileClaimModal, setShowFileClaimModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ClaimStatus | 'all'>('all');

  const myCustomerIds = useMemo(() => {
    return new Set(customers.filter(c => c.assignedAgentId === user?.id).map(c => c.id));
  }, [customers, user?.id]);

  const myClaims = useMemo(() => {
    return claims.filter(claim => myCustomerIds.has(claim.customer_id));
  }, [claims, myCustomerIds]);

  const filteredClaims = useMemo(() => {
    if (statusFilter === 'all') return myClaims;
    return myClaims.filter(c => c.status === statusFilter);
  }, [myClaims, statusFilter]);

  const statusCounts = useMemo(() => {
    return {
      all: myClaims.length,
      [ClaimStatus.PENDING]: myClaims.filter(c => c.status === ClaimStatus.PENDING).length,
      [ClaimStatus.APPROVED]: myClaims.filter(c => c.status === ClaimStatus.APPROVED).length,
      [ClaimStatus.REJECTED]: myClaims.filter(c => c.status === ClaimStatus.REJECTED).length,
      [ClaimStatus.PAID]: myClaims.filter(c => c.status === ClaimStatus.PAID).length,
    };
  }, [myClaims]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Claims</h1>
          <p className="text-gray-600 mt-1">{myClaims.length} total claims</p>
        </div>
        <button
          onClick={() => setShowFileClaimModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + File Claim
        </button>
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
            onClick={() => setStatusFilter(ClaimStatus.PENDING)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              statusFilter === ClaimStatus.PENDING
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pending ({statusCounts[ClaimStatus.PENDING]})
          </button>
          <button
            onClick={() => setStatusFilter(ClaimStatus.APPROVED)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              statusFilter === ClaimStatus.APPROVED
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Approved ({statusCounts[ClaimStatus.APPROVED]})
          </button>
          <button
            onClick={() => setStatusFilter(ClaimStatus.PAID)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              statusFilter === ClaimStatus.PAID
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Paid ({statusCounts[ClaimStatus.PAID]})
          </button>
          <button
            onClick={() => setStatusFilter(ClaimStatus.REJECTED)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              statusFilter === ClaimStatus.REJECTED
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Rejected ({statusCounts[ClaimStatus.REJECTED]})
          </button>
        </div>
      </Card>

      <div className="grid gap-4">
        {filteredClaims.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No claims found</p>
              <button
                onClick={() => setShowFileClaimModal(true)}
                className="mt-4 text-blue-600 hover:text-blue-700"
              >
                File your first claim
              </button>
            </div>
          </Card>
        ) : (
          filteredClaims
            .sort((a, b) => new Date(b.filed_date).getTime() - new Date(a.filed_date).getTime())
            .map(claim => (
              <Card
                key={claim.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedClaim(claim)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">
                        Claim #{claim.id}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        claim.status === ClaimStatus.PAID
                          ? 'bg-blue-100 text-blue-800'
                          : claim.status === ClaimStatus.APPROVED
                          ? 'bg-green-100 text-green-800'
                          : claim.status === ClaimStatus.REJECTED
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {claim.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Policy Holder:</span> {claim.customer_name}
                      </div>
                      <div>
                        <span className="font-medium">Deceased:</span> {claim.deceased_name}
                      </div>
                      <div>
                        <span className="font-medium">Policy:</span> {claim.policy_number}
                      </div>
                      <div>
                        <span className="font-medium">Claim Amount:</span> $
                        {claim.claim_amount.toFixed(2)}
                      </div>
                      <div>
                        <span className="font-medium">Date of Death:</span>{' '}
                        {new Date(claim.date_of_death).toLocaleDateString()}
                      </div>
                      <div>
                        <span className="font-medium">Filed:</span>{' '}
                        {new Date(claim.filed_date).toLocaleDateString()}
                      </div>
                    </div>
                    {claim.notes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-gray-700 mb-1">Notes:</div>
                        <div className="text-sm text-gray-600">{claim.notes}</div>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <button
                      onClick={() => setSelectedClaim(claim)}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </Card>
            ))
        )}
      </div>

      {selectedClaim && (
        <ClaimDetailsModal
          claim={selectedClaim}
          onClose={() => setSelectedClaim(null)}
        />
      )}

      {showFileClaimModal && (
        <FileClaimModal
          onClose={() => setShowFileClaimModal(false)}
        />
      )}
    </div>
  );
};

export default AgentClaims;
