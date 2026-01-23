import { GameEngine } from './core/GameEngine.js';
import { GAME_VERSION } from './core/GameConstants.js';
import { Building } from './entities/Building.js';
import { Unit } from './entities/Unit.js';

// Main Game Entry Point - Version 1.0.1
class GalacticConquest {
    constructor() {
        console.log(`=== Galactic Conquest RTS ===`);
        console.log(`Version: ${GAME_VERSION}`);
        console.log(`Loading game...`);
        
        this.gameEngine = null;
        this.isInitialized = false;
        this.startTime = Date.now();
        
        this.init();
    }

    async init() {
        try {
            // Wait for DOM to be ready
            if (document.readyState !== 'loading') {
                await this.setupGame();
            } else {
                document.addEventListener('DOMContentLoaded', () => this.setupGame());
            }
        } catch (error) {
            console.error('Failed to initialize game:', error);
            this.showError(error);
        }
    }

    async setupGame() {
        console.log('Setting up game...');
        
        // Show loading screen
        this.showLoadingScreen();
        
        try {
            // Initialize game engine
            this.gameEngine = GameEngine.getInstance();
            
            // Wait a moment for everything to initialize
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Hide loading screen
            this.hideLoadingScreen();
            
            // Show welcome message
            this.showWelcomeMessage();
            
            // Set up global access for debugging
            window.game = this.gameEngine;
            
            // Add test enemies after a delay
            setTimeout(() => this.addTestContent(), 3000);
            
            this.isInitialized = true;
            
            const loadTime = Date.now() - this.startTime;
            console.log(`Game initialized in ${loadTime}ms`);
            setTimeout(() => {
				this.createUIControlPanel();
			}, 1000);
		
        } catch (error) {
            console.error('Game setup failed:', error);
            this.showError(error);
        }
    }

    showLoadingScreen() {
        // Create loading screen
        const loadingScreen = document.createElement('div');
        loadingScreen.id = 'loading-screen';
        loadingScreen.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #001122;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            color: white;
            font-family: Arial, sans-serif;
        `;
        
        loadingScreen.innerHTML = `
            <div style="font-size: 36px; margin-bottom: 20px; color: #00ffff;">GALACTIC CONQUEST</div>
            <div style="font-size: 16px; margin-bottom: 30px; color: #888;">Loading...</div>
            <div id="loading-progress" style="width: 300px; height: 4px; background: #333; border-radius: 2px; overflow: hidden;">
                <div id="loading-bar" style="width: 0%; height: 100%; background: #00ffff; transition: width 0.3s;"></div>
            </div>
            <div id="loading-text" style="margin-top: 10px; font-size: 12px; color: #666;">Initializing systems...</div>
        `;
        
        document.body.appendChild(loadingScreen);
        
        // Simulate loading progress
        const progressStages = [
            'Initializing graphics...',
            'Loading game assets...',
            'Setting up game world...',
            'Preparing AI systems...',
            'Starting game engine...'
        ];
        
        let currentStage = 0;
        const progressInterval = setInterval(() => {
            if (currentStage < progressStages.length) {
                const progress = ((currentStage + 1) / progressStages.length) * 100;
                document.getElementById('loading-bar').style.width = `${progress}%`;
                document.getElementById('loading-text').textContent = progressStages[currentStage];
                currentStage++;
            } else {
                clearInterval(progressInterval);
            }
        }, 500);
        
        this.loadingScreen = loadingScreen;
        this.progressInterval = progressInterval;
    }

    hideLoadingScreen() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
        }
        
        if (this.loadingScreen) {
            // Animate out
            this.loadingScreen.style.opacity = '0';
            this.loadingScreen.style.transition = 'opacity 0.5s';
            
            setTimeout(() => {
                if (this.loadingScreen.parentNode) {
                    this.loadingScreen.parentNode.removeChild(this.loadingScreen);
                }
            }, 500);
        }
    }

    showWelcomeMessage() {
        const welcomeMessage = document.createElement('div');
        welcomeMessage.id = 'welcome-message';
        welcomeMessage.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            padding: 15px 30px;
            border-radius: 5px;
            color: white;
            font-family: Arial, sans-serif;
            text-align: center;
            z-index: 9999;
            border: 2px solid #00ffff;
            box-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
            animation: slideInDown 0.5s ease-out;
        `;
        
        welcomeMessage.innerHTML = `
            <div style="font-size: 18px; font-weight: bold; margin-bottom: 5px; color: #00ffff;">Welcome to Galactic Conquest!</div>
            <div style="font-size: 12px; color: #aaa;">
                Select units with left click/drag • Right click to move/attack<br>
                Use WASD or arrow keys to move camera • Mouse wheel to zoom<br>
                Press M, A, S, P, G for commands • B to build • Space to center camera
            </div>
        `;
        
        document.body.appendChild(welcomeMessage);
        
        // Remove after 8 seconds
        setTimeout(() => {
            welcomeMessage.style.animation = 'fadeOut 0.5s ease-in';
            setTimeout(() => {
                if (welcomeMessage.parentNode) {
                    welcomeMessage.parentNode.removeChild(welcomeMessage);
                }
            }, 500);
        }, 8000);
        
        // Add CSS animations if not already present
        this.addMessageAnimations();
    }

