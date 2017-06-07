# PAL Command

This node server securely relays commands in realtime to connected clients. All data is encrypted in transit and targeted to specific pre-registered devices making an attacker who is unaware of the device id unable to transmit information to any of the clients. This uses socket.io for information transfer and includes a fully working Python file as a client.

## Features

* Fault tolerant. If the client script crashes when executing a command, the command remains on the server. The server keeps a log of commands and the client marks commands as done via a socket.io command.
* Secure transmission. Each client sends the server its unique ID and an attacker can only send a command if it knows this ID. Full end-to-end encryption is on the roadmap.

## Quickstart

1. Run `git clone https://github.com/huberf/pal-command`
2. Execute `cd pal-command`
3. Run `npm install` (or install node.js if you don't have the command)
4. Start script with `node index.js` and then in a separate terminal run `python3 test.py` (not compatible with Python 2.7)
5. Then, fetch this URL in a browser window http://localhost:1999/add/demo/test.
6. Check the terminal running the Python script to see if it output any text. If so, success and if not you can just start a bug report :)

## Endpoints

* `POST - /add/:clientId` - Send a POST request containing a JSON object for the `body.command` key.
* `GET - /add/:clientId/:message` - Send a GET request where `:message` is the text you want passed for the `basic` action type.
* `GET - /retrieve/:clientId` - For devices without websocket support this
  allows one to retrieve the command queue for device with `:clientId` in the
  same format as the `handshake` websocket command returns.
* `POST - /complete/:clientId` - For devices without websocket support this
  allows one to mark a command as complete by specifying its command id in
  `body.id`.

## Uses

- Use with the [PAL Assistant](https://github.com/huberf/pal) to remotely control your computer via the text and voice interface.
- Or you can build your own system to automate computer or server commands. Always having to execute scripts for a site your run, you can use this for secure transport of commands there without having to start an SSH session. Want to launch a TV show on your computer with a press of a button on your phone, PAL Command can do this for you.

## To-Do
* Command storage in external database
* End-to-end encryption
* Authentication mode

## Contributing

If you notice any problems or run into any bugs, start an issue. Have a feature idea? Start an issue as well. Have code you want to contribute? Open a pull request and I'll get on it ASAP.
