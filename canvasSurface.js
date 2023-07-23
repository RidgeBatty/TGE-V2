/*

	TGE CanvasSurface
	
	Off-screen drawing surface
	
*/
import { Rect, RECT, Vector2, Color } from "./types.js";
import { downloadFile, isBoolean } from "./utils.js";
class CanvasSurface {
	/**
	 * 
	 * @param {object} o Parameters object.
	 * @param {Vector2=} o.dims Optional.
	 * @param {object=} o.flags Optional.
	 * @param {string=} o.name Optional.
	 * @param {Canvas=} o.canvas Optional.
	 * @param {boolean=} o.preferOffscreenCanvas Optional flag.
	 */
	constructor(o = {}) {	
		if ('canvas' in o) {
			var canvas = o.canvas;
		} else
		if (o.preferOffscreenCanvas) {
			try {
				var canvas = new OffscreenCanvas(o.dims.x, o.dims.y);
			} catch (e) {
				console.warn('Offscreen canvas not supported by this platform')
			}
		} 	

		if (canvas == null) var canvas = document.createElement('canvas');
		
		if ('dims' in o) {
			canvas.width  = o.dims.x;
			canvas.height = o.dims.y;
		}
		
		this.name     = o.name;
		this.ctx 	  = canvas.getContext('2d', o.flags);
		this.canvas   = canvas;
		
		this.isCanvasSurface = true;
		
		this.pixelSmooth = ('pixelSmooth' in o) ? o.pixelSmooth : true;		
	}

	toString() {
		return '[CanvasSurface]';
	}

