/*

	Simple raytracer for 2D and 2.5D or "fake 3D" games

*/
import { Types } from './engine.js';	

const Vector2 = Types.Vector2;
const Seg     = Types.LineSegment;

const Enum_RaytracerTypes = {
	Default		  : 1,
	Wolfenstein3D : 1,			// restricted to single height level, all walls are equal height
}

class Map {
	constructor(engine) {
		this.engine    = engine;
		this.shapes    = [];
		this.atanCache = [];
	}
	
	drawRect(a, b, w, h, flip) {
		let map = this.shapes;
		
		let p0 = new Vector2(a, b);
		let p1 = new Vector2(a + w, b);
		let p2 = new Vector2(a + w, b + h);
		let p3 = new Vector2(a, b + h);
		
		if (!flip) {
			map.push(new Seg(p0, p1));
			map.push(new Seg(p1, p2));
			map.push(new Seg(p2, p3));
			map.push(new Seg(p3, p0));
		} else {
			map.push(new Seg(p0, p3));
			map.push(new Seg(p3, p2));
			map.push(new Seg(p2, p1));
			map.push(new Seg(p1, p0));	
		}
	}
}

class Raytracer {
	constructor(engine) {
		this.map       = new Map(engine);
		this.culled    = [];
		this.cullIndex = 0;
		this.textures  = [];
		this.type      = Enum_RaytracerTypes.Default;
		this.engine    = engine;
		this.surface   = engine.world.surface;
		this.focalLength = 1;
		this.rayLength   = 32;
		
		this._useFog	       = true;
		this._useHalfPrecision = true;
		
		this.updateViewport();
	}
	
	set useFog(value) { if (AE.isBoolean(value)) { this.surface.ctx.globalAlpha = 1.0; this._useFog = value; } }
	get useFog() 	  { return this._useFog; }
	
	set useHalfPrecision(value) { if (AE.isBoolean(value)) { this._useHalfPrecision = value; this.updateViewport(); } }
	get useHalfPrecision() 	  { return this._useHalfPrecision; }
	
	updateViewport() {
		const width  = this.engine.screen.width;
		const height = this.engine.screen.height;
		
		let w = this._useHalfPrecision ? (width >> 1) : width;		
		this.atanCache = new Array(w);
		for (var x = 0; x < w; x++) this.atanCache[x] = Math.atan2((x / w - 0.5), this.focalLength);
		
		if (this.canvas == null) {
			this.canvas = new OffscreenCanvas(width, height);
			this.ctx    = this.canvas.getContext('2d');
		} else {
			this.canvas.width  = width;
			this.canvas.height = height;
		}
	}
	
	rayCast(fromPos, angle, rayLength) {		
		let map    = this.culled;
		let rayEnd = Vector2.Up().rotate(angle).mulScalar(rayLength).add(fromPos);
		let ray    = new Seg(fromPos, rayEnd);
			
		let closestLine = { index:-1, dist:Infinity };
		
		for (var i = 0; i < this.cullIndex; i++) {		
			let v = ray.getIntersection(map[i]);
			if (v != null) {				
				let r = Vector2.Distance(ray.p0, v);
				if (r < closestLine.dist) closestLine = { index:i, dist:r, intersectionPoint:v };
			} 			
		}
		
		if (closestLine.index != -1) {	
			let line = map[closestLine.index];
			let v    = closestLine.intersectionPoint;						
			let ofsx = Vector2.Distance(line.p0, v); // ray intersection point relative to length of the map line (texture mapping)
			return { dist:closestLine.dist, texture:0, ofsx:ofsx - ~~ofsx }					
		}
	}
	
	textureMapColumn(x, startY, endY, info) {			
		let tex  = this.textures[info.texture].canvas;	
		let ctx  = this.ctx;
		
		if (this._useFog) 	        ctx.globalAlpha = 1.0 - info.dist / this.rayLength;	// distance fog		
		if (this._useHalfPrecision) ctx.drawImage(tex, ~~(info.ofsx * tex.width ), 0, 1, tex.height, x * 2, startY, 2, endY - startY); // texture mapping half precision
			else ctx.drawImage(tex, ~~(info.ofsx * tex.width), 0, 1, tex.height, x, startY, 1, endY - startY); // texture mapping full precision
	}
	
	/*
		Renders a frame by interating each pixel column on the display
	*/
	renderFrame(pos, angle) {
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		
		let width = this.engine.screen.width / 2;
		let midY  = this.engine.screen.height / 2;
		
		// cull backfacing walls:		
		let map = this.map.shapes;
		this.cullIndex = 0;
		for (var i = 0; i < map.length; i++) if (!map[i].isLeft(pos)) this.culled[this.cullIndex++] = map[i];
		
		// raycast the camera fov:		
		for (var x = 0; x < width; x++) {		
			let fov    = this.atanCache[x];
			let result = this.rayCast(pos, angle + fov, this.rayLength);
			
			if (result != null) {
				let z = result.dist * Math.cos(fov);
				let y = this.engine.screen.height / z;									
				this.textureMapColumn(x, midY - y, midY + y, result);
			}				
		}
		
		this.surface.ctx.drawImage(this.canvas, 0, 0);	// flip buffers		
	}
}

export { Raytracer, Map, Enum_RaytracerTypes }