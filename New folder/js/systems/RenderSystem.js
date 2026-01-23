import { GAME_SETTINGS, DEBUG_SETTINGS } from '../core/GameConstants.js';

// Render System - Version 1.0.0
class RenderSystem {
    constructor(gameEngine) {
        this.game = gameEngine;
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.minimapCanvas = document.getElementById('minimap');
        this.minimapCtx = this.minimapCanvas.getContext('2d');
        
        // Rendering state
        this.lastRenderTime = 0;
        this.frameCount = 0;
        this.renderStats = {
            triangles: 0,
            drawCalls: 0,
            unitsRendered: 0,
            buildingsRendered: 0,
            projectilesRendered: 0
        };
        
        // Visual effects
        this.particleSystems = new Map();
        this.lightSources = new Map();
        
        // Performance
        this.useCanvasLayers = true;
        this.enableCulling = true;
        this.debugMode = false;
        
        console.log('RenderSystem initialized');
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // Set up canvas properties
        this.canvas.style.imageRendering = 'pixelated';
        this.ctx.imageSmoothingEnabled = false;
        
        console.log('RenderSystem ready');
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.minimapCanvas.width = 200;
        this.minimapCanvas.height = 200;
        
        this.clearCanvas();
        console.log(`Canvas resized to ${this.canvas.width}x${this.canvas.height}`);
    }

    getCanvasWidth() {
        return this.canvas.width;
    }

    getCanvasHeight() {
        return this.canvas.height;
    }

    clearCanvas() {
        // Clear main canvas with gradient background
        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        gradient.addColorStop(0, '#001122');
        gradient.addColorStop(1, '#003344');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Clear minimap
        this.minimapCtx.fillStyle = 'rgba(0, 20, 40, 0.9)';
        this.minimapCtx.fillRect(0, 0, this.minimapCanvas.width, this.minimapCanvas.height);
    }

    render() {
        const startTime = performance.now();
        
        // Reset render stats
        this.resetRenderStats();
        
        // Clear canvas
        this.clearCanvas();
        
        // Set up camera transform
        this.ctx.save();
        this.ctx.scale(this.game.camera.zoom, this.game.camera.zoom);
        this.ctx.translate(-this.game.camera.x, -this.game.camera.y);
        
        // Draw game world
        this.drawGrid();
        this.drawResources();
        this.drawBuildings();
        this.drawUnits();
        this.drawProjectiles();
        this.drawSelectionRectangle();
        this.drawHealthBars();
        
        this.ctx.restore();
        
        // Draw UI overlays
        this.drawUIOverlays();
        
        // Draw minimap
        this.renderMinimap();
        
        // Draw debug info if enabled
        if (DEBUG_SETTINGS.SHOW_DEBUG_INFO) {
            this.drawDebugInfo(startTime);
        }
        
        this.lastRenderTime = performance.now() - startTime;
    }

    resetRenderStats() {
        this.renderStats = {
            triangles: 0,
            drawCalls: 0,
            unitsRendered: 0,
            buildingsRendered: 0,
            projectilesRendered: 0
        };
    }

    drawGrid() {
        if (!DEBUG_SETTINGS.SHOW_GRID) return;
        
        const gridSize = GAME_SETTINGS.GRID_SIZE;
        const startX = Math.floor(this.game.camera.x / gridSize) * gridSize;
        const startY = Math.floor(this.game.camera.y / gridSize) * gridSize;
        const endX = this.game.camera.x + (this.canvas.width / this.game.camera.zoom);
        const endY = this.game.camera.y + (this.canvas.height / this.game.camera.zoom);
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        
        // Vertical lines
        for (let x = startX; x <= endX; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, startY);
            this.ctx.lineTo(x, endY);
            this.ctx.stroke();
            this.renderStats.drawCalls++;
        }
        
        // Horizontal lines
        for (let y = startY; y <= endY; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(startX, y);
            this.ctx.lineTo(endX, y);
            this.ctx.stroke();
            this.renderStats.drawCalls++;
        }
        
        // Major grid lines (every 4th line)
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.lineWidth = 2;
        
