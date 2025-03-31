// frontend/src/components/VendorManagement.js
import React from 'react';
import AddVendorForm from './AddVendorForm';

// Assume handleDeleteVendor is passed down from App.js
function VendorManagement({ vendors, onAddVendor, handleDeleteVendor, handleOpenEditModal, setError, setSuccess }) {

  const onDeleteClick = (vendorId, vendorName) => {
    if (window.confirm(`Are you sure you want to delete vendor "${vendorName}"? This cannot be undone.`)) {
      handleDeleteVendor(vendorId); // Call handler from App.js
    }
  };

  const onEditClick = (vendor) => {
    handleOpenEditModal(vendor, 'vendor'); // Call handler from App.js
  };


  return (
    <div>
      <h2>Vendor Management</h2>
      <AddVendorForm
        onAddVendor={onAddVendor}
        setError={setError}
        setSuccess={setSuccess}
      />
      <hr />
      <h3>Existing Vendors</h3>
      {(!vendors || vendors.length === 0) ? (
        <p>No vendors added yet.</p>
      ) : (
        <table className="vendors-table">
          {/* ... thead ... */}
          <tbody>
          {vendors.map(vendor => (
            <tr key={vendor.id}>
              <td>{vendor.companyName}</td>
              <td>{vendor.contactName}</td>
              <td>{vendor.phone}</td>
              <td>{vendor.email}</td>
              <td>{vendor.address}</td>
              <td> {/* Actions Column */}
                <button onClick={() => onEditClick(vendor)} className="btn-edit small">Edit</button>
                <button onClick={() => onDeleteClick(vendor.id, vendor.companyName)} className="btn-delete small">Delete</button>
              </td>
            </tr>
          ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// Add basic styles for buttons: .btn-edit, .btn-delete, .small

export default VendorManagement;
