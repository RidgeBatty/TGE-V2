/*

	Player

*/
import { Actor } from './actor.js';
import * as Types from './types.js';
import { KeyController, GamepadController, PointerController } from './gameController.js';
import { Enum_HitTestMode } from './engine.js';
import { Hitpoints } from './hitpoints.js';
import { Mixin } from './utils.js';

const { Vector2:Vec2, V2 } = Types;
const { Overlap, Ignore }  = Enum_HitTestMode;		

const Enum_PlayerMovement = {	
	None         	   : 0,	
	Default 		   : 1,
	Arcade  		   : 1,		// Precise movement along x and y axis. No rotation. No frame rate correction. No easing. 	
	FirstPersonShooter : 2,		// Movement along direction axis. Left/Right rotation (turning). Frame rate correction enabled. Easing.	
	FPS				   : 2,
	SpaceShip		   : 3,		// Freely rotate around z-axis, accelerate towards nose direction
	Car				   : 4,		// Rotation is relative of movement speed. Accelerate towards nose direction
	Platformer         : 5,		// Side scrolling platformer: Movement easing, gravity, jumping
	Custom			   : 99,	// Do not apply any controls automatically on the player actor.
}

class Player extends Actor {
	constructor(o = {}) {				
		const params = Object.assign(o, { colliderType : 'Player' });
		super(params);

		this.collisionResponseDefault = Ignore;
		this.setCollisionResponseFlag({
			Consumable  : Overlap,
			WorldStatic : Overlap,
			WorldDynamic: Overlap,
			Enemy       : Overlap,
			EnemyShot   : Overlap,			
		});
				
		this.instigator     = ('instigator' in o) ? o.instigator : null;		
		this.controllers    = {};	
		this._movementType  = Enum_PlayerMovement.Default;
		this._isMovementCancelled = false;
		this.lives		    = ('lives' in o) ? o.lives : 1;
		this.customMovement = null;
		this.score          = 0;
		this.keyMask        = {											// set mask to false to temporarily disable key processing in updateMovement()
			up    : true,
			down  : true,
			left  : true,
			right : true,	
		}

		if ('controls' in o) {
			const c = o.controls;
			if (c.includes('keyboard')) this.attachKeyboard();
			if (c.includes('gamepad')) this.attachGamepad();
			if (c.includes('pointer')) this.attachPointer();
		}
		
		if ('movement' in o) this.setMovementType(Enum_PlayerMovement[o.movement]);
		
		Mixin(this, Hitpoints, o);
	}

	disableControllers() {
		for (const c of Object.values(this.controllers)) c.isActive = false;
	}

	enableControllers() {
		for (const c of Object.values(this.controllers)) c.isActive = true;
	}

	setMovementType(value) {		
		this.movementType = value;
	}
	
	/**
		Sets the default movement type of player
		Movement object is inherited from Actor class
	*/	
	set movementType(value) {	
		if (typeof value == 'string') value = Enum_PlayerMovement[value.toLowerCase()];
		
		if (value == Enum_PlayerMovement.Arcade) {					
			this.movement.maxVelocity  = 1;
			this.movement.acceleration = 1;		
			this.movement.friction     = 1;
			this._movementType         = value;

			this.flags.isPhysicsEnabled = true;
			return;
		}
		if (value == Enum_PlayerMovement.FirstPersonShooter) {
			if ('keyboard' in this.controllers) {
				this.controllers['keyboard'].addYawKeyDefaults();			// TO-DO: add yaw into other controllers!
			}			
			this.movement.strafe       = 0.001;		
			this.movement.acceleration = 0.001;		
			this.movement.turnRate     = 0.002;
			this.movement.friction     = 0.1;
			this._movementType         = value;

			this.flags.isPhysicsEnabled = true;
			return;
		}		
		if (value == Enum_PlayerMovement.SpaceShip) {
			this.movement.acceleration = 0.001;		
			this.movement.turnRate     = 0.002;
			this._movementType         = value;
			return;
		}		
		if (value == Enum_PlayerMovement.Car) {
			this.movement.acceleration = 0.0004;		
			this.movement.turnRate     = 0.0004;
			this.movement.friction     = 0.01;		    // how much the vehicle resists movement in lateral slip condition
			this.movement.rollingFriction = 0.002;		// how much the vehicle resists movement when moving forward
			this._movementType         = value;
			return;
		}		
		if (value == Enum_PlayerMovement.Platformer) {	
			this.movement.isAirborne   = true;
			this.movement.isJumping    = false;
        	this.movement.isFalling    = false;		
        	this.movement.acceleration = 0.7;
        	this.movement.maxVelocity  = 15;
        	this.movement.friction     = 0.15;     
			this.movement.gravity      = V2(0, 0.6);
			this.movement.jumpForce    = V2(0, -14);
			this.movement.fallingThreshold = 14;			// how fast the player should be falling when the isFalling flag is turned on
		}
		this._movementType = value;
	}
	
	get movementType() { return this._movementType }	
	get isPlayer() { return true; }
	
	attachKeyboard(params) {		
		this.controllers['keyboard'] = new KeyController({ owner:this }, params);		
	}
	
	attachGamepad(index = 0) {
		this.controllers['gamepad'] = new GamepadController({ owner:this, index });		
	}
	
