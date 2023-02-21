/**
 * 
 * TEdit - base class for components which can edit a single line of text
 * 
 */
 
import { Vector2 as Vec2, V2, Rect, RECT } from '../types.js';
import { addMethods, preloadImages } from '../utils.js';
import { TFocusControl } from './tfocusControl.js';

const ImplementsEvents = 'change';

export class TEdit extends TFocusControl {
    constructor(o) {        
        super(o);        
        this.settings    = {};   
        this.value       = '';
        this._caretPos   = 0;
        this.fetchDefaults('edit');
    }

    get caretPos() { return this._caretPos }
    set caretPos(v) {
        if (v < 0) return this._caretPos = 0;
        if (v > this.value.length) return this._caretPos = this.value.length;
//        this._leftStr  = this.value.substring(0, this.caretPos);
        //this._rightStr

    }
       
    onKeyDown(e) {          
        if (this.ui.activeControl != this) return;  

        if (e.code == 'Backspace') {
            this.value = this.value.substring(0, this.caretPos - 1) + this.value.substring(this.caretPos);            
            if (this.caretPos > 0) this._caretPos--;
            return;
        }
        if (e.code == 'ArrowLeft') {
            if (this.caretPos > 0) this._caretPos--;
            return;
        }
        if (e.code == 'ArrowRight') {
            if (this.caretPos < this.value.length) this._caretPos++;
            return;
        }
        if (e.code == 'Delete') {
            this.value = this.value.substring(0, this.caretPos) + this.value.substring(this.caretPos + 1);            
            return;
        }        
        if (e.key.length == 1) {            
            this.value = this.value.substring(0, this.caretPos) + e.key + this.value.substring(this.caretPos);            
            this._caretPos++;
        }        
    }
    
    onMouseDown(e) {        
        this.ui.activeControl = this; 

        const { surface, settings } = this;
        surface.ctx.font = settings.font;
        const charWidths = this.value.split('').map((f, i, a) => surface.ctx.measureText(a[i]).width);         // get the widths of all characters

        const xofs = e.position.x - this.absoluteOffset.x;                                                     // distance from left edge of the control to the mouse click x-position

        this._caretPos = this.value.length > 0 ? this.value.length : 0;
        for (let i = 0, acc = 0; i < charWidths.length; i++) {                                                 // calculate which character was clicked
            if (xofs < acc + charWidths[i] * 0.5) { this._caretPos = i; break; }
            acc += charWidths[i];                     
        }        
        
        super.onMouseDown(e);
    }

    draw() {
        const s = this.surface;        
        const { settings } = this;
        
        s.ctx.save();
        s.ctx.translate(this.position.x, this.position.y);

        s.drawRect(this.clientRect, { fill:'#111' });                                                       // draw component background
        s.drawRect(this.clientRect.expand(1), { stroke:settings.clBtnShadow });                             // draw button frame shadow
        s.drawRect(this.clientRect.expand(2), { stroke:settings.clBtnHighlight });                          // draw button frame highlight

        s.clipRect(this.clientRect);

        const text = this.value;
        s.ctx.font = this.settings.font;
        const m    = s.ctx.measureText(text.substring(0, this.caretPos));
        
        const cr          = this.clientRect;
        const caretOrigin = cr.position.add(V2(2, cr.size.y - m.fontBoundingBoxDescent));        
        const caretPos    = Vec2.Add(V2(m.width, 0), caretOrigin);
        const caretHeight = m.fontBoundingBoxAscent + m.fontBoundingBoxDescent;

        if (this.ui.activeControl == this && this.ui.engine.gameLoop.tickCount % 30 < 15) {
            s.drawLine(caretPos, Vec2.Add(caretPos, V2(0, -caretHeight)), settings.clCaret);                          // caret            
        }
        
        s.textOut(caretOrigin, text, { color:settings.clCaret });
        
        s.ctx.restore();        
    }
}
