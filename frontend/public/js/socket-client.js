/**
 * socket-client.js
 * 
 * PURPOSE:
 * This module sets up the WebSocket connection using Socket.io
 * and provides easy functions to emit signaling messages to the server
 * 
 * SOCKET.IO BASICS:
 * Socket.io is a library that makes WebSockets easier to use.
 * Instead of manually handling low-level WebSocket frames,
 * we use Socket.io which provides:
 * - Automatic reconnection if connection drops
 * - Event-based communication (like node.js EventEmitter)
 * - Fallbacks if WebSocket is not available
 * 
 * FLOW:
 * 1. This module initializes the connection to the server
 * 2. It listens for events FROM the server (incoming-call, offer, answer, etc.)
 * 3. It provides functions to send events TO the server (emit)
 * 4. The call-flow.js module uses these functions to orchestrate the call
 */

let socket = null;

/**
 * INITIALIZE THE WEBSOCKET CONNECTION
 * 
 * This is called ONCE when the page loads
 * It sets up the socket connection and all event listeners
 * 
 * WHY NOT JUST: socket = io(url)?
 * We wrap it in a function so we can control when it connects
 * This allows easier testing and lets pages choose when to connect
 */
export function initializeSocket() {
  // Check if Socket.io client is available
  // (It's loaded from a <script> tag in the HTML page)
  if (!window.io) {
    console.error('❌ Socket.io client not loaded. Add <script src="...socket.io.js"></script> to HTML');
    return null;
  }

  // Import the Socket.io client library
  // NEXT_PUBLIC_SOCKET_URL = http://localhost:3001 (from .env.local)
  // "NEXT_PUBLIC" means it's available in the browser (safe to expose)
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;

  console.log(`🔗 Connecting to WebSocket server at: ${socketUrl}`);

  /**
   * CREATE THE SOCKET CONNECTION
   * 
   * io(url, options) - Connect to the server
   */
  socket = window.io(socketUrl, {
    // RECONNECTION CONFIG
    // If the connection drops, should we try to reconnect?
    reconnection: true,
    
    // How many milliseconds to wait before trying to reconnect
    // Starts at this value and increases over time (backoff)
    // First attempt: 1 second
    // Second attempt: 2 seconds
    // Third attempt: 4 seconds
    // (exponential backoff prevents hammering the server if it's down)
    reconnectionDelay: 1000,
    
    // Maximum delay between reconnection attempts (won't exceed this)
    // e.g., if backoff would wait 10 seconds, cap it at 5 seconds
    reconnectionDelayMax: 5000,
    
    // Total number of reconnection attempts before giving up
    // After 10 failed attempts, stop trying (user should refresh page)
    reconnectionAttempts: 10,

    // TRANSPORT PROTOCOLS
    // Socket.io tries these in order:
    // 1. websocket - the native WebSocket protocol (fast, modern)
    // 2. polling - fallback if WebSocket not available (slower)
    transports: ['websocket', 'polling'],

    // AUTO-CONNECT
    // If false, you must call socket.connect() manually
    // We leave it true so it connects immediately on init
    autoConnect: true,

    // DEBUGGING
    // Set to true to see verbose Socket.io logs in console
    // Useful for troubleshooting connection issues
    debug: false // Change to true if debugging connection problems
  });

  // =========================================================================
  // SOCKET EVENT LISTENERS - Listen for messages FROM server
  // =========================================================================

  /**
   * "connect" EVENT
   * 
   * TRIGGERED: When successfully connected to the server
   * 
   * WHAT HAPPENS:
   * - socket.id is now available (unique ID for this connection)
   * - We can start sending messages to the server
   */
  socket.on('connect', () => {
    console.log(`✅ Connected to WebSocket server (Your ID: ${socket.id})`);
  });

  /**
   * "disconnect" EVENT
   * 
   * TRIGGERED: When connection is lost (internet cut, server crashed, etc.)
   * 
   * WHAT HAPPENS:
   * - Socket.io will automatically try to reconnect
   * - We should notify the user "Connection lost"
   * - Any active call should be treated as ended
   */
  socket.on('disconnect', (reason) => {
    console.log(`❌ Disconnected from server: ${reason}`);
    // Notify the UI that we're disconnected
    if (window.onSocketDisconnected) {
      window.onSocketDisconnected(reason);
    }
  });

  /**
   * "connect_error" EVENT
   * 
   * TRIGGERED: When there's an error connecting to the server
   * 
   * EXAMPLES:
   * - Server not running
   * - CORS blocked the connection
   * - Network unreachable
   */
  socket.on('connect_error', (error) => {
    console.error(`⚠️  Connection error:`, error);
    if (window.onSocketError) {
      window.onSocketError(error);
    }
  });

  /**
   * "error" EVENT
   * 
   * TRIGGERED: When server sends an error message
   */
  socket.on('error', (error) => {
    console.error(`⚠️  Server error:`, error);
    if (window.onSocketError) {
      window.onSocketError(error);
    }
  });

  /**
   * "peer-registered" EVENT
   * 
   * RECEIVED FROM: Server (response to our register-peer emit)
   * 
   * DATA:
   * {
   *   success: true,
   *   yourSocketId: "abc123",
   *   availablePeers: [
   *     { socketId: "xyz789", username: "Bob" },
   *     { socketId: "def456", username: "Charlie" }
   *   ]
   * }
   * 
   * WHAT IT MEANS:
   * "You are now registered as [username]. Here are peers you can call:"
   * 
   * WHAT THE UI SHOULD DO:
   * - Show success message
   * - Populate a list of available peers
   * - Enable the "Call" button
   */
  socket.on('peer-registered', (data) => {
    console.log(`✅ Registered successfully:`, data);
    if (window.onPeerRegistered) {
      window.onPeerRegistered(data);
    }
  });

  /**
   * "peer-joined" EVENT
   * 
   * RECEIVED FROM: Server (broadcast when a new peer joins)
   * 
   * TRIGGERED: When someone else joins the video chat
   * 
   * DATA:
   * { socketId: "new-peer-id", username: "NewPerson" }
   * 
   * WHAT IT MEANS:
   * "Another peer just joined the room"
   * 
   * WHAT THE UI SHOULD DO:
   * - Add this peer to the available list
   * - Show "NewPerson is online" message
   */
  socket.on('peer-joined', (data) => {
    console.log(`👤 New peer joined: ${data.username}`);
    if (window.onPeerJoined) {
      window.onPeerJoined(data);
    }
  });

  /**
   * "peer-left" EVENT
   * 
   * RECEIVED FROM: Server (broadcast when a peer disconnects)
   * 
   * DATA:
   * { socketId: "peer-id", username: "LeavingPerson" }
   * 
   * WHAT IT MEANS:
   * "A peer just went offline"
   * 
   * WHAT THE UI SHOULD DO:
   * - Remove from available peers list
   * - Show "LeavingPerson is offline" message
   * - If we're calling them, end the call
   */
  socket.on('peer-left', (data) => {
    console.log(`👋 Peer left: ${data.username}`);
    if (window.onPeerLeft) {
      window.onPeerLeft(data);
    }
  });

  /**
   * "incoming-call" EVENT
   * 
   * RECEIVED FROM: Server (when another peer requests a call with us)
   * 
   * DATA:
   * { fromSocketId: "alice-id", fromUsername: "Alice" }
   * 
   * WHAT IT MEANS:
   * "Alice wants to call you!"
   * 
   * WHAT THE UI SHOULD DO:
   * - Show popup: "Alice wants to call. Accept? [Yes] [No]"
   * - If user clicks "Yes" → emit call-accepted event
   * - If user clicks "No" → emit call-declined event
   */
  socket.on('incoming-call', (data) => {
    console.log(`📞 Incoming call from: ${data.fromUsername}`);
    if (window.onIncomingCall) {
      window.onIncomingCall(data);
    }
  });

  /**
   * "call-rejected" EVENT
   * 
   * RECEIVED FROM: Server (when the peer we called rejected us)
   * 
   * DATA:
   * { rejectedBy: "Bob", message: "Bob declined your call" }
   * 
   * WHAT IT MEANS:
   * "The person we tried to call said no"
   * 
   * WHAT THE UI SHOULD DO:
   * - Show message: "Call rejected by Bob"
   * - Reset UI to "ready to call" state
   * - Clear any partial WebRTC connection
   */
  socket.on('call-rejected', (data) => {
    console.log(`❌ Call rejected: ${data.message}`);
    if (window.onCallRejected) {
      window.onCallRejected(data);
    }
  });

  /**
   * "offer" EVENT
   * 
   * RECEIVED FROM: Server (relaying WebRTC offer from calling peer)
   * 
   * DATA:
   * {
   *   offer: { type: "offer", sdp: "..." },
   *   fromSocketId: "alice-id",
   *   fromUsername: "Alice"
   * }
   * 
   * WHAT IT MEANS:
   * "Alice has created a WebRTC offer. Here are her connection details."
   * 
   * TECHNICAL DETAIL:
   * offer = SDP (Session Description Protocol)
   * It contains:
   * - What video codec she wants to use
   * - What audio codec she wants
   * - Her network candidates (addresses she can be reached at)
   * - Her fingerprint (security verification)
   * 
   * WHAT THE WEBRTC CODE SHOULD DO:
   * - Create RTCPeerConnection
   * - Set offer as remoteDescription
   * - Create answer (our response)
   * - Send answer back via emit('answer', ...)
   */
  socket.on('offer', (data) => {
    console.log(`📤 Received offer from ${data.fromUsername}`);
    if (window.onOffer) {
      window.onOffer(data);
    }
  });

  /**
   * "answer" EVENT
   * 
   * RECEIVED FROM: Server (relaying WebRTC answer from called peer)
   * 
   * DATA:
   * {
   *   answer: { type: "answer", sdp: "..." },
   *   fromSocketId: "bob-id",
   *   fromUsername: "Bob"
   * }
   * 
   * WHAT IT MEANS:
   * "Bob got your offer and is responding with his connection details"
   * 
   * WHAT THE WEBRTC CODE SHOULD DO:
   * - Set answer as remoteDescription on our RTCPeerConnection
   * - Now both have each other's connection info
   * - Next step: exchange ICE candidates
   */
  socket.on('answer', (data) => {
    console.log(`📥 Received answer from ${data.fromUsername}`);
    if (window.onAnswer) {
      window.onAnswer(data);
    }
  });

  /**
   * "ice-candidate" EVENT
   * 
   * RECEIVED FROM: Server (relaying ICE candidate from peer)
   * 
   * DATA:
   * { candidate: { candidate: "...", ...}, fromSocketId: "bob-id" }
   * 
   * WHAT IS ICE?
   * ICE = Interactive Connectivity Establishment
   * 
   * SCENARIO:
   * Alice is behind her home WiFi router
   * Bob is behind his router
   * They don't know each other's true IP addresses!
   * 
   * SOLUTION:
   * Browser detects all possible addresses:
   * - Local IP (192.168.1.5 on Alice's network)
   * - Public IP (Alice's ISP's external IP)
   * - Relay server IP (fallback if P2P fails)
   * 
   * Each is an "ICE candidate"
   * Bob tries each one until one works (he can reach Alice)
   * 
   * WHAT THE WEBRTC CODE SHOULD DO:
   * - Call peerConnection.addIceCandidate(candidateObj)
   * - This tells our RTCPeerConnection: "Try to reach Bob via this address"
   */
  socket.on('ice-candidate', (data) => {
    // Don't log every candidate (too verbose)
    if (window.onIceCandidate) {
      window.onIceCandidate(data);
    }
  });

  /**
   * "call-ended" EVENT
   * 
   * RECEIVED FROM: Server (peer ended the call)
   * 
   * DATA:
   * { fromUsername: "Alice" }
   * 
   * WHAT IT MEANS:
   * "Alice clicked 'End Call' button"
   * 
   * WHAT THE UI SHOULD DO:
   * - Stop all video/audio streams
   * - Close WebRTC connection
   * - Clear video elements
   * - Show "Call ended" message
   * - Reset to "ready for new call" state
   */
  socket.on('call-ended', (data) => {
    console.log(`🛑 Call ended by ${data.fromUsername}`);
    if (window.onCallEnded) {
      window.onCallEnded(data);
    }
  });

  return socket;
}

