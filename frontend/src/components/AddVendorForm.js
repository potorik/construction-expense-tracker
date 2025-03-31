import React, { useState } from 'react';

function AddVendorForm({ onAddVendor, setError, setSuccess }) {
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  const clearForm = () => {
    setCompanyName('');
    setContactName('');
    setPhone('');
    setEmail('');
    setAddress('');
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (!companyName) {
      setError("Company Name is required.");
      return;
    }

    try {
      await onAddVendor({ companyName, contactName, phone, email, address });
      setSuccess("Vendor added successfully!");
      clearForm();
    } catch (error) {
      // Error is likely already set by the handler in App.js
      // setError(error.message || "Failed to add vendor.");
      console.error("Add vendor form submission error:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Add New Vendor</h3>
      {/* Use form-row for layout if desired, or simple divs */}
      <div>
        <label htmlFor="companyName">Company Name*</label>
        <input type="text" className={"form-control"} id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
      </div>
      <div>
        <label htmlFor="contactName">Contact Name</label>
        <input type="text" className={"form-control"} id="contactName" value={contactName} onChange={(e) => setContactName(e.target.value)} />
      </div>
      <div>
        <label htmlFor="phone">Phone</label>
        <input type="tel" className={"form-control"} id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div>
        <label htmlFor="email">Email</label>
        <input type="email" className={"form-control"} id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label htmlFor="address">Address</label>
        <input type="text" id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>
      <button type="submit">Add Vendor</button>
      <div className="required-note">* Required fields</div>
    </form>
  );
}

export default AddVendorForm;
