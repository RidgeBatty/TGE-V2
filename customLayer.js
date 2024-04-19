import { Engine, TNode } from './engine.js';
import { V2, Vector2 as Vec2, RECT } from './types.js';

/**
* CustomLayer is a lightweight container for drawable objects.
* Several objects which do not own their surface can be pointed to customLayer's surface to draw. Once complete, the gameLoop will render the result.
* @extends {TNode}
*/
class CustomLayer extends TNode {
    /**
     * Creates a new customLayer which has an internal backbuffer canvas "buffer". The buffer is flipped on the "surface" during gameLoop.update().
	 * The default "surface" is Engine.renderingSurface.
     * @param {object} o  
	 * @param {GameLoop?} o.owner Optional. Reference to the owning gameLoop.
	 * @param {boolean?} o.addLayer Should the layer be added in the gameLoop zLayers? (Default=false)
	 * @param {number?} o.zIndex Optional. This layer will be placed at zIndex depth in gameLoop zLayers.	 
     */
	constructor(o = {}) {		
        super(o);

		this.name			 = o.name;
		this.owner   		 = o.owner || Engine.gameLoop;       										// owner is a gameLoop instance
		this.engine  		 = o.engine || Engine;
        this.zIndex  		 = ('zIndex' in o) ? o.zIndex : 1;		
		this.surface 		 = ('surface' in o) ? o.surface : this.owner.surface;						// internal draw target		
		this.filter          = 'none';
		this.renderables     = [];
		this.resetTransform  = true;

		this.onBeforeUpdate  = null;
		this.onBeforeTick    = null;
        this.onBeforeRender  = null;

        if ('addLayer' in o && o.addLayer == true) this.owner.zLayers[this.zIndex].push(this);        
	}

	add(renderable) {		
		const _d    = renderable.destroy;
		const _this = this;
		renderable.destroy = () => {			
			_this.renderables = _this.renderables.filter(f => f != renderable);
			_d();
		}
		this.renderables.push(renderable);
	}

	/**
	 * Destroys the customLayer and removes it from the gameLoop's zLayers.
	 */
    destroy() {
		this.renderables.length = 0;
        const l = this.owner.removeFromZLayers(this);        		
    }

	/** 
	 * Override tick() in descendant class. Automatically called if this layer is added in the gameLoop.
	 */
	tick() {  		
		if (this.onBeforeTick) this.onBeforeTick({ layer:this });
		for (const r of this.renderables) r.tick();
	}

	/**
	 * Flips the internal buffer surface on the frontBuffer surface. Automatically called if this layer is added in the gameLoop.
	 */
	update() {   		
		const { surface } = this;

		if (this.onBeforeUpdate) this.onBeforeUpdate({ layer:this });

		if (this.resetTransform) surface.resetTransform();
		if (this.filter != 'none') surface.ctx.filter = this.filter;

		for (const r of this.renderables) {
			if (this.onBeforeRender) this.onBeforeRender({ layer:this, surface, renderable:r });			
			r.update();
		}
		
		if (this.filter != 'none') surface.ctx.filter = 'none';				
	}
}

export { CustomLayer };