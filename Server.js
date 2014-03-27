/* global module, require */
var MessageQueue = require('./MessageQueue');
var Entity = require('./Entity');

module.exports = (function() {
  'use strict';

  function Server(socket) {
    this.init(socket);
  }

  Server.prototype.init = function (socket) {
    this.clientSockets = [];
    this.entities = [];

    this.currentEntityId = 0;

    this.socket = socket;
    this.messages = new MessageQueue();

    this.bindEvents();
  };

  Server.prototype.bindEvents = function () {
    this.socket.on('connection', this.newClientConnection);
  };

  Server.prototype.newClientConnection = function (clientSocket) {
    var self = this,
        newEntity = new Entity();

    newEntity.id = this.currentEntityId++;
    newEntity.x = Math.floor(Math.random() * 100);
    newEntity.y = Math.floor(Math.random() * 100);

    // Store Client entity and socket
    self.entities.push(newEntity);
    self.clientSockets.push(clientSocket);

    // Send client new entity data
    clientSocket.emit('new-entity', {
      id: newEntity.id,
      x: newEntity.x,
      y: newEntity.y
    });

    // Listen to client input
    clientSocket.on('input', function (input) {
      self.messages.enqueue(input);
    });
  };

  Server.prototype.update = function () {
    this.processInputs();
    this.sendWorldState();
  };

  Server.prototype.processInputs = function () {
    var input;

    // ! note assignement in loop !
    while ((input = this.messages.dequeue())) {
      this.entities[input.entityId].applyInput(input);
    }
  };

  Server.prototype.sendWorldState = function () {
    var i,
        worldState = [];

    for (i = 0; i < this.entities.length; ++i) {
      worldState.push({
        entityId: this.entities[i].id,
        x: this.entities[i].x,
        y: this.entities[i].y
      });
    }

    for (i = 0; i < this.clientSockets.length; ++i) {
      this.clientSockets[i].emit('world-update', worldState);
    }
  };

  return Server;
}());