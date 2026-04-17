# P2P Video Chat Application - Complete Setup Guide

A **beginner-friendly** peer-to-peer video and audio chat application built with:
- **Frontend:** Next.js + React (with WebRTC)
- **Backend:** Node.js + Express + Socket.io
- **Communication:** WebSocket (signaling) + WebRTC (P2P media)

## 🎯 What You'll Learn

By building and understanding this app, you'll learn:

✅ WebSocket basics and how Socket.io works  
✅ WebRTC peer-to-peer connections  
✅ Real-time signaling (offers, answers, ICE candidates)  
✅ Media streaming (audio and video)  
✅ Full-stack JavaScript development  
✅ How modern video chat apps work  

## 📁 Project Structure

```
c:\217\
├── server/                          # Backend signaling server
│   ├── server.js                   # Main server with Socket.io setup
│   ├── roomManager.js              # Peer registry management
│   ├── package.json                # Dependencies
│   ├── .env                        # Configuration
│   ├── README.md                   # Server documentation
│   └── .gitignore
│
├── frontend/                        # Frontend web app
│   ├── pages/
│   │   ├── index.js               # Main UI (React component)
│   │   ├── _app.js               # Next.js app wrapper
│   │   └── _document.js          # HTML structure
│   ├── public/js/
│   │   ├── socket-client.js       # WebSocket client setup
│   │   ├── webrtc-client.js       # WebRTC peer connection
│   │   └── call-flow.js           # Orchestration logic
│   ├── styles/
│   │   └── globals.css            # Global styles
│   ├── package.json               # Dependencies
│   ├── .env.local                # Configuration
│   ├── next.config.js            # Next.js config
│   ├── README.md                 # Frontend documentation
│   └── .gitignore
│
└── CONCEPTS.md                      # Learning guide (you are here!)
```

## 🚀 Getting Started

### Prerequisites

1. **Install Node.js**
   - Download: https://nodejs.org/
   - Version 14+ required
   - This includes npm (Node Package Manager)

2. **Install a Code Editor**
   - VS Code (recommended): https://code.microsoft.com/
   - Or any text editor

3. **Open a Terminal**
   - Windows: PowerShell or Command Prompt
   - Mac/Linux: Terminal

### Step 1: Start the Backend Server

```bash
# Open terminal and navigate to server folder
cd c:\217\server

# Install dependencies (only first time)
npm install

# Start the server
npm start
```

You should see:
```
🚀 WebSocket Signaling Server Started
📍 Listening on port: 3001
🌐 CORS enabled for: http://localhost:3000
```

**✅ Server is running!** Leave this terminal open.

### Step 2: Start the Frontend App

```bash
# Open ANOTHER terminal and navigate to frontend folder
cd c:\217\frontend

# Install dependencies (only first time)
npm install

# Start the frontend
npm run dev
```

You should see:
```
> next dev
> ready - started server on 0.0.0.0:3000
```

**✅ Frontend is running!** Now open your browser.

### Step 3: Test with Two Peers

1. **Open browser and go to:** http://localhost:3000

2. **Open two tabs:**
   - Tab 1: http://localhost:3000
   - Tab 2: http://localhost:3000 (use Ctrl+Shift+N for private/incognito mode)

3. **In Tab 1:**
   - Enter name: "Alice"
   - Click "Register"
   - Wait a moment...

4. **In Tab 2:**
   - Enter name: "Bob"
   - Click "Register"

