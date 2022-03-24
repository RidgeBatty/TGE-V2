/**
 * ImageOwner
 * 
 * A mixin class for a class which owns an image. 
 * Contains methods for accessing and loading an image and reading its dimensions
 * The image may be HTMLImageElement, HTMLCanvasElement or CanvasSurface
 * 
 */
 import { Vector2 as Vec2 } from "./types.js";
 import { Mixin, preloadImages } from "./utils.js";

class ImageOwner {
    create(o) {
        this.size   = Vec2.Zero();           

		if ('img' in o) {						
			this._img = o.img;	
			this._determineImageSize();
		}

        if ('imgUrl' in o) {
            this.loadImage(o);
        }     
    }

    _determineImageSize() {        
        const img = this.img;
        if (img instanceof HTMLImageElement) this.size = new Vec2(img.naturalWidth, img.naturalHeight);
			else if (img instanceof HTMLCanvasElement || AE.isInstanceOf(img, 'CanvasSurface')) this.size = new Vec2(img.width, img.height);        
    }

    set img(img) {        
        this._img = img;
        this._determineImageSize();
    }
    
    get img() {
        return this._img;
    }
    
	/**
	 * Loads a new image
	 * @param {object} o Parameter object
	 */
	loadImage(o) {                
		if ('imgUrl' in o) {            
			preloadImages({ urls:[o.imgUrl] }).then((images) => {                                
                this._img = images[0];				                                
                this._determineImageSize();
			})						
		}
	}	
}

export { ImageOwner, Mixin }