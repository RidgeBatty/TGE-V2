/*

	Projectile fired by an Actor

*/

import { Actor, Enum_ActorTypes } from './actor.js';
import { Vector2 } from './types.js';

class MissileInfo {
	constructor(fields) {
		
		Object.assign(this, {
			initialFlightTicks	: 0,			// how long the missile flies before the homing kicks in
			targetSeekAngle		: 0,			// target seek angle as a fraction of 360 degrees: missile is seeking if the target is within the angle (0..1)
			targetSeekDistance  : Infinity,		// if distance is greater than this, no homing (to simulate target 'lock'), set to Infinity to always seek.
			proximityFuze		: 0,			// distance to target which causes the missile to detonate
			homingSpeed 		: 0,			// relative homing correction, fraction of 360 degrees corrected every tick (0..1)
			acceleration		: 0.1, 			// acceleration (pixels per tick)
			initialVelocity     : 2,			// initial speed (pixels per tick)
			maxSpeed			: 3,			// maximum speed (pixels per tick)
		});
		Object.assign(this, fields);
	}
}
class Projectile extends Actor {
	constructor(o) {						
		// if instigator is specified we can guess a good collider group for this Projectile		
		if (o.instigator != null) {
			if (o.instigator._type == Enum_ActorTypes.player) o.colliderType = 'PlayerShot';			
			if (o.instigator._type == Enum_ActorTypes.enemy)  o.colliderType = 'EnemyShot';
		}

		super(o);

		this.instigator     = ('instigator' in o) ? o.instigator : null;
		this.lifeTime       = ('lifeTime' in o) ? o.lifeTime : Infinity;
		this._info 		    = null;

		this._initialFlight = 0;
		this._speed         = 0;
		this._homingTarget  = null;		

		this._isHoming      = false;
	}
	
	get isProjectile() { return true; }
	
	tick() {						
		const t = this._homingTarget;

		if (t && t.flags.isDestroyed) { 
			this._homingTarget = null; 
			return super.tick();			
		}
		
		if (this.lifeTime > 0) {
			this.lifeTime--;
			if (this.lifeTime == 0) {				
				return this.destroy();
			}
		}
		
		const m = this._info;
		if (!this._isHoming || !m || !t) return super.tick();
		
		// go with the homing code				
		const ab  = Vector2.AngleBetween(Vector2.FromAngle(this.rotation), Vector2.Sub( t.position, this.position));						
			
		if (this._initialFlight == 0) {
			if (Vector2.Distance(this.position, t.position) < m.targetSeekDistance) {		// homing 
				if (ab > 0) this.rotation += Math.abs(m.homingSpeed);
						else this.rotation += -Math.abs(m.homingSpeed);
			}

			this._speed += m.acceleration;
		} 

		if (this._initialFlight > 0) this._initialFlight--;
		
		this.velocity = Vector2.FromAngle(this.rotation, this._speed);						
		if (this.velocity.length > m.maxSpeed) this.velocity.mulScalar(m.maxSpeed / this.velocity.length);	// handle speed cap			

		super.tick();			
	}

	/**
	 * @type {MissileInfo}
	 */
	set info(o) {
		this._info = o;				
		this._initialFlight = o.initialFlightTicks;		
		this._speed         = o.initialVelocity;
		this._isHoming      = true;
	}

	/**
	 * @type {Actor}
	 */
	set target(a) {
		this._homingTarget = a;
	}

	/**
	 * @type {Actor}
	 */
	get target() {
		return this._homingTarget;
	}

	/**
	 * @type {boolean}
	 */
	get isHoming() {
		return this._isHoming;
	}
}

const CreateMissileInfo = (fields) => {	
	return new MissileInfo(fields);
}

export { Projectile, MissileInfo, CreateMissileInfo }