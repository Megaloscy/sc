import EventSystem from './include/EventSystem.js';
import Unit from './include/Unit.js';
import {
  units,
  selectedUnits,
  players,
  currentPlayerId,
  createUnit,
  selectUnit,
  deselectUnit,
  clearSelection,
  moveSelectedUnits,
  createBuilding,
  selectBuilding,
  deselectBuilding,
  createResourceNode
} from './include/gameState.js';
import { initializeSystems, initializeGameResources } from './include/init.js';

// ========== EVENT SYSTEM INSTANCE ==========
const eventSystem = new EventSystem();
window.eventSystem = eventSystem;

// Export eventSystem for other modules
export { eventSystem };

// Make functions available globally
window.createUnit = createUnit;
window.selectUnit = selectUnit;
window.deselectUnit = deselectUnit;
window.clearSelection = clearSelection;
window.moveSelectedUnits = moveSelectedUnits;
window.createBuilding = createBuilding;
window.selectBuilding = selectBuilding;
window.deselectBuilding = deselectBuilding;
window.createResourceNode = createResourceNode;

// ========== INITIAL SETUP ==========
// Create initial units
createUnit('worker', 120, 180, 1);
createUnit('worker', 150, 180, 1);
createUnit('soldier', 200, 150, 1);
createUnit('archer', 250, 200, 1);
createUnit('worker', 580, 380, 2);
createUnit('soldier', 450, 450, 2);
createUnit('soldier', 500, 500, 2);

// Create initial command centers
createBuilding('command_center', 100, 200, 1);
createBuilding('command_center', 600, 400, 2);

// Initialize game systems
initializeSystems().then(systems => {
  console.log('Game initialization complete');
  
  // Emit initial resource state
  eventSystem.emit('resources_updated', {
    playerId: 1,
    resources: players[1].resources
  });
  eventSystem.emit('resources_updated', {
    playerId: 2,
    resources: players[2].resources
  });
});

// ========== EXPORTS ==========
export {
  units,
  selectedUnits,
  players,
  currentPlayerId,
  createUnit,
  selectUnit,
  deselectUnit,
  clearSelection,
  moveSelectedUnits,
  createBuilding,
  selectBuilding,
  deselectBuilding,
  createResourceNode,
  Unit
};
