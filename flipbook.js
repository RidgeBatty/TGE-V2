/**

	Flipbook.js
	===========
	Tiny Game Engine
	Written by Ridge Batty (c) 2020-2021
	Supports two kinds of methods: single image containing an atlas OR a collection of several images each containing single animation frame.	
	
	Classes
	=======
	Flipbook		Container / Loader class for images and sequences. 
					If you would like several actors to share the same flipbook, remeber that a flipbook contains information about current animation and current frame (which may differ between actor instances!)
					To "share" the animations, create one Flipbook, clone it using flipbook.clone(). This clones the flipbook as well as the sequences. Assign the cloned flipbook to newly spawned actor(s) using flipbook.assignTo().
					
	Sequence		Single animation sequence (i.e. walk, jump, shoot, run). 	

**/
import * as MultiCast from "./multicast.js";
import { preloadImages } from './utils.js';

const Events = ['End'];

class Sequence {
	constructor(flipbook, name, start, end, loop = true) {
		if ( !(flipbook instanceof Flipbook)) throw 'Sequence must have an owning Flipbook';
		this.flipbook   = flipbook;
		this.name       = name;
		this.start      = start;
		this.end        = end;
		
		this.index      = start;	
		this.direction  = 'forward';								// forward, backward, forward-reverse, backward-reverse
				
		this._iterationCount = (loop === true) ? Infinity : 1;
		this._iterations = 0;
		this._dir   	 = 1;
		this._cycle		 = 'normal';
		this._isPaused   = true;
	}
	
	clone(ownerFlipbook) {
		const s = new Sequence(ownerFlipbook, this.name, this.start, this.end, this._iterationCount == Infinity);
		
		s.index           = this.index;
		s.direction       = this.direction;
		
		s._iterationCount = this._iterationCount;
		s._iterations     = this._iterations;
		s._dir            = this._dir;		
		s._cycle	 	  = this._cycle;
		s._isPaused		  = this._isPaused;
		
		return s;
	}
	
	set loop(value) {
		if (typeof value === 'boolean') {
			this._iterationCount = (value === true) ? Infinity : 1;
		} else {
			this._iterationCount = value;
		}
	}
	
	get loop() {
		return this._iterationCount;
	}
	
	set FPS(value) {
		this._fps = !isNaN(value) ? AE.clamp(value, 0, 60) : 60;
	}
	
	get FPS() {
		return this._fps;
	}	
	
	get frame() {
		return Math.floor(this.index);	
	}
	
	get length() {
		return Math.abs(this.start - this.end);
	}
	
	play() {	
		return new Promise(resolve => {
			this.resetCycle();
			
			this._iterations = 0;		
			this._cycle      = 'normal';
			this.flipbook.sequence = this.name;		
			this._isPaused   = false;
			
			if (this.length > 0 && this._iterationCount > 0 && this._iterationCount != Infinity) {
				this.onComplete  = () => { resolve(); }
			} else resolve();
		});
	}
	
	stop() {							
		this._isPaused = true;			
	}
	
	/*
		Resets the animation cycle to starting condition:
		If animation direction includes keyword 'forward',  set dir =  1, and go to first frame
		If animation direction includes keyword 'backward', set dir = -1, and go to last frame
	*/
	resetCycle() {
		this._cycle = 'normal';		
		if (this.direction.includes('forward')) {
			this.index  = this.start;
			this._dir   = 1;
		} else {
			this.index  = this.end;
			this._dir   = -1;
		}		
	}
	
	/*
		Sets the next animation frame.
		
		Animation can loop "this._iterationCount" times.
		It can progress forward or backward "this.direction".
		Optional callback may be added, which is executed when animation ends.
	*/		
	next() {
		if (this._cycle == 'ended' || this._isPaused) return this.index;
		if (this.length == 0) return this.start;		// return 1st frame if animation consists of only a single frame
				
		if (this.flipbook._fps > 0) this.index += this._dir * this.flipbook._fps / 60;
			else if (this._fps > 0) this.index += this._dir * this._fps / 60;
			
		const n = Math.floor(this.index);
		
		// If the animation has hit either end (first frame for reversed animation, or last frame for forward animation)
		const outOfBounds = (this._dir == 1 && n > this.end) || (this._dir == -1 && n <= this.start);		
		
		if (outOfBounds) {
			this.index  = (n > this.end) ? this.end : this.start;
				
			if (this._cycle == 'normal') {
				if (this.direction.includes('reverse')) {
					this._dir   *= -1;	
					this._cycle  = 'returning';					
				} else 
					this._nextIteration();				
			} else 		
				if (this._cycle == 'returning') this._nextIteration();
						
			return this.index;				
		}
							
		return n;
	}
	
	_nextIteration() {
		this._iterations++;		
		if (this._iterations < this._iterationCount) this.resetCycle();		// check if we have more loops to go?
			else {
				this._cycle = 'ended';			
				if (AE.isFunction(this.onComplete))     this.onComplete(this);
				this.flipbook._fireEvent('end', { sequence:this });														
			} 
	}		
	
	seek(frame) {
		if (isNaN(frame)) return;
		
		var start  = this.start + frame;
		var end    = this.end;
		this.index = AE.clamp(Math.floor(start), start, end);		
		
		this.flipbook.sequence = this.name;
	}
}

class Flipbook {
	/**
	 * 
	 * @param {object} o 
	 * @param {Actor} o.actor Actor to assign this animation to
	 * @param {Vector2} o.dims For Atlas only! Number of frames in vertical and horizontal direction
	 * @param {number} o.fps Playback speed in frames per second
	 */

