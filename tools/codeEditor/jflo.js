import { getJSON } from "../../engine/utils.js";

export const NodeType = Object.freeze({
    Event : 1,
    Exec  : 2,
    Data  : 3,
});

export class JFLONode {
    execute() {

    }

    read() {

    }
}
/**
 * graph is a piece of event driven code (with an optional collection of local variables)
 */
export class Graph {
    constructor(name) {
        this.name  = name;
        this.nodes = [];
        this.wires = [];          // wires have their own collection, but it's only for display purposes. The actual code works only using the nodes collection
    }

    stringify() {

    }

    static Parse() {

    }

    execute() {
        //const events = this.nodes.filter(f => f.)
    }
}

/**
 * Main object containing all JFLO code of the project
 */
export class JFLO {
    constructor() {
        this.emitters = {};         // event emitters
        this.graphs   = {};         // graph is a piece of event driven code (with a collection of local variables)        
        this.funcs    = {};         // functions (with a collection of local variables)
        this.classes  = {};         // classes (with a collection of local variables)

        this.repo     = {};         // repository of all node classes

        this.active   = null;       // graph, function or class which is currently being edited
    }

    findFromRepo(name) {
        const parts = name.split('.');
        const loseLast = [...parts];
        const n    = loseLast.pop();                // the last string in "." separated list
        const path = loseLast.join('.');            // all the other strings before the last string

        let node;
        Object.entries(this.repo).find(([k, v]) => {
            if (k == path) {
                node = Object.values(v).find(f => f.name == n);            
                if (node != null) return;                
            }
        });
        
        return node;
    }

    async init() {
        const unit = await getJSON('./editor/codeEditor/nodes/sys.hjson')
        unit.events.forEach(f => f.type = NodeType.Event);
        unit.execNodes.forEach(f => f.type = NodeType.Exec);
        unit.dataNodes.forEach(f => f.type = NodeType.Data);
        this.repo.sys = [...unit.events, ...unit.execNodes, ...unit.dataNodes];
    }

    run() {
        console.log('Running app...');
        console.log(this);
        const nodes  = this.active.nodes;
        const events = nodes.filter(f => f.type == NodeType.Event);
        console.log('Event nodes:', events);
    }
}