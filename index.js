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

var createCommand = (clientId, commandId, command) => {
  if (commandQueue[clientId]) {
    commandQueue[clientId].push({command, id: commandId, done: false});
  } else {
    commandQueue[clientIid] = [{command, id: commandId, done: false}];
  }
}

var completeCommand = (clientId, commandId) => {
  var success = true;
  var index = -1;
  var commands = [];
  if (commandQueue[clientId]) {
    commands = commandQueue[clientId];
  } else {
    commands = [];
  }
  var foundOne = false;
  for (var i = 0; i < commands.length; i++) {
    if (commands[i].id == commandId) {
      foundOne = true;
      console.log('Marking command as complete');
      commandQueue[clientId][i].done = true;
    }
  }
  var message = "None";
  if (!foundOne) {
    message = "Command specified could not be found";
    success = false;
  }
  return {success, message}
}

var getCommands = (clientId) => {
  if(!commandQueue[clientId]) {
    commandQueue[clientId] = [];
  }
  return commandQueue[clientId];
}

app.get('/', (req, res) => {
  res.send({name: 'pal-command', version: '0.1.0'});
});

app.get('/add/:id/:command', (req, res) => {
  var clients = io.sockets.sockets;
  var keys = Object.keys(io.sockets.sockets);
  var commandId = createUuid();
  createCommand(req.params.id, commandId, {action: 'basic', text: req.params.command});
  for (var i = 0; i < keys.length; i++) {
    if (clients[keys[i]].id == req.params.id) {
      console.log('Found client and emitting command');
      clients[keys[i]].emit('command', {command: {action: 'basic', text: req.params.command}, id: commandId});
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
  createCommand(req.params.id, commandId, command);
  for (var i = 0; i < keys.length; i++) {
    console.log(clients[keys[i]].id);
    if (clients[keys[i]].id == req.params.id) {
      console.log('Found client and emitting command');
      clients[keys[i]].emit('command', {command, id: commandId});
    }
  }
  res.send({status: 'success', command, id: commandId});
});

// Endpoints for compatibility with devices that don't support websockets
app.get('/retrieve/:id', (req, res) => {
  var toSend = {name: 'pal-command', version: '0.1.0', commands: getCommands(req.params.id)};
  res.send(toSend);
});

app.post('/complete/:clientId', (req, res) => {
  var data = completeCommand(req.params.clientId, req.body.id);
  if (data.success) {
    res.send({success: data.success});
  } else {
    res.send({success: data.success, message: data.message});
  }
});

// Debug Path - To be removed in future versions
app.get('/debug/:id', (req, res) => {
  res.send(commandQueue[req.params.id]);
});

io.sockets.on('connection', function(socket){
  socket.on('handshake', function (data) {
    console.log(data);
    socket.id = data.id;
    var commands = getCommands(data.id);
    socket.emit('handshake', {name: 'pal-command', version: '0.1.0', commands: commands.map((e) => {if (e.done == false) { return e;}})});
  });
  socket.on('complete', function(data) {
    completeCommand(data.clientId, data.id);
  });
});

http.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
