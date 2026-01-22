export default class CombatSystem {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.name = 'combat';
        this.units = new Map();
        this.dependencies = ['resource'];
    }

    async init() {
        console.log('Initializing CombatSystem...');
        
        // Register default unit types
        this.registerUnitTypes();
        
        return this;
    }

    registerUnitTypes() {
        this.unitTypes = {
            'marine': {
                health: 40,
                damage: 6,
                range: 4,
                attackSpeed: 1.5,
                armor: 0,
                cost: { minerals: 50 }
            },
            'zealot': {
                health: 100,
                damage: 16,
                range: 1,
                attackSpeed: 1.4,
                armor: 1,
                cost: { minerals: 100 }
            },
            'zergling': {
                health: 35,
                damage: 5,
                range: 1,
                attackSpeed: 0.7,
                armor: 0,
                cost: { minerals: 25 }
            }
        };
        
        console.log('Registered unit types:', Object.keys(this.unitTypes));
    }

    createUnit(playerId, unitType, x, y) {
        const unitDef = this.unitTypes[unitType];
        if (!unitDef) {
            console.error(`Unknown unit type: ${unitType}`);
            return null;
        }
        
        const unitId = `unit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const unit = {
            id: unitId,
            playerId,
            type: unitType,
            x,
            y,
            health: unitDef.health,
            maxHealth: unitDef.health,
            damage: unitDef.damage,
            range: unitDef.range,
            attackSpeed: unitDef.attackSpeed,
            armor: unitDef.armor,
            target: null,
            lastAttack: 0
        };
        
        this.units.set(unitId, unit);
        
        // Trigger event
        this.gameEngine.triggerEvent('unit:created', unit);
        
        return unit;
    }

    attack(attackerId, targetId) {
        const attacker = this.units.get(attackerId);
        const target = this.units.get(targetId);
        
        if (!attacker || !target) {
            return false;
        }
        
        const distance = Math.sqrt(
            Math.pow(attacker.x - target.x, 2) + 
            Math.pow(attacker.y - target.y, 2)
        );
        
        if (distance > attacker.range) {
            return false; // Target out of range
        }
        
        const now = Date.now();
        if (now - attacker.lastAttack < 1000 / attacker.attackSpeed) {
            return false; // Attack on cooldown
        }
        
        // Calculate damage
        const damage = Math.max(1, attacker.damage - target.armor);
        target.health -= damage;
        
        attacker.lastAttack = now;
        
        // Trigger events
        this.gameEngine.triggerEvent('unit:attacked', {
            attacker: attacker,
            target: target,
            damage: damage
        });
        
        if (target.health <= 0) {
            this.units.delete(targetId);
            this.gameEngine.triggerEvent('unit:died', target);
        }
        
        return true;
    }

    onEvent(eventName, data) {
        switch (eventName) {
            case 'update':
                this.updateCombat();
                break;
                
            case 'unit:command':
                if (data.command === 'attack') {
                    this.attack(data.unitId, data.targetId);
                }
                break;
        }
    }

    updateCombat() {
        // Auto-attack logic for units with targets
        for (const [unitId, unit] of this.units) {
            if (unit.target) {
                this.attack(unitId, unit.target);
            }
        }
    }

    destroy() {
        console.log('Combat system destroyed');
        this.units.clear();
    }
}