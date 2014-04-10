/* global module, require */
var MessageQueue = require('./MessageQueue');
var Entity = require('./Entity');

module.exports = (function() {
  'use strict';

  function Server(socket, context) {
    this.init(socket, context);
  }

  Server.prototype.init = function (socket, context) {
    this.clientSockets = [];
    this.entities = [];

    // Store last processed input number per client
    this.lastProcessedInput = [];

    this.currentEntityId = 0;

    this.socket = socket;
    this.context = context;
    this.messages = new MessageQueue();

    this.bindEvents();
  };

  Server.prototype.bindEvents = function () {
    this.socket.on('connection', this.newClientConnection.bind(this));
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
    this.lastProcessedInput.push(-1);

    // Send client new entity data
    clientSocket.emit('new-entity', {
      id: newEntity.id,
      x: newEntity.x,
      y: newEntity.y
    });

    // Listen to client input
    clientSocket.on('input', function (input) {
      self.messages.enqueue(input, input.t);
    });
  };

  Server.prototype.update = function () {
    this.processInputs();
    this.sendWorldState();
    this.render();
  };

  Server.prototype.processInputs = function () {
    var input;

    // ! note assignment in loop !
    while ((input = this.messages.dequeue())) {
      input = input.payload;

      // Apply new input only if it is a newer one
      // ignore slow packets
      var id = input.entityId;
      if (this.lastProcessedInput[id] < input.inputNumber) {
        this.entities[id].applyInput(input);
        this.lastProcessedInput[id] = input.inputNumber;
      }
    }
  };

  Server.prototype.sendWorldState = function () {
    var i,
        worldState = [];

    for (i = 0; i < this.entities.length; ++i) {
      worldState.push({
        entityId: this.entities[i].id,
        x: this.entities[i].x,
        y: this.entities[i].y,
        lastProcessedInput: this.lastProcessedInput[i]
      });
    }

    for (i = 0; i < this.clientSockets.length; ++i) {
      this.clientSockets[i].emit('world-update', worldState);
    }
  };

  Server.prototype.render = function () {
    this.context.clearRect(0, 0, 200, 200);

    for (var i = 0; i < this.entities.length; i++) {
      this.entities[i].render(this.context);
    }
  };

  return Server;
}());
