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
        
        this.mbDownControls  = [];                 // mouse down control (needs to be saved to complete click event)
        this.hoveredControls = [];
        this.hoverCursor     = 'pointer';

        this.installEventHandlers();
    }

    installEventHandlers() {
        const mousedown = e => { 

            let node = this;
            while (node) {                                                                  // propagate click through the stack of controls under the mouse
                node = node.getTopmostChildAt(e.position);
                if (node == null) break;
                
                node.onMouseDown(e);                        
                this.mbDownControls.push(node);
              
                if (node.isMovable && node.dragActivationCtrl) {                      
                    if (node.dragActivationCtrl.absoluteRect.isPointInside(e.position)) {                    
                        this.draggedControl = node;                    
                        this.dragStartPos   = node.position.clone();                            
                    }
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
            const check = (node) => {
                if (!node.isEnabled || !node.isVisible) return;                    
                let isInside = node.absoluteRect.isPointInside(e.position);                    
                if (isInside) {
                    node.onMouseMove(e);

                    if (this.hoveredControls.find(f => f.control == node) == null) {
                        this.hoveredControls.push({ hovered:true, control:node });
                        node.onMouseOver(e);
                        node._isHovered = true;                                                
                        if (node.hoverCursor) document.body.style.cursor = node.hoverCursor;
                            else document.body.style.cursor = this.hoverCursor;
                    }
                }           
                for (const child of node.children) check(child);
            }                                                                       
            check(this);            
                
            this.hoveredControls.forEach(item => {                    
                let isInside = item.control.absoluteRect.isPointInside(e.position);
                if (!isInside) {
                    item.control.onMouseOut(e);
                    item.control._isHovered = false;
                    item.hovered = false;                                            
                    document.body.style.cursor = 'default';
                }                        
            });
            
            this.hoveredControls = this.hoveredControls.filter(f => f.hovered);
        }

        const mouseup   = e => {
            if (this.draggedControl) {
                if (this.draggedControl.onDragEnd) this.draggedControl.onDragEnd(e);                
                for (const h of this.hoveredControls) {                                                         // check which controls are hovered, when drag operation ends
                    if (h.control.onDrop) h.control.onDrop(this.draggedControl);
                }                
                this.draggedControl = null;
            }
            
            let node = this;
            while (node) {
                node = node.getTopmostChildAt(e.position);        
                if (node == null) break;
            
                //this.engine.events.stopPropagation('mouseup');                                                      // prevent propagation if a window was hit (i.e. click doesn't go "through" the window)           
                node.onMouseUp(e);

                const c = this.mbDownControls.shift();
                if (node == c) node.onClick(Object.assign({}, e, { name:'click', control:node }));
            }

            this.mbDownControls.length = 0;
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