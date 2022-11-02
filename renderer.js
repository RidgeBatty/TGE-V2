/*

	Game map

*/
import { Collider, Engine, Events, Types } from '../engine/engine.js';	
import { CustomLayer } from '../engine/customLayer.js';
import { TileMap } from '../engine/tileMap.js';
import { Box } from '../engine/physics.js';

const { V2, Vector2 : Vec2 } = Types;

const ImplementsEvents = 'beginoverlap endoverlap resize onBeforeDraw onCustomDraw onAfterDraw onMouseDown';

class Renderer extends CustomLayer {
	constructor(params = {}) {
		super(Object.assign(params, { addLayer:true }));

		this.engine    = ('engine' in params) ? params.engine : Engine;                    // implementing it this way makes it easier to change the Engine reference if needed 
		this.engine.world.offset   = ('offset' in params) ? params.offset : this.engine.dims.mulScalar(0.5);
		this.engine.world.renderer = this;
		this.world     = this.engine.world;

		this.params    = params;
		this.map       = new TileMap(params.tileMap);
		this.objects   = [];
		this.surface   = this.engine.renderingSurface;		// the result of rendering is copied to this surface on update()
		this.time      = 0;
		this.colliders = new Collider({ owner:this });		
		this.events    = new Events(this, ImplementsEvents);			
		this.flags     = {
			ownerDraw     : true,
			showColliders : true
		}		
		this.cursor    = V2(-1, -1);			// x/y coordinates of last selected map tile
		this._drag     = false;
		this._oldPos   = Vec2.Zero();			// Save the old position of the map before mouse drag+move. Required only in the editor(?)
		this.overlaps  = [];					// for collision detection
		this.cache     = {};		
		this.optimizedColliders = [];
		this.objectType         = 'renderer';
				
		this.updateViewport();

		this.engine.events.add('resize', (e) => { 
			this.canvas.width  = this.engine.screen.width;
			this.canvas.height = this.engine.screen.height;
		});
		//this.addMouseControls();
	}

	addMouseControls() {
		const ui = this.engine.ui;			

		const onMouseMove = (e) => {                                  // move mouse on map		
			if (this._drag && (ui == null || ui.active == null)) {        
				this.position.set(this._oldPos.clone().sub(e.delta));		
			}			
		}
		
		const onMouseUp = (e) => {    			
			if (this._drag && (ui == null || ui.active == null)) {
				this.position.set(this._oldPos.clone().sub(e.delta));
			}
			this._drag = false;
		}

		const onMouseDown = (e) => {			
			if (ui != null && ui.active != null) return;

			const position = Vec2.Add(this.position, e.downPos);				// calculate the absolute clicked map position taking scrolling into account
			const tile     = Vec2.ToInt(position.clone().divScalar(this.map.tileSize));
			
			if (e.button == 0) {
				this.cursor.set(tile);
				this.events.fire('onMouseDown', { renderer:this, cursor:this.cursor });
			}
			if (e.button == 2) this._drag = true;

			this._oldPos = this.position.clone();
		}
		
		this.engine.events.add({ mousemove:onMouseMove, mouseup:onMouseUp, mousedown:onMouseDown });
	}

	async loadMap(options){		
		await this.map.loadFromFile(options);
		return this.map;
	}	

	/*
		Renders the map iterating over each row and column in map.tiles array and drawing the corresponding tile texture
	*/
	update() {
		const { map, ctx, canvas, position, engine } = this;
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		const size = map.tileSize;
		
		this.events.fire('onBeforeDraw', { renderer:this, ctx });
		let p = [];

		const camPos = 'world' in engine ? engine.world.camPos : this.position;

		for (let y = 0; y < map.height; y++) {			
			const top  = y * size - ~~camPos.y;

			if (!((top + size) < 0 || top > canvas.height)) 
			for (let x = 0; x < map.width; x++) {
				const left = x * size - ~~camPos.x;
				
				if (!((left + size) < 0 || left > canvas.width)) {										
					if (this.flags.ownerDraw) ctx.drawImage(map.textures[map.tiles[y][x]].canvas, left, top);
					this.events.fire('onCustomDraw', { renderer:this, x, y, ctx, tileId:map.tiles[y][x], drawPos:V2(x * size - camPos.x, y * size - camPos.y) });

					p.push(V2(x, y));
				}
			}						
		}

		this.events.fire('onAfterDraw', { renderer:this, ctx });

		// draw objects		
		if (map.objects) for (const a of p) {
			const obj = map.objects[a.y][a.x];
			for (const o of obj) {
				ctx.drawImage(o.texture.canvas, o.position.x + a.x * size - camPos.x, o.position.y + a.y * size - camPos.y);				
			}
		}
			
		this.surface.drawImage(Vec2.Zero(), canvas);	// flip buffers						

		if (this.flags.showColliders && this.owner.flags.showColliders) this.colliders.update();		
	}

	makeCollidersFromTileMapData() {
		if (!('colliders' in this.map)) throw 'Map data does not have collider information';

		const { map } = this;
		for (let y = 0; y < map.height; y++) {
			for (let x = 0; x < map.width; x++) {
				const top    = y * map.tileSize;
				const left   = x * map.tileSize;

				const tileId = map.tiles[y][x];
				const c      = map.colliders[tileId];

				if (c.type == 'box') {
					const box = new Box(V2(c.points[0] + left + map.tileSize / 2, c.points[1] + top + map.tileSize / 2), V2(c.points[2], c.points[3]));
					this.colliders.add(box);
					this.cache[x + y * map.width] = box;
				}		
			}
		}
	}

	getTileAtCoords(p) {
		const size = this.map.tileSize;
		const x    = ~~(p.x / size);
		const y    = ~~(p.y / size);
		if (y < 0 || x < 0 || x >= this.map.width || y >= this.map.height) return -1;
		return this.map.tiles[y][x];
	}

	tick() {
		if ('target' in this.params) {			
			this.rotation = this.params.target.rotation;

			// offset is used to fix the player at a certain position on the screen (the default is in middle of the viewport)
			this.params.target.offset = this.engine.world.offset.clone().sub(this.params.target.position);			
		}		

		// Collision detection optimization. Enable only those colliders which are currently inside the viewport	
		const { map, engine, canvas } = this;
		const size   = map.tileSize;
		const camPos = 'world' in engine ? engine.world.camPos : this.position;		
		const cw     = canvas.width;
		const ch     = canvas.height;
		this.optimizedColliders.length = 0;

		for (let y = 0; y < map.height; y++) {
			const top = y * size - ~~camPos.y;
			if (!((top + size) < 0 || top > ch)) 
			for (let x = 0; x < map.width; x++) {				
				const left = x * size - ~~camPos.x;
				const c    = this.cache[x + y * map.width];

				if (c && (!((left + size) < 0 || left > cw))) this.optimizedColliders.push(c);				
			}		
		}				
	}
}

export { Renderer }