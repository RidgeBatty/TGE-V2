/**
 @module Audio
 @author Ridge Batty
 @desc Tiny Game Engine: Audio/Sound Effects subsystem	
 Implements a simplified interface for using Web Audio API in games	
*/

const AudioContext = window.AudioContext || window.webkitAudioContext;

/**
	@desc Instance of a single sound effect/file.	
*/
class SFX {	
	/**
	@param {Sounds} sounds - Owner of this SFX, must be an instance on Sounds object.
	@param {Object} o - Parameter object.
	@param {String} o.name - Name of the audio file. Names should be unique but no automatic checking is done.
	@param {String} o.file - URL to the audio file.
	@param {Function} o.onLoaded - Callback fired when the audio file is loaded.
	*/
	constructor(sounds, o) {
		if (!(sounds instanceof Sounds)) {
			throw 'Sounds class instance does not exist'; 
			return;
		}
		this.sounds = sounds;
		this.name   = o.name;
		this.loop   = 1;			// how many loops to play?
		this._mutedVolume = -1;
		this.webAudio     = null;
		this.nodes        = {};
				
		this.elem   = new Audio(o.file);		
		AE.addEvent(this.elem, 'loadeddata', _ => { if (AE.isFunction(o.onLoaded)) o.onLoaded.call(this, o.name) });		
		AE.addEvent(this.elem, 'ended',      _ => { 
			this.loop--; 
			if (this.loop != null && this.loop > 0) {
				this.currentTime = 0;
				this.play(); 
			}
		});
		
		this.elem.load();	// required by Safari mobile?		
	}	
		
	set volume(value)      { if (this.webAudio) this.nodes.gain.gain.value = value; else this.elem.volume = value; }
	get volume()		   { return (this.webAudio) ? this.nodes.gain.gain.value : this.elem.volume; }
	set currentTime(value) { this.elem.currentTime = value; }				// seconds	
	
	set pan(value)	   	   { if (this.webAudio && 'pan' in this.nodes) this.nodes.pan.pan.value = value; }
	get pan()	   	   	   { if (this.webAudio && 'pan' in this.nodes) return this.nodes.pan.pan.value; }
	
	set rate(value)		   { if (this.webAudio) this.webAudio.playbackRate.value = value; else this.elem.playbackRate = value; }
	
	play(loops= 1) {
		if (this.webAudio) return this.webAudio.start();		
		if (loops != null) this.loop = loops;
		this.elem.play();
	}
	
	stop() {		
		if (this.webAudio) return this.webAudio.stop();
		this.elem.pause();
		this.elem.currentTime = 0;
	}
	
	/**
		Works on flip-flop principle
	*/
	mute() {
		if (this._mutedVolume == -1) {
			this._mutedVolume = this.volume;			
			this.volume = 0;
		} else {
			this.volume = this._mutedVolume;
			this._mutedVolume = -1;
		}
	}
	
	/**
	 * @param {Object} o Parameter object
	 * @param {Number} o.duration milliseconds
	 * @param {Number} o.targetVolume
	 * @param {Number} o.resolution milliseconds
	 */	
	async fade(o) { // o:{ duration:Number (milliseconds), targetVolume:Number, resolution:Number (milliseconds) }
		return await new Promise(resolve => {
			const tslice = o.resolution || 50;
			let   d      = Math.ceil(o.duration / tslice);
			const inc    = (o.targetVolume - this.volume) / d;
			const _this  = this;
			
			const adjust = () => { 
				const vol = _this.volume + inc; 
				d--; 
				_this.volume = AE.clamp(vol, 0, 1); 
				if (d > 0) setTimeout(_ => adjust(), tslice); 
					else {
						this.stop();
						resolve(); 
					}
			}
			setTimeout(_ => adjust(), tslice);
		});
	}
		
	/* 
		Upgrades this audio element to utilize Web Audio API 
	*/
	async upgrade() {
		if (Object.keys(this.nodes).length > 0) return;							// already upgraded
		
		const audioContext = this.sounds.audioContext;
		
		const gain   = audioContext.createGain();								// gain		
		const pan    = new StereoPannerNode(audioContext, { pan: 0 });
		
		this.nodes   = {
			gain,
			pan
		}
		
		await fetch(this.elem.src)
			.then(r => r.arrayBuffer())
			.then(b => audioContext.decodeAudioData(b))
			.then(a => {
				const source   = audioContext.createBufferSource();
				source.buffer  = a;
				source.loop    = true;				
				
				source.connect(gain).connect(pan).connect(audioContext.destination);		
				
				this.webAudio  = source;
			})
			.catch(e => {
				console.warn('Failed to get the file.');
				console.log(e);
			});
	}
	
	destroy() {
		AE.removeElement(this.elem);
		this.webAudio = null;
	}
}

/**
	@desc Main class (singleton) for audio subsystem
 */
class Sounds {
	/**
	 * 
	 * @param {TinyGameEngine} engine Instance of the owning TinyGameEngine which the audio subsystem will be linked to. A reference to Sounds instance is saved in <a href="module-Engine-TinyGameEngine.html#audio">Engine.audio</a> property.
	 */
	constructor(engine) {
		if (engine.audio != null) throw 'Audio instance already created!';
		engine.audio      = this;
		
		this.engine       = engine;
		this.audioContext = new AudioContext();
		this.tracks       = {};
		
		/** Global volume level */
		this.masterVolume = 1;
	}	
	
	mute() {		
		this.track.forEach(track => track.mute());
	}
	
	clear() {
		this.tracks.forEach(track => track.destroy());
		this.tracks = {};
	}
	
	async add(name, url) {		
		return new Promise((resolve, reject) => {
			this.tracks[name] = new SFX(this, { name, file:url, onLoaded:function(e) { resolve(this, name); } });
		});
	}
	
	async addBunch(list) {	// list:[{ name:String, url:String }]
		return new Promise(async resolve => {
			let group = [];
			for (const s of list) group.push(this.add(s.name, s.url));
			await Promise.all(group);	
			resolve();
		});
	}
	
	/**
	 * Looks up a sound by the "name" parameter and plays it.
	 * @param {object} o 
	 * @param {string} o.name Name of the audio track
	 * @param {number=} o.volume Volume in normalized 0..1 range (Default = 1)
	 * @param {number=} o.delay Delay before starting playback (in seconds)
	 * @param {number=} o.startTime Offset from the beginning of the track (in seconds)
	 * @param {number=} o.loop How many times to play back the track? (Default = 1)
	 */
	play(o) {	
		const track = this.tracks[o.name];
		if (o.name && track) {
			
			let volume   = 'volume' in o ? o.volume : 1;
			track.volume = this.masterVolume * volume;			
			
			if (AE.isNumeric(o.startTime)) this.seek(o.name, o.startTime); 
			if (AE.isNumeric(o.delay)) setTimeout(_ => track.play(o.loop), o.delay * 1000);
				else track.play(o.loop);			
		}
	}
	
	seek(name, seconds) {
		if (this.tracks[name]) this.tracks[name].currentTime = seconds;
	}
	
	/**
	 * Fade out all audio tracks
	 * @param {number} time Duration (in seconds)
	 * @returns 
	 */
	async fadeOut(time) {	
		return await new Promise((resolve, reject) => {
			if (isNaN(time)) reject();
			for (const t of Object.values(this.tracks)) t.fade({ duration:time, targetVolume:0 });
			setTimeout(_ => { 
				for (const t of Object.values(this.tracks)) t.stop();
				resolve();
			}, time / 1000);
		});
	}
}

export { Sounds, SFX }