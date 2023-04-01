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

        this._scroll      = 0;
        this.hoverItem    = null;
        this.selectedItem = null;
        this.itemLength   = this.settings.itemLength;
        this.overflow     = V2(0, 0);
        this.itemAreaSize = V2(0, 0);
        
        if ('items' in o) this.add(o.items);
    }

    add(item) {          
        let items = Array.isArray(item) ? item : [item];
        
        for (let i = 0; i < items.length; i++) {
            let caption, data;
            if (typeof items[i] == 'object') {
                caption = items[i].caption;
                data    = items[i].data;                
            } else
            if (typeof items[i] == 'string') {
                caption = items[i];
            }
            
            const c = super.add(TListitem, { size:V2(this.rect.width - 2, this.itemLength), position:V2(0, i * this.itemLength), caption, data });            
            c.settings.clInactiveBorder = '#111';   

            // get the scroll offset for all listitems by reading the Listbox.scroll property
            const _this = this;
            Object.defineProperty(c, 'scrollOffset', {
                get() { return V2(0, -_this.scroll) }
            })
        }

        this.recalculate();        
    }

    onMouseDown = (e) => {    
        const list = this.ui.hoveredControls.filter(f => f.control.parent == this);
        if (list.length > 0) this.hoverItem = list[0].control;
            else this.hoverItem = null;        
    }        

    onMouseMove = (e) => {    
        const list = this.ui.hoveredControls.filter(f => f.control.parent == this);
        if (list.length > 0) this.hoverItem = list[0].control;
            else this.hoverItem = null;        
    }        

    recalculate() {
        this.itemAreaSize.y = this.children.length * this.itemLength;         
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
        const { settings, clipRect } = this;
        const s = this.surface;        
        const p = this.position;
        
        s.ctx.translate(p.x, p.y);
        s.drawRect(this.clientRect, { stroke:settings.cl3DLight });         
        
        s.clipRect(clipRect);        

        s.ctx.save();
        
        s.ctx.translate(0, -this.scroll);
   //     s.ctx.translate(this.scrollOffset.x, this.scrollOffset.y)

        if (this.customDraw) this.customDraw({ surface:s, rect:this.clipRect });
            else super.draw();                                                                       // draw listitems
        
        s.ctx.restore();
    }

    /**
     * In local coordinates
     */
    get clipRect() {        
        const c = this.clientRect.moveBy(V2(2, 2));
        c.size = c.size.sub(V2(3, 3));
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