import { BUILDINGS, COMMAND_TYPES, KEYBOARD_SHORTCUTS, DEBUG_SETTINGS } from '../core/GameConstants.js';

// UI System - Version 1.0.0
class UISystem {
    constructor(gameEngine) {
        this.game = gameEngine;
        
        // UI Elements - Now pointing to content areas
        this.elements = {
            resourcesContent: document.getElementById('resourcesContent'),
            selectionPanel: document.getElementById('selectionPanel'),
            buildPanel: document.getElementById('buildPanel'),
            unitCommands: document.getElementById('unitCommands'),
            selectedInfo: document.getElementById('selectedInfo'),
            gameInfo: document.getElementById('gameInfo'),
            debugContent: document.getElementById('debugContent'),
            minimap: document.getElementById('minimap')
        };
        
        // UI State
        this.currentBuildOptions = null;
        this.showingBuildMenu = false;
        this.debugMode = false;
        
        // Performance
        this.lastUIUpdate = 0;
        this.uiUpdateInterval = 100;
        
        console.log('UISystem initialized');
    }

    init() {
        this.setupEventListeners();
        this.updateUI();
        this.addButtonTooltips(); 
        this.createKeyReference(); 
        
        // Create help panel after a short delay
        setTimeout(() => {
            this.createHelpPanel();
        }, 1000);
        
        console.log('UISystem ready');
    }

    setupEventListeners() {
        // Minimap click
        this.elements.minimap.addEventListener('click', (e) => {
            const rect = this.elements.minimap.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const worldX = (x / this.elements.minimap.width) * this.game.worldSize.width;
            const worldY = (y / this.elements.minimap.height) * this.game.worldSize.height;
            
            this.game.centerCameraOn(worldX, worldY);
        });
        
        // Window resize
        window.addEventListener('resize', () => this.handleResize());
        
        console.log('UI event listeners set up');
    }

    handleResize() {
        // Adjust UI elements on resize
        this.updateSelectionPanelPosition();
    }

    updateSelectionPanelPosition() {
        const panel = this.elements.selectionPanel;
        const minimap = this.elements.minimap;
        
        // Position selection panel above minimap
        if (panel && minimap) {
            const minimapRect = minimap.getBoundingClientRect();
            panel.style.bottom = `${window.innerHeight - minimapRect.top + 10}px`;
        }
    }

    updateUI() {
        this.updateResources();
        this.updatePlayerInfo();
        this.updateSelectionUI();
        
        if (DEBUG_SETTINGS.SHOW_DEBUG_INFO) {
            this.updateDebugInfo();
        }
    }

    updateResources() {
        if (!this.game.localPlayer) return;
        
        const resources = this.game.localPlayer.resources;
        
        // Update resource displays
        const energyEl = document.getElementById('energy');
        const metalEl = document.getElementById('metal');
        const crystalEl = document.getElementById('crystal');
        const gasEl = document.getElementById('gas');
        
        if (energyEl) energyEl.textContent = Math.floor(resources.energy || 0);
        if (metalEl) metalEl.textContent = Math.floor(resources.metal || 0);
        if (crystalEl) crystalEl.textContent = Math.floor(resources.crystal || 0);
        if (gasEl) gasEl.textContent = Math.floor(resources.gas || 0);
        
        // Add animation for resource changes
        this.animateResourceChanges();
    }

    animateResourceChanges() {
        // You could add animations for resource gains/losses here
        // For example, flash the number when resources change
    }

    updatePlayerInfo() {
        const playerCountEl = document.getElementById('playerCount');
        const playerRaceEl = document.getElementById('playerRace');
        
        if (playerCountEl) playerCountEl.textContent = this.game.players.size;
        if (playerRaceEl && this.game.localPlayer) {
            playerRaceEl.textContent = this.game.localPlayer.race.name;
            playerRaceEl.style.color = this.game.localPlayer.race.color;
        }
    }

    updateSelectionUI() {
        const selectedObjects = this.game.getSelectedObjects();
        const selectedUnits = selectedObjects.units;
        const selectedBuildings = selectedObjects.buildings;
        
        if (selectedUnits.length === 0 && selectedBuildings.length === 0) {
            this.showNoSelection();
            return;
        }
        
        if (selectedUnits.length === 1 && selectedBuildings.length === 0) {
            this.showSingleUnitInfo(selectedUnits[0]);
        } else if (selectedBuildings.length === 1 && selectedUnits.length === 0) {
            this.showSingleBuildingInfo(selectedBuildings[0]);
        } else {
            this.showMultipleObjectsInfo(selectedUnits, selectedBuildings);
        }
    }

