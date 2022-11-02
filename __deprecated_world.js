/*

	World, Scene, TileMap
	- World is a container for Scene objects
	- Scene is a container for the (tile)map
	- TileMap stores the tile graphics

*/
import { TinyGameEngine, Engine, Root, Types } from "./engine.js";
import { CanvasRenderer } from "./canvasRenderer.js";
import * as MultiCast from "./multicast.js";
import * as Colliders from "./collider.js";

const Vector2 = Types.Vector2;
const Rect    = Types.Rect;

class TileMap {
	/* TileMap has no owner: any number of Scene objects may point to the same TileMap */
	constructor() { 		
		AE.sealProp(this, 'images', {});		
	}
	
	/* 
		Adds a new tile image in the list (with optional coordinate offset). 
		The contents of the list are loaded using the TileMap.load() method.
	*/
	add(name, info) { // name:String|Integer, info:{ ?url:String, ?pos{x:Number,y:Number}, ?ofs{x:Number,y:Number}, ?size{x:Number,y:Number} }			
		info.size = ('size' in info) ? info.size : { x:1, y:1 }; // assume 1:1 tile extent
		this.images[name] = info;
	}	
	
	/* 
		Loads all tile images of the scene into memory. Ensures that the same url is not loaded twice.
		This function can be tricked to include the same exact image file twice by saving the same image using different url 
		(i.e. "myimage.png", "myimage.png?x=1, myimage.png?x=2")
	*/
	load(o) {
		const _this  = this;
		const tiles  = this.images;
		const imgs   = {};
		var   total  = 0;
		var   loaded = 0;
		
		for (var name in tiles) {
			const url   = tiles[name].url;
			if (imgs[url]) {				
				tiles[name].img = imgs[url];
				continue;
			}
			
			let img = new Image();			
			AE.addEvent(img, 'load', (f) => { 
				loaded++; 			
				if (loaded == total && o.onLoaded) o.onLoaded(); 				
			});
			
			total++;
			img.src         = url;
			tiles[name].img = img;
			imgs[url]       = img;			
		}
	}
}

/*

	Scene object

*/
class Scene extends Root {	
	constructor(o) { // o:{ name:string, url:string, size:{ x:number, y:number } }
		if (!AE.isObject(o)) throw 'Scene must have parameters object specified!';		
		
		super(o);
		
		// if isometric is true, use 2:1 tileSize ratio. tileSize is measured in screen space, where isometric tile is placed diagonally.
		// i.e. the tile "x" and "y" are the width and height in pixels across the diagonal.
		this.isometric  = ('isometric' in o) ? o.isometric : false;
		this.tileSize   = o.tileSize || new Vector2(128, 128);
		
		AE.sealProp(this, '_events', { overlap : [] });			
		AE.sealProp(this, 'map', new Uint8Array());
		
		this.tiles = null;	
		this.size  = Vector2.Zero();
		
		// Scene tiles cannot move!
		this.colliderType = 'WorldStatic';		
		this.hasColliders = true;
			
		if (o.url) this.loadFromFile(o.url, o.onMapLoaded);
	}
	
	addEvent(name, func) {
		if (typeof func != 'function') throw 'Second parameter must be a function';
		if (name in this._events) this._events[name].push({ name, func });			
	}
	
	_fireCustomEvent(name, data) {			
		const e = this._events[name];							
		if (e) for (var i = 0; i < e.length; i++) e[i].func({ instigator:this, name, data });		
	}
	
	createTileMap() {
		const tiles = new TileMap();		
		this.tiles  = tiles;
		return tiles;
	}
	
	/*
		Constructs a level from provided string.		
		Map is stored as rows, separated by linefeeds. Individual map cells on a row are separated by space characters.
	*/
	fromString(str) {
		let   rows, cols, width;
				
		try {
			rows   = str.trim().split('\n');
			width  = rows[0].trim().split(' ').length;
			this.map = new Uint8Array(rows.length * width);
			
			for (var i = 0; i < rows.length; i++) {
				cols = rows[i].trim().split(' ');
				if (width != cols.length) throw `Map row ${i} has inconsistent width.`;
				for (var j = 0; j < width; j++) {
					this.map[i * width + j] = parseInt(cols[j], 10);			
				}
			}				
		} catch (e) {
			console.warn(e);
			throw 'Unable to parse map data.';
		}
		
		this.size = new Vector2(width, rows.length);
	}
	
	loadFromFile(url, onLoaded, onFailed) { // url:string, onLoaded:function, onFailed:function
		fetch(url)
			.then(a => a.text())
			.then(a => {	
				this.fromString.call(this, a);
				if (onLoaded) onLoaded();
			})
			.catch(e => {			
				console.warn(`Error loading "${url}"`);
				if (onFailed) onFailed(e);
			});
	}
	
