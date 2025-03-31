import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import ContractManagement from './components/ContractManagement';
import VendorManagement from './components/VendorManagement';
import Reporting from './components/Reporting'; // Import the new component
import EditContractModal from './components/EditContractModal';
import EditVendorModal from './components/EditVendorModal';
import EditPaymentModal from './components/EditPaymentModal';
import './App.css'; // Keep or update styles

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

function App() {
  const [contracts, setContracts] = useState([]);
  const [vendors, setVendors] = useState([]); // Add state for vendors
  const [isLoadingContracts, setIsLoadingContracts] = useState(true);
  const [isLoadingVendors, setIsLoadingVendors] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('contracts'); // State for tabs

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // Will hold { ...itemData, type: 'contract' | 'vendor' | 'payment' }

  // --- Modal Control Handlers ---
  const handleOpenEditModal = useCallback((item, type, associatedId = null) => { // <-- Accept associatedId
    console.log(`Editing ${type} (ID: ${item.id}), Associated ID: ${associatedId}`);
    // Store associatedId as contractId if type is payment (or file)
    setEditingItem({
      ...item,
      type,
      ...(type === 'payment' && { contractId: associatedId }), // <-- Store contractId here!
      // Add similar line here if you implement file editing later
    });
    setIsEditModalOpen(true);
    setError('');
    setSuccess('');
  }, []); // Dependencies remain empty as the function definition is stable

  const handleCloseEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setEditingItem(null);
  }, []); // No dependencies


  // --- DELETE Handlers ---

  const handleDeleteContract = useCallback(async (contractId) => {
    setError(''); setSuccess('');
    try {
      await axios.delete(`${API_BASE_URL}/contracts/${contractId}`);
      setContracts(prev => prev.filter(c => c.id !== contractId));
      setSuccess("Contract deleted successfully.");
    } catch (err) {
      console.error("Delete contract error:", err);
      setError(err.response?.data?.message || err.message || "Failed to delete contract.");
    }
  }, []); // Dependencies: API_BASE_URL (constant), setError, setSuccess, setContracts

  const handleDeleteVendor = useCallback(async (vendorId) => {
    setError(''); setSuccess('');
    try {
      await axios.delete(`${API_BASE_URL}/vendors/${vendorId}`);
      setVendors(prev => prev.filter(v => v.id !== vendorId));
      setSuccess("Vendor deleted successfully.");
    } catch (err) {
      console.error("Delete vendor error:", err);
      // Handle the specific 409 conflict error
      if (err.response?.status === 409) {
        setError(err.response.data.message || "Cannot delete vendor: Used in contracts.");
      } else {
        setError(err.response?.data?.message || err.message || "Failed to delete vendor.");
      }
    }
  }, []); // Dependencies: API_BASE_URL, setError, setSuccess, setVendors

  const handleDeletePayment = useCallback(async (contractId, paymentId) => {
    setError(''); setSuccess('');
    try {
      await axios.delete(`${API_BASE_URL}/contracts/${contractId}/payments/${paymentId}`);
      // Update nested state immutably
      setContracts(prevContracts => prevContracts.map(contract => {
        if (contract.id === contractId) {
          const updatedPayments = (contract.payments || []).filter(p => p.id !== paymentId);
          // Recalculate totals after deleting payment
          const contractAmount = parseFloat(contract.contractAmount) || 0;
          const paidTotal = updatedPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
          const balanceOwed = contractAmount - paidTotal;
          return { ...contract, payments: updatedPayments, paidTotal, balanceOwed }; // Return new contract object
        }
        return contract;
      }));
      setSuccess("Payment deleted successfully.");
    } catch (err) {
      console.error("Delete payment error:", err);
      setError(err.response?.data?.message || err.message || "Failed to delete payment.");
    }
  }, []); // Dependencies: API_BASE_URL, setError, setSuccess, setContracts

  const handleDeleteFile = useCallback(async (contractId, fileId) => {
    setError(''); setSuccess('');
    try {
      const response = await axios.delete(`${API_BASE_URL}/contracts/${contractId}/uploads/${fileId}`);
      setContracts(prevContracts => prevContracts.map(contract => {
        if (contract.id === contractId) {
          const updatedFiles = (contract.files || []).filter(f => f.id !== fileId);
          return { ...contract, files: updatedFiles }; // Return new contract object
        }
        return contract;
      }));
      setSuccess(response?.data?.message || "File deleted successfully."); // Use msg from server if available (e.g., warning about disk deletion)
    } catch (err) {
      console.error("Delete file error:", err);
      setError(err.response?.data?.message || err.message || "Failed to delete file.");
    }
  }, []); // Dependencies: API_BASE_URL, setError, setSuccess, setContracts

  // --- UPDATE Handlers ---

  const handleUpdateVendor = useCallback(async (vendorId, vendorData) => {
    setError(''); setSuccess('');
    try {
      const response = await axios.put(`${API_BASE_URL}/vendors/${vendorId}`, vendorData);
      const updatedVendor = response.data;
      // Update vendor list
      setVendors(prev => prev.map(v => v.id === vendorId ? updatedVendor : v));

      // Update vendorName in contracts list if name changed
      if (updatedVendor.companyName) {
        setContracts(prevContracts => prevContracts.map(c => {
          if (c.vendorId === vendorId) {
            return { ...c, vendorName: updatedVendor.companyName };
          }
          return c;
        }));
      }

      setSuccess("Vendor updated successfully.");
      handleCloseEditModal(); // Close modal on success
    } catch (err) {
      console.error("Update vendor error:", err);
      setError(err.response?.data?.message || err.message || "Failed to update vendor.");
      // Optional: Keep modal open on error? Or close? Depends on UX preference.
      // handleCloseEditModal();
    }
  }, [handleCloseEditModal]); // Dependencies: API_BASE_URL, setError, setSuccess, setVendors, setContracts, handleCloseEditModal

  const handleUpdateContract = useCallback(async (contractId, contractData) => {
    setError(''); setSuccess('');
    try {
      const response = await axios.put(`${API_BASE_URL}/contracts/${contractId}`, contractData);
      const updatedContract = response.data; // API returns populated contract
      setContracts(prev => prev.map(c => c.id === contractId ? updatedContract : c));
      setSuccess("Contract updated successfully.");
      handleCloseEditModal();
    } catch (err) {
      console.error("Update contract error:", err);
      setError(err.response?.data?.message || err.message || "Failed to update contract.");
    }
  }, [handleCloseEditModal]); // Dependencies: API_BASE_URL, setError, setSuccess, setContracts, handleCloseEditModal


  const handleUpdatePayment = useCallback(async (contractId, paymentId, paymentData) => {
    setError(''); setSuccess('');
    try {
      const response = await axios.put(`${API_BASE_URL}/contracts/${contractId}/payments/${paymentId}`, paymentData);
      const updatedPayment = response.data;

      setContracts(prevContracts => prevContracts.map(contract => {
        if (contract.id === contractId) {
          // Update the specific payment within the payments array
          const updatedPayments = (contract.payments || []).map(p =>
            p.id === paymentId ? updatedPayment : p
          );
          // Recalculate totals after updating payment
          const contractAmount = parseFloat(contract.contractAmount) || 0;
          const paidTotal = updatedPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
          const balanceOwed = contractAmount - paidTotal;
          return { ...contract, payments: updatedPayments, paidTotal, balanceOwed }; // Return new contract object
        }
        return contract;
      }));

      setSuccess("Payment updated successfully.");
      handleCloseEditModal();
    } catch (err) {
      console.error("Update payment error:", err);
      setError(err.response?.data?.message || err.message || "Failed to update payment.");
    }
  }, [handleCloseEditModal]); // Dependencies: API_BASE_URL, setError, setSuccess, setContracts, handleCloseEditModal


  const clearMessages = useCallback(() => { // Wrap in useCallback
    setTimeout(() => {
      setError('');
      setSuccess('');
    }, 5000);
  }, []); // No dependencies needed

  // Fetch Contracts
  const fetchContracts = useCallback(async () => {
    setIsLoadingContracts(true);
    // Don't clear error here, let fetchVendors handle it or do it globally
    try {
      const response = await axios.get(`${API_BASE_URL}/contracts`);
      setContracts(response.data || []);
    } catch (err) {
      console.error("Fetch contracts error:", err);
      setError(err.response?.data?.message || err.message || "Failed to fetch contracts.");
      setContracts([]);
    } finally {
      setIsLoadingContracts(false);
    }
  }, []);

  // Fetch Vendors
  const fetchVendors = useCallback(async () => {
    setIsLoadingVendors(true);
    // Don't clear error here
    try {
      const response = await axios.get(`${API_BASE_URL}/vendors`);
      setVendors(response.data || []);
    } catch (err) {
      console.error("Fetch vendors error:", err);
      setError(err.response?.data?.message || err.message || "Failed to fetch vendors.");
      setVendors([]);
    } finally {
      setIsLoadingVendors(false);
    }
  }, []);

  // Fetch all data on initial mount
  useEffect(() => {
    setError(''); // Clear errors before fetching
    fetchContracts();
    fetchVendors();
  }, [fetchContracts, fetchVendors]); // Re-run if fetch functions change (they won't due to useCallback)

  // Clear messages effect
  useEffect(() => {
    if (error || success) {
      clearMessages();
    }
  }, [error, success, clearMessages]);

  // --- Vendor Handlers ---
  const handleAddVendor = async (vendorData) => {
    setError(''); setSuccess('');
    try {
      const response = await axios.post(`${API_BASE_URL}/vendors`, vendorData);
      setVendors(prevVendors => [...prevVendors, response.data]); // Add new vendor to state
      setSuccess("Vendor added successfully!");
      return response.data; // Return new vendor in case it's needed immediately
    } catch (err) {
      console.error("Add vendor error:", err);
      const message = err.response?.data?.message || err.message || "Failed to add vendor.";
      setError(message);
      throw new Error(message);
    }
  };

  // --- Contract Handlers ---
  const handleAddContract = async (contractData) => {
    setError(''); setSuccess('');
    try {
      // contractData should now contain vendorId OR newVendor object
      const response = await axios.post(`${API_BASE_URL}/contracts`, contractData);

      // If a new vendor was created inline, add it to our vendor state
      if (response.data.createdVendor) {
        setVendors(prev => [...prev, response.data.createdVendor]);
      }

      // Add the new contract to state (response already has vendorName populated)
      setContracts(prevContracts => [...prevContracts, response.data]);
      setSuccess("Contract added successfully!");

    } catch (err) {
      console.error("Add contract error:", err);
      const message = err.response?.data?.message || err.message || "Failed to add contract.";
      setError(message);
      throw new Error(message);
    }
  };

  // Modify handleAddPayment to update contracts state correctly (no functional change needed here, just ensure it works)
  const handleAddPayment = useCallback(async (contractId, paymentData) => {
    setError(''); setSuccess('');
    try {
      const paymentResponse = await axios.post(`${API_BASE_URL}/contracts/${contractId}/payments`, paymentData);
      const newPayment = paymentResponse.data;

      setContracts(prevContracts => prevContracts.map(contract => {
        if (contract.id === contractId) {
          const updatedPayments = [...(contract.payments || []), newPayment];
          const contractAmount = parseFloat(contract.contractAmount) || 0;
          const paidTotal = updatedPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
          const balanceOwed = contractAmount - paidTotal;
          return { ...contract, payments: updatedPayments, paidTotal, balanceOwed };
        }
        return contract;
      }));
      setSuccess("Payment added successfully!");
    } catch (err) {
      console.error("Add payment error:", err);
      const message = err.response?.data?.message || err.message || "Failed to add payment.";
      setError(message);
      throw new Error(message);
    }
  }, []); // Add dependencies if needed, though likely none here


  const handleUploadFile = useCallback(async (contractId, formData) => {
    setError(''); setSuccess('');
    try {
      const response = await axios.post(`${API_BASE_URL}/contracts/${contractId}/uploads`, formData);
      const newFile = response.data;
      setContracts(prevContracts => prevContracts.map(contract => {
        if (contract.id === contractId) {
          const updatedFiles = [...(contract.files || []), newFile];
          return { ...contract, files: updatedFiles };
        }
        return contract;
      }));
      setSuccess("File uploaded successfully!");
    } catch (err) {
      console.error("Upload file error:", err);
      const message = err.response?.data?.message || err.message || "Failed to upload file.";
      setError(message);
      throw new Error(message);
    }
  }, []); // Add dependencies if needed

  const isLoading = isLoadingContracts || isLoadingVendors;

  return (
    <div className="container">
      <h1>Home Construction Project Tracker</h1>

      {/* Tab Navigation */}
      <nav className="app-nav">
        <button onClick={() => setActiveTab('contracts')} disabled={activeTab === 'contracts'} className={activeTab === 'contracts' ? 'active' : ''}>
          Contracts
        </button>
        <button onClick={() => setActiveTab('vendors')} disabled={activeTab === 'vendors'} className={activeTab === 'vendors' ? 'active' : ''}>
          Vendors
        </button>
        <button onClick={() => setActiveTab('reports')} disabled={activeTab === 'reports'} className={activeTab === 'reports' ? 'active' : ''}>
          Reports
        </button>

      </nav>

      {/* Display Global Error/Success Messages */}
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Conditional Rendering based on Tab */}
      {isLoading ? (
        <p className="loading-message">Loading data...</p>
      ) : (
        <div className="tab-content">
          {activeTab === 'contracts' && !isLoadingContracts && !isLoadingVendors && (
            <ContractManagement
              contracts={contracts}
              vendors={vendors}
              onAddContract={handleAddContract}
              onAddPayment={handleAddPayment} // Existing add handler
              onUploadFile={handleUploadFile} // Existing add handler
              // --- Pass Edit/Delete Handlers ---
              handleOpenEditModal={handleOpenEditModal}
              handleDeleteContract={handleDeleteContract}
              handleDeletePayment={handleDeletePayment}
              handleDeleteFile={handleDeleteFile}
              // --- End Edit/Delete Handlers ---
              setError={setError}
              setSuccess={setSuccess}
            />
          )}
          {activeTab === 'vendors' && !isLoadingVendors && (
            <VendorManagement
              vendors={vendors}
              onAddVendor={handleAddVendor} // Existing add handler
              // --- Pass Edit/Delete Handlers ---
              handleOpenEditModal={handleOpenEditModal}
              handleDeleteVendor={handleDeleteVendor}
              // --- End Edit/Delete Handlers ---
              setError={setError}
              setSuccess={setSuccess}
            />
          )}
          {activeTab === 'reports' && (
            <Reporting setError={setError} /> // Pass setError for fetch errors
          )}
        </div>
      )}

      {/* ---- Render Edit Modals Conditionally ---- */}
      {isEditModalOpen && editingItem?.type === 'vendor' && (
        <EditVendorModal
           isOpen={isEditModalOpen}
           onClose={handleCloseEditModal}
           vendorData={editingItem}
           onSave={handleUpdateVendor}
        />
        // <div> {/* Placeholder for Vendor Edit Modal */} Editing Vendor: {editingItem.companyName} </div>
      )}
      {isEditModalOpen && editingItem?.type === 'contract' && (
        <EditContractModal
           isOpen={isEditModalOpen}
           onClose={handleCloseEditModal}
           contractData={editingItem}
           vendors={vendors}
           onSave={handleUpdateContract}
        />
        // <div> {/* Placeholder for Contract Edit Modal */} Editing Contract: {editingItem.description} </div>
      )}
      {isEditModalOpen && editingItem?.type === 'payment' && (
        <EditPaymentModal
           isOpen={isEditModalOpen}
           onClose={handleCloseEditModal}
           paymentData={editingItem}
           onSave={handleUpdatePayment}
        />
        // <div> {/* Placeholder for Payment Edit Modal */} Editing Payment ID: {editingItem.id} </div>
      )}
      {/* ---- End Modal Rendering ---- */}

    </div>
  );
}

export default App;
