/**
 * 
 * TGE
 * HTML UI components
 * Written by Ridge Batty (c) 2021
 * 
 * Usage:
 * 
 * UI.add({ type:'button', name:'accept-rules', caption:'OK' });
 * 
 */
import { Engine } from './engine.js';
import * as MultiCast from './multicast.js';
import { Vector2 } from './types.js';
import { Mixin } from './utils.js';

const Vec2 = Vector2;

AE.require(import.meta.url.split('/').slice(0, -1).join('/') + '/css/html-ui.css');

let Constructors = {};

class UIEventManager {
    constructor() {                
        this.events   = [];
        this.isActive = true;
    }

    addDelegate(params) {
        if (!AE.isInstanceOf(params.instigator, 'BaseUIComponent')) throw 'params.instigator must be a descendant of BaseUIComponent.';
        if (!AE.isInstanceOf(params.eventTarget, 'HTMLElement')) throw 'params.eventTarget (HTMLElement) must be defined.';
        if (!AE.isFunction(params.delegate)) throw 'params.delegate (Function) must be defined.';
        if (!AE.isFunction(params.handler)) throw 'params.handler (Function) must be defined.';

        const p = Object.assign({}, params);                                  // make copy of params to prevent changes to the object     
        p.eventTarget.addEventListener(p.hardwareEvent, (e) => {
            if (this.isActive) p.delegate(e, p);                                            // if EventManager has events disabled, do not call the delegate
        });

        const eventDescriptor = { isActive:true, params:p };
        this.events.push(eventDescriptor);
    }

    fireDelegate(params, data) {        
        const eventDescriptor = this.events.find(e => e.params === params);
        if (eventDescriptor && eventDescriptor.isActive) {
            const evtInfo = Object.assign({ instigator:params.instigator, eventName:params.name }, data);
            eventDescriptor.params.handler(evtInfo);
        }
    }
}
class BaseUIComponent {
    constructor(owner, o) {
        this.owner    = owner;
        this.children = {};

        o.tagName     = ('tagName' in o) ? o.tagName : Constructors[o.type].tag;
        
        const         e = AE.newElem(('body' in owner) ? owner.body : owner.elem, o.tagName, (o.className || ''));
        if ('name' in o)  e.setAttribute('name', o.name);		
        if ('id' in o)    e.setAttribute('id', o.id);        
        if ('style in o') AE.style(e, o.style);
                
        this.elem     = e;        
    }
    /**
     * 
     * @param {object} o 
     * @param {string} o.type panel|button|checkbox
     * @param {string=} o.name user defined name
     * @param {string=} o.className CSS class selector
     * @param {string=} o.id user defined HTMLElement id attribute
     * @returns {BaseUIComponent}
     */
    add(o) {
        const newElem = new Constructors[o.type].className(this, o);
        if ('name' in o) this.children[o.name] = newElem;        
        return newElem;
    }

    addEvent(name, handler, eventTarget) {                
        const trg = eventTarget ? eventTarget : this.elem;
        MultiCast.addEvent(name,(e, data) => {
            if (e.target === trg) handler(e, data);
        }, { instigator:this });
    }
    
    set isEnabled(b) {
        this.elem.style.pointerEvents = b === true ? 'auto' : 'none';
    }

    get isEnabled() {
        return getComputedStyle(this.elem).pointerEvents === 'auto' ? true : false;
    }

    findByName(name) {
        function find(node, name) {
            if ('name' in node && node.name == name) return node;
            for (const n of Object.value(node.children)) find(n, name);
        }
        return find(this, name);            
    }
}

class HTMLUserInterface extends BaseUIComponent {
    constructor(o) {
        const root = document.createElement('tge-ui-root');
        const s = root.attachShadow({ mode: "closed" });

        super({ elem:s }, { tagName:'tge-ui' });

        this.parent = Engine._rootElem;
        
        this.parent.appendChild(root);


        this.autoReplaceParent = true;                                                  // watch for Engine._rootElem changes to automatically replace the UI root element?

        // check if Engine.rootElem is mutated
        const config    = { childList: true };
        const onMutate  = function(UIC, mutationsList) {
            if (!UIC.autoReplaceParent) return;
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList' && Engine._rootElem !== UIC.parent) {                    
                    UIC.parent = Engine._rootElem;
                    UIC.parent.appendChild(UIC.elem);
                }                
            }
        }
        const observer = new MutationObserver((e) => onMutate(this, e));
        observer.observe(Engine._rootElem, config);

        // custom stylesheet
        /*
        const linkElem = document.createElement('link');
        linkElem.setAttribute('rel', 'stylesheet');
        linkElem.setAttribute('href', 'style.css');        
        */
    }

    setParentElem(elem) {
        this.parent = elem;                
        this.parent.appendChild(this.elem);
    }
}

class UPanel extends BaseUIComponent {
    constructor(owner, o) {
        super(owner, o);             
    }
}	

