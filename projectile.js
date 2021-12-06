/*

	Projectile fired by an Actor

*/

import { Actor } from './actor.js';

class Projectile extends Actor {
	constructor(o) {								
		super(o);
		
		this.instigator  = ('instigator' in o) ? o.instigator : null;
		this.lifeTime    = ('lifeTime' in o) ? o.lifeTime : 0;
	}
	
	get isProjectile() { return true; }
	
	tick() {		
		if (this.lifeTime == 0) this.destroy();
			else {
				if (this.lifeTime > 0) this.lifeTime--;
				super.tick();
			}
	}
}

export { Projectile }