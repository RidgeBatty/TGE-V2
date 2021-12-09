/*


	GameLoop encapsulates the basic functionality of main game loop
	

*/
import { Hitpoints } from './actor-hp.js';
import { Player } from './player.js';
import { Projectile } from './projectile.js';
import { Actor, Enum_ActorTypes } from './actor.js';
import { preloadImages } from './utils.js';
import { Vector2 } from './types.js';
class GameLoop {	
	constructor(o = {}) {
		this.engine      = 'engine' in o ? o.engine : null;
		this.data        = {};	// user data
		this._flags		 = { isRunning:false, showColliders:false, collisionsEnabled:false };
		this.flags       = Object.seal(this._flags);  // flags
		
		this.levels      = [];
		this.players     = [];	
		this.actors      = [];
		this.tickables   = [];
		this.zLayers     = [...Array(16).keys()].map(e => []);
		
		this.overlaps    = [];			// list of overlapping objects during the current frame, after overlap calculations
		
		// events:
		this.onBeforeRender = ('onBeforeRender' in o && typeof o.onBeforeRender == 'function') ? o.onBeforeRender : null; 
		this.timers		    = [];
		
		// other:
		this._lastTick		= 0;
		this._lastTickLen   = 0;
		this._tickRate      = 1000 / 60;	// ms
		this._tickQueue	    = 0;
		this.tickCount      = 0;
		
		this._frameStart    = null;
		this.frameDelta     = 0;
		this.frameStartTime = 0;
		this.frameCount     = 0;
		this.frameTimes     = [];
		this.requestID      = null;	

		this.container      = null;			// if defined, actors are created inside this container (overriding engine.rootElem)
	}

	set tickRate(fps = 60) {		
		this._tickRate = 1000 / AE.clamp(fps, 1, 1000);
	}

	/**
	 * 
	 * @param {object} o 
	 * @param {string=} o.name
	 * @param {number} o.duration
	 * @param {number} o.repeat
	 * @param {function=} o.onTick
	 * @param {function=} o.onComplete	 
	 */
	addTimer(o) {
		if (!('repeat' in o)) o.repeat = 1;
		const timerObj = Object.assign({ ticksLeft : o.duration, repeatsLeft : o.repeat }, o);
		this.timers.push(timerObj);
	}

	clearTimers() {
		this.timers.length = 0;
	}
	
	/*
		Loops through all actors and issues a callback
	*/
	forActors(cb) {
		for (const actor of this.actors) cb(actor);
	}
	
	/*
		Loops through all actors and returns an array of actors based on their field values
	*/
	findActors(field, value) {
		var list = [];
		for (const actor of this.actors) if (actor[field] == value) list.push(actor);
		return list;
	}	

	/**
	 * Loops through all actors and returns an array of actors based on their flag values	
	 * @param {string} name 
	 * @returns {Actor}
	 */
	findActorByName(name) {		
		for (const actor of this.actors) if (actor.name == name) return actor;
		return null;
	}	

	get isRunning() { return this.flags.isRunning; }
	hideColliders() { this.flags.showColliders = false; }	
	showColliders() { this.flags.showColliders = true; }
	
	/**
	 * Creates a new Actor instance and adds it in the GameLoop
	 * @param {String} aType Actor type to create, one of level|player|projectile|enemy|layer|consumable|obstacle
	 * @param {object} o Actor parameter object
	 * @param {string} o.name User defined name
	 * @param {image} o.img HTMLImageElement or Canvas
	 * @param {string} o.imgUrl URL to image
	 * @param {Vector2} o.position
	 * @param {Vector2} o.rotation
	 * @param {number} o.scale
	 * @param {Vector2} o.dims Image dimensions
	 * @param {boolean} o.hasColliders Image dimensions
	 * @returns {Actor|Player|Projectile|Level}
	 */
	add(aType, o = {}) {		
		o.owner = this;

		switch (aType) {
			case 'level'       	: { var a = new Level(o); this.levels.push(a); a._type = 256; return a; }

			case 'player'      	: { var a = new Player(o); const hp = new Hitpoints(); hp.assignTo(a); this.players.push(a); a._type = Enum_ActorTypes.player; break; }
			case 'projectile'  	: { var a = new Projectile(o); a._type = Enum_ActorTypes.projectile; break; }			
			case 'enemy' 	  	: { var a = new Actor(o); a._type = Enum_ActorTypes.enemy; break; } 
			case 'layer'        : { var a = new Actor(o); a._type = Enum_ActorTypes.layer; break; }
			case 'consumable'   : { var a = new Actor(o); a._type = Enum_ActorTypes.consumable; break; }
			case 'obstacle'     : { var a = new Actor(o); a._type = Enum_ActorTypes.obstacle; break; }
			default 	  		: { var a = new Actor(o); a._type = Enum_ActorTypes.default; }
		}

		a.actorType = aType;
		this.actors.push(a);	
		this.zLayers[a.zIndex].push(a);	

		if ('imgUrl' in o) {
			preloadImages({ urls:[o.imgUrl] }).then((images) => {
				a.img = images[0];
				a.setSize(a.img.naturalWidth, a.img.naturalHeight);
			})			
		}
		
		return a;
	}

