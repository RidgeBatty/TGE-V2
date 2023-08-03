/**
 *  TGE World
 * 
 *  World contains a camera offset and reference to renderingSurface. Optimally it renders the whole scene on an OffscreenCanvas.
 * 
 */
import { Vector2 as Vec2, V2 } from './types.js';
import { sealProp } from "./utils.js";

class World {
    constructor(o) {
        this.engine   = ('engine' in o) ? o.engine : null;
        this.camPos   = Vec2.Zero();
        this.offset   = this.engine.dims.mulScalar(0.5);
        this.surface  = 'renderingSurface' in this.engine ? this.engine.renderingSurface : null;
        this.actor    = null;
        this.gravity  = V2(0, 0.1);
        this.renderer = null;

        this.engine.world = this;
        this.engine.flags.setFlag('hasWorld');

        sealProp(this, 'data', {});
    }

    tick() {
        //if (this.actor) this.camPos.add(Vec2.Sub(this.actor.position.clone(), this.offset));     
        if (this.actor) {
            if (!('offset' in this.actor)) {            
                this.actor.offset = V2(0, 0);
            }        
        }
    }
}

export { World }