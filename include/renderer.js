//import { gameState } from '/sc/main.js';
//import { units, selectedUnits, players, currentPlayerId } from '/sc/index.js';
//import { drawBackground, drawTerrain, drawResourceNodes, drawBuildings, drawUnits, drawBuildingGhost, drawDragSelection, drawUI, drawEffects, drawDebugInfo } from '/sc/include/drawing.js';
// renderer.js
import { gameState } from '/sc/main.js';
import { units, selectedUnits, players, currentPlayerId } from '/sc/index.js';
import { 
  drawBackground, 
  drawTerrain, 
  drawResourceNodes, 
  drawBuildings, 
  drawUnits, 
  drawBuildingGhost, 
  drawDragSelection, 
  drawUI, 
  drawEffects, 
  drawDebugInfo 
} from './drawing.js';

// Import building mode functions
import { getBuildingModeState } from './building-mode.js';

let canvas, ctx;

export function initRenderer(gameCanvas, gameCtx) {
  canvas = gameCanvas;
  ctx = gameCtx;
}

export function render() {
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw background
  drawBackground(ctx, canvas);
  
  // Draw terrain/grid
  drawTerrain(ctx, canvas);
  
  // Draw resource nodes
  drawResourceNodes(ctx);
  
  // Draw buildings
  drawBuildings(ctx);
  
  // Draw units
  drawUnits(ctx, units, selectedUnits);
  
  // Draw building ghost if in building mode
  const buildingState = getBuildingModeState();
  if (buildingState.isBuildingMode && buildingState.buildingGhost) {
    drawBuildingGhost(
      ctx, 
      gameState.mouseX, 
      gameState.mouseY, 
      buildingState.buildingGhost, 
      buildingState.canPlaceBuilding, 
      buildingState.currentBuildingType
    );
  }
  
  // Draw drag selection
  if (gameState.isDragging) {
    drawDragSelection(ctx, gameState.dragStartX, gameState.dragStartY, gameState.dragEndX, gameState.dragEndY);
  }
  
  // Draw UI
  drawUI(ctx, canvas, units, selectedUnits, players, currentPlayerId, gameState);
  
  // Draw effects
  drawEffects(ctx);
  
  // Draw debug info
  if (gameState.debug?.showNodeInfo || gameState.debug?.showClickRadius) {
    drawDebugInfo(ctx, gameState.mouseX, gameState.mouseY, gameState.debug);
  }
}

// Re-export updateEffects from effects module
export { updateEffects } from './effects.js';