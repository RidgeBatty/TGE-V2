/*

	TGE Canvas Particles	
	Written by Ridge Batty (c) 2021
	
*/
import { CanvasSurface } from './canvasSurface.js';
import { Engine, Types } from './engine.js';
import { EventBroadcaster } from './eventBroadcaster.js';
import { wrapBounds, preloadImages, imgDims } from './utils.js';
import { Polygon } from './shapes.js';

const Vector2 = Types.Vector2;
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
const ParticleShapes = ['none', 'circle', 'square', 'ring', 'triangle', 'polygon', 'star'];

class ParticleParams {
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
	 * @param {*} particleSystem 
	 * @param {*} params 
	 */
	constructor(particleSystem) {		
		super(['destroy','complete','tick']);
	
		this.particleSystem = particleSystem;		
		this.particles      = [];
		this._running       = false;
		this._isDestroyed   = false;
		this._imageList     = [];

		this.tmpCanvas      = new CanvasSurface();
	}
	
	destroy() {
		if (this._isDestroyed) return;

		this._fireEvent('destroy');

		const ps = this.particleSystem;
		for (let i = ps.emitters.length; i--;) if (ps.emitters[i] === this) ps.emitters.splice(i, 1);
		const count = ps.gameLoop.removeFromZLayers(this);	
	}
	
	get isActive() {
		return this._running;
	}

	set isActive(state) {
		if (state === true || state === false) this._running = state;
	}

	get img() {		
		return this._imageList[Math.floor(Math.random() * this._imageList.length)];
	}

