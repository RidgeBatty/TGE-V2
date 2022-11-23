import { Engine, Types } from '../engine.js';
import { CustomLayer } from '../customLayer.js';

const { Vector2 : Vec2, V2, wrapBounds, toDegrees } = Types;

class AngleWidget {
    constructor(o) {
        this.position  = o.position;
        this.radius    = o.radius;
        this.actor     = o.actor;
        this.angle     = 0;
        this.font      = '12px courier';
        this.textColor = 'white';
        this._isActive = false;
        this._isHover  = false;

        const layer    = new CustomLayer({ addLayer:true, zIndex:0 });    
        layer.update   = () => this.update();        
        this.layer     = layer;

        this.registerEvents();
    }

    get active() {
        return this._isActive;
    }

    get hover() {
        return this._isHover;
    }

    update() {
        const s = Engine.renderingSurface;        
        const p = this.position;
        s.resetTransform();
        s.drawArrow(p, { angle:this.angle, length:this.radius, sweep:0.85, width:3 }, { stroke:'lime' });
        s.drawCircle(p, this.radius, { stroke:'lime' });
        s.textOut(p.clone().add(V2(-40, 92)), 'Angle: ' + toDegrees(this.angle, 1).padStart(5, ' '), { color:this.textColor, font:this.font });
    }

    registerEvents() {
        const mousedown = (e) => {
            this._isActive = Vec2.Distance(e.position, this.position) < this.radius;
        }
    
        const mousemove = (e) => {  
            this._isHover = Vec2.Distance(e.position, this.position) < this.radius;
            if (e.dragging && this._isActive) {
                let a = Vec2.Sub(e.position, this.position).normalize().toAngle();     
                if (e.event.shiftKey) {            
                    a = Math.round(a / (Math.PI * 2) * 8) * Math.PI * 0.25;
                }
                a = wrapBounds(a, 0, Math.PI * 2);
                this.actor.rotation = a;
                this.angle = a;
            }
        }

        Engine.events.register(this, { mousedown, mousemove });
    }   
}

export { AngleWidget }