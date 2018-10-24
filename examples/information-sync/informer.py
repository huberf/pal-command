from socketIO_client import SocketIO, LoggingNamespace
import time

myId = 'informer'

def execute(data):
    global socketIO
    success = True
    if data['command']['type'] == 'datarequest':
        if data['command']['data'] == 'system_time':
            print(data)
            # Now post time
            socketIO.emit('addtogroup', {
                'id': myId,
                'groupId': 'inform_group',
                'command': {
                    'type': 'dataresponse',
                    'data': 'system_time',
                    'val': time.time()
                    }
                });
    else:
        #success = False
        print('Can\'t process specified action.')
        print(data)
    if success:
        socketIO.emit('complete', {'clientId': myId, 'id': data['id']})

def on_handshake(data):
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

print("Authorizing with group");
socketIO.emit('groupauth', {
    'id': myId,
    'group_name': 'request_group',
    'auth_key': 'k23j5l2h42',
    'type': 'listen'
    });
socketIO.emit('groupauth', {
    'id': myId,
    'group_name': 'inform_group',
    'auth_key': 'k23j5l2h42',
    'type': 'post'
    });
socketIO.wait(seconds=1);

# Listen only once
while True:
    socketIO.wait(seconds=1)
