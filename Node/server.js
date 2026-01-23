const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

const rooms = new Map();

wss.on('connection', (ws) => {
    let playerId = generateId();
    let currentRoom = null;

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        
        switch (data.type) {
            case 'create_room':
                const roomId = generateId();
                rooms.set(roomId, {
                    id: roomId,
                    name: data.roomName,
                    host: playerId,
                    players: new Map([[playerId, { 
                        id: playerId, 
                        ready: false,
                        faction: null 
                    }]]),
                    gameState: null,
                    settings: data.gameSettings
                });
                currentRoom = roomId;
                ws.send(JSON.stringify({
                    type: 'room_created',
                    roomId: roomId,
                    playerId: playerId,
                    isHost: true
                }));
                break;

            case 'join_room':
                const room = rooms.get(data.roomId);
                if (room) {
                    room.players.set(playerId, {
                        id: playerId,
                        ready: false,
                        faction: null
                    });
                    currentRoom = data.roomId;
                    
                    // Notify all players
                    broadcastToRoom(room.id, {
                        type: 'player_joined',
                        playerId: playerId,
                        playerInfo: room.players.get(playerId)
                    });
                    
                    ws.send(JSON.stringify({
                        type: 'room_joined',
                        roomId: room.id,
                        playerId: playerId,
                        isHost: room.host === playerId,
                        players: Array.from(room.players.values())
                    }));
                }
                break;

            case 'player_action':
                if (currentRoom) {
                    const room = rooms.get(currentRoom);
                    broadcastToRoom(currentRoom, {
                        type: 'player_action',
                        playerId: playerId,
                        action: data.action,
                        data: data.data,
                        timestamp: data.timestamp
                    });
                }
                break;
        }
    });

    ws.on('close', () => {
        if (currentRoom) {
            const room = rooms.get(currentRoom);
            if (room) {
                room.players.delete(playerId);
                broadcastToRoom(currentRoom, {
                    type: 'player_left',
                    playerId: playerId
                });
                
                if (room.players.size === 0) {
                    rooms.delete(currentRoom);
                }
            }
        }
    });
});

function broadcastToRoom(roomId, message) {
    const room = rooms.get(roomId);
    if (!room) return;
    
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client.currentRoom === roomId) {
            client.send(JSON.stringify(message));
        }
    });
}

function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

console.log('WebSocket server running on ws://localhost:8080');