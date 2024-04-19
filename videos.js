import { isFunction } from "./utils.js";
import { addElem, addEvent, style } from "./utils-web.js";

/*

	Videos (experimental)
	Tiny Game Engine
	Written by Ridge Batty (c) 2020
	
	This class contains a simple container for video clips used to represent actor animations
	To-do: because html5 video api is a bit unreliable, consider adding a possibility to play animations from png files or png file atlases.
	
*/
let debugMode = false;

export class Videos {
	constructor(actor, opts) {
		actor.videos = this;
		
		this.actor   = actor;
		this.list    = [];
		this.hash    = {};
		this.path    = '';		
		
		this.elem    = addElem({ parent:this.actor.elem, tagName:'tge-anim-container' });
		this.onCompleteCallback = null;
		
		this.current = null;		// reference to current animation object
		this.prev    = null;		// stores a reference to the previous animation object
		
		this.name    = '';			// name of the current animation (because this.current can be null, this is a simpler way to check!)
		
		this.cache   = 'cache' in opts ? opts.cache : null;
	}

	loadFromObject(o, onComplete = function(){}) {
		this.elem.replaceChildren();
		
		this.list = [];
		this.hash = {};
		
		// make sure we got "actions" array in the object, otherwise it's not valid
		if (!('actions' in o && Array.isArray(o.actions))) throw 'TGE: Invalid video information file';
		
		// fix the path if necessary
		this.path = o.path ?? (o.path = '');
		if (o.path.length > 0 && o.path[o.path.length - 1] != '/') this.path += '/';		
		
		let count = 0;
		for (let action of o.actions) {
			this.add(action, () => { count++; if (count == o.actions.length) onComplete(); });
		}
	}
	
	loadFromFile(url, onComplete) {
		if ( !url ) throw 'URL must be specified';
		fetch(url)
			.then(response => response.json())
			.then(data => this.loadFromObject(data, onComplete));	
	}
	
	add(o, onLoaded) {	// o:{ name:string, url:string, ?isLooping:boolean, ?isMuted:boolean, ?size:{}, ?offset:{}, ?userFlags:{} }, ?onLoaded:Function
		const _this = this;
		const { name, url, isStopped, isLooping, isMuted, data } = o;
		
		const video = document.createElement('video');		
		const obj   = { video, isStopped, isLooping, isMuted, name, url, data };		
		
		this.list.push(obj);
		this.hash[name] = obj;
		
		if (isLooping) video.setAttribute('loop', '');		
		if (isMuted)   video.setAttribute('muted', '');
		video.style.display = 'none';
	
		// if video dimensions are not given explicitly in params, try to get them via metadata
		addEvent(video, 'loadedmetadata', () => {
			if (!('size' in o)) style(this.actor.elem, `width:${video.videoWidth}px; height:${video.videoHeight}px;`);
		});
				
		// callback to be fired when video has ended
		addEvent(video, 'ended', () => { 
			if (isFunction(this.onCompleteCallback)) this.onCompleteCallback() 
		});
		
		const opts = this.cache ? { cache: this.cache } : null;
		fetch(this.path + url, opts)
		 .then(response => response.blob())
		 .then(blob => {			 
			 video.src = URL.createObjectURL(blob);			 
			 
			 // Temporarily removing this because the animations can have different dimensions and thus cannot be used to set the actor dimensions!			 			 
			 //AE.style(_this.actor.elem, `width:${o.size.x}px; height:${o.size.y}px; `);			 
			 			 
			 style(video, `width:${o.size.x}px; height:${o.size.y}px; margin-left:${o.offset.x}px; margin-top:${o.offset.y}`);			 
			 _this.actor.refresh();

			 _this.elem.appendChild(video);
			 			 
			 if (isFunction(onLoaded)) onLoaded(obj);
		 });
	}
	
	change(name, onComplete) {		// name:String, onComplete:Function
		const obj = this.hash[name];
		
		if (obj == null) throw `Video "${name}" could not be found!`;
		
		if (obj != this.current) {
			// make sure the new video is displayd BEFORE hiding the previous
			obj.video.style.display = '';	
			
			// stop, hide and store the currently playing video
			if (this.current != null) {
				this.current.video.style.display = 'none';
				this.stop();
				this.prev = this.current;
			}
						
			if (!obj.isStopped) obj.video.play();
			this.current = obj;
			this.name    = name;
			this.onCompleteCallback = onComplete;
		}
		
		if (this.current && this.current.video.paused && !obj.isStopped) obj.video.play();
	}
	
	getDuration(name) {
		const obj = this.hash[name];
		if (obj) return obj.video.duration;
			else return -1;
	}
	
	play(onStart) {
		if (this.current.video.paused) this.current.video.play().then(_ => { if (isFunction(onStart)) onStart(); });
	}
	
	/*
		Stop and rewind the video (to beginning)
	*/	
	stop() {
		if (this.current && !this.current.video.paused) {			
			this.current.video.pause();	
			this.current.video.currentTime = 0;
		}
	}
	
	get isPaused() { if (this.current) return this.current.video.paused; }
}