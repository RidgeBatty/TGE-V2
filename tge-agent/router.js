import fs from 'fs';

const route = {
    list: [],
    get: function (endpoint, handler) { 
        const params = endpoint.split('/:');
        if (params.length > 0) {            
            endpoint = params[0];
            params.shift();            
        }
        const data = { endpoint, params, handler };
        this.list.push(data);
    }
}

const requestListener = async(req, res) => {    
    res.send = (o, code = 200, type = 'application/json') => { 
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', type);
        res.writeHead(code); 
        res.end(JSON.stringify(o));
    }
    res.sendFile = (filename) => { 
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/octet-stream');
        res.writeHead(200); 
        const file = fs.readFileSync(filename);
        res.write(file);
        res.end();
    }
    
    const r = route.list.find(e => req.url.startsWith(e.endpoint) && (e.params.length == req.url.substring(e.endpoint.length).split('/').length - 1));
    if (r) {
        const sp = req.url.substring(r.endpoint.length + 1).split('/');
        req.params = {};
        for (let i = 0; i < r.params.length; i++) req.params[r.params[i]] = sp[i];        
        return r.handler(req, res);    
    }
    res.send({ error:'Resource not found' }, 404);        
}

const parseBody = (req) => {
    return new Promise((resolve, reject) => {
        let body = ''
        req.on('data', (data) => { body += data; });
        req.on('end', () => { resolve(body); });
    });
}

const parseURL = (req) => {
 //   const ep
}

export { route, requestListener }