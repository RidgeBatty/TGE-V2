import { Vector2 as Vec2, V2, Rect, RECT } from '../types.js';
import { TCaptionControl } from './tcaptionControl.js';

export class TButton extends TCaptionControl {    
    constructor(o) {        
        super(o);

        this.isMovable    = false;
        this.isButtonDown = false;
        this.useFrames    = false;
        
        this.fetchDefaults('button');

        if ('settings' in o) Object.assign(this.settings, o.settings);
        if ('caption' in o)  this._caption = o.caption;           
    }   
    
    onMouseDown(e) {
        this.isButtonDown = true;
        this._isActive    = true;
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
        
        s.ctx.save();
        s.ctx.translate(this.position.x, this.position.y);
        
        s.drawRect(this.clientRect, { fill:settings.clBtnFace });                                           // draw button background
        s.drawRect(this.clientRect.expand(1), { stroke:settings.clBtnShadow });                             // draw button frame shadow
        s.drawRect(this.clientRect.expand(2), { stroke:settings.clBtnHighlight });                          // draw button frame highlight
        if (this.useFrames && this.background?.frame?.length > 0) this.drawGridPattern();                        

        s.ctx.restore();        
        
        super.draw();
    }
}