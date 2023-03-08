import { Texture } from './texture.js';	
import { getJSON } from './utils.js';
import { Collider } from './collider.js';
import { V2 } from './types.js';
class TileMap {
	constructor(size) {	
		this.textures  = [];
		this.overlays  = [];
		this.colliders = {};
		this.origin    = '';

		this._size     = V2(0, 0);
		this.tiles     = new Uint32Array();		
		if (size) this.resize(size);
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

	overlayAt(x, y) {
		const t = this.tileAt(x, y);
		return (t >> 8) - 1;
	}

	setOverlayAt(x, y, o) {
		this.setTileAt(x, y, (this.tileAt(x, y) & 0x000000FF) + (o << 8));
	}

	/**
	 * Appends more textures in TileMap.textures array by loading them from image files. This async function returns when all images are loaded.
	 * @param {array}  list Array of texture filenames
	 * @param {string=} path Path to texture files
	 * @param {string=} ext Append file extension
	 */
	async loadTextures(list, path = '', ext = '') {
		const p   = [];																				// load textures
		const arr = [];
				
		for (const t of list) {
			const tex = new Texture(t.name, true);					// give it a name (image filename as it is in the hjson file, usually without extension)			

			tex.load(path + t.name + ext, (ctx, img) => { 
				ctx.scale(1, 1);
				if (tex.meta?.mirrorY) {
					ctx.translate(0, tex.height);
					ctx.scale(1, -1);					
				}
				if (tex.meta?.mirrorX) {
					ctx.translate(tex.width, 0);
					ctx.scale(-1, 1);					
				}
				ctx.drawImage(img, 0, 0);				
			})

			p.push(tex);

			tex.meta = {};
			for (const [k, v] of Object.entries(t)) {
				if (k != 'name') tex.meta[k] = v;				
			}

			arr.push(tex);
		}
		await Promise.all(p);				
		return arr;
	}

	rescaleTextures(w, h) {
		for (const t of this.textures) t.rescale(w, h);
	}

	clear(options = {}) {
		if (!options.keepTileMapTiles)this.tiles.fill(0);
		if (!options.keepTileMapTextures) this.textures.length  = 0;
		if (!options.keepTileMapOverlays) this.overlays.length  = 0;		
		if (!options.keepTileMapColliders) this.colliders  = {};
	}

	static async Parse(data) {
		return new Promise(async (resolve, reject) => {
			let map = new TileMap();
			try {				
				if (data.tiles.length > 0) {		
					let rowLen = 0;
					map.resize(data.tiles.length, data.tiles[0].split(' ').length);							// create the buffer				
					
					for (const row of data.tiles) {															// parse map tiles
						const cells = row.split(' ');
						const r     = cells.map(e => +e);						
						map.tiles.set(r, rowLen);
						rowLen += cells.length;						
					}					
				}

				map.textures = await map.loadTextures(data.textures, data.texturePath, data.textureExt);	//  load textures				
				map.overlays = await map.loadTextures(data.overlays, data.texturePath, data.textureExt);	//  load overlays				
			} catch (e) {
				console.warn('Unable to parse tilemap!');				
				reject(e);
			}								
			resolve(map);
		});
	}

	static LoadFromFile(options) {
		return new Promise(async (resolve, reject) => {
			if (!('url' in options)) throw 'URL missing from options object';
			const data = await getJSON(options.url);
			try {
				const map = await TileMap.Parse(data);
				resolve({ map, data });
			} catch (e) {
				reject(e);
			}
		});
	}
}

export { TileMap }
