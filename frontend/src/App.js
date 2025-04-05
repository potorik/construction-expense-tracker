// frontend/src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// Bootstrap Components
import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import Alert from 'react-bootstrap/Alert';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

// App Components
import ContractManagement from './components/ContractManagement';
import VendorManagement from './components/VendorManagement';
import TagManagement from './components/TagManagement';
import Reporting from './components/Reporting';
import LoginScreen from './components/LoginScreen';
import EditContractModal from './components/EditContractModal';
import EditVendorModal from './components/EditVendorModal';
import EditPaymentModal from './components/EditPaymentModal';

// Base Styles (Bootstrap CSS is imported in index.js)
import './App.css';

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api'; // Use relative default

function App() {
  // --- State ---
  // Data State
  const [contracts, setContracts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [tags, setTags] = useState([]);

  // Loading State
  const [isLoadingContracts, setIsLoadingContracts] = useState(true);
  const [isLoadingVendors, setIsLoadingVendors] = useState(true);
  const [isLoadingTags, setIsLoadingTags] = useState(true);

  // UI State
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('contracts'); // Default tab

  // Authentication State
  // Initialize based on token presence in localStorage
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('authToken'));
  const [authToken, setAuthToken] = useState(localStorage.getItem('authToken')); // Store token for potential future use

  // Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // Holds { ...itemData, type: '...' }

  // --- Effects ---

  // Axios Interceptor to Add Auth Header & Handle 401s
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(config => {
      const token = localStorage.getItem('authToken');
      // Determine if it's an API call relative to our base URL
      let isApiCall = false;
      if (config.url) {
        if (API_BASE_URL.startsWith('http')) { // Absolute URL check
          isApiCall = config.url.startsWith(API_BASE_URL);
        } else { // Relative URL check
          isApiCall = config.url.startsWith(API_BASE_URL) || config.url.startsWith('/' + API_BASE_URL.substring(1)); // Handle cases like '/api' vs 'api'
        }
      }
      const isLoginCall = config.url && config.url.endsWith('/login');

      // Add header if it's an API call, not the login call, and token exists
      if (token && isApiCall && !isLoginCall) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    }, error => {
      // Handle request configuration errors
      console.error("Axios request error:", error);
      return Promise.reject(error);
    });

    // Axios Response Interceptor (Handle global 401 errors -> Logout)
    const responseInterceptor = axios.interceptors.response.use(
      response => response, // Pass through successful responses
      error => {
        // Check if it's an authentication error
        if (error.response && error.response.status === 401) {
          console.error("Unauthorized request (401) - logging out.");
          // Use stable logout logic (defined later with useCallback)
          // Directly calling handleLogout here can cause issues if it's not memoized yet
          // Instead, clear storage and update state directly
          localStorage.removeItem('authToken');
          setAuthToken(null);
          setIsAuthenticated(false); // This will trigger re-render and show LoginScreen
          // Set error after state update to ensure LoginScreen can show it
          setError("Your session is invalid or expired. Please log in again.");
        }
        // Important: Reject the promise so individual .catch() blocks can still handle other errors
        return Promise.reject(error);
      });


    // Clean up interceptors on component unmount
    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Rerun if API_BASE_URL changes (unlikely)

  // Clear Success/Error Messages Automatically
  const clearMessages = useCallback(() => {
    const timer = setTimeout(() => {
      setError('');
      setSuccess('');
    }, 5000); // Clear after 5 seconds
    return () => clearTimeout(timer); // Cleanup timer on unmount or if messages change
  }, []);

  useEffect(() => {
    if (error || success) {
      clearMessages();
    }
  }, [error, success, clearMessages]);

  // --- Fetching Functions (Memoized with useCallback) ---
  const fetchContracts = useCallback(async () => {
    setIsLoadingContracts(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/contracts`);
      setContracts(response.data && Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Fetch contracts error:", err);
      if (err.response?.status !== 401) {
        setError(err.response?.data?.message || err.message || "Failed to fetch contracts.");
      }
      setContracts([]);
    } finally {
      setIsLoadingContracts(false);
    }
  }, []); // Add setError if needed directly

  const fetchVendors = useCallback(async () => {
    setIsLoadingVendors(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/vendors`);
      setVendors(response.data && Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Fetch vendors error:", err);
      if (err.response?.status !== 401) {
        setError(err.response?.data?.message || err.message || "Failed to fetch vendors.");
      }
      setVendors([]);
    } finally {
      setIsLoadingVendors(false);
    }
  }, []); // Add setError if needed directly

  const fetchTags = useCallback(async () => {
    setIsLoadingTags(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/tags`);
      setTags(response.data && Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Fetch tags error:", err);
      if (err.response?.status !== 401) {
        setError(err.response?.data?.message || err.message || "Failed to fetch tags.");
      }
      setTags([]);
    } finally {
      setIsLoadingTags(false);
    }
  }, []); // Add setError if needed directly

  // Fetch all data on initial mount or when authentication status changes to true
  useEffect(() => {
    if (isAuthenticated) {
      console.log("Authenticated, fetching data...");
      setError(''); // Clear errors on successful login/initial load
      fetchContracts();
      fetchVendors();
      fetchTags();
    } else {
      console.log("Not authenticated, skipping data fetch.");
      // Clear data on logout or if not authenticated initially
      setContracts([]);
      setVendors([]);
      setTags([]);
      setIsLoadingContracts(false); // Ensure loading states are reset
      setIsLoadingVendors(false);
      setIsLoadingTags(false);
    }
  }, [isAuthenticated, fetchContracts, fetchVendors, fetchTags]);


  // --- Auth Handlers ---
  const handleLogin = useCallback(async (password) => {
    setError(''); setSuccess('');
    try {
      const response = await axios.post(`${API_BASE_URL}/login`, { password });
      if (response.data?.success === true) {
        localStorage.setItem('authToken', password);
        setAuthToken(password);
        setIsAuthenticated(true); // This will trigger the data fetching useEffect
        setSuccess("Login successful!");
      } else {
        throw new Error(response.data?.message || 'Login failed.');
      }
    } catch (err) {
      console.error("Login error:", err);
      localStorage.removeItem('authToken'); setAuthToken(null); setIsAuthenticated(false);
      setError(err.response?.data?.message || err.message || "Login failed. Please check password or server status.");
    }
  }, []); // Dependencies: setError, setSuccess, setAuthToken, setIsAuthenticated, API_BASE_URL

  const handleLogout = useCallback(() => {
    localStorage.removeItem('authToken');
    setAuthToken(null);
    setIsAuthenticated(false); // This triggers data clearing via useEffect
    setSuccess("Logged out successfully.");
    setActiveTab('contracts'); // Reset to default tab on logout
  }, [/* setAuthToken, setIsAuthenticated, setSuccess */]);


  // --- Modal Control Handlers ---
  const handleOpenEditModal = useCallback((item, type, associatedId = null) => {
    console.log(`Editing ${type}:`, item, `AssociatedId: ${associatedId}`);
    setEditingItem({
      ...item,
      type,
      ...(type === 'payment' && { contractId: associatedId }),
      ...(type === 'file' && { contractId: associatedId }) // Prepare for file editing if needed
    });
    setIsEditModalOpen(true);
    setError(''); setSuccess(''); // Clear messages when opening modal
  }, [/* setError, setSuccess */]);

  const handleCloseEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setEditingItem(null);
  }, []);


  // --- CRUD Handlers (Memoized with useCallback) ---

  // Vendors
  const handleAddVendor = useCallback(async (vendorData) => {
    setError(''); setSuccess('');
    try {
      const response = await axios.post(`${API_BASE_URL}/vendors`, vendorData);
      // Add new vendor and re-sort
      setVendors(prev => [...prev, response.data].sort((a, b) => a.companyName.localeCompare(b.companyName)));
      setSuccess("Vendor added successfully!");
      return response.data; // Return new vendor
    } catch (err) {
      console.error("Add vendor error:", err);
      const message = err.response?.data?.message || err.message || "Failed to add vendor.";
      setError(message);
      throw new Error(message); // Re-throw for form handling
    }
  }, []); // Dependencies: setError, setSuccess, setVendors, API_BASE_URL

  const handleUpdateVendor = useCallback(async (vendorId, vendorData) => {
    setError(''); setSuccess('');
    try {
      const response = await axios.put(`${API_BASE_URL}/vendors/${vendorId}`, vendorData);
      const updatedVendor = response.data;
      // Update vendor list and re-sort
      setVendors(prev => prev.map(v => v.id === vendorId ? updatedVendor : v).sort((a, b) => a.companyName.localeCompare(b.companyName)));
      // Update vendorName in contracts list if name changed
      if (updatedVendor.companyName) {
        setContracts(prevContracts => prevContracts.map(c => {
          if (c.vendorId === vendorId && c.vendorName !== updatedVendor.companyName) {
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
      // Keep modal open on error by not calling handleCloseEditModal()
    }
  }, [handleCloseEditModal]); // Dependencies...

  const handleDeleteVendor = useCallback(async (vendorId) => {
    setError(''); setSuccess('');
    try {
      await axios.delete(`${API_BASE_URL}/vendors/${vendorId}`);
      setVendors(prev => prev.filter(v => v.id !== vendorId));
      setSuccess("Vendor deleted successfully.");
    } catch (err) {
      console.error("Delete vendor error:", err);
      if (err.response?.status === 409) { // Conflict error
        setError(err.response.data.message || "Cannot delete vendor: Used in contracts.");
      } else {
        setError(err.response?.data?.message || err.message || "Failed to delete vendor.");
      }
    }
  }, []); // Dependencies...

  // Contracts
  const handleAddContract = useCallback(async (contractData) => {
    setError(''); setSuccess('');
    try {
      const response = await axios.post(`${API_BASE_URL}/contracts`, contractData);
      // If a new vendor was created inline, add it to vendor state
      if (response.data.createdVendor) {
        setVendors(prev => [...prev, response.data.createdVendor].sort((a, b) => a.companyName.localeCompare(b.companyName)));
      }
      // Add the new contract to state (response already has vendorName/tags populated)
      setContracts(prevContracts => [...prevContracts, response.data].sort((a, b) => (a.vendorName || '').localeCompare(b.vendorName || ''))); // Sort by vendor name
      setSuccess("Contract added successfully!");
    } catch (err) {
      console.error("Add contract error:", err);
      const message = err.response?.data?.message || err.message || "Failed to add contract.";
      setError(message);
      throw new Error(message); // Re-throw for form handling
    }
  }, []); // Dependencies...

  const handleUpdateContract = useCallback(async (contractId, contractData) => {
    setError(''); setSuccess('');
    try {
      const response = await axios.put(`${API_BASE_URL}/contracts/${contractId}`, contractData);
      const updatedContract = response.data; // API returns populated contract
      // Update contract list and re-sort
      setContracts(prev => prev.map(c => c.id === contractId ? updatedContract : c).sort((a, b) => (a.vendorName || '').localeCompare(b.vendorName || '')));
      setSuccess("Contract updated successfully.");
      handleCloseEditModal();
    } catch (err) {
      console.error("Update contract error:", err);
      setError(err.response?.data?.message || err.message || "Failed to update contract.");
    }
  }, [handleCloseEditModal]); // Dependencies...

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
  }, []); // Dependencies...

  // Payments (Add, Update, Delete - ensure totals are recalculated in state update)
  const handleAddPayment = useCallback(async (contractId, paymentData) => {
    setError(''); setSuccess('');
    try {
      const paymentResponse = await axios.post(`${API_BASE_URL}/contracts/${contractId}/payments`, paymentData);
      const newPayment = paymentResponse.data;
      setContracts(prevContracts => prevContracts.map(contract => {
        if (contract.id === contractId) {
          const updatedPayments = [...(contract.payments || []), newPayment];
          const { paidTotal, balanceOwed } = calculateContractTotals({ ...contract, payments: updatedPayments }); // Recalculate
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
  }, []); // Dependencies...

  const handleUpdatePayment = useCallback(async (contractId, paymentId, paymentData) => {
    setError(''); setSuccess('');
    try {
      const response = await axios.put(`${API_BASE_URL}/contracts/${contractId}/payments/${paymentId}`, paymentData);
      const updatedPayment = response.data;
      setContracts(prevContracts => prevContracts.map(contract => {
        if (contract.id === contractId) {
          const updatedPayments = (contract.payments || []).map(p => p.id === paymentId ? updatedPayment : p);
          const { paidTotal, balanceOwed } = calculateContractTotals({ ...contract, payments: updatedPayments }); // Recalculate
          return { ...contract, payments: updatedPayments, paidTotal, balanceOwed };
        }
        return contract;
      }));
      setSuccess("Payment updated successfully.");
      handleCloseEditModal();
    } catch (err) {
      console.error("Update payment error:", err);
      setError(err.response?.data?.message || err.message || "Failed to update payment.");
    }
  }, [handleCloseEditModal]); // Dependencies...

  const handleDeletePayment = useCallback(async (contractId, paymentId) => {
    setError(''); setSuccess('');
    try {
      await axios.delete(`${API_BASE_URL}/contracts/${contractId}/payments/${paymentId}`);
      setContracts(prevContracts => prevContracts.map(contract => {
        if (contract.id === contractId) {
          const updatedPayments = (contract.payments || []).filter(p => p.id !== paymentId);
          const { paidTotal, balanceOwed } = calculateContractTotals({ ...contract, payments: updatedPayments }); // Recalculate
          return { ...contract, payments: updatedPayments, paidTotal, balanceOwed };
        }
        return contract;
      }));
      setSuccess("Payment deleted successfully.");
    } catch (err) {
      console.error("Delete payment error:", err);
      setError(err.response?.data?.message || err.message || "Failed to delete payment.");
    }
  }, []); // Dependencies...

  // Files (Add, Delete)
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
  }, []); // Dependencies...

  const handleDeleteFile = useCallback(async (contractId, fileId) => {
    setError(''); setSuccess('');
    try {
      const response = await axios.delete(`${API_BASE_URL}/contracts/${contractId}/uploads/${fileId}`);
      setContracts(prevContracts => prevContracts.map(contract => {
        if (contract.id === contractId) {
          const updatedFiles = (contract.files || []).filter(f => f.id !== fileId);
          return { ...contract, files: updatedFiles };
        }
        return contract;
      }));
      setSuccess(response?.data?.message || "File deleted successfully.");
    } catch (err) {
      console.error("Delete file error:", err);
      setError(err.response?.data?.message || err.message || "Failed to delete file.");
    }
  }, []); // Dependencies...

  // Tags (Add, Delete)
  const handleAddTag = useCallback(async (tagData) => {
    setError(''); setSuccess('');
    try {
      const response = await axios.post(`${API_BASE_URL}/tags`, tagData);
      setTags(prev => [...prev, response.data].sort((a, b) => a.name.localeCompare(b.name)));
      setSuccess("Tag added successfully!");
      return response.data;
    } catch (err) {
      console.error("Add tag error:", err);
      const message = err.response?.data?.message || err.message || "Failed to add tag.";
      setError(message);
      throw new Error(message); // Re-throw for form handling
    }
  }, []); // Dependencies...

  const handleDeleteTag = useCallback(async (tagId) => {
    setError(''); setSuccess('');
    try {
      await axios.delete(`${API_BASE_URL}/tags/${tagId}`);
      setTags(prev => prev.filter(t => t.id !== tagId));
      // Refetch contracts to ensure tag removals are reflected in populated data
      fetchContracts();
      setSuccess("Tag deleted successfully.");
    } catch (err) {
      console.error("Delete tag error:", err);
      setError(err.response?.data?.message || err.message || "Failed to delete tag.");
    }
  }, [fetchContracts]); // Dependencies...


  // --- Helper to recalculate contract totals (used in payment updates/deletes) ---
  // Note: This assumes contract object structure is consistent
  const calculateContractTotals = (contract) => {
    const payments = contract.payments || [];
    const paidTotal = payments.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
    const contractAmount = parseFloat(contract.contractAmount) || 0;
    const balanceOwed = contractAmount - paidTotal;
    return { paidTotal, balanceOwed };
  };


  // --- Combined Loading State for initial data load ---
  const isInitialLoading = isLoadingContracts || isLoadingVendors || isLoadingTags;

  // --- Render Logic ---
  return (
    <Container className="app-container py-3">
      {!isAuthenticated ? (
        // Render Login Screen if not authenticated
        <LoginScreen onLogin={handleLogin} error={error} />
      ) : (
        // Render main application if authenticated
        <>
          <Row className="align-items-center mb-3">
            <Col>
              <h1 style={{ fontSize: '1.75rem' }}>Home Construction Tracker</h1>
            </Col>
            <Col xs="auto"> {/* Column takes auto width */}
              <Button variant="outline-secondary" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </Col>
          </Row>

          {/* Display Global Error/Success Messages */}
          {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
          {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

          {/* Tab Navigation */}
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            id="app-main-tabs"
            className="mb-3 app-tabs"
            justify
          >
            <Tab eventKey="contracts" title="Contracts">
              {/* Render content only when tab is active, show loading if still loading initial data */}
              {activeTab === 'contracts' && (isInitialLoading ? <div className="text-center p-5">Loading Data...</div> :
                  <ContractManagement
                    contracts={contracts} vendors={vendors} tags={tags}
                    onAddContract={handleAddContract} onAddPayment={handleAddPayment} onUploadFile={handleUploadFile}
                    handleOpenEditModal={handleOpenEditModal} handleDeleteContract={handleDeleteContract}
                    handleDeletePayment={handleDeletePayment} handleDeleteFile={handleDeleteFile}
                    setError={setError} setSuccess={setSuccess}
                  />
              )}
            </Tab>
            <Tab eventKey="vendors" title="Vendors">
              {activeTab === 'vendors' && (isLoadingVendors ? <div className="text-center p-5">Loading Vendors...</div> :
                  <VendorManagement
                    vendors={vendors} onAddVendor={handleAddVendor}
                    handleOpenEditModal={handleOpenEditModal} handleDeleteVendor={handleDeleteVendor}
                    setError={setError} setSuccess={setSuccess}
                  />
              )}
            </Tab>
            <Tab eventKey="tags" title="Tags">
              {activeTab === 'tags' && (isLoadingTags ? <div className="text-center p-5">Loading Tags...</div> :
                  <TagManagement
                    tags={tags} onAddTag={handleAddTag} onDeleteTag={handleDeleteTag}
                    setError={setError} setSuccess={setSuccess}
                  />
              )}
            </Tab>
            <Tab eventKey="reports" title="Reports">
              {/* Reporting component handles its own loading state internally */}
              {activeTab === 'reports' && <Reporting setError={setError} tags={tags} />}
            </Tab>
          </Tabs>

          {/* Modal Rendering (remains outside Tabs) */}
          {isEditModalOpen && editingItem?.type === 'vendor' && (
            <EditVendorModal
              isOpen={isEditModalOpen} onClose={handleCloseEditModal}
              vendorData={editingItem} onSave={handleUpdateVendor}
            />
          )}
          {isEditModalOpen && editingItem?.type === 'contract' && (
            <EditContractModal
              isOpen={isEditModalOpen} onClose={handleCloseEditModal}
              contractData={editingItem} vendors={vendors} tags={tags}
              onSave={handleUpdateContract}
            />
          )}
          {isEditModalOpen && editingItem?.type === 'payment' && (
            <EditPaymentModal
              isOpen={isEditModalOpen} onClose={handleCloseEditModal}
              paymentData={editingItem} // Assumes contractId is included here via handleOpenEditModal
              onSave={handleUpdatePayment}
            />
          )}
        </>
      )}
    </Container>
  );
}

export default App;
