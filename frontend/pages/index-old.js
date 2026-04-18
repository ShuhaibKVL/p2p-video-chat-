/**
 * pages/index.js
 * 
 * MAIN PAGE - Next.js React Component
 * 
 * This is the main user interface for the P2P video chat application.
 * 
 * STRUCTURE:
 * 1. Input form for username registration
 * 2. List of available peers to call
 * 3. Incoming call notification (if someone calls)
 * 4. Video display area (local + remote)
 * 5. Call control buttons (accept/decline/end call)
 * 
 * STATE MANAGEMENT:
 * We use React useState hooks to manage:
 * - Current username
 * - List of available peers
 * - Call state (in call, incoming call, etc.)
 * - UI visibility (what to show/hide)
 * 
 * EVENT HANDLERS:
 * Connect UI button clicks to call-flow.js functions
 * Listen for updates from call-flow.js and update UI
 */

import { useEffect, useState } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';

// Load call-flow module only on client side (not during SSR)
let callFlowFunctions = null;

const loadCallFlow = async () => {
  if (callFlowFunctions) return callFlowFunctions;
  const module = await import('../public/js/call-flow.js');
  callFlowFunctions = module;
  return module;
};

function Home() {
  // =========================================================================
  // STATE - React state variables
  // =========================================================================

  // Form input
  const [usernameInput, setUsernameInput] = useState('');

  // Connection status
  const [connected, setConnected] = useState(false);
  const [currentUsername, setCurrentUsername] = useState('');

  // Peer list
  const [availablePeers, setAvailablePeers] = useState([]);
  const [selectedPeer, setSelectedPeer] = useState(null);

  // Incoming call notification
  const [incomingCall, setIncomingCall] = useState(null);

  // Call state
  const [isInCall, setIsInCall] = useState(false);
  const [callPeerName, setCallPeerName] = useState('');
  const [hasRemoteStream, setHasRemoteStream] = useState(false);

  // Error messages
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Initializing...');

  // =========================================================================
  // EFFECTS - Run on mount/unmount
  // =========================================================================

  /**
   * INITIALIZE APP ON MOUNT
   * 
   * This runs once when the page first loads
   * 
   * WHAT IT DOES:
   * 1. Initialize Socket.io connection
   * 2. Set up event handlers
   * 3. Initialize media manager
   * 4. Set up UI update callbacks
   */
  useEffect(() => {
    const init = async () => {
      // Load call-flow module dynamically on client side
      const { initializeApp } = await loadCallFlow();

      // Initialize the app
      initializeApp();

      // Set up callback for call-flow.js to update UI
      window.updateUI = updateUI;
      window.displayRemoteStream = displayRemoteStream;

      setStatus('Ready to register');

      // Cleanup on unmount
      return () => {
        cleanup();
      };
    }, []);

  // =========================================================================
  // CALLBACK FUNCTIONS - Called by call-flow.js
  // =========================================================================

  /**
   * UPDATE UI - Called whenever state changes
   * 
   * This function reads from callState and updates React state
   * Called by call-flow.js whenever something significant happens
   */
  function updateUI() {
    setConnected(callState.connected);
    setCurrentUsername(callState.username || '');
    setAvailablePeers([...callState.availablePeers]);
    setIncomingCall(callState.incomingCallData);
    setIsInCall(callState.isInCall);
    setCallPeerName(callState.currentPeerUsername || '');
    setHasRemoteStream(!!callState.peerConnection?.getRemoteStream());
  }

  /**
   * DISPLAY REMOTE STREAM
   * 
   * Called when we receive the remote peer's video/audio
   * 
   * @param {MediaStream} remoteStream - The peer's media stream
   */
  function displayRemoteStream(remoteStream) {
    const remoteVideoElement = document.getElementById('remoteVideo');
    if (remoteVideoElement) {
      remoteVideoElement.srcObject = remoteStream;
      remoteVideoElement.play();
    }
    setHasRemoteStream(true);
  }

  // =========================================================================
  // EVENT HANDLERS - UI user interactions
  // =========================================================================

  /**
   * USER CLICKED: "Register" button
   * 
   * Send username to server
   */
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    try {
      setStatus('Registering...');
      await handleRegisterPeer(usernameInput);
      setStatus('Registered! Waiting for peers...');
      // updateUI is called by socket-client.js
    } catch (err) {
      setError(err.message);
      setStatus('Registration failed');
    }
  };

  /**
   * USER CLICKED: "Call [Peer]" button
   * 
   * Request call with this peer
   */
  const handleCall = async (peer) => {
    setError('');
    setStatus('Requesting call...');

    try {
      await handleRequestCall(peer.username, peer.socketId);
      setSelectedPeer(peer);
      setStatus(`Calling ${peer.username}...`);
    } catch (err) {
      setError(err.message);
      setStatus('Call request failed');
    }
  };

  /**
   * USER CLICKED: "Accept" on incoming call
   */
  const handleAccept = async () => {
    if (!incomingCall) return;

    setError('');
    setStatus('Accepting call...');

    try {
      await handleAcceptCall(incomingCall.fromSocketId, incomingCall.fromUsername);
    } catch (err) {
      setError(err.message);
      setStatus('Failed to accept call');
    }
  };

  /**
   * USER CLICKED: "Decline" on incoming call
   */
  const handleDecline = () => {
    if (!incomingCall) return;

    handleDeclineCall(incomingCall.fromSocketId);
    setIncomingCall(null);
    setStatus('Call declined');
  };

  /**
   * USER CLICKED: "End Call" button
   */
  const handleEndCallClick = () => {
    setStatus('Ending call...');
    handleEndCall();
    setSelectedPeer(null);
    setHasRemoteStream(false);
    setStatus('Call ended');
  };

  // =========================================================================
  // RENDER - UI HTML
  // =========================================================================

  return (
    <>
      <Head>
        <title>P2P Video Chat - WebRTC + Socket.io</title>
        <meta name="description" content="Peer-to-peer video chat using WebRTC" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main style={styles.container}>
        {/* HEADER */}
        <header style={styles.header}>
          {/* 
          <h1>🎥 P2P Video Chat</h1>
          <p style={styles.subtitle}>WebRTC Peer-to-Peer Communication</p>
          */}
        </header>

        {/* ERROR DISPLAY */}
        {error && (
          <div style={styles.error}>
            <strong>❌ Error:</strong> {error}
          </div>
        )}

        {/* STATUS DISPLAY */}
        <div style={styles.status}>
          <span style={{
            color: connected ? '#4caf50' : '#ff9800'
          }}>
            {connected ? '✅' : '⏳'} {status}
          </span>
        </div>

        {/* REGISTRATION SECTION */}
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
              <button type="submit" style={styles.button}>
                Register
              </button>
            </form>
            <p style={styles.hint}>
              💡 Register with a name to get started
            </p>
          </section>
        )}

        {/* MAIN INTERFACE ONCE REGISTERED */}
        {connected && (
          <>
            {/* PEER LIST SECTION */}
            <section style={styles.section}>
              <h2>👥 Available Peers ({availablePeers.length})</h2>

              {availablePeers.length === 0 ? (
                <p style={styles.hint}>⏳ Waiting for other peers...</p>
              ) : (
                <div style={styles.peerList}>
                  {availablePeers.map((peer) => (
                    <div
                      key={peer.socketId}
                      style={{
                        ...styles.peerCard,
                        opacity: isInCall && callPeerName !== peer.username ? 0.6 : 1
                      }}
                    >
                      <span>{peer.username}</span>
                      <button
                        onClick={() => handleCall(peer)}
                        disabled={isInCall}
                        style={{
                          ...styles.peerButton,
                          opacity: isInCall ? 0.5 : 1,
                          cursor: isInCall ? 'not-allowed' : 'pointer'
                        }}
                      >
                        📞 Call
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* INCOMING CALL NOTIFICATION */}
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

            {/* VIDEO SECTION - ALWAYS SHOW IF PREPARING CALL */}
            {(isInCall || selectedPeer) && (
              <section style={styles.videoSection}>
                <h2>🎬 Video Call</h2>

                <div style={styles.videoContainer}>
                  {/* LOCAL VIDEO */}
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

                  {/* REMOTE VIDEO */}
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

                {/* CALL CONTROLS */}
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
                    <p style={styles.hint}>
                      ⏳ Connecting to {selectedPeer.username}...
                    </p>
                  )}
                </div>
              </section>
            )}
          </>
        )}

        {/* FOOTER - INFO */}
        <footer style={styles.footer}>
          <div style={styles.footerContent}>
            <h3>📚 How it works:</h3>
            <ol style={styles.steps}>
              <li>Enter your name and register</li>
              <li>Wait for other peers to connect</li>
              <li>Click "Call" to request a connection</li>
              <li>Other peer accepts the call</li>
              <li>Video and audio stream P2P directly!</li>
              <li>Click "End Call" to disconnect</li>
            </ol>

            <h3>💡 Learn More:</h3>
            <ul style={styles.learnMore}>
              <li>
                <strong>WebSocket:</strong> Two-way communication channel (Socket.io)
              </li>
              <li>
                <strong>WebRTC:</strong> Peer-to-peer audio/video (not through server)
              </li>
              <li>
                <strong>SDP Offer/Answer:</strong> Connection negotiation protocol
              </li>
              <li>
                <strong>ICE Candidates:</strong> Network addresses for finding peers
              </li>
              <li>
                <strong>STUN/TURN:</strong> Servers helping peers behind firewalls
              </li>
            </ul>
          </div>
        </footer>
      </main>
    </>
  );
}

// ============================================================================
// STYLES - Simple inline CSS
// ============================================================================

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
    marginTop: '10px',
    opacity: 0.9
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
    fontSize: '14px',
    transition: 'opacity 0.2s'
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
    fontSize: '12px'
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
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
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
    marginTop: '30px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },

  footerContent: {
    fontSize: '14px',
    lineHeight: '1.6'
  },

  steps: {
    backgroundColor: '#f9f9f9',
    padding: '15px 30px',
    borderRadius: '4px',
    marginBottom: '20px'
  },

  learnMore: {
    backgroundColor: '#f9f9f9',
    padding: '15px 30px',
    borderRadius: '4px',
    marginBottom: '0'
  }
};
