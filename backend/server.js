// backend/server.js
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs').promises; // Use promises version of fs
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5001; // Use a different port than React dev server

const DATA_FILE = path.join(__dirname, 'data.json');
const UPLOAD_FOLDER = path.join(__dirname, 'uploads');

// --- Middleware ---
app.use(cors()); // Allow requests from frontend (React dev server)
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// --- Serve Uploaded Files Statically ---
// Make files in the 'uploads' directory accessible via URL path '/uploads'
app.use('/uploads', express.static(UPLOAD_FOLDER));

// --- Multer Configuration for File Uploads ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Ensure upload folder exists
    fs.mkdir(UPLOAD_FOLDER, { recursive: true }) // Use fs.promises.mkdir if using async/await here
      .then(() => cb(null, UPLOAD_FOLDER))
      .catch(err => cb(err));
  },
  // --- FIX THIS FUNCTION ---
  filename: function (req, file, cb) {
    const uniqueSuffix = uuidv4();
    const extension = path.extname(file.originalname);
    // Corrected line using template literal:
    cb(null, `${uniqueSuffix}_${file.originalname}`); // <-- ENSURE THIS LINE IS CORRECT
  }
  // --- END OF FIX ---
});

// Basic file filter (optional - could add more specific checks)
const fileFilter = (req, file, cb) => {
  // Accept most common document/image types - adjust as needed
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt/;
  const mimetype = allowedTypes.test(file.mimetype);
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Error: File upload only supports the following filetypes - ' + allowedTypes));
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 16 * 1024 * 1024 }, // 16MB limit
  fileFilter: fileFilter
});

// --- Helper Functions ---
const loadData = async () => {
  try {
    await fs.access(DATA_FILE);
    const data = await fs.readFile(DATA_FILE, 'utf8');
    // Ensure structure exists even if file was empty or malformed
    const parsedData = data ? JSON.parse(data) : {};
    return {
      vendors: parsedData.vendors || [],
      contracts: parsedData.contracts || []
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { vendors: [], contracts: [] }; // Return empty structure if file not found
    }
    console.error("Error reading data file:", error);
    throw new Error("Could not load data.");
  }
};

const saveData = async (data) => {
  try {
    // Ensure both keys exist when saving
    const dataToSave = {
      vendors: data.vendors || [],
      contracts: data.contracts || []
    };
    await fs.writeFile(DATA_FILE, JSON.stringify(dataToSave, null, 4), 'utf8');
  } catch (error) {
    console.error("Error writing data file:", error);
    throw new Error("Could not save data.");
  }
};

const calculateContractTotals = (contract) => {
  const payments = contract.payments || [];
  const paidTotal = payments.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
  const contractAmount = parseFloat(contract.contractAmount) || 0;
  const balanceOwed = contractAmount - paidTotal;
  return { paidTotal, balanceOwed };
};

// --- API Routes ---

// --- Vendor API Routes ---
// GET all vendors (with optional search)
app.get('/api/vendors', async (req, res) => {
  try {
    const { vendors } = await loadData();
    const searchTerm = req.query.search?.toLowerCase() || '';

    if (searchTerm) {
      const filteredVendors = vendors.filter(v =>
        v.companyName?.toLowerCase().includes(searchTerm) ||
        v.contactName?.toLowerCase().includes(searchTerm) ||
        v.email?.toLowerCase().includes(searchTerm)
      );
      res.json(filteredVendors);
    } else {
      res.json(vendors);
    }
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to fetch vendors." });
  }
});

// POST a new vendor
app.post('/api/vendors', async (req, res) => {
  try {
    const { companyName, contactName, phone, email, address } = req.body;

    if (!companyName) {
      return res.status(400).json({ message: "Company Name is required for a vendor." });
    }

    const newVendor = {
      id: uuidv4(),
      companyName,
      contactName: contactName || '',
      phone: phone || '',
      email: email || '',
      address: address || ''
    };

    const data = await loadData();
    data.vendors.push(newVendor);
    await saveData(data);
    res.status(201).json(newVendor);

  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to add vendor." });
  }
});

