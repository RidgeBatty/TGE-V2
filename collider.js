/*
	
	Colliders
	Tiny Game Engine
	Written by Ridge Batty (c) 2020
	
	Exposes Collider object, a collection of PhysicsShapes, which can be attached to actors.
	Collider provides debug visualizations to PhysicsShapes. These are not meant to be used in production.

*/
import { Transform } from './root.js';
import { Root, Actor, Engine, Types } from './engine.js';
import { PhysicsShape, Circle, AABB, Box, Enum_PhysicsShape, Poly } from './physics.js';

const { Vector2:Vec2, Rect, V2 } = Types;

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
			if ( !(o.owner instanceof Actor || o.owner instanceof Root)) throw 'Collider owner must be either an Actor or Root component';
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

	disable() {
		this.objects.forEach(f => f.isEnabled = false);
	}

	enable() {
		this.objects.forEach(f => f.isEnabled = true);
	}

	/**
	 * Deserializes colliders from array. 
	 * The SerializedCollider may contain an array of array of Colliders (every object can have multiple colliders), or just an array of Colliders (every object has one collider)
	 * 
	 * @param {[SerializedCollider]} arr 
	 * @returns {[array]} Contains an array of arrays
	 */
	static Parse(data) {
		const result = [];

		const parseCollider = (c) => {
			if (c.type == null) {
				var obj = null;
			} else
			if (c.type == 'box') {
				var obj = new Box(V2(c.points[0], c.points[1]), V2(c.points[2], c.points[3]));				
			} else
			if (c.type == 'poly') {				
				var obj = new Poly(V2(c.position.x, c.position.y));
				obj.fromArray(c.points);
			} else
			if (c.type == 'circle') {
				var obj = new Circle(V2(c.position.x, c.position.y), c.radius);
			} else throw new Error('Unsupported collider type ' + c.type);

			if ('angle' in c) obj.angle = c.angle;				

			return obj;
		}

		for (const o of data) {	
			if (Array.isArray(o)) {
				const subColliders = [];		
				for (const c of o) {							
					subColliders.push(parseCollider(c));					
				}
				result.push(subColliders);
			} else {
				result.push(parseCollider(o));					
			}	
		}					
		return result;
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
		return p;
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
		const actor     = this.actor;
		const colliders = ('optimizedColliders' in actor) ? actor.optimizedColliders : actor.colliders.objects;
		
		const gameLoop  = actor.owner;
		const ctx 		= Engine.renderingSurface.ctx;
		const scale     = this.scale * this.actor.scale;

		for (var i = 0; i < colliders.length; i++) {
			var c   = colliders[i];			
			var cp  = actor.renderPosition;
			var pos = Vec2.Zero();
			
			ctx.resetTransform();
			ctx.translate(cp.x, cp.y);			
			if (!c.ignoreParentRotation) ctx.rotate(actor.rotation);						
			ctx.scale(scale, scale);
			ctx.translate(c.position.x, c.position.y);			
			ctx.rotate(c.angle);
	
			// NOTE! This will draw the colliders always on Engine.renderingSurface, because it is assumed that colliders are drawn as an overlay
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
		// can we get any optimization?
		const otherColliders = ('optimizedColliders' in otherActor) ? otherActor.optimizedColliders : otherActor.colliders.objects;
		
		const colliders      = this.objects;		
		const actor          = this.actor;

		const aResp          = actor.getCollisionResponse(otherActor);
		const bResp          = otherActor.getCollisionResponse(actor);		

		let   result         = false;																	// final result of the actor vs. otherActor collision, assume they won't be colliding
				
		if (aResp == 2 && bResp == 2) {																	// BLOCK: If and only if both actors have "block" flag set against each other.					
			for (const a of colliders) if (a.isEnabled) for (const b of otherColliders) if (b.isEnabled) {
				if (PhysicsShape.Overlaps(a, b)) {

					const oc = otherActor.velocity.clone();												// make objects bounce off from each other
					otherActor.velocity.sub(actor.velocity.clone().mulScalar(1.0));
					actor.velocity.add(oc.mulScalar(0.5));

					const av = actor.velocity.negate();
					const bv = otherActor.velocity.negate();

					if (av.length == 0 && bv.length == 0) {
						//console.log('No velocity, but still overlapping!')																	
					}
					
					let attempts = 5;
					while (PhysicsShape.Overlaps(a, b)) {										
						actor.position.add(av);
						otherActor.position.add(bv);
						attempts--;
						if (attempts == 0) break;							
					}					
				}
			}			
			
		} else {											
			if (aResp > 0 && bResp > 0) {																// OVERLAP								
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