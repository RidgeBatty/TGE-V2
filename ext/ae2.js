/*
 COPYRIGHT (C) 2013-2020 by Ridge Batty - All Rights Reserved
	This source code 
	1. may be distributed only without modification 
	2. may be used for educational / non-commercial purposes without permission from the author
	3. is provided AS IS without any guarantees or liabilities. By running this code you accept full responsibility of the consequences.
	Use for other purposes than stated above is strictly prohibited
	Revision 6 - Version Date 11/October/2022 - Build 0032

	Search with '@' to view different function categories
*/

var AE = AE || {	
	Empty   : function() {},
	IE 		: (document.documentMode ? document.documentMode : false),
	remove  : 0,
	replace : 1,
	entityMap :	 { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': '&quot;', "'": '&#39;', "/": '&#x2F;' },
	t0		: 0,
	t1		: 0,
};

/* protected scope */
(function() {
	var keyPaths = [];

	var saveKeyPath = function(path) {
		keyPaths.push({
			sign: (path[0] === '+' || path[0] === '-')? parseInt(path.shift()+1) : 1,
			path: path
		});
	};

	var valueOf = function(object, path) {
		var ptr = object;
			for (var i=0,l=path.length; i<l; i++) ptr = ptr[path[i]];
		return ptr;
	};

	var comparer = function(a, b) {
		for (var i = 0, l = keyPaths.length; i < l; i++) {
			aVal = valueOf(a, keyPaths[i].path);
			bVal = valueOf(b, keyPaths[i].path);
			if (aVal > bVal) return keyPaths[i].sign;
			if (aVal < bVal) return -keyPaths[i].sign;
		}
		return 0;
	};

	AE.sortBy = function(arr, guments) {
		keyPaths = [];
		if (AE.isArray(guments)) {
			for (var i = 0, l = guments.length; i < l; i++) {			
				switch (typeof(guments[i])) {
					case "object": saveKeyPath(guments[i]); break;
					case "string": saveKeyPath(guments[i].match(/[+-]|[^.]+/g)); break;
				}	
			} 
		} else
			for (var i = 1, l = arguments.length; i < l; i++) {
				switch (typeof(arguments[i])) {
					case "object": saveKeyPath(arguments[i]); break;
					case "string": saveKeyPath(arguments[i].match(/[+-]|[^.]+/g)); break;
				}
			}
		return arr.sort(comparer);
	};    
})();

/**
 * 
 * @param {HTMLElement|string} elem 
 * @returns Returns HTMLElement 
 */
function ID(elem) { 
	return (typeof elem == 'string') ? document.getElementById(elem) : elem; 
}

AE.style = function( elem, properties, /* optional */ compute ) {	
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

// ===========================================================
// @Object manipulation
// ===========================================================
/*	
	Checks whether the 'object' has a class name or constructor named 'className' in its prototype chain. 
	This function deep scans the entire prototype chain. 
	Note! This function will only check for name equality. This is not the same as 'instanceOf' built in operator and does not ensure the equality of the classes.
	Use this when you need to compare objects which are created in different contexts (iframe or window) where 'instanceOf' will not work.
*/
AE.isInstanceOf = function(object, className) {	// object:Object, className:string
	if ( !AE.isObject(object)) return false;
	var n = object;
	while (n) {
		if (('constructor' in n) && (n.constructor.name == className)) return true;
		if (n.name != '' && n.name == className) return true;		
		n = Object.getPrototypeOf(n);
	}
	return false;
}

/*
	Extends the "child" object by attaching the "parent" prototype chain to it, simulating inheritance of OO model.
*/
AE.extend = function (child, parent) {
	child.prototype = Object.create(parent.prototype);
	child.prototype.constructor = child;	
}

AE.isEmpty = function(o) { for(var i in o) { if (o.hasOwnProperty(i)) return false; } return true; }

AE.propCount = function(o) {
	var count = 0;
	for (k in o) if (o.hasOwnProperty(k)) count++;
	return count;
}

AE.hasProp = function(o, p) {
	return AE.isObject(o) && Object.prototype.hasOwnProperty.call(o, p);
}

AE.clone = function(o) {	
	return JSON.parse(JSON.stringify(o));
}
AE.parseJSON = function(str, onParsed, onError) {
	try {
		var result = JSON.parse(str);
	} catch (e) {
		onError(e);
	}
	onParsed(result);
}

AE.copyProps = function(child, parent, warnOnCollision) { 
	if (warnOnCollision) for (var key in parent) if (key in child) throw 'Colliding key found: ' + key; else child[key] = parent[key];
		else for (var key in parent) child[key] = parent[key];
}

AE.walkObj = function(o, callBack) {
	for (var prop in o) {
		if (o.hasOwnProperty(prop)) callBack(prop);
	}
}

AE.freezeProp = function(obj, prop, value) {
	Object.defineProperty(obj, prop, { value, writable:false, configurable:false });
}

AE.flip = function(obj, prop, a, b) {	
	obj[prop] = obj[prop] == a ? b : a;
	return obj[prop];
}

/*
	Create a writable property which descriptor may not be changed. Sealed property cannot be deleted.
	This is useful for creating class properties which must always exist and whose name cannot be changed.
*/
AE.sealProp = function(obj, prop, /* optional */value) {
	if (value !== undefined) Object.defineProperty(obj, prop, { value, writable:true, configurable:false });
		else Object.defineProperty(obj, prop, { writable:true, configurable:false });
}
// ===========================================================
// @String manipulation
// ===========================================================
AE.includes = function (char, set) {
	if (char == '' || set.indexOf(char) == -1) return false;
	return true;
}
AE.insert = function (originalString, index, string) {
	if (index > 0)
		return originalString.substring(0, index) + string + originalString.substring(index, originalString.length);
	else
		return string + originalString;
}
AE.capitalize = function(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
AE.escapeHTML = function(string) {
	return String(string).replace(/[&<>"'\/]/g, function (s) { return AE.entityMap[s]; });
}
AE.removeTail = function(s, charCount) {
	if (charCount == undefined) return s.slice(0, -1);
	return s.slice(0, -charCount);
}
AE.unquoteItems = function(s, quote) {				// unquotes an array of items
	if (quote == undefined) quote = '"';
	for (var i = 0; i < s.length; i++) {
		if (s[i].charAt(0) === quote && s[i].charAt(s[i].length - 1) === quote) s[i] = s[i].substr(1, s[i].length - 2);		
	}
	return s;
}
AE.escapeRegEx = function(string) {
    return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}
AE.replaceAll = function(needle, replace, haystack) {
  return haystack.replace(new RegExp(AE.escapeRegEx(needle), 'g'), replace);
}

AE.capFirst = function(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
// ===========================================================
// @Type detection
// ===========================================================
AE.isString     = function (n)  { return typeof n === 'string'; }
AE.isBoolean    = function (n)  { return typeof n === 'boolean'; }
AE.isFloat    	= function (n) 	{ return n === +n && n !== (n|0); }
AE.isInteger  	= function (n) 	{ return n === +n && n === (n|0); }
AE.isNumeric  	= function (n) 	{ return !isNaN(parseFloat(n)) && isFinite(n); }	// regardless of type...
AE.isEAN13    	= function (n)	{ if (n.length != 13) return false; for (var b = /\d/g, c = 0, d, e = 25; d = b.exec(n); e -= 2) c += e % 4 * d; return !(~e | c % 10) }
AE.isArray    	= function (o) 	{ return Object.prototype.toString.call(o) === "[object Array]"; }
AE.isDefined  	= function (o)	{ return typeof o != 'undefined'; }
AE.isFunction 	= function (o)	{ return typeof o == 'function'; }
AE.isObject 	= function (o) 	{ return o === Object(o); }
AE.isDOMNode  	= function (o)	{ var test = false; try { test = AE.isDefined(o) && o.parentNode && o.children && (AE.getElemIndex(o.parentNode.children, o) != -1); } catch (e) { return false } return test; }
AE.isDescendant = function (parent, child) {
    var node = child.parentNode;
    while (node != null) { if (node == parent) return true; node = node.parentNode; }
    return false;
}
AE.def 			= function(arg, def) 	{  return (typeof arg == 'undefined' ? def : arg); }
AE.testEqu		= function(arg, value) 	{  return (typeof arg == 'undefined' ? false : (arg == value)) }

AE.isEmail		= function (value) {
  var input 	= document.createElement('input');
  input.type 	= 'email';
  input.value 	= value;  
  return input.checkValidity();
}
AE.dist = function (a, b) {
	return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
}
AE.build = function(str, paramArray) {
	var p = 0;
	function builder(match) { return paramArray[p++]; }
	return str.replace(/[?]/g, builder);
}

AE.EAN13toBin = function(ean) {
	var result 		= '';		
	var sequence   	= '000000,001011,001101,001110,010011,011001,011100,010101,010110,011010'.split(',');
	var tab			= [];
	tab[0]			= '0001101,0011001,0010011,0111101,0100011,0110001,0101111,0111011,0110111,0001011'.split(',');
	tab[1]			= '0100111,0110011,0011011,0100001,0011101,0111001,0000101,0010001,0001001,0010111'.split(',');
	tab[2]			= '1110010,1100110,1101100,1000010,1011100,1001110,1010000,1000100,1001000,1110100'.split(',');
	var series		= ean.split('');	
	var tabseq 		= sequence[series[0]];	// select a sequence based on first number in EAN	
	result += '101'; // start sequence
	for (var i = 0; i < 6; i++) {
		var n   = series[i + 1];
		var t   = tabseq.charAt(i);
		result += tab[t][n];		
	}
	result += '01010'; // intermediate sequence
	for (var i = 0; i < 6; i++) {
		var n   = series[i + 7];		
		result += tab[2][n];		
	}		
	result += '101'; // stop sequence
	return result;
}

/*
	Tests whether object's "ns" namespace exists (i.e. can "ns.params.tools.field.value" reached or not?)		
	Returns "notExistsValue" if the namespace does not exist.
*/
AE.getValue = function(ns, str, notExistsValue = null) {		// ns:Object, str:String, ?notExistsValue
	if (ns == null) return notExistsValue;
	let path = str.split('.');
	if (path.length > 0) {
		let p    = path[0];
		let i    = 0;
		while (p) {
			if (!(p in ns)) return notExistsValue;
			ns = ns[p];
			p  = path[++i];
		}
	}
	return ns;
}

// ===========================================================
// @Array manipulation
// ===========================================================
/*
	Returns the count of "item" occurrences in an array. Item may be of any type.
	If "property" is provided, the item is assumed to be an object and if its property value equals "item", it's included in the count.
*/
AE.intersect = function(a, b) {
	var r = [];
	for (var q = 0; q < a.length; q++) {
		var found = false;
		for (var i = 0; i < b.length; i++) {		
			if (a[q] == b[i]) found = true;
		}
		if (!found) r.push(a[q]);
	}
	return r;
}

AE.equals = (a, b) => {
	if (a.length != b.length) return false;
	for (let i = 0; i < a.length; i++) if (a[i] != b[i]) return false;
	return true;
}

// ===========================================================
// @Positioning, Viewport and Scroll
// ===========================================================

AE.getMousePos = function(e) {
	var target = e.target || e.srcElement,
    rect = target.getBoundingClientRect(),
    x 	 = e.clientX - rect.left,
    y 	 = e.clientY - rect.top;
	return { x:x, y:y }
}

AE.scrollIntoView = function(container, item) {
	if (item.offsetTop < container.scrollTop) container.scrollTop = item.offsetTop;			
	if (item.offsetTop + item.offsetHeight > container.scrollTop + container.offsetHeight) container.scrollTop = item.offsetTop - container.offsetHeight + item.offsetHeight;
}

AE.windowScrollY = function() {
	if (window.scrollY == undefined) return document.documentElement.scrollTop;
	return window.scrollY;
}

AE.windowScrollX = function() {
	if (window.scrollX == undefined) return document.documentElement.scrollLeft;
	return window.scrollX;
}

AE.getWindowInnerWidth = function() {
	return (window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth);
}

AE.getWindowInnerHeight = function() {
	return (window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight);
}

AE.getWindowRect = function() {
	return { left:0, top:0, right:AE.getWindowInnerWidth(), bottom:AE.getWindowInnerHeight() };
}

AE.getPos = function(elem, /* optional */includeScrolling) {
	var cr = elem.getBoundingClientRect() || { left:0, top:0, right:0, bottom:0 }
	if (includeScrolling) { xs = AE.windowScrollX(); var ys = AE.windowScrollY(); return { left:cr.left+xs, top:cr.top+ys, right:cr.right+xs, bottom:cr.bottom+ys }; }			
	return cr;
}

AE.scrollToTop 		= function() { window.scrollTo(AE.windowScrollX(), 0); }
AE.scrollToBottom 	= function() { window.scrollTo(AE.windowScrollX(), document.body.scrollHeight); }

// ===========================================================
// @Events
// ===========================================================

AE.addEvent = function(elem, evnt, func, params = false) {
	var elem = ID(elem);
	
	if (elem.addEventListener) {				
		elem.addEventListener(evnt, func, params);		
		return func;
	} else alert('addEvent not supported.');	
}

AE.removeEvent = function(elem, evnt, func, options = false) {	
	var elem = ID(elem);
	
	if (elem.removeEventListener) {				
		elem.removeEventListener(evnt, func, options); 		
	} else alert('removeEvent not supported.');
}

AE.getTextWidth = function(text, className) {
	if (className == undefined) className = '';
	var el = AE.newElem(document.body, 'div', className);
	if (!AE.isArray(text)) {
		AE.setText(el, text);	
		getComputedStyle(el).width;
		var result = el.clientWidth;		
	} else {
		var result = [];
		var cache  = {};
		for (var i = 0; i < text.length; i++) {
			var content   = String(text[i]);
			var wordWidth = 0;
			var letterSpacing = 0;
			for (var n = 0; n < content.length; n++) {
				var ch = content.charAt(n);
				if (cache[ch] == undefined) {
					AE.setText(el, ch);	
					getComputedStyle(el).width;
					cache[ch] = el.clientWidth;
				}
				wordWidth     += cache[ch];
				letterSpacing += 1;
			}
			result.push(wordWidth + letterSpacing);
		}
	}
	AE.removeElement(el);
	return result;
}
// ===========================================================
// @DOM manipulation
// ===========================================================
AE.getMeta = function(name, attr = 'content') {
	return document.querySelector("meta[name='" + name + "']").getAttribute(attr);
}

AE.loadCSS = function(URL, index) {
        var oldlink = document.getElementsByTagName("link");
		if (oldlink && oldlink[index]) {
			var newlink = document.createElement("link");
			newlink.setAttribute("rel", "stylesheet");
			newlink.setAttribute("type", "text/css");
			newlink.setAttribute("href", URL);									
			document.getElementsByTagName("head").item(0).replaceChild(newlink, oldlink[index]);
		}
}

AE.getIds = function(elem) {
	var obj = {};
	AE.traverse(elem, function(node) { if (node.id) obj[node.id] = node; return true; });
	return obj;
}
AE.traverse = function(node, callBack) {				
	function t(n) {		
		if (callBack(n) == true) for (var i = 0; i < n.children.length; i++) t(n.children[i]);
	}
	t(node);
}
AE.getText = function(el) { var el = ID(el); if ('textContent' in document.body) return el.textContent; return el.innerText; }
AE.setText = function(el, value) { var el = ID(el); if ('textContent' in document.body) el.textContent = value; else el.innerText = value; }
AE.getInt = function(el) { var el = ID(el); if ('textContent' in document.body) return ~~el.textContent; return ~~el.innerText; }
AE.getFloat = function(el) { var el = ID(el); if ('textContent' in document.body) return parseFloat(el.textContent); return parseFloat(el.innerText); }
AE.removeClass = function(e, classToRemove) {	
	var e = ID(e);
	var classes = e.className.split(' ').filter(i => i != classToRemove);	
	e.className = classes.join(' ');
}
AE.addClass = function(e, classToAdd) {	
	if (typeof classToAdd != 'string') return;	
	var e = ID(e);	
	var classes = (e.className == '') ? [] : e.className.split(' ');
	addList     = classToAdd.split(' ');
	var i = 0, cl; 
	while (cl = addList[i++]) {		
		if (classes.indexOf(cl) == -1) classes.push(cl);			 
	}
	e.className = classes.join(' ');
}
AE.hasClass = function(e, classToTest) {
	var e = ID(e);
	var classes = e.className.split(' ');
	return (classes.indexOf(classToTest) != -1);
}
AE.toggleClass = function(e, name) {
	var e = ID(e);
	if (AE.hasClass(e, name)) AE.removeClass(e, name);
       else AE.addClass(e, name);
}

AE.setStyles = function(nodeList, style) { for (var i = 0; i < nodeList.length; i++) setStyle(nodeList[i], style); }

AE.show = function(elem, mode) 	{ if ( AE.isArray(elem) ) for (var i = 0; i < elem.length; i++) { var e = ID(elem[i]); e.style.display = mode || ''; } else { var e = ID (elem); e.style.display = mode || ''; } }
AE.hide = function(elem) { if ( AE.isArray(elem) ) for (var i = 0; i < elem.length; i++) { var e = ID(elem[i]); e.style.display = 'none'; } else { var e = ID (elem); e.style.display = 'none'; } }

AE.getElemIndex = function(element) {
	var ep = element.parentNode;
	if (ep) {
		for (var i = 0, len = ep.children.length; i < len; i++) {
			if (ep.children[i] == element) return i;
		}
	}
	return -1;
}

AE.isChildOf = function(elem, parentCandidate, deepScan) {
	if (deepScan) {
		var node = elem.parentNode;
		while (node != null) {
			if (node == parentCandidate) {
				return true;
			}
			node = node.parentNode;
		}
		return false;
	}
	while (elem != null) {
		if (elem == parentCandidate) return true;
		elem = elem.parentNode;
	}
	return false;
}

AE.getParent = function(element, field, /*optional*/value) {	// if element has a parent with a matching field value, return it. if value is not specified, a matching field is enough.
	while (element) {		
		if (element[field]) {
			if (value == undefined || element[field] == value) return element;			
		}
		element = element.parentNode;
	}
	return null;
}

AE.getParentAttrib = function(element, attr, /*optional*/value) {	 
	while (element && element.tagName) {				
		if (element.hasAttribute(attr)) {
			if (value == undefined || element.getAttribute(attr) == value) return element;			
		}
		element = element.parentNode;
	}
	return null;
}

AE.newElem = function(parent, nodeType, /* optional */ classListStr) {	
	var n = document.createElement(nodeType);
	if (parent != null) {
		const p = ID(parent);
		if (p == null) throw 'AE: Invalid parent element: ' + parent;
		p.appendChild(n);
	}
	if (AE.isDefined(classListStr)) AE.addClass(n, classListStr);
	return n;
}

AE.toggleAttribute = function (element, attr, /* OPTIONAL */stateA, stateB) {
	if (stateA == undefined || stateB == undefined) { stateA = '1'; stateB = '0'; }	
	if (element.hasAttribute(attr)) {
		var n = element.getAttribute(attr);		
		(n == stateA) ? n = stateB : n = stateA;
		element.setAttribute(attr, n);
		return n;
	}
	return null;
}

AE.swapElements = function(obj1, obj2) {
	var temp = document.createElement("div");
	obj1.parentNode.insertBefore(temp, obj1);
	obj2.parentNode.insertBefore(obj1, obj2);
	temp.parentNode.insertBefore(obj2, temp);
	temp.parentNode.removeChild(temp);
}

AE.removeElement = function(elem) {
	var elem = ID(elem);
	return elem.parentNode.removeChild ( elem );
}

AE.removeElements = function ( elems ) {
	var removed = [];
	for (var i = 0; i < elems.length; i++) { removed.push( AE.removeElement(elems[i]) ); }
	return removed;
}

AE.removeChildren = function (node) {
    var last;
	var node = ID(node);
    while (last = node.lastChild) { node.removeChild(last); }
}

AE.selectContents = function(node) {
	var range = document.createRange();
	range.selectNodeContents(node);
	window.getSelection().addRange(range);
	return range;
}

AE.getSelectedText = function() {
    var text = "";
    if (window.getSelection) {
        text = window.getSelection().toString();
    } else if (document.selection && document.selection.type != "Control") {
        text = document.selection.createRange().text;
    }
    return text;
}

// ===========================================================
// @Compatibility, Shims
// ===========================================================
AE.isLocalhost = function() {
	return (location.hostname === "localhost" || location.hostname === "127.0.0.1");
}

AE.supportsLocalStorage = function() {
  try {
    return 'localStorage' in window && window['localStorage'] !== null;
  } catch (e) {
    return false;
  }
}

AE.supportsGetUserMedia = function() {
  return !!(navigator.getUserMedia || navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia || navigator.msGetUserMedia);
}

AE.getUserMedia = function(args) {
  try {
		var a = (navigator.getUserMedia || navigator.webkitGetUserMedia ||
          navigator.mozGetUserMedia || navigator.msGetUserMedia);  
		a.apply(window.navigator, arguments);
	} catch (e) {
		console.log('AE.getUserMedia: cannot access A/V hardware due to an error or user intervention.');
	}
}

AE.fullScreen = function(elem, onSuccess) {
	console.log('AE: Requesting full screen mode.');
	function goFullScreen() {	
		elem.requestFullscreen = elem.requestFullscreen    ||
								 elem.mozRequestFullscreen ||
								 elem.mozRequestFullScreen || // Older API upper case 'S'.
								 elem.webkitRequestFullscreen;
		elem.requestFullscreen();
		if (onSuccess) onSuccess();
	}
	elem.addEventListener( 'click', goFullScreen, false );	
}

AE.pointerLock = function(elem) {
	console.log('AE: Requesting pointer-lock mode.');
    elem.requestPointerLock = elem.requestPointerLock    ||
                              elem.mozRequestPointerLock ||
                              elem.webkitRequestPointerLock;
    elem.requestPointerLock();	
	function pointerLockChange() {		
		if (document.mozPointerLockElement === elem || document.webkitPointerLockElement === elem) {
			console.log('Pointer lock was successful.');
		} else
			console.log('Pointer lock was lost.');
	}
	document.addEventListener('pointerlockchange', pointerLockChange, false);
	document.addEventListener('mozpointerlockchange', pointerLockChange, false);
	document.addEventListener('webkitpointerlockchange', pointerLockChange, false);	
}

/*
	Get user permission to access clipboard.
	Requested permission level can be either "read" or "write".
	Function returns the current state of permissions to "onChange" callback (if provided). 
	Note that the callback may be called again at any time if the permissions are changed!
	Returned state (string) is one of the following: "granted", "denied", "prompt".
*/
AE.getClipboardPermissions = function(permission = 'read', onChange) {	
	if (location.protocol == 'http:') {
		console.warn('Clipboard API is supported only for pages served over https.');
		return;
	}
	if (permission == 'read' || permission == 'write') var descriptor = { name:'clipboard-' + permission }
		else throw "Clipboard permission must be either 'read' or 'write'.";
	console.log(descriptor);
	navigator.permissions.query(
		descriptor			
	).then(permissionStatus => {		
		permissionStatus.onchange = () => {			
			if (typeof onSuccess == 'function') {
				onChange(permissionStatus.state);
			}
		};
		if (typeof onSuccess == 'function') {
			onChange(permissionStatus.state); 	
		}		
	});
}

// ===========================================================
// @Utility functions
// ===========================================================
AE.clamp = function(value, low, high) {
	return Math.max(low, Math.min(value, high));
}	

/*
	Swaps the values of two properties of a given object 'o'.
	Property names are provided as strings 'A' and 'B'.
*/
AE.swap = function(o, A, B) {	// o:object, A:string, B:string
	var tmp  = o[A];
		o[A] = o[B];
		o[B] = tmp;	
}

/*
	Returns a random string of 'len' characters, composed of characters given in 'aCharset' parameter.
	If an error is encountered (the browser does not support crypto API) the function returns 'null'.
	If 'useCrypto' is set to true, the function will use cryptographic random numbers to generate the string.	
	Note! Do not use this function for security purposes!
*/
AE.randomStr = function(len, aCharset, useCrypto){
    var text 	= '';
	var charset = AE.def(aCharset, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
	if (useCrypto) {
		try {
			var array  = new Uint32Array(len);
			var crypto = window.crypto || window.msCrypto;
			crypto.getRandomValues(array);
			for (var i = 0; i < len; i++) {				
				text += charset.charAt(array[i] / (Math.pow(2, 32) - 1) * charset.length);
			}	
			return text;
		} catch (e) {
			return null;
		}
	}
    for (var i = 0; i < len; i++) text += charset.charAt(Math.floor(Math.random() * charset.length));
    return text;
}

/*
	Loads JavaScript or CSS from specified URL by inserting it in the <HEAD> section of the document.
	Callback function is executed after the file is loaded.
	If the URL is already present in <HEAD> section, it is not loaded again, but the callback is still executed.	
	
	Callback function returns the URL of the loaded file and also a reference to the tag which was created in the <HEAD> section. 
	If no tag was created (for example an error occurred in loading the file) the tag value will be set to null.
*/
AE.require = function(url, settings = {}) {  // url:string, settings:{ fileType:string|null, verbose:boolean|null, callback:function|null, document:HTMLDocument|null }
	var fileType = ('fileType' in settings) ? settings.fileType : 'auto'; 
	var verbose  = ('verbose' in settings) ? settings.verbose : true; 
	var callback = ('callback' in settings) ? settings.callback : null; 
	var doc      = ('document' in settings) ? settings.document : document;
	
    let file = url.split('/').pop().split('?').shift();
	if (fileType == 'auto') fileType = file.split('.').pop();
    let addr = (fileType == 'js') ? 'src' : 'href';

// check if requested URL is already in <head>, if not, load it:
    let head = doc.head;
    for (var i = 0; i < head.children.length; i++) { 
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
            tag.src  = url;
        break;
		default:
			console.warn('Filetype not detected:', url);
    }
    if (verbose)  console.log('Loading: ' + url);
	if (callback) tag.onload = function() { callback(url, tag); }
    head.appendChild(tag);
	
	return true;
}

/*
	Gets module path from <meta> tag in the <head> element
	This can be used by calls to AE.require() to figure out the implementation specific path to modules
*/
AE.getModulePath = function(moduleName, tag = 'data-module-url-') {
    const metaTags = document.head.getElementsByTagName('meta');
    for (e of metaTags) if (e.hasAttribute(tag + moduleName)) return e.getAttribute(tag + moduleName);
}

AE.appDataSize = function(bytes, kbCaption, mbCaption) { // convert bytes count to "more human readable" approximation
	var result = '';
	var kbCaption = kbCaption || 'Kbytes';
	var mbCaption = mbCaption || 'Mbytes';
	if (bytes >= 1024)        result = (bytes / 1024).toFixed(1) + kbCaption;
	if (bytes >= 1024 * 1024) result = (bytes / 1024 / 1024).toFixed(1) + mbCaption;
	return result;
}

AE.getFiles = function(files, closure, encoding) {
	var count = 0;	
	for (var i = 0, file; file = files[i]; i++) {
		var reader		  = new window.FileReader();
		reader._file  	  = file;
		reader.onloadend  = function (e) {						
			closure(e, this._file, this.result, ++count);
		}		
		if (encoding == 'text/utf8') reader.readAsText(file); 
		 else reader.readAsDataURL(file);
	}
}

AE.download = function(filename, data, dataType) {
	if (data instanceof Blob) var blob = data;
		else var blob = new Blob([data], { type: dataType });
		
    if (window.navigator.msSaveOrOpenBlob) window.navigator.msSaveBlob(blob, filename);
		else {
			var elem = window.document.createElement('a');
			elem.href = window.URL.createObjectURL(blob);
			elem.download = filename;        
			document.body.appendChild(elem);
			elem.click();        
			
			document.body.removeChild(elem);
			window.URL.revokeObjectURL(blob);
		}
}

/*
	Opens the operating system "open file" dialog.
	Optional acceptedFiles parameter: 
	
	"audio/*|video/*|image/*|MIME_type"
	".jpg, .png, .jpeg, .gif, .bmp, .tif, .tiff|image/*"
	
	Set 'multiple' to true to allow multiple files to be selected.
	If 'onAccept' callback is specified, it will be called once the dialog is closed with two parameters: 
	First one is the input onchange event and the second is a list of selected files.
	
*/
AE.openFileDialog = function(acceptedFiles = '*', multiple = false, onAccept) {
	var i = document.createElement('input');
	i.setAttribute('type', 'file');
	if (multiple == true) i.setAttribute('multiple', multiple);
	i.setAttribute('accept', acceptedFiles);
	if (typeof onAccept == 'function') AE.addEvent(i, 'change', (e) => onAccept(e, i.files));
	i.click();	
}

AE.upload = function(endpoint, files) {
	const data = new FormData();
	
	for (const file of files) data.append('files[]', file, file.name);
	
	return fetch(endpoint, {
		method: 'POST',
		body: data
	});		
}

AE.splitPath = function (path) {
  var dirPart, filePart;
  path.replace(/^(.*\/)?([^/]*)$/, function(_, dir, file) {
    dirPart = dir; filePart = file;
  });
  return { dir: dirPart, file: filePart };
}

AE.decToHex = function(d, padding) {
	var hex = Number(d).toString(16);
	padding = typeof (padding) === "undefined" || padding === null ? padding = 2 : padding;
	while (hex.length < padding) hex = "0" + hex;
	return hex;
}

AE.pad = function(num, size) {
    var s = num + '';
    while (s.length < size) s = '0' + s;
    return s;
}

AE.playSound = function(elem, soundfile) {
	if (elem.mp3) {
		if(elem.mp3.paused) elem.mp3.play(); else elem.mp3.pause();
	       } else {
		elem.mp3 = new Audio(soundfile);
		elem.mp3.play();
	       }
}

// ===========================================================
// @Data & Time functions
// ===========================================================

AE.msToTime = function(diff) {
    return {
		ms : Math.floor( diff            % 1000 ),
    	s  : Math.floor( diff /     1000 %   60 ),
    	m  : Math.floor( diff /    60000 %   60 ),
    	h  : Math.floor( diff /  3600000 %   24 ),
    	d  : Math.floor( diff / 86400000        )		
	}
}

AE.toDate = function(timestamp, sourceFormat) { // converts timestamp from "sourceFormat" to Javascript internal Date object format
	if (sourceFormat == undefined || sourceFormat == 'mySQL') {		
		var t = timestamp.split(/[- :]/);			// Split timestamp into [ Y, M, D, h, m, s ]
		if (t.length != 6) { alert('AE.toDate: invalid input data'); console.log('AE.toDate: input data: ' + timestamp); return; }		
		return new Date(t[0], t[1]-1, t[2], t[3], t[4], t[5]);	// Apply each element to the Date function
	}
}

AE.dateDiff = function(a, b) {
	var _MS_PER_DAY  = 1000 * 60 * 60 * 24;
	var _MS_PER_HOUR = 1000 * 60 * 60;
	var _MS_PER_MIN  = 1000 * 60;
						
	var utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate(), a.getHours(), a.getMinutes());
	var utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate(), b.getHours(), b.getMinutes());
							
	var r1 = Math.floor((utc2 - utc1) / _MS_PER_DAY);
	var r2 = Math.floor((utc2 - utc1) / _MS_PER_HOUR);
	var r3 = Math.floor((utc2 - utc1) / _MS_PER_MIN);
						
	return { 
		passed: a > b, 		// has the point A passed?
		inDays: r1,
		inHours: r2,
		inMinutes: r3,
		countdown: { days: r1, hours: r2 - (24 * r1), mins: r3 - (24 * 60 * r1) }
	}
}

AE.formatDate = function(ts, format, useUTC) {
	if (useUTC) {
		var year  = ts.getUTCFullYear();
		var month = ts.getUTCMonth() + 1;
		var day   = ts.getUTCDate();
		var hour  = ts.getUTCHours();
		var min   = ts.getUTCMinutes();	
		var sec   = ts.getUTCSeconds();	
	} else {
		var year  = ts.getFullYear();
		var month = ts.getMonth() + 1;
		var day   = ts.getDate();
		var hour  = ts.getHours();
		var min   = ts.getMinutes();	
		var sec   = ts.getSeconds();	
	}
	
	var f     = format;
	f         = f.replace('YYYY', year + '');
	f         = f.replace('MM', AE.pad(month, 2) + '');
	f         = f.replace('DD', AE.pad(day, 2) + '');
	f         = f.replace('HH', AE.pad(hour, 2) + '');
	f         = f.replace('mm', AE.pad(min, 2) + '');
	f         = f.replace('ss', AE.pad(sec, 2) + '');	
	
	return f;
}

AE.getUTCWeek = function(optionalDate) {
	const i    = new Date();
	const date = optionalDate || Date.UTC(i.getFullYear(), i.getMonth(), i.getDate());
	var d      = new Date(date);
	var dayNum = d.getUTCDay() || 7;
	d.setUTCDate(d.getUTCDate() + 4 - dayNum);
	var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
	return Math.ceil((((d - yearStart) / 86400000) + 1)/7)	
}

AE.formatSeconds = function(totalSeconds) {
	days		  = Math.floor(totalSeconds / (3600 * 24))
	totalSeconds %= (3600 * 24);
	hours         = Math.floor(totalSeconds / 3600);
	totalSeconds %= 3600;
	minutes       = Math.floor(totalSeconds / 60);
	seconds       = totalSeconds % 60;
	var addS      = '';
    if (days > 1) addS = 's';
	
    return AE.build('? day? ?:?:?', [days, addS, AE.pad(hours, 2), AE.pad(minutes, 2), AE.pad(seconds, 2)]);
}

AE.timerStart = function() { AE.t0 = performance.now(); }
AE.timerStop  = function() { AE.t1 = performance.now(); }
AE.timerGet   = function() { AE.t1 = performance.now(); return (AE.t1 - AE.t0); }
AE.timerPrint = function(digits) { if (digits == undefined) digits = 2; AE.t1 = performance.now(); return (AE.t1 - AE.t0).toFixed(digits); }