	/*
		This is called internally!
	*/
	_render(timeStamp) {
		// queue frame
		this.requestID       = window.requestAnimationFrame(t => this._render(t));
		
		// tick
		const nextTick = this._lastTickLen + this._tickRate;
		this._tickQueue = 0;
		
		if (timeStamp > nextTick) {
			const timeSinceTick = timeStamp - this._lastTickLen;
			this._tickQueue     = ~~(timeSinceTick / this._tickRate);
		}
		
		if (this._tickQueue > 120) { 									// panic
			this._lastTickLen = performance.now(); 
			return; 
		}
		
		for (let i = 0; i < this._tickQueue; i++) {
			this._lastTickLen += this._tickRate;
			this._tick();
		}
		
		// render
		if (this._frameStart == null) this._frameStart = timeStamp;		
		this.frameDelta = timeStamp - this._frameStart;
				
		if (this.onBeforeRender) this.onBeforeRender();		
		
		for (const layer of this.zLayers) {			
			for (const object of layer) {
				object.update();				
			}			
		}
		
		// time delta and average fps calculations		
		this.frameTimes[this.frameCount % 30] = this.frameDelta;			
		this.frameCount++;			
		this._frameStart = timeStamp;
	}
	
	_tick() {
		if (!this.flags.isRunning) return;
		
		const tickStart = performance.now();
				
		// run the ticks:
		for (const t of this.tickables) t.tick();
		for (const t of this.zLayers) for (const o of t) o.tick();
		
		const actorsArray = this.actors;				
		const destroyed   = [];					// list for destroyed actors, collected during actor.tick() 

		if (this.flags.collisionsEnabled) {
			// reset the color of all colliders of all actors 
			//if (this.flags.showColliders) for (const actor of actorsArray) if (actor.flags.hasColliders) for (const c of actor.colliders.objects) actor.colliders._setHilite(c.elem, 'blue');			

			// create hit test groups:		
			var groups = {
				Player:[],
				Enemy:[],
				PlayerShot:[],
				EnemyShot:[],
				Obstacle:[],
				WorldStatic:[],
				WorldDynamic:[],			
				Decoration:[],
				Environment:[],
			}
			for (const actor of actorsArray) if (actor.hasColliders) groups[actor.colliderType].push(actor);					
			this.overlaps.length = 0;
		}

		// loop all actors in the gameloop		
		for (let i = actorsArray.length; i--;) {			
			const actor = actorsArray[i];
			actor.tick();
			
			// check for collisions and overlaps:
			if (this.flags.collisionsEnabled) {
				if (actor.flags.hasColliders) for (const g of Object.keys(groups)) {
					if (actor._hitTestFlag[g] < 3) {
						for (const o of groups[g]) {
							if (o != actor && !actor.flags.isDestroyed && !o.flags.isDestroyed) actor.testOverlaps(o);
							if (o.flags.isDestroyed) destroyed.push(o);
						}				
					}
				}
			}
			
			if (actor.flags.isDestroyed) destroyed.push(actor);						
		} 			

		// take care of destroying the actors AFTER checking for collisions, because typically actors get destroyed in collisions/overlaps			
		for (const actor of destroyed) {
			// signal 'endoverlap' to all actors which this actor overlaps with:
			for (const olap of actor.overlaps) actor._fireEvent('endoverlap', { actor, otherActor:olap });		

			// remove from zLayers:
			const layer = this.zLayers[actor.zIndex];
			for (let i = layer.length; i--;) if (layer[i] === actor) layer.splice(i, 1);
			
			// clean up:
			actor.release();
			this.actors = actorsArray.filter(e => e != actor);	// probably not efficient to replace the whole actors array, but rarely called					
		}

		// tick timers:
		for (let i = this.timers.length; i--;) {
			const evt = this.timers[i];
			
			if ('onTick' in evt) evt.onTick(evt); 

			evt.ticksLeft--;			
			if (evt.ticksLeft == 0) { 						
				if ('onRepeat' in evt) evt.onRepeat(evt); 					
				
				evt.repeatsLeft--;		
				evt.ticksLeft = evt.duration;
				
				if (evt.repeatsLeft == 0 && evt.ticksLeft) {
					this.timers.splice(i, 1); 
					if ('onComplete' in evt) evt.onComplete(evt); 
				}
			}
		}
		
		this.tickCount++;
		this._lastTick = performance.now() - tickStart;				
	}

	pause() {
		window.cancelAnimationFrame(this.requestID);
		this.requestID       = null;
		this.flags.isRunning = false;				
	}
	
	start() {
		this.flags.isRunning = true;
		
		this._lastTickLen    = performance.now();
		this._frameStart     = this._lastTick;
		
		try {			
			this._render();
		} catch (e) {
			window.cancelAnimationFrame(this.requestID);
			console.error(e);
		}
	}

} // class

export { GameLoop }