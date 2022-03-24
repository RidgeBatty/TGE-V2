/*

	TGE Canvas Particles	
	Written by Ridge Batty (c) 2021-2022

	About emitter tick events a.k.a. updating the emitter and particle state:
	Emitter.tick()               - regular tick function which you set up using emitter.addEvent(). It is called once per every Engine tick.
	Emitter.initParticleTick()   - assigned directly to point to your function, and it's called for EVERY particle once, when the particle is born. It will send the current particle as parameter.
	Emitter.evolveParticleTick() - assigned directly to point to your function, and it's called for EVERY particle once per every Engine tick. It will send the current particle as parameter.

	Example:
	myEmitter.initParticleTick = (particle) => { ...do stuff with particle when its born... }

	About value tracking:
	initParticle.textSettings.color = 'particle'		- will make the text color to track the evolveParticle.tint.colorStops
	evolveParticle.opacity			= 'lifetime'		- will make the particle opacity track the particle lifetime
	
*/
import { CanvasSurface } from './canvasSurface.js';
import { Engine, Types } from './engine.js';
import { EventBroadcaster } from './eventBroadcaster.js';
import { wrapBounds, preloadImages, imgDims } from './utils.js';
import { Polygon } from './shapes.js';
import { Vector2 } from './types.js';
import { getJSON } from './utils.js';

const Vec2    = Types.Vector2;
const Color   = Types.Color;
const Filters = {
	'blur'        : 'px',
	'brightness'  : '',
	'contrast'    : '',
	'grayscale'   : '',
	'hue-rotate'  : 'deg',
	'saturate'    : '',
	'sepia'       : ''
}
const ParticleShapes = ['none', 'circle', 'square', 'ring', 'triangle', 'polygon', 'star', 'custom'];

class ParticleData {
	constructor(p) {
		Object.assign(this, p);
	}

	get img() {
		return this._img;
	}

	set img(image) {
		this._img        = image;
		this._cachedSize = imgDims(image);
	}
}

/** 
	@param {string=} prop - property name
	@param {object} o - object where to look for the property
*/
const calc = (prop, o, defaultValue= 0) => {
	if (Array.isArray(o[prop])) {
		return o[prop][Math.floor(Math.random() * o[prop].length)];		
	}
	if (o[prop] instanceof Color) {		
		return o[prop];
	}
	if (typeof o[prop] == 'object') {	
		return (Math.random() * (o[prop].max - o[prop].min)) + o[prop].min;
	}
	return (prop in o) ? o[prop] : defaultValue;
}	

const deserializeColorProperty = (prop, o) => {	
	if (o[prop] == null) return null;
	if (Array.isArray(o[prop])) return o[prop].map(e => Color.FromCSS(e));			   // deserialize an array of colors		
	return Color.FromCSS(o[prop]);																// deserialize single color
}
class Emitter extends EventBroadcaster {
	/**
	 * DO NOT CALL MANUALLY! Use ParticleSystem.addEmitter() to create Emitter instances!
	 * @param {ParticleSystem} particleSystem Owner	 
	 */
	constructor(particleSystem) {		
		super(['destroy','complete','tick']);
	
		this.particleSystem = particleSystem;		
		this.particles      = [];
		this._running       = false;
		this._isDestroyed   = false;
		this._imageList     = [];
		this._maxDrawCount  = 100;								// default to 100 simultaneous particles
		this._tmpCanvas     = null;
		this.data           = {};								// user data
		this.position		= Vec2.Zero();				

		this.initParticleTick    = null;
		this.evolveParticleTick  = null;	
	}
	
	destroy() {
		if (this._isDestroyed) return;

		this._fireEvent('destroy');

		const ps = this.particleSystem;
		for (let i = ps.emitters.length; i--;) if (ps.emitters[i] === this) ps.emitters.splice(i, 1);
		const count = ps.gameLoop.removeFromZLayers(this);	
	}
	
	get isActive()      { return this._running; }
	set isActive(state) { if (state === true || state === false) this._running = state; }

	get params()  { return this._params; }
	set params(p) { throw 'Params object is READ ONLY after the Emitter has been initialized!'; }