    showSingleBuildingInfo(building) {
        // Update info display
        const healthPercent = (building.health / building.maxHealth) * 100;
        const healthColor = this.getHealthColor(healthPercent);
        
        this.elements.selectedInfo.innerHTML = `
            <div style="color: ${healthColor}; font-weight: bold;">${building.name}</div>
            <div style="font-size: 12px; color: #ccc;">
                Health: ${Math.floor(building.health)}/${building.maxHealth} |
                ${building.isConstructing ? 'Constructing' : building.isProducing() ? 'Producing' : 'Idle'}
            </div>
        `;
        
        // Update commands for buildings
        this.updateBuildingCommands(building);
        
        // Clear build panel
        this.elements.buildPanel.innerHTML = '';
        this.showingBuildMenu = false;
    }

    updateBuildingCommands(building) {
        this.elements.unitCommands.innerHTML = '';
        
        const commands = [
            { 
                name: 'Set Rally Point', 
                action: 'setRally', 
                icon: '📍',
                enabled: !building.isConstructing 
            },
            { 
                name: 'Repair/Heal', 
                action: 'repair', 
                icon: '🛠️',
                enabled: building.health < building.maxHealth 
            },
            { 
                name: 'Cancel Production', 
                action: 'cancelProduction', 
                icon: '❌',
                enabled: building.isProducing() 
            }
        ];
        
        // Add production commands based on building type
        if (building.name === 'Barracks' || building.name === 'Gateway') {
            commands.push(
                { 
                    name: 'Train Infantry', 
                    action: 'trainInfantry', 
                    icon: '👤',
                    enabled: !building.isConstructing 
                }
            );
        }
        
        if (building.name === 'Factory') {
            commands.push(
                { 
                    name: 'Train Vehicle', 
                    action: 'trainVehicle', 
                    icon: '🚗',
                    enabled: !building.isConstructing 
                }
            );
        }
        
        commands.forEach(cmd => {
            const button = this.createCommandButton(cmd, building);
            this.elements.unitCommands.appendChild(button);
        });
    }

    showMultipleObjectsInfo(units, buildings) {
        const totalCount = units.length + buildings.length;
        
        let unitList = '';
        if (units.length > 0) {
            const unitCounts = {};
            units.forEach(unit => {
                unitCounts[unit.name] = (unitCounts[unit.name] || 0) + 1;
            });
            unitList = Object.entries(unitCounts)
                .map(([name, count]) => `${count}x ${name}`)
                .join(', ');
        }
        
        let buildingList = '';
        if (buildings.length > 0) {
            const buildingCounts = {};
            buildings.forEach(building => {
                buildingCounts[building.name] = (buildingCounts[building.name] || 0) + 1;
            });
            buildingList = Object.entries(buildingCounts)
                .map(([name, count]) => `${count}x ${name}`)
                .join(', ');
        }
        
        const lists = [unitList, buildingList].filter(list => list).join(' | ');
        
        this.elements.selectedInfo.innerHTML = `
            <div style="color: #00ff00; font-weight: bold;">${totalCount} objects selected</div>
            <div style="font-size: 12px; color: #ccc;">${lists}</div>
        `;
        
        // Show group commands
        this.updateGroupCommands(units, buildings);
        
        // Hide build panel
        this.elements.buildPanel.innerHTML = '';
        this.showingBuildMenu = false;
    }

    updateGroupCommands(units, buildings) {
        this.elements.unitCommands.innerHTML = '';
        
        const commands = [];
        
        if (units.length > 0) {
            commands.push(
                { 
                    name: 'Move All', 
                    action: 'move', 
                    icon: '➤',
                    enabled: true 
                },
                { 
                    name: 'Attack Move', 
                    action: 'attack', 
                    icon: '⚔',
                    enabled: units.some(u => u.canAttack()) 
                },
                { 
                    name: 'Stop All', 
                    action: 'stop', 
                    icon: '■',
                    enabled: units.some(u => u.state !== 'idle') 
                }
            );
            
            // Add gather command if any workers are selected
            if (units.some(u => u.isWorker())) {
                commands.push(
                    { 
                        name: 'Gather All', 
                        action: 'gather', 
                        icon: '⛏',
                        enabled: true 
                    }
                );
            }
        }
        
        if (buildings.length > 0) {
            commands.push(
                { 
                    name: 'Repair All', 
                    action: 'repairAll', 
                    icon: '🛠️',
                    enabled: buildings.some(b => b.health < b.maxHealth) 
                }
            );
        }
        
        commands.forEach(cmd => {
            const button = this.createCommandButton(cmd);
            this.elements.unitCommands.appendChild(button);
        });
    }

