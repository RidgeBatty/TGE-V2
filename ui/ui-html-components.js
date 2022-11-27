/**
 * 
 *  This file contains the actual UI components
 * 
 */

import { Engine } from "../engine.js";
import { Enum } from "../enum.js";
import { UBaseElement } from "./ui-baseElement.js";
import { addElem } from "./ui-html.js";
import { remove } from "../utils.js";

class UCaption extends UBaseElement {
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

class UButton extends UBaseElement {
    constructor(o) {
        o.tagName = 'ui-button';        
        super(o);                
        this.cpTitle = new UCaption({ owner:this, caption:o.caption });

        this.events.create('click');

        const mousedown = (e) => {            
            if (o.behavior && o.behavior == 'close-window') this.getOwnerWindow().close();
            this.events.fire('click', Object.assign(e, { name:'click' }));
        }

        this.events.add('mousedown', mousedown); 
    }
}

class UEdit extends UBaseElement {
    constructor(o) {
        o.tagName   = 'ui-edit';
        o.className = ('className' in o) ? o. className : 'panel-frame';
        super(o);           

        this.title = new UCaption({ owner:this, caption:o.caption });
        this.input = addElem({ parent:this.elem, type:'input' });

        if ('edit' in o) this.input.value = o.edit;
    }

    get value() {
        return this.input.value;
    }

    set value(v) {
        this.input.value = v;
    }
}

class UPanel extends UBaseElement {
    constructor(o) {
        o.tagName   = 'ui-panel';
        o.className = ('className' in o) ? o. className : 'panel-frame';
        super(o);                        
    }
}

class UWindow extends UBaseElement {
    constructor(o) {
        o.tagName    = 'ui-window';
        o.className  = o.modal ? 'modal' : null;
        super(o);

        this.events.create('show close');

        this.frame   = AE.newElem(this.elem, 'div', 'frame');
        this.head    = AE.newElem(this.frame, 'div', 'head');
        this.body    = AE.newElem(this.frame, 'div', 'body');
        this.cpTitle = new UCaption({ parent:this.head, owner:this, caption:o.caption });
        this.btClose = new UButton({ parent:this.head, owner:this, caption:'🗙', position:'auto', className:'close-window', behavior:'close-window' });

        this.ui.active = this;        
    }

    show() {
        this.events.fire('show');
        this.ui.active = this;
        this.elem.style.display = '';
    }

    close() {        
        this.ui.active = null;
        this.elem.style.display = 'none';
        this.events.fire('close');
    }
}

class UCustomList extends UBaseElement {
    /**
     * CustomList component has 3 different types: row, column or grid. Every type has a ".head" and ".body" element.
     * @param {object} o      
     * @param {string} o.tagName
     */
    constructor(o) {
        if (!('tagName' in o)) o.tagName = 'ui-customlist';        
        super(o);        
        
        this.events.create('selectitem clickitem');
        this._listType        = new Enum('row column grid');
        this.items            = [];        
        this.selection        = [];
        this.maxSelectedItems = 1;                                  // set to zero if you don't want selection behavior

        if ('type' in o) this._setListType(o.type, o.tagNames); else throw 'Type must be specified';
        
        AE.sealProp(this, 'items');
        AE.sealProp(this, 'events');

        const mousedown = e => {            
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
                        this.events.fire('selectitem', e);
                    } 
                }
                
