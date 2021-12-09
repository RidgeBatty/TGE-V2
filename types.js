/**
*   Library of built-in Jflo types
*	Copyright (c) Ridge Batty
*	Updated:
*	24.5.2020, version 1.0
*	28.5.2020, version 1.01 added Color.mix()
*	1.7.2020, version 1.1 overhaul + added Matrix3D		
*	14.2.2021, version 1.11 added Rect.center()
*	28.6.2021, version 1.12 added VectorBase.ToInt()
*	10.8.2021, version 1.2 added Vector.RotateX(), nnnY, nnnZ
*	21.9.2021, version 1.21 Matrix3D renamed to Matrix4x4
*	30.11.2021, version 1.22 added Vector2.fma and static Vector2.Fma 	
*	8.12.2021, version 1.23 added static Vector2|Vector.Lerp
*   9.12.2021, version 1.24 added Rect.isPointInside()
*/
const lerp = (s, e, t) => { return s + (e - s) * t; }
/*

    Text
	
*/
class Text {
	constructor(str, lang = 'en') {  
		this.strings = {};				
		if (typeof str == 'object') this.strings = str;
			else this.strings[lang] = str;	
		
		this.lang = lang;
	}
	clone() {
		return new Text(this.strings, this.lang);
	}
	set text(str) {
		this.strings[this.lang] = str;
	}
	get text() {
		return this.strings[this.lang];
	}
	get languages() {
		return Object.keys(this.strings);
	}
	toString() {
		var count = Object.keys(this.strings).length;		
		if (count == 1) return Object.values(this.strings)[0];
		return count + ' Text(s)';
	}
	static FromString(str) {
		var n = new Text('');		
		try {
			n.strings = JSON.parse(str);
			return n;
		} catch (e) {
			return n;
		}
	}
}

/*

    LineSegment
	
*/
class LineSegment {
	constructor(p0, p1) { // p0:Vector2|null, p1:Vector2|null
		this.p0 = p0 !== undefined ? p0 : Vector2.Zero();
		this.p1 = p1 !== undefined ? p1 : Vector2.Zero();
	}
		
	get length() {
		let x = this.p0.x - this.p1.x;
		let y = this.p0.y - this.p1.y;
		return Math.sqrt(x * x + y * y);
	}
	
	distToPoint(p) {	// p:Vector2
	    function dist2(v, w) { return (v.x - w.x) ** 2 + (v.y - w.y) ** 2 }
		
		let v = this.p0;
		let w = this.p1;
		
		let l2 = dist2(v, w);
		if (l2 == 0) return dist2(p, v);
		let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
		t = Math.max(0, Math.min(1, t));
		
		return Math.sqrt(dist2(p, { x: v.x + t * (w.x - v.x), 
		                            y: v.y + t * (w.y - v.y) }));	
	}
	
	/*
		Returns true if given point (p) is on the line. Optional parameter (epsilon) is the allowed error margin.
	*/
	isPointOn(p, epsilon = 0.001) { // p:Vector2, epsilon:number, return:boolean
		const d1  = Math.sqrt((p.x - this.p0.x) ** 2 + (p.y - this.p0.y) ** 2);
		const d2  = Math.sqrt((p.x - this.p1.x) ** 2 + (p.y - this.p1.y) ** 2);
		const len = this.length;
		
		return (d1 + d2 >= len - epsilon && d1 + d2 <= len + epsilon);
	}
	
	/*
		Returns true if this line intersects the given circle. Circle is a defined by a (center) point and a (radius).
	*/
	intersectsCircle(center, radius) {	// center:Vector2, radius:number, return:boolean
        var dist;
		const p0 = this.p0;
		const p1 = this.p1;
		
        const v1x = p1.x - p0.x;
        const v1y = p1.y - p0.y;
        const v2x = center.x - p0.x;
        const v2y = center.y - p0.y;
        
        const u = (v2x * v1x + v2y * v1y) / (v1y * v1y + v1x * v1x);        

        if(u >= 0 && u <= 1){
            dist = (p0.x + v1x * u - center.x) ** 2 + (p0.y + v1y * u - center.y) ** 2;
        } else {
            dist = u < 0 ?
                  (p0.x - center.x) ** 2 + (p0.y - center.y) ** 2 :
                  (p1.x - center.x) ** 2 + (p1.y - center.y) ** 2;
        }
        return dist < radius * radius;
    }
	