// GET all contracts (with calculated totals)
app.get('/api/contracts', async (req, res) => {
  try {
    const { vendors, contracts } = await loadData();

    // Create a vendor lookup map for efficiency
    const vendorMap = new Map(vendors.map(v => [v.id, v]));

    const contractsWithDetails = contracts.map(contract => {
      const { paidTotal, balanceOwed } = calculateContractTotals(contract);
      const vendor = vendorMap.get(contract.vendorId); // Get vendor using vendorId
      return {
        ...contract,
        paidTotal,
        balanceOwed,
        payments: contract.payments || [],
        files: contract.files || [],
        // Embed vendor name, or more details if needed
        vendorName: vendor ? vendor.companyName : 'Unknown Vendor',
        // You could also embed the whole vendor object if useful for the frontend:
        // vendor: vendor || null
      };
    });
    res.json(contractsWithDetails);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to fetch contracts." });
  }
});

// POST a new contract
app.post('/api/contracts', async (req, res) => {
  let newVendorCreated = null; // To return if created inline
  try {
    // Expect vendorId OR newVendor object
    const { vendorId, newVendor, description, contractAmount, estimatedCompletion } = req.body;
    let actualVendorId = vendorId;

    if (!description || contractAmount === undefined || contractAmount === null) {
      return res.status(400).json({ message: "Description and Contract Amount are required." });
    }
    if (!vendorId && !newVendor?.companyName) {
      return res.status(400).json({ message: "Either an existing Vendor selection (vendorId) or a New Vendor Company Name is required." });
    }

    const amount = parseFloat(contractAmount);
    if (isNaN(amount)) {
      return res.status(400).json({ message: "Invalid Contract Amount." });
    }

    const data = await loadData(); // Load data once

    // Handle inline vendor creation
    if (!vendorId && newVendor?.companyName) {
      const createdVendor = {
        id: uuidv4(),
        companyName: newVendor.companyName,
        contactName: newVendor.contactName || '',
        phone: newVendor.phone || '',
        email: newVendor.email || '',
        address: newVendor.address || ''
      };
      data.vendors.push(createdVendor);
      actualVendorId = createdVendor.id; // Use the newly created vendor's ID
      newVendorCreated = createdVendor; // Keep track to return later if needed
      console.log("Created new vendor inline:", createdVendor.companyName);
    } else if (vendorId) {
      // Optional: Verify vendorId exists
      if (!data.vendors.some(v => v.id === vendorId)) {
        return res.status(400).json({ message: "Selected vendorId does not exist." });
      }
      actualVendorId = vendorId;
    }
    // If we reach here without an actualVendorId, something is wrong
    if (!actualVendorId) {
      return res.status(400).json({ message: "Vendor information is missing or invalid." });
    }


    const newContract = {
      id: uuidv4(),
      vendorId: actualVendorId, // Store vendorId now
      description,
      contractAmount: amount,
      estimatedCompletion: estimatedCompletion || null,
      payments: [],
      files: []
    };

    data.contracts.push(newContract);
    await saveData(data); // Save updated vendors and contracts

    // --- Prepare response ---
    // Find vendor details for the response
    const finalVendor = data.vendors.find(v => v.id === actualVendorId);
    const { paidTotal, balanceOwed } = calculateContractTotals(newContract);

    // Return the newly created contract, populated with vendor name
    res.status(201).json({
      ...newContract,
      paidTotal,
      balanceOwed,
      vendorName: finalVendor ? finalVendor.companyName : 'Unknown Vendor',
      // Optionally include the newly created vendor object if it was made inline
      ...(newVendorCreated && { createdVendor: newVendorCreated })
    });

  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to add contract." });
  }
});

// POST a new payment to a contract
app.post('/api/contracts/:contractId/payments', async (req, res) => {
  const { contractId } = req.params;
  const { date, amount, method, notes } = req.body;

  if (!date || amount === undefined || amount === null) {
    return res.status(400).json({ message: "Payment Date and Amount are required." });
  }
  const paymentAmount = parseFloat(amount);
  if (isNaN(paymentAmount)) {
    return res.status(400).json({ message: "Invalid Payment Amount." });
  }


  try {
    const data = await loadData();
    const contractIndex = data.contracts.findIndex(c => c.id === contractId);

    if (contractIndex === -1) {
      return res.status(404).json({ message: "Contract not found." });
    }

    const newPayment = {
      id: uuidv4(),
      date,
      amount: paymentAmount,
      method: method || '',
      notes: notes || ''
    };

    // Ensure payments array exists
    if (!data.contracts[contractIndex].payments) {
      data.contracts[contractIndex].payments = [];
    }

    data.contracts[contractIndex].payments.push(newPayment);
    await saveData(data);
    res.status(201).json(newPayment); // Return the newly added payment

  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to add payment." });
  }
});

