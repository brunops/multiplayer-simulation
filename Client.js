/* global module, require */
var MessageQueue = require('./MessageQueue');
var Entity = require('./Entity');
var Socket = require('./Socket');

module.exports = (function () {
  'use strict';

  function Client(serverSocket, context) {
    this.init(serverSocket, context);
  }

  Client.prototype.init = function (serverSocket, context) {
    this.entity = null;

    this.messages = new MessageQueue();

    this.context = context;

    this.serverSocket = serverSocket;
    this.socketOut = new Socket();
    this.bindEvents();
  };

  Client.prototype.bindEvents = function () {
    var self = this;

    this.serverSocket.on('world-update', function (data) {
      // fake 100ms lag
      self.messages.enqueue(Date.now() + 100, data);
    });

    this.serverSocket.on('new-entity', function (data) {
      self.entityId = data.id;
      self.entity = new Entity({
        x: data.x,
        y: data.y
      });
    });

    this.socketOut.emit('connection', this.socketOut);
  };

  Client.prototype.update = function () {
    // not yet connected
    if (!this.entity) {
      return;
    }

    this.processServerUpdates();
    this.processInputs();

    // render entity
    this.entity.render(this.context);
  };

  Client.prototype.processServerUpdates = function () {
    var worldState;

    // note assignment on while loop
    while ((worldState = this.messages.dequeue())) {

      // world state is a list of entities
      for (var i = 0; i < worldState.length; ++i) {
        // yo, it's us
        if (worldState[i].entityId === this.entityId) {
          this.entity.x = worldState[i].x;
          this.entity.y = worldState[i].y;

          // TODO: Apply all inputs not yet acknowledged by the server
        }
        else {
          // update other entities
        }
      }
    }
  };

  Client.prototype.processInputs = function () {
    var now = Date.now(),
        deltaModifier = now - (this.lastInputTime ? this.lastInputTime : now);

    this.lastInputTime = now;

    if (!this.hasNewInput()) {
      // nothing new to send
      return;
    }

    var input = this.keyboardState;
    input.deltaModifier = deltaModifier;
    input.entityId = this.entityId;

    // send data to server
    this.socketOut.emit('input', input);

    // client prediction
    // apply input to entity for instant feedback
    this.entity.applyInput(input);
  };

  Client.prototype.hasNewInput = function () {
    return this.keyboardState.LEFT  ||
           this.keyboardState.RIGHT ||
           this.keyboardState.UP    ||
           this.keyboardState.DOWN;
  };

  return Client;
}());
