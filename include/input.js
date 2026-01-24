








// Import from index.js
import { units, selectedUnits, currentPlayerId, clearSelection, selectUnit, selectBuilding, moveSelectedUnits } from '/sc/index.js';

// Import effects
import { showClickEffect } from './effects.js';

// Import helper functions from main.js (will need to export them from main.js)
// We'll use window.gameDebug for now to avoid circular dependencies

// ========== INPUT HANDLING ==========
export function setupInputHandlers(canvas, gameState) {
  canvas.addEventListener('mousedown', (event) => handleMouseDown(event, gameState));
  canvas.addEventListener('mousemove', (event) => handleMouseMove(event, gameState));
  canvas.addEventListener('mouseup', (event) => handleMouseUp(event, gameState));
  canvas.addEventListener('contextmenu', (event) => handleRightClick(event, gameState));
  
  document.addEventListener('keydown', (event) => handleKeyDown(event, gameState));
  
  console.log("Input handlers setup complete");
}

function handleMouseDown(event, gameState) {
  gameState.mouseX = event.offsetX;
  gameState.mouseY = event.offsetY;
  
  if (event.button === 0) { // Left click
    gameState.dragStartX = gameState.mouseX;
    gameState.dragStartY = gameState.mouseY;
    gameState.dragEndX = gameState.mouseX;
    gameState.dragEndY = gameState.mouseY;
    gameState.isDragging = true;
    
    // Clear previous selection
    clearSelection();
  }
}

function handleMouseMove(event, gameState) {
  gameState.mouseX = event.offsetX;
  gameState.mouseY = event.offsetY;
  
  if (gameState.isDragging) {
    gameState.dragEndX = gameState.mouseX;
    gameState.dragEndY = gameState.mouseY;
  }
}

function handleMouseUp(event, gameState) {
  if (event.button === 0) { // Left click release
    gameState.isDragging = false;
    
    // Check if it was a click or drag
    const dragDistance = Math.sqrt(
      Math.pow(gameState.dragEndX - gameState.dragStartX, 2) + 
      Math.pow(gameState.dragEndY - gameState.dragStartY, 2)
    );
    
    if (dragDistance < 5) {
      // Click - select unit or building
      handleClickSelection(gameState.mouseX, gameState.mouseY, gameState);
    } else {
      // Drag - select multiple units
      handleDragSelection(gameState);
    }
  }
}

function handleClickSelection(x, y, gameState) {
  console.log(`Click at (${x}, ${y})`);
  
  // First check for buildings
  let clickedBuilding = null;
  const buildings = window.gameBuildings;
  if (buildings) {
    for (const [id, building] of buildings.entries()) {
      let buildingWidth = 50;
      let buildingHeight = 50;
      
      switch(building.type) {
        case 'command_center':
          buildingWidth = 80;
          buildingHeight = 60;
          break;
        case 'barracks':
          buildingWidth = 60;
          buildingHeight = 60;
          break;
        case 'refinery':
          buildingWidth = 50;
          buildingHeight = 40;
          break;
      }
      
      if (x >= building.x - buildingWidth/2 && x <= building.x + buildingWidth/2 &&
          y >= building.y - buildingHeight/2 && y <= building.y + buildingHeight/2) {
        clickedBuilding = { id, building };
        console.log(`Clicked on building: ${building.type}`);
        break;
      }
    }
  }
  
  if (clickedBuilding && clickedBuilding.building.owner === currentPlayerId) {
    // Select building
    selectBuilding(clickedBuilding.id);
    return;
  }
  
  handleUnitClick(x, y);
}

function handleUnitClick(x, y) {
  console.log(`Looking for unit at (${x}, ${y})`);
  
  let clickedUnit = null;
  let clickedUnitId = null;
  let closestDistance = Infinity;
  
  units.forEach((unit, id) => {
    const distance = Math.sqrt(Math.pow(unit.x - x, 2) + Math.pow(unit.y - y, 2));
    console.log(`  Unit ${id} at (${unit.x}, ${unit.y}), distance: ${distance}`);
    
    if (distance < 20 && distance < closestDistance) {
      closestDistance = distance;
      clickedUnit = unit;
      clickedUnitId = id;
    }
  });
  
  if (clickedUnit && clickedUnit.owner === currentPlayerId) {
    console.log(`Selected unit: ${clickedUnitId} (${clickedUnit.type})`);
    selectUnit(clickedUnitId);
  } else if (clickedUnit) {
    console.log(`Unit belongs to enemy player ${clickedUnit.owner}`);
  } else {
    console.log("No unit found at click location");
  }
}

