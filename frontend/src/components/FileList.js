// frontend/src/components/FileList.js
import React from 'react';
import { API_BASE_URL } from '../constants';

// Accept contractId and handler as props
function FileList({ contractId, files, handleDeleteFile }) {

  const onDeleteClick = (fileId, originalFilename) => {
    if (window.confirm(`Are you sure you want to delete the file "${originalFilename}"? This cannot be undone.`)) {
      handleDeleteFile(contractId, fileId); // Use passed-in contractId
    }
  };

  if (!files || files.length === 0) {
    return <p>No documents uploaded yet.</p>;
  }

  return (
    <ul className="file-list">
      {files.map((file) => (
        <li key={file.id} className="file-list-item"> {/* Added class for styling */}
          <a href={`${API_BASE_URL}/uploads/${file.filename}`} target="_blank" rel="noopener noreferrer" className="file-link">
            {file.originalFilename}
          </a>
          <button
            onClick={() => onDeleteClick(file.id, file.originalFilename)}
            className="btn-delete btn-small btn-file-delete" // Specific class for file delete btn
            title="Delete File"
          >
            Delete
          </button>
        </li>
      ))}
    </ul>
  );
}

export default FileList;