	get img() { return this._imageList[Math.floor(Math.random() * this._imageList.length)]; }

	/**
	 * Use this for debugging your emitter parameters structure!
	 * @param {*} params 
	 */
	analyze(params) {
		console.warn('Running Emitter.analyze() to check parameters. Do not use in production code!');
		try {
			if ('initParticle' in params) {			
				const init = params.initParticle;
				if ('filters' in init) {				
					if (!Array.isArray(init.filters)) throw 'initParticle.filter must be an array.';
					
					const filterKeys = Object.keys(Filters);
					for (const f of init.filters) {
						if (typeof f != 'object') throw 'Filter must be defined by an object which contains "name" and "value" fields.';
						if (!filterKeys.includes(f.name)) throw `Illegal filter name: "${f.name}".`;
					}

					if ('velocity' in init) {
						if (!['radial', 'square'].includes(init.velocity)) throw `Invalid velocity parameter: "${init.velocity}".`;
					}
				}

				if ('shape' in init) {
					if (!('type' in init.shape)) throw 'Shape type is missing in params.initParticle.shape';
					if (!ParticleShapes.includes(init.shape.type)) throw `Shape type "${init.shape.type}" is not supported in params.initParticle.shape`;
				}
			}
			if ('gravity' in params) {			
				if (params.gravity.type != 'point') throw `Only point gravity is currently supported -> params.gravity : { type : 'point' }`;
			}
		} catch (e) {
			console.error(e);
		}
	}
	
	/**
	 * DO NOT CALL MANUALLY!
	 * Set initial state for this emitter. Called internally by Emitter.start()
	 */
	async _initEmitter(params) {		
		this._params     = AE.clone(params);
		
		Object.seal(this._params.initParticle);
		Object.seal(this._params.evolveParticle);

		this.name	     = ('name') in params ? params.name : null;
		this.emitSpeed   = params.emitSpeed || 1;				// how many particles to emit per tick?	1 = 60/second
		this.angle 	 	 = calc('angle', params);	  // rotation of the emitter				
		this.delay	     = calc('delay', params);	  // emitter start delay
		this.maxDelay    = params.delay || 0;		
		this.textContent = params.textContent || '';			
		this.emitCount   = params.emitCount || 0;				// 0 = emit unlimited number of particles
		this.emitMax     = ('emitMax' in params) ? params.emitMax : Infinity;	// how many particles to emit total?		
		this.activeParticleCount = 0;
		this.compositeOperation  = ('compositeOperation' in params) ? params.compositeOperation : null;

		if ('position' in params) this.position = Vec2.FromStruct(params.position);		
		this.pivot	     = null;
		
		// different from emitter.isActive, which, when turned off, shuts down everything (including living particles)
		// this controls whether new particles are being spawned during tick or not
		this.spawnParticles   = ('spawnParticles' in params) ? params.spawnParticles : true;	

		this._emitLeft   = this.emitCount;						// internal counter for emitted particles
		this._emitFrac   = 0;									// helper to keep track of the fractional part of emitted particles	
		
		if (params.type == 'box') {
			this.size   = params.size || { x:0, y:0 };
		}
		if (params.type == 'circle') {
			this.radius      = params.radius || 0;
			this.innerRadius = params.innerRadius || 0;
			this.startAngle  = calc('startAngle', params, null);				// applies to circle emitter only: start angle of the arc
			this.endAngle    = calc('endAngle', params, null);					// applies to circle emitter only: end angle of the arc
			this.arc         = calc('arc', params);											// TO-DO: not implemented yet
		}

		if (params.gravity) {			
			this.evolveGravity = {
				position : Vec2.FromStruct(params.gravity.position),
				mass     : params.gravity.mass
			}
		}

		this.zIndex    = ('zIndex' in params) ? params.zIndex : 1;
		this.surface   = ('surface' in params) ? params.surface : Engine.renderingSurface;		
						
		if ('imgUrl' in params) {
			const urls      = Array.isArray(params.imgUrl) ? params.imgUrl : [params.imgUrl];
			this._imageList = await preloadImages({ urls });
		}

		// initParticle and evolveParticle are PER PARTICLE SETTINGS!

		// deserialize init params:
		if (params.initParticle) {
			const shape = params.initParticle.shape;
			if (shape) {
				this.initFillColor = deserializeColorProperty('fillColor', shape);			
			}
			const textSettings = Object.assign({}, params.initParticle.textSettings);
			if (textSettings) {
				this.initTextColor = deserializeColorProperty('color', textSettings);			
			}
			this.initTextSettings = textSettings;
			
			if (this.initParticleTick == null && ('tick') in params.initParticle) this.initParticleTick = params.initParticle.tick;			// init tick function for each particle (saved in emitter)
			if (params.initParticle.tint) this._tmpCanvas = new CanvasSurface();															// tmp canvas is needed ONLY for tinting images
		}

		// deserialize evolve params:
		if (params.evolveParticle) {					
			const tint = params.evolveParticle.tint;
			if (tint) {
				this.evolveTargetColor = deserializeColorProperty('targetColor', tint);			
				this.evolveColorStops  = deserializeColorProperty('colorStops', tint);												
			}
			if (this.evolveParticleTick == null && ('tick') in params.evolveParticle) this.evolveParticleTick = params.evolveParticle.tick;	// evolve tick function for each particle (saved in emitter)
		}
		
		this._createParticles(params.maxDrawCount);
	}
	
