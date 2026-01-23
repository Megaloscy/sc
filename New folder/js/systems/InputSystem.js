
import { KEYBOARD_SHORTCUTS, COMMAND_TYPES } from '../core/GameConstants.js';

// Input System - Version 1.0.0
class InputSystem {
    constructor(gameEngine) {
        this.game = gameEngine;
        
        // Mouse state
        this.mouse = {
            x: 0,
            y: 0,
            worldX: 0,
            worldY: 0,
            left: false,
            right: false,
            middle: false,
            wheel: 0
        };
        
        // Keyboard state
        this.keys = new Set();
        
        // Selection state
        this.selectionStart = null;
        this.isSelecting = false;
        this.selectionBox = null;
        
        // Building placement
        this.placingBuilding = null;
        this.buildingGhost = null;
        this.buildingValid = false;
        
        // Camera drag
        this.isDraggingCamera = false;
        this.lastCameraDrag = { x: 0, y: 0 };
        
        // Double click detection
        this.lastClickTime = 0;
        this.doubleClickThreshold = 300;
        
        console.log('InputSystem initialized');
    }

    init() {
        this.setupEventListeners();
        console.log('InputSystem ready');
    }

    setupEventListeners() {
        const canvas = this.game.renderSystem.canvas;
        
        // Mouse events
        canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        canvas.addEventListener('wheel', (e) => this.handleMouseWheel(e));
        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });
        
        // Keyboard events
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Window events
        window.addEventListener('blur', () => this.handleWindowBlur());
        
        console.log('Input event listeners set up');
    }

    handleMouseDown(e) {
        const rect = this.game.renderSystem.canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;
        
        // Update world position
        const worldPos = this.game.screenToWorld(this.mouse.x, this.mouse.y);
        this.mouse.worldX = worldPos.x;
        this.mouse.worldY = worldPos.y;
        
        switch(e.button) {
            case 0: // Left button
                this.mouse.left = true;
                
                // Check if placing a building
                if (this.placingBuilding) {
                    this.placeBuilding();
                    return;
                }
                
                // Start selection
                this.startSelection(this.mouse.x, this.mouse.y);
                break;
                
            case 1: // Middle button
                this.mouse.middle = true;
                this.startCameraDrag(this.mouse.x, this.mouse.y);
                break;
                
            case 2: // Right button
                e.preventDefault();
                this.mouse.right = true;
                
                // Handle right-click command
                if (this.placingBuilding) {
                    this.cancelBuildingPlacement();
                } else {
                    this.handleRightClick();
                }
                break;
        }
        
        // Check for double click
        const currentTime = Date.now();
        if (currentTime - this.lastClickTime < this.doubleClickThreshold) {
            this.handleDoubleClick();
        }
        this.lastClickTime = currentTime;
    }

    handleMouseUp(e) {
        const rect = this.game.renderSystem.canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;
        
        // Update world position
        const worldPos = this.game.screenToWorld(this.mouse.x, this.mouse.y);
        this.mouse.worldX = worldPos.x;
        this.mouse.worldY = worldPos.y;
        
        switch(e.button) {
            case 0: // Left button
                this.mouse.left = false;
                this.endSelection();
                break;
                
            case 1: // Middle button
                this.mouse.middle = false;
                this.endCameraDrag();
                break;
                
            case 2: // Right button
                this.mouse.right = false;
                break;
        }
    }

    handleMouseMove(e) {
        const rect = this.game.renderSystem.canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;
        
        // Update world position
        const worldPos = this.game.screenToWorld(this.mouse.x, this.mouse.y);
        this.mouse.worldX = worldPos.x;
        this.mouse.worldY = worldPos.y;
        
        // Update selection box
        if (this.isSelecting && this.selectionStart) {
            this.updateSelectionBox(this.mouse.x, this.mouse.y);
        }
        
        // Update camera drag
        if (this.isDraggingCamera) {
            this.updateCameraDrag(this.mouse.x, this.mouse.y);
        }
        
        // Update building ghost
        if (this.placingBuilding) {
            this.updateBuildingGhost();
        }
    }

    handleMouseWheel(e) {
        e.preventDefault();
        this.mouse.wheel = e.deltaY;
        this.handleZoom(e.deltaY, e.clientX, e.clientY);
    }

    handleKeyDown(e) {
        this.keys.add(e.key);
        
        // Handle keyboard shortcuts
        this.handleShortcuts(e);
        
        // Camera movement
        this.handleCameraMovement();
    }

    handleKeyUp(e) {
        this.keys.delete(e.key);
    }

    handleWindowBlur() {
        // Clear all inputs when window loses focus
        this.keys.clear();
        this.mouse.left = false;
        this.mouse.right = false;
        this.mouse.middle = false;
        
        if (this.placingBuilding) {
            this.cancelBuildingPlacement();
        }
    }

    // Selection methods
    startSelection(x, y) {
        this.selectionStart = { x, y };
        this.isSelecting = true;
        this.selectionBox = {
            x: x,
            y: y,
            width: 0,
            height: 0
        };
        this.game.selectionRect = this.selectionBox;
    }

    updateSelectionBox(x, y) {
        if (!this.selectionStart) return;
        
        this.selectionBox.width = x - this.selectionStart.x;
        this.selectionBox.height = y - this.selectionStart.y;
    }

    endSelection() {
        if (!this.isSelecting || !this.selectionStart) return;
        
        // Calculate selection area
        const worldStart = this.game.screenToWorld(
            this.selectionStart.x,
            this.selectionStart.y
        );
        const worldEnd = this.game.screenToWorld(
            this.mouse.x,
            this.mouse.y
        );
        
        // Ensure positive width and height
        const selectionRect = {
            x: Math.min(worldStart.x, worldEnd.x),
            y: Math.min(worldStart.y, worldEnd.y),
            width: Math.abs(worldEnd.x - worldStart.x),
            height: Math.abs(worldEnd.y - worldStart.y)
        };
        
        // Select units in the area
        this.selectUnitsInArea(selectionRect);
        
        // Clean up
        this.isSelecting = false;
        this.selectionStart = null;
        this.game.selectionRect = null;
    }

    selectUnitsInArea(rect) {
        const selectedUnitIds = [];
        const selectedBuildingIds = [];
        
        // Check units
        for (const [id, unit] of this.game.units) {
            if (unit.playerId === this.game.localPlayer.id) {
                if (this.isUnitInRect(unit, rect)) {
                    selectedUnitIds.push(id);
                }
            }
        }
        
        // Check buildings
        for (const [id, building] of this.game.buildings) {
            if (building.playerId === this.game.localPlayer.id) {
                if (this.isBuildingInRect(building, rect)) {
                    selectedBuildingIds.push(id);
                }
            }
        }
        
        // Update selection
        this.game.selectObjects(selectedUnitIds, selectedBuildingIds);
        
        console.log(`Selected ${selectedUnitIds.length} units and ${selectedBuildingIds.length} buildings`);
    }

    isUnitInRect(unit, rect) {
        return (
            unit.position.x >= rect.x &&
            unit.position.x <= rect.x + rect.width &&
            unit.position.y >= rect.y &&
            unit.position.y <= rect.y + rect.height
        );
    }

    isBuildingInRect(building, rect) {
        const bbox = building.getBoundingBox();
        return (
            bbox.x < rect.x + rect.width &&
            bbox.x + bbox.width > rect.x &&
            bbox.y < rect.y + rect.height &&
            bbox.y + bbox.height > rect.y
        );
    }

    // Right click commands
    handleRightClick() {
        const selectedObjects = this.game.getSelectedObjects();
        
        if (selectedObjects.units.length === 0 && selectedObjects.buildings.length === 0) {
            return;
        }
        
        console.log(`Right click command for ${selectedObjects.units.length} units and ${selectedObjects.buildings.length} buildings`);
        
        // Get target
        const target = this.getRightClickTarget();
        
        if (target) {
            // Attack if target is enemy
            if (target.playerId && target.playerId !== this.game.localPlayer.id) {
                console.log(`Issuing attack command on enemy ${target.id}`);
                this.issueAttackCommand(target);
            } else if (target.type === 'mineral' || target.type === 'gas') {
                // Gather resources
                console.log(`Issuing gather command on resource ${target.id}`);
                this.issueGatherCommand(target);
            } else {
                // Move to position
                console.log(`Issuing move command to target`);
                this.issueMoveCommand(target.position || target);
            }
        } else {
            // Move to empty ground
            console.log(`Issuing move command to ground`);
            this.issueMoveCommand({ x: this.mouse.worldX, y: this.mouse.worldY });
        }
    }

    getRightClickTarget() {
        // Check for units
        for (const [id, unit] of this.game.units) {
            const distance = this.game.distance(
                { x: this.mouse.worldX, y: this.mouse.worldY },
                unit.position
            );
            if (distance < unit.radius * 2) {
                return unit;
            }
        }
        
        // Check for buildings
        for (const [id, building] of this.game.buildings) {
            const bbox = building.getBoundingBox();
            if (
                this.mouse.worldX >= bbox.x &&
                this.mouse.worldX <= bbox.x + bbox.width &&
                this.mouse.worldY >= bbox.y &&
                this.mouse.worldY <= bbox.y + bbox.height
            ) {
                return building;
            }
        }
        
        // Check for resources
        for (const [id, resource] of this.game.resources) {
            const distance = this.game.distance(
                { x: this.mouse.worldX, y: this.mouse.worldY },
                resource.position
            );
            if (distance < resource.radius * 2) {
                return resource;
            }
        }
        
        return null;
    }

    issueMoveCommand(position) {
        const selectedObjects = this.game.getSelectedObjects();
        
        console.log(`Moving ${selectedObjects.units.length} units to ${position.x}, ${position.y}`);
        
        // Move units
        selectedObjects.units.forEach(unit => {
            unit.moveTo(position);
        });
        
        // Set rally point for buildings
        if (selectedObjects.buildings.length === 1) {
            const building = selectedObjects.buildings[0];
            if (!building.isConstructing) {
                building.setRallyPoint(position.x, position.y);
            }
        }
    }

    issueAttackCommand(target) {
        const selectedObjects = this.game.getSelectedObjects();
        
        console.log(`Attacking with ${selectedObjects.units.length} units`);
        
        selectedObjects.units.forEach(unit => {
            if (unit.canAttack()) {
                unit.attack(target);
            }
        });
    }

    issueGatherCommand(resource) {
        const selectedObjects = this.game.getSelectedObjects();
        
        console.log(`Gathering with ${selectedObjects.units.length} workers`);
        
        selectedObjects.units.forEach(unit => {
            if (unit.isWorker()) {
                unit.gather(resource);
            }
        });
    }

    // Double click handling
    handleDoubleClick() {
        // Get unit under cursor
        const target = this.getRightClickTarget();
        
        if (target && target.playerId === this.game.localPlayer.id) {
            // Select all units of the same type
            this.selectAllOfType(target);
        }
    }

    selectAllOfType(target) {
        if (target.constructor.name === 'Unit') {
            const sameTypeUnits = [];
            for (const [id, unit] of this.game.units) {
                if (unit.playerId === this.game.localPlayer.id && 
                    unit.name === target.name) {
                    sameTypeUnits.push(id);
                }
            }
            this.game.selectObjects(sameTypeUnits, []);
            console.log(`Selected all ${sameTypeUnits.length} units of type ${target.name}`);
        }
    }

    // Camera controls
    startCameraDrag(x, y) {
        this.isDraggingCamera = true;
        this.lastCameraDrag = { x, y };
    }

    updateCameraDrag(x, y) {
        if (!this.isDraggingCamera) return;
        
        const deltaX = (x - this.lastCameraDrag.x) / this.game.camera.zoom;
        const deltaY = (y - this.lastCameraDrag.y) / this.game.camera.zoom;
        
        this.game.camera.x -= deltaX;
        this.game.camera.y -= deltaY;
        this.game.clampCamera();
        
        this.lastCameraDrag = { x, y };
    }

    endCameraDrag() {
        this.isDraggingCamera = false;
    }

    handleZoom(deltaY, clientX, clientY) {
        const zoomSpeed = 0.001;
        const oldZoom = this.game.camera.zoom;
        
        // Calculate zoom change
        const zoomChange = -deltaY * zoomSpeed * oldZoom;
        const newZoom = Math.max(
            this.game.camera.minZoom,
            Math.min(this.game.camera.maxZoom, oldZoom + zoomChange)
        );
        
        // Calculate mouse position in world coordinates
        const rect = this.game.renderSystem.canvas.getBoundingClientRect();
        const mouseX = clientX - rect.left;
        const mouseY = clientY - rect.top;
        
        const worldMouseX = this.game.camera.x + mouseX / oldZoom;
        const worldMouseY = this.game.camera.y + mouseY / oldZoom;
        
        // Update camera zoom
        this.game.camera.targetZoom = newZoom;
        
        // Adjust camera position to zoom toward mouse
        this.game.camera.x = worldMouseX - mouseX / newZoom;
        this.game.camera.y = worldMouseY - mouseY / newZoom;
        
        this.game.clampCamera();
    }

    handleCameraMovement() {
        const cameraSpeed = 500 * this.game.deltaTime;
        
        if (this.keys.has('w') || this.keys.has('ArrowUp')) {
            this.game.camera.y -= cameraSpeed;
        }
        if (this.keys.has('s') || this.keys.has('ArrowDown')) {
            this.game.camera.y += cameraSpeed;
        }
        if (this.keys.has('a') || this.keys.has('ArrowLeft')) {
            this.game.camera.x -= cameraSpeed;
        }
        if (this.keys.has('d') || this.keys.has('ArrowRight')) {
            this.game.camera.x += cameraSpeed;
        }
        
        this.game.clampCamera();
    }

    // Building placement
    startBuildingDrag(buildingData, clientX, clientY) {
        this.placingBuilding = buildingData;
        this.buildingValid = false;
        
        // Create ghost building
        this.createBuildingGhost(buildingData);
        
        console.log(`Started placing building: ${buildingData.name}`);
    }

    createBuildingGhost(buildingData) {
        // Create a ghost element for visual feedback
        const ghost = document.createElement('div');
        ghost.id = 'building-ghost';
        ghost.style.cssText = `
            position: absolute;
            pointer-events: none;
            border: 2px dashed #00ff00;
            background: rgba(0, 255, 0, 0.1);
            z-index: 9999;
        `;
        
        document.body.appendChild(ghost);
        this.buildingGhost = ghost;
    }

    updateBuildingGhost() {
        if (!this.placingBuilding || !this.buildingGhost) return;
        
        const building = this.placingBuilding;
        const screenPos = this.game.worldToScreen({
            x: this.mouse.worldX,
            y: this.mouse.worldY
        });
        
        // Update ghost position and size
        const width = building.size.width * this.game.camera.zoom;
        const height = building.size.height * this.game.camera.zoom;
        
        this.buildingGhost.style.left = `${screenPos.x - width/2}px`;
        this.buildingGhost.style.top = `${screenPos.y - height/2}px`;
        this.buildingGhost.style.width = `${width}px`;
        this.buildingGhost.style.height = `${height}px`;
        
        // Check if position is valid
        this.buildingValid = this.game.collisionSystem.isPositionValid(
            { x: this.mouse.worldX, y: this.mouse.worldY },
            Math.max(building.size.width, building.size.height) / 2
        );
        
        // Update ghost appearance based on validity
        if (this.buildingValid) {
            this.buildingGhost.style.borderColor = '#00ff00';
            this.buildingGhost.style.background = 'rgba(0, 255, 0, 0.1)';
        } else {
            this.buildingGhost.style.borderColor = '#ff0000';
            this.buildingGhost.style.background = 'rgba(255, 0, 0, 0.1)';
        }
    }

    placeBuilding() {
        if (!this.placingBuilding || !this.buildingValid) return;
        
        // Get selected worker
        const selectedObjects = this.game.getSelectedObjects();
        const worker = selectedObjects.units.find(u => u.isWorker());
        
        if (!worker) {
            this.game.uiSystem.showMessage('No worker selected to build', 'error');
            this.cancelBuildingPlacement();
            return;
        }
        
        // Check if player can afford the building
        if (!this.game.canAfford(this.game.localPlayer.id, this.placingBuilding.cost)) {
            this.game.uiSystem.showMessage('Not enough resources', 'error');
            this.cancelBuildingPlacement();
            return;
        }
        
        // Start building
        worker.startBuilding(this.placingBuilding, {
            x: this.mouse.worldX,
            y: this.mouse.worldY
        });
        
        // Spend resources
        this.game.spendResources(this.game.localPlayer.id, this.placingBuilding.cost);
        
        console.log(`Placed building: ${this.placingBuilding.name}`);
        
        // Clean up
        this.cancelBuildingPlacement();
    }

    cancelBuildingPlacement() {
        if (this.buildingGhost && this.buildingGhost.parentNode) {
            this.buildingGhost.parentNode.removeChild(this.buildingGhost);
        }
        
        this.placingBuilding = null;
        this.buildingGhost = null;
        this.buildingValid = false;
    }

    // Keyboard shortcuts
    handleShortcuts(e) {
        console.log(`Key pressed: ${e.key}`);
        
        // Check each shortcut
        for (const [action, shortcuts] of Object.entries(KEYBOARD_SHORTCUTS)) {
            if (shortcuts.includes(e.key)) {
                e.preventDefault();
                this.handleShortcut(action, e);
                break;
            }
        }
    }

    handleShortcut(action, e) {
        const selectedObjects = this.game.getSelectedObjects();
        
        console.log(`Handling shortcut: ${action}`);
        
        switch(action) {
            case 'MOVE':
                // M key - Prepare for move (right click will execute)
                this.game.uiSystem.showMessage('Right click where to move', 'info');
                break;
                
            case 'STOP':
                // S key - Stop selected units
                console.log(`Stopping ${selectedObjects.units.length} units`);
                selectedObjects.units.forEach(unit => unit.stop());
                break;
                
            case 'ATTACK':
                // A key - Set attack move
                console.log(`Setting attack move for ${selectedObjects.units.length} units`);
                selectedObjects.units.forEach(unit => {
                    if (unit.canAttack()) {
                        unit.setAttackMove(true);
                    }
                });
                this.game.uiSystem.showMessage('Attack move enabled', 'info');
                break;
                
            case 'PATROL':
                // P key - Set patrol
                if (selectedObjects.units.length > 0) {
                    const firstUnit = selectedObjects.units[0];
                    console.log(`Setting patrol for unit ${firstUnit.id}`);
                    firstUnit.setPatrol(
                        firstUnit.position,
                        { x: this.mouse.worldX, y: this.mouse.worldY }
                    );
                    this.game.uiSystem.showMessage('Patrol set', 'info');
                }
                break;
                
            case 'GATHER':
                // G key - Gather with workers
                console.log(`Gather command for ${selectedObjects.units.length} units`);
                const workers = selectedObjects.units.filter(u => u.isWorker());
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
                
            case 'BUILD':
                // B key - Show build menu for workers
                if (selectedObjects.units.length === 1 && selectedObjects.units[0].isWorker()) {
                    this.game.uiSystem.showBuildOptions(selectedObjects.units[0].race);
                    this.game.uiSystem.showMessage('Build menu opened', 'info');
                }
                break;
                
            case 'SELECT_ALL':
                // Ctrl+A - Select all units
                if (e.ctrlKey) {
                    const allUnitIds = Array.from(this.game.localPlayer.units);
                    this.game.selectObjects(allUnitIds, []);
                    console.log(`Selected all ${allUnitIds.length} units`);
                }
                break;
                
            case 'DESELECT':
                // Escape - Clear selection
                this.game.clearSelection();
                console.log('Selection cleared');
                break;
                
            case 'CENTER_CAMERA':
                // Space - Center camera on selection or base
                e.preventDefault(); // Prevent space from scrolling
                if (selectedObjects.units.length > 0) {
                    const firstUnit = selectedObjects.units[0];
                    this.game.centerCameraOn(firstUnit.position.x, firstUnit.position.y);
                } else if (selectedObjects.buildings.length > 0) {
                    const firstBuilding = selectedObjects.buildings[0];
                    this.game.centerCameraOn(firstBuilding.position.x, firstBuilding.position.y);
                } else {
                    // Center on starting base
                    this.game.centerCameraOn(500, 500);
                }
                console.log('Camera centered');
                break;
                
            case 'TOGGLE_DEBUG':
                // ` key - Toggle debug info
                this.game.toggleDebugInfo();
                break;
        }
    }

    update(deltaTime) {
        // Update camera movement based on keys
        this.handleCameraMovement();
    }
}

export { InputSystem };