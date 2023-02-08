/**
 *  Lightweight wrapper for managing loaded images and metadata
 */
import { V2 } from "./types.js";
export class Picture {
	constructor(name) {
		this.data      = {};				// reserved for user data		
		this.image     = null;				// reference to the underlaying Image object
		this.name      = name;		
		this.objectURL = null;
	}

	get size()   { return this.image ? V2(this.image.naturalWidth, this.image.naturalHeight) : V2(0, 0); }
	/**
	 * Loads an image from given URL or File object and returns a promise
	 * @param {string|File} url image url
	 * @returns 
	 */
	async loadFile(url) { 	
		return new Promise((resolve, reject) => {		
			this.url = url;

			const isFile = url instanceof File;				
			if (isFile) {				
				url = URL.createObjectURL(url);		
				this.objectURL = url;
			}

			this.image = new Image();									
			this.image.addEventListener('error', _ => { reject(this.image); });
			this.image.addEventListener('load', _ => { resolve(this.image); });

			this.image.src = url;
		});
	}

	revokeObjectURL() {
		if (this.objectURL) URL.revokeObjectURL(this.objectURL);
	}

	unload() {
		this.image = null;
	}		

	static async LoadFromFile(url) {
		const r = new Picture();
		await r.loadFile(url);
		return r;
	}
 }