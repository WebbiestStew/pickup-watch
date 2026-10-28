import {existsSync} from 'node:fs';
if(existsSync(new URL('../.env.local',import.meta.url))) process.loadEnvFile(new URL('../.env.local',import.meta.url));
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import inventory from '../lib/inventory.js';
const root=fileURLToPath(new URL('../public/',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
http.createServer(async(req,res)=>{
 try {
  const chunks=[];for await(const chunk of req)chunks.push(chunk);
  const request=new Request('http://127.0.0.1:8767'+req.url,{method:req.method,headers:req.headers,...(['GET','HEAD'].includes(req.method)?{}:{body:Buffer.concat(chunks)})});
  const url=new URL(request.url);
  if(url.pathname.startsWith('/api/')||url.pathname==='/healthz'){
   const response=await inventory.fetch(request,{},{});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
  }
  const filename=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
  if(!filename.startsWith(root)){res.writeHead(403);res.end();return;}
  const bytes=await fs.readFile(filename);res.writeHead(200,{'Content-Type':types[path.extname(filename)]||'application/octet-stream'});res.end(bytes);
 }catch(error){res.writeHead(404);res.end('Not found');}
}).listen(8767,'127.0.0.1',()=>console.log('Preview: http://127.0.0.1:8767'));
