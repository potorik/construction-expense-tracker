// frontend/src/components/PaymentList.js
import React from 'react';

// Accept contractId and handlers as props
function PaymentList({ contractId, payments, handleOpenEditModal, handleDeletePayment }) {

  const onEditClick = (payment) => {
    handleOpenEditModal(payment, 'payment', contractId);
  };

  const onDeleteClick = (paymentId) => {
    if (window.confirm("Are you sure you want to delete this payment? This cannot be undone.")) {
      handleDeletePayment(contractId, paymentId); // Use passed-in contractId
    }
  };

  if (!payments || payments.length === 0) {
    return <p>No payments recorded yet.</p>;
  }

  return (
    <div className="table-responsive"> {/* Optional wrapper for small screens */}
      <table className="payments-table">
        <thead>
        <tr>
          <th>Date</th>
          <th>Amount ($)</th>
          <th>Method</th>
          <th>Notes</th>
          <th>Actions</th> {/* Add Actions column */}
        </tr>
        </thead>
        <tbody>
        {payments.map((payment) => (
          <tr key={payment.id}>
            <td>{payment.date}</td>
            <td>{payment.amount?.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
            <td>{payment.method}</td>
            <td>{payment.notes}</td>
            <td> {/* Actions Cell */}
              <button onClick={() => onEditClick(payment)} className="btn-edit btn-small" title="Edit Payment">Edit</button>
              <button onClick={() => onDeleteClick(payment.id)} className="btn-delete btn-small" title="Delete Payment">Delete</button>
            </td>
          </tr>
        ))}
        </tbody>
      </table>
    </div>
  );
}


export default PaymentList;
