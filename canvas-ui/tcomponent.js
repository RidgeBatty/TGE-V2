/**
 * 
 * TComponent    - base class for ui components
 * 
 */
 
import { Events } from '../events.js';

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

        Object.defineProperty(this, 'data', { value:{}, configurable:false });
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

    get parents() { 
        const p = []; 
        let node = this; 
        while (node.parent) { 
            p.push(node.parent);
            node = node.parent; 
        } 
        return p; 
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

    isDescendantOf(name) {
        return this.prototypes.indexOf(name) > -1;
    }

    /**
     * Test if this component is parent of "node"
     * @param {TComponent} node 
     * @returns {Boolean}
     */
    isParentOf(node) {
        while (node) {
            if (this == node) return true;
            node = node.parent;
        }
    }

    onCreate() {
        console.log('On Create')
    }
    onDestroy() {}

    /**
     * Adds a created component into the TUI system
     * @param {*} component 
     */
    addInstance(component) {
        this.children.push(component);
        this.ui.components.push(component);       
        
        component.onCreate();

        return component;
    }
    
    /**
     * Creates a new instance of a component and adds it into the TUI system
     * @param {*} classRef 
     * @param {*} o 
     * @returns 
     */
    add(classRef, o = {}) {        
        const component = new classRef(Object.assign(o, { parent:this }));
        this.children.push(component);
        this.ui.components.push(component);       
        
        component.onCreate();

        return component;
    }
}
