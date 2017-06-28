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

// Setup command queue and determine DB vs. in-memory var
// a little messy, but gets the job done
var DB_ACTIVE = true;

var createUuid = () => {
  return uuid.v4();
}

if (!DB_ACTIVE) {
  var commandQueue = {};

  var createCommand = (clientId, commandId, command) => {
    if (commandQueue[clientId]) {
      commandQueue[clientId].push({command, id: commandId, done: false, creation: Date.now()});
    } else {
      commandQueue[clientIid] = [{command, id: commandId, done: false, creation: Date.now()}];
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
    return new Promise((fulfill, reject) => {
      if(!commandQueue[clientId]) {
        commandQueue[clientId] = [];
      }
      fulfill(commandQueue[clientId]);
    });
  }
} else {
  // Initialze DB query var
	var mongoose = require('mongoose');
  var config = require('./config.json');
  db = mongoose.connect(`mongodb://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`);
  const commandSchema = new mongoose.Schema({
    clientId: String,
    command: mongoose.Schema.Types.Mixed,
    id: String,
    done: Boolean,
    creation: Number,
  });
  const Command = mongoose.model('Command', commandSchema);
  var createCommand = (clientId, commandId, command) => {
    var newCommand = new Command({
      command,
      clientId,
      id: commandId,
      done: false,
      creation: Date.now(),
    });
    newCommand.save();
  }
	var completeCommand = (clientId, commandId) => {
    Command.findOne({id: commandId, clientId}, (err, command) => {
      if (command) {
        command.done = true;
        command.save();
      } else {
        console.log('Error: No command found for supplied command ID and client ID');
      }
    });
	}
  var getCommands = (clientId) => {
    return new Promise((fulfill, reject) => {
      Command.find({clientId, done: false}, (err, commands) => {
        fulfill(commands);
      });
    });
  }
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
  getCommands(req.params.id).then((commands) => {
    var toSend = {name: 'pal-command', version: '0.1.0', commands};
    res.send(toSend);
  });
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
    getCommands(data.id).then((commands) => {
      socket.emit('handshake', {name: 'pal-command', version: '0.1.0', commands: commands.map((e) => {if (e.done == false) { return e;}})});
    });
  });
  socket.on('complete', function(data) {
    completeCommand(data.clientId, data.id);
  });
});

http.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
