/**
 * 
 * TControl      - base class for visual components
 * 
 */
 
import { Vector2 as Vec2, V2, Rect, RECT } from '../types.js';
import { TComponent } from './tcomponent.js';

const ImplementsEvents = 'click mousedown mousemove mousemove wheel';
/**
 * Represents a (visual) component which can be drawn on the canvas and interact with the mouse
 */
export class TControl extends TComponent {
    constructor(o) {
        super(o);
        this.position   = 'position' in o ? o.position : V2(0, 0);
        this.size       = 'size' in o ? o.size : V2(0, 0);    
        this._isVisible = false;    
        this._createVisible = 'isVisible' in o ? o.isVisible : true;
        this._isEnabled = true;
    }

    get isEnabled() { return this._isEnabled }

    get isVisible() { return this._isVisible; }
    set isVisible(v) {   
        if (v === true) {
            if (this._isVisible == false) {
                this.events.fire('show', {});
                this.onShow();
            }
            this._isVisible = true;                
            return;
        }
        if (v === false) {        
            if (this._isVisible == true) {
                this.events.fire('hide', {});
                this.onHide();
            }
            this._isVisible = false;
        }         
    }

    /**
     * Absolute coordinates
     */
    get absoluteOffset() {        
        if (this?.parent?.absoluteOffset) return this.position.clone().add(this.parent.absoluteOffset);
        return this.position.clone();
    }

    get absoluteRect() {
        const o = this.absoluteOffset; 
        return RECT(o.x, o.y, this.size.x, this.size.y);
    }

    get clientRect() {
        return RECT(0, 0, this.size.x, this.size.y);
    }

    get rect() {
        return Rect.FromVectors(this.position, Vec2.Add(this.position, this.size));
    }

    get zIndex() {        
        return this.parent.children.indexOf(this);
    }
    
    get firstChild()   { return this.children[0]; }
    set firstChild(v)  { if (this.children.length > 0) { this.children[0] = v; v.parent = this; } }
    get lastChild()    { return this.children.at(-1); }
    set lastChild(v)   { if (this.children.length > 0) { this.children[this.children.length - 1] = v; v.parent = this; } }

    onCreate() {
        if (this._createVisible) this.isVisible = true;
    }

    onShow(e) {}
    onHide(e) {}
    
    onClick(e) {}
    onMouseDown(e) {        
        const hit = this.getTopmostChildAt(e.position);
        if (!hit) return;
        hit.onMouseDown(e);                    
    }
    onMouseUp(e) {
        const hit = this.getTopmostChildAt(e.position);
        if (!hit) return;
        hit.onMouseUp(e);                    
    }
    onMouseMove(e) {}
    onWheel(e) {}
        
    draw() {     
        if (!this.isVisible) return;    
        
        for (const c of this.children) {
            this.surface.ctx.save();
            c.draw();
            this.surface.ctx.restore();
        }        
    }

    /**
     * Checks which child components are visible at given screen coordinates. All components which are under the given point will be added in the results array.
     * @param {!Vector2} point Coordinates to check
     * @returns {TComponent[]} Returns a list of results
     */
    getTopmostChildAt(point) {
        const depthSorted = [...this.children].sort((a, b) => a.zIndex - b.zIndex);

        for (let i = depthSorted.length; i--;) {
            const c = depthSorted[i];
            if (!c.isVisible || !c.onMouseDown) continue;                
            if (('rect' in c) && c.absoluteRect.isPointInside(point)) return c;
        }
        return null;
    }

    fetchDefaults(name) {
        const { defaults } = this.ui;

        Object.assign(this.settings, defaults.color);                                       // get color definitions
        
        if ('background' in defaults) {                                                     // background
            this.background = defaults.background[name];            
        }

        if (name in defaults) {
            Object.assign(this.settings, defaults[name]);
        }
    }

    forAllChildren(callback, skipSelf = true) {
        const loopChildren = (node) => {
            if (skipSelf == false) callback(node);             
            skipSelf = false;
            for (let ch of node.children) loopChildren(ch);
        }
        loopChildren(this);        
    }
}