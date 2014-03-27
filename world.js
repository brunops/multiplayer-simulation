/* global require */
var Client = require('./Client');
var Server = require('./Server');
var Socket = require('./Socket');

(function () {
  'use strict';

  // get DOM elements
  var serverCanvas = document.getElementById('server-canvas'),
      clientCanvas = document.getElementById('client-canvas'),
      client2Canvas = document.getElementById('client2-canvas');

  // set up world with only one client and one server
  var connectionSocket = new Socket(),
      server = new Server(connectionSocket, serverCanvas.getContext('2d')),
      client = new Client(connectionSocket, clientCanvas.getContext('2d')),
      client2 = new Client(connectionSocket, client2Canvas.getContext('2d')),
      currClient = client;


  // Toggle between clients every second
  // just to test if evrybody is synchronized
  setInterval(function () {
    currClient.keyboardState = {};
    currClient = currClient === client ? client2 : client;
  }, 1000);

  // update server 30 times per second
  setInterval(server.update.bind(server), 1000 / 20);

  // update client 50 times per second
  setInterval(client.update.bind(client), 1000 / 60);
  setInterval(client2.update.bind(client2), 1000 / 60);

  // bind some events
  document.addEventListener('keydown', function (e) {
    switch (e.keyCode) {
      case 37:
        currClient.keyboardState.LEFT = true;
        break;
      case 38:
        currClient.keyboardState.UP = true;
        break;
      case 39:
        currClient.keyboardState.RIGHT = true;
        break;
      case 40:
        currClient.keyboardState.DOWN = true;
        break;
    }
  });

  document.addEventListener('keyup', function (e) {
    switch (e.keyCode) {
      case 37:
        delete currClient.keyboardState.LEFT;
        break;
      case 38:
        delete currClient.keyboardState.UP;
        break;
      case 39:
        delete currClient.keyboardState.RIGHT;
        break;
      case 40:
        delete currClient.keyboardState.DOWN;
        break;
    }
  });

}());
