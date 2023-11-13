/**
 * ImageOwner
 * 
 * A mixin class for a class which owns an image. 
 * Contains methods for accessing and loading an image and reading its dimensions
 * The image may be HTMLImageElement, HTMLCanvasElement or CanvasSurface
 * 
 */
 import { Vector2 as Vec2 } from "./types.js";
 import { Mixin, isInstanceOf, preloadImages } from "./utils.js";

class ImageOwner {
    create(o) {
        this.size        = Vec2.Zero();           
        this._imgUrl     = '';        
        this.imageStatus = 'init';
        this._pendingUrl = '';

		if ('img' in o) {						
			this._img = o.img;	
			this._determineImageSize();
		}

        if ('imgUrl' in o) {            
            this.imageStatus = 'loading';
            this._pendingUrl = o.imgUrl;
            this.loadImage(o);
        }     
    }

    _determineImageSize() {        
        const img = this.img;        
        if (img instanceof HTMLImageElement) this.size = new Vec2(img.naturalWidth, img.naturalHeight);
			else if (img instanceof HTMLCanvasElement || img instanceof OffscreenCanvas || isInstanceOf(img, 'CanvasSurface')) this.size = new Vec2(img.width, img.height);        
                else {                
                    throw new Error('Unknown image type');                    
                }
    }        

    set img(img) {    
        this._img = img;
        this._determineImageSize();
    }
    
    get img() {
        return this._img;
    }

    get imgUrl() {
        return this._img ? this._img.src : '';
    }
    
	/**
	 * Loads a new image
	 * @param {object} o Parameter object
	 */
	async loadImage(o) {           
        if ('imgUrl' in o) {            
			await preloadImages({ urls:[o.imgUrl] }).then(images => {                                
                this._img    = images[0];  
                this._determineImageSize();
                this.imageStatus  = 'ok';
                this._pendingUrl  = '';
			}).catch(e => {
                console.error({ error:e, imgUrl:o.imgUrl });
            })
		}
	}	

    /**
     * Converts File object into an image (assumes that file contains an image)
     * @param {File} file 
     */
    async imageFromFile(file) {        
        return new Promise((resolve, reject) => {
            this.imageStatus  = 'loading';

            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(img.src);
                this.size    = new Vec2(img.naturalWidth, img.naturalHeight);
                img.onload   = null;
                this._img    = img;            
                this.imageStatus  = 'ok';
                resolve(file);
            }
            img.onerror = () => {
                this.imageStatus  = 'error';
                reject(file);
            }
            
            const u = URL.createObjectURL(file);
            img.src = u;
        });
    }

    getPixelColor(x, y) {
        let canvas;
        try {			
			canvas = new OffscreenCanvas(1, 1);					
		} catch(e) {
			canvas = document.createElement('canvas');
			canvas.width  = 1;
			canvas.height = 1;
		}		
		const ctx = canvas.getContext('2d');		    
        ctx.drawImage(this.img, x, y, 1, 1, 0, 0, 1, 1);;
        const pixelData = ctx.getImageData(0, 0, 1, 1).data;
        return { r:pixelData[0], g:pixelData[1], b:pixelData[2], a:pixelData[3] }; 
    }
}

export { ImageOwner, Mixin }