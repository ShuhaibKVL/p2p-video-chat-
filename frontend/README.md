# P2P Video Chat Application - Frontend

A Next.js React application for peer-to-peer video and audio chat using WebRTC and Socket.io.

## 📋 Overview

This is the **frontend web application** for the P2P video chat. It provides:

1. **User interface** - Register, select peers, accept/decline calls
2. **WebSocket client** - Connects to signaling server
3. **WebRTC client** - Manages peer connections and media
4. **Video display** - Shows local and remote video feeds

## 🎯 How It Works

```
┌─────────────────────────────────────────────────────┐
│                  BROWSER (You)                      │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐ │
│ │ React UI (index.js)                             │ │
│ │ - Register form                                 │ │
│ │ - Peer list                                     │ │
│ │ - Video display                                 │ │
│ │ - Call buttons                                  │ │
│ └─────────────────────────────────────────────────┘ │
│           ↓                                   ↓     │
│ ┌──────────────────────┐   ┌────────────────────┐  │
│ │ Socket.io Client     │   │ WebRTC Client      │  │
│ │ - Connect to server  │   │ - Capture audio/   │  │
│ │ - Send/receive       │   │   video            │  │
│ │   signaling messages │   │ - Create peer conn │  │
│ │ - Relay offers/      │   │ - Exchange offers/ │  │
│ │   answers            │   │   answers          │  │
│ │ - Relay ICE          │   │ - Exchange ICE     │  │
│ └──────────────────────┘   └────────────────────┘  │
│           ↓                           ↓              │
│  ┌────────┴──────────┐        ┌──────┴─────────┐   │
└──│      Server       │        │   Peer Browser  │───┘
   │  (Relay signaling)│        │  (Direct P2P)   │
   └───────────────────┘        └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 14+ and npm
- A code editor
- Two browser tabs (to test with two peers)

### Installation

1. **Navigate to frontend folder**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

   You should see:
   ```
   > next dev
   
   > ready - started server on 0.0.0.0:3000, url: http://localhost:3000
   ```

4. **Open in browser**
   - Visit: http://localhost:3000

### Testing with Two Peers

1. **Open two browser tabs:**
   - Tab 1: http://localhost:3000
   - Tab 2: http://localhost:3000 (in a different browser or incognito tab)

2. **In Tab 1:**
   - Enter name: "Alice"
   - Click "Register"

3. **In Tab 2:**
   - Enter name: "Bob"
   - Click "Register"

4. **In Tab 1 (Alice):**
   - You should see "Bob" in the peer list
   - Click "📞 Call" next to Bob

5. **In Tab 2 (Bob):**
   - You should see "📞 Alice is calling..." notification
   - Click "✅ Accept"

6. **Both tabs:**
   - Local video should appear (your camera)
   - Remote video should appear (the other person's camera)
   - You should hear audio
   - Click "🛑 End Call" to disconnect

## 📂 File Structure

```
frontend/
├── pages/
│   ├── index.js              # Main UI (React component)
│   ├── _app.js              # Next.js app wrapper
│   ├── _document.js         # HTML document structure
│   └── api/                 # (Optional) API routes
├── public/
│   └── js/
│       ├── socket-client.js   # WebSocket/Socket.io setup
│       ├── webrtc-client.js   # WebRTC peer connection
│       └── call-flow.js       # Orchestration logic
├── styles/
│   └── globals.css          # Global styles
├── package.json             # Dependencies
├── .env.local              # Environment variables
├── next.config.js          # Next.js configuration
└── .gitignore             # Ignored files
```

## 🔧 Configuration

Edit `.env.local` to change settings:

```bash
# WebSocket server URL (must match server's PORT in .env)
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

**Note:** Variables starting with `NEXT_PUBLIC_` are exposed to the browser.

## 📱 UI Walkthrough

### 1. Registration Section
```
┌─────────────────────────────┐
│ 📝 Register                 │
├─────────────────────────────┤
│ [Enter your name      ]     │
│ [Register Button      ]     │
│ 💡 Register with a name...  │
└─────────────────────────────┘
```

- User enters their display name
- Clicks "Register" to connect to server
- Server responds with list of available peers

### 2. Peer List Section
```
┌─────────────────────────────┐
│ 👥 Available Peers (2)      │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ Alice    [📞 Call]      │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Charlie  [📞 Call]      │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

- Shows all other connected peers
- Peers are added/removed in real-time
- Click "📞 Call" to request a connection

### 3. Incoming Call Notification
```
┌─────────────────────────────┐
│ 📞 Alice is calling...      │
├─────────────────────────────┤
│ [✅ Accept] [❌ Decline]    │
└─────────────────────────────┘
```

- Appears when someone requests a call
- Click "Accept" to start video stream
- Click "Decline" to reject

### 4. Video Section
```
┌──────────────────────────────────────┐
│ 🎬 Video Call                        │
├──────────────────────────────────────┤
│ ┌────────────┐ ┌────────────┐       │
│ │Your Video  │ │ Bob's Video│       │
│ │            │ │            │       │
│ │[Camera]    │ │[Camera]    │       │
│ └────────────┘ └────────────┘       │
│ [🛑 End Call]                        │
└──────────────────────────────────────┘
```

- Shows both local (you) and remote (peer) video
- Local video is muted (you don't hear yourself)
- Click "🛑 End Call" to disconnect

## 📚 JavaScript Modules

### 1. socket-client.js

**Purpose:** WebSocket/Socket.io connection and signaling

**Key Functions:**
- `initializeSocket()` - Connect to server
- `registerPeer(username)` - Tell server your name
- `requestCall(targetUsername)` - Ask to call someone
- `sendOffer(offer, targetSocketId)` - Send WebRTC offer
- `sendAnswer(answer, targetSocketId)` - Send WebRTC answer
- `sendIceCandidate(candidate, targetSocketId)` - Send ICE candidate

**Events Listened:**
- `peer-registered` - You're registered
- `peer-joined` - New peer connected
- `incoming-call` - Someone calling you
- `offer` - Peer sends connection offer
- `answer` - Peer responds to your offer
- `ice-candidate` - Peer sends network address
- `call-ended` - Peer ended call

### 2. webrtc-client.js

**Purpose:** WebRTC peer connection and media management

**Classes:**

#### LocalMediaManager
```javascript
// Get camera and microphone
await mediaManager.getUserMedia()

