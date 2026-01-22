import AddonRegistry from '../../addon-registry.js';

export default class TechTree {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.name = 'techTree';
        this.dependencies = ['resource']; // Declare dependencies
        this.techTrees = new Map();
        this.researchedTech = new Map();
        this.initialized = false;
    }

    async init() {
        console.log('Initializing TechTree system...');
        
        // Initialize even if dependencies aren't fully ready
        this.setupDefaultTechTrees();
        
        this.initialized = true;
        console.log('✅ TechTree system initialized');
        return this;
    }

    setupDefaultTechTrees() {
        // Terran Tech Tree
        const terranTech = new Map([
            ['infantry_weapons', {
                name: 'Infantry Weapons',
                levels: 3,
                cost: { minerals: 100, vespene: 100 },
                researchTime: 160,
                requires: ['engineering_bay'],
                effect: 'increases infantry damage by 1 per level'
            }],
            ['siege_mode', {
                name: 'Siege Mode',
                cost: { minerals: 100, vespene: 100 },
                researchTime: 60,
                requires: ['machine_shop'],
                effect: 'allows siege tanks to enter siege mode'
            }]
        ]);

        this.techTrees.set('Terran', terranTech);
        
        // Protoss Tech Tree
        const protossTech = new Map([
            ['psionic_storm', {
                name: 'Psionic Storm',
                cost: { minerals: 200, vespene: 200 },
                researchTime: 120,
                requires: ['templar_archives'],
                effect: 'allows high templar to cast psionic storm'
            }]
        ]);
        
        this.techTrees.set('Protoss', protossTech);
        
        // Zerg Tech Tree
        const zergTech = new Map([
            ['metabolic_boost', {
                name: 'Metabolic Boost',
                cost: { minerals: 100, vespene: 100 },
                researchTime: 100,
                requires: ['spawning_pool'],
                effect: 'increases zergling movement speed'
            }]
        ]);
        
        this.techTrees.set('Zerg', zergTech);
        
        console.log('Tech trees initialized for all races');
    }

    // ... rest of the class methods ...
}