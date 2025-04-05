// backend/server.js

// Load environment variables from .env file (for APP_PASSWORD)
// Make sure this is the very first line
// require('dotenv').config();

// Core Modules
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises; // Use promises version of fs
const { v4: uuidv4 } = require('uuid'); // For generating unique IDs
const multer = require('multer'); // For handling file uploads

// --- Configuration ---
const PORT = process.env.PORT || 5001;
const DATA_FILE = path.join(__dirname, 'data.json'); // Data stored in data.json
const UPLOAD_FOLDER = path.join(__dirname, 'uploads'); // Folder to store uploads
const APP_PASSWORD = process.env.APP_PASSWORD || 'myPass123!'; // Password loaded from .env file

// --- Basic Validation ---
if (!APP_PASSWORD) {
  console.error("\nFATAL ERROR: APP_PASSWORD environment variable is not set.");
  console.error("Please create a '.env' file in the 'backend' directory with APP_PASSWORD='your_password'\n");
  process.exit(1); // Exit if password isn't configured
}

// --- Initialize Express App ---
const app = express();

// --- Core Middleware ---

// CORS Configuration (Allow specific frontend origin or all for development)
const allowedOrigins = [
  'http://localhost:3000', // Local React dev server
  process.env.FRONTEND_URL // Your deployed frontend URL (set as env var)
].filter(Boolean); // Filter out undefined/empty values

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like curl, mobile apps) or from allowed origins
    // In development, you might temporarily use: callback(null, true) to allow all
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked for origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS", // Allow standard methods
  allowedHeaders: "Content-Type, Authorization", // Allow necessary headers
  optionsSuccessStatus: 204 // Return 204 for preflight OPTIONS requests
}));

// Body Parsers
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// --- Serve Uploaded Files Statically ---
// Allows accessing uploaded files via /uploads/filename URL path
app.use('/uploads', express.static(UPLOAD_FOLDER));

