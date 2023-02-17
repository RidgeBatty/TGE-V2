/**
 * 
 * TScrollbar - represents a control which can gain focus and act as a 
 * 
 */
 
import { Vector2 as Vec2, V2, Rect, RECT } from '../types.js';
import { addMethods, preloadImages } from '../utils.js';
import { TButton } from './tbutton.js';
import { TFocusControl } from './tfocusControl.js';

export class TScrollbar extends TFocusControl {
    constructor(o) {
        super(o);        
        this.settings      = {};
        this.fetchDefaults('scrollbar');   
        
        this.targetControl  = 'targetControl' in o ? o.targetControl : null;
        this.orientation    = 'y';
        this.buttonSize     = V2(24, 20);
        this.buttonOffset   = V2(2, 2);
        this.prevButtonRect = RECT(this.buttonOffset.x, this.buttonOffset.y, this.buttonSize.x, this.buttonSize.y);
        this.nextButtonRect = RECT(this.buttonOffset.x, this.buttonOffset.y, this.buttonSize.x, this.buttonSize.y);
        this.trackLength    = this.size.y - (this.buttonOffset.y * 4 + this.buttonSize.y * 2) - 4;

        // create the buttons
        this.btUp    = this.add(TButton, { position:this.buttonOffset, size:V2(this.buttonSize.x, this.buttonSize.y), caption:'▲' });
        this.btThumb = this.add(TButton, { position:this.thumbInitialPos, size:V2(this.buttonSize.x, this.thumbLength), caption:'' });        
        this.btDown  = this.add(TButton, { position:V2(2, this.size.y - this.buttonOffset.y - this.buttonSize.y), size:V2(this.buttonSize.x, this.buttonSize.y), caption:'▼' });
        
        // event handlers
        this.btThumb.onMouseDown = (e) => {
            this.btThumb.edges     = RECT(this.btThumb.size.x + this.buttonOffset.x, this.thumbInitialPos.y, 0, this.trackLength);            
            this.ui.dragStartPos   = this.btThumb.position;
            this.ui.draggedControl = this.btThumb;
        }
        this.btThumb.onDrag     = e => { this.targetControl.scroll[this.orientation] = this.scrollRatio; }
        this.btThumb.onMouseUp  = e => { this.ui.draggedControl = null; }
        this.btUp.onMouseDown   = e => { console.log('up') }
        this.btDown.onMouseDown = e => { console.log('down') }        
    }

    /**
     * Returns normalized position of the thumb (0..1)
     */
    get scrollRatio() {
        return (this.btThumb.position.y - (this.btThumb.size.x + this.buttonOffset.x)) / (this.trackLength - this.thumbLength);
    }

    get thumbInitialPos() {
        return V2(0, this.buttonSize.y + this.buttonOffset.y * 2).add(this.buttonOffset);
    } 

    get thumbLength() {
        if (this.targetControl == null) return this.trackLength;
        const len = this.trackLength - this.targetControl.overflow[this.orientation] / this.targetControl.itemAreaSize[this.orientation] * this.trackLength;        
        return len;
    }

    draw() {    
        const s = this.surface;
     
        const { settings, clipRect } = this;
        const p = this.position;
        s.ctx.translate(p.x, p.y);
        
        s.drawRect(this.clientRect, { stroke:settings.cl3DLight, fill:'#222' });                 

        this.btThumb.size[this.orientation] = this.thumbLength;        

        super.draw();

        //s.drawRect(RECT(2, 2, this.size.x - 4, 24), { stroke:settings.cl3DLight, fill:'#333' });                 
        //s.drawRect(RECT(2, this.size.y - 26, this.size.x - 4, 24), { stroke:settings.cl3DLight, fill:'#333' });                 
    }
}    