import { Vector2 as Vec2, V2, Rect, RECT } from '../../types.js';
import { TFocusControl } from './base.js';

const ImplementsEvents = 'mousedown mousemove mouseup';

export class TWindow extends TFocusControl {
    constructor(o) {        
        super(o);

        this.isMovable     = true;
        this.isWindow      = true;
        this.edges         = this.ui.surface.rect;                // the window cannot be moved outside of this area
        this.activeControl = null;

        this.fetchDefaults('window');
        
        if ('settings' in o) Object.assign(this.settings, o.settings);
        if ('caption' in o)  this._caption = o.caption;        

        this.events.create(ImplementsEvents);        
    }

    /**
     * This event is fired whenever a window is activated either upon creation, or when clicked on/tabbed to by TWindow.bringToFront() method.
     * Note! If window is already active, this should not be called!
     */
    onActivate() {
        this.ui.activeWindow = this;        
        console.log('Window activated:', this.caption)
    }

    onShow() {
        this.bringToFront();
        super.onShow();
    }

    get captionRect() {
        const { settings } = this;
        const pp = this.parent?.position ? this.parent.position : V2(0, 0);
        return RECT(pp.x + settings.captionOffset.x + this.position.x, pp.y + settings.captionOffset.y + this.position.y, this.size.x, settings.captionHeight);
    }

    bringToFront() {
        const oldz = this.zIndex;        
        this.zIndex = this.parent.topmostChild.zIndex;
        this.parent.topmostChild.zIndex = oldz;        
        this.parent.children.sort((a, b) => a.zIndex - b.zIndex); 
        this.onActivate();
    }

    onMouseDown(e) {
        if (this.ui.activeWindow != this) this.bringToFront();

        super.onMouseDown(e);

        const hit = this.hitTestChildComponents(this, e.position);
        if (!hit) return;
        hit.onMouseDown(e);            
    }

    onMouseUp(e) {
        const hit = this.hitTestChildComponents(this, e.position);
        if (!hit) return;
        hit.onMouseUp(e);            
    }
 
    draw() {
        if (!this.isVisible) return;

        const { settings } = this;
        const s = this.surface;
        const p = this.position.clone();

        s.ctx.translate(p.x, p.y);

        // window background
        if (this.background?.picture && this.settings.useBackgroundImage) {        
            const f = this.background.picture;                
            const t = s.ctx.getTransform();
            const sx = this.size.x;
            const sy = this.size.y;
                        
            s.ctx.fillStyle = s.ctx.createPattern(f.image, 'repeat');                            
            s.ctx.fillRect(0, 0, sx, sy);            
        }

        s.drawRect(RECT(0, 0, this.size.x, this.size.y), { stroke:settings.clWindowFrame, fill:settings.clWindow });                    // window rectangle / frame
        
        if (this.ui.activeWindow === this) {
            var titleBar     = { stroke:settings.clActiveBorder, fill:settings.clActiveCaption }            
            var captionColor = settings.clCaptionText;
        } else {
            var titleBar = { stroke:settings.clInactiveBorder, fill:settings.clInactiveCaption }            
            var captionColor = settings.clInactiveCaptionText;
        }

        s.drawRect(this.captionRect.offset(p.clone().negate()), titleBar);                                                              // title bar
        const { captionAlign, captionBaseline } = settings;
        const ofsX = (captionAlign == 'center')    ? this.size.x / 2 : 0;
        const ofsY = (captionBaseline == 'middle') ? settings.captionHeight / 2 : 0;
        s.textOut(V2(ofsX, ofsY).add(settings.captionOffset), this._caption, { font:settings.captionFont, color:captionColor, textAlign:captionAlign, textBaseline:captionBaseline });
        
        if (this.background?.frame.length > 0 && this.settings.useFrames) this.drawGridPattern();

        super.draw();
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
