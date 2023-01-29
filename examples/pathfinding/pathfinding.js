/*

    Pathfinding Demo
    ================
    Demo of PathFinder, an A* based path finding algorithm with visualization using the Grid module.

*/
import { Engine, Types } from '../../engine.js';
import { Grid } from '../../grid.js';
import { Pathfinder } from '../../pathfinder.js';

const { Vector2:Vec2, V2 } = Types;

const onclick = (e, grid, pf) => {
    const v = Vec2.ToInt(grid.unproject(e.position));
    let   r = pf.reveal(v);
    if (r == false) return console.log('Not found in open list:', v.asString(0));
}

const main = async () => {    
    await Engine.setup('../../settings.hjson');
    
    const pf = new Pathfinder(V2(28, 28), V2(1, 1));
    pf.addObstacles([V2(4, 5), V2(4, 6), V2(5, 6), V2(6, 6), V2(7, 6), V2(8, 6), 
                     V2(7,9), V2(8,9), V2(9,9), V2(10,9), V2(11,9), V2(11,8),
                     V2(15,22), V2(16,22), V2(16,21), V2(16,20), V2(16,19),V2(17,19), V2(18,19), V2(19,19), V2(20,19), V2(21,19), V2(21,18), V2(21,17), V2(21,16), V2(21,15), V2(21,14),
                     V2(27,27), V2(28,27),V2(29,27),V2(29,29),V2(28,29),V2(27,29),V2(27,28)
                    ]);    
    pf.updatePath = true;
    
    const grid    = new Grid(32, 32, 32);
    grid.position = Engine.viewport.center;

    const smallText = { font:'8px arial', color:'black' }
    const bigText   = { font:'14px arial', color:'black' };    
    const gridText = (s, p, node) => {        
        if (node === pf.start) return s.textOut(V2(p.x + 5, p.y + 20), ' A', bigText);
        if (node === pf.end)   return s.textOut(V2(p.x + 5, p.y + 20), ' B', bigText);
        
        s.textOut(V2(p.x + 2,  p.y + 8),  node.G.toFixed(), smallText);
        s.textOut(V2(p.x + 18, p.y + 8),  node.H.toFixed(), smallText);
        s.textOut(V2(p.x + 5,  p.y + 20), node.F.toFixed(), bigText);
    }

    const drawList = (s, list, c) => {
        for (const item of list) {
            const p = grid.project(item.v);            
            s.drawRectangle(p.x, p.y, 30, 30, c);            
            gridText(s, p, item);
        }  
    }

    const t1 = performance.now();
    let r;
    while (!pf.complete) r = pf.step();    
    console.log((performance.now() - t1).toFixed(1) + ' ms');
    console.log(r);

    const update = _ => {            
        const s = Engine.renderingSurface;
        s.resetTransform();        

        var c = { stroke:'black', fill:'silver' };
        grid.draw(v => s.drawRectangle(v.x, v.y, 30, 30, c));           // draw default map tiles (gray)      

        drawList(s, pf.open, { stroke:'green', fill:'lime' });
        drawList(s, pf.closed, { stroke:'maroon', fill:'red' })
        drawList(s, pf.obstacles, { stroke:'gray', fill:'black' })
                        
        var c = { stroke:'teal', fill:'cyan' };                         

        var p = grid.project(pf.start.v);                               // show start
        s.drawRectangle(p.x, p.y, 30, 30, c);            
        gridText(s, p, pf.start);

        var p = grid.project(pf.end.v);                                 // show end
        s.drawRectangle(p.x, p.y, 30, 30, c);                     
        gridText(s, p, pf.end);        
        
        for (const p of pf.path) {                                      // visualize path
            const v = grid.project(p); 
            s.drawRectangle(v.x-1, v.y-1, 32, 32, { stroke:'blue', fill:'rgba(0,0,255,0.5)' }); 
        }     
    }      
    
    Engine.gameLoop.add('custom', { update, zIndex:2 });                // Create and add the layer    
    Engine.events.add('mouseup', e => onclick(e, grid, pf));
    Engine.start(); 
}

Engine.init(main);