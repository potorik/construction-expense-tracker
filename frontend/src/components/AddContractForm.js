import React, { useState } from 'react';
import VendorAutocomplete from './VendorAutocomplete'; // Import the new component

function AddContractForm({ vendors, onAddContract, setError, setSuccess }) {
  // Vendor State
  const [selectedVendorId, setSelectedVendorId] = useState(null);
  const [showInlineVendorFields, setShowInlineVendorFields] = useState(false);
  const [newVendorName, setNewVendorName] = useState(''); // From autocomplete

  // Contract State
  const [description, setDescription] = useState('');
  const [contractAmount, setContractAmount] = useState('');
  const [estimatedCompletion, setEstimatedCompletion] = useState('');

  // Inline Vendor Form State (only if showInlineVendorFields is true)
  const [inlineContact, setInlineContact] = useState('');
  const [inlinePhone, setInlinePhone] = useState('');
  const [inlineEmail, setInlineEmail] = useState('');
  const [inlineAddress, setInlineAddress] = useState('');


  const resetForm = () => {
    setSelectedVendorId(null);
    setShowInlineVendorFields(false);
    setNewVendorName('');
    setDescription('');
    setContractAmount('');
    setEstimatedCompletion('');
    // We might need a way to reset the VendorAutocomplete's internal state too if it doesn't clear automatically
  };

  const handleVendorSelect = (vendorId) => {
    setSelectedVendorId(vendorId);
    // If a vendor is selected, hide the inline fields
    setShowInlineVendorFields(false);
    setNewVendorName(''); // Clear new vendor name if existing is selected
  };

  const handleAddNewVendorRequest = (name) => {
    // Called when 'Add New' is clicked in autocomplete
    setSelectedVendorId(null); // Ensure no existing vendor is selected
    setShowInlineVendorFields(true); // Show fields to add details
    setNewVendorName(name); // Pre-fill the company name

    // Reset inline fields when showing them
    setInlineContact('');
    setInlinePhone('');
    setInlineEmail('');
    setInlineAddress('');
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');

    let contractData = {
      description,
      contractAmount,
      estimatedCompletion
    };

    // Determine vendor information to send
    if (selectedVendorId) {
      contractData.vendorId = selectedVendorId;
    } else if (showInlineVendorFields && newVendorName) {
      contractData.newVendor = {
        companyName: newVendorName,
        contactName: inlineContact,
        phone: inlinePhone,
        email: inlineEmail,
        address: inlineAddress
      };
      if (!newVendorName) { // Double check company name isn't empty
        setError("New Vendor Company Name is required when adding inline.");
        return;
      }
    } else {
      // No vendor selected or being added
      setError("Please select an existing vendor or add a new one.");
      return;
    }

    if (!description || !contractAmount) {
      setError("Contract Description and Amount are required.");
      return;
    }

    try {
      await onAddContract(contractData); // Pass the combined data
      setSuccess("Contract added successfully!"); // App.js sets this too
      resetForm(); // Clear the form
      // Consider explicitly clearing VendorAutocomplete state if needed
    } catch (error) {
      // Error should be set by App.js handler
      console.error("Add contract form submission error:", error)
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Add New Contract</h3>

      {/* Vendor Selection/Addition */}
      <div>
        <label htmlFor="vendor-search">Vendor*</label>
        <VendorAutocomplete
          vendors={vendors}
          onVendorSelect={handleVendorSelect}
          onAddNewVendorRequest={handleAddNewVendorRequest}
          // Pass selectedVendorId if you want autocomplete to display name on reload/edit later
          // existingVendorId={selectedVendorId} // Potentially useful for edit forms
        />
      </div>

      {/* Inline Add Vendor Fields (Conditional) */}
      {showInlineVendorFields && (
        <div className="inline-vendor-fields">
          <h4>Add Details for New Vendor: "{newVendorName}"</h4>
          {/* Reuse AddVendorForm styling/layout if possible */}
          <div>
            <label htmlFor="inlineContactName">Contact Name</label>
            <input type="text" className={"form-control"} id="inlineContactName" value={inlineContact} onChange={(e) => setInlineContact(e.target.value)} />
          </div>
          <div>
            <label htmlFor="inlinePhone">Phone</label>
            <input type="tel" className={"form-control"} id="inlinePhone" value={inlinePhone} onChange={(e) => setInlinePhone(e.target.value)} />
          </div>
          <div>
            <label htmlFor="inlineEmail">Email</label>
            <input type="email" className={"form-control"} id="inlineEmail" value={inlineEmail} onChange={(e) => setInlineEmail(e.target.value)} />
          </div>
          <div>
            <label htmlFor="inlineAddress">Address</label>
            <input type="text" className={"form-control"} id="inlineAddress" value={inlineAddress} onChange={(e) => setInlineAddress(e.target.value)} />
          </div>
          <small>These details will be saved with the new vendor "{newVendorName}".</small>
        </div>
      )}


      {/* Contract Details */}
      <div className="form-row">
        <div>
          <label htmlFor="description">Description*</label>
          <input type="text" id="description" value={description} onChange={(e) => setDescription(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="contractAmount">Contract Amount ($)*</label>
          <input type="number" step="0.01" id="contractAmount" value={contractAmount} onChange={(e) => setContractAmount(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="estimatedCompletion">Est. Completion</label>
          <input type="date" id="estimatedCompletion" value={estimatedCompletion} onChange={(e) => setEstimatedCompletion(e.target.value)} />
        </div>
        <button type="submit">Add Contract</button>
      </div>
      <div className="required-note">* Required fields</div>

    </form>
  );
}

export default AddContractForm;
