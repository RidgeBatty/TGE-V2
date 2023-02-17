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

    onCreate() {
        console.log('On Create')
    }
    onDestroy() {}
    
    add(classRef, o = {}) {        
        const component = new classRef(Object.assign(o, { parent:this }));
        this.children.push(component);
        this.ui.components.push(component);       
        
        component.onCreate();

        return component;
    }
}
