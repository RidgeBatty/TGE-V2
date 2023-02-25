/**

	Flipbook.js
	===========
	Tiny Game Engine
	Written by Ridge Batty (c) 2020-2021
	Supports two kinds of methods: single image containing an atlas OR a collection of several images each containing single animation frame.	
	
	Classes
	=======
	Flipbook		Container / Loader class for images and sequences. 
					If you would like several actors to share the same flipbook, remember that a flipbook contains information about current animation and current frame (which may differ between actor instances!)
					To "share" the animations, create one Flipbook, clone it using flipbook.clone(). This clones the flipbook as well as the sequences. 
					Assign the cloned flipbook to newly spawned actor(s) using flipbook.assignTo().
					
	Sequence		Single animation sequence (i.e. walk, jump, shoot, run). NOTE! The flipbook "owns" the images data. Sequence is just an abstract "player" for the frame sequence.	

**/
import { Events } from "./events.js";
import { preloadImages } from './utils.js';
import { VideoStream } from "./videoStream.js";
import { V2 } from "./types.js";

const ImplementsEvents = 'end';

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
		this._isPausing  = false;
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

	get isPaused() {
		return this._isPaused;
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
		return Math.abs(this.end - this.start);
	}
	
	/**
	 * Starts the animation from beginning, except when "doNotRestart" is set to "true". 
	 * This feature can be useful for example when animation does not need to restart if the player is already walking in the desired direction.
	 * @param {*} doNotRestart 
	 * @returns 
	 */
	play(doNotRestart) {			
		return new Promise(resolve => {
			if (doNotRestart && this.flipbook.sequence == this && !this._isPaused) return resolve();

			this.resetCycle();
			
			this._iterations = 0;		
			this._cycle      = 'normal';
			this.flipbook.sequence = this;		
			this._isPaused   = false;
			
			if (this.length > 0 && this._iterationCount > 0 && this._iterationCount != Infinity) {
				this.onComplete  = () => { resolve(); }
			} 
			resolve();
		});
	}
	
	stop(playThrough) {					
		if (playThrough) return this._isPausing = true;
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
		const outOfBounds = (this._dir == 1 && n > this.end) || (this._dir == -1 && n < this.start);		
		
		if (outOfBounds) {
			if (this._isPausing) { return this._isPaused = true; }

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
				this._isPaused = true;
				this.flipbook.events.fire('end', { sequence:this });														
			} 
	}		
	
	seek(frame) {
		if (isNaN(frame)) return;
		
		var start  = this.start + frame;
		var end    = this.end;
		this.index = AE.clamp(Math.floor(start), start, end);		
		
		this.flipbook.sequence = this;
	}
}

class Flipbook {
	/**
	 * 
	 * @param {object} o 
	 * @param {Actor} o.actor Actor to assign this animation to
	 * @param {number} o.fps Playback speed in frames per second
	 * @param {Vector2} o.dims For Atlas only! Number of frames in vertical and horizontal direction	 
	 */

	constructor(o = {}) { 
		if (o.actor) this.assignTo(o.actor);
	
		this.name         = o.name;
		this.dims         = ('dims' in o) ? o.dims : { x:0, y:0 };	// number of frames in x and y direction. MUST be specified for Atlas, it cannot be known
		this.size         = this.dims.y * this.dims.x;
		this.images       = [];
		this.sequences    = {};
		this.sequence     = null;
		
		this._fps         = ('fps' in o && !isNaN(o.fps)) ? AE.clamp(o.fps, 0, 60) : 60;
		this._isAtlas     = true;		
		this._atlasOrder  = 'left-to-right';			// frame ordering in atlas
		this._lastFrame   = -1;
		
		/**
		 *  Create event handlers
		 */
		 this.events = new Events(this, ImplementsEvents);
		 Object.entries(o).forEach(([k, v]) => { 			
			 if (k.startsWith('on')) {
				 const evtName = k.toLowerCase().substring(2);	
				 if (this.events.names.includes(evtName)) this.events.add(evtName, v);		// install (optional) event handlers given in parameters object				
			 }
		 });

		this.customRender = {};			// optional custom render data	
	}
	
