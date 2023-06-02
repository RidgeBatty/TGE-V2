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

        this.fetchDefaults('titlebar');        
        if ('useDefaults' in o) Object.assign(this.settings, o.useDefaults);

        if (this.settings.clCaptionText) this.settings.clActiveText = this.settings.clCaptionText;        
    }    

    draw() {
        const { settings } = this;
        const s = this.surface;

        s.ctx.save();        

        const p = this.position;
        s.ctx.translate(p.x, p.y);

        if (settings.clActiveGradient) {
            const g = settings.clActiveGradient;
            const grad = s.ctx.createLinearGradient(g.rect[0] * p.x, g.rect[1] * p.y, g.rect[2] * (p.x + this.size.x), g.rect[3] * (p.y + this.size.y));
            
            for (const i of g.stops) grad.addColorStop(i.stop, i.color);
            s.drawRect(this.clientRect, { fill:grad });                                                                                   // title bar with background gradient
        } else {
            s.drawRect(this.clientRect, { fill:this.parent.isActive ? settings.clActiveCaption : settings.clInactiveCaption });           // title bar background
        }
        
        super.draw();

        for (const control of this.children) {
            control.draw();
        }

        s.ctx.restore();    
    }
}    