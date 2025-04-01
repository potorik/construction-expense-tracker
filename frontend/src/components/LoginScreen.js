// frontend/src/components/LoginScreen.js
import React, { useState } from 'react';
import Form from 'react-bootstrap/Form'; // Using react-bootstrap example
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert'; // For errors

function LoginScreen({ onLogin, error }) {
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError(''); // Clear previous local errors
    if (!password) {
      setLocalError('Password cannot be empty.');
      return;
    }
    onLogin(password); // Pass password up to App.js handler
  };

  return (
    <div className="login-container" style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '5px', backgroundColor: '#f9f9f9' }}>
      <h2>Login Required</h2>
      <p>Please enter the password to access the application.</p>
      {/* Display global error passed from App.js (e.g., from previous failed API calls) */}
      {error && <Alert variant="danger">{error}</Alert>}
      {/* Display local form errors */}
      {localError && <Alert variant="warning">{localError}</Alert>}
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3" controlId="loginPassword">
          <Form.Label>Password</Form.Label>
          <Form.Control
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            required
            autoFocus
          />
        </Form.Group>
        <Button variant="primary" type="submit" className="w-100"> {/* Full width button */}
          Login
        </Button>
      </Form>
    </div>
  );
}

export default LoginScreen;
