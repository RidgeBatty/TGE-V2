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
    /**
     * 
     * @param {object} o Params object
     * @param {string} o.className
     * @param {string} o.caption
     * @param {function=} o.onClick click event handler 
     */
    constructor(o) {
        o.tagName = 'ui-button';        
        super(o);                
        this.cpTitle = new UCaption({ owner:this, caption:o.caption });

        this.events.create('click');

        const mouseup = (e) => {            
            if (o.behavior && o.behavior == 'close-window') this.getOwnerWindow().close();
            this.events.fire('click', Object.assign(e, { name:'click', button:this }));
        }
        this.events.add('mouseup', mouseup); 
        if ('onClick' in o) this.events.add('click', o.onClick);
    }

    get caption() {
        return this.cpTitle.caption;
    }

    set caption(c) {
        this.cpTitle.caption = c;
    }
}

class UInputElement extends UBaseElement {
    constructor(o) {
        o.className = ('className' in o) ? o. className : 'panel-frame';
        super(o);           

        this.title = new UCaption({ owner:this, caption:o.caption });
        this.input = addElem({ parent:this.elem, type:'input' });

        this.events.create('change click');
        const mousedown = e => {
            const target = e.target;    
            const o      = { value:target.value };
            if ('checked' in target) o.checked = target.checked;
            this.events.fire('change', o);
        }        
        this.elem.addEventListener('change', mousedown);    
        const mouseup = (e) => {                        
            this.events.fire('click', Object.assign(e, { name:'click', element:this }));
        }
        this.events.add('mouseup', mouseup); 

        if ('onChange' in o) this.events.add('change', o.onChange);
        if ('onClick' in o) this.events.add('click', o.onClick);

        if ('value' in o) this.value = o.value;
    }

    get value() {
        return this.input.value;
    }

    set value(v) {
        this.input.value = v;
    }
}

/**
 * Caption and Input "text"
 */
class UEdit extends UInputElement {    
    /**
     * 
     * @param {object} o Params object
     * @param {string} o.className
     * @param {string} o.caption
     * @param {function=} o.onChange 
     */
    constructor(o) {        
        o.tagName   = 'ui-edit';
        super(o);                   
        this.input.setAttribute('type', 'text');
    }
}

class USwitch extends UInputElement {
    constructor(o) {
        o.tagName   = 'ui-switch';
        super(o);           
        this.input.setAttribute('type', 'checkbox');
        if ('checked' in o)  this.value = o.checked;
    }

    get value() {
        return this.input.checked;
    }

    set value(v) {
        this.input.checked = v === true ? true : false;
    }
}

class USlider extends UInputElement {
    constructor(o) {
        o.tagName   = 'ui-slider';
        super(o);           
        this.input.setAttribute('type', 'range');
        if ('min' in o) this.input.setAttribute('min', o.min);
        if ('max' in o) this.input.setAttribute('max', o.max);
        if ('step' in o) this.input.setAttribute('step', o.step);
    }
}

class UColorPicker extends UInputElement {
    constructor(o) {
        o.tagName            = 'ui-colorpicker'; 
        super(o);           
        this.objectType      = 'UColorPicker';
        
        this.input.setAttribute('type', 'color');        
    }
}

class UPanel extends UBaseElement {
    constructor(o) {
        o.tagName   = ('tagName' in o) ? o.tagName : 'ui-panel';
        o.className = ('className' in o) ? o.className : 'panel-frame';
        super(o);                        

        this._orientation = '';
    }

    set orientation(v) {
        if (v == 'column' || v == 'row' || v == '') {
            this._orientation = v;
            this.elem.classList.add(v);        
        }
    }

    get orientation() {
        if (v == 'column') return this._orientation;
    }
}

class URadioButton extends UInputElement {
    constructor(o) {
        o.tagName            = 'ui-radiobutton'; 
        super(o);           
        this.objectType      = 'URadioButton';
        
        this.input.setAttribute('type', 'radio');
        if ('group' in o) this.input.setAttribute('name', o.group);
    }
}

class URadioGroup extends UPanel {
    #uid = 0;
    /**
     * 
     * @param {object} o parameters
     * @param {[string]} o.options Optional. List of option names
     * @param {string=} o.group Optional. Name of the group for this radiogroup     
     **/
    constructor(o) {
        o.tagName   = 'ui-radiogroup';
        o.className = ('className' in o) ? o.className : 'panel-frame';
        super(o);
        this.objectType = 'URadioGroup';

        this.options = [];
        this.group   = o.group || 'ui-radiogroup-' + this.#uid++;        

        if ('options' in o) this.addOptions(o.options);
        if ('selectedIndex' in o && this.options[o.selectedIndex]) this.options[o.selectedIndex].input.checked = true;
    }

    get selected() { return this.options.find(e => e.input.checked); }
    set selected(nameOrIndex) { return this.options.forEach((e, i) => (e.input.name == nameOrIndex || i == nameOrIndex)); }

    addOptions(list) {
        for (const o of list) {
            this.options.push(new URadioButton({ owner:this, name:o, caption:o, group:this.group, className:'radio-left', align:'left' }));
        }
    }
}

