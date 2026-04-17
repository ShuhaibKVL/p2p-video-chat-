/**
 * server.js
 * 
 * MAIN WEBSOCKET SIGNALING SERVER FOR PEER-TO-PEER VIDEO/AUDIO CHAT
 * 
 * PURPOSE:
 * This server acts as a "matchmaker" and "signal relay" between two peers.
 * 
 * It does NOT:
 * - Stream video/audio (that's P2P between peers via WebRTC)
 * - Store data (we use in-memory state)
 * - Handle authentication (for learning purposes)
 * 
 * It does:
 * - Listen for WebSocket connections from peers
 * - Help peers discover each other
 * - Relay signaling messages (offers, answers, ICE candidates) between peers
 * - Notify peers when someone wants to call
 * - Clean up when peers disconnect
 * 
 * FLOW EXAMPLE:
 * 1. Alice connects to this server → we store "Alice" in our peer registry
 * 2. Bob connects to this server → we store "Bob" in our peer registry
 * 3. Alice asks: "Can I call Bob?" → we notify Bob that Alice wants to call
 * 4. Bob accepts → Alice creates WebRTC offer (peer connection setup)
 * 5. Alice sends her offer to us → we relay it to Bob
 * 6. Bob creates answer → sends back to us → we relay to Alice
 * 7. Both exchange ICE candidates (NAT traversal) → we relay those too
 * 8. Once they have each other's network info, they talk directly (P2P)
 * 9. If anyone disconnects → we notify the other peer to clean up
 */

// ============================================================================
// IMPORTS - Libraries needed for this server
// ============================================================================

import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { roomManager } from './roomManager.js';

// Load environment variables from .env file
// WHAT: Read PORT, CORS_ORIGIN, NODE_ENV from .env
// WHY: Keeps sensitive config out of code, allows different settings for dev/prod
dotenv.config();

// ============================================================================
// SERVER CONFIGURATION
// ============================================================================

const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Create an Express application
// WHAT: Express is a web framework that makes creating servers easier
// WHY: We need a basic HTTP server for Socket.io to attach to
const app = express();

// Create an HTTP server from Express
// IMPORTANT FOR WEBSOCKETS:
// WebSockets need an HTTP server to attach to. We can't use Express directly.
// We wrap Express with the http module, then attach Socket.io to it.
const server = http.createServer(app);

// ============================================================================
// SOCKET.IO INITIALIZATION WITH CORS
// ============================================================================

/**
 * CORS = Cross-Origin Resource Sharing
 * 
 * PROBLEM: By default, browsers block connections from one domain to another (same-origin policy)
 * 
 * SITUATION: 
 * - Next.js frontend runs on http://localhost:3000
 * - This Socket.io server runs on http://localhost:3001
 * - They are DIFFERENT ports = different origins
 * - Browser says "No! That's not allowed!"
 * 
 * SOLUTION: Tell Socket.io to allow connections from localhost:3000
 * 
 * IN PRODUCTION:
 * You'd change CORS_ORIGIN to your actual domain:
 * cors: { origin: "https://www.videochat.com", credentials: true }
 */
const io = new SocketIOServer(server, {
  cors: {
    // ✅ ALLOW CONNECTIONS FROM:
    // For development: allow localhost AND local network IPs (192.168.x.x, 10.x.x.x)
    // For production: use specific domain from CORS_ORIGIN env var
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
      } else if (
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        origin.startsWith('http://192.168.') ||
        origin.startsWith('http://10.') ||
        origin.startsWith('http://172.')
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    // CREDENTIALS = true means we allow cookies/auth headers
    // (not used here, but good practice)
    credentials: true
  },
  // OPTIONAL SETTINGS for fine-tuning:
  // 
  // maxHttpBufferSize: How much data can be sent in one message
  // Default: 1MB - usually fine for signaling (SDP offers are ~2KB)
  maxHttpBufferSize: 1e6, // 1MB
  
  // pingInterval: How often to send a "ping" to keep connection alive
  // pingTimeout: How long to wait for a "pong" before considering client dead
  // Good for detecting stale connections
  pingInterval: 25000,  // 25 seconds
  pingTimeout: 60000    // 60 seconds
});

console.log(`🚀 Socket.io configured with CORS origin: ${CORS_ORIGIN}`);

// ============================================================================
// SOCKET.IO EVENT HANDLERS
// ============================================================================

