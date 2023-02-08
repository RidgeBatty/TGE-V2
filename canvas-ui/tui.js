import { Vector2 as Vec2, V2, Rect, RECT } from '../../types.js';
import { getJSON, preloadImages } from '../utils.js';
import { TComponent, TControl } from './base.js';
import { Picture } from '../../picture.js';

class TUI extends TControl {
    #isInitialized = false;

    constructor(engine) {
        super({ parent:null });

        this.engine     = engine;                   // used to determine the viewport dimensions and attach event handlers
        this.surface    = engine.renderingSurface;
        this.components = [];
        this.isCanvasUI = true;
        this.defaults   = {};                       // defaults are loaded from "default.styles.hjson"

        this.draggedControl = null;
        this.activeWindow   = null;
        this.dragStartPos   = null;

        this.installEventHandlers();
    }

    installEventHandlers() {
        const mousedown = e => { 
            const hit = this.hitTestChildComponents(this, e.position);
            if (!hit) return;

            hit.onMouseDown(e);            

            if (hit.isMovable && ('captionRect' in hit) && hit.captionRect.isPointInside(e.position)) {
                this.draggedControl = hit;
                this.dragStartPos   = hit.position.clone();
            }
        }
        const mousemove = e => {
            const d = this.draggedControl;
            if (d) {                
                const p = Vec2.Add(this.dragStartPos, e.delta);
                p.x = Math.max(p.x, d.edges.left);
                p.y = Math.max(p.y, d.edges.top);
                p.x = Math.min(p.x, d.edges.right - d.size.x);
                p.y = Math.min(p.y, d.edges.bottom - d.size.y);
                d.position = p;
            }
            for (const c of this.components) {
                if (c.isVisible) c.onMouseMove(e);
            }
        }
        const mouseup   = e => {
            this.draggedControl = null;

            const hit = this.hitTestChildComponents(this, e.position);
            if (!hit) return;
            hit.onMouseUp(e);            
        }
        
        const keydown   = e => {}
        const wheel     = e => {}
        this.engine.events.register(this, { mousemove, mouseup, mousedown, keydown, wheel });
    }  
    
    async init() {        
        const r = await getJSON('../../canvas-ui/default.styles.hjson');
        const d = this.defaults;
        for (const [k, v] of Object.entries(r)) {
            d[k] = v;
            if (k == 'background') {                
                for (const [comp, data] of Object.entries(d.background)) {
                    if ('frame' in data) {                                                                  // background frameset
                        d.background[comp].frame = await loadFrames(d.background.window.frame);
                    }                        
                    if ('url' in data) {                                                                    // background url
                        d.background[comp].picture = await Picture.LoadFromFile(data.url);                        
                    }                    
                }
            }
        }
        console.log(d)
        this.#isInitialized = true;
    }    
}

const loadFrames = async (o) => {
    if (o.ext) for (let i = 0; i < o.urls.length; i++) o.urls[i] = o.urls[i] += '.' + o.ext;
    return await preloadImages(o);
}


export { TUI }