	intersectsLine(l) { // l:LineSegment, return:boolean
		const x1 = this.p0.x;
		const y1 = this.p0.y;
		const x2 = this.p1.x;
		const y2 = this.p1.y;
		
		const x3 = l.p0.x;
		const y3 = l.p0.y;
		const x4 = l.p1.x;
		const y4 = l.p1.y;

		const d = (y4-y3) * (x2-x1) - (x4-x3) * (y2-y1);
		
		if (d == 0) return null; // lines are parallel, no intersection
		
		const a = ((x4-x3)*(y1-y3) - (y4-y3)*(x1-x3)) / d;
		const b = ((x2-x1)*(y1-y3) - (y2-y1)*(x1-x3)) / d;

		return (a >= 0 && a <= 1 && b >= 0 && b <= 1);
	}

	/*
		Get intersection point between this and given line segment 'l'. If segments do not intersect, function returns 'null'.
	*/
	getIntersection(l) { // l:LineSegment, return:Vector2|null
		const x1 = this.p0.x;
		const y1 = this.p0.y;
		const x2 = this.p1.x;
		const y2 = this.p1.y;
		
		const x3 = l.p0.x;
		const y3 = l.p0.y;
		const x4 = l.p1.x;
		const y4 = l.p1.y;
		
		const d = (y4-y3) * (x2-x1) - (x4-x3) * (y2-y1);
		
		if (d == 0) return null;
		
		const a = ((x4-x3)*(y1-y3) - (y4-y3)*(x1-x3)) / d;
		const b = ((x2-x1)*(y1-y3) - (y2-y1)*(x1-x3)) / d;
		
		// calculate coordinates of the intersection of lines:
		const x = x1 + a * (x2 - x1);
		const y = y1 + a * (y2 - y1);
		
		let v = new Vector2(x, y); 
			
		if (a > 0 && a < 1 && b > 0 && b < 1) return v;	// if the point is over either line, return the coordinates

		return null;
	}
	
	/*
		Returns true if given point is on the left side of the line (looking from p0 towards p1)
	*/
	isLeft(v) {
		return !((this.p1.x - this.p0.x) * (v.y - this.p0.y) > (this.p1.y - this.p0.y) * (v.x - this.p0.x));
	}
	
	/*
		Returns the midpoint of this line segment
	*/
	midPoint() {
		 return new Vector2((this.p0.x + this.p1.x) / 2, (this.p0.y + this.p1.y) / 2);
	}
	
	/*
		Returns a new LineSegment which is perpendicular to this line. The starting point of the new line is the mid point of this LineSegment.
	*/
	normal() {		
		var n = this.normalVector();
		var m = this.midPoint();
		 
		return new LineSegment(m, n.add(m));		
	}
	
	/*
		Returns a Vector2 representing a normal vector, perpendicular to this line. The length and position of the returned vector is arbitrary.
	*/
	normalVector() {		 
		return new Vector2(this.p1.y - this.p0.y, this.p0.x - this.p1.x);
	}
	
	/*
		Constructor for LineSegment from individual coordinates of line's start and end points.
	*/
	static FromCoords(x0, y0, x1, y1) {
		return new LineSegment(Vector2.FromCoords(x0, y0), Vector2.FromCoords(x1, y1));
	}	
	
	static isLineSegment(a) {
		return (AE.isObject(a) && a.constructor === LineSegment.prototype.constructor);
	}
}

class BaseColor {
	constructor () {
	}
	toString() {		
        return `{ red: ${this.r}, green: ${this.g}, blue: ${this.b}, alpha: ${this.a} }`;
	}	
	add(other) {
		this.r += other.r;
		this.g += other.g;
		this.b += other.b; 
		this.a += other.a; 
	}
	addScalar(s) {
		this.r += s;
		this.g += s;
		this.b += s; 
		this.a += s; 
	}
	sub(other) {
		this.r -= other.r;
		this.g -= other.g;
		this.b -= other.b; 
		this.a -= other.a; 
	}
	subScalar(s) {
		this.r -= s;
		this.g -= s;
		this.b -= s; 
		this.a -= s; 
	}
	mul(other) {
		this.r *= other.r;
		this.g *= other.g;
		this.b *= other.b; 
		this.a *= other.a; 
	}
	mulScalar(s) {
		this.r *= s;
		this.g *= s;
		this.b *= s; 
		this.a *= s; 
	}
	div(other) {
		this.r /= other.r;
		this.g /= other.g;
		this.b /= other.b; 
		this.a /= other.a; 
	}
	divScalar(other) {
		this.r /= s;
		this.g /= s;
		this.b /= s; 
		this.a /= s; 
	}
}

/*

    LinearColor
	
*/
class LinearColor extends BaseColor {    
    constructor(r, g, b, a) {		
		super();
        this.r = r;
		this.g = g;
		this.b = b;
		this.a = a;
    }
	
