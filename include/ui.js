//import { gameState } from '/sc/main.js';
import { units, selectedUnits, players, currentPlayerId } from '/sc/index.js';
// Import from index.js


// UI state
export const uiState = {
  showUnitCommands: false,
  showBuildingMenu: false,
  selectedWorker: null
};

export function setupUI() {
  // Create notification container
  const notificationContainer = document.createElement('div');
  notificationContainer.id = 'notification-container';
  notificationContainer.style.cssText = `
    position: absolute;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    max-width: 400px;
    pointer-events: none;
  `;
  document.body.appendChild(notificationContainer);
  
  console.log("UI setup complete");
}

export function setupDebugPanel() {
  const debugPanel = document.createElement('div');
  debugPanel.id = 'debug-panel';
  debugPanel.style.cssText = `
    position: absolute;
    top: 100px;
    right: 10px;
    background: rgba(0,0,0,0.7);
    color: #fff;
    padding: 10px;
    border-radius: 5px;
    font-family: monospace;
    font-size: 12px;
    z-index: 1000;
    max-width: 300px;
  `;
  
  debugPanel.innerHTML = `
    <h4 style="margin:0 0 10px 0; color:#f1c40f">Debug Controls</h4>
    <div>Ctrl+D: Toggle debug info</div>
    <div>Ctrl+V: Force vespene gather</div>
    <div>G: Gather nearest resource</div>
    <div>ESC: Cancel/clear selection</div>
  `;
  
  document.body.appendChild(debugPanel);
}

export function showNotification(message, type = 'info') {
  const container = document.getElementById('notification-container');
  if (!container) return;
  
  const notification = document.createElement('div');
  
  let bgColor, textColor;
  switch(type) {
    case 'error':
      bgColor = '#e74c3c';
      textColor = '#fff';
      break;
    case 'warning':
      bgColor = '#f39c12';
      textColor = '#fff';
      break;
    case 'success':
      bgColor = '#2ecc71';
      textColor = '#fff';
      break;
    default:
      bgColor = '#3498db';
      textColor = '#fff';
  }
  
  notification.style.cssText = `
    background: ${bgColor};
    color: ${textColor};
    padding: 10px 20px;
    margin-bottom: 5px;
    border-radius: 4px;
    opacity: 0;
    transform: translateY(-20px);
    transition: opacity 0.3s, transform 0.3s;
    text-align: center;
    font-family: Arial, sans-serif;
    font-size: 14px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    max-width: 400px;
  `;
  
  notification.textContent = message;
  container.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.opacity = '0.9';
    notification.style.transform = 'translateY(0)';
  }, 10);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(-20px)';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

export function updateResourceDisplay(playerId, resources) {
  if (players[playerId]) {
    players[playerId].resources = { ...resources };
  }
}

export function updateUIState() {
  // Check if selected units include workers
  const workers = Array.from(selectedUnits).filter(id => {
    const unit = units.get(id);
    return unit && unit.type === 'worker';
  });
  
  uiState.showUnitCommands = workers.length > 0;
  uiState.selectedWorker = workers.length === 1 ? workers[0] : null;
}