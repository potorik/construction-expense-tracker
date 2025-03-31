// frontend/src/constants.js

export const PAYMENT_METHODS = [
  'Check',
  'Credit Card',
  'Bank Transfer (ACH)',
  'Zelle',
  'Venmo',
  'Cash',
  'Other' // Always good to have an 'Other' option
];

export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';