	/**
	 * Clones the Flipbook and all Sequences. Events are not cloned. Image data is not cloned.
	 * @param {Actor=} attachToActor [Optional] Replace the cloned actor reference.
	 * @returns {Flipbook}
	 */
	clone(attachToActor) {
		const c     = new Flipbook({ actor:(typeof attachToActor == 'object') ? attachToActor : this.actor, dims:this.dims, fps:this._fps, name:this.name });
		c.images    = this.images;
						
		for (const [k, v] of Object.entries(this.sequences)) c.sequences[k] = v.clone(c);		// clone Sequences, and make the cloned Flipbook their owner
		
		c._isAtlas     = this._isAtlas;
		c.sequence     = (this.sequence == null) ? null : Object.values(c.sequences).find(e => e.name == this.sequence.name);
		c._lastFrame   = this._lastFrame;
		
		return c;
	}
	
	/*
		Helper to generate an array of sequential filenames like 0001.png, 0002.png, 0003.png etc...
	*/	
	static Generate(count, callback) {
		return Array(count).fill().map((_, i) => callback(i));
	}

	/**
	 * Parses flipbook information from (serialized) object
	 * @param {object} data 
	 * @param {Actor} actor Optional actor in which to assign the flipbook
	 */
	static async Parse(data, actor) {
		const flipbooks = [];
		for (const fb of data) {
			const flipbook = new Flipbook({ actor, fps:fb.fps, name:fb.name });

			if (fb.type == 'video') await flipbook.createSequencesFromVideo(fb.sequences);
				else
			if (fb.type == 'images') {
				for (const s of fb.sequences) {
					var urls = s.urls;
					if (typeof s.urls == 'object' && !Array.isArray(s.urls)) {
						if (!('name' in s.urls && 'start' in s.urls && 'end' in s.urls)) throw 'URLs object must contain name, start and end properties';
						var hashCount = 0, urls = [];
						for (const c of s.urls.name) hashCount += (c == '#');
						for (let i = s.urls.start; i <= s.urls.end; i++) {
							let str = (i + '').padStart(hashCount, '0');							
							urls.push(s.urls.name.replace('#'.repeat(hashCount), str));
						}
					} 						
					const images = await flipbook.loadAsFrames(urls, s.path, true);	
					
					if ('frames' in s) {													// "frames" can be used to recreate non-linear animation by duplicating and rearranging the image frames
						const order = images.slice(images.length - urls.length);			// get the images that belong to this sequence
						const rearr = [];
						for (let i = 0; i < s.frames.length; i++) rearr.push(order[s.frames[i]]);
						images.push(...rearr);
						var seq = flipbook.appendSequence(s.name, s.frames.length, s.loop);
						
					} else
						var seq = flipbook.appendSequence(s.name, urls.length, s.loop);

					if ('direction' in s) seq.direction = s.direction;
				}
			}
				else
			if (fb.type == 'atlas') {
				const atlas = await flipbook.loadAsAtlas(fb.url, fb.dims, fb.order);
				for (const s of fb.sequences) {										
					const seq = flipbook.addSequence({ name:s.name, startFrame : s.frames.from, endFrame : s.frames.to, loop:s.loop });					
					if ('direction' in s) seq.direction = s.direction;
				}
			}
				else throw 'Unknown Flipbook type in asset file';
			
			if ('autoplay' in fb) {
				const seq = flipbook.sequences[fb.autoplay];                    
				if (seq) seq.play();
			}

			flipbooks.push(flipbook);
		}
		return flipbooks;
	}
	
