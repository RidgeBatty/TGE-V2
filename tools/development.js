/**
 * To run your game in development mode, add this line in the <HEAD> section of your main html file: 
 * 
 * <script src="engine/tools/development.js" type="module"></script>
 *
 * In production, remove the line.
 */

import { Utils, Engine } from "../engine.js";
import { style } from "../utils-web.js";

/**
 * Adds a global function in Window scope which allows easy debugging of any variable in real time
 * @param {string} text any text you want to be displayed as on overlay on top of the game window
 * @param {string} name (optional) add a name for the variable if you want to display several different variables instead of a single one
 * @param {string} style (optional) adds any CSS styling to a named variable
 */
window.showMe = (text, name = '', cssStyle) => {
    let el = Engine._rootElem.querySelector('tge-showme');
    if (!el) el = Utils.addElem({ parent:Engine._rootElem, type:'tge-showme' });

    if (name) {
        let ch = el.querySelector(`[data-showme='${name}']`);
        if (!ch) {
            ch = Utils.addElem({ parent:el, type:'tge-showme-line' });
            ch.dataset['showme'] = name;
        }
        ch.textContent = name + ': ' + text;
        
        if (cssStyle) style(ch, cssStyle);
        return ch;
    }

    el.textContent = name;      
    return el;
}