// ============================================================================
// EMIT FUNCTIONS - Send messages TO the server
// ============================================================================

/**
 * REGISTER THIS PEER
 * 
 * Call this when the user enters their username
 * 
 * @param {string} username - Display name (e.g., "Alice")
 */
export function registerPeer(username) {
  if (!socket || !socket.connected) {
    console.error('❌ Socket not connected. Cannot register peer.');
    return;
  }

  console.log(`Registering as: ${username}`);
  socket.emit('register-peer', { username });
}

/**
 * REQUEST A CALL WITH ANOTHER PEER
 * 
 * Call this when user clicks "Call [Username]"
 * 
 * @param {string} targetUsername - The username of the peer we want to call
 * 
 * SERVER WILL:
 * - Send "incoming-call" event to the target peer
 * - Target peer can accept or decline
 */
export function requestCall(targetUsername) {
  if (!socket || !socket.connected) {
    console.error('❌ Socket not connected. Cannot request call.');
    return;
  }

  console.log(`Requesting call with: ${targetUsername}`);
  socket.emit('request-call', { targetUsername });
}

/**
 * ACCEPT AN INCOMING CALL
 * 
 * Call this when user clicks "Accept" on incoming call notification
 * 
 * @param {string} fromSocketId - The socket ID of the caller
 * 
 * WHAT HAPPENS:
 * 1. Emits "call-accepted" so caller knows we accepted
 * 2. Caller will then create WebRTC offer and send it
 */
