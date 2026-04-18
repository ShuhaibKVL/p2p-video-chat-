'use client'; // Mark this as a client component

/**
 * pages/index.js
 * 
 * MAIN PAGE - Next.js React Component
 * 
 * This is the main user interface for the P2P video chat application.
 */

import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';

// Module-level variables to store call-flow functions
let callFlowModule = null;
let callState = null;

// Load call-flow module dynamically
async function initializeCallFlow() {
  if (!callFlowModule) {
    callFlowModule = await import('../public/js/call-flow.js');
    callState = callFlowModule.callState;
  }
  return callFlowModule;
}

export default function Home() {
  const [usernameInput, setUsernameInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [currentUsername, setCurrentUsername] = useState('');
  const [availablePeers, setAvailablePeers] = useState([]);
  const [selectedPeer, setSelectedPeer] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [isInCall, setIsInCall] = useState(false);
  const [callingPeerId, setCallingPeerId] = useState(null);  // Track which peer is being called
  const [callPeerName, setCallPeerName] = useState('');
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Initializing...');
  const initRef = useRef(false);

  // Update UI from call-flow.js state
  function updateUI() {
    if (!callState) return;
    setConnected(callState.connected);
    setCurrentUsername(callState.username || '');
    setAvailablePeers([...(callState.availablePeers || [])]);
    setIncomingCall(callState.incomingCallData);
    setIsInCall(callState.isInCall);
    setCallingPeerId(callState.callingPeerId);  // Update calling peer tracking
    setCallPeerName(callState.currentPeerUsername || '');
    setHasRemoteStream(!!callState.peerConnection?.remoteDescription);
  }

  // Display remote stream
  function displayRemoteStream(remoteStream) {
    const remoteVideoElement = document.getElementById('remoteVideo');
    if (remoteVideoElement) {
      remoteVideoElement.srcObject = remoteStream;
      remoteVideoElement.play().catch(() => {});
    }
    setHasRemoteStream(true);
  }

  // Initialize on mount
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const init = async () => {
      try {
        const { initializeApp } = await initializeCallFlow();
        
        // Set up UI callbacks
        window.updateUI = updateUI;
        window.displayRemoteStream = displayRemoteStream;
        
        // Initialize the app
        await initializeApp();
        setStatus('Ready to register');
      } catch (err) {
        console.error('Init error:', err);
        setError('Failed to initialize: ' + err.message);
        setStatus('Initialization failed');
      }
    };

    init();

    return () => {
      if (callFlowModule?.cleanup) {
        callFlowModule.cleanup();
      }
    };
  }, []);

  // Register
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setStatus('Registering...');
      const { handleRegisterPeer } = await initializeCallFlow();
      await handleRegisterPeer(usernameInput);
      setStatus('Registered! Waiting for peers...');
    } catch (err) {
      setError(err.message);
      setStatus('Registration failed');
    }
  };

  // Call peer
  const handleCall = async (peer) => {
    setError('');
    try {
      setStatus('Requesting call...');
      const { handleRequestCall } = await initializeCallFlow();
      await handleRequestCall(peer.username, peer.socketId);
      setSelectedPeer(peer);
      setStatus(`Calling ${peer.username}...`);
    } catch (err) {
      setError(err.message);
      setStatus('Call request failed');
    }
  };

  // Accept call
  const handleAccept = async () => {
    if (!incomingCall) return;
    setError('');
    try {
      setStatus('Accepting call...');
      const { handleAcceptCall } = await initializeCallFlow();
      await handleAcceptCall(incomingCall.fromSocketId, incomingCall.fromUsername);
    } catch (err) {
      setError(err.message);
      setStatus('Failed to accept call');
    }
  };

  // Decline call
  const handleDecline = async () => {
    if (!incomingCall) return;
    try {
      const { handleDeclineCall } = await initializeCallFlow();
      handleDeclineCall(incomingCall.fromSocketId);
      setIncomingCall(null);
      setStatus('Call declined');
    } catch (err) {
      console.error(err);
    }
  };

  // End call
  const handleEndCallClick = async () => {
    try {
      setStatus('Ending call...');
      const { handleEndCall } = await initializeCallFlow();
      handleEndCall();
      setSelectedPeer(null);
      setHasRemoteStream(false);
      setStatus('Call ended');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <Head>
        {/* <title>P2P Video Chat - WebRTC + Socket.io</title>
        <meta name="description" content="Peer-to-peer video chat" /> */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main style={styles.container}>
        <header style={styles.header}>
          <h1>🎥 P2P Video Chat</h1>
          <p style={styles.subtitle}>WebRTC Peer-to-Peer Communication</p>
        </header>

        {error && <div style={styles.error}>❌ {error}</div>}

        <div style={styles.status}>
          <span style={{ color: connected ? '#4caf50' : '#ff9800' }}>
            {connected ? '✅' : '⏳'} {status}
          </span>
        </div>

        {!connected && (
          <section style={styles.section}>
            <h2>📝 Register</h2>
            <form onSubmit={handleRegister} style={styles.form}>
              <input
                type="text"
                placeholder="Enter your name"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                style={styles.input}
                maxLength={20}
              />
              <button type="submit" style={styles.button}>Register</button>
            </form>
          </section>
        )}

        {connected && (
          <>
            <section style={styles.section}>
              <h2>👥 Available Peers ({availablePeers.length})</h2>
              {availablePeers.length === 0 ? (
                <p style={styles.hint}>⏳ Waiting for other peers...</p>
              ) : (
                <div style={styles.peerList}>
                  {availablePeers.map((peer) => (
                    <div key={peer.socketId} style={styles.peerCard}>
                      <span>{peer.username}</span>
                      {callingPeerId === peer.socketId ? (
                        // Show "Calling..." status if this peer is being called
                        <span style={{ ...styles.peerButton, background: '#ff9800', color: 'white', cursor: 'default' }}>
                          📞 Calling...
                        </span>
                      ) : (
                        // Show Call button if not calling this peer
                        <button
                          onClick={() => handleCall(peer)}
                          disabled={isInCall}
                          style={{
                            ...styles.peerButton,
                            opacity: isInCall ? 0.5 : 1
                          }}
                        >
                          📞 Call
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {incomingCall && (
              <section style={styles.incomingCallBox}>
                <h3 style={styles.incomingCallTitle}>
                  📞 {incomingCall.fromUsername} is calling...
                </h3>
                <div style={styles.incomingCallButtons}>
                  <button
                    onClick={handleAccept}
                    style={{ ...styles.button, background: '#4caf50' }}
                  >
                    ✅ Accept
                  </button>
                  <button
                    onClick={handleDecline}
                    style={{ ...styles.button, background: '#f44336' }}
                  >
                    ❌ Decline
                  </button>
                </div>
              </section>
            )}

            {(isInCall || selectedPeer) && (
              <section style={styles.videoSection}>
                <h2>🎬 Video Call</h2>
                <div style={styles.videoContainer}>
                  <div style={styles.videoBox}>
                    <label style={styles.videoLabel}>Your Video</label>
                    <video
                      id="localVideo"
                      style={styles.video}
                      autoPlay
                      playsInline
                      muted
                    />
                  </div>
                  <div style={styles.videoBox}>
                    <label style={styles.videoLabel}>
                      {hasRemoteStream ? `${callPeerName}'s Video` : 'Waiting for remote...'}
                    </label>
                    <video
                      id="remoteVideo"
                      style={styles.video}
                      autoPlay
                      playsInline
                    />
                  </div>
                </div>
                <div style={styles.callControls}>
                  {isInCall && (
                    <button
                      onClick={handleEndCallClick}
                      style={{ ...styles.button, background: '#f44336' }}
                    >
                      🛑 End Call
                    </button>
                  )}
                  {!isInCall && selectedPeer && (
                    <p style={styles.hint}>⏳ Connecting to {selectedPeer.username}...</p>
                  )}
                </div>
              </section>
            )}
          </>
        )}

        <footer style={styles.footer}>
          <h3>📚 How it works:</h3>
          <ol style={styles.steps}>
            <li>Enter your name and register</li>
            <li>Wait for other peers to connect</li>
            <li>Click "Call" to request connection</li>
            <li>Other peer accepts the call</li>
            <li>Video/audio stream P2P!</li>
            <li>Click "End Call" to disconnect</li>
          </ol>
        </footer>
      </main>
    </>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    backgroundColor: '#f5f5f5',
    minHeight: '100vh'
  },
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
  section: {
    backgroundColor: 'white',
    padding: '20px',
    marginBottom: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
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
  hint: {
    fontSize: '14px',
    color: '#666',
    fontStyle: 'italic'
  },
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