class UButton extends BaseUIComponent {
    constructor(owner, o) {
        super(owner, o);
        this.caption = o.caption || '';        
    }

    set caption(value) {
        AE.setText(this.elem, value);
    }
}	

class UCheckbox extends BaseUIComponent {
    constructor(owner, o) {
        super(owner, o);

        this.checkbox = AE.newElem(this.elem, 'input');
        this.label    = AE.newElem(this.elem, 'label');
        this.checkbox.setAttribute('type', 'checkbox');

        if ('checked' in o) this.checked = o.checked;

        this.caption = o.caption || '';
    }
    
    addEvent(name, handler, eventTarget) {        
        if (name == 'change') super.addEvent(name, handler, this.checkbox);
    }

    set checked(b) {
        if (b !== false && b !== true) return;
        this.checkbox.checked = b;
    }

    get checked() {        
        return this.checkbox.checked;
    }

    set caption(value) {
        AE.setText(this.label, value);
    }
}	

class UCaption {
    constructor() {
        this._caption = '';
    }

    get caption() {
        return this._caption;
    }

    set caption(value) {
        this._caption = value;
    }
}

class UListbox extends BaseUIComponent {
    constructor(owner, o) {
        super(owner, o);
        Mixin(this, UCaption);

        this.multiSelect = false;
        this.frame       = AE.newElem(this.elem, 'div');  
        this._items      = [];
    }

    addItem(o) {
        const row = AE.newElem(this.frame, 'div');
        row.textContent   = o.text;
        row.dataset.value = o.value;

        const itemInfo = Object.assign({ row, selected:false }, o);

        this._items.push(itemInfo);
    }

    delete(index) {
        const rows = this._items;

        if (rows[index]) {
            rows[index].row.remove();
            rows[index].splice(i, 1);
        }        
    }

    clear() {        
        this.frame.replaceChildren();
        this._items.length = 0;
    }

    deselect(except) {
        this._items.forEach(e => { if (e.row !== except) { e.row.classList.remove('selected'); e.selected = false; } });
    }
    
    addEvent(name, handler) {            
        const onClick = (e, params) => {                
            for (const item of this._items) {
                if (item.row === e.target) {
                    item.selected = !item.selected;
                    item.row.classList.toggle('selected');
                    if (this.multiSelect == false) this.deselect(item.row);
                    eventManager.fireDelegate(params, { item });
                }
            }
        }
        if (name == 'select') eventManager.addDelegate({ name:'select', hardwareEvent:'click', delegate:onClick, eventTarget:this.frame, instigator:this, handler });        
    }
}	

class UKeyValueList extends BaseUIComponent {
    constructor(owner, o) {
        super(owner, o);

        this.frame  = AE.newElem(this.elem, 'table');  
        this._rows  = [];           
    }

    addItem(o) {
        const row   = AE.newElem(this.frame, 'tr');
        const k     = AE.newElem(row, 'td');
        const v     = AE.newElem(row, 'td');
        k.textContent = o.key;
        v.textContent = o.value;

        this._rows.push({ row, o });
    }

    deleteKey(key) {
        const rows = this._rows;

        for (let i = rows.length; i--;) {
            if (rows[i].o.key == key) {
                rows[i].row.remove();
                rows[i].splice(i, 1);
            }
        }
    }

    clear() {        
        const rows = this._rows;
        for (let i = rows.length; i--;) rows[i].row.remove();
        this._rows.length = 0;
    }
}

class UWindow extends BaseUIComponent {
    constructor(owner, o) {
        super(owner, o);

        this.client = AE.newElem(this.elem, 'div', 'client');
        this.head   = AE.newElem(this.client, 'tge-head');
        this.title  = AE.newElem(this.head, 'div');
        this.body   = AE.newElem(this.client, 'tge-body');            

        this.caption = o.caption || '';

        this._position = Vec2.Zero();
        this._size     = new Vec2(160, 100);

        this.position  = ('position' in o) ? o.position : this._position;
        this.size      = ('size' in o) ? o.size : this._size;        
    }

    set position(v) {
        this._position.set(v);
        AE.style(this.elem, `left:${v.x}px; top:${v.y}px`);
    }

    set size(v) {
        this._size.set(v);
        AE.style(this.elem, `width:${v.x}px; height:${v.y}px`);
    }

    get position() {
        return this._position;
    }

    set caption(value) {
        AE.setText(this.title, value);
    }
}

Constructors = {
    'panel'        : { tag: 'tge-panel', className:UPanel },
    'button'       : { tag: 'button', className:UButton },
    'checkbox'     : { tag: 'tge-checkbox', className:UCheckbox },
    'keyvaluelist' : { tag: 'tge-kvl', className:UKeyValueList },
    'window'       : { tag: 'tge-win', className:UWindow },
    'listbox'      : { tag: 'tge-lb', className:UListbox }
}

const UI           = new HTMLUserInterface();
const eventManager = new UIEventManager();

export { UI, UPanel, UButton, UCheckbox, UKeyValueList, UListbox, UWindow }