	static FromArray(n) {
        if (Array.isArray(n) && n.length == 4) return new LinearColor(n[0], n[1], n[2], n[3]);
        return new LinearColor(0, 0, 0, 0);            
    }
	
	static FromTypeChecked(r, g, b, a) {
		this.r = Number.isFinite(Number(r)) ? Number(r) : 0;
		this.g = Number.isFinite(Number(g)) ? Number(g) : 0;
		this.b = Number.isFinite(Number(b)) ? Number(b) : 0;
		this.a = Number.isFinite(Number(a)) ? Number(a) : 0;
	}
	
	// allows any case and order for color names, ignores (extra) spaces:
	static FromString(s) {
		var s = String(s).replace(/\s/g,''); 			 // trim all whitespace
		var p = s.toLowerCase().slice(1, -1).split(','); // lowercase, remove first and last char, split by comma
		
		if (Array.isArray(p) && p.length == 4) {
			var mockup = {};
			for (var i = 0; i < 4; i++) {
				var n = p[i].split(':'); 
				if (Array.isArray(n) && n.length == 2) mockup[n[0]] = Number(n[1]);
			}			
			if ('red' in mockup && 'green' in mockup && 'blue' in mockup && 'alpha' in mockup) return new LinearColor(mockup.red, mockup.green, mockup.blue, mockup.alpha);			
		}		
		
		return new LinearColor(0, 0, 0, 0);
	}
	
	clone() {
        return new LinearColor(this.r, this.g, this.b, this.a);
    }
	
	/*
		Mix this color with other LinearColor
	*/
	mix(other, delta, alpha) {	// other:LinearColor, delta:number, alpha:number (0..1 for intensity, null to ignore alpha, negative number to mix)		
		this.r = lerp(this.r, other.r, delta);
		this.g = lerp(this.g, other.g, delta);
		this.b = lerp(this.b, other.b, delta);
		
		if (Number.isFinite(alpha)) {
			if (alpha < 0)  this.a = lerp(this.a, other.a, delta);
			if (alpha >= 0) this.a = alpha;
		}
		return this;
	}
}

/*

    Color
	
*/
class Color extends BaseColor {    
    constructor(r, g, b, a) {        
		super();
        this.value = new Uint8ClampedArray([r,g,b,a]);		
    }
	
	get r() { return this.value[0]; }
	get g() { return this.value[1]; }
	get b() { return this.value[2]; }
	get a() { return this.value[3]; }
	set r(v) { this.value[0] = v; }
	set g(v) { this.value[1] = v; }
	set b(v) { this.value[2] = v; }
	set a(v) { this.value[3] = v; }	
	
	static FromArray(n) {
        if (n.length && n.length == 4) return new Color(n[0], n[1], n[2], n[3]);
        return new Color(0, 0, 0, 0);            
    }
	
	static FromCss(str) {
		var c = new Color();
		c.css = str;
		return c;		
	}
	
	clone() {
        return new Color(this.r, this.g, this.b, this.a);
    }
	
	/*
		Returns a CSS representation of the color 
	*/
	get css() {
		return `rgba(${this.r},${this.g},${this.b},${(this.a/255).toFixed(3)})`;
	}
	
	/*
		Sets the color using CSS string representation. 
		The color can be any valid CSS color string, for example 'yellow' or 'rgba(255,160,0,0.5)'.
	*/
	set css(str) {
		var d = AE.newElem(document.body, 'i');
		d.style.color = str;
		var color = getComputedStyle(d).color;
		AE.removeElement(d);
		var comps = color.split(/rgb\(|rgba\(|\,|\)/).filter(Boolean);
		for (var i = 0; i < 3; i++) this.value[i] = parseInt(comps[i], 10);
		this.value[3] = (comps.length == 4) ? parseFloat(comps[3] * 255) : 255;
	}
	
	/* 
		Returns hexadecimal representation of the color. Alpha is ignored by this operation.
	*/
	get hex() {
		var result = '';
		for (var i = 0; i < 3; i++) result += AE.pad(this.value[i].toString(16), 2);			
		return result;
	}
	
	/*
		Sets the color from hexadecimal string data. The string length must be 6 characters and contain an RGB triplet. Alpha is set to full opacity.
	*/
	set hex(str) {
		if (str.length == 6) {
			this.r = parseInt(str[0] + str[1], 16);
			this.g = parseInt(str[2] + str[3], 16);
			this.b = parseInt(str[4] + str[5], 16);
			this.a = 255;
		}
	}
	
	/*
		Returns a 4-component array containing red, green, blue and alpha values respectively
	*/
	get array() {
		return Array.from(this.value);
	}
	
	/*
		Sets the color from an array of 4 component values: red, green, blue and alpha. The array length must be exactly 4 elements.
	*/
	set array(n) {
		if (Array.isArray(n) && n.length == 4) this.value.from(n);
	}
}

/*

    Rect
	
*/
class Rect {    
    constructor(left, top, right, bottom) {        
        Object.assign(this, { left, top, right, bottom });
    }

/* Takes two arbitrary points (Vector2) and converts it to a valid rectangle */         
    static FromVectors(a, b) {                
        return new Rect( Math.min(a.x, b.x), Math.min(a.y, b.y),
                         Math.max(a.x, b.x), Math.max(a.y, b.y));       
    }
	
