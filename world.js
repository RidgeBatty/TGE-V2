/**
 *  TGE World
 * 
 *  World contains a camera offset and reference to renderingSurface. Optimally it renders the whole scene on an OffscreenCanvas.
 * 
 */
import { Vector2 as Vec2, V2 } from './types.js';

class World {
    constructor(engine) {
        this.engine   = engine;
        this.camPos   = Vec2.Zero();
        this.offset   = engine.dims.mulScalar(0.5);
        this.surface  = 'renderingSurface' in engine ? engine.renderingSurface : null;
        this.actor    = null;
        this.gravity  = V2(0, 0.1);
        this.renderer = null;
    }

    tick() {
        if (this.actor) this.camPos = Vec2.Sub(this.actor.position, this.offset);
    }
}

export { World }