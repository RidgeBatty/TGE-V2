/**
 * 
 * TCombobox - Drop down menu
 * 
 */
 
import { Vector2 as Vec2, V2, Rect, RECT } from '../types.js';
import { TListbox } from './tlistbox.js';
import { TFocusControl } from './tfocusControl.js';
import { TCaptionControl } from './tcaptionControl.js';
import { TScrollbar } from './tscrollbar.js';
import { TButton } from './tbutton.js';

export class TCombobox extends TFocusControl {
    #menuOpen = false;
    constructor(o) {
        super(o);        
        this.settings     = {};        
        
        const margin      = 4;
        const size        = 32;

        this._length      = 5;          // amount of visible items in the dropdown menu

        this.selection    = this.add(TCaptionControl, { position:V2(0, 0), size:V2(this.size.x, size), caption:'', settings:{ textOffset:V2(5, 0) } });
        this.btOpen       = this.add(TButton, { position:V2(this.size.x - (size - margin), margin), size:V2(size - margin * 2, size - margin * 2), caption:'▼' });
        this.listbox      = this.add(TListbox, { position:V2(0, size + margin), size:V2(this.size.x - size, size * this._length), items:o.items });                
        this.scrollbar    = this.add(TScrollbar, {
            position: V2(this.listbox.position.x + this.listbox.size.x + margin, size + margin),
            size    : V2(size - margin, this.listbox.size.y),     
            targetControl : this.listbox,   
        });

        this.selectedItem = null;

        this.listbox.events.add('select', e => { 
            this.isOpen = false;            
            if (e.selectedItem) {
                this.selection.caption = e.selectedItem.caption;
                this.selectedItem = e.selectedItem;
            }
        });        
    /*
        const _this = this;
        Object.defineProperty(scrollbar, 'position', {
            get() { return V2(_this.listbox.position.x + _this.listbox.size.x + 4, _this.listbox.position.y) }
        })        
    */      
        this.fetchDefaults('combobox');    
        
        this.btOpen.onClick    = e => { this.isOpen = !this.isOpen; }
        this.selection.onClick = e => { this.isOpen = !this.isOpen; }

        this.isOpen = false;
    }  

    /**
     * Amount of visible items in the dropdown menu
     */
    set length(v) {
        if (typeof v == 'number' && v > 0 && v < 100) this._length = v;
    }

    get length() {
        return this._length;
    }

    /**
     * Is the menu currently open? i.e. "dropped down"
     */
    set isOpen(v) {
        if (v === true || v === false) {
            this.#menuOpen = v;
            this.listbox.isVisible   = v;
            this.scrollbar.isVisible = v;
            this.btOpen.caption = this.#menuOpen ? '▲' : '▼';
        }
    }

    get isOpen() {
        return this.#menuOpen;
    }

    draw() {
        const { settings } = this;
        const s = this.surface;
        const p = this.position;
        
        s.ctx.save();

        s.ctx.translate(p.x, p.y);
        s.clipRect(this.clientRect);   
             
        s.drawRect(this.selection.clientRect, { stroke:settings.cl3DLight, fill:settings.clWindow });        
        this.selection.settings.clActiveText = 'white';
        this.selection.settings.font = '20px arial';        

        super.draw();                           

        s.ctx.restore();        
    }
}    