// POST upload a file to a contract
// Use upload.single('file') middleware here - 'file' must match the key in FormData
app.post('/api/contracts/:contractId/uploads', upload.single('file'), async (req, res) => {
  const { contractId } = req.params;

  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded or file type not allowed." });
  }

  try {
    const data = await loadData();
    const contractIndex = data.contracts.findIndex(c => c.id === contractId);

    if (contractIndex === -1) {
      // If contract not found, attempt to delete the uploaded file
      await fs.unlink(req.file.path).catch(err => console.error("Error deleting orphaned file:", err));
      return res.status(404).json({ message: "Contract not found." });
    }

    const newFile = {
      id: uuidv4(),
      filename: req.file.filename, // The unique filename saved by multer
      originalFilename: req.file.originalname // The original name for display
    };

    // Ensure files array exists
    if (!data.contracts[contractIndex].files) {
      data.contracts[contractIndex].files = [];
    }

    data.contracts[contractIndex].files.push(newFile);
    await saveData(data);
    res.status(201).json(newFile); // Return the file info

  } catch (error) {
    // Attempt to delete the uploaded file if saving data fails
    await fs.unlink(req.file.path).catch(err => console.error("Error deleting file after save failure:", err));
    res.status(500).json({ message: error.message || "Failed to upload file." });
  }
});

// --- Reporting API Routes ---
app.get('/api/reports/spending-by-vendor', async (req, res) => {
  try {
    const { vendors, contracts } = await loadData();

    // Create a vendor lookup map for name
    const vendorMap = new Map(vendors.map(v => [v.id, v.companyName]));

    // Calculate total paid per vendorId
    const spending = {}; // Use an object { vendorId: totalPaid }

    contracts.forEach(contract => {
      if (!contract.vendorId) return; // Skip contracts without a vendor

      const paidForThisContract = (contract.payments || []).reduce((sum, payment) => {
        return sum + (parseFloat(payment.amount) || 0);
      }, 0);

      spending[contract.vendorId] = (spending[contract.vendorId] || 0) + paidForThisContract;
    });

    // Format data for Chart.js and CSV (using vendor names)
    const reportData = {
      labels: [], // Vendor Names
      data: [],   // Total Spent
      csvData: [] // Array of { vendorName, totalSpent } for CSV
    };

    for (const vendorId in spending) {
      const vendorName = vendorMap.get(vendorId) || `Unknown Vendor (ID: ${vendorId.substring(0, 6)}...)`;
      const totalSpent = spending[vendorId];

      if (totalSpent > 0) { // Optionally only include vendors with spending
        reportData.labels.push(vendorName);
        reportData.data.push(totalSpent);
        reportData.csvData.push({ vendorName: vendorName, totalSpent: totalSpent });
      }
    }

    res.json(reportData);

  } catch (error) {
    console.error("Error generating spending report:", error);
    res.status(500).json({ message: error.message || "Failed to generate spending report." });
  }
});

// --- UPDATE (PUT) Endpoints ---
// PUT Update a Vendor
app.put('/api/vendors/:vendorId', async (req, res) => {
  const { vendorId } = req.params;
  const { companyName, contactName, phone, email, address } = req.body;

  // Basic validation
  if (!companyName) {
    return res.status(400).json({ message: "Company Name cannot be empty." });
  }

  try {
    const data = await loadData();
    const vendorIndex = data.vendors.findIndex(v => v.id === vendorId);

    if (vendorIndex === -1) {
      return res.status(404).json({ message: "Vendor not found." });
    }

    // Update vendor data
    const updatedVendor = {
      ...data.vendors[vendorIndex], // Keep existing ID and other fields
      companyName,
      contactName: contactName ?? data.vendors[vendorIndex].contactName, // Use existing if not provided
      phone: phone ?? data.vendors[vendorIndex].phone,
      email: email ?? data.vendors[vendorIndex].email,
      address: address ?? data.vendors[vendorIndex].address,
    };
    data.vendors[vendorIndex] = updatedVendor;

    await saveData(data);
    res.json(updatedVendor); // Return the updated vendor

  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to update vendor." });
  }
});

