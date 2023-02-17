/**
 * 
 * TListItem - base class for all items which can be focused and placed in a list or grid
 * 
 */
 
import { Vector2 as Vec2, V2, Rect, RECT } from '../types.js';
import { TCaptionControl } from './tcaptionControl.js';

export class TListitem extends TCaptionControl {
    constructor(o) {
        super(o);        
        this.settings    = {};        
        this.fetchDefaults('listitem');        
    }

    draw() {    
        const s = this.surface;
        
        const { settings, clipRect } = this;

        const p = this.position;
        s.ctx.save();
        s.ctx.translate(p.x, p.y);

        s.drawRect(this.clientRect, { stroke:settings.cl3DLight, fill:'rgba(255,0,0,0.25)' });         

        s.ctx.restore();
        s.clipRect(this.rect);        
        
        super.draw();                                                   // draw caption text
        
       
    }
}    