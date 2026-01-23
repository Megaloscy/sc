
// Game Bootstrap - Loads everything in correct order
console.log("=== GAME BOOTSTRAP STARTING ===");

// First, load GameConstants (no dependencies)
import { GAME_VERSION, RACES, GAME_SETTINGS } from './core/GameConstants.js';
console.log(`Loaded GameConstants v${GAME_VERSION}`);

// Create a simple game engine immediately
class SimpleGameEngine {
    constructor() {
        console.log("Creating SimpleGameEngine...");
        
        this.gameState = 'initializing';
        this.units = new Map();
        this.buildings = new Map();
        this.resources = new Map();
        this.players = new Map();
        this.localPlayer = null;
        
        this.camera = {
            x: 0, y: 0,
            zoom: GAME_SETTINGS.DEFAULT_ZOOM,
            minZoom: GAME_SETTINGS.MIN_ZOOM,
            maxZoom: GAME_SETTINGS.MAX_ZOOM
        };
        
        this.deltaTime = 0;
        this.lastTime = 0;
        this.fps = 0;
        
        // Initialize immediately
        this.init();
    }
    
    init() {
        console.log("Initializing game engine...");
        
        // Create local player
        this.localPlayer = {
            id: 'player_local',
            name: 'Player',
            race: RACES.TERRAN,
            resources: { ...RACES.TERRAN.startingResources },
            color: RACES.TERRAN.color,
            units: new Set(),
            buildings: new Set()
        };
        this.players.set(this.localPlayer.id, this.localPlayer);
        
        // Create test unit
        this.createTestUnit();
        
        // Create test resource
        this.createTestResource();
        
        // Set up canvas
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Start game loop
        this.gameState = 'running';
        this.startGameLoop();
        
        console.log("Game engine initialized");
    }
    
