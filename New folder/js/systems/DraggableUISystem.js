
// Draggable UI System - Version 1.0.0
class DraggableUISystem {
    constructor(gameEngine) {
        this.game = gameEngine;
        
        // UI Panels
        this.panels = new Map();
        this.draggingPanel = null;
        this.resizingPanel = null;
        
        // Drag state
        this.dragOffset = { x: 0, y: 0 };
        this.resizeStart = { x: 0, y: 0, width: 0, height: 0 };
        
        // Panel management
        this.defaultPanelPositions = new Map();
        this.panelStates = new Map();
        
        // Auto-save positions
        this.saveInterval = 5000; // Save every 5 seconds
        this.lastSaveTime = 0;
        
        console.log('DraggableUISystem initialized');
    }

    init() {
        this.setupPanelDraggables();
        this.setupResizeHandles();
        this.loadPanelPositions();
        this.setupHotkeys();
        
        // Start auto-save interval
        setInterval(() => this.savePanelPositions(), this.saveInterval);
        
        console.log('DraggableUISystem ready');
    }

    setupPanelDraggables() {
        // Get all panels
        const panels = document.querySelectorAll('.ui-panel');
        
        panels.forEach(panel => {
            this.setupPanelDraggable(panel);
        });
        
        console.log(`Setup draggable for ${panels.length} panels`);
    }

    setupPanelDraggable(panel) {
        const header = panel.querySelector('.panel-header');
        const dragHandle = panel.querySelector('.drag-handle');
        
        if (!header && !dragHandle) {
            console.warn('Panel missing drag handle:', panel.id);
            return;
        }
        
        const dragElement = header || dragHandle;
        
        // Store panel data
        const panelId = panel.id || `panel_${Date.now()}`;
        panel.id = panelId;
        
        this.panels.set(panelId, panel);
        
        // Setup drag events
        dragElement.addEventListener('mousedown', (e) => this.startDrag(e, panel));
        dragElement.addEventListener('touchstart', (e) => this.startDrag(e, panel));
        
        // Add double-click to reset position
        dragElement.addEventListener('dblclick', (e) => {
            if (e.ctrlKey) {
                this.resetPanelPosition(panelId);
            }
        });
    }

    setupResizeHandles() {
        const resizeHandles = document.querySelectorAll('.resize-handle');
        
        resizeHandles.forEach(handle => {
            handle.addEventListener('mousedown', (e) => this.startResize(e, handle.parentElement));
            handle.addEventListener('touchstart', (e) => this.startResize(e, handle.parentElement));
        });
    }

    startDrag(e, panel) {
        e.preventDefault();
        
        const isTouch = e.type === 'touchstart';
        const clientX = isTouch ? e.touches[0].clientX : e.clientX;
        const clientY = isTouch ? e.touches[0].clientY : e.clientY;
        
        // Calculate offset from panel corner
        const rect = panel.getBoundingClientRect();
        this.dragOffset.x = clientX - rect.left;
        this.dragOffset.y = clientY - rect.top;
        
        this.draggingPanel = panel;
        
        // Add event listeners for the drag
        if (isTouch) {
            document.addEventListener('touchmove', this.handleDragMove.bind(this));
            document.addEventListener('touchend', this.handleDragEnd.bind(this));
        } else {
            document.addEventListener('mousemove', this.handleDragMove.bind(this));
            document.addEventListener('mouseup', this.handleDragEnd.bind(this));
        }
        
        // Bring panel to front
        this.bringToFront(panel);
    }

    handleDragMove(e) {
        if (!this.draggingPanel) return;
        
        e.preventDefault();
        
        const isTouch = e.type === 'touchmove';
        const clientX = isTouch ? e.touches[0].clientX : e.clientX;
        const clientY = isTouch ? e.touches[0].clientY : e.clientY;
        
        // Calculate new position
        let newX = clientX - this.dragOffset.x;
        let newY = clientY - this.dragOffset.y;
        
        // Keep panel within viewport
        newX = Math.max(0, Math.min(window.innerWidth - this.draggingPanel.offsetWidth, newX));
        newY = Math.max(0, Math.min(window.innerHeight - this.draggingPanel.offsetHeight, newY));
        
        // Apply new position
        this.draggingPanel.style.left = `${newX}px`;
        this.draggingPanel.style.top = `${newY}px`;
        this.draggingPanel.style.right = 'auto';
        this.draggingPanel.style.bottom = 'auto';
    }

    handleDragEnd() {
        if (!this.draggingPanel) return;
        
        // Save position
        this.savePanelPosition(this.draggingPanel.id);
        
        // Clean up
        document.removeEventListener('mousemove', this.handleDragMove);
        document.removeEventListener('mouseup', this.handleDragEnd);
        document.removeEventListener('touchmove', this.handleDragMove);
        document.removeEventListener('touchend', this.handleDragEnd);
        
        this.draggingPanel = null;
    }

