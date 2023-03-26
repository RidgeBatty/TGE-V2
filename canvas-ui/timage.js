/**
 * 
 * TCaptionControl - base class for controls which display a single line of text
 * 
 */
 
import { Vector2 as Vec2, V2, Rect, RECT } from '../types.js';
import { addMethods, preloadImages } from '../utils.js';
import { TControl } from './tcontrol.js';

export class TImage extends TControl {
    constructor(o) {
        super(o);        
        this.settings    = {};
        this.fetchDefaults('image');
        if ('settings' in o) this.ui.applyProps(this.settings, o.settings);
                
        this.offset = V2(2, 2)
        if ('image' in o) this._image = o.image;
    }

    draw() {    
        const { settings } = this;

        const s = this.surface;
        const p = this.position;
        
        s.ctx.save();
        s.ctx.translate(p.x, p.y);

        s.drawRect(this.clientRect, { stroke:settings.cl3DLight });         
        s.clipRect(this.clientRect);        
        if (this._image != null) s.drawImage(this.offset, this._image);

        s.ctx.restore();
    }

    get image() {
        return this._image;
    }

    set image(i) {        
        this._image = i;
    }    
}    