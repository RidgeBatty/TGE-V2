/**
 * 
 * TCaptionControl - base class for controls which display a single line of text
 * 
 */
 
import { Vector2 as Vec2, V2, Rect, RECT } from '../types.js';
import { addMethods, preloadImages } from '../utils.js';
import { TCaptionControl } from './tcaptionControl.js';

export class TTitlebar extends TCaptionControl {
    constructor(o) {
        super(o);        
        this.settings = {};
        this.fetchDefaults('titlebar');        

        this.settings.clActiveText = this.settings.clCaptionText;
    }    

    draw() {
        const { settings } = this;
        const s = this.surface;

        s.ctx.save();

        const p = this.position;
        s.ctx.translate(p.x, p.y);
        s.drawRect(this.clientRect, { fill:this.parent.isActive ? settings.clActiveCaption : settings.clInactiveCaption });           // title bar background                
        s.ctx.translate(-p.x, -p.y);

        super.draw();

        s.ctx.restore();    
    }
}    