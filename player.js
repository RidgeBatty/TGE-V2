/*

	Player

*/
import { Actor, Engine, Types } from './engine.js';
import { KeyController, GamepadController, PointerController } from './gameController.js';

const Vector2 = Types.Vector2;

const Enum_PlayerMovement = {		
	Default 		   : 1,
	Arcade  		   : 1,		// Precise movement along x and y axis. No rotation. No frame rate correction. No easing. 	
	FirstPersonShooter : 2,		// Movement along direction axis. Left/Right rotation (turning). Frame rate correction enabled. Easing.	
	FPS				   : 2,
	SpaceShip		   : 3,	
	Custom			   : 99,	// Do not apply any controls automatically on the player actor.
}

class Player extends Actor {
	constructor(o) {				
		super(o);
		
		this._defaultColliderType = 'Player';
				
		('instigator' in o) ? this.instigator = o.instigator : null;
		
		this.data          = {}; // userdata
		this.controllers   = {};	
		this._movementType = Enum_PlayerMovement.Default;
		this._isMovementCancelled = false;
		
		if (Engine.useWorld) this.world = Engine.world;
	}
	
	/*
		Sets the default movement type of player
		Movement object is inherited from Actor class
	*/	
	set movementType(value) {		
		if (value == Enum_PlayerMovement.Arcade) {					
			this.movement.acceleration = 1;		
			this.movement.friction     = 1;
			this._movementType         = value;
			return;
		}
		if (value == Enum_PlayerMovement.FirstPersonShooter) {
			if ('keyboard' in this.controllers) {
				this.controllers['keyboard'].addYawKeyDefaults();
				// TO-DO: add yawing into other controllers!
			}			
			this.movement.strafe       = 0.001;		
			this.movement.acceleration = 0.001;		
			this.movement.turnRate     = 0.002;
			this._movementType         = value;
			return;
		}		
		if (value == Enum_PlayerMovement.SpaceShip) {
			this.movement.acceleration = 0.001;		
			this.movement.turnRate     = 0.002;
			this._movementType         = value;
			return;
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
		const keys = p.controllers['keyboard'];	
		
		if (keys == null) return;
		
		const ks   = keys.keyState;
		
		switch (p._movementType) {
		case Enum_PlayerMovement.FirstPersonShooter: {
			const delta    = p.owner.frameDelta;
			const acc      = p.movement.acceleration * delta;
			const turnRate = p.movement.turnRate * delta;
			const sAcc     = p.movement.strafe * delta;
			
			if (ks.left)  	  p.addImpulse(Vector2.Left().rotate(p.rotation).mulScalar(sAcc));		
			if (ks.right) 	  p.addImpulse(Vector2.Right().rotate(p.rotation).mulScalar(sAcc));
			if (ks.turnLeft)  p.rotation -= turnRate;	
			if (ks.turnRight) p.rotation += turnRate;	
				
			if (ks.up)    	  p.addImpulse(Vector2.Up().rotate(p.rotation).mulScalar(acc));
			if (ks.down)  	  p.addImpulse(Vector2.Down().rotate(p.rotation).mulScalar(acc));
			
			break; }
		case Enum_PlayerMovement.SpaceShip: {
			const delta    = p.owner.frameDelta;
			const acc      = p.movement.acceleration * delta;
			const turnRate = p.movement.turnRate * delta;
			
			if (ks.left)  	  p.rotation -= turnRate;	
			if (ks.right) 	  p.rotation += turnRate;	
			
			if (ks.up)    	  p.addImpulse(Vector2.Up().rotate(p.rotation).mulScalar(acc));
			if (ks.down)  	  p.addImpulse(Vector2.Down().rotate(p.rotation).mulScalar(acc));
			
			break; }	
		case Enum_PlayerMovement.Arcade:
		case Enum_PlayerMovement.Default:					
			if (ks.up)  	  p.velocity.add(new Vector2(0, -p.movement.acceleration));
			if (ks.down)  	  p.velocity.add(new Vector2(0, p.movement.acceleration));			
			if (ks.left)  	  p.velocity.add(new Vector2(-p.movement.acceleration,  0));
			if (ks.right)  	  p.velocity.add(new Vector2(p.movement.acceleration, 0));
			break;
		}		
	}
}

export { Player, Enum_PlayerMovement };