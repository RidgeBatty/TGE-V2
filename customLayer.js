/**
 * 
 * CustomLayer is a template for rendering custom content on the Engine renderingSurface. It respects Engine.gameLoop.zLayers
 * 
 */
 import { Engine, Types, Root } from './engine.js';

class CustomLayer extends Root {
    /**
     * 
     * @param {object} o   
     */
	constructor(o) {		
        super({});
        this.owner  = o.owner || Engine;       
        this.zIndex = ('zIndex' in o) ? o.zIndex : 1;
        
        if ('addLayer' in o && o.addLayer == true) {
            this.owner.gameLoop.zLayers[this.zIndex].push(this);
        }
	}

    destroy() {
        this.owner.gameLoop.removeFromZLayers(this);        
    }
    
    updateViewport() {
        const { engine } = this;
		const width  = engine.viewport.width;
		const height = engine.viewport.height;
				
		if (this.canvas == null) {
			this.canvas = new OffscreenCanvas(width, height);
			this.ctx    = this.canvas.getContext('2d');			
		} else {
			this.canvas.width  = width;
			this.canvas.height = height;
		}
	}

	tick() {  
        
	}

	update() {        
        
	}
}

export { CustomLayer };