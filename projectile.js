/*

	Projectile fired by an Actor

*/

import { Actor, Enum_ActorTypes } from './actor.js';
import { Vector2 } from './types.js';

class MissileInfo {
	constructor(fields) {
		Object.assign(this, {
			initialFlightTicks	: 0,		// how long the missile flies before the homing kicks in
			targetSeekAngle		: 0,		// target seek angle as a fraction of 360 degrees: missile is seeking if the target is within the angle (0..1)
			targetSeekDistance  : 400,		// if distance is less than this, no homing
			proximityFuze		: 0,		// distance to target which causes the missile to detonate
			homingSpeed 		: 0,		// relative homing correction, fraction of 360 degrees corrected every tick (0..1)
			acceleration		: 0.1, 		// pixels per tick
			initialVelocity     : 2,
			maxSpeed			: 3,		// maximum speed (pixels per tick)
		});
		Object.assign(this, fields);
	}
}
class Projectile extends Actor {
	constructor(o) {						
		// if instigator is specified we can guess a good collider group for this Projectile		
		if (o.instigator != null) {
			if (o.instigator._type == Enum_ActorTypes.player) o.defaultColliderType = 'PlayerShot';			
			if (o.instigator._type == Enum_ActorTypes.enemy)  o.defaultColliderType = 'EnemyShot';
		}

		super(o);

		this.instigator     = ('instigator' in o) ? o.instigator : null;
		this.lifeTime       = ('lifeTime' in o) ? o.lifeTime : Infinity;
		this._info 		    = null;

		this._initialFlight = 0;
		this._speed         = 0;
		this._target        = null;

		this._isHoming      = false;
	}
	
	get isProjectile() { return true; }
	
	tick() {				
		if (this._target && this._target.flags.isDestroyed) { 
			this._target = null; 
			return super.tick();			
		}
		
		if (this.lifeTime > 0) {
			this.lifeTime--;
			if (this.lifeTime == 0) {				
				return this.destroy();
			}
		}
		
		const m = this._info;
		if (!this._isHoming || !m || !this._target) return super.tick();
		
		// go with the homing code				
		const ab  = Vector2.AngleBetween(Vector2.FromAngle(this.rotation), Vector2.Sub( this._target.position, this.position));						
			
		if (this._initialFlight == 0) {
			if (Vector2.Distance(this.position, this._target.position) < m.targetSeekDistance) {		// homing 
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
		this._target = a;
	}

	/**
	 * @type {Actor}
	 */
	get target() {
		return this._target;
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