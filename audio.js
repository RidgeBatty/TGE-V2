/**
 @module Audio
 @author Ridge Batty
 @desc Tiny Game Engine: Audio/Sound Effects subsystem	
 Implements a simplified interface for using Web Audio API in games	
*/
import { Events } from './events.js';
import { getJSON } from './utils.js';

const ImplementsEvents = 'ended';

const AudioContext = window.AudioContext || window.webkitAudioContext;

/**
	@desc Instance of a single sound effect/file.	
*/

class AudioParams {
	constructor(o= {}, defaults= { loop:false, volume:1, pan:0, rate:1}) {
		this.loop   = AE.isBoolean(o.loop) ? o.loop : defaults.loop;
		this.volume = AE.isNumeric(o.volume) ? o.volume : defaults.volume;	
		this.pan    = AE.isNumeric(o.pan) ? o.pan : defaults.pan;		
		this.rate   = AE.isNumeric(o.rate) ? o.rate : defaults.rate;	
	}
}

class RangedVar {
	constructor(value, min = 0, max = 1, defaultValue = 0) {
		if (!AE.isNumeric(value) || !AE.isNumeric(min) || !AE.isNumeric(max)|| !AE.isNumeric(defaultValue)) throw 'All parameters must be numeric';		
		this.min = min;
		this.max = max;
		this._value = value;
	}

	set value(v) {
		if (!AE.isNumeric(v)) var v = this.defaultValue;
		if (v < this.min) this.value = this.min;
			else if (v > this.max) this.value = this.max;
				else this._value = v;
	}

	get value() {
		return this._value;
	}
}
class Track {	
	/**
	@param {Object} o - Parameter object.
	@param {AudioLib} o.audio - Owner of this Track, must be an instance on AudioLib object.
	@param {String} o.name - Name of the audio file. Names should be unique but no automatic checking is done.
	@param {String} o.file - URL to the audio file.	
	*/
	constructor(o) {
		if (!('audio' in o && o.audio instanceof AudioLib)) {
			throw 'AudioLib class instance does not exist'; 			
		}

		this._createParams = o;
		Object.freeze(this._createParams);

		this.owner  = o.audio;
		this.name   = o.name;

		this.audioParams  = new AudioParams(o);

		this._mutedVolume = -1;
		this.instances    = [];
		this.file         = o.file;
		this.buffer       = null;
		this.audioLib     = o.audio;
	}

	load() {
		return new Promise(async (resolve, reject) => {
			fetch(this.file)
				.then(r => r.arrayBuffer())
				.then(b => this.audioLib.audioContext.decodeAudioData(b))
				.then(buffer => {
					this.buffer = buffer;					
					resolve(this);
				})				
				.catch(e => {
					console.warn('Failed to load file:', this.file);
					console.log(e);
					reject(e);
				});
		});		
	}

	/**
	 * Deletes all instances of this track.
	 */
	clear() {
		for (const i of this.instances) i.destroy();
	}

	destroy() {
		this.elem.remove();
		this.clear();
	}
}
class SFX {
	constructor(o) {
		this.owner      = o.track;		
		this.audioLib   = o.track.owner;
		this.nodes      = {};
		this.data       = {};															// user data
		this._playState = 'initial';
		this._fadeInfo  = null;
		this._isMuted   = false;
		this._position  = 0;
		this._destroyOnComplete = true;

		this._volume      = 1;
		this.audioParams  = new AudioParams(o, this.owner.audioParams);		
		this.fadeVolume   = new RangedVar(1);
	}
	
	createSound(audioContext, buffer) {		
		const gain    = audioContext.createGain();										// Create gain node		
		const pan     = new StereoPannerNode(audioContext, { pan: 0 });					// Create panner

		const source  = audioContext.createBufferSource();								// Create audiosource
		source.buffer = buffer;
		source.loop   = false;				
		
		source.connect(gain).connect(pan).connect(audioContext.destination);

		source.addEventListener('ended', () => {
			if (this._playState == 'paused') return;									// if current status is paused, basically ignore this event (there is no way to actually stop the audio!)
			this.stop();
			this.audioLib.events.fire('ended', { sfx:this });
			if (this._destroyOnComplete) this.destroy();
		});

		this.nodes    = {
			source,
			gain,
			pan
		}	
	}

