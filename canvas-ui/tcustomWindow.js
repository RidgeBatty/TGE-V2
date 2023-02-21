import { Vector2 as Vec2, V2, Rect, RECT } from '../types.js';
import { TButton } from './tbutton.js';
import { TTitlebar } from './ttitlebar.js';
import { TControl } from './tcontrol.js';
import { TFocusControl } from './tfocusControl.js';

const ImplementsEvents = 'show hide';

export class TCustomWindow extends TFocusControl {
    constructor(o) {        
        super(o);

        this.isMovable     = true;
        this.isWindow      = true;
        this.edges         = this.ui.surface.rect;                                                                              // the window cannot be moved outside of this area
        this.activeControl = null;
        this._isActive     = false;          
        
        this.titlebar      = this.add(TTitlebar, { caption:o.caption, size:V2(this.size.x, 32) });                        // window title bar
        this.btClose       = this.add(TButton, { caption:'✖', position:V2(this.size.x - 30, 4), size:V2(26, 24) });
        this.clientArea    = new TControl({ parent:this, position:V2(0, 32), size:V2(this.size.x, this.size.y - 32) });         // window client area        

        this.fetchDefaults('window'); 

        if ('settings' in o) this.ui.applyProps(this.settings, o.settings);

        // override default settings:        
        if (o.settings?.titlebar) this.ui.applyProps(this.titlebar.settings, o.settings.titlebar);                             // overwrite titleBar's settings with parameter settings.titleBar  
        
        this.onRecalculate();

        this.events.create('show hide');

        this.btClose.onMouseUp = e => { this.close() }
    }

    get caption() {
        return this.titlebar?.caption;
    }

    get dragActivationCtrl() {                                                  // returns the control which defines the active drag area
        return this.titlebar;
    }

    get isActive() { return this._isActive; }
    set isActive(v) {
        if (v === true) {
            if (this._isActive == false) this.onActivate();
            this._isActive = true;
            return;
        }
        if (v === false) {
            if (this._isActive == true) this.onDeactivate();
            this._isActive = false;            
            return;
        }
    }

    onRecalculate() {
        //console.log(this.titleBar.settings)
        this.titlebar.size.y = this.titlebar.settings.height;

        this.btClose.size.y  = this.titlebar.settings.height - 8;
        this.btClose.size.x  = this.titlebar.settings.height - 8;
        this.btClose.position.x  = this.titlebar.size.x - this.titlebar.settings.height + 4;
    }

    /**
     * This event is fired whenever a window is activated either upon creation, or when clicked on/tabbed to by TWindow.bringToFront() method.
     * Note! If window is already active, this should not be called!
     */
    onActivate() {
        if (this.ui.activeWindow != this) {
            if (this.ui.activeWindow != null) this.ui.activeWindow.isActive = false;                // deactivate previously active window
            this.ui.activeWindow = this;             
        }        
    }

    onDeactivate() { }                                                                              // called when Window is deactivated
    onShow() { this.bringToFront(); }

    onHide() {
        this.isActive = false;
        if (this.ui.activeControl != null && this.findParentWindow(this.ui.activeControl) == this) {            
            this.ui.activeControl = null;    
        }
    }
    
    close() { this.isVisible = false; }
    show() { this.isVisible = true; }
    
    bringToFront() {
        if (!this.isActive) this.isActive = true;

        const prevTopControl = this.parent.lastChild;

        if (prevTopControl != this) {            
            const indexOfThis    = this.parent.children.indexOf(this);
            this.parent.lastChild = this;
            this.parent.children[indexOfThis] = prevTopControl;

            this.ui.activeWindow = this.parent.lastChild;                                           // make the last window in the draw stack active
        }
    }

    onMouseDown(e) {
        if (this.ui.activeWindow != this) this.bringToFront();
        super.onMouseDown(e);
    }
    
    onKeyDown(e) {
        if (this.ui.activeControl != null && this.ui.activeControl != this) this.ui.activeControl.onKeyDown(e);
    }

    draw() {             
        if (!this.isVisible) return;
        
        const { settings } = this;
        const s = this.surface;

        s.ctx.save();

        s.ctx.resetTransform();        
        s.ctx.translate(this.position.x, this.position.y);
        
        // window background
        if (this.background?.picture && this.settings.useBackgroundImage) {        
            const f = this.background.picture;                
            const t = s.ctx.getTransform();
            const sx = this.size.x;
            const sy = this.size.y;
                        
            s.ctx.fillStyle = s.ctx.createPattern(f.image, 'repeat');                            
            s.ctx.fillRect(0, 0, sx, sy);            
        }
        
        s.drawRect(this.clientRect, { stroke:settings.clWindowFrame, fill:settings.clWindow });               
        s.clipRect(this.clientRect);
        
        if (this.background?.frame && this.background.frame.length > 0 && this.settings.useFrames) this.drawGridPattern();              // window frame
    
        super.draw();                                                                                                                   // title bar text (caption)

        s.ctx.restore();        
    }

    /**
     * Traverses up the control's parent chain and stops at the first TWindow component. Returns null if no TWindow is found.
     * @param {TControl} control 
     * @returns {(TWindow|null)}
     */
    findParentWindow(control) {        
        while (control != null) {
            if (control.isWindow) return control;
            control = control.parent;
        }
        return null;        
    }
}