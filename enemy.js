/*

	Enemy

*/

import { Actor } from './actor.js';
import { Engine } from './engine.js';
import { Vector2 } from './types.js';
import { Hitpoints } from './actor-hp.js';

class Enemy extends Actor {
	constructor(o) {								
		const params = Object.assign(o, { colliderType : 'Enemy' });
		super(params);
				
		this.instigator = ('instigator' in o) ? o.instigator : null;
	}
	
	get isEnemy() { return true; }
}

export { Enemy }