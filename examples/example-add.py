import requests as r
import json

server = 'http://localhost:1999/'
client = 'demo'

group = 'test_group'
r.post(server + 'add/' + client, json={'command': {'action': 'basic', 'text': 'Test success?'}})
myId = 'main-client'
r.post(server + 'group/permissions/' + group + '/' + myId, json={
    'type': 'post',
    'auth_key': 'k23j5l2h42'
    });
r.post(server + 'group/add/' + group + '/' + myId, json={'command': {'action': 'basic', 'text': 'Group message post'}})
