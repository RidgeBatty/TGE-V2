/**
 @module Actor	
 @author Ridge Batty
 @desc   Actor is the base class for an Object that can be placed or spawned in a level. 
*/

import { Types, Root, Engine } from "./engine.js";
import { ChildActor } from "./childActor.js";
import * as MultiCast from "./multicast.js";
import { Rect } from "./types.js";

const Vector2 = Types.Vector2;
const Events  = ['click', 'tick','beginoverlap','endoverlap', 'collide','destroy'];

/**
 * @readonly
 * @enum {number}
 * This is flag register. Multiple values maybe be combined.
 * @example
 * // Defines a player shot projectile:
 * const PlayerProjectile = Enum_ActorType.player + Enum_ActoryType.projectile;
 */
const Enum_ActorTypes = {	
	default    : 1,
	player     : 2,
	enemy      : 4,
	projectile : 8,	
	vehicle	   : 16,
	layer 	   : 32,
	consumable : 64,
	obstacle   : 128,
}

/**
* @desc This class is the ancestor class for arcade game objects.
* @extends {Root}
*/
class Actor extends Root { 
	/**
	 * @param {Object} [o={}] Parameter object.
	 * @param {GameLoop} o.owner Reference to GameLoop which owns this Actor.
	 * @param {Vector2} o.position Position of the Actor in screen coordinates.
	 * @param {Number} o.rotation Rotation of the Actor (in degrees).
	 * @param {Number} o.scale Scaling of the Actor.
	 * @param {Function} o.onClick Event called when user clicks on the actor with a pointing device.
	 * @param {Function} o.onTick Event called when this actor's game logic is updated.
	 * @param {Function} o.onBeginOverlap Event called when something starts to overlap this Actor.
	 * @param {Function} o.onEndOverlap Event called when something ends overlap with this Actor.
	 * @param {*} o.data Reference to user defined data. Defaults to an empty object.
	 * @param {string} o.name User defined name for the object. Not managed. Please use unique names to make search function work correctly.	 	  
	 */
	constructor(o = {}) {
		super(o);

		/**
		 * @type {Vector2}
		 */
		this.position;

		/**
		 * @type {number}
		 */
 		this.rotation;
		 
		/**
		 * @type {number}
		 */
 		this.scale;

		/** 
		 * @member {Object} 
		 */
		this.renderHints = Object.assign(this.renderHints, { showBoundingBox:false, fixedScale:false, fixedRotation:false, isStatic:false, mirrorY:false, mirrorX:false });

		/**
		 * @member {Object} 
		 * 
		*/
		this.flags = Object.assign(this.flags,{ isDestroyed:false, isFlipbookEnabled:false, isGravityEnabled:false, isPhysicsEnabled:false, hasEdges:true });
				
		/**
		 *  @memberof Actor
		 *  @type {Actor#movement}
		 */
		AE.sealProp(this, 'movement', {
			acceleration : 1,
			maxVelocity  : 1,
			friction     : 0.2, 		// constant scalar multiplier to resist movement: 1.0 instant stop (100% speed reduction), 0.25: reduce speed by 25% per frame
		});
						
		// create arrays for eventhandlers
		const events = {};
		for (const e of Events) events[e] = [];
		AE.sealProp(this, '_events', events);

		// container custom user data
		AE.sealProp(this, 'data', ('data' in o) ? o.data : {});		
		
		// install (optional) event handlers given in parameters object
		for (const name of Events) if (AE.hasProp(o, 'on' + name)) this.addEvent(name.toLowerCase(), o['on' + name]);		
		
		this.flipbook    = null;
		this.weapons     = [];		
		this.children    = [];									// child nodes of this actor		
		this._zIndex     = ('zIndex' in o) ? o.zIndex : 1;		// render order
		this.origin      = new Vector2(-0.5, -0.5);				// relative to img dims, normalized coordinates - i.e. { -0.5, -0.5 } = center of the image
		this._renderPosition = Vector2.Zero();

		/**
		 * @type {boolean} Is the actor currently drawn on the screen or not?
		 */
		this.isVisible       = ('hidden' in o) ? !o.hidden : true;

		if ('dims' in o) this.setSize(o.dims);		
		if ('hasColliders' in o) this.hasColliders = o.hasColliders;

		if ('img' in o) {						
			this.img = o.img;	
			if (o.img instanceof HTMLImageElement) this.setSize(o.img.naturalWidth, o.img.naturalHeight);
				else if (o.img instanceof HTMLCanvasElement/* || o.img.constructor.name == 'CanvasSurface'*/) this.setSize(o.img.width, o.img.height);
		}
	}

	get zIndex() {
		return this._zIndex;
	}

	set zIndex(value) {
		const oldZ = this._zIndex;
		for (let i = this.zLayers[oldZ].length; i--;) if (this.zLayers[oldZ][i] == this) { 
			this.zLayers[oldZ].splice(i, 1); 
			this.zLayers[value].push(this);
			return;
		}				
		throw 'Error in changing zIndex of an actor';
	}
	