	/*
		Returns the value of map tile at given coordinates.
	*/	
	getTileAt(x, y) {
		const pos = y * this.size.x + x;
		if (pos < 0 || pos > this.map.length) return null;
		return this.map[pos];
	}
	
	iterate(callback) { // callback:function
		if (typeof callback != 'function') throw 'Parameter "callback" must be a function.';
		for (var y = 0; y < this.size.y; y++) 
			for (var x = 0; x < this.size.x; x++) callback(x, y, this.getTileAt(x, y));			
	}	
	
	checkOverlaps() {
		const gameLoop = this.owner.owner;		// this.owner = World, this.owner.owner = GameLoop
		const scene    = this;
		
		for (var i = gameLoop.actors.length; i--;) {
			const actor = gameLoop.actors[i];
			
			if (scene.hasColliders && actor.hasColliders) actor.testOverlaps(scene);
		}
	}
}

const Events = ['Select', 'AfterRender'];

class World {
	constructor(o) {	
		if ('owner' in o && !(o.owner instanceof TinyGameEngine)) throw 'World owner must be an instance of TinyGameEngine';
		
		this.owner        = o.owner;
		this.owner.world  = this;
		
		this.createParams = o;
		this.gravity      = o.gravity;				
		this.surface  	  = o.renderingSurface || this.owner.renderingSurface || new CanvasRenderer({ dims:o.dims || o.owner.dims });
		
		this.rescaleWindow();
		this.activeScene  = null;
		
		this.selection    = {};
		this.selectionDrawStyle  = { stroke:'blue', fill:'rgba(0,0,255,0.2)' };
		this.customSelectionDraw = null;
				
		AE.sealProp(this, '_mouse', { down:false, downPos:Vector2.Zero() });
		AE.sealProp(this, 'scenes', {});
		AE.sealProp(this, 'data', {});
		AE.sealProp(this, 'flags', {
			useCustomSelectionCall : false			
		});			
		
		// events	
		const evt = {};
		for (const name of Events) {			
			evt[name.toLowerCase()] = [];																// create the stack for events			
			if (AE.hasProp(evt, 'on' + name)) this.addEvent(name.toLowerCase(), evt['on' + name]);		// install (optional) event handlers given in parameters object
		}
		AE.sealProp(this, '_events', evt);		
		
		// hard events
		MultiCast.addEvent('resize',    e => this.rescaleWindow(), null);		
		MultiCast.addEvent('mousedown', e => this.onMouseDown(e), null);	
		MultiCast.addEvent('mouseup',   e => this.onMouseUp(e), null);			
	}
	
	addEvent(name, func) {
		if (typeof func != 'function') throw 'Second parameter must be a function';
		if (name in this._events) this._events[name].push({ name, func });			
	}
	
	_fireEvent(name, data) {
		const e = this._events[name];													
		if (e) for (var i = 0; i < e.length; i++) e[i].func(this, name, data);
	}
	
	/* Return Canvas width in pixels */
	get width() { return this.surface.canvas.width; }
	
	/* Return Canvas height in pixels */
	get height() { return this.surface.canvas.height; }
	
	/*
		Called automatically in Engine.resize event stack
	*/
	rescaleWindow() {
		this.surface.setCanvasSize(this.owner.dims.x, this.owner.dims. y);		
	}
	
	onMouseDown(e) {		
		const p = this.screenToIsometric(Engine.mousePos);
		this._mouse.downPos.set(p);
		return p;
	}
	
	onMouseUp(e) {
		const p = this.screenToIsometric(Engine.mousePos);		
		const s = this._mouse.downPos;
		
		this.selection = { 
			delta:     Vector2.Sub(p, this._mouse.downPos), 
			startPos:  s, 
			endPos:    p, 
			startTile: Vector2.ToInt(s),
			endTile:   Vector2.ToInt(p),
		}
				
		this._fireEvent('select', this.selection);
		
		return p;		
	}
	
	/*
		Internal method to hilite (mouse) selected tiles		
	*/
	_drawSelection() {		
		if (Object.keys(this.selection).length > 0) {
			const ss = this.selection.startTile;
			const se = this.selection.endTile;
			
			const sy = Math.min(ss.y, se.y);
			const sx = Math.min(ss.x, se.x);
			const ey = Math.max(ss.y, se.y);
			const ex = Math.max(ss.x, se.x);
			
			for (let y = sy; y <= ey; y++) {
				for (let x = sx; x <= ex; x++) {				
					const bounds = this.getTileBounds({ x, y });	
					if (AE.isFunction(this.customSelectionDraw)) this.customSelectionDraw(x, y, bounds); 
						else this.surface.drawPoly(bounds, this.selectionDrawStyle);	
				}
			}
		}
	}
	
