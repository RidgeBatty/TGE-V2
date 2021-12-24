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

const lerp = (start, end, n) => {
	return (1 - n) * start + n * end;
}

const lerp3 = (p0, p1, p2, t) => {
	const l1 = lerp(p0, p1, t);
	const l2 = lerp(p1, p2, t);
	return lerp(l1, l2, t);
}

const smoothstep = (e0, e1, x) => {	
	const n = AE.clamp((x - e0) / (e1 - e0), 0, 1); 	
	return n ** 2 * (3 - 2 * n);
}

const smootherstep = (e0, e1, x) => {	
	const n = AE.clamp((x - e0) / (e1 - e0), 0, 1); 	
	return n ** 3 * (n * (6 - 15 * n) + 10);
}

const colorLerp = (s, t, n) => {
	return { r:lerp(s.r, t.r, n), g:lerp(s.g, t.g, n), b:lerp(s.b, t.b, n) };
}

const randomInRange = (arr) => {
	return Math.random() * Math.abs(arr[0] - arr[1]) + arr[0];
}	

const getJSON = (url, errorHandler) => {
	return new Promise(async (resolve, reject) => {		
		try {
			if (url.split('.').pop() == 'hjson') {
				const o = await fetch(url)
					.then(response => response.text())
					.then(text => Hjson.parse(text));
				resolve(o);
			} else {
				const o = await fetch(url)
					.then(e => e.json());
				resolve(o);
			}
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

/*
	Creates a Catmull-Rom spline which passes through "points".
*/
const smoothPoints = (points, stepsPerCurve, tension = 1) => {		// points:[Vector2|Vector|Vector4], stepsPerCurve:Number, ?tension:Number=1
	const result = [];
		
	for (let i = 0; i < points.length - 1; i++) {				
		let prev     = (i == 0) ? points[i].clone() : points[i - 1].clone();
		let curStart = points[i].clone();
		let curEnd   = points[i + 1].clone();
		let next     = (i == points.length - 2) ? points[i + 1].clone() : points[i + 2].clone();
		
		for (let step = 0; step < stepsPerCurve; step++) {
			let t = step / stepsPerCurve;
            let tSquared = t * t;
            let tCubed   = tSquared * t;
 
            let p1 = prev.clone().mulScalar(-.5 * tension * tCubed + tension * tSquared - .5 * tension * t);
			let p2 = curStart.clone().mulScalar(1 + .5 * tSquared * (tension - 6) + .5 * tCubed * (4 - tension));
			let p3 = curEnd.clone().mulScalar(.5 * tCubed * (tension - 4) + .5 * tension * t - (tension - 3) * tSquared);
			let p4 = next.clone().mulScalar(-.5 * tension * tSquared + .5 * tension * tCubed);
 
			const p = p1.add(p2, p3, p4);    
			
			result.push(p);
		}		
	}	
	
	return result;
}
	
export { 
	delay, 
	shuffle, 
	preloadImages, 
	preloadVideo, 
	rtByActorType, 
	waitClick, 
	removeDuplicates, 
	arraysEqual,
	imgDims, 	
	lerp, 
	lerp3, 
	smoothstep,
	smootherstep,
	colorLerp, 
	randomInRange, 
	getJSON, 
	createFileDropZone,
	imageFromBlob,
	wrapBounds,
	smoothPoints,
}