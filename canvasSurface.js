/*

	TGE CanvasSurface
	
	Off-screen drawing surface
	
*/
import * as Engine from "./engine.js";

const { Rect, Vector2, Color } = Engine.Types;

class CanvasSurface {
	constructor(o = {}) {		// o:{ ?dims:Vector2, ?flags:{}, ?name:String }
		const canvas  = document.createElement('canvas');		
		
		if ('dims' in o) {
			canvas.width  = o.dims.x;
			canvas.height = o.dims.y;
		}
		
		this.name     = o.name;
		this.ctx 	  = canvas.getContext('2d', o.flags);
		this.canvas   = canvas;
		
		this._pixelSmooth = true;		
	}
	
	destroy() {
		this.canvas.remove();
		this.ctx  = null;
		this.name = null;
		this.dims = Vector2.Zero();		
	}
	
	get width()  { return this.canvas.width; }
	get height() { return this.canvas.height; }
	get size()	 { return new Vector2(this.canvas.width, this.canvas.height); }

	set width(v)  { this.canvas.width = v; }
	set height(v) { this.canvas.height = v; }
	
	/*
		Sets bitmap image rendering mode. If "pixelSmooth" is true, pixels may appear blurred, especially when scaled up.
		Otherwise the images may have sharp pixels edges. Depending on game type either effect may be desirable.
		Note that these are browser specific render hints and may not produce the desided effect on all platforms.
	*/	
	set pixelSmooth(value) {
		if (!AE.isBoolean(value)) return;
		this._pixelSmooth = value;
		this.setCanvasSize(this.canvas.width, this.canvas.height);
	}
	
	get pixelSmooth() {
		return this._pixelSmooth;
	}
	
	/*
		Define the width and height (in pixels) of the drawing surface.
	*/
	setCanvasSize(w, h) {
		const canvas = this.canvas;
		canvas.width = w;
		canvas.height = h;
		if (this._pixelSmooth) {
			canvas.style.imageRendering = 'pixelated crisp-edges';			
		} else {
			canvas.style.imageRendering = 'auto';			
		}
	}
	
	static FromImage(img) {
		const dims = new Vector2(img.naturalWidth, img.naturalHeight);
		const s    = new CanvasSurface({ dims });		
		s.drawImage({ x:0, y:0 }, img);
		return s;
	}
	
	clear() {
		this.ctx.clearRect(0, 0, this.width, this.height);
	}
	
	/*
		Draw a line between two Vector2 points (or point-like objects)
	*/
	drawLine(p0, p1, style) {		// p0:Vector2, p1:Vector2, style:string
		if (style) this.ctx.strokeStyle = style;		
		this.ctx.beginPath();
		this.ctx.moveTo(~~p0.x + 0.5, ~~p0.y + 0.5);
		this.ctx.lineTo(~~p1.x + 0.5, ~~p1.y + 0.5);
		this.ctx.stroke();		
	}
	
	/*
		Draw an arrow from Vector2 to Angle, with Length and Scale (= relative size of the arrow head to the length)
	*/
	drawArrow(p, o, style) {		// p:Vector2, o:{ angle:Number, length:Number, scale:Number=0.25, head:Number=0.75 } style:string
		const h = (o.head ? o.head : 0.75) * Math.PI;
		const s = o.scale ? o.scale * o.length : 0.25 * o.length;
		const a = o.angle;
		
		if (style) this.ctx.strokeStyle = style;		
		this.ctx.beginPath();		
		
		this.ctx.moveTo(p.x + 0.5, p.y + 0.5);		
		const ex = p.x + Math.sin(a) * o.length;
		const ey = p.y + Math.cos(a) * o.length;
		this.ctx.lineTo(ex + 0.5, ey + 0.5);		
		
		const rx = ex + Math.sin(a + h) * s;
		const ry = ey + Math.cos(a + h) * s;
		this.ctx.lineTo(rx + 0.5, ry + 0.5);		
		
		this.ctx.moveTo(ex + 0.5, ey + 0.5);
		const lx = ex + Math.sin(a - h) * s;
		const ly = ey + Math.cos(a - h) * s;
		this.ctx.lineTo(lx + 0.5, ly + 0.5);		
		
		this.ctx.stroke();		
	}
	/*
		Draw a line segment on canvas. Accepts Types.LineSegment or an array of coordinates (x0, y0, x1, y1) as parameters.
	*/
	drawSeg(line, style) {		// line:Types.LineSegment|[number], style:String
		if (style) this.ctx.strokeStyle = style;		
		this.ctx.beginPath();
		if (Array.isArray(line)) {
			this.ctx.moveTo(line[0], line[1]);
			this.ctx.lineTo(line[2], line[3]);
		} else {
			this.ctx.moveTo(line.p0.x, line.p0.y);
			this.ctx.lineTo(line.p1.x, line.p1.y);
		}
		this.ctx.stroke();		
	}
	
