export default class NetworkCore {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.socket = null;
        this.roomId = null;
        this.playerId = null;
        this.connectedPlayers = new Map();
        this.isHost = false;
        this.latency = 0;
    }

    async init() {
        // WebSocket connection (you can swap with Socket.io later)
        this.socket = new WebSocket('ws://localhost:8080');
        
        this.socket.onmessage = (event) => {
            this.handleMessage(JSON.parse(event.data));
        };

        this.socket.onopen = () => {
            console.log('Connected to server');
            this.gameEngine.triggerEvent('network:connected');
        };

        return new Promise((resolve) => {
            this.socket.onopen = resolve;
        });
    }

    handleMessage(data) {
        switch (data.type) {
            case 'room_joined':
                this.roomId = data.roomId;
                this.playerId = data.playerId;
                this.isHost = data.isHost;
                this.gameEngine.triggerEvent('room:joined', data);
                break;
                
            case 'player_joined':
                this.connectedPlayers.set(data.playerId, data.playerInfo);
                this.gameEngine.triggerEvent('player:joined', data);
                break;
                
            case 'player_left':
                this.connectedPlayers.delete(data.playerId);
                this.gameEngine.triggerEvent('player:left', data);
                break;
                
            case 'game_state':
                this.gameEngine.applyGameState(data.state);
                break;
                
            case 'player_action':
                this.gameEngine.handlePlayerAction(data);
                break;
        }
    }

    sendAction(actionType, data) {
        const message = {
            type: 'player_action',
            roomId: this.roomId,
            playerId: this.playerId,
            action: actionType,
            data: data,
            timestamp: Date.now()
        };
        
        this.socket.send(JSON.stringify(message));
    }

    createRoom(roomName, gameSettings) {
        this.send('create_room', { roomName, gameSettings });
    }

    joinRoom(roomId) {
        this.send('join_room', { roomId });
    }

    send(type, data) {
        if (this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type, ...data }));
        }
    }
}