    static FromArray(n) {
        if (Array.isArray(n) && n.length == 4) return new Rect(n[0], n[1], n[2], n[3]);
        return new Rect(0, 0, 0, 0);            
    }

	static FromStruct(o) {
		return new Rect(o.left, o.top, ('width' in o) ? o.width + o.left : o.right, ('height' in o) ? o.height + o.top : o.bottom);
	}
	
    clone() {
        return new Rect(this.left, this.top, this.right, this.bottom);
    }
	
    get width() {
        return this.right - this.left;
    }
	
    get height() {
        return this.bottom - this.top;
    }
	
	get center() {
		return new Vector2(this.left + (this.right - this.left) / 2, this.top + (this.bottom - this.top) / 2);
	}
	
	toString() {
		var arr    = [];
        var me     = this;
        Object.keys(me).forEach((key) => { arr.push(key + ': ' + me[key]); });
        return '{ ' + arr.join(', ') + ' }';
	}

	/**
	 * Check if a point (vector2) is inside this rectangle.
	 * @param {Vector2} v The point
	 * @param {boolean} includeEdges Pass test if the point is on the edge of the rectangle
	 * @returns {boolean}
	 */
	isPointInside(v, includeEdges) {
		if (includeEdges) return !(v.x <= this.left || v.y <= this.top || v.x >= this.right || v.y >= this.bottom);
		return !(v.x < this.left || v.y < this.top || v.x > this.right || v.y > this.bottom);
	}
}

/*

    Vectorbase - ultimate ancestor of Vector2, Vector and Vector4 classes
	
*/
class VectorBase {
    constructor() {
		
    }
	/*
		Assigns source vector 'vec' into this vector. 
		Source vector can be of any length. Only properties which exist and contain numbers are copied.
	*/
	set(vec) {		// vec:VectorBase
		Object.keys(this).forEach((key) => { if (key in vec && isFinite(vec[key])) this[key] = vec[key]; });        
	}
	
    toArray() {
        var result = [];
        Object.keys(this).forEach((key) => { result.push(this[key]); });        
        return result;
    }  

	/*
		Returns the length of this vector
	*/	
    get length() {
        return Math.sqrt(this.x ** 2 + this.y ** 2);
    }
	
    normalize() {		
        return this.divScalar(this.length);
    }
	
	negate() {
		this.mulScalar(-1);
		return this;
	}
	
	/*
		Returns vector as a string for display purposes
		Each vector component is separated by a space
		Each vector component consists of name and value pairs, separated by colon
		i.e. X:50 Y:20 Z:4
	*/
	asString(displayPrecision = 2) {		
	    let arr = [];
        let me  = this;
		Object.keys(me).forEach((key) => { arr.push(key + ':' + me[key].toFixed(displayPrecision)) });		
		return arr.join(' ');
	}
	
	/* 
		Converts this vector to JSON object
	*/
    toString() {
        let arr = [];
        let me  = this;
		Object.keys(me).forEach((key) => { arr.push(key + ': ' + me[key]); });
		return '{ ' + arr.join(', ') + ' }';		
    }
		
	static IsEqual(a, b) {		
		let va = Object.values(a);
		let vb = Object.values(b);
		if (va.length != vb.length) return false;
		for (var i = va.length; i--;) if (va[i] != vb[i]) return false;
		return true;
	}    
	
	static FromArray(a) {
		let me = new this();		
        Object.keys(me).forEach( (key) => me[key] = a.shift() );
		return me;
	}
	
	static FromCoords(...args) { 
		switch (args.length) {
			case 2: return new Vector2(args[0], args[1]);
			case 3: return new Vector(args[0], args[1], args[2]);
			case 4: return new Vector4(args[0], args[1], args[2], args[3]);
		}	
		throw 'No constructor found for given arguments';
	}
	
