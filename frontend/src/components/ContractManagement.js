// frontend/src/components/ContractManagement.js
import React from 'react';
import AddContractForm from './AddContractForm'; // Needs latest version
import ContractCard from './ContractCard'; // Needs latest version

function ContractManagement({
                              // Data
                              contracts,
                              vendors,
                              // Add Handlers
                              onAddContract,
                              onAddPayment,
                              onUploadFile,
                              // --- Edit/Delete Handlers ---
                              handleOpenEditModal,
                              handleDeleteContract,
                              handleDeletePayment,
                              handleDeleteFile,
                              // --- End Edit/Delete Handlers ---
                              // Feedback Handlers
                              setError,
                              setSuccess
                            }) {
  return (
    <div>
      <h2>Contract Management</h2>
      {/* Form for adding new contracts - requires vendors list */}
      <AddContractForm
        vendors={vendors}
        onAddContract={onAddContract}
        setError={setError}
        setSuccess={setSuccess}
      />
      <hr />
      <h3>Existing Contracts</h3>
      {(!contracts || contracts.length === 0) ? (
        <p>No contracts added yet.</p>
      ) : (
        <div>
          {/* Map through contracts and render ContractCard for each */}
          console.log("contracts: ");
          console.log(contracts);
          {contracts.map((contract) => (
            <ContractCard
              key={contract.id}
              contract={contract} // Pass the individual contract data
              // Pass down necessary handlers
              onAddPayment={onAddPayment}
              onUploadFile={onUploadFile}
              handleOpenEditModal={handleOpenEditModal} // For editing contract/payment
              handleDeleteContract={handleDeleteContract} // For deleting this contract
              handleDeletePayment={handleDeletePayment} // For deleting payments within this card
              handleDeleteFile={handleDeleteFile} // For deleting files within this card
              setError={setError}
              setSuccess={setSuccess}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ContractManagement;