	get renderPosition() {
		this._renderPosition.x = this.position.x - this.width * this.origin.x;
		this._renderPosition.y = this.position.y - this.height * this.origin.y;
		return this._renderPosition;
	}
		
	get isGravityEnabled() { return this.flags.isGravityEnabled; }	
	set isGravityEnabled(value) { if (typeof value === 'boolean') this.flags.isGravityEnabled = value; }		
	
	addChild(o = {}) {
		const c = new ChildActor(this, o);
		this.children.push(c);
		return c;
	}
	
	getChildByName(name) {
		for (const c of this.children) if (c.name == name) return c;
		return null;
	}
	
	/*
		Sets actor dimensions, either using a Vector2 or x and y values.
	*/
	setSize(v, n) {
		if (n) {
			this.width  = v;
			this.height = n;			
			return;
		}
		this.width  = v.x;
		this.height = v.y;		
	}

	setImage(img) {
		this.img    = img;
		this.width  = ('width'  in img) ? img.width  : img.naturalWidth;
		this.height = ('height' in img) ? img.height : img.naturalHeight;
	}
	
	setVelocity(v) {	// v:Vector2
		this.velocity.set(v);
	}
	
	forWeapons(cb) {
		for (let weapon of this.weapons) cb(weapon);
	}
	
	addEvent(name, func) {
		if (typeof func != 'function') throw 'Second parameter must be a function';
		if (name in this._events) this._events[name].push({ name, func });		
	}
	
	_fireEvent(name, data) {
		const e = this._events[name];													
		if (e) for (var i = 0; i < e.length; i++) e[i].func(Object.assign({ eventName:name, instigator:this }, data));
	}

	_clickEventHandler(e) {		// called by Engine when mouseup is fired
		if (this.AABB) {
			e.isInsideAABB = this.AABB.isPointInside(e.position);
		}
		this._fireEvent('click', e);
	}
	
	destroy() { 		
		if (!this.flags.isDestroyed) {
			this.flags.isDestroyed = true;
			this._fireEvent('destroy');			
		}
	}	
	
	/*
	
		Creates a clone of the Actor.
		Note that cloning copies (owner), (data) and (container) property by reference, so both copies share these properties.
		
	*/	
	clone(actor) {
		if (!(actor instanceof Actor)) return;		
		this.createParams = actor.createParams;
		
		this.owner       = actor.owner;						// by reference
		this.position    = actor.position.clone();		
		this.velocity    = actor.velocity.clone();		
		this.pivot       = actor.pivot.clone();
		this.scale       = actor.scale;		
		this.rotation    = actor.rotation;		
		this.renderHints = AE.clone(actor.renderHints);
		this.flags		 = AE.clone(actor.flags);
		this.movement    = actor.movement;					// by reference
		
		this.imageURL    = actor.imageURL;
		this.img		 = actor.img;						// by reference
		this.data        = actor.data;						// by reference
		this.isVisible   = actor.isVisible;				
	}
	
	release() {
		if (this.colliders) this.colliders.destroy();		
	}

	/**
	 * 
	 * @param {Number|Vector2} x 
	 * @param {Number=} y 
	 */	
	moveBy(x, y) {		
		if (y != undefined) {
			this.position.x += x;
			this.position.y += y;
		} else {
			this.position.x += x.x;
			this.position.y += x.y;
		}		
	}
	
	/**
	 * 
	 * @param {Number|Vector2} x 
	 * @param {Number=} y 
	 */
	moveTo(x, y) {
		if (y != undefined) {
			this.position.x = x;
			this.position.y = y;
		} else {
			this.position.x = x.x;
			this.position.y = x.y;
		}		
	}	