5. **In Tab 1 (Alice's tab):**
   - Click "📞 Call" next to Bob

6. **In Tab 2 (Bob's tab):**
   - You see "📞 Alice is calling..."
   - Click "✅ Accept"

7. **Both tabs:**
   - Local video appears (your camera)
   - Remote video appears (other person's camera)
   - Audio is streaming!
   - Click "🛑 End Call" to disconnect

**Congrats! 🎉 You have a working P2P video chat!**

## 📚 Code Structure & Comments

Every file in this project has **detailed comments** explaining:
- What each function does
- Why it exists
- How WebSocket and WebRTC work
- What to modify to learn

### Key Files to Study (in order)

#### 1. **server.js** (Start here!)
Read through the comments to understand:
- How Socket.io events work
- What happens when a peer connects
- How signaling messages are relayed
- How connections are cleaned up

#### 2. **roomManager.js**
Understand:
- How we track connected peers
- Searching peers by username
- Getting available peers list

#### 3. **socket-client.js**
Learn:
- How to connect to a WebSocket server
- How to listen for events
- How to emit events
- Reconnection strategy

#### 4. **webrtc-client.js**
Understand:
- Getting user's camera/microphone
- Creating peer connections
- Exchanging offers and answers
- ICE candidate buffering
- Why we need each step

#### 5. **call-flow.js**
See how:
- Socket events trigger WebRTC actions
- WebRTC events trigger Socket emissions
- UI updates are orchestrated
- Everything flows together

#### 6. **index.js** (React component)
Understand:
- How React state works
- How to wire up button clicks
- How to display video
- How to show status messages

## 🎓 Learning Path

### Beginner (Just run it)
1. Get it working (follow above steps)
2. Test with two browsers
3. Watch the console logs

### Intermediate (Understand the flow)
1. Open browser DevTools (F12)
2. Look at Network tab → WS (WebSocket messages)
3. See offers, answers, ICE candidates being sent
4. Open browser Console to see logs
5. Read comments in each file

### Advanced (Modify and extend)
1. Add a **text chat feature**
   - Modify `server.js` to relay messages
   - Add `socket.on('chat-message', ...)`
   - Update UI to show messages

2. Add **multiple rooms**
   - Change registration to include room name
   - Use Socket.io rooms: `socket.join(roomName)`
   - Only show peers in same room

3. Add **call history**
   - Store peer-to-peer calls in database
   - Display "Call with Alice lasted 5 minutes"

4. Add **screen sharing**
   - Use `navigator.mediaDevices.getDisplayMedia()`
   - Add a track instead of video track
   - Let users switch between camera and screen

## 🔍 Debugging Tips

### "Connection refused" error
- **Problem:** Server not running
- **Fix:** Make sure you ran `npm start` in the server folder

### "CORS error" in browser console
- **Problem:** Frontend URL doesn't match CORS config
- **Fix:** Check `server/.env` and `frontend/.env.local` match

### "No camera access" error
- **Problem:** Browser permission denied or no camera
- **Fix:** 
  - Check browser permission (top-right of address bar)
  - Try another browser
  - Try incognito mode
  - Check if another app is using camera

### "I can't see their video"
- **Problem:** ICE candidates still being gathered
- **Fix:** Wait 5-10 seconds, check console for errors

### "Connection established but no media"
- **Problem:** Missing STUN servers or firewall blocking
- **Fix:** Check `webrtc-client.js` for STUN server list

## 📖 Study Each Module

### Socket.io Client (socket-client.js)

```javascript
// What happens when you call a function:

registerPeer('Alice')
    ↓
socket.emit('register-peer', { username: 'Alice' })
    ↓
[Message sent over WebSocket to server]
    ↓
Server receives, processes, responds
    ↓
socket.on('peer-registered', (data) => {...})
    ↓
Window function window.onPeerRegistered called
    ↓
call-flow.js updates state
    ↓
React updates UI
```

### WebRTC Client (webrtc-client.js)

```javascript
// LocalMediaManager
getUserMedia()                    // Ask for camera/mic permission
    ↓
Browser shows: "Allow access?"
    ↓
displayLocalStream(videoElement)  // Show in <video> tag
    ↓
User sees their own video

stopLocalStream()                 // When call ends
    ↓
camera/mic light turns off
```

```javascript
// PeerConnection
new PeerConnection(peerId)
    ↓
.initialize(localStream)          // Add local stream
    ↓
.createOffer() ──[via server]──> Peer
    ↓
Peer calls handleOfferAndCreateAnswer()
    ↓
.handleAnswer() ──[via server]──> Back to us
    ↓
addIceCandidate() ──[many times]──> Find path
    ↓
connectionState = 'connected'
    ↓
Video/audio flows directly P2P!
```

### Call Flow (call-flow.js)

```javascript
// The orchestrator that ties Socket.io + WebRTC + UI

handleRegisterPeer()
    ↓
registerPeer(username)     // Socket.io
    ↓
[Server processes]
    ↓
onPeerRegistered()         // Socket event
    ↓
callState.availablePeers = [...]
    ↓
updateUI()                 // React
    ↓
[UI updates peer list]
```

## 🧠 Key Concepts (Simplified)

### WebSocket (Socket.io)
- **Real-time text messages** between browser and server
- Like a text conversation (not like email)
- Server can send to you anytime (you don't have to ask)
- **Used for:** Signaling (offers, answers, ICE)

### WebRTC
- **Audio/video streams** between browsers
- Direct peer-to-peer (no server in middle)
- Uses WebSocket for initial handshake
- **Used for:** Actual video/audio streaming

### SDP Offer
```
Alice says: "I want to call you. Here's my stuff:"
- I can send VP8 video
- I can send OPUS audio
- My IP is 1.2.3.4
- My encryption key is ABC
```

### SDP Answer
```
Bob says: "I got it! Here's my stuff:"
- I agree to VP8 video
- I agree to OPUS audio
- My IP is 5.6.7.8
- My encryption key is DEF
```

### ICE Candidate
```
Alice: "Bob, try connecting to these IPs:"
- 192.168.1.5 (my local IP)
- 82.34.22.11 (my public IP)
- 1.2.3.4 (relay server)

[Bob tries each one]
[First one that works = success!]
```

## 🔗 Related Documentation

- **Server README:** [server/README.md](./server/README.md)
- **Frontend README:** [frontend/README.md](./frontend/README.md)
- **Concepts Guide:** [CONCEPTS.md](./CONCEPTS.md)
- **WebRTC Spec:** https://w3c.github.io/webrtc-pc/
- **Socket.io Docs:** https://socket.io/docs/

## 💡 What to Modify (Learning Exercises)

### Exercise 1: Add "typing" indicator
```javascript
// In socket-client.js, add:
export function notifyTyping() {
  socket.emit('user-typing', { username });
}

// In server.js, add:
socket.on('user-typing', (data) => {
  socket.broadcast.emit('someone-typing', data);
});
```

### Exercise 2: Add peer count display
```javascript
// In server.js:
io.emit('peer-count-updated', { count: roomManager.getPeerCount() });

// In socket-client.js:
socket.on('peer-count-updated', (data) => {
  if (window.onPeerCountUpdated) {
    window.onPeerCountUpdated(data.count);
  }
});
```

### Exercise 3: Add "user left" notification
```javascript
// Already in code! Look at:
socket.on('peer-left', (data) => {
  // This is already handled!
});
```

## ⚠️ Important Notes

### Security
This is a **learning project**, not production-ready.

For production, add:
- User authentication
- HTTPS/WSS encryption
- Rate limiting
- Input validation
- Logging/monitoring

### Performance
- In-memory peer storage (lost on restart)
- Single server (no scaling)
- No database (no persistence)

For production, use:
- Redis (distributed cache)
- PostgreSQL (persistent storage)
- Load balancer (multiple servers)
- CDN (global distribution)

### Browser Support
- Chrome/Chromium ✅
- Firefox ✅
- Safari (might need HTTPS)
- Edge ✅
- IE ❌ (not supported)

## 🆘 Getting Help

### Check These First

1. **Is the server running?**
   ```bash
   curl http://localhost:3001/health
   ```

2. **Is the frontend running?**
   - Visit http://localhost:3000
   - Should load (check console for errors)

3. **Browser Console (F12)**
   - Look for red errors
   - Look for yellow warnings
   - Check Network tab for WebSocket messages

4. **Terminal Output**
   - Server terminal should show logs
   - Frontend terminal should show build messages

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Cannot GET /` | Next.js not running | Run `npm run dev` |
| `ERR_CONNECTION_REFUSED` | Server not running | Run `npm start` in server/ |
| `CORS error` | Wrong CORS config | Check .env files |
| `Camera permission denied` | Browser permission | Click allow in browser |
| `WebSocket connection failed` | Wrong server URL | Check .env.local |

## 🎉 Next Steps

Once you have it working:

1. **Read the code** - Every function has comments
2. **Modify the UI** - Change colors, add buttons
3. **Add features** - Text chat, screen sharing, etc.
4. **Deploy** - Host on Heroku, Vercel, etc.
5. **Build your own** - Create a real app!

## 📝 License

MIT - Free to use for learning and projects!

---

**Made for beginners. Comments on every line. Learn as you code! 🚀**
