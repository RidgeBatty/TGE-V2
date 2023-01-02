import { Engine } from "./engine.js";
import { Events } from "./events.js";

/**
 * Establish and manage unlimited number of connections using ws, wss, http or https protocols
 */

const ImplementsEvents = 'connect disconnect receive error';

class Networking {
    constructor(host, apiPath, errorHandler) {
        const url = new URL(host || location.origin);

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
        });

        this.events = new Events(this, ImplementsEvents);

        Engine.net  = this;
    }

    createConnection(connection) {
        this.connections.push(connection);
        if (connection.protocol.startsWith('ws')) this.initWebSockets(connection);
        return connection;
    }
    
    async req(value = '', payload) {    
        const { host, apiPath, options, autoDetectContentType, errorHandler, customValidation, headers } = this.connection;

        return new Promise((resolve, reject) => {
            let isJson  = false;            
            
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
            
            const url = host.origin + '/' + apiPath + '/' + value;

            const result = fetch(url, customOptions)
                .then(r => { if (r.ok) return r; else { console.warn(r); throw 'Networking error'; } })
                .then(r => {         
                    if (autoDetectContentType) {
                        const h    = [...r.headers]; 
                        const type = h.find(e => e[0].toLowerCase() == 'content-type');
                        if (type == null) throw 'Content header not found';                        
                        if (type[1].includes('json')) { isJson = true; return r.json(); }
                        if (type[1].includes('text')) return r.text(); 
                        if (type[1].includes('octet-stream')) return r.blob(); 
                    } else {                        
                        isJson = true;
                        return r.json(); 
                    }                    
                })
                .then(v => {                                                                         // we successfully retrieved a response object, place pre-validation here before passing it to user
                    if (customValidation) {
                        const r = customValidation(v);
                        if (r) return v;
                        throw 'Validation failed';
                    }
                    if (isJson && !('status' in v)) {                                               // if no custom validation code is specified, the default code will run and check for 'status' field if the response is a JSON object
                        throw 'JSON response is expected to have "status" field';
                    }
                    return v;
                })
                .catch(e => { 
                    console.warn('Rejecting promise', e);
                    return reject({ status:'error', message:'Networking error', e });
                });

            resolve(result);                                                                        // finally, fulfill the promise and return the result
        }).catch(async e => {                   
            if (errorHandler) await errorHandler(e);
            this.events.fire('error', e);
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