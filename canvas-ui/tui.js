import { Vector2 as Vec2, V2, Rect, RECT } from '../types.js';
import { getJSON, preloadImages } from '../utils.js';
import { TControl } from './tcontrol.js';
import { Picture } from '../picture.js';

export class TUI extends TControl {
    #isInitialized = false;

    /**
     * Creates a new top level UI system overlay
     * @param {TinyGameEngine} engine 
     */
    constructor(engine) {
        super({ parent:null });

        this.engine     = engine;                   // used to determine the viewport dimensions and attach event handlers
        this.surface    = engine.renderingSurface;
        this.components = [];
        this.isCanvasUI = true;
        this.defaults   = {};                       // defaults are loaded from "default.styles.hjson"
        this.windows    = {};

        this.draggedControl = null;
        this.activeWindow   = null;
        this.dragStartPos   = null;
        this.hoveredControl = null;
        this.activeControl  = null;

        this.installEventHandlers();
    }

    installEventHandlers() {
        const mousedown = e => { 
            const hit = this.getTopmostChildAt(e.position);
            if (hit == null) return;

            hit.onMouseDown(e);                        
            
            if (hit.isMovable && hit.dragActivationCtrl) {                      
                if (hit.dragActivationCtrl.absoluteRect.isPointInside(e.position)) {                    
                    this.draggedControl = hit;                    
                    this.dragStartPos   = hit.position.clone();                            
                }
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
                if (d.onDrag) d.onDrag(e);
            }       

            // Simulate mouse over (Note! this MUST BE simulated because there are no HTMLElements to launch the real mouseover event!)
            let comp = this.getTopmostChildAt(e.position);
            if (comp == null) {
                for (let c of this.children) if (c._isHovered) {
                    c._isHovered = false;
                    c.onMouseOut(e);                    
                }
                return;
            }

            // if at least one component on top level has mouse over it, continue to its children:
            const list = [];
            if (comp) list.push(comp);
            while (list.length > 0) {                
                comp = list.pop();
                const isInside = comp.absoluteRect.isPointInside(e.position);
                
                if (isInside) {            
                    comp.onMouseMove(e);
                    if (!comp._isHovered) {
                        comp._isHovered = true;
                        comp.onMouseOver(e);
                    }
                    list.push(...comp.children);
                } else {
                    if (comp._isHovered) {
                        comp._isHovered = false;
                        comp.onMouseOut(e);                    
                    }
                }
            }
        }

        const mouseup   = e => {
            this.draggedControl = null;
            
            const hit = this.getTopmostChildAt(e.position);        
            if (hit == null) return;
            
            this.engine.events.stopPropagation('mouseup');                                                      // prevent propagation if a window was hit (i.e. click doesn't go "through" the window)           
            hit.onMouseUp(e);            
        }
        
        const keydown   = e => { if (this.activeWindow != null) this.activeWindow.onKeyDown(e); }
        const wheel     = e => {}
        this.engine.events.register(this, { mousemove, mouseup, mousedown, keydown, wheel });
    }  
    
    async init(filename) {                
        const r = await getJSON(filename);
        const d = this.defaults;
        for (const [k, v] of Object.entries(r)) {
            d[k] = v;            
            if (k == 'background') {                  
                for (const [comp, data] of Object.entries(d.background)) {
                    if (typeof data == 'object') {
                        if ('frame' in data) {                                                                  // background frameset
                            d.background[comp].frame = await loadFrames(d.background.window.frame);
                        }                        
                        if ('url' in data) {                                                                    // background url
                            d.background[comp].picture = await Picture.LoadFromFile(data.url);                        
                        }                    
                    }
                }
            }
        }    
        this.#isInitialized = true;
        this.isVisible = true;                                                                                  // make ui visible
    }  

    /**
     * Copy all properties from source object to target, overwriting existing properties. Object references are not copied - they are cloned.
     * @param {*} target 
     * @param {*} source 
     * @returns 
     */
    applyProps(target, source) {
        for (const [k, v] of Object.entries(source)) {
            if (typeof v == 'object') {
                if (!(k in target)) target[k] = {};
                this.applyProps(target[k], v);             
            } else
                target[k] = v;
        }
    }

    /**
     * Adds a bunch of controls as the TUI system's root level children (usually TCustomWindow or its descendants)
     * @param {TControl} list of TControl descendants
     */
    addChildren(list) {
        for (const ctrl of list) {            
            const i = this.addInstance(ctrl);
            if (i.prototypes.includes('TCustomWindow') && i.name) this.windows[i.name] = i;
        }
    }
    
    /**
     * Traverses up the control's parent chain and stops at the first TCustomWindow component. Returns null if no TCustomWindow is found.
     * @param {TControl} control 
     * @returns {(TWindow|null)}
     */
    findParentWindow(control) {        
        while (control != null) {
            if (control.isWindow) return control;
            control = control.parent;
        }
        return null;        
    }
}

const loadFrames = async (o) => {
    if (o.ext) for (let i = 0; i < o.urls.length; i++) o.urls[i] = o.urls[i] += '.' + o.ext;
    return await preloadImages(o);
}