    startResize(e, panel) {
        e.preventDefault();
        e.stopPropagation();
        
        const isTouch = e.type === 'touchstart';
        const clientX = isTouch ? e.touches[0].clientX : e.clientX;
        const clientY = isTouch ? e.touches[0].clientY : e.clientY;
        
        // Store initial state
        this.resizeStart = {
            x: clientX,
            y: clientY,
            width: panel.offsetWidth,
            height: panel.offsetHeight,
            left: parseInt(panel.style.left) || panel.offsetLeft,
            top: parseInt(panel.style.top) || panel.offsetTop
        };
        
        this.resizingPanel = panel;
        
        // Add event listeners
        if (isTouch) {
            document.addEventListener('touchmove', this.handleResizeMove.bind(this));
            document.addEventListener('touchend', this.handleResizeEnd.bind(this));
        } else {
            document.addEventListener('mousemove', this.handleResizeMove.bind(this));
            document.addEventListener('mouseup', this.handleResizeEnd.bind(this));
        }
        
        // Bring panel to front
        this.bringToFront(panel);
    }

    handleResizeMove(e) {
        if (!this.resizingPanel) return;
        
        e.preventDefault();
        
        const isTouch = e.type === 'touchmove';
        const clientX = isTouch ? e.touches[0].clientX : e.clientX;
        const clientY = isTouch ? e.touches[0].clientY : e.clientY;
        
        // Calculate new size
        const deltaX = clientX - this.resizeStart.x;
        const deltaY = clientY - this.resizeStart.y;
        
        let newWidth = this.resizeStart.width + deltaX;
        let newHeight = this.resizeStart.height + deltaY;
        
        // Apply minimum size constraints
        newWidth = Math.max(100, newWidth);
        newHeight = Math.max(50, newHeight);
        
        // Apply maximum size constraints
        newWidth = Math.min(window.innerWidth - this.resizingPanel.offsetLeft, newWidth);
        newHeight = Math.min(window.innerHeight - this.resizingPanel.offsetTop, newHeight);
        
        // Apply new size
        this.resizingPanel.style.width = `${newWidth}px`;
        
        // Only update height if panel has height style
        if (this.resizingPanel.style.height || this.resizeStart.height > 0) {
            this.resizingPanel.style.height = `${newHeight}px`;
        }
    }

    handleResizeEnd() {
        if (!this.resizingPanel) return;
        
        // Save position and size
        this.savePanelPosition(this.resizingPanel.id);
        
        // Clean up
        document.removeEventListener('mousemove', this.handleResizeMove);
        document.removeEventListener('mouseup', this.handleResizeEnd);
        document.removeEventListener('touchmove', this.handleResizeMove);
        document.removeEventListener('touchend', this.handleResizeEnd);
        
        this.resizingPanel = null;
    }

    bringToFront(panel) {
        // Reset z-index for all panels
        document.querySelectorAll('.ui-panel').forEach(p => {
            p.style.zIndex = '100';
        });
        
        // Bring current panel to front
        panel.style.zIndex = '1000';
    }

    // Panel management methods
    createPanel(id, title, content, position = null) {
        // Check if panel already exists
        if (this.panels.has(id)) {
            return this.panels.get(id);
        }
        
        // Create panel element
        const panel = document.createElement('div');
        panel.id = id;
        panel.className = 'ui-panel';
        
        // Set position and size
        if (position) {
            Object.assign(panel.style, {
                position: 'absolute',
                left: `${position.x}px`,
                top: `${position.y}px`,
                width: position.width ? `${position.width}px` : 'auto',
                height: position.height ? `${position.height}px` : 'auto',
                zIndex: '100'
            });
        }
        
        // Panel HTML structure
        panel.innerHTML = `
            <div class="panel-header">
                <div class="panel-title">${title}</div>
                <button class="panel-close">×</button>
            </div>
            <div class="panel-content">
                ${content}
            </div>
            <div class="drag-handle">≡ Drag</div>
        `;
        
        // Add to UI overlay
        const uiOverlay = document.getElementById('uiOverlay');
        if (uiOverlay) {
            uiOverlay.appendChild(panel);
        } else {
            document.body.appendChild(panel);
        }
        
        // Setup drag functionality
        this.setupPanelDraggable(panel);
        
        // Setup close button
        const closeBtn = panel.querySelector('.panel-close');
        if (closeBtn) {
            closeBtn.onclick = () => {
                this.hidePanel(id);
            };
        }
        
        // Store panel
        this.panels.set(id, panel);
        
        // Save default position if not provided
        if (!position) {
            const rect = panel.getBoundingClientRect();
            this.defaultPanelPositions.set(id, {
                x: rect.left,
                y: rect.top,
                width: rect.width,
                height: rect.height
            });
        } else {
            this.defaultPanelPositions.set(id, position);
        }
        
        console.log(`Created panel: ${id}`);
        return panel;
    }

    getPanel(id) {
        return this.panels.get(id);
    }

    showPanel(id) {
        const panel = this.panels.get(id);
        if (panel) {
            panel.style.display = 'block';
            this.bringToFront(panel);
        }
    }