    showNoSelection() {
        this.elements.selectedInfo.textContent = 'No selection';
        this.elements.buildPanel.innerHTML = '';
        this.elements.unitCommands.innerHTML = '';
        this.showingBuildMenu = false;
    }

    showSingleUnitInfo(unit) {
        // Update info display
        const healthPercent = (unit.health / unit.maxHealth) * 100;
        const healthColor = this.getHealthColor(healthPercent);
        
        this.elements.selectedInfo.innerHTML = `
            <div style="color: ${healthColor}; font-weight: bold;">${unit.name}</div>
            <div style="font-size: 12px; color: #ccc;">
                Health: ${Math.floor(unit.health)}/${unit.maxHealth} |
                ${this.getStateDescription(unit.state)}
            </div>
        `;
        
        // Update commands
        this.updateUnitCommands(unit);
        
        // Show build options for workers
        if (unit.isWorker() && !this.showingBuildMenu) {
            this.showBuildOptions(unit.race);
        } else if (!unit.isWorker()) {
            this.elements.buildPanel.innerHTML = '';
            this.showingBuildMenu = false;
        }
    }

    showMultipleUnitsInfo(units) {
        // Group units by type
        const unitCounts = {};
        units.forEach(unit => {
            unitCounts[unit.name] = (unitCounts[unit.name] || 0) + 1;
        });
        
        const unitList = Object.entries(unitCounts)
            .map(([name, count]) => `${count}x ${name}`)
            .join(', ');
        
        this.elements.selectedInfo.innerHTML = `
            <div style="color: #00ff00; font-weight: bold;">${units.length} units selected</div>
            <div style="font-size: 12px; color: #ccc;">${unitList}</div>
        `;
        
        // Show group commands
        this.updateGroupCommands(units);
        
        // Hide build panel
        this.elements.buildPanel.innerHTML = '';
        this.showingBuildMenu = false;
    }

    updateUnitCommands(unit) {
        this.elements.unitCommands.innerHTML = '';
        
        const commands = [
            { 
                name: `Move (${KEYBOARD_SHORTCUTS.MOVE[0].toUpperCase()})`, 
                action: 'move', 
                icon: '➤',
                enabled: true 
            },
            { 
                name: `Stop (${KEYBOARD_SHORTCUTS.STOP[0].toUpperCase()})`, 
                action: 'stop', 
                icon: '■',
                enabled: unit.state !== 'idle' 
            },
            { 
                name: `Attack (${KEYBOARD_SHORTCUTS.ATTACK[0].toUpperCase()})`, 
                action: 'attack', 
                icon: '⚔',
                enabled: unit.canAttack() 
            },
            { 
                name: `Patrol (${KEYBOARD_SHORTCUTS.PATROL[0].toUpperCase()})`, 
                action: 'patrol', 
                icon: '↻',
                enabled: true 
            }
        ];
        
        if (unit.isWorker()) {
            commands.push(
                { 
                    name: `Gather (${KEYBOARD_SHORTCUTS.GATHER[0].toUpperCase()})`, 
                    action: 'gather', 
                    icon: '⛏',
                    enabled: true 
                },
                { 
                    name: `Build (${KEYBOARD_SHORTCUTS.BUILD[0].toUpperCase()})`, 
                    action: 'build', 
                    icon: '🏗',
                    enabled: true 
                }
            );
        }
        
        commands.forEach(cmd => {
            const button = this.createCommandButton(cmd, unit);
            this.elements.unitCommands.appendChild(button);
        });
    }

    updateGroupCommands(units) {
        this.elements.unitCommands.innerHTML = '';
        
        const commands = [
            { 
                name: 'Move All', 
                action: 'move', 
                icon: '➤',
                enabled: true 
            },
            { 
                name: 'Attack Move', 
                action: 'attack', 
                icon: '⚔',
                enabled: units.some(u => u.canAttack()) 
            },
            { 
                name: 'Stop All', 
                action: 'stop', 
                icon: '■',
                enabled: units.some(u => u.state !== 'idle') 
            }
        ];
        
        // Add gather command if any workers are selected
        if (units.some(u => u.isWorker())) {
            commands.push(
                { 
                    name: 'Gather All', 
                    action: 'gather', 
                    icon: '⛏',
                    enabled: true 
                }
            );
        }
        
        commands.forEach(cmd => {
            const button = this.createCommandButton(cmd);
            this.elements.unitCommands.appendChild(button);
        });
    }

