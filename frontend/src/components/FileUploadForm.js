import React, { useState } from 'react';

function FileUploadForm({ contractId, onUploadFile, setError, setSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedFile) {
      setError("Please select a file to upload.");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    // Key 'file' must match upload.single('file') in backend server.js
    formData.append('file', selectedFile);

    try {
      await onUploadFile(contractId, formData);
      setSelectedFile(null); // Clear file input
      // Also reset the file input visually if possible (browser specific)
      e.target.reset();
      setSuccess("File uploaded successfully!");
    } catch (error) {
      setError(error.message || "Failed to upload file.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h6>Upload New Document</h6>
      <div className="form-row">
        <div>
          <label htmlFor={`file-upload-${contractId}`} className="visually-hidden">Select File</label>
          <input
            type="file"
            id={`file-upload-${contractId}`}
            onChange={handleFileChange}
            disabled={isUploading}
            required
          />
        </div>
        <button type="submit" disabled={isUploading || !selectedFile}>
          {isUploading ? 'Uploading...' : 'Upload File'}
        </button>
      </div>
      {/* Optional: Add allowed file types note */}
    </form>
  );
}

export default FileUploadForm;
