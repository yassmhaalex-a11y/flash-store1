const http=require('http'),fs=require('fs'),path=require('path');
const handler=require('./api/index.js');
const PORT=process.env.PORT||3000,ROOT=__dirname;
const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon'};
const server=http.createServer((req,res)=>{if(req.url.startsWith('/api/'))return handler(req,res);let p=new URL(req.url,'http://localhost').pathname;if(p==='/'||p==='/index.html')p='/index.html';const file=path.join(ROOT,'public',p.replace(/^\//,''));if(!file.startsWith(path.join(ROOT,'public'))||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end('Not Found')}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res)});server.listen(PORT,()=>console.log('FLASH STORE V15 running on '+PORT));