// PUT Update a Contract
app.put('/api/contracts/:contractId', async (req, res) => {
  const { contractId } = req.params;
  // Include fields that can be updated, e.g., description, amount, date, vendorId
  const { description, contractAmount, estimatedCompletion, vendorId } = req.body;

  if (!description || contractAmount === undefined || contractAmount === null || !vendorId) {
    return res.status(400).json({ message: "Description, Contract Amount, and Vendor selection are required." });
  }
  const amount = parseFloat(contractAmount);
  if (isNaN(amount)) {
    return res.status(400).json({ message: "Invalid Contract Amount." });
  }


  try {
    const data = await loadData();

    // Verify vendorId exists
    if (!data.vendors.some(v => v.id === vendorId)) {
      return res.status(400).json({ message: "Selected vendorId does not exist." });
    }

    const contractIndex = data.contracts.findIndex(c => c.id === contractId);
    if (contractIndex === -1) {
      return res.status(404).json({ message: "Contract not found." });
    }

    // Update contract data
    const updatedContractData = {
      ...data.contracts[contractIndex], // Keep existing ID, payments, files etc.
      description,
      contractAmount: amount,
      estimatedCompletion: estimatedCompletion || null,
      vendorId, // Allow changing the vendor
    };
    data.contracts[contractIndex] = updatedContractData;

    await saveData(data);

    // --- Prepare response (populate vendor name like in GET) ---
    const finalVendor = data.vendors.find(v => v.id === vendorId);
    const { paidTotal, balanceOwed } = calculateContractTotals(updatedContractData); // Recalculate totals if amount changed
    res.json({
      ...updatedContractData,
      paidTotal,
      balanceOwed,
      vendorName: finalVendor ? finalVendor.companyName : 'Unknown Vendor',
    });

  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to update contract." });
  }
});

// PUT Update a Payment
app.put('/api/contracts/:contractId/payments/:paymentId', async (req, res) => {
  const { contractId, paymentId } = req.params;
  const { date, amount, method, notes } = req.body;

  if (!date || amount === undefined || amount === null) {
    return res.status(400).json({ message: "Payment Date and Amount are required." });
  }
  const paymentAmount = parseFloat(amount);
  if (isNaN(paymentAmount)) {
    return res.status(400).json({ message: "Invalid Payment Amount." });
  }

  try {
    const data = await loadData();
    const contractIndex = data.contracts.findIndex(c => c.id === contractId);
    if (contractIndex === -1) {
      return res.status(404).json({ message: "Contract not found." });
    }

    const contract = data.contracts[contractIndex];
    const paymentIndex = (contract.payments || []).findIndex(p => p.id === paymentId);
    if (paymentIndex === -1) {
      return res.status(404).json({ message: "Payment not found within this contract." });
    }

    // Update payment data
    const updatedPayment = {
      ...contract.payments[paymentIndex], // Keep existing ID
      date,
      amount: paymentAmount,
      method: method ?? contract.payments[paymentIndex].method,
      notes: notes ?? contract.payments[paymentIndex].notes,
    };
    contract.payments[paymentIndex] = updatedPayment;

    await saveData(data);
    res.json(updatedPayment); // Return the updated payment

  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to update payment." });
  }
});


// --- DELETE Endpoints ---
// DELETE a Vendor (with check for linked contracts)
app.delete('/api/vendors/:vendorId', async (req, res) => {
  const { vendorId } = req.params;
  try {
    const data = await loadData();

    // Check if any contract uses this vendor
    const isVendorUsed = data.contracts.some(c => c.vendorId === vendorId);
    if (isVendorUsed) {
      return res.status(409).json({ // 409 Conflict
        message: "Cannot delete vendor: It is associated with one or more contracts. Please reassign or delete those contracts first."
      });
    }

    const initialLength = data.vendors.length;
    data.vendors = data.vendors.filter(v => v.id !== vendorId);

    if (data.vendors.length === initialLength) {
      return res.status(404).json({ message: "Vendor not found." });
    }

    await saveData(data);
    res.status(204).send(); // 204 No Content indicates success with no response body

  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to delete vendor." });
  }
});

