/**
 * webrtc-client.js
 * 
 * PURPOSE:
 * This module handles all WebRTC (Web Real-Time Communication) functionality:
 * - Capturing local audio/video streams
 * - Creating peer connections
 * - Exchanging WebRTC signaling (offer/answer/ICE)
 * - Displaying remote video/audio
 * - Cleaning up resources
 * 
 * WEBRTC BASICS FOR BEGINNERS:
 * 
 * PROBLEM: How do we stream video/audio between two peers?
 * SOLUTION: WebRTC - a browser API that creates P2P (peer-to-peer) connections
 * 
 * PROCESS:
 * 1. Get user's audio/video (getUserMedia) → Local Stream
 * 2. Create RTCPeerConnection → Prepare for P2P
 * 3. Add local stream to connection → "Here's my video"
 * 4. Exchange offers/answers → Negotiate connection parameters
 * 5. Exchange ICE candidates → Find network paths to reach each other
 * 6. Once connected, video/audio flows directly P2P (not through server!)
 * 
 * WHY NOT USE THE SERVER FOR STREAMING?
 * - Server would need MASSIVE bandwidth (video is expensive!)
 * - Latency would be higher (P2P is faster)
 * - Costs would be astronomical
 * - Not scalable (one server can't handle many concurrent calls)
 * 
 * P2P IS BETTER:
 * - Direct connection between peers
 * - Server only handles signaling (small messages)
 * - Lower latency
 * - Lower costs
 * - More scalable
 */

// ============================================================================
// LOCAL MEDIA MANAGER - Handle audio/video capture
// ============================================================================

export class LocalMediaManager {
  constructor() {
    /**
     * LOCAL STREAM
     * 
     * This is the audio/video from the user's camera/microphone
     * It contains:
     * - AudioTrack (microphone input)
     * - VideoTrack (camera input, or screen capture)
     * 
     * Initially null - we get it when user clicks "Start Call"
     */
    this.localStream = null;

    /**
     * MEDIA CONSTRAINTS
     * 
     * These tell the browser what kind of media we want:
     * 
     * audio: true
     * - Ask for microphone access
     * - Browser will prompt user: "This site wants to use your microphone"
     * - If user denies, getUserMedia() will fail
     * 
     * video: { width: 1280, height: 720 }
     * - Ask for camera access with 720p resolution
     * - Browser will prompt: "This site wants to use your camera"
     * - If camera can't do 720p, it will use lower resolution
     * - Specifying constraints helps with bandwidth
     * 
     * IMPORTANT SECURITY NOTE:
     * Browser will NOT give access without user permission!
     * This is why getUserMedia prompts the user.
     * (Unlike desktop apps, web can't secretly access camera)
     */
    this.constraints = {
      audio: true,
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    };
  }

