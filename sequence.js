import { clamp, isFunction } from "./utils.js";

/**
 * 
 * Sequence 
 * A very basic animation player class which has no concept of graphics or how the animation frames are stored or displayed
 * 
 * Sequence will (try) to access the following properties and methods of its owner:
 * -------------------------------------------------------------------------------------
 * sequence           property    which is set to the currently active sequence
 * onSequenceEnd()    method      (OPTIONAL) which is called by the seqence when it reaches the last frame to play
 * FPS                property    (OPTIONAL) default fps to use if sequence does not have an override for it 
 * 
 */
export class Sequence {
	constructor(owner, name, start, end, loop = true) {		
		if (typeof owner != 'object') throw 'Sequence must have an owning object (Flipbook or Animation)';
		this.owner       = owner;
		this.name        = name;
		this.start       = start;
		this.end         = end;
		
		this.playhead    = start;	
		this.direction   = 'forward';								// forward, backward, forward-reverse, backward-reverse
		this.zOrder      = 0;
		this.frames      = [];
		this.ofs         = [];
		this.rot         = [];
				
		this._iterationCount = (loop === true) ? Infinity : 1;
		this._iterations = 0;
		this._dir   	 = 1;
		this._cycle		 = 'normal';
		this._isPaused   = true;
		this._isPausing  = false;		
	}
	
	clone(owner) {
		const s = new Sequence(owner, this.name, this.start, this.end, this._iterationCount == Infinity);
		
		s.playhead        = this.playhead;
		s.direction       = this.direction;
		s.zOrder          = this.zOrder;
		s.frames          = this.frames;			// by reference
		s.ofs             = this.ofs;				// by reference
		s.rot             = this.rot;				// by reference
		
		s._iterationCount = this._iterationCount;
		s._iterations     = this._iterations;
		s._dir            = this._dir;		
		s._cycle	 	  = this._cycle;
		s._isPaused		  = this._isPaused;

		return s;
	}

	/**
	 * Zero based frame number
	 */
	get frameIndex() {		
		return Math.floor(this.playhead / 64) - this.start;
	}
	
	/**
	 * Frame number within the context of the flipbook
	 */
	get frame() {
		return Math.floor(this.playhead / 64);	
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

	set isPaused(v) {
		if (v === false) {
			this.play();
			return;
		} 
		if (v === true) {
			this.stop();
		}
	}
	
	set FPS(value) {
		this._fps = !isNaN(value) ? clamp(value, 0, 60) : 60;
	}
	
	get FPS() {
		return this._fps;
	}	
	
	/**
	 * Return the length of the animation as number of frames (integer)
	 */
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
			if (doNotRestart && this.owner.sequence == this && !this._isPaused) return resolve();
			
			this.resetCycle();
					
			if ('FPS' in this.owner && this.owner.FPS > 0) this.frameIncrement = Math.round(this._dir * this.owner.FPS / 60 * 64);
				else if (this.FPS > 0) this.frameIncrement = Math.round(this._dir * this.FPS / 60 * 64);				

			this._iterations    = 0;		
			this._cycle         = 'normal';
			this._isPaused      = false;
			this.owner.sequence = this;		
			
			if (this.length > 0 && this._iterationCount > 0 && this._iterationCount != Infinity) {				
				this.onComplete = () => resolve();
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
			this.playhead = this.start * 64;
			this._dir     = 1;
		} else {
			this.playhead = this.end * 64;
			this._dir     = -1;
		}		
	}
	
	/*
		Updates the playhead position within the sequence
		
		Animation can loop "this._iterationCount" times.
		It can progress forward or backward "this.direction".
		Optional callback may be added, which is executed when animation ends.
	*/		
	tick() {			
		if (this._cycle == 'ended' || this._isPaused) return Math.floor(this.playhead / 64);
		if (this.length == 0) return this.start;											// return 1st frame if animation consists of only a single frame

		const start = this.start * 64;
		const end   = this.end * 64 + 63;

		this.playhead += this.frameIncrement;
					
		// If the animation has hit either end (first frame for reversed animation, or last frame for forward animation)
		const n = this.playhead;
		
		const outOfBounds = (this._dir == 1 && n > end) || (this._dir == -1 && n < start);				
		if (outOfBounds) {
			if (this._isPausing) return this._isPaused = true;
			this.playhead = (n > end) ? end : start;				
			if (this._cycle == 'normal') {
				if (this.direction.includes('reverse')) {
					this._dir   *= -1;	
					this._cycle  = 'returning';					
				} else 
					this._nextIteration();				
			} else 		
				if (this._cycle == 'returning') this._nextIteration();												
		}

		return Math.floor(this.playhead / 64);			
	}
	
	_nextIteration() {
		this._iterations++;		
		if (this._iterations < this._iterationCount) this.resetCycle();		// check if we have more loops to go?
			else {
				this._cycle = 'ended';							
				if (isFunction(this.onComplete)) this.onComplete(this);
				this._isPaused = true;
				if ('onSequenceEnd' in this.owner) this.owner.onSequenceEnd(this);
			} 
	}		
	
	/**
	 * Seeks to the given frame number in this sequence and sets this sequence as the flipbook's active sequence.
	 * i.e. the image becomes visible to the actor rendering function.
	 * @param {*} frame 
	 * @returns 
	 */
	seek(frame) {		
		if (isNaN(frame)) return;				

		this.playhead       = clamp(this.start + frame, this.start, this.end) * 64;				
		this.owner.sequence = this;
	}
}