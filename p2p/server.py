import sys
import json

from pprint import pprint
from twisted.internet import reactor
from twisted.python import log
from twisted.web.server import Site
from twisted.web.static import File

from autobahn.twisted.websocket import WebSocketServerFactory, \
    WebSocketServerProtocol, \
    listenWS

class BroadcastServerProtocol(WebSocketServerProtocol):

    def onOpen(self):
        self.factory.register(self)

    def onMessage(self, payload, isBinary):
        if not isBinary:
            
            try:
                data_string = json.loads(payload.decode('utf8'))
                if type(data_string) is dict:
                    if 'register' in data_string:
                        client = [client for client in self.factory.clients if client["peer"] == self.transport.getPeer()][0]
                        if 'username' in data_string['register']:
                            client['username'] = data_string['register']['username']
                            self.factory.broadcast(json.dumps({'action' : 'newuser','<a class="zem_slink" title="User (computing)" href="http://en.wikipedia.org/wiki/User_%28computing%29" target="_blank" rel="wikipedia noopener">usernames</a>' : [clients['username'] for clients in self.factory.clients]}))
                            
                    elif 'message' in data_string:
                        sender = [client for client in self.factory.clients if client["peer"] == self.transport.getPeer()][0]
                        if 'username' in data_string:
                            reciver = [client for client in self.factory.clients if client["username"] == data_string['username']][0]
                            self.factory.msgClient(reciver,json.dumps({'action' : 'message','from' : sender['username'], 'message': data_string['message']}))
                                
            except Exception as ex:
                print(ex)
                
    def connectionLost(self, reason):
        WebSocketServerProtocol.connectionLost(self, reason)
        self.factory.unregister(self)

class BroadcastServerFactory(WebSocketServerFactory):

    def __init__(self, url):
        WebSocketServerFactory.__init__(self, url)
        self.clients = []

    def register(self, client):
        if client not in [d['client'] for d in self.clients if 'client' in d]:
            self.clients.append({
                'client': client,
                'peer': client.transport.getPeer()
            })
            print("registered client {}".format(client.transport.getPeer()))

    def unregister(self, client):
        unreg = [c for c in self.clients if c["client"] == client][0]
        self.broadcast(json.dumps({'action' : 'userleft','username' : unreg['username']}))
        self.clients.remove(unreg)
        print("unregistered client {}".format(client.peer))
                
    def msgClient(self, client, msg):
        client['client'].sendMessage(msg.encode('utf8'))
        print("message sent to '{}' ..".format(client['peer']))

    def broadcast(self, msg):
        print("broadcasting prepared message '{}' ..".format(msg))
        for c in self.clients:
            c['client'].sendMessage(msg.encode('utf8'))


if __name__ == '__main__':

    ServerFactory = BroadcastServerFactory

    factory = ServerFactory("ws://localhost:9000")

    factory.protocol = BroadcastServerProtocol
    listenWS(factory)

    webdir = File(".")
    web = Site(webdir)
    reactor.listenTCP(8080, web)

    reactor.run()