// --- Multer Configuration for File Uploads ---
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fs.mkdir(UPLOAD_FOLDER, { recursive: true }); // Ensure upload folder exists
      cb(null, UPLOAD_FOLDER);
    } catch (err) {
      console.error("Multer destination error:", err);
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = uuidv4();
    const extension = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${extension}`); // Unique filename
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt/;
  const mimetype = allowedTypes.test(file.mimetype);
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  if (mimetype && extname) {
    return cb(null, true);
  }
  // Pass an error if file type is invalid
  cb(new Error('File type not allowed. Allowed: jpeg, jpg, png, gif, pdf, doc, docx, xls, xlsx, txt'));
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
  fileFilter: fileFilter
});

// --- Helper Functions ---
const loadData = async () => {
  try {
    // Check if file exists first
    try {
      await fs.access(DATA_FILE);
    } catch (accessError) {
      if (accessError.code === 'ENOENT') {
        console.log(`${DATA_FILE} not found, initializing with empty structure.`);
        return { last_updated: null, vendors: [], contracts: [], tags: [] };
      }
      throw accessError; // Re-throw other access errors
    }
    // File exists, read it
    const data = await fs.readFile(DATA_FILE, 'utf8');
    // Handle empty file case
    if (!data) {
      console.log(`${DATA_FILE} is empty, initializing with empty structure.`);
      return { last_updated: null, vendors: [], contracts: [], tags: [] };
    }
    // Parse JSON
    const parsedData = JSON.parse(data);
    return {
      last_updated: parsedData.last_updated || null,
      vendors: parsedData.vendors || [],
      contracts: parsedData.contracts || [],
      tags: parsedData.tags || []
    };
  } catch (error) {
    // Handle JSON parsing errors specifically
    if (error instanceof SyntaxError) {
      console.error(`Error parsing ${DATA_FILE}:`, error);
      throw new Error(`Could not parse data file. Check for invalid JSON formatting in ${DATA_FILE}.`);
    }
    console.error("Error reading data file:", error);
    throw new Error("Could not load data.");
  }
};

const saveData = async (data) => {
  try {
    const dataToSave = {
      last_updated: new Date().toISOString(), // Update timestamp on every save
      vendors: data.vendors || [],
      contracts: data.contracts || [],
      tags: data.tags || []
    };
    // Write atomically using a temporary file (safer)
    const tempFile = DATA_FILE + '.tmp';
    await fs.writeFile(tempFile, JSON.stringify(dataToSave, null, 4), 'utf8');
    await fs.rename(tempFile, DATA_FILE); // Atomic rename replaces the old file

    console.log(`Data saved. Last updated: ${dataToSave.last_updated}`);
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

// --- Authentication Middleware ---
const authenticateRequest = (req, res, next) => {
  // Allow OPTIONS requests for CORS preflight immediately
  if (req.method === 'OPTIONS') { return next(); }

  const authHeader = req.headers.authorization;
  let providedPassword = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    providedPassword = authHeader.substring(7); // Extract token/password after 'Bearer '
  }

  // Simple comparison
  if (providedPassword === APP_PASSWORD) {
    next(); // Authenticated, proceed to the route handler
  } else {
    console.warn('Authentication failed: Invalid or missing token/password.');
    // Send 401 Unauthorized status
    res.status(401).json({ message: 'Unauthorized: Access denied.' });
  }
};

// --- PUBLIC Routes (Before Auth Middleware) ---

// Login Endpoint
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ message: 'Password is required.' });
  }
  if (password === APP_PASSWORD) {
    res.status(200).json({ success: true, message: 'Login successful' });
  } else {
    res.status(401).json({ message: 'Invalid password' });
  }
});

// --- Apply Authentication Middleware to Protected API Routes ---
// All routes defined AFTER this point will require authentication
app.use('/api/contracts', authenticateRequest);
app.use('/api/vendors', authenticateRequest);
app.use('/api/tags', authenticateRequest);
app.use('/api/reports', authenticateRequest);

// --- PROTECTED API Routes ---

// == Vendor Routes ==
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

app.post('/api/vendors', async (req, res) => {
  try {
    const { companyName, contactName, phone, email, address } = req.body;
    if (!companyName?.trim()) return res.status(400).json({ message: "Company Name is required." });

    const data = await loadData();
    const newVendor = {
      id: uuidv4(),
      companyName: companyName.trim(),
      contactName: contactName?.trim() || '',
      phone: phone?.trim() || '',
      email: email?.trim() || '',
      address: address?.trim() || ''
    };
    data.vendors.push(newVendor);
    await saveData(data);
    res.status(201).json(newVendor);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to add vendor." });
  }
});

app.put('/api/vendors/:vendorId', async (req, res) => {
  const { vendorId } = req.params;
  const { companyName, contactName, phone, email, address } = req.body;
  if (!companyName?.trim()) return res.status(400).json({ message: "Company Name cannot be empty." });

  try {
    const data = await loadData();
    const vendorIndex = data.vendors.findIndex(v => v.id === vendorId);
    if (vendorIndex === -1) return res.status(404).json({ message: "Vendor not found." });

    const updatedVendor = {
      ...data.vendors[vendorIndex],
      companyName: companyName.trim(),
      contactName: contactName?.trim() ?? data.vendors[vendorIndex].contactName,
      phone: phone?.trim() ?? data.vendors[vendorIndex].phone,
      email: email?.trim() ?? data.vendors[vendorIndex].email,
      address: address?.trim() ?? data.vendors[vendorIndex].address,
    };
    data.vendors[vendorIndex] = updatedVendor;
    await saveData(data);
    res.json(updatedVendor);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to update vendor." });
  }
});

app.delete('/api/vendors/:vendorId', async (req, res) => {
  const { vendorId } = req.params;
  try {
    const data = await loadData();
    const isVendorUsed = data.contracts.some(c => c.vendorId === vendorId);
    if (isVendorUsed) {
      return res.status(409).json({ message: "Cannot delete vendor: Used in contracts." });
    }
    const initialLength = data.vendors.length;
    data.vendors = data.vendors.filter(v => v.id !== vendorId);
    if (data.vendors.length === initialLength) return res.status(404).json({ message: "Vendor not found." });
    await saveData(data);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to delete vendor." });
  }
});

// == Tag Routes ==
app.get('/api/tags', async (req, res) => {
  try {
    const { tags } = await loadData();
    res.json(tags.sort((a, b) => a.name.localeCompare(b.name))); // Sort tags alphabetically
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to fetch tags." });
  }
});

app.post('/api/tags', async (req, res) => {
  try {
    const { name, color } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Tag name is required." });

    const data = await loadData();
    const nameLower = name.toLowerCase().trim();
    if (data.tags.some(tag => tag.name.toLowerCase().trim() === nameLower)) {
      return res.status(409).json({ message: `Tag "${name.trim()}" already exists.` });
    }
    const newTag = { id: uuidv4(), name: name.trim(), color: color || '#cccccc' };
    data.tags.push(newTag);
    await saveData(data);
    res.status(201).json(newTag);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to add tag." });
  }
});

app.delete('/api/tags/:tagId', async (req, res) => {
  const { tagId } = req.params;
  try {
    const data = await loadData();
    const initialTagLength = data.tags.length;
    data.tags = data.tags.filter(tag => tag.id !== tagId);
    if (data.tags.length === initialTagLength) return res.status(404).json({ message: "Tag not found." });

    data.contracts.forEach(contract => {
      if (contract.tagIds && Array.isArray(contract.tagIds)) {
        contract.tagIds = contract.tagIds.filter(id => id !== tagId);
      }
    });
    await saveData(data);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to delete tag." });
  }
});

// == Contract Routes ==
app.get('/api/contracts', async (req, res) => {
  try {
    const { vendors, contracts, tags } = await loadData();
    const vendorMap = new Map(vendors.map(v => [v.id, v]));
    const tagMap = new Map(tags.map(t => [t.id, t]));

    const contractsWithDetails = contracts.map(contract => {
      const { paidTotal, balanceOwed } = calculateContractTotals(contract);
      const vendor = vendorMap.get(contract.vendorId);
      const populatedTags = (contract.tagIds || []).map(tagId => tagMap.get(tagId)).filter(Boolean);
      return {
        ...contract, // Includes original fields like id, description, amount, tagIds etc.
        paidTotal,
        balanceOwed,
        vendorName: vendor ? vendor.companyName : 'Unknown Vendor',
        tags: populatedTags // Populated tag objects
      };
    }).sort((a, b) => (a.vendorName || '').localeCompare(b.vendorName || '')); // Sort by vendor name

    res.json(contractsWithDetails);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to fetch contracts." });
  }
});

app.post('/api/contracts', async (req, res) => {
  let newVendorCreated = null;
  try {
    const { vendorId, newVendor, description, contractAmount, estimatedCompletion, tagIds } = req.body;
    let actualVendorId = vendorId;
    const data = await loadData();

    // Validation
    if (!description?.trim() || contractAmount === undefined || contractAmount === null) return res.status(400).json({ message: "Description and Contract Amount required." });
    if (!vendorId && !newVendor?.companyName?.trim()) return res.status(400).json({ message: "Vendor selection or New Vendor Name required." });
    const amount = parseFloat(contractAmount);
    if (isNaN(amount) || amount < 0) return res.status(400).json({ message: "Invalid Contract Amount." });

    const validTagIds = [];
    if (tagIds && Array.isArray(tagIds)) {
      const availableTagIds = new Set(data.tags.map(t => t.id));
      tagIds.forEach(id => { if (availableTagIds.has(id)) validTagIds.push(id); });
    }

    // Handle Vendor
    if (!vendorId && newVendor?.companyName?.trim()) {
      const createdVendor = { id: uuidv4(), companyName: newVendor.companyName.trim(), contactName: newVendor.contactName?.trim() || '', phone: newVendor.phone?.trim() || '', email: newVendor.email?.trim() || '', address: newVendor.address?.trim() || '' };
      data.vendors.push(createdVendor);
      actualVendorId = createdVendor.id;
      newVendorCreated = createdVendor;
    } else if (vendorId) {
      if (!data.vendors.some(v => v.id === vendorId)) return res.status(400).json({ message: "Selected vendorId does not exist." });
      actualVendorId = vendorId;
    }
    if (!actualVendorId) return res.status(400).json({ message: "Vendor information missing or invalid." });

    // Create Contract
    const newContract = {
      id: uuidv4(), vendorId: actualVendorId, description: description.trim(),
      contractAmount: amount, estimatedCompletion: estimatedCompletion || null,
      tagIds: validTagIds, payments: [], files: []
    };
    data.contracts.push(newContract);
    await saveData(data);

    // Prepare response
    const finalVendor = data.vendors.find(v => v.id === actualVendorId);
    const tagMap = new Map(data.tags.map(t => [t.id, t]));
    const populatedTags = validTagIds.map(id => tagMap.get(id)).filter(Boolean);
    const { paidTotal, balanceOwed } = calculateContractTotals(newContract);

    res.status(201).json({
      ...newContract, paidTotal, balanceOwed,
      vendorName: finalVendor ? finalVendor.companyName : 'Unknown Vendor',
      tags: populatedTags,
      ...(newVendorCreated && { createdVendor: newVendorCreated })
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to add contract." });
  }
});

app.put('/api/contracts/:contractId', async (req, res) => {
  const { contractId } = req.params;
  const { description, contractAmount, estimatedCompletion, vendorId, tagIds } = req.body;

  // Validation
  if (!description?.trim() || contractAmount === undefined || contractAmount === null || !vendorId) return res.status(400).json({ message: "Description, Contract Amount, Vendor required." });
  const amount = parseFloat(contractAmount);
  if (isNaN(amount) || amount < 0) return res.status(400).json({ message: "Invalid Contract Amount." });

  try {
    const data = await loadData();
    if (!data.vendors.some(v => v.id === vendorId)) return res.status(400).json({ message: "Selected vendorId does not exist." });
    const contractIndex = data.contracts.findIndex(c => c.id === contractId);
    if (contractIndex === -1) return res.status(404).json({ message: "Contract not found." });

    const validTagIds = [];
    if (tagIds && Array.isArray(tagIds)) {
      const availableTagIds = new Set(data.tags.map(t => t.id));
      tagIds.forEach(id => { if (availableTagIds.has(id)) validTagIds.push(id); });
    } else if (tagIds !== undefined) { // Allow clearing tags by passing empty array, but error on other invalid types
      return res.status(400).json({ message: "Invalid format for tagIds. Expected an array." });
    }
    // If tagIds is undefined in request body, we keep the existing ones (by spreading below)
    // If tagIds is present (even empty array), we overwrite with validTagIds

    // Update contract data
    const updatedContractData = {
      ...data.contracts[contractIndex],
      description: description.trim(),
      contractAmount: amount,
      estimatedCompletion: estimatedCompletion || null,
      vendorId,
      // Only update tagIds if the key was present in the request body
      ...(tagIds !== undefined && { tagIds: validTagIds }),
    };
    data.contracts[contractIndex] = updatedContractData;
    await saveData(data);

    // Prepare response
    const finalVendor = data.vendors.find(v => v.id === vendorId);
    const tagMap = new Map(data.tags.map(t => [t.id, t]));
    const currentTagIds = updatedContractData.tagIds || []; // Use updated IDs
    const populatedTags = currentTagIds.map(id => tagMap.get(id)).filter(Boolean);
    const { paidTotal, balanceOwed } = calculateContractTotals(updatedContractData);

    res.json({
      ...updatedContractData, paidTotal, balanceOwed,
      vendorName: finalVendor ? finalVendor.companyName : 'Unknown Vendor',
      tags: populatedTags
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to update contract." });
  }
});

app.delete('/api/contracts/:contractId', async (req, res) => {
  const { contractId } = req.params;
  try {
    const data = await loadData();
    const contractToDelete = data.contracts.find(c => c.id === contractId);
    if (!contractToDelete) return res.status(404).json({ message: "Contract not found." });

    // Delete associated files from disk
    if (contractToDelete.files && contractToDelete.files.length > 0) {
      console.log(`Deleting ${contractToDelete.files.length} files for contract ${contractId}`);
      await Promise.allSettled(contractToDelete.files.map(async (file) => { // Use allSettled
        if (file.filename) {
          const filePath = path.join(UPLOAD_FOLDER, file.filename);
          try { await fs.unlink(filePath); console.log(`Deleted file: ${filePath}`); }
          catch (unlinkError) { console.error(`Error deleting file ${filePath}:`, unlinkError.code === 'ENOENT' ? 'Not Found' : unlinkError); }
        }
      }));
    }

    // Filter out the contract
    const initialLength = data.contracts.length;
    data.contracts = data.contracts.filter(c => c.id !== contractId);
    if (data.contracts.length === initialLength) throw new Error("Filter failed after finding contract."); // Should not happen

    await saveData(data);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to delete contract." });
  }
});

// == Payment Routes ==
app.post('/api/contracts/:contractId/payments', async (req, res) => {
  const { contractId } = req.params;
  const { date, amount, method, notes } = req.body;
  if (!date || amount === undefined || amount === null) return res.status(400).json({ message: "Payment Date and Amount required." });
  const paymentAmount = parseFloat(amount);
  if (isNaN(paymentAmount) || paymentAmount <= 0) return res.status(400).json({ message: "Invalid Payment Amount." });

  try {
    const data = await loadData();
    const contractIndex = data.contracts.findIndex(c => c.id === contractId);
    if (contractIndex === -1) return res.status(404).json({ message: "Contract not found." });

    const newPayment = { id: uuidv4(), date, amount: paymentAmount, method: method || '', notes: notes?.trim() || '' };
    if (!data.contracts[contractIndex].payments) data.contracts[contractIndex].payments = [];
    data.contracts[contractIndex].payments.push(newPayment);
    await saveData(data);
    res.status(201).json(newPayment);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to add payment." });
  }
});

app.put('/api/contracts/:contractId/payments/:paymentId', async (req, res) => {
  const { contractId, paymentId } = req.params;
  const { date, amount, method, notes } = req.body;
  if (!date || amount === undefined || amount === null) return res.status(400).json({ message: "Payment Date and Amount required." });
  const paymentAmount = parseFloat(amount);
  if (isNaN(paymentAmount) || paymentAmount <= 0) return res.status(400).json({ message: "Invalid Payment Amount." });

  try {
    const data = await loadData();
    const contractIndex = data.contracts.findIndex(c => c.id === contractId);
    if (contractIndex === -1) return res.status(404).json({ message: "Contract not found." });
    const contract = data.contracts[contractIndex];
    if (!contract.payments) return res.status(404).json({ message: "Payment not found." });
    const paymentIndex = contract.payments.findIndex(p => p.id === paymentId);
    if (paymentIndex === -1) return res.status(404).json({ message: "Payment not found." });

    const updatedPayment = {
      ...contract.payments[paymentIndex], date, amount: paymentAmount,
      method: method ?? contract.payments[paymentIndex].method,
      notes: notes?.trim() ?? contract.payments[paymentIndex].notes,
    };
    contract.payments[paymentIndex] = updatedPayment;
    await saveData(data);
    res.json(updatedPayment);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to update payment." });
  }
});

app.delete('/api/contracts/:contractId/payments/:paymentId', async (req, res) => {
  const { contractId, paymentId } = req.params;
  try {
    const data = await loadData();
    const contractIndex = data.contracts.findIndex(c => c.id === contractId);
    if (contractIndex === -1) return res.status(404).json({ message: "Contract not found." });
    const contract = data.contracts[contractIndex];
    if (!contract.payments) return res.status(404).json({ message: "Payment not found." });
    const initialLength = contract.payments.length;
    contract.payments = contract.payments.filter(p => p.id !== paymentId);
    if (contract.payments.length === initialLength) return res.status(404).json({ message: "Payment not found." });
    await saveData(data);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to delete payment." });
  }
});

// == File Upload/Delete Routes ==
app.post('/api/contracts/:contractId/uploads', upload.single('file'), async (req, res) => {
  const { contractId } = req.params;
  if (!req.file) return res.status(400).json({ message: "No file uploaded or file rejected." });

  try {
    const data = await loadData();
    const contractIndex = data.contracts.findIndex(c => c.id === contractId);
    if (contractIndex === -1) {
      await fs.unlink(req.file.path).catch(err => console.error("Error deleting orphaned file:", err)); // Cleanup uploaded file
      return res.status(404).json({ message: "Contract not found." });
    }
    const newFile = { id: uuidv4(), filename: req.file.filename, originalFilename: req.file.originalname };
    if (!data.contracts[contractIndex].files) data.contracts[contractIndex].files = [];
    data.contracts[contractIndex].files.push(newFile);
    await saveData(data);
    res.status(201).json(newFile);
  } catch (error) {
    // Attempt cleanup if save fails after upload
    await fs.unlink(req.file.path).catch(err => console.error("Error deleting file after save failure:", err));
    res.status(500).json({ message: error.message || "Failed to process file upload." });
  }
});

app.delete('/api/contracts/:contractId/uploads/:fileId', async (req, res) => {
  const { contractId, fileId } = req.params;
  try {
    const data = await loadData();
    const contractIndex = data.contracts.findIndex(c => c.id === contractId);
    if (contractIndex === -1) return res.status(404).json({ message: "Contract not found." });
    const contract = data.contracts[contractIndex];
    if (!contract.files) return res.status(404).json({ message: "File not found." });
    const fileIndex = contract.files.findIndex(f => f.id === fileId);
    if (fileIndex === -1) return res.status(404).json({ message: "File record not found." });

    const fileToDelete = contract.files[fileIndex];
    const filename = fileToDelete.filename;
    contract.files.splice(fileIndex, 1); // Remove record from array
    await saveData(data); // Save the data first

    // Attempt to delete file from disk
    let fileDeletedFromDisk = false;
    if (filename) {
      const filePath = path.join(UPLOAD_FOLDER, filename);
      try {
        await fs.unlink(filePath);
        console.log(`Deleted file from disk: ${filePath}`);
        fileDeletedFromDisk = true;
      } catch (unlinkError) {
        console.error(`Error deleting file ${filePath} from disk:`, unlinkError.code === 'ENOENT' ? 'Not Found' : unlinkError);
      }
    }
    // Respond based on outcome
    if (fileDeletedFromDisk || !filename) {
      res.status(204).send(); // Record deleted, file deleted or didn't exist
    } else {
      res.status(200).json({ message: "File record deleted, but failed to delete file from disk." }); // Record deleted, file remains
    }
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to delete file record." });
  }
});

// == Reporting Routes ==
app.get('/api/reports/spending-by-vendor', async (req, res) => {
  try {
    const { vendors, contracts } = await loadData();
    const vendorMap = new Map(vendors.map(v => [v.id, v.companyName]));
    let totalContracted = 0, totalSpent = 0;
    const spendingByVendorId = {};

    contracts.forEach(contract => {
      const contractAmount = parseFloat(contract.contractAmount) || 0;
      totalContracted += contractAmount;
      let paidForThisContract = 0;
      (contract.payments || []).forEach(payment => { paidForThisContract += (parseFloat(payment.amount) || 0); });
      totalSpent += paidForThisContract;
      if (contract.vendorId && paidForThisContract > 0) {
        spendingByVendorId[contract.vendorId] = (spendingByVendorId[contract.vendorId] || 0) + paidForThisContract;
      }
    });

    const reportResult = { labels: [], data: [], csvData: [], summary: { totalContracted, totalSpent } };
    for (const vendorId in spendingByVendorId) {
      const vendorName = vendorMap.get(vendorId) || `Unknown Vendor (${vendorId.substring(0,6)}...)`;
      const vendorTotalSpent = spendingByVendorId[vendorId];
      reportResult.labels.push(vendorName);
      reportResult.data.push(vendorTotalSpent);
      reportResult.csvData.push({ vendorName, totalSpent: vendorTotalSpent });
    }
    res.json(reportResult);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to generate vendor spending report." });
  }
});

app.get('/api/reports/spending-by-tag', async (req, res) => {
  try {
    const { contracts, tags } = await loadData();
    const tagMap = new Map(tags.map(t => [t.id, { name: t.name, color: t.color }]));
    const spendingByTag = {};
    let untaggedSpending = 0;

    contracts.forEach(contract => {
      const paidForThisContract = (contract.payments || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      if (paidForThisContract <= 0) return;
      const contractTagIds = contract.tagIds || [];
      if (contractTagIds.length === 0) {
        untaggedSpending += paidForThisContract;
      } else {
        // Attribute FULL amount to EACH tag
        contractTagIds.forEach(tagId => {
          if (tagMap.has(tagId)) spendingByTag[tagId] = (spendingByTag[tagId] || 0) + paidForThisContract;
        });
      }
    });

    const reportData = { labels: [], data: [], colors: [], csvData: [] };
    for (const tagId in spendingByTag) {
      const tagInfo = tagMap.get(tagId);
      if (tagInfo) {
        const totalSpent = spendingByTag[tagId];
        reportData.labels.push(tagInfo.name);
        reportData.data.push(totalSpent);
        reportData.colors.push(tagInfo.color || '#cccccc');
        reportData.csvData.push({ tagName: tagInfo.name, totalSpent: totalSpent });
      }
    }
    if (untaggedSpending > 0) {
      reportData.labels.push("Untagged");
      reportData.data.push(untaggedSpending);
      reportData.colors.push('#868e96');
      reportData.csvData.push({ tagName: "Untagged", totalSpent: untaggedSpending });
    }
    res.json(reportData);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to generate tag spending report." });
  }
});


// --- Global Error Handler ---
// Catches errors passed via next(err) and some unhandled synchronous errors
app.use((err, req, res, next) => {
  console.error("Global Error Handler Caught:", err.stack || err);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: `File Upload Error: ${err.message}` });
  } else if (err.message && err.message.startsWith('File type not allowed')) {
    return res.status(400).json({ message: err.message });
  } else if (err) {
    return res.status(err.status || 500).json({ message: err.message || 'An internal server error occurred.' });
  }
  // Fallback if no specific error identified
  res.status(500).json({ message: 'Something went wrong on the server!' });
});


// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  // Ensure uploads directory exists on startup
  fs.mkdir(UPLOAD_FOLDER, { recursive: true }).catch(err => {
    if (err.code !== 'EEXIST') { // Ignore error if directory already exists
      console.error("Could not create upload directory on startup:", err);
    }
  });
  // Check if data file exists, create empty if not
  loadData().then(initialData => {
    if (initialData.last_updated === null && initialData.vendors.length === 0 && initialData.contracts.length === 0 && initialData.tags.length === 0) {
      console.log("Initialising empty data file structure.");
      return saveData({ vendors: [], contracts: [], tags: [] }); // Save initial structure with timestamp
    }
  }).catch(err => {
    console.error("Error during initial data file check/creation:", err);
  });
});

