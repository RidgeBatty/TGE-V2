/*
	Attach a click handler into an element and wait until the element is clicked!
*/
export const waitClick = async (elem) => {
	let clickResolve = null;
	
	addEvent(elem, 'click', e => {
		if (clickResolve != null) clickResolve(e);
	});		
	
	return new Promise(resolve => {				
		clickResolve = resolve;
	});			
}

/**
 * Creates a new HTML element
 * @param {object} o Parameters object
 * @param {string|HTMLElement} o.parent Either a reference to the parent HTMLElement or an ID of the parent element
 * @param {string=} o.text Optional. Textcontent for the created element
 * @param {string=} o.id Optional. ID for the created element
 * @param {string=} o.class Optional. Space separated list of CSS class names to be added in the created element
 * @param {string=} o.type DEPRECATED. Optional. Type of the created HTML Element. Defaults to "div".
 * @param {boolean} o.tagName Optional. Override automatic tag name assignment for <input> types (allows defining <button> tag) NEW!!!
 * 	NOTE! If the type is any of InputTypes constants, the type of the element is set to "input" and the type field becomes the value of <input type=""> 
 * @returns {HTMLElement}
 */
export const addElem = (o) => {		
	let kind = ('type' in o) ? o.type : 'div';	
	if ('tagName' in o) {
		kind = o.tagName;
	} else
		if (InputTypes.includes(kind)) kind = 'input';													// check if the given "type" is any of InputTypes constants
	
    const el = document.createElement(kind);

	if (kind == 'input') el.type = o.type;

    if ('text' in o)  el.textContent = o.text;
    if ('class' in o) el.className = o.class;
    if ('id' in o)    el.id = o.id;

	for (const [k, v] of Object.entries(o)) {
		if (k == 'tagName') {
			continue;
		} else
		if (k.substring(0, 2) == 'on') {
			const evt = k.slice(2);
			addEvent(el, evt, v);
		} else
		if (!['text', 'class', 'id', 'parent', 'type'].includes(k)) {
			el.setAttribute(k, v);
		}
	}

    const parent = ('parent' in o) ? ((typeof o.parent == 'string') ? document.getElementById(o.parent) : o.parent) : document.body;
    parent.appendChild(el);
    return el;
}

/**
 * Creates a file drop zone on given HTMLElement
 * @param {string} HTMLElementOrID 
 * @param {object} handlers 
 * @param {function=} handlers.dragenter Optional
 * @param {function=} handlers.dragleave Optional
 * @param {function} handlers.drop Required. Return FALSE to overried the default drop handling
 * @param {function=} handlers.filesready Optional
 */
export const createFileDropZone = (HTMLElementOrID, handlers = {}) => {			
	const elem = (ID(HTMLElementOrID) == null) ? HTMLElementOrID : ID(HTMLElementOrID);
	
	addEvent(elem, 'drop', (e) => onDropFile(e));	
	addEvent(elem, 'dragover', (e) => e.preventDefault());	
	addEvent(elem, 'dragenter', (e) => { if ('dragenter' in handlers) handlers.dragenter(e); });
	addEvent(elem, 'dragleave', (e) => { if ('dragleave' in handlers) handlers.dragleave(e); });
	
	const onDropFile = (e) => {		
		e.preventDefault();
		
		const runDefaultCode = ('drop' in handlers) ? handlers.drop(e) : true;			// return FALSE from custom handler to override the default drop handling
		
		if (runDefaultCode) {
			const result = [];
			if (e.dataTransfer.items) {
				 for (let item of e.dataTransfer.items) {
					 if (item.kind === 'file') result.push(item.getAsFile());
				 }
			}
			if ('filesready' in handlers) handlers.filesready(result);
		}
	}
}

/**
 * 
 * @param {HTMLElement|string} elem 
 * @returns Returns HTMLElement 
 */
export const ID = (elem) => { 
	return (typeof elem == 'string') ? document.getElementById(elem) : elem; 
}

export const addEvent = (elem, evnt, func, params = false) => {
	var elem = ID(elem);	
	if (elem && 'addEventListener' in elem) {				
		elem.addEventListener(evnt, func, params);		
		return func;
	} 
	throw 'Failed to set event listener';
}

/**
 * 
 * @param {[string]} urls
 * @param {object} settings Arguments
 * @param {string} settings.fileType 'css'|'js'
 * @param {string} settings.path Optional
 * @param {boolean} settings.verbose Optional
 * @param {function} settings.callback Optional
 * @param {document} settings.HTMLDocument Optional. Reference to document where the dynamic download code is injected. If not provided, uses the current "document"
 * @param {boolean} settings.loadSerial Optional. Load files in serial (default) instead of parallel
 * @returns 
 */
