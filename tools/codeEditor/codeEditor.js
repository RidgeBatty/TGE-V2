import { Engine, Types } from "/engine.js";
import { CustomEditor } from "/tools/customEditor.js"
import { addElem, addMethods, addPropertyListener } from "/utils.js";
import { TCustomNode } from "./customNode.js";
import { Graph, JFLO } from "./jflo.js";

const { Vector2 : Vec2, V2, Color, Rect, RECT } = Engine.Types;

const MenuItems = ['New Graph',
                   'New Class',
                   'New Structure',                                      
                   '-', 
                   'Print',
                   'Dialogue',
                   'OnAppInit',
                   'OnAppStart',
                   '-', 
                   'Run|F5',
                   '-', 
                   'Switch Editor|F10'];

export class CodeEditor extends CustomEditor {
    constructor(manager) {        
        super({ engine:Engine });
        this.manager     = manager;    
        this.toolMode    = 'None';
        this._toolMode   = 'None';                          // save toolMode (to preserve state while the editor is NOT active)
        this.filename    = 'graph.hjson';
        this.execFrame   = addElem({ parent:document.body, type:'iframe', class:'code-editor' });
        
        this.data.showCrosshair = false;
             
        addPropertyListener(this.mouse, 'coords',  e => { const c = Vec2.Add(this.position, e); if (this.active) ID('coords').textContent = `[ ${c.asString(0)} ]` });                        
        addPropertyListener(this, 'toolMode', e => ID('tool-mode').textContent = `[${e}]`);   
        //addMethods(CodeEditor, EditorUtils); 
    }

    async init() {
        await super.init();
        this.stage      = Engine.gameLoop.getStage(); 
        const ui        = this.manager.ui;                                                                      // new canvas based ui

        ui.createDesktop('CodeEditor', true);        
        /*
        this.windows = {
            shapes      : new TShapesDialog(ui),            
            properties  : new TPropertiesDialog(ui),
            actors      : new TActorsDialog(ui),
            flipbooks   : new TFlipbooksDialog(ui),
            animPlayer  : new TAnimationPlayerDialog(ui),
            timelines   : new TTimelinesDialog(ui),
            editTimeline: new TEditTimelineDialog(ui),
            prompt      : new TPromptDialog(ui),
        }
        ui.addChildren(Object.values(this.windows));
        */    
        this.currentWire = null;
        
        const menu = this.engine.ui.components.find(e => e.name == 'mainmenu');                                 // legacy html based ui
        menu.events.add('selectitem', e => {
            if (!this.active) return;                
            this.onMenuSelect(e.caption, menu);  
        });

        this.onCustomDraw = (s) => {            
            if (this.jflo.active == null) return;

            const ctx = s.ctx;
            for (const w of this.jflo.active.wires) {
                let end;
                if (w.status == 1) end = this.mouse.coords;
                if (w.status == 2) end = Vec2.Add(w.end, w.endNode.absoluteOffset);

                const start = Vec2.Add(w.start, w.startNode.absoluteOffset);

                ctx.beginPath();
                ctx.strokeStyle = 'white';
                ctx.moveTo(start.x, start.y);
                ctx.bezierCurveTo(end.x, start.y, 
                                    start.x, end.y,
                                    end.x, end.y);
                ctx.stroke();
            }
        }

        this.jflo = new JFLO();                             // create main JFLO object (=app)
        await this.jflo.init();                             // init (loads the node repository)
        
        this.jflo.active = new Graph('noname');             // create a new empty Graph
    }

    set active(v) {
        if (v === true) {
            console.log(this.manager.ui);

            this.rewriteMainMenu();
            this._isActive = true;     

            this.toolMode = this._toolMode; 
            ID('editor-name').textContent      = 'Code Editor';
            ID('selected-brush').style.display = 'none';
            ID('tool-sub-mode').style.display  = 'none';

            const gl = Engine.gameLoop;
            gl.setStage(this.stage);            
            gl.onAfterRender = _ => this.update();            

            this.manager.ui.switchDesktop('CodeEditor');
        } else {            
            this._isActive = false;
            this._toolMode = this.toolMode;                     // save toolmode
        }
    }            