	/*
		Draw a polygon on canvas. Accepts an array of Vector2 as parameter
	*/
	drawPoly(points, p = { stroke:'black' }) {		// points:[Vector2], ?p:{ ?stroke:String, ?fill:String }
		this.ctx.beginPath();
		
		if (Array.isArray(points) && points.length > 1) {
			this.ctx.moveTo(points[0].x, points[0].y);
			for (var i = 1; i < points.length; i++) {
				this.ctx.lineTo(points[i].x, points[i].y);
			}
			this.ctx.lineTo(points[0].x, points[0].y);
		}
		
		if (p.stroke)	{ this.ctx.strokeStyle = p.stroke; this.ctx.stroke(); }
		if (p.fill)		{ this.ctx.fillStyle   = p.fill;   this.ctx.fill(); }
	}
	
	drawPolyInt(points, p = { stroke:'black' }) {		// points:[Vector2], ?p:{ ?stroke:String, ?fill:String }
		this.ctx.beginPath();
		
		if (Array.isArray(points) && points.length > 1) {
			this.ctx.moveTo(~~points[0].x, ~~points[0].y);
			for (var i = 1; i < points.length; i++) {
				this.ctx.lineTo(~~points[i].x, ~~points[i].y);
			}
			this.ctx.lineTo(~~points[0].x, ~~points[0].y);
		}
		this.ctx.closePath();
		if (p.stroke)	{ this.ctx.strokeStyle = p.stroke; this.ctx.stroke(); }
		if (p.fill)		{ this.ctx.fillStyle   = p.fill;   this.ctx.fill(); }
	}
	
	/*
		Draw a quad on canvas. Accepts an array of Number as parameter
	*/
	drawQuad(points, p = { stroke:'black' }) {		// points:[Number], ?p:{ ?stroke:String, ?fill:String }
		this.ctx.beginPath();
		
		if (Array.isArray(points) && points.length == 8) {
			this.ctx.moveTo(~~points[0] + 0.5, ~~points[1] + 0.5);
			for (let i = 0; i < 4; i++) {
				this.ctx.lineTo(~~points[i * 2] + 0.5, ~~points[i * 2 + 1] + 0.5);
			}			
		}
		this.ctx.closePath();
		if (p.stroke)	{ this.ctx.strokeStyle = p.stroke; this.ctx.stroke(); }
		if (p.fill)		{ this.ctx.fillStyle   = p.fill;   this.ctx.fill(); }
	}
	
	/*
		Draw a quad with integer positioning.
	*/
	drawQuadInt(points, p = { stroke:'black' }) {		// points:[Number], ?p:{ ?stroke:String, ?fill:String }
		this.ctx.beginPath();
		
		if (Array.isArray(points) && points.length == 8) {
			this.ctx.moveTo(~~points[0], ~~points[1]);
			for (var i = 0; i < 4; i++) {
				this.ctx.lineTo(~~points[i * 2], ~~points[i * 2 + 1]);
			}			
		}
		this.ctx.closePath();
		if (p.stroke)	{ this.ctx.strokeStyle = p.stroke; this.ctx.stroke(); }
		if (p.fill)		{ this.ctx.fillStyle   = p.fill;   this.ctx.fill(); }
	}
	