	constructor(o = {}) { 
		if (o.actor) this.assignTo(o.actor);
	
		this.dims         = ('dims' in o) ? o.dims : { x:0, y:0 };	// number of frames in x and y direction. MUST be specified for Atlas, it cannot be known
		this.size         = this.dims.y * this.dims.x;
		this.images       = [];
		this.sequences    = {};
		this.sequence     = null;
		
		this._fps         = ('fps' in o && !isNaN(o.fps)) ? AE.clamp(o.fps, 0, 60) : 60;
		this._isAtlas     = true;		
		this._atlasOrder  = 'left-to-right';			// frame ordering in atlas
		this._lastFrame   = -1;
		
		const events = {};
		for (const e of Events) events[e.toLowerCase()] = [];
		AE.sealProp(this, '_events', events);

		this.customRender = {};			// optional custom render data	
	}

	addEvent(name, func) {
		if (typeof func != 'function') throw 'Second parameter must be a function';
		if (name in this._events) this._events[name].push({ name, func });			
	}
	
	_fireEvent(name, data) {
		const e = this._events[name];													
		if (e) for (var i = 0; i < e.length; i++) e[i].func(this, name, data);
	}
	
	/**
	 * Clones the Flipbook and all Sequences. Events are not cloned. Image data is not cloned.
	 * @returns {Flipbook}
	 */
	clone() {
		const c     = new Flipbook({ actor:this.actor, dims:this.dims, fps:this._fps });
		c.images    = this.images;
						
		for (const [k, v] of Object.entries(this.sequences)) c.sequences[k] = v.clone(c);		// clone Sequences, and make the cloned Flipbook their owner
		
		c._isAtlas   = this._isAtlas;
		c.sequence   = this.sequence;				
		c._lastFrame = this._lastFrame;
		
		return c;
	}
	
	/*
		Helper to generate an array of sequential filenames like 0001.png, 0002.png, 0003.png etc...
	*/	
	static Generate(count, callback) {
		return Array(count).fill().map((_, i) => callback(i));
	}
	
	/*
		Returns the number of total frames in the flipbook
	*/
	get frameCount() {
		return this.images.length;
	}
	
	get sequenceCount() {
		return Object.keys(this.sequences).length;
	}
	/*
		Link this Flipbook with an Actor or ChildActor. Optionally start any animation sequence by providing its name (second parameter)		
	*/
	assignTo(actor, autoPlaySequence) {
		actor.flipbook = this;
		
		this.actor = actor;
		if (autoPlaySequence && this.sequences[autoPlaySequence]) this.sequences[autoPlaySequence].play();		
	}	
	
	set FPS(value) {		
		this._fps = !isNaN(value) ? AE.clamp(value, 0, 60) : 60;
	}
	
	get FPS() {
		return this._fps;
	}
	
	get isAtlas() {
		return this._isAtlas;
	}
	
	/**
	 * @async
	 * @param {string} url 
	 * @returns {HTMLImageElement} <Promise>
	 */
	async loadAsAtlas(url) {
		this._isAtlas = true;
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.onload  = (e) => { this.images.push(img); resolve(this) }
			img.onerror = (e) => { reject(e) }
			img.src = url;
		});
	}

	/**
	 * 
	 * @param {[string]} urls 
	 * @param {string} path 
	 * @param {boolean} append 
	 * @returns 
	 */
	async loadAsFrames(urls, path, append = false) {	// urls:[String], ?path:string, ?append:Boolean
		this._isAtlas = false;
		if (append) this.images.push(...await preloadImages({ urls, path })); 
			else this.images = await preloadImages({ urls, path });		
		return this.images;
	}	
	
	/**
	 * 
	 * @param {object} o 
	 * @param {string} o.name
	 * @param {number} o.startFrame
	 * @param {number} o.endFrame
	 * @param {boolean} o.loop
	 * @returns 
	 */
	addSequence(o) {		
		var name 		= o.name;
		var startFrame 	= o.startFrame || 0;
		var endFrame 	= o.endFrame || 0;
		var loop 		= o.loop;
		const s         = new Sequence( this, name, startFrame, endFrame, loop );
		
		this.sequences[name] = s;
		
		return s;
	}
	
	removeSequence(name) {
		if (this.sequences[name] == null) return;
		delete this.sequences[name];
	}
	
	stop() {
		const seq = this.sequences[this.sequence];
		if (seq == null) return;
		seq.stop();
	}
	
	/*
		Automatically called from Actor.update()
	*/
	update() {			
		if (this.sequence == null || this.actor == null) return;		
		
		const seq   = this.sequences[this.sequence];
		if (seq == null || seq._cycle == 'ended') return;
						
		const frame = seq.next();
		const img   = this.isAtlas ? this.images[0] : this.images[frame];
		
		if (img == null) return;
					
		if (this.isAtlas) {			
			if (this._atlasOrder == 'left-to-right') {
				var a = Math.floor(frame % this.dims.x);
				var b = Math.floor(frame / this.dims.x);
			} else {
				var a = Math.floor(frame / this.dims.x);
				var b = Math.floor(frame % this.dims.x);
			}
			var w = Math.floor(img.naturalWidth  / this.dims.x);
			var h = Math.floor(img.naturalHeight / this.dims.y);						
		} else {
			var w = img.naturalWidth;
			var h = img.naturalHeight;
		}
						
		this.customRender = { img, a, b, w, h };
		this._lastFrame = frame;
	}
}

export { Flipbook, Sequence };