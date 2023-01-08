/*

	Bitmap Texture which can be manipulated on canvas. Attempts to use offScreenCanvas, but falls back to regular, off-DOM canvas.
	
	Usage example:	
	let myTexture = new Texture('brickwall').load('img/wall01.jpg');	

*/
import * as Types from './types.js';
const { Vector2 : Vec2, V2 } = Types;

const textures = {};

class Texture {
	constructor(name, createCanvas) {
		this.image  = null;				
		this.canvas = null;
		this.ctx    = null;				
		this.name   = name;
		this._imgData = null;
		this.data   = {}; 

		if (createCanvas) this.createCanvas(createCanvas.width, createCanvas.height);
	}

	createCanvas(w, h) {
		try {			
			this.canvas = new OffscreenCanvas(w, h);		
		} catch(e) {
			this.canvas = document.createElement('canvas');
			this.canvas.width  = w;
			this.canvas.height = h;
		}		
		this.ctx = this.canvas.getContext('2d');		
	}

	/*
		Internal callback function, executed when image is loaded in Texture.load();
	*/
	_imgLoaded(cb) {
		const img = this.image;
		
		this.createCanvas(img.naturalWidth, img.naturalHeight)		
		this.ctx.drawImage(img, 0, 0);				
		textures[this.name] = this;
		
		if (typeof cb == 'function') cb(this);
	}
	
	load(url) {
		return new Promise((resolve, reject) => {
			this.image         = new Image();
			this.image.onerror = _ => { reject(this.image); }
			this.image.onload  = _ => { this._imgLoaded(); resolve(this.image); }
			this.image.src     = url;		
		})
	}
	
	get imageData() {
		return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);	
	}
	
	get width()  { return this.canvas.width; }
	get height() { return this.canvas.height; }
	get size()   { return V2(this.width, this.height) }

	rescale(w, h) {
		this.canvas.width  = w;
		this.canvas.height = h;
		this.ctx.drawImage(this.image, 0, 0, w, h);
	}
	
	static ByName(name) {
		if (textures[name]) return textures[name];
		throw `Texture "${name}" not found`;
	}
	
    walk(f) {		
		const p = this.loadPixels();
		const d = this.size;
    	for (let y = 0; y < d.y; y++) {
	        for (let x = 0; x < d.x; x++) {
            	const ofs = (y * d.x + x) * 4;
				const pix = { r:p[ofs+0], g:p[ofs+1], b:p[ofs+2], a:p[ofs+3] }
				f(x, y, pix);
				p[ofs+0] = pix.r;
				p[ofs+1] = pix.g;
				p[ofs+2] = pix.b;
				p[ofs+3] = pix.a;
			}
		}		
		this.savePixels();
	}

	/**
	 * Copies pixels from image to an internal read/write buffer. While buffered, individual pixels can be accessed using getPixel() and setPixel() functions.
	 * To write pixels back to the image, use the savePixels() function.
	 * Returns an array containing all pixels of the image.
	 */
	loadPixels() {
		this._imgData = this.imageData;
		return this._imgData.data;
	}

	/**
	 * Writes pixel buffer (created by previous call to loadPixels() function) back onto the image.
	 */
	savePixels() {
		this.ctx.putImageData(this._imgData, 0, 0);
	}

	getPixel(x, y) {
		const ofs = (y * this._imgData.width + x) * 4;
		const i   = this._imgData.data;
		return { r:i[ofs+0], g:i[ofs+1], b:i[ofs+2], a:i[ofs+3]  }
	}

	setPixel(x, y, c) {
		const ofs = (y * this._imgData.width + x) * 4;
		const i   = this._imgData.data;
		i[ofs+0] = c.r;
		i[ofs+1] = c.g;
		i[ofs+2] = c.b;
		i[ofs+3] = c.a;
	}
}

export { Texture };