class UMenu extends UBaseElement {
    constructor(o) {
        o.tagName   = 'ui-menu';
        o.className = ('className' in o) ? o. className : '';        
        super(o);

        this.events.create('show close selectitem');

        this.frame   = AE.newElem(this.elem, 'div', 'frame');
        this.head    = AE.newElem(this.frame, 'div', 'head');
        this.body    = AE.newElem(this.frame, 'div', 'body');
        this.items   = [];
        this.objectType = 'UMenu';

        if ('items' in o) this.addItems(o.items);

        const mouseup = e => {
            const target = e.event.target;
            if (target.tagName == 'UI-MENUITEM') {                
                const selected = { target, caption:target.children[1].textContent, checked:target.children[0].textContent == '✓' }
                this.events.fire('selectitem', selected);
                this.onSelectItem(selected)
            }
            this.close();
        }
        this.events.add('mouseup', mouseup);

        if ('createHidden' in o && o.createHidden == true) return this.close();
    }

    onSelectItem(selected) {
        // override me in descendant class!
    }

    popup(v) {
        this.position = v;
        this.show();
    }

    show() {
        this.events.fire('show');
        this.ui.active = this;
        this.elem.style.display = '';
    }

    close() {        
        if (this.ui.active == this) this.ui.active = null;      // if this menu is currently active, set UI activeElement to nothing        
        this.elem.style.display = 'none';
        this.events.fire('close');
    }

    /**
     * Adds a list of items in the menu. If the string contains only '-', a divider will be added. If the string contains '|', the string will be split to menuitem and a shortcut.
     * @param {[string]} items 
     */
    addItems(items) {        
        for (const i of items) {
            const menu = { parent:this.body };
            let e;
            if (i == '-') {
                Object.assign(menu, { type:'ui-menudivider' });                    
                e = addElem(menu);
            } else {
                Object.assign(menu, { type:'ui-menuitem' });
                e = addElem(menu);

                const text = i.split('|');

                addElem({ parent:e });                                                          // reserved for check mark
                addElem({ parent:e, text:text[0] });
                if (text.length == 2) {
                    addElem({ parent:e, text:text[1] });
                }
            }
            
            this.items.push(e);
        }
    }

    findItemByCaption(caption) {
        return this.items.find(e => { if (e.tagName == 'UI-MENUITEM' && e.children[1].textContent == caption) return true });
    }

    clear() {
        for (const i of this.items) i.remove();
        this.items.length = 0;
    }
    
    /**
     * Toggles the menuitem's checked state. Parameter "item" can be either a reference to relevant <UI-MENUITEM> element or the caption of the menuitem.
     * @param {HTMLElement|string} item 
     * @returns {boolean|null}
     */
    toggleChecked(item) {        
        if (typeof item == 'string') {
            var item = this.findItemByCaption(item);
            if (item == null) return;
        }
        
        if (item.children[0].textContent == '✓') item.children[0].textContent = '';
            else item.children[0].textContent = '✓';
        return item.children[0].textContent == '✓';
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
        this.objectType = 'UWindow';

        if ('createHidden' in o && o.createHidden == true) return this.close();

        this.ui.active = this;        
    }

    show() {
        this.events.fire('show');
        this.ui.active = this;
        this.elem.style.display = '';        
        this.children.forEach(e => { if (e.onShow) e.onShow() });
    }

    close() {        
        this.elem.style.display = 'none';
        this.events.fire('close');        
        if (this.ui.active == this) this.ui.active = null;        
    }

    destroy() {
        this.close();
        super.destroy();
    }
}

class UTable extends UBaseElement {
    constructor(o) {
        if (!('tagName' in o)) o.tagName = 'ui-table';        
        super(o);        

        this.title   = new UCaption({ owner:this, caption:o.caption });
        this.table   = addElem({ parent:this.elem, type:'table' });
        this.headers = [];
        this.rows    = [];
        this.type    = 'table';             // 'table' | 'keyvalue'
    }

    clear() {
        this.table.replaceChildren();
        this.headers = [];
        this.rows    = [];
    }

    set caption(c) {
        this.title.caption = c;
    }

    get caption() {
        return this.title.caption;
    }

    updateHeader(obj) {
        this.headers = Object.keys(obj);
        const tr = addElem({ parent:this.table, type:'tr' });
        for (const text of this.headers) {
            const th = addElem({ parent:tr, type:'th', text });
        }
    }

    /**
     * Adds new content into the table.
     * @param {object[]|object} o If "o" is an array of objects, the keys become the headers and values become rows. 
     * If "o" is a single object, a key-value list is created where first column contains keys and second column contains values.
     * @returns 
     */
    addContent(o) {        
        // "o" is an object:
        if (!Array.isArray(o)) {
            if (typeof o != 'object') throw 'Parameter must be an array of objects, or a single object';
            for (const [k, v] of Object.entries(o)) {
                const tr = addElem({ parent:this.table, type:'tr' });
                const th = addElem({ parent:tr, type:'th', text:k });
                const td = addElem({ parent:tr, type:'td', text:v });
                this.rows.push([k, v]);
            }
            this.type = 'keyvalue';
            return;
        }

        // "o" is an array:
        if (o.length == 0) return;      
        this.updateHeader(o[0]);
        for (const row of o) {
            const tr = addElem({ parent:this.table, type:'tr' });
            for (const [k, v] of Object.entries(row)) {
                const td = addElem({ parent:tr, type:'td', text:v });
            }
        }
        this.rows.push(...o);
        this.type = 'table';
    }
}

