/**
 * 
 * Canvas based UI components
 * 
 * Non-focusable
 * -------------
 * Label
 * Panel
 * Image
 * Group box
 * 
 * Focusable
 * ---------
 * Scrollbar
 * Edit
 * Combobox
 * Listbox
 * Checkbox
 * Radiobutton
 * Button
 * Memo
 * PopupMenu
 * Menu
 * Treeview
 * Window
 * Dialog
 */

class CanvasUI {
    constructor(engine) {
        this.engine     = engine;                   // used to determine the viewport dimensions and attach event handlers
        this.components = [];

        this.installEventHandlers();
    }

    installEventHandlers() {
        const mousemove = e => {}
        const mouseup   = e => {}
        const mousedown = e => {}
        const keydown   = e => {}
        const wheel     = e => {}
        Engine.events.register(this, { mousemove, mouseup, mousedown, keydown, wheel });
    }
}
