/*

	Utils
	Tiny Game Engine
	Written by Ridge Batty (c) 2021	
	
*/
import './ext/random.js';
import './ext/hjson.min.js';
import * as Types from './types.js';
const Vec2 = Types.Vector2;

/**
 * Halts execution of current Javascript context for n milliseconds without blocking other asynchronous tasks.
 * @async
 * @param {number} milliseconds 
 * @returns {Promise}
 */
const delay = async (milliseconds) => { return await new Promise(resolve => { setTimeout(resolve, milliseconds); }); }

/**
 * Preloads a list of image files and returns a promise which resolves when all the images are completely loaded.
 * @async
 * @param {Object} o - Parameter object
 * @param {string=} o.path - Path to files
 * @param {string[]} o.urls - List of URLs
 */
const preloadImages = async (o) => { 	
	return new Promise((resolve, reject) => { 
		let c = 0, i = 0;
		let images = [];
		for (let url of o.urls) {			
			const img = new Image();
			img.onload  = () => { images[parseInt(img.dataset.index, 10)] = img; delete img.dataset.index; c++; if (c == o.urls.length) resolve(images); }
			img.onerror = () => { reject('Error loading image ' + img.src); }
			img.dataset.index = i++;
			img.src = ('path' in o ? o.path : '') + url; 			
		}
	}); 
}

const preloadVideo = async (o) => {	
	const video = document.createElement('video');		
	video.style.display = 'none';
	video.crossOrigin   = 'anonymous'; 
				
	if (o.loop)  	video.loop  = true;
	if (o.muted)    video.muted = true;
	if (o.autoplay) video.autoplay = true;		
	if (o.promise) {
		return new Promise((resolve, reject) => {			
			const mediaSource = new MediaSource();
			video.src = URL.createObjectURL(mediaSource);
			mediaSource.addEventListener('sourceopen', sourceOpen, { once: true });
			mediaSource.addEventListener('sourceended', (e) => { 	
				if (o.parent) o.parent.appendChild(video);														
				resolve(video);
			});

			function sourceOpen(e) {
				URL.revokeObjectURL(video.src);
				const mime         = 'video/webm;codecs=vp9';
				const mediaSource  = e.target;
				const sourceBuffer = mediaSource.addSourceBuffer(mime);
				  
				fetch(o.url)
					.then(r => r.arrayBuffer())
					.then(arrayBuffer => {	
						sourceBuffer.addEventListener('updateend', (e) => {							
							// everything loaded;																
							mediaSource.endOfStream();
					    });						
					    sourceBuffer.appendBuffer(arrayBuffer);
					});
			}			  
		});
	} 
	
	await fetch(o.url)
		 .then(response => response.blob())
		 .then(blob => {			 
			 video.src = URL.createObjectURL(blob);			 			
			 if (o.parent) o.parent.appendChild(video);
		 });
	 
	return video;
}

/*
	Simple shuffle function to randomize the order of elements in given array
*/
const shuffle = (values) => {		
	for (let i = values.length; i--;) {
		let rnd     = Math.floor(Math.random() * i);		
		let tmp     = values[i];
		values[i]   = values[rnd];
		values[rnd] = tmp;		
	}	
}	

/*	
	RayTrace by Actor Type
	Crude and unoptimized raytracing function to check if any actor in provided "actors" collection will collide with the ray.
	Ray is defined by a starting point "position", direction "angle" (radians) and "length".
*/
const rtByActorType = (o) => {
	const { position, angle, length, multiple, type, actors } = o;
	const p  = position.clone();
	const dx = Math.sin(angle);
	const dy = Math.cos(angle);
	const result  = [];
	const factors = actors.filter(e => (e._type & type) != 0);
	
	for (let i = 0; i < length; i++) {
		p.x += dx;
		p.y += dy;
		
		for (let n = factors.length; n--;) {
			const a = factors[n];
			if (!a.flags.isDestroyed && a.flags.hasColliders && a.colliders.isPointInside(p)) {
				if (multiple) { result.push(a); actors.splice(n, 1); }
					else return a;
			}
		}
	}
	return (multiple) ? result : null;
}

/*
	Attach a click handler into an element and wait until the element is clicked!
*/
const waitClick = async (elem) => {
	let clickResolve = null;
	
	AE.addEvent(elem, 'click', _ => {
		if (clickResolve != null) clickResolve();
	});		
	
	return new Promise(resolve => {				
		clickResolve = resolve;
	});			
}

/**
 * Removes all occurrences from array based on predicated function
 */
const remove = (arr, test) => {
	for (let i = arr.length; i--;) if (test(arr[i], i)) arr.splice(i, 1);
}

/**
 *  * Removes duplicate objects from an array, based on the value of property 'prop'
 *	i.e. when the value of the 'prop' is the same, the objects are considered to be duplicates
 * @param {[*]} arr 
 * @param {*} prop 
 * @returns 
 */
const removeDuplicates = (arr, prop) => {
	const flag   = {};
	const unique = [];
	arr.forEach(elem => {
		if (!flag[elem[prop]]) {
			flag[elem[prop]] = true;
			unique.push(elem);
		}
	});
	return unique;
}