	static ToInt(v) {
		switch (Object.keys(v).length) {
			case 2: return new Vector2(Math.floor(v.x), Math.floor(v.y));
			case 3: return new Vector(Math.floor(v.x), Math.floor(v.y), Math.floor(v.z));
			case 4: return new Vector4(Math.floor(v.x), Math.floor(v.y), Math.floor(v.z), Math.floor(v.w));
		}
	}

	/**
	 * @desc Returns a random vector with each component set to a number in 0>=n<1 range
	 * @param {number} components 
	 * @returns {Vector2|Vector|Vector4}
	 */
	static Random() {			
		const p = Math.random() * Math.PI * 2; 	
		switch (this.name) {
			case 'Vector2' : return new Vector2(Math.random(), Math.random());
			case 'Vector'  : return new Vector(Math.random(), Math.random(), Math.random());
			case 'Vector4' : return new Vector4(Math.random(), Math.random(), Math.random(), Math.random());
		}
	}

	/**
	 * @desc Returns a random unit vector
	 * @param {number} components 
	 * @returns {Vector2|Vector}
	 */
	static RandomDir() {
		const p = Math.random() * Math.PI * 2; 	
		switch (this.name) {
			case 'Vector2' : return new Vector2(Math.cos(p), Math.sin(p));		
			case 'Vector'  : {
				const cosTheta = 2 * random() - 1;
				const sinTheta = Math.sqrt(1 - cosTheta ** 2);
				return new Vector(sinTheta * Math.cos( p ), sinTheta * Math.sin( p ), cosTheta);				
			}		
		}
	}
}

/*

     Vector 
      - 3 component vector

*/
class Vector extends VectorBase {
    constructor(x,y,z) {
        super();
        Object.assign(this, { x,y,z });
    }	
    clone() {        
        return new Vector(this.x, this.y, this.z);
    }    
    add(vec) {
        this.x += vec.x;
        this.y += vec.y;        
        this.z += vec.z;
        return this;        
    }
    addScalar(s) {
        this.x += s;
        this.y += s;        
        this.z += s;
        return this;
    }
    sub(vec) {
        this.x -= vec.x;
        this.y -= vec.y;
        this.z -= vec.z;
        return this;                
    }
    subScalar(s) {
        this.x -= s;
        this.y -= s;
        this.z -= s;
        return this;                
    }    
    mul(vec) {
        this.x *= vec.x;
        this.y *= vec.y;
        this.z *= vec.z;
        return this;        
    }
    mulScalar(s) {
        this.x *= s;
        this.y *= s;
        this.z *= s;
        return this;        
    }
    div(vec) {
        this.x /= vec.x;
        this.y /= vec.y;
        this.z /= vec.z;
        return this;        
    }
    divScalar(s) {
        this.x /= s;
        this.y /= s;
        this.z /= s;
        return this;        
    }    
    dot(vec) {
        return this.x * vec.x + this.y * vec.y + this.z * vec.z;
    }
	rotateX(angle) {
		var z0 = this.z;
        var y0 = this.y;
		const cos = Math.cos(angle);
		const sin = Math.sin(angle);
        this.z = z0 * cos - y0 * sin;
		this.y = y0 * cos + z0 * sin;
		return this;
	}
	rotateY(angle) {
		var z0 = this.z;
        var x0 = this.x;
		const cos = Math.cos(angle);
		const sin = Math.sin(angle);
        this.z = z0 * cos - x0 * sin;
		this.x = x0 * cos + z0 * sin;
		return this;
	}
	rotateZ(angle) {
		var x0 = this.x;
        var y0 = this.y;
		const cos = Math.cos(angle);
		const sin = Math.sin(angle);
        this.x = x0 * cos - y0 * sin;
		this.y = y0 * cos + x0 * sin;
		return this;
	}
	
    static Add(a, b) {
        return new Vector(a.x + b.x, a.y + b.y, a.z + b.z);
    }       
    static Sub(a, b) {
        return new Vector(a.x - b.x, a.y - b.y, a.z - b.z);
    }
    static Mul(a, b) {
        return new Vector(a.x * b.x, a.y * b.y, a.z * b.z);
    }
    static Div(a, b) {
        return new Vector(a.x / b.x, a.y / b.y, a.z / b.z);
    }

    static AddScalar(a, s) {
        return new Vector(a.x + s, a.y + s, a.z + s);
    }       
    static SubScalar(a, s) {
        return new Vector(a.x - s, a.y - s, a.z - s);
    }
    static MulScalar(a, s) {
        return new Vector(a.x * s, a.y * s, a.z * s);
    }
    static DivScalar(a, s) {
        return new Vector(a.x / s, a.y / s, a.z / s);
    }
	
