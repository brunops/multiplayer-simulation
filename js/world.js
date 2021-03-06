/* global require */
var Client = require('./Client');
var Server = require('./Server');
var Socket = require('./Socket');

(function () {
  'use strict';

  // get canvas DOM elements
  var serverCanvas = document.getElementById('server-canvas'),
      clientCanvas = document.getElementById('client-canvas'),
      client2Canvas = document.getElementById('client2-canvas'),
      client3Canvas = document.getElementById('client3-canvas');

  // get lag inputs DOM elements
  var client1Lag = document.getElementById('client1-lag'),
      client2Lag = document.getElementById('client2-lag'),
      client3Lag = document.getElementById('client3-lag'),
      current = document.getElementById('current');

  // set up world with only one client and one server
  var connectionSocket = new Socket(),
      server = new Server(connectionSocket, serverCanvas.getContext('2d')),
      client = new Client(connectionSocket, clientCanvas.getContext('2d')),
      client2 = new Client(connectionSocket, client2Canvas.getContext('2d')),
      client3 = new Client(connectionSocket, client3Canvas.getContext('2d')),
      currClient = client;


  // update server 30 times per second
  setInterval(server.update.bind(server), 1000 / 60);

  // update client 50 times per second
  setInterval(client.update.bind(client), 1000 / 60);
  setInterval(client2.update.bind(client2), 1000 / 60);
  setInterval(client3.update.bind(client3), 1000 / 60);

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
  }, false);

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
  }, false);

  client1Lag.addEventListener('change', function () {
    client.fakeLag = parseInt(this.value, 10);
  }, false);

  client2Lag.addEventListener('change', function () {
    client2.fakeLag = parseInt(this.value, 10);
  }, false);

  client3Lag.addEventListener('change', function () {
    client3.fakeLag = parseInt(this.value, 10);
  }, false);

  current.addEventListener('change', function () {
    var currentClientNumber = parseInt(this.value, 10);
    if (currentClientNumber >= 0 || currentClientNumber <= 3) {
      switch (currentClientNumber) {
        case 1:
          currClient = client;
          break;
        case 2:
          currClient = client2;
          break;
        case 3:
          currClient = client3;
          break;
      }
    }
  }, false);
}());