export function acceptCall(fromSocketId) {
  if (!socket || !socket.connected) {
    console.error('❌ Socket not connected. Cannot accept call.');
    return;
  }

  console.log(`Accepting call from: ${fromSocketId}`);
  socket.emit('call-accepted', { fromSocketId });
}

/**
 * DECLINE AN INCOMING CALL
 * 
 * Call this when user clicks "Decline" on incoming call notification
 * 
 * @param {string} targetSocketId - The socket ID of the caller
 */
export function declineCall(targetSocketId) {
  if (!socket || !socket.connected) {
    console.error('❌ Socket not connected. Cannot decline call.');
    return;
  }

  console.log(`Declining call from: ${targetSocketId}`);
  socket.emit('call-declined', { targetSocketId });
}

/**
 * SEND WEBRTC OFFER
 * 
 * Call this after creating an RTCPeerConnection offer
 * The WebRTC engine will call this automatically when offer is ready
 * 
 * @param {object} offer - The SDP offer object from WebRTC
 * @param {string} targetSocketId - Who to send the offer to
 * 
 * WHAT IS OFFER?
 * Session Description Protocol (SDP) containing:
 * - Our preferred video/audio codecs
 * - Our connection fingerprint
 * - Our ICE candidates (network addresses)
 * 
 * WHAT HAPPENS NEXT:
 * 1. Server receives this
 * 2. Server relays to target peer via "offer" event
 * 3. Target peer creates answer and sends back
 * 4. We receive answer via "answer" event listener
 */
