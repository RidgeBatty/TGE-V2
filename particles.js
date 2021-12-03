/*

	TGE Version 1.1 Canvas Particles	
	Written by Ridge Batty (c) 2021
	
*/
import { Engine, Types } from './engine.js';	

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
const calc = (prop, o) => {		
	if (typeof o[prop] == 'object') {
		return (Math.random() * (o[prop].max - o[prop].min)) + o[prop].min;
	} else return o[prop] || 0;
}	

class Emitter {
	constructor(params) {
		this.params    = params;
		this.zIndex    = ('zIndex' in params) ? params.zIndex : 1;
		this.surface   = ('surface' in params) ? params.surface : Engine.renderingSurface;
		
		this.particles = [];
		this._running  = false;
				
		this.initEmitter();
				
		this._createParticles(params.maxDrawCount || 100);
	}
	
	get isRunning() {
		return this._running;
	}
	
	/*
		Set initial state for this emitter
	*/
	initEmitter() {		
		const params    = this.params;
		
		this.name	    = params.name;
		
		this.emitSpeed  = params.emitSpeed || 1;		// how many particles to emit per tick?	1 = 60/second
		this.emitFrac   = 0;							// helper to keep track of the fractinal part of emitted particles	

		this.pos		= Vector2.FromStruct(params.position || { x:0, y:0});
		this.angle 	 	= params.angle || 0;
		this.delay	    = calc('delay', params);
		this.maxDelay   = params.delay || 0;
		this.image 		= params.image || null;
		
		this.textContent= params.textContent || '';
		
		this.emitCount  = params.emitCount || 0;		// 0 = emit unlimited number of particles
		this.emitLeft   = this.emitCount;				// counter for emitted particles
		this.emitterActive = ('emitterActive' in params) ? params.emitterActive : true;
		this.activeParticleCount = 0;
		
		if (params.type == 'box') {
			this.size   = params.size || { x:0, y:0 };
		}
		if (params.type == 'circle') {
			this.radius      = params.radius || 0;
			this.innerRadius = params.innerRadius || 0;
		}
	}
	
	start(onBeforeUpdate) {		
		this._running = true;
		this.onBeforeUpdate = (typeof onBeforeUpdate == 'function') ? onBeforeUpdate : null;
		this.particles.forEach(p => p.lifeTime = p.maxLife);		
	}
	
	/*
		Initialize all drawable particles for this emitter
	*/
	_createParticles(count) {
		this._maxDrawCount = count;
		
		for (let i = count; i--;) {
			const p = new ParticleParams({
				img          : null,
				lifeTime     : 0,
				maxLife      : 0,
				pos          : Vector2.Zero(),
				velocity     : Vector2.Zero(),			// travel direction
				angle        : 0,						// initial travel direction (used to calculate velocity)
				angularSpeed : 0,						// initial rate of 'angle' change
				speed		 : 0,				
				scale		 : 1,
				active		 : false,
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
					
		if (this.emitLeft > 0) this.emitLeft -= emit;		// do we have any particles left to be emitted?
		
		return emit;
	}
	
	spawn() {		
		const init   = this.params.initParticle;			// particle initial state		
		let emit     = this.emitParticles();		
				
		for (const p of this.particles) if (!p.active && emit > 0) {			
			switch (this.params.type) {	// using emitter parameters:
				case 'box': {						
					p.pos.x = Math.random() * this.size.x - this.size.x / 2;
					p.pos.y = Math.random() * this.size.y - this.size.y / 2;
					break;
				}
				case 'circle': {
					let angle  = Math.random() * Math.PI * 2;						
					let r      = Math.random() * (this.radius - this.innerRadius) ** 2;
					let ir     = this.innerRadius ** 2;
					
					p.pos.x = Math.sin(angle) * Math.sqrt(r + ir);
					p.pos.y = Math.cos(angle) * Math.sqrt(r + ir);
					break;
				}
				case 'point': p.pos = Vector2.Zero();	
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
			p.angularSpeed = calc('angularSpeed', init);
			p.speed        = calc('speed', init);
			p.velocity     = new Vector2(Math.sin(p.angle * Math.PI * 2) * p.speed, Math.cos(p.angle * Math.PI * 2) * p.speed);
			p.opacity      = calc('opacity', init);
			
			// initial color and opacity:				
			if (this.params.initColor) {
				let hue = calc('hue', this.params.initColor);
				let sat = calc('saturation', this.params.initColor);
				
				p.opacity    = calc('opacity', this.params.initColor);					
				p.hue        = hue;
				p.saturation = sat;
			}
			
			if (AE.isFunction(init.func)) init.func(p);
				
			p.active = true;
			emit--;			// decrement emitted particles counter	
		}
	}
	
	tick() {
		if (!this._running) return;
		if (this.onBeforeUpdate) this.onBeforeUpdate(this);
		
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
						
		for (const p of this.particles) if (p.delay > 0) p.delay--; 
					
		if ( this.emitterActive ) this.spawn();						// if emitter is active, spawn new particle(s) 
				
		for (const p of this.particles) {							// apply transforms to spawned bits					
			// decrement lifetime and inactivate dead particles			
			p.lifeTime--;
			if (p.lifeTime < 1) p.active = false;
			if ( !p.active ) continue;
				
			// apply forces
			p.pos.add(p.velocity);
			if (force)  p.velocity.add(force);
			if (scalar) p.velocity.mulScalar(scalar);
			if (func)   func(p);
			
			if (p.angularSpeed) p.angle += p.angularSpeed;

			// point gravity
			if (pointG) {				
				let dx = pointG.offset.x - p.pos.x;
				let dy = pointG.offset.y - p.pos.y;
				let distSq = Math.max(dx * dx + dy * dy, 4000);
				let f = pointG.mass / (distSq * Math.sqrt(distSq));
				p.velocity.add(new Vector2(dx * f, dy * f));
			}													
		}			
	}
	
	update() {		
		const ctx = this.surface.ctx;
		const pos = Vector2.Zero();		
		this.activeParticleCount = 0;
		
		for (const particle of this.particles) {
			pos.set(particle.pos);
			pos.add(this.pos);

			if (particle.active) {			
				this.activeParticleCount++;
				if (particle.img && particle.visible) {						
					ctx.setTransform(particle.scale, 0, 0, particle.scale, pos.x, pos.y);
					ctx.rotate(particle.angle * Math.PI);
					ctx.drawImage(particle.img, -particle._cachedSize.x / 2, -particle._cachedSize.y / 2);
				}				
			}
		}		
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
		let e = new Emitter(params);
		this.emitters.push(e);
		this.gameLoop.zLayers[e.zIndex].push(e);				// add the emitter on gameLoop zLayer
		return e;
	}
	
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
		for (let e of this.emitters) AE.removeElement(e.layer);
		this.emitters = [];
	}
}

export { ParticleSystem, Emitter }