  /**
   * REQUEST PERMISSION AND GET LOCAL MEDIA
   * 
   * This is called when the user clicks "Start Call"
   * 
   * WHAT IT DOES:
   * 1. Browser prompts user: "Allow access to camera and microphone?"
   * 2. If user clicks "Allow" → we get the media stream
   * 3. If user clicks "Deny" → promise rejects with error
   * 
   * RETURNS:
   * - Promise that resolves to MediaStream object
   * - MediaStream contains video/audio tracks
   * 
   * WHY ASYNC?
   * Getting permission takes time - user needs to see prompt and respond
   * Using async/await makes it easier to handle
   */
  async getUserMedia() {
    try {
      console.log('📹 Requesting camera and microphone access...');
      
      // Call the browser API to get media
      // IMPORTANT: This is the line that triggers the permission prompt
      this.localStream = await navigator.mediaDevices.getUserMedia(this.constraints);
      
      console.log('✅ Camera and microphone access granted');
      return this.localStream;
    } catch (error) {
      // Handle different types of errors
      if (error.name === 'NotAllowedError') {
        // User clicked "Deny" or browser blocked it (e.g., non-HTTPS IP access)
        console.error('❌ Camera/microphone access denied');
        
        // Check if accessing via IP address (insecure origin)
        const isNonSecureOrigin = !location.hostname.includes('localhost') && 
                                  !location.hostname.includes('127.0.0.1') && 
                                  location.protocol !== 'https:';
        
        if (isNonSecureOrigin) {
          throw new Error(
            'Browser blocked camera access on IP address.\n\n' +
            'SOLUTION:\n' +
            '1. Use localhost on this machine: http://localhost:3002\n' +
            '2. OR use HTTPS with a certificate\n\n' +
            'You can use the IP address on OTHER machines that connect to this one.'
          );
        } else {
          throw new Error('You must grant camera and microphone permissions');
        }
      } else if (error.name === 'NotFoundError') {
        // No camera/microphone found on device
        console.error('❌ No camera or microphone found');
        throw new Error('No camera or microphone found on this device');
      } else if (error.name === 'NotReadableError') {
        // Camera is in use by another application
        console.error('❌ Camera or microphone is in use by another app');
        throw new Error('Camera or microphone is already in use');
      } else {
        console.error('❌ Error getting media:', error);
        throw error;
      }
    }
  }

  /**
   * DISPLAY LOCAL STREAM IN VIDEO ELEMENT
   * 
   * Once we have the local stream, we need to show it on screen
   * so the user can see their own video
   * 
   * @param {HTMLVideoElement} videoElement - The <video> tag to show stream in
   * 
   * HOW IT WORKS:
   * We set videoElement.srcObject = localStream
   * The browser then displays the stream automatically
   */
  displayLocalStream(videoElement) {
    if (!this.localStream) {
      console.error('❌ No local stream available');
      return;
    }

    // Set the video element's source to our local stream
    videoElement.srcObject = this.localStream;

    // MUTED = true
    // The user doesn't want to hear their own microphone echoing back!
    // If muted = false, and speaker is turned up, user hears echo
    videoElement.muted = true;

    // When browser has loaded enough data to start showing video
    videoElement.onloadedmetadata = () => {
      // Play the video
      videoElement.play()
        .then(() => {
          console.log('✅ Local video playing');
        })
        .catch(error => {
          console.error('❌ Could not play local video:', error);
        });
    };
  }

  /**
   * STOP ALL LOCAL MEDIA
   * 
   * Call this when ending a call
   * 
   * WHY IMPORTANT?
   * If you don't stop the stream:
   * - Camera light stays on (user thinks camera is still recording!)
   * - Microphone stays on
   * - Battery drains faster
   * - Browser keeps requesting resources
   * 
   * WHAT IT DOES:
   * 1. Stop each track in the stream (video + audio)
   * 2. Clear the stream reference
   * 3. Clear the video element
   */
  stopLocalStream(videoElement) {
    // Stop all tracks (video + audio)
    if (this.localStream) {
      // getTracks() returns array of all MediaStreamTrack objects
      // For a normal call, this should have 2: [AudioTrack, VideoTrack]
      this.localStream.getTracks().forEach(track => {
        // Call stop() on each track
        // This tells the browser: "Stop accessing the microphone" or "Stop accessing the camera"
        track.stop();
        console.log(`⏹️  Stopped ${track.kind} track`);
      });

      // Clear the stream reference
      this.localStream = null;
    }

    // Clear the video element
    if (videoElement) {
      videoElement.srcObject = null;
      videoElement.pause();
    }

    console.log('✅ Local stream stopped');
  }

  /**
   * GET CURRENT LOCAL STREAM
   * 
   * Useful for checking if media is active
   * 
   * @returns {MediaStream|null} The local stream, or null if not active
   */
  getLocalStream() {
    return this.localStream;
  }
}

// ============================================================================
// PEER CONNECTION MANAGER - Handle WebRTC P2P connection
// ============================================================================

