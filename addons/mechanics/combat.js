// File: addons/mechanics/combat.js
import AddonRegistry from '/sc/addons/addon-registry.js';

class CombatSystem {
    constructor() {
        this.unitsInCombat = new Map();
        this.combatLog = [];
        this.attackQueue = [];
    }

    attackEntities(attacker, target) {
        console.log(`⚔️ ${attacker.id || attacker.owner || 'Unit'} attacks ${target.id || target.owner || 'target'}`);
        
        // Simple damage calculation
        const damage = 10; // Base damage
        target.health = (target.health || 100) - damage;
        
        this.combatLog.push({
            attacker: attacker.id || attacker.owner || 'Unknown',
            target: target.id || target.owner || 'Unknown',
            damage: damage,
            remainingHealth: target.health,
            timestamp: Date.now()
        });
        
        if (target.health <= 0) {
            console.log(`💀 ${target.id || target.owner || 'Target'} defeated!`);
            return { result: 'defeated', damage: damage };
        }
        return { result: 'hit', damage: damage };
    }

    // ✅ This is the missing method
    getCombatLog() {
        return [...this.combatLog];
    }

    clearCombatLog() {
        this.combatLog = [];
    }

    getRecentCombat(limit = 5) {
        return this.combatLog.slice(-limit);
    }

    // Additional useful methods
    queueAttack(attacker, target) {
        this.attackQueue.push({ attacker, target });
    }

    processAttackQueue() {
        const results = [];
        while (this.attackQueue.length > 0) {
            const { attacker, target } = this.attackQueue.shift();
            results.push(this.attackEntities(attacker, target));
        }
        return results;
    }

    getCombatStats() {
        const totalDamage = this.combatLog.reduce((sum, entry) => sum + entry.damage, 0);
        const kills = this.combatLog.filter(entry => entry.remainingHealth <= 0).length;
        
        return {
            totalBattles: this.combatLog.length,
            totalDamage: totalDamage,
            kills: kills,
            averageDamage: this.combatLog.length > 0 ? totalDamage / this.combatLog.length : 0
        };
    }
}

// Register this addon with the system
AddonRegistry.register('CombatSystem', 
    (gameEngine) => {
        console.log('⚔️ Initializing CombatSystem addon');
        const combatSystem = new CombatSystem();
        
        // Attach to game engine
        gameEngine.combat = combatSystem;
        
        // Store instance in registry
        const addonData = AddonRegistry.getAddon('CombatSystem');
        if (addonData) {
            addonData.instance = combatSystem;
        }
        
        console.log('✅ CombatSystem ready with getCombatLog() method');
        return combatSystem;
    },
    {
        version: '1.0.0',
        author: 'Game Dev',
        damageMultiplier: 1.0,
        friendlyFire: false,
        methods: ['attackEntities', 'getCombatLog', 'clearCombatLog', 'getCombatStats']
    }
);

export default CombatSystem;