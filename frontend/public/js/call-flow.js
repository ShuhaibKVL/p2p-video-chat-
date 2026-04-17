/**
 * call-flow.js
 * 
 * PURPOSE:
 * This is the ORCHESTRATOR module that ties together:
 * - WebSocket signaling (socket-client.js)
 * - WebRTC peer connection (webrtc-client.js)
 * - UI interactions (from index.js)
 * 
 * ANALOGY:
 * If socket-client and webrtc-client are like instruments in an orchestra,
 * call-flow is the conductor that tells each when to play.
 * 
 * CALL FLOW DIAGRAM:
 * 
 * USER A (CALLER)           SERVER                  USER B (CALLEE)
 * ───────────────────────────────────────────────────────────────
 * 1. Click "Call Bob" ────────────────────────────────────────>
 *                        request-call event
 * 
 *                                                   2. Receive "incoming-call"
 *                                                      [Show: "Alice is calling"]
 * 
 *                                                   3. Click "Accept"
 *                        <────────────────────────── call-accepted
 * 
 * 4. Create WebRTC offer   (local description)
 *    Start ICE gathering
 *    Send offer ───────────────────────────────────────────>
 *                        offer event
 * 
 *                                                   5. Receive offer
 *                                                      Set remote description
 *                                                      Create answer
 *                                                      Set local description
 *                                                      Send answer
 *                        <────────────────────────── answer event
 * 
 * 6. Receive answer
 *    Set remote description
 *    Negotiation complete!
 * 
 * 7. Exchange ICE candidates (many of these)
 *    Send candidate ────────────────────────────────────────>
 *                        ice-candidate event
 * 
 *                                                   8. Receive candidates
 *                                                      Try to connect
 * 
 * [Similar exchange of ICE candidates from B to A]
 * 
 * 9. Connection established! (connectionstatechange → "connected")
 *    Video/audio now flows P2P
 * 
 * 10. Display video/audio from peer (ontrack event)
 *
 * 11. User clicks "End Call"
 *     Send end-call ──────────────────────────────────────────>
 *                        end-call event
 *                                                   12. Receive "call-ended"
 *                                                       Close connection
 * 
 * 13. Close connection
 *     Clean up streams
 *     Reset UI
 */

import { LocalMediaManager, PeerConnection } from './webrtc-client.js';
import {
  initializeSocket,
  registerPeer,
  requestCall,
  acceptCall,
  declineCall,
  sendOffer,
  sendAnswer,
  sendIceCandidate,
  endCall,
  isSocketConnected,
  disconnectSocket,
  getSocket
} from './socket-client.js';

// ============================================================================
// GLOBAL STATE - Track current call status
// ============================================================================

export const callState = {
  // Socket connection state
  socket: null,
  socketId: null,
  username: null,
  connected: false,

  // Local media state
  localMediaManager: null,
  localStream: null,

  // Peer connection state
  currentPeerId: null,
  currentPeerUsername: null,
  peerConnection: null,

  // Call state
  isInCall: false,
  incomingCallData: null,
  availablePeers: [],
};

// ============================================================================
// INITIALIZATION - Set up socket and media manager
// ============================================================================

/**
 * INITIALIZE THE APPLICATION
 * 
 * This is called once when the page loads
 * 
 * WHAT IT DOES:
 * 1. Initialize Socket.io (WebSocket connection)
 * 2. Set up Socket.io event handlers
 * 3. Initialize local media manager (prepare for getUserMedia)
 * 4. Set up window functions for UI to call
 */