	start() {				
		this._initEmitter(this.params);		
		this._running = true;		
	}
	
	/** 
	 * DO NOT CALL MANUALLY! This is called internally when all the particles need to be initialized to default state
	 * Initialize all drawable particles for this emitter
	*/
	_createParticles(count) {
		if (count) this._maxDrawCount = count;
		
		for (let i = count; i--;) {
			const p = new ParticleData({
				img          : null,
				opacity		 : 1,
				lifeTime     : 0,
				maxLife      : 0,
				position     : Vec2.Zero(),
				velocity     : Vec2.Zero(),			// travel direction
				angle        : 0,						// initial travel direction (used to calculate velocity)
				angularSpeed : 0,						// initial rate of 'angle' change
				angularWeight: 0.1,
				rotation     : 0,						// rotation of the particle image - independent of travel angle!
				speed		 : 0,				
				scale		 : 1,
				active		 : false,
				delay        : 0,
				visible      : true,	
				textContent  : null,				
			});						
			this.particles[i] = p;
		}				
	}
	
	getSpawnCount() {
		this._emitFrac += this.params.emitSpeed;
		let emit        = this._emitFrac | 0;					// how many particles to emit on current frame?
					
		if (emit >= 1) this._emitFrac = this._emitFrac - Math.floor(this._emitFrac);
		if (emit == 0) return 0;
					
		if (this._emitLeft > 0) this._emitLeft -= emit;			// do we have any particles left to be emitted?
		
		return emit;
	}

