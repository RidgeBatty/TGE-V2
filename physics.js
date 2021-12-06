
import * as Types from './types.js';	

const Vector2     = Types.Vector2;
const Zero        = Vector2.Zero();
const LineSegment = Types.LineSegment;

const Enum_PhysicsShape = {
	Circle : 1,
	AABB   : 2,
	Box	   : 3,
	Poly   : 4,
	User   : 99,
}

const PI2 = Math.PI * 2;
/*

	PhysicsShape is the ultimate ancestor class for all physics shapes. 
	Typically the developer should use any of the descendant classes instead of creating PhysicsShape instances.

*/

class PhysicsShape {
	constructor() {
		this.owner       = null;
		this.restitution = 1;
		this.mass		 = 1;
		this._angle      = 0;		
		AE.sealProp(this, 'isEnabled', true);
		AE.sealProp(this, 'data', {});
	}
	
	set angle(rad) {
		this._angle = rad;
	}
	
	get angle() {	
		return ((this._angle % PI2) + PI2) % PI2;
	}	
	
/*
	Applies full transform to (p) resulting in screen space coordinate and returns the new point. The original (p) is not modified.
	actor position
	actor scale 
	actor rotation 
	actor pivot 
	local position
	local rotation
*/
	project(p) {
		var p = p.clone();
		const o = this.owner;
		if (this._angle != 0) 		  p.rotate(this._angle);		
		p.add(this.position);
		p.add(o.pivot);				
		if (o.rotation != 0) p.rotate(o.rotation);				
		p.mulScalar(o.scale);
		p.add(o.position);		
		
		return p;
	}

/*
	Test if PhysicsShapes A and B overlap each other
*/
	static Overlaps(a, b) {	// a:PhysicsShape, b:PhysicsShape, return:boolean
		switch (b.type) {
			case Enum_PhysicsShape.Circle: return a.overlapsCircle(b); break;
			case Enum_PhysicsShape.AABB:   return a.overlapsAABB(b); break;
			case Enum_PhysicsShape.Box:    return a.overlapsBox(b); break;
			case Enum_PhysicsShape.Poly:   return a.overlapsPoly(b);  break;	
		}
	}	
	
/*
	Test if PhysicsShapes A and B will collide
*/
	static Collide(a, b) { // a:PhysicsShape, b:PhysicsShape, return:boolean
		if (b.type == Enum_PhysicsShape.Poly)   return a.collidePoly(b);				
	}
}

/*

	Circle with position point and radius.

*/
class Circle extends PhysicsShape {
	constructor(position, radius) { 	// position:Vector2, radius:number, return:Circle	
		super();
		Object.assign(this, { position, radius });		
		this.type = Enum_PhysicsShape.Circle;
	}
	/* 
	
	collideCircle(c) {					// c:Circle
		Circle.CollideCircle(this, c);
	}
	
		Calculate the collision of two circles c1 and c2 and update their velocities accordingly.
		Note! This method does NOT determine whether the circles *should* collide. It assumes this is done prior to calling this method.
		TO-DO: PhysicsShape does not have velocity any more!!!
	static CollideCircle(c1, c2) { 		// c1:Circle, c2:Circle		
		var tangent = new Vector2(c2.position.y - c1.position.y, -(c2.position.x - c1.position.x)).normalize();		
		var rVelo   = new Vector2(c1.velocity.x - c2.velocity.x, c1.velocity.y - c2.velocity.y);
		var len     = Vector2.Dot(rVelo, tangent);
		var fVelo   = Vector2.MulScalar(tangent, len);
		var pTan    = rVelo.sub(fVelo);
		c1.velocity.add(pTan.mulScalar(c1.restitution));		
		c2.velocity.sub(pTan.mulScalar(c2.restitution));				
	}
	*/	
	
	/*
		Returns true if point 'p' (screen space) is inside the this circle.
	*/
	isPointInside(p) {					// p:Vector2, return:boolean
		const point = this.project(Zero);		
		return (this.radius * this.owner.scale) > Math.sqrt((p.x - point.x) ** 2 + (p.y - point.y) ** 2);
	}
	
	overlapsCircle(b) {		
		const apos = this.project(Zero);
		const bpos = b.project(Zero);
				
		const dist = Math.sqrt((apos.x - bpos.x) ** 2 + (apos.y - bpos.y) ** 2);
				
		return dist < (this.radius * this.owner.scale + b.radius * b.owner.scale);
	}
	
	overlapsAABB(b) {
		const a    = this;
		const apos = this.project(Zero);
		const bpos = b.project(Zero);
		
		var amaxX = bpos.x + b.halfSize.x;
		var amaxY = bpos.y + b.halfSize.y;
		var aminX = bpos.x - b.halfSize.x;
		var aminY = bpos.y - b.halfSize.y;
			
		var x = Math.max(aminX, Math.min(apos.x, amaxX));
		var y = Math.max(aminY, Math.min(apos.y, amaxY));
		var dist = Math.sqrt((x - apos.x) ** 2 + (y - apos.y) ** 2);  
		
		return dist < a.radius;		
	}
	
