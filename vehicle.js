/*

	Vehicle which may be controlled by a player or AI
	
	extends Actor with
	==================
		direction : { x, y }

*/

class Vehicle extends Actor {
	constructor(o) {
		super(o);
		
		if (o.direction) this.direction = o.direction; else this.direction = { x:0, y:0 }
	}	
}