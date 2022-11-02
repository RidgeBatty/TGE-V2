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

export { ActorMovement }
