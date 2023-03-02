/*

	Renders and maintains a 2D tile based game map
	Note!
	By default, tileMapRenderer does not check for collisions. In typical retro arcade games the collision checks are very minimal.
	You can simply say "player.overlapsWith(renderer)" in player's tick event to check if the player overlaps with any obstacles.

	OptimizedColliders is generated using tilemap data, where each tile may have its own set of colliders at the class level. 
	Meaning that tile number 1 will always have the same colliders, no matter how many times or where on the map an instance of the tile is placed.

	The colliders must be static, as in permanently "attached" to the tile.

	Built-in strategies for generating optimizedColliders
	- optViewport 				This is the default method. Loop through the tiles which are currently in the viewport to generate the collider information.
								Pros: efficient as in only checks for tiles which are in the viewport. Cons: new collider shapes need to be generated because there are no existing instances

	Isometric projection mode (TileMapRenderer.projectionMode). This attribute determines how the map tiles are projected on the screen:
		- "zigzag" 		Projected map is not rotated forming a rectangle shape.
		- "angle"	    Projected map is rotated 45 degrees clockwise forming a diamond shape.		

*/
import { Collider, Engine, Events, Types } from './engine.js';	
import { CustomLayer } from './customLayer.js';
import { TileMap } from './tileMap.js';
import { Box, Circle, Poly } from './physics.js';
import { Flipbook } from './flipbook.js';

const { V2, Vector2 : Vec2, LineSegment, Rect } = Types;

const ImplementsEvents = 'beginoverlap endoverlap createprop resize';

class Flags {
	#owner;
	#isometric;
	constructor(owner, o = {}) {
		this.#owner = owner;	
		for (const [k, v] of Object.entries(o)) {
			if (k == 'isometric') this.#isometric = v;
				else this[k] = v;
		}

		//this.#owner.prototype.update = (this.isometric) ? this.#owner.renderIsometric : this.#owner.renderAxisAligned;
	}

	get isometric() {
		return this.#isometric;
	}

	set isometric(v) {
		if (v === true) {
			this.#isometric = true;
			//this.owner.update = this.renderIsometric;
		} else {
			this.#isometric = false;
			//this.owner.update = this.renderAxisAligned;
		}
	}
}

class TileMapRenderer extends CustomLayer {
	/**
	 * 
	 * @param {object} params 
	 * @param {Engine} params.engine Engine reference
	 * @param {Vector2} params.offset Offset in pixels
	 * @param {TileMap} params.tileMap TileMap reference
	 * @param {Actor} params.target Actor whose coordinates the rendered should follow
	 */
	constructor(params = {}) {		
		super(Object.assign(params, { addLayer:true }));

		this.engine    		= ('engine' in params) ? params.engine : Engine;                    			// implementing it this way makes it easier to change the Engine reference if needed 		
		this.world.offset   = ('offset' in params) ? params.offset : this.engine.dims.mulScalar(0.5);
		this.world.renderer = this;
		
		this.params    = params;
		this.map       = new TileMap(params.tileMap);
		this.time      = 0;
		this.colliders = new Collider({ owner:this });		
		this.events    = new Events(this, ImplementsEvents);			
		this.flags     = new Flags(this, {
			ownerDraw     : true,
			showColliders : true,			
			clearBuffer   : false,			
			isometric     : ('isometric' in params) ? params.isometric : false,
		});		
		this.cursor    = V2(-1, -1);																// x/y coordinates of last selected map tile		
		this.optimizedColliders = [];
		this.objectType         = 'renderer';
		this.objectZLayer       = ('objectZLayer' in params) ? params.objectZLayer : this.zIndex;	// on which layer the objects should be rendered on?
		this.staticActors       = [];		
		this.projectionMode     = 'angle';															// "zigzag", "angle"
		this._aspectRatio       = 0.5;
		this.tileSize           = 256;
				
		this.updateViewport();																		// acquire canvasSurface
		this.buffer.name        = 'TileMapRenderingBuffer';

		this.engine.events.add('resize', _ => { 
			this.buffer.setCanvasSize(this.engine.screen.width, this.engine.screen.height);
		});
	}

	/**
	 * Tile size Y / X
	 */
	get aspectRatio() {
		return this._aspectRatio;
	}
	
	/**
	 * Converts given screen space coordinates into texture space
	 * @param {number} id Texture ID 
	 * @param {Vector2} p Point in screen space	 
	 * @returns 
	 */
	toTextureSpace(id, p) {
		const tex = this.tileMap.textures[id];
		const px = p.x / tex.width;
		const py = p.y / tex.height - 0.5;
		return V2(px - py, py + px);
	}	

