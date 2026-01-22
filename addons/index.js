import { GameEngine } from '/sc/main.js';
import { AddonLoader } from '/sc/addons/addon-loader.js';

class StarCraftLikeRTS {
    constructor() {
        this.gameEngine = new GameEngine();
        
        console.log('📍 Current location:', window.location.href);
        console.log('📂 Script path:', import.meta.url);
        
        // IMPORTANT: Use absolute path for XAMPP
       // this.addonLoader = new AddonLoader(this.gameEngine, '/sc/addons/');
        
      //  this.players = new Map();
      //  this.gameState = 'lobby';
       // this.currentPlayerId = null;
      //  this.lastFrameTime = 0;
        this.isInitialized = false;
		

        // Make addonLoader accessible from gameEngine
        this.gameEngine.getAddon = (name) => this.addonLoader.getAddon(name);
        this.gameEngine.players = new Map(); // Initialize players map
        
        console.log('📍 Current location:', window.location.href);
        console.log('📂 Script path:', import.meta.url);
        
        this.addonLoader = new AddonLoader(this.gameEngine, '/sc/addons/');
        
        this.players = this.gameEngine.players; // Use the same map
        this.gameState = 'lobby';
        this.currentPlayerId = null;
        this.lastFrameTime = 0;
        this.isInitialized = false;
        this.gameLoopRunning = false;
    }

    async initialize() {
        console.log('🚀 Initializing StarCraft-like RTS...');
        
        try {
            // Create status display
            this.createStatusDisplay();
            this.updateStatus('Initializing game engine...', 'loading');
            
            // First initialize the game engine
            await this.gameEngine.init();
            this.updateStatus('Game engine initialized', 'success');
            
            // Define addons with ABSOLUTE paths for XAMPP
            const addonList = {
                // Core systems - using absolute paths
                'terrain': '/sc/addons/terrain/uneven-terrain.js',
                'resource': '/sc/addons/mechanics/resource.js',
                'combat': '/sc/addons/mechanics/combat.js',
                'basicAI': '/sc/addons/ai/basicAI.js'
            };
            
            this.updateStatus('Loading addons...', 'loading');
            
            // Load addons
            const results = await this.addonLoader.loadAddons(addonList);
            
            // Display results
            console.log('📊 Addon loading results:');
            const successCount = results.filter(r => r.success).length;
            
            if (successCount > 0) {
                this.updateStatus(`${successCount}/${results.length} addons loaded`, 'success');
            } else {
                this.updateStatus('No addons loaded successfully', 'error');
            }
            
            results.forEach(result => {
                if (result.success) {
                    console.log(`  ✅ ${result.name}: Loaded`);
                } else {
                    console.log(`  ❌ ${result.name}: ${result.error}`);
                }
            });
            
            // Set up event listeners
            this.setupEventListeners();
            this.updateStatus('Setting up event system...', 'loading');
            
            // Add a test player
            this.addTestPlayer();
            this.updateStatus('Test players added', 'success');
            
            // Mark game as initialized (this will trigger loading screen hide)
            this.isInitialized = true;
            if (window.markGameInitialized) {
                window.markGameInitialized();
            }
            
            // Start game loop
            this.startGameLoop();
            this.updateStatus('Game started! Click to interact', 'success');
            
            console.log('🎮 Game initialization complete!');
            
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            this.updateStatus(`Error: ${error.message}`, 'error');
            this.showError(error.message);
            
            // Still try to hide loading screen on error
            if (window.markGameInitialized) {
                window.markGameInitialized();
            }
        }
    }

    startGameLoop() {
        // Don't start multiple game loops
        if (this.gameLoopRunning) {
            console.warn('Game loop already running');
            return;
        }
        
        this.gameLoopRunning = true;
        let lastTime = 0;
        
        const tick = (currentTime) => {
            // Check if game should continue running
            if (!this.gameLoopRunning) return;
            
            const deltaTime = currentTime - lastTime || 0;
            lastTime = currentTime;
            
            // Update game
            this.update(deltaTime, currentTime);
            
            // Render
            this.render();
            
            // Continue loop
            requestAnimationFrame(tick);
        };
        
        // Start the game loop
        requestAnimationFrame(tick);
        console.log('🎮 Game loop started');
    }

    // Add a method to stop the game loop if needed
    stopGameLoop() {
        this.gameLoopRunning = false;
        console.log('⏹️ Game loop stopped');
    }
    createStatusDisplay() {
        // Remove existing status if any
        const existingStatus = document.getElementById('gameStatus');
        if (existingStatus) existingStatus.remove();
        
        // Create status element
        this.statusElement = document.createElement('div');
        this.statusElement.id = 'gameStatus';
        this.statusElement.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 14px;
            z-index: 1000;
            max-width: 300px;
            border-left: 4px solid #3498db;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(this.statusElement);
    }

