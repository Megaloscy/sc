import AddonRegistry from '../../addon-registry.js';




export default class HumanRace {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.name = 'human'; // or 'terran'
        this.dependencies = ['resource', 'combat'];
        this.units = new Map();
        this.buildings = new Map();
    }

    async init() {
        console.log('Initializing Human/Terran race...');
        
        this.registerUnits();
        this.registerBuildings();
        this.registerAbilities();
        
        console.log('✅ Human race initialized');
        return this;
    }

    registerUnits() {
        const units = {
            'scv': {
                name: 'SCV',
                cost: { minerals: 50 },
                buildTime: 17,
                health: 45,
                armor: 0,
                damage: 5,
                range: 1,
                speed: 2.5,
                abilities: ['gather', 'repair', 'construct'],
                producedBy: 'command_center'
            },
            'marine': {
                name: 'Marine',
                cost: { minerals: 50 },
                buildTime: 25,
                health: 40,
                armor: 0,
                damage: 6,
                range: 4,
                speed: 2.25,
                abilities: ['stim_pack', 'combat_shield'],
                producedBy: 'barracks'
            },
            'medic': {
                name: 'Medic',
                cost: { minerals: 50, vespene: 25 },
                buildTime: 30,
                health: 60,
                armor: 0,
                damage: 0,
                range: 4,
                speed: 2.5,
                abilities: ['heal', 'restoration', 'optical_flare'],
                producedBy: 'barracks'
            },
            'siege_tank': {
                name: 'Siege Tank',
                cost: { minerals: 150, vespene: 100 },
                buildTime: 50,
                health: 150,
                armor: 1,
                damage: 30,
                range: 7,
                speed: 1.5,
                abilities: ['siege_mode', 'tank_mode'],
                producedBy: 'factory'
            },
            'wraith': {
                name: 'Wraith',
                cost: { minerals: 150, vespene: 100 },
                buildTime: 60,
                health: 120,
                armor: 0,
                damage: 20,
                range: 5,
                speed: 4.0,
                abilities: ['cloak', 'air_attack'],
                producedBy: 'starport'
            }
        };

        for (const [unitId, unitData] of Object.entries(units)) {
            this.units.set(unitId, unitData);
        }

        this.gameEngine.triggerEvent('race:units_registered', {
            race: 'Human',
            units: units
        });
        
        console.log(`Registered ${this.units.size} Human units`);
    }

    registerBuildings() {
        const buildings = {
            'command_center': {
                name: 'Command Center',
                cost: { minerals: 400 },
                buildTime: 100,
                health: 1500,
                armor: 1,
                abilities: ['scv_production', 'morph_to_orbital', 'morph_to_planetary'],
                produces: ['scv'],
                supply: 10
            },
            'supply_depot': {
                name: 'Supply Depot',
                cost: { minerals: 100 },
                buildTime: 40,
                health: 400,
                armor: 0,
                abilities: ['supply', 'lower_raise'],
                supply: 8
            },
            'barracks': {
                name: 'Barracks',
                cost: { minerals: 150 },
                buildTime: 65,
                health: 1000,
                armor: 1,
                abilities: ['infantry_production', 'reactor', 'tech_lab'],
                produces: ['marine', 'medic', 'firebat']
            },
            'factory': {
                name: 'Factory',
                cost: { minerals: 200, vespene: 100 },
                buildTime: 80,
                health: 1250,
                armor: 1,
                abilities: ['vehicle_production', 'machine_shop'],
                produces: ['siege_tank', 'vulture', 'goliath']
            },
            'starport': {
                name: 'Starport',
                cost: { minerals: 150, vespene: 100 },
                buildTime: 70,
                health: 1300,
                armor: 1,
                abilities: ['aircraft_production', 'control_tower'],
                produces: ['wraith', 'dropship', 'science_vessel']
            },
            'engineering_bay': {
                name: 'Engineering Bay',
                cost: { minerals: 125 },
                buildTime: 40,
                health: 850,
                armor: 1,
                abilities: ['infantry_upgrades', 'building_armor'],
                upgrades: ['infantry_weapons', 'infantry_armor']
            },
            'refinery': {
                name: 'Refinery',
                cost: { minerals: 100 },
                buildTime: 40,
                health: 750,
                armor: 1,
                abilities: ['vespene_extraction'],
                resource: 'vespene'
            }
        };

        for (const [buildingId, buildingData] of Object.entries(buildings)) {
            this.buildings.set(buildingId, buildingData);
        }

        this.gameEngine.triggerEvent('race:buildings_registered', {
            race: 'Human',
            buildings: buildings
        });
        
        console.log(`Registered ${this.buildings.size} Human buildings`);
    }

    registerAbilities() {
        const abilities = {
            'stim_pack': {
                name: 'Stim Pack',
                description: 'Temporarily increases marine speed and attack rate',
                cost: { health: 10 },
                duration: 15,
                effect: { speed: 1.5, attackSpeed: 1.5 }
            },
            'siege_mode': {
                name: 'Siege Mode',
                description: 'Tank transforms to deal massive area damage',
                cost: { minerals: 0 },
                transformTime: 3,
                damage: 70,
                range: 12,
                splash: true
            },
            'repair': {
                name: 'Repair',
                description: 'SCV repairs mechanical units and buildings',
                cost: { minerals: 0 },
                rate: 5, // HP per second
                range: 2
            }
        };

        this.gameEngine.triggerEvent('race:abilities_registered', {
            race: 'Human',
            abilities: abilities
        });
    }

    getUnit(unitId) {
        return this.units.get(unitId);
    }

    getBuilding(buildingId) {
        return this.buildings.get(buildingId);
    }

    onEvent(eventName, data) {
        switch (eventName) {
            case 'player:race_selected':
                if (data.race === 'Human') {
                    console.log(`Player ${data.playerId} selected Human race`);
                    // Initialize player-specific Human data
                }
                break;
                
            case 'human:addon_request':
                // Handle barracks/factory/starport addons (reactor, tech lab)
                if (data.buildingType === 'barracks' || data.buildingType === 'factory' || data.buildingType === 'starport') {
                    this.gameEngine.triggerEvent('building:addon_attached', {
                        buildingId: data.buildingId,
                        addonType: data.addonType
                    });
                }
                break;
        }
    }

}
