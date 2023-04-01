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

        if ('data' in o) Object.assign(this.data, o.data);

        this._clTextDefault = this.settings.clActiveText;
    }

    draw() {    
        const { settings } = this;
        const s = this.surface;
        const p = this.position;
        
        s.ctx.save();
        s.ctx.translate(p.x, p.y);        
            
        let fill = (this._isHovered) ? settings.clHoveredItem : settings.clItem;
        s.drawRect(this.clientRect, { stroke:settings.clItemBorder, fill });                 
        if (this._isHovered) settings.clActiveText = settings.clHoveredItemText;
            else settings.clActiveText = this._clTextDefault;
            
        s.ctx.restore();
        
        super.draw();                                                   // draw caption text       
    }
}    