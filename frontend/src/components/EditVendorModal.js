// frontend/src/components/EditVendorModal.js
import React, { useState, useEffect } from 'react';
import './Modal.css'; // Shared basic modal styling

function EditVendorModal({ isOpen, onClose, vendorData, onSave }) {
  // Internal state for form fields, initialized from vendorData
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState(''); // Local error for the modal form

  // Effect to update form state when vendorData changes (modal opens)
  useEffect(() => {
    if (vendorData) {
      setCompanyName(vendorData.companyName || '');
      setContactName(vendorData.contactName || '');
      setPhone(vendorData.phone || '');
      setEmail(vendorData.email || '');
      setAddress(vendorData.address || '');
      setError(''); // Clear error when new data comes in
    }
  }, [vendorData]); // Re-run effect if vendorData prop changes

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors
    if (!companyName) {
      setError("Company Name is required.");
      return;
    }
    // Call the onSave handler passed from App.js
    onSave(vendorData.id, {
      companyName,
      contactName,
      phone,
      email,
      address
    });
    // The parent (App.js) is responsible for closing the modal on success via handleCloseEditModal
  };

  if (!isOpen || !vendorData) {
    return null; // Don't render anything if not open or no data
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Edit Vendor</h2>
        {error && <p className="error-message">{error}</p>}
        <form onSubmit={handleSubmit}>
          {/* Form fields similar to AddVendorForm */}
          <div className="form-group">
            <label htmlFor="editCompanyName">Company Name*</label>
            <input type="text" id="editCompanyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="editContactName">Contact Name</label>
            <input type="text" id="editContactName" value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="editPhone">Phone</label>
            <input type="tel" id="editPhone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="editEmail">Email</label>
            <input type="email" id="editEmail" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="editAddress">Address</label>
            <input type="text" id="editAddress" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn-save">Save Changes</button>
            <button type="button" onClick={onClose} className="btn-cancel">Cancel</button> {/* Use type="button" to prevent form submission */}
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditVendorModal;
