import { GameEngine } from './main.js';
import AddonRegistry from './addons/addon-registry.js';

// Import addons - they auto-register with AddonRegistry
import './addons/terrain/uneven-terrain.js';
import './addons/races/human.js';
import './addons/mechanics/resource.js';
import './addons/mechanics/combat.js';
import './addons/ai/basicAI.js';

class Game {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.gameEngine = new GameEngine(canvasId);
        
        // Game state
        this.entities = [];
        this.selectedEntities = [];
        this.camera = { x: 0, y: 0, zoom: 1 };
        this.mouse = { x: 0, y: 0, down: false };
        this.keys = {};
        
        // Initialize addons through the engine
        this.initializeAddons();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Start game loop
        this.lastTime = 0;
        this.running = true;
        requestAnimationFrame(this.loop.bind(this));
        
        console.log('Game initialized with modular addon system');
    }
    
    initializeAddons() {
        // Addons are already registered during import
        // Now initialize them through the game engine
        console.log('Initializing addons...');
        
        // Test addon functionality
        setTimeout(() => {
            if (this.gameEngine.resources) {
                console.log('✅ Resource system active');
                console.log('Player resources:', this.gameEngine.resources.getResource('player1', 'gold'));
            }
            // Test addon interaction
if (this.gameEngine.resources && this.gameEngine.combat) {
    console.log('⚔️ Resources + Combat systems integrated!');
    // Example: Combat could consume resources
}

if (this.gameEngine.ai && this.entities.length > 0) {
    console.log('🤖 AI can control entities');
}
            if (this.gameEngine.combat) {
                console.log('✅ Combat system active');
            }
            
            // List all registered addons
            const addonList = AddonRegistry.listAddons();
            console.log(`📦 Total addons: ${addonList.length}`, addonList);
        }, 100);
    }
    
    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => {
            this.mouse.down = true;
            this.mouse.x = e.offsetX;
            this.mouse.y = e.offsetY;
            
            // Selection logic
            this.handleSelection();
        });
        
        this.canvas.addEventListener('mouseup', (e) => {
            this.mouse.down = false;
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            this.mouse.x = e.offsetX;
            this.mouse.y = e.offsetY;
            
            // Camera panning
            if (this.mouse.down && e.buttons === 2) {
                this.camera.x -= e.movementX / this.camera.zoom;
                this.camera.y -= e.movementY / this.camera.zoom;
            }
        });
        
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            
            // Right-click actions
            if (this.selectedEntities.length > 0) {
                const worldX = this.mouse.x / this.camera.zoom + this.camera.x;
                const worldY = this.mouse.y / this.camera.zoom + this.camera.y;
                
                // Use combat addon if available
                if (this.gameEngine.combat) {
                    // Check for attack targets
                    const target = this.findEntityAt(worldX, worldY);
                    if (target && target.owner !== 'player1') {
                        this.gameEngine.combat.attackEntities(this.selectedEntities, target);
                    } else {
                        // Move command
                        this.selectedEntities.forEach(entity => {
                            entity.targetX = worldX;
                            entity.targetY = worldY;
                        });
                    }
                } else {
                    // Fallback movement
                    this.selectedEntities.forEach(entity => {
                        entity.targetX = worldX;
                        entity.targetY = worldY;
                    });
                }
            }
        });
        
        // Keyboard events
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            // Camera zoom
            if (e.key === '+' || e.key === '=') {
                this.camera.zoom = Math.min(2, this.camera.zoom * 1.1);
            } else if (e.key === '-' || e.key === '_') {
                this.camera.zoom = Math.max(0.5, this.camera.zoom / 1.1);
            }
            
            // Group selection (Ctrl + number)
            if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
                this.saveSelectionGroup(parseInt(e.key));
            }
            
            // Load selection group (number)
            if (!e.ctrlKey && e.key >= '1' && e.key <= '9') {
                this.loadSelectionGroup(parseInt(e.key));
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
        
        // Mouse wheel for zoom
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            this.camera.zoom = Math.max(0.5, Math.min(2, this.camera.zoom * zoomFactor));
        });
    }
    
    handleSelection() {
        const worldX = this.mouse.x / this.camera.zoom + this.camera.x;
        const worldY = this.mouse.y / this.camera.zoom + this.camera.y;
        
        // Find entity at click position
        const clickedEntity = this.findEntityAt(worldX, worldY);
        
        if (clickedEntity) {
            // Select single entity
            if (this.keys.control) {
                // Ctrl+click: toggle selection
                const index = this.selectedEntities.indexOf(clickedEntity);
                if (index > -1) {
                    this.selectedEntities.splice(index, 1);
                } else {
                    this.selectedEntities.push(clickedEntity);
                }
            } else {
                // Regular click: replace selection
                this.selectedEntities = [clickedEntity];
            }
        } else {
            // Box selection (if dragging)
            if (!this.keys.shift) {
                this.selectedEntities = [];
            }
            // Box selection logic would go here
        }
        
        console.log(`Selected ${this.selectedEntities.length} entities`);
    }
    
    findEntityAt(x, y) {
        for (const entity of this.entities) {
            const dx = entity.x - x;
            const dy = entity.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < entity.radius) {
                return entity;
            }
        }
        return null;
    }
    
    saveSelectionGroup(groupNumber) {
        // Save current selection to a group
        this.selectionGroups = this.selectionGroups || {};
        this.selectionGroups[groupNumber] = [...this.selectedEntities];
        console.log(`Selection saved to group ${groupNumber}`);
    }
    
    loadSelectionGroup(groupNumber) {
        // Load selection from a group
        if (this.selectionGroups && this.selectionGroups[groupNumber]) {
            this.selectedEntities = [...this.selectionGroups[groupNumber]];
            console.log(`Selection loaded from group ${groupNumber}`);
        }
    }
    
    loop(timestamp) {
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;
        
        // Update game state
        this.update(deltaTime);
        
        // Render everything
        this.render();
        
        // Continue loop
        if (this.running) {
            requestAnimationFrame(this.loop.bind(this));
        }
    }
    
    update(deltaTime) {
        // Update entities
        for (const entity of this.entities) {
            // Movement toward target
            if (entity.targetX !== undefined && entity.targetY !== undefined) {
                const dx = entity.targetX - entity.x;
                const dy = entity.targetY - entity.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 1) {
                    const speed = entity.speed || 2;
                    entity.x += (dx / distance) * speed;
                    entity.y += (dy / distance) * speed;
                }
            }
            
            // Addon updates
            if (this.gameEngine.combat && entity.health !== undefined && entity.health <= 0) {
                // Remove dead entities
                const index = this.entities.indexOf(entity);
                if (index > -1) {
                    this.entities.splice(index, 1);
                    // Remove from selection if selected
                    const selIndex = this.selectedEntities.indexOf(entity);
                    if (selIndex > -1) {
                        this.selectedEntities.splice(selIndex, 1);
                    }
                }
            }
        }
        
        // Update addons
        if (this.gameEngine.ai) {
            this.gameEngine.ai.update(this.entities, deltaTime);
        }
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Save context for camera transform
        this.ctx.save();
        
        // Apply camera transform
        this.ctx.translate(-this.camera.x * this.camera.zoom, -this.camera.y * this.camera.zoom);
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        
        // Render terrain using addon if available
        if (this.gameEngine.terrain) {
            this.gameEngine.terrain.render(this.ctx, this.camera);
        } else {
            // Default grid
            this.renderGrid();
        }
        
        // Render entities
        for (const entity of this.entities) {
            this.renderEntity(entity);
        }
        
        // Render selection
        for (const entity of this.selectedEntities) {
            this.renderSelection(entity);
        }
        
        // Restore context
        this.ctx.restore();
        
        // Render UI
        this.renderUI();
    }
    
    renderGrid() {
        const gridSize = 50;
        const startX = Math.floor(this.camera.x / gridSize) * gridSize;
        const startY = Math.floor(this.camera.y / gridSize) * gridSize;
        const endX = startX + (this.canvas.width / this.camera.zoom) + gridSize;
        const endY = startY + (this.canvas.height / this.camera.zoom) + gridSize;
        
        this.ctx.strokeStyle = '#2d3047';
        this.ctx.lineWidth = 1;
        
        for (let x = startX; x < endX; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, startY);
            this.ctx.lineTo(x, endY);
            this.ctx.stroke();
        }
        
        for (let y = startY; y < endY; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(startX, y);
            this.ctx.lineTo(endX, y);
            this.ctx.stroke();
        }
    }
    
    renderEntity(entity) {
        this.ctx.fillStyle = entity.color || '#4ecdc4';
        this.ctx.beginPath();
        this.ctx.arc(entity.x, entity.y, entity.radius || 10, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Health bar (if entity has health)
        if (entity.health !== undefined && entity.maxHealth !== undefined) {
            const barWidth = 20;
            const barHeight = 3;
            const healthPercent = entity.health / entity.maxHealth;
            
            this.ctx.fillStyle = '#ff6b6b';
            this.ctx.fillRect(entity.x - barWidth/2, entity.y - 20, barWidth, barHeight);
            
            this.ctx.fillStyle = '#51cf66';
            this.ctx.fillRect(entity.x - barWidth/2, entity.y - 20, barWidth * healthPercent, barHeight);
        }
        
        // Owner indicator
        if (entity.owner) {
            this.ctx.fillStyle = entity.owner === 'player1' ? '#4ecdc4' : '#ff6b6b';
            this.ctx.beginPath();
            this.ctx.arc(entity.x, entity.y + 15, 3, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    renderSelection(entity) {
        this.ctx.strokeStyle = '#ffe66d';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(entity.x, entity.y, (entity.radius || 10) + 5, 0, Math.PI * 2);
        this.ctx.stroke();
    }
    
    renderUI() {
        // Mini-map
        const minimapSize = 100;
        const minimapX = this.canvas.width - minimapSize - 10;
        const minimapY = 10;
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(minimapX, minimapY, minimapSize, minimapSize);
        
        // Resource display
        if (this.gameEngine.resources) {
            this.ctx.fillStyle = 'white';
            this.ctx.font = '14px Arial';
            
            const resources = this.gameEngine.resources;
            const gold = resources.getResource('player1', 'gold');
            const wood = resources.getResource('player1', 'wood');
            
            this.ctx.fillText(`Gold: ${gold}`, 10, 25);
            this.ctx.fillText(`Wood: ${wood}`, 10, 45);
        }
        
        // Selection info
        if (this.selectedEntities.length > 0) {
            this.ctx.fillStyle = 'white';
            this.ctx.font = '12px Arial';
            this.ctx.fillText(`Selected: ${this.selectedEntities.length} units`, 10, 70);
            
            const firstEntity = this.selectedEntities[0];
            if (firstEntity.health !== undefined) {
                this.ctx.fillText(`Health: ${firstEntity.health}/${firstEntity.maxHealth}`, 10, 90);
            }
        }
        
        // Addon status
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.font = '10px Arial';
        const addonCount = AddonRegistry.listAddons().length;
        this.ctx.fillText(`Addons: ${addonCount} active`, this.canvas.width - 100, this.canvas.height - 10);
    }
    
    // Helper methods for game setup
    addEntity(entity) {
        this.entities.push(entity);
    }
    
    spawnTestUnits() {
        // Player units
        this.addEntity({
            x: 100, y: 100,
            radius: 10,
            color: '#4ecdc4',
            owner: 'player1',
            health: 100,
            maxHealth: 100,
            speed: 2
        });
        
        this.addEntity({
            x: 150, y: 100,
            radius: 10,
            color: '#4ecdc4',
            owner: 'player1',
            health: 100,
            maxHealth: 100,
            speed: 2
        });
        
        // Enemy units
        this.addEntity({
            x: 300, y: 300,
            radius: 12,
            color: '#ff6b6b',
            owner: 'enemy',
            health: 150,
            maxHealth: 150,
            speed: 1.5
        });
        
        console.log('Test units spawned');
    }
    
    stop() {
        this.running = false;
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game('gameCanvas');
    
    // Spawn some test units
    setTimeout(() => {
        game.spawnTestUnits();
    }, 500);
    
    // Make game available globally for debugging
    window.gameInstance = game;
    
    console.log('🎮 Modular RTS Game v1.0 Ready');
});

// Simpler test that doesn't need window.game
setTimeout(() => {
    const game = document.querySelector('#gameCanvas')?.gameInstance || 
                 window.game || window.gameInstance;
    if (game) {
        console.log('✅ Found game:', game);
    } else {
        console.log('❌ Game not in window. Checking AddonRegistry...');
        if (typeof AddonRegistry !== 'undefined') {
            console.log('Addons:', AddonRegistry.listAddons());
        }
    }
}, 2000);