	static Distance(a, b) {
		return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2 + (b.z - a.z) ** 2);
	}
	
	static Dot(a, b) {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }
	
	static Cross(a, b) {
		return new Vector(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
	}
	
    static Zero() { return new Vector(0,0,0); }
    static FromStruct(a) { return new Vector2(a.x, a.y, a.z) }
	static IsVector(a) { return (AE.isObject(a) && a.constructor === Vector.prototype.constructor); }
	
	/**
	 * 
	 * @param {Vector} v1 
	 * @param {Vector} v2 
	 * @param {Number} f Factor
	 * @returns {Vector} New Vecto
	 */
	 static Lerp(v1, v2, f) {
		return new Vector(lerp(v1.x,v2.x, f), lerp(v1.y,v2.y, f), lerp(v1.z,v2.z, f));		
	}
}

/*

     Vector2 
      - 2 component vector

*/
class Vector2 extends VectorBase {
    constructor (x, y) {
        super();
        Object.assign(this, { x,y });        
    }   
	
    clone() {        
        return new Vector2(this.x, this.y);
    }  
	
    add(vec) {
        this.x += vec.x;
        this.y += vec.y; 
        return this;       
    }
	
    addScalar(s) {
        this.x += s;
        this.y += s;        
        return this;
    }
	
    sub(vec) {
        this.x -= vec.x;
        this.y -= vec.y;
        return this;        
    }
	
    subScalar(s) {
        this.x -= s;
        this.y -= s;        
        return this;
    } 
	
    mul(vec) {
        this.x *= vec.x;
        this.y *= vec.y;
        return this;        
    }
    mulScalar(s) {
        this.x *= s;
        this.y *= s;        
        return this;
    }
	
    div(vec) {
        this.x /= vec.x;
        this.y /= vec.y;
        return this;        
    }
	
    divScalar(s) {
        this.x /= s;
        this.y /= s;        
        return this;
    }  
	
    dot(vec) {
        return this.x * vec.x + this.y * vec.y;
    } 

	fma(v1, v2) {
		this.x * v1.x + v2.x;
		this.y * v1.y + v2.y;
		return this;
	}
	
	/* Clockwise rotation. X-axis point to right, Y-axis points down. Angle is given in radians. Zero angle points to right. */
	displace(angle, distance) {
		this.x -= Math.sin(angle) * distance;
		this.y += Math.cos(angle) * distance;        
		return this;
	}
	
	/* Clockwise rotation. X-axis point to right, Y-axis points down. Angle is given in radians. Zero angle points to right. */
	rotate(angle) {
		var x0 = this.x;
        var y0 = this.y;
		const cos = Math.cos(angle);
		const sin = Math.sin(angle);
        this.x = x0 * cos - y0 * sin;
		this.y = y0 * cos + x0 * sin;
		return this;
	}

    static Add(a, b) {
        return new Vector2(a.x + b.x, a.y + b.y);
    }       
    static Sub(a, b) {
        return new Vector2(a.x - b.x, a.y - b.y);
    }
    static Mul(a, b) {
        return new Vector2(a.x * b.x, a.y * b.y);
    }
    static Div(a, b) {
        return new Vector2(a.x / b.x, a.y / b.y);
    }
    static AddScalar(a, b) {
        return new Vector2(a.x + b, a.y + b);
    }       
    static SubScalar(a, b) {
        return new Vector2(a.x - b, a.y - b);
    }
    static MulScalar(a, b) {
        return new Vector2(a.x * b, a.y * b);
    }
    static DivScalar(a, b) {
        return new Vector2(a.x / b, a.y / b);
    }
	
	static Rotate(v, angle) {
		var vec = new Vector2(v.x, v.y);
		var x0 = vec.x;
        var y0 = vec.y;
		const cos = Math.cos(angle);
		const sin = Math.sin(angle);
        vec.x = x0 * cos - y0 * sin;
		vec.y = y0 * cos + x0 * sin;
		return vec;
	}
	static Distance(a, b) {
		return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
	}
	static Negate(v) {
		return mulScalar(v, -1);		
	}
	static Dot(a, b) {
        return a.x * b.x + a.y * b.y;
    } 
	static Fma(m1, m2, a) {
		return new Vector2(m1.x * m2.x + a.x, m1.y * m2.y + a.y);
	}
	/**
	 * Returns angle between two vectors.
	 * @param {Vector2} v1 
	 * @param {Vector2} v2 
	 * @returns {number} Angle in radians
	 */
	static AngleBetween(v1, v2) {
		return Math.atan2(v2.y, v2.x) - Math.atan2(v1.y, v1.x);
	}
    static Zero() { return new Vector2(0, 0); }
	static Down() { return new Vector2(0, 1); }
	static Up() { return new Vector2(0, -1); }
	static Left() { return new Vector2(-1, 0); }
	static Right() { return new Vector2(1, 0); }
    static FromStruct(a) { return new Vector2(a.x, a.y) }	
	
