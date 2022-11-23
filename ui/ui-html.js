import { Engine } from "../engine.js";
import { Vector2 as Vec2, V2 } from "../types.js";
import { Enum } from "../enum.js";

const addElem = (o) => {
    const el = document.createElement('type' in o ? o.type : 'div');
    if ('text' in o)  el.textContent = o.text;
    if ('class' in o) el.className = o.class;
    if ('id' in o)    el.id = o.id;
    const parent = ('parent' in o) ? ((typeof o.parent == 'string') ? document.getElementById(o.parent) : o.parent) : document.body;
    parent.appendChild(el);
    return el;
}

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
        
        const mousedown = (e) => {
            if (this.flags.disablePointerEvents) return;                        
            const f = this.components.filter(c => c.elem.contains(e.target));          
            
            this.active = null;
            for (const c of f) {
                if (c instanceof UWindow && c.enabled) {
                    this.active = c;
                    this.pointer.downComponentPos = c.position;                    
                }                
                if (c.enabled && ('events' in c) && c._events.mousedown) c._events.mousedown(e);                
            }            
        }

        const mousemove = (e) => {
            if (this.flags.disablePointerEvents) return;                        

            if (e.dragging && this.active != null) {                // if we have an active UWindow component and we're dragging with mouse, move the window!                
                this.moveWindow(this.active, e.delta);
            }
            const f = this.components.filter(c => c.elem.contains(e.target));                        
            for (const c of f) if (c.enabled && ('events' in c) && c._events.mousemove) c._events.mousemove(e);
        }

        engine.events.register(this, { mousedown, mousemove });
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
        this.name      = ('name' in o) ? o.name : '';        

        this._position = Vec2.Zero(); 
        this.position  = ('position' in o) ? o.position : this._position;
        this._size     = ('size' in o) ? o.size : Vec2.Zero();

        this._align    = '';
        this.align     = ('align' in o) ? o.align : '';
        
        this.ui.components.push(this);
        if (this.#owner instanceof UIBaseElement) this.#owner.children.push(this);
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
    
    findByName(name, deep = true) {
        if (this.name == name) return this;
        for (const c of this.children) return c.findByName(name, deep);
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
            click : []
        }

        this._events.mousedown = (e) => {
            for (const f of this.events.click) f(e);            
        }

        // install custom handlers given in parameters
        if ('click' in o) this.addEvent('click', o.click);
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
        this.btClose = new UButton({ ui:this.ui, owner:this.head, caption:'🗙', position:'auto', className:'close-window', click:_ => this.close() });
    }

    close() {        
        this.elem.style.display = 'none';
    }
}

class UCustomList extends UIBaseElement {
    /**
     * 
     * @param {object} o      
     * @param {string} o.tagName
     */
    constructor(o) {
        if (!('tagName' in o)) o.tagName = 'ui-customlist';        
        super(o);        

        this.head   = AE.newElem(this.elem, 'div', 'head');
        this.body   = AE.newElem(this.elem, 'div', 'body');
        this.events = {
            selectitem : [],
            clickitem  : [],
        }
        this._listType        = new Enum('row column grid');
        this.items            = [];        
        this.selection        = [];
        this.maxSelectedItems = 1;                                  // set to zero if you don't want selection behavior

        if ('type' in o) {
            this._listType.string = o.type;
            this.body.className   = 'body ' + this._listType.string;            
        }
        
        AE.sealProp(this, 'items');
        AE.sealProp(this, 'events');

        this._events.mousedown = e => {            
            const r = this.items.find(i => i.listElem.contains(e.target));
            if (r) {
                let found;
                if (this.maxSelectedItems > 0) {
                    found = this.selection.find(i => i == r);
                    if (found) {
                        AE.removeClass(found.listElem, 'selected');
                        this.selection = this.selection.filter(i => i != found);
                    }
                }

                const listElem = r.listElem;
                e.index    = [...listElem.parentElement.children].indexOf(listElem);         // get the element index for convenience and return it to the event handler                
                e.name     = 'selectitem';
                e.listElem = listElem.parentElement.children[e.index];
                e.data     = 'data' in r ? r.data : null;

                // change listElem attribute to selected if it's not already                
                if (this.maxSelectedItems > 0) {
                    if (found == null && this.selection.length <= this.maxSelectedItems) {  
                        AE.addClass(listElem, 'selected'); 

                        if (this.selection.length == this.maxSelectedItems) {                       // if we're selecting 1 item too much, we need to remove the previous selection first.
                            const lastSelected = this.selection.pop();                              // remove the item which was selected earlier!
                            AE.removeClass(lastSelected.listElem, 'selected');                        
                        }

                        this.selection.push(r);
                        for (const f of this.events.selectitem) f(e);
                    } 
                }
                
                for (const f of this.events.clickitem) f(e);
                return e;
            }
        }
    }