	createScene(o) {
		if (!AE.isObject(o)) throw 'Parameters object must be specified!';						
		
		o.owner     = this;		
		const scene = new Scene(o);
		
		scene.world         = this;
		this.scenes[o.name] = scene;
		this.activeScene    = scene;
		
		return scene;
	}
	
	tick() {
		const scene  = this.activeScene;
		if (scene == null) return;
		
		scene.checkOverlaps();
		
		if (scene.hasColliders == true) scene.colliders.show(); // update colliders
	}
	
	clear() {
		const s = this.surface;
		s.ctx.clearRect(0, 0, s.canvas.width, s.canvas.height);
	}
	
	/*
		Converts screen space position "p" into isometric space (integer part corresponds to a specific tile coordinate).
	*/
	screenToIsometric(p) {
		const scene = this.activeScene;
		
		const sw    = Engine.screen.width  / 2 / scene.tileSize.x;
		const sh    = Engine.screen.height / 2 / scene.tileSize.y;
		
		const midPointX = sw + sh;
		const midPointY = sh - sw;
		
		const px = p.x / scene.tileSize.x;
		const py = p.y / scene.tileSize.y;
		
		return new Vector2(px + py - midPointX + 0.5, py - px - midPointY + 0.5);
	}
	
	/*
		Converts isometric coordinates to screen space
	*/
	isometricToScreen(p, height = 0) {
		const scene  = this.activeScene;
		
		let tileCenterX = scene.tileSize.x / 2;
		let tileCenterY = scene.tileSize.y / 2;
		
		let dx = (p.x * tileCenterX) - (p.y * tileCenterX) + Engine.screen.width  / 2;
		let dy = (p.y * tileCenterY) + (p.x * tileCenterY) + Engine.screen.height / 2;
		
		return new Vector2(dx, dy - height * 0.5);
	}
	
	/*
		Returns the bounding polygon coordinates of a tile at given location "pos"
	*/
	getTileBounds(pos) {
		const scene  = this.activeScene;
		
		let result = [];
		
		let tileCenterX = scene.tileSize.x / 2;
		let tileCenterY = scene.tileSize.y / 2;
		
		let dx = (pos.x * tileCenterX) - (pos.y * tileCenterX) + Engine.screen.width  / 2;
		let dy = (pos.y * tileCenterY) + (pos.x * tileCenterY) + Engine.screen.height / 2;
		
		return [new Vector2(dx, dy - tileCenterY),
				new Vector2(dx + tileCenterX, dy),
				new Vector2(dx, dy + tileCenterY),
				new Vector2(dx - tileCenterX, dy)];
	}
	
	/*
		In isometric view, scene.position.x=0, y=0 means that top left corner of the map (tile x=0, y=0) is at the center of the viewport.
		Integer part in scene.position means one full tile of translation.
	*/	
	renderIsometric() {
		const scene  = this.activeScene;
		const tiles  = scene.tiles;
		const canvas = this.surface.canvas;
		const ctx    = this.surface.ctx;
		
		ctx.fillStyle = 'white';
		
		// tile coordinate for the viewport corner:
		const sw = Math.ceil((Engine.screen.width)  / 2 / scene.tileSize.x);
		const sh = Math.ceil((Engine.screen.height + scene.position.y * 2) / 2 / scene.tileSize.y);
		
		// tile size:
		const tileSizeX = scene.tileSize.x;
		const tileSizeY = scene.tileSize.y;
		
		// offset to tile center:
		const tileCenterX = tileSizeX / 2;
		const tileCenterY = tileSizeY / 2;
					
		var tx, ty;
		
		for (var y = 0; y <= sh * 4; y++) {
			tx = -(sw + sh) + Math.floor(y / 2);
			ty = -(sh - sw) + Math.ceil(y / 2);
						
			for (var x = 0; x <= sw * 2; x++) {												
				//var n = this.getTileBounds(new Vector2(tx + scene.position.x % 1, ty + scene.position.y % 1));	
								
				if (tx >= 0 && ty >= 0 && tx < scene.size.x && ty < scene.size.y) {
					var tile = tiles.images[scene.map[ty * scene.size.x + tx]];					
									
					// tiles are identified using their 'id' which is read from Scene.map. If a matching tile is found, draw it on the canvas:
					if (tile != undefined) {											
						let dx = ((tx - ty) * tileCenterX) + Engine.screen.width / 2  - tileCenterX - scene.position.x;
						let dy = ((ty + tx) * tileCenterY) + Engine.screen.height / 2 - tileCenterY - scene.position.y;
														
						if ('size' in tile) {
							var sx = tile.pos.x || 0;
							var sy = tile.pos.y || 0;
							ctx.drawImage(tile.img, sx, sy, tileSizeX, tileSizeY, dx, dy, tileSizeX, tileSizeY);
						}
							else ctx.drawImage(tile.img, dx, dy);
							
						//ctx.fillText(tx + ',' + ty, (dx + tileCenterX), (dy + tileCenterY));	
					}
				}
					
				tx++;
				ty--;	
			}			
		}	
	}
	
