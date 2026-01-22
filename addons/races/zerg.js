export default class ZergRace {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.name = 'zerg';
        this.dependencies = ['resource', 'combat'];
        this.units = new Map();
        this.buildings = new Map();
        this.larvae = new Map(); // Track larvae per hatchery
    }

    async init() {
        console.log('Initializing Zerg race...');
        
        this.registerUnits();
        this.registerBuildings();
        this.registerAbilities();
        
        console.log('✅ Zerg race initialized');
        return this;
    }

    registerUnits() {
        const units = {
            'drone': {
                name: 'Drone',
                cost: { minerals: 50 },
                buildTime: 17,
                health: 40,
                armor: 0,
                damage: 5,
                range: 1,
                speed: 2.5,
                abilities: ['gather', 'morph_to_building'],
                producedBy: 'larva'
            },
            'zergling': {
                name: 'Zergling',
                cost: { minerals: 25 },
                buildTime: 24,
                health: 35,
                armor: 0,
                damage: 5,
                range: 1,
                speed: 4.13,
                abilities: ['metabolic_boost', 'adrenal_glands', 'swarm'],
                producedBy: 'larva'
            },
            'hydralisk': {
                name: 'Hydralisk',
                cost: { minerals: 75, vespene: 25 },
                buildTime: 28,
                health: 80,
                armor: 0,
                damage: 10,
                range: 4,
                speed: 2.5,
                abilities: ['lurker_morph', 'grooved_spines'],
                producedBy: 'larva'
            },
            'mutalisk': {
                name: 'Mutalisk',
                cost: { minerals: 100, vespene: 100 },
                buildTime: 40,
                health: 120,
                armor: 0,
                damage: 9,
                range: 3,
                speed: 5.0,
                abilities: ['glave_wurm', 'air_attack'],
                producedBy: 'larva'
            },
            'overlord': {
                name: 'Overlord',
                cost: { minerals: 100 },
                buildTime: 30,
                health: 200,
                armor: 0,
                damage: 0,
                range: 0,
                speed: 1.4,
                abilities: ['detector', 'supply', 'overseer_morph'],
                producedBy: 'larva',
                supply: 8
            }
        };

        for (const [unitId, unitData] of Object.entries(units)) {
            this.units.set(unitId, unitData);
        }

        this.gameEngine.triggerEvent('race:units_registered', {
            race: 'Zerg',
            units: units
        });
        
        console.log(`Registered ${this.units.size} Zerg units`);
    }

    registerBuildings() {
        const buildings = {
            'hatchery': {
                name: 'Hatchery',
                cost: { minerals: 300 },
                buildTime: 120,
                health: 1250,
                armor: 1,
                abilities: ['larva_spawn', 'drone_production', 'morph_to_lair'],
                produces: ['larva'],
                supply: 1
            },
            'spawning_pool': {
                name: 'Spawning Pool',
                cost: { minerals: 150 },
                buildTime: 65,
                health: 750,
                armor: 1,
                abilities: ['zergling_production', 'metabolic_boost', 'adrenal_glands'],
                upgrades: ['zergling_speed', 'zergling_attack']
            },
            'evolution_chamber': {
                name: 'Evolution Chamber',
                cost: { minerals: 75 },
                buildTime: 40,
                health: 600,
                armor: 1,
                abilities: ['zerg_ground_armor', 'zerg_melee_attacks', 'zerg_missile_attacks'],
                upgrades: ['ground_armor_1', 'melee_attacks_1', 'missile_attacks_1']
            },
            'extractor': {
                name: 'Extractor',
                cost: { minerals: 50 },
                buildTime: 40,
                health: 500,
                armor: 1,
                abilities: ['vespene_extraction'],
                resource: 'vespene'
            },
            'hydralisk_den': {
                name: 'Hydralisk Den',
                cost: { minerals: 100, vespene: 100 },
                buildTime: 40,
                health: 600,
                armor: 1,
                abilities: ['hydralisk_production', 'lurker_morph', 'grooved_spines'],
                upgrades: ['hydralisk_speed', 'hydralisk_range']
            }
        };

        for (const [buildingId, buildingData] of Object.entries(buildings)) {
            this.buildings.set(buildingId, buildingData);
        }

        this.gameEngine.triggerEvent('race:buildings_registered', {
            race: 'Zerg',
            buildings: buildings
        });
        
        console.log(`Registered ${this.buildings.size} Zerg buildings`);
    }

    registerAbilities() {
        const abilities = {
            'morph_to_building': {
                name: 'Morph to Building',
                description: 'Drone consumes itself to become a building',
                cost: { minerals: 0 },
                transform: true
            },
            'burrow': {
                name: 'Burrow',
                description: 'Zerg units can burrow underground',
                cost: { minerals: 100, vespene: 100 },
                researchTime: 80,
                effect: 'stealth'
            },
            'spawn_larvae': {
                name: 'Spawn Larvae',
                description: 'Queen injects hatchery to produce additional larvae',
                cost: { energy: 25 },
                larvaeCount: 4,
                duration: 40
            }
        };

        this.gameEngine.triggerEvent('race:abilities_registered', {
            race: 'Zerg',
            abilities: abilities
        });
    }

    getUnit(unitId) {
        return this.units.get(unitId);
    }

    getBuilding(buildingId) {
        return this.buildings.get(buildingId);
    }

    // Zerg-specific methods
    spawnLarva(hatcheryId) {
        if (!this.larvae.has(hatcheryId)) {
            this.larvae.set(hatcheryId, []);
        }
        
        const larvae = this.larvae.get(hatcheryId);
        const larvaId = `larva_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        larvae.push({
            id: larvaId,
            hatcheryId: hatcheryId,
            createdAt: Date.now(),
            canMorph: true
        });
        
        this.gameEngine.triggerEvent('zerg:larva_spawned', {
            hatcheryId,
            larvaId,
            totalLarvae: larvae.length
        });
        
        return larvaId;
    }

    morphLarva(larvaId, unitType) {
        // Find and remove larva
        for (const [hatcheryId, larvae] of this.larvae) {
            const index = larvae.findIndex(l => l.id === larvaId);
            if (index > -1) {
                larvae.splice(index, 1);
                
                this.gameEngine.triggerEvent('zerg:larva_morphed', {
                    larvaId,
                    unitType,
                    hatcheryId
                });
                
                return true;
            }
        }
        return false;
    }

    onEvent(eventName, data) {
        switch (eventName) {
            case 'player:race_selected':
                if (data.race === 'Zerg') {
                    console.log(`Player ${data.playerId} selected Zerg race`);
                    // Initialize player-specific Zerg data
                }
                break;
                
            case 'zerg:hatchery_built':
                // Start spawning larvae for new hatchery
                this.spawnLarva(data.hatcheryId);
                // Set up periodic larva spawning
                setInterval(() => {
                    this.spawnLarva(data.hatcheryId);
                }, 15000); // Spawn larva every 15 seconds
                break;
                
            case 'zerg:unit_morph_request':
                if (data.race === 'Zerg') {
                    const unit = this.getUnit(data.unitType);
                    if (unit && data.larvaId) {
                        if (this.morphLarva(data.larvaId, data.unitType)) {
                            this.gameEngine.triggerEvent('unit:training_started', {
                                playerId: data.playerId,
                                unitType: data.unitType,
                                buildTime: unit.buildTime
                            });
                        }
                    }
                }
                break;
        }
    }
}