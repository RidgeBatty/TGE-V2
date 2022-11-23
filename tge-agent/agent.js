import http from 'http';
import fs from 'fs';
import path from 'path';
import { filterFiles } from './utils.js';
import { route, requestListener } from './router.js';

let currentDir = process.cwd();
    
const createRoutes = () => {
    route.get('/cwd', async(req, res) => {        
        res.send({ result:currentDir.replaceAll('\\', '/') });    
    });

    route.get('/dir', async(req, res) => {
        const dir = await filterFiles(currentDir, null, true);
        res.send({ result:dir });    
    });

    route.get('/info/:file', async(req, res) => {        
        res.send({ result:req.params.file });    
    });

    route.get('/dl/:file', async(req, res) => {        
        res.sendFile(req.params.file);    
    });

    route.get('/cd/:folder', (req, res) => {
        if (fs.existsSync(req.params.folder)) {             
            return res.send({ status:'ok' });    
        }
        res.send({ status:'err' });    
    });
}

const main = () => {    
    const settings = JSON.parse(fs.readFileSync('./settings.json', 'utf-8'));
    const { port, host } = settings;
    createRoutes();
    const server = http.createServer(requestListener);
    server.listen(port, host, () => {
        console.log(`HTTP server running at port ${port}`)
    });
}

const test = async() => {
    console.log(await filterFiles('./', null, true));
}
  
main();