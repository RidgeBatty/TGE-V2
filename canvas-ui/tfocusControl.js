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

export class TFocusControl extends TControl {
    constructor(o) {
        super(o);
        
        this.background  = {};
        this.settings    = {};

        addMethods(TFocusControl, { drawGridPattern });

        this.events.create(ImplementsEvents);
    }
    
    async loadFrames(o) {
        if (o.ext) for (let i = 0; i < o.urls.length; i++) o.urls[i] = o.urls[i] += '.' + o.ext;
        this.frames = await preloadImages(o);
    }
        
    onKeyDown(e) {}
    
    onMouseDown(e) {        
        this.ui.activeControl = this;                        
        super.onMouseDown(e);
    }
}