	set volume(value)    { 
		if (this._isMuted || this.audioLib._isMuted) this.nodes.gain.gain.value = 0;
			else this.nodes.gain.gain.value = value * this.audioLib.masterVolume.value * this.audioLib._fadeInfo.ratio.value * this.fadeVolume.value; 
		this._volume = value; 
	}
	get volume()		  { return this._volume; }
	
	set pan(value)	   	 { if ('pan' in this.nodes) this.nodes.pan.pan.value = value; } 
	get pan()	   	   	     { if ('pan' in this.nodes) return this.nodes.pan.pan.value; }
	
	set rate(value)		 { this.nodes.source.playbackRate.value = value; }
	get rate()			 { return this.nodes.source.playbackRate.value; }

	set loop(value)	    { this.nodes.source.loop = value; }
	get loop()	        { return this.nodes.source.loop; }

	get status()		 { return this._playState; }

	get muted()          { return this._isMuted; }

	applyParams(p) {
		Object.entries(p).forEach(n => { this[n[0]] = n[1]; });
	}
	
	play(o = {}) {						
		if (this._playState == 'stopped') {
			this.createSound(this.audioLib.audioContext, this.nodes.source.buffer);		
			this.nodes.source.start();
		}
		if (this._playState == 'paused')  this.nodes.source.start(0, this._position);
		if (this._playState == 'initial') this.nodes.source.start();
		
		Object.entries(o).forEach(n => { if (n[0]) this.audioParams[n[0]] = n[1]; });		// copy params from 'o' to this.audioParams		
		this.applyParams(this.audioParams);	// apply current parameters
		
		this._playState = 'playing';
	}
	
	stop() {		
		this.nodes.source.stop();		
		this._playState = 'stopped';		
	}

	pause() {
		if (this._playState == 'playing') {
			this.stop();
			this._position  = this.nodes.source.context.currentTime;
			this._playState = 'paused';			
		} else if (this._playState == 'paused') {
			this.createSound(this.audioLib.audioContext, this.nodes.source.buffer);
			this.play();			
		}		
	}
	
	/**
		Works on flip-flop principle
	*/
	mute() {
		this._isMuted = !this._isMuted;
		this.volume   = this.volume;
	}
	
	/**
	 * @param {Object} o Parameter object
	 * @param {Number} o.duration milliseconds
	 * @param {Number} o.endVolume normalized volume level when ending the fade
	 * @param {Number} o.startVolume normalized volume level when starting the fade
	 */	
	async fade(o) { 
		return await new Promise(resolve => {
			this._fadeInfo = Object.assign({}, o);
		});
	}
		
	destroy() {
		const n = this.owner.instances.indexOf(this);
		if (n > -1) this.owner.instances.splice(n, 1);
	}
}

/**
	@desc Main class (singleton) for audio subsystem
 */
class AudioLib {
	/**
	 * 
	 * @param {TinyGameEngine} engine Instance of the owning TinyGameEngine which the audio subsystem will be linked to. A reference to Audio instance is saved in <a href="module-Engine-TinyGameEngine.html#audio">Engine.audio</a> property.
	 */
	constructor(engine) {
		if (engine.audio != null) throw 'AudioLib instance already created!';
		engine.audio      = this;
		
		this.engine       = engine;
		this.audioContext = new AudioContext();
		this.tracks       = {};
		this._isMuted     = false;

		this._fadeInfo    = { status : 'in', ratio:new RangedVar(1) };

		/** Global volume levels */
		this.masterVolume = new RangedVar(1);		

		this.events		  = new Events(this, ImplementsEvents);
	}	

	get isMuted() {
		return this._isMuted;
	}

	get fadeVolume() {
		return this._fadeInfo.ratio.value;
	}
	
	mute() {		
		this._isMuted = !this._isMuted;
		this.forSFX(e => e.mute());
	}

	/**
	 * Stops all instances
	 */
	stop() {
		Object.values(this.tracks).forEach(track => track.instances.forEach(sfx => sfx.stop()));
	}
	
	/**
	 * Deletes all tracks and sound instances. Does NOT reset any parameters or settings.
	 */
	clear() {
		Object.values(this.tracks).forEach(track => track.destroy());
		this.tracks = {};
	}

