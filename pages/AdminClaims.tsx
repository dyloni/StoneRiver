import React, { useMemo, useState } from 'react';
import { useData } from '../contexts/DataContext';
import Card from '../components/ui/Card';
import ClaimDetailsModal from '../components/modals/ClaimDetailsModal';
import { Claim, ClaimStatus } from '../types';

const AdminClaims: React.FC = () => {
  const { claims, agents } = useData();
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [statusFilter, setStatusFilter] = useState<ClaimStatus | 'all'>('all');

  const filteredClaims = useMemo(() => {
    if (statusFilter === 'all') return claims;
    return claims.filter(c => c.status === statusFilter);
  }, [claims, statusFilter]);

  const statusCounts = useMemo(() => {
    return {
      all: claims.length,
      [ClaimStatus.PENDING]: claims.filter(c => c.status === ClaimStatus.PENDING).length,
      [ClaimStatus.APPROVED]: claims.filter(c => c.status === ClaimStatus.APPROVED).length,
      [ClaimStatus.REJECTED]: claims.filter(c => c.status === ClaimStatus.REJECTED).length,
      [ClaimStatus.PAID]: claims.filter(c => c.status === ClaimStatus.PAID).length,
    };
  }, [claims]);

  const totalClaimAmount = useMemo(() => {
    return claims
      .filter(c => c.status === ClaimStatus.PAID)
      .reduce((sum, c) => sum + c.claim_amount, 0);
  }, [claims]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">All Claims</h1>
        <p className="text-gray-600 mt-1">{claims.length} total claims</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="text-sm text-gray-600 mb-1">Total Claims</div>
          <div className="text-3xl font-bold text-blue-600">{claims.length}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600 mb-1">Pending</div>
          <div className="text-3xl font-bold text-yellow-600">{statusCounts[ClaimStatus.PENDING]}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600 mb-1">Approved</div>
          <div className="text-3xl font-bold text-green-600">{statusCounts[ClaimStatus.APPROVED]}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600 mb-1">Total Paid</div>
          <div className="text-3xl font-bold text-purple-600">${totalClaimAmount.toFixed(2)}</div>
        </Card>
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
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
                        <span className="font-medium">Amount:</span> ${claim.claim_amount.toFixed(2)}
                      </div>
                      <div>
                        <span className="font-medium">Filed By:</span> {claim.filed_by_name}
                      </div>
                      <div>
                        <span className="font-medium">Filed:</span>{' '}
                        {new Date(claim.filed_date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <button
                      onClick={() => setSelectedClaim(claim)}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {claim.status === ClaimStatus.PENDING ? 'Review' : 'View Details'}
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
    </div>
  );
};

export default AdminClaims;