    createTestUnit() {
        const unit = {
            id: 'unit_test_1',
            name: 'Worker',
            type: 'worker',
            playerId: this.localPlayer.id,
            race: this.localPlayer.race,
            position: { x: 100, y: 100 },
            targetPosition: { x: 100, y: 100 },
            velocity: { x: 0, y: 0 },
            radius: 10,
            speed: 50,
            state: 'idle',
            health: 100,
            maxHealth: 100,
            
            moveTo: function(position) {
                console.log(`Unit ${this.id} moving to ${position.x}, ${position.y}`);
                this.targetPosition = { ...position };
                this.state = 'moving';
            },
            
            update: function(deltaTime, game) {
                if (this.state === 'moving') {
                    const dx = this.targetPosition.x - this.position.x;
                    const dy = this.targetPosition.y - this.position.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < 5) {
                        this.velocity.x = 0;
                        this.velocity.y = 0;
                        this.state = 'idle';
                        console.log(`Unit ${this.id} reached destination`);
                    } else {
                        this.velocity.x = (dx / distance) * this.speed;
                        this.velocity.y = (dy / distance) * this.speed;
                        
                        this.position.x += this.velocity.x * deltaTime;
                        this.position.y += this.velocity.y * deltaTime;
                    }
                }
            },
            
            render: function(ctx, game) {
                const screenX = (this.position.x - game.camera.x) * game.camera.zoom;
                const screenY = (this.position.y - game.camera.y) * game.camera.zoom;
                const radius = this.radius * game.camera.zoom;
                
                ctx.fillStyle = this.playerId === game.localPlayer.id ? '#00ff00' : '#ff0000';
                ctx.beginPath();
                ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw selection if this unit is selected
                if (game.selectedUnits && game.selectedUnits.has(this.id)) {
                    ctx.strokeStyle = '#ffff00';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(screenX, screenY, radius + 3, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }
        };
        
        this.units.set(unit.id, unit);
        this.localPlayer.units.add(unit.id);
        console.log("Test unit created:", unit);
    }
    
    createTestResource() {
        const resource = {
            id: 'resource_test_1',
            type: 'mineral',
            position: { x: 300, y: 200 },
            radius: 25,
            amount: 1000
        };
        
        this.resources.set(resource.id, resource);
        console.log("Test resource created:", resource);
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        console.log(`Canvas resized to ${this.canvas.width}x${this.canvas.height}`);
    }
    
    startGameLoop() {
        console.log("Starting game loop...");
        this.lastTime = performance.now();
        
        const gameLoop = (currentTime) => {
            if (this.gameState !== 'running') return;
            
            this.deltaTime = (currentTime - this.lastTime) / 1000;
            this.lastTime = currentTime;
            
            // Update
            this.update();
            
            // Render
            this.render();
            
            // Continue loop
            requestAnimationFrame(gameLoop);
        };
        
        requestAnimationFrame(gameLoop);
    }
    
    update() {
        // Update all units
        this.units.forEach(unit => {
            unit.update(this.deltaTime, this);
        });
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#001122';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Apply camera transform
        this.ctx.save();
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        // Render resources
        this.resources.forEach(resource => {
            this.ctx.fillStyle = resource.type === 'mineral' ? '#44aaff' : '#00ffaa';
            this.ctx.beginPath();
            this.ctx.arc(resource.position.x, resource.position.y, resource.radius, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        // Render units
        this.units.forEach(unit => {
            unit.render(this.ctx, this);
        });
        
        this.ctx.restore();
    }
    
    // Public API
    selectUnit(unitId) {
        if (!this.selectedUnits) this.selectedUnits = new Set();
        this.selectedUnits.clear();
        this.selectedUnits.add(unitId);
        
        const unit = this.units.get(unitId);
        document.getElementById('selectedInfo').textContent = unit ? unit.name : 'None';
        
        console.log(`Selected unit: ${unitId}`);
    }
    
    issueMoveCommand(x, y) {
        if (!this.selectedUnits || this.selectedUnits.size === 0) {
            console.log("No units selected");
            return;
        }
        
        this.selectedUnits.forEach(unitId => {
            const unit = this.units.get(unitId);
            if (unit && unit.moveTo) {
                unit.moveTo({ x, y });
            }
        });
        
        console.log(`Move command to ${x}, ${y}`);
    }
}

// Create and expose the game
window.game = new SimpleGameEngine();
console.log("Game created and exposed as window.game");

// Add test commands to window
window.testCommands = {
    selectFirstUnit: function() {
        if (window.game && window.game.units.size > 0) {
            const firstUnitId = Array.from(window.game.units.keys())[0];
            window.game.selectUnit(firstUnitId);
        }
    },
    
    moveSelected: function(x, y) {
        if (window.game) {
            window.game.issueMoveCommand(x, y);
        }
    },
    
    testGather: function() {
        if (window.game && window.game.resources.size > 0) {
            const resource = window.game.resources.values().next().value;
            window.testCommands.moveSelected(resource.position.x, resource.position.y);
        }
    }
};

// Add test UI
setTimeout(() => {
    const testUI = document.createElement('div');
    testUI.innerHTML = `
        <div style="position: fixed; bottom: 50px; right: 10px; background: rgba(0,0,0,0.8); padding: 10px; color: white; z-index: 10000;">
            <div style="margin-bottom: 5px;">Test Commands</div>
            <button onclick="window.testCommands.selectFirstUnit()" style="margin: 2px;">Select Unit</button>
            <button onclick="window.testCommands.moveSelected(400, 300)" style="margin: 2px;">Move to 400,300</button>
            <button onclick="window.testCommands.testGather()" style="margin: 2px;">Test Gather</button>
        </div>
    `;
    document.body.appendChild(testUI);
    console.log("Test UI added");
}, 1000);

// Add click handlers
document.getElementById('gameCanvas').addEventListener('click', (e) => {
    if (!window.game) return;
    
    const rect = window.game.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Convert to world coordinates
    const worldX = window.game.camera.x + (x / window.game.camera.zoom);
    const worldY = window.game.camera.y + (y / window.game.camera.zoom);
    
    // Check if clicking on a unit
    let clickedUnit = null;
    window.game.units.forEach(unit => {
        const distance = Math.sqrt(
            Math.pow(unit.position.x - worldX, 2) + 
            Math.pow(unit.position.y - worldY, 2)
        );
        if (distance < unit.radius * 2) {
            clickedUnit = unit;
        }
    });
    
    if (clickedUnit) {
        // Select unit
        window.game.selectUnit(clickedUnit.id);
    } else {
        // Move command
        if (window.game.selectedUnits && window.game.selectedUnits.size > 0) {
            window.game.issueMoveCommand(worldX, worldY);
        }
    }
});

console.log("=== GAME BOOTSTRAP COMPLETE 1 ===");