	createParticle(p) {
		const init = this.params.initParticle;				// information about the particle initial state		
		
		switch (this.params.type) {	// using emitter parameters:
			case 'box': {																	// size:vec2
				p.position.x = Math.random() * this.size.x - this.size.x / 2;
				p.position.y = Math.random() * this.size.y - this.size.y / 2;
				break;
			}
			case 'circle': {																// start and end angle (to create an arc), innerRadius, radius					
				let a        = (this.startAngle != null) ? (Math.random() * Math.PI * this.endAngle + Math.random() * Math.PI * this.startAngle) : Math.random() * Math.PI * 2;		
				if ('arc' in this) {
					// TO-DO
				}

				const r      = Math.random() * (this.radius - this.innerRadius) ** 2;
				const ir     = this.innerRadius ** 2;
				
				p.position.x =  Math.sin(a) * Math.sqrt(r + ir);
				p.position.y = -Math.cos(a) * Math.sqrt(r + ir);
				break;
			}
			case 'point': p.position = Vec2.Zero();	
		}

		if (this.pivot) p.position.add(this.pivot.clone().sub(this.position).rotate(-this.angle * Math.PI));
		
		// if particle has img defined, use it - otherwise try to fall back to img defined in emitter
		p.img    = ('img' in init) ? init.img : this.img;

		p.scale  = 1;
		p.scaleX = 1;
		p.scaleY = 1;

		if ('scale' in init) {
			p.scale = calc('scale', init);					
		} else {
			if ('scaleX' in init) p.scaleX = calc('scaleX', init);
			if ('scaleY' in init) p.scaleY = calc('scaleY', init);				
		}
		
		p.lifeTime      = calc('life', init);
		p.maxLife       = p.lifeTime;
		p.angle         = calc('angle', init);				
		p.rotation      = calc('rotation', init);
		p.angularSpeed  = calc('angularSpeed', init);
		p.angularWeight = calc('angularWeight', init);
		p.speed         = calc('speed', init);
		p.opacity       = calc('opacity', init, 1);
		p.textContent   = init.textContent;
		p.textSettings  = this.initTextSettings;

		// apply filters
		if ('filters' in init) {
			p.filter = '';
			for (const f of init.filters) {
				const value = calc('value',f);				
				p.filter += `${f.name}(${value}${Filters[f.name]})`;
			}				
		}

		// colorize
		if ('tint' in init) {				
			p.tintColor = calc('color', init.tint);				
		}
		
		// initial particle velocity
		if ('velocity' in init) {
			if (init.velocity == 'radial') p.velocity = p.position.clone().normalize().mulScalar(p.speed);				
				else
			if (init.velocity == 'square') {
				const ang  = (Math.floor((wrapBounds(p.position.clone().toAngle(), 0, Math.PI * 2) + Math.PI * 0.25) / (Math.PI * 0.5)) % 4);
				
				if (ang == 0) p.velocity = new Vec2(0, -1);
				if (ang == 1) p.velocity = new Vec2(1, 0);
				if (ang == 2) p.velocity = new Vec2(0, 1);
				if (ang == 3) p.velocity = new Vec2(-1, 0);

				p.velocity.mulScalar(p.speed);
			}
				else p.velocity = Vec2.FromStruct(init.velocity);										
		} else
			p.velocity   = Vec2.FromAngle(p.angle * Math.PI, p.speed);			

		if ('shape' in init) {
			p.shape     = ParticleShapes.findIndex(e => e == init.shape.type);
			p.fillColor = calc('fill',this);				
			if (p.shape == 3) p.points = Polygon.Ring(calc('innerRadius', init.shape), calc('outerRadius', init.shape), Math.round(calc('points', init.shape)));
			if (p.shape == 4) p.points = Polygon.Triangle(1);
			if (p.shape == 5) p.points = Polygon.Ngon(calc('points', init.shape));
			if (p.shape == 6) p.points = Polygon.Star(calc('innerRadius', init.shape), calc('outerRadius', init.shape), Math.round(calc('points', init.shape)));				
			if (p.shape == 7) p.points = init.shape.points.map(e => e);		
		}

		// precalculate evolve parameters for particles
		const evolve = this.params.evolveParticle;				
		if (evolve) {
			if ('force'   in evolve) p.evolveForce           = Vec2.FromStruct(evolve.force);
			if ('tint'    in evolve) {					
				if (this.evolveTargetColor) p.evolveTint = calc('evolveTargetColor', this);			
			}
			if ('opacity' in evolve)      p.evolveOpacity      = evolve.opacity;
			if ('acceleration' in evolve) p.evolveAcceleration = evolve.acceleration;
			if ('scale' in evolve)        p.evolveScale        = evolve.scale;
		}	

		return p;
	}
	
	spawn(singleParticle) {		
		let spawned = null;

		if (!singleParticle) {
			var emit = this.getSpawnCount();		
		} else {
			var emit = 1;
		}
		
		for (const p of this.particles) if (!p.active && emit > 0) {			
			if (this.emitCount >= this.emitMax) break;

			spawned = this.createParticle(p);
			
			// custom function:
			if (this.initParticleTick) this.initParticleTick(p);
				
			p.active = true;
			emit--;					// decrement emitted particles counter	

			this.emitCount++;		// add total emitted counter
		}
		
		if (singleParticle) return spawned;
	}
	
