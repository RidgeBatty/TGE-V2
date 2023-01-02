import { Texture } from './texture.js';	
import { getJSON } from './utils.js';
import { Collider } from './collider.js';
import { V2 } from './types.js';
class TileMap {
	constructor() {	
		this.tiles     = [];
		this.textures  = [];
		this.shift     = [];
		this.colliders = {};
		this.tileSize  = 0;	
		this.origin    = '';			
	}

	get size() {
		return V2(this.width * this.tileSize, this.height * this.tileSize);
	}

	get height() {
		return this.tiles.length;
	}

	get width() {
		return this.tiles[0].length;
	}

	tileAt(x, y) {
		if (y < 0 || y >= this.height || x < 0 || x >= this.width) throw 'Tile coordinates out of range';
		return this.tiles[y][x];
	}

	setTileAt(x, y, v) {
		if (v < 0 || v >= this.textures.length) throw 'Texture ID out of range';
		if (y < 0 || y >= this.height || x < 0 || x >= this.width) throw 'Tile coordinates out of range';
		this.tiles[y][x] = v;
	}

	loadFromObject(data) {
		return new Promise(async (resolve, reject) => {
			this.clear();
			try {
				if ('tileSize' in data) this.tileSize = data.tileSize;

				if ('shift' in data) {																		// file contains 'shift' information for textures
					this.shift = data.shift.map(e => V2(e.x, e.y));					
				}
				
				for (const row of data.tiles) {																// parse map tiles
					const cells = row.split(' ');
					const r     = cells.map(e => +e);
					this.tiles.push(r);
				}

				if ('mapOrigin' in data) {																	// flip the order of rows?
					this.origin = data.mapOrigin;
					if (data.mapOrigin == 'bottom-left') this.tiles = this.tiles.reverse();					
				}

				if (data.objects) {																			// load objects
					this.objects = data.objects;
				}

				const p   = [];																				// load textures
				const ext = ('textureExt' in data) ? data.textureExt : '';
				for (const t of data.textures) {
					const tex = new Texture();
					p.push(tex.load(data.texturePath + t + ext));
					this.textures.push(tex);					
				}
				await Promise.all(p);				
				
				if (data.colliders) {																		// load static colliders attached to map tiles
					let tileId = 0;
					for (const tile of data.colliders) {
						this.colliders[tileId] = Collider.Parse(tile);						
						tileId++;
					}
				}				
			} catch (e) {
				console.warn('Unable to parse tilemap!');				
				reject(e);
			}
			resolve(this.tiles);
		});
	}

	loadFromFile(options) {
		return new Promise(async (resolve, reject) => {
			this.clear();					
			if (!('url' in options)) throw 'URL missing from options object';
			const data = await getJSON(options.url);
			try {
				resolve(this.loadFromObject(data));
			} catch (e) {
				reject(e);
			}
		});
	}

	rescaleTextures(w, h) {
		for (const t of this.textures) t.rescale(w, h);
		this.tileSize = w;
	}

	clear() {
		this.tiles.length    = 0;
		this.textures.length = 0;
	}
}

export { TileMap }
