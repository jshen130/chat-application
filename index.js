// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var mongo = require('mongodb').MongoClient;

var PORT = 3000;


server.listen(PORT, function () {
    console.log('Server listening at port %d', PORT);
});

// Routing
app.use(express.static(__dirname + '/public'));

// Chatroom
var numUsers = 0;

io.on('connection', function (socket) {
    var addedUser = false;

    mongo.connect('mongodb://127.0.0.1/chat', function(err, db) {
	if (err) throw err;
	
	var col = db.collection('messages');
	col.find().limit(50).sort({time:1}).toArray(function(err, res) {
	    if (err) throw err;
	    console.log(res);
	});
	
    });		
    

    
    // when the client emits 'new message', this listens and executes
    socket.on('new message', function (data) {
	mongo.connect('mongodb://127.0.0.1/chat', function(err, db) {
	    if (err) throw err;
	    
	    var col = db.collection('messages');
	    var pattern = /^\s*$/;	    
	    if (!pattern.test(data)) {
		col.insert({name: socket.username, message: data, time: new Date}, function() {
		    console.log("Inserted");
		});
		// we tell the client to execute 'new message'
		socket.broadcast.emit('new message', {
		    username: socket.username,
		    message: data
		});		
	    }
	});		
    });

    // when the client emits 'add user', this listens and executes
    socket.on('add user', function (username) {
	if (addedUser) return;

	// we store the username in the socket session for this client
	socket.username = username;
	++numUsers;
	addedUser = true;
	socket.emit('login', {
	    numUsers: numUsers
	});
	// echo globally (all clients) that a person has connected
	socket.broadcast.emit('user joined', {
	    username: socket.username,
	    numUsers: numUsers
	});
    });

    // when the client emits 'typing', we broadcast it to others
    socket.on('typing', function () {
	socket.broadcast.emit('typing', {
	    username: socket.username
	});
    });

    // when the client emits 'stop typing', we broadcast it to others
    socket.on('stop typing', function () {
	socket.broadcast.emit('stop typing', {
	    username: socket.username
	});
    });

    // when the user disconnects.. perform this
    socket.on('disconnect', function () {
	if (addedUser) {
	    --numUsers;

	    // echo globally that this client has left
	    socket.broadcast.emit('user left', {
		username: socket.username,
		numUsers: numUsers
	    });
	}
    });
});
