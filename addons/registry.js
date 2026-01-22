// File: addons/registry.js
class AddonRegistry {
    static addons = new Map();

    static register(name, initCallback) {
        this.addons.set(name, initCallback);
    }

    static initAll(gameEngineInstance) {
        for (const [name, init] of this.addons) {
            console.log(`Initializing addon: ${name}`);
            init(gameEngineInstance);
        }
    }
}
export default AddonRegistry;