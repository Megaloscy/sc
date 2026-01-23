
import { BUILDINGS, GAME_SETTINGS } from '../core/GameConstants.js';
import { Unit } from './Unit.js';

// Building Entity - Version 1.0.0
class Building {
    constructor(id, name, playerId, position, race) {
        this.id = id;
        this.name = name;
        this.playerId = playerId;
        this.race = race;
        
        // Position and size
        this.position = { ...position };
        this.size = { width: 60, height: 60 };
        this.maxHealth = 500;
        this.health = this.maxHealth;
        this.buildTime = 30;
        this.buildProgress = this.buildTime;
        
        // Production
        this.productionQueue = [];
        this.productionTime = 0;
        this.rallyPoint = { x: position.x, y: position.y + 50 };
        
        // Repair/healing
        this.repairRate = 2; // Health per second
        this.healing = false;
        this.autoRepair = false;
        
        // Animation
        this.animationTime = 0;
        this.pulseEffect = 0;
        
        // State
        this.isConstructing = this.buildProgress < this.buildTime;
        this.isActive = true;
        
        console.log(`Building created: ${this.name} (${this.id})`);
    }

    update(deltaTime, game) {
        this.animationTime += deltaTime;
        this.pulseEffect = Math.sin(this.animationTime * 2) * 0.2 + 0.8;
        
        // Auto-repair if damaged and healing enabled
        if (this.health < this.maxHealth && (this.healing || this.autoRepair)) {
            this.health = Math.min(this.maxHealth, this.health + this.repairRate * deltaTime);
        }
        
        // Handle construction progress
        if (this.isConstructing) {
            this.buildProgress += deltaTime;
            if (this.buildProgress >= this.buildTime) {
                this.isConstructing = false;
                this.completeConstruction();
            }
        }
        
        // Process production queue
        if (this.productionQueue.length > 0 && !this.isConstructing) {
            this.productionTime += deltaTime;
            
            const currentUnit = this.productionQueue[0];
            if (this.productionTime >= currentUnit.buildTime) {
                // Unit completed
                this.productionTime = 0;
                this.productionQueue.shift();
                
                // Spawn unit at rally point
                this.spawnUnit(currentUnit, game);
            }
        }
    }

    completeConstruction() {
        console.log(`Building construction complete: ${this.name}`);
        // You can add construction complete effects here
    }

    spawnUnit(unitData, game) {
        const unit = new Unit(
            `unit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            unitData.name,
            unitData.type,
            this.playerId,
            this.rallyPoint,
            this.race
        );
        
        // Apply unit stats from data
        if (unitData.stats) {
            Object.assign(unit, unitData.stats);
        }
        
        game.units.set(unit.id, unit);
        
        // Add to player's unit list
        const player = game.players.get(this.playerId);
        if (player) {
            player.units.add(unit.id);
        }
        
        console.log(`Unit spawned: ${unitData.name} from ${this.name}`);
    }

    startProduction(unitData) {
        // Check if we can queue more units
        const maxQueueSize = 5;
        if (this.productionQueue.length >= maxQueueSize) {
            console.log(`Production queue full (max: ${maxQueueSize})`);
            return false;
        }
        
        this.productionQueue.push({
            ...unitData,
            id: `unit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            progress: 0
        });
        
