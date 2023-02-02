/**
 @module Actor	
 @author Ridge Batty
 @desc   Actor is the base class for an Object that can be placed or spawned in a level. 
*/

import { Types, Root, Events, Engine } from "./engine.js";
import { ImageOwner, Mixin } from "./imageOwner.js";
import { ManagedArray } from "./managedArray.js";
import { Weapon } from "./weapon.js";
import { ActorMovement } from "./actorMovement.js";
import { GameLoop } from "./gameLoop.js";
import { V2 } from "./types.js";

const { Vector2:Vec2, Rect } = Types;
const ImplementsEvents = 'click tick beginoverlap endoverlap collide destroy';

let actorUID  = 0;
/**
 * @readonly
 * @enum {number}
 */
const Enum_ActorTypes = {	
	Default    : 1,
	Player     : 2,
	Enemy      : 4,
	Projectile : 8,	
	Vehicle	   : 16,
	Consumable : 32,
	Obstacle   : 64,
	Npc		   : 128,
	Actor	   : 256,
	Custom     : 32768
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
		this.flags = Object.assign(this.flags,{ isDestroyed:false, isFlipbookEnabled:false, hasEdges:true, mouseEnabled:false, boundingBoxEnabled:false });

		/**
		 * @member {number}
		 */
		this.opacity = ('opacity' in o) ? o.opacity : 1;

		/**
		 *  Create event handlers
		 */
		this.events = new Events(this, ImplementsEvents);
		Object.entries(o).forEach(([k, v]) => { 			
			if (k.startsWith('on')) {
				const evtName = k.toLowerCase().substring(2);	
				if (this.events.names.includes(evtName)) this.events.add(evtName, v);		// install (optional) event handlers given in parameters object				
			}
		});
			
		/**
		 *  @memberof Actor
		 *  @type {Actor#movement}
		 */
		AE.sealProp(this, 'movement', new ActorMovement(this));								// movement object (TO-DO: might need a Class?)
		AE.sealProp(this, 'data', ('data' in o) ? o.data : {});								// Container for custom user data
		AE.sealProp(this, 'surface');

		if ('surface' in o) this.surface = o.surface;
			else
				if (o?.owner?.surface) this.surface = this.owner.surface;			
		
		this.flipbooks       = [];
		this._target         = null;														// follow/tracking target (actor or some object with a position)
		this._follower       = null;
		this.weapons         = new ManagedArray(this, Weapon);
		this._zIndex         = ('zIndex' in o) ? o.zIndex : 1;								// render order
		this.origin          = ('origin' in o) ? o.origin : new Vec2(-0.5, -0.5);			// relative to img dims, normalized coordinates - i.e. { -0.5, -0.5 } = center of the image
		
		/**
		 * @type {boolean} Is the actor currently drawn on the screen or not?
		 */
		this.isVisible       = ('hidden' in o) ? !o.hidden : true;
		this.isVisible       = ('isVisible' in o) ? o.isVisible : this.isVisible;
		this.offset          = ('offset' in o) ? o.offset : Vec2.Zero();
		
		if ('hasColliders' in o) this.hasColliders = o.hasColliders;						// get colliders flag state from create parameters		       
		if ('size' in o)		 this.size         = o.size;
		
		Mixin(this, ImageOwner, o);															// if actor's createparams contain "img" or "imgUrl", the image will be assigned/loaded
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
	 * Converts Actor.position to screen coordinates for rendering function
	 * By default this function checks if a world object exists and subtracts the camera position from player position. 
	 * Otherwise it just returns a copy of the actor position (no transformation is done)
	 * 
	 * Override this getter for projection or conversion from logical coordinates to screen coordinates.
	 */
	get renderPosition() {
		const pos = this.position.clone();			
		if (this?.world) pos.sub(this.world.camPos);		
		return pos;
	}
	
	/**
	 * Returns the current position, rotation, scale and origin of the actor
	 */
	get transform() {
		return { position:this.position, origin:this.origin, scale:this.scale, rotation:this.rotation, offset:this.offset };	
	}
	
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

	addTimer(o) {
		return this.owner.addTimer(Object.assign(o, { actor:this }));
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

	_clickEventHandler(e) {		// called by Engine when mouseup is fired
		if (this.hasColliders) {						
			if (this.colliders.isPointInside(e.position)) {
				const hitPosition = e.position;				
				this.events.fire('click', { hitPosition });
			}
		}		
	}
	
	/**
	 * Schedules actor for destruction and releases the colliders so that interaction is no longer possible
	 */
	destroy() { 		
		if (!this.flags.isDestroyed) {
			this.events.fire('destroy');			
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
	clone(addToGameLoop, appendCreateParams = {}) {
		const createParams = {
			owner    : this.owner,
			position : this.position.clone(),
			offset   : this.offset.clone(),
			origin   : this.origin.clone(),
			rotation : this.rotation,
			scale    : this.scale,
			data     : Object.assign({}, this.data),
			name     : this.name + '_clone',
			opacity  : this.opacity,			
			zIndex   : this.zIndex,
		}
		
		if (this.imgUrl)          createParams.imgUrl = this.imgUrl;  		    // a new copy of the image will be loaded and created				
		if (this._pendingUrl)     createParams.imgUrl = this._pendingUrl;  	    // if loading image is pending, take that into account when cloning!
		if (this.img)             createParams.img    = this.img;				// an existing image will be shared	
		if (this.hpMax)           createParams.hpMax  = this.hpMax;
		if (this.hp)              createParams.hp     = this.hp;
		if (this.lives)           createParams.lives  = this.lives;
		
		const actor = new this.constructor(Object.assign(createParams, appendCreateParams));		
		
		// add optional properties to the actor after creation
		if ('objectType' in this) actor.objectType = this.objectType;
		if ('_type' in this)      actor._type      = this._type;		

		actor.flags       = Object.assign({}, this.flags);
		actor.renderHints = Object.assign({}, this.renderHints);
		actor.isVisible   = this.isVisible;

		// include gameloop flag overrides
		if (this.owner.flags.showColliders) actor.renderHints.showColliders = true;
				
		if (this.colliders) {													// clone colliders
			actor.flags.hasColliders = false;
			for (const c of this.colliders.objects) {
				actor.addCollider(c.clone());			
			}
			actor.setCollisionResponseFlag(this._hitTestFlag);					// copy hit test flag			
		}
		
		this.flipbooks.forEach(fb => actor.flipbooks.push(fb.clone(actor)));	// clone flipbooks collection
		
		if (addToGameLoop)  this.owner.add(actor);								// add to gameLoop?

		if (!(('surface') in appendCreateParams) && this?.owner?.surface) {		// copy reference to original actor's rendering surface if new one is not given in appendCreateParams
			actor.surface = this.owner.surface;
		}

		return actor;
	}
	
	/**
	 * Releases memory occupied by colliders. This is typically done prior to destroying the Actor, but it might be useful for other purposes
	 */
	release() {
		if (this.colliders) this.colliders.destroy();		
	}

	/**
	 * Move actor by certain amount of pixels in x and y direction 
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
	 * Move actor to given x and y location
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

	/**
	 * Applies a force vector to Actor, respecting movement.maxVelocity speed limit
	 * @param {Vector2} v 
	 */
	addImpulse(v) {
		this.velocity.add(v);
		var len = this.velocity.length;
		if (len > this.movement.maxVelocity) this.velocity.normalize().mulScalar(this.movement.maxVelocity);	
	}

	_renderFlipbooks(c) {		
		for (const fb of this.flipbooks) {			
			fb.update();						// select a frame from a flipbook if the actor has one specified			
			
			const n = fb.customRender;			
			if (!n.img) continue;

			this.size.x = n.w;
			this.size.y = n.h;
			const { rotation, scale, origin, size, offset } = this;			
			const pos = this.renderPosition;

			if (fb.isAtlas) {						
				c.setTransform((this.renderHints.mirrorX ? -1 : 1) * scale, 0, 0, (this.renderHints.mirrorY ? -1 : 1) * scale, pos.x + offset.x, pos.y + offset.y);
				c.rotate(rotation);					
				c.translate(size.x * origin.x, size.y * origin.y);
				
				c.drawImage(n.img, n.a * n.w, n.b * n.h, n.w, n.h, 
									0,         0,         n.w, n.h);
				continue;
			} 

			// NOT Atlas - the flipbook contains an array of images:
			c.setTransform((this.renderHints.mirrorX ? -1 : 1) * scale, 0, 0, (this.renderHints.mirrorY ? -1 : 1) * scale, pos.x + offset.x, pos.y + offset.y);
			//c.scale(this.renderHints.mirrorX ? -1 : 1, this.renderHints.mirrorX ? -1 : 1);
			c.rotate(rotation);
			c.translate(size.x * origin.x, size.y * origin.y);
			
			if (n.img.isCanvasSurface) c.drawImage(n.img.canvas, 0, 0);							
				else c.drawImage(n.img, 0, 0);
		}
	}

	/**
	 *	Update method draws all the graphics needed to fully display this actor with minimal possible overhead
	 */	
	update() {		
		if (!this.isVisible) return;

		const { img } = this;
		const c = this.surface.ctx;		
		c.globalAlpha = this.opacity;		

		this._renderFlipbooks(c);
		
		if (img) {										// if the Actor has an image attached, directly or via flipbook, display it
			const { rotation, scale, origin, size, offset } = this;			
			const pos = this.renderPosition;

			c.setTransform((this.renderHints.mirrorX ? -1 : 1) * scale, 0, 0, (this.renderHints.mirrorY ? -1 : 1) * scale, pos.x + offset.x, pos.y + offset.y);
			//c.scale(this.renderHints.mirrorX ? -1 : 1, this.renderHints.mirrorX ? -1 : 1);
			c.rotate(rotation);
			c.translate(size.x * origin.x, size.y * origin.y);
			
			if (img.isCanvasSurface) c.drawImage(img.canvas, 0, 0);							
				else c.drawImage(img, 0, 0);			
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

		this.events.fire('tick');
		
		if (this.flags.boundingBoxEnabled) this._updateBoundingBox();										// calculate bounding box for the actor?
		for (const fb of this.flipbooks) fb.tick();															// select a frame from a flipbook if the actor has one specified			
				
		if (this._target) {																					// if we're targeting another actor:
			const radius = ('orbitRadius' in this.movement) ? this.movement.orbitRadius : 0;
			
			if (!('_offset' in this.movement)) this.movement._offset = 0;

			const ang     = this.movement.orbitOffset + this.owner.seconds * Math.PI * 2 * this.movement.orbitDuration;
			const offset  = Vec2.Up().rotate(ang).mulScalar(radius);			
			const dir     = Vec2.Sub(this._target.position, Vec2.Add(offset.clone().rotate(Math.PI), this.position)).normalize();		
			
			this.movement._targetPosition = offset.clone().add(this._target.position);					 	// orbit position this follower is trying to reach
			this.movement._targetDir      = Vec2.Sub(this.movement._targetPosition, this.position);			// direction vector pointing from this follower to target
			this.movement._targetDistance = this.movement._targetDir.length;

			this.velocity.set(Vec2.MulScalar(dir, this.movement.speed));

			if (this.movement._targetDir.length > this.movement.targetProximity) this.movement.speed += this.movement.acceleration;
				else this.movement.speed -= this.movement.acceleration;
				
			if (this.movement.speed > this.movement.maxVelocity) this.movement.speed = this.movement.maxVelocity;
		}

		if (this.movement) {																				// apply movement parameters, velocity and velocity cap
			this.rotation += this.movement._angularSpeed;
			var len = this.velocity.length;
			if (len > this.movement.maxVelocity) this.velocity.normalize().mulScalar(this.movement.maxVelocity);	
			this.moveBy(this.velocity);				
		}
				
		if (Engine.hasEdges && this.flags.hasEdges) this._handleEdges();									// restrict movement by checking against engine edges rectangle
	}

	_handleEdges() {
		function edgeCollision(axis, edge) {
			const o = { preventDefault:false, edge }; 
			this.events.fire('collide', o); 
			if (!o.preventDefault) {
				this.velocity.mulScalar(0); 
				this.position[axis] = Engine.edges[edge];
			}
		}
		
		const edge = Engine.edges;			
		const pos  = this.position.clone().add(this.velocity);

		if (Engine.edgeAction == 'collide') {
			if (pos.x < edge.left)   edgeCollision.call(this, 'x', 'left');
			if (pos.y < edge.top)    edgeCollision.call(this, 'y', 'top');
			if (pos.x > edge.right)  edgeCollision.call(this, 'x', 'right');
			if (pos.y > edge.bottom) edgeCollision.call(this, 'y', 'bottom');
		}

		if (Engine.edgeAction == 'wrap-around') {
			if (pos.x < edge.left)   this.position.x = edge.right;
        	if (pos.x > edge.right)  this.position.x = edge.left;
        	if (pos.y < edge.top)    this.position.y = edge.bottom;
        	if (pos.y > edge.bottom) this.position.y = edge.top;
		}		
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
	_testOverlaps(other) {
		if (!this.owner.flags.collisionsEnabled || !this.flags.hasColliders) return;		
		try {					
			if (this.colliders.resolveOverlap(other)) {		// 'this' and 'other' actor are currently overlapped									 					
				if (this.overlaps.indexOf(other) == -1) {							
					this.overlaps.push(other);					
					if (this.owner) this.owner.overlaps.push(this);					
					const a = { otherActor:other };
					if (this.onBeginOverlap) this.onBeginOverlap(a);
					this.events.fire('beginoverlap', a);		

					other.overlaps.push(this);			
					if (other.owner) other.owner.overlaps.push(other);
					const b = { otherActor:other };
					if (other.onBeginOverlap) other.onBeginOverlap(b);
					other.events.fire('beginoverlap', b);			
				}										
			} else {										// not currently overlapped
				if (this.overlaps.indexOf(other) > -1) {	// check if they WERE overlapping?										
					const a = { otherActor:other };
					if (this.onEndOverlap) this.onEndOverlap(a);
					this.events.fire('endoverlap', a);
					this.overlaps = this.overlaps.filter(e => e == this);

					const b = { otherActor:this };
					if (other.onEndOverlap) other.onEndOverlap(b);
					other.events.fire('endoverlap', b);
					other.overlaps = other.overlaps.filter(e => e == other);					
				}				
			}
		} catch (e) {
			// colliders object not present?
		}
	}

	/**
	 * Runs the same overlap test as before, but does NOT fire events and does NOT modify the actor.overlaps array	 
	 * Use this function to test for overlaps without affecting the state of any entity
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
		const c = this.surface.ctx;
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
		p.sub(Vec2.Mul(this.origin, this.size));		
		
		return p;
	}
}

export { Actor, Enum_ActorTypes, ActorMovement }; 