class UCustomList extends UBaseElement {
    /**
     * CustomList component has 3 different types: row, column or grid. Every type has a ".head" and ".body" element.
     * @param {object} o      
     * @param {string} o.tagName
     * @param {string} o.type 'row' | 'column' | 'grid'
     */
    constructor(o) {
        if (!('tagName' in o)) o.tagName = 'ui-customlist';        
        super(o);        
        
        this.events.create('selectitem clickitem hoveritem');
        this._listType        = new Enum('row column grid');
        this.items            = [];        
        this.selection        = [];
        this.maxSelectedItems = 1;                                  // set to zero if you don't want selection behavior
        this.hoverItem        = null;
        
        if ('caption' in o) this._caption = o.caption; else this._caption = null;
        if ('type' in o)    this._setListType(o.type, o.tagNames); else throw 'Type must be specified';
        
        AE.sealProp(this, 'items');
        AE.sealProp(this, 'events');

        const mouseup = e => {  
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
                e.selection  = [...this.selection];
                e.index      = [...listElem.parentElement.children].indexOf(listElem);         // get the element index for convenience and return it to the event handler                
                e.name       = 'selectitem';
                e.data       = 'data' in r ? r.data : null;
                e.item       = r;
                e.instigator = this;

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
        const mousemove = (e) => {
            const r = this.items.find(i => i.listElem.contains(e.target));
            if (r) {
                if (this.hoverItem == r) return;
                this.hoverItem = r;
                this.events.fire('hoveritem', { event:e, item:this.hoverItem });
                return;
            } 
            this.hoverItem = null;
        }

        this.events.add('mouseup', mouseup);
        this.events.add('mousemove', mousemove);
    }

    get listType() {        
        return this._listType.string;
    }

    get caption() {
        return this._caption;
    }

    set caption(v) {
        this._caption = v;
        if (v == null) this.head.textContent = '';    
            else this.head.textContent = v;
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

        if (this._caption) this.head.textContent = this._caption;
    }

    get selectedItem() {
        return this.selection.length > 0 ? this.selection[this.selection.length - 1] : null;
    }

    /**
     * 
     * @param {HTMLImageElement|string|HTMLImageElement[]|string[]} o Image or string (or an array of either one)
     * @returns {ListItem[]} Array of added list items
     */
    add(o) {
        if (!Array.isArray(o)) o = [o];                                         // force array
        const type   = this._listType.string;
        const result = [];            
            
        for (const e of o) {
            const wrapper   = addElem({ parent:this.body });
            const isImages  = (typeof e == 'object') && ('src' in e);
            
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
            result.push(item);
        }                    
        
        return result;
    } 

    findItemByCaption(c) {
        return this.items.find(f => f.listElem.textContent == c);
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
        o.tagName            = 'ui-window';        
        super(o);
        this.elem.className  = 'modal dialog';
        this.objectType      = 'UDialog';

        const msg    = new UCaption({ owner:this, position:'auto', align:'even center' });
        if ('message' in o) msg.caption = o.message;

        if (o.edit) {
            this.edit = new UEdit({ owner:this, value:o.editText ? o.editText : '' });
        }

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

/**
 * Yes/No dialog with a message
 * @param {*} o 
 * @returns 
 */
const Confirmation = async(o) => {
    return new Promise(resolve => {
        const obj = Object.assign({ owner:('owner' in o) ? o.owner : Engine.ui, center:true }, o);
        const dlg = new UDialog(obj);

        for (const [name, button] of Object.entries(dlg.buttons)) {
            button.events.add('click', e => { 
                dlg.close(); 
                if (dlg.edit) resolve({ response:name, value:dlg.edit.value }); 
                    else resolve(name);
            });
        }
    })
}

/**
 * OK dialog with a message
 * @param {*} o 
 * @returns 
 */
const Information = async(o) => {
    return new Promise(resolve => {
        const obj = Object.assign({ owner:('owner' in o) ? o.owner : Engine.ui, center:true, buttons:['OK'], caption:'🛈 Information' }, o);
        const dlg = new UDialog(obj);

        for (const [name, button] of Object.entries(dlg.buttons)) {
            button.events.add('click', e => { 
                dlg.close(); 
                resolve(name);
            });
        }
    })
}

export { UBaseElement, UWindow, UPanel, UButton, UEdit, UCaption, USwitch, UCustomList, UCustomFileList, UFileList, UDialog, UMenu, USlider, UColorPicker, URadioButton, URadioGroup, UTable, Confirmation, Information }

