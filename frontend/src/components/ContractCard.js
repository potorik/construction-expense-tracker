// frontend/src/components/ContractCard.js
import React, { useState } from 'react';
import PaymentList from './PaymentList';
import PaymentForm from './PaymentForm';
import FileList from './FileList';
import FileUploadForm from './FileUploadForm';

function ContractCard({
                        contract,
                        onAddPayment,
                        onUploadFile,
                        handleOpenEditModal, // Expects (item, type: 'contract' | 'payment')
                        handleDeleteContract,
                        handleDeletePayment,
                        handleDeleteFile,
                        setError,
                        setSuccess
                      }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => setIsExpanded(!isExpanded);
  const formatCurrency = (value) => (value ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  const onEditClick = (e) => {
    e.stopPropagation(); // Prevent card from toggling expand/collapse
    handleOpenEditModal(contract, 'contract');
  };

  const onDeleteClick = (e) => {
    e.stopPropagation(); // Prevent card from toggling expand/collapse
    if (window.confirm(`Are you sure you want to delete the contract for "${contract.vendorName} - ${contract.description}"? This action cannot be undone.`)) {
      handleDeleteContract(contract.id);
    }
  };

  return (
    <div className="contract-card">
      {/* Pass toggleExpand to header, but stop propagation on buttons */}
      <div className="contract-header" onClick={toggleExpand} title="Click to expand/collapse">
        <div className="contract-header-main">
          {/* Contract Info */}
          <div className="contract-info">
            <h5>{contract.vendorName || 'Unknown Vendor'}</h5>
            <small>{contract.description}</small>
          </div>
          {/* Action Buttons */}
          <div className="contract-actions">
            <button onClick={onEditClick} className="btn-edit btn-small" title="Edit Contract">Edit</button>
            <button onClick={onDeleteClick} className="btn-delete btn-small" title="Delete Contract">Delete</button>
          </div>
        </div>
        {/* Contract Summary */}
        <div className="contract-summary">
          <span><strong>Contract:</strong> {formatCurrency(contract.contractAmount)}</span>
          <span className="paid"><strong>Paid:</strong> {formatCurrency(contract.paidTotal)}</span>
          <span className="balance"><strong>Balance:</strong> {formatCurrency(contract.balanceOwed)}</span>
          <span><strong>Est. Completion:</strong> {contract.estimatedCompletion || 'N/A'}</span>
          <span className="expand-indicator">{isExpanded ? '▼ Collapse' : '▶ Expand'}</span>
        </div>
      </div>

      {isExpanded && (
        <div className="contract-details">
          {/* Payment Section */}
          <div className="details-section">
            <h6>Payment History</h6>
            <PaymentList
              contractId={contract.id} // Pass contractId
              payments={contract.payments}
              handleOpenEditModal={handleOpenEditModal} // Pass down modal handler
              handleDeletePayment={handleDeletePayment} // Pass down delete handler
            />
            <hr />
            <PaymentForm
              contractId={contract.id}
              onAddPayment={onAddPayment}
              setError={setError}
              setSuccess={setSuccess}
            />
          </div>

          {/* File Section */}
          <div className="details-section">
            <h6>Uploaded Documents</h6>
            <FileList
              contractId={contract.id} // Pass contractId
              files={contract.files}
              handleDeleteFile={handleDeleteFile} // Pass down delete handler
            />
            <hr/>
            <FileUploadForm
              contractId={contract.id}
              onUploadFile={onUploadFile}
              setError={setError}
              setSuccess={setSuccess}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default ContractCard;