export class PeerConnection {
  constructor(peerId) {
    /**
     * PEER ID
     * 
     * The socket.io ID of the peer we're connecting to
     * Used for logging and routing messages back to them
     */
    this.peerId = peerId;

    /**
     * RTC PEER CONNECTION
     * 
     * This is the core WebRTC object that manages the P2P connection
     * It handles:
     * - Encryption between peers
     * - Codec negotiation
     * - ICE candidate gathering
     * - Renegotiation if connection drops
     * 
     * Created when we initialize this class
     * Destroyed when we close the connection
     */
    this.peerConnection = null;

    /**
     * LOCAL STREAM
     * 
     * Reference to the MediaStream from LocalMediaManager
     * We add this to peerConnection so the peer receives our audio/video
     */
    this.localStream = null;

    /**
     * REMOTE STREAM
     * 
     * The audio/video received from the peer
     * Populated when remote tracks arrive (ontrack event)
     * Displayed in a video element in the UI
     */
    this.remoteStream = null;

    /**
     * ICE CANDIDATES BUFFER
     * 
     * WHY DO WE NEED THIS?
     * 
     * PROBLEM: ICE candidates arrive BEFORE offer/answer is complete
     * If we try to add an ICE candidate before remoteDescription is set,
     * the browser throws an error!
     * 
     * SOLUTION: Buffer the candidates and add them AFTER negotiation is done
     * 
     * EXAMPLE FLOW:
     * 1. Browser finds ICE candidate → emit to peer ← fires immediately
     * 2. We receive other peer's offer → call setRemoteDescription
     * 3. Now the browser has remoteDescription
     * 4. We can safely call addIceCandidate() for buffered candidates
     */
    this.iceCandidatesBuffer = [];

    /**
     * IS NEGOTIATING
     * 
     * Track whether we're in the middle of offer/answer negotiation
     * Used to know when it's safe to add ICE candidates
     */
    this.isNegotiating = false;

    /**
     * DATA CHANNEL (optional, not used in this app)
     * 
     * WebRTC also supports sending data (like text messages)
     * without using the server. But we only do audio/video here.
     */
    this.dataChannel = null;
  }