	/**
	 * 
	 * @param {number} angle 
	 * @param {number=1} scale 
	 * @returns {Vector2}
	 */
	static FromAngle(angle, scale = 1) { return new Vector2(Math.sin(angle) * scale, -Math.cos(angle) * scale); }
	static IsVector2(a) { return (AE.isObject(a) && a.constructor === Vector2.prototype.constructor); }

	/**
	 * Lineraly interpolates the components of two vectors
	 * @param {Vector2} v1 
	 * @param {Vector2} v2 
	 * @param {number} f Factor
	 * @returns {Vector2}
	 */
	static Lerp(v1, v2, f) {
		return new Vector2(lerp(v1.x,v2.x, f), lerp(v1.y,v2.y, f));
	}
}

/*

     Vector4 
      - 4 component vector

*/
class Vector4 extends VectorBase {
    constructor (x, y, z, w) {
        super();
        Object.assign(this, { x,y,z,w });        
    }
    clone() {        
        return new Vector(this.x, this.y, this.z, this.w);
    }        
    add(vec) {
        this.x += vec.x;
        this.y += vec.y;
        this.z += vec.z;
        this.w += vec.w;
        return this;
    }    
    addScalar(s) {
        this.x += s;
        this.y += s;
        this.z += s;
        this.w += s;
        return this;
    }    
    sub(vec) {
        this.x -= vec.x;
        this.y -= vec.y;
        this.z -= vec.z;
        this.w -= vec.w;
        return this;
    }    
    subScalar(s) {
        this.x -= s;
        this.y -= s;
        this.z -= s;
        this.w -= s;
        return this;
    }    
    mul(vec) {
        this.x *= vec.x;
        this.y *= vec.y;
        this.z *= vec.z;
        this.w *= vec.w;
        return this;
    }
    mulScalar(s) {
        this.x *= s;
        this.y *= s;
        this.z *= s;
        this.w *= s;
        return this;
    }
    div(vec) {
        this.x /= vec.x;
        this.y /= vec.y;
        this.z /= vec.z;
        this.w /= vec.w;
        return this;
    }
    divScalar(s) {
        this.x /= s;
        this.y /= s;
        this.z /= s;
        this.w /= s;
        return this;
    }    
    dot(vec) {
        return this.x * vec.x + this.y * vec.y + this.z * vec.z + this.w * vec.w;
    }        
	static Dot(a, b) {
        return a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
    }        
    static Zero() { return new Vector(0,0,0,0); }
    static FromStruct(a) { return new Vector2(a.x, a.y, a.z, a.w) }	
	static IsVector4(a) { return (AE.isObject(a) && a.constructor === Vector4.prototype.constructor); }
}  

class Matrix4x4 {
	constructor(arr) {
		if (arr == null) this.values = new Float64Array(16);
			else {
				if (Array.isArray(arr) && arr.length != 16) throw 'Invalid matrix initialization';
				this.values = Float64Array.from(arr);
			}
	}
	
	mul(mat) {
		let row0 = new Vector4(mat[ 0], mat[ 1], mat[ 2], mat[ 3]);
		let row1 = new Vector4(mat[ 4], mat[ 5], mat[ 6], mat[ 7]);
		let row2 = new Vector4(mat[ 8], mat[ 9], mat[10], mat[11]);
		let row3 = new Vector4(mat[12], mat[13], mat[14], mat[15]);

		let result0 = this.mulVector(row0);
		let result1 = this.mulVector(row1);
		let result2 = this.mulVector(row2);
		let result3 = this.mulVector(row3);

		return new Matrix4x4([
			result0.x, result0.y, result0.z, result0.w,
			result1.x, result1.y, result1.z, result1.w,
			result2.x, result2.y, result2.z, result2.w,
			result3.x, result3.y, result3.z, result3.w
		]);
	}
	