	/**
	 * Clears actors and the tilemap
	 */
	clear(options) {
		this.map.clear(options);
		
		for (const actor of this.staticActors) {
			actor.destroy();
			Engine.gameLoop.removeActor(actor);
		}
		this.staticActors.length = 0;		
	}

	update() {		
		if (this.flags.isometric) this.renderIsometric(); else this.renderAxisAligned();
	}

	get renderPosition() {
		const pos = this.position.clone();			
		pos.sub(this.world.camPos);		

		return pos;
	}

	get hasColliders() {
		return true;
	}

	get canvas() {
		return this.buffer.canvas;
	}

	/**
	 * Get the buffer rectangle projected in tile space (viewing frustum) as an Array of 4 LineSegments.
	 * @returns {[LineSegment]}
	 */
	get frustum() {
		const a = this.unProject(V2(0, 0));
		const b = this.unProject(V2(this.buffer.width, 0));
		const c = this.unProject(V2(this.buffer.width, this.buffer.height));
		const d = this.unProject(V2(0, this.buffer.height));
		return [
			new LineSegment(a, b),
			new LineSegment(b, c),
			new LineSegment(c, d),
			new LineSegment(d, a),
		]
	}

	/**
	 * Returns true if given tile coodinates are inside the viewing frustum	 
	 * @param {Vector2} t Point in tile space
	 * @param {[LineSegment]=} f Optional. Custom viewing frustum rectangle. If not given, method uses the rendering buffer's dimensions
	 */
	isInsideFrustum(t, f = this.frustum) {		
		return !(f[0].isLeft(t) || f[1].isLeft(t) || f[2].isLeft(t) || f[3].isLeft(t));
	}

	/**
	 * Returns the bounding box for viewing frustum (which can be used to hugely optimize the rendering by limiting the need to traverse the map tiles)
	 * @param {[LineSegment]=} f Optional. Custom viewing frustum rectangle. If not given, method uses the rendering buffer's dimensions
	 * @returns 
	 */
	getFrustumBoundingBox(f = this.frustum) {
		const top    = Math.min(f[0].p0.y, f[1].p0.y, f[2].p0.y, f[3].p0.y);
		const bottom = Math.max(f[0].p0.y, f[1].p0.y, f[2].p0.y, f[3].p0.y);
		const left   = Math.min(f[0].p0.x, f[1].p0.x, f[2].p0.x, f[3].p0.x);
		const right  = Math.max(f[0].p0.x, f[1].p0.x, f[2].p0.x, f[3].p0.x);
		return new Rect(left, top, right, bottom);
	}

	/**
	 * Loads a map file in memory and then calls TileMap.LoadFromFile() which extracts tilemap data and texture information.
	 * It then proceeds to parse static objects (and potentially other non-tilemap/texture data from the same file)
	 */
	async loadMap(options) {																					
		const o = await TileMap.LoadFromFile(options);														// load tilemap/texture data			
		if (o.data.objects) this.parseStaticActorsFromObject(o.data.objects);								// load static actors from map file "objects" collection
		if (o.data.tileSize) this.tileSize = o.data.tileSize;

		this.map = o.map;

		return o;
	}	

	async parseStaticActorsFromObject(objects) {
		console.warn('Parsing actors...');
		console.log(objects);

		for (const o of objects) {
			const texture  = this.map.textures[o.texture];	
			
			for (const p of o.positions) {					
				const params = {
					name     : o.name,						
					origin   : ('origin' in o) ? V2(o.origin.x, o.origin.y) : V2(-0.5, -0.5),
					zIndex   : this.objectZLayer,
					scale    : (p[2] != null) ? p[2] : ('scale' in o) ? o.scale : 1,
					rotation : (p[3] != null) ? p[3] : 0,						
				}					
				if ('texture' in o) { params.img = texture.canvas };
				if ('url' in o)     { params.imgUrl = o.url; };
								
				this.addStaticActor(V2(p[0], p[1]), params, null, async (actor) => {
					if (p != null) {
						if (p[4] != null) {																					// 4th value is mirror: 1 = x, 2 = y, 3 = x+y
							if ((p[4] & 1) == 1) actor.renderHints.mirrorX = true;
							if ((p[4] & 2) == 2) actor.renderHints.mirrorY = true;					
						}
						if (p[5] != null) {																					// 5th value is offset
							actor.offset.set({ x:p[5], y:p[6] });
						}
					}
					
					if ('flipbooks' in o) actor.flipbooks = await Flipbook.Parse(o.flipbooks, actor);					// load flipbooks

					if (o.colliders) {																					// create colliders (if any)
						actor.hasColliders = true;
						actor.colliderType = 'WorldStatic';
						const colliders    = Collider.Parse(o.colliders);
						for (const c of colliders) actor.colliders.add(c);						
					}						
				});			
			}				
		}
	}

