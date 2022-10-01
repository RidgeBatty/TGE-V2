/**
 @module Actor	
 @author Ridge Batty
 @desc   Actor is the base class for an Object that can be placed or spawned in a level. 
*/

import { Types, Root, Engine } from "./engine.js";
import { ChildActor } from "./childActor.js";
import { ImageOwner, Mixin } from "./imageOwner.js";

const { Vector2:Vec2, Rect } = Types;
const Events  = ['click', 'tick', 'beginoverlap', 'endoverlap', 'collide', 'destroy'];

let actorUID  = 0;
/**
 * @readonly
 * @enum {number}
 */
const Enum_ActorTypes = {	
	default    : 1,
	player     : 2,
	enemy      : 4,
	projectile : 8,	
	vehicle	   : 16,
	consumable : 32,
	obstacle   : 64,
	npc		   : 128,
	actor	   : 256,
}

class ActorMovement {
	constructor(actor) {
		this._actor = actor;		
		this.from({
			acceleration    : 1,		// this is the increment/multiplier applied to velocity on each tick
			maxVelocity     : 1,		// this is the maximum speed physics simulation allows Actor.velocity to reach.
			friction        : 0.2, 		// constant scalar multiplier to resist movement: 1.0 instant stop (100% speed reduction), 0.25: reduce speed by 25% per frame
			_angularSpeed   : 0,	
			
			// These are optional properties which will be used by the Engine if Actor.target is set:

			targetProximity : 20,		// when following a target, switch from acceleration to deceleration when distance is less than "targetProximity" pixels
			orbitRadius     : 100,		// orbital radius upon reaching target (in pixels)
			orbitOffset     : 0,			// position to aim on the target's orbit (in radians)
			orbitDuration   : 0.07,		// how long it takes for this actor to orbit the target? (in revolutions per second)
		});
	}

	from(o) {
		Object.assign(this, o);
	}

	set angularSpeed(value) {
		let v = 0;
		if (typeof value == 'string') {
			const tmp = parseFloat(value);
			if (value.endsWith('/s')) {
				if (!isNaN(tmp)) v = Math.PI / (1000 / this._actor.owner._tickRate) * tmp;				
			} else
			if (value.endsWith('s')) {
				if (!isNaN(tmp)) v = Math.PI / (1000 / this._actor.owner._tickRate) * (1 / tmp);
			} 
		} else
		if (typeof value == 'number') {
			v = value;
		}

		this._angularSpeed = v;
	}

	get angularSpeed() {
		return this._angularSpeed;
	}
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

		this._uid = actorUID++;
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
		this.flags = Object.assign(this.flags,{ isDestroyed:false, isFlipbookEnabled:false, isGravityEnabled:false, isPhysicsEnabled:false, hasEdges:true, mouseEnabled:false, boundingBoxEnabled:false });

		/**
		 * @member {number}
		 */
		this.opacity = 1;
				
		/**
		 *  @memberof Actor
		 *  @type {Actor#movement}
		 */
		AE.sealProp(this, 'movement', new ActorMovement(this));
						
		// create arrays for eventhandlers
		const events = {};
		for (const e of Events) events[e] = [];
		AE.sealProp(this, '_events', events);

		// container custom user data
		AE.sealProp(this, 'data', ('data' in o) ? o.data : {});		
		
		// install (optional) event handlers given in parameters object
		for (const name of Events) if (AE.hasProp(o, 'on' + name)) this.addEvent(name.toLowerCase(), o['on' + name]);		
		
		this.flipbook    = null;
		this._target     = null;											// follow/tracking target (actor or some object with a position)
		this._follower   = null;
		this.weapons     = [];		
		this._zIndex     = ('zIndex' in o) ? o.zIndex : 1;					// render order
		this.origin      = new Vec2(-0.5, -0.5);							// relative to img dims, normalized coordinates - i.e. { -0.5, -0.5 } = center of the image
		this._renderPosition = Vec2.Zero();		

		/**
		 * @type {boolean} Is the actor currently drawn on the screen or not?
		 */
		this.isVisible       = ('hidden' in o) ? !o.hidden : true;
		
		if ('hasColliders' in o) this.hasColliders = o.hasColliders;		// get colliders flag state from create parameters

