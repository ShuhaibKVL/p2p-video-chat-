/**
 * roomManager.js
 * 
 * PURPOSE:
 * This module manages the state of all connected peers in the signaling server.
 * It keeps track of which peers are connected, their metadata (username, socketId),
 * and provides methods to query and update peer information.
 * 
 * WHY WE NEED THIS:
 * - In a real application, Socket.io doesn't provide easy ways to search for peers by username
 * - We need to store mappings like: username → socketId, so we can route signaling messages correctly
 * - When a peer disconnects, we need to notify other peers and clean up their reference
 * 
 * IMPORTANT FOR BEGINNERS:
 * This is in-memory storage (will be lost on server restart). For production, 
 * you'd use Redis or a database, but in-memory is perfect for learning.
 */

export class RoomManager {
  constructor() {
    /**
     * STRUCTURE: Map of all connected peers
     * 
     * this.peers = {
     *   "socket-id-123": {
     *     socketId: "socket-id-123",
     *     username: "Alice",
     *     connectedTime: Date
     *   },
     *   ...
     * }
     * 
     * WHY Map instead of Object?
     * Maps are better for dynamic key-value storage and have methods like .get(), .set(), .delete()
     */
    this.peers = new Map();
  }

  /**
   * Registers a new peer when they connect
   * 
   * PARAMETERS:
   * - socketId: The unique Socket.io ID for this connection (provided by Socket.io)
   * - username: The display name the peer chose (e.g., "Alice")
   * 
   * WHAT HAPPENS:
   * We store the peer's info so we can find them later by username or socketId
   */
  registerPeer(socketId, username) {
    this.peers.set(socketId, {
      socketId: socketId,
      username: username,
      connectedTime: new Date()
    });
    console.log(`✅ Peer registered: ${username} (${socketId})`);
  }

  /**
   * Removes a peer from our registry
   * 
   * CALLED WHEN:
   * - A peer disconnects from the server
   * - The connection is lost
   * 
   * WHY:
   * If we don't remove them, other peers will keep trying to call a ghost peer!
   */
  unregisterPeer(socketId) {
    const peer = this.peers.get(socketId);
    if (peer) {
      console.log(`❌ Peer unregistered: ${peer.username} (${socketId})`);
      this.peers.delete(socketId);
    }
  }

  /**
   * Gets a peer's information by their username
   * 
   * USEFUL FOR:
   * When peer A wants to call peer B, A provides B's username
   * We use this method to find B's socketId so we can route the offer to B
   * 
   * RETURNS:
   * - The peer object if found (with socketId, username, etc.)
   * - undefined if the username doesn't exist
   */
  getPeerByUsername(username) {
    for (let peer of this.peers.values()) {
      if (peer.username === username) {
        return peer;
      }
    }
    return undefined; // Not found
  }

  /**
   * Gets a peer's information by their socketId
   * 
   * USEFUL FOR:
   * Looking up who a message came from (we always know the socketId from Socket.io)
   * 
   * RETURNS:
   * - The peer object if found
   * - undefined if socketId doesn't exist
   */
  getPeerBySocketId(socketId) {
    return this.peers.get(socketId);
  }

  /**
   * Returns list of all peers EXCEPT the one specified
   * 
   * USEFUL FOR:
   * When a peer joins, we send them a list of available peers to call
   * We exclude the requesting peer (they don't need to call themselves!)
   * 
   * PARAMETERS:
   * - excludeSocketId: The socket ID to exclude from results
   * 
   * RETURNS:
   * Array of peer objects, each with socketId, username, connectedTime
   */
  getAvailablePeers(excludeSocketId) {
    const available = [];
    for (let peer of this.peers.values()) {
      // FILTER: Only return peers that are NOT the requesting peer
      if (peer.socketId !== excludeSocketId) {
        available.push({
          socketId: peer.socketId,
          username: peer.username,
          connectedTime: peer.connectedTime
        });
      }
    }
    return available;
  }

  /**
   * Returns the total number of connected peers
   * 
   * USEFUL FOR:
   * Logging, monitoring, or displaying "X peers online" in the UI
   */
  getPeerCount() {
    return this.peers.size;
  }

  /**
   * Debugging: Print all connected peers to console
   * 
   * USEFUL FOR:
   * Development/testing to see the current state of the room
   */
  logAllPeers() {
    console.log(`\n📊 Total peers connected: ${this.peers.size}`);
    for (let peer of this.peers.values()) {
      const connectedFor = Date.now() - peer.connectedTime.getTime();
      const minutes = Math.floor(connectedFor / 60000);
      console.log(`   - ${peer.username} (${peer.socketId}) - connected ${minutes}m ago`);
    }
    console.log();
  }
}

/**
 * Export a singleton instance
 * 
 * WHY SINGLETON?
 * We want ONE room manager shared across the entire server.
 * If we created a new one for each event, we'd lose peer data!
 * 
 * This way, all Socket.io event handlers share the same peer registry
 */
export const roomManager = new RoomManager();
