/*

	Basic geometric shapes and their visualization methods
	For visualization the shapes can use user provided canvas element or World.canvas (if World object is available).

*/

import * as Types from './types.js';	
import { Engine } from './engine.js';	

const Vector2 = Types.Vector2;
const LineSegment = Types.LineSegment;

/*
	Axis aligned bounding box
*/
class AABB {
	constructor(position, size) { // position:Vector2, size:Vector2		
		Object.assign(this, { position, size });		
		this.type     = Enum_Shape.AABB;
		this.halfSize = Vector2.DivScalar(size, 2);
	}
	
/*
	Creates an AABB from literal coordinate values of a rectangle	
*/
	static FromRect(left, top, right, bottom) {		// left:number, top:number, right:number, bottom:number
		const width  = (right - left);
		const height = (bottom - top);
		return new AABB(new Vector2(left + width * 0.5, top + height * 0.5), new Vector2(width, height));
	}
	
/*
	Creates an AABB from rectangle coordinates (left, top, right, bottom) stored in an array
*/	
	static FromArray(a) {
		return AABB.FromRect(a[0], a[1], a[2], a[3]);
	}
	
	get boundsArray() {
		const hs  = this.halfSize;
		const p   = this.position;
		return [p.x - hs.x, p.y - hs.y, p.x + hs.x, p.y + hs.y];
	}	
	
	get top()	 { return this.position.y - this.halfSize.y; }
	get left()	 { return this.position.x - this.halfSize.x; }
	get right()	 { return this.position.x + this.halfSize.x; }
	get bottom() { return this.position.y + this.halfSize.y; }
	
	overlapsAABB(aabb) {
		const a = this.boundsArray;
		const b = aabb.boundsArray;

		if (a[2] < b[0] || a[3] < b[1] || a[0] > b[2] || a[1] > b[3]) return false;
		return true;
	}
}


export { Types, AABB }