    hidePanel(id) {
        const panel = this.panels.get(id);
        if (panel) {
            panel.style.display = 'none';
        }
    }

    togglePanel(id) {
        const panel = this.panels.get(id);
        if (panel) {
            if (panel.style.display === 'none') {
                this.showPanel(id);
            } else {
                this.hidePanel(id);
            }
        }
    }

    resetPanelPosition(id) {
        const panel = this.panels.get(id);
        const defaultPos = this.defaultPanelPositions.get(id);
        
        if (panel && defaultPos) {
            panel.style.left = `${defaultPos.x}px`;
            panel.style.top = `${defaultPos.y}px`;
            if (defaultPos.width) {
                panel.style.width = `${defaultPos.width}px`;
            }
            if (defaultPos.height) {
                panel.style.height = `${defaultPos.height}px`;
            }
            
            this.savePanelPosition(id);
            console.log(`Reset position for panel: ${id}`);
        }
    }

    resetAllPositions() {
        for (const [id, panel] of this.panels) {
            this.resetPanelPosition(id);
        }
        console.log('Reset all panel positions');
    }

    // Position saving/loading
    savePanelPosition(panelId) {
        const panel = this.panels.get(panelId);
        if (!panel) return;
        
        const position = {
            x: parseInt(panel.style.left) || panel.offsetLeft,
            y: parseInt(panel.style.top) || panel.offsetTop,
            width: panel.offsetWidth,
            height: panel.offsetHeight,
            visible: panel.style.display !== 'none'
        };
        
        this.panelStates.set(panelId, position);
        
        // Save to localStorage
        const allPositions = {};
        for (const [id, pos] of this.panelStates) {
            allPositions[id] = pos;
        }
        
        try {
            localStorage.setItem('galacticConquest_ui_positions', JSON.stringify(allPositions));
        } catch (e) {
            console.warn('Failed to save UI positions:', e);
        }
    }

    savePanelPositions() {
        for (const [id, panel] of this.panels) {
            this.savePanelPosition(id);
        }
        console.log('Saved all panel positions');
    }

    loadPanelPositions() {
        try {
            const saved = localStorage.getItem('galacticConquest_ui_positions');
            if (!saved) return;
            
            const positions = JSON.parse(saved);
            
            for (const [panelId, pos] of Object.entries(positions)) {
                const panel = this.panels.get(panelId);
                if (panel) {
                    panel.style.left = `${pos.x}px`;
                    panel.style.top = `${pos.y}px`;
                    panel.style.width = `${pos.width}px`;
                    if (pos.height) {
                        panel.style.height = `${pos.height}px`;
                    }
                    panel.style.display = pos.visible !== false ? 'block' : 'none';
                    
                    this.panelStates.set(panelId, pos);
                }
            }
            
            console.log('Loaded panel positions from localStorage');
        } catch (e) {
            console.warn('Failed to load UI positions:', e);
        }
    }

    // Hotkeys setup
    setupHotkeys() {
        document.addEventListener('keydown', (e) => {
            // Function keys for panel toggling
            switch(e.key) {
                case 'F1':
                    e.preventDefault();
                    this.togglePanel('resourcesPanel');
                    break;
                case 'F2':
                    e.preventDefault();
                    this.togglePanel('selectionPanel');
                    break;
                case 'F3':
                    e.preventDefault();
                    this.togglePanel('gameInfo');
                    break;
                case 'F4':
                    e.preventDefault();
                    this.togglePanel('minimapContainer');
                    break;
                case 'F5':
                    e.preventDefault();
                    this.togglePanel('debugInfo');
                    break;
                case 'F6':
                    e.preventDefault();
                    this.togglePanel('helpPanel');
                    break;
                case 'F12':
                    e.preventDefault();
                    if (confirm('Reset all UI panels to default positions?')) {
                        this.resetAllPositions();
                    }
                    break;
            }
            
            // Alt + number for quick panel access
            if (e.altKey && e.key >= '1' && e.key <= '9') {
                e.preventDefault();
                const panelIndex = parseInt(e.key) - 1;
                const panelIds = Array.from(this.panels.keys());
                if (panelIndex < panelIds.length) {
                    const panelId = panelIds[panelIndex];
                    this.togglePanel(panelId);
                }
            }
        });
    }

    // Update method for game loop
    update() {
        // Nothing needed here for now
    }

    // Debug methods
    getPanelStats() {
        return {
            totalPanels: this.panels.size,
            visiblePanels: Array.from(this.panels.values()).filter(p => p.style.display !== 'none').length,
            positionsSaved: this.panelStates.size
        };
    }

    listPanels() {
        const list = [];
        for (const [id, panel] of this.panels) {
            list.push({
                id,
                visible: panel.style.display !== 'none',
                position: {
                    x: parseInt(panel.style.left) || 0,
                    y: parseInt(panel.style.top) || 0,
                    width: panel.offsetWidth,
                    height: panel.offsetHeight
                }
            });
        }
        return list;
    }
}

export { DraggableUISystem };