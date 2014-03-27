/* global module, require */
var MessageQueue = require('./MessageQueue');
var Entity = require('./Entity');
var Socket = require('./Socket');

module.exports = (function () {
  'use strict';

  function Client(connectionSocket, context) {
    this.init(connectionSocket, context);
  }

  Client.prototype.init = function (connectionSocket, context) {
    this.keyboardState = {};

    this.entity = null;
    this.otherClients = {};

    this.messages = new MessageQueue();

    this.context = context;

    // this socket is used only to notify the server when the
    // client connects
    this.connectionSocket = connectionSocket;

    // All communication after connection is made through
    // the client's own socket (which will be shared with the server)
    this.socket = new Socket();

    this.bindEvents();
  };

  Client.prototype.bindEvents = function () {
    var self = this;

    this.socket.on('world-update', function (data) {
      // fake 100ms lag
      self.messages.enqueue(data, Date.now() + 100);
    });

    this.socket.on('new-entity', function (data) {
      self.entityId = data.id;
      self.entity = new Entity({
        x: data.x,
        y: data.y
      });
    });

    // notify server of connection and send new socket
    // for any further communication
    this.connectionSocket.emit('connection', this.socket);
  };

  Client.prototype.update = function () {
    // not yet connected
    if (!this.entity) {
      return;
    }

    this.processServerUpdates();
    this.processInputs();

    this.render();
  };

  Client.prototype.render = function () {
    this.context.clearRect(0, 0, 200, 200);

    // render entity
    this.entity.render(this.context);

    var otherClients = Object.keys(this.otherClients);
    for (var i = 0; i < otherClients.length; ++i) {
      this.otherClients[otherClients[i]].render(this.context);
    }
  };

  Client.prototype.processServerUpdates = function () {
    var worldState;

    // note assignment on while loop
    while ((worldState = this.messages.dequeue())) {
      worldState = worldState.payload;

      // world state is a list of entities
      for (var i = 0; i < worldState.length; ++i) {
        // yo, it's us
        if (worldState[i].entityId === this.entityId) {
          this.entity.x = worldState[i].x;
          this.entity.y = worldState[i].y;

          // TODO: Apply all inputs not yet acknowledged by the server
        }
        else {
          var otherPlayer = this.otherClients[worldState[i].entityId];
          if (otherPlayer) {
            otherPlayer.x = worldState[i].x;
            otherPlayer.y = worldState[i].y;
          }
          else {
            this.otherClients[worldState[i].entityId] = new Entity(worldState[i]);
          }
        }
      }
    }
  };

  Client.prototype.processInputs = function () {
    var now = Date.now(),
        deltaModifier = (now - (this.lastInputTime ? this.lastInputTime : now)) / 1000;

    this.lastInputTime = now;

    if (!this.hasNewInput()) {
      // nothing new to send
      return;
    }

    var input = this.keyboardState;
    input.deltaModifier = deltaModifier;
    input.entityId = this.entityId;

    // send data to server
    this.socket.emit('input', input);

    // client prediction
    // apply input to entity for instant feedback
    this.entity.applyInput(input);
  };

  Client.prototype.hasNewInput = function () {
    return !!(this.keyboardState.LEFT  ||
              this.keyboardState.RIGHT ||
              this.keyboardState.UP    ||
              this.keyboardState.DOWN);
  };

  return Client;
}());
