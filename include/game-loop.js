// Import dependencies
import { units, eventSystem } from '/sc/index.js';
import { updateEffects } from './effects.js';
import { getStateColor } from './effects.js';
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
import { getBuildingModeState } from './building-mode.js';

// Game loop state
let lastFrameTime = 0;
let canvas = null;
let ctx = null;
let debug = null;
let uiState = null;
let players = null;
let currentPlayerId = null;
let selectedUnits = null;
let gameSystems = null;

// Initialize game loop
export function initGameLoop(gameCanvas, gameCtx, gameDebug, gameUiState, gamePlayers, gameCurrentPlayerId, gameSelectedUnits) {
  canvas = gameCanvas;
  ctx = gameCtx;
  debug = gameDebug;
  uiState = gameUiState;
  players = gamePlayers;
  currentPlayerId = gameCurrentPlayerId;
  selectedUnits = gameSelectedUnits;
}

export function setGameSystems(systems) {
  gameSystems = systems;
}

export function gameLoop(timestamp) {
  const deltaTime = timestamp - lastFrameTime;
  lastFrameTime = timestamp;

  update(deltaTime);
  render();

  requestAnimationFrame(gameLoop);
}

function update(deltaTime) {
  // Emit game tick event
  if (eventSystem) {
    eventSystem.emit('game_tick', {
      deltaTime: Math.min(deltaTime, 100),
      timestamp: Date.now()
    });
  }

  // Update all units
  units.forEach(unit => {
    if (unit.update) {
      unit.update(deltaTime);
    }
  });

  // Update all game systems
  if (gameSystems) {
    Object.values(gameSystems).forEach(system => {
      if (system && system.update) {
        system.update(deltaTime);
      }
    });
  }

  // Update effects
  updateEffects(deltaTime);
}

function render() {
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw background
  drawBackground(ctx, canvas);
  
  // Draw terrain/grid
  drawTerrain(ctx, canvas);
  
  // Draw resource nodes
  drawResourceNodes(ctx, debug);
  
  // Draw buildings
  drawBuildings(ctx);
  
  // Draw units
  drawUnits(ctx, units, selectedUnits, getStateColor);
  
  // Draw building ghost if in building mode
  const buildingState = getBuildingModeState();
  if (buildingState.isBuildingMode && buildingState.buildingGhost) {
    drawBuildingGhost(
      ctx, 
      window.gameState?.mouseX || 0, 
      window.gameState?.mouseY || 0, 
      buildingState.currentBuildingType, 
      buildingState.buildingGhost, 
      buildingState.canPlaceBuilding
    );
  }
  
  // Draw drag selection if dragging
  if (window.gameState?.isDragging) {
    drawDragSelection(
      ctx, 
      window.gameState?.dragStartX || 0, 
      window.gameState?.dragStartY || 0, 
      window.gameState?.dragEndX || 0, 
      window.gameState?.dragEndY || 0
    );
  }
  
  // Draw UI
  drawUI(ctx, canvas, units, selectedUnits, players, currentPlayerId, uiState, buildingState.isBuildingMode, buildingState.currentBuildingType);
  
  // Draw effects
  drawEffects(ctx);
  
  // Draw debug info
  if (debug.showNodeInfo || debug.showClickRadius) {
    drawDebugInfo(ctx, window.gameState?.mouseX || 0, window.gameState?.mouseY || 0, debug);
  }
}