/**
 * Returns true if array items are equal, false otherwise
 * @param {[*]} a Array
 * @param {[*]} b Array
 * @returns {boolean}
 */
const arraysEqual = (a, b)=> {
    return (a.length == b.length) && a.every((val, index) => val === b[index]);
}


const imgDims = (img) => {
	if (img == null) return Vec2.Zero();
	return new Vec2(img.naturalWidth || img.width, img.naturalHeight || img.height);
}

const randomInRange = (arr) => {
	return Math.random() * Math.abs(arr[0] - arr[1]) + arr[0];
}	

/**
 * loadedJsonMap stores the url's and raw text of the loaded (h)json files. 
 * Why? Because getJson() promise can't return multiple parameters + most of the time this additional data is not needed + the signature would change if the getJSON() returned an object
 */
const loadedJsonMap = new WeakMap();

const getJSON = (url, getText) => {
	if (!url.includes('.')) url += '.hjson';		// assume hjson file ending if none is supplied (v2.4)

	return new Promise(async (resolve, reject) => {		
		try {
			let text;
			const isHjson = (url.split('.').pop() == 'hjson');
			fetch(url)
				.then(response => response.text())
				.then(asText => { text = asText; return isHjson ? Hjson.parse(text) : JSON.parse(text); })
				.then(json => {
					if (getText) loadedJsonMap.set(json, { text, url });
					resolve(json);
				});			
		} catch (e) {
			reject(e, url);			
		}
	});
}

const createFileDropZone = (HTMLElementOrID, handlers = {}) => {			// HTMLElementOrID:String|HTMLElement, ?handlers:{ ?dragenter:Function, ?dragleave?:Function, ?drop:Function, ?filesready }
	const elem = (ID(HTMLElementOrID) == null) ? HTMLElementOrID : ID(HTMLElementOrID);
	
	AE.addEvent(elem, 'drop', (e) => onDropFile(e));	
	AE.addEvent(elem, 'dragover', (e) => e.preventDefault());	
	AE.addEvent(elem, 'dragenter', (e) => { if ('dragenter' in handlers) handlers.dragenter(e); });
	AE.addEvent(elem, 'dragleave', (e) => { if ('dragleave' in handlers) handlers.dragleave(e); });
	
	const onDropFile = (e) => {
		e.preventDefault();
		
		const runDefaultCode = ('drop' in handlers) ? handlers.drop(e) : true;			// return FALSE from custom handler to override the default drop handling
		
		if (runDefaultCode) {
			const result = [];
			if (e.dataTransfer.items) {
				 for (let item of e.dataTransfer.items) {
					 if (item.kind === 'file') result.push(item.getAsFile());
				 }
			}
			if ('filesready' in handlers) handlers.filesready(result);
		}
	}
}

const imageFromBlob = (fileOrBlob) => {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = (e) => {
			URL.revokeObjectURL(e.target.src);
			resolve(e.target);
		}
		img.onerror = (e) => reject(e);
		img.src = URL.createObjectURL(fileOrBlob);
	});
}

const wrapMax = (x, max) => {
	return (max + (x % max)) % max;
}

const wrapBounds = (x, min, max) => {
	return min + wrapMax(x - min, max - min);
}

/**
 * Call inside the constructor of 'target' object
 * @param {Object} target Object instance to be extended
 * @param {class} source Class of source object which is to be mixed in with target
 */
const Mixin = (target, source, createParams) => {
	// copy the source class prototype over to the target object
    const props = Object.getOwnPropertyNames(source.prototype);    
    for (const p of props) {	
        if (p != 'constructor' && p != 'create') Object.defineProperty(target, p, Object.getOwnPropertyDescriptor(source.prototype, p));
    } 

	// create an instance of the source class
	const newObject = new source();

	// add it to the mixins collection of the target object (not needed to make things work, but it's fun to have)
	if (!('__mixins__' in target)) target.__mixins__ = [];
    target.__mixins__.push(newObject);    	

	// assign the source objects (this) properties over to target object (existing properties will be overwritten without warning!)
	Object.assign(target, newObject);

	// finally call the 'fake' constructor of the source object to initialize it
	if ('create' in newObject) newObject.create.call(target, createParams);
}

const addElem = (o) => {
    const el = AE.newElem(o.parent, 'type' in o ? o.type : 'div', o.className);
    if ('text' in o) el.textContent = o.text;
    if ('html' in o) el.innerHTML = o.html;
    if ('id' in o) el.id = o.id;
   return el;
}

const addPropertyListener = (object, prop, handler) => {
	if (!(prop in object)) throw `Property ${prop} does not exist in object ${object}`;

	var temp = object[prop];
	Object.defineProperty(object, prop, {
		set(x) {
			handler(x, temp);
			temp = x;
		},
		get() {
			return temp;
		}
	});
}
	
export { 
	loadedJsonMap,
	preloadImages, 
	preloadVideo, 
	getJSON, 
	createFileDropZone,
	imageFromBlob,
	imgDims,

	delay, 
	shuffle, 

	rtByActorType,
	randomInRange, 
	wrapBounds,

	removeDuplicates, 
	arraysEqual,
	remove,
	
	addElem,
	waitClick, 

	Mixin,
	addPropertyListener
}