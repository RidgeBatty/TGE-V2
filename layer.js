/**
 * 
 * Layers are lightweight (background) images which can be scrolled and repeated indefinitely
 * 
 */
import { Engine, Types } from './engine.js';
import { ImageOwner, Mixin } from './imageOwner.js';
const { Vector2 : Vec2, Rect } = Types;

class Layer {
    /**
     * 
     * @param {object} o 
     * @param {HTMLImageElement} o.img      
     */
	constructor(o) {				
        this.owner     = o.owner;
        this.size      = Vec2.Zero();
        this.img       = ('img' in o) ? o.img : null;	
        this.increment = ('increment' in o) ? Vec2.FromStruct(o.increment) : Vec2.Zero();
		this.offset    = ('offset' in o) ? Vec2.FromStruct(o.offset) : Vec2.Zero();
		this.zIndex    = ('zIndex' in o) ? o.zIndex : 1;
        this.viewport  = ('viewport' in o) ? o.viewport : Engine.viewport;
        this.repeat    = ('repeat' in o) ? o.repeat : ''; 
        this.position  = Vec2.Zero();       
        
        if ('scale' in o) {
            if (typeof o.scale == 'number') this.scale = new Vec2(o.scale, o.scale); 
                else this.scale = Vec2.FromStruct(o.scale); 
        } else this.scale = Vec2.One();

        Engine.gameLoop.zLayers[this.zIndex].push(this);

        Mixin(this, ImageOwner, o);		
	}

    destroy() {
        Engine.gameLoop.removeFromZLayers(this);        
    }

	tick() {  
        if (this.owner.position) {
            //this.position = Vec2.Add(Vec2.Mul(this.increment, this.owner.position), this.offset, this.increment);
		    this.position.x = this.increment.x * this.owner.position.x + this.offset.x + this.increment.x;		
		    this.position.y = this.increment.y * this.owner.position.y + this.offset.y + this.increment.y;				            
        } else {            
            this.position.set(this.offset.add(this.increment));
        }
	}

	update() {        
        if (!this.img) return;
        Engine.renderingSurface.resetTransform();        
        Engine.renderingSurface.drawImageRepeat({
			targetRect: this.viewport,
			position: this.position,
			img: this.img,
			repeat: this.repeat,
			size: this.size,
			scale: this.scale,
		});
	}
}

export { Layer };