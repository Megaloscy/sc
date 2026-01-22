// index.js
console.log('Index.js loaded successfully!');

import { GameEngine, Entity } from './main.js';

// Import addons
import { UnevenTerrain } from './addons/terrain/uneven-terrain.js';
import { HumanRace } from './addons/races/human.js';
import { ResourceSystem } from './addons/mechanics/resource.js';
import { CombatSystem } from './addons/mechanics/combat.js';
import { BasicAI } from './addons/ai/basicAI.js';

// Debug: Check if imports work
console.log('UnevenTerrain:', UnevenTerrain);
console.log('HumanRace:', HumanRace);

class RTSGame {
    constructor() {
        console.log('Creating RTSGame instance');
        
        // Create canvas
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.camera = { x: 0, y: 0 };
        
        this.setupCanvas();
        this.setupUI();
        this.setupEngine();
        this.setupInput();
    }

    setupCanvas() {
        this.canvas.width = 800;
        this.canvas.height = 600;
        this.canvas.style.border = '2px solid #0f0';
        this.canvas.style.backgroundColor = '#000';
        document.body.appendChild(this.canvas);
        console.log('Canvas setup complete');
    }

    setupUI() {
        const ui = document.createElement('div');
        ui.innerHTML = `
            <h1 style="color: #0f0;">Modular RTS Game - XAMPP</h1>
            <div style="color: white; background: rgba(0,0,0,0.7); padding: 10px; border-radius: 5px;">
                <p>Status: <span id="status">Initializing...</span></p>
                <p>Addons Loaded: <span id="addonCount">0</span></p>
                <p>Entities: <span id="entityCount">0</span></p>
            </div>
            <div style="color: #ccc; margin-top: 10px;">
                <p>Controls: WASD to move camera | Click+drag to pan</p>
            </div>
        `;
        document.body.insertBefore(ui, this.canvas);
    }

    setupEngine() {
        this.engine = new GameEngine();
        
        // Register all addons
        const addons = [
            ['terrain', 'unevenTerrain', new UnevenTerrain()],
            ['race', 'human', new HumanRace()],
            ['mechanic', 'resource', new ResourceSystem()],
            ['mechanic', 'combat', new CombatSystem()],
            ['ai', 'basicAI', new BasicAI()]
        ];

        addons.forEach(([type, name, instance]) => {
            this.engine.registerAddon(type, name, instance);
        });

        // Create test entities
        this.createTestEntities();
        
        // Update UI
        document.getElementById('status').textContent = 'Running';
        document.getElementById('addonCount').textContent = addons.length;
    }

    createTestEntities() {
        for (let i = 0; i < 10; i++) {
            const entity = new Entity('unit', {
                x: Math.random() * 100 * 32,
                y: Math.random() * 100 * 32,
                color: `hsl(${Math.random() * 360}, 100%, 50%)`,
                size: 8,
                render: function(ctx, camera) {
                    ctx.fillStyle = this.color;
                    ctx.beginPath();
                    ctx.arc(
                        this.x - camera.x,
                        this.y - camera.y,
                        this.size,
                        0,
                        Math.PI * 2
                    );
                    ctx.fill();
                }
            });
            this.engine.entities.set(entity.id, entity);
        }
        document.getElementById('entityCount').textContent = this.engine.entities.size;
    }

    setupInput() {
        this.keys = {};
        this.mouse = { x: 0, y: 0, down: false };

        // Keyboard
        window.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);

        // Mouse
        this.canvas.addEventListener('mousedown', (e) => {
            this.mouse.down = true;
            this.mouse.x = e.offsetX;
            this.mouse.y = e.offsetY;
        });

        this.canvas.addEventListener('mouseup', () => this.mouse.down = false);

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.mouse.down) {
                this.camera.x -= e.movementX;
                this.camera.y -= e.movementY;
            }
            this.mouse.x = e.offsetX;
            this.mouse.y = e.offsetY;
        });

        console.log('Input setup complete');
    }

    update() {
        // Camera movement
        const speed = 10;
        if (this.keys['w'] || this.keys['arrowup']) this.camera.y -= speed;
        if (this.keys['s'] || this.keys['arrowdown']) this.camera.y += speed;
        if (this.keys['a'] || this.keys['arrowleft']) this.camera.x -= speed;
        if (this.keys['d'] || this.keys['arrowright']) this.camera.x += speed;
    }

    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;
        const gridSize = 32;
        
        for (let x = 0; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x - (this.camera.x % gridSize), 0);
            this.ctx.lineTo(x - (this.camera.x % gridSize), this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y - (this.camera.y % gridSize));
            this.ctx.lineTo(this.canvas.width, y - (this.camera.y % gridSize));
            this.ctx.stroke();
        }

        // Render entities
        this.engine.entities.forEach(entity => {
            if (entity.render) {
                entity.render(this.ctx, this.camera);
            }
        });

        // Draw debug info
        this.ctx.fillStyle = '#0f0';
        this.ctx.font = '12px monospace';
        this.ctx.fillText(`Camera: (${Math.round(this.camera.x)}, ${Math.round(this.camera.y)})`, 10, 20);
        this.ctx.fillText(`Entities: ${this.engine.entities.size}`, 10, 40);
        this.ctx.fillText(`Mouse: (${this.mouse.x}, ${this.mouse.y})`, 10, 60);
    }

    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }

    start() {
        console.log('Starting game...');
        this.engine.start();
        this.gameLoop();
        console.log('Game started successfully!');
    }
}

// Start the game when everything is loaded
window.addEventListener('load', () => {
    console.log('DOM loaded, starting game...');
    const game = new RTSGame();
    game.start();
});