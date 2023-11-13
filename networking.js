import { Engine } from "./engine.js";
import { Events } from "./events.js";
import { delay } from "./utils.js";

/**
 * Establish and manage unlimited number of connections using ws, wss, http or https protocols
 */

const ImplementsEvents = 'connect disconnect receive error';

class Networking {
    /**
     * Creates a new Networking object and stores reference to it as Engine.net
     * @param {string} host Hostname i.e. "http://localhost:3000"
     * @param {string|null} apiPath Path which is automatically appended to every request right after the host name. Set to "null" if no path is to be appended. No leading or trailing slash.
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
            globalErrorHandler    : errorHandler ? errorHandler : e => { console.error('Networking error:', e); },
            options               : {},
            headers               : {},
            autoDetectContentType : true,
            customValidation      : null,                // provide a custom validation function which will run before the response is passed to your app
            lag                   : 0,            
            lastResponse          : null,
            onReceive             : null,                // this event is fired every time a non-error server response is received 
            retry                 : {
                enabled   : true,
                onRetry   : null,                        // call back when retry is attempted
                onFailed  : null,                        // called if all retries failed
                attempts  : 3,                           // how many times to try before failing?
                count     : 0,                           // current number of retries
                delaySecs : 10                           // how many seconds to wait before retry?
            }
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
    
    req(value = '', payload, requestErrorHandler) {    
        const { host, apiPath, options, headers, retry } = this.connection;

        return new Promise(async resolve => {
            const customOptions = structuredClone(options);
            
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

            this.connection.endpoint = url;                                                         // save the last fetch address
            this.connection.method   = (payload == null) ? 'GET' : 'POST';
            
            retry.count = 0;
            this._doFetch(url, customOptions, requestErrorHandler, resolve);
        });
    }

    _doFetch(url, customOptions, requestErrorHandler, resolve) {
        const { globalErrorHandler, customValidation, retry } = this.connection;
        const requestStartTime = performance.now();
        const connection = this.connection;
        
        fetch(url, customOptions)
                .then(r => { 
                    connection.lag = performance.now() - requestStartTime; 
                    if (r.ok) {                        
                        connection.lastResponse = r;                        
                        return r; 
                    }
                    throw new Error('Networking error');                                            // probably a server error?
                })
                .then(r => this.handleResponse(r))
                .then(v => {                                                                        // we successfully retrieved a response object, place pre-validation here before passing it to user
                    if (customValidation) {
                        const isValid = customValidation(v);
                        if (isValid) return v;
                        throw new Error('Validation failed');
                    }
                    if (v.type == 'json' && !('status' in v.data)) {                                // if no custom validation code is specified, the default code will run and check for 'status' field if the response is a JSON object
                        throw new Error('JSON response is expected to have "status" field');
                    }
                    const evt = { connection, data: v.data };
                    if (connection.onReceive) connection.onReceive(evt);
                    this.events.fire('receive', evt);
                    resolve(v.data);
                })
                .catch(async e => {  
                    const evt = { connection, error: e };
                    if (requestErrorHandler) requestErrorHandler(evt);
                    globalErrorHandler(e);                      
                    this.events.fire('error', { connection, error:e });
                    const o = { status:'error', message:'Networking error', error:e };

                    if (retry.enabled) {
                        if (retry.count < retry.attempts) {
                            retry.count++;                            
                            if (retry.onRetry) retry.onRetry(evt);
                            await delay(Math.ceil(retry.delaySecs * 1000));
                            return this._doFetch(url, customOptions, requestErrorHandler, resolve);
                        }             
                        if (retry.onFailed) retry.onFailed(evt);
                    }
                    resolve(o);
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