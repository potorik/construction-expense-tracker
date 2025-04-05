// frontend/src/components/AddContractForm.js
import React, { useState, useCallback } from 'react';
import VendorAutocomplete from './VendorAutocomplete'; // Component for vendor search/add
import Form from 'react-bootstrap/Form'; // Using react-bootstrap
import Button from 'react-bootstrap/Button';
import InputGroup from 'react-bootstrap/InputGroup'; // For potential future use
import Alert from 'react-bootstrap/Alert'; // For local errors
// Import Row and Col if using react-bootstrap layout
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

function AddContractForm({ vendors, tags, onAddContract, setError, setSuccess }) {
  // Vendor State
  const [selectedVendorId, setSelectedVendorId] = useState(null);
  const [showInlineVendorFields, setShowInlineVendorFields] = useState(false);
  const [newVendorName, setNewVendorName] = useState(''); // From autocomplete if adding new

  // Contract State
  const [description, setDescription] = useState('');
  const [contractAmount, setContractAmount] = useState('');
  const [estimatedCompletion, setEstimatedCompletion] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState([]); // State for selected tag IDs

  // Inline Vendor Form State
  const [inlineContact, setInlineContact] = useState('');
  const [inlinePhone, setInlinePhone] = useState('');
  const [inlineEmail, setInlineEmail] = useState('');
  const [inlineAddress, setInlineAddress] = useState('');

  // Local form error
  const [localError, setLocalError] = useState('');

  // Function to clear the entire form
  const resetForm = useCallback(() => {
    setSelectedVendorId(null);
    setShowInlineVendorFields(false);
    setNewVendorName('');
    setDescription('');
    setContractAmount('');
    setEstimatedCompletion('');
    setSelectedTagIds([]);
    setInlineContact('');
    setInlinePhone('');
    setInlineEmail('');
    setInlineAddress('');
    setLocalError('');
    // We might need a way to tell VendorAutocomplete to reset its internal state if it holds any visually.
    // This depends on VendorAutocomplete's implementation. For now, clearing selectedVendorId helps.
  }, []); // No dependencies needed

  // Handler when an existing vendor is selected from autocomplete
  const handleVendorSelect = useCallback((vendorId) => {
    setSelectedVendorId(vendorId);
    setShowInlineVendorFields(false); // Hide inline fields if existing vendor selected
    setNewVendorName('');
    setLocalError(''); // Clear local errors on selection
  }, []);

  // Handler when user wants to add a new vendor based on search text
  const handleAddNewVendorRequest = useCallback((name) => {
    setSelectedVendorId(null); // Clear any existing selection
    setShowInlineVendorFields(true); // Show fields for new vendor details
    setNewVendorName(name); // Pre-fill company name
    setLocalError(''); // Clear local errors

    // Reset inline fields when showing them
    setInlineContact('');
    setInlinePhone('');
    setInlineEmail('');
    setInlineAddress('');
  }, []);

  // Handler for checkbox changes in the tag section
  const handleTagChange = (e) => {
    const tagId = e.target.value;
    const isChecked = e.target.checked;
    setSelectedTagIds(prev =>
      isChecked ? [...prev, tagId] : prev.filter(id => id !== tagId)
    );
  };

  // Form submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear global errors from App.js
    setSuccess('');
    setLocalError(''); // Clear local errors

    let contractDataPayload = {
      description,
      contractAmount,
      estimatedCompletion,
      tagIds: selectedTagIds // Include selected tag IDs
    };

    // --- Validate Vendor ---
    if (selectedVendorId) {
      contractDataPayload.vendorId = selectedVendorId;
    } else if (showInlineVendorFields && newVendorName) {
      if (!newVendorName.trim()) {
        setLocalError("New Vendor Company Name cannot be empty.");
        return;
      }
      contractDataPayload.newVendor = {
        companyName: newVendorName.trim(),
        contactName: inlineContact.trim(),
        phone: inlinePhone.trim(),
        email: inlineEmail.trim(),
        address: inlineAddress.trim()
      };
    } else {
      setLocalError("Please select an existing vendor or add a new one.");
      return;
    }

    // --- Validate Contract Details ---
    if (!description.trim() || !contractAmount) {
      setLocalError("Contract Description and Amount are required.");
      return;
    }
    const amount = parseFloat(contractAmount);
    if (isNaN(amount)) {
      setLocalError("Invalid Contract Amount. Please enter a number.");
      return;
    }
    contractDataPayload.contractAmount = amount; // Use parsed amount

    // --- Call the main handler from App.js ---
    try {
      await onAddContract(contractDataPayload);
      // Success message is set in App.js
      resetForm(); // Clear the form on successful submission
    } catch (error) {
      // Error message should be set by the handler in App.js via setError prop
      // We catch it here primarily to prevent form reset on failure
      console.error("Add contract form submission error:", error);
      // Optionally set localError based on caught error if needed
      // setLocalError(error.message || "Failed to add contract.");
    }
  };

  return (
    <Form onSubmit={handleSubmit} className="add-contract-form mb-4 p-3 border rounded bg-light">
      <h3 className="mb-3">Add New Contract</h3>

      {/* Display local form errors */}
      {localError && <Alert variant="danger">{localError}</Alert>}

      {/* Vendor Selection/Addition */}
      <Form.Group className="mb-3" controlId="contractVendor">
        <Form.Label>Vendor*</Form.Label>
        <VendorAutocomplete
          vendors={vendors}
          onVendorSelect={handleVendorSelect}
          onAddNewVendorRequest={handleAddNewVendorRequest}
          // Pass selectedVendorId if needed for display/reset within autocomplete
          // existingVendorId={selectedVendorId}
        />
        <Form.Text className="text-muted">
          Search for existing vendor or type a new name and click "Add New".
        </Form.Text>
      </Form.Group>

      {/* Inline Add Vendor Fields (Conditional) */}
      {showInlineVendorFields && (
        <div className="inline-vendor-fields border p-3 mb-3 rounded bg-white">
          <h5>Add Details for New Vendor: "{newVendorName}"</h5>
          <Row> {/* Using Row/Col for layout (assuming import Row/Col from react-bootstrap) */}
            <Col md={6}>
              <Form.Group className="mb-2" controlId="inlineContactName">
                <Form.Label>Contact Name</Form.Label>
                <Form.Control size="sm" type="text" value={inlineContact} onChange={(e) => setInlineContact(e.target.value)} />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-2" controlId="inlinePhone">
                <Form.Label>Phone</Form.Label>
                <Form.Control size="sm" type="tel" value={inlinePhone} onChange={(e) => setInlinePhone(e.target.value)} />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-2" controlId="inlineEmail">
                <Form.Label>Email</Form.Label>
                <Form.Control size="sm" type="email" value={inlineEmail} onChange={(e) => setInlineEmail(e.target.value)} />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-2" controlId="inlineAddress">
                <Form.Label>Address</Form.Label>
                <Form.Control size="sm" type="text" value={inlineAddress} onChange={(e) => setInlineAddress(e.target.value)} />
              </Form.Group>
            </Col>
          </Row>
          <small className="text-muted d-block mt-1">These details will be saved with the new vendor "{newVendorName}".</small>
        </div>
      )}


      {/* Contract Details */}
      <Row>
        <Col md={12}>
          <Form.Group className="mb-3" controlId="contractDescription">
            <Form.Label>Description*</Form.Label>
            <Form.Control type="text" value={description} onChange={(e) => setDescription(e.target.value)} required />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3" controlId="contractAmount">
            <Form.Label>Contract Amount ($)*</Form.Label>
            <Form.Control type="number" step="0.01" value={contractAmount} onChange={(e) => setContractAmount(e.target.value)} required />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3" controlId="contractEstCompletion">
            <Form.Label>Est. Completion</Form.Label>
            <Form.Control type="date" value={estimatedCompletion} onChange={(e) => setEstimatedCompletion(e.target.value)} />
          </Form.Group>
        </Col>
      </Row>


      {/* Tag Selection */}
      <Form.Group className="mb-3" controlId="contractTags">
        <Form.Label>Tags</Form.Label>
        {/* Basic scrollable checkbox group */}
        <div className="tag-checkbox-group p-2 border rounded" style={{ maxHeight: '120px', overflowY: 'auto', background: '#fff' }}>
          {(tags && tags.length > 0) ? tags.map(tag => (
            <Form.Check
              type="checkbox"
              key={tag.id}
              id={`add-tag-checkbox-${tag.id}`} // Unique ID for label association
              label={
                <> {/* Use fragment to add color swatch */}
                  <span style={{
                    display: 'inline-block',
                    width: '12px',
                    height: '12px',
                    backgroundColor: tag.color || '#cccccc',
                    marginRight: '8px',
                    borderRadius: '3px',
                    verticalAlign: 'middle'
                  }}></span>
                  {tag.name}
                </>
              }
              value={tag.id}
              checked={selectedTagIds.includes(tag.id)}
              onChange={handleTagChange}
              className="me-3 d-block" // Display checkboxes vertically
            />
          )) : <p className="text-muted small mb-0">No tags available. Add tags in the 'Tags' tab.</p>}
        </div>
      </Form.Group>

      {/* Submit Button */}
      <div className="mt-3 text-end">
        <Button variant="primary" type="submit">
          Add Contract
        </Button>
      </div>
      <div className="required-note mt-2 text-muted small">* Required fields</div>
    </Form>
  );
}

export default AddContractForm;