	drawFastQuad(top, bottom, tlx, trx, blx, brx, color) {			
		this.ctx.fillStyle = color; 
		for (var y = ~~top; y < ~~bottom; y++) this.ctx.fillRect(~~tlx, y, ~~trx, 1);		
	}
	
	drawRect(x, y, w, h, p = { stroke:'black' }) {
		if (p.fill) { 
			this.ctx.fillStyle = p.fill; 
			this.ctx.fillRect(~~x, ~~y, ~~w, ~~h); 
		}
		if (p.stroke) {			
			this.ctx.strokeStyle = p.stroke; 
			this.ctx.strokeRect(~~x, ~~y, ~~w, ~~h);
		}
	}		
	
	/*
		Draw a circle on World canvas
	*/
	drawCircle(center, radius, p = { stroke:'black' }) {		// center:Vector2, radius:Number, ?p:{ ?stroke:String, ?fill:String }
		this.ctx.beginPath();		
		this.ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);			
		
		if (p.stroke)	{ this.ctx.strokeStyle = p.stroke; this.ctx.stroke(); }
		if (p.fill)		{ this.ctx.fillStyle   = p.fill;   this.ctx.fill(); }
	}	
	
	/*
		x0, y0, x1, y1:Number, stops:*{ position:Number, color:String }, type:String
	*/
	makeGradient(x0, y0, x1, y1, stops, type = 'linear') {
		if (type == 'linear') {
			const g = this.ctx.createLinearGradient(x0, y0, x1, y1);
			for (const [k, v] of Object.entries(stops)) g.addColorStop(k, v);				
			return g;
		}
	}
	
	savePixelData(rect) {
		if (rect == null) var rect = new Rect(0, 0, this.width, this.height);
		this.pixelCache = this.ctx.getImageData(rect.left, rect.top, rect.width, rect.height);		
	}
	
	restorePixelData(pos) {
		if (pos == null) var pos = Vector2.Zero();
		if (this.pixelCache != null) this.ctx.putImageData(this.pixelCache, pos.x, pos.y);
		this.pixelCache = null;
	}
	
	/*
		Set individual pixel in World canvas. Not that this extremely slow and is not recommended to be used in real-time graphics.
	*/
	setPixel(v, c) {	// v:Vector2, c:Color
		if (this.pixelCache == null) this.savePixelData();
		const addr = (~~v.y * this.pixelCache.width + ~~v.x) * 4; 
		const data = this.pixelCache.data;
		data[addr + 0] = c.r;
		data[addr + 1] = c.g;
		data[addr + 2] = c.b;
		data[addr + 3] = c.a;
	}
	
	/*
		Get individual pixel from World canvas. Note that this extremely slow and is not recommended to be used in real-time graphics.
	*/
	getPixel(v) {
		if (this.pixelCache == null) this.savePixelData();		
		const addr = (~~v.y * this.pixelCache.width + ~~v.x) * 4; 
		const data = this.pixelCache.data;		
		return Color.FromArray([...data.slice(addr, addr + 4)]);
	}
	
	/*
		Draws image on canvas. 
	*/
	drawImage(pos, img) {
		if (img == null) this.ctx.drawImage(pos, 0, 0);
			else this.ctx.drawImage(img, pos.x, pos.y);
	}	
	
	/*
		Creates an image which repeats indefinitely in x, y or both directions
		repeat is a string "both"|"x"|"y"|"no-repeat"|""
	*/
	drawImageRepeat(o) {							// o:{ targetRect:Rect, position:Vector2, img:HTMLImageElement, size:Vector2, ?repeat:String, ?scale:Vector2 }
		const width  = ('scale' in o) ? o.scale.x * o.size.x : o.size.x;
		const height = ('scale' in o) ? o.scale.y * o.size.y : o.size.y;

		const w  = o.targetRect.width;
		const h  = o.targetRect.height;
		let   cx = Math.ceil(w / width);		// count
		let   cy = Math.ceil(h / height);
		const px = o.position.x % width;
		const py = o.position.y % height;
		
		var   sx = 0, sy = 0;
		if ('repeat' in o) {
			if (o.repeat == 'x' || o.repeat == 'both') {
				sx = (px > 0) ? -1 : 0;
				if (px < 0) cx++;
				if (o.repeat == 'x') cy = 1;
			}
		
			if (o.repeat == 'y' || o.repeat == 'both') {
				sy = (py > 0) ? -1 : 0;
				if (py < 0) cy++;
				if (o.repeat == 'y') cx = 1;
			}
		}
		
		if ('scale' in o) for (let y = sy; y < cy; y++)
			for (let x = sx; x < cx; x++)
				this.ctx.drawImage(o.img, o.targetRect.left + px + x * width, o.targetRect.top + py + y * height, width, height);
					else
				for (let y = sy; y < cy; y++) for (let x = sx; x < cx; x++)
					this.ctx.drawImage(o.img, o.targetRect.left + px + x * width, o.targetRect.top + py + y * height);
	}	
	
	/*
		Draws image on canvas. Supports scaling and clipping. 
		Note! All coordinates "pos", "size", "clip" are in source image space!
		Optional "clip" rectangle defines how many pixels to clip from each direction: top, left, right, bottom
	*/
	drawImageScale(o) {		// o:{ pos:Vector2, ?size:Vector2, img:HTMLImageElement, scale:Number, ?clip:Rect }
		const size = ('size' in o) ? o.size : { x:o.img.naturalWidth, y:o.img.naturalHeight };
		
		if ('clip' in o) {
			const cw = size.x - o.clip.right - o.clip.left;
			const ch = size.y - o.clip.bottom - o.clip.top;
			
			this.ctx.drawImage(o.img, 
							   o.clip.left, o.clip.top, 
							   cw, ch,
							   o.pos.x, o.pos.y,
					           cw * o.scale, ch * o.scale);					
		} else this.ctx.drawImage(o.img, o.pos.x, o.pos.y, size.x * o.scale, size.y * o.scale);
	}		
	
	/*
		Writes text on canvas
	*/
	textOut(pos, text, params) {
		if (params) {
			if ('font' in params)  this.ctx.font      = params.font;
			if ('color' in params) this.ctx.fillStyle = params.color;
		}
		this.ctx.fillText(text, pos.x, pos.y);
	}
	
	flipImage(img, flipH, flipV) {
		const width  = img.naturalWidth;
		const height = img.naturalHeight;
		
		const scaleH = flipH ? -1 : 1, 
		scaleV = flipV ? -1 : 1, 
        posX = flipH ? width * -1 : 0, 
        posY = flipV ? height * -1 : 0; 

		const ctx = this.ctx;
		ctx.save(); 
		ctx.scale(scaleH, scaleV);
		ctx.drawImage(img, posX, posY, width, height);
		ctx.restore();
	}
	
	/*
		Loads an image and draws it on Canvas
		
		Optional "mask" attribute generates a mask from the image. 
		The pixel R,G,B will be overwritten by "mask" color on non-zero alpha pixels.
	*/
	async loadImage(o) {	// o:{ pos:Vector2, url:string, ?dims:Vector2, maskStyle:string }
		return new Promise(r => {
			const img = new Image();
			img.onload = () => {
				if ('maskStyle' in o) {
					const tmp = new CanvasSurface({ dims:o.dims || this.size });
					
					tmp.ctx.fillStyle = o.maskStyle;
					tmp.ctx.fillRect(0, 0, tmp.canvas.width, tmp.canvas.height);					
					tmp.ctx.globalCompositeOperation = 'destination-in';
					
					if (o.dims) tmp.ctx.drawImage(img, o.pos.x, o.pos.y, o.dims.x, o.dims.y);
						else tmp.ctx.drawImage(img, o.pos.x, o.pos.y);
						
					this.drawImage(o.pos, tmp.canvas);
				} else {
					this.drawImage(o.pos, img, o.dims);
				}
				return r(img);
			}
			img.src = o.url;
		});
	}	
}

export { CanvasSurface }