/*
 * TComponent    - base class for ui components
 * TControl      - base class for visual components
 * TFocusControl - base class for components which may acquire focus (keyboard input, etc)
 */
 
import { Vector2 as Vec2, V2, Rect, RECT } from '../../types.js';
import { drawGridPattern } from './gridpattern.js';
import { addMethods, preloadImages } from '../utils.js';
import { Events } from '../../events.js';

const ImplementsEvents = 'create destroy';

export class TComponent {
    /**
     * 
     * @param {object} o params
     * @param {CBaseControl|CUI} o.parent parent component
     * @param {Vector2} o.position position of the components top left corner
     * @param {Vector2} o.size width and height of the component
     */
    constructor(o = {}) {        
        this.parent   = 'parent' in o ? o.parent : null;        
        this.name     = 'name' in o ? o.name : null;
        this.children = [];
        this.surface  = this.parent?.surface || this.surface;        
        this.events   = new Events(this, ImplementsEvents);

        this.onCreate();         
    }

    destroy() {
        const f = this.ui.components.findIndex(e => e == this);
        this.ui.components.splice(f, 1);

        if (this.parent) {
            const f = this.parent.children.findIndex(e => e == this);
            this.parent.children.splice(f, 1);
        }
        
        this.events.fire('destroy', {});
        this.onDestroy();
    }

    get ui() {
        let node = this;
        while (node.parent) {
            node = node.parent;
        }
        return node;        
    }

    get prototypes() {
        let node  = this;
        let chain = [];
        while (node) {                    
            node = Object.getPrototypeOf(node);                        
            if (node.constructor.name == 'Object') break;            
            chain.push(node.constructor.name);
        }
        return chain;        
    }

    onCreate() {}
    onDestroy() {}
    
    add(classRef, o = {}) {        
        const component = new classRef(Object.assign(o, { parent:this }));
        this.children.push(component);
        this.ui.components.push(component);

        return component;
    }
}

/**
 * Represents a (visual) component which can be drawn on the canvas and interact with the mouse
 */
export class TControl extends TComponent {
    constructor(o) {
        super(o);
        this.position   = 'position' in o ? o.position : V2(0, 0);
        this.size       = 'size' in o ? o.size : V2(0, 0);        
        this._isVisible = false;        
        this.zIndex     = 0;
        this.setVisible('isVisible' in o ? o.isVisible : true);
        
        this.events.create('show hide');
    }
    
    get topmostChild() {
        let zIndex = 0;
        let ch     = this;
        this.children.forEach(e => { if ('zIndex' in e && this.zIndex < e.zIndex) { zIndex = e.zIndex; ch = e; } });
        return ch;
    }

    add(classRef, o = {}) {    
        const c = super.add(classRef, o);
        c.zIndex = c.parent.topmostChild.zIndex + 1;    
        return c;
    }

    get isVisible() {
        return this._isVisible;
    }

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

    setVisible(v) {        
        this.isVisible = v;
    }
    
    get rect() {
        return Rect.FromVectors(this.position, Vec2.Add(this.position, this.size));
    }

    onShow() {}
    onHide() {}

    onClick(e) {}
    onMouseDown(e) {}
    onMouseUp(e) {}
    onMouseMove(e) {}
    onWheel(e) {}
        
    draw() {
        if (!this.isVisible) return;
        this.surface.resetTransform();
        
        for (const c of this.children) c.draw();
    }

    /**
     * Checks which child components are visible at given screen coordinates
     * @param {!TComponent} component Component whose immediate children to check
     * @param {!Vector2} point Coordinates to check
     * @returns {TComponent[]} Returns a list of results
     */
    hitTestChildComponents(component, point) {
        const depthSorted = component.children.sort((a, b) => a.zIndex - b.zIndex);
        const hits = [];

        for (let i = depthSorted.length; i--;) {
            const c = depthSorted[i];
            if (!c.isVisible || !c.onMouseDown) continue;                
            if (('rect' in c) && c.rect.isPointInside(point)) return c;
        }
        return null;
    }
}

export class TFocusControl extends TControl {
    constructor(o) {
        super(o);
        
        this.background  = {};
        this.settings    = {
            captionAlign    : 'center',
            captionBaseline : 'middle',
            captionOffset   : V2(0, 0),            
            captionFont     : '20px arial',            
            captionHeight   : 24,
            captionMargins  : {
                left : 0,
                right : 0,
                bottom : 0,
                top : 0,
            }
        }
        
        addMethods(TFocusControl, { drawGridPattern });
    }

    fetchDefaults(name) {
        const defaults = this.ui.defaults;
        Object.assign(this.settings, defaults.color);
        const bg = this.ui.defaults?.background[name];
        if (bg) {
            this.background = bg;            
        }
    }
    
    async loadFrames(o) {
        if (o.ext) for (let i = 0; i < o.urls.length; i++) o.urls[i] = o.urls[i] += '.' + o.ext;
        this.frames = await preloadImages(o);
    }
    
    get caption() {
        return this._caption;
    }

    set caption(s) {
        this._caption = s;
    }
    
    get rect() {
        const { settings } = this;
        const pp = this.parent?.position ? this.parent.position : V2(0, 0);
        return RECT(pp.x + settings.captionOffset.x + this.position.x, pp.y + settings.captionOffset.y + this.position.y, this.size.x, this.size.y);
    }
    
    onKeyDown(e) {}
    
    onMouseDown(e) {        
        this.ui.activeControl = this;                
        super.onMouseDown(e);
    }
}