	get sequenceCount() {
		return Object.keys(this.sequences).length;
	}
	/*
		Link this Flipbook with an Actor or ChildActor. Optionally start any animation sequence by providing its name (second parameter)		
	*/
	assignTo(actor, autoPlaySequence) {		
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
	 * @param {Vector2} dims Number of frames in the image (in vertical and horizontal direction)
	 * @param {string} order Which order to read the images? Defaults to left-to-right, the other option is top-to-bottom
	 * @returns {HTMLImageElement} <Promise>
	 */
	async loadAsAtlas(url, dims, order = 'left-to-right') {
		this.dims        = dims;
		this._atlasOrder = order;
		this._isAtlas    = true;		

		return new Promise((resolve, reject) => {
			const img = new Image();
			img.onload  = (e) => { this.images.push(img); resolve(this) }
			img.onerror = (e) => { reject(e) }
			img.src = url;
		});
	}

	/**
	 * Loads a video and converts it to individual frame images OR loads a bunch of individual images. Images are saved in flipbook's "images" array.
	 * @param {[string]|string} urls 
	 * @param {string} path 
	 * @param {boolean} append 
	 * @returns 
	 */
	async loadAsFrames(urls, path, append = false) {	// urls:[String], ?path:string, ?append:Boolean
		this._isAtlas = false;

		// animation file?
		if (typeof urls == 'string') {
			const video = new VideoStream();
			await video.load(urls);
			await video.unpackFrames({ frames:15 });

			this.images.push(...video.frames.map(e => e.canvas));
			
			return this.images;
		}

		// 1 frame/image
		if (append) this.images.push(...await preloadImages({ urls, path })); 
			else this.images = await preloadImages({ urls, path });		
			
		return this.images;
	}

	/**
	 * 
	 * @param {[object]} o array of sequences	 
	 * @param {string} o.url url of video
	 * @param {number} o.startFrame first frame of the video to include in the sequence
	 * @param {number} o.endFrame last frame of the video to include in the sequence
	 * @param {string} o.name name of the sequence
	 * @param {boolean} o.loop is the sequence looping?
	 * @returns 
	 */
	 async createSequencesFromVideo(o) {	
		this._isAtlas = false;

		const sequences = [];

		for (const seq of o) {
			let { startFrame, endFrame } = seq;

			const video = new VideoStream();
			await video.load(seq.url);
			await video.unpackFrames({ startFrame, endFrame });

			startFrame = this.images.length;
			this.images.push(...video.frames.map(e => e.canvas));
			endFrame   = this.images.length - 1;

			const s = this.addSequence({ name:seq.name, startFrame, endFrame, loop:seq.loop });
			sequences.push(s);
		}
		
		return sequences;	
	}
	
	/**
	 * Creates a new sequence and adds it to the this flipbook
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

	appendSequence(name, frameCount, loop = false) {
		let frames = 0;
		for (const s of Object.values(this.sequences)) frames += s.length + 1;
		return this.addSequence({ name, startFrame : frames, endFrame : frames + frameCount - 1, loop });
	}
	
	removeSequence(name) {
		if (this.sequences[name] == null) return;
		delete this.sequences[name];
	}

	play(name, options) {
		if (this.sequences[name]) this.sequences[name].play(options);
	}
	
	stop(stopAll) {
		if (stopAll) {	
			for (const a of Object.values(this.sequences)) a.stop();
			return;
		}
		if (this.sequence) this.sequence.stop();
	}
	
	/**
	 * Automatically called from Actor.update()
	 */	
	update() {			
		
	}

	/**
	 * Automatically called from Actor.tick()
	 */
	tick() {		
		if (this.sequence == null || this.actor == null) return;	
				
		const seq   = this.sequence;
		if (seq == null || seq._cycle == 'ended') return;
						
		const frame = seq.next();
		const image = this.getFrame(frame);
		if (this.customRender == null) return;

		this.customRender = image;		
		if (!this.actor.img) { this.actor.size = V2(image.w, image.h); }
		
		this._lastFrame = frame;
	}

	/**
	 * Returns the image information (either a position from atlas or a frame from image array)
	 * @param {number} index 
	 * @returns 
	 */
	getFrame(index) {
		const img = this.isAtlas ? this.images[0] : this.images[index];		
		
		if (img == null) return;

		const iwidth  = img instanceof HTMLCanvasElement ? img.width  : img.naturalWidth;
		const iheight = img instanceof HTMLCanvasElement ? img.height : img.naturalHeight;

		if (this.isAtlas) {			
			if (this._atlasOrder == 'left-to-right') {
				var a = Math.floor(index % this.dims.x);
				var b = Math.floor(index / this.dims.x);
			} else {
				var a = Math.floor(index / this.dims.x);
				var b = Math.floor(index % this.dims.x);
			}
			var w = Math.floor(iwidth  / this.dims.x);			
			var h = Math.floor(iheight / this.dims.y);									
		} else {
			var w = iwidth;
			var h = iheight;			
		}		
		return { img, a, b, w, h };		
	}
}

export { Flipbook, Sequence };