/**
 * CONNECTION EVENT
 * 
 * TRIGGERED: When a new peer connects to the server
 * 
 * socket = An object representing this one peer's connection
 * socket.id = Unique identifier for this connection (assigned by Socket.io)
 * 
 * NOTE: At this point, we don't know who this peer is yet (no username)
 * The peer will send us a "register-peer" message to identify themselves
 */
io.on('connection', (socket) => {
  const socketId = socket.id;
  console.log(`\n👤 New peer connected: ${socketId}`);
  console.log(`   Total peers: ${roomManager.getPeerCount() + 1}`);

  // =========================================================================
  // REGISTER-PEER EVENT - Peer identifies themselves
  // =========================================================================

  /**
   * EVENT: "register-peer"
   * 
   * TRIGGERED BY: Frontend calls socket.emit('register-peer', { username: 'Alice' })
   * 
   * WHAT IT DOES:
   * 1. Stores the peer's username in our registry
   * 2. Sends back a list of other peers they can call
   * 3. Notifies all OTHER peers that a new peer is available
   * 
   * WHY:
   * The frontend needs to know who's available to call
   * Other peers need to know a new peer joined
   */
  socket.on('register-peer', (data) => {
    const { username } = data;

    // Validate input
    if (!username || username.trim() === '') {
      socket.emit('error', { message: 'Username cannot be empty' });
      return;
    }

    // Register this peer in our room manager
    roomManager.registerPeer(socketId, username);

    // Get list of OTHER peers (everyone except this peer)
    const availablePeers = roomManager.getAvailablePeers(socketId);

    // Send confirmation + list of available peers back to this peer
    socket.emit('peer-registered', {
      success: true,
      yourSocketId: socketId,
      availablePeers: availablePeers
    });

    // Notify ALL OTHER peers that a new peer joined
    // BROADCAST = send to everyone except sender
    socket.broadcast.emit('peer-joined', {
      socketId: socketId,
      username: username
    });

    console.log(`✅ ${username} registered and peer list sent`);
    roomManager.logAllPeers();
  });

  // =========================================================================
  // REQUEST-CALL EVENT - Peer A wants to call Peer B
  // =========================================================================

  /**
   * EVENT: "request-call"
   * 
   * TRIGGERED BY: Alice calls socket.emit('request-call', { targetUsername: 'Bob' })
   * 
   * WHAT IT DOES:
   * 1. Looks up Bob by username to find his socketId
   * 2. Sends Bob a notification: "Alice wants to call you"
   * 3. Tells Alice: "Request sent" or "Bob not found"
   * 
   * WHY:
   * Before they can exchange WebRTC offers, Alice needs to find Bob
   * and Bob needs to know Alice is calling
   * 
   * IMPORTANT FLOW STEP:
   * This is BEFORE any WebRTC negotiation happens
   * It's just saying "hey, someone wants to connect"
   */
  socket.on('request-call', (data) => {
    const { targetUsername } = data;
    const senderPeer = roomManager.getPeerBySocketId(socketId);
    const targetPeer = roomManager.getPeerByUsername(targetUsername);

    // Check if target peer exists
    if (!targetPeer) {
      socket.emit('error', { 
        message: `Peer "${targetUsername}" not found or offline` 
      });
      return;
    }

    // Send call request to the target peer
    // socket.to(targetPeer.socketId).emit = Send to specific peer
    // NOT a broadcast (don't send to everyone)
    io.to(targetPeer.socketId).emit('incoming-call', {
      fromSocketId: socketId,
      fromUsername: senderPeer.username
    });

    console.log(`📞 Call request: ${senderPeer.username} → ${targetUsername}`);
  });

  // =========================================================================
  // CALL-DECLINED EVENT - Peer B rejects the call
  // =========================================================================

  /**
   * EVENT: "call-declined"
   * 
   * TRIGGERED BY: Bob rejects Alice's call
   * 
   * WHAT IT DOES:
   * Notifies Alice that Bob rejected the call
   * 
   * WHY:
   * Alice needs to know the call didn't go through so she can try someone else
   * or inform the user "Call rejected"
   */
  socket.on('call-declined', (data) => {
    const { targetSocketId } = data;
    const declinerPeer = roomManager.getPeerBySocketId(socketId);

    // Send notification to the peer who requested the call
    io.to(targetSocketId).emit('call-rejected', {
      rejectedBy: declinerPeer.username,
      message: `${declinerPeer.username} declined your call`
    });

    console.log(`❌ Call declined: ${declinerPeer.username} rejected call`);
  });

  // =========================================================================
  // OFFER EVENT - Peer A sends WebRTC offer to Peer B
  // =========================================================================

  /**
   * EVENT: "offer"
   * 
   * TRIGGERED BY: Alice's WebRTC code creates an offer and sends it:
   * socket.emit('offer', { offer: sdpOffer, targetSocketId: 'bobsId' })
   * 
   * WHAT IS AN OFFER?
   * An SDP (Session Description Protocol) message that says:
   * "Here's my video codec, audio codec, network addresses, etc."
   * It's the first step of WebRTC handshake
   * 
   * WHAT THIS EVENT DOES:
   * 1. Receives the SDP offer from Alice
   * 2. Relays it to Bob
   * 3. Bob will respond with an answer
   * 
   * WHY RELAY THROUGH SERVER?
   * Peers don't know each other's addresses yet!
   * Once they exchange offers/answers, they can find each other directly
   * 
   * AFTER THIS:
   * - Bob receives offer → creates answer → sends answer back
   * - Then both exchange ICE candidates (network addresses)
   * - Then they connect directly (P2P)
   */
  socket.on('offer', (data) => {
    const { offer, targetSocketId } = data;
    const senderPeer = roomManager.getPeerBySocketId(socketId);

    console.log(`📤 Offer from ${senderPeer.username} → ${targetSocketId}`);

    // Relay the offer to the target peer
    io.to(targetSocketId).emit('offer', {
      offer: offer,
      fromSocketId: socketId,
      fromUsername: senderPeer.username
    });
  });

  // =========================================================================
  // ANSWER EVENT - Peer B sends WebRTC answer back to Peer A
  // =========================================================================

  /**
   * EVENT: "answer"
   * 
   * TRIGGERED BY: Bob's WebRTC code creates an answer and sends it:
   * socket.emit('answer', { answer: sdpAnswer, targetSocketId: 'alicesId' })
   * 
   * WHAT IS AN ANSWER?
   * Bob's response to Alice's offer. It says:
   * "I got your offer. Here's MY video codec, audio codec, addresses, etc."
   * 
   * WHAT THIS EVENT DOES:
   * 1. Receives answer from Bob
   * 2. Relays it back to Alice
   * 
   * IMPORTANT SEQUENCE:
   * Offer → Answer → ICE Candidates → Connected
   * 
   * AFTER THIS:
   * Both Alice and Bob have:
   * - Alice's offer (her codecs, her network info)
   * - Bob's answer (his codecs, his network info)
   * 
   * Now they exchange ICE candidates to handle firewalls/NAT
   */
  socket.on('answer', (data) => {
    const { answer, targetSocketId } = data;
    const senderPeer = roomManager.getPeerBySocketId(socketId);

    console.log(`📥 Answer from ${senderPeer.username} → ${targetSocketId}`);

    // Relay the answer to the peer who sent the offer
    io.to(targetSocketId).emit('answer', {
      answer: answer,
      fromSocketId: socketId,
      fromUsername: senderPeer.username
    });
  });

  // =========================================================================
  // ICE-CANDIDATE EVENT - Exchange network discovery info
  // =========================================================================

  /**
   * EVENT: "ice-candidate"
   * 
   * TRIGGERED BY: Browser's WebRTC engine discovers network addresses
   * It fires this many times as it gathers candidates
   * 
   * WHAT IS AN ICE CANDIDATE?
   * ICE = Interactive Connectivity Establishment
   * 
   * SCENARIO: Alice is behind a home router (NAT), Bob is too
   * They don't know each other's true IP addresses!
   * 
   * SOLUTION: Both collect all possible addresses they can be reached at:
   * - Local IP (192.168.1.5)
   * - Public IP (82.34.22.11)
   * - Relay server IP (if direct connection fails)
   * 
   * Each of these is an "ICE candidate"
   * 
   * WHAT THIS EVENT DOES:
   * 1. Receives ICE candidate from Alice
   * 2. Relays it to Bob
   * 3. Bob tries that address, sees if he can reach Alice
   * 
   * NOTE: This happens MANY times (5-30+ candidates per peer)
   * The browser keeps sending until it's done gathering
   * 
   * IMPORTANT FOR BEGINNERS:
   * You don't create ICE candidates manually - the browser does it automatically!
   * You just relay them to the other peer
   */
  socket.on('ice-candidate', (data) => {
    const { candidate, targetSocketId } = data;
    const senderPeer = roomManager.getPeerBySocketId(socketId);

    // Silently relay - don't log every candidate (too verbose)
    // Uncomment this line if you want to see all candidates:
    // console.log(`❄️  ICE candidate from ${senderPeer.username}`);

    // Send this candidate to the target peer
    io.to(targetSocketId).emit('ice-candidate', {
      candidate: candidate,
      fromSocketId: socketId
    });
  });

  // =========================================================================
  // END-CALL EVENT - Peer A ends the call
  // =========================================================================

  /**
   * EVENT: "end-call"
   * 
   * TRIGGERED BY: User clicks "End Call" button
   * Frontend: socket.emit('end-call', { targetSocketId: 'bobsId' })
   * 
   * WHAT IT DOES:
   * 1. Notifies the other peer that call is ended
   * 2. Other peer cleans up their WebRTC connection
   * 
   * WHY:
   * The WebRTC connection is P2P, but we notify through the server
   * to make sure both sides know to close gracefully
   */
  socket.on('end-call', (data) => {
    const { targetSocketId } = data;
    const senderPeer = roomManager.getPeerBySocketId(socketId);

    console.log(`🛑 Call ended by ${senderPeer.username}`);

    // Notify the other peer that call is ending
    io.to(targetSocketId).emit('call-ended', {
      fromUsername: senderPeer.username
    });
  });

  // =========================================================================
  // DISCONNECT EVENT - Peer goes offline
  // =========================================================================

  /**
   * EVENT: "disconnect"
   * 
   * TRIGGERED: When peer closes browser, loses internet, or crashes
   * Socket.io detects this automatically
   * 
   * WHAT IT DOES:
   * 1. Removes peer from our registry
   * 2. Notifies all OTHER peers that this peer went offline
   * 3. Cleans up any peer state
   * 
   * WHY:
   * If we don't clean up:
   * - Other peers can still see offline peers in the list
   * - Trying to call them will fail mysteriously
   * - Memory leaks (old peer data never gets freed)
   */
  socket.on('disconnect', () => {
    const peer = roomManager.getPeerBySocketId(socketId);

    if (peer) {
      console.log(`\n👋 Peer disconnected: ${peer.username} (${socketId})`);
      
      // Remove from our registry
      roomManager.unregisterPeer(socketId);

      // Notify all remaining peers that someone went offline
      io.emit('peer-left', {
        socketId: socketId,
        username: peer.username
      });

      console.log(`   Remaining peers: ${roomManager.getPeerCount()}`);
      roomManager.logAllPeers();
    }
  });

  // =========================================================================
  // ERROR EVENT - Generic error handler
  // =========================================================================

  /**
   * OPTIONAL: Listen for errors from client side
   * Frontend can send: socket.emit('error', { message: '...' })
   */
  socket.on('error', (error) => {
    console.error(`⚠️  Error from ${socketId}:`, error);
  });
});

// ============================================================================
// HTTP MIDDLEWARE (optional, for debugging)
// ============================================================================

// Serve a simple health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    connectedPeers: roomManager.getPeerCount(),
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// START SERVER
// ============================================================================

server.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎉 WebSocket Signaling Server Started`);
  console.log(`${'='.repeat(60)}`);
  console.log(`📍 Listening on port: ${PORT}`);
  console.log(`🌐 CORS enabled for: ${CORS_ORIGIN}`);
  console.log(`🔧 Environment: ${NODE_ENV}`);
  console.log(`${'='.repeat(60)}\n`);

  // Log some helpful info
  if (NODE_ENV === 'development') {
    console.log(`✨ TIP: Open http://localhost:${CORS_ORIGIN.split(':')[2]} in two browser tabs`);
    console.log(`     Enter different usernames to test peer discovery\n`);
  }
});

/**
 * GRACEFUL SHUTDOWN
 * 
 * If you press Ctrl+C or the process is killed:
 * 1. Stop accepting new connections
 * 2. Disconnect all peers gracefully
 * 3. Exit cleanly
 * 
 * WHY: Prevents data corruption and allows cleanup
 */
process.on('SIGTERM', () => {
  console.log('\n⏹️  Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
