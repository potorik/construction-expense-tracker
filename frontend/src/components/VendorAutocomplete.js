import React, { useState, useEffect, useRef } from 'react';
import styles from './VendorAutocomplete.module.css'; // Optional: for styling

function VendorAutocomplete({ vendors, onVendorSelect, onAddNewVendorRequest, existingVendorId }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [matchingVendors, setMatchingVendors] = useState([]);
  const [isListVisible, setIsListVisible] = useState(false);
  const [selectedVendorName, setSelectedVendorName] = useState('');
  const wrapperRef = useRef(null); // To detect clicks outside

  // If an existing vendor ID is provided (e.g., when editing), find and display its name
  useEffect(() => {
    if (existingVendorId && vendors.length > 0) {
      const existing = vendors.find(v => v.id === existingVendorId);
      if (existing) {
        setSelectedVendorName(existing.companyName);
        setSearchTerm(existing.companyName); // Pre-fill search term
        setIsListVisible(false);
      }
    }
  }, [existingVendorId, vendors]); // Re-run if ID or vendors list changes


  useEffect(() => {
    if (searchTerm) {
      const filtered = vendors.filter(vendor =>
        vendor.companyName.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setMatchingVendors(filtered);
      setIsListVisible(true);
    } else {
      setMatchingVendors([]);
      setIsListVisible(false);
      // If search term is cleared, deselect vendor unless a name was already set via existingVendorId
      if (!existingVendorId) {
        setSelectedVendorName('');
      }
    }
  }, [searchTerm, vendors, existingVendorId]);

  // Close dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsListVisible(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);


  const handleSelect = (vendor) => {
    setSearchTerm(vendor.companyName);
    setSelectedVendorName(vendor.companyName);
    onVendorSelect(vendor.id); // Pass the ID up
    setIsListVisible(false);
    setMatchingVendors([]);
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    // If user starts typing again, clear the selected ID
    onVendorSelect(null);
    setSelectedVendorName(''); // Clear displayed name if typing differs
  };

  const handleAddNew = () => {
    onAddNewVendorRequest(searchTerm); // Pass the current search term as the potential new name
    setIsListVisible(false); // Close list after requesting add
  };

  const showAddNewButton = searchTerm && matchingVendors.length === 0 && !selectedVendorName;

  return (
    <div ref={wrapperRef} className={styles.autocompleteWrapper}> {/* Use optional CSS module */}
      <input
        type="text"
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={() => setIsListVisible(searchTerm && matchingVendors.length > 0)} // Show list on focus if results exist
        placeholder="Search or Type New Vendor..."
        aria-autocomplete="list"
        aria-controls="vendor-list"
      />
      {isListVisible && matchingVendors.length > 0 && (
        <ul id="vendor-list" className={styles.autocompleteList}>
          {matchingVendors.map(vendor => (
            <li key={vendor.id} onClick={() => handleSelect(vendor)} className={styles.autocompleteItem}>
              {vendor.companyName}
            </li>
          ))}
        </ul>
      )}
      {isListVisible && showAddNewButton && (
        <button type="button" onClick={handleAddNew} className={styles.addNewButton}>
          Add "{searchTerm}" as New Vendor
        </button>
      )}
    </div>
  );
}

// Optional: Create VendorAutocomplete.module.css for basic styling
/*
*/


export default VendorAutocomplete;
