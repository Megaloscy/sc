// Projectile Entity - Version 1.0.0
class Projectile {
    constructor(id, startPos, target, damage, playerId, race) {
        this.id = id;
        this.startPosition = { ...startPos };
        this.position = { ...startPos };
        this.target = target;
        this.damage = damage;
        this.playerId = playerId;
        this.race = race;
        
        // Physics
        this.speed = 400;
        this.lifetime = 3; // seconds
        this.age = 0;
        this.hasHit = false;
        
        // Visual effects
        this.trail = [];
        this.maxTrailLength = 8;
        this.size = 4;
        this.glowIntensity = 1.0;
        
        // Type-specific properties
        this.type = this.determineType();
        this.color = this.getColor();
        
        console.log(`Projectile created: ${this.type} from ${this.race.name}`);
    }

    determineType() {
        // Determine projectile type based on race and damage
        if (this.race.name === 'Protoss') return 'plasma';
        if (this.race.name === 'Zerg') return 'bio';
        if (this.damage > 20) return 'heavy';
        return 'standard';
    }

    getColor() {
        // Color based on race and type
        switch(this.race.name) {
            case 'Terran': return '#ff6600'; // Orange
            case 'Zerg': return '#ff00ff';   // Pink
            case 'Protoss': return '#ffff00'; // Yellow
            default: return this.race.color || '#ffffff';
        }
    }

    update(deltaTime) {
        this.age += deltaTime;
        this.lifetime -= deltaTime;
        
        // Fade out glow as projectile ages
        this.glowIntensity = Math.max(0, 1.0 - (this.age / 3));
        
        // Check if target is still valid
        if (!this.target || 
            (this.target.health !== undefined && this.target.health <= 0) ||
            this.hasHit) {
            this.lifetime = 0;
            return;
        }
        
        // Get target position
        const targetPos = this.target.position || this.target;
        const dx = targetPos.x - this.position.x;
        const dy = targetPos.y - this.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Check for hit
        if (distance < 10) {
            this.hitTarget();
            return;
        }
        
        // Move towards target
        this.position.x += (dx / distance) * this.speed * deltaTime;
        this.position.y += (dy / distance) * this.speed * deltaTime;
        
        // Update trail
        this.updateTrail();
    }

    hitTarget() {
        this.hasHit = true;
        this.lifetime = 0.1; // Short lifetime for hit effect
        
        // Apply damage to target
        if (this.target && this.target.takeDamage) {
            this.target.takeDamage(this.damage);
        }
        
        // Create hit effect
        this.createHitEffect();
    }

