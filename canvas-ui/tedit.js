/**
 * 
 * TEdit - base class for components which can edit a single line of text
 * 
 */
 
import { Vector2 as Vec2, V2, Rect, RECT } from '../types.js';
import { TFocusControl } from './tfocusControl.js';
import { clamp } from '../utils.js';

const ImplementsEvents = 'change';
const TEditTypes = 'number text password'.split(' ');

const isNumeric = (n) => !isNaN(parseFloat(n)) && isFinite(n);
export class TEdit extends TFocusControl {
    constructor(o) {        
        super(o);        
        this.params      = o;
        this.settings    = {};   
        this._caretPos   = 0;

        this.fetchDefaults('edit');
        if ('settings' in o) Object.assign(this.settings, o.settings);

        this.type        = ('type' in o && TEditTypes.includes(o.type)) ? o.type : 'text';
        this._value      = ('value' in o) ? String(o.value) : '';                                                       // string representation of the edit's value (for editing purposes)
        this.min         = ('min' in o) && isNumeric(o.min) ? o.min : -Infinity;
        this.max         = ('max' in o) && isNumeric(o.max) ? o.max : Infinity;        
        this.textMargin  = ('textMargin' in o) ? o.textMargin : V2(2, 2);
        if (this.min > this.max) throw new Error('Minimum must be less than or equal to maximum!');

        this.events.create(ImplementsEvents);        
    }

    get value() { 
        if (this.type == 'number') return parseFloat(this._value);
        return this._value; 
    }
    
    set value(v) {         
        this._value = String(v); 
    }
 
    get caretPos() { return this._caretPos }
    set caretPos(v) {
        if (v < 0) return this._caretPos = 0;
        if (v > this._value.length) return this._caretPos = this._value.length;
    }

    /**
     * Password edit may have different display value than actual value
     * Note: always returns a string!
     */
    get displayValue() {
        if (this.type == 'password') return '*'.repeat(this._value.length);
        return String(this._value);
    }

    validate() {
        if (this.type == 'number') { 
            let num = parseFloat(this._value);           
            if (isNaN(num)) {
                this._value   = '';
                this.caretPos = 0;
                return;
            }
            if (this.min >= 0) {
                const regex = /^\d*[.]?\d*$/;
                if (!(regex.test(this._value))) num = this.min;
            } else {
                const regex = /^-?\d*[.]?\d*$/;
                if (!(regex.test(this._value))) num = this.min;
            }                    
            num = clamp(num, this.min, this.max);
            this._value   = String(num);
            this.caretPos = this.caretPos;                          // make sure caret is not out of bounds
        }

        const data = { value:this._value };
        this.events.fire('change', data);
        if (this.onChange) this.onChange(data);
    }
       
    onKeyDown(e) {          
        if (this.ui.activeControl != this) return;  

        if (e.code == 'Backspace') {
            this._value = this._value.substring(0, this.caretPos - 1) + this._value.substring(this.caretPos);            
            if (this.caretPos > 0) this._caretPos--;
            return this.validate();            
        }
        if (e.code == 'ArrowLeft') {
            if (this.caretPos > 0) this._caretPos--;
            return;
        }
        if (e.code == 'ArrowRight') {
            if (this.caretPos < String(this.value).length) this._caretPos++;
            return;
        }
        if (e.code == 'Delete') {                     
            this._value = this._value.substring(0, this.caretPos) + this._value.substring(this.caretPos + 1);            
            return this.validate();            
        }        
        if (e.key.length == 1) {                
            this._value = this._value.substring(0, this.caretPos) + e.key + this._value.substring(this.caretPos);
            this._caretPos++;
            return this.validate();
        }        
    }
    
    onMouseDown(e) {        
        this.ui.activeControl = this; 

        const { surface, settings } = this;
        surface.ctx.font = settings.font;
        const charWidths = this.displayValue.split('').map((f, i, a) => surface.ctx.measureText(a[i]).width);         // get the widths of all characters
        const textWidth  = surface.ctx.measureText(this.displayValue).width;

        const rightAlignFix = (settings.textAlign == 'right') ? (this.clientRect.width - textWidth - this.textMargin.x) : 0;
        const xofs = e.position.x - this.absoluteOffset.x - rightAlignFix;                                            // distance from left edge of the control to the mouse click x-position
        
        this._caretPos = this.displayValue.length > 0 ? this.displayValue.length : 0;
        for (let i = 0, acc = 0; i < charWidths.length; i++) {                                                        // calculate which character was clicked
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

        const text = this.displayValue;
        s.ctx.font = this.settings.font;
        const m    = s.ctx.measureText(text.substring(0, this.caretPos));                                   // measure the text width from the beginning of the text up to the caret position
        
        const cr   = this.clientRect;                                                                       
        if (settings.textAlign == 'right') {                                                                // calculate caret and text position based on alignment settings
            const tm        = s.ctx.measureText(text);                                                      // measure the full length of the text
            const ofs       = V2(cr.size.x - this.textMargin.x - tm.width, cr.size.y - m.fontBoundingBoxDescent);
            var caretOrigin = cr.position.add(ofs);                    
        }
        if (settings.textAlign == 'left' || settings.textAlign == null) {
            var caretOrigin = cr.position.add(V2(this.textMargin.x, cr.size.y - m.fontBoundingBoxDescent));                    
        }        

        const caretPos    = Vec2.Add(V2(m.width, 0), caretOrigin);        
        const caretHeight = m.fontBoundingBoxAscent + m.fontBoundingBoxDescent;

        if (this.ui.activeControl == this && this.ui.engine.gameLoop.tickCount % 30 < 15) {
            s.drawLine(caretPos, Vec2.Add(caretPos, V2(0, -caretHeight)), settings.clCaret);                // caret            
        }
        
        s.textOut(caretOrigin, text, { color:settings.clCaret });                                           // print text content of the edit box
        
        s.ctx.restore();        
    }
}