	addImpulse(v) {
		if (this.velocity) {
			this.velocity.add(v);
			var len = this.velocity.length;
			if (len > this.movement.maxVelocity) this.velocity.normalize().mulScalar(this.movement.maxVelocity);
		}		
	}

/**
*	Update event draws all the graphics needed to display this actor with minimal overhead
*/	
	update() {		
		if (this.isVisible) {
			const p = this.position.clone();				
			const c = Engine.renderingSurface.ctx;
			
			let img = this.img;			

			if (this.flipbook) {
				this.flipbook.update();						// select a frame from a flipbook if the actor has one specified			
				img = this.flipbook.customRender.img;
				if (img && this.flipbook.isAtlas) {
					const n = this.flipbook.customRender;
					c.setTransform(this.scale, 0, 0, this.scale, p.x, p.y);
					c.scale(this.renderHints.mirrorX ? -1 : 1, this.renderHints.mirrorY ? -1 : 1);
					c.rotate(this.rotation);					
					c.drawImage(img, n.a * n.w, n.b * n.h, n.w, n.h, -n.w / 2, -n.h / 2, n.w, n.h);	

					img = null;	
				}
			}
					
			if (img) {										// if the Actor has an image attached, directly or via flipbook, display it
				c.setTransform(this.scale, 0, 0, this.scale, p.x, p.y);
				c.scale(this.renderHints.mirrorX ? -1 : 1, this.renderHints.mirrorY ? -1 : 1);
				c.rotate(this.rotation);
				c.drawImage(img, -this.width / 2, -this.height / 2);			
			}

			if (this.hasColliders && this.renderHints.showColliders && this.owner.flags.showColliders) this.colliders.update();

			if (this.renderHints.showBoundingBox && this.onDrawBoundingBox) this.onDrawBoundingBox(this);
		}
	}

/**
*	Tick event applies all movement by forces, restrictions and collisions to the actor
*/
	tick() {
		if (this.flags.isDestroyed) return;
		
		this._fireEvent('tick');

		if (this.flipbook) this.flipbook.tick();										// select a frame from a flipbook if the actor has one specified			
		
		// update location by adding velocity:
		if (this.flags.isGravityEnabled) {
			// add gravity:									
			if (this.owner.world != null) this.velocity.add(this.owner.world.gravity);	// world gravity
				else this.velocity.add(Engine.gravity);									// engine gravity (no world object)				
		}		
		
		// calculate friction effect:
		if (this.flags.isPhysicsEnabled) this.velocity.mulScalar(1.0 - this.movement.friction);			
		
		// restrict movement by checking against engine edges rectangle:
		function edgeCollision(axis, edge) {
			const o = { preventDefault:false, edge }; 
			this._fireEvent('collide', o); 
			if (!o.preventDefault) {
				this.velocity.mulScalar(0); 
				this.position[axis] = Engine.edges[edge];
			}
		}
		
		if (Engine.hasEdges && this.flags.hasEdges) {
			const edge = Engine.edges;			
			if (this.position.x + this.velocity.x < edge.left) edgeCollision.call(this, 'x', 'left');
			if (this.position.y + this.velocity.y < edge.top)  edgeCollision.call(this, 'y', 'top');
			if (this.position.x + this.velocity.x > edge.right)  edgeCollision.call(this, 'x', 'right');
			if (this.position.y + this.velocity.y > edge.bottom) edgeCollision.call(this, 'y', 'bottom');
		}
		
		// finally move by velocity
		this.moveBy(this.velocity);		
	}

	/* 
		Perform physics hit testing of two Actors using the Colliders object.
		Responds by firing beginoverlap, endoverlap and collide events, depending on Enum_HitTestMode flags.
		If this Actor HitTestMode with the other Actor is set to "block", run physics collision.
	*/	
	testOverlaps(other) {			// other:Actor
		try {
			if (this.colliders.resolveOverlap(other)) {		// 'this' and 'other' actor are currently overlapped
				if (this.overlaps.indexOf(other) == -1) {
					this.overlaps.push(other);					
					if (this.owner) this.owner.overlaps.push(this);
					this._fireEvent('beginoverlap', { actor:this, otherActor:other });					
					other.overlaps.push(this);
					if (other.owner) other.owner.overlaps.push(other);
					other._fireEvent('beginoverlap', { actor:other, otherActor:this });					
				}						
			} else {										// not currently overlapped
				if (this.overlaps.indexOf(other) > -1) {	// check if they WERE overlapping?
					this._fireEvent('endoverlap', { actor:this, otherActor:other });
					this.overlaps = this.overlaps.filter(e => e == this);
					other._fireEvent('endoverlap', { actor:other, otherActor:this });
					other.overlaps = other.overlaps.filter(e => e == other);
				}
			}
		} catch (e) {
			// colliders object not present?
		}
	}
	
	/*
		Returns true if two actors overlap
	*/
	overlapsWith(other) {			// other:Actor
		if (!this.colliders || !other.colliders) return;		
		return this.colliders.resolveOverlap(other);
	}

	/**
	 * Returns positions of actor space points 'v' in screen space
	 * @param {[Vector]} points Array of point to be transformed
	 * @returns {[Vector2]} Array of transformed points
	 */
	transformPoints(points) {
		const p = this.position;
		const c = Engine.renderingSurface.ctx;
		c.setTransform(this.scale, 0, 0, this.scale, p.x, p.y);
		c.scale(this.renderHints.mirrorX ? -1 : 1, this.renderHints.mirrorY ? -1 : 1);
		c.rotate(this.rotation);
		const m = c.getTransform();		
		const a = points.map(v => new Vector2(m.a * v.x + m.c * v.y + m.e, m.b * v.x + m.d * v.y + m.f));
		return a;
	}
	
	/* 
		Converts screen space coordinates to actor space		
	*/
	screenSpaceToActorSpace(p) {		
		p = p.clone();
		p.sub(this.position);		
		p.rotate(-this.rotation);
		p.mulScalar(1 / this.scale);
		p.sub(this.pivot);		
		
		return p;
	}
}

export { Actor, Enum_ActorTypes };