  /**
   * INITIALIZE THE PEER CONNECTION
   * 
   * This must be called before trying to create offer/answer
   * 
   * @param {MediaStream} localStream - The local audio/video stream
   * 
   * WHAT IT DOES:
   * 1. Creates RTCPeerConnection with STUN/TURN servers
   * 2. Adds local stream tracks to the connection
   * 3. Sets up event handlers
   */
  initialize(localStream) {
    console.log(`🔧 Initializing peer connection with ${this.peerId}`);

    this.localStream = localStream;

    /**
     * STUN/TURN SERVERS
     * 
     * PROBLEM: How do two peers behind routers find each other?
     * 
     * SCENARIO:
     * - Alice is behind home router #1 (192.168.1.5)
     * - Bob is behind home router #2 (192.168.1.6)
     * - Each router has a public IP (e.g., 82.34.22.11 and 94.23.45.67)
     * - Routers use NAT (Network Address Translation) to hide internal IPs
     * 
     * SOLUTION: STUN/TURN servers
     * 
     * STUN = Session Traversal Utilities for NAT
     * - Public server that helps peers discover their public IP
     * - Peer asks: "What's my public IP?"
     * - STUN replies: "Your public IP is 82.34.22.11"
     * - Peer shares this IP with other peer
     * - Other peer tries to connect directly via public IP
     * - Works in ~80% of cases
     * 
     * TURN = Traversal Using Relays around NAT
     * - Used when STUN doesn't work
     * - Relays video/audio through the TURN server
     * - More expensive (uses server bandwidth)
     * - Used as fallback
     * 
     * ICESERVERS:
     * List of STUN/TURN servers to use
     * Browser tries them in order and picks best one
     * 
     * FREE PUBLIC STUN SERVERS:
     * We use Google's public STUN servers (free to use)
     * In production, you'd run your own or pay for a TURN service
     */
    const iceServers = [
      {
        urls: [
          'stun:stun.l.google.com:19302',      // Google STUN server 1
          'stun:stun1.l.google.com:19302',     // Google STUN server 2
          'stun:stun2.l.google.com:19302',     // Google STUN server 3
          'stun:stun3.l.google.com:19302',     // Google STUN server 4
        ]
      }
      // In production, add TURN servers for better connectivity:
      // {
      //   urls: ['turn:your-turn-server.com:3478'],
      //   username: 'username',
      //   credential: 'password'
      // }
    ];

    /**
     * CREATE RTC PEER CONNECTION
     * 
     * RTCPeerConnection is the main WebRTC object
     * 
     * iceServers: List of STUN/TURN servers (above)
     * 
     * bundlePolicy: 'max-bundle'
     * - Use single network connection for all media
     * - More efficient than separate connections for audio/video
     */
    this.peerConnection = new RTCPeerConnection({
      iceServers: iceServers,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'  // RTCP (stats) uses same connection as RTP (media)
    });

    // ADD LOCAL STREAM TRACKS
    if (this.localStream) {
      // getTracks() returns array of [AudioTrack, VideoTrack]
      this.localStream.getTracks().forEach(track => {
        console.log(`📤 Adding ${track.kind} track to peer connection`);
        // addTrack(track, stream)
        // Tells peer connection: "Send this track to the other peer"
        this.peerConnection.addTrack(track, this.localStream);
      });
    }

    // =========================================================================
    // EVENT HANDLERS FOR RTC PEER CONNECTION
    // =========================================================================

    /**
     * "icegatheringstatechange" EVENT
     * 
     * Tracks ICE candidate gathering progress
     * 
     * STATES:
     * - "new" - just started
     * - "gathering" - actively gathering candidates
     * - "complete" - done gathering
     */
    this.peerConnection.addEventListener('icegatheringstatechange', () => {
      const state = this.peerConnection.iceGatheringState;
      console.log(`❄️  ICE gathering state: ${state}`);
    });

    /**
     * "icecandidate" EVENT - CRITICAL!
     * 
     * TRIGGERED: When browser discovers a network address it can be reached at
     * 
     * ICE CANDIDATE GATHERING PROCESS:
     * 1. Browser discovers local IP (192.168.1.5)
     * 2. Browser asks STUN server: "What's my public IP?" → gets 82.34.22.11
     * 3. Browser finds relay server IP (optional) → gets relay IP
     * 4. For each of these, browser fires "icecandidate" event
     * 5. Finally, browser fires "icecandidate" with event.candidate = null (done)
     * 
     * Each event has:
     * - event.candidate = An ICE candidate object (or null if gathering complete)
     * 
     * WHAT WE DO:
     * - If candidate exists → send it to the peer via WebSocket
     * - If candidate is null → we're done gathering
     * 
     * WHY SEND TO OTHER PEER?
     * The other peer needs to try all our addresses to see which one works
     */
    this.peerConnection.addEventListener('icecandidate', (event) => {
      if (event.candidate) {
        console.log(`❄️  Found ICE candidate`);

        // Send this candidate to the peer
        if (window.sendIceCandidate) {
          window.sendIceCandidate(event.candidate, this.peerId);
        }
      } else {
        // null candidate = done gathering
        console.log(`❄️  ICE gathering complete`);
      }
    });

    /**
     * "connectionstatechange" EVENT
     * 
     * TRIGGERED: When the overall connection state changes
     * 
     * STATES:
     * - "new" - just created
     * - "connecting" - trying to establish connection
     * - "connected" - connection is established!
     * - "disconnected" - temporary disconnection (trying to reconnect)
     * - "failed" - connection failed (can't reach peer)
     * - "closed" - user closed the connection
     * 
     * This is the main indicator of "call success" or "call failed"
     */
    this.peerConnection.addEventListener('connectionstatechange', () => {
      const state = this.peerConnection.connectionState;
      console.log(`🔌 Connection state: ${state}`);

      if (state === 'connected') {
        console.log(`✅ Peer connection established with ${this.peerId}`);
        if (window.onPeerConnectionEstablished) {
          window.onPeerConnectionEstablished(this.peerId);
        }
      } else if (state === 'failed') {
        console.error(`❌ Peer connection failed with ${this.peerId}`);
        if (window.onPeerConnectionFailed) {
          window.onPeerConnectionFailed(this.peerId);
        }
      } else if (state === 'disconnected') {
        console.warn(`⚠️  Peer connection disconnected`);
      }
    });

    /**
     * "track" EVENT - CRITICAL!
     * 
     * TRIGGERED: When we receive an audio/video track from the peer
     * 
     * This is how we get the remote peer's video/audio!
     * 
     * event.track = The incoming MediaStreamTrack (video or audio)
     * event.streams = Array of MediaStream objects containing the track
     */
    this.peerConnection.addEventListener('track', (event) => {
      console.log(`📥 Received ${event.track.kind} track from peer`);

      // event.streams[0] is the MediaStream containing this track
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];

        // Notify the UI: "Remote video is ready"
        if (window.onRemoteStreamReceived) {
          window.onRemoteStreamReceived(this.remoteStream, this.peerId);
        }
      }
    });

    /**
     * "signalingstatechange" EVENT
     * 
     * Tracks offer/answer negotiation state
     * 
     * STATES:
     * - "stable" - no negotiation happening
     * - "have-local-offer" - we created an offer, waiting for answer
     * - "have-remote-offer" - peer sent us an offer, we should send answer
     * - "have-local-pranswer" / "have-remote-pranswer" - provisional (rare)
     * 
     * Mostly for debugging - connection state is more important
     */
    this.peerConnection.addEventListener('signalingstatechange', () => {
      const state = this.peerConnection.signalingState;
      console.log(`📡 Signaling state: ${state}`);
      this.isNegotiating = state !== 'stable';
    });

    console.log(`✅ Peer connection initialized`);
  }

  /**
   * CREATE AND SEND WEBRTC OFFER
   * 
   * Called when WE initiate the call (we're the caller)
   * 
   * WHAT IS AN OFFER?
   * A message that says: "Hey, I want to establish a P2P connection"
   * It includes:
   * - Our video/audio codecs
   * - Our connection fingerprint (security)
   * - Placeholder for our ICE candidates (will be filled as browser discovers them)
   * 
   * RETURN:
   * - Promise resolving to SDP offer object
   * 
   * WHAT HAPPENS NEXT:
   * 1. Browser generates SDP offer
   * 2. We set it as our "local description"
     * 3. We send it to peer via WebSocket
     * 4. Peer receives it and calls createAnswer()
     * 5. We receive answer back
     * 6. We set answer as "remote description"
     * 7. Connection negotiation is complete
     * 8. Then we exchange ICE candidates
   */
  async createOffer() {
    try {
      console.log(`📝 Creating WebRTC offer...`);

      // Generate the offer
      // IMPORTANT: generateOffer() will fail if peerConnection not initialized!
      const offer = await this.peerConnection.createOffer({
        // Optional settings (defaults work fine for most cases)
        offerToReceiveAudio: true,   // We want to receive audio
        offerToReceiveVideo: true    // We want to receive video
      });

      /**
       * SET LOCAL DESCRIPTION
       * 
       * THIS IS CRITICAL!
       * 
       * We just created the offer in memory, but the peer connection
       * doesn't know about it yet.
       * 
       * setLocalDescription() tells the peer connection:
       * "This is what WE agreed to. Store it."
       * 
       * WHAT IT DOES:
       * - Stores the offer as our "local description"
       * - Starts ICE candidate gathering
       * - Changes signaling state to "have-local-offer"
       * 
       * AFTER THIS:
       * - Browser starts emitting "icecandidate" events
       * - We relay each candidate to the peer
       */
      await this.peerConnection.setLocalDescription(offer);
      console.log(`✅ Local description set (offer)`);

      /**
       * SEND OFFER TO PEER
       * 
       * Now send the offer SDP to the peer via WebSocket
       * The peer will receive it in the "offer" event
       */
      if (window.sendOffer) {
        window.sendOffer(offer, this.peerId);
      }

      return offer;
    } catch (error) {
      console.error(`❌ Error creating offer:`, error);
      throw error;
    }
  }

  /**
   * CREATE AND SEND WEBRTC ANSWER
   * 
   * Called when we RECEIVE a call (we're the answerer)
   * 
   * FLOW:
   * 1. Peer sends us offer
   * 2. We call setRemoteDescription(offer) to store their offer
   * 3. Browser validates the offer
   * 4. We call createAnswer() to respond
   * 5. We send answer back to peer
   * 6. Peer receives answer and calls setRemoteDescription(answer)
   * 7. Now both have each other's descriptions
   * 8. They start exchanging ICE candidates
   * 
   * @param {object} offer - The SDP offer received from peer
   * 
   * RETURN:
   * - Promise resolving to SDP answer object
   */
  async handleOfferAndCreateAnswer(offer) {
    try {
      console.log(`📥 Received offer, creating answer...`);

      /**
       * SET REMOTE DESCRIPTION
       * 
       * THIS IS CRITICAL!
       * 
       * The offer from the peer is here. We need to store it.
       * 
       * setRemoteDescription() tells our peer connection:
       * "The OTHER peer agreed to these terms. Store them."
       * 
       * WHAT IT DOES:
       * - Stores the offer as "remote description"
       * - Validates the offer against our capabilities
       * - Changes signaling state to "have-remote-offer"
       * - Now it's safe to add ICE candidates from the peer
       * 
       * IMPORTANT GOTCHA:
       * If we haven't set remoteDescription, calling addIceCandidate()
       * for candidates from the peer will fail!
       * This is why we buffer ICE candidates.
       */
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      console.log(`✅ Remote description set (received offer)`);

      // Now generate our answer
      const answer = await this.peerConnection.createAnswer();

      // Set our answer as local description
      await this.peerConnection.setLocalDescription(answer);
      console.log(`✅ Local description set (answer)`);

      // Send answer back to peer
      if (window.sendAnswer) {
        window.sendAnswer(answer, this.peerId);
      }

      // NOW IT'S SAFE TO ADD BUFFERED ICE CANDIDATES
      // The peer might have sent us candidates before we set remote description
      // Now we can add them
      await this.addBufferedIceCandidates();

      return answer;
    } catch (error) {
      console.error(`❌ Error handling offer:`, error);
      throw error;
    }
  }

  /**
   * HANDLE RECEIVED ANSWER
   * 
   * Called when we receive the answer to our offer
   * 
   * FLOW (continuing from createOffer):
   * 1. We sent offer to peer
   * 2. Peer received it and sent back answer
   * 3. We receive answer here
   * 4. We call setRemoteDescription(answer)
   * 5. Negotiation is complete!
   * 6. Now we can add ICE candidates
   * 
   * @param {object} answer - The SDP answer from peer
   */
  async handleAnswer(answer) {
    try {
      console.log(`📥 Received answer, completing negotiation...`);

      /**
       * SET REMOTE DESCRIPTION
       * 
       * Store the peer's answer as remote description
       * 
       * After this, signaling state returns to "stable"
       * Offer/answer negotiation is complete!
       */
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      console.log(`✅ Remote description set (received answer)`);

      // NOW IT'S SAFE TO ADD BUFFERED ICE CANDIDATES
      await this.addBufferedIceCandidates();

      return answer;
    } catch (error) {
      console.error(`❌ Error handling answer:`, error);
      throw error;
    }
  }

  /**
   * ADD A SINGLE ICE CANDIDATE
   * 
   * Called when we receive an ICE candidate from the peer
   * 
   * ICE CANDIDATE = Network address the peer can be reached at
   * 
   * GOTCHA FOR BEGINNERS:
   * Can't add ICE candidate until remoteDescription is set!
   * If we try to add before remote description, browser throws error
   * 
   * SOLUTION: Buffer candidates if remote description not yet set
   * 
   * @param {object} candidate - The ICE candidate object from peer
   */
  async addIceCandidate(candidate) {
    // Ignore null candidates (signifies end of gathering)
    if (!candidate) {
      return;
    }

    try {
      // Check if remote description is set
      if (!this.peerConnection.remoteDescription) {
        // Not ready yet - buffer this candidate
        console.log(`⏸️  Buffering ICE candidate (remote description not yet set)`);
        this.iceCandidatesBuffer.push(candidate);
        return;
      }

      // Safe to add - remote description is set
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log(`✅ Added ICE candidate`);
    } catch (error) {
      // Some errors are expected (e.g., duplicate candidates)
      // Only log if it's not a known harmless error
      if (!error.message.includes('already added')) {
        console.warn(`⚠️  Error adding ICE candidate:`, error.message);
      }
    }
  }

  /**
   * ADD ALL BUFFERED ICE CANDIDATES
   * 
   * Called after remote description is set
   * 
   * REASON:
   * While we were doing offer/answer negotiation,
     * we might have received ICE candidates but couldn't add them.
     * Now that remote description is set, we can add all of them.
   */
  async addBufferedIceCandidates() {
    console.log(`📋 Adding ${this.iceCandidatesBuffer.length} buffered ICE candidates`);

    // Add each buffered candidate
    for (const candidate of this.iceCandidatesBuffer) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.warn(`⚠️  Error adding buffered candidate:`, error.message);
      }
    }

    // Clear the buffer
    this.iceCandidatesBuffer = [];
    console.log(`✅ All buffered ICE candidates added`);
  }

  /**
   * GET REMOTE STREAM
   * 
   * Returns the remote peer's audio/video stream
   * Use this to display in a video element
   * 
   * @returns {MediaStream|null}
   */
  getRemoteStream() {
    return this.remoteStream;
  }

  /**
   * CLOSE THE PEER CONNECTION
   * 
   * Call this when user clicks "End Call"
   * 
   * WHY IMPORTANT?
   * If you don't close:
   * - Connection stays open (wasting resources)
   * - Memory leaks (event handlers not cleaned up)
   * - Browser keeps sending media to peer
   * 
   * WHAT IT DOES:
   * 1. Close all data channels (if any)
   * 2. Stop all sending/receiving
   * 3. Release all resources
   * 4. Emit "connectionstatechange" with state "closed"
   */
  close() {
    if (this.peerConnection) {
      console.log(`🔌 Closing peer connection`);

      // Close data channels if any exist
      if (this.dataChannel) {
        this.dataChannel.close();
      }

      // Close the peer connection itself
      // This stops all media and tears down the connection
      this.peerConnection.close();
      this.peerConnection = null;

      // Clear streams
      this.localStream = null;
      this.remoteStream = null;
      this.iceCandidatesBuffer = [];

      console.log(`✅ Peer connection closed`);
    }
  }

  /**
   * GET CONNECTION STATE
   * 
   * Check the current state of the connection
   * 
   * @returns {string} One of: "new", "connecting", "connected", "disconnected", "failed", "closed"
   */
  getConnectionState() {
    return this.peerConnection?.connectionState || 'closed';
  }

  /**
   * GET PEER ID
   * 
   * @returns {string} The socket ID of the peer
   */
  getPeerId() {
    return this.peerId;
  }
}
