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

AE.require(import.meta.url.split('/').slice(0, -1).join('/') + '/css/html-ui.css');

const TagNames = {
    'panel'        : 'tge-panel',
    'button'       : 'button',
    'checkbox'     : 'tge-checkbox',
    'keyvaluelist' : 'tge-kvl',
}

class BaseUIComponent {
    constructor(owner, o) {
        this.owner    = owner;
        this.children = {};

        o.tagName     = ('tagName' in o) ? o.tagName : TagNames[o.type];
        
        const e = AE.newElem(owner.elem, o.tagName, (o.className || ''));
        if ('name' in o) e.setAttribute('name', o.name);		
        if ('id' in o)   e.setAttribute('id', o.id);        
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
        if ('name' in o) this.children[o.name] = o;
        
        if (o.type == 'panel')    return new UPanel(this, o);
        if (o.type == 'button')   return new UButton(this, o);
        if (o.type == 'checkbox') return new UCheckbox(this, o);        
        if (o.type == 'keyvaluelist') return new UKeyValueList(this, o);        
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
}

class HTMLUserInterface extends BaseUIComponent {
    constructor(o) {
        super({ elem:Engine._rootElem }, { tagName:'tge-ui' });

        this.parent            = Engine._rootElem;        
        this.autoReplaceParent = true;                                                  // watch for Engine._rootElem changes to automatically replace the UI root element

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

class UKeyValueList extends BaseUIComponent {
    constructor(owner, o) {
        super(owner, o);

        this.client = AE.newElem(this.elem, 'div', 'client');
        this.head   = AE.newElem(this.client, 'tge-head');
        this.title  = AE.newElem(this.head, 'div');
        this.body   = AE.newElem(this.client, 'tge-body');        
        this.frame  = AE.newElem(this.body, 'table');        

        this.caption = o.caption || '';
    }

    set caption(value) {
        AE.setText(this.title, value);
    }

    addItem(o) {
        const row = AE.newElem(this.frame, 'tr');
        const k   = AE.newElem(row, 'td');
        const v   = AE.newElem(row, 'td');
        k.textContent = o.key;
        v.textContent = o.value;
    }
}

const UI = new HTMLUserInterface();

export { UI, UPanel, UButton, UCheckbox, UKeyValueList }