// Show video on screen
mediaManager.displayLocalStream(videoElement)

// Stop recording
mediaManager.stopLocalStream(videoElement)
```

#### PeerConnection
```javascript
// Initialize with local stream
peerConnection.initialize(localStream)

// Create offer (we're calling)
await peerConnection.createOffer()

// Handle offer from peer (they're calling)
await peerConnection.handleOfferAndCreateAnswer(offer)

// Handle answer from peer
await peerConnection.handleAnswer(answer)

// Add ICE candidate
peerConnection.addIceCandidate(candidate)

// Close connection
peerConnection.close()
```

### 3. call-flow.js

**Purpose:** Orchestrate everything (UI + Socket + WebRTC)

**Main Functions:**
- `initializeApp()` - Set up everything
- `handleRegisterPeer(username)` - User entered name
- `handleRequestCall(username, socketId)` - User clicked "Call"
- `handleAcceptCall(fromSocketId, username)` - User clicked "Accept"
- `handleEndCall()` - User clicked "End Call"
- `cleanup()` - Clean up resources

**Event Handlers:**
- `onPeerRegistered()` - Server confirmed registration
- `onPeerJoined()` - Another peer connected
- `onIncomingCall()` - Someone calling us
- `onOffer()` - Peer sent offer, create answer
- `onAnswer()` - Peer sent answer, connection ready
- `onIceCandidate()` - Peer sent network address
- `onRemoteStreamReceived()` - Peer's video arrived
- `onPeerConnectionEstablished()` - Call connected!

### 4. index.js (React Component)

**Purpose:** UI and user interactions

**State:**
```javascript
const [currentUsername, setCurrentUsername] = useState('')
const [availablePeers, setAvailablePeers] = useState([])
const [isInCall, setIsInCall] = useState(false)
const [incomingCall, setIncomingCall] = useState(null)
// ...
```

**Key JSX Elements:**
- Registration form
- Peer list with "Call" buttons
- Incoming call notification
- Video display (local + remote)
- Call control buttons

## 🎓 Key Concepts

### getUserMedia() - Capture Audio/Video

```javascript
// Ask for permission and get media
const stream = await navigator.mediaDevices.getUserMedia({
  audio: true,
  video: { width: 1280, height: 720 }
});

// Browser shows prompt: "Allow access to camera/microphone?"
// User clicks Allow → we get the stream
// User clicks Deny → promise rejects
```

### RTCPeerConnection - P2P Connection

```javascript
// Create a peer connection
const pc = new RTCPeerConnection({
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302'] }
  ]
});

// Add our audio/video
stream.getTracks().forEach(track => {
  pc.addTrack(track, stream);
});

// Create offer (we're calling)
const offer = await pc.createOffer();
await pc.setLocalDescription(offer);

// Send offer to other peer via server
socket.emit('offer', { offer, targetSocketId });
```

### SDP Offer/Answer - Connection Negotiation

**Alice (Caller):**
1. Creates offer: "I want to use VP8 video and OPUS audio"
2. Sends to Bob via server
3. Waits for answer

**Bob (Called):**
1. Receives offer
2. Creates answer: "I agree to VP8 and OPUS"
3. Sends answer back via server

**Alice:**
1. Receives answer
2. Sets as remote description
3. Negotiation complete! ✅

### ICE Candidates - Finding Each Other

**Alice:**
1. Browser discovers local IP: `192.168.1.5`
2. Browser asks STUN: "My public IP?" → `82.34.22.11`
3. Sends both to Bob as "candidates"

**Bob:**
1. Receives candidates
2. Tries local IP first (faster if same network)
3. Tries public IP if local doesn't work
4. First one that works = connection! ✅

## 🐛 Troubleshooting

### "Can't connect to server"
- Is the backend running? (`npm start` in `server/` folder)
- Does `.env.local` have correct `NEXT_PUBLIC_SOCKET_URL`?
- Check browser console for errors

### "No camera/microphone access"
- Did you grant permission when browser asked?
- Is another app using your camera? (Close it)
- Try incognito/private mode
- Check if HTTPS is required (some browsers require it)

### "I see my video but not theirs"
- Did peer accept the call?
- Are both peers in the call? (Check status messages)
- Give it 5-10 seconds for ICE candidates to be gathered
- Check browser console for errors

### "Audio/video is choppy"
- Internet connection might be slow
- Try closing other apps
- Check if WiFi signal is strong
- Both peers have to have decent bandwidth

### "Can't call anyone"
- Are there other peers? (Check peer list)
- Do they have your camera permission granted?
- Server might have crashed - restart it

## 📚 Learning Resources

- **Next.js Docs:** https://nextjs.org/docs
- **React Docs:** https://react.dev
- **WebRTC MDN Guide:** https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API
- **Socket.io Docs:** https://socket.io/docs/
- **getUserMedia API:** https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia

## 🔗 Related Files

- **Backend Server:** See `../server/README.md`
- **Socket Events:** Check comments in `public/js/socket-client.js`
- **WebRTC Details:** Check comments in `public/js/webrtc-client.js`

## 📝 License

MIT