export function initializeApp() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 Initializing P2P Video Chat Application`);
  console.log(`${'='.repeat(60)}\n`);

  // Initialize Socket.io
  callState.socket = initializeSocket();

  // Initialize local media manager
  callState.localMediaManager = new LocalMediaManager();

  // Set up window functions for Socket.io event handlers to call
  // (These are called from socket-client.js event listeners)
  window.onSocketDisconnected = onSocketDisconnected;
  window.onSocketError = onSocketError;
  window.onPeerRegistered = onPeerRegistered;
  window.onPeerJoined = onPeerJoined;
  window.onPeerLeft = onPeerLeft;
  window.onIncomingCall = onIncomingCall;
  window.onCallRejected = onCallRejected;
  window.onOffer = onOffer;
  window.onAnswer = onAnswer;
  window.onIceCandidate = onIceCandidate;
  window.onCallEnded = onCallEnded;

  // Set up window functions for WebRTC to call
  window.sendOffer = sendOfferToServer;
  window.sendAnswer = sendAnswerToServer;
  window.sendIceCandidate = sendIceCandidateToServer;
  window.onRemoteStreamReceived = onRemoteStreamReceived;
  window.onPeerConnectionEstablished = onPeerConnectionEstablished;
  window.onPeerConnectionFailed = onPeerConnectionFailed;

  console.log(`✅ App initialized and ready`);
}

// ============================================================================
// USER ACTIONS - Called by UI (button clicks, form submissions)
// ============================================================================

/**
 * USER CLICKED: "Register" button
 * 
 * WHAT IT DOES:
 * 1. Validates username
 * 2. Sends register-peer event to server
 * 3. Server responds with peer-registered event
 * 4. We show list of available peers
 */
export async function handleRegisterPeer(username) {
  // Validate
  if (!username || username.trim().length === 0) {
    alert('Please enter a username');
    return;
  }

  if (!isSocketConnected()) {
    alert('Not connected to server. Please refresh the page.');
    return;
  }

  // Store username and register
  callState.username = username;
  registerPeer(username);
}

/**
 * USER CLICKED: "Call [Peer]" button
 * 
 * FLOW:
 * 1. Validate we're not already in a call
 * 2. Request to call this peer (send request-call event)
 * 3. Server sends them incoming-call event
 * 4. Caller starts getting local media
 * 5. Wait for them to accept or reject
 * 
 * @param {string} targetUsername - Who to call
 * @param {string} targetSocketId - Their socket ID
 */
export async function handleRequestCall(targetUsername, targetSocketId) {
  if (callState.isInCall) {
    alert('You are already in a call');
    return;
  }

  try {
    // Request the call
    requestCall(targetUsername);

    // Set peer info
    callState.currentPeerId = targetSocketId;
    callState.currentPeerUsername = targetUsername;

    // Start getting local media
    await startLocalMedia();

    console.log(`📞 Calling ${targetUsername}...`);
  } catch (error) {
    console.error('Error requesting call:', error);
    alert(`Error: ${error.message}`);
  }
}

/**
 * USER CLICKED: "Accept" on incoming call
 * 
 * FLOW:
 * 1. Get local media
 * 2. Create RTCPeerConnection
 * 3. Create WebRTC offer
 * 4. Browser starts gathering ICE candidates
 * 5. Send offer to peer
 * 6. Wait for answer
 * 
 * @param {string} fromSocketId - Caller's socket ID
 * @param {string} fromUsername - Caller's username
 */
export async function handleAcceptCall(fromSocketId, fromUsername) {
  try {
    callState.currentPeerId = fromSocketId;
    callState.currentPeerUsername = fromUsername;
    callState.isInCall = true;

    // Notify server we accepted
    acceptCall(fromSocketId);

    // Start getting local media
    await startLocalMedia();

    console.log(`✅ Accepted call from ${fromUsername}`);

    // Emit event for UI to update
    if (window.updateUI) {
      window.updateUI();
    }
  } catch (error) {
    console.error('Error accepting call:', error);
    alert(`Error: ${error.message}`);
    callState.isInCall = false;
  }
}

/**
 * USER CLICKED: "Decline" on incoming call
 * 
 * FLOW:
 * 1. Notify server we declined
 * 2. Clear incoming call state
 */
export function handleDeclineCall(fromSocketId) {
  declineCall(fromSocketId);
  callState.incomingCallData = null;
  console.log(`❌ Declined call`);
}

/**
 * USER CLICKED: "End Call" button
 * 
 * FLOW:
 * 1. Notify peer we're ending
 * 2. Close peer connection
 * 3. Stop local media
 * 4. Clear video elements
 * 5. Reset UI
 */
export function handleEndCall() {
  if (!callState.isInCall) {
    return;
  }

  // Notify the peer
  if (callState.currentPeerId) {
    endCall(callState.currentPeerId);
  }

  // Clean up
  cleanup();
}

// ============================================================================
// SOCKET.IO EVENT HANDLERS - Receive events from server
// ============================================================================

/**
 * SOCKET EVENT: Connected to server
 */
function onSocketDisconnected(reason) {
  console.log(`❌ Socket disconnected: ${reason}`);
  callState.connected = false;

  // If in call, end it
  if (callState.isInCall) {
    cleanup();
  }

  // Notify UI
  if (window.updateUI) {
    window.updateUI();
  }
}

/**
 * SOCKET EVENT: Error from server
 */
function onSocketError(error) {
  console.error(`⚠️  Socket error:`, error);
  alert(`Connection error: ${error.message || error}`);
}

/**
 * SOCKET EVENT: Successfully registered
 * 
 * DATA:
 * {
 *   success: true,
 *   yourSocketId: "abc123",
 *   availablePeers: [
 *     { socketId: "xyz", username: "Bob" },
 *     { socketId: "def", username: "Charlie" }
 *   ]
 * }
 */
function onPeerRegistered(data) {
  console.log(`✅ Peer registered:`, data);

  callState.socketId = data.yourSocketId;
  callState.connected = true;
  callState.availablePeers = data.availablePeers;

  // Notify UI - show available peers
  if (window.updateUI) {
    window.updateUI();
  }
}

/**
 * SOCKET EVENT: Another peer joined
 * 
 * DATA:
 * { socketId: "new-peer-id", username: "NewPerson" }
 */
function onPeerJoined(data) {
  console.log(`👤 Peer joined: ${data.username}`);

  // Add to available peers list
  callState.availablePeers.push({
    socketId: data.socketId,
    username: data.username
  });

  // Notify UI
  if (window.updateUI) {
    window.updateUI();
  }
}

/**
 * SOCKET EVENT: Another peer left/disconnected
 * 
 * DATA:
 * { socketId: "leaving-peer-id", username: "LeavingPerson" }
 */
function onPeerLeft(data) {
  console.log(`👋 Peer left: ${data.username}`);

  // Remove from available peers
  callState.availablePeers = callState.availablePeers.filter(p => p.socketId !== data.socketId);

  // If we're calling them, end the call
  if (callState.currentPeerId === data.socketId) {
    alert(`${data.username} left the chat`);
    cleanup();
  }

  // Notify UI
  if (window.updateUI) {
    window.updateUI();
  }
}

/**
 * SOCKET EVENT: Someone wants to call us
 * 
 * DATA:
 * { fromSocketId: "caller-id", fromUsername: "Alice" }
 * 
 * WHAT WE DO:
 * Show notification asking to accept/decline
 * Store their info in case we accept
 */
function onIncomingCall(data) {
  console.log(`📞 Incoming call from: ${data.fromUsername}`);

  callState.incomingCallData = data;

  // Notify UI - show accept/decline buttons
  if (window.updateUI) {
    window.updateUI();
  }
}

/**
 * SOCKET EVENT: The person we called rejected us
 * 
 * DATA:
 * { rejectedBy: "Bob", message: "Bob declined your call" }
 */
function onCallRejected(data) {
  console.log(`❌ Call rejected: ${data.message}`);

  alert(data.message);
  cleanup();
}

/**
 * SOCKET EVENT: Received WebRTC offer from peer
 * 
 * DATA:
 * {
 *   offer: { type: "offer", sdp: "..." },
 *   fromSocketId: "caller-id",
 *   fromUsername: "Alice"
 * }
 * 
 * WHAT WE DO:
 * 1. Create peer connection
 * 2. Set their offer as remote description
 * 3. Create answer
 * 4. Send answer back
 */
async function onOffer(data) {
  console.log(`📤 Received WebRTC offer from ${data.fromUsername}`);

  try {
    // Create peer connection if not already done
    if (!callState.peerConnection) {
      callState.peerConnection = new PeerConnection(data.fromSocketId);
      callState.peerConnection.initialize(callState.localStream);
    }

    // Peer sent us offer, we respond with answer
    await callState.peerConnection.handleOfferAndCreateAnswer(data.offer);

    console.log(`✅ Answer sent to ${data.fromUsername}`);
  } catch (error) {
    console.error('Error handling offer:', error);
    alert(`Error: ${error.message}`);
  }
}

/**
 * SOCKET EVENT: Received WebRTC answer from peer
 * 
 * DATA:
 * {
 *   answer: { type: "answer", sdp: "..." },
 *   fromSocketId: "callee-id",
 *   fromUsername: "Bob"
 * }
 * 
 * WHAT WE DO:
 * Set their answer as remote description
 * Negotiation is now complete!
 * Start waiting for connection to establish
 */
async function onAnswer(data) {
  console.log(`📥 Received WebRTC answer from ${data.fromUsername}`);

  try {
    if (!callState.peerConnection) {
      console.error('No peer connection to set answer on!');
      return;
    }

    await callState.peerConnection.handleAnswer(data.answer);
    console.log(`✅ Answer processed, awaiting connection...`);
  } catch (error) {
    console.error('Error handling answer:', error);
    alert(`Error: ${error.message}`);
  }
}

/**
 * SOCKET EVENT: Received ICE candidate from peer
 * 
 * DATA:
 * { candidate: { candidate: "...", ...}, fromSocketId: "peer-id" }
 * 
 * WHAT WE DO:
 * Pass it to peer connection to try
 * Peer connection will buffer if remote description not ready yet
 */
function onIceCandidate(data) {
  if (!callState.peerConnection) {
    console.warn('Received ICE candidate but no peer connection!');
    return;
  }

  try {
    callState.peerConnection.addIceCandidate(data.candidate);
  } catch (error) {
    console.error('Error adding ICE candidate:', error);
  }
}

/**
 * SOCKET EVENT: Peer ended the call
 * 
 * DATA:
 * { fromUsername: "Alice" }
 */
function onCallEnded(data) {
  console.log(`🛑 Call ended by ${data.fromUsername}`);

  alert(`${data.fromUsername} ended the call`);
  cleanup();
}

// ============================================================================
// WEBRTC EVENT HANDLERS
// ============================================================================

/**
 * WEBRTC EVENT: Successfully created offer and sending it
 * 
 * WHAT WE DO: Just logging for now (actual sending handled by PeerConnection)
 */
function sendOfferToServer(offer, targetSocketId) {
  console.log(`📤 Sending offer to server for relay...`);
  sendOffer(offer, targetSocketId);
}

/**
 * WEBRTC EVENT: Successfully created answer and sending it
 */
function sendAnswerToServer(answer, targetSocketId) {
  console.log(`📥 Sending answer to server for relay...`);
  sendAnswer(answer, targetSocketId);
}

/**
 * WEBRTC EVENT: Found new ICE candidate, sending it
 */
function sendIceCandidateToServer(candidate, targetSocketId) {
  sendIceCandidate(candidate, targetSocketId);
}

/**
 * WEBRTC EVENT: Received remote video/audio stream
 * 
 * @param {MediaStream} remoteStream - The peer's media stream
 * @param {string} peerId - The peer's socket ID
 */
function onRemoteStreamReceived(remoteStream, peerId) {
  console.log(`📥 Remote stream received from ${peerId}`);

  // Display in remote video element
  if (window.displayRemoteStream) {
    window.displayRemoteStream(remoteStream);
  }

  // Notify UI
  if (window.updateUI) {
    window.updateUI();
  }
}

/**
 * WEBRTC EVENT: Peer connection established successfully!
 * 
 * @param {string} peerId - The peer's socket ID
 */
function onPeerConnectionEstablished(peerId) {
  console.log(`✅ Peer connection established with ${peerId}!`);

  callState.isInCall = true;

  // Notify UI
  if (window.updateUI) {
    window.updateUI();
  }
}

/**
 * WEBRTC EVENT: Peer connection failed
 * 
 * @param {string} peerId - The peer's socket ID
 */
function onPeerConnectionFailed(peerId) {
  console.log(`❌ Peer connection failed with ${peerId}`);

  alert('Connection failed. Please try again.');
  cleanup();
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * START LOCAL MEDIA (camera and microphone)
 * 
 * This prompts the user for permission to access camera/mic
 * and displays their own video
 */
async function startLocalMedia() {
  try {
    if (callState.localStream) {
      // Already have local stream
      return;
    }

    console.log(`📹 Starting local media...`);

    // Get camera and microphone
    callState.localStream = await callState.localMediaManager.getUserMedia();

    // Display local video
    const localVideoElement = document.getElementById('localVideo');
    if (localVideoElement) {
      callState.localMediaManager.displayLocalStream(localVideoElement);
    }

    // Create peer connection and add local stream
    if (!callState.peerConnection && callState.currentPeerId) {
      callState.peerConnection = new PeerConnection(callState.currentPeerId);
      callState.peerConnection.initialize(callState.localStream);

      // Create offer and send it
      callState.isInCall = true;
      await callState.peerConnection.createOffer();
    }

    console.log(`✅ Local media started`);
  } catch (error) {
    console.error('Error starting local media:', error);
    alert(`Camera/Microphone error: ${error.message}`);
    callState.isInCall = false;
  }
}

/**
 * CLEANUP - End call and reset everything
 * 
 * This is called when:
 * - User clicks "End Call"
 * - Peer disconnects
 * - Connection fails
 * - App closes
 */
export function cleanup() {
  console.log(`🧹 Cleaning up call...`);

  // Mark no longer in call
  callState.isInCall = false;
  callState.currentPeerId = null;
  callState.currentPeerUsername = null;
  callState.incomingCallData = null;

  // Close peer connection
  if (callState.peerConnection) {
    callState.peerConnection.close();
    callState.peerConnection = null;
  }

  // Stop local media
  if (callState.localMediaManager && callState.localStream) {
    const localVideoElement = document.getElementById('localVideo');
    callState.localMediaManager.stopLocalStream(localVideoElement);
    callState.localStream = null;
  }

  // Clear video elements
  const localVideoElement = document.getElementById('localVideo');
  const remoteVideoElement = document.getElementById('remoteVideo');

  if (localVideoElement) {
    localVideoElement.srcObject = null;
  }

  if (remoteVideoElement) {
    remoteVideoElement.srcObject = null;
  }

  // Notify UI
  if (window.updateUI) {
    window.updateUI();
  }

  console.log(`✅ Cleanup complete`);
}

/**
 * SHUTDOWN APP - Called when page is closed
 */
export function shutdownApp() {
  cleanup();
  disconnectSocket();
  console.log(`👋 App shut down`);
}

// Cleanup on page unload
window.addEventListener('beforeunload', shutdownApp);
