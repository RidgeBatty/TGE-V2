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

        this.scroll       = V2(0, 0);
        this.hoverItem    = null;
        this.itemHeight   = 42;
        this.overflow     = V2(0, 0);
        this.itemAreaSize = V2(0, 0);
        
        if ('items' in o) this.add(o.items);
    }

    add(caption) {        
        let captions = Array.isArray(caption) ? caption : [caption];
        let h = this.itemHeight;
        let totalHeight = 0;

        for (let i = 0; i < captions.length; i++) {
            const c = super.add(TListitem, { size:V2(this.rect.width, h), position:V2(0, i * h), caption:captions[i] });

            c.settings.clInactiveBorder = '#111';
            c.onMouseMove = (e) => {
                if (this.rect.isPointInside(e.position)) {              // is mouse cursor inside the Listbox client rectangle?
                    this.hoverItem = c;                                 // which item in the listbox is currently hovered?
                }
            }

            totalHeight += h;
        }
        this.itemAreaSize.y = totalHeight;
        this.overflow.y     = this.itemAreaSize.y - this.size.y;
    }
    
    draw() {    
        const s = this.surface;        
        const { settings, clipRect } = this;
        const p = this.position;

        s.ctx.translate(p.x, p.y);

        s.drawRect(this.clientRect, { stroke:settings.cl3DLight });         

        s.ctx.save();
        s.clipRect(clipRect);        
        
        s.ctx.translate(0, -this.scroll.y * this.overflow.y);
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
}    