	mulVector(vec4) {
		let c0r0 = matrix[ 0], c1r0 = matrix[ 1], c2r0 = matrix[ 2], c3r0 = matrix[ 3];
		let c0r1 = matrix[ 4], c1r1 = matrix[ 5], c2r1 = matrix[ 6], c3r1 = matrix[ 7];
		let c0r2 = matrix[ 8], c1r2 = matrix[ 9], c2r2 = matrix[10], c3r2 = matrix[11];
		let c0r3 = matrix[12], c1r3 = matrix[13], c2r3 = matrix[14], c3r3 = matrix[15];		
		
		let x = vec4.x;
		let y = vec4.y;
		let z = vec4.z;
		let w = vec4.w;
		
		let rX = (x * c0r0) + (y * c0r1) + (z * c0r2) + (w * c0r3);  
		let rY = (x * c1r0) + (y * c1r1) + (z * c1r2) + (w * c1r3);
		let rZ = (x * c2r0) + (y * c2r1) + (z * c2r2) + (w * c2r3);
		let rW = (x * c3r0) + (y * c3r1) + (z * c3r2) + (w * c3r3);				
		
		return new Vector4(rX, rY, rZ, rW);
	}
	
	setValue(row, col, value) {
		this.values[row * 4 + col] = value;
	}
	
	getValue(row, col) {
		return this.values[row * 4 + col];
	}
	
	toCSSMatrix() {
		return 'matrix3d(' + this.values.join(',') + ')';
	}
	
	fromCSSMatrix(str) {
		try {
			let a = str.toLowerCase().trim().split('matrix3d(')[1].split(')')[0].split(',');
			if (Array.isArray(a) && a.length == 16) {
				for (var i = 16; i--;) { 
					let t = parseFloat(a[i]); 
					if (!isNaN(t) && isFinite(t)) a[i] = t; 
						else return null 
				}
				return new Matrix3D(a);
			}
		} catch (e) {
			return null;
		}
	}
	
	setTranslation(vec3) {
		this.setIdentity();
		this.values[12] = vec3.x;
		this.values[13] = vec3.y;
		this.values[14] = vec3.z;
		return this;
	}
	
	setScaleUniform(scalar) {
		this.setIdentity();
		this.values[0]  = scalar;
		this.values[5]  = scalar;
		this.values[10] = scalar;
		return this;
	}
	
	setScale(vec3) {
		this.setIdentity();
		this.values[0]  = vec3.x;
		this.values[5]  = vec3.y;
		this.values[10] = vec3.z;
		return this;
	}
	
	setRotationX(angle) {
		this.setIdentity();
		this.values[5]  = Math.cos(angle);
		this.values[6]  = -Math.sin(angle);
		this.values[9]  = Math.sin(angle);
		this.values[10] = Math.cos(angle);
		return this;
	}
	
	setRotationY(angle) {
		this.setIdentity();
		this.values[0]  = Math.cos(angle);
		this.values[2]  = Math.sin(angle);
		this.values[8]  = -Math.sin(angle);
		this.values[10] = Math.cos(angle);
		return this;
	}
	
	setRotationZ(angle) {
		this.setIdentity();
		this.values[0]  = Math.cos(angle);
		this.values[1]  = -Math.sin(angle);
		this.values[4]  = Math.sin(angle);
		this.values[5]  = Math.cos(angle);
		return this;
	}
	
	setIdentity() {
		this.values = Float64Array.of(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
		return this;
	}
	
	static Identity() {
		return new Matrix3D([1, 0, 0, 0,
							 0, 1, 0, 0,
							 0, 0, 1, 0,
							 0, 0, 0, 1]);
	}
}

function IntToWord(i) {
    i &= 0xFFFF;
    let hiByte = i >> 8;
    let loByte = i & 0xFF;
    return { hiByte, loByte }
}

function IntToDWord(i) {
    i &= 0xFFFFFFFF;
    let byte0 = i >> 24;
    let byte1 = (i >> 16) & 0xFF;
    let byte2 = (i >> 8) & 0xFF;
    let byte3 = i & 0xFF;
    return { byte0, byte1, byte2, byte3 }
}    

// Convenience functions to avoid 'new' keyword cluttering the code. If mapped to local context with 'const { CreateVector2:Vec2 } = Types;' the code can be made very compact.
const CreateVector2 = (x, y) => { return new Vector2(x, y); }
const CreateVector = (x, y, z) => { return new Vector(x, y, z); }
const CreateVector4 = (x, y, z, w) => { return new Vector4(x, y, z, w); }

export {
    Rect,
	Matrix4x4,
    VectorBase,
    Vector2,
    Vector,
    Vector4,
	Color,
	LinearColor,
    IntToWord,
    IntToDWord,
	LineSegment,
	Text,
	CreateVector2,
	CreateVector,
	CreateVector4
}