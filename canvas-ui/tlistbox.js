/**
 * 
 * TCaptionControl - base class for controls which display a single line of text
 * 
 */
 
import { Vector2 as Vec2, V2, Rect, RECT } from '../types.js';
import { TListitem } from './tlistItem.js';
import { TFocusControl } from './tfocusControl.js';

export class TListbox extends TFocusControl {
    constructor(o) {
        super(o);        
        this.settings     = {};        
        this.fetchDefaults('listbox');

        console.log(this.settings);

        this._scroll      = 0;
        this.hoverItem    = null;
        this.itemLength   = this.settings.itemLength;
        this.overflow     = V2(0, 0);
        this.itemAreaSize = V2(0, 0);
        
        if ('items' in o) this.add(o.items);
    }

    add(item) {        
        let items       = Array.isArray(item) ? item : [item];
        let h           = this.itemLength;
        let totalLength = 0;

        for (let i = 0; i < items.length; i++) {
            let caption, data;
            if (typeof items[i] == 'object') {
                caption = items[i].caption;
                data    = items[i].data;
            } else
            if (typeof items[i] == 'string') {
                caption = items[i];
            }
            
            const c = super.add(TListitem, { size:V2(this.rect.width, h), position:V2(0, i * h), caption, data });
            
            c.settings.clInactiveBorder = '#111';
            c.onMouseMove = (e) => {
                if (this.rect.isPointInside(e.position)) {              // is mouse cursor inside the Listbox client rectangle?
                    this.hoverItem = c;                                 // which item in the listbox is currently hovered?
                }
            }

            totalLength += h;
        }
        this.itemAreaSize.y = Math.min(this.size.y, totalLength);
        this.overflow.y     = Math.max(0, this.itemAreaSize.y - this.size.y); 
    }

    /**
     * How much is the overflow? 1.0 means the listbox is exactly full, 2.0 means there's 2x more items than fits in the box.
     */
    get overflowRatio() {
        return this.itemAreaSize.y / this.size.y;
    }

    get scrollRatio() {
        return this._scroll / (this.itemAreaSize.y - this.overflow.y);
    }

    get scroll() {
        return this._scroll;
    }

    set scroll(v) {
        this._scroll = AE.clamp(v, 0, this.itemAreaSize.y - this.size.y);        
    }
    
    draw() {    
        const s = this.surface;        
        const { settings, clipRect } = this;
        const p = this.position;

        s.ctx.translate(p.x, p.y);

        s.drawRect(this.clientRect, { stroke:settings.cl3DLight });         

        s.ctx.save();
        s.clipRect(clipRect);        
        
        s.ctx.translate(0, -this.scroll);
        super.draw();                                                   // draw listitems
        
        s.ctx.restore();
    }

    /**
     * In local coordinates
     */
    get clipRect() {        
        const c = this.clientRect.moveBy(V2(2, 2));
        c.size.sub(V2(3, 3));
        return c;
    }

    clear() {
        while (this.children.length > 0) {
            this.children[0].destroy();
        }
        this.itemAreaSize.y = this.size.y;
        this.overflow.y     = 0;    
    }
}    