    createCommandButton(cmd, unit = null) {
        const button = document.createElement('div');
        button.className = 'commandButton';
        button.innerHTML = `<span style="margin-right: 5px;">${cmd.icon}</span>${cmd.name}`;
        
        if (!cmd.enabled) {
            button.style.opacity = '0.5';
            button.style.cursor = 'not-allowed';
        } else {
            button.onclick = (e) => {
                e.stopPropagation();
                this.handleCommand(cmd.action, unit);
            };
        }
        
        return button;
    }

handleCommand(command, unit = null) {
    console.log(`UI Command: ${command}, Unit: ${unit ? unit.id : 'none'}`);
    
    const selectedObjects = this.game.getSelectedObjects();
    const units = selectedObjects.units;
    
    switch(command) {
        case 'move':
            // Move command is handled by right click
            this.game.uiSystem.showMessage('Right click to move selected units', 'info');
            break;
            
        case 'stop':
            if (units.length > 0) {
                units.forEach(u => u.stop());
                this.game.uiSystem.showMessage('Units stopped', 'info');
            }
            break;
            
        case 'attack':
            if (units.length > 0) {
                units.forEach(u => {
                    if (u.canAttack()) {
                        u.setAttackMove(true);
                    }
                });
                this.game.uiSystem.showMessage('Attack move enabled', 'info');
            }
            break;
            
        case 'patrol':
            if (units.length > 0) {
                const firstUnit = units[0];
                firstUnit.setPatrol(
                    firstUnit.position,
                    { 
                        x: this.game.inputSystem.mouse.worldX, 
                        y: this.game.inputSystem.mouse.worldY 
                    }
                );
                this.game.uiSystem.showMessage('Patrol set', 'info');
            }
            break;
            
        case 'gather':
            const workers = units.filter(u => u.isWorker());
            if (workers.length > 0) {
                // Find nearest resource
                let nearestResource = null;
                let nearestDist = Infinity;
                
                for (const resource of this.game.resources.values()) {
                    const dist = this.game.distance(workers[0].position, resource.position);
                    if (dist < nearestDist) {
                        nearestDist = dist;
                        nearestResource = resource;
                    }
                }
                
                if (nearestResource) {
                    workers.forEach(worker => {
                        worker.gather(nearestResource);
                    });
                    this.game.uiSystem.showMessage('Gathering resources', 'info');
                }
            }
            break;
            
        case 'build':
            if (units.length === 1 && units[0].isWorker()) {
                this.showBuildOptions(units[0].race);
            }
            break;
    }
    
    console.log(`Command executed: ${command}`);
}

    showBuildOptions(race) {
        this.showingBuildMenu = true;
        this.elements.buildPanel.innerHTML = '';
        
        const raceBuildings = BUILDINGS[race.name.toUpperCase()] || [];
        
        if (raceBuildings.length === 0) {
            this.elements.buildPanel.innerHTML = '<div style="color: #888; text-align: center;">No buildings available</div>';
            return;
        }
        
        raceBuildings.forEach(building => {
            const button = this.createBuildButton(building);
            this.elements.buildPanel.appendChild(button);
        });
    }