    updateStatus(message, type = 'info') {
        if (!this.statusElement) return;
        
        const colors = {
            loading: '#3498db',
            success: '#2ecc71',
            error: '#e74c3c',
            info: '#f39c12'
        };
        
        const icons = {
            loading: '⏳',
            success: '✅',
            error: '❌',
            info: 'ℹ️'
        };
        
        this.statusElement.innerHTML = `
            <div style="margin-bottom: 5px; font-weight: bold;">
                ${icons[type] || icons.info} Game Status
            </div>
            <div>${message}</div>
        `;
        
        this.statusElement.style.borderLeftColor = colors[type] || colors.info;
        
        // Also log to console
        console.log(`📝 ${message}`);
    }

    setupEventListeners() {
        // Listen for addon events
        this.gameEngine.on('addon:loaded', (data) => {
            console.log(`📡 Addon ${data.name} is ready`);
        });
        
        // Listen for player events
        this.gameEngine.on('player:added', (player) => {
            console.log(`👤 Player ${player.id} (${player.name}) joined`);
            this.players.set(player.id, player);
            
            // Initialize resources for player if resource addon is loaded
            const resourceSystem = this.addonLoader.getAddon('resource');
            if (resourceSystem) {
                resourceSystem.addPlayerResources(player.id, { minerals: 50, vespene: 0 });
            }
        });
        
        // Listen for click events
        this.gameEngine.on('click', (data) => {
            console.log(`🖱️ Click at (${data.x}, ${data.y})`);
            
            // Create a unit at click location if combat system is loaded
            const combatSystem = this.addonLoader.getAddon('combat');
            if (combatSystem && this.currentPlayerId) {
                combatSystem.createUnit(this.currentPlayerId, 'marine', data.x, data.y);
                this.updateStatus(`Created marine at (${Math.round(data.x)}, ${Math.round(data.y)})`, 'info');
            }
        });
        
        // Listen for key events
        this.gameEngine.on('keydown', (event) => {
            if (event.key === 'r' || event.key === 'R') {
                this.addResources();
            } else if (event.key === 'u' || event.key === 'U') {
                this.createRandomUnit();
            } else if (event.key === ' ' || event.key === 'Spacebar') {
                this.togglePause();
            }
        });
    }

    addTestPlayer() {
        // Add human player
        const playerId = this.gameEngine.addPlayer({
            name: 'Player 1',
            race: 'Terran',
            isAI: false,
            color: '#3498db'
        });
        
        this.currentPlayerId = playerId;
        
        // Add an AI player if AI system is loaded
        const aiSystem = this.addonLoader.getAddon('basicAI');
        if (aiSystem) {
            const aiPlayerId = this.gameEngine.addPlayer({
                name: 'Computer',
                race: 'Zerg',
                isAI: true,
                difficulty: 'medium',
                color: '#e74c3c'
            });
            
            aiSystem.addAIPlayer(aiPlayerId, 'medium');
            console.log(`🤖 Added AI player: ${aiPlayerId}`);
        }
        
        console.log('👥 Test players added');
    }

    startGameLoop() {
        let lastTime = 0;
        
        const tick = (currentTime) => {
            const deltaTime = currentTime - lastTime || 0;
            lastTime = currentTime;
            
            // Update game
            this.update(deltaTime, currentTime);
            
            // Render
            this.render();
            
            // Continue loop
            requestAnimationFrame(tick);
        };
        
        // Start the game loop
        requestAnimationFrame(tick);
        console.log('🎮 Game loop started');
    }

    update(deltaTime, currentTime) {
        // Skip update if paused
        if (this.gameState === 'paused') return;
        
        // Update game engine
        this.gameEngine.update(deltaTime, currentTime);
        
        // Update AI players
        const aiSystem = this.addonLoader.getAddon('basicAI');
        if (aiSystem) {
            for (const [playerId, player] of this.players) {
                if (player.isAI) {
                    aiSystem.updateAI(playerId);
                }
            }
        }
        
        // Broadcast update to all addons
        this.addonLoader.broadcastEvent('update', { deltaTime, currentTime });
    }

    render() {
        const canvas = this.gameEngine.getCanvas();
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Clear canvas with a dark background
        ctx.fillStyle = '#0d1117';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Render terrain if available
        const terrain = this.addonLoader.getAddon('terrain');
        if (terrain && typeof terrain.render === 'function') {
            terrain.render(ctx);
        } else {
            // Fallback: draw grid
            this.drawGrid(ctx);
        }
        
        // Render debug info
        this.renderDebugInfo(ctx);
    }

