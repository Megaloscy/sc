//import { showClickEffect } from './effects.js';



// Import from index.js
import { units, selectedUnits, currentPlayerId } from '/sc/index.js';

// Import UI functions
import { showNotification } from './ui.js';

// Resource node functions
export function findResourceNodeAt(x, y) {
  const nodes = window.gameResourceNodes;
  if (!nodes) {
    console.log("  No resource nodes in game");
    return null;
  }
  
  console.log(`  Searching ${nodes.size} resource nodes...`);
  
  let foundNode = null;
  let closestDistance = Infinity;
  
  nodes.forEach((node, id) => {
    if (node.amount <= 0) {
      console.log(`    Node ${id} depleted, skipping`);
      return;
    }
    
    const distance = Math.sqrt(Math.pow(node.x - x, 2) + Math.pow(node.y - y, 2));
    console.log(`    Node ${id} (${node.type}) at (${node.x}, ${node.y}), distance: ${distance.toFixed(1)}`);
    
    // Check if within click radius (30 pixels)
    if (distance < 30 && distance < closestDistance) {
      closestDistance = distance;
      foundNode = { id, ...node };
      console.log(`      ✓ Within range!`);
    }
  });
  
  if (foundNode) {
    console.log(`  Found ${foundNode.type} node: ${foundNode.id} at distance ${closestDistance.toFixed(1)}`);
  } else {
    console.log(`  No resource node found within 30px of (${x}, ${y})`);
  }
  
  return foundNode;
}

export function findBuildingAt(x, y) {
  const buildings = window.gameBuildings;
  if (!buildings) return null;
  
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
      return { id, building };
    }
  }
  return null;
}

export function findNearestResourceNode() {
  if (!window.gameResourceNodes || !selectedUnits.size) {
    console.log("Cannot find nearest node: no nodes or no selection");
    return null;
  }
  
  // Get first selected unit position
  const unitId = Array.from(selectedUnits)[0];
  const unit = units.get(unitId);
  if (!unit) {
    console.log("First selected unit not found");
    return null;
  }
  
  console.log(`Finding nearest resource node to unit at (${unit.x}, ${unit.y})`);
  
  let nearestNode = null;
  let nearestDistance = Infinity;
  
  window.gameResourceNodes.forEach((node, id) => {
    if (node.amount <= 0) return;
    
    const distance = Math.sqrt(
      Math.pow(node.x - unit.x, 2) + 
      Math.pow(node.y - unit.y, 2)
    );
    
    console.log(`  Node ${id} (${node.type}) at distance ${distance.toFixed(1)}`);
    
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestNode = { id, ...node };
    }
  });
  
  if (nearestNode) {
    console.log(`Nearest node: ${nearestNode.type} at distance ${nearestDistance.toFixed(1)}`);
  } else {
    console.log("No resource nodes found");
  }
  
  return nearestNode;
}

export function forceVespeneGathering() {
  console.log("=== FORCE VESPENE GATHERING ===");
  
  const nodes = window.gameResourceNodes;
  const units = window.gameUnits;
  
  if (!nodes || !units) {
    console.log("Missing nodes or units");
    return;
  }
  
  // Find first vespene node
  let vespeneNode = null;
  nodes.forEach((node, id) => {
    if (node.type === 'vespene' && node.amount > 0 && !vespeneNode) {
      vespeneNode = { id, ...node };
      console.log(`Found vespene node: ${id} at (${node.x}, ${node.y})`);
    }
  });
  
  if (!vespeneNode) {
    console.log("No vespene nodes found");
    showNotification('No vespene nodes available', 'warning');
    return;
  }
  
  // Send all selected workers
  let workersSent = 0;
  selectedUnits.forEach(unitId => {
    const unit = units.get(unitId);
    if (unit && unit.type === 'worker') {
      console.log(`Sending worker ${unitId} to vespene at (${vespeneNode.x}, ${vespeneNode.y})`);
      unit.moveTo(vespeneNode.x, vespeneNode.y);
      unit.gatherTarget = vespeneNode.id;
      unit.isGathering = true;
      unit.state = 'moving_to_gather';
      workersSent++;
    }
  });
  
  if (workersSent > 0) {
    showNotification(`Force sent ${workersSent} worker(s) to vespene`, 'info');
  } else {
    showNotification('No workers selected', 'warning');
  }
}

export function initializeResourceNodes() {
  // Resource nodes are created in index.js now
  console.log("Resource nodes ready");
  
  // Log all resource nodes for debugging
  const nodes = window.gameResourceNodes;
  if (nodes) {
    console.log(`Found ${nodes.size} resource nodes:`);
    nodes.forEach((node, id) => {
      console.log(`  ${id}: ${node.type} at (${node.x},${node.y}) with ${node.amount} resources`);
    });
  }
}

export function testVespeneNodes() {
  console.log("=== Testing Vespene Nodes ===");
  
  const nodes = window.gameResourceNodes;
  if (!nodes) {
    console.log("ERROR: No gameResourceNodes found");
    return;
  }
  
  let vespeneCount = 0;
  nodes.forEach((node, id) => {
    console.log(`Node ${id}: type=${node.type}, amount=${node.amount}, pos=(${node.x},${node.y})`);
    if (node.type === 'vespene') {
      vespeneCount++;
    }
  });
  
  console.log(`Total vespene nodes: ${vespeneCount}`);
  
  // Test finding a vespene node
  if (vespeneCount > 0) {
    // Find first vespene node position
    let vespenePos = null;
    nodes.forEach((node, id) => {
      if (node.type === 'vespene' && !vespenePos) {
        vespenePos = { x: node.x, y: node.y, id };
      }
    });
    
    if (vespenePos) {
      const node = findResourceNodeAt(vespenePos.x, vespenePos.y);
      if (node) {
        console.log(`✓ Found vespene node at (${vespenePos.x}, ${vespenePos.y}): ${node.id}`);
      } else {
        console.log(`✗ Could not find vespene node at (${vespenePos.x}, ${vespenePos.y})`);
      }
    }
  }
}