    createBuildButton(building) {
        const button = document.createElement('div');
        button.className = 'buildButton';
        
        // Create cost string
        const costHtml = Object.entries(building.cost)
            .map(([resource, amount]) => {
                let icon = '';
                switch(resource) {
                    case 'metal': icon = '⚙️'; break;
                    case 'crystal': icon = '💎'; break;
                    case 'gas': icon = '🧪'; break;
                    case 'energy': icon = '⚡'; break;
                    default: icon = '📦';
                }
                const canAfford = this.canAfford(building.cost);
                return `<div style="color: ${canAfford ? '#fff' : '#f00'}">${icon} ${amount}</div>`;
            })
            .join('');
        
        button.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 3px;">${building.name}</div>
            <div style="font-size: 9px;">${costHtml}</div>
        `;
        
        // Add drag-and-drop functionality
        button.draggable = true;
        button.addEventListener('dragstart', (e) => {
            if (!this.canAfford(building.cost)) {
                e.preventDefault();
                this.showMessage('Not enough resources!', 'error');
                return;
            }
            
            // Get selected worker
            const selectedUnits = this.game.getSelectedObjects().units;
            const worker = selectedUnits.find(u => u.isWorker());
            
            if (!worker) {
                e.preventDefault();
                this.showMessage('Select a worker to build', 'warning');
                return;
            }
            
            // Start building drag
            this.game.inputSystem.startBuildingDrag(building, e.clientX, e.clientY);
            
            // Set drag image (optional)
            const dragImage = document.createElement('div');
            dragImage.textContent = building.name;
            dragImage.style.cssText = `
                padding: 5px 10px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                border-radius: 3px;
            `;
            document.body.appendChild(dragImage);
            e.dataTransfer.setDragImage(dragImage, 10, 10);
            setTimeout(() => document.body.removeChild(dragImage), 0);
            
            e.dataTransfer.setData('text/plain', building.name);
        });
        
        // Also keep click functionality
        button.onclick = (e) => {
            e.stopPropagation();
            
            if (!this.canAfford(building.cost)) {
                this.showMessage('Not enough resources!', 'error');
                return;
            }
            
            // Get selected worker
            const selectedUnits = this.game.getSelectedObjects().units;
            if (selectedUnits.length !== 1 || !selectedUnits[0].isWorker()) {
                this.showMessage('Select a single worker to build', 'warning');
                return;
            }
            
            const worker = selectedUnits[0];
            
            // Start building drag
            this.game.inputSystem.startBuildingDrag(building, e.clientX, e.clientY);
            
            this.showMessage(`Drag to place ${building.name}`, 'info');
        };
        
        // Add tooltip
        button.title = `Drag to place ${building.name}\nBuild Time: ${building.buildTime}s\nSize: ${building.size.width}x${building.size.height}`;
        
        return button;
    }
	
	
    canAfford(cost) {
        if (!this.game.localPlayer) return false;
        return this.game.canAfford(this.game.localPlayer.id, cost);
    }

    handleBuildClick(building) {
        if (!this.canAfford(building.cost)) {
            this.showMessage('Not enough resources!', 'error');
            return;
        }
        
        // Get selected worker
        const selectedUnits = this.game.getSelectedUnits();
        if (selectedUnits.length !== 1 || !selectedUnits[0].isWorker()) {
            this.showMessage('Select a single worker to build', 'warning');
            return;
        }
        
        const worker = selectedUnits[0];
        
        // Start building
        worker.startBuilding(building, this.game.inputSystem.mouse.worldX, this.game.inputSystem.mouse.worldY);
        
        // Spend resources
        this.game.spendResources(this.game.localPlayer.id, building.cost);
        
        // Hide build menu
        this.showingBuildMenu = false;
        this.elements.buildPanel.innerHTML = '';
        
        this.showMessage(`Started building ${building.name}`, 'success');
    }

    showMessage(text, type = 'info') {
        // Create message element
        const message = document.createElement('div');
        message.textContent = text;
        message.style.cssText = `
            position: fixed;
            top: 100px;
            left: 50%;
            transform: translateX(-50%);
            padding: 10px 20px;
            background: ${type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#4caf50'};
            color: white;
            border-radius: 5px;
            z-index: 10000;
            font-weight: bold;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(message);
        
        // Remove after 3 seconds
        setTimeout(() => {
            message.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (message.parentNode) {
                    message.parentNode.removeChild(message);
                }
            }, 300);
        }, 3000);
        