	/*
		Renders a single isometric tile. NOTE! No z-sorting is performed, the tile is rendered on top of the existing graphics on the canvas.
	*/
	renderIsometricTile(pos, tileId) {
		const scene  = this.activeScene;
		const canvas = this.surface.canvas;
		const ctx    = this.surface.ctx;
		const tiles  = scene.tiles;
		
		var tile = tiles.images[tileId];
				
		// screen center:
		var ofsx = Engine.screen.width  / 2 - scene.tileSize.x - scene.position.x;
		var ofsy = Engine.screen.height / 2 - scene.tileSize.y - scene.position.y;
		
		// tile size:
		const tileSizeX = scene.tileSize.x * tile.size.x;
		const tileSizeY = scene.tileSize.y * tile.size.y;
								
		// tiles are identified using their 'id' which is read from Scene.map. If a matching tile is found, draw it on the canvas:
		if (tile != undefined) {					
			var tofsx = tile.ofs ? tile.ofs.x : 0;
			var tofsy = tile.ofs ? tile.ofs.y : 0;
			var dx = pos.x * tileSizeX / 2 - pos.y * tileSizeX / 2 + ofsx + tofsx;
			var dy = pos.y * tileSizeY / 2 + pos.x * tileSizeY / 2 + ofsy + tofsy;
												
			if ('size' in tile) {
				var sx = tile.pos.x || 0;
				var sy = tile.pos.y || 0;
				
				ctx.drawImage(tile.img, sx, sy, tileSizeX, tileSizeY, dx, dy, tileSizeX, tileSizeY);
			}
				else ctx.drawImage(tile.img, dx, dy);
		}	
	}
	
	renderAxisAligned() {
		const scene  = this.activeScene;	
		const canvas = this.surface.canvas;
		const ctx    = this.surface.ctx;
		const tiles  = scene.tiles;
		
		// draw only as many tiles as fit in the visible area of the screen:
		const tilesOnRow = Math.ceil(canvas.width  / scene.tileSize.x) + 1;	// how many tiles fit on the screen horizontally
		const tilesOnCol = Math.ceil(canvas.height / scene.tileSize.y) + 1;	// how many tiles fit on the screen vertically
		
		var ofsx = scene.position.x;
		var ofsy = scene.position.y;		
		var fx   = ofsx < 0 ? -1 : 0;
		var fy   = ofsy < 0 ? -1 : 0;		
		
		for (var y = 0; y < tilesOnCol; y++) {
			var ty = y - (~~(ofsy + fy) / scene.tileSize.y) + fy;
			if (ty > scene.size.y || ty < 0) continue;								// is the addressed tile outside scene map
						
			for (var x = 0; x < tilesOnRow; x++) {				
				var tx = x - (~~(ofsx + fx) / scene.tileSize.x) + fx;			
				if (tx > scene.size.x - 1 || tx < 0) continue;										// is the addressed tile outside scene map
				
				var tile = tiles.images[scene.map[ty * scene.size.x + tx]];
								
				// tiles are identified using their 'id' which is read from Scene.map. If a matching tile is found, draw it on the canvas:
				if (tile != undefined) {					
					var dx = x * scene.tileSize.x + (ofsx % scene.tileSize.x);
					var dy = y * scene.tileSize.y + (ofsy % scene.tileSize.y);
												
					if ('size' in tile) {
						var sx = tile.pos.x || 0;
						var sy = tile.pos.y || 0;
						ctx.drawImage(tile.img, sx, sy, tile.size.x, tile.size.y, dx, dy, tile.size.x, tile.size.y);
					}
						else ctx.drawImage(tile.img, dx, dy);
				}				
			}			
		}
	}
	
	update() {		
		const s = this.surface;
		
		s.ctx.clearRect(0, 0, s.canvas.width, s.canvas.height);
		
		for (const o of this.objects) {
		}
		
		if (this.activeScene.isometric) this.renderIsometric();		
			else this.renderAxisAligned();		
			
		if (this.flags.useCustomSelectionCall == false) this._drawSelection();
			
		this._fireEvent('afterrender', this.activeScene);
	}
	
	
}

export { World, TileMap, Scene };