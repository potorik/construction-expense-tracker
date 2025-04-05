// frontend/src/components/AddTagForm.js
import React, { useState } from 'react';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import InputGroup from 'react-bootstrap/InputGroup'; // For color picker

function AddTagForm({ onAddTag, setError, setSuccess }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#cccccc'); // Default color

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!name.trim()) {
      setError("Tag name cannot be empty.");
      return;
    }
    try {
      await onAddTag({ name: name.trim(), color });
      setName(''); // Clear form
      setColor('#cccccc'); // Reset color
      setSuccess("Tag added!");
    } catch (error) {
      // Error set by App.js handler
      console.error("Add Tag Form Error:", error);
    }
  };

  return (
    <Form onSubmit={handleSubmit} className="mb-3">
      <Form.Group controlId="newTagName">
        <Form.Label>New Tag Name*</Form.Label>
        <InputGroup>
          <Form.Control
            type="color"
            id="newTagColorInput"
            title="Choose tag color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{ maxWidth: '40px', padding: '2px' }} // Basic style for color input
          />
          <Form.Control
            type="text"
            placeholder="Enter new tag name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Button variant="success" type="submit">Add Tag</Button>
        </InputGroup>
      </Form.Group>
    </Form>
  );
}
export default AddTagForm;
