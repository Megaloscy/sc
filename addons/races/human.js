import AddonRegistry from '/sc/addons/addon-registry.js';


class RaceSystem {
    constructor() {
        this.races = {
            human: {
                name: 'Human',
                description: 'Versatile and adaptive humans',
                bonuses: {
                    resourceGathering: 1.1,
                    buildingSpeed: 1.05,
                    unitProduction: 1.0
                },
                units: ['Peasant', 'Footman', 'Archer', 'Knight'],
                buildings: ['Town Hall', 'Barracks', 'Farm', 'Blacksmith']
            },
            orc: {
                name: 'Orc',
                description: 'Brutish and strong orcs',
                bonuses: {
                    combatStrength: 1.15,
                    hitPoints: 1.1,
                    resourceGathering: 0.9
                },
                units: ['Grunt', 'Raider', 'Shaman', 'Tauren'],
                buildings: ['Great Hall', 'Barracks', 'War Mill', 'Tauren Totem']
            }
        };
        
        this.activeRaces = new Map();
    }

    registerPlayer(playerId, raceName = 'human') {
        if (!this.races[raceName]) {
            console.warn(`Race "${raceName}" not found, defaulting to human`);
            raceName = 'human';
        }
        
        this.activeRaces.set(playerId, {
            ...this.races[raceName],
            id: playerId,
            techLevel: 1,
            unlockedUnits: ['Peasant'],
            unlockedBuildings: ['Town Hall']
        });
        
        console.log(`👤 Player ${playerId} registered as ${this.races[raceName].name}`);
        return this.activeRaces.get(playerId);
    }

    getPlayerRace(playerId) {
        return this.activeRaces.get(playerId) || null;
    }

    unlockUnit(playerId, unitName) {
        const player = this.activeRaces.get(playerId);
        if (player && !player.unlockedUnits.includes(unitName)) {
            player.unlockedUnits.push(unitName);
            console.log(`🔓 Player ${playerId} unlocked unit: ${unitName}`);
            return true;
        }
        return false;
    }

    getAllRaces() {
        return { ...this.races };
    }
}

// Register this addon with the system
AddonRegistry.register('RaceSystem', 
    (gameEngine) => {
        console.log('👥 Initializing RaceSystem addon');
        const raceSystem = new RaceSystem();
        
        // Attach to game engine
        gameEngine.races = raceSystem;
        
        // Store instance in registry
        const addonData = AddonRegistry.getAddon('RaceSystem');
        if (addonData) {
            addonData.instance = raceSystem;
        }
        
        // Register default player as human
        raceSystem.registerPlayer('player1', 'human');
        
        console.log('✅ RaceSystem ready');
        return raceSystem;
    },
    {
        version: '1.0.0',
        author: 'Game Dev',
        defaultRace: 'human',
        availableRaces: ['human', 'orc']
    }
);

export default RaceSystem;