	/**
	 * Converts internal Canvas to HTMLImageElement and optionally downloads it (saves as an image)
	 * @param {string} type Mime type ('image/png', 'image/bmp', 'image/webp')
	 * @param {number} [quality=1] Optional compression: 1 = no compression (default)
	 * @param {string} [filename=''] Optional filename, if not given (default) file download will not initiate
	 * @returns {HTMLImageElement}
	 */
	async toImage(type = 'image/png', quality = 1, filename = '') {
		if (!['image/png', 'image/webp', 'image/jpeg', 'png', 'webp', 'jpg'].includes(type)) throw new Error(`Unsupported image type: "${type}"`);

		if (type == 'png')  var type = 'image/png';
		if (type == 'jpg')  var type = 'image/jpeg';
		if (type == 'webp') var type = 'image/webp';

		const i = new Image();

		if ('toDataURL' in this.canvas) {
			i.src = this.canvas.toDataURL(type, quality);
			if (filename != '') return downloadFile(filename, i.src, type);
			return i;
		}
		
		// offscreencanvas
		const blob = await this.canvas.convertToBlob({ type, quality });		
		if (filename != '') return downloadFile(filename, blob, type);
		return blob;
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
	get rect()   { return RECT(0, 0, this.width, this.height) } 

	set width(v)  { this.canvas.width = v; }
	set height(v) { this.canvas.height = v; }
	set size(v) { this.setCanvasSize( v.x, v.y); }
	
	/*
		Sets bitmap image rendering mode. If "pixelSmooth" is true, pixels may appear blurred, especially when scaled up.
		Otherwise the images may have sharp pixels edges. Depending on game type either effect may be desirable.
		Note that these are browser specific render hints and may not produce the desided effect on all platforms.
	*/	
	set pixelSmooth(value) {		
		if (!isBoolean(value)) return;
		this._pixelSmooth = value;
		this.setCanvasSize(this.canvas.width, this.canvas.height);
	}
	
	get pixelSmooth() {
		return this._pixelSmooth;
	}

	resetTransform() {
		this.ctx.resetTransform();
		this.ctx.rotate(0);
		this.ctx.scale(1, 1);
	}	
	
	/**
	*	Define the width and height (in pixels) of the drawing surface.
	*/
	setCanvasSize(w, h) {
		const canvas = this.canvas;		
		if (canvas.width != w)  canvas.width = w;
		if (canvas.height != h) canvas.height = h;
		
		if (canvas instanceof HTMLCanvasElement) {
			if (this._pixelSmooth) {
				canvas.style.imageRendering = 'auto';						
			} else {
				canvas.style.imageRendering = 'pixelated crisp-edges';				
			}		
		}
	}
	
	/**
	 * Creates a CanvasSurface instance using image dimensions and draws the image on it.
	 * @param {HTMLImageElement} img 
	 * @returns {CanvasSurface} New canvasSurface instance
	 */
	static FromImage(img) {
		const dims = new Vector2(img.naturalWidth, img.naturalHeight);
		const s    = new CanvasSurface({ dims });		
		s.drawImage({ x:0, y:0 }, img);
		return s;
	}
	
	/**
	 * Clears the canvasSurface (makes all pixels fully transparent)
	 */
	clear() {
		this.ctx.clearRect(0, 0, this.width, this.height);
	}
	
	/**
	 * Draws a line between points p0 and p1. Note, that since you can't fill a line, the stroke style MAY be given directly as a string.
	 * @param {Vector2} p0 
	 * @param {Vector2} p1 
	 * @param {string|object} [style] Style as a string or as an object property
	 * @param {string=} style.stroke
	 */
	drawLine(p0, p1, style) {		
		if (style) this.ctx.strokeStyle = style.stroke ? style.stroke : style;		
		this.ctx.beginPath();
		this.ctx.moveTo(~~p0.x + 0.5, ~~p0.y + 0.5);
		this.ctx.lineTo(~~p1.x + 0.5, ~~p1.y + 0.5);
		this.ctx.stroke();		
	}

	/**
	 * Draws a crosshair of two vertical lines which extend from the edges of the canvas and cross at the given center point "c"
	 * @param {Vector2} c center point
	 * @param {*} style 
	 */
	drawCrosshair(c, style) {		
		if (style) this.ctx.strokeStyle = style.stroke ? style.stroke : style;		
		this.ctx.beginPath();
		this.ctx.moveTo(0, ~~c.y + 0.5);
		this.ctx.lineTo(this.canvas.width, ~~c.y + 0.5);
		this.ctx.moveTo(~~c.x + 0.5, 0);
		this.ctx.lineTo(~~c.x + 0.5, this.canvas.height);
		this.ctx.stroke();		
	}
	
	/**
	 * Draw an arrow from Vector2 to Angle, with Length and Scale (= relative size of the arrow head to the length)
	 * @param {Vector2} p 
	 * @param {object} o 
	 * @param {number} o.angle Angle of the arrow (in radians)
	 * @param {number} o.length Arrow length
	 * @param {number} [o.width=1] Arrow thickness
	 * @param {number} [o.head=10] Arrow head size (in pixels)
	 * @param {number} [o.sweep=0.75] Sweep angle strength of the arrow
	 * @param {string|object} [style] Style as a string or as an object property
	 * @param {string=} style.stroke	 
	 */
	drawArrow(p, o, style) {	
		const h = (o.sweep ? o.sweep : 0.75) * Math.PI;
		const s = ('head' in o) ? o.head : 10;
		const a = o.angle;
		const w = ('width' in o) ? o.width : 1;

		if (style) this.ctx.strokeStyle = style.stroke ? style.stroke : style;		
		this.ctx.beginPath();		

		let ps, t, b;
		
		// right side of the arrow
		ps = Vector2.Up().rotate(a + Math.PI / 2).mulScalar(w / 2).add(p);
		this.ctx.moveTo(ps.x + 0.5, ps.y + 0.5);		
		
		t = Vector2.Up().rotate(a).mulScalar(o.length).add(ps);						// tip
		this.ctx.lineTo(t.x + 0.5, t.y + 0.5);		
		
		b = Vector2.Up().rotate(a + h).mulScalar(s).add(t);							// sweep back
		this.ctx.lineTo(b.x + 0.5, b.y + 0.5);		

		// left side of the arrow
		ps = Vector2.Up().rotate(a - Math.PI / 2).mulScalar(w / 2).add(p);
		this.ctx.moveTo(ps.x + 0.5, ps.y + 0.5);		
		
		t = Vector2.Up().rotate(a).mulScalar(o.length).add(ps);						// tip
		this.ctx.lineTo(t.x + 0.5, t.y + 0.5);		
		
		b = Vector2.Up().rotate(a - h).mulScalar(s).add(t);							// sweep back
		this.ctx.lineTo(b.x + 0.5, b.y + 0.5);				
		
		if (w != 1) {
			let w = this.ctx.lineWidth;
			this.ctx.lineWidth = o.width || 1;		
			this.ctx.stroke();		
			this.ctx.lineWidth = w;
		} else 
			this.ctx.stroke();		
	}
	
	/**
	 * Draw a line segment on canvas. Accepts Types.LineSegment or an array of coordinates (x0, y0, x1, y1) as parameters.
	 * @param {Types.LineSegment|[number]} line 
	 * @param {string|object} [style] Style as a string or as an object property
	 * @param {string=} style.stroke	 
	 */
	drawSeg(line, style) {	
		if (style) this.ctx.strokeStyle = style.stroke ? style.stroke : style;		
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
	
	/**	
	 * Draw a polygon on canvas. Accepts an array of Vector2 as parameter
	 * @param {[Vector2]} points 
	 * @param {object} [p] Options style object
	 * @param {string} [p.stroke='black'] Stroke (outline color)
	 * @param {string=} p.fill Optional fill color	   
	 */
	drawPoly(points, p = { stroke:'black' }) {	
		this.ctx.beginPath();
		
		if (Array.isArray(points) && points.length > 1) {
			this.ctx.moveTo(points[0].x, points[0].y);
			for (var i = 1; i < points.length; i++) {
				this.ctx.lineTo(points[i].x, points[i].y);
			}
			this.ctx.lineTo(points[0].x, points[0].y);
		}
		this.ctx.closePath();
		if (p.stroke)	{ this.ctx.strokeStyle = p.stroke; this.ctx.stroke(); }
		if (p.fill)		{ this.ctx.fillStyle   = p.fill;   this.ctx.fill(); }
	}

	/**	
	 * Draw a polygon on canvas with a cutout. Accepts two arrays of Vector2 as parameter. First is the filled shape, seconds in the ARRAY of cutouts.
	 * @param {Vector2[]} fillPoints
	 * @param {Vector2[[]]} cutOuts
	 * @param {object} [p] Options style object
	 * @param {string} [p.stroke='black'] Stroke (outline color)
	 * @param {string=} p.fill Optional fill color	  
	 */
	 drawPolyCut(fillPoints, cutOuts, p = { stroke:'black' }) {	
		if (!Array.isArray(fillPoints) || fillPoints.length < 2 || !Array.isArray(cutOuts)) return;

		this.ctx.beginPath();		
		this.ctx.moveTo(fillPoints[0].x, fillPoints[0].y);
		for (var i = 1; i < fillPoints.length; i++) {
			this.ctx.lineTo(fillPoints[i].x, fillPoints[i].y);
		}
		this.ctx.lineTo(fillPoints[0].x, fillPoints[0].y);
		this.ctx.closePath();

		for (const cutPoints of cutOuts) {			
			this.ctx.moveTo(cutPoints[0].x, cutPoints[0].y);
			for (var i = 1; i < cutPoints.length; i++) {
				this.ctx.lineTo(cutPoints[i].x, cutPoints[i].y);
			}
			this.ctx.lineTo(cutPoints[0].x, cutPoints[0].y);
			this.ctx.closePath();		
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
		
	/**
	 * Draw a quad on canvas. Accepts an array of Number as parameter
	 * @param {[Vector2]} points 	 
	 * @param {object} [p] Options style object
	 * @param {string} [p.stroke='black'] Stroke (outline color)
	 * @param {string=} p.fill Fill color	  
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

	/**
	 * @desc Draws a rectangle on the canvas
	 * @param {number} x 
	 * @param {number} y 
	 * @param {number} w Width
	 * @param {number} h Height 
	 * @param {object} [p] Options style object
	 * @param {string} [p.stroke='black'] Stroke (outline color)
	 * @param {string=} p.fill Optional fill color	  
	 */
	drawRectangle(x, y, w, h, p = { stroke:'black' }) {
		if (p.fill) { 
			this.ctx.fillStyle = p.fill; 			
			this.ctx.fillRect(~~x, ~~y, ~~w, ~~h); 
		}
		if (p.stroke) {			
			this.ctx.strokeStyle = p.stroke; 
			this.ctx.strokeRect(~~x, ~~y, ~~w, ~~h);
		}
	}

	/**
	 * Draws a rectangle on the canvas
	 * @param {Types.Rect} r 
	 * @param {object} [p] Options style object
	 * @param {string} [p.stroke='black'] Stroke (outline color)
	 * @param {string=} p.fill Optional fill color	  
	 */
	drawRect(r, p = {}) {
		if (p.fill) { 
			this.ctx.fillStyle = p.fill; 			
			this.ctx.fillRect(~~r.left, ~~r.top, ~~r.width, ~~r.height); 			
		}
		if (p.stroke) {			
			this.ctx.strokeStyle = p.stroke; 
			this.ctx.strokeRect(~~r.left, ~~r.top, ~~r.width, ~~r.height);
		}
	}

	drawEllipse(r, p = {}) {		
		this.ctx.beginPath();		
		const w = Math.abs(r.width);
		const h = Math.abs(r.height);
		const x = r.center.x;
		const y = r.center.y;
		this.ctx.ellipse(x, y, w * 0.5, h * 0.5, 0, 0, 2 * Math.PI);		
		if (p.stroke) {
			this.ctx.strokeStyle = p.stroke; 	
			this.ctx.stroke();
		}
		if (p.fill) { 
			this.ctx.fillStyle = p.fill; 	
			this.ctx.fill();
		}		
	}
	
	/**
	 * @desc Draws a circle on the canvas
	 * @param {Vector2} center
	 * @param {Number} radius
	 * @param {Object} [p] Parameters object { stroke, fill [optional] }
	 * @param {string} [p.stroke="black"] Stroke (outline) color
	 * @param {string} [p.fill] Fill color 	 
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
		Set individual pixel in World canvas. Note that this extremely slow and is not recommended to be used in real-time graphics.
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
	
	/**
	 * Draws image on canvas. 
	 * @param {Vector2=} pos Optional position (if not provided, draws at 0,0)
	 * @param {HTMLImageElement|CanvasSurface} img 
	 */
	drawImage(pos, img) {
		if (pos == null) this.ctx.drawImage(img, 0, 0);
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
	
	/**	 
	 *	Draws image on canvas. Supports scaling and clipping. 
	 *	Note! All coordinates "pos", "size", "clip" are in source image space!
	 *	Optional "clip" rectangle defines how many pixels to clip away from the "img" in each direction: top, left, right, bottom
	 * @param {object} o Parameters object
	 * @param {Vector2} o.pos Draw position on the target canvas
	 * @param {Image} o.img HTMLImageElement or equivalent
	 * @param {number=} o.scale Scale of the image, defaults to 1
	 * @param {Vector2=} o.size Optional
	 * @param {Rect} o.clip Optional clip rectange
	 */
	drawImageScale(o) {		
		let scaleX = 1, scaleY = 1;

		if ('scale' in o) {
			if (isNaN(o.scale)) {
				scaleX = o.scale.x;
				scaleY = o.scale.y;							
			} else {
				scaleX = o.scale;
				scaleY = o.scale;
			}
		} 
		
		if ('width' in o.img && 'height' in o.img) var size = { x:o.img.width, y:o.img.height }
			else var size = ('size' in o) ? o.size : { x:o.img.naturalWidth, y:o.img.naturalHeight };

		if ('clip' in o) {
			const cw = size.x - o.clip.right - o.clip.left;
			const ch = size.y - o.clip.bottom - o.clip.top;
			
			this.ctx.drawImage(o.img, 
							   o.clip.left, o.clip.top, 
							   cw, ch,
							   o.pos.x, o.pos.y,
					           cw * scaleX, ch * scaleY);					
		} else this.ctx.drawImage(o.img, o.pos.x, o.pos.y, size.x * scaleX, size.y * scaleY);
	}		

	/**
	 * 
	 * @param {object} o 
	 * @param {Rect} o.clip Clip rectangle
	 * @param {Vector2} o.pos Draw position on the target canvas	 
	 * @param {Vector2=} o.size Optional
	 * @param {Image} o.img HTMLImageElement or equivalent
	 */
	drawImageClip(o) {
		if ('width' in o.img && 'height' in o.img) var size = { x:o.img.width, y:o.img.height }
			else var size = ('size' in o) ? o.size : { x:o.img.naturalWidth, y:o.img.naturalHeight };
		
		const cw = size.x - (o.clip.right - o.clip.left);
		const ch = size.y - (o.clip.bottom - o.clip.top);
		
		this.ctx.drawImage(o.img, 
							o.clip.left, o.clip.top, 
							cw, ch,
							o.pos.x, o.pos.y,
							cw, ch);	
	}
	
	/**
	 * Writes text on canvas
	 * 
	 * @param {Vector2} pos 
	 * @param {string} text 
	 * @param {object} params Optional parameters object
	 * @param {string=} params.font
	 * @param {string=} params.color
	 * @param {string=} params.stroke
	 * @param {string=} params.textAlign
	 * @param {string=} params.textBaseline ("top","hanging","middle","alphabetic","ideographic","bottom")
	 * @param {string=} params.shadow ofsx ofsy shadowlength shadowcolor ("1px 1px 2px black")
	 */
	textOut(pos, text, params) {
		if (params) {
			if ('font' in params)  this.ctx.font = params.font;
			if ('color' in params) this.ctx.fillStyle = params.color;
			if ('textAlign' in params) this.ctx.textAlign = params.textAlign;
			if ('textBaseline' in params) this.ctx.textBaseline = params.textBaseline;	
			if ('shadow' in params) this.ctx.filter = `drop-shadow(${params.shadow})`;		
		}

		this.ctx.fillText(text, pos.x, pos.y);

		if ('stroke' in params) {
			this.ctx.strokeStyle = params.stroke;
			this.ctx.strokeText(text, pos.x, pos.y);
		}

		this.ctx.filter = 'none';
	}

	/**
	 * 
	 * @param {string} text 
	 * @param {string} font 
	 * @param {string} align left, right, center, start, end
	 * @param {string} baseline top, hanging, middle, alphabetic, ideographic, bottom
	 */
	textBoundingBox(text, font, align = 'left', baseline = 'alphabetic') {
		this.ctx.font = font;
		this.ctx.textAlign = align;
		this.ctx.textBaseline = baseline;
		const m = this.ctx.measureText(text);
		return new Rect(m.actualBoundingBoxLeft, m.fontBoundingBoxAscent, m.actualBoundingBoxRight, m.fontBoundingBoxDescent);
	}

	clipRect(r, cornerRadius = 0) {
		this.ctx.beginPath();
		if (cornerRadius) {
			this.ctx.roundRect(r.x, r.y, r.width, r.height, cornerRadius);	
		} else {
        	this.ctx.rect(r.x, r.y, r.width, r.height);
		}
        this.ctx.clip();
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
	
	/**
	 * Loads an image and draws it on this CanvasSurface.
	 * Optional "mask" attribute generates a mask from the image, which is useful for pixel-precise hit detection.
	 * If maskStyle is defined, all image pixels with non-zero alpha will be overwritten by "maskStyle" color.
	 * @param {object} o 
	 * @param {string} o.url URL of the image
	 * @param {Vector2} o.pos Desired top left corner position of the image
	 * @param {Vector2} o.dims Desired width and height of the image	 
	 * @param {string} o.url URL of the image
	 * @param {string=} o.maskStyle Optional mask color
	 * @returns {<promise>}
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
