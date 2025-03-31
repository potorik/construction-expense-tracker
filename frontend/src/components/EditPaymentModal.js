// frontend/src/components/EditPaymentModal.js
import React, { useState, useEffect } from 'react';
import { PAYMENT_METHODS } from '../constants'; // Import the list
import './Modal.css'; // Shared basic modal styling

// Assume paymentData includes contractId or pass contractId separately if needed
function EditPaymentModal({ isOpen, onClose, paymentData, onSave }) {
  // Internal State
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  // Effect to populate form
  useEffect(() => {
    if (paymentData) {
      // Format date correctly for input
      setDate(paymentData.date ? paymentData.date.split('T')[0] : '');
      setAmount(paymentData.amount || '');
      setMethod(paymentData.method || '');
      setNotes(paymentData.notes || '');
      setError('');
    }
  }, [paymentData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!date || amount === '') {
      setError("Payment Date and Amount are required.");
      return;
    }
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount)) {
      setError("Invalid Payment Amount.");
      return;
    }

    // Assume paymentData contains the necessary IDs (id, contractId)
    // If not, contractId needs to be passed as a separate prop
    if (!paymentData.contractId) {
      console.error("Error: contractId missing from paymentData in EditPaymentModal");
      setError("Cannot save payment: Missing contract context.");
      return;
    }


    onSave(paymentData.contractId, paymentData.id, {
      date,
      amount: paymentAmount,
      method,
      notes
    });
  };

  if (!isOpen || !paymentData) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Edit Payment</h2>
        {error && <p className="error-message">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="editPaymentDate">Date*</label>
            <input type="date" id="editPaymentDate" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="editPaymentAmount">Amount ($)*</label>
            <input type="number" step="0.01" id="editPaymentAmount" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="editPaymentMethod">Method</label>
            <select
              id="editPaymentMethod"
              value={method} // Bind to state
              onChange={(e) => setMethod(e.target.value)}>
              <option value="">-- Select Method --</option>
              {PAYMENT_METHODS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="editPaymentNotes">Notes</label>
            <input type="text" id="editPaymentNotes" value={notes} onChange={(e) => setNotes(e.target.value)} />
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

export default EditPaymentModal;
