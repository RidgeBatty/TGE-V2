/*

	Simple raytracer for 2D and 2.5D or "fake 3D" games

*/
import { Engine, Types } from './engine.js';	
import { Layer } from './layer.js';
import { Texture } from './texture.js';

const { V2, Vector2:Vec2, LineSegment:Seg } = Types;

const Enum_RaytracerTypes = {
	Default	      : 1,
	LineSegments  : 1,			// renders the map using line segments
	Tiles         : 2,			// renders the map using fixed size tiles (allows only 90 degree angles in walls)
}

class Map {
	constructor(engine) {
		this.engine    = engine;
		this.shapes    = [];
		this.atanCache = [];
	}

	clear() {
		this.shapes.length = 0;
	}
	
	drawRect(o) {
		if (!('textures' in o)) o.textures = [0,0,0,0];
		if (!('flip' in o))     o.flip = false;

		const { x, y, w, h, textures, flip } = o;		
		const p = [V2(x, y), V2(x + w, y), V2(x + w, y + h), V2(x, y + h)];

		for (let i = 0; i < 4; i++) {
			const current = !flip ? i : (3 - i);
			const next    = !flip ? ((i == 3) ? 0 : i + 1) : ((i == 3) ? 3 : 2 - i);

			const seg = new Seg(p[current], p[next]); 
			seg._textureId = textures[i]; 
			this.shapes.push(seg);
		}					
	}
}

class Raytracer extends Layer {
	constructor(params = {}) {
		super({});

		this.params    = params;
		this.map       = new Map(Engine);
		this.culled    = [];
		this.cullIndex = 0;
		this.textures  = [];
		this.type      = Enum_RaytracerTypes.Default;
		this.engine    = Engine;
		this.surface   = Engine.renderingSurface;
		this.focalLength = 1;
		this.rayLength   = 32;

		// "this.position" comes from Layer		
		this.rotation    = 0;
		
		this._useFog	       = true;
		this._useHalfPrecision = true;
		
		this.updateViewport();
	}

	createMap(segments){
		this.map.clear();
		for (const s of segments) this.map.drawRect(s);
	}

	async addTexture(url, name) {
		const t = new Texture(name);
		await t.load(url);
		this.textures.push(t);
		return t;
	}

	addTextures(o) {
		return new Promise((resolve, reject) => {
			for (const t of o) this.addTexture(t.url, t.name).then(tex => {
				if (this.textures.length == o.length) resolve();
			}).catch(e => {
				console.warn('Failed to load image:', t.url);
				reject(t);
			});			
		});
	}
	
	set useFog(value) { if (AE.isBoolean(value)) { this.surface.ctx.globalAlpha = 1.0; this._useFog = value; } }
	get useFog() 	  { return this._useFog; }
	
	set useHalfPrecision(value) { if (AE.isBoolean(value)) { this._useHalfPrecision = value; this.updateViewport(); } }
	get useHalfPrecision() 	  { return this._useHalfPrecision; }
	
	updateViewport() {
		const width  = this.engine.viewport.width;
		const height = this.engine.viewport.height;
		
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
		let rayEnd = Vec2.Up().rotate(angle).mulScalar(rayLength).add(fromPos);
		let ray    = new Seg(fromPos, rayEnd);
			
		let closestLine = { index:-1, dist:Infinity };
		
		for (var i = 0; i < this.cullIndex; i++) {		
			let v = ray.getIntersection(map[i]);
			if (v != null) {				
				let r = Vec2.Distance(ray.p0, v);
				if (r < closestLine.dist) closestLine = { index:i, dist:r, intersectionPoint:v };
			} 			
		}
		
		if (closestLine.index != -1) {	
			let line = map[closestLine.index];
			let v    = closestLine.intersectionPoint;						
			let ofsx = Vec2.Distance(line.p0, v); // ray intersection point relative to length of the map line (texture mapping)
			return { dist:closestLine.dist, texture:line._textureId, ofsx:ofsx - ~~ofsx }					
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
	update() {
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		
		let width = this.engine.dims.x / 2;
		let midY  = this.engine.dims.y / 2;
		
		// cull backfacing walls:		
		let map = this.map.shapes;
		this.cullIndex = 0;
		for (var i = 0; i < map.length; i++) if (!map[i].isLeft(this.position)) this.culled[this.cullIndex++] = map[i];
		
		// raycast the camera fov:		
		for (var x = 0; x < width; x++) {		
			let fov    = this.atanCache[x];
			let result = this.rayCast(this.position, this.rotation + fov, this.rayLength);
			
			if (result != null) {
				let z = result.dist * Math.cos(fov);
				let y = this.engine.screen.height / z;									
				this.textureMapColumn(x, midY - y, midY + y, result);
			}				
		}
		
		this.surface.drawImage(V2(0, 0), this.canvas);	// flip buffers				
	}

	tick() {
		if ('useActor' in this.params) {
			this.position = this.params.useActor.position;
			this.rotation = this.params.useActor.rotation;
		}
	}
}

export { Raytracer, Map, Enum_RaytracerTypes }