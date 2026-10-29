import {mkdir,cp,rm,writeFile} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});
await mkdir('dist');
for(const path of ['index.html','css','js','data']) await cp(path,`dist/${path}`,{recursive:true,filter:p=>!p.split('/').some(s=>s.startsWith('._')||s==='.DS_Store')});
await writeFile('dist/.assetsignore','**/._*\n._*\n**/.DS_Store\n.DS_Store\n');
console.log('Web preparada en dist/; credenciales, backend y herramientas excluidos.');