                this.events.fire('clickitem', e);
                return e;
            }
        }
        this.events.add('mousedown', mousedown);
    }

    get listType() {
        return this._listType.string;
    }
    
    /**
     * Should be set only by the constructor!
     * @param {string} v List type string: "row", "column" or "grid"
     */
    _setListType(v, tagNames) {
        this._listType.string = v;

        this.frame = addElem({ parent:this.elem, type:tagNames ? tagNames[0] : 'div', class:'panel-frame' });

        this.head = addElem({ parent:this.frame, type:tagNames ? tagNames[1] : 'div' });
        this.head.className = 'head ' + this._listType.string;

        this.body = addElem({ parent:this.frame, type:tagNames ? tagNames[2] : 'div' });
        this.body.className = 'body ' + this._listType.string;        
    }

    get selectedItem() {
        return this.selection.length > 0 ? this.selection[this.selection.length - 1] : null;
    }

    add(o) {
        if (!Array.isArray(o)) o = [o];                                         // force array
        const type   = this._listType.string;
        const result = [];            
            
        for (const e of o) {
            const wrapper  = addElem({ parent:this.body });
            const isImages = (typeof e == 'object') && ('src' in e);

            if (isImages) {                                                     // copies image from existing <img> tags (or Image instances) or from anonymous object which has "src" property                
                const img = addElem({ parent:wrapper, type:'img' });
                img.src = e.src;
            } else {                                                            // create text caption
                const div = addElem({ parent:wrapper, type:'div' });
                div.textContent = e.caption;
            }

            const item = { listElem: wrapper };
            if (typeof e == 'object' && 'data' in e) item.data = e.data;

            this.items.push(item);
            result.push(wrapper);
        }                    
        
        return result;
    } 

    /**
     * Removes element whose "data" matches with given parameter.
     * Element is completely removed from the CustomList component, including its "items" and "selection" arrays.
     * @param {*} data 
     */
    remove(data) {
        remove(this.items, (e, i) => { if (e.data == data) { this.items[i].listElem.remove(); return true; } });
        remove(this.selection, e =>  e.data == data);
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
        o.tagName   = 'ui-filelist';
        o.type      = 'row';
        o.tagNames  = ['table', 'thead', 'tbody'];
        super(o);             
    }

    add(o) {
        const row        = addElem({ parent:this.body, type:'tr' });
        const filename   = addElem({ parent:row, text:o.name, type:'td' });
        const filesize   = addElem({ parent:row, text:o.size, type:'td' });
        const fileiconfr = addElem({ parent:row, type:'td' });
        const fileicon   = addElem({ parent:fileiconfr, type:'img' });        
        fileicon.src = o.icon;

        this.items.push({ listElem:row, data: o.data });
        return row;
    }  
    
    setHeaderValues(list) {
        this.head.replaceChildren();
        const tr = addElem({ parent:this.head, type:'tr' });
        for (const item of list) {            
            const th = addElem({ parent:tr, type:'th' });
            th.textContent = item;
        }
    }

    set headers(list) {
        this.setHeaderValues(list);
    }
}

class UFileList extends UCustomFileList {
    constructor(o) {
        super(o);             
  
        const mousedown = async(e) => {
            if (e.data == null) return;
            
            if (e.data.kind == 'directory') await this.changeDirectory(e.data.name);
            if (e.data.kind == 'file') {
                
            }
        }
        this.events.add('mousedown', mousedown);

        if (!('fileSystem' in o)) console.warn('UFileList component requires a reference to FileSystem interface to access files');
        this.fileSystem = o.fileSystem;
        this.filter     = 'filter' in o ? o.filter : '';
        this.onError    = null;
    }

    /**
     * 
     * @param {string} dir 
     * @returns 
     */
    async changeDirectory(dir) {
        console.log('Change directory:', dir);                
        const result = await this.fileSystem.changeDirectory({ name:dir });
        if ('info' in result && result.info == 'RESORT-CWD') {
            console.warn('Requested directory was not found, resorting to server CWD');
        }
        this.currentDir = result.currentDir;
        this.update(this.currentDir);
        return this.currentDir;
    }

    update() {
        this.clear();
        this.fileSystem.listDir(this.filter).then(async list => {
            const path = Engine.url + 'assets/icons/';
            this.add({ name:'..', size:'', icon:path + 'open-folder-outline-icon.png', data:{ name:'..', kind:'directory' } });
            
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
    
    async init(cwd, onError) {
        this.onError = onError;
        return await (cwd != null ? this.changeDirectory(cwd) : this.changeDirectory('.'));  
    }    
}

class UDialog extends UWindow {
    constructor(o) {
        o.tagName    = 'ui-window';        
        super(o);
        this.elem.className  = 'modal dialog';

        const msg    = new UCaption({ owner:this, position:'auto', align:'even center' });
        if ('message' in o) msg.caption = o.message;

        const pn     = new UPanel({ owner:this, position:'auto', className:'', align:'center bottom', height:'6em' });      
        
        this.buttons = {};
        if ('buttons' in o) {
            for (const bt of o.buttons) {                
                this.buttons[bt] = new UButton({ owner:pn, caption:bt, position:'auto' });        
            }            
        } else {
            this.buttons.btNo  = new UButton({ owner:pn, caption:'No', position:'auto' });    
            this.buttons.btYes = new UButton({ owner:pn, caption:'Yes', position:'auto' });            
        }
    }
}

const Confirmation = async(o) => {
    return new Promise(resolve => {
        const obj = Object.assign({ owner:('owner' in o) ? o.owner : Engine.ui, center:true }, o);
        const dlg = new UDialog(obj);

        for (const [name, button] of Object.entries(dlg.buttons)) {
            button.events.add('click', e => { dlg.close(); resolve(name); });
        }
    })
}

export { UBaseElement, UWindow, UPanel, UButton, UEdit, UCaption, UCustomList, UCustomFileList, UFileList, UDialog, Confirmation }