/**
 *  Lightweight wrapper for managing loaded images and metadata
 */
import { V2 } from "./types.js";

export class Picture {
	constructor(name) {
		this.data     = {};					// image metadata		
		this.image    = null;				// reference to the underlaying Image object
		this.name     = name;		
	}

	get size()   { return this.image ? V2(this.image.naturalWidth, this.image.naturalHeight) : V2(0, 0); }
	/**
	 * Loads an image from given URL and returns a promise
	 * @param {string|File} url image url
	 * @returns 
	 */
	async loadFile(url) { 	
		return new Promise((resolve, reject) => {		
			const isFile = url instanceof File;	
			if (isFile) url = URL.createObjectURL(url);		

			this.image = new Image();									
			this.image.onerror = _ => { console.log('Rejected'); reject(this.image); }
			this.image.addEventListener('load', _ => { if (isFile) URL.revokeObjectURL(url); resolve(this.image); });

			this.image.src = url;
		});
	}

	unload() {
		this.image = null;
	}		
 }