        // Add CSS animation if not already present
        if (!document.querySelector('style#message-animations')) {
            const style = document.createElement('style');
            style.id = 'message-animations';
            style.textContent = `
                @keyframes slideIn {
                    from { top: 50px; opacity: 0; }
                    to { top: 100px; opacity: 1; }
                }
                @keyframes slideOut {
                    from { top: 100px; opacity: 1; }
                    to { top: 50px; opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    updateDebugInfo() {
        if (!DEBUG_SETTINGS.SHOW_DEBUG_INFO) {
            this.game.draggableUISystem.hidePanel('debugInfo');
            return;
        }
        
        this.game.draggableUISystem.showPanel('debugInfo');
        
        const mouse = this.game.inputSystem.mouse;
        const camera = this.game.camera;
        const renderStats = this.game.renderSystem.getPerformanceStats();
        
        this.elements.debugContent.innerHTML = `
            <strong>DEBUG INFO</strong><br>
            Mouse: ${Math.floor(mouse.worldX)}, ${Math.floor(mouse.worldY)}<br>
            Camera: ${Math.floor(camera.x)}, ${Math.floor(camera.y)}<br>
            Zoom: ${camera.zoom.toFixed(2)}<br>
            FPS: ${Math.floor(this.game.fps)}<br>
            Units: ${this.game.units.size}<br>
            Buildings: ${this.game.buildings.size}<br>
            Selected: ${this.game.selectedUnits.size}<br>
            Render: ${renderStats.lastRenderTime.toFixed(2)}ms
        `;
    }

    getHealthColor(percent) {
        if (percent > 70) return '#00ff00';
        if (percent > 40) return '#ffff00';
        return '#ff0000';
    }

    getStateDescription(state) {
        const states = {
            'idle': 'Idle',
            'moving': 'Moving',
            'attacking': 'Attacking',
            'gathering': 'Gathering',
            'building': 'Building',
            'patrolling': 'Patrolling'
        };
        return states[state] || state;
    }

    // Utility methods
    toggleDebugMode() {
        this.debugMode = !this.debugMode;
        this.elements.debugInfo.style.display = this.debugMode ? 'block' : 'none';
        console.log(`UI debug mode: ${this.debugMode ? 'ON' : 'OFF'}`);
    }

    showUnitDetails(unitId) {
        // Show detailed unit information panel
        // This could be expanded to show stats, upgrades, etc.
    }

    showBuildingDetails(buildingId) {
        // Show detailed building information panel
        // This could show production queue, upgrades, etc.
    }

    createContextMenu(x, y, options) {
        // Create context menu at position
        // This could be used for advanced commands
    }

    // Network status display
    updateNetworkStatus(connected, latency = 0) {
        // Update network status indicator
        const networkIndicator = document.getElementById('network-status') || this.createNetworkIndicator();
        
        networkIndicator.innerHTML = `
            ${connected ? '🟢' : '🔴'} 
            ${connected ? `Connected (${latency}ms)` : 'Disconnected'}
        `;
        networkIndicator.style.color = connected ? '#00ff00' : '#ff0000';
    }

    createNetworkIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'network-status';
        indicator.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.8);
            padding: 5px 10px;
            border-radius: 3px;
            font-size: 12px;
            z-index: 1000;
        `;
        document.getElementById('uiOverlay').appendChild(indicator);
        return indicator;
    }