        console.log(`Started production: ${unitData.name} in ${this.name} (${this.productionQueue.length}/${maxQueueSize})`);
        return true;
    }

    cancelProduction(index) {
        if (index >= 0 && index < this.productionQueue.length) {
            const cancelled = this.productionQueue.splice(index, 1)[0];
            
            // Refund resources (partial refund based on progress)
            const game = window.game;
            if (game && cancelled.cost) {
                const refundMultiplier = 0.5; // 50% refund
                const refund = {};
                Object.keys(cancelled.cost).forEach(resource => {
                    refund[resource] = Math.floor(cancelled.cost[resource] * refundMultiplier);
                });
                game.addResources(this.playerId, refund);
            }
            
            console.log(`Cancelled production at index ${index}`);
        }
    }

    setRallyPoint(x, y) {
        this.rallyPoint = { x, y };
        console.log(`Rally point set for ${this.name}: ${x}, ${y}`);
    }

    takeDamage(amount) {
        this.health -= amount;
        
        // Stop healing when damaged
        this.healing = false;
        
        const isDestroyed = this.health <= 0;
        if (isDestroyed) {
            console.log(`Building destroyed: ${this.name}`);
        }
        
        return isDestroyed;
    }

    startHealing() {
        this.healing = true;
        console.log(`Healing started for ${this.name}`);
    }

    stopHealing() {
        this.healing = false;
        console.log(`Healing stopped for ${this.name}`);
    }

    toggleAutoRepair() {
        this.autoRepair = !this.autoRepair;
        console.log(`Auto-repair ${this.autoRepair ? 'enabled' : 'disabled'} for ${this.name}`);
        return this.autoRepair;
    }

    getBoundingBox() {
        return {
            x: this.position.x - this.size.width / 2,
            y: this.position.y - this.size.height / 2,
            width: this.size.width,
            height: this.size.height
        };
    }

    getProductionProgress() {
        if (this.productionQueue.length === 0) return 0;
        return this.productionTime / this.productionQueue[0].buildTime;
    }

    getConstructionProgress() {
        return this.buildProgress / this.buildTime;
    }

    isDamaged() {
        return this.health < this.maxHealth;
    }

    isProducing() {
        return this.productionQueue.length > 0;
    }

    render(ctx, gameTime, game) {
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        
        // Get player color
        const player = game.players.get(this.playerId);
        const color = player ? player.color : this.race.color;
        
        // Draw construction scaffolding if building
        if (this.isConstructing) {
            this.drawConstructionScaffold(ctx, gameTime, color);
        } else {
            // Draw building based on race
            switch(this.race.name) {
                case 'Terran':
                    this.renderTerran(ctx, gameTime, color);
                    break;
                case 'Zerg':
                    this.renderZerg(ctx, gameTime, color);
                    break;
                case 'Protoss':
                    this.renderProtoss(ctx, gameTime, color);
                    break;
                default:
                    this.renderDefault(ctx, gameTime, color);
            }
        }
        
        // Draw production progress
        if (this.isProducing()) {
            this.drawProductionProgress(ctx);
        }
        
        ctx.restore();
        
        // Draw construction progress bar
        if (this.isConstructing) {
            this.drawConstructionProgress(ctx, gameTime);
        }
        
        // Draw rally point
        if (this.rallyPoint && !this.isConstructing) {
            this.drawRallyPoint(ctx, game);
        }
        
        // Draw healing effect
        if (this.healing && this.isDamaged()) {
            this.drawHealingEffect(ctx, gameTime);
        }
    }

    drawConstructionScaffold(ctx, gameTime, color) {
        const progress = this.getConstructionProgress();
        
        // Draw scaffold frame
        ctx.strokeStyle = '#888888';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(-this.size.width/2, -this.size.height/2, this.size.width, this.size.height);
        ctx.setLineDash([]);
        
        // Draw diagonal braces
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI / 2) + (gameTime * 0.5);
            const length = Math.min(this.size.width, this.size.height) * 0.8;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
            ctx.stroke();
        }
        
        // Draw partial building based on progress
        if (progress > 0) {
            ctx.fillStyle = color + '80'; // Semi-transparent
            const height = this.size.height * progress;
            ctx.fillRect(-this.size.width/2, this.size.height/2 - height, this.size.width, height);
        }
        
        // Draw construction workers (visual effect)
        const workerCount = Math.floor(progress * 4);
        for (let i = 0; i < workerCount; i++) {
            const angle = (i * Math.PI * 2) / workerCount + gameTime;
            const radius = Math.min(this.size.width, this.size.height) * 0.6;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            // Draw small worker dot
            ctx.fillStyle = '#ffff00';
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw tool animation
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 1;
            const toolAngle = gameTime * 5 + i;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(toolAngle) * 5, y + Math.sin(toolAngle) * 5);
            ctx.stroke();
        }
        
        // Draw construction percentage
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${Math.floor(progress * 100)}%`, 0, 0);
    }

    drawConstructionProgress(ctx, gameTime) {
        const progress = this.getConstructionProgress();
        const barWidth = this.size.width;
        const barHeight = 6;
        const yOffset = this.size.height / 2 + 10;
        
        // Progress bar background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(this.position.x - barWidth/2, this.position.y + yOffset, barWidth, barHeight);
        
        // Progress bar fill with gradient
        const fillWidth = barWidth * progress;
        if (fillWidth > 0) {
            const gradient = ctx.createLinearGradient(
                this.position.x - barWidth/2, 0,
                this.position.x - barWidth/2 + fillWidth, 0
            );
            gradient.addColorStop(0, '#00ff00');
            gradient.addColorStop(0.5, '#ffff00');
            gradient.addColorStop(1, '#00ff00');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(this.position.x - barWidth/2, this.position.y + yOffset, fillWidth, barHeight);
            
            // Pulsing effect
            const pulse = Math.sin(gameTime * 5) * 0.2 + 0.8;
            ctx.fillStyle = `rgba(255, 255, 255, ${pulse * 0.5})`;
            ctx.fillRect(this.position.x - barWidth/2 + fillWidth - 2, this.position.y + yOffset, 4, barHeight);
        }
        
        // Progress bar border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.position.x - barWidth/2, this.position.y + yOffset, barWidth, barHeight);
        
        // Time remaining
        const timeRemaining = this.buildTime - this.buildProgress;
        if (timeRemaining > 0) {
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(`${timeRemaining.toFixed(1)}s`, this.position.x, this.position.y + yOffset + barHeight + 2);
        }
    }

    drawProductionProgress(ctx) {
        const progress = this.getProductionProgress();
        const barWidth = this.size.width * 0.8;
        const barHeight = 4;
        const yOffset = this.size.height / 2 + 20;
        
        // Production bar background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(this.position.x - barWidth/2, this.position.y + yOffset, barWidth, barHeight);
        
        // Production bar fill
        const fillWidth = barWidth * progress;
        if (fillWidth > 0) {
            const gradient = ctx.createLinearGradient(
                this.position.x - barWidth/2, 0,
                this.position.x - barWidth/2 + fillWidth, 0
            );
            gradient.addColorStop(0, '#00ffff');
            gradient.addColorStop(1, '#0088ff');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(this.position.x - barWidth/2, this.position.y + yOffset, fillWidth, barHeight);
        }
        
        // Queue indicator
        if (this.productionQueue.length > 1) {
            ctx.fillStyle = '#ffff00';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`+${this.productionQueue.length - 1}`, this.position.x, this.position.y + yOffset - 10);
        }
    }

    renderTerran(ctx, gameTime, color) {
        // Main structure
        ctx.fillStyle = color;
        ctx.fillRect(-this.size.width/2, -this.size.height/2, this.size.width, this.size.height);
        
        // Metal frame
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 3;
        ctx.strokeRect(-this.size.width/2, -this.size.height/2, this.size.width, this.size.height);
        
        // Windows/doors
        ctx.fillStyle = '#88aaff';
        ctx.fillRect(-this.size.width/4, -this.size.height/3, this.size.width/2, this.size.height/3);
        
        // Flashing lights
        if (Math.sin(gameTime * 3) > 0) {
            ctx.fillStyle = '#ffff00';
            ctx.beginPath();
            ctx.arc(-this.size.width/3, -this.size.height/3, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(this.size.width/3, -this.size.height/3, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Smoke/vents for factories
        if (this.name.includes('Factory') || this.name.includes('Starport')) {
            ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
            const smokeOffset = Math.sin(gameTime * 2) * 5;
            ctx.beginPath();
            ctx.ellipse(0, -this.size.height/2 - 10 + smokeOffset, 8, 5, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderZerg(ctx, gameTime, color) {
        // Organic shape with pulse effect
        const scale = this.pulseEffect;
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size.width/2 * scale, this.size.height/2 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Pulsing glow effect
        ctx.fillStyle = `rgba(255, 100, 200, ${0.2 * scale})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size.width/2 * (scale + 0.1), this.size.height/2 * (scale + 0.1), 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Organic details (veins/tendrils)
        ctx.strokeStyle = '#990066';
        ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI * 2) / 6;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(
                Math.cos(angle) * this.size.width/2 * scale,
                Math.sin(angle) * this.size.height/2 * scale
            );
            ctx.stroke();
        }
        
        // Opening animation for production
        if (this.isProducing()) {
            const opening = Math.sin(gameTime * 5) * 0.2 + 0.4;
            ctx.fillStyle = '#660033';
            ctx.beginPath();
            ctx.ellipse(0, 0, this.size.width/2 * opening, this.size.height/2 * opening, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderProtoss(ctx, gameTime, color) {
        // Crystalline structure
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(-this.size.width/2, this.size.height/2);
        ctx.lineTo(0, -this.size.height/2);
        ctx.lineTo(this.size.width/2, this.size.height/2);
        ctx.closePath();
        ctx.fill();
        
        // Glow effect
        const glowIntensity = Math.sin(gameTime * 2) * 0.3 + 0.7;
        ctx.shadowBlur = 20 * glowIntensity;
        ctx.shadowColor = color;
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Energy lines
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-this.size.width/4, 0);
        ctx.lineTo(this.size.width/4, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -this.size.height/4);
        ctx.lineTo(0, this.size.height/4);
        ctx.stroke();
        
        // Floating crystals
        const crystalOffset = Math.sin(gameTime * 1.5) * 5;
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(-this.size.width/3, crystalOffset, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.size.width/3, -crystalOffset, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    renderDefault(ctx, gameTime, color) {
        // Generic building
        ctx.fillStyle = color;
        ctx.fillRect(-this.size.width/2, -this.size.height/2, this.size.width, this.size.height);
        
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 2;
        ctx.strokeRect(-this.size.width/2, -this.size.height/2, this.size.width, this.size.height);
        
        // Door
        ctx.fillStyle = '#888888';
        ctx.fillRect(-10, this.size.height/2 - 20, 20, 20);
    }

    drawRallyPoint(ctx, game) {
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(this.position.x, this.position.y + this.size.height/2);
        ctx.lineTo(this.rallyPoint.x, this.rallyPoint.y);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw rally point marker
        ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(this.rallyPoint.x, this.rallyPoint.y, 8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.rallyPoint.x, this.rallyPoint.y, 8, 0, Math.PI * 2);
        ctx.stroke();
    }

    drawHealingEffect(ctx, gameTime) {
        const pulse = Math.sin(gameTime * 3) * 0.2 + 0.3;
        const radius = Math.max(this.size.width, this.size.height) / 2 + 10;
        
        ctx.fillStyle = `rgba(0, 255, 0, ${pulse})`;
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw plus symbols for healing
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+', this.position.x, this.position.y);
    }

    // Serialization for network/save
    serialize() {
        return {
            id: this.id,
            name: this.name,
            playerId: this.playerId,
            race: this.race.name,
            position: this.position,
            size: this.size,
            health: this.health,
            maxHealth: this.maxHealth,
            buildProgress: this.buildProgress,
            buildTime: this.buildTime,
            isConstructing: this.isConstructing,
            productionQueue: this.productionQueue,
            productionTime: this.productionTime,
            rallyPoint: this.rallyPoint,
            healing: this.healing,
            autoRepair: this.autoRepair
        };
    }

    static deserialize(data, game) {
        const race = Object.values(game.constants.RACES).find(r => r.name === data.race) || game.constants.RACES.TERRAN;
        const building = new Building(data.id, data.name, data.playerId, data.position, race);
        
        // Restore properties
        building.size = data.size;
        building.health = data.health;
        building.maxHealth = data.maxHealth;
        building.buildProgress = data.buildProgress;
        building.buildTime = data.buildTime;
        building.isConstructing = data.isConstructing;
        building.productionQueue = data.productionQueue;
        building.productionTime = data.productionTime;
        building.rallyPoint = data.rallyPoint;
        building.healing = data.healing;
        building.autoRepair = data.autoRepair;
        
        return building;
    }
}

export { Building };