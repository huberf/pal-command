from socketIO_client import SocketIO, LoggingNamespace
import time

myId = 'requester'

def execute(data):
    success = True
    if data['command']['type'] == 'dataresponse':
        print('System time is: ' + str(data['command']['val']))
        # Now request time again
        time.sleep(1) # Wait 1 second before new request
        socketIO.emit('addtogroup', {
            'id': myId,
            'groupId': 'request_group',
            'command': {
                'type': 'datarequest',
                'data': 'system_time'
                }
            });
    else:
        #success = False
        print('Can\'t process specified action.')
        print(data)
    if success:
        socketIO.emit('complete', {'clientId': myId, 'id': data['id']})

def on_handshake(data):
   print(data)
   for i in data['commands']:
       if not i == None:
           execute(i)

def on_command(data):
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
    'type': 'post'
    });
socketIO.emit('groupauth', {
    'id': myId,
    'group_name': 'inform_group',
    'auth_key': 'k23j5l2h42',
    'type': 'listen'
    });
socketIO.emit('addtogroup', {
    'id': myId,
    'groupId': 'request_group',
    'command': {
        'type': 'datarequest',
        'data': 'system_time'
        }
    });
socketIO.wait(seconds=1);

# Listen only once
while True:
    socketIO.wait(seconds=1)
