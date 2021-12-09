/*

	Projectile fired by an Actor

*/

import { Actor } from './actor.js';
import { Vector2 } from './types.js';

const MissileInfo = {
	initialFlightTicks	: 0,		// how long the missile flies before the homing kicks in
	targetSeekAngle		: 0,		// target seek angle as a fraction of 360 degrees: missile is seeking if the target is within the angle (0..1)
	targetSeekDistance  : 0,		// if distance is less than this, no homing
	proximityFuze		: 0,		// distance to target which causes the missile to detonate
	homingSpeed 		: 0,		// relative homing correction, fraction of 360 degrees corrected every tick (0..1)
	acceleration		: 0.03, 	// pixels per tick
	initialVelocity     : 1,
	maxSpeed			: 3,		// maximum speed (pixels per tick)
}

class Projectile extends Actor {
	constructor(o) {								
		super(o);
		
		this.instigator     = ('instigator' in o) ? o.instigator : null;
		this.lifeTime       = ('lifeTime' in o) ? o.lifeTime : Infinity;
		this._info 		    = null;

		this._initialFlight = 0;
		this._acceleration  = 0;
		this._target        = null;
	}
	
	get isProjectile() { return true; }
	
	tick() {		
		if (this.lifeTime == 0) this.destroy();
			else {
				if (this.lifeTime > 0) this.lifeTime--;

				const m = this._info;
				
				if (m && this._target) {
					if (this._initialFlight == 0) {
						const ab  = Vector2.AngleBetween(Vector2.FromAngle(this.rotation), Vector2.Sub( this._target.position, this.position));
												
						if (ab > 0) this.rotation += Math.abs(m.homingSpeed);
							else this.rotation += -Math.abs(m.homingSpeed);

						this.velocity = Vector2.FromAngle(this.rotation, this._acceleration);
						this._acceleration += m.acceleration;
					} else
						this._initialFlight--;
										
					if (this.velocity.length > m.maxSpeed) this.velocity.mulScalar(m.maxSpeed / this.velocity.length);	// handle speed cap
				}

				super.tick();
			}
	}

	/**
	 * @type {MissileInfo}
	 */
	set info(o) {
		this._info = o;				
		this._initialFlight = o.initialFlightTicks;		
		this._acceleration  = o.initialVelocity;
	}

	/**
	 * @type {Actor}
	 */
	set target(a) {
		this._target = a;
	}
}

const CreateMissileInfo = (fields) => {
	const n = Object.create(MissileInfo);
	Object.assign(n, fields);
	return n;
}

export { Projectile, MissileInfo, CreateMissileInfo }