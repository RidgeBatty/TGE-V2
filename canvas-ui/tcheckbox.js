import { Vector2 as Vec2, V2, Rect, RECT } from '../../types.js';
import { TFocusControl } from './base.js';

const ImplementsEvents = 'mousedown mouseup change';

export class TCheckbox extends TFocusControl {
    constructor(o) {        
        super(o);
        this.isMovable    = false;
        this.isButtonDown = false;
        this.useFrames    = false;
        this._checked     = false;
        
        this.settings.captionHeight = this.size.y;
        this.settings.captionOffset = V2(24, 1);
        
        this.fetchDefaults('checkbox');

        if ('settings' in o) Object.assign(this.settings, o.settings);
        if ('caption' in o)  this._caption = o.caption;   
        
        this.events.create(ImplementsEvents);        
    }   

    get checked() {
        return this._checked;
    }

    set checked(v) {
        if (v === true) this._checked = true;
            else if (v === false) this._checked = false;
    }

    toggle() {
        this.checked = !this.checked;
    }
    
    onMouseDown(e) {
        console.log('odwn')
        this.isButtonDown = true;
        super.onMouseDown(e);
        this.events.fire('mousedown', { event:e, button:e.button, position:e.position });
    }

    onMouseUp(e) {
        console.log('up')
        this.toggle();
        this.events.fire('change', { value:this.checked });
        super.onMouseUp(e);        
        this.isButtonDown = false;
        this.events.fire('mouseup', { event:e, button:e.button, position:e.position });
    }

    get rect() {
        const pp = this.parent?.position ? this.parent.position : V2(0, 0);
        return RECT(pp.x + this.position.x, pp.y + this.position.y, this.size.x, this.size.y);
    }

    draw() {
        if (!this.isVisible) return;
        
        const { settings } = this;
        const s = this.surface;
        const p = this.position.clone();

        s.ctx.translate(p.x + this.parent.position.x, p.y + this.parent.position.y);
                
        // caption
        //const { captionAlign, captionBaseline } = settings;
        const captionAlign    = 'start';
        const captionBaseline = 'middle';
        const boxBaseline     = 'middle';
        const boxSize         = V2(16, 16);

        const ofsX = (captionAlign == 'center')    ? this.size.x / 2 : 0;
        const ofsY = (captionBaseline == 'middle') ? this.size.y / 2 : 0;        
        const textPos = V2(ofsX, ofsY).add(settings.captionOffset);

        s.textOut(textPos, this._caption, { font:settings.captionFont, color:settings.clCaptionText, textAlign:captionAlign, textBaseline:captionBaseline });

        // checkbox
        s.drawRect(RECT(0, ofsY - boxSize.y / 2, boxSize.x, boxSize.y), { stroke:settings.clBtnHighlight });
        if (this.checked) s.textOut(V2(0, ofsY - boxSize.y / 2), '✔', { font:settings.captionFont, color:settings.clCheckboxMark, textAlign:'start', textBaseline:'top' });

        // bounding box
        //s.drawRect(RECT(0, 0, this.size.x, this.size.y), { stroke:'gray' });
                
        super.draw();
    }
}