    drawGrid(ctx) {
        const canvas = this.gameEngine.getCanvas();
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 1;
        
        const gridSize = 32;
        
        // Draw vertical lines
        for (let x = 0; x < canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let y = 0; y < canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
        
        // Draw coordinates at corners
        ctx.fillStyle = '#58a6ff';
        ctx.font = '12px Arial';
        ctx.fillText('(0,0)', 5, 15);
        ctx.fillText(`(${canvas.width},${canvas.height})`, canvas.width - 40, canvas.height - 5);
    }

    renderDebugInfo(ctx) {
        const canvas = this.gameEngine.getCanvas();
        
        // Draw game state info panel
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 200, 120);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px monospace';
        
        let y = 30;
        const lineHeight = 20;
        
        // Game state
        ctx.fillText(`State: ${this.gameState}`, 20, y);
        y += lineHeight;
        
        // Player count
        ctx.fillText(`Players: ${this.players.size}`, 20, y);
        y += lineHeight;
        
        // Addon count
        const addonCount = this.addonLoader.listAddons().length;
        ctx.fillText(`Addons: ${addonCount}`, 20, y);
        y += lineHeight;
        
        // Resources for current player
        if (this.currentPlayerId) {
            const resourceSystem = this.addonLoader.getAddon('resource');
            if (resourceSystem) {
                const resources = resourceSystem.getResources(this.currentPlayerId);
                ctx.fillText(`Minerals: ${resources.minerals}`, 20, y);
                y += lineHeight;
                ctx.fillText(`Vespene: ${resources.vespene}`, 20, y);
                y += lineHeight;
            }
        }
        
        // Controls hint
        ctx.fillStyle = '#58a6ff';
        ctx.font = '12px monospace';
        ctx.fillText('Controls: R=Resources, U=Unit, Space=Pause', 20, canvas.height - 20);
        
        // FPS
        if (this.lastFrameTime) {
            const fps = Math.round(1000 / (Date.now() - this.lastFrameTime));
            ctx.fillStyle = fps > 30 ? '#2ecc71' : '#e74c3c';
            ctx.fillText(`FPS: ${fps}`, canvas.width - 80, 25);
        }
        this.lastFrameTime = Date.now();
    }

    // Helper methods for controls
    addResources() {
        const resourceSystem = this.addonLoader.getAddon('resource');
        if (resourceSystem && this.currentPlayerId) {
            resourceSystem.addResources(this.currentPlayerId, 'minerals', 100);
            console.log(`➕ Added 100 minerals to player ${this.currentPlayerId}`);
            this.updateStatus('+100 minerals', 'success');
        }
    }

    createRandomUnit() {
        const combatSystem = this.addonLoader.getAddon('combat');
        if (combatSystem && this.currentPlayerId) {
            const x = Math.floor(Math.random() * 300) + 50;
            const y = Math.floor(Math.random() * 300) + 50;
            combatSystem.createUnit(this.currentPlayerId, 'marine', x, y);
            console.log(`🎖️ Created marine at (${x}, ${y})`);
            this.updateStatus(`Created unit at (${x}, ${y})`, 'info');
        }
    }

    togglePause() {
        this.gameState = this.gameState === 'playing' ? 'paused' : 'playing';
        console.log(`⏸️ Game ${this.gameState}`);
        this.updateStatus(`Game ${this.gameState}`, this.gameState === 'paused' ? 'error' : 'success');
    }

    showError(message) {
        // Create error display
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #e74c3c;
            color: white;
            padding: 20px 30px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            font-size: 16px;
            z-index: 1001;
            box-shadow: 0 8px 16px rgba(0,0,0,0.3);
            text-align: center;
            max-width: 500px;
            animation: fadeIn 0.3s ease-in;
        `;
        
        errorDiv.innerHTML = `
            <strong style="font-size: 18px;">⚠️ Initialization Error</strong><br><br>
            ${message}<br><br>
            <small style="opacity: 0.8;">Check browser console (F12) for details</small><br><br>
            <button onclick="this.parentNode.remove()" style="
                background: white;
                color: #e74c3c;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                font-weight: bold;
            ">Close</button>
        `;
        
        document.body.appendChild(errorDiv);
        
        // Add fadeIn animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; transform: translate(-50%, -60%); }
                to { opacity: 1; transform: translate(-50%, -50%); }
            }
        `;
        document.head.appendChild(style);
    }
}

// Start the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM loaded, starting game...');
    
    // Create game instance
    const game = new StarCraftLikeRTS();
    
    // Expose to window for debugging and controls
    window.rtsGame = game;
    
    // Initialize game
    game.initialize();
});