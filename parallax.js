/*

	Parallax scroller prototype for TGE
	Written by Ridge Batty (c) 2020
	
*/
import * as Utils from './utils.js';
import { Engine, Types } from './engine.js';
import { CanvasSurface } from './canvasSurface.js';

const { Vector2 : Vec2, Rect } = Types;

/*
	Layer represents a single Parallax layer. Typically you do NOT need to create Layer instances.
*/
class Layer {
	constructor(o, img) {			// o:{}, img:HTMLImageElement
		const data = o.layerData;
		Object.assign(this, o);			

		this.img       = img;
		this.increment = ('increment' in data) ? Vec2.FromStruct(data.increment) : Vec2.Zero();
		this.offset    = ('offset' in data) ? Vec2.FromStruct(data.offset) : Vec2.Zero();
		this.scale     = ('scale' in data) ? Vec2.FromStruct(data.scale) : new Vec2(1, 1);
		this.zIndex    = data.zIndex;
	}
	
	set x(value) { this._x = value == null ? 0 : value; }	
	get x() 	 { return this._x; }
	
	set y(value) { this._y = value == null ? 0 : value; }	
	get y() 	 { return this._y; }

	get position() { return new Vec2(this._x, this._y); }
	
	tick() {
		this._x = this.increment.x * this.owner.position.x + this.offset.x + this.increment.x;		
		this._y = this.increment.y * this.owner.position.y + this.offset.y + this.increment.y;				
	}

	update() {		
		Engine.renderingSurface.drawImageRepeat({
			targetRect: this.owner.viewport,
			position: this.position,
			img: this.img,
			repeat: this.owner.repeat,
			size: new Vec2(this.img.naturalWidth, this.img.naturalHeight),
			scale: this.scale,
		});
	}
}

/*

	Parallax is the container component for Layer objects.	
	To create a new Parallax effect, create an instance of Parallax class with an array of layer images and their respective
	scrolling speeds as parameters.
	
*/
class Parallax {
	constructor(o) {		// o:{ path, container:CanvasSurface }		
		this.container = ('container' in o) ? o.container : new CanvasSurface({ name:'Parallax', dims:Engine.dims });		
		this.layers    = [];		

		this.setDefaults(o);
	}		

	setDefaults(o) {
		this.defaultPath = ('path' in o) ? o.path : '';
		this.viewport    = ('viewport' in o) ? Rect.FromStruct(o.viewport) : Engine.screen.clone();
		this.position    = Vec2.Zero();
		this.speed       = ('speed' in o) ? Vec2.FromStruct(o.speed) : Vec2.Zero();
		this.scale       = ('scale' in o) ? Vec2.FromStruct(o.scale) : new Vec2(1, 1);
		this.repeat      = ('repeat' in o) ? o.repeat : 'x';				
	}
		
	async _addLayers(o) {	
		let path = ('path' in o) ? o.path : this.defaultPath;
		if (path.length > 0 && path[path.length - 1] != '/') path += '/';		
		
		const images = await Utils.preloadImages({ urls:o.layers.map(e => e.filename), path });

		let i = 0;
		for (const layerData of o.layers) {
			if (!('scale' in layerData)) layerData.scale = this.scale.clone();

			const layer = new Layer({ owner:this, layerData }, images[i++]);
			this.layers.push(layer);
			// console.log(Engine.gameLoop);			
			Engine.gameLoop.zLayers[layer.zIndex].push(layer);
		}
	}
	
	destroyLayers() {		
		this.layers.length = 0;
	}
	
	tick() {
		this.position.add(this.speed);				
	}	

	update() {

	}
			
	async buildFromData(data) {				
		return new Promise(async (resolve, reject) => {
			try {
				this.destroyLayers();
				this.setDefaults(data);
				await this._addLayers(data);
				resolve();
			} catch (e) {
				reject(e);
			}		
		});
	}

	/*
		 Adds the Parallax effect into the gameLoop tickables pipeline (enable auto-update of the effect)
		 This is automatically called by the Make() static method
	*/
	stage() {
		if (!Engine.gameLoop.tickables.includes(this)) Engine.gameLoop.tickables.push(this);
	}

	/*
		Removes the Parallax effect from the gameLoop tickables pipeline (stop auto-update of the effect)
	*/
	unstage() {
		const t = Engine.gameLoop.tickables;
		for (let i = t.length; i--;) if (t[i] === this) t.splice(i, 1);	
	}
	
	async loadFromFile(url) {
		return new Promise(async (resolve, reject) => {
			try {
				if ( !url ) throw 'URL must be specified';		
				const result = await Utils.getJSON(url);					
				resolve(result);
			} catch (e) {
				reject(e);
			}
		});
	}

	/*
		This is the recommended method for creating new parallax effects.

		A new parallax effect is created from the data in parameter "o" or from file specified in "o.url".
		Automatically stages the effect once it's loaded.
		Returns a promise: can be run async or sync.
	*/
	static async Make(o) {
		return new Promise(async (resolve, reject) => {
			try {
				let   data = o;
				const p    = new Parallax(o);
				if ('url' in o) {
					data = await p.loadFromFile(o.url);
				}				
				await p.buildFromData(data);
				p.stage();
				resolve(p);
			} catch (e) {				
				reject(e);
			}
		});
	}
}

export { Parallax, Layer }
