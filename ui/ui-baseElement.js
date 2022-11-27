import { Vector2 as Vec2, V2 } from "../types.js";
import { Events } from "../events.js";

class UBaseElement {
    #ui;
    #owner;    
    constructor(o) {             
        if (!(o.owner || o.owner.objectType != 'UI') && !o.ui) throw 'Reference to UI object was not given when creating a new UI component.';

        if (o.owner instanceof UBaseElement || o.owner.objectType == 'UI') {
            if (o.parent) this.elem = AE.newElem(o.parent, o.tagName);            
                else this.elem = AE.newElem(('body' in o.owner) ? o.owner.body : o.owner.elem, o.tagName); // if "parent" is not given, the parent element will be either owner.body (if present) or owner.elem
        } else throw 'All UI components must have an owner';
            
        if (o.className) AE.addClass(this.elem, o.className);

        this.#owner    = o.owner;
        this.#ui       = o.ui || o.owner.ui || o.owner;
        this.events    = new Events(this, 'mousedown');
        this.children  = [];
        this.enabled   = true;
        this.modal     = ('modal' in o);        
        this.name      = ('name' in o) ? o.name : '';        

        this._position = Vec2.Zero(); 
        this.position  = ('position' in o) ? o.position : this._position;
        this._size     = ('size' in o) ? o.size : Vec2.Zero();

        this._align    = '';
        this.align     = ('align' in o) ? o.align : '';

        if ('height' in o) {
            const h = AE.isNumeric(o.height) ? o.height + 'px' : o.height;
            AE.style(this.elem, `height:${h}`);
        }
        if ('width' in o) {
            const w = AE.isNumeric(o.width) ? o.width + 'px' : o.width;
            AE.style(this.elem, `width:${w}`);
        }

        if ('margin' in o) this.margin = o.margin;
                
        this.ui.components.push(this);
        if (this.#owner instanceof UBaseElement) this.#owner.children.push(this);
    }

    get owner() {
        return this.#owner;
    }

    get ui() {
        return this.#ui;
    }

    set align(v) {
        const sp = v.split(' ');
        if (sp.length > 0) {
            let a = 'center';
            
            if (sp[0] == 'left')   a = 'start';
            if (sp[0] == 'even')   a = 'space-evenly';
            if (sp[0] == 'space')  a = 'space-between';
            if (sp[0] == 'right')  a = 'end';

            AE.style(this.elem, 'justify-content:' + a);
        }
        if (sp.length > 1) {
            let a = 'center';
            
            if (sp[1] == 'top')    a = 'start';
            if (sp[1] == 'even')   a = 'space-evenly';
            if (sp[1] == 'space')  a = 'space-between';
            if (sp[1] == 'bottom') a = 'end';

            AE.style(this.elem, 'align-items:' + a);
        }
    }

    set margin(v) {
        v = v + '';
        const sp = v.split(' ');
        for (let i = 0; i < sp.length; i++) {
            if (!AE.isNumeric(sp[i])) throw 'Margin must be a number, got: ' + sp[i];
            sp[i] += 'px';
        }        
        AE.style(this.elem, `margin:${sp.join(' ')}`);
    }

    get align() {
        return this._align;
    }
    
    set position(v) {
        if (v == 'auto') {
            this.elem.left = '';
            this.elem.top  = '';
            this._position = 'auto';
            return;
        }
        this._position.set(v);
        AE.style(this.elem, `left:${v.x}px; top:${v.y}px`);
    }

    get position() {
        if (this._position == 'auto') return null;
        return this._position.clone();
    }

    set size(v) {
        this._size.set(v);
        AE.style(this.elem, `width:${v.x}px; height:${v.y}px`);
    }

    get size() {
        return V2(this.elem.clientWidth, this.elem.clientHeight);
    }  
    
    findByName(name, deep = true) {
        let result = null;
        function find(p) {
            if (p.name == name) return result = p;
            for (const c of p.children) find(c);
        }        
        find(this);                
        return result;
    }

    getOwnerWindow() {
        let o = this;
        while (o) {
            if (o.constructor.name == 'UWindow' || o.constructor.name == 'UDialog') return o;
            o = o.owner;
        }
    }
}

export { UBaseElement }