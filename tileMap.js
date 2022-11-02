import { Texture } from '../engine/texture.js';	
import { getJSON } from '../engine/utils.js';

class TileMap {
	constructor() {	
		this.tiles     = [];
		this.textures  = [];
		this.colliders = [];
		this.tileSize  = 0;
	}

	get height() {
		return this.tiles.length;
	}

	get width() {
		return this.tiles[0].length;
	}

	tileAt(x, y) {
		return this.tiles[y][x];
	}

	loadFromObject(data) {
		return new Promise(async (resolve, reject) => {
			this.clear();
			try {
				if ('tileSize' in data) this.tileSize = data.tileSize;
				
				// load map tiles
				for (const row of data.tiles) {
					const cells = row.split(' ');
					const r     = cells.map(e => +e);
					this.tiles.push(r);
				}

				// load textures
				const p   = [];
				const ext = ('textureExt' in data) ? data.textureExt : '';
				for (const t of data.textures) {
					const tex = new Texture();
					p.push(tex.load(data.texturePath + t + ext));
					this.textures.push(tex);					
				}

				// load colliders
				if (data.colliders) {
					this.colliders = data.colliders;
				}

				await Promise.all(p);				
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