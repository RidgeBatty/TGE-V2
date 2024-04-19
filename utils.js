/*

	Utils
	Tiny Game Engine
	Written by Ridge Batty (c) 2021	
	
*/
import './ext/random.js';
import './ext/hjson.min.js';
import * as Types from './types.js';

const Vec2 = Types.Vector2;
export const InputTypes = 'button checkbox color date datetime-local email file hidden image month number password radio range reset search submit tel text time url week'.split(' ');

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

const randomOfArray = (arr) => {
	return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * loadedJsonMap stores the url's and raw text of the loaded (h)json files. 
 * Why? Because getJson() promise can't return multiple parameters + most of the time this additional data is not needed + the signature would change if the getJSON() returned an object
 */
const loadedJsonMap = new WeakMap();

const getJSON = (url, getText) => {
	if (typeof url != 'string') throw new Error('Parameter "url" must be a string');
	if (!url.includes('.')) url += '.hjson';		// assume hjson file ending if none is supplied (v2.4)

	return new Promise(async (resolve, reject) => {		
		try {
			let text;
			const isHjson = (url.split('.').pop() == 'hjson');
			fetch(url)
				.then(response => { if (response.status == '404') return reject({ error:'file not found', context:url }); return response.text(); })
				.then(asText => { text = asText; try { return isHjson ? Hjson.parse(text) : JSON.parse(text); } catch (e) { reject({ error:'parse error', debug:e, context:url }) } })
				.then(json => {
					if (getText) loadedJsonMap.set(json, { text, url });
					resolve(json);
				});			
		} catch (e) {
			reject(e, url);			
		}
	});
}

const makeHJSON = (data) => {	
	return Hjson.stringify(data);
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

const clamp = (num, a, b) => Math.max(Math.min(num, Math.max(a, b)), Math.min(a, b));

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

/**
 * Attaches a bunch of methods into the mainClasses prototype
 * @param {Class|Object} target The class that is about to get new methods attached
 * @param {Module|Object} source Object which contains the methods that need to be attached to the mainClass
 */
const addMethods = (target, source) => {	
	if (source == null) {
		var source = target.from;
		var target = target.to;		
	}
	for (const [name, method] of Object.entries(source)) target.prototype[name] = method;            
}

/**
 * Copies some "properties" of "source" object into the "target" object
 * @param {object} target 
 * @param {object} source 
 * @param {[*]|string} properties Can be either an array of strings or a string (space separated list of properties)
 */
const copyProps = (target, source, properties) => {
	if (typeof properties == 'string') properties = properties.split(' ');
	for (const [k, v] of Object.entries(source)) {
		if (properties.includes(k)) target[k] = v;
	}
}


const addPropertyListener = (object, prop, handler) => {
	if (!(prop in object)) throw `Property ${prop} does not exist in object ${object}`;

	let temp;
	Object.defineProperty(object, prop, {
		set(x) {
			const result = handler(x, object[prop]);		
			if (result == null) temp = x;
		},
		get(x) {
			return temp;
		}
 	});	
}

/**
 * Get shortest distance between two angles (in radians)
 * @param {number} a0 Angle (in radians)
 * @param {number} a1 Angle (in radians)
 * @returns 
 */
const shortAngleDist = (a0, a1) => {
    var max = Math.PI * 2;
    var da = (a1 - a0) % max;
    return 2 * da % max - da;
}

/**
 * Smooth interpolation between two angles using shortest path (in radians)
 * @param {number} a0 Starting angle (in radians)
 * @param {number} a1 Ending angle (in radians)
 * @param {number} t Float 0 - 1 interpolation where 0 is starting angle and 1 is ending angle
 * @returns 
 */
const angleLerp = (a0, a1, t) => {
    return a0 + shortAngleDist(a0, a1) * t;
}

/**
 * Request sourcemap
 * @param {string} url fully qualified url (including https://)
 * @param {string} query URL query string without the preceding '?' question mark
 */
const smap = (url, query) => {
    const script = document.createElement("script");    
    script.textContent = `//# sourceMappingURL=${url}?${query}`;    
    document.head.appendChild(script);
    script.remove(); 
}

const isObject 	 = (o) => { return o === Object(o); }
const isBoolean  = (o) => { return typeof o === 'boolean'; }
const isFunction = (o) => { return typeof o == 'function'; }
const isNumeric  = (o) => { return !isNaN(parseFloat(o)) && isFinite(o); }	// regardless of type...

const sealProp = (obj, prop, /* optional */value) => {
	if (value !== undefined) Object.defineProperty(obj, prop, { value, writable:true, configurable:false });
		else Object.defineProperty(obj, prop, { writable:true, configurable:false });
}

/**
 * Checks whether the 'object' has a class name or constructor named 'className' in its prototype chain. 
 * This function deep scans the entire prototype chain. 
 * Note! This function will only check for name equality. This is not the same as 'instanceOf' built in operator and does not ensure the equality of the classes.
 * Use this when you need to compare objects which are created in different contexts (iframe or window) where 'instanceOf' will not work.
 */
const isInstanceOf = (object, className) => {	
	if ( !isObject(object)) return false;
	var n = object;
	while (n) {
		if (('constructor' in n) && (n.constructor.name == className)) return true;
		if (n.name != '' && n.name == className) return true;		
		n = Object.getPrototypeOf(n);
	}
	return false;
}

/**
 * Trims excess, leading and trailing slashes/backslashes from given string 
 * @param {string} str string to process 
 * @returns 
 */
export const trimPath = (str, separator = '/') => {
	let result = str.split(/\/|\\/).filter(v => v !== '').join(separator)
	result = result.replace(/http:\//y, 'http://');
	result = result.replace(/https:\//y, 'https://');
	return result;
}

export const getEnumKey = (enumObject, value) => {
	const o = Object.entries(enumObject).find(f => f[1] == value);
	if (o) return o[0];
}

export const compress = async (o) => {
	if (o.url) var readableStream = await fetch(o.url).then(r => r.body);
	if (o.str) var readableStream = await fetch(o.url).then(r => r.body);
	return readableStream.pipeThrough(new CompressionStream(method));	
}

export const strEncode = (s) => {	
	return new TextEncoder().encode(s);	
}

export const strDecode = (a) => {
	return new TextDecoder().decode(a);	
}

export const writeClipboard = async (s) => {
	await navigator.clipboard.writeText(s);
}

export { 
	loadedJsonMap,
	preloadImages, 
	preloadVideo, 
	getJSON, 
	imageFromBlob,
	imgDims,
	makeHJSON,
	smap,

	delay, 
	shuffle, 

	rtByActorType,
	randomInRange, 
	randomOfArray,
	wrapBounds,
	shortAngleDist,
	angleLerp,
	clamp,

	removeDuplicates, 
	arraysEqual,
	remove,
	
	Mixin,
	isBoolean,
	isFunction,
	isObject,
	isNumeric,
	isInstanceOf,
	addMethods,
	addPropertyListener,
	copyProps,
	sealProp,	
}