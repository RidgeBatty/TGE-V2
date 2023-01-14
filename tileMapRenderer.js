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

const { V2, Vector2 : Vec2 } = Types;

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

		this.engine    = ('engine' in params) ? params.engine : Engine;                    			// implementing it this way makes it easier to change the Engine reference if needed 		
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
		this.shift				= [];																// how much each texture should be shifted in y-direction
		this.projectionMode     = 'angle';															// "zigzag", "angle"
				
		this.updateViewport();																		// acquire canvasSurface
		this.buffer.name        = 'TileMapRenderingBuffer';

		this.engine.events.add('resize', _ => { 
			this.buffer.setCanvasSize(this.engine.screen.width, this.engine.screen.height);
		});
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
	 * Loads a map file in memory and then calls TileMap.loadFromFile() which extracts tilemap data and texture information.
	 * It then proceeds to extract static objects (and potentially other non-tilemap/texture data from the same file)
	 */
	async loadMap(options) {																					
		const { map } = this;	
		
		await map.loadFromFile(options);																			// load tilemap/texture data
				
		if (map.objects) {																							// create actors from objects
			for (const o of map.objects) {
				const texture  = map.textures[o.texture];	
				
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
					
					if (p != null) {
						if (p[4] != null) {																					// 4th value is mirror: 1 = x, 2 = y, 3 = x+y
							if ((p[4] & 1) == 1) actor.renderHints.mirrorX = true;
							if ((p[4] & 2) == 2) actor.renderHints.mirrorY = true;					
						}
						if (p[5] != null) {																					// 5th value is offset
							actor.offset.set({ x:p[5], y:p[6] });
						}
					}
					
					this.addStaticActor(V2(p[0], p[1]), params, async (actor) => {
						if ('flipbooks' in o) actor.flipbooks = await Flipbook.Parse(o.flipbooks, actor);					// load flipbooks

						if (o.colliders) {																					// create colliders (if any)
							actor.hasColliders = true;
							actor.colliderType = 'WorldStatic';
							const colliders    = Collider.Parse(o.colliders);
							for (const c of colliders) actor.colliders.add(c);						
						}
						console.log(actor);
					});			
				}				
			}
		}
		
		return map;
	}	

	/**
	 * Adds a new static actor in the current gameLoop and links it to this tileMap	 
	 * @param {Vector2} position In map coordinates (tiles)
	 * @param {object} o Standard Actor create parameters	 	 
	 * @param {function} onAfterCreate Optional callback function. Called before the created actor is inserted in the gameLoop
	 */
	async addStaticActor(position, o = {}, onAfterCreate) {
		const { map } = this;	

		const params = {
			position : (this.flags.isometric) ? this.project(position, true).add(V2(map.tileSize * 0.5, map.tileSize * 0.5)) : position.mul(map.tileSize).toInt(),
			surface  : this.buffer,	
		}
		Object.assign(params, o);

		const actor = this.engine.gameLoop.createTypedActor('obstacle', params);							// create the actor		;
		if (onAfterCreate) onAfterCreate(actor);

		this.engine.gameLoop._addActor(actor);																// add the actor in the gameloop		
		this.staticActors.push(actor);
		this.events.fire('createprop', { prop:actor });
	}

	getTileAtCoords(p) {
		const { map, position, world } = this;

		const size = map.tileSize;

		if (this.flags.isometric) var p = this.unProject(p);		
		var x = ~~(p.x / size);
		var y = ~~(p.y / size);			
		if (y < 0 || x < 0 || x >= map.width || y >= map.height) return -1;
		return this.map.tiles[y][x];
	}

	/**
	 *	Renders the map iterating over each row and column in map.tiles array and drawing the corresponding tile texture
	 */
	renderAxisAligned() {
		const { map, canvas, position, world } = this;
		
		const ctx    = this.buffer.ctx;		
		const size   = map.tileSize;
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
					if (this.flags.ownerDraw) ctx.drawImage(map.textures[map.tiles[y][x]].canvas, left, top);
					this.events.fire('customdraw', { renderer:this, x, y, ctx, tileId:map.tiles[y][x], drawPos:V2(x * size - camPos.x, y * size - camPos.y) });
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
		const {x, y} = c;
		
		if (!ignoreCamPos) var camPos = (this.world == null) ? this.position : this.world.camPos;
			else var camPos = Vec2.Zero();

		const size   = this.map.tileSize;
		if (this.projectionMode == 'zigzag') {
			const top    = (y * size * 0.25)                       - ~~camPos.y - size * 0.5;
			const left   = (x * size * 1) + ((y % 2) * size * 0.5) - ~~camPos.x - size;
			return V2(left, top);
		} 
		if (this.projectionMode == 'angle') {			
			const top    = (y * size * 0.25) + (x * size * 0.25) - ~~camPos.y - size * 0.25;
			const left   = (x * size * 0.5)  - (y * size * 0.5)  - ~~camPos.x - size * 0.5;
			return V2(left, top);
		}		
	}

	unProject(c) {
		const {x, y} = c;
		const camPos = (this.world == null) ? this.position : this.world.camPos;
		const size   = this.map.tileSize;
		if (this.projectionMode == 'angle') {			
			const top    = y / size * 2 - x / size + 0.5 + camPos.y / size * 2 - camPos.x / size;
			const left   = x / size + y / size * 2 + 0.5 + camPos.y / size * 2 + camPos.x / size;
			return V2(left, top);
		}		
	}

	renderIsometric() {
		const { map, canvas, position, world } = this;
		
		const ctx    = this.buffer.ctx;		
		const size   = map.tileSize;
		const camPos = (world == null) ? position : world.camPos;
		
		ctx.resetTransform();
		if (this.flags.clearBuffer) ctx.clearRect(0, 0, canvas.width, canvas.height);

		this.events.fire('beforedraw', { renderer:this, ctx });
		ctx.fillStyle = 'white';
		ctx.font      = '14px arial';
		
		for (let y = 0; y < map.height; y++) {			
			for (let x = 0; x < map.width; x++) {				
				const p = this.project(V2(x, y));
				
				if (!((p.y + size) < 0 || p.y > canvas.height || (p.x + size) < 0 || p.x > canvas.width)) {
					const id = map.tiles[y][x];
					const s  = map.shift[id] || Vec2.Zero();
					p.add(s);

					const tileId     = id & 255;
					const hasOverlay = id > 255;
					const overlayId  = (id >> 8) - 1;
					
					if (this.flags.ownerDraw) {												
						ctx.drawImage(map.textures[tileId].canvas, p.x, p.y);							
						if (hasOverlay) {							
							ctx.drawImage(map.overlays[overlayId].canvas, p.x, p.y);
						}
					}

					this.events.fire('customdraw', { renderer:this, x, y, ctx, tileId, overlayId, drawPos:p });
				}
			}
		}
		
		this.events.fire('afterdraw', { renderer:this, ctx });
	}

	/**
     * Collision detection optimization. Enable only those colliders which are currently inside the viewport	
	 */
	_generateAxisAlignedColliders() {
		const { map, engine, canvas } = this;
		const size   = map.tileSize;
		const camPos = 'world' in engine ? engine.world.camPos : this.position;		
		const cw     = canvas.width;
		const ch     = canvas.height;
		this.optimizedColliders.length = 0;

		for (let y = 0; y < map.height; y++) {
			const top = y * size - ~~camPos.y;

			if (!((top + size) < 0 || top > ch)) for (let x = 0; x < map.width; x++) {				
				const left   = x * size - ~~camPos.x;
				const tileId = map.tiles[y][x];
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
		
		const ctx    = this.buffer.ctx;		
		const size   = map.tileSize;
		const camPos = (world == null) ? position : world.camPos;
				
		for (let y = 0; y < map.height; y++) {			
			for (let x = 0; x < map.width; x++) {				
				const p = this.project(V2(x, y));	
				
				if (!((p.top + size) < 0 || p.top > canvas.height || (p.left + size) < 0 || p.left > canvas.width)) {
					const tileId = map.tiles[y][x];					
					const tex    = map.textures[tileId];
					const shift  = map.shift[tileId];
					const cList  = map.colliders[tileId];

					if (cList) for (const c of cList) {					
						if (!c) continue;
						const ofs = c.position.clone().add(camPos).add(V2(p.left, p.top)).add(V2(tex.width, tex.height).mul(V2(0.5, 0.25)));
					
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
	}

	tick() {		
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