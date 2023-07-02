import { Vector2 as Vec2, V2, Rect, RECT } from '../types.js';
import { copyProps, getJSON, preloadImages } from '../utils.js';
import { TControl } from './tcontrol.js';
import { Picture } from '../picture.js';

const FieldsToCopy = 'name components windows children _activeWindow activeControl hoverCursor';
class TDesktop {}

export class TUI extends TControl {
    #isInitialized = false;
    

    /**
     * Creates a new top level UI system overlay
     * @param {TinyGameEngine} engine 
     */
    constructor(engine) {
        super({ parent:null, name:'default' });

        this.engine     = engine;                                                           // used to determine the viewport dimensions and attach event handlers
        this.surface    = engine.renderingSurface;
        this.size       = this.surface.size;
        this.isCanvasUI = true;
        this.desktops   = [];                                                               // optional system: desktop is a snapshot of GUI state. Having multiple desktops is useful especially in editors.        
        this.defaults   = {};                                                               // defaults are loaded from "default.styles.hjson"

        this.initDesktop();
        this.installEventHandlers();  
        this.createDesktop(this.name);
    }

    initDesktop() {
        this.components      = [];
        this.children        = [];
        this.windows         = {};        

        this.draggedControl  = null;
        this._activeWindow   = null;
        this.dragStartPos    = null;
        this.hoveredControl  = null;
        this.activeControl   = null;
        
        this.mbDownControls  = [];                                                         // mouse down control (needs to be saved to complete click event)
        this.hoveredControls = [];
        this.hoverCursor     = 'auto';
    }

    /**
     * Creates a new empty desktop 
     */
    createDesktop(name, switchToCreatedDesktop) {
        const d = new TDesktop();
        this.initDesktop.apply(d);     
        d.name = name;           

        if (this.desktops.find(f => f.name == name) == null) this.desktops.push(d);       // if the created desktop is not found in the desktops collection, add it there            
        if (switchToCreatedDesktop) this.switchDesktop(name);

        return d;
    }

    /**
     * Saves the desktop state 
     */
    _saveDesktopState(name) {        
        let target  = this.desktops.find(f => f.name == name);                           
        if (target == null) throw new Error(`Desktop with name "${name}" does not exists!`)

        copyProps(target, this, FieldsToCopy);
        target.components = [...this.components];
        target.children   = [...this.children];
        copyProps(target.windows, this.windows, Object.keys(this.windows));
    }

    /**
     * Loads the desktop state 
     */
    _loadDesktopState(name) {        
        let t  = this.desktops.find(f => f.name == name);                           
        if (t == null) throw new Error(`Desktop with name "${name}" does not exists!`)

        copyProps(this, t, FieldsToCopy);
        this.components = [...t.components];
        this.children   = [...t.children];
        copyProps(this.windows, t.windows, Object.keys(t.windows));
    }

    /**
     * Switches to desktop "name" by storing the current GUI state and then replacing it. 
     * Replacing includes all windows, components, etc.
     * @param {string} name 
     */
    switchDesktop(name) {        
        let target  = this.desktops.find(f => f.name == name);                             // we're going to switch to this desktop
        if (target == null) {
            throw new Error(`Desktop with name "${name}" does not exists!`)
        }

        let current = this.desktops.find(f => f.name == this.name);                        // find the current desktop
        if (current == null) {
            console.warn('Cannot find desktop:', this.name)
            return this.createDesktop(this.name, true);
        } 

        this._saveDesktopState(this.name);                                                 // save the current state
        this._loadDesktopState(name);
    }

    get activeWindow() { return this._activeWindow }
    set activeWindow(w) {        
        if (this._activeWindow != null && this._activeWindow.isActive) {                   // Active window already exists, we need to set the old active windows active status to false
            this._activeWindow._isActive = false;
            //console.log('Active window already exists:', this._activeWindow.caption)
        }
        
        if (w != null && w.isWindow && !w.isActive) {                                      // we have a new active window

            //console.log('We have a new active window:', w.caption)
            this._activeWindow    = w;
            
            // bring window to front:
            const index = w.parent.children.findIndex(f => f == w);
            w.parent.children.splice(index, 1);
            w.parent.children.push(w);
            this.activeControl = w;                                                        // make the active window also the currently active control
        }

        if (w == null) {                                                                   // CustomWindow onDeactivate call has set the UI activeWindow to null. Now we need to figure out if there is any window which can be activated instead
            //console.log('Deactivating:', this.activeWindow.caption)
            const topmostWindow = this.children.findLast(f => f != this._activeWindow && f.isWindow && f.isVisible && f.isEnabled);                        

            //console.log('Topmost window:', topmostWindow.caption);

            if (topmostWindow != null) {                            
                // console.log('New topmost window:', topmostWindow.caption)
                topmostWindow.onActivate();
                this.activeControl     = topmostWindow;
            } else {                                                                       // all windows have been closed
                this._activeWindow     = null;                      
                this._activeControl    = null;
            }
        }        
    }

    installEventHandlers() {
        const mousedown = e => { 

            let node = this;
            while (node) {                                                                  // propagate click through the stack of controls under the mouse
                node = node.getTopmostChildAt(e.position);
                if (node == null) break;

                if (node.isWindow) node.isActive = true;                                    // activate window on mousedown
                
                this.engine.events.stopPropagation('mousedown');                            // stop mousedown propagation if UI element has been hit!
                
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

            const isInsideClipRect = (node) => {
                if (node.clipRect == null) return true;                                                                // test if node has a cliprect: if it does, use it to determine if the mouse handling should proceed
                const clipArea = node.clipRect.clone();
                clipArea.moveBy(node.absoluteRect.position);
                
                return clipArea.isPointInside(e.position);
            }

            // Simulate mouse over (Note! this MUST BE simulated because there are no HTMLElements to launch the real mouseover event!)                  
            const check = (node) => {
                if (!node.isEnabled || !node.isVisible) return;

                if (node.parent != null) {                    
                    let isInside = node.absoluteRect.isPointInside(e.position);    
                    if (!isInside || !isInsideClipRect(node)) return;                    
                } 

                node.onMouseMove(e);
                if (this.hoveredControls.find(f => f.control == node) == null) {
                    this.hoveredControls.push({ hovered:true, control:node });
                    const event = Object.assign({ control:node }, e);
                    event.name = 'mouseover';
                    node.onMouseOver(event);
                    node._isHovered = true;                                                
                    if (node.hoverCursor) {
                        document.body.style.cursor = node.hoverCursor;
                    }
                        else document.body.style.cursor = this.hoverCursor;
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
            
                this.engine.events.stopPropagation('mouseup');                                                  // prevent propagation if a window was hit (i.e. click doesn't go "through" the window)                                                       
                node.onMouseUp(e);

                const c = this.mbDownControls.shift();
                if (node == c) {
                    const event = { name:'click', control:node };
                    node.onClick(Object.assign({}, e, event));
                    node.events.fire('click', event);
                }
            }

            this.mbDownControls.length = 0;
        }
        
        const keydown   = e => { if (this._activeWindow != null) this._activeWindow.onKeyDown(e); }
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
            if (Array.isArray(v)) {
                target[k] = [];
                this.applyProps(target[k], v);
            }
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