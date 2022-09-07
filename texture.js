/*

	Bitmap Texture which can be manipulated on canvas. Attempts to use offScreenCanvas, but falls back to regular, off-DOM canvas.
	
	Usage example:	
	let myTexture = new Texture('brickwall').load('img/wall01.jpg');	

*/
const textures = {};

class Texture {
	constructor(name) {
		this.image  = null;				
		this.canvas = null;
		this.ctx    = null;				
		this.name   = name;
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

	/*
		Internal callback function, executed when image is loaded in constructor
	*/
	_imgLoaded(cb) {
		const img = this.image;
		
		try {			
			this.canvas = new OffscreenCanvas(img.naturalWidth, img.naturalHeight);		
		} catch(e) {
			this.canvas = document.createElement('canvas');
		}
		
		this.ctx    = this.canvas.getContext('2d');
		this.ctx.drawImage(img, 0, 0);		
		
		textures[this.name] = this;
		
		if (typeof cb == 'function') cb(this);
	}
	
	static ByName(name) {
		if (textures[name]) return textures[name];
		throw `Texture "${name}" not found`;
	}
}

export { Texture };