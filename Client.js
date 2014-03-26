/* global module, require */
var MessageQueue = require('./MessageQueue');
var Entity = require('./Entity');

module.exports = (function () {
  'use strict';

  function Client(socketIn, socketOut, context) {
    this.init(socketIn, socketOut, context);
  }

  Client.prototype.init = function (socketIn, socketOut, context) {
    this.entity = null;

    this.messages = new MessageQueue();

    this.context = context;

    this.socketIn = socketIn;
    this.socketOut = socketOut;
    this.bindEvents();

    // update client 60 frames per second
    this.clientUpdate = setInterval(this.update, 1000 / 30);
  };

  Client.prototype.bindEvents = function () {
    var self = this;
    this.socketIn.on('world-update', function (data) {
      // fake 100ms lag
      self.messages.enqueue(Date.now() + 100, data);
    });
  };

  Client.prototype.update = function () {
    this.processServerUpdates();

    // not yet connected
    if (!this.entity) {
      return;
    }

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

          // first world update ever, connection stablished.
          if (!this.entity) {
            this.entity = new Entity();
          }

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
