import React, { useState } from 'react';
import { PAYMENT_METHODS } from '../constants';

function PaymentForm({ contractId, onAddPayment, setError, setSuccess }) {
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!date || !amount) {
      setError("Payment Date and Amount are required.");
      return;
    }

    try {
      await onAddPayment(contractId, { date, amount, method, notes });
      // Clear form
      setDate('');
      setAmount('');
      setMethod('');
      setNotes('');
      setSuccess("Payment added successfully!");
    } catch (error) {
      setError(error.message || "Failed to add payment.");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h6>Add New Payment</h6>
      <div className="form-row">
        <div>
          <label htmlFor={`payment-date-${contractId}`}>Date*</label>
          <input type="date" className="form-control" id={`payment-date-${contractId}`} value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div>
          <label htmlFor={`payment-amount-${contractId}`}>Amount ($)*</label>
          <input type="number" className="form-control" step="0.01" id={`payment-amount-${contractId}`} value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </div>
        <div>
          <label htmlFor={`payment-method-${contractId}`}>Method</label>
          <select
            id={`payment-method-${contractId}`}
            className="form-control"
            value={method}
            onChange={(e) => setMethod(e.target.value)}>
            <option value="">-- Select Method --</option>
            {PAYMENT_METHODS.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`payment-notes-${contractId}`}>Notes</label>
          <input type="text" className="form-control" id={`payment-notes-${contractId}`} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <button type="submit">Add Payment</button>
      </div>
      <div className="required-note">* Required fields</div>
    </form>
  );
}

export default PaymentForm;
