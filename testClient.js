'use strict';

var run= Number(process.argv[2])

var Octobus= require('./index.js')
var bus= new Octobus('./structures')
var client= bus('haExample').connect(8181)

var count= 0
console.time('client')
for(var i= 0; run>i; ++i)
client.request({heartbeat: {ping: 1}}, function(res)
{
	if( ++count===run )
		console.timeEnd('client')
	// if( res && res.get('heartbeat').pong )
	// 	console.log('pong')
	// else
	// 	console.log('request timeout')
})