/*

	Bitmap Texture which can be manipulated using canvas. Attempts to use offScreenCanvas, but falls back to regular, off-DOM canvas.
	
	Usage example:	
	let myTexture = new Texture('brickwall').load('img/wall01.jpg');	

*/
import { isBoolean } from "./utils.js";
import { Picture } from './picture.js';
import * as Types from './types.js';
const { Vector2 : Vec2, V2, Color } = Types;

const textures = {};

class Texture extends Picture {
	/**
	 * Creates a new Texture which may contain either an image or canvas (which gives access to pixel data) or both.
	 * @param {string} name 
	 * @param {object|Vector2=} createCanvas Optional. If this object exists, an empty canvas is created. Canvas measurements are provided by either Vec2 or width and height properties
	 * @param {number} createCanvas.width 
	 * @param {number} createCanvas.height
	 */
	constructor(name, createCanvas) {
		super(name);

		this.canvas   = null;
		this.ctx      = null;				
		this._imgData = null;
		this.pixelWalkMode = 'rgba';			// Format for handling pixel data in .walk() method: "rgba" or "color" or "int"
		this.cacheTextures = false;

		if (createCanvas) {
			if (Vec2.IsVector2(createCanvas)) this.createCanvas(createCanvas.x, createCanvas.y);
				else this.createCanvas(createCanvas.width, createCanvas.height);
		}
	}

	set pixelSmooth(value) {
		if (!isBoolean(value) || !this.ctx) return;	
		console.log('Smoothing:', value)	
		this.ctx.imageSmoothingEnabled = value;
	}
	
	get pixelSmooth() {
		if (!this.ctx) return;		
		return this.ctx.imageSmoothingEnabled;
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

	/**
	 * Loads an image and returns a promise. Create a canvas and context for the image and copies the image on the canvas. Add the image in the global "textures" collection
	 * @param {string} url 
	 * @param {function} onBeforeDraw Optional. Callback function to be executed before the image is drawn on the canvas
	 */
	load(url, onBeforeDraw) {
		return new Promise(async (resolve, reject) => {
			let a = await this.loadFile(url);
			
			const img = this.image;		
			this.createCanvas(img.naturalWidth, img.naturalHeight);		

			if (onBeforeDraw) onBeforeDraw(this.ctx, img);
				else this.ctx.drawImage(img, 0, 0);				

			if (this.cacheTextures) textures[this.name] = this;													// add to textures collection (TO-DO: a textureCollection object)			

			resolve(this.image); 
		});
	}
	
	get imageData() {
		return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);	
	}
	get intBuffer() { if (this._imgData == null) this.loadPixels(); return new Uint32Array(this._imgData.data.buffer); }	
	get width()  { return this.canvas.width; }
	get height() { return this.canvas.height; }
	get size()   { return V2(this.width, this.height) }

	rescale(w, h) {				
		this.canvas.width  = w;
		this.canvas.height = h;
		this.ctx.drawImage(this.image, 0, 0, w, h);		
	}
	
    walk(f) {		
		const p = this.loadPixels();
		const d = this.size;
		if (this.pixelWalkMode == 'rgba') {
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
		} 
		if (this.pixelWalkMode == 'color') {
			for (let y = 0; y < d.y; y++) {
				for (let x = 0; x < d.x; x++) {
					const ofs = (y * d.x + x) * 4;
					const pix = new Color(p[ofs+0], p[ofs+1], p[ofs+2], p[ofs+3]);
					f(x, y, pix);					
					p[ofs+0] = pix.r;
					p[ofs+1] = pix.g;
					p[ofs+2] = pix.b;
					p[ofs+3] = pix.a;
				}
			}	
		}
		if (this.pixelWalkMode == 'int') {
			const buf = this.intBuffer;
			for (let y = 0; y < d.y; y++) {
				let addr = y * d.x;
				for (let x = 0; x < d.x; x++) {										
					buf[addr] = f(x, y, buf[addr]);					
					addr++;
				}
			}	
		}
		this.savePixels();
	}

	/**
	 * Draws the image on the internal canvas flipped across x-axis
	 */
	mirrorX() {
		this.ctx.save();
		this.ctx.scale(-1, 1);
		this.ctx.drawImage(this.image, -this.width, 0);
		this.ctx.restore();		
	}

	/**
	 * Draws the image on the internal canvas flipped across y-axis
	 */
	mirrorY() {
		this.ctx.save();
		this.ctx.scale(1, -1);
		this.ctx.drawImage(this.image, 0, -this.height);
		this.ctx.restore();		
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
	
	static ByName(name) {
		if (textures[name]) return textures[name];
		throw `Texture "${name}" not found`;
	}

	static FromFile(file) {
		return new Promise(async (resolve, reject) => {
			const t = new Texture();
			const b = await t.load(file);
			resolve(t);
		});
	}

	static ClearCache() {
		textures = {};
	}
}

export { Texture };