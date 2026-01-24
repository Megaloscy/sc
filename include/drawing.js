import { effects } from './effects.js';

// Import dependencies
//import { units, selectedUnits, players, currentPlayerId } from '/sc/index.js';
import { units } from '/sc/index.js';

// ========== DRAWING FUNCTIONS ==========
export function drawBackground(ctx, canvas) {
  // Simple gradient background
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(1, '#16213e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

export function drawTerrain(ctx, canvas) {
  // Draw subtle grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 0.5;

  const gridSize = 50;
  for (let x = 0; x < canvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

export function drawResourceNodes(ctx, debug) {
  const nodes = window.gameResourceNodes;
  if (!nodes) return;
  
  nodes.forEach((node, id) => {
    if (node.amount <= 0) return;
    
    // Draw click radius for debugging
    if (debug.showClickRadius) {
      ctx.strokeStyle = node.type === 'minerals' ? 'rgba(52, 152, 219, 0.3)' : 'rgba(46, 204, 113, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(node.x, node.y, 30, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    // Draw mineral node
    if (node.type === 'minerals') {
      // Crystal shape for minerals
      ctx.fillStyle = '#4a90e2';
      ctx.beginPath();
      ctx.moveTo(node.x, node.y - 20);
      ctx.lineTo(node.x + 15, node.y - 5);
      ctx.lineTo(node.x + 15, node.y + 15);
      ctx.lineTo(node.x - 15, node.y + 15);
      ctx.lineTo(node.x - 15, node.y - 5);
      ctx.closePath();
      ctx.fill();
      
      // Draw amount indicator
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.floor(node.amount)}`, node.x, node.y + 35);
      
      // Draw resource icon
      ctx.fillStyle = '#f1c40f';
      ctx.font = '20px Arial';
      ctx.fillText('⛏️', node.x, node.y);
      
      // Label
      ctx.fillStyle = '#3498db';
      ctx.font = 'bold 12px Arial';
      ctx.fillText('MINERALS', node.x, node.y - 35);
    }
    // Draw vespene node
    else if (node.type === 'vespene') {
      // Larger, more visible vespene geyser
      ctx.fillStyle = '#27ae60';
      ctx.beginPath();
      ctx.arc(node.x, node.y, 22, 0, Math.PI * 2);
      ctx.fill();
      
      // Gas effect (pulsing)
      const pulse = (Date.now() % 2000) / 2000;
      const pulseSize = 20 + Math.sin(pulse * Math.PI * 2) * 5;
      ctx.fillStyle = 'rgba(46, 204, 113, 0.3)';
      ctx.beginPath();
      ctx.arc(node.x, node.y, pulseSize, 0, Math.PI * 2);
      ctx.fill();
      
      // Inner glow
      ctx.fillStyle = '#2ecc71';
      ctx.beginPath();
      ctx.arc(node.x, node.y, 15, 0, Math.PI * 2);
      ctx.fill();
      
      // Amount
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.floor(node.amount)}`, node.x, node.y + 45);
      
      // Icon
      ctx.fillStyle = '#fff';
      ctx.font = '24px Arial';
      ctx.fillText('💨', node.x, node.y);
      
      // Label - make it very visible
      ctx.fillStyle = '#2ecc71';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('VESPENE GAS', node.x, node.y - 40);
      ctx.fillText('(Right-click to gather)', node.x, node.y - 25);
    }
    
    // Draw node info for debugging
    if (debug.showNodeInfo) {
      ctx.fillStyle = '#fff';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`ID: ${id.substring(0, 8)}`, node.x, node.y + 60);
    }
  });
}

export function drawBuildings(ctx) {
  const buildings = window.gameBuildings;
  if (!buildings) return;
  
  buildings.forEach((building, id) => {
    let color = building.owner === 1 ? '#3498db' : '#e74c3c';
    let borderColor = building.owner === 1 ? '#2980b9' : '#c0392b';
    
    if (building.isBuilding) {
      // Under construction - semi-transparent
      color = building.owner === 1 ? 'rgba(52, 152, 219, 0.5)' : 'rgba(231, 76, 60, 0.5)';
      borderColor = building.owner === 1 ? 'rgba(41, 128, 185, 0.7)' : 'rgba(192, 57, 43, 0.7)';
    }
    
    // Draw building based on type
    switch(building.type) {
      case 'command_center':
        drawCommandCenter(ctx, building, color, borderColor);
        break;
      case 'barracks':
        drawBarracks(ctx, building, color, borderColor);
        break;
      case 'supply_depot':
        drawSupplyDepot(ctx, building, color, borderColor);
        break;
      case 'turret':
        drawTurret(ctx, building, color, borderColor);
        break;
      case 'refinery':
        drawRefinery(ctx, building, color, borderColor);
        break;
      default:
        drawGenericBuilding(ctx, building, color, borderColor);
    }
    
    // Draw construction progress bar
    if (building.isBuilding) {
      const progressWidth = 60;
      const progressHeight = 6;
      const progressX = building.x - progressWidth / 2;
      const progressY = building.y - 50;
      
      // Background
      ctx.fillStyle = '#333';
      ctx.fillRect(progressX, progressY, progressWidth, progressHeight);
      
      // Progress
      const progressPercent = Math.min(building.buildProgress || 0, 100);
      ctx.fillStyle = '#f1c40f';
      ctx.fillRect(progressX, progressY, progressWidth * (progressPercent / 100), progressHeight);
      
      // Progress text
      ctx.fillStyle = '#fff';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.floor(progressPercent)}%`, building.x, progressY - 5);
    }
    
    // Draw health bar for completed buildings
    if (!building.isBuilding) {
      const healthWidth = 50;
      const healthHeight = 5;
      const healthX = building.x - healthWidth / 2;
      const healthY = building.y - 40;
      
      // Background
      ctx.fillStyle = '#333';
      ctx.fillRect(healthX, healthY, healthWidth, healthHeight);
      
      // Health
      const healthPercent = building.health / building.maxHealth;
      ctx.fillStyle = healthPercent > 0.5 ? '#2ecc71' : healthPercent > 0.25 ? '#f39c12' : '#e74c3c';
      ctx.fillRect(healthX, healthY, healthWidth * healthPercent, healthHeight);
    }
    
    // Draw selection
    if (building.selected) {
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      
      switch(building.type) {
        case 'command_center':
          ctx.strokeRect(building.x - 45, building.y - 35, 90, 70);
          break;
        case 'barracks':
          ctx.strokeRect(building.x - 35, building.y - 35, 70, 70);
          break;
        default:
          ctx.strokeRect(building.x - 25, building.y - 25, 50, 50);
      }
      
      ctx.setLineDash([]);
    }
  });
}

function drawCommandCenter(ctx, building, color, borderColor) {
  // Main building
  ctx.fillStyle = color;
  ctx.fillRect(building.x - 40, building.y - 30, 80, 60);
  
  // Roof
  ctx.fillStyle = borderColor;
  ctx.beginPath();
  ctx.moveTo(building.x - 40, building.y - 30);
  ctx.lineTo(building.x, building.y - 50);
  ctx.lineTo(building.x + 40, building.y - 30);
  ctx.closePath();
  ctx.fill();
  
  // Door
  ctx.fillStyle = '#2c3e50';
  ctx.fillRect(building.x - 10, building.y + 5, 20, 25);
  
  // Windows
  ctx.fillStyle = '#f1c40f';
  ctx.fillRect(building.x - 30, building.y - 10, 10, 10);
  ctx.fillRect(building.x + 20, building.y - 10, 10, 10);
  
  // Icon
  ctx.fillStyle = '#fff';
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('🏠', building.x, building.y + 5);
}

function drawBarracks(ctx, building, color, borderColor) {
  // Main building
  ctx.fillStyle = color;
  ctx.fillRect(building.x - 30, building.y - 30, 60, 60);
  
  // Roof
  ctx.fillStyle = borderColor;
  ctx.fillRect(building.x - 35, building.y - 30, 70, 10);
  
  // Door
  ctx.fillStyle = '#2c3e50';
  ctx.fillRect(building.x - 8, building.y + 10, 16, 20);
  
  // Windows
  ctx.fillStyle = '#f1c40f';
  for (let i = -2; i <= 2; i++) {
    ctx.fillRect(building.x + (i * 12) - 5, building.y - 15, 8, 8);
  }
  
  // Icon
  ctx.fillStyle = '#fff';
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('⚔️', building.x, building.y + 5);
}

function drawSupplyDepot(ctx, building, color, borderColor) {
  // Main structure
  ctx.fillStyle = color;
  ctx.fillRect(building.x - 20, building.y - 20, 40, 40);
  
  // Top
  ctx.fillStyle = borderColor;
  ctx.fillRect(building.x - 25, building.y - 25, 50, 10);
  
  // Storage lines
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(building.x - 15, building.y + (i * 10));
    ctx.lineTo(building.x + 15, building.y + (i * 10));
    ctx.stroke();
  }
  
  // Icon
  ctx.fillStyle = '#fff';
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('📦', building.x, building.y);
}

function drawTurret(ctx, building, color, borderColor) {
  // Base
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(building.x, building.y, 15, 0, Math.PI * 2);
  ctx.fill();
  
  // Turret head
  ctx.fillStyle = borderColor;
  ctx.beginPath();
  ctx.arc(building.x, building.y - 10, 10, 0, Math.PI * 2);
  ctx.fill();
  
  // Gun barrel
  ctx.strokeStyle = '#2c3e50';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(building.x, building.y - 10);
  ctx.lineTo(building.x + 20, building.y - 20);
  ctx.stroke();
  
  // Icon
  ctx.fillStyle = '#fff';
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('🔫', building.x, building.y - 10);
}

function drawRefinery(ctx, building, color, borderColor) {
  // Base
  ctx.fillStyle = color;
  ctx.fillRect(building.x - 25, building.y - 20, 50, 40);
  
  // Gas tanks
  ctx.fillStyle = borderColor;
  ctx.fillRect(building.x - 20, building.y - 25, 15, 10);
  ctx.fillRect(building.x + 5, building.y - 25, 15, 10);
  
  // Pipes
  ctx.strokeStyle = '#2ecc71';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(building.x - 15, building.y + 20);
  ctx.lineTo(building.x - 15, building.y + 40);
  ctx.moveTo(building.x + 15, building.y + 20);
  ctx.lineTo(building.x + 15, building.y + 40);
  ctx.stroke();
  
  // Icon
  ctx.fillStyle = '#fff';
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('⛽', building.x, building.y);
}

function drawGenericBuilding(ctx, building, color, borderColor) {
  ctx.fillStyle = color;
  ctx.fillRect(building.x - 25, building.y - 25, 50, 50);
  
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(building.x - 25, building.y - 25, 50, 50);
}

export function drawUnits(ctx, units, selectedUnits, getStateColor) {
  units.forEach((unit, id) => {
    // Draw unit based on type
    if (unit.type === 'worker') {
      drawWorker(ctx, unit);
    } else if (unit.type === 'soldier') {
      drawSoldier(ctx, unit);
    } else if (unit.type === 'archer') {
      drawArcher(ctx, unit);
    }

    // Draw health bar
    const healthWidth = 30;
    const healthHeight = 4;
    const healthX = unit.x - healthWidth / 2;
    const healthY = unit.y - 20;
    
    // Background
    ctx.fillStyle = '#333';
    ctx.fillRect(healthX, healthY, healthWidth, healthHeight);
    
    // Health
    const healthPercent = unit.health / unit.maxHealth;
    ctx.fillStyle = healthPercent > 0.5 ? '#2ecc71' : healthPercent > 0.25 ? '#f39c12' : '#e74c3c';
    ctx.fillRect(healthX, healthY, healthWidth * healthPercent, healthHeight);

    // Draw selection indicator
    if (unit.selected) {
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(unit.x, unit.y, 18, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw attack target line if attacking
    if (unit.attackTarget) {
      const target = units.get(unit.attackTarget);
      if (target) {
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(unit.x, unit.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Draw carried resources for workers
    if (unit.type === 'worker' && (unit.carriedResources?.minerals > 0 || unit.carriedResources?.vespene > 0)) {
      ctx.fillStyle = '#fff';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      
      let resourceText = '';
      if (unit.carriedResources.minerals > 0) {
        resourceText += `⛏️${Math.floor(unit.carriedResources.minerals)}`;
      }
      if (unit.carriedResources.vespene > 0) {
        if (resourceText) resourceText += ' ';
        resourceText += `💨${Math.floor(unit.carriedResources.vespene)}`;
      }
      
      ctx.fillText(resourceText, unit.x, unit.y + 25);
    }

    // Draw unit state indicator
    if (unit.state !== 'idle' && unit.state !== 'moving') {
      ctx.fillStyle = getStateColor(unit.state);
      ctx.font = '8px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(unit.state.charAt(0).toUpperCase(), unit.x, unit.y + 35);
    }
  });
}

function drawWorker(ctx, unit) {
  const color = unit.owner === 1 ? '#3498db' : '#e74c3c';
  const accentColor = unit.owner === 1 ? '#2980b9' : '#c0392b';
  
  // Body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(unit.x, unit.y, 10, 0, Math.PI * 2);
  ctx.fill();
  
  // Tool (pickaxe for mining, wrench for building)
  if (unit.state === 'gathering' || unit.state === 'moving_to_gather') {
    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(unit.x + 5, unit.y - 5);
    ctx.lineTo(unit.x + 15, unit.y - 15);
    ctx.stroke();
  } else if (unit.state === 'building' || unit.state === 'moving_to_build') {
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(unit.x + 5, unit.y - 5);
    ctx.lineTo(unit.x + 15, unit.y - 15);
    ctx.lineTo(unit.x + 10, unit.y - 10);
    ctx.stroke();
  }
  
  // Helmet
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.arc(unit.x, unit.y - 5, 8, 0, Math.PI * 2);
  ctx.fill();
  
  // Visor
  ctx.fillStyle = '#2c3e50';
  ctx.fillRect(unit.x - 4, unit.y - 7, 8, 3);
}

function drawSoldier(ctx, unit) {
  const color = unit.owner === 1 ? '#2980b9' : '#c0392b';
  const accentColor = unit.owner === 1 ? '#1f618d' : '#922b21';
  
  // Body (armor)
  ctx.fillStyle = color;
  ctx.fillRect(unit.x - 12, unit.y - 12, 24, 24);
  
  // Helmet
  ctx.fillStyle = accentColor;
  ctx.fillRect(unit.x - 8, unit.y - 15, 16, 8);
  
  // Weapon
  ctx.strokeStyle = '#7f8c8d';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(unit.x + 12, unit.y);
  ctx.lineTo(unit.x + 25, unit.y);
  ctx.stroke();
}

function drawArcher(ctx, unit) {
  const color = unit.owner === 1 ? '#9b59b6' : '#8e44ad';
  const accentColor = unit.owner === 1 ? '#8e44ad' : '#6c3483';
  
  // Body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(unit.x, unit.y, 12, 0, Math.PI * 2);
  ctx.fill();
  
  // Quiver
  ctx.fillStyle = accentColor;
  ctx.fillRect(unit.x - 15, unit.y - 5, 6, 15);
  
  // Bow
  ctx.strokeStyle = '#8b4513';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(unit.x + 10, unit.y, 15, -Math.PI/4, Math.PI/4);
  ctx.stroke();
}

export function drawBuildingGhost(ctx, mouseX, mouseY, currentBuildingType, buildingGhost, canPlaceBuilding) {
  if (!buildingGhost) return;
  
  ctx.fillStyle = canPlaceBuilding ? 'rgba(46, 204, 113, 0.3)' : 'rgba(231, 76, 60, 0.3)';
  ctx.strokeStyle = canPlaceBuilding ? '#2ecc71' : '#e74c3c';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  
  // Draw ghost building
  switch(currentBuildingType) {
    case 'command_center':
      ctx.fillRect(mouseX - 40, mouseY - 30, 80, 60);
      ctx.strokeRect(mouseX - 40, mouseY - 30, 80, 60);
      break;
    case 'barracks':
      ctx.fillRect(mouseX - 30, mouseY - 30, 60, 60);
      ctx.strokeRect(mouseX - 30, mouseY - 30, 60, 60);
      break;
    case 'supply_depot':
      ctx.fillRect(mouseX - 20, mouseY - 20, 40, 40);
      ctx.strokeRect(mouseX - 20, mouseY - 20, 40, 40);
      break;
    case 'turret':
      ctx.beginPath();
      ctx.arc(mouseX, mouseY, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case 'refinery':
      ctx.fillRect(mouseX - 25, mouseY - 20, 50, 40);
      ctx.strokeRect(mouseX - 25, mouseY - 20, 50, 40);
      break;
  }
  
  ctx.setLineDash([]);
  
  // Draw building name and cost
  const template = window.gameSystems?.buildings?.getBuildingTemplate(currentBuildingType);
  if (template) {
    ctx.fillStyle = canPlaceBuilding ? '#2ecc71' : '#e74c3c';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${template.name}`, mouseX, mouseY - 50);
    
    ctx.fillStyle = '#f1c40f';
    ctx.font = '12px Arial';
    if (template.cost.minerals) {
      ctx.fillText(`Cost: ${template.cost.minerals} minerals`, mouseX, mouseY + 40);
    }
    if (template.cost.vespene) {
      ctx.fillText(`+ ${template.cost.vespene} vespene`, mouseX, mouseY + 55);
    }
  }
}

export function drawDragSelection(ctx, dragStartX, dragStartY, dragEndX, dragEndY) {
  ctx.strokeStyle = 'rgba(241, 196, 15, 0.8)';
  ctx.lineWidth = 2;
  ctx.fillStyle = 'rgba(241, 196, 15, 0.1)';
  
  const width = dragEndX - dragStartX;
  const height = dragEndY - dragStartY;
  
  ctx.strokeRect(dragStartX, dragStartY, width, height);
  ctx.fillRect(dragStartX, dragStartY, width, height);
}

export function drawUI(ctx, canvas, units, selectedUnits, players, currentPlayerId, uiState, isBuildingMode, currentBuildingType) {
  // Draw resource display
  drawResourceDisplay(ctx, canvas, players, currentPlayerId);
  
  // Draw selected unit info
  if (selectedUnits.size > 0) {
    drawSelectedUnitInfo(ctx, canvas, units, selectedUnits);
    drawUnitCommands(ctx, canvas, units, selectedUnits);
  }
  
  // Draw building mode info
  if (isBuildingMode) {
    drawBuildingModeInfo(ctx, canvas, currentBuildingType);
  }
  
  // Draw player info
  drawPlayerInfo(ctx, canvas, currentPlayerId);
  
  // Draw debug info
  drawDebugUI(ctx, canvas, selectedUnits, units);
}

function drawResourceDisplay(ctx, canvas, players, currentPlayerId) {
  const playerResources = players[currentPlayerId]?.resources;
  if (playerResources) {
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 180, 80);
    
    // Border
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 180, 80);
    
    // Title
    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Resources', 20, 30);
    
    // Minerals
    ctx.fillStyle = '#4a90e2';
    ctx.font = '14px Arial';
    ctx.fillText('⛏️', 20, 50);
    ctx.fillStyle = '#fff';
    ctx.fillText(`Minerals: ${playerResources.minerals || 0}`, 40, 50);
    
    // Vespene
    ctx.fillStyle = '#2ecc71';
    ctx.fillText('💨', 20, 70);
    ctx.fillStyle = '#fff';
    ctx.fillText(`Vespene: ${playerResources.vespene || 0}`, 40, 70);
    
    // Supply (if available)
    if (window.gameSystems?.resources) {
      const supply = window.gameSystems.resources.getPlayerSupply(currentPlayerId);
      if (supply) {
        ctx.fillStyle = '#f39c12';
        ctx.fillText('👥', 20, 90);
        ctx.fillStyle = '#fff';
        ctx.fillText(`Supply: ${supply.used}/${supply.max}`, 40, 90);
      }
    }
  }
}

