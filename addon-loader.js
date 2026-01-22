export class AddonLoader {
    constructor(gameEngine, basePath = '/sc/addons/') {
        this.gameEngine = gameEngine;
        this.addons = new Map();
        this.dependencies = new Map();
        this.basePath = basePath.endsWith('/') ? basePath : basePath + '/';
        this.loadingQueue = [];
        this.isLoading = false;
        console.log(`📁 AddonLoader initialized with base path: ${this.basePath}`);
    }

    async loadAddon(addonName, addonPath) {
        try {
            // Always use absolute path for XAMPP
            let fullPath;
            
            if (addonPath.startsWith('/')) {
                // Already absolute path
                fullPath = addonPath;
            } else if (addonPath.startsWith('./') || addonPath.startsWith('../')) {
                // Convert relative to absolute
                fullPath = this.basePath + addonPath.replace(/^\.\//, '');
            } else {
                // Assume it's relative to base path
                fullPath = this.basePath + addonPath;
            }
            
            // Ensure .js extension
            if (!fullPath.endsWith('.js')) {
                fullPath += '.js';
            }
            
            console.log(`📦 Loading addon: ${addonName} from ${fullPath}`);
            
            const addonModule = await import(fullPath);
            
            if (!addonModule.default || typeof addonModule.default !== 'function') {
                throw new Error(`Addon ${addonName} must export a default class`);
            }

            const AddonClass = addonModule.default;
            const addonInstance = new AddonClass(this.gameEngine);
            
            // Store addon name in instance for reference
            addonInstance.name = addonName;
            
            // Store dependencies for resolution
            if (addonInstance.dependencies && Array.isArray(addonInstance.dependencies)) {
                this.dependencies.set(addonName, addonInstance.dependencies);
            } else {
                this.dependencies.set(addonName, []);
            }




            // Initialize addon
           // if (addonInstance.init && typeof addonInstance.init === 'function') {
           //     await addonInstance.init();
           // }
			
			const requiredMethods = ['init'];
const optionalMethods = ['onEvent', 'destroy', 'render'];

for (const method of requiredMethods) {
    if (!addonInstance[method] || typeof addonInstance[method] !== 'function') {
        console.warn(`⚠️ Addon ${addonName} is missing required method: ${method}`);
        // Create a dummy method if it's optional
        if (method === 'init') {
            addonInstance.init = async () => {
                console.log(`Addon ${addonName} using default init`);
                return this;
            };
        }
    }
}
			
			
			

            this.addons.set(addonName, addonInstance);
            console.log(`✅ Addon loaded: ${addonName}`);
            
            // Expose addon to game engine if it has a specific name
            if (addonName === 'terrain') {
                this.gameEngine.terrain = addonInstance;
            } else if (addonName === 'resource') {
                this.gameEngine.resource = addonInstance;
            }
            
            // Trigger event for other addons
            this.gameEngine.triggerEvent('addon:loaded', { 
                name: addonName, 
                instance: addonInstance 
            });
            
            return addonInstance;
        } catch (error) {
				console.error(`❌ Failed to load addon ${addonName}:`, error);
				
				// Don't crash on race addon errors
				const optionalAddons = [
					'protoss', 'zerg', 'human', 'vespene', 'techTree', 'production', 
					'fogOfWar', 'pathfinding', 'strategicAI', 'multiplayer'
				];
				
				if (optionalAddons.includes(addonName)) {
					console.warn(`⚠️ Optional addon ${addonName} failed to load, continuing without it`);
					return null;
				}
				
				throw error;
			}
    }

    async loadAddons(addonList) {
        console.log(`🔄 Loading ${Object.keys(addonList).length} addons...`);
        const results = [];
        
        // First, load core addons that others depend on
        const coreAddons = ['terrain', 'resource', 'combat', 'basicAI'];
        const otherAddons = Object.keys(addonList).filter(name => !coreAddons.includes(name));
        
        // Load core addons first
        for (const name of coreAddons) {
            if (addonList[name]) {
                try {
                    const addon = await this.loadAddon(name, addonList[name]);
                    results.push({ name, success: true, addon });
                } catch (error) {
                    results.push({ 
                        name, 
                        success: false, 
                        error: error.message 
                    });
                }
            }
        }
        
        // Then load other addons
        for (const name of otherAddons) {
            if (addonList[name]) {
                try {
                    const addon = await this.loadAddon(name, addonList[name]);
                    results.push({ name, success: true, addon });
                } catch (error) {
                    results.push({ 
                        name, 
                        success: false, 
                        error: error.message 
                    });
                }
            }
        }
        
        return results;
    }

    // ... rest of the class methods ...
}