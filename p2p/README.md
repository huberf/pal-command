This is the start of the P2P system which will use a central server to find
friendly nodes and then facilitate the connection for a direct data link between
them.
For nodes that don't support websockets but rather polling, this system will
give an address to a requesting node which connects back to the central server
and adds messages to the polling queue.

Inspiration and code sources:
http://digitalillusion.xyz/2017/11/06/p2p-websocket-python-twisted-autobahn/