export function sendOffer(offer, targetSocketId) {
  if (!socket || !socket.connected) {
    console.error('❌ Socket not connected. Cannot send offer.');
    return;
  }

  console.log(`Sending WebRTC offer to: ${targetSocketId}`);
  socket.emit('offer', { offer, targetSocketId });
}

/**
 * SEND WEBRTC ANSWER
 * 
 * Call this after responding to an RTCPeerConnection offer
 * 
 * @param {object} answer - The SDP answer object from WebRTC
 * @param {string} targetSocketId - Who to send the answer to (the caller)
 * 
 * WHAT IS ANSWER?
 * Our response to their offer:
 * - "I agree to use these codecs"
 * - "Here are MY network addresses"
 * 
 * WHAT HAPPENS NEXT:
 * 1. Server receives this
 * 2. Server relays to caller
 * 3. Both sides now have each other's connection info
 * 4. Both start exchanging ICE candidates
 * 5. Once ICE completes, P2P connection is established
 */
export function sendAnswer(answer, targetSocketId) {
  if (!socket || !socket.connected) {
    console.error('❌ Socket not connected. Cannot send answer.');
    return;
  }

  console.log(`Sending WebRTC answer to: ${targetSocketId}`);
  socket.emit('answer', { answer, targetSocketId });
}

/**
 * SEND ICE CANDIDATE
 * 
 * Call this repeatedly as the browser discovers network addresses
 * 
 * @param {object} candidate - RTCIceCandidate object from browser
 * @param {string} targetSocketId - Who to send it to
 * 
 * WHY SO MANY EVENTS?
 * The browser discovers candidates gradually:
 * 1. Local IP address candidate (immediately)
 * 2. Public IP candidate (takes a moment)
 * 3. Relay server candidates (if needed for NAT traversal)
 * 4. Null candidate (signals end of gathering)
 * 
 * So you'll call this 5-30+ times, not just once!
 * 
 * THE OTHER PEER:
 * - Receives each candidate
 * - Tries to connect via that address
 * - If successful, stops trying other candidates
 */
export function sendIceCandidate(candidate, targetSocketId) {
  if (!socket || !socket.connected) {
    console.error('❌ Socket not connected. Cannot send ICE candidate.');
    return;
  }

  // Don't log each candidate (too verbose)
  socket.emit('ice-candidate', { candidate, targetSocketId });
}

/**
 * END CALL
 * 
 * Call this when user clicks "End Call" button
 * 
 * @param {string} targetSocketId - Who we're calling
 * 
 * WHAT HAPPENS:
 * 1. Server receives this
 * 2. Server notifies the other peer via "call-ended" event
 * 3. Both sides should close WebRTC connection
 */
export function endCall(targetSocketId) {
  if (!socket || !socket.connected) {
    console.error('❌ Socket not connected. Cannot end call.');
    return;
  }

  console.log(`Ending call with: ${targetSocketId}`);
  socket.emit('end-call', { targetSocketId });
}

/**
 * GET SOCKET STATUS
 * 
 * Useful for debugging - check if socket is ready
 * 
 * @returns {boolean} true if connected and ready to use
 */
export function isSocketConnected() {
  return socket && socket.connected;
}

/**
 * DISCONNECT SOCKET
 * 
 * Call this to manually close the WebSocket connection
 * Useful for cleanup when leaving the page
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    console.log('🔌 Socket disconnected');
  }
}

export function getSocket() {
  return socket;
}