    // Game state display
    showGameOver(winner) {
        // Show game over screen
        const gameOverScreen = document.createElement('div');
        gameOverScreen.id = 'game-over-screen';
        gameOverScreen.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            color: white;
            font-family: Arial, sans-serif;
        `;
        
        gameOverScreen.innerHTML = `
            <h1 style="font-size: 48px; margin-bottom: 20px;">${winner ? 'VICTORY!' : 'DEFEAT'}</h1>
            <div style="font-size: 24px; margin-bottom: 30px;">${winner || 'Game Over'}</div>
            <div style="margin-bottom: 20px;">
                <button id="restart-btn" style="padding: 15px 30px; font-size: 18px; margin: 10px;">Restart</button>
                <button id="menu-btn" style="padding: 15px 30px; font-size: 18px; margin: 10px;">Main Menu</button>
            </div>
        `;
        
        document.body.appendChild(gameOverScreen);
        
        // Add event listeners
        document.getElementById('restart-btn').onclick = () => {
            location.reload();
        };
        
        document.getElementById('menu-btn').onclick = () => {
            // Navigate to main menu
            console.log('Returning to main menu');
        };
    }
	
	
	
    createHelpPanel() {
        const uiSystem = this.game.draggableUISystem;
        
        // Check if this is first launch
        const firstLaunch = !localStorage.getItem('galacticConquest_help_shown');
        
        const helpContent = `
            <div style="display: flex; flex-direction: column; gap: 15px;">
                <div>
                    <strong style="color: #00ffff;">Function Keys:</strong>
                    <div style="margin-top: 5px; font-size: 12px;">
                        <div><span style="color: #ffff00;">F1</span>: Toggle Resources Panel</div>
                        <div><span style="color: #ffff00;">F2</span>: Toggle Selection Panel</div>
                        <div><span style="color: #ffff00;">F3</span>: Toggle Game Info</div>
                        <div><span style="color: #ffff00;">F4</span>: Toggle Minimap</div>
                        <div><span style="color: #ffff00;">F5</span>: Toggle Debug Info</div>
                        <div><span style="color: #ffff00;">F6</span>: Toggle This Help</div>
                        <div><span style="color: #ffff00;">F12</span>: Reset All UI Positions</div>
                    </div>
                </div>
                
                ${firstLaunch ? `
                <div style="background: rgba(0, 255, 0, 0.1); padding: 10px; border-radius: 5px; border: 1px solid #00ff00;">
                    <strong>👋 Welcome New Player!</strong>
                    <div style="margin-top: 5px; font-size: 11px;">
                        Tip: You can drag all panels to rearrange the UI.<br>
                        Press F6 anytime to show this help panel.
                    </div>
                </div>
                ` : ''}
                
                <div>
                    <strong style="color: #00ffff;">Game Controls:</strong>
                    <div style="margin-top: 5px; font-size: 12px;">
                        <div><span style="color: #ffff00;">Left Click/Drag</span>: Select Units/Buildings</div>
                        <div><span style="color: #ffff00;">Right Click</span>: Move/Attack/Gather</div>
                        <div><span style="color: #ffff00;">Double Click</span>: Select All of Same Type</div>
                        <div><span style="color: #ffff00;">Ctrl + Double Click</span>: Reset Panel Position</div>
                    </div>
                </div>
                
                <div>
                    <strong style="color: #00ffff;">Unit Commands:</strong>
                    <div style="margin-top: 5px; font-size: 12px;">
                        <div><span style="color: #ffff00;">M</span>: Move</div>
                        <div><span style="color: #ffff00;">A</span>: Attack Move</div>
                        <div><span style="color: #ffff00;">S</span>: Stop</div>
                        <div><span style="color: #ffff00;">P</span>: Patrol</div>
                        <div><span style="color: #ffff00;">G</span>: Gather</div>
                        <div><span style="color: #ffff00;">B</span>: Build Menu (Workers)</div>
                        <div><span style="color: #ffff00;">Space</span>: Center Camera</div>
                        <div><span style="color: #ffff00;">Escape</span>: Clear Selection</div>
                        <div><span style="color: #ffff00;"></span>: Toggle Debug Info</div>
                    </div>
                </div>
                
                <div>
                    <strong style="color: #00ffff;">Camera Controls:</strong>
                    <div style="margin-top: 5px; font-size: 12px;">
                        <div><span style="color: #ffff00;">WASD / Arrow Keys</span>: Move Camera</div>
                        <div><span style="color: #ffff00;">Mouse Wheel</span>: Zoom In/Out</div>
                        <div><span style="color: #ffff00;">Middle Click + Drag</span>: Pan Camera</div>
                        <div><span style="color: #ffff00;">R</span>: Reset Camera</div>
                    </div>
                </div>
                
                <div>
                    <strong style="color: #00ffff;">Developer Shortcuts (Ctrl+Shift+):</strong>
                    <div style="margin-top: 5px; font-size: 12px;">
                        <div><span style="color: #ffff00;">D</span>: Toggle Debug Mode</div>
                        <div><span style="color: #ffff00;">R</span>: Reset Game</div>
                        <div><span style="color: #ffff00;">E</span>: Add Test Enemy</div>
                        <div><span style="color: #ffff00;">I</span>: Show Game Info</div>
                    </div>
                </div>
                
                <div style="font-size: 10px; color: #666; text-align: center; margin-top: 10px;">
                    Press F6 to hide/show | Drag to move | × to close
                </div>
            </div>
        `;
        
        const helpPanel = uiSystem.createPanel(
            'helpPanel',
            '🎮 Game Controls & Shortcuts',
            helpContent,
            { x: window.innerWidth - 350, y: 50, width: 320, height: 'auto' }
        );
        
        // Add close button handler
        const closeBtn = helpPanel.querySelector('.panel-close');
        if (closeBtn) {
            closeBtn.onclick = () => {
                uiSystem.hidePanel('helpPanel');
                // Mark as shown
                localStorage.setItem('galacticConquest_help_shown', 'true');
            };
        }
        
        // Add toggle button to game info panel
        this.addHelpButton();
        
        // Mark as shown if first launch
        if (firstLaunch) {
            localStorage.setItem('galacticConquest_help_shown', 'true');
        }
        
        return helpPanel;
    }
	
	
	
    addHelpButton() {
        const gameInfoPanel = this.game.draggableUISystem.getPanel('gameInfo');
        if (!gameInfoPanel) return;
        
        const panelContent = gameInfoPanel.querySelector('.panel-content');
        if (!panelContent) return;
        
        // Add help button
        const helpButton = document.createElement('button');
        helpButton.innerHTML = '❓ Help';
        helpButton.style.cssText = `
            margin-top: 5px;
            padding: 3px 8px;
            font-size: 11px;
            background: rgba(0, 100, 200, 0.7);
            border: 1px solid #00aaff;
            border-radius: 3px;
            color: white;
            cursor: pointer;
        `;
        
        helpButton.onclick = (e) => {
            e.stopPropagation();
            this.toggleHelpPanel();
        };
        
        panelContent.appendChild(helpButton);
    }

    toggleHelpPanel() {
        const uiSystem = this.game.draggableUISystem;
        const helpPanel = uiSystem.getPanel('helpPanel');
        
        if (!helpPanel) {
            this.createHelpPanel();
        } else {
            if (helpPanel.style.display === 'none') {
                uiSystem.showPanel('helpPanel');
            } else {
                uiSystem.hidePanel('helpPanel');
            }
        }
    }
	
	addButtonTooltips() {
        // Add tooltips to command buttons
        const commandTooltips = {
            'Move (M)': 'M key - Move selected units',
            'Stop (S)': 'S key - Stop selected units',
            'Attack (A)': 'A key - Attack move',
            'Patrol (P)': 'P key - Set patrol route',
            'Gather (G)': 'G key - Gather resources',
            'Build (B)': 'B key - Open build menu',
            'Set Rally Point': 'Right click after selecting building',
            'Repair/Heal': 'Auto-repair when enabled',
            'Train Infantry': 'Produce infantry unit',
            'Train Vehicle': 'Produce vehicle unit'
        };
        
        // Add tooltips to panel close buttons
        document.querySelectorAll('.panel-close').forEach(btn => {
            btn.title = 'Close panel (click)';
        });
        
        // Add tooltips to drag handles
        document.querySelectorAll('.drag-handle').forEach(handle => {
            handle.title = 'Drag to move panel';
        });
        
        // Add tooltips to resize handles
        document.querySelectorAll('.resize-handle').forEach(handle => {
            handle.title = 'Drag to resize panel';
        });
    }
	
    createKeyReference() {
        const keyRef = document.createElement('div');
        keyRef.id = 'key-reference';
        keyRef.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 220px;
            background: rgba(0, 0, 0, 0.7);
            padding: 5px 10px;
            border-radius: 3px;
            font-size: 10px;
            color: #aaa;
            z-index: 999;
            cursor: help;
            border: 1px solid #444;
        `;
        keyRef.innerHTML = 'F1-F6: Panels | F12: Reset UI';
        keyRef.title = 'Click for full controls help';
        
        keyRef.onclick = () => {
            this.toggleHelpPanel();
        };
        
        document.getElementById('uiOverlay').appendChild(keyRef);
        return keyRef;
    }

