/**
 * 
 * TCaptionControl - base class for controls which display a single line of text
 * 
 */
 
import { Vector2 as Vec2, V2, Rect, RECT } from '../types.js';
import { TControl } from './tcontrol.js';

export class TCaptionControl extends TControl {
    constructor(o) {
        super(o);        
        this.settings    = {};
        this.fetchDefaults('caption');
        if ('settings' in o) this.ui.applyProps(this.settings, o.settings);        
        if ('caption' in o) this._caption = o.caption;        
    }

    draw() {    
        const s = this.surface;
        
        const { settings } = this;
        
        const bb  = s.textBoundingBox(this._caption, settings.font, 'left', 'top');                               // titlebar text
        const pos = V2(bb.left, bb.top); 
        
        if (settings.align == 'left')      { pos.x = bb.left;  }
        if (settings.align == 'center')    { pos.x = this.size.x * 0.5 - bb.width * 0.5;  }
        if (settings.align == 'right')     { pos.x = this.size.x - bb.width; }
        if (settings.baseline == 'top')    { pos.y = bb.top;  }
        if (settings.baseline == 'middle') { pos.y = this.size.y * 0.5 - bb.height * 0.5;  }
        if (settings.baseline == 'bottom') { pos.y = this.size.y - bb.height; }   
                        
        const o          = Vec2.Add(pos, Vec2.Add(settings?.textOffset ? settings.textOffset : V2(0, 0), this.position));    
        const color      = this.isEnabled ? settings.clActiveText : settings.clInactiveText;        
        const shadow     = settings.textShadow ? { shadow:settings.textShadow } : null;
        const textParams = Object.assign({ font:settings.font, color, textAlign:'left', textBaseline:'top' }, shadow);

        s.textOut(o, this._caption, textParams);
    }

    get caption() {
        return this._caption;
    }

    set caption(s) {
        this._caption = s;
    }    
}    