import { units, selectedUnits, currentPlayerId, selectUnit, selectBuilding } from '/sc/index.js';

export function handleClickSelection(x, y) {
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

export function handleDragSelection(startX, startY, endX, endY) {
  const left = Math.min(startX, endX);
  const right = Math.max(startX, endX);
  const top = Math.min(startY, endY);
  const bottom = Math.max(startY, endY);
  
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