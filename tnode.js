/**
 @module TNode
 @author Ridge Batty
 @desc
	TNode
	This class is the ultimate ancestor class for stuff that can have a transform and can be parented to other objects
*/

import * as Types from './types.js';	
import { isNumeric } from './utils.js';	

const Vec2 = Types.Vector2;

class TNode {
    constructor(o) {        
        if ('scale' in o && !isNumeric(o.scale)) throw 'Parameter "scale" must be a Number';
        if ('rotation' in o && !isNumeric(o.rotation)) throw 'Parameter "rotation" must be a Number';
		
        this.offset       = ('offset' in o) ? o.offset : Vec2.Zero();		
        this.position     = ('position' in o) ? o.position : Vec2.Zero();
        this.rotation     = ('rotation' in o) ? o.rotation : 0;		
        this.scale        = ('scale' in o) ? o.scale : 1;		    
        this.velocity     = ('velocity' in o) ? o.velocity : Vec2.Zero();		
        this.origin		  = ('origin' in o) ? o.origin : Vec2.Zero();

        this.parent       = o.parent;
        this.children     = [];
                
        Object.defineProperty(this, 'children', { configurable:false });
    }
    
    /**
     * Sets new velocity without breaking the link (recreating the velocity object will break it)
     * @deprecated
     * @param {Vector2} v 
     */
	setVelocity(v) {
		this.velocity.set(v);
	}
}

export { TNode }