import { Texture } from './texture.js';	
import { getJSON } from './utils.js';
import { Collider } from './collider.js';
import { V2 } from './types.js';
class TileMap {
	constructor() {	
		this.textures  = [];
		this.shift     = [];
		this.overlays  = [];
		this.colliders = {};
		this.tileSize  = 0;	
		this.origin    = '';

		this._size     = V2(0, 0);
		this.tiles     = new Uint32Array();		
	}

	resize(sx, sy, clearContent = false) {
		if (sx < 0 || sy < 0 || sx > 4096 || sy > 4096) throw 'Illegal tilemap size';
		let clear = false;

		const newArray = new Uint32Array(sx * sy);

		if (!clearContent) {
			for (let y = 0; y < sy; y++) {
				for (let x = 0; x < sx; x++) {                    					
					newArray[sx * y + x] = (x < this._size.x && y < this._size.y) ? this.tiles[this._size.x * y + x] : 0;
				}
			}
		}

		this.tiles = newArray;		
		this._size = V2(sx, sy);
	}

	/**
	 * Returns the size (in pixels) of tile map as a Vector2.
	 */
	get pixelSize() {
		return V2(this.width * this.tileSize, this.height * this.tileSize);
	}

	get size() {
		return this._size.clone();
	}

	set size(v) {
		this.resize(v.x, v.y);
	}

	get height() {
		return this._size.y;
	}

	get width() {
		return this._size.x;
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
		return this.tiles[y * this.size.x + x];
	}

	setTileAt(x, y, v) {
		//if (v < 0 || v >= this.textures.length) throw 'Texture ID out of range (' + v + ')';
		if (y < 0 || y >= this.height || x < 0 || x >= this.width) throw 'Tile coordinates out of range';
		this.tiles[y * this.size.x + x] = v;
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
		const arr = [];
				
		for (const t of data.textures) {
			const tex = new Texture(t);																// give it a name (image filename as it is in the hjson file, usually without extension)
			p.push(tex.load(data.texturePath + t + ext));			
			arr.push(tex);
		}
		await Promise.all(p);				
		return arr;
	}

	loadFromObject(data, clearData = true) {
		return new Promise(async (resolve, reject) => {
			if (clearData) this.clear();
			try {
				if ('tileSize' in data) this.tileSize = data.tileSize;
				
				if (data.tiles.length > 0) {
					let rowLen = 0;
					this.resize(data.tiles.length, data.tiles[0].split(' ').length);						// create the buffer				
					
					for (const row of data.tiles) {															// parse map tiles
						const cells = row.split(' ');
						const r     = cells.map(e => +e);
						this.tiles.set(r, rowLen);
						rowLen += cells.length;						
					}
				}

				if ('mapOrigin' in data) {																	// flip the order of rows?
					this.origin = data.mapOrigin;
					if (data.mapOrigin == 'bottom-left') this.tiles = this.tiles.reverse();					
				}

				if (data.objects) {																			// load objects
					this.objects = data.objects;
				}

				this.textures = await this.loadTextures(data);												// load textures
				if ('textureMetaData' in data) {															// if textures have metadata...
					const meta = data.textureMetaData;
					if ('colliders' in meta) {																// load static colliders attached to map tiles
						let tileId = 0;
						for (const tile of meta.colliders) {
							this.colliders[tileId] = Collider.Parse(tile);						
							tileId++;
						}
					}	
					if ('shift' in meta) {																	// file contains 'shift' information for textures
						this.shift = meta.shift.map(e => V2(e.x, e.y));					
					}		
					if ('overlays' in meta) {
						this.overlays = await this.loadTextures({ textures:meta.overlays, texturePath:data.texturePath, textureExt:data.textureExt });	
						this.overlays.forEach(o => o.data.isOverlay = true);						
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
		this.tiles.fill(0);
		this.textures.length  = 0;
		this.shift.length     = 0;
		this.overlays.length  = 0;
		this.colliders        = {};
	}
}

export { TileMap }
