/**
 * 
 * CustomLayer is a template for rendering custom content on backbuffer canvas which can then be flipped on renderingSurface. 
 * CustomLayer respects Engine.gameLoop.zLayers
 * 
 */
 import { CanvasSurface } from './canvasSurface.js';
import { Engine, Root } from './engine.js';
import { V2, Vector2 as Vec2 } from './types.js';

class CustomLayer extends Root {
    /**
     * 
     * @param {object} o  
	 * @param {GameLoop?} o.owner Optional reference to the owning gameLoop
	 * @param {number?} o.zIndex
	 * @param {boolean?} o.addLayer Should the layer be added in the gameLoop zLayers? (Default=false)
     */
	constructor(o = {}) {		
        super(o);
        this.owner   = o.owner || Engine.gameLoop;       
        this.zIndex  = ('zIndex' in o) ? o.zIndex : 1;
		this.engine  = o.engine;
		this.surface = ('surface' in o) ? o.surface : Engine.renderingSurface;
		this._buffer = null;
        
        if ('addLayer' in o && o.addLayer == true) {
            this.owner.zLayers[this.zIndex].push(this);
        }
	}

	get buffer() {
		return this._buffer;
	}

    destroy() {
        this.owner.removeFromZLayers(this);        
    }
    
    updateViewport() {
        const { engine } = this;
		const width  = engine.viewport.width;
		const height = engine.viewport.height;
				
		if (this._canvas == null) {			
			this._buffer      = new CanvasSurface({ dims:V2(width, height), preferOffscreenCanvas:true });			
			this._buffer.name = 'CustomRenderingBuffer';
		} else {
			this._buffer.setCanvasSize(width, height);
		}
	}

	tick() {  
        
	}

	update() {        
		this.surface.drawImage(Vec2.Zero(), this._buffer.canvas)
	}
}

export { CustomLayer };