function handleDragSelection(gameState) {
  const left = Math.min(gameState.dragStartX, gameState.dragEndX);
  const right = Math.max(gameState.dragStartX, gameState.dragEndX);
  const top = Math.min(gameState.dragStartY, gameState.dragEndY);
  const bottom = Math.max(gameState.dragStartY, gameState.dragEndY);
  
  console.log(`Drag selection: (${left}, ${top}) to (${right}, ${bottom})`);
  
  let selectedCount = 0;
  units.forEach((unit, id) => {
    if (unit.owner === currentPlayerId &&
        unit.x >= left && unit.x <= right &&
        unit.y >= top && unit.y <= bottom) {
      selectUnit(id);
      selectedCount++;
    }
  });
  
  console.log(`Selected ${selectedCount} units via drag`);
}

function handleRightClick(event, gameState) {
  event.preventDefault();
  console.log(`\n=== Right click at (${gameState.mouseX}, ${gameState.mouseY}) ===`);
  
  // Check if in building mode
  if (gameState.isBuildingMode && gameState.currentBuildingType) {
    console.log(`Placing building: ${gameState.currentBuildingType}`);
    // Call placeBuilding function from window
    if (window.placeBuilding) {
      window.placeBuilding(gameState.mouseX, gameState.mouseY);
    }
    return;
  }
  
  if (selectedUnits.size > 0) {
    console.log(`Processing right-click for ${selectedUnits.size} selected units`);
    
    // FIRST: Check if right-clicked on resource node (minerals OR vespene)
    const findResourceNodeAt = window.gameDebug?.findResourceNodeAt;
    if (findResourceNodeAt) {
      const clickedNode = findResourceNodeAt(gameState.mouseX, gameState.mouseY);
      if (clickedNode) {
        console.log(`✓ Found ${clickedNode.type} node: ${clickedNode.id} at (${clickedNode.x}, ${clickedNode.y})`);
        
        // Show click effect
        showClickEffect(gameState.mouseX, gameState.mouseY, clickedNode.type === 'minerals' ? '#3498db' : '#2ecc71');
        
        // Send ALL selected workers to gather
        let workersSent = 0;
        selectedUnits.forEach(unitId => {
          const unit = units.get(unitId);
          if (unit && unit.type === 'worker') {
            console.log(`  Sending worker ${unitId} to gather ${clickedNode.type}`);
            const success = unit.startGathering(clickedNode.id);
            if (success) {
              workersSent++;
              console.log(`    Worker ${unitId} accepted gather command`);
            } else {
              console.log(`    Worker ${unitId} rejected gather command`);
            }
          }
        });
        
        // Show notification
        if (window.showNotification) {
          if (workersSent > 0) {
            window.showNotification(`${workersSent} worker(s) sent to gather ${clickedNode.type}`, 'info');
          } else {
            window.showNotification('No workers could be sent to gather', 'warning');
          }
        }
        return;
      } else {
        console.log(`✗ No resource node found at (${gameState.mouseX}, ${gameState.mouseY})`);
      }
    }
    
    // SECOND: Check if right-clicked on enemy
    let clickedEnemy = null;
    units.forEach((unit, id) => {
      if (unit.owner !== currentPlayerId && unit.health > 0) {
        const distance = Math.sqrt(
          Math.pow(unit.x - gameState.mouseX, 2) + 
          Math.pow(unit.y - gameState.mouseY, 2)
        );
        if (distance < 20) {
          clickedEnemy = { id, unit };
        }
      }
    });
    
    if (clickedEnemy) {
      console.log(`✓ Found enemy: ${clickedEnemy.id} (${clickedEnemy.unit.type})`);
      
      selectedUnits.forEach(unitId => {
        const unit = units.get(unitId);
        if (unit && unit.canAttack) {
          unit.attackTargetUnit(clickedEnemy.id);
        }
      });
      
      // Emit event
      if (window.eventSystem) {
        window.eventSystem.emit('attack_order_issued', {
          unitIds: Array.from(selectedUnits),
          target: { x: gameState.mouseX, y: gameState.mouseY },
          targetUnitId: clickedEnemy.id,
          playerId: currentPlayerId
        });
      }
      
      // Show notification
      if (window.showNotification) {
        window.showNotification('Attack!', 'warning');
      }
    } else {
      // THIRD: Move to location (no resource, no enemy)
      console.log(`Moving ${selectedUnits.size} units to (${gameState.mouseX}, ${gameState.mouseY})`);
      
      // Show move click effect
      showClickEffect(gameState.mouseX, gameState.mouseY, '#f1c40f');
      
      moveSelectedUnits(gameState.mouseX, gameState.mouseY);
      
      // Emit event
      if (window.eventSystem) {
        window.eventSystem.emit('move_order_issued', {
          unitIds: Array.from(selectedUnits),
          target: { x: gameState.mouseX, y: gameState.mouseY },
          playerId: currentPlayerId
        });
      }
    }
  } else {
    console.log("No units selected for right-click command");
  }
}