    updateTrail() {
        // Add current position to trail
        this.trail.push({ 
            x: this.position.x, 
            y: this.position.y,
            size: this.size * (0.5 + Math.random() * 0.5)
        });
        
        // Limit trail length
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }
    }

    createHitEffect() {
        // Create explosion/splash effect
        // This would typically be handled by a particle system
        console.log(`Projectile hit! Damage: ${this.damage}`);
    }

    render(ctx) {
        // Draw trail
        for (let i = 0; i < this.trail.length; i++) {
            const point = this.trail[i];
            const alpha = i / this.trail.length;
            const size = point.size * alpha;
            
            // Trail particle
            ctx.fillStyle = `rgba(255, ${Math.floor(100 + alpha * 155)}, 0, ${alpha * 0.7})`;
            ctx.beginPath();
            ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
            ctx.fill();
            
            // Connect trail points
            if (i > 0) {
                const prevPoint = this.trail[i - 1];
                ctx.strokeStyle = `rgba(255, ${Math.floor(150 + alpha * 105)}, 50, ${alpha * 0.5})`;
                ctx.lineWidth = size / 2;
                ctx.beginPath();
                ctx.moveTo(prevPoint.x, prevPoint.y);
                ctx.lineTo(point.x, point.y);
                ctx.stroke();
            }
        }
        
        // Draw projectile
        this.drawProjectile(ctx);
        
        // Draw hit effect if applicable
        if (this.hasHit) {
            this.drawHitEffect(ctx);
        }
    }

    drawProjectile(ctx) {
        // Main projectile body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        
        switch(this.type) {
            case 'plasma':
                // Plasma ball
                ctx.arc(this.position.x, this.position.y, this.size, 0, Math.PI * 2);
                // Glow effect
                ctx.shadowBlur = 15 * this.glowIntensity;
                ctx.shadowColor = this.color;
                break;
                
            case 'bio':
                // Organic projectile
                ctx.ellipse(this.position.x, this.position.y, this.size * 1.5, this.size, 0, 0, Math.PI * 2);
                // Pulsing effect
                const pulse = Math.sin(this.age * 20) * 0.2 + 0.8;
                ctx.shadowBlur = 10 * pulse;
                ctx.shadowColor = '#ff00ff';
                break;
                
            case 'heavy':
                // Heavy projectile
                ctx.rect(this.position.x - this.size, this.position.y - this.size/2, this.size * 2, this.size);
                // Trail flames
                this.drawFlameTrail(ctx);
                break;
                
            default:
                // Standard bullet
                ctx.arc(this.position.x, this.position.y, this.size, 0, Math.PI * 2);
                ctx.shadowBlur = 10 * this.glowIntensity;
                ctx.shadowColor = this.color;
        }
        
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Projectile core
        if (this.type !== 'heavy') {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(this.position.x, this.position.y, this.size/2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawFlameTrail(ctx) {
        // Draw flame effect behind heavy projectiles
        for (let i = 0; i < 3; i++) {
            const offset = -this.size * (i + 1) * 0.8;
            const flameSize = this.size * (1 - i * 0.3);
            const alpha = 0.7 - i * 0.2;
            
            const gradient = ctx.createRadialGradient(
                this.position.x + offset, this.position.y,
                0,
                this.position.x + offset, this.position.y,
                flameSize
            );
            
            gradient.addColorStop(0, `rgba(255, 255, 0, ${alpha})`);
            gradient.addColorStop(0.5, `rgba(255, 100, 0, ${alpha * 0.7})`);
            gradient.addColorStop(1, `rgba(255, 0, 0, 0)`);
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.position.x + offset, this.position.y, flameSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawHitEffect(ctx) {
        // Explosion effect
        const explosionSize = this.size * 3;
        const gradient = ctx.createRadialGradient(
            this.position.x, this.position.y,
            0,
            this.position.x, this.position.y,
            explosionSize
        );
        
        gradient.addColorStop(0, `rgba(255, 255, 100, 0.8)`);
        gradient.addColorStop(0.3, `rgba(255, 100, 0, 0.6)`);
        gradient.addColorStop(1, `rgba(255, 0, 0, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, explosionSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Shockwave
        ctx.strokeStyle = `rgba(255, 255, 255, 0.5)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, explosionSize * 0.7, 0, Math.PI * 2);
        ctx.stroke();
    }

    isAlive() {
        return this.lifetime > 0;
    }

    // Serialization for network
    serialize() {
        return {
            id: this.id,
            position: this.position,
            targetId: this.target?.id,
            damage: this.damage,
            playerId: this.playerId,
            race: this.race.name,
            type: this.type,
            lifetime: this.lifetime,
            age: this.age,
            hasHit: this.hasHit
        };
    }

    static deserialize(data, game) {
        // Find target by ID
        let target = null;
        if (data.targetId) {
            target = game.units.get(data.targetId) || game.buildings.get(data.targetId);
        }
        
        const race = Object.values(game.constants.RACES).find(r => r.name === data.race) || game.constants.RACES.TERRAN;
        const projectile = new Projectile(data.id, data.position, target, data.damage, data.playerId, race);
        
        // Restore state
        projectile.position = data.position;
        projectile.lifetime = data.lifetime;
        projectile.age = data.age;
        projectile.hasHit = data.hasHit;
        projectile.type = data.type;
        
        return projectile;
    }
}

export { Projectile };