	overlapsBox(box) {		
		return box.overlapsCircle(this);
		//return (b.isPointInside(Vector2.Add(this.owner.position, this.position))) 
	}	
	
	overlapsPoly(poly) {		
		return poly.overlapsCircle(this);
		//return (b.isPointInside(Vector2.Add(this.owner.position, this.position))) 
	}	
	
	collidePoly(poly) {
		poly.collideCircle(this);
	}
}

/*

	Axis aligned bounding box
	WARNING! Do not use this class for physics calculations. AABB's will not respond to actor/physicsshape transform, i.e. they cannot be scaled nor rotated. Use 'Box' class instead.
	
*/
class AABB extends PhysicsShape {
	constructor(position, size) { // position:Vector2, size:Vector2
		if ( !Vector2.IsVector2(position) || !Vector2.IsVector2(size)) throw 'PhysicsShape parameters must be Vector2 type';
		super();
		Object.assign(this, { position, size });		
		this.type     = Enum_PhysicsShape.AABB;
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
		
		a[0] += this.owner.position.x + this.owner.pivot.x;
		a[1] += this.owner.position.y + this.owner.pivot.y;
		a[2] += this.owner.position.x + this.owner.pivot.x;
		a[3] += this.owner.position.y + this.owner.pivot.y;
		
		b[0] += aabb.owner.position.x + this.owner.pivot.x;
		b[1] += aabb.owner.position.y + this.owner.pivot.y;
		b[2] += aabb.owner.position.x + this.owner.pivot.x;
		b[3] += aabb.owner.position.y + this.owner.pivot.y;

		if (a[2] < b[0] || a[3] < b[1] || a[0] > b[2] || a[1] > b[3]) return false;
		return true;
	}
	
	overlapsCircle(b) {
		return b.overlapsAABB(this);
	}
		
	overlapsBox(other) {
		return false;
	}
}

/*

	Box class
	Rectangle which can have full transform applied
	
*/
class Box extends AABB {
	constructor(position, size, angle = 0) { // position:Vector2, size:Vector2, angle:number
		super(position, size);
		
		this._angle = angle;
		this.type   = Enum_PhysicsShape.Box;	
		
		const hs    = this.halfSize;
		this.points = [new Vector2(-hs.x, -hs.y), new Vector2(hs.x, -hs.y), new Vector2(hs.x, hs.y), new Vector2(-hs.x, hs.y)];
	}

	/*
		Applies full transform to all points of this polygon. Returns a new array with copies of points.
	*/
	get projectedPoints() {				
		var result = [];
		for (var i = 0; i < this.points.length; i++) result[i] = this.project(this.points[i]);		
		return result;
	}
		
	/* 
		Returns the rotation of the box relative to screen. The returned angle is between 0..2PI
	*/
	get screenAngle() {	// return:number
		var v1 = this.project(this.points[0]);
		var v2 = this.project(this.points[3]);
		v1.sub(v2);
		return Math.PI - Math.atan2(v1.x, v1.y);
	}
	
	/*
		Given point 'p' must be in screen space. 
		This method projects the box into screen space and checks if a line drawn from the center of the box to the given point intersects
		any edge of the box. If an intersection is found (p) is outside the box.
	*/	
	isPointInside(p) {				// p:Vector2, return:boolean				
		const b      = this.projectedPoints;				
		const center = this.project(Zero);
		
		var lines = [new LineSegment(b[0], b[1]), new LineSegment(b[1], b[2]), new LineSegment(b[2], b[3]), new LineSegment(b[3], b[0])];
		
		var fromCenterToPoint = new LineSegment(center, p);
		for (var i = 0; i < lines.length; i++) {
			if (lines[i].intersectsLine(fromCenterToPoint)) return false;
		}
		return true;
	}
	
	overlapsCircle(c) {
		const circleCenter = c.project(Zero);
		const boxCenter    = this.project(Zero);
		var b        = this.projectedPoints;
		var boxAngle = this.screenAngle;

		// rotate the circle to match the box rotation:
		var fromBoxToCircle = circleCenter.clone().sub(boxCenter).rotate(-boxAngle).add(boxCenter);
				
		// rotate the box to be axis aligned:		
		for (var i = 0; i < b.length; i++) b[i] = b[i].sub(boxCenter).rotate(-boxAngle).add(boxCenter);
		
		var edgeX = Math.max(b[0].x, Math.min(fromBoxToCircle.x, b[1].x));
		var edgeY = Math.max(b[0].y, Math.min(fromBoxToCircle.y, b[2].y));
		
		var dist  = Math.sqrt((edgeX - fromBoxToCircle.x) ** 2 + (edgeY - fromBoxToCircle.y) ** 2);  
		
		return dist < c.radius * c.owner.scale; 		
	}
	
	overlapsPoly(poly) {
		return false;
	}
	
