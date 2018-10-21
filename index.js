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

  var createCommand = (clientId, commandId, command, group) => {
    if (commandQueue[clientId]) {
      commandQueue[clientId].push({command, id: commandId, done: false, creation: Date.now(), group});
    } else {
      commandQueue[clientIid] = [{command, id: commandId, done: false, creation: Date.now(), group}];
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
        if (commandQueue[clientId][i].group != undefined) {
          notifyGroup(commandQueue[clientId][i]);
        }
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
  var createCommand = (clientId, commandId, command, group) => {
    var newCommand = new Command({
      command,
      clientId,
      id: commandId,
      done: false,
      creation: Date.now(),
      group: group
    });
    newCommand.save();
  }
	var completeCommand = (clientId, commandId) => {
    Command.findOne({id: commandId, clientId}, (err, command) => {
      if (command) {
        command.done = true;
        command.save();
        if (command.group != undefined) {
          notifyGroup(command);
        }
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

var notifyGroup = (command) => {
  console.log(command);
}

// Group Storage and Setup
var groups = {}
var user_to_groups = {}
var listenGroupAuth = (id, groupName, authKey) => {
  if (groups[groupName]) {
    if (groups[groupName].key == authKey) {
      groups[groupName].listeners = groups[groupName].listeners.concat(id);
    } else {
      return { success: false };
    }
  } else {
    groups[groupName] = {};
    groups[groupName].key = authKey;
    groups[groupName].listeners = [id];
    groups[groupName].posters = [];
  }
  if (user_to_groups[id]) {
    user_to_groups[id].listening = user_to_groups[id].listening.concat(groupName);
  } else {
    user_to_groups[id] = { 'listening': [groupName], 'posting': [] }
  }
}

var postGroupAuth = (id, groupName, authKey) => {
  if (groups[groupName]) {
    if (groups[groupName].key == authKey) {
      groups[groupName].posters = groups[groupName].posters.concat(id);
    } else {
      return { success: false };
    }
  } else {
    groups[groupName] = {};
    groups[groupName].key = authKey;
    groups[groupName].listeners = [];
    groups[groupName].posters = [id];
  }
  if (user_to_groups[id]) {
    user_to_groups[id].posting= user_to_groups[id].posting.concat(groupName);
  } else {
    user_to_groups[id] = { 'listening': [], 'posting': [groupName] }
  }
}

var isGroupPoster = (groupName, userId) => {
  if (groups[groupName]) {
    console.log(groups[groupName].posters);
    return groups[groupName].posters.includes(userId);
  } else {
    console.log('Group not found in group auth');
    return false;
  }
}

var getGroupListeners = (groupName) => {
  return groups[groupName].listeners;
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

// Group posting
app.post('/group/permissions/:groupId/:userId', (req, res) => {
    var type = req.body.type;
    var groupName = req.params.groupId;
    var authKey = req.body.auth_key;
    var returnVal = null;
    var userId = req.params.userId;
    console.log('User: ' + userId);
    console.log('Group: ' + groupName);
    if (type == 'post') {
      console.log('Adding post permissions');
      returnVal = postGroupAuth(userId, groupName, authKey);
    } else if (type == 'listen') {
      returnVal = listenGroupAuth(userId, groupName, authKey);
    } else if (type == 'all') {
      returnVal = postGroupAuth(userId, groupName, authKey);
      returnVal = listenGroupAuth(userId, groupName, authKey);
    }
    console.log('authenticated user to group');
    res.send(returnVal);
});

app.post('/group/add/:groupId/:userId', (req, res) => {
  // req.body.command should be a JSON object that can be executed locally
  var command = req.body.command;
  var clients = io.sockets.sockets;
  var keys = Object.keys(io.sockets.sockets);
  var commandIdList = [];
  //console.log(groups);
  //console.log(user_to_groups);
  var unlock = false;
  if (isGroupPoster(req.params.groupId, req.params.userId) || unlock) {
    console.log('authenticated');
    getGroupListeners(req.params.groupId).forEach((data) => {
      var userId = data;
      var commandId = createUuid();
      commandIdList = commandIdList.concat(commandId);
      createCommand(userId, commandId, command, req.params.groupId);
      for (var i = 0; i < keys.length; i++) {
        console.log(clients[keys[i]].id);
        if (clients[keys[i]].id == userId) {
          console.log('Found client and emitting command');
          clients[keys[i]].emit('command', {command, id: commandId});
        }
      }
    });
    console.log('Posted task to group');
    res.send({status: 'success', command, ids: commandIdList});
  } else {
    console.log('authorization failed');
    res.send({ status: 'failure', message: 'not authenticated' });
  }
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
  socket.on('groupauth', function(data) {
    console.log('Authorizing user over sockets');
    var type = data.type;
    var groupName = data.group_name;
    var authKey = data.auth_key;
    var returnVal = null;
    if (type == 'post') {
      returnVal = postGroupAuth(socket.id, groupName, authKey);
    } else if (type == 'listen') {
      returnVal = listenGroupAuth(socket.id, groupName, authKey);
    } else if (type == 'all') {
      returnVal = postGroupAuth(socket.id, groupName, authKey);
      returnVal = listenGroupAuth(socket.id, groupName, authKey);
    }
  });
});

http.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