	/**
	 * Adds a new static actor in the current gameLoop and links it to this tileMap	 
	 * @param {Vector2} position In map coordinates (tiles)
	 * @param {object} o Standard Actor create parameters	 	 
	 * @param {object} staticActorParams parameters related to static actors only 
	 * @param {function} onAfterCreate Optional callback function. Called before the created actor is inserted in the gameLoop
	 */
	async addStaticActor(position, o = {}, staticActorParams, onAfterCreate) {
		const { map } = this;	

		const params = {
			position : (this.flags.isometric) ? this.project(position, true).add(V2(this.tileSize * 0.5, this.tileSize * 0.5)) : position.mul(this.tileSize).toInt(),
			surface  : this.buffer,	
		}
		Object.assign(params, o);

		const actor = this.engine.gameLoop.createTypedActor('obstacle', params);							// create the actor		
		if (onAfterCreate) onAfterCreate(actor);

		if (params.mirrorX) actor.renderHints.mirrorX = true;
		if (params.mirrorY) actor.renderHints.mirrorY = true;											

		await this.engine.gameLoop._addActor(actor);														// add the actor in the gameloop		
		if (o.flipbooks) actor.flipbooks = await Flipbook.Parse(o.flipbooks, actor);						// load flipbooks

		if (staticActorParams) this.generateStaticActorRenderInfo(actor, staticActorParams);

		this.staticActors.push(actor);																		// add to staticActors array
		this.events.fire('createprop', { prop:actor });														// fire 'prop created' event

		return actor;
	}

	/**
	 * 
	 * @param {StaticActor} actor 
	 * @param {object} o parameters object
	 */
	generateStaticActorRenderInfo(actor, o) {			
        const r         = actor.renderPosition;
        const startTile = this.unProject(r).add(o.floorOrigin ? o.floorOrigin : V2(0, 0));        
        const endTile   = startTile.clone().add(o.floor ? o.floor : V2(0, 0));

        const st = V2(Math.min(startTile.x, endTile.x), Math.min(startTile.y, endTile.y));
        const et = V2(Math.max(startTile.x, endTile.x), Math.max(startTile.y, endTile.y));            

        const f1 = this.project(V2(st.x + 0.5, st.y - 0.5)); // top
        const f2 = this.project(V2(et.x + 0.5, st.y - 0.5)); // right    
        const f3 = this.project(V2(et.x + 0.5, et.y - 0.5)); // bottom  
        const f4 = this.project(V2(st.x + 0.5, et.y - 0.5)); // left
            
		actor.renderInfo = {
        	startTile : st,
        	endTile   : et,
        	corners   : [f1.sub(r), f2.sub(r), f3.sub(r), f4.sub(r)]
		}
	}

	destroyStaticActors(actors) {
		for (const a of actors) a.destroy();

		const sa = this.staticActors;
		for (let i = sa.length; i--;) {
			const index = actors.indexOf(sa[i]);
			if (index > -1) {
				sa.splice(i, 1);
				actors.splice(index, 1);
			}
		}
	}

	/**
	 * Warning! Crude, inefficient and inccurate! 
	 * TO-DO: Add support for rotation, optimize by subdividing map and placing static actors in their respective quadrants instead of a single array
	 * @returns 
	 */
	getViewportStaticActors() {
		const r = [];
		const v = this.viewport;

		for (const a of this.staticActors) {			
			const size = a.size.clone().mulScalar(a.scale);
			
			const p0 = a.renderPosition.add(Vec2.Mul(V2(0, 0).add(a.origin), size));
			//const p1 = a.renderPosition.add(Vec2.Mul(V2(1, 0).add(a.origin), size));
			const p2 = a.renderPosition.add(Vec2.Mul(V2(1, 1).add(a.origin), size));
			//const p3 = a.renderPosition.add(Vec2.Mul(V2(0, 1).add(a.origin), size));
			
			if (Rect.FromVectors(p0, p2).overlapsWith(v)) r.push(a);
		}
		return r;
	}

