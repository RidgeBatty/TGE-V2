/*

    Experimental: server side code parser

*/
import { Engine, Types } from "../engine/engine.js";

const main = async () => {        
    const ss = new SSCode();
    await ss.loadFromFile('example.ssc');
    ss.run();
}

Engine.init(main);