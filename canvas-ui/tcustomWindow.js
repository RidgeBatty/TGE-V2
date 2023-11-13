import { Vector2 as Vec2, V2, Rect, RECT } from '../types.js';
import { TFocusControl } from './tfocusControl.js';
import { ManagedArray } from '../managedArray.js';

const ImplementsEvents = 'show hide';

export class TCustomWindow extends TFocusControl {
    constructor(o) {        
        super(o);
        this.events.create(ImplementsEvents);                
    }

    get clientOffset() {
        return this.absoluteOffset.add(V2(0, this.titlebar.size.y));        
    }

    get caption() {
        return this.titlebar?.caption;
    }

    set caption(v) {
        if (this.titlebar) this.titlebar.caption = v;        
    }

    get dragActivationCtrl() {                                                  // returns the control which defines the active drag area
        return this.titlebar;
    }

    onActivate() { this.ui.activeWindow = this; this._isActive = true; }
    onDeactivate() { this._isActive = false; this.ui.activeWindow = null; }                         // called when Window is deactivated
                                                                       
    onShow() { this._opacity = 0; this.onActivate(); }
    onHide() { 
        this.forAllChildren(f => { f._isHovered = false; if ('_isActive' in f) f._isActive = false; }, true);
        this.onDeactivate();     
    }

    onClose() {}                                                                                    // called when the window is about to close; before "isVisible" is set to false and before onHide() is called
    
    close() { this.onClose(); this.isVisible = false; }
    show() { this.isVisible = true; }
        
    onKeyDown(e) {        
        if (e.code == 'Tab') {                                                                      // activate next child FocusControl if 'tab' is pressed            
            if (!(this.ui.activeControl && this.isParentOf(this.ui.activeControl))) return;
            const tabs = new ManagedArray();
            this.forAllChildren(f => { if ('tabIndex' in f) tabs.push(f)});            
            const index = tabs.array.findIndex(f => f.tabIndex == this.ui.activeControl.tabIndex);
            if (index > -1) tabs.index = index;
            const n = tabs.next();
            this.ui.activeControl = n;
        }
        if (this.ui.activeControl != null && this.ui.activeControl != this) this.ui.activeControl.onKeyDown(e);
    }

    draw() {             
        if (!this.isVisible) return;
                
        const { settings, clientRect } = this;
        const s = this.surface;

        s.ctx.save();

        s.ctx.resetTransform();        
        s.ctx.translate(this.position.x, this.position.y);

        s.ctx.globalAlpha = this._opacity;

        // window background
        if (this.background?.picture && settings.useBackgroundImage) {        
            const f = this.background.picture;                
            const t = s.ctx.getTransform();
            const sx = this.size.x;
            const sy = this.size.y;
                                                
            if (settings?.backgroundScale == 'both') s.ctx.scale(this.size.x / f.image.width, this.size.y / f.image.height);
            if (settings?.backgroundScale == 'x')    s.ctx.scale(this.size.x / f.image.width, 1);
            if (settings?.backgroundScale == 'y')    s.ctx.scale(1, this.size.y / f.image.height);

            s.ctx.fillStyle = s.ctx.createPattern(f.image, 'repeat');                                 
            s.ctx.fillRect(0, 0, sx, sy);            

            s.ctx.setTransform(t);
        }
        
        s.ctx.shadowColor = 'rgba(0,0,0,0.5)';
        s.ctx.shadowBlur = 20;
        s.ctx.shadowOffsetX = 2;
        s.ctx.shadowOffsetY = 2;

        //s.drawRect(this.clientRect, { stroke:settings.clWindowFrame, fill:settings.clWindow });               
        s.ctx.fillStyle   = settings.clWindow;
        s.ctx.strokeStyle = settings.clWindowFrame;
        s.ctx.beginPath();
        s.ctx.roundRect(clientRect.left, clientRect.top, clientRect.width, clientRect.height, 10);
        s.ctx.fill();
        s.ctx.stroke();

        s.ctx.shadowColor = 'transparent';

        s.clipRect(clientRect, 10);

        if (this.background?.frame && this.background.frame.length > 0 && this.settings.useFrames) this.drawGridPattern();              // window frame

        super.draw();         
        if (this.customDraw) this.customDraw({ surface:s, rect:clientRect });                           
        
        s.ctx.globalAlpha = 1;
        s.ctx.restore();    
        
        // fade in / fade out
        if (this._opacity < 1) this._opacity += this._opacityChangeSpeed;
        if (this._opacity > 1) this._opacity = 1;
        if (this._opacity < 0) this._opacity = 0;        
    }
}