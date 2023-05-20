/**
 * 
 * TFocusControl - base class for components which may acquire focus (keyboard input, etc)
 * 
 */
 
import { Vector2 as Vec2, V2, Rect, RECT } from '../types.js';
import { drawGridPattern } from './gridpattern.js';
import { addMethods, preloadImages } from '../utils.js';
import { TControl } from './tcontrol.js';

const ImplementsEvents = 'keydown keyup';

let TabIndex = 1;

export class TFocusControl extends TControl {
    constructor(o) {
        super(o);
        
        this.background  = {};
        this.settings    = {};
        this._tabIndex   = TabIndex++;
        this._isActive   = false;                  
        
        addMethods(TFocusControl, { drawGridPattern });

        this.events.create(ImplementsEvents);
    }
    
    get isActive() { return this._isActive; }
    set isActive(v) {
        if (v === true) {
            if (this._isActive == false) this.onActivate();            
            return;
        }
        if (v === false) {
            if (this._isActive == true) this.onDeactivate();            
            return;
        }
    }

    onActivate() { this.ui.activeControl = this; this._isActive = true; }
    onDeactivate() { this.ui.activeControl = null; this._isActive = false; }
    
    async loadFrames(o) {
        if (o.ext) for (let i = 0; i < o.urls.length; i++) o.urls[i] = o.urls[i] += '.' + o.ext;
        this.frames = await preloadImages(o);
    }

    get tabIndex() {
        return this._tabIndex;
    }
        
    onKeyDown(e) {}
    
    onMouseDown(e) {        
        this.ui.activeControl = this;
        super.onMouseDown(e);
    }
}