    get selectedItem() {
        return this.selection.length > 0 ? this.selection[this.selection.length - 1] : null;
    }

    get listType() {
        return this._listType.string;
    }

    set listType(v) {
        this._listType.string = v;
        this.body.className = 'body ' + this._listType.string;
    }

    addHeader() {
        for (let i of arguments) {
            addElem({ parent:this.head, text:i });
        }
    }

    add(elem, data) {
        const wrapper = AE.newElem(this.body, 'div');                        
        if (elem.tagName == 'IMG') {
            const img = AE.newElem(wrapper, 'img');
            img.src = elem.src;
        }

        this.items.push({ listElem: wrapper, data });
        return wrapper;
    }  
    
    clear() {
        this.clearSelection();
        this.items.length = 0;        
        this.body.replaceChildren();        
    }

    clearSelection() {
        this.selection.length = 0;
        this.items.forEach(i => AE.removeClass(i.listElem, 'selected'));
    }
}

class UCustomFileList extends UCustomList {
    constructor(o) {
        o.tagName = 'ui-filelist';
        super(o);        
    }

    add(o) {
        const wrapper  = addElem({ parent:this.body });
        const filename = addElem({ parent:wrapper, text:o.name });
        const filesize = addElem({ parent:wrapper, text:o.size });
        const fileicon = addElem({ parent:wrapper, type:'img' });
        fileicon.src = o.icon;

        this.items.push({ listElem: wrapper, data: o.data });
        return wrapper;
    }    
}

class UFileList extends UCustomFileList {
    constructor(o) {
        super(o);        
        
        const originalClickEvent = this._events.mousedown;

        this._events.mousedown = (e) => {
            const result = originalClickEvent(e);
            if (result.data.kind == 'directory') {                            
                const parentDir       = this.currentDirHandle;
                this.currentDirHandle = result.data;
                this.update(parentDir);                
            }            
            if (result.data.kind == 'file') {
                
            }
        }
    }

    update(parentDir) {
        this.clear();
        this.fileSystem.getDirectoryListing().then(async list => {
            const path = Engine.url + 'assets/icons/';
            this.add({ name:'..', size:'', icon:path + 'open-folder-outline-icon.png', data:parentDir });
            
            for (const item of list) {        
                if (item.kind == 'directory') this.add({ name:item.name, size:'', icon:path + 'open-folder-outline-icon.png', data:item });
                if (item.kind == 'file') {
                    const file = await this.fileSystem.getFileInfo(item.name); 
                    const size = file.size > 1024 ? (file.size / 1024).toFixed(1) + 'KB' : file.size;
                    this.add({ name:item.name, size, icon:path + 'photo-editor-icon.png', data:item });
                }
            }        
        });
    }
    
    async init(fileSystemAccess) {
        this.fileSystem  = fileSystemAccess;
        this.currentDir  = await this.fileSystem.getWorkingDirectory();
        this.update(this.currentDir);
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
        dlg.buttons.btNo.addEvent('click',  e => { dlg.close(); resolve(false); });
        dlg.buttons.btYes.addEvent('click', e => { dlg.close(); resolve(true); });
    })
}

export { UI, UWindow, UPanel, UButton, UCaption, UCustomList, UCustomFileList, UFileList, UDialog, Confirmation }