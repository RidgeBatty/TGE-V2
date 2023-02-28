import { Engine } from "./engine.js";
import { Events } from "./events.js";

/**
 * Establish and manage unlimited number of connections using ws, wss, http or https protocols
 */

const ImplementsEvents = 'connect disconnect receive error';

class Networking {
    /**
     * Creates a new Networking object and stores reference to it as Engine.net
     * @param {string} host Hostname i.e. "http://localhost:3000"
     * @param {string|null} apiPath Path which is automatically appended to every request right after the host name. Set to "null" if no path is to be appended.
     * @param {errorHandler=} errorHandler Optional errorHandler
     */
    constructor(host, apiPath, errorHandler) {
        const url = new URL(host || location.origin);

        this.gameState   = {};
        this.connections = [];        
        const isSecure   = ['wss:', 'https:'].includes(url.protocol);

        if (['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol)) {
            if (!isSecure) console.warn('Using unsecure communications protocol: ' + url.protocol);
        } else {
            throw 'Unsupported networking protocol: ' + url.protocol;
        }

        this.connection = this.createConnection({
            host                  : url,
            apiPath               : apiPath,
            isSecure,
            protocol              : url.protocol,
            errorHandler          : errorHandler ? errorHandler : _ => { throw 'Networking error!' },
            options               : {},
            headers               : {},
            autoDetectContentType : true,
            customValidation      : null,                                                           // provide a custom validation function which will run before the response is passed to your app
            lag                   : 0,
        });

        this.events = new Events(this, ImplementsEvents);

        Engine.net  = this;
    }

    createConnection(connection) {
        this.connections.push(connection);
        if (connection.protocol.startsWith('ws')) this.initWebSockets(connection);
        return connection;
    }

    async handleResponse(r) {         
        if (this.autoDetectContentType) {
            const h    = [...r.headers]; 
            const type = h.find(e => e[0].toLowerCase() == 'content-type');
            if (type == null) throw 'Content header not found';                        
            if (type[1].includes('json')) return { type:'json', data:await r.json() }
            if (type[1].includes('text')) return { type:'text', data:await r.text() }
            if (type[1].includes('octet-stream')) return { type:'blob', data:await r.blob() }
        } else {                                   
            return { type:'json', data:await r.json() }
        }                    
    }
    
    req(value = '', payload) {    
        const { host, apiPath, options, errorHandler, customValidation, headers } = this.connection;

        return new Promise(async resolve => {
            const customOptions = AE.clone(options);
            if (!('headers' in customOptions)) customOptions.headers = {}
            
            if (payload) {                                                                          // post request                
                customOptions.method = 'POST';
                customOptions.body   =  JSON.stringify(payload);
                customOptions.headers['Content-Type'] = 'application/json';
            }
            if (headers) {                
                Object.assign(customOptions.headers, headers);
            }
            
            const url = apiPath ? host.origin + '/' + apiPath + '/' + value : host.origin + '/' + value;

            const requestStartTime = performance.now();

            fetch(url, customOptions)
                .then(r => { 
                    this.connection.lag = performance.now() - requestStartTime; 
                    if (r.ok) return r; 
                    console.warn(r); 
                    throw new Error('Networking error'); 
                })
                .then(r => this.handleResponse(r))
                .then(v => {                                                                         // we successfully retrieved a response object, place pre-validation here before passing it to user
                    if (customValidation) {
                        const isValid = customValidation(v);
                        if (isValid) return v;
                        throw new Error('Validation failed');
                    }
                    if (v.type == 'json' && !('status' in v.data)) {                                               // if no custom validation code is specified, the default code will run and check for 'status' field if the response is a JSON object
                        throw new Error('JSON response is expected to have "status" field');
                    }
                    resolve(v.data);
                })
                .catch(e => {      
                    this.events.fire('error', { connection:this.connection, error:e });
                    const o = { status:'error', message:'Networking error', error:e };                    
                    resolve(o);
                });
        });   
    }

    initWebSockets(connection) {
        const socket = new WebSocket(connection.host);                                              // Create WebSocket connection.
        connection.webSocket = socket;

        socket.addEventListener('error', e => {                                                     // Error handler
            this.events.fire('error', { connection, event:e });
        });
        
        socket.addEventListener('open', e => {                                                      // Connection opened        
            this.events.fire('open', { connection, event:e });
        });
        
        socket.addEventListener('message', e => {                                                   // Listen for messages
            this.events.fire('receive', { connection, event:e, data:e.data });
        });

        return socket;
    }

    send(data, connection) {
        if (connection == null) var connection = this.connection;
        
        if (connection.webSocket.readyState == 1) connection.webSocket.send(data);
            else this.events.fire('error', { connection, event:null, message:'WebSocket not ready' });            
    }
}

export { Networking }   