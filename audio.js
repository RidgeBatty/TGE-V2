/**
 @module Audio
 @author Ridge Batty
 @desc Tiny Game Engine: Audio/Sound Effects subsystem	
 Implements a simplified interface for using Web Audio API in games	
*/
import { getJSON } from './utils.js';

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
	@param {AudioLib} audioLib - Owner of this Track, must be an instance on AudioLib object.
	@param {Object} o - Parameter object.
	@param {String} o.name - Name of the audio file. Names should be unique but no automatic checking is done.
	@param {String} o.file - URL to the audio file.
	@param {Function} o.onLoaded - Callback fired when the audio file is loaded.
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
		
		this.elem = new Audio(o.file);		
		
		AE.addEvent(this.elem, 'loadeddata', (track) => { if (AE.isFunction(o.onLoaded)) o.onLoaded.call(this, track) });		

		this.elem.load();	// required by Safari mobile?		
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
		this._playState = 'initial';
		this._fadeInfo  = null;
		this._isMuted   = false;

		this._volume      = 1;
		this.audioParams  = new AudioParams(o, this.owner.audioParams);		
		this.fadeVolume   = new RangedVar(1);
	}

	async init() {		
		const audioContext = this.audioLib.audioContext;								// AudioLib
		
		const gain   = audioContext.createGain();										// Create gain node		
		const pan    = new StereoPannerNode(audioContext, { pan: 0 });
				
		let source;
		await fetch(this.owner.elem.src)
			.then(r => r.arrayBuffer())
			.then(b => audioContext.decodeAudioData(b))
			.then(a => {
				source        = audioContext.createBufferSource();
				source.buffer = a;
				source.loop   = false;				
				
				source.connect(gain).connect(pan).connect(audioContext.destination);				
			})
			.catch(e => {
				console.warn('Failed to get the file.');
				console.log(e);
			});

		this.nodes   = {
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

	applyParams(p) {
		Object.entries(p).forEach(n => { this[n[0]] = n[1]; });
	}
	
	play(o) {				
		if (o == null) var o = {};		

		Object.entries(o).forEach(n => { if (n[0]) this.audioParams[n[0]] = n[1]; });		// copy params from 'o' to this.audioParams		
		this.applyParams(this.audioParams);	// apply current parameters

		if (this._playState == 'initial') this.nodes.source.start();				
		if (this._playState == 'stopped') this.nodes.source.connect(this.nodes.gain).connect(this.nodes.pan).connect(this.audioLib.audioContext.destination);				
		this._playState = 'playing';
	}
	
	stop() {		
		this.nodes.source.disconnect();
		this._playState = 'stopped';
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
		const n = this.owner.instances.findIndex(this);
		if (n > -1) {
			console.log('Destroying sound instance');
			this.owner.instances.splice(n, 1);
		}
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
	 * Deletes all tracks and sound instances. Does NOT reset any parameters or settings.
	 */
	clear() {
		Object.values(this.tracks).forEach(track => track.destroy());
		this.tracks = {};
	}

	/**
	 * Loops through all SFX instances. The callback function will send current SFX instance and Track as parameters.
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

			this.tracks[o.name] = new Track({ 
				audio:this, 
				name:o.name, 
				file:o.url, 
				volume:'volume' in o ? o.volume : 1, 
				pan:'pan' in o ? o.pan : 0, 
				onLoaded:(track) => { 								
					resolve(track); 
				} 
			});
		});
	}
	
	/**
	 * Adds a bunch of new tracks in to the track library
	 * @param {[object]} list 
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
	 * @returns 
	 */
	async spawn(name, playParams) {
		return new Promise(async (resolve, reject) => {
			const track = this.tracks[name];
			if (track) {
				const sfx = new SFX({ track });
				await sfx.init();
				track.instances.push(sfx);			
				if (playParams) sfx.play(playParams === true ? {} : playParams);
				resolve(sfx);
			}
			reject('Track named ' + name + ' not found.');
		});
	}
	
	/**
	 * Fade out all audio instances
	 * @param {number} time Duration (in seconds)
	 * @returns 
	 */
	async fadeOut(time = 1) {	
		this._fadeInfo = {
			status    : 'fade-out',
			duration  : time * 1000,
			startTime : +new Date(),
			ratio     : new RangedVar(1)
		}			
	}

	/**
	 * Fade in all audio instances
	 * @param {number} time Duration (in seconds)
	 * @returns 
	 */
	 async fadeIn(time = 1) {	
		this._fadeInfo = {
			status    : 'fade-in',
			duration  : time * 1000,
			startTime : +new Date(),
			ratio     : new RangedVar(0)
		}	
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

			if (f.ratio.value == 0 && f.status == 'fade-out') return f.status = 'out';
			if (f.ratio.value == 1 && f.status == 'fade-in')  return f.status = 'in';			
			
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