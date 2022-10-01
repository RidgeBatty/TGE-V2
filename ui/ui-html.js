import { Engine } from "../engine.js";
import { Vector2 as Vec2, V2 } from "../types.js";

class UI {
    constructor(engine, UIRootElement) {
        this.components    = [];
        this.engine        = engine;
        this.elem          = ID(UIRootElement || engine._rootElem);
        this.flags         = {
            disablePointerEvents : false
        }
        this.pointer       = {
            downPos          : Vec2.Zero(),
            downComponentPos : null,
        }
        this.active        = null;              // currently active UWindow component (changes on mousedown event)
        
        const onMouseDown = (e) => {
            if (this.flags.disablePointerEvents) return;                        
            const f = this.components.filter(c => c.elem.contains(e.target));          
            
            this.active = null;
            for (const c of f) {
                if (c instanceof UWindow && c.enabled) {
                    this.active = c;
                    this.pointer.downComponentPos = c.position;                    
                }                
                if (c.enabled && ('events' in c) && c._events.onMouseDown) c._events.onMouseDown(e);                
            }            
        }

        const onMouseMove = (e) => {
            if (this.flags.disablePointerEvents) return;                        

            if (e.dragging && this.active != null) {                // if we have an active UWindow component and we're dragging with mouse, move the window!                
                this.moveWindow(this.active, e.delta);
            }
            const f = this.components.filter(c => c.elem.contains(e.target));                        
            for (const c of f) if (c.enabled && ('events' in c) && c._events.onMouseMove) c._events.onMouseMove(e);
        }

        engine.events.add({ mousedown : onMouseDown, mousemove : onMouseMove });
    }

    moveWindow(win, delta) {
        if (this.active.modal) return;

        win.position = Vec2.Add(this.pointer.downComponentPos, delta);
        const p = win.position;
        if (p.x < 0) win.position = { x:0 };
        if (p.y < 0) win.position = { y:0 };

        const screen = this.size;                
        if (p.x + win.size.x > screen.x) win.position = { x:screen.x - win.size.x };
        if (p.y + win.size.y > screen.y) win.position = { y:screen.y - win.size.y };                
    }

    get size() {        
        return V2(this.elem.clientWidth, this.elem.clientHeight);       
    }
}

class UIBaseElement {
    #ui;
    #owner;
    constructor(o) {            
        if (!o.owner.ui && !o.owner instanceof UI) throw 'Reference to UI object was not given when creating a new UI component.';

        if (o.owner instanceof UIBaseElement || o.owner instanceof UI) this.elem = AE.newElem(('body' in o.owner) ? o.owner.body : o.owner.elem, o.tagName);
            else this.elem = AE.newElem(o.owner, o.tagName);   
            
        if (o.className) AE.addClass(this.elem, o.className);

        this.#owner    = o.owner;
        this.#ui       = o.ui || o.owner.ui || o.owner;
        this.children  = [];
        this._events   = {};
        this.enabled   = true;
        this.modal     = ('modal' in o);        

        this._position = Vec2.Zero(); 
        this.position  = ('position' in o) ? o.position : this._position;
        this._size     = ('size' in o) ? o.size : Vec2.Zero();

        this._align    = '';
        this.align     = ('align' in o) ? o.align : '';
        
        this.ui.components.push(this);
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
            
            if (sp[1] == 'left')   a = 'start';
            if (sp[1] == 'even')   a = 'space-evenly';
            if (sp[1] == 'space')  a = 'space-between';
            if (sp[1] == 'right')  a = 'end';

            AE.style(this.elem, 'align-items:' + a);
        }
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
    
    addEvent(name, handler) {
        if (!('events' in this)) return;
        if (this.events[name]) this.events[name].push(handler);
    }

    removeEvent(name, handler) {
        if (!('events' in this)) return;
        const e = this.events[name];
        if (e) for (let i = e.length; i--;) if (e[i] == handler) e.splice(i, 1);        
    }
}

class UCaption extends UIBaseElement {
    constructor(o) {
        o.tagName = 'ui-caption';
        super(o);

        this.elem.textContent = o.caption;
    }
    
    set caption(t) {
        this.elem.textContent = t;
    }

    get caption() {
        return this.elem.textContent;
    }
}

class UButton extends UIBaseElement {
    constructor(o) {
        o.tagName = 'ui-button';        
        super(o);                
        this.cpTitle = new UCaption({ ui:this.ui, owner:this, caption:o.caption });

        this.events = {
            onClick : []
        }

        this._events.onMouseDown = (e) => {
            for (const f of this.events.onClick) f(e);            
        }

        // install custom handlers given in parameters
        if ('onClick' in o) this.addEvent('onClick', o.onClick);
    }
}

class UPanel extends UIBaseElement {
    constructor(o) {
        o.tagName = 'ui-panel';
        super(o);                        
    }
}

class UWindow extends UIBaseElement {
    constructor(o) {
        o.tagName    = 'ui-window';
        o.className  = o.modal ? 'modal' : null;
        super(o);

        this.frame   = AE.newElem(this.elem, 'div', 'frame');
        this.head    = AE.newElem(this.frame, 'div', 'head');
        this.body    = AE.newElem(this.frame, 'div', 'body');
        this.cpTitle = new UCaption({ ui:this.ui, owner:this.head, caption:o.caption });
        this.btClose = new UButton({ ui:this.ui, owner:this.head, caption:'🗙', position:'auto', className:'close-window', onClick:_ => this.close() });
    }

    close() {        
        this.elem.style.display = 'none';
    }
}

class UCustomList extends UIBaseElement {
    constructor(o) {
        o.tagName = 'ui-customlist';        
        super(o);        

        this.items  = [];        
        this.events = {
            onSelectItem : []
        }

        AE.sealProp(this, 'items');
        AE.sealProp(this, 'events');

        this._events.onMouseDown = (e) => {
            const r = this.items.find(i => i.contains(e.target));
            if (r) {
                e.index = [...r.parentElement.children].indexOf(r);         // get the element index for convenience and return it to the event handler
                for (const f of this.events.onSelectItem) f(e);
            }
        }
    }

    add(elem) {
        const wrapper = AE.newElem(this.elem, 'div');                        
        if (elem.tagName == 'IMG') {
            const img = AE.newElem(wrapper, 'img');
            img.src = elem.src;
        }

        this.items.push(wrapper);
        return wrapper;
    }    
}

class UDialog extends UWindow {
    constructor(o) {
        o.tagName    = 'ui-window';        
        super(o);
        this.elem.className  = 'modal dialog';

        const msg   = new UCaption({ owner:this, position:'auto', align:'even center' });
        if ('message' in o) msg.caption = o.message;

        const pn    = new UPanel({ owner:this, position:'auto', align:'even center' });        
        const btNo  = new UButton({ owner:pn, caption:'No', position:'auto' });    
        const btYes = new UButton({ owner:pn, caption:'Yes', position:'auto' });

        this.buttons = {
            btNo, btYes
        }
    }
}

const Confirmation = async(o) => {
    return new Promise(resolve => {
        const obj = Object.assign({ owner:('owner' in o) ? o.owner : Engine.ui, center:true }, o);
        const dlg = new UDialog(obj);
        dlg.buttons.btNo.addEvent('onClick',  e => { dlg.close(); resolve(false); });
        dlg.buttons.btYes.addEvent('onClick', e => { dlg.close(); resolve(true); });
    })
}

export { UI, UWindow, UPanel, UButton, UCaption, UCustomList, UDialog, Confirmation }