	/**
	 * DO NOT CALL MANUALLY! Internal use only.
	 * 
	 * @param {*} params 
	 */
	async _init(params) {
		this.params    = Object.assign({}, params);
		
		// deserialize init params:
		const ip = this.params.initParticle;
		if (ip) {
			const shape = ip.shape;
			if (shape) {
				shape.fill = deserializeColorProperty('fill', shape);			
			}
		}

		// deserialize evolve params:
		const ev = this.params.evolveParticle;
		if (ev) {
			const tint = ev.tint;
			if (tint) {
				tint.targetColor = deserializeColorProperty('targetColor', tint);			
				tint.colorStops  = deserializeColorProperty('colorStops', tint);				
			}
		}

		this.zIndex    = ('zIndex' in params) ? params.zIndex : 1;
		this.surface   = ('surface' in params) ? params.surface : Engine.renderingSurface;		
						
		if ('imgUrl' in params) {
			const urls      = Array.isArray(params.imgUrl) ? params.imgUrl : [params.imgUrl];
			this._imageList = await preloadImages({ urls });			
			console.log('Image loaded');
		}

		this._initEmitter();						
	}

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
			}
		} catch (e) {
			console.error(e);
		}
	}
	
	/**
	 * DO NOT CALL MANUALLY!
	 * Set initial state for this emitter. Called internally by Emitter.start()
	 */
	_initEmitter() {		
		const params     = this.params;
		
		this.name	     = params.name;
		
		this.emitSpeed   = params.emitSpeed || 1;				// how many particles to emit per tick?	1 = 60/second
		this.position	 = Vector2.FromStruct(params.position || { x:0, y:0 });
		this.angle 	 	 = params.angle || 0;					// rotation of the emitter				
		this.delay	     = calc('delay', params);	  // emitter start delay
		this.maxDelay    = params.delay || 0;		
		this.textContent = params.textContent || '';			
		this.emitCount   = params.emitCount || 0;				// 0 = emit unlimited number of particles
		this.emitMax     = ('emitMax' in params) ? params.emitMax : Infinity;	// how many particles to emit total?		
		this.activeParticleCount = 0;
		this.compositeOperation  = ('compositeOperation' in params) ? params.compositeOperation : null;
		
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

		this._createParticles(this.params.maxDrawCount || 100);
	}
	
	start() {				
		this._initEmitter();		
		this._running = true;		
	}
	
	/** 
	 * DO NOT CALL MANUALLY! This is called internally when all the particles need to be initialized to default state
	 * Initialize all drawable particles for this emitter
	*/
	_createParticles(count) {
		this._maxDrawCount = count;
		
		for (let i = count; i--;) {
			const p = new ParticleParams({
				img          : null,
				opacity		 : 1,
				lifeTime     : 0,
				maxLife      : 0,
				position     : Vector2.Zero(),
				velocity     : Vector2.Zero(),			// travel direction
				angle        : 0,						// initial travel direction (used to calculate velocity)
				angularSpeed : 0,						// initial rate of 'angle' change
				angularWeight: 0.1,
				rotation     : 0,						// rotation of the particle image - independent of travel angle!
				speed		 : 0,				
				scale		 : 1,
				active		 : false,
				delay        : 0,
				visible      : true,				
			});						
			this.particles[i] = p;
		}				
	}
	
	emitParticles() {
		this._emitFrac += this.params.emitSpeed;
		let emit        = this._emitFrac | 0;					// how many particles to emit on current frame?
					
		if (emit >= 1) this._emitFrac = this._emitFrac - Math.floor(this._emitFrac);
		if (emit == 0) return 0;
					
		if (this._emitLeft > 0) this._emitLeft -= emit;		// do we have any particles left to be emitted?
		
		return emit;
	}
	
	spawn() {		
		const init   = this.params.initParticle;			// particle initial state		
		let emit     = this.emitParticles();		
				
		for (const p of this.particles) if (!p.active && emit > 0) {			
			if (this.emitCount >= this.emitMax) break;

			switch (this.params.type) {	// using emitter parameters:
				case 'box': {																	// size:vector2
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
				case 'point': p.position = Vector2.Zero();	
			}

			if (this.pivot) p.position.add(this.pivot.clone().sub(this.position).rotate(-this.angle * Math.PI));
			
			// if particle has img defined, use it - otherwise try to fall back to img defined in emitter
			p.img = ('img' in init) ? init.img : this.img;

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
			p.textSettings  = init.textSettings;

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
					
					if (ang == 0) p.velocity = new Vector2(0, -1);
					if (ang == 1) p.velocity = new Vector2(1, 0);
					if (ang == 2) p.velocity = new Vector2(0, 1);
					if (ang == 3) p.velocity = new Vector2(-1, 0);

					p.velocity.mulScalar(p.speed);
				}
					else p.velocity = Vector2.FromStruct(init.velocity);										
			} else
				p.velocity   = Vector2.FromAngle(p.angle * Math.PI, p.speed);			

			if ('shape' in init) {
				p.shape     = ParticleShapes.findIndex(e => e == init.shape.type);
				p.shapeFill = calc('fill',init.shape);				
				if (p.shape == 3) p.points = Polygon.Ring(calc('innerRadius', init.shape), calc('outerRadius', init.shape), Math.round(calc('points', init.shape)));
				if (p.shape == 4) p.points = Polygon.Triangle(1);
				if (p.shape == 5) p.points = Polygon.Ngon(calc('points', init.shape));
				if (p.shape == 6) p.points = Polygon.Star(calc('innerRadius', init.shape), calc('outerRadius', init.shape), Math.round(calc('points', init.shape)));				
			}

			// precalculate evolve parameters for particles
			const evolve  = this.params.evolveParticle;				
			if (evolve) {
				if ('force'   in evolve) p.evolveForce        = Vector2.FromStruct(evolve.force);
				if ('func'    in evolve) p.evolveFunc         = evolve.func;
				if ('tint'    in evolve) {					
					if (evolve.tint.targetColor) p.evolveTint = calc('targetColor', evolve.tint);
				}
				if ('opacity' in evolve) p.evolveOpacity = evolve.opacity;
				if ('acceleration' in evolve) p.evolveAcceleration = evolve.acceleration;
				if ('scale' in evolve) p.evolveScale = evolve.scale;
			}	
			
			// custom function:
			if (AE.isFunction(init.func)) init.func(p);
				
			p.active = true;
			emit--;					// decrement emitted particles counter	

			this.emitCount++;		// add total emitted counter
		}
	}
	
	tick() {
		if (!this._running) return;

		this._fireEvent('tick');
		
		// delay the update by "delay" frames (comes from emitter)
		if (this.delay > 0) { this.delay--; return }		
		
		// evolve particle
		const evolve  = this.params.evolveParticle;	
		
		// point gravity
		const pointG  = this.params.pointGravity;
		if (pointG) pointG.offset = Vector2.FromStruct(pointG.offset);		

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
			if (p.evolveOpacity == 'lifetime') p.alpha = p.lifeTime / p.maxLife;			// opacity follows lifetime?
			if (p.evolveForce)  p.velocity.add(p.evolveForce);
			if (p.evolveAcceleration)  p.velocity.mulScalar(p.evolveAcceleration);
			if (p.evolveFunc)   p.evolveFunc(p);
			if (evolve.tint) {
				const m = 1 - p.lifeTime / p.maxLife;
				if (evolve.tint.colorStops) {					
					const c1 = evolve.tint.colorStops[Math.floor(m * (evolve.tint.colorStops.length - 1))];
					const c2 = evolve.tint.colorStops[Math.ceil(m * (evolve.tint.colorStops.length - 1))];					
					p.outColor = Color.Lerp(c1, c2, m);				
				} else
					p.outColor = Color.Lerp(p.shapeFill, p.evolveTint, m);
			}
			if (p.evolveScale) p.scale  *= p.evolveScale;
			
			// apply effect of angular speed to particles
			if (p.angularSpeed) p.angle += p.angularSpeed;
			p.velocity.add(Vector2.FromAngle(p.angle, p.angularWeight));

			// point gravity
			if (pointG) {				
				let dx = pointG.offset.x - p.position.x;
				let dy = pointG.offset.y - p.position.y;
				let distSq = Math.max(dx * dx + dy * dy, 4000);
				let f = pointG.mass / (distSq * Math.sqrt(distSq));
				p.velocity.add(new Vector2(dx * f, dy * f));
			}								

			p.position.add(p.velocity);			
		}

		// condition met for stopping the emitter?
		if (this.emitCount == this.emitMax && deadParticles == this.particles.length) {
			this._running = false;
			this._fireEvent('complete');
		}
	}
	
	update() {		
		if (!this._running) return;

		const tmp = this.tmpCanvas,	
		      ctx = this.surface.ctx,
		      pos = Vector2.Zero();		

		this.activeParticleCount = 0;
		
		const savedCompositeState = ctx.globalCompositeOperation;
		if (this.compositeOperation) ctx.globalCompositeOperation = this.compositeOperation;		
		const alpha = ctx.globalAlpha;												// opacity
		
		for (const particle of this.particles) {
			pos.set(particle.position);						
			if (this.angle != 0) pos.rotate(this.angle * Math.PI);
			pos.add(this.position);			
			
			if (particle.active) {			
				this.activeParticleCount++;
				if (particle.visible) {
					ctx.globalAlpha = particle.alpha;					
					ctx.setTransform(particle.scale, 0, 0, particle.scale, pos.x, pos.y);
					ctx.rotate((particle.rotation + particle.angle) * Math.PI);
								
					// apply filter
					if (particle.filter) ctx.filter = particle.filter;

					// image 
					if (particle.img) {
						if (particle.tintColor) {										// colorization?
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
						const fill = ('outColor' in particle) ? particle.outColor.css : particle.shapeFill.css;												
						if (particle.shape == 1) this.surface.drawCircle(Vector2.Zero(), 1, { fill });
						if (particle.shape == 2) this.surface.drawRectangle(-1, -1, 2, 2, { fill });						
						if (particle.shape == 3) this.surface.drawPolyCut(particle.points.a, particle.points.b, { fill });
						if (particle.shape >= 4) this.surface.drawPoly(particle.points, { fill });
					}

					// text operations
					if (particle.textContent) this.surface.textOut(Vector2.Zero(), particle.textContent, particle.textSettings);			// offset/pivot
									
					// reset filter
					if (particle.filter) ctx.filter = 'none';
				}				
			}
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
		Engine.gameLoop.particleSystem = this;

		this.gameLoop = Engine.gameLoop;
		this.emitters = [];	
	}
	
	addEmitter(params) {
		const emitter = new Emitter(this);
		emitter._init(params);
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
	
	loadFromFile(hjson) {
		// TO-DO return a promise
	}
	
	/**
	 * Destroys all emitters
	 */
	clear() {
		for (const e of this.emitters) e.destroy();
	}
}

export { ParticleSystem, Emitter }
