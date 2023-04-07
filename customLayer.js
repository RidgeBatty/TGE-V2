/**
 * 
 * CustomLayer is a template for rendering custom content on backbuffer CanvasSurface which can then be flipped on (any) other CanvasSurface in update() method.
 * CustomLayer respects Engine.gameLoop.zLayers
 * 
 */
import { CanvasSurface } from './canvasSurface.js';
import { Engine, Root } from './engine.js';
import { V2, Vector2 as Vec2, RECT } from './types.js';

class CustomLayer extends Root {
    /**
     * Creates a new customLayer which has an internal backbuffer canvas "buffer". The buffer is flipped on the "surface" during gameLoop.update().
	 * The default "surface" is Engine.renderingSurface.
     * @param {object} o  
	 * @param {GameLoop?} o.owner Optional reference to the owning gameLoop
	 * @param {number?} o.zIndex
	 * @param {boolean?} o.addLayer Should the layer be added in the gameLoop zLayers? (Default=false)
     */
	constructor(o = {}) {		
        super(o);

        this.owner   = o.owner || Engine.gameLoop;       
		this.engine  = o.engine || Engine;
        this.zIndex  = ('zIndex' in o) ? o.zIndex : 1;		
		this.surface = ('surface' in o) ? o.surface : this.engine.renderingSurface;
		this._buffer         = ('buffer' in o) ? o.buffer : null;																// backbuffer reference (draw on this surface)
		this._bufferSize     = null;
		this._resetTransform = ('resetTransform' in o) ? o.resetTransform : false;
        
        if ('addLayer' in o && o.addLayer == true) {
            this.owner.zLayers[this.zIndex].push(this);
        }
	}

	get resetTransform() { return this._resetTransform }
	set resetTransform(v) { if (typeof v == 'boolean') this._resetTransform = v; }

	get viewport() {
		return RECT(0, 0, this._buffer.width, this._buffer.height);
	}

	get buffer() {
		return this._buffer;
	}

    destroy() {
        this.owner.removeFromZLayers(this);        
    }
    
	/**
	 * Call this to update the dimensions of the internal buffer surface. 
	 * First call will automatically create the buffer surface if it doesn't exist already.
	 */
    updateViewport() {
        const { engine, _bufferSize } = this;
		const width  = _bufferSize ? _bufferSize.x : engine.viewport.width;
		const height = _bufferSize ? _bufferSize.y : engine.viewport.height;
				
		if (this._canvas == null) {			
			this._buffer      = new CanvasSurface({ dims:V2(width, height), preferOffscreenCanvas:true });			
			this._buffer.name = 'CustomRenderingBuffer';
		} else {
			this._buffer.setCanvasSize(width, height);
		}
	}

	/** override */
	tick() {  
        
	}

	flip() {
		if (this.resetTransform) this.surface.resetTransform();     
		this.surface.drawImage(Vec2.Zero(), this._buffer.canvas);
	}

	update() {   
		this.flip();
	}
}

export { CustomLayer };