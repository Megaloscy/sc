import AddonRegistry from '../../addon-registry.js';

export default class ProtossRace {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.name = 'protoss';
        this.dependencies = ['resource', 'combat'];
        this.units = new Map();
        this.buildings = new Map();
    }

    async init() {
        console.log('Initializing Protoss race...');
        
        this.registerUnits();
        this.registerBuildings();
        this.registerAbilities();
        
        console.log('✅ Protoss race initialized');
        return this;
    }

    registerUnits() {
        // Protoss units
        const units = {
            'probe': {
                name: 'Probe',
                cost: { minerals: 50 },
                buildTime: 17,
                health: 20,
                shields: 20,
                armor: 0,
                damage: 5,
                range: 1,
                speed: 2.5,
                abilities: ['gather', 'warp_in_buildings', 'repair'],
                producedBy: 'nexus'
            },
            'zealot': {
                name: 'Zealot',
                cost: { minerals: 100 },
                buildTime: 38,
                health: 100,
                shields: 50,
                armor: 1,
                damage: 16,
                range: 1,
                speed: 2.25,
                abilities: ['charge'],
                producedBy: 'gateway'
            },
            'dragoon': {
                name: 'Dragoon',
                cost: { minerals: 125, vespene: 50 },
                buildTime: 40,
                health: 100,
                shields: 80,
                armor: 1,
                damage: 20,
                range: 4,
                speed: 2.0,
                abilities: ['ranged_attack'],
                producedBy: 'gateway'
            },
            'high_templar': {
                name: 'High Templar',
                cost: { minerals: 50, vespene: 150 },
                buildTime: 55,
                health: 40,
                shields: 40,
                armor: 0,
                damage: 0,
                range: 6,
                speed: 1.5,
                abilities: ['psionic_storm', 'feedback', 'archon_warp'],
                producedBy: 'gateway'
            },
            'observer': {
                name: 'Observer',
                cost: { minerals: 25, vespene: 75 },
                buildTime: 40,
                health: 40,
                shields: 20,
                armor: 0,
                damage: 0,
                range: 0,
                speed: 3.0,
                abilities: ['cloak', 'detector'],
                producedBy: 'robotics_facility'
            }
        };

        for (const [unitId, unitData] of Object.entries(units)) {
            this.units.set(unitId, unitData);
        }

        this.gameEngine.triggerEvent('race:units_registered', {
            race: 'Protoss',
            units: units
        });
        
        console.log(`Registered ${this.units.size} Protoss units`);
    }

    registerBuildings() {
        const buildings = {
            'nexus': {
                name: 'Nexus',
                cost: { minerals: 400 },
                buildTime: 100,
                health: 750,
                shields: 750,
                armor: 1,
                abilities: ['chrono_boost', 'probe_production', 'energy_field'],
                produces: ['probe'],
                supply: 10
            },
            'pylon': {
                name: 'Pylon',
                cost: { minerals: 100 },
                buildTime: 30,
                health: 200,
                shields: 200,
                armor: 0,
                abilities: ['power_field', 'warp_in_support'],
                supply: 8
            },
            'gateway': {
                name: 'Gateway',
                cost: { minerals: 150 },
                buildTime: 65,
                health: 500,
                shields: 500,
                armor: 1,
                abilities: ['warp_in', 'warp_gate_transform'],
                produces: ['zealot', 'dragoon', 'high_templar']
            },
            'cybernetics_core': {
                name: 'Cybernetics Core',
                cost: { minerals: 150 },
                buildTime: 50,
                health: 450,
                shields: 450,
                armor: 1,
                abilities: ['air_weapons', 'ground_weapons', 'dragoon_range'],
                upgrades: ['air_weapons_1', 'ground_weapons_1']
            },
            'assimilator': {
                name: 'Assimilator',
                cost: { minerals: 75 },
                buildTime: 40,
                health: 350,
                shields: 350,
                armor: 1,
                abilities: ['vespene_extraction'],
                resource: 'vespene'
            },
            'forges': {
                name: 'Forges',
                cost: { minerals: 150 },
                buildTime: 40,
                health: 400,
                shields: 400,
                armor: 1,
                abilities: ['ground_armor', 'shield_upgrades'],
                upgrades: ['ground_armor_1', 'shields_1']
            }
        };

        for (const [buildingId, buildingData] of Object.entries(buildings)) {
            this.buildings.set(buildingId, buildingData);
        }

        this.gameEngine.triggerEvent('race:buildings_registered', {
            race: 'Protoss',
            buildings: buildings
        });
        
        console.log(`Registered ${this.buildings.size} Protoss buildings`);
    }

    registerAbilities() {
        const abilities = {
            'chrono_boost': {
                name: 'Chrono Boost',
                description: 'Increases production speed of a building by 50%',
                cost: { energy: 25 },
                duration: 20,
                effect: 'production_speed_boost'
            },
            'psionic_storm': {
                name: 'Psionic Storm',
                description: 'Creates a damaging energy storm over an area',
                cost: { energy: 75 },
                damage: 112,
                radius: 2,
                duration: 4
            },
            'warp_in': {
                name: 'Warp In',
                description: 'Instantly warps units to any powered pylon field',
                cost: { minerals: 0, vespene: 0 },
                range: 'global',
                requires: 'warp_gate'
            }
        };

        this.gameEngine.triggerEvent('race:abilities_registered', {
            race: 'Protoss',
            abilities: abilities
        });
    }

    getUnit(unitId) {
        return this.units.get(unitId);
    }

    getBuilding(buildingId) {
        return this.buildings.get(buildingId);
    }

    canBuildUnit(playerId, unitId) {
        const unit = this.getUnit(unitId);
        if (!unit) return false;
        
        // Check if player has required building
        // This would require tracking player buildings
        return true; // Simplified for now
    }

    canBuildBuilding(playerId, buildingId) {
        const building = this.getBuilding(buildingId);
        if (!building) return false;
        
        // Check prerequisites
        // This would require checking tech tree
        return true; // Simplified for now
    }

    onEvent(eventName, data) {
        switch (eventName) {
            case 'player:race_selected':
                if (data.race === 'Protoss') {
                    console.log(`Player ${data.playerId} selected Protoss race`);
                    // Initialize player-specific Protoss data
                }
                break;
                
            case 'unit:train_request':
                if (data.race === 'Protoss') {
                    const unit = this.getUnit(data.unitType);
                    if (unit) {
                        // Handle unit training
                        this.gameEngine.triggerEvent('unit:training_started', {
                            playerId: data.playerId,
                            unitType: data.unitType,
                            buildTime: unit.buildTime
                        });
                    }
                }
                break;
                
            case 'building:construct_request':
                if (data.race === 'Protoss') {
                    const building = this.getBuilding(data.buildingType);
                    if (building) {
                        // Handle building construction
                        this.gameEngine.triggerEvent('building:construction_started', {
                            playerId: data.playerId,
                            buildingType: data.buildingType,
                            buildTime: building.buildTime
                        });
                    }
                }
                break;
        }
    }

    // Helper method to get all units (for UI)
    getAllUnits() {
        return Array.from(this.units.entries()).map(([id, data]) => ({
            id,
            ...data
        }));
    }

    // Helper method to get all buildings (for UI)
    getAllBuildings() {
        return Array.from(this.buildings.entries()).map(([id, data]) => ({
            id,
            ...data
        }));
    }
}