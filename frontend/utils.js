/**
 * utils.js
 *
 * UTILITIES - Helper functions for the P2P video chat application
 *
 * This file contains utility functions that support the main component.
 * Separated for better organization and maintainability.
 */

// Module-level variables to store call-flow functions
let callFlowModule = null;
let callState = null;

/**
 * Update UI state from call-flow module
 * @param {Function} setters - Object containing all React state setters
 */
export function updateUI(setters) {
  if (!callState) return;

  const {
    setConnected,
    setCurrentUsername,
    setAvailablePeers,
    setIncomingCall,
    setIsInCall,
    setCallingPeerId,
    setCallPeerName,
    setHasRemoteStream
  } = setters;

  setConnected(callState.connected);
  setCurrentUsername(callState.username || '');
  setAvailablePeers([...(callState.availablePeers || [])]);
  setIncomingCall(callState.incomingCallData);
  setIsInCall(callState.isInCall);
  setCallingPeerId(callState.callingPeerId);
  setCallPeerName(callState.currentPeerUsername || '');
  setHasRemoteStream(!!callState.peerConnection?.remoteDescription);
}

/**
 * Display remote video stream in DOM element
 * @param {MediaStream} remoteStream - Remote video/audio stream
 * @param {Function} setHasRemoteStream - React state setter
 */
export function displayRemoteStream(remoteStream, setHasRemoteStream) {
  const remoteVideoElement = document.getElementById('remoteVideo');
  if (remoteVideoElement) {
    remoteVideoElement.srcObject = remoteStream;
    remoteVideoElement.play().catch(() => {});
  }
  setHasRemoteStream(true);
}

/**
 * Initialize call-flow module
 * @returns {Promise<Object>} Call-flow module
 */
export async function initializeCallFlow() {
  if (!callFlowModule) {
    callFlowModule = await import('./public/js/call-flow.js');
    callState = callFlowModule.callState;
  }
  return callFlowModule;
}