function drawSelectedUnitInfo(ctx, canvas, units, selectedUnits) {
  if (selectedUnits.size === 1) {
    const unitId = Array.from(selectedUnits)[0];
    const unit = units.get(unitId);
    if (unit) {
      // Background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(10, canvas.height - 140, 200, 130);
      
      // Border
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 2;
      ctx.strokeRect(10, canvas.height - 140, 200, 130);
      
      // Unit info
      ctx.fillStyle = '#f1c40f';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`Selected: ${unit.type.toUpperCase()}`, 20, canvas.height - 120);
      
      ctx.fillStyle = '#fff';
      ctx.font = '12px Arial';
      ctx.fillText(`Health: ${Math.floor(unit.health)}/${unit.maxHealth}`, 20, canvas.height - 100);
      ctx.fillText(`Owner: Player ${unit.owner}`, 20, canvas.height - 85);
      ctx.fillText(`State: ${unit.state}`, 20, canvas.height - 70);
      ctx.fillText(`Position: (${Math.floor(unit.x)}, ${Math.floor(unit.y)})`, 20, canvas.height - 55);
      
      // Worker specific info
      if (unit.type === 'worker') {
        ctx.fillText(`Carrying: ${Math.floor(unit.carriedResources?.minerals || 0)} minerals`, 20, canvas.height - 40);
        ctx.fillText(`Carrying: ${Math.floor(unit.carriedResources?.vespene || 0)} vespene`, 20, canvas.height - 25);
        ctx.fillText(`Gathering: ${unit.isGathering ? 'Yes' : 'No'}`, 20, canvas.height - 10);
      }
    }
  } else if (selectedUnits.size > 1) {
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, canvas.height - 100, 180, 90);
    
    // Border
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, canvas.height - 100, 180, 90);
    
    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`${selectedUnits.size} units selected`, 20, canvas.height - 80);
    
    // Count unit types
    const unitCounts = {};
    selectedUnits.forEach(id => {
      const unit = units.get(id);
      if (unit) {
        unitCounts[unit.type] = (unitCounts[unit.type] || 0) + 1;
      }
    });
    
    let y = canvas.height - 60;
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    Object.entries(unitCounts).forEach(([type, count]) => {
      ctx.fillText(`${type}: ${count}`, 20, y);
      y += 15;
    });
  }
}

