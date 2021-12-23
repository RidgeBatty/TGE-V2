/*

	TGE Version 1.1 Canvas Particles	
	Written by Ridge Batty (c) 2021
	
*/
import { Engine, Types } from './engine.js';
import { EventBroadcaster } from './eventBroadcaster.js';
import { wrapBounds } from './utils.js';

const Vector2 = Types.Vector2;

class ParticleParams {
	constructor(p) {
		Object.assign(this, p);
	}
}

/** 
	@param {string=} prop - property name
	@param {object} o - object where to look for the property
*/
const calc = (prop, o, defaultValue= 0) => {		
	if (typeof o[prop] == 'object') {
		return (Math.random() * (o[prop].max - o[prop].min)) + o[prop].min;
	} else return (prop in o) ? o[prop] : defaultValue;
}	
class Emitter extends EventBroadcaster {
	/**
	 * DO NOT CALL MANUALLY! Use ParticleSystem.addEmitter() to create Emitter instances!
	 * @param {*} particleSystem 
	 * @param {*} params 
	 */
	constructor(particleSystem, params) {		
		super(['destroy','complete']);
	
		this.particleSystem = particleSystem;
	
		this.params    = params;
		this.zIndex    = ('zIndex' in params) ? params.zIndex : 1;
		this.surface   = ('surface' in params) ? params.surface : Engine.renderingSurface;
		
		this.particles = [];
		this._running  = false;
		this._isDestroyed = false;
				
		this.initEmitter();				
		this._createParticles(params.maxDrawCount || 100);
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
	
	/*
		Set initial state for this emitter
	*/
	initEmitter() {		
		const params     = this.params;
		
		this.name	     = params.name;
		
		this.emitSpeed   = params.emitSpeed || 1;				// how many particles to emit per tick?	1 = 60/second
		this.emitFrac    = 0;									// helper to keep track of the fractional part of emitted particles	
		this.position	 = Vector2.FromStruct(params.position || { x:0, y:0 });
		this.angle 	 	 = params.angle || 0;					// rotation of the emitter

		// applies to circle emitter only
		this.startAngle  = calc('startAngle', params, -2);
		this.endAngle    = calc('endAngle', params, 2);

		this.delay	     = calc('delay', params);	  // emitter start delay
		this.maxDelay    = params.delay || 0;
		this.image 		 = params.image || null;		
		this.textContent = params.textContent || '';		
		this.emitCount   = params.emitCount || 0;				// 0 = emit unlimited number of particles
		this.emitMax     = ('emitMax' in params) ? params.emitMax : Infinity;	// how many particles to emit total?		
		this.activeParticleCount = 0;
		this.compositeOperation  = params.compositeOperation;
		
		// different from emitter.isActive, which, when turned off, shuts down everything (including living particles)
		// this controls whether new particles are being spawned during tick or not
		this.spawnParticles   = ('spawnParticles' in params) ? params.spawnParticles : true;	

		this._emitLeft   = this.emitCount;						// internal counter for emitted particles
		
		if (params.type == 'box') {
			this.size   = params.size || { x:0, y:0 };
		}
		if (params.type == 'circle') {
			this.radius      = params.radius || 0;
			this.innerRadius = params.innerRadius || 0;
		}
	}
	
	start() {		
		this.initEmitter();
		this.particles.length = 0;
		this._createParticles(this.params.maxDrawCount || 100);
		this._running = true;		
	}
	
	/*
		Initialize all drawable particles for this emitter
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
				visible      : true
			});						
			this.particles.push(p);
		}				
	}
	
	emitParticles() {
		this.emitFrac += this.params.emitSpeed;
		let emit       = this.emitFrac | 0;					// how many particles to emit on current frame?
					
		if (emit >= 1) this.emitFrac = this.emitFrac - Math.floor(this.emitFrac);			
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
					const a      = Math.random() * Math.PI * this.endAngle + Math.random() * Math.PI * this.startAngle;		
					const r      = Math.random() * (this.radius - this.innerRadius) ** 2;
					const ir     = this.innerRadius ** 2;
					
					p.position.x =  Math.sin(a) * Math.sqrt(r + ir);
					p.position.y = -Math.cos(a) * Math.sqrt(r + ir);
					break;
				}
				case 'point': p.position = Vector2.Zero();	
			}
			
			if ('img' in init) {
				p.img = init.img;
				p._cachedSize = new Vector2(p.img.naturalWidth, p.img.naturalHeight);
			}
			p.scaleX = 1;
			p.scaleY = 1;

			if ('scale' in init) {
				p.scale = calc('scale', init);					
			} else {
				if ('scaleX' in init) p.scaleX = calc('scaleX', init);
				if ('scaleY' in init) p.scaleY = calc('scaleY', init);				
			}
			
			p.lifeTime     = calc('life', init);
			p.maxLife      = p.lifeTime;
			p.angle        = calc('angle', init);				
			p.rotation     = calc('rotation', init);
			p.angularSpeed = calc('angularSpeed', init);
			p.angularWeight= calc('angularWeight', init);
			p.speed        = calc('speed', init);
			p.opacity      = calc('opacity', init, 1);

			// filter 
			if ('filter' in init) {
				const value = calc('value',init.filter);
				if (init.filter.name == 'blur') p.filter = `${init.filter.name}(${value}px)`;
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
			
			if (AE.isFunction(init.func)) init.func(p);
				
			p.active = true;
			emit--;					// decrement emitted particles counter	

			this.emitCount++;		// add total emitted counter
		}
	}
	
	tick() {
		if (!this._running) return;
		
		// delay the update by "delay" frames (comes from emitter)
		if (this.delay > 0) { this.delay--; return }		
		
		// evolve particle
		const evolve  = this.params.evolveParticle;	
		let force     = null,
			scalar    = null,
			func      = null;
		if (evolve) {
			if ('force'  in evolve) force  = Vector2.FromStruct(evolve.force);
			if ('scalar' in evolve) scalar = evolve.scalar;
			if ('func'   in evolve) func   = evolve.func;
		}
		
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

			// opacity follows lifetime?
			if (p.opacity == 'lifetime') p.alpha = p.lifeTime / p.maxLife;					
				
			// apply forces
			if (force)  p.velocity.add(force);
			if (scalar) p.velocity.mulScalar(scalar);
			if (func)   func(p);
						
			if (p.angularSpeed) p.angle += p.angularSpeed;
			p.velocity.add(Vector2.FromAngle(p.angle,  p.angularWeight));

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

		const ctx = this.surface.ctx;
		const pos = Vector2.Zero();		
		this.activeParticleCount = 0;
		
		const savedCompositeState = ctx.globalCompositeOperation;
		if (this.compositeOperation) ctx.globalCompositeOperation = this.compositeOperation;		
		const alpha = ctx.globalAlpha;		

		for (const particle of this.particles) {
			pos.set(particle.position);
			if (this.angle != 0) pos.rotate(this.angle * Math.PI);
			pos.add(this.position);			

			if (particle.active) {			
				this.activeParticleCount++;
				if (particle.img && particle.visible) {
					ctx.globalAlpha = particle.alpha;					
					ctx.setTransform(particle.scale, 0, 0, particle.scale, pos.x, pos.y);
					ctx.rotate((particle.rotation + particle.angle) * Math.PI);
								
					// apply filter
					if (particle.filter) {
						ctx.filter = particle.filter;
					}
			
					ctx.drawImage(particle.img, -particle._cachedSize.x / 2, -particle._cachedSize.y / 2);

					if (particle.filter) {
						ctx.filter = 'none';
					}
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
		this.gameLoop = Engine.gameLoop;
		this.emitters = [];	
	}
	
	addEmitter(params) {
		let e = new Emitter(this, params);
		this.emitters.push(e);
		this.gameLoop.zLayers[e.zIndex].push(e);				// add the emitter on gameLoop zLayer
		return e;
	}
	
	/**
	 * 
	 * @param {string} name 
	 * @returns {Emitter}
	 */
	emitterByName(name) {
		return this.emitters.find(e => e.name == name);
	}
	
	/*
		Called automatically in Engine.GameLoop
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
	
	clear() {
		for (const e of this.emitters) e.destroy();
	}
}


export { ParticleSystem, Emitter }
