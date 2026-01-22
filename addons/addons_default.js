export default class AddonName {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.name = 'addonName';
        this.dependencies = [];
    }

    async init() {
        console.log(`${this.name} system initialized`);
        // Add minimal setup here
        return this;
    }

    onEvent(eventName, data) {
        // Optional: handle events if needed
    }

    // Add any other methods that are called
    missingMethod() {
        console.warn(`Method not implemented in ${this.name}`);
        // Return default value or do nothing
        return null;
    }
}