var fs = require('fs');
var path = require('path');
var http2 = require('http2');
var http = require('http');

// We cache one file to be able to do simple performance tests without waiting for the disk
var cachedFile = fs.readFileSync('./index.html');
var cachedUrl = '/index.html';

// The callback to handle requests
function onRequest(request, response) {
  var requestUrl = request.url === '/' ? '/index.html' : request.url;
  console.log(requestUrl);
  filename = path.join(__dirname, requestUrl);

  // Serving server.js from cache. Useful for microbenchmarks.
  if (requestUrl === cachedUrl) {
    if (response.push) {
      // Also push down the client js, since it's possible if the requester wants
      // one, they want both.
      var push = response.push('/style.css');
      push.writeHead(200);
      fs.createReadStream(path.join(__dirname, '/style.css')).pipe(push);
    } else {
      response.setHeader('Link', '</style.css>; rel=preload; as=style');
    }
    response.end(cachedFile);
  }

  // Reading file from disk if it exists and is safe.
  else if ((filename.indexOf(__dirname) === 0) && fs.existsSync(filename) && fs.statSync(filename).isFile()) {
    response.writeHead(200);
    var fileStream = fs.createReadStream(filename);
    fileStream.pipe(response);
    fileStream.on('finish',response.end);
  }

  // Otherwise responding with 404.
  else {
    response.writeHead(404);
    response.end();
  }
}

// Creating the server in plain or TLS mode (TLS mode is the default)
var server;
var listenOn;
if (process.argv.length < 3 || process.argv[2] !== '--http2') {
  server = http.createServer(onRequest);
  listenOn = 'http://localhost:';
} else {
  server = http2.createServer({
    key: fs.readFileSync(require.resolve('http2/example/localhost.key')),
    cert: fs.readFileSync(require.resolve('http2/example/localhost.crt'))
  }, onRequest);
  listenOn = 'https://localhost:';
}
server.listen(process.env.PORT || 8080);
console.log('Server started -', listenOn + (process.env.PORT || 8080));