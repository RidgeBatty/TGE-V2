import { Vector2 as Vec2, V2, Rect, RECT } from '../../types.js';
import { TFocusControl } from './tfocusControl.js';

const ImplementsEvents = 'mousedown mouseup change';

export class TCheckbox extends TFocusControl {
    constructor(o) {        
        super(o);
        this.isMovable    = false;
        this.isButtonDown = false;
        this.useFrames    = false;
        this._checked     = false;
        
        this.settings.boxAlign      = 'left';
        this.settings.checkMark     = '🍆';
        this.settings.labelOffset   = V2(5, 0);
        this.settings.labelAlign    = 'left';
        this.settings.labelBaseline = 'middle';
        
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

    draw() {
        if (!this.isVisible) return;
        
        const { settings } = this;
        const s = this.surface;
        
        s.ctx.save();
        s.ctx.translate(this.position.x, this.position.y);
        
        if (settings.boxAlign == 'left') {            
            const textAlign    = settings.labelAlign;                                           // checkbox label
            const textBaseline = settings.labelBaseline;        
            const boxSize      = settings.boxSize;

            let ofs = V2(0, 0);        
            if (textAlign    == 'left')   ofs.x = boxSize.x;
            if (textAlign    == 'center') ofs.x = (boxSize.x + this.size.x) / 2;
            if (textAlign    == 'right')  ofs.x = this.size.x;

            if (textBaseline == 'top')    ofs.y = 0;
            if (textBaseline == 'middle') ofs.y = this.size.y / 2;
            if (textBaseline == 'bottom') ofs.y = this.size.y;        

            const textPos = ofs.add(settings.labelOffset);

            s.textOut(textPos, this._caption, { font:settings.captionFont, color:settings.clCaptionText, textAlign, textBaseline });       // label

            s.drawRect(RECT(1, this.size.y / 2 - boxSize.y / 2, boxSize.x, boxSize.y), { stroke:settings.clBtnHighlight });                // checkmark frame

            // checkmark (checked character)
            if (this.checked) {
                const font = settings.checkmarkFont ? settings.checkmarkFont : settings.font;            
                const size = s.textBoundingBox(settings.checkMark, font);
                s.textOut(V2(boxSize.x / 2, this.size.y / 2), settings.checkMark, { font, color:settings.clCheckboxMark, textAlign:'center', textBaseline:'middle' });            
            }
        }

        if (settings.boxAlign == 'right') {            
            const textAlign    = settings.labelAlign;                                           // checkbox label
            const textBaseline = settings.labelBaseline;        
            const boxSize      = settings.boxSize;

            let ofs = V2(0, 0);        
            if (textAlign    == 'left')   ofs.x = 0;
            if (textAlign    == 'center') ofs.x = this.size.x / 2;
            if (textAlign    == 'right')  ofs.x = this.size.x - box.size.x;

            if (textBaseline == 'top')    ofs.y = 0;
            if (textBaseline == 'middle') ofs.y = this.size.y / 2;
            if (textBaseline == 'bottom') ofs.y = this.size.y;        

            const textPos = ofs.add(settings.labelOffset);

            s.textOut(textPos, this._caption, { font:settings.captionFont, color:settings.clCaptionText, textAlign, textBaseline });       // label

            s.drawRect(RECT(this.size.x - boxSize.x - 1, this.size.y / 2 - boxSize.y / 2, boxSize.x, boxSize.y), { stroke:settings.clBtnHighlight });                // checkmark frame

            // checkmark (checked character)
            if (this.checked) {
                const font = settings.checkmarkFont ? settings.checkmarkFont : settings.font;            
                const size = s.textBoundingBox(settings.checkMark, font);
                s.textOut(V2(this.size.x - boxSize.x / 2, this.size.y / 2), settings.checkMark, { font, color:settings.clCheckboxMark, textAlign:'center', textBaseline:'middle' });            
            }
        }

        // bounding box
        s.drawRect(RECT(0, 0, this.size.x, this.size.y), { stroke:settings.clControlFrame });

        s.ctx.restore();

        super.draw();        
    }
}
