/*

	Parallax scroller prototype for TGE
	Written by Ridge Batty (c) 2020
	
*/
import * as Utils from './utils.js';
import { Engine, Types } from './engine.js';
import { CanvasSurface } from './canvasSurface.js';
import { Layer } from './layer.js';

const { Vector2 : Vec2, Rect } = Types;

/*

	Parallax is the container component for Layer objects.	
	To create a new Parallax effect, create an instance of Parallax class with an array of layer images and their respective
	scrolling speeds as parameters.
	
*/
class Parallax {
	/**
	 * Creates a new parallax effect
	 * @param {object} o 
	 * @param {string=} o.path
	 * @param {CanvasSurface=} o.container
	 * @param {Types.Rect=} o.viewport
	 * @param {Types.Vector2=} o.position initial scroll position of the effect
	 * @param {number=} o.speed
	 * @param {number=} o.scale
	 * @param {string=} o.repeat string 'x'|'y'|'both'
	 */
	constructor(o) {
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

			const o     = Object.assign({ owner:this, img:images[i++], repeat:this.repeat, viewport:this.viewport }, layerData);
			const layer = new Layer(o);
			this.layers.push(layer);			
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

	/**
	 * Adds the Parallax effect into the gameLoop tickables pipeline (enable auto-update of the effect)
     * This is automatically called by the Make() static method
	 */
	stage() {
		if (!Engine.gameLoop.tickables.includes(this)) Engine.gameLoop.tickables.push(this);
	}

	/**
	 * Removes the Parallax effect from the gameLoop tickables pipeline (stop auto-update of the effect)
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

	/**
	 * This is the recommended method for creating new parallax effects.
	 * A new parallax effect is created from the data in parameter "o" or from file specified in "o.url".
	 * Automatically stages the effect once it's loaded.
	 * Returns a promise: can be run async or sync.
	 * @param {object} o
	 * @param {string} o.url
	 * @returns {promise}
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