	tick() {
		if (!this._running) return;
		
		this._fireEvent('tick');	// emitter tick
		
		// delay the update by "delay" frames (comes from emitter)
		if (this.delay > 0) { this.delay--; return }		
				
		// delayed spawn
		for (const p of this.particles) if (p.delay > 0) p.delay--; 
					
		if ( this.spawnParticles ) this.spawn();					// if emitter is active, spawn new particle(s) 
				
		let deadParticles = 0;
		for (const p of this.particles) {							// apply transforms to spawned bits					
			// decrement lifetime and inactivate dead particles			
			p.lifeTime--;
			if (p.lifeTime < 1) p.active = false;
			if ( !p.active ) {
				deadParticles++;
				continue;
			}
				
			// evolve
			const m = 1 - p.lifeTime / p.maxLife;
			if (p.evolveOpacity == 'lifetime') p.alpha = p.lifeTime / p.maxLife;			// opacity follows lifetime?
			if (p.evolveForce)  p.velocity.add(p.evolveForce);
			if (p.evolveAcceleration)  p.velocity.mulScalar(p.evolveAcceleration);			
			if (this.evolveColorStops) {
				const c1 = this.evolveColorStops[Math.floor(m * (this.evolveColorStops.length - 1))];
				const c2 = this.evolveColorStops[Math.ceil(m * (this.evolveColorStops.length - 1))];					
				p.outColor = Color.Lerp(c1, c2, m);												
			} else
			if (this.evolveTargetColor) {
				if (p.fillColor) p.outColor = Color.Lerp(p.fillColor, p.evolveTint, m);
				if (this.initTextColor) p.outColor = Color.Lerp(this.initTextColor, p.evolveTint, m);
			}

			if (p.evolveScale) p.scale  *= p.evolveScale;
			
			// apply effect of angular speed to particles
			if (p.angularSpeed) p.angle += p.angularSpeed;
			p.velocity.add(Vec2.FromAngle(p.angle, p.angularWeight));

			// apply gravity
			const g = this.evolveGravity;
			if (g) {								
				let dx = p.position.x - g.position.x;
				let dy = p.position.y - g.position.y;
				let distSq = Math.max(dx * dx + dy * dy, 4000);
				let f = g.mass / (distSq * Math.sqrt(distSq));
				p.velocity.add(new Vec2(-dx * f, -dy * f));
			}								

			p.position.add(p.velocity);			

			if (this.evolveParticleTick)  this.evolveParticleTick(p);
		}

		// condition met for stopping the emitter?
		if (this.emitCount == this.emitMax && deadParticles == this.particles.length) {
			this._running = false;
			this._fireEvent('complete');
		}
	}
	
