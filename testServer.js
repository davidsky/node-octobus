'use strict';

var run= Number(process.argv[2])

var Octobus= require('./index.js')
var bus= new Octobus('./structures')
var server= bus('haExample').createServer().listen(8181)

var count= 0
server.on('request', function(req, callback)
{
	if( ++count===run )
		console.timeEnd('server')
	else if(count===1)
		console.time('server')

	// if( req && req.get('heartbeat').ping )
	// 	console.log('ping')
	callback( {heartbeat: {pong: 1} } )
})