// DELETE a Contract
app.delete('/api/contracts/:contractId', async (req, res) => {
  const { contractId } = req.params;
  try {
    const data = await loadData();
    const contractToDelete = data.contracts.find(c => c.id === contractId); // Find before filtering

    if (!contractToDelete) {
      return res.status(404).json({ message: "Contract not found." });
    }

    // --- Optional: Delete associated files from disk ---
    if (contractToDelete.files && contractToDelete.files.length > 0) {
      console.log(`Deleting ${contractToDelete.files.length} files associated with contract ${contractId}`);
      // Use Promise.all to attempt all deletions
      await Promise.all(contractToDelete.files.map(async (file) => {
        if (file.filename) { // Check if filename exists
          const filePath = path.join(UPLOAD_FOLDER, file.filename);
          try {
            await fs.unlink(filePath);
            console.log(`Deleted file: ${filePath}`);
          } catch (unlinkError) {
            // Log error but continue trying to delete others and the contract record
            console.error(`Error deleting file ${filePath}:`, unlinkError.code === 'ENOENT' ? 'File not found' : unlinkError);
          }
        }
      }));
    }
    // --- End Optional File Deletion ---


    // Filter out the contract
    const initialLength = data.contracts.length;
    data.contracts = data.contracts.filter(c => c.id !== contractId);

    // Check if something was actually deleted (covers the case where find succeeded but filter somehow failed)
    if (data.contracts.length === initialLength && contractToDelete) {
      console.error("Error: Contract found but filter failed to remove it."); // Should not happen
      return res.status(500).json({ message: "Failed to delete contract record after finding it." });
    }


    await saveData(data);
    res.status(204).send();

  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to delete contract." });
  }
});

// DELETE a Payment
app.delete('/api/contracts/:contractId/payments/:paymentId', async (req, res) => {
  const { contractId, paymentId } = req.params;
  try {
    const data = await loadData();
    const contractIndex = data.contracts.findIndex(c => c.id === contractId);
    if (contractIndex === -1) {
      return res.status(404).json({ message: "Contract not found." });
    }

    const contract = data.contracts[contractIndex];
    if (!contract.payments) { // Handle case where payments array might be missing
      return res.status(404).json({ message: "Payment not found (no payments exist for this contract)." });
    }

    const initialLength = contract.payments.length;
    contract.payments = contract.payments.filter(p => p.id !== paymentId);

    if (contract.payments.length === initialLength) {
      return res.status(404).json({ message: "Payment not found within this contract." });
    }

    await saveData(data);
    res.status(204).send();

  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to delete payment." });
  }
});


// DELETE an Uploaded File (Requires file IDs)
// First, ensure files have IDs when uploaded in the POST /uploads endpoint
// Modify POST /uploads: newFile should include 'id': uuidv4()

app.delete('/api/contracts/:contractId/uploads/:fileId', async (req, res) => {
  const { contractId, fileId } = req.params;

  try {
    const data = await loadData();
    const contractIndex = data.contracts.findIndex(c => c.id === contractId);
    if (contractIndex === -1) {
      return res.status(404).json({ message: "Contract not found." });
    }
    const contract = data.contracts[contractIndex];
    if (!contract.files) {
      return res.status(404).json({ message: "File not found (no files exist for this contract)." });
    }

    const fileIndex = contract.files.findIndex(f => f.id === fileId);
    if (fileIndex === -1) {
      return res.status(404).json({ message: "File record not found for this contract." });
    }

    const fileToDelete = contract.files[fileIndex];
    const filename = fileToDelete.filename; // The unique name stored on disk

    // Remove file record from contract
    contract.files.splice(fileIndex, 1);

    // Save data first (more critical than deleting file)
    await saveData(data);

    // Now, attempt to delete the actual file from disk
    if (filename) {
      const filePath = path.join(UPLOAD_FOLDER, filename);
      try {
        await fs.unlink(filePath);
        console.log(`Deleted file from disk: ${filePath}`);
        res.status(204).send(); // Success
      } catch (unlinkError) {
        console.error(`Error deleting file ${filePath} from disk:`, unlinkError.code === 'ENOENT' ? 'File not found on disk' : unlinkError);
        // File record was deleted, but file wasn't. Still send success for the record deletion.
        // Maybe return a different status or message? For simplicity, 204 is okay.
        res.status(200).json({ message: "File record deleted, but failed to delete file from disk (may already be gone)." });
      }
    } else {
      console.warn(`File record ${fileId} deleted, but it had no associated filename.`);
      res.status(204).send(); // File record deleted successfully
    }

  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to delete file record." });
  }
});

// --- Global Error Handler (Optional but Recommended) ---
app.use((err, req, res, next) => {
  console.error(err.stack);
  // Handle multer errors specifically
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: `File upload error: ${err.message}` });
  } else if (err) {
    // Handle file filter errors or other errors
    return res.status(400).json({ message: err.message });
  }
  // Default error handler
  res.status(500).json({ message: 'Something went wrong on the server!' });
});


// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
