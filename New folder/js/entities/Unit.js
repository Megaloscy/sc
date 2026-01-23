
import { UNIT_TYPES, COMMAND_TYPES, UNIT_DEFINITIONS } from '../core/GameConstants.js';
import { Projectile } from './Projectile.js';
import { Building } from './Building.js';

// Unit Entity - Version 1.0.2 - FIXED COMMANDS
class Unit {
    constructor(id, name, type, playerId, position, race) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.playerId = playerId;
        this.race = race;
        
        // Position
        this.position = { ...position };
        this.targetPosition = { ...position };
        this.velocity = { x: 0, y: 0 };
        
        // Stats from definitions
        const definition = UNIT_DEFINITIONS[type.toUpperCase()] || UNIT_DEFINITIONS.INFANTRY;
        this.radius = definition.radius;
        this.maxHealth = definition.health;
        this.health = this.maxHealth;
        this.speed = definition.speed;
        this.attackRange = definition.attackRange;
        this.attackDamage = definition.attackDamage;
        this.attackSpeed = definition.attackSpeed;
        this.buildTime = definition.buildTime;
        
        // State
        this.state = 'idle';
        this.target = null;
        this.gatherTarget = null;
        this.buildTarget = null;
        this.patrolPath = null;
        this.attackMove = false;
        this.attackCooldown = 0;
        
        // Animation
        this.animationTime = 0;
        this.rotation = 0;
        this.walkCycle = 0;
        
        // Memory
        this.lastKnownPosition = { ...position };
        this.commandQueue = [];
        
