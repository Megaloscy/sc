// File: addons/mechanics/combat.js
import AddonRegistry from '/sc/addons/addon-registry.js';
class CombatSystem {
  constructor(eventSystem) {
    console.log("Initializing CombatSystem...");
    
    this.eventSystem = eventSystem;
    this.combatLog = [];
    this.unitStats = new Map();
    
    // Setup event listeners
    if (this.eventSystem) {
      this.setupEventListeners();
    }
    
    console.log("CombatSystem ready");
  }

  setupEventListeners() {
    console.log("Setting up CombatSystem event listeners...");
    
    // Bind methods
    const boundHandleMoveOrder = this.handleMoveOrder.bind(this);
    const boundHandleAttackMoveOrder = this.handleAttackMoveOrder.bind(this);
    const boundHandleUnitDamaged = this.handleUnitDamaged.bind(this);
    const boundHandleUnitDestroyed = this.handleUnitDestroyed.bind(this);
    
    // Register listeners
    this.eventSystem.on('move_order_issued', boundHandleMoveOrder);
    this.eventSystem.on('attack_order_issued', boundHandleAttackMoveOrder);
    this.eventSystem.on('unit_damaged', boundHandleUnitDamaged);
    this.eventSystem.on('unit_destroyed', boundHandleUnitDestroyed);
    
    console.log("CombatSystem event listeners registered");
  }

  handleMoveOrder(data) {
    console.log("Move order received for units:", data.unitIds);
    
    const units = window.gameUnits;
    if (!units) {
      console.error("Units not available");
      return;
    }
    
    data.unitIds.forEach(unitId => {
      const unit = units.get(unitId);
      if (unit && unit.attackTarget) {
        unit.clearAttackTarget();
      }
    });
  }

  handleAttackMoveOrder(data) {
    console.log("Attack-move order received");
    
    const units = window.gameUnits;
    if (!units) return;
    
    const nearestEnemy = this.findNearestEnemyToPosition(
      data.unitIds,
      data.target.x,
      data.target.y,
      data.playerId
    );
    
    if (nearestEnemy) {
      data.unitIds.forEach(unitId => {
        const unit = units.get(unitId);
        if (unit && unit.canAttack) {
          unit.attackTargetUnit(nearestEnemy.id);
        }
      });
      
      this.eventSystem.emit('attack_move_executed', {
        unitIds: data.unitIds,
        targetEnemy: nearestEnemy.id
      });
    } else {
      data.unitIds.forEach(unitId => {
        const unit = units.get(unitId);
        if (unit) {
          unit.moveTo(data.target.x, data.target.y);
        }
      });
    }
  }

  attack(attackerId, targetId, damage) {
    const units = window.gameUnits;
    if (!units) return false;
    
    const attacker = units.get(attackerId);
    const target = units.get(targetId);
    
    if (!attacker || !target || target.health <= 0) {
      return false;
    }
    
    if (target.owner === attacker.owner) {
      console.log("Cannot attack ally");
      return false;
    }
    
    target.lastAttacker = attackerId;
    target.takeDamage(damage);
    
    this.updateUnitStats(attackerId, { damageDealt: damage });
    
    this.combatLog.push({
      timestamp: Date.now(),
      attacker: attackerId,
      target: targetId,
      damage,
      targetHealth: target.health
    });
    
    return true;
  }

  findNearestEnemyToPosition(unitIds, x, y, playerId) {
    const units = window.gameUnits;
    if (!units) return null;
    
    let nearestEnemy = null;
    let nearestDistance = Infinity;
    
    units.forEach((unit, unitId) => {
      if (unit.owner === playerId || unit.health <= 0) return;
      
      const distance = Math.sqrt(
        Math.pow(unit.x - x, 2) + 
        Math.pow(unit.y - y, 2)
      );
      
      if (distance < nearestDistance && distance < 300) {
        nearestDistance = distance;
        nearestEnemy = unit;
      }
    });
    
    return nearestEnemy;
  }

  findEnemyInRange(unitId, range) {
    const units = window.gameUnits;
    if (!units) return null;
    
    const unit = units.get(unitId);
    if (!unit) return null;
    
    let closestEnemy = null;
    let closestDistance = Infinity;
    
    units.forEach((otherUnit, otherId) => {
      if (otherId === unitId || otherUnit.owner === unit.owner || otherUnit.health <= 0) {
        return;
      }
      
      const distance = Math.sqrt(
        Math.pow(otherUnit.x - unit.x, 2) + 
        Math.pow(otherUnit.y - unit.y, 2)
      );
      
      if (distance <= range && distance < closestDistance) {
        closestDistance = distance;
        closestEnemy = otherUnit;
      }
    });
    
    return closestEnemy;
  }

  handleUnitDamaged(data) {
    // Could add visual effects or sound here
    console.log(`Unit ${data.unitId} took ${data.damage} damage`);
  }

  handleUnitDestroyed(data) {
    console.log(`Unit ${data.unitId} destroyed`);
    
    if (data.killerId) {
      this.updateUnitStats(data.killerId, { kills: 1 });
      
      this.eventSystem.emit('unit_killed', {
        killerId: data.killerId,
        victimId: data.unitId,
        victimType: data.type
      });
    }
    
    // Remove unit from global units map
    const units = window.gameUnits;
    if (units) {
      units.delete(data.unitId);
    }
  }

  updateUnitStats(unitId, stats) {
    if (!this.unitStats.has(unitId)) {
      this.unitStats.set(unitId, { kills: 0, damageDealt: 0 });
    }
    
    const currentStats = this.unitStats.get(unitId);
    Object.keys(stats).forEach(key => {
      currentStats[key] = (currentStats[key] || 0) + stats[key];
    });
  }

  update(deltaTime) {
    const units = window.gameUnits;
    if (!units) return;
    
    // Auto-attack logic
    units.forEach((unit, unitId) => {
      if (unit.canAttack && unit.state === 'idle' && !unit.attackTarget) {
        const enemy = this.findEnemyInRange(unitId, unit.attackRange);
        if (enemy) {
          unit.attackTargetUnit(enemy.id);
        }
      }
    });
  }

  getCombatStats() {
    return {
      totalCombats: this.combatLog.length,
      unitStats: Array.from(this.unitStats.entries())
    };
  }
}

export default CombatSystem;