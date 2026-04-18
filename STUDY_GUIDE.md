# WebRTC + Socket.io Study Guide

This file is designed to help you learn and understand this project step-by-step. It explains what each main file does, where to start, and how to study the connection setup between the frontend and backend.

---

## 1. Project Overview

This project is a learning example for WebRTC video/audio calls using a Node.js signaling server.

- **Frontend:** `frontend/`
  - User interface built with Next.js and React
  - Uses WebRTC APIs for media and peer connections
  - Uses Socket.io client for signaling
- **Backend:** `server/`
  - Express + Socket.io signaling server
  - Relays messages such as `register-peer`, `request-call`, `offer`, `answer`, and `ice-candidate`
- **HTTPS support:** `server-https.js`
  - A local HTTPS wrapper so the browser can allow camera/microphone access on the LAN

---

## 2. How to Start Studying

### Step 1: Read the high-level flow

Start with the `README.md` in the root. It explains:
- purpose of the app
- how the frontend and backend talk
- how to run the app

### Step 2: Study the backend signaling flow

Open `server/server.js` and read the comments in this order:
1. `io.on('connection', ...)`
2. `socket.on('register-peer', ...)`
3. `socket.on('request-call', ...)`
4. `socket.on('call-accepted', ...)`
5. `socket.on('offer', ...)`, `socket.on('answer', ...)`, `socket.on('ice-candidate', ...)`
6. `socket.on('disconnect', ...)`

This is the signaling server. It does not stream media. It only helps peers find each other and pass connection messages.

### Step 3: Understand peer management

Read `server/roomManager.js` next. It explains:
- how peers are stored
- how usernames and socket IDs are matched
- how available peers are listed

This shows how the server keeps track of online users.

### Step 4: Learn the frontend socket connection

Read `frontend/public/js/socket-client.js`:
- how the client connects to the server
- how `process.env.NEXT_PUBLIC_SOCKET_URL` is used
- what Socket.io events the client listens for
- what events the client emits

This is where the frontend establishes the signaling channel.

### Step 5: Learn the WebRTC peer connection

Read `frontend/public/js/webrtc-client.js`:
- `getUserMedia()` for camera and microphone
- `RTCPeerConnection` creation
- creating and sending offers/answers
- ICE candidate handling
- displaying local/remote streams

This file is the core WebRTC behavior.

### Step 6: Study the orchestration logic

Read `frontend/public/js/call-flow.js`:
- how signaling events trigger WebRTC actions
- how WebRTC events trigger signaling emits
- how the app manages call state

This is the bridge between your UI, the socket client, and the WebRTC client.

### Step 7: Read the UI code

Read `frontend/pages/index.js`:
- how state is managed in React
- how buttons trigger events
- how the video elements are shown
- how status messages are displayed

This shows how the user interacts with the application.

---

## 3. Best order to read files

1. `README.md`
2. `server/server.js`
3. `server/roomManager.js`
4. `frontend/public/js/socket-client.js`
5. `frontend/public/js/webrtc-client.js`
6. `frontend/public/js/call-flow.js`
7. `frontend/pages/index.js`
8. `server-https.js` (if you want secure local testing)

---

## 4. Practical study steps

### Study step 1: Run the app

1. Start `server/` with `npm install` and `npm start`
2. Start `frontend/` with `npm install` and `npm run dev:https`
3. Open the app on `https://localhost:3002`
4. Open the app on the second device using `https://172.16.10.92:3002`

### Study step 2: Watch the browser console

Open the browser developer tools and watch the logs while:
- connecting to the server
- registering a username
- calling a peer
- accepting the call

This shows which events are sent and which are received.

### Study step 3: Follow the logs step-by-step

In the backend terminal and frontend console, watch this sequence:
- client connects to server
- server logs `New peer connected`
- client emits `register-peer`
- server emits `peer-registered`
- client shows other peers
- client emits `request-call`
- callee gets `incoming-call`
- callee emits `call-accepted`
- caller creates WebRTC offer
- caller sends `offer`
- callee sends `answer`
- both exchange `ice-candidate`
- remote video appears

### Study step 4: Change one thing and see what breaks

Try modifying a single step and re-run:
- comment out `socket.emit('ice-candidate')`
- remove `getUserMedia()`
- change the CORS origin

This helps you understand why each piece is required.

---

## 5. What each connection type does

### Socket.io / WebSocket
- Used for signaling only
- Sends small JSON messages
- Helps peers negotiate WebRTC
- Does not carry audio or video

### WebRTC
- Used for real-time audio/video
- Creates a direct P2P connection when possible
- Uses `RTCPeerConnection`, `offer`, `answer`, and `ice-candidate`
- Streams media directly between browsers

---

## 6. What to learn next

After you understand this repo, try:
- adding text chat over the same socket
- adding a room system for multiple rooms
- using STUN/TURN servers for NAT traversal
- supporting audio-only mode
- adding end-call cleanup improvements

---

## 7. Useful bookmarks for this repo

- `frontend/public/js/call-flow.js` - connect signaling and media logic
- `frontend/public/js/webrtc-client.js` - understand actual peer connection
- `server/server.js` - message relay and peer discovery
- `frontend/.env.local` - configure socket URL for secure connection
- `server-https.js` - local HTTPS support for camera access

---

## 8. Learning mindset

- Start small: get one peer connected first
- Don’t try to understand everything at once
- Follow the logs through the exact sequence of events
- Use the existing comments as your guide
- Change one file and see how behavior changes

Good luck studying WebRTC! This project is a great real-world example of how browser-to-browser media works with a signaling server.