        console.log(`Unit created: ${this.name} (${this.id}) at ${position.x},${position.y}`);
    }

    update(deltaTime, game) {
        this.animationTime += deltaTime;
        this.walkCycle += deltaTime * this.speed * 0.1;
        
        // Update attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
        }
        
        // Process command queue
        this.processCommandQueue();
        
        // Update based on state
        switch(this.state) {
            case 'moving':
                this.updateMovement(deltaTime, game);
                break;
            case 'attacking':
                this.updateAttack(deltaTime, game);
                break;
            case 'gathering':
                this.updateGathering(deltaTime, game);
                break;
            case 'building':
                this.updateBuilding(deltaTime, game);
                break;
            case 'patrolling':
                this.updatePatrol(deltaTime, game);
                break;
        }
        
        // Auto-attack if in attack move mode
        if (this.attackMove && 
            this.state !== 'attacking' && 
            this.state !== 'gathering' && 
            this.state !== 'building') {
            this.findAndAttackEnemy(game);
        }
        
        // Update rotation
        if (this.velocity.x !== 0 || this.velocity.y !== 0) {
            this.rotation = Math.atan2(this.velocity.y, this.velocity.x);
        }
        
        // Apply velocity
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        
        // Keep in bounds
        this.clampToWorld(game);
    }

    processCommandQueue() {
        if (this.commandQueue.length > 0 && this.state === 'idle') {
            const command = this.commandQueue.shift();
            this.executeCommand(command);
        }
    }

    executeCommand(command) {
        console.log(`Unit ${this.id} executing command: ${command.type}`);
        
        switch(command.type) {
            case COMMAND_TYPES.MOVE:
                this.moveTo(command.target);
                break;
            case COMMAND_TYPES.ATTACK:
                this.attack(command.target);
                break;
            case COMMAND_TYPES.GATHER:
                this.gather(command.target);
                break;
            case COMMAND_TYPES.PATROL:
                this.setPatrol(command.start, command.end);
                break;
            case COMMAND_TYPES.BUILD:
                this.startBuilding(command.buildingData, command.position);
                break;
            case COMMAND_TYPES.STOP:
                this.stop();
                break;
            default:
                console.warn(`Unknown command type: ${command.type}`);
        }
    }

    queueCommand(command) {
        this.commandQueue.push(command);
        console.log(`Command queued: ${command.type} for unit ${this.id}`);
    }

    updateMovement(deltaTime, game) {
        const dx = this.targetPosition.x - this.position.x;
        const dy = this.targetPosition.y - this.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 10) { // Increased from 5 to 10 for better reach
            // Reached destination
            this.velocity.x = 0;
            this.velocity.y = 0;
            
            console.log(`Unit ${this.id} reached position, checking next action`);
            
            // Check what to do next based on our targets
            if (this.gatherTarget) {
                // Check if we're at the resource
                const resourceDist = game.distance(this.position, this.gatherTarget.position);
                if (resourceDist < this.radius + this.gatherTarget.radius + 10) {
                    // Close enough to resource, start gathering
                    this.state = 'gathering';
                    console.log(`Unit ${this.id} at resource, starting to gather`);
                } else {
                    // Not at resource, move closer
                    console.log(`Unit ${this.id} not at resource yet, moving closer`);
                    this.targetPosition = this.gatherTarget.position;
                }
            } else if (this.target) {
                // We have an attack target
                const targetPos = this.target.position || this.target;
                const targetDist = game.distance(this.position, targetPos);
                if (targetDist <= this.attackRange) {
                    // In range, start attacking
                    this.state = 'attacking';
                    console.log(`Unit ${this.id} in attack range, starting to attack`);
                } else {
                    // Not in range, keep moving
                    console.log(`Unit ${this.id} not in attack range yet`);
                    this.targetPosition = targetPos;
                }
            } else if (this.buildTarget) {
                // We have a build target
                this.state = 'building';
                console.log(`Unit ${this.id} at build site, starting to build`);
            } else if (this.patrolPath) {
                // We're patrolling
                this.advancePatrolPoint();
            } else {
                // Just moving to a location with no further action
                this.state = 'idle';
                console.log(`Unit ${this.id} reached destination and is idle`);
            }
        } else {
            // Move towards target
            this.velocity.x = (dx / distance) * this.speed;
            this.velocity.y = (dy / distance) * this.speed;
            
            // Avoid collisions
            this.avoidCollisions(game);
        }
    }

    advancePatrolPoint() {
        if (!this.patrolPath || !this.patrolPath.points || this.patrolPath.points.length < 2) {
            this.state = 'idle';
            return;
        }
        
        if (!this.patrolPath.currentTarget) {
            this.patrolPath.currentTarget = this.patrolPath.points[0];
        }
        
        const currentIndex = this.patrolPath.points.indexOf(this.patrolPath.currentTarget);
        const nextIndex = (currentIndex + 1) % this.patrolPath.points.length;
        this.patrolPath.currentTarget = this.patrolPath.points[nextIndex];
        
        console.log(`Unit ${this.id} advancing to next patrol point ${nextIndex}`);
        this.moveTo(this.patrolPath.currentTarget);
    }

    avoidCollisions(game) {
        const avoidanceForce = { x: 0, y: 0 };
        const avoidanceRadius = this.radius * 3;
        
        // Avoid other units
        for (const [id, otherUnit] of game.units) {
            if (id === this.id) continue;
            
            const dx = otherUnit.position.x - this.position.x;
            const dy = otherUnit.position.y - this.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < avoidanceRadius && distance > 0) {
                const force = (avoidanceRadius - distance) / avoidanceRadius;
                avoidanceForce.x -= (dx / distance) * force * 30;
                avoidanceForce.y -= (dy / distance) * force * 30;
            }
        }
        
        // Apply avoidance
        if (avoidanceForce.x !== 0 || avoidanceForce.y !== 0) {
            const avoidanceAngle = Math.atan2(avoidanceForce.y, avoidanceForce.x);
            const avoidanceMagnitude = Math.sqrt(avoidanceForce.x * avoidanceForce.x + avoidanceForce.y * avoidanceForce.y);
            const maxAvoidance = this.speed * 0.3;
            
            this.velocity.x += Math.cos(avoidanceAngle) * Math.min(avoidanceMagnitude, maxAvoidance);
            this.velocity.y += Math.sin(avoidanceAngle) * Math.min(avoidanceMagnitude, maxAvoidance);
            
            // Normalize speed
            const currentSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
            if (currentSpeed > this.speed) {
                this.velocity.x = (this.velocity.x / currentSpeed) * this.speed;
                this.velocity.y = (this.velocity.y / currentSpeed) * this.speed;
            }
        }
    }

    updateAttack(deltaTime, game) {
        if (!this.target || (this.target.health !== undefined && this.target.health <= 0)) {
            this.state = 'idle';
            this.target = null;
            console.log(`Unit ${this.id} attack target lost`);
            return;
        }
        
        const targetPos = this.target.position || this.target;
        const dx = targetPos.x - this.position.x;
        const dy = targetPos.y - this.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > this.attackRange) {
            // Move towards target
            this.targetPosition = targetPos;
            this.state = 'moving';
            console.log(`Unit ${this.id} moving closer to attack target`);
            this.updateMovement(deltaTime, game);
        } else {
            // Stop and attack
            this.velocity.x = 0;
            this.velocity.y = 0;
            
            if (this.attackCooldown <= 0) {
                this.performAttack(game);
                this.attackCooldown = 1 / this.attackSpeed;
            }
        }
    }

    performAttack(game) {
        if (!this.target) return;
        
        console.log(`Unit ${this.id} attacking ${this.target.id}`);
        
        // Create projectile for ranged attacks
        if (this.attackRange > 20) {
            const projectile = new Projectile(
                `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                this.position,
                this.target,
                this.attackDamage,
                this.playerId,
                this.race
            );
            game.projectiles.set(projectile.id, projectile);
        }
        
        // Apply damage if in range
        const targetPos = this.target.position || this.target;
        if (game.distance(this.position, targetPos) <= this.attackRange) {
            if (this.target.takeDamage) {
                const isDestroyed = this.target.takeDamage(this.attackDamage);
                if (isDestroyed) {
                    this.target = null;
                    this.state = 'idle';
                }
            }
        }
    }

    updateGathering(deltaTime, game) {
        // Check if resource still exists and has resources
        if (!this.gatherTarget || 
            !game.resources.has(this.gatherTarget.id) || 
            this.gatherTarget.amount <= 0) {
            this.state = 'idle';
            this.gatherTarget = null;
            console.log(`Unit ${this.id} resource depleted or gone`);
            return;
        }
        
        // Check if we're still at the resource
        const distance = game.distance(this.position, this.gatherTarget.position);
        if (distance > this.radius + this.gatherTarget.radius + 15) {
            // Moved away from resource, go back
            console.log(`Unit ${this.id} moved away from resource, returning`);
            this.targetPosition = this.gatherTarget.position;
            this.state = 'moving';
            this.updateMovement(deltaTime, game);
            return;
        }
        
        // Gather resource
        this.velocity.x = 0;
        this.velocity.y = 0;
        
        // Face the resource
        const dx = this.gatherTarget.position.x - this.position.x;
        const dy = this.gatherTarget.position.y - this.position.y;
        if (dx !== 0 || dy !== 0) {
            this.rotation = Math.atan2(dy, dx);
        }
        
        // Gather every second (simplified)
        this.animationTime += deltaTime;
        if (this.animationTime >= 1.0) {
            this.animationTime = 0;
            
            const gathered = Math.min(10, this.gatherTarget.amount);
            this.gatherTarget.amount -= gathered;
            
            // Add to player resources
            const resourceType = this.gatherTarget.type === 'mineral' ? 'metal' : 'gas';
            game.addResources(this.playerId, {
                [resourceType]: gathered
            });
            
            console.log(`Unit ${this.id} gathered ${gathered} ${resourceType}, remaining: ${this.gatherTarget.amount}`);
            
            if (this.gatherTarget.amount <= 0) {
                game.resources.delete(this.gatherTarget.id);
                this.state = 'idle';
                this.gatherTarget = null;
                console.log(`Unit ${this.id} finished gathering resource`);
            }
        }
    }

    updateBuilding(deltaTime, game) {
        if (!this.buildTarget) {
            this.state = 'idle';
            console.log(`Unit ${this.id} building target lost`);
            return;
        }
        
        // Orbit around build site
        const orbitSpeed = 2;
        const orbitRadius = 20;
        this.position.x = this.buildTarget.position.x + Math.cos(this.animationTime * orbitSpeed) * orbitRadius;
        this.position.y = this.buildTarget.position.y + Math.sin(this.animationTime * orbitSpeed) * orbitRadius;
        
        // Face the build site
        this.rotation = Math.atan2(
            this.buildTarget.position.y - this.position.y,
            this.buildTarget.position.x - this.position.x
        );
        
        this.buildTarget.buildProgress += deltaTime;
        
        // Show construction particles
        if (Math.random() < 0.3) {
            this.createConstructionParticle(game);
        }
        
        if (this.buildTarget.buildProgress >= this.buildTarget.buildTime) {
            // Construction complete
            this.completeBuilding(game);
        }
    }

    createConstructionParticle(game) {
        // Create construction particle effect
        const particle = {
            x: this.position.x + (Math.random() - 0.5) * 10,
            y: this.position.y + (Math.random() - 0.5) * 10,
            vx: (Math.random() - 0.5) * 20,
            vy: (Math.random() - 0.5) * 20,
            life: 1,
            color: '#ffff00'
        };
        
        // Add to game's particle system
        if (!game.particles) game.particles = [];
        game.particles.push(particle);
    }

    completeBuilding(game) {
        console.log(`Unit ${this.id} completed building ${this.buildTarget.name}`);
        
        const building = new Building(
            `building_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            this.buildTarget.name,
            this.playerId,
            this.buildTarget.position,
            this.race
        );
        
        // Set size from building data
        if (this.buildTarget.size) {
            building.size = this.buildTarget.size;
        }
        
        // Set health based on construction quality
        building.health = building.maxHealth * 0.8; // Start at 80% health
        
        // Set rally point
        building.rallyPoint = {
            x: building.position.x,
            y: building.position.y + 50
        };
        
        game.buildings.set(building.id, building);
        if (building.playerId === game.localPlayer.id) {
            game.localPlayer.buildings.add(building.id);
        }
        
        this.state = 'idle';
        this.buildTarget = null;
        
        console.log(`Building ${building.name} created at ${building.position.x}, ${building.position.y}`);
    }

    updatePatrol(deltaTime, game) {
        if (!this.patrolPath || !this.patrolPath.currentTarget) {
            this.state = 'idle';
            console.log(`Unit ${this.id} patrol path lost`);
            return;
        }
        
        // Just let updateMovement handle reaching patrol points
        // The advancePatrolPoint method will be called when we reach a point
    }

    findAndAttackEnemy(game) {
        let nearestEnemy = null;
        let nearestDistance = Infinity;
        
        // Check enemy units
        for (const [id, unit] of game.units) {
            if (unit.playerId !== this.playerId && unit.health > 0) {
                const dist = game.distance(this.position, unit.position);
                if (dist < this.attackRange * 1.5 && dist < nearestDistance) {
                    nearestDistance = dist;
                    nearestEnemy = unit;
                }
            }
        }
        
        // Check enemy buildings
        for (const [id, building] of game.buildings) {
            if (building.playerId !== this.playerId && building.health > 0) {
                const dist = game.distance(this.position, building.position);
                const buildingRadius = Math.max(building.size.width, building.size.height) / 2;
                if (dist < this.attackRange + buildingRadius && dist < nearestDistance) {
                    nearestDistance = dist;
                    nearestEnemy = building;
                }
            }
        }
        
        if (nearestEnemy) {
            this.attack(nearestEnemy);
            console.log(`Unit ${this.id} auto-attacking enemy`);
        }
    }

    clampToWorld(game) {
        this.position.x = Math.max(this.radius, Math.min(game.worldSize.width - this.radius, this.position.x));
        this.position.y = Math.max(this.radius, Math.min(game.worldSize.height - this.radius, this.position.y));
    }

    // ========== PUBLIC COMMAND METHODS ==========
    
    moveTo(position) {
        console.log(`Unit ${this.id} moving to ${position.x}, ${position.y}`);
        this.targetPosition = { ...position };
        this.state = 'moving';
        this.clearTargets();
        this.patrolPath = null;
        this.attackMove = false;
    }

    attack(target) {
        console.log(`Unit ${this.id} attacking target ${target.id || 'position'}`);
        this.target = target;
        this.clearTargets();
        this.patrolPath = null;
        this.attackMove = false;
        
        // Start moving toward the target
        const targetPos = target.position || target;
        this.targetPosition = { ...targetPos };
        this.state = 'moving';
    }

    stop() {
        console.log(`Unit ${this.id} stopping`);
        this.state = 'idle';
        this.velocity.x = 0;
        this.velocity.y = 0;
        this.clearTargets();
        this.attackMove = false;
        this.commandQueue = [];
    }

    setAttackMove(enabled) {
        console.log(`Unit ${this.id} attack move ${enabled ? 'enabled' : 'disabled'}`);
        this.attackMove = enabled;
    }

    setPatrol(start, end) {
        console.log(`Unit ${this.id} setting patrol from ${start.x},${start.y} to ${end.x},${end.y}`);
        this.patrolPath = {
            points: [start, end],
            currentTarget: null
        };
        this.state = 'patrolling';
        this.clearTargets();
        this.moveTo(start);
    }

    gather(resource) {
        console.log(`Unit ${this.id} gathering resource ${resource.id} at ${resource.position.x},${resource.position.y}`);
        
        // Validate resource
        if (!resource || !resource.position || resource.amount <= 0) {
            console.log(`Invalid resource for gathering`);
            return;
        }
        
        this.gatherTarget = resource;
        this.clearTargets();
        this.patrolPath = null;
        this.attackMove = false;
        
        // Start moving toward the resource
        this.targetPosition = { ...resource.position };
        this.state = 'moving';
    }

    startBuilding(buildingData, position) {
        console.log(`Unit ${this.id} starting to build ${buildingData.name} at ${position.x},${position.y}`);
        
        const game = window.game;
        if (!game) {
            console.error('Game instance not found');
            return;
        }
        
        // Find valid position for building
        const buildingRadius = Math.max(buildingData.size.width, buildingData.size.height) / 2;
        const validPos = game.collisionSystem.findClosestPosition(position, buildingRadius);
        
        this.buildTarget = {
            name: buildingData.name,
            position: validPos,
            buildTime: buildingData.buildTime,
            buildProgress: 0,
            size: buildingData.size,
            cost: buildingData.cost
        };
        this.clearTargets();
        
        // Start moving to build site
        this.targetPosition = validPos;
        this.state = 'moving';
    }

    clearTargets() {
        this.target = null;
        this.gatherTarget = null;
        this.buildTarget = null;
    }

    takeDamage(amount) {
        this.health -= amount;
        console.log(`Unit ${this.id} took ${amount} damage, health: ${this.health}/${this.maxHealth}`);
        return this.health <= 0;
    }

    canAttack() {
        return this.attackRange > 0 && this.attackDamage > 0;
    }

    isWorker() {
        return this.type === UNIT_TYPES.WORKER;
    }

    // Rendering methods (unchanged from before)
    render(ctx, gameTime, game) {
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.rotation);
        
        // Get player color
        const player = game.players.get(this.playerId);
        const color = player ? player.color : this.race.color;
        
        // Draw based on type
        switch(this.type) {
            case UNIT_TYPES.WORKER:
                this.renderWorker(ctx, gameTime, color);
                break;
            case UNIT_TYPES.INFANTRY:
                this.renderInfantry(ctx, gameTime, color);
                break;
            case UNIT_TYPES.VEHICLE:
                this.renderVehicle(ctx, gameTime, color);
                break;
            default:
                this.renderDefault(ctx, color);
        }
        
        ctx.restore();
        
        // Draw health bar if damaged
        if (this.health < this.maxHealth) {
            this.drawHealthBar(ctx, game);
        }
    }

    drawHealthBar(ctx, game) {
        const screenPos = game.renderSystem.worldToScreen(this.position);
        const barWidth = this.radius * 2 * game.camera.zoom;
        const barHeight = 4 * game.camera.zoom;
        const yOffset = (this.radius + 8) * game.camera.zoom;
        
        const healthPercent = this.health / this.maxHealth;
        
        // Background
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(screenPos.x - barWidth/2, screenPos.y - yOffset, barWidth, barHeight);
        
        // Health
        if (healthPercent > 0) {
            const fillWidth = barWidth * healthPercent;
            const gradient = ctx.createLinearGradient(
                screenPos.x - barWidth/2, 0,
                screenPos.x - barWidth/2 + fillWidth, 0
            );
            gradient.addColorStop(0, '#00ff00');
            gradient.addColorStop(1, '#00cc00');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(screenPos.x - barWidth/2, screenPos.y - yOffset, fillWidth, barHeight);
        }
        
        // Border
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(screenPos.x - barWidth/2, screenPos.y - yOffset, barWidth, barHeight);
    }

    renderWorker(ctx, gameTime, color) {
        // Body
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Tool animation
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3;
        ctx.beginPath();
        const toolAngle = Math.sin(gameTime * 5) * 0.5;
        ctx.moveTo(this.radius * 0.7, 0);
        ctx.lineTo(this.radius * 1.8, Math.sin(toolAngle) * this.radius * 0.5);
        ctx.stroke();
        
        // Walking animation
        if (this.state === 'moving') {
            ctx.fillStyle = '#666666';
            const legOffset = Math.sin(this.walkCycle) * 3;
            ctx.fillRect(-this.radius * 0.3, legOffset, this.radius * 0.6, this.radius * 0.8);
            ctx.fillRect(this.radius * 0.3, -legOffset, this.radius * 0.6, this.radius * 0.8);
        }
        
        // Gathering animation
        if (this.state === 'gathering') {
            ctx.fillStyle = '#ffff00';
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderInfantry(ctx, gameTime, color) {
        // Body
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Helmet
        ctx.fillStyle = '#333333';
        ctx.beginPath();
        ctx.arc(0, -this.radius * 0.3, this.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        
        // Gun
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(this.radius * 0.5, 0);
        ctx.lineTo(this.radius * 1.5, 0);
        ctx.stroke();
        
        // Muzzle flash
        if (this.state === 'attacking' && Math.sin(gameTime * 20) > 0.8) {
            ctx.fillStyle = '#ffff00';
            ctx.beginPath();
            ctx.arc(this.radius * 1.7, 0, this.radius * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderVehicle(ctx, gameTime, color) {
        // Chassis
        ctx.fillStyle = color;
        ctx.fillRect(-this.radius, -this.radius * 0.6, this.radius * 2, this.radius * 1.2);
        
        // Tracks
        ctx.fillStyle = '#333333';
        ctx.fillRect(-this.radius * 0.9, -this.radius * 0.7, this.radius * 1.8, this.radius * 0.2);
        ctx.fillRect(-this.radius * 0.9, this.radius * 0.5, this.radius * 1.8, this.radius * 0.2);
        
        // Turret
        ctx.fillStyle = '#555555';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        
        // Barrel
        ctx.strokeStyle = '#222222';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(this.radius * 1.2, 0);
        ctx.stroke();
        
        // Track animation
        if (this.state === 'moving') {
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 2;
            const trackOffset = this.walkCycle % 10;
            for (let i = -this.radius * 0.8; i < this.radius * 0.8; i += 10) {
                ctx.beginPath();
                ctx.moveTo(i + trackOffset, -this.radius * 0.6);
                ctx.lineTo(i + trackOffset, this.radius * 0.6);
                ctx.stroke();
            }
        }
    }

    renderDefault(ctx, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

export { Unit };