function drawUnitCommands(ctx, canvas, units, selectedUnits) {
  // Check if selected units include workers
  const hasWorker = Array.from(selectedUnits).some(id => {
    const unit = units.get(id);
    return unit && unit.type === 'worker';
  });
  
  if (hasWorker) {
    // Draw worker command panel
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(canvas.width - 210, 10, 200, 180);
    
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 2;
    ctx.strokeRect(canvas.width - 210, 10, 200, 180);
    
    ctx.fillStyle = '#3498db';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Worker Commands', canvas.width - 200, 30);
    
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.fillText('G - Gather nearest resource', canvas.width - 200, 50);
    ctx.fillText('B - Build Barracks', canvas.width - 200, 65);
    ctx.fillText('S - Build Supply Depot', canvas.width - 200, 80);
    ctx.fillText('T - Build Turret', canvas.width - 200, 95);
    ctx.fillText('C - Build Command Center', canvas.width - 200, 110);
    ctx.fillText('R - Build Refinery (on gas)', canvas.width - 200, 125);
    ctx.fillText('Right-click resource: Gather', canvas.width - 200, 140);
    ctx.fillText('Right-click ground: Move', canvas.width - 200, 155);
    ctx.fillText('Right-click enemy: Attack', canvas.width - 200, 170);
  }
}

