//Getting all dependencies
var express = require('express');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var app = express();
var bodyParser = require('body-parser');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var uuid = require('node-uuid');

app.set('port', (process.env.PORT || 1999));

app.use( bodyParser.urlencoded({ extended: false }));
app.use( bodyParser.json());

//Setting up cookie use
app.use(cookieParser());

//Setting up session handling
app.use(session({secret: 'p4ls4ysh1'}));

var commandQueue = {};

var createUuid = () => {
  return uuid.v4();
}

app.get('/', (req, res) => {
  res.send({name: 'pal-command', version: '0.1.0'});
});

app.get('/add/:id/:command', (req, res) => {
  var clients = io.sockets.sockets;
  var keys = Object.keys(io.sockets.sockets);
  var commandId = createUuid();
  for (var i = 0; i < keys.length; i++) {
    console.log(clients[keys[i]].id);
    if (clients[keys[i]].id == req.params.id) {
      console.log('Found client and emitting command');
      clients[keys[i]].emit('command', {command: {action: 'basic', text: req.params.command}, id: commandId});
      if (commandQueue[req.params.id]) {
        commandQueue[req.params.id].push({command: {action: 'basic', text: req.params.command}, id: commandId, done: false});
      } else {
        commandQueue[req.params.id] = [{command: {action: 'basic', text: req.params.command}, id: commandId, done: false}];
      }
    }
  }
  res.send({status: 'success', command: req.params.command, id: commandId});
});

app.post('/add/:id', (req, res) => {
  // req.body.command should be a JSON object that can be executed locally
  var command = req.body.command;
  var clients = io.sockets.sockets;
  var keys = Object.keys(io.sockets.sockets);
  var commandId = createUuid();
  for (var i = 0; i < keys.length; i++) {
    console.log(clients[keys[i]].id);
    if (clients[keys[i]].id == req.params.id) {
      console.log('Found client and emitting command');
      clients[keys[i]].emit('command', {command, id: commandId});
      if (commandQueue[req.params.id]) {
        commandQueue[req.params.id].push({command, id: commandId, done: false});
      } else {
        commandQueue[req.params.id] = [{command, id: commandId, done: false}];
      }
    }
  }
  res.send({status: 'success', command, id: commandId});
});

// Debug Path - To be removed in future versions
app.get('/debug/:id', (req, res) => {
  res.send(commandQueue[req.params.id]);
});

io.sockets.on('connection', function(socket){
  socket.on('handshake', function (data) {
    console.log(data);
    socket.id = data.id;
    if(!commandQueue[data.id]) {
      commandQueue[data.id] = [];
    }
    socket.emit('handshake', {name: 'pal-command', version: '0.1.0', commands: commandQueue[data.id].map((e) => {if (e.done == false) { return e;}})});
  });
  socket.on('complete', function(data) {
    var index = -1;
    var commands = [];
    if (commandQueue[data.clientId]) {
      commands = commandQueue[data.clientId];
    } else {
      commands = [];
    }
    for (var i = 0; i < commands.length; i++) {
      if (commands[i].id == data.id) {
        console.log('Marking command as complete');
        commandQueue[data.clientId][i].done = true;
      }
    }
  });
});

http.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