    addMessageAnimations() {
        if (!document.querySelector('style#message-animations')) {
            const style = document.createElement('style');
            style.id = 'message-animations';
            style.textContent = `
                @keyframes slideInDown {
                    from { top: -100px; opacity: 0; }
                    to { top: 20px; opacity: 1; }
                }
                @keyframes fadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    addTestContent() {
        if (!this.gameEngine) return;
        
        console.log('Adding test content...');
        
        // Create enemy player properly
        const enemyPlayer = {
            id: 'enemy_player',
            name: 'Enemy AI',
            race: this.gameEngine.localPlayer.race,
            resources: { ...this.gameEngine.localPlayer.race.startingResources },
            color: '#ff4444',
            units: new Set(),
            buildings: new Set()
        };
        this.gameEngine.players.set(enemyPlayer.id, enemyPlayer);
        
        // Add AI system for enemy
        this.gameEngine.aiSystem.onEnemyCreated(enemyPlayer.id);
        
        // Add enemy base - Using imported Building class
        const enemyBase = new Building(
            'enemy_base',
            'Command Center',
            enemyPlayer.id,
            { x: 900, y: 700 },
            enemyPlayer.race
        );
        this.gameEngine.buildings.set(enemyBase.id, enemyBase);
        enemyPlayer.buildings.add(enemyBase.id);
        
        // Add enemy workers - Using imported Unit class
        for (let i = 0; i < 3; i++) {
            const worker = new Unit(
                `enemy_worker_${i}`,
                enemyPlayer.race.worker,
                'worker',
                enemyPlayer.id,
                {
                    x: 900 + (i * 40),
                    y: 650
                },
                enemyPlayer.race
            );
            this.gameEngine.units.set(worker.id, worker);
            enemyPlayer.units.add(worker.id);
        }
        
        // Add enemy combat units
        for (let i = 0; i < 2; i++) {
            const soldier = new Unit(
                `enemy_soldier_${i}`,
                enemyPlayer.race.baseUnit,
                'infantry',
                enemyPlayer.id,
                {
                    x: 850 + (i * 60),
                    y: 750
                },
                enemyPlayer.race
            );
            this.gameEngine.units.set(soldier.id, soldier);
            enemyPlayer.units.add(soldier.id);
        }
        
        // Show test message
        this.showTestMessage();
        
        console.log('Test enemies added with AI');
    }

    showTestMessage() {
        const testMessage = document.createElement('div');
        testMessage.id = 'test-message';
        testMessage.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255, 100, 0, 0.8);
            padding: 10px 20px;
            border-radius: 5px;
            color: white;
            font-family: Arial, sans-serif;
            text-align: center;
            z-index: 9999;
            font-size: 14px;
            animation: slideInUp 0.5s ease-out;
        `;
        
        testMessage.innerHTML = `
            <div>Test enemies added! Practice your combat skills.</div>
            <div style="font-size: 11px; opacity: 0.8;">(This message will disappear in 5 seconds)</div>
        `;
        
        document.body.appendChild(testMessage);
        
        // Remove after 5 seconds
        setTimeout(() => {
            testMessage.style.animation = 'fadeOut 0.5s ease-in';
            setTimeout(() => {
                if (testMessage.parentNode) {
                    testMessage.parentNode.removeChild(testMessage);
                }
            }, 500);
        }, 5000);
    }

    showError(error) {
        const errorScreen = document.createElement('div');
        errorScreen.id = 'error-screen';
        errorScreen.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #220000;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            color: white;
            font-family: Arial, sans-serif;
            text-align: center;
        `;
        
        errorScreen.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 20px; color: #ff4444;">ERROR</div>
            <div style="font-size: 18px; margin-bottom: 30px; max-width: 600px; padding: 0 20px;">
                Failed to load Galactic Conquest
            </div>
            <div style="background: rgba(255, 255, 255, 0.1); padding: 15px; border-radius: 5px; margin-bottom: 30px; font-family: monospace; font-size: 14px; max-width: 800px; text-align: left;">
                ${error.message || 'Unknown error'}
            </div>
            <div>
                <button id="retry-btn" style="padding: 15px 30px; font-size: 18px; margin: 10px; background: #444; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Retry
                </button>
                <button id="report-btn" style="padding: 15px 30px; font-size: 18px; margin: 10px; background: #444; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Report Issue
                </button>
            </div>
        `;
        
        document.body.appendChild(errorScreen);
        
        // Add event listeners
        document.getElementById('retry-btn').onclick = () => {
            location.reload();
        };
        
        document.getElementById('report-btn').onclick = () => {
            const errorDetails = {
                error: error.toString(),
                stack: error.stack,
                url: window.location.href,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
            };
            
            // In a real application, you would send this to your error tracking service
            console.error('Error report:', errorDetails);
            alert('Error details have been logged. Thank you for reporting!');
        };
    }

    // Public API for external control
    getGameEngine() {
        return this.gameEngine;
    }

    isGameReady() {
        return this.isInitialized;
    }

    // Hotkey for quick testing
    static setupDeveloperShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey) {
                switch(e.key.toLowerCase()) {
                    case 'd':
                        // Toggle debug mode
                        if (window.game) {
                            window.game.toggleDebugInfo();
                        }
                        break;
                    case 'r':
                        // Reset game
                        if (confirm('Reset game?')) {
                            location.reload();
                        }
                        break;
                    case 'e':
                        // Add enemy
                        if (window.game) {
                            window.game.addTestEnemy();
                        }
                        break;
                    case 'i':
                        // Show info
                        console.log('Game Info:', {
                            version: GAME_VERSION,
                            engine: window.game,
                            units: window.game?.units?.size,
                            buildings: window.game?.buildings?.size,
                            fps: window.game?.fps
                        });
                        break;
                }
            }
        });
    }
	
		    createUIControlPanel() {
        const uiSystem = this.gameEngine.draggableUISystem;
        
        const controlPanel = uiSystem.createPanel(
            'uiControlPanel',
            'UI Controls',
            `
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <div>
                        <strong>Toggle Panels:</strong>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-top: 5px;">
                            <button onclick="game.draggableUISystem.togglePanel('resourcesPanel')">Resources (F1)</button>
                            <button onclick="game.draggableUISystem.togglePanel('selectionPanel')">Selection (F2)</button>
                            <button onclick="game.draggableUISystem.togglePanel('gameInfo')">Game Info (F3)</button>
                            <button onclick="game.draggableUISystem.togglePanel('minimapContainer')">Minimap (F4)</button>
                            <button onclick="game.draggableUISystem.togglePanel('debugInfo')">Debug (F5)</button>
                            <button onclick="game.draggableUISystem.togglePanel('cameraControls')">Camera</button>
                        </div>
                    </div>
                    <div>
                        <strong>Panel Management:</strong>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-top: 5px;">
                            <button onclick="game.draggableUISystem.resetAllPositions()">Reset All Positions</button>
                            <button onclick="game.draggableUISystem.savePanelPositions()">Save Positions</button>
                            <button onclick="localStorage.clear(); location.reload();">Clear All Data</button>
                            <button onclick="document.querySelectorAll('.ui-panel').forEach(p => p.style.display='block')">Show All</button>
                        </div>
                    </div>
                    <div>
                        <strong>Tips:</strong>
                        <ul style="margin: 5px 0 0 15px; font-size: 11px;">
                            <li>Drag panel headers or ≡ handles to move</li>
                            <li>Double-click + Ctrl to reset panel position</li>
                            <li>Use F1-F5 to toggle panels quickly</li>
                            <li>Positions auto-save when moved</li>
                        </ul>
                    </div>
                </div>
            `,
            { x: window.innerWidth - 350, y: 150, width: 300 }
        );
        
        // Add resize handle
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        controlPanel.appendChild(resizeHandle);
        
        uiSystem.setupPanelDraggable(controlPanel);
        
        console.log('UI Control Panel created');
    }
}

// Initialize the game
const game = new GalacticConquest();

// Set up developer shortcuts
GalacticConquest.setupDeveloperShortcuts();

// Make game accessible globally for debugging
window.GalacticConquest = GalacticConquest;

// Export for module usage
export { GalacticConquest };