	getTileAtCoords(p) {
		const { map, position, world } = this;

		const size = this.tileSize;

		if (this.flags.isometric) var p = this.unProject(p);		
		var x = ~~(p.x / size);
		var y = ~~(p.y / size);			
		
		return this.map.tileAt(x, y);
	}

	/**
	 *	Renders the map iterating over each row and column in map.tiles array and drawing the corresponding tile texture
	 */
	renderAxisAligned() {
		const { map, canvas, position, world } = this;
		
		const ctx    = this.buffer.ctx;		
		const size   = this.tileSize;
		const camPos = (world == null) ? position : world.camPos;

		ctx.resetTransform();
		if (this.flags.clearBuffer) ctx.clearRect(0, 0, canvas.width, canvas.height);

		this.events.fire('beforedraw', { renderer:this, ctx });

		for (let y = 0; y < map.height; y++) {			
			const top  = y * size - ~~camPos.y;

			if (!((top + size) < 0 || top > canvas.height)) 
			for (let x = 0; x < map.width; x++) {
				const left = x * size - ~~camPos.x;
				
				if (!((left + size) < 0 || left > canvas.width)) {	
					const tile = map.tileAt(x, y);
					if (this.flags.ownerDraw) ctx.drawImage(map.textures[tile].canvas, left, top);
					this.events.fire('customdraw', { renderer:this, x, y, ctx, tileId:tile, drawPos:V2(x * size - camPos.x, y * size - camPos.y) });
				}
			}						
		}

		this.events.fire('afterdraw', { renderer:this, ctx });
	}

	/**
	 * Converts tile coordinates to screen coordinates. Uses this.isometricProjection attribute to determine how the tiles are laid on the screen.
	 * @param {Vector2} c Tile coordinates	 
	 */	
	project(c, ignoreCamPos) {
		const x = c.x;
		const y = c.y;
		
		if (!ignoreCamPos) var camPos = (this.world == null) ? this.position : this.world.camPos;
			else var camPos = Vec2.Zero();

		const size   = this.tileSize;
		if (this.projectionMode == 'zigzag') {
			const top    = (y * size * 0.25)                       - ~~camPos.y - size * 0.5;
			const left   = (x * size * 1) + ((y % 2) * size * 0.5) - ~~camPos.x - size;
			return V2(left, top);
		} 
		if (this.projectionMode == 'angle') {			
			const top  = (y * size * 0.25) + (x * size * 0.25) - ~~camPos.y - size * 0.25;
			const left = (x * size * 0.5)  - (y * size * 0.5)  - ~~camPos.x - size * 0.5;			
			return V2(left, top);
		}		
	}

	/**
	 * 
	 * @param {Vector2} c Screen coordinates
	 * @returns 
	 */
	unProject(c, ignoreCamPos) {
		const {x, y} = c;

		if (!ignoreCamPos) var camPos = (this.world == null) ? this.position : this.world.camPos;
		else var camPos = Vec2.Zero();

		const size   = this.tileSize;
		if (this.projectionMode == 'angle') {			
			const top    = y / size * 2 - x / size + 0.5 + camPos.y / size * 2 - camPos.x / size;
			const left   = x / size + y / size * 2 + 0.5 + camPos.y / size * 2 + camPos.x / size;
			return V2(left, top);
		}		
	}

	renderIsometric() {
		const { map, canvas, position, world } = this;
		
		const ctx    = this.buffer.ctx;		
		const size   = this.tileSize;
		const camPos = (world == null) ? position : world.camPos;
		
		ctx.resetTransform();
		if (this.flags.clearBuffer) ctx.clearRect(0, 0, canvas.width, canvas.height);

		const cW  = canvas.width;
		const cH  = canvas.height;
		
		const fbb = this.getFrustumBoundingBox();
		const eX  = Math.min(Math.round(fbb.right), map.width);
		const eY  = Math.min(Math.round(fbb.bottom), map.height);		
		const sX  = Math.max(Math.round(fbb.left), 0);
		const sY  = Math.max(Math.round(fbb.top), 0);		
		
		this.events.fire('beforedraw', { renderer:this, ctx });		

		let imageDataPending = 0;

		for (let y = sY; y < eY; y++) {			
			for (let x = sX; x < eX; x++) {								
				const p = this.project(V2(x, y));
				
				if ((p.y + size) < 0 || p.y > cH || (p.x + size) < 0 || p.x > cW) continue;

				const id = map.tileAt(x, y);
				const s  = map.textures[id]?.meta.shift || Vec2.Zero();				
				p.add(s);

				const tileId     = id & 255;
				const hasOverlay = id > 255;
				const overlayId  = (id >> 8) - 1;
				const tex        = map.textures[tileId];
				
				if (this.flags.ownerDraw && tex) {		
					if (tex.canvas.width == 0 || tex.canvas.height == 0) imageDataPending++;
						else
					ctx.drawImage(tex.canvas, p.x, p.y);												

					if (hasOverlay && map.overlays[overlayId]) {							
						ctx.drawImage(map.overlays[overlayId].canvas, p.x, p.y);
					}
				}				
				this.events.fire('customdraw', { renderer:this, x, y, ctx, tileId, overlayId, drawPos:p });				
			}
		}

		if (imageDataPending > 0) console.log(imageDataPending + ' images pending!'); // this happens when tiles are not yet loaded (flipped tiles are reloaded, flipped but not awaited!)

		this.events.fire('afterdraw', { renderer:this, ctx });
	}