export const require = async (urls, settings = {}) => { 
	let   fileType   = ('fileType' in settings) ? settings.fileType : 'auto'; 
	const verbose    = ('verbose' in settings) ? settings.verbose : true; 
	const callback   = ('callback' in settings) ? settings.callback : null; 
	const doc        = ('document' in settings) ? settings.document : document;
	const loadSerial = ('loadSerial' in settings) ? settings.loadSerial : true;
	const path       = settings.path ?? '';

	const getFile = (url, addr) => { 
		return new Promise((r, reject) => {		
			const head = doc.head;												// check if requested URL is already in <head>, if not, load it:
			for (let i = 0; i < head.children.length; i++) { 
				var tag = head.children[i];        
				if (addr in tag && tag[addr].indexOf(url) != -1) { 
					if (verbose) console.warn('Skipped file: ' + url); 
					if (callback) callback(url, null);
					return false; 
				}         
			}

			switch (fileType) { 
				case 'css':             
					var tag   = doc.createElement('link');
					tag.rel   = 'stylesheet';
					tag.type  = 'text/css';
					tag.href  = url;
					tag.crossOrigin = 'anonymous';
				break;
				case 'js':
					var tag = doc.createElement('script');
					if (settings.module) tag.type = 'module';
					tag.src  = url;
				break;		
				default:
					if (verbose) console.warn('Filetype not detected:', url);
			}

			if (verbose) console.log('Loading: ' + url);
			tag.onload = function() {
				 if (callback) callback(url, tag); 
				 r(url); 
			}
			tag.onerror = function(error) {
				reject(url);
			}

			head.appendChild(tag);
		});
	}
	
	for (const url of urls) {		
		const file = url.split('/').pop().split('?').shift();
		if (fileType == 'auto') fileType = file.split('.').pop();
		const addr = (fileType == 'js') ? 'src' : 'href';

		if (fileType == file) fileType = 'js';							// if file extension is not found (no dot), then load the folder and assume it's javascript

		try {
			if (loadSerial) await getFile(path + url, addr);
				else getFile(path + url, addr);	
		} catch (url) {
			console.error('Failed to load:', url);
			return false;
		}
	}

	return true;
}

export const downloadFile = (filename, data, type = 'application/json') => {
	if (filename != '') {
		const blob = data instanceof Blob ? data : new Blob([data], { type });
		const url  = URL.createObjectURL(blob);
		const e    = window.document.createElement('a');
		e.href     = url;
		e.download = filename;
		e.click();  
		URL.revokeObjectURL(url);
	}
}


/**
 * Creates an open file dialog
 * @param {string} acceptedFiles ".doc,.docx,.xml,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
 * @param {boolean} multiple allow multiple files to be selected
 * @return {Promise} array of files
 */
export const openFileDialog = (acceptedFiles = '*', multiple = false) => {
	return new Promise(resolve => {
		var i = document.createElement('input');
		i.setAttribute('type', 'file');
		if (multiple == true) i.setAttribute('multiple', multiple);
		i.setAttribute('accept', acceptedFiles);
		i.addEventListener('change', e => resolve(i.files));
		i.click();	
	});
}

/**
 * Adds CSS style to the given HTMLElement
 * @param {*} elem 
 * @param {*} properties 
 * @param {*} compute 
 * @returns 
 */
export const style = (elem, properties, compute) => {	
    if (properties == undefined) return;
    var elem = ID(elem);
    var propList = properties.split(';');
    var property, value, obj;
    for (var i = 0; i < propList.length; i++) {
        /*
           obj      = propList[i].split(':'); 
           this isn't sufficient when we have --> background-image:url('http: <-- there is ANOTHER colon which will split the string in 3 parts!
           so instead of simple split ':' we split with colon, except when the colon in between open and close parenthesis!
       */
       obj = propList[i].match(/(?:[^:\(]+|\([^\)]*\))+/g); 
       
       if (obj != null) {
           if (obj.length == 2) {
               property = obj[0].trim();
               value    = obj[1].trim();
               elem.style[property] = value;
               if (compute) { var n = getComputedStyle(elem)[property]; }
           } else if (obj.length == 1) {
               property = obj[0].trim();
               elem.style[property] = '';
           }
       }
    }
}

export const getPos = (elem, includeScrolling) => {
	var cr = elem.getBoundingClientRect() || { left:0, top:0, right:0, bottom:0 }
	if (includeScrolling) { 
		const x = document.documentElement.scrollLeft;
		const y = document.documentElement.scrollTop;
		var  cr = { left:cr.left+x, top:cr.top+y, right:cr.right+x, bottom:cr.bottom+y };
	}
	return cr;
}

/**
 * Trims excess, leading and trailing slashes/backslashes from given string 
 * @param {string} str string to process 
 * @returns 
 */
const trimPath = (str, separator = '/') => {
	let result = str.split(/\/|\\/).filter(v => v !== '').join(separator)
	result = result.replace(/http:\//y, 'http://');
	result = result.replace(/https:\//y, 'https://');
	return result;
}

const getEnumKey = (enumObject, value) => {
	const o = Object.entries(enumObject).find(f => f[1] == value);
	if (o) return o[0];
}

/**
 * Clones the DATA of a given object by walking through the properties. This function is designed to be used for (de)serialization of parameters used in class constructor.
 * @param {object} object object to be cloned
 * @param {function} onCreate a callback to provide a custom constructor for a field. Return "true" from callback if default processing should be applied.
 * @param {string} someProps Optional. List if properties of the "object", if only subset of them needs to be cloned. Space separated string.
 */
const cloneData = (object, onCreate, someProps) => {
	const clone = {};

	if (someProps) object = copyProps({}, object, someProps);					// create a temp object with only a limited list of properties

	for (const prop in object) {
		let result = isFunction(onCreate) ? onCreate(object, prop, clone) : true;
		if (!result) continue;

		if (typeof object[prop]?.clone == 'function') {							// 1. if the property is an object, try to use its clone() function
			clone[prop] = object[prop].clone();
		} else 
		if (isObject(object[prop])) {											// 2. if the property is an object without clone() function, try to clone it using cloneData()
			clone[prop] = cloneData(object[prop], onCreate);
		} else {																// 3. if the property is a primitive, assign it
			clone[prop] = object[prop];
		}
	}
	return clone;
}