	/**
	 * 
	 * @param {*} params 
	 */
	attachPointer(params) {
		this.controllers['pointer'] = new PointerController({ owner:this }, params);		
	}
	
	tick() {
		if (!this._isMovementCancelled) this.updateMovement();		
		this._isMovementCancelled = false;
		
		super.tick();
		
		// poll gamepad controllers:
		if (this.controllers['gamepad']) this.controllers['gamepad'].poll();					
	}
	
	/*
		Cancels movement for this frame
	*/
	cancelMovement() { this._isMovementCancelled = true; }	
	get isMovementCancelled() { return this._isMovementCancelled; }
	
	updateMovement() {
		const p    = this;
		const keys = p.controllers.keyboard;	
		
		if (keys == null || p._movementType == Enum_PlayerMovement.None || this._isMovementCancelled) return;
		
		const ks = Object.assign({}, keys.keyState);
		for (const [k, v] of Object.entries(this.keyMask)) ks[k] = ks[k] & v;		
		
		switch (p._movementType) {
		case Enum_PlayerMovement.FirstPersonShooter: {
			const delta    = p.owner.frameDelta;
			const acc      = p.movement.acceleration * delta;
			const turnRate = p.movement.turnRate * delta;
			const sAcc     = p.movement.strafe * delta;
			
			if (ks.left)  	  p.addImpulse(Vec2.Left().rotate(p.rotation).mulScalar(sAcc));		
			if (ks.right) 	  p.addImpulse(Vec2.Right().rotate(p.rotation).mulScalar(sAcc));
			if (ks.turnLeft)  p.rotation -= turnRate;	
			if (ks.turnRight) p.rotation += turnRate;	
				
			if (ks.up)    	  p.addImpulse(Vec2.Up().rotate(p.rotation).mulScalar(acc));
			if (ks.down)  	  p.addImpulse(Vec2.Down().rotate(p.rotation).mulScalar(acc));

			this.velocity.mulScalar(1 - this.movement.friction);
			
			break; }
		case Enum_PlayerMovement.SpaceShip: {
			const delta    = p.owner.frameDelta;
			const acc      = p.movement.acceleration * delta;
			const turnRate = p.movement.turnRate * delta;
			
			if (ks.left)  	  p.rotation -= turnRate;	
			if (ks.right) 	  p.rotation += turnRate;	
			
			if (ks.up)    	  p.addImpulse(Vec2.Up().rotate(p.rotation).mulScalar(acc));
			if (ks.down)  	  p.addImpulse(Vec2.Down().rotate(p.rotation).mulScalar(acc));
			
			break; }	
		case Enum_PlayerMovement.Car: {
			if (this.velocity.length > 0) {
				// calculate how much the current travel angle deviates from the vehicle's sides, i.e. going sideways to the travel angle would cause maximum friction.
				const dev = Math.acos(this.velocity.clone().normalize().dot(Vec2.FromAngle(p.rotation))) / Math.PI;						
				this.velocity.mulScalar(1 - (dev * this.movement.friction));

				if (isNaN(this.velocity.length)) {				// make sure velocity does not underflow
					this.velocity = Vec2.Zero();
				}
			}

			const delta     = p.owner.frameDelta;
			const acc       = p.movement.acceleration * delta;
			const turnRate  = p.movement.turnRate * delta;						
						
			if (ks.up)    	  p.addImpulse(Vec2.Up().rotate(p.rotation).mulScalar(acc));
			if (ks.down)  	  p.addImpulse(Vec2.Down().rotate(p.rotation).mulScalar(acc));			

			this.velocity.mulScalar(1 - this.movement.rollingFriction);

			if (ks.left)  	  p.rotation -= turnRate * this.velocity.length;	
			if (ks.right) 	  p.rotation += turnRate * this.velocity.length;	
			break; }
		case Enum_PlayerMovement.Arcade:
		case Enum_PlayerMovement.Default:		
			if (ks.up)  	  p.velocity.add(V2(0, -p.movement.acceleration));
			if (ks.down)  	  p.velocity.add(V2(0, p.movement.acceleration));			
			if (ks.left)  	  p.velocity.add(V2(-p.movement.acceleration,  0));
			if (ks.right)  	  p.velocity.add(V2(p.movement.acceleration, 0));
			break;
		case Enum_PlayerMovement.Platformer: 
			this.platformerMovement();
			break;
		case Enum_PlayerMovement.Custom:
			if (this.customMovement) this.customMovement(ks);
		}		
	}

	platformerMovement() {	
		const keys = this.controllers.keyboard.keyState;	
		const v    = this.velocity;
		const m    = this.movement;

		m.isFalling = v.y > m.fallingThreshold;
			
		if (m.isAirborne) v.add(m.gravity);								// if airborne, apply gravity
			else v.mulScalar(1 - m.friction); 							// if NOT airborne, apply movement friction

		let dir = 0;													// movement left and right
		if (keys.left)  dir = -1;
		if (keys.right) dir = 1;
		if (dir != 0) {
			this.addImpulse(V2(m.acceleration * dir, 0));
			if (v.x < -5) v.x = -5;
			if (v.x >  5) v.x =  5;
		}

		if (keys.up) {													// jump
			if (m.isAirborne == false && m.isJumping == false) {
				v.add(m.jumpForce);
				m.isAirborne = true;
				m.isJumping  = true;
			}	
		}
		   
	}
}

export { Player, Enum_PlayerMovement };