	update() {		
		if (!this._running) return;

		const tmp = this._tmpCanvas,	
		      ctx = this.surface.ctx,
		      pos = Vec2.Zero();		

		this.activeParticleCount = 0;
		
		const savedCompositeState = ctx.globalCompositeOperation;
		if (this.compositeOperation) ctx.globalCompositeOperation = this.compositeOperation;		
		const alpha = ctx.globalAlpha;												// opacity
		
		for (const particle of this.particles) {
			if (!particle.active) continue;
			
			this.activeParticleCount++;
			if (!particle.visible) continue;
			
			pos.set(particle.position);											// set particle position
			if (this.angle != 0) pos.rotate(this.angle * Math.PI);
			pos.add(this.position);												// add emitter position
			
			ctx.globalAlpha = particle.alpha;					
			ctx.setTransform(particle.scale, 0, 0, particle.scale, pos.x, pos.y);
			ctx.rotate((particle.rotation + particle.angle) * Math.PI);
									
			if (particle.filter) ctx.filter = particle.filter;						// apply filter

			// image 
			if (particle.img) {
				if (particle.tintColor) {											// colorization? particle.tintColor applies only to images and cannot evolve!
					tmp.size = particle._cachedSize;
					
					tmp.ctx.globalCompositeOperation = 'source-over';
					tmp.drawImage(null, particle.img);			

					tmp.ctx.globalCompositeOperation = 'color';											
					tmp.drawRectangle(0,0, tmp.size.x, tmp.size.y, { fill:particle.tintColor });
					
					tmp.ctx.globalCompositeOperation = 'destination-in';
					tmp.drawImage(null, particle.img);			
									
					ctx.drawImage(tmp.canvas, -particle._cachedSize.x / 2, -particle._cachedSize.y / 2);
				} 					

				// image default processing:
				if (particle.tintColor == null) ctx.drawImage(particle.img, -particle._cachedSize.x / 2, -particle._cachedSize.y / 2);
			}

			// shape
			if (particle.shape) {
				const fill = ('outColor' in particle) ? particle.outColor.css : particle.fillColor.css;
				if (particle.shape == 1) this.surface.drawCircle(Vec2.Zero(), 1, { fill });
				if (particle.shape == 2) this.surface.drawRectangle(-1, -1, 2, 2, { fill });						
				if (particle.shape == 3) this.surface.drawPolyCut(particle.points.a, particle.points.b, { fill });
				if (particle.shape >= 4) this.surface.drawPoly(particle.points, { fill });
			}

			// text operations
			if (particle.textContent) {
				if (particle.textSettings.color == 'particle' || this.evolveTargetColor) {
					const copy = Object.assign({}, this.initTextSettings, { color:particle.outColor.css });
					this.surface.textOut(Vec2.Zero(), particle.textContent, copy);			
				}
					else this.surface.textOut(Vec2.Zero(), particle.textContent, particle.textSettings);			
			}
							
			// reset filter
			if (particle.filter) ctx.filter = 'none';			
		}	

		if (this.compositeOperation) ctx.globalCompositeOperation = savedCompositeState;		
		ctx.globalAlpha = alpha;	

		ctx.setTransform(1,0,0,1,0,0); // reset transform
	}
}

class ParticleSystem {
	/**
	 * 
	 * @param {Engine} Engine 
	 */
	
	constructor(Engine) {
		if (!Engine.gameLoop.particleSystems) Engine.gameLoop.particleSystems = [this];
			else Engine.gameLoop.particleSystems.push(this);

		this.gameLoop = Engine.gameLoop;
		this.emitters = [];	
		this.stash    = new Map();														// stash contains a list of parameter objects loaded from urls by loadFromFile() method
	}

	destroy() {
		const p = Engine.gameLoop.particleSystems;
		const f = p.findIndex(e => e == this);
		if (f > -1) {
			p[f].clear();
			p.splice(f, 1);
		}
	}
	
	addEmitter(params) {
		const emitter = new Emitter(this);		
		emitter._initEmitter(params);
		Object.preventExtensions(emitter);
		
		this.emitters.push(emitter);
		this.gameLoop.zLayers[emitter.zIndex].push(emitter);				// add the emitter on gameLoop zLayer
		return emitter;
	}
	
	/**
	 * 
	 * @param {string} name 
	 * @returns {Emitter}
	 */
	emitterByName(name) {
		return this.emitters.find(e => e.name == name);
	}
	
	/**
	 * Called automatically in Engine.GameLoop
	 */	
	tick() {
		for (let e of this.emitters) e.tick();		
	}
	
	update() {
		for (let e of this.emitters) e.update();				
	}
	
	/**
	 * The first parameter is either a string or an array of strings which contain the url to the file(s). Optional second parameters is a path prepended to all urls.
	 * @param {string|[string]} urls 
	 * @param {string} [path=string]
	 * @returns {[object]} list of loaded json objects
	 */
	loadFromFile(urls, path = '') {
		return new Promise((resolve, reject) => {
			const jobs  = [];
			var   files = (typeof urls == 'string') ? [urls] : urls;
			for (const url of files) {
				jobs.push(getJSON(path + url));
			}
			Promise.all(jobs)
			.then(values => { 
				for (const v of values) {
					const name = v.name;
					if (this.stash.has(name)) throw 'Duplicate stash key: "' + name + '"'; 
					this.stash.set(name, v);
				}
				return resolve(this.stash);
			})
			.catch(e => {
				return reject(e);
			});
		});
	}
	
	/**
	 * Destroys all emitters
	 */
	clear() {
		for (const e of this.emitters) e.destroy();
	}
}

export { ParticleSystem, Emitter }
