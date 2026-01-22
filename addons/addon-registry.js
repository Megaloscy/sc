// addon-registry.js
class AddonRegistry {
    // Static Map to store all registered addons
    // Format: { 'addonName': { init: function, config: object } }
    static addons = new Map();
    static gameEngine = null;

    /**
     * Registers a new addon with the system.
     * @param {string} name - Unique identifier for the addon
     * @param {Function} initFunction - Callback to initialize the addon (receives gameEngine instance)
     * @param {Object} config - Optional configuration object for the addon
     */
    static register(name, initFunction, config = {}) {
        if (this.addons.has(name)) {
            console.warn(`Addon "${name}" is already registered. Overwriting.`);
        }
        this.addons.set(name, {
            init: initFunction,
            config: config
        });
        console.log(`✅ Addon registered: ${name}`);
        
        // If gameEngine already exists, initialize immediately
        if (this.gameEngine) {
            this.initializeAddon(name);
        }
    }

    /**
     * Initializes a single addon
     * @param {string} name - Name of the addon to initialize
     */
    static initializeAddon(name) {
        if (!this.gameEngine) {
            console.error('GameEngine not set in AddonRegistry');
            return;
        }
        
        const addon = this.addons.get(name);
        if (addon && !addon.initialized) {
            try {
                addon.init(this.gameEngine);
                addon.initialized = true;
                console.log(`✨ Addon initialized: ${name}`);
            } catch (error) {
                console.error(`Failed to initialize addon "${name}":`, error);
            }
        }
    }

    /**
     * Initializes ALL registered addons
     * @param {GameEngine} gameEngine - Instance of the main game engine
     */
    static initAll(gameEngine) {
        this.gameEngine = gameEngine;
        console.log('🔄 Initializing all addons...');
        
        for (const [name] of this.addons) {
            this.initializeAddon(name);
        }
        
        console.log(`🎯 Total addons initialized: ${this.addons.size}`);
    }

    /**
     * Gets a registered addon by name
     * @param {string} name - Addon name
     * @returns {Object|null} Addon data or null if not found
     */
    static getAddon(name) {
        return this.addons.get(name) || null;
    }

    /**
     * Lists all registered addons
     * @returns {Array} List of addon names
     */
    static listAddons() {
        return Array.from(this.addons.keys());
    }
	
	
	// Add to AddonRegistry class:
static enableAddon(name) {
    const addon = this.addons.get(name);
    if (addon && !addon.enabled) {
        addon.enabled = true;
        if (this.gameEngine && !addon.initialized) {
            this.initializeAddon(name);
        }
    }
}

static disableAddon(name) {
    const addon = this.addons.get(name);
    if (addon) {
        addon.enabled = false;
        // Optionally clean up
    }
}

static getAddonStatus() {
    return Array.from(this.addons.entries()).map(([name, data]) => ({
        name,
        initialized: data.initialized || false,
        enabled: data.enabled !== false
    }));
}


}

// Export the registry
export default AddonRegistry;