        for (let x = startX; x <= endX; x += gridSize * 4) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, startY);
            this.ctx.lineTo(x, endY);
            this.ctx.stroke();
            this.renderStats.drawCalls++;
        }
        
        for (let y = startY; y <= endY; y += gridSize * 4) {
            this.ctx.beginPath();
            this.ctx.moveTo(startX, y);
            this.ctx.lineTo(endX, y);
            this.ctx.stroke();
            this.renderStats.drawCalls++;
        }
    }

    drawResources() {
        for (const resource of this.game.resources.values()) {
            this.drawResource(resource);
            this.renderStats.drawCalls++;
        }
    }

    drawResource(resource) {
        const ctx = this.ctx;
        const pos = resource.position;
        const radius = resource.radius;
        
        // Resource glow
        const pulse = Math.sin(this.game.gameTime * 2) * 0.2 + 0.8;
        const glowRadius = radius * pulse;
        
        // Gradient for glow effect
        const gradient = ctx.createRadialGradient(
            pos.x, pos.y, 0,
            pos.x, pos.y, glowRadius
        );
        
        if (resource.type === 'mineral') {
            gradient.addColorStop(0, 'rgba(100, 200, 255, 0.8)');
            gradient.addColorStop(0.7, 'rgba(68, 170, 255, 0.4)');
            gradient.addColorStop(1, 'rgba(68, 170, 255, 0)');
        } else {
            gradient.addColorStop(0, 'rgba(0, 255, 170, 0.8)');
            gradient.addColorStop(0.7, 'rgba(0, 255, 170, 0.4)');
            gradient.addColorStop(1, 'rgba(0, 255, 170, 0)');
        }
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Resource body
        ctx.fillStyle = resource.type === 'mineral' ? '#44aaff' : '#00ffaa';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Resource amount
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(Math.floor(resource.amount), pos.x, pos.y);
        
        // Crystal facets for minerals
        if (resource.type === 'mineral') {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI * 2) / 6;
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y);
                ctx.lineTo(
                    pos.x + Math.cos(angle) * radius,
                    pos.y + Math.sin(angle) * radius
                );
                ctx.stroke();
            }
        }
    }

    drawBuildings() {
        for (const building of this.game.buildings.values()) {
            if (this.isInView(building.position, Math.max(building.size.width, building.size.height))) {
                building.render(this.ctx, this.game.gameTime, this.game);
                this.renderStats.buildingsRendered++;
                this.renderStats.drawCalls++;
            }
        }
    }

    drawUnits() {
        for (const unit of this.game.units.values()) {
            if (this.isInView(unit.position, unit.radius * 2)) {
                unit.render(this.ctx, this.game.gameTime, this.game);
                this.renderStats.unitsRendered++;
                this.renderStats.drawCalls++;
            }
        }
    }

    drawProjectiles() {
        for (const projectile of this.game.projectiles.values()) {
            if (projectile.isAlive() && this.isInView(projectile.position, 50)) {
                projectile.render(this.ctx);
                this.renderStats.projectilesRendered++;
                this.renderStats.drawCalls++;
            }
        }
    }

    drawSelectionRectangle() {
        if (!this.game.selectionRect) return;
        
        const rect = this.game.selectionRect;
        const worldStart = this.screenToWorld(rect.x, rect.y);
        const worldEnd = this.screenToWorld(rect.x + rect.width, rect.y + rect.height);
        
        this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
        this.ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
        this.ctx.lineWidth = 2 / this.game.camera.zoom;
        this.ctx.setLineDash([5, 5]);
        
        this.ctx.beginPath();
        this.ctx.rect(
            worldStart.x,
            worldStart.y,
            worldEnd.x - worldStart.x,
            worldEnd.y - worldStart.y
        );
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        this.renderStats.drawCalls++;
    }

    drawHealthBars() {
        // Draw health bars for selected units
        this.game.selectedUnits.forEach(id => {
            const unit = this.game.units.get(id);
            if (unit && unit.health < unit.maxHealth) {
                this.drawHealthBar(
                    unit.position.x,
                    unit.position.y - unit.radius - 8,
                    unit.radius * 2,
                    4,
                    unit.health / unit.maxHealth
                );
            }
        });
        
        // Draw health bars for damaged buildings in view
        for (const building of this.game.buildings.values()) {
            if (building.health < building.maxHealth && 
                this.isInView(building.position, Math.max(building.size.width, building.size.height))) {
                this.drawHealthBar(
                    building.position.x,
                    building.position.y - building.size.height/2 - 10,
                    building.size.width,
                    5,
                    building.health / building.maxHealth
                );
            }
        }
    }

    drawHealthBar(x, y, width, height, percent) {
        const ctx = this.ctx;
        
        // Background
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(x - width/2, y, width, height);
        
        // Health fill with gradient
        const fillWidth = width * Math.max(0, percent);
        if (fillWidth > 0) {
            const gradient = ctx.createLinearGradient(
                x - width/2, y,
                x - width/2 + fillWidth, y
            );
            gradient.addColorStop(0, '#00ff00');
            gradient.addColorStop(1, '#00cc00');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x - width/2, y, fillWidth, height);
        }
        
        // Border
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - width/2, y, width, height);
        
        this.renderStats.drawCalls++;
    }

    drawUIOverlays() {
        this.ctx.save();
        this.ctx.resetTransform();
        
        // Draw selection indicators
        this.game.selectedUnits.forEach(id => {
            const unit = this.game.units.get(id);
            if (unit) {
                this.drawSelectionIndicator(unit);
            }
        });
        
        // Draw mouse position debug
        if (this.debugMode) {
            this.drawMouseDebug();
        }
        
        this.ctx.restore();
    }

    drawSelectionIndicator(unit) {
        const screenPos = this.worldToScreen(unit.position);
        const radius = unit.radius * this.game.camera.zoom;
        
        // Selection circle
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.arc(screenPos.x, screenPos.y, radius + 2, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Rotating indicator
        const angle = this.game.gameTime * 3;
        this.ctx.beginPath();
        this.ctx.arc(screenPos.x, screenPos.y, radius + 8, angle, angle + Math.PI / 2);
        this.ctx.stroke();
        
        this.renderStats.drawCalls++;
    }

    drawMouseDebug() {
        const ctx = this.ctx;
        const mouse = this.game.inputSystem?.mouse || { worldX: 0, worldY: 0 };
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, this.canvas.height - 80, 250, 70);
        
        ctx.fillStyle = '#00ff00';
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        const lines = [
            `World: ${Math.floor(mouse.worldX)}, ${Math.floor(mouse.worldY)}`,
            `Camera: ${Math.floor(this.game.camera.x)}, ${Math.floor(this.game.camera.y)}`,
            `Zoom: ${this.game.camera.zoom.toFixed(2)}`,
            `FPS: ${Math.floor(this.game.fps)}`
        ];
        
        lines.forEach((line, i) => {
            ctx.fillText(line, 20, this.canvas.height - 70 + i * 15);
        });
        
        this.renderStats.drawCalls++;
    }

    renderMinimap() {
        const ctx = this.minimapCtx;
        const scaleX = this.minimapCanvas.width / this.game.worldSize.width;
        const scaleY = this.minimapCanvas.height / this.game.worldSize.height;
        
        // Clear minimap
        ctx.fillStyle = 'rgba(0, 20, 40, 0.9)';
        ctx.fillRect(0, 0, this.minimapCanvas.width, this.minimapCanvas.height);
        
        // Draw grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 0.5;
        for (let x = 0; x < this.game.worldSize.width; x += GAME_SETTINGS.GRID_SIZE * 4) {
            ctx.beginPath();
            ctx.moveTo(x * scaleX, 0);
            ctx.lineTo(x * scaleX, this.minimapCanvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < this.game.worldSize.height; y += GAME_SETTINGS.GRID_SIZE * 4) {
            ctx.beginPath();
            ctx.moveTo(0, y * scaleY);
            ctx.lineTo(this.minimapCanvas.width, y * scaleY);
            ctx.stroke();
        }
        
        // Draw resources
        for (const resource of this.game.resources.values()) {
            ctx.fillStyle = resource.type === 'mineral' ? '#44aaff' : '#00ffaa';
            ctx.beginPath();
            ctx.arc(resource.position.x * scaleX, resource.position.y * scaleY, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw buildings
        for (const building of this.game.buildings.values()) {
            const player = this.game.players.get(building.playerId);
            ctx.fillStyle = player ? player.color : '#ff4444';
            const pos = building.position;
            const size = building.size;
            ctx.fillRect(
                pos.x * scaleX - size.width * scaleX / 2,
                pos.y * scaleY - size.height * scaleY / 2,
                size.width * scaleX,
                size.height * scaleY
            );
        }
        
        // Draw units
        for (const unit of this.game.units.values()) {
            const player = this.game.players.get(unit.playerId);
            ctx.fillStyle = player ? player.color : '#ff4444';
            ctx.beginPath();
            ctx.arc(unit.position.x * scaleX, unit.position.y * scaleY, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw viewport rectangle
        const viewX = this.game.camera.x * scaleX;
        const viewY = this.game.camera.y * scaleY;
        const viewWidth = (this.canvas.width / this.game.camera.zoom) * scaleX;
        const viewHeight = (this.canvas.height / this.game.camera.zoom) * scaleY;
        
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        ctx.strokeRect(viewX, viewY, viewWidth, viewHeight);
        
        // Draw camera center
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(viewX + viewWidth/2, viewY + viewHeight/2, 2, 0, Math.PI * 2);
        ctx.fill();
        
        this.renderStats.drawCalls++;
    }

    drawDebugInfo(startTime) {
        const ctx = this.ctx;
        ctx.save();
        ctx.resetTransform();
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 300, 180);
        
        ctx.fillStyle = '#00ff00';
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        const renderTime = performance.now() - startTime;
        const lines = [
            `=== RENDER DEBUG ===`,
            `Frame Time: ${renderTime.toFixed(2)}ms`,
            `FPS: ${Math.floor(1000 / (renderTime || 1))}`,
            `Game Time: ${this.game.gameTime.toFixed(1)}s`,
            ``,
            `=== OBJECT COUNTS ===`,
            `Units: ${this.game.units.size}`,
            `Buildings: ${this.game.buildings.size}`,
            `Projectiles: ${this.game.projectiles.size}`,
            `Resources: ${this.game.resources.size}`,
            ``,
            `=== RENDER STATS ===`,
            `Units Rendered: ${this.renderStats.unitsRendered}`,
            `Buildings Rendered: ${this.renderStats.buildingsRendered}`,
            `Draw Calls: ${this.renderStats.drawCalls}`,
            `Camera: ${Math.floor(this.game.camera.x)}, ${Math.floor(this.game.camera.y)}`
        ];
        
        lines.forEach((line, i) => {
            ctx.fillText(line, 20, 20 + i * 15);
        });
        
        ctx.restore();
    }

    // Utility methods
    screenToWorld(screenX, screenY) {
        const screenRect = this.canvas.getBoundingClientRect();
        const x = screenX - screenRect.left;
        const y = screenY - screenRect.top;
        
        return {
            x: this.game.camera.x + (x / this.game.camera.zoom),
            y: this.game.camera.y + (y / this.game.camera.zoom)
        };
    }

    worldToScreen(worldPos) {
        return {
            x: (worldPos.x - this.game.camera.x) * this.game.camera.zoom,
            y: (worldPos.y - this.game.camera.y) * this.game.camera.zoom
        };
    }

    isInView(position, size) {
        if (!this.enableCulling) return true;
        
        const screenPos = this.worldToScreen(position);
        const screenSize = size * this.game.camera.zoom;
        
        return (
            screenPos.x + screenSize > 0 &&
            screenPos.x - screenSize < this.canvas.width &&
            screenPos.y + screenSize > 0 &&
            screenPos.y - screenSize < this.canvas.height
        );
    }

    // Performance methods
    toggleDebugMode() {
        this.debugMode = !this.debugMode;
        console.log(`Render debug mode: ${this.debugMode ? 'ON' : 'OFF'}`);
    }

    toggleCulling() {
        this.enableCulling = !this.enableCulling;
        console.log(`Frustum culling: ${this.enableCulling ? 'ON' : 'OFF'}`);
    }

    getPerformanceStats() {
        return {
            lastRenderTime: this.lastRenderTime,
            ...this.renderStats
        };
    }
}

export { RenderSystem };