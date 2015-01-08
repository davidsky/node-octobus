#Octobus
Fast, simple request/response bus based on [Octobit](https://github.com/davidSky/node-octobit) codec.

## Usage: server
.createServer() and .connect() accept Nodejs's default parameters.
```js
var Octobus= require('octobus')
var bus= new Octobus('./structures') // path to *.octo.json folder
// example directory have one file "heartbeat.octo.json"
var server= bus('haExample').createServer().listen(8181)

server.on('request', function(req, callback)
{
	if( req && req.get('heartbeat').ping )
	 	console.log('ping')
	callback( {heartbeat: {pong: 1} } )
})
```
## Usage: client
.connect() accept Nodejs's default parameters.
```js
var Octobus= require('octobus')
var bus= new Octobus('./structures')
var client= bus('haExample').connect(8181)

client.request({heartbeat: {ping: 1}}, function(res)
{
	 if( res && res.get('heartbeat').pong )
	 	console.log('pong')
	 else
	 	console.log('request timeout')
})
```
> additionally .connect() can accept reconnect options and {requestTimeout: 500}

---
# API
## API: var Bus= new Octobud(pathToStructFolder)
Path must be a valid directory containing structures named *.octo.json

## API: Server= Bus([allowe]).createServer
`allowed` can be an array, string or undefined. When `allowed` is provided server will only server responses to clients requesting `allowed` structures. If client request structure that is not allowed server will destroy client's socket
`createServer` is the default .createServer() from Nodejs's net module.
## API: Server.on('request', function(object, callback){})
`object` is [Octobject](https://github.com/davidSky/node-octobit)
`callback` is not undefiend if client is expecting a response, callback(newObejct)

## API: Client= Bus(structName).connect()
`structuName` must be an existing file in the strctures folder. Each client can .connect() to a server using only one structure name. 
`connect` is the deafult .connect() method from Nodejs's net module with the addition of [reconnect](https://github.com/davidSky/node-net-socket-reconnect) module. Connect will also accept an additional parameter {requestTimeout: 100} 

## API: Client.request(object[, callback])
`object` to send to server
`callback` optional will be called on server's response with received response, unless timeout before in which case called with undefiend


## Installation
```
npm install octobus
```





