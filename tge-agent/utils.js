import path from 'path';
import fs from 'fs';

/**
 * 
 * @param {string} dir 
 * @param {[string]?} ext ['.js', '.txt']
 * @returns 
 */
const filterFiles = async (dir, ext, includeDirs) => {      
    return fs.readdirSync(dir, { withFileTypes: true })
        .filter(item => (includeDirs || !item.isDirectory()) && (!ext || item.isDirectory() || ext.includes(path.extname(item.name))))
        .map(item => { return { name: item.name, kind: item.isDirectory() ? 'directory' : 'file' }});
}

export { filterFiles }