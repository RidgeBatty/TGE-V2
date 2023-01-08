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

	/**
	 * Returns the size of tile map as a Vector2. The result is number of tiles in vertical and horizontal direction.
	 */
	get size() {
		return V2(this.width * this.tileSize, this.height * this.tileSize);
	}

	get height() {
		return this.tiles.length;
	}

	get width() {
		return this.tiles[0].length;
	}

	/**
	 * Adds a new texture into the tileMap internal array. Returns the ID of the added texture.
	 * @param {Texture} tex 
	 * @returns {number} Tile ID
	 */
	addTexture(tex) {
		this.textures.push(tex);
		return this.textures.length - 1;	
	}

	tileAt(x, y) {
		if (y < 0 || y >= this.height || x < 0 || x >= this.width) throw 'Tile coordinates out of range';
		return this.tiles[y][x];
	}

	setTileAt(x, y, v) {
		if (v < 0 || v >= this.textures.length) throw 'Texture ID out of range (' + v + ')';
		if (y < 0 || y >= this.height || x < 0 || x >= this.width) throw 'Tile coordinates out of range';
		this.tiles[y][x] = v;
	}

	/**
	 * Converts given screen space coordinates into texture space
	 * @param {number} id Texture ID 
	 * @param {Vector2} p Point in screen space	 
	 * @returns 
	 */
	toTextureSpace = (id, p) => {
		const px = p.x / this.textures[id].width;
		const py = p.y / this.textures[id].height - 0.5;
		return V2(px - py, py + px);
	}	

	/**
	 * Appends more textures in TileMap.textures array by loading them from image files. This async function returns when all images are loaded.
	 * @param {object} data Params object
	 * @param {array} data.textures Array of texture filenames
	 * @param {string} data.texturePath Path to texture files
	 */
	async loadTextures(data) {
		const p   = [];																				// load textures
		const ext = ('textureExt' in data) ? data.textureExt : '';
				
		for (const t of data.textures) {
			const tex = new Texture();
			p.push(tex.load(data.texturePath + t + ext));
			this.textures.push(tex);					
		}
		await Promise.all(p);				
	}

	loadFromObject(data, clearData = true) {
		return new Promise(async (resolve, reject) => {
			if (clearData) this.clear();
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

				await this.loadTextures(data);
				
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