    get active()    { return this._isActive; }

    onMouseDown(e, mouse) {
        if (this.manager.ui.hoveredControl != null || this.manager.ui.hoveredControls.length > 0) return;        
    }

    onMouseMove(e, mouse) {
        if (this.manager.ui.hoveredControl != null || this.manager.ui.hoveredControls.length > 0) return;
    }

    onMouseUp(e, mouse) {        
        if (this.manager.ui.hoveredControl != null || e.target.tagName.startsWith('UI') || this.manager.ui.hoveredControls.length > 0) return;        
    }

    onKeyDown(e) {
        if (e.code == 'Escape') { 
        
        }
        this.checkHotkeys(e);    
    }

    rewriteMainMenu() {
        const menu  = Engine.ui.components.find(e => e.name == 'mainmenu');
        menu.clear();
        menu.addItems(MenuItems);   
    }

    getHotkey(e) {
        for (const item of MenuItems) {
            const sp = item.split('|');
            if (sp.length != 2) continue;

            const keyName = sp[1];
            const k = keyName ? keyName.split('+') : [];

            if (k[0] == 'Alt' && e.event.altKey  && k[1] == e.code.slice(-1)) return sp[0];
            if (k[0] != 'Alt' && !e.event.altKey && k[0] == e.code.slice(-1)) return sp[0];
        }
    }
    
    checkHotkeys(e) {
        if (this.manager.ui.activeControl != null) return;                                                          // UI has at least one active window, ignore the editor's hotkeys

        const command = this.getHotkey(e);
        if (command != null) this.onMenuSelect(command);
    }

    addNode(name) {
        const { ui } = this.manager;

        let node;
        
        const f = this.jflo.findFromRepo(name);
        if (f) {
            node       = new TCustomNode(ui, this, f.caption);
            node.name  = f.name;
            node.type  = f.type;
            node.style = f.style;
            if ('inputs'  in f) node.addInputs(f.inputs);
            if ('outputs' in f) node.addOutputs(f.outputs);
        } else {
            console.warn('Item not found in JFLO repo: ' + name);
        }
        
        if (node != null) {
            ui.addChildren([node]);
            if (this.jflo.active) this.jflo.active.nodes.push(node.JFLONode);
        }
    }

    /**
     * Called by the node when the user pushes mouse button down over a pin. This action can be triggered either by creation of a new wire or connecting an existing wire
     * @param {object} o
     * @param {TNodeWindow} o.node 
     * @param {Vector2} o.pinPosition 
     */
    onStartPin(o) {        
        if (this.toolMode == 'None') {
            this.toolMode    = 'Connect wire';
            this.currentWire = { status:1, start:o.pinPosition.clone(), end:o.pinPosition.clone(), startNode:o.node };
            this.jflo.active.wires.push(this.currentWire);                        
        }        
    }

    onEndPin(o) {
        if (this.toolMode == 'Connect wire' && this.currentWire) {            
            this.toolMode = 'None';
            this.currentWire.endNode = o.node;
            this.currentWire.end     = o.pinPosition.clone();
            this.currentWire.status  = 2;      
            this.currentWire = null;                  
        }
    }

    runJFLO() {
        this.jflo.run();
    }
    
    update() {
        if (this.toolMode == 'None') this.crosshair.isVisible = false;
            else this.crosshair.isVisible = this.data.showCrosshair;
        super.update();                                                 // update all drawables of the editor (grid, crosshair, your custom draw elements etc.)        
        this.manager.ui.draw();                                         // draw the canvas ui as an overlay
    }

    async onMenuSelect(caption, menu) {
        if (caption == 'Switch Editor') return this.manager.openSelectEditorDialog();
        if (caption == 'Print')      return this.addNode('sys.print');        
        if (caption == 'Dialogue')   return this.addNode('rpgdolls.quest.dialogue');        
        if (caption == 'OnAppStart') return this.addNode('sys.onappstart');        
        if (caption == 'Run')        return this.runJFLO();
    }
}