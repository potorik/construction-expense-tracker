// frontend/src/components/EditContractModal.js
import React, { useState, useEffect } from 'react';
import VendorAutocomplete from './VendorAutocomplete'; // Reuse autocomplete
import './Modal.css'; // Shared basic modal styling

function EditContractModal({ isOpen, onClose, contractData, vendors, onSave }) {
  // Internal State
  const [description, setDescription] = useState('');
  const [contractAmount, setContractAmount] = useState('');
  const [estimatedCompletion, setEstimatedCompletion] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState(null);
  const [error, setError] = useState('');

  // Effect to populate form when contractData changes
  useEffect(() => {
    if (contractData) {
      setDescription(contractData.description || '');
      setContractAmount(contractData.contractAmount || '');
      // Format date correctly for input type="date" which expects YYYY-MM-DD
      setEstimatedCompletion(contractData.estimatedCompletion ? contractData.estimatedCompletion.split('T')[0] : '');
      setSelectedVendorId(contractData.vendorId || null);
      setError('');
    }
  }, [contractData]);

  const handleVendorSelect = (vendorId) => {
    setSelectedVendorId(vendorId);
  };

  // Note: The 'Add New Vendor' functionality from autocomplete might not be directly usable
  // in the edit modal unless the backend PUT endpoint is designed to handle it,
  // or you trigger a separate vendor creation first. We'll assume only selection for edit.
  const handleAddNewVendorRequest = (name) => {
    setError("Cannot add a new vendor directly from the Edit Contract screen. Please add vendors in the Vendors tab.");
    // Or implement more complex logic if needed
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!description || !contractAmount || !selectedVendorId) {
      setError("Vendor, Description, and Contract Amount are required.");
      return;
    }
    const amount = parseFloat(contractAmount);
    if (isNaN(amount)) {
      setError("Invalid Contract Amount.");
      return;
    }

    // Call the onSave handler from App.js
    onSave(contractData.id, {
      description,
      contractAmount: amount,
      estimatedCompletion,
      vendorId: selectedVendorId // Pass the potentially updated vendor ID
    });
  };


  if (!isOpen || !contractData) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Edit Contract</h2>
        {error && <p className="error-message">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="editContractVendor">Vendor*</label>
            {/* Pass existing vendorId to pre-select */}
            <VendorAutocomplete
              vendors={vendors}
              onVendorSelect={handleVendorSelect}
              onAddNewVendorRequest={handleAddNewVendorRequest} // Handle attempt to add new
              existingVendorId={selectedVendorId} // Pass current selection state
            />
            {/* Fallback select if Autocomplete is complex */}
            {/* <select id="editContractVendor" value={selectedVendorId || ''} onChange={(e) => setSelectedVendorId(e.target.value)} required>
                            <option value="" disabled>Select Vendor</option>
                            {vendors.map(v => <option key={v.id} value={v.id}>{v.companyName}</option>)}
                         </select> */}
          </div>
          <div className="form-group">
            <label htmlFor="editContractDescription">Description*</label>
            <input type="text" id="editContractDescription" value={description} onChange={(e) => setDescription(e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="editContractAmount">Contract Amount ($)*</label>
            <input type="number" step="0.01" id="editContractAmount" value={contractAmount} onChange={(e) => setContractAmount(e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="editContractEstCompletion">Est. Completion</label>
            <input type="date" id="editContractEstCompletion" value={estimatedCompletion} onChange={(e) => setEstimatedCompletion(e.target.value)} />
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn-save">Save Changes</button>
            <button type="button" onClick={onClose} className="btn-cancel">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditContractModal;