	/**
     * Collision detection optimization. Enable only those colliders which are currently inside the viewport	
	 */
	_generateAxisAlignedColliders() {
		const { map, engine, canvas } = this;
		const size   = this.tileSize;
		const camPos = 'world' in engine ? engine.world.camPos : this.position;		
		const cw     = canvas.width;
		const ch     = canvas.height;
		this.optimizedColliders.length = 0;

		for (let y = 0; y < map.height; y++) {
			const top = y * size - ~~camPos.y;

			if (!((top + size) < 0 || top > ch)) for (let x = 0; x < map.width; x++) {				
				const left   = x * size - ~~camPos.x;
				const tileId = map.tileAt(x, y);
				
				const cList  = map.colliders[tileId];
				
				if (cList) for (const c of cList) {					
					if (!(c && (!((left + size) < 0 || left > cw)))) continue;

					const ofs = c.position.clone().add(camPos).add(V2(left, top));
				
					if (c instanceof Box)    var collider = new Box(ofs, c.size.clone()); else						
					if (c instanceof Circle) var collider = new Circle(ofs, c.radius);    else
					if (c instanceof Poly) {
						var collider = new Poly(ofs);
						collider.points = c.points;													// points are shared
					}

					collider.owner = this;
					this.optimizedColliders.push(collider);					
				}
			}		
		}
	}

	_generateIsometricColliders() {
		const { map, canvas, position, world } = this;
		
		const size   = this.tileSize;
		const camPos = (world == null) ? position : world.camPos;
		const cW     = canvas.width;
		const cH     = canvas.height;

		const fbb = this.getFrustumBoundingBox();
		const eX  = Math.min(Math.round(fbb.right), map.width);
		const eY  = Math.min(Math.round(fbb.bottom), map.height);		
		const sX  = Math.max(Math.round(fbb.left), 0);
		const sY  = Math.max(Math.round(fbb.top), 0);		
				
		for (let y = sY; y < eY; y++) {			
			for (let x = sX; x < eX; x++) {
				const p = this.project(V2(x, y));
				
				if ((p.y + size) < 0 || p.y > cH || (p.x + size) < 0 || p.x > cW) continue;
				
				const tileId = map.tileAt(x, y);					
				const tex    = map.textures[tileId];				
				const shift  = tex?.meta.shift || Vec2.Zero();							// texture shift (not fully implemented)
				const cList  = map.colliders[tileId];

				if (cList) for (const c of cList) {					
					if (!c) continue;
					const ofs = c.position.clone().add(camPos).add(p).add(V2(tex.width, tex.height).mul(V2(0.5, 0.25)));
				
					if (c instanceof Box)    var collider = new Box(ofs, c.size.clone()); else						
					if (c instanceof Circle) var collider = new Circle(ofs, c.radius);    else
					if (c instanceof Poly) {
						var collider = new Poly(ofs);
						collider.points = c.points;													// points are shared
					}

					collider.owner = this;
					this.optimizedColliders.push(collider);						
				}									
			}
		}						
	}

	tick() {		
		//console.log((Engine.gameLoop.tickCount / 60).toFixed());
		
		if ('target' in this.params) {	
			this.rotation = this.params.target.rotation;

			// offset is used to fix the player at a certain position on the screen (the default is in middle of the viewport)			
			this.params.target.offset = this.engine.world.offset.clone().sub(this.params.target.position);			
		}		

		this.optimizedColliders.length = 0;

		if (this.flags.isometric) this._generateIsometricColliders()
			else this._generateAxisAlignedColliders();			
			
	}
}

export { TileMapRenderer }