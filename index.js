// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var mongo = require('mongodb').MongoClient;

var fs = require("fs");
var msgfile = "messages.db";
var userfile = "users.db";
var msgexists = fs.existsSync(msgfile);
var userexists = fs.existsSync(userfile);
if (!msgexists)
    fs.openSync(msgfile, "w");
if (!userexists)
    fs.openSync(userfile, "w");
var sqlite3 = require("sqlite3").verbose();
var msgdb = new sqlite3.Database(msgfile);
var userdb = new sqlite3.Database(userfile);

var PORT = 3000;


server.listen(PORT, function () {
    console.log('Server listening at port %d', PORT);
});

// Routing
app.use(express.static(__dirname + '/public'));

// Chatroom
var numUsers = 0;

msgdb.serialize(function()  {
    if (!msgexists) {
	msgdb.run('CREATE TABLE Messages ' +
	       '("msg_id" INTEGER PRIMARY KEY AUTOINCREMENT,' +
	       ' FOREIGN KEY(user_id) REFERENCES Users(user_id),' +
	       ' "msg" VARCHAR(255))');
    }

    //var statement = msgdb.prepare("INSERT INTO Messages VALUES (?)");
    // statement.run(params for (?));
    // statement.finalize();
    
});
msgdb.close();

io.on('connection', function (socket) {
    var addedUser = false;
    
    /* get old messages and pass to socket to display
    var col = db.collection('messages');
    col.find().limit(50).sort({_id:1}).toArray(function(err, res) {
	if (err) throw err;
	socket.emit('previous', res);
    });*/
    
    
    // when the client emits 'new message', this listens and executes
    socket.on('new message', function (data) {
	var col = db.collection('messages');
	col.insert(data, function() {
	    console.log("Inserted");
	});
	// we tell the client to execute 'new message'
	socket.broadcast.emit('new message', data);		
	
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
    });
    
    // when the user disconnects.. perform this
    socket.on('disconnect', function () {
	if (addedUser) {
	    --numUsers;		
	}
    });
});