function handleKeyDown(event, gameState) {
  console.log(`Key pressed: ${event.key} (ctrl: ${event.ctrlKey})`);
  
  switch (event.key) {
    case 'Escape':
      console.log("Escape pressed");
      clearSelection();
      if (gameState.isBuildingMode) {
        // Call exitBuildingMode from window
        if (window.exitBuildingMode) {
          window.exitBuildingMode();
        }
        // Show notification
        if (window.showNotification) {
          window.showNotification('Build mode cancelled', 'info');
        }
      }
      break;
    case 'b':
    case 'B':
      if (!event.ctrlKey) {
        console.log("Entering building mode: barracks");
        // Call enterBuildingMode from window
        if (window.enterBuildingMode) {
          window.enterBuildingMode('barracks');
        }
      }
      break;
    case 'c':
    case 'C':
      if (!event.ctrlKey) {
        console.log("Entering building mode: command_center");
        if (window.enterBuildingMode) {
          window.enterBuildingMode('command_center');
        }
      }
      break;
    case 's':
    case 'S':
      if (!event.ctrlKey) {
        console.log("Entering building mode: supply_depot");
        if (window.enterBuildingMode) {
          window.enterBuildingMode('supply_depot');
        }
      }
      break;
    case 't':
    case 'T':
      if (!event.ctrlKey) {
        console.log("Entering building mode: turret");
        if (window.enterBuildingMode) {
          window.enterBuildingMode('turret');
        }
      }
      break;
    case 'r':
    case 'R':
      if (!event.ctrlKey) {
        console.log("Entering building mode: refinery");
        if (window.enterBuildingMode) {
          window.enterBuildingMode('refinery');
        }
      }
      break;
    case 'g':
    case 'G':
      // Gather command
      console.log("Gather command (G key)");
      if (selectedUnits.size > 0) {
        const findNearestResourceNode = window.gameDebug?.findNearestResourceNode;
        if (findNearestResourceNode) {
          const nearestNode = findNearestResourceNode();
          if (nearestNode) {
            console.log(`Found nearest ${nearestNode.type} node at (${nearestNode.x}, ${nearestNode.y})`);
            
            let workersSent = 0;
            selectedUnits.forEach(unitId => {
              const unit = units.get(unitId);
              if (unit && unit.type === 'worker') {
                const success = unit.startGathering(nearestNode.id);
                if (success) workersSent++;
              }
            });
            
            if (window.showNotification) {
              if (workersSent > 0) {
                window.showNotification(`${workersSent} worker(s) sent to gather ${nearestNode.type}`, 'info');
              } else {
                window.showNotification('No workers selected or cannot gather', 'warning');
              }
            }
          } else {
            console.log("No resource nodes found nearby");
            if (window.showNotification) {
              window.showNotification('No resource nodes nearby', 'warning');
            }
          }
        }
      }
      break;
    case 'a':
    case 'A':
      if (event.ctrlKey || event.metaKey) {
        // Select all units
        console.log("Select all units (Ctrl+A)");
        let selectedCount = 0;
        units.forEach((unit, id) => {
          if (unit.owner === currentPlayerId) {
            selectUnit(id);
            selectedCount++;
          }
        });
        console.log(`Selected ${selectedCount} units`);
        if (window.showNotification) {
          window.showNotification(`Selected ${selectedCount} units`, 'info');
        }
      }
      break;
    case 'v':
    case 'V':
      if (event.ctrlKey) {
        console.log("Force vespene gathering (Ctrl+V)");
        const forceVespeneGathering = window.gameDebug?.forceVespeneGathering;
        if (forceVespeneGathering) {
          forceVespeneGathering();
        }
      }
      break;
    case 'd':
    case 'D':
      if (event.ctrlKey) {
        console.log("Toggle debug mode");
        gameState.debug.showClickRadius = !gameState.debug.showClickRadius;
        gameState.debug.showNodeInfo = !gameState.debug.showNodeInfo;
        gameState.debug.logEvents = !gameState.debug.logEvents;
        if (window.showNotification) {
          window.showNotification(`Debug mode ${gameState.debug.showClickRadius ? 'ON' : 'OFF'}`, 'info');
        }
      }
      break;
    case ' ':
      // Center camera on selection (not implemented yet)
      console.log("Space pressed - center camera");
      break;
  }
}