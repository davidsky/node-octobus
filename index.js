'use strict';

require('net-socket-reconnect')
var netBuf= require('net-buffer')
var octobit= require('octobit')
var net= require('net')
var fs= require('fs')

// client open connection and send structName
// if server know the structure, replies with empty msg
// otherwise ends connection

var errorNoDirectory= new Error('Octobus must be initiated with a real path to octobit structures.')

function Octobus(path)
{
	if( !path )
		throw errorNoDirectory

	if( !fs.existsSync(path) )
		throw errorNoDirectory

	return function(args)
	{
		// load and pass structures
		if( undefined===args)
			args= []
		else if( typeof args==='string' )
			args= [args]

		return {
			  struct: {}
			, getStruct: getStruct
			, busArgs: args
			, busPath: path
			, createServer: Server
			, connect: Connect
		}
	}
}

function getStruct(name)
{
	if( this.struct[name] )
		return this.struct[name]
	
	if( this.busArgs.length && -1===this.busArgs.indexOf(name) )
		return

	var path= __dirname+'/'+this.busPath+'/'+name+'.octo.json'
	try{
		var struct= require(path)
		this.struct[name]= new octobit(struct)
		return this.struct[name]
	}
	catch(e){
		console.error('Error: octo structure at "'+path+'" not found')
		return
	}
}

function Server()
{
	var server= net.createServer.apply(null, arguments)
	var $this= this
	server.on('connection', function(socket)
	{
		var struct
		socket.on('readable', netBuf.decode(socket, function(buffer)
		{
			if( undefined===struct )
			{
				// client asking if server knows the structure
				if( undefined!==buffer && (struct= $this.getStruct(buffer.toString())) )
					// confirm by empty response
					return socket.write(netBuf.encode())
				// otherwise 
				return socket.destroy()
			}
			else if( undefined===buffer )
				return socket.destroy()

			var reqId= buffer.readUInt32LE(0)
			
			// no reqId, no reply expected
			if( 0===reqId )
				return server.emit('request', struct.decode(buffer.slice(4)))

			return server.emit('request', struct.decode(buffer.slice(4)), function(obj)
			{
				var buffer= netBuf.encode(struct.encode(obj), 4)
				buffer.writeUInt32LE(reqId, 2)
				return socket.write(buffer)
			})
		}))
	})

	return server
}

var errorRequestTimeout= new Error('timeout')
var errorUnexpectedServerResponse= new Error('Unexpected server response')
var errorClientStruct= new Error('Client (connect) must be initiated with one valid and existing structure name')

function Connect()
{
	var socket= net.connect.apply(null, arguments)

	var requestTimeout= arguments.requestTimeout || 1000
	var requestCount= 0
	var requestCallbacks= {}
	var requestTimeouts= {}
	var structConfirmed= undefined

	var busArgs= this.busArgs

	var struct= this.getStruct(this.busArgs[0])
	if( !struct )
		throw errorClientStruct
	
	socket.write( netBuf.encode(new Buffer(busArgs[0])) )

	socket.request= function(obj, callback)
	{
		var reqId= ++requestCount
		var reqIdStr= (reqId).toString(32)

		// using 16 bit / per socket
		if( requestCount > 4294967290 )
			requestCount= 0
		
		var buffer= netBuf.encode(struct.encode(obj), 4)

		if( callback )
		{
			requestCallbacks[reqIdStr]= callback
			buffer.writeUInt32LE(reqId, 2)

			if( requestTimeout )
			{
				requestTimeouts[reqIdStr]= setTimeout(function()
				{
					callback()
					delete requestCallbacks[reqIdStr]
					delete requestTimeouts[reqIdStr]
				}, requestTimeout)
			}
		}
		else
			buffer.writeUInt32LE(0, 2)

		return socket.write(buffer)
	}

	// TODO on reconnect with structConfirmed retry queries in queue

	socket.on('end', function()
	{
		if( undefined===structConfirmed )
			socket.stopReconnect()
	})

	socket.on('readable', netBuf.decode(socket, function(buffer)
	{
		if( undefined===structConfirmed )
		{
			if( undefined===buffer )
				return structConfirmed= true
			throw errorUnexpectedServerResponse
		}

		var reqId= buffer.readUInt32LE(0)
		var reqIdStr= (reqId).toString(32)
		clearTimeout(requestTimeouts[reqIdStr])
		delete requestTimeouts[reqIdStr]
		if( requestCallbacks[reqIdStr] )
			requestCallbacks[reqIdStr]( struct.decode(buffer.slice(4)) )
		delete requestCallbacks[reqIdStr]
	}))

	return socket
}

module.exports= Octobus