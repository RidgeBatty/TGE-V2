/**
 * TGE EditorTool base class (use as a template for descendant classes)
 */

export class EditorTool {
    constructor() {
    }

    /**
     * Return boolean "true" if the tool is currently active, otherwise "false"
     */
    get isToolActive() {

    }

    clear() {
        throw new Error('EditorTool descendants must implement this method!');
    }

    onToolActivate() {
        
    }

    onMouseDown(e) {

    }

    onMouseMove(e) {

    }

    onMouseUp(e) {
        
    }

    /**
     * Draw the tool graphics on the given surface
     * @param {CanvasSurface} s 
     */
    onUpdate(s) {

    }

    /**
     * Replace tool contents by unpacking the "data" string 
     * @param {string} data 
     */
    parse(data) {

    }

    /**
     * Create serialized version of the contents of the tool
     */
    stringify() {

    }
}
