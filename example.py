from socketIO_client import SocketIO, LoggingNamespace

myId = 'demo'

def execute(data):
    success = True
    doCommand = "to be added";
    if success:
        socketIO.emit('complete', {'clientId': myId, 'id': data['id']})

def on_handshake(data):
   print(data)
   for i in data['commands']:
       if not i == None:
           execute(i)

def on_command(data):
    print(data)
    execute(data)

socketIO = SocketIO('localhost', 1999, LoggingNamespace)
socketIO.on('handshake', on_handshake)
socketIO.on('command', on_command)

# Listen
socketIO.emit('handshake', {'id': myId})
socketIO.wait(seconds=1)

# Listen only once
while True:
    socketIO.wait(seconds=1)
