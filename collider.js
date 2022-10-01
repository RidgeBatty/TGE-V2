/*
	
	Colliders
	Tiny Game Engine
	Written by Ridge Batty (c) 2020
	
	Exposes Collider object, a collection of PhysicsShapes, which can be attached to actors.
	Collider provides debug visualizations to PhysicsShapes. These are not meant to be used in production.

*/
import { Transform } from './root.js';
import { Root, Actor, Scene, Engine } from './engine.js';
import { Types, PhysicsShape, Circle, AABB, Box, Enum_PhysicsShape } from './physics.js';

const Vec2 = Types.Vector2;
const Rect = Types.Rect;

class Collider {
	/**
	 * @param {Object} o
	 * @param {Actor|Scene} o.owner
	 * @param {Vector2=} o.position
	 * @param {Vector2=} o.pivot
	 * @param {number=} o.scale
	 * 	Do not create instances of Collider! Set Actor.hasColliders = true (inherited from Root) to enable use of colliders.
	 */	
	constructor(o) {
		if ('owner' in o) {
			if ( !(o.owner instanceof Actor || o.owner instanceof Scene || o.owner instanceof Root)) throw 'Collider owner must be either an Actor or Scene or Root component';
			this.actor = o.owner;
		} else { // we don't actually need an owner, we just need the following properties for the collider to work:
			this.actor = Object.assign({}, new Transform());	
		}
		
		this.scale        = 1;					// scale of ALL colliders
		this.isOverlapped = false;				// true if the collider is currently overlapped
		this.hilite       = 'rgba(255,0,0,0.5)'	// hilite color
		this.color     	  = 'rgba(0,0,255,0.5)'	// normal draw color
		this.overlapInfo  = null;		
		AE.sealProp(this, 'objects', []);
	}

	remove(object) {
		const i = this.objects.indexOf(object);
		if (i > -1) this.objects.splice(i, 1);
	}
	
	destroy() {
		this.objects.length = 0;
	}
	
	/**
	 * 
	 * @param {PhysicsShape} p 
	 */
	add(p) {
		p.owner = this.actor;
		this.objects.push(p);			
	}

	/**
	 * @param {Vector2} p
	 * Test if Screen Space point is inside the actor's colliders		
	*/
	isPointInside(p) {		
		for (const o of this.objects) if (o.isPointInside(p)) return true;
		return false;
	}
	
	/**
	 * Updates the collider visualizations. If required HTML and SVG elements do not exist, they will be created.		
	*/
	update() {		
		const colliders = this.objects;
		const actor     = this.actor;
		const ctx 		= Engine.renderingSurface.ctx;
		const scale     = this.scale * this.actor.scale;
		
		for (var i = 0; i < colliders.length; i++) {
			var c   = colliders[i];			
			var cp  = actor.position.clone();
			var pos = Vec2.Zero();

			if ('offset' in actor) cp.add(actor.offset);
			
			ctx.resetTransform();
			ctx.translate(cp.x, cp.y);			
			ctx.rotate(actor.rotation);						
			ctx.scale(scale, scale);
			ctx.translate(c.position.x, c.position.y);			
			ctx.rotate(c.angle);
											
			switch (c.type) {				
				case Enum_PhysicsShape.Poly:					
					Engine.renderingSurface.drawPoly(c.points, { stroke:'black', fill:actor.overlaps.length > 0 ? this.hilite : this.color });					
				break;
				case Enum_PhysicsShape.Box:															
					Engine.renderingSurface.drawRect(new Rect(pos.x - c.halfSize.x, pos.y - c.halfSize.y, c.halfSize.x, c.halfSize.y), { stroke:'black', fill:actor.overlaps.length > 0 ? this.hilite : this.color });					
				break;
				case Enum_PhysicsShape.AABB: 					
					
				break;
				case Enum_PhysicsShape.Circle:																
					Engine.renderingSurface.drawCircle(pos, c.radius, { stroke:'black', fill:actor.overlaps.length > 0 ? this.hilite : this.color });
				break;
			}						
		}
	}
	
	/**
	 * @param {Actor} otherActor
	 * Checks whether this Actor's colliders overlap with otherActor's colliders
	 */
	resolveOverlap(otherActor) {		
		const otherColliders = otherActor.colliders.objects;
		const colliders      = this.objects;		
		const actor          = this.actor;
		
		// start calculating the final velocity of the actor!		
		var result = false;		

		const aResp = actor.getCollisionResponse(otherActor);
		const bResp = otherActor.getCollisionResponse(actor);
		
		// Hit testing -->
		// BLOCK: If and only if both actors have "block" flag set against each other.		
		if (aResp == 2 && bResp == 2) {				
			for (const a of colliders) for (const b of otherColliders) PhysicsShape.Collide(a, b);				
		} else {
			// OVERLAP:
			if (aResp > 0 && bResp > 0) {					
				for (const c of colliders)      c.isOverlapped = false;
				for (const c of otherColliders) c.isOverlapped = false;				
				
				for (const a of colliders) if (a.isEnabled) for (const b of otherColliders) if (b.isEnabled && PhysicsShape.Overlaps(a, b)) {
					result = true;
					
					a.isOverlapped = true;
					b.isOverlapped = true;
				}					
			}
		}	
		return result;
	}

	/**
	 * Forces the actor to be marked as 'not overlapped'
	 * This is called internally when an actor is destroyed (thus, potentially ending the overlap with another actor)
	 */
	endOverlap() {
		for (const c of this.objects) c.isOverlapped = false;		
		this.isOverlapped = false;		
	}
		
}

export { Collider }