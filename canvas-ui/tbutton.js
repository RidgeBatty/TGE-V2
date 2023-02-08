import { Vector2 as Vec2, V2, Rect, RECT } from '../../types.js';
import { Events } from '../../events.js';
import { TFocusControl } from './base.js';

const ImplementsEvents = 'mousedown mouseup';

export class TButton extends TFocusControl {
    constructor(o) {        
        super(o);
        this.isMovable    = false;
        this.isButtonDown = false;
        this.useFrames    = false;
        
        this.settings.captionHeight = this.size.y;
        
        this.fetchDefaults('button');

        if ('settings' in o) Object.assign(this.settings, o.settings);
        if ('caption' in o)  this._caption = o.caption;   
        
        this.events.create(ImplementsEvents);        
    }   
    
    onMouseDown(e) {
        this.isButtonDown = true;
        super.onMouseDown(e);
        this.events.fire('mousedown', { event:e, button:e.button, position:e.position });
    }

    onMouseUp(e) {
        this.isButtonDown = false;
        super.onMouseUp(e);
        this.events.fire('mouseup', { event:e, button:e.button, position:e.position });
    }

    draw() {
        if (!this.isVisible) return;
        
        const { settings } = this;
        const s = this.surface;
        const p = this.position.clone();

        s.ctx.translate(p.x + this.parent.position.x, p.y + this.parent.position.y);
                
        // button
        s.drawRect(RECT(0, 0, this.size.x, this.size.y).expand(2), { stroke:settings.clBtnHighlight });
        s.drawRect(RECT(0, 0, this.size.x, this.size.y), { fill:this.isButtonDown ? settings.clBtnActive : settings.clBtnFace });

        // caption
        const { captionAlign, captionBaseline } = settings;
        const ofsX = (captionAlign == 'center')    ? this.size.x / 2 : 0;
        const ofsY = (captionBaseline == 'middle') ? this.size.y / 2 : 0;        
        s.textOut(V2(ofsX, ofsY).add(settings.captionOffset), this._caption, { font:settings.captionFont, color:settings.clCaptionText, textAlign:captionAlign, textBaseline:captionBaseline });

        if (this.useFrames && this.background?.frame?.length > 0) this.drawGridPattern();
                
        super.draw();
    }
}
