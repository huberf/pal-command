import requests as r
import json

server = 'http://localhost:1999/'
client = 'demo'

r.post(server + 'add/' + client, json={'command': {'action': 'basic', 'text': 'Test success?'}})