    showBuildingProductionQueue(building) {
        if (!building.isProducing()) return '';
        
        let queueHTML = '<div style="margin-top: 10px; border-top: 1px solid #444; padding-top: 5px;">';
        queueHTML += '<div style="font-size: 11px; color: #aaa; margin-bottom: 5px;">Production Queue:</div>';
        
        building.productionQueue.forEach((unit, index) => {
            const progress = index === 0 ? building.getProductionProgress() * 100 : 0;
            const isCurrent = index === 0;
            
            queueHTML += `
                <div style="display: flex; align-items: center; gap: 5px; margin: 2px 0; padding: 3px; background: rgba(255,255,255,0.05); border-radius: 3px;">
                    <div style="width: 16px; height: 16px; background: #333; border-radius: 3px; display: flex; align-items: center; justify-content: center;">
                        ${isCurrent ? '▶' : index + 1}
                    </div>
                    <div style="flex: 1; font-size: 11px;">
                        <div>${unit.name}</div>
                        ${isCurrent ? `
                            <div style="height: 3px; background: #333; border-radius: 2px; margin-top: 2px; overflow: hidden;">
                                <div style="height: 100%; width: ${progress}%; background: #00ffff; transition: width 0.3s;"></div>
                            </div>
                        ` : ''}
                    </div>
                    ${index > 0 ? `
                    <button onclick="event.stopPropagation(); game.getSelectedObjects().buildings[0].cancelProduction(${index});" 
                            style="padding: 1px 5px; font-size: 10px; background: rgba(255,0,0,0.3); border: none; color: white; border-radius: 2px; cursor: pointer;">
                        ✕
                    </button>
                    ` : ''}
                </div>
            `;
        });
        
        queueHTML += '</div>';
        return queueHTML;
    }
	
	
	
	
	
	
	
	
}

export { UISystem };