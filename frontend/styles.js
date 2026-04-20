/**
 * styles.js
 *
 * STYLES - CSS-in-JS styles for the P2P video chat application
 *
 * This file contains all the styling objects used in the main component.
 * Separated for better organization and maintainability.
 */

export const styles = {
  // Main container
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    backgroundColor: '#f5f5f5',
    minHeight: '100vh'
  },

  // Header section
  header: {
    textAlign: 'center',
    marginBottom: '40px',
    backgroundColor: '#2196F3',
    color: 'white',
    padding: '30px',
    borderRadius: '8px'
  },
  subtitle: {
    fontSize: '16px',
    marginTop: '10px'
  },

  // Status and error messages
  status: {
    padding: '12px',
    marginBottom: '20px',
    backgroundColor: '#e3f2fd',
    border: '1px solid #2196F3',
    borderRadius: '4px',
    textAlign: 'center',
    fontWeight: 'bold'
  },
  error: {
    padding: '12px',
    marginBottom: '20px',
    backgroundColor: '#ffebee',
    border: '1px solid #f44336',
    borderRadius: '4px',
    color: '#c62828'
  },

  // Generic section styling
  section: {
    backgroundColor: 'white',
    padding: '20px',
    marginBottom: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },

  // Form elements
  form: {
    display: 'flex',
    gap: '10px',
    marginBottom: '15px'
  },
  input: {
    flex: 1,
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '16px'
  },
  button: {
    padding: '10px 20px',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px'
  },

  // Helper text
  hint: {
    fontSize: '14px',
    color: '#666',
    fontStyle: 'italic'
  },

  // Peer list and cards
  peerList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '10px'
  },
  peerCard: {
    padding: '15px',
    backgroundColor: '#f9f9f9',
    border: '1px solid #ddd',
    borderRadius: '4px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  peerButton: {
    padding: '8px 12px',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'inline-block'
  },

  // Incoming call notification
  incomingCallBox: {
    backgroundColor: '#fff3e0',
    border: '2px solid #ff9800',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
    textAlign: 'center'
  },
  incomingCallTitle: {
    fontSize: '20px',
    marginBottom: '15px',
    color: '#e65100'
  },
  incomingCallButtons: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center'
  },

  // Video call section
  videoSection: {
    backgroundColor: 'white',
    padding: '20px',
    marginBottom: '20px',
    borderRadius: '8px'
  },
  videoContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '15px',
    marginBottom: '20px'
  },
  videoBox: {
    backgroundColor: '#000',
    borderRadius: '4px',
    overflow: 'hidden',
    position: 'relative'
  },
  videoLabel: {
    position: 'absolute',
    top: '10px',
    left: '10px',
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: 'white',
    padding: '5px 10px',
    borderRadius: '4px',
    fontSize: '12px',
    zIndex: 1
  },
  video: {
    width: '100%',
    height: '300px',
    objectFit: 'cover'
  },
  callControls: {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px'
  },

  // Footer
  footer: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    marginTop: '30px'
  },
  steps: {
    backgroundColor: '#f9f9f9',
    padding: '15px 30px',
    borderRadius: '4px'
  }
};