		Mixin(this, ImageOwner, o);			
	}

	get uid() {
		return this._uid;
	}

	get zIndex() {
		return this._zIndex;
	}

	set zIndex(value) {
		if (value == this._zindex) return;
		const oldZ   = this._zIndex;
		const layers = this.owner.zLayers;
		for (let i = layers[oldZ].length; i--;) if (layers[oldZ][i] == this) { 
			layers[oldZ].splice(i, 1); 
			layers[value].push(this);
			this._zIndex = value;
			return;
		}				
		throw 'Error in changing zIndex of an actor';
	}
	
	/**
	 * Returns the current render position of the Actor: actor.position offset by actor.origin in pixels. Does not take scaling or rotation into account.
	 */
	get renderPosition() {
		this._renderPosition.x = this.position.x - this.size.x * this.origin.x;
		this._renderPosition.y = this.position.y - this.size.y * this.origin.y;
		return this._renderPosition;
	}
		
	get isGravityEnabled() { return this.flags.isGravityEnabled; }	
	set isGravityEnabled(value) { if (typeof value === 'boolean') this.flags.isGravityEnabled = value; }		

	set target(actor) {
		if (actor == null) {
			if (this._target && this._target._follower && this._target._follower == this) {
				this._target._follower = null;
				this._target           = null;	
				return;
			}			
		}
		this._target    = actor;	
		actor._follower = this;		
	}

	get target() {
		return this._target;
	}
	
	addChild(o = {}) {
		const c = new Actor(o);
		c.parent = this;
		this.children.push(c);
		return c;
	}
    	
	getChildByName(name) {
		for (const c of this.children) if (c.name == name) return c;
		return null;
	}

	/**
	 * Adds a new collider to this Actor and makes sure the colliders flag is set 'true'.
	 * @param {PhysicsShape} o 
	 */
	addCollider(o) {
		this.hasColliders = true;
		this.colliders.add(o);
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
		if (this.hasColliders) {						
			if (this.colliders.isPointInside(e.position)) {
				const hitPosition = e.position;				
				this._fireEvent('click', { hitPosition });
			}
		}		
	}
	
	/**
	 * Schedules actor for destruction and releases the colliders so that interaction is no longer possible
	 */
	destroy() { 		
		if (!this.flags.isDestroyed) {
			this._fireEvent('destroy');			
			this.release();
			this.flags.isDestroyed = true;			
		}
	}	
	
	/**
	 * Creates a clone of the Actor.
	 * Note that cloning copies (owner), (data) and (container) property by reference, so both copies share these properties.	
	 *
	 * TO-DO: needs to be overhauled	
	 */	
	clone(actor) {
		if (!(actor instanceof Actor)) return;		
		this.createParams = Object.assign({}, actor.createParams);
		
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
		this.velocity.add(v);
		var len = this.velocity.length;
		if (len > this.movement.maxVelocity) this.velocity.normalize().mulScalar(this.movement.maxVelocity);	
	}

	/**
	 *	Update method draws all the graphics needed to display this actor with minimal possible overhead
	 */	
	update() {		
		if (!this.isVisible) return;

		const c   = Engine.renderingSurface.ctx;
		const pos = this.position.clone().add(this.pivot);		
		if ('offset' in this) pos.add(this.offset);
		
		let img = this.img;		
		
		c.globalAlpha = this.opacity;

		if (this.flipbook) {
			this.flipbook.update();						// select a frame from a flipbook if the actor has one specified			

			const n = this.flipbook.customRender;
			
			if (this.flipbook.isAtlas && n.img) {
				c.setTransform(this.scale, 0, 0, this.scale, pos.x, pos.y);
				c.scale(this.renderHints.mirrorX ? -1 : 1, this.renderHints.mirrorY ? -1 : 1);
				c.rotate(this.rotation);					
				c.drawImage(n.img, n.a * n.w, n.b * n.h, n.w, n.h, -n.w / 2, -n.h / 2, n.w, n.h);
				img = null;	
			} 

			if (!this.flipbook.isAtlas && n.img) {		// let the rendering go through to code below
				this.size.x = n.w;
				this.size.y = n.h;
				img = n.img;
			}
		}
				
		if (img) {										// if the Actor has an image attached, directly or via flipbook, display it
			c.setTransform(this.scale, 0, 0, this.scale, pos.x, pos.y);
			c.scale(this.renderHints.mirrorX ? -1 : 1, this.renderHints.mirrorY ? -1 : 1);
			c.rotate(this.rotation);
			if (img.isCanvasSurface) c.drawImage(img.canvas, -this.size.x / 2, -this.size.y / 2);							
				else c.drawImage(img, -this.size.x / 2, -this.size.y / 2);			
		}

		c.globalAlpha = 1;

		if (this.hasColliders && this.renderHints.showColliders && this.owner.flags.showColliders) this.colliders.update();			
		if (this.owner.flags.showBoundingBoxes && this.renderHints.showBoundingBox && this.onDrawBoundingBox) this.onDrawBoundingBox(this);		
	}

	/**
	*	Tick event applies all movement by forces, restrictions and collisions to the actor
	*/
	tick() {
		if (this.flags.isDestroyed) return;
		
		this._fireEvent('tick');

		if (this.flags.boundingBoxEnabled) this._updateBoundingBox();

		if (this.flipbook) this.flipbook.tick();										// select a frame from a flipbook if the actor has one specified			
		
		// update location by adding velocity:
		if (this.flags.isGravityEnabled) {
			// add gravity:									
			if (this.owner.world != null) this.velocity.add(this.owner.world.gravity);	// world gravity
				else this.velocity.add(Engine.gravity);									// engine gravity (no world object)				
		}		
		
		// calculate physics effects:
		if (this.flags.isPhysicsEnabled) {
			this.velocity.mulScalar(1.0 - this.movement.friction);			
		}

		// if we're targeting another actor:
		if (this._target) {
			const radius = ('orbitRadius' in this.movement) ? this.movement.orbitRadius : 0;
			
			if (!('_offset' in this.movement)) this.movement._offset = 0;

			const ang     = this.movement.orbitOffset + this.owner.seconds * Math.PI * 2 * this.movement.orbitDuration;
			const offset  = Vec2.Up().rotate(ang).mulScalar(radius);			
			const dir     = Vec2.Sub(this._target.position, Vec2.Add(offset.clone().rotate(Math.PI), this.position)).normalize();		
			
			this.movement._targetPosition = offset.clone().add(this._target.position);					 // orbit position this follower is trying to reach
			this.movement._targetDir      = Vec2.Sub(this.movement._targetPosition, this.position);		// direction vector pointing from this follower to target
			this.movement._targetDistance = this.movement._targetDir.length;

			this.velocity.set(Vec2.MulScalar(dir, this.movement.speed));

			if (this.movement._targetDir.length > this.movement.targetProximity) this.movement.speed += this.movement.acceleration;
				else this.movement.speed -= this.movement.acceleration;
				
			if (this.movement.speed > this.movement.maxVelocity) this.movement.speed = this.movement.maxVelocity;
		}

		this.rotation += this.movement._angularSpeed;
		
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
		if (this.movement.speed > this.movement.maxVelocity) this.movement.speed = this.movement.maxVelocity;
		this.moveBy(this.velocity);		
	}

	_updateBoundingBox() {
		const p1  = new Vec2(-this.size.x / 2, -this.size.y / 2);			
		const p2  = new Vec2(this.size.x / 2, -this.size.y / 2);			
		const p3  = new Vec2(this.size.x / 2, this.size.y / 2);			
		const p4  = new Vec2(-this.size.x / 2, this.size.y / 2);

		const r   = this.transformPoints([p1, p2, p3, p4]);
		const smx = r.map(e => e.x);
		const smy = r.map(e => e.y);
		
		this.AABB = new Types.Rect(Math.min(...smx), Math.min(...smy), Math.max(...smx), Math.max(...smy));				
	}

	/** 
	 *	Perform physics hit testing of two Actors using the Colliders object.
     *	Responds by firing beginoverlap, endoverlap and collide events, depending on Enum_HitTestMode flags.
	 *	If this Actor HitTestMode with the other Actor is set to "block", run physics collision.
	 *  @param {Actor} other 
	 */	
	testOverlaps(other) {
		if (!this.owner.flags.collisionsEnabled || !this.flags.hasColliders) return;
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
	
	/**
	 * Returns true if two actors overlap
	 * @param {Actor} other 
	 */

	overlapsWith(other) {

		if (!this.owner.flags.collisionsEnabled || !this.colliders || !other.colliders) return;		
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
		const a = points.map(v => new Vec2(m.a * v.x + m.c * v.y + m.e, m.b * v.x + m.d * v.y + m.f));
		return a;
	}
	
	/** 
	 *	Converts screen space coordinates to actor space		
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

export { Actor, Enum_ActorTypes, ActorMovement };