function drawBuildingModeInfo(ctx, canvas, currentBuildingType) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(canvas.width / 2 - 150, 10, 300, 40);
  
  ctx.strokeStyle = '#2ecc71';
  ctx.lineWidth = 2;
  ctx.strokeRect(canvas.width / 2 - 150, 10, 300, 40);
  
  ctx.fillStyle = '#2ecc71';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`BUILDING MODE: ${currentBuildingType?.toUpperCase() || ''}`, canvas.width / 2, 30);
  
  ctx.fillStyle = '#fff';
  ctx.font = '12px Arial';
  ctx.fillText('Right-click to place, ESC to cancel', canvas.width / 2, 50);
}

function drawPlayerInfo(ctx, canvas, currentPlayerId) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(canvas.width - 150, canvas.height - 40, 140, 30);
  
  ctx.fillStyle = currentPlayerId === 1 ? '#3498db' : '#e74c3c';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`Player ${currentPlayerId}`, canvas.width - 80, canvas.height - 20);
}

function drawDebugUI(ctx, canvas, selectedUnits, units) {
  // Draw mouse position
  ctx.fillStyle = '#fff';
  ctx.font = '12px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`Mouse: (${window.gameDebug?.mouseX || 0}, ${window.gameDebug?.mouseY || 0})`, canvas.width - 150, 30);
  
  // Draw selected units count
  ctx.fillText(`Selected: ${selectedUnits.size}`, canvas.width - 150, 45);
  
  // Draw total units
  ctx.fillText(`Total units: ${units.size}`, canvas.width - 150, 60);
  
  // Draw resource nodes info
  const nodes = window.gameResourceNodes;
  if (nodes) {
    ctx.fillText(`Resource nodes: ${nodes.size}`, canvas.width - 150, 75);
    
    // Count by type
    let minerals = 0, vespene = 0;
    nodes.forEach(node => {
      if (node.type === 'minerals') minerals++;
      else if (node.type === 'vespene') vespene++;
    });
    ctx.fillText(`Minerals: ${minerals}, Vespene: ${vespene}`, canvas.width - 150, 90);
  }
}

