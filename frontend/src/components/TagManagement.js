// frontend/src/components/TagManagement.js
import React from 'react';
import AddTagForm from './AddTagForm';
import ListGroup from 'react-bootstrap/ListGroup'; // Use ListGroup for display
import Badge from 'react-bootstrap/Badge'; // Use Badge for tag display
import Button from 'react-bootstrap/Button';

function TagManagement({ tags, onAddTag, onDeleteTag, setError, setSuccess }) {

  const handleDeleteClick = (tagId, tagName) => {
    if (window.confirm(`Are you sure you want to delete the tag "${tagName}"? It will be removed from all contracts.`)) {
      onDeleteTag(tagId);
    }
  };

  return (
    <div>
      <h2>Tag Management</h2>
      <p>Create and manage tags to categorize your contracts.</p>
      <AddTagForm onAddTag={onAddTag} setError={setError} setSuccess={setSuccess} />

      <hr />
      <h3>Available Tags</h3>
      {(!tags || tags.length === 0) ? (
        <p>No tags created yet.</p>
      ) : (
        <ListGroup>
          {tags.map(tag => (
            <ListGroup.Item key={tag.id} className="d-flex justify-content-between align-items-center">
              <div>
                <span className={"badge rounded-pill"} style={{ backgroundColor: tag.color || '#cccccc', marginRight: '10px', color: '#333' }}>&nbsp;</span>
                {tag.name}
              </div>
              <Button variant="outline-danger" size="sm" onClick={() => handleDeleteClick(tag.id, tag.name)}>
                Delete
              </Button>
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}
    </div>
  );
}

export default TagManagement;
