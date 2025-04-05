// frontend/src/components/EditContractModal.js
import React, { useState, useEffect } from 'react';
import VendorAutocomplete from './VendorAutocomplete'; // Reuse autocomplete component
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Alert from 'react-bootstrap/Alert';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

// Expects props: isOpen, onClose, contractData, vendors, tags, onSave
function EditContractModal({ isOpen, onClose, contractData, vendors, tags, onSave }) {
  // Internal State for form fields, initialized via useEffect
  const [description, setDescription] = useState('');
  const [contractAmount, setContractAmount] = useState('');
  const [estimatedCompletion, setEstimatedCompletion] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState(null);
  const [selectedTagIds, setSelectedTagIds] = useState([]); // State for selected tag IDs
  const [localError, setLocalError] = useState(''); // State for modal-specific validation errors

  // Effect to populate form state when the modal opens or contractData changes
  useEffect(() => {
    if (contractData) {
      setDescription(contractData.description || '');
      setContractAmount(contractData.contractAmount ?? ''); // Use ?? for null/undefined -> ''
      // Format date correctly for input type="date" (YYYY-MM-DD)
      setEstimatedCompletion(contractData.estimatedCompletion ? contractData.estimatedCompletion.split('T')[0] : '');
      setSelectedVendorId(contractData.vendorId || null);
      setSelectedTagIds(contractData.tagIds || []); // Initialize selected tags from contract data
      setLocalError(''); // Clear previous errors when modal data changes
    } else {
      // Reset form if no data (e.g., modal closed improperly)
      setDescription('');
      setContractAmount('');
      setEstimatedCompletion('');
      setSelectedVendorId(null);
      setSelectedTagIds([]);
      setLocalError('');
    }
  }, [contractData]); // Re-run effect if the contractData prop changes

  // Handler for vendor selection from autocomplete
  const handleVendorSelect = (vendorId) => {
    setSelectedVendorId(vendorId);
    setLocalError(''); // Clear error on selection change
  };

  // Handler to prevent adding new vendor directly from this modal
  // Users should add vendors via the Vendors tab for clarity
  const handleAddNewVendorRequest = (name) => {
    setLocalError("Cannot add a new vendor while editing a contract. Please use the Vendors tab first.");
  };

  // Handler for tag checkbox changes
  const handleTagChange = (e) => {
    const tagId = e.target.value;
    const isChecked = e.target.checked;
    setSelectedTagIds(prev =>
      isChecked ? [...prev, tagId] : prev.filter(id => id !== tagId)
    );
  };

  // Form submission handler
  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError(''); // Clear previous errors

    // --- Validation ---
    if (!description.trim() || !contractAmount || !selectedVendorId) {
      setLocalError("Vendor, Description, and Contract Amount are required.");
      return;
    }
    const amount = parseFloat(contractAmount);
    if (isNaN(amount) || amount < 0) { // Check for valid, non-negative number
      setLocalError("Invalid Contract Amount. Please enter a non-negative number.");
      return;
    }
    // --- End Validation ---

    // Call the onSave handler passed from App.js
    // It expects (contractId, updatedData)
    onSave(contractData.id, { // Pass the original contract ID
      description: description.trim(),
      contractAmount: amount,
      estimatedCompletion: estimatedCompletion || null, // Send null if date is cleared
      vendorId: selectedVendorId, // Send the potentially updated vendor ID
      tagIds: selectedTagIds // Send the updated list of tag IDs
    });
    // Parent (App.js) is responsible for closing the modal via handleCloseEditModal,
    // which is usually called within the onSave (handleUpdateContract) function on success.
  };

  // Render nothing if modal is not open or no data
  if (!isOpen || !contractData) {
    return null;
  }

  return (
    <Modal show={isOpen} onHide={onClose} backdrop="static" keyboard={false} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Edit Contract</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* Display local validation errors */}
        {localError && <Alert variant="danger">{localError}</Alert>}

        <Form id={`editContractForm-${contractData.id}`} onSubmit={handleSubmit}> {/* Unique form ID */}
          {/* Vendor Selection */}
          <Form.Group className="mb-3" controlId={`editContractVendor-${contractData.id}`}>
            <Form.Label>Vendor*</Form.Label>
            {/* Use VendorAutocomplete, passing the currently selected vendor ID */}
            <VendorAutocomplete
              vendors={vendors}
              onVendorSelect={handleVendorSelect}
              onAddNewVendorRequest={handleAddNewVendorRequest}
              existingVendorId={selectedVendorId} // Pre-select based on state
            />
            <Form.Text className="text-muted">
              Search to select an existing vendor.
            </Form.Text>
          </Form.Group>

          {/* Contract Details */}
          <Form.Group className="mb-3" controlId={`editContractDescription-${contractData.id}`}>
            <Form.Label>Description*</Form.Label>
            <Form.Control type="text" value={description} onChange={(e) => setDescription(e.target.value)} required />
          </Form.Group>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3" controlId={`editContractAmount-${contractData.id}`}>
                <Form.Label>Contract Amount ($)*</Form.Label>
                <Form.Control type="number" step="0.01" min="0" value={contractAmount} onChange={(e) => setContractAmount(e.target.value)} required />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3" controlId={`editContractEstCompletion-${contractData.id}`}>
                <Form.Label>Est. Completion</Form.Label>
                <Form.Control type="date" value={estimatedCompletion} onChange={(e) => setEstimatedCompletion(e.target.value)} />
              </Form.Group>
            </Col>
          </Row>

          {/* Tag Selection */}
          <Form.Group className="mb-3" controlId={`editContractTags-${contractData.id}`}>
            <Form.Label>Tags</Form.Label>
            <div className="tag-checkbox-group p-2 border rounded" style={{ maxHeight: '120px', overflowY: 'auto', background: '#fff' }}>
              {(tags && tags.length > 0) ? tags.map(tag => (
                <Form.Check
                  type="checkbox"
                  key={tag.id}
                  id={`edit-tag-checkbox-${contractData.id}-${tag.id}`} // More unique ID
                  label={
                    <>
                      <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: tag.color || '#cccccc', marginRight: '8px', borderRadius: '3px', verticalAlign: 'middle', border: '1px solid #ccc' }}></span>
                      {tag.name}
                    </>
                  }
                  value={tag.id}
                  checked={selectedTagIds.includes(tag.id)} // Check based on state
                  onChange={handleTagChange}
                  className="me-3 d-block" // Display checkboxes vertically
                />
              )) : <p className="text-muted small mb-0">No tags available.</p>}
            </div>
          </Form.Group>

        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        {/* Submit button targets the form within Modal.Body using its ID */}
        <Button variant="primary" type="submit" form={`editContractForm-${contractData.id}`}>
          Save Changes
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default EditContractModal;