export function drawDebugInfo(ctx, mouseX, mouseY, debug) {
  if (debug.showClickRadius) {
    // Draw mouse click radius
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(mouseX, mouseY, 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

export function drawEffects(ctx) {
  // Draw damage indicators
  effects.damageIndicators.forEach(indicator => {
    ctx.fillStyle = indicator.color;
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.globalAlpha = Math.min(1, indicator.lifetime / 500);
    ctx.fillText(indicator.text, indicator.x, indicator.y);
    ctx.globalAlpha = 1;
  });

  // Draw destruction effects
  effects.destructionEffects.forEach(effect => {
    ctx.strokeStyle = effect.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Draw gathering effects
  effects.gatheringEffects.forEach(effect => {
    ctx.fillStyle = effect.color;
    ctx.globalAlpha = Math.min(1, effect.lifetime / 300);
    ctx.fillRect(effect.x, effect.y, 3, 3);
    ctx.globalAlpha = 1;
  });

  // Draw build effects
  effects.buildEffects.forEach(effect => {
    ctx.strokeStyle = effect.color;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  });

  // Draw selection effects
  effects.selectionEffects.forEach(effect => {
    ctx.strokeStyle = effect.color;
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  });

  // Draw click effects
  effects.clickEffects.forEach(effect => {
    ctx.strokeStyle = effect.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
    ctx.stroke();
  });
}