	/**
	 * Iterates all SFX instances. The callback function will send current SFX instance and Track as parameters.
	 * @param {function} callback
	 */
	forSFX(callback) {
		Object.values(this.tracks).forEach(track => { for (const instance of track.instances) callback(instance, track); });
	}
	
	/**
	 * Adds a new sound into the internal audio library, which can be later accessed via Audio.tracks array.
	 * @param {o} object
	 * @param {string} o.name
	 * @param {string} o.url 
	 * @returns 
	 */
	async add(o) {		
		return new Promise((resolve, reject) => {			
			if (!AE.isString(o.url))  reject('Url must be specified.');
			if (!AE.isString(o.name)) reject('Name must be specified.');

			const track = new Track({ 
				audio: this, 
				name: o.name, 
				file: o.url, 

				volume: 'volume' in o ? o.volume : 1, 				// TO-DO: replace with AudioParams
				pan: 'pan' in o ? o.pan : 0, 
				loop: 'loop' in o ? o.loop : false,
				rate: 'rate' in o ? o.rate : 1,				
			});

			this.tracks[o.name] = track;

			track.load()
				.then(t => { resolve(t) })
				.catch(e => { reject(e) });
		});
	}
	
	/**
	 * Adds a bunch of new tracks in to the track library
	 * @param {[object]} list Array of { name, url } pairs
	 * @returns {Track|String}
	 */
	async addBunch(list) {
		return new Promise(async resolve => {
			let group = [];
			for (const s of list) group.push(this.add(s));
			await Promise.all(group);	
			resolve();
		});
	}

	/**
	 * Spawns new audio SFX instance
	 * @param {string} name 
	 * @param {object|boolean} playParams Play parameters object OR boolean 'true' to start playing with track's default settings
	 * @returns {promise}
	 */
	async spawn(name, playParams) {
		return new Promise(async (resolve, reject) => {
			const track = this.tracks[name];
			if (track) {
				const sfx = new SFX({ track });
				track.instances.push(sfx);						
				sfx.createSound(this.audioContext, sfx.owner.buffer);
				if (playParams) sfx.play(playParams === true ? {} : playParams);
				resolve(sfx);
			}
			reject('Track named ' + name + ' not found.');
		});
	}
	
	/**
	 * Fade out all audio instances
	 * @param {number} time Duration (in seconds)
	 * @returns {Promise}
	 */
	fadeOut(time = 1) {	
		return new Promise(resolve => {
			this._fadeInfo = {
				status    : 'fade-out',
				duration  : time * 1000,
				startTime : +new Date(),
				ratio     : new RangedVar(1),
				resolve
			}			
		});
	}

	/**
	 * Fade in all audio instances
	 * @param {number} time Duration (in seconds)
	 * @returns {Promise}
	 */
	fadeIn(time = 1) {	
		return new Promise(resolve => {
			this._fadeInfo = {
				status    : 'fade-in',
				duration  : time * 1000,
				startTime : +new Date(),
				ratio     : new RangedVar(0),
				resolve
			}	
		});
	}

	async fadeMute(time = 1) {
		if (this._fadeInfo.status == 'in') await this.fadeOut(time);
            else if (this._fadeInfo.status == 'out') await this.fadeIn(time);		
	}

	async loadFromFile(url) {
		return await getJSON(url);		
	}

	/**
	 * Automatically called by the GameLoop on every tick event
	 * This updates the volume levels when fading in and out
	 */
	tick() {								
		const f = this._fadeInfo;

		if (f && !['in', 'out'].includes(f.status)) {
			let v = (+new Date() - f.startTime) / f.duration;			
			f.ratio.value = (f.status == 'fade-out') ? 1 - v : v;

			if (f.ratio.value == 0 && f.status == 'fade-out') {
				f.status = 'out';
				if ('resolve' in f) f.resolve();
				return 
			}
			if (f.ratio.value == 1 && f.status == 'fade-in') {
				f.status = 'in';			
				if ('resolve' in f) f.resolve();
				return 
			} 
			
			this.forSFX(sfx => { sfx.volume = sfx.volume; } );
		}		
	}
}

/**
 * Simple wrapper to creates an Audio instance (singleton) without using New keyword
 * @param {object} engine Reference to Engine
 * @returns {Audio} 
 */
const InitAudio = (engine) => {
	return new AudioLib(engine);
}

export { InitAudio, AudioLib, AudioParams, Track, SFX }