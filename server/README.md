# P2P Video Chat Application - Server

A WebSocket signaling server for peer-to-peer (P2P) video and audio chat using Node.js, Express, and Socket.io.

## 📋 Overview

This is the **backend signaling server** for the P2P video chat application. It does NOT handle video/audio streaming directly. Instead, it:

1. **Manages peer connections** - Keeps track of who's online
2. **Facilitates peer discovery** - Helps peers find each other
3. **Relays signaling messages** - Passes WebRTC offers, answers, and ICE candidates between peers
4. **Notifies peers** - Tells peer A that peer B wants to call

The actual **audio/video streaming is peer-to-peer** - it flows directly between peers using WebRTC, not through this server.

## 🎯 Why This Architecture?

```
Client A ←──── WebSocket (signaling) ────→ Server ←──── WebSocket (signaling) ────→ Client B
                                              ↑
                                    (Relays offers/answers/ICE)

Client A ←─────────────────────── WebRTC (media) ──────────────────────→ Client B
         (Audio/video flows directly - NO SERVER INVOLVED!)
```

**Benefits:**
- Server handles small messages only (not bandwidth-heavy)
- Lower latency (direct P2P connection)
- More scalable (one server can handle many calls)
- Lower costs

## 🚀 Quick Start

### Prerequisites

- Node.js 14+ and npm
- A terminal/command prompt

### Installation

1. **Navigate to server folder**
   ```bash
   cd server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

   You should see:
   ```
   ============================================================
   🎉 WebSocket Signaling Server Started
   ============================================================
   📍 Listening on port: 3001
   🌐 CORS enabled for: http://localhost:3000
   🔧 Environment: development
   ============================================================
   ```

### Testing

Run `npm run dev` for auto-restart on file changes:

```bash
npm run dev
```

Check server health:
```bash
curl http://localhost:3001/health
```

## 📂 File Structure

```
server/
├── server.js                 # Main server - all Socket.io event handlers
├── roomManager.js           # In-memory peer registry and management
├── package.json             # Node.js dependencies
├── .env                     # Environment configuration
└── .gitignore              # Ignored files for git
```

## 🔧 Configuration

Edit `.env` file to change settings:

```bash
# Server port
PORT=3001

# Allow connections from this origin (your Next.js frontend)
CORS_ORIGIN=http://localhost:3000

# Node environment
NODE_ENV=development
```

## 📡 Socket.io Events

### Server Emits (sends to clients)

| Event | When | Data |
|-------|------|------|
| `peer-registered` | Peer registers with username | `{ success, yourSocketId, availablePeers[] }` |
| `peer-joined` | New peer connects | `{ socketId, username }` |
| `peer-left` | Peer disconnects | `{ socketId, username }` |
| `incoming-call` | Peer A requests call with you | `{ fromSocketId, fromUsername }` |
| `call-rejected` | Your call request rejected | `{ rejectedBy, message }` |
| `offer` | Peer sends WebRTC offer | `{ offer, fromSocketId, fromUsername }` |
| `answer` | Peer sends WebRTC answer | `{ answer, fromSocketId, fromUsername }` |
| `ice-candidate` | Peer sends ICE candidate | `{ candidate, fromSocketId }` |
| `call-ended` | Peer ends the call | `{ fromUsername }` |

### Server Listens (receives from clients)

| Event | From | Data |
|-------|------|------|
| `register-peer` | Client | `{ username }` |
| `request-call` | Client | `{ targetUsername }` |
| `call-accepted` | Client | `{ fromSocketId }` |
| `call-declined` | Client | `{ targetSocketId }` |
| `offer` | Client | `{ offer, targetSocketId }` |
| `answer` | Client | `{ answer, targetSocketId }` |
| `ice-candidate` | Client | `{ candidate, targetSocketId }` |
| `end-call` | Client | `{ targetSocketId }` |

## 🎓 Key Concepts Explained

### WebSocket (Socket.io)

**What?** A two-way communication channel between client and server.

**Why?** HTTP is request-response only. WebSocket allows server to push notifications to clients in real-time.

**How?** Browser initiates WebSocket handshake, then both can send/receive messages instantly.

### Signaling

**What?** Exchanging metadata about the connection (codecs, network info) BEFORE streaming.

**Why?** Peers need to agree on how to talk before streaming video/audio.

**Examples:**
- "I support VP8 video codec"
- "My public IP is 82.34.22.11"
- "Use this encryption fingerprint"

### SDP (Session Description Protocol)

**What?** A text format for describing media sessions.

**Example SDP Offer:**
```
v=0
o=- 123456 2 IN IP4 127.0.0.1
s=-
...
a=rtpmap:96 VP8/90000
a=rtpmap:97 OPUS/48000
```

**Translation:** "I want to use VP8 for video and OPUS for audio"

### ICE (Interactive Connectivity Establishment)

**What?** A protocol for finding network paths between peers.

**Scenario:**
- Alice is behind WiFi router (NAT)
- Bob is behind cable router (NAT)
- They don't know each other's real IP addresses
- ICE helps them discover possible addresses

**Process:**
1. Alice discovers her local IP: `192.168.1.5`
2. Alice asks STUN server: "What's my public IP?" → `82.34.22.11`
3. Alice sends both as "candidates" to Bob
4. Bob tries each one until one works

### STUN/TURN Servers

**STUN** (Simple, cheap):
- Helps peer discover their public IP
- Works in ~80% of cases

**TURN** (More complex, expensive):
- Relays media when STUN doesn't work
- Used as fallback for edge cases

## 🐛 Debugging

### Enable verbose logging

In `server.js`, change:
```javascript
debug: false  // Change to true
```

### Monitor active peers

The server logs all peer activity:
```
✅ Peer registered: Alice (socket-123)
✅ Peer registered: Bob (socket-456)
📞 Call request: Alice → Bob
📤 Offer from Alice → socket-456
📥 Answer from Bob → socket-123
❄️  ICE gathering complete
🛑 Call ended by Alice
```

### Health check

```bash
curl http://localhost:3001/health

# Response:
# {
#   "status": "ok",
#   "connectedPeers": 2,
#   "timestamp": "2024-01-01T12:00:00.000Z"
# }
```

## 📚 Learning Resources

- **Socket.io Docs:** https://socket.io/docs/
- **WebRTC MDN Guide:** https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API
- **ICE Protocol RFC:** https://tools.ietf.org/html/rfc8445
- **SDP Spec:** https://tools.ietf.org/html/rfc4566

## ⚠️ Important Notes

### Development vs Production

This is a **learning implementation**. For production:

1. **Authenticate peers** - Verify users before registering
2. **Use TURN servers** - For reliable NAT traversal
3. **Add database** - Store call history, user data
4. **Enable HTTPS/WSS** - Encrypt connections
5. **Add logging** - For monitoring and debugging
6. **Rate limiting** - Prevent abuse
7. **Scaling** - Use Redis for multi-server setups

### Security Considerations

- **No authentication** - Anyone can register with any name
- **CORS wide open** - In development only. Restrict in production!
- **No encryption** - WebRTC payload is encrypted, but signaling is plaintext
- **Memory leaks possible** - In-memory storage is lost on restart

## 🔗 Related Files

- **Frontend:** See `../frontend/README.md`
- **Socket Client:** `../frontend/public/js/socket-client.js`
- **Call Flow:** `../frontend/public/js/call-flow.js`

## 📝 License

MIT
