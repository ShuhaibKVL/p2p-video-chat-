'use client'; // Mark this as a client component

/**
 * pages/index.js
 *
 * MAIN PAGE - Next.js React Component
 *
 * This is the main user interface for the P2P video chat application.
 * Refactored for single responsibility and better readability.
 */

import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import { styles } from '../styles';
import { updateUI, displayRemoteStream, initializeCallFlow } from '../utils';

// Module-level variables to store call-flow functions
let callFlowModule = null;
let callState = null;

export default function Home() {
  // =========================================================================
  // STATE MANAGEMENT - All React state variables
  // =========================================================================

  const [usernameInput, setUsernameInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [currentUsername, setCurrentUsername] = useState('');
  const [availablePeers, setAvailablePeers] = useState([]);
  const [selectedPeer, setSelectedPeer] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [isInCall, setIsInCall] = useState(false);
  const [callingPeerId, setCallingPeerId] = useState(null);
  const [callPeerName, setCallPeerName] = useState('');
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Initializing...');
  const initRef = useRef(false);

  // =========================================================================
  // INITIALIZATION - Load call-flow module and set up callbacks
  // =========================================================================

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const init = async () => {
      try {
        const { initializeApp } = await initializeCallFlow();

        // Set up UI callbacks for call-flow module
        window.updateUI = () => updateUI({
          setConnected, setCurrentUsername, setAvailablePeers,
          setIncomingCall, setIsInCall, setCallingPeerId,
          setCallPeerName, setHasRemoteStream
        });
        window.displayRemoteStream = (stream) => displayRemoteStream(stream, setHasRemoteStream);

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

  // =========================================================================
  // EVENT HANDLERS - User interaction handlers
  // =========================================================================

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

  // =========================================================================
  // RENDERING - JSX return with numbered sequence comments
  // =========================================================================

  return (
    <>
      {/* 1. HTML Head - Meta tags and page setup */}
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main style={styles.container}>
        {/* 2. Header - App title and description */}
        <header style={styles.header}>
          <h1>🎥 P2P Video Chat</h1>
          <p style={styles.subtitle}>WebRTC Peer-to-Peer Communication</p>
        </header>

        {/* 3. Error display - Show errors if any */}
        {error && <div style={styles.error}>❌ {error}</div>}

        {/* 4. Status indicator - Current connection/app status */}
        <div style={styles.status}>
          <span style={{ color: connected ? '#4caf50' : '#ff9800' }}>
            {connected ? '✅' : '⏳'} {status}
          </span>
        </div>

        {/* 5. Registration form - Only show when not connected */}
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

        {/* 6. Main app interface - Only show when connected */}
        {connected && (
          <>
            {/* 6.1 Peer list - Available peers to call */}
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
                        <span style={{ ...styles.peerButton, background: '#ff9800', color: 'white', cursor: 'default' }}>
                          📞 Calling...
                        </span>
                      ) : (
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

            {/* 6.2 Incoming call notification - Show when someone calls */}
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

            {/* 6.3 Video call interface - Show during calls */}
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

        {/* 7. Footer - Instructions for users */}
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
