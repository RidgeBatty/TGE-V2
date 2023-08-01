import { TEdit } from "../../engine/canvas-ui/tedit.js";
import { TToolWindow } from "../../engine/canvas-ui/ttoolWindow.js";
import { Vector2 as Vec2, V2, Rect, RECT } from '../../engine/types.js';
import { JFLONode } from "./jflo.js";

export class TCustomNode extends TToolWindow {
    constructor(parent, codeEditor, caption) {
        super({
            parent,
            position : V2(200, 100), 
            size     : V2(260, 210),
            caption,
            settings : {             
                titlebar : {
                    textOffset       : V2(6, 0),                                                            
                    textShadow       : '1px 1px 2px black',
                    clActiveGradient : { rect:[0, 0, 0.8, 4], stops:[{ color:'rgba(100,180,220,0.5)', stop:0 }, { color:'rgba(0,35,40,0.5)', stop:1 }] }
                },                
                clWindow : 'rgba(16,16,16,0.85)'
            },     
            noCloseButton : true,
            type          : 'toolwindow',
        });   

        this.codeEditor = codeEditor;
        
        this.input      = [];
        this.output     = [];
        this.inflow     = [];
        this.outflow    = [];
        this.hoveredPin = null;
        this.rects      = [];                                                        // hover/selct rectangles for all pins
        this.type       = '';
    }

    get JFLONode() {
        const n = new JFLONode();
        n.input   = this.input;
        n.output  = this.output;
        n.inflow  = this.inflow;
        n.outflow = this.outflow;
        n.type    = this.type;
        n.name    = this.name;
        return n;
    }

    set style(t) {
        if (t == 'red')       this.titlebar.settings.clActiveGradient = { rect:[0, 0, 0.8, 4], stops:[{ color:'rgba(250,40,40,0.5)', stop:0 }, { color:'rgba(40,0,0,0.5)', stop:1 }] };
        if (t == 'steelblue') this.titlebar.settings.clActiveGradient = { rect:[0, 0, 0.8, 4], stops:[{ color:'rgba(100,180,220,0.5)', stop:0 }, { color:'rgba(0,35,40,0.5)', stop:1 }] };
    }

    addInputs(list) {
        for (const pin of list) {            
            if (pin.type == '#') this.inflow.push(pin);
                else {
                    const p = Object.assign({}, pin);
                    if (pin.type == 'string') p.editor = this.add(TEdit, { size:V2(100, 14), settings:{ font:'12px arial' } });                                // string editor                    
                    this.input.push(p);
                }
        }
    }

    addOutputs(list) {
        for (const pin of list) {          
            if (pin.type == '#') this.outflow.push(pin);
                else this.output.push(pin);
        }
    }

    get inputPins() {
        return [...this.inflow, ...this.input];
    }

    get outputPins() {
        return [...this.outflow, ...this.output];
    }

    onMouseMove(e) {
        const c = Vec2.Sub(e.position, this.absoluteOffset);                    // relative coordinate of the mouse cursor
        this.hoveredPin = null;
        for (const item of this.rects) {
            if (item.r.isPointInside(c, true)) {                
                this.hoveredPin = item;
            }
        }        
    }

    onMouseOut() {
        this.hoveredPin = null;
    }

    onMouseDown() {
        if (this.hoveredPin) {
            this.codeEditor.onStartPin({ node:this, pinPosition:Vec2.Add(this.hoveredPin.r.position, V2(10, 10)) });
        }        
    }

    onMouseUp() {
        if (this.hoveredPin) {
            this.codeEditor.onEndPin({ node:this, pinPosition:Vec2.Add(this.hoveredPin.r.position, V2(10, 10)) });
        }        
    }

    draw() {
        this.size.y = Math.max(this.inputPins.length, this.outputPins.length) * 24 + 40;        // recalculate the height of the node window before starting to draw        
        super.draw();
    }

    customDraw(o) {
        const s = o.surface;

        s.ctx.save();
        s.ctx.resetTransform();        
        s.ctx.translate(this.position.x, this.position.y);
        s.ctx.lineWidth = 2;        

        // inputs:
        let yPos = 40, i = 0;
        for (const inflow of this.inflow) {
            s.textOut(V2(8,  yPos), '▶', { font:'14px arial', color:inflow.color, textBaseline:'top', shadow:'2px 2px 2px black' });
            s.textOut(V2(28, yPos), inflow.caption, { font:'14px arial', color:'white', textBaseline:'top', shadow:'2px 2px 2px black' });            
            this.rects[i++] = { r:RECT(4, yPos - 4, 20, 20), p:inflow };            
            yPos += 24;
        }
        for (const input of this.input) {
            s.drawCircle(V2(14, yPos + 6), 5, { stroke:input.color });
            s.textOut(V2(28, yPos), input.caption, { font:'14px arial', color:'white', textBaseline:'top', shadow:'2px 2px 2px black' });            
            if ('editor' in input) {
                input.editor.position = V2(100, yPos);
            }
            this.rects[i++] = { r:RECT(4, yPos - 4, 20, 20), p:input };            
            yPos += 24;            
        }

        // outputs:
        yPos = 40;
        for (const outflow of this.outflow) {
            s.textOut(V2(this.size.x - 8,  yPos), '▶', { font:'14px arial', color:outflow.color, textBaseline:'top', textAlign:'right', shadow:'2px 2px 2px black' });
            s.textOut(V2(this.size.x - 28, yPos), outflow.caption, { font:'14px arial', color:'white', textBaseline:'top', textAlign:'right', shadow:'2px 2px 2px black' });            
            this.rects[i++] = { r:RECT(this.size.x - 24, yPos - 4, 20, 20), p:outflow };
            yPos += 24;
        }
        for (const output of this.output) {
            s.drawCircle(V2(this.size.x - 14, yPos + 6), 5, { stroke:output.color });
            s.textOut(V2(this.size.x - 28, yPos), output.caption, { font:'14px arial', color:'white', textBaseline:'top', textAlign:'right', shadow:'2px 2px 2px black' });            
            this.rects[i++] = { r:RECT(this.size.x - 24, yPos - 2, 16, 16), p:output };
            yPos += 24;
        }

        if (this.hoveredPin) {
            const r = this.hoveredPin.r.clone();
            r.expand(1);            
            s.drawRect(r, { stroke:'white' });
        }
        
        s.ctx.restore();
    }
}