	overlapsBox(box) {
		const a = this.projectedPoints;
		const b = box.projectedPoints;
		
		const linesA = [new LineSegment(a[0], a[1]), new LineSegment(a[1], a[2]), new LineSegment(a[2], a[3]), new LineSegment(a[3], a[0])];
		const linesB = [new LineSegment(b[0], b[1]), new LineSegment(b[1], b[2]), new LineSegment(b[2], b[3]), new LineSegment(b[3], b[0])];
				
		/*
			1. Is any point of box A inside box B?
			Complete explanation: if any point of box A is on the right side of all the lines of box B, the point is inside box B.
		*/
		let count;
		for (const point of a) {
			count = 0;
			for (const l of linesB) if (!l.isLeft(point)) count++;				
			if (count == 4) return true;
		}
		
		/*
			2. Is any point of box B inside box A?			
		*/
		for (const point of b) {
			count = 0;
			for (const l of linesA) if (!l.isLeft(point)) count++;				
			if (count == 4) return true;
		}
		
		/*
			Any line intersections between the boxes?
		*/
		for (const la of linesA) for (const lb of linesB) if (la.intersectsLine(lb)) return true;			
						
		return false;
	}
}

/*
	Polygon class
*/
class Poly extends PhysicsShape {
	constructor(position, angle = 0) { // position:Vector2, angle:number		
		super();
		Object.assign(this, { position, _angle:angle });
		this.type   = Enum_PhysicsShape.Poly;
		this.points = [];
		this.invalidate();	// reset cached points for the current frame
	}
	
	/*
		Resets projected points cache (this is designed to be used internally by Poly class)
	*/	
	invalidate() {
		this._projectedPointsCache = [];
		this._linesCache = [];
	}
	
	/*
		Applies full transform to all points of this polygon. Returns a new array with copies of points.
	*/
	get projectedPoints() {		
		if (this._projectedPointsCache.length == 0) {
			var result = [];
			for (var i = 0; i < this.points.length; i++) result[i] = this.project(this.points[i]);		
			this._projectedPointsCache = result;
		} else result = this._projectedPointsCache;
		return result;
	}

	/**
		Creates points of polygon from flat array of values [x0, y0, x1, y1, x2, y2...] converting them to Vector2
	*/
	fromArray(arr) { // arr:[number]
		if ( !Array.isArray(arr)) throw 'Parameter must be an array';
		if (arr.length % 2 == 0) {
			this.points.length = arr.length / 2;
			for (var i = 0; i < arr.length / 2; i++) {				
				
				this.points[i] = new Vector2(arr[i * 2], arr[i * 2 + 1]);				
			}
		}
	}	

	/*	
		Is point inside a polygon?
		
		MIT license
		ray-casting algorithm based on
		// http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
		modified by Ridge Batty to work with Vector2 type
		
		Point in local space (p) 
	*/
	isPointInside(p) {	
		const vs  = this.projectedPoints;
		
		var inside = false;		
		for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
			var xi = vs[i].x, yi = vs[i].y;
			var xj = vs[j].x, yj = vs[j].y;

			var intersect = ((yi > p.y) != (yj > p.y))
				&& (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi);
			if (intersect) inside = !inside;
		}
		
		return inside;		
	}
	
	overlapsCircle(circle) {		
		// first check if the circle center point is inside the polygon
		var isCircleCenterInsidePoly = this.isPointInside(circle.project(Zero));
		if (isCircleCenterInsidePoly) return true;

		// if no overlap: check if any of the polygons lines overlap the circle
		this.invalidate(); // clear projected points		
		var center = circle.project(Zero);
		const vs   = this.projectedPoints;		
		for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {			
			var ls = new LineSegment(vs[i], vs[j]);
			this._linesCache.push(ls);
			if (ls.intersectsCircle(center, circle.radius * circle.owner.scale)) return true;
		}		
		
		return false;		
	}
	
	collideCircle(circle) {
		if (this.overlapsCircle(circle)) {	// this call will fill the cache
			const ls = this._linesCache;
			
		}		
		return false;
	}
	
	overlapsBox(box) {
		var boxPoints  = box.projectedPoints;
		var polyPoints = this.projectedPoints;
		
		// check if line segments of box and polygon overlap:
		function makeLines(p) {
			var lines = [];
			for (var i = 0; i < p.length; i++) lines[i] = new LineSegment(p[i], p[(i == p.length - 1) ? 0 : i + 1]);			
			return lines;
		}
		
		function test() {
			for (var i = 0; i < boxLines.length; i++) {
				for (var j = 0; j < polyLines.length; j++) {
					if (boxLines[i].intersectsLine(polyLines[j])) return true;
				}
			}
			return false;
		}
		
		var boxLines = makeLines(boxPoints);
		var polyLines = makeLines(polyPoints);
				
		if (test()) return true;
		
		// check if any point of the box is inside the polygon:
		for (var i = 0; i < boxPoints.length; i++) {
			var n = this.isPointInside(boxPoints[i]);			
			if (n) return true;
		}		
		return false;
	}
}

export { Types, Enum_PhysicsShape, PhysicsShape, Circle, AABB, Box, Poly }