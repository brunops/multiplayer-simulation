(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
    this.fakeLag = 0;

    this.messages = new MessageQueue();

    this.context = context;

    // this socket is used only to notify the server when the
    // client connects
    this.connectionSocket = connectionSocket;

    // All communication after connection is made through
    // the client's own socket (which will be shared with the server)
    this.socket = new Socket();

    // Used for user reconciliation
    this.inputNumber = 0;
    this.pendingInputs = [];

    this.bindEvents();
  };

  Client.prototype.bindEvents = function () {
    var self = this;

    this.socket.on('world-update', function (data) {
      // fake 100ms lag
      self.messages.enqueue(data, Date.now() + self.fakeLag);
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

          for (var j = 0; j < this.pendingInputs.length; ++j) {
            // input already processed by the server and thus, applied
            // to the entity in the previous update
            if (this.pendingInputs[j].inputNumber <= worldState[i].lastProcessedInput) {
              // no need to store it anymore
              // decrease j to prevent for loop from breaking
              this.pendingInputs.splice(j--, 1);
            }
            else {
              // input not yet acknoledged by the server
              // apply it on top of server update for reconciliation
              this.entity.applyInput(this.pendingInputs[j]);
            }
          }
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

    // need a truly new object to prevent
    // multiple inputs sharing state
    var input = this.keyboardStateClone();
    input.deltaModifier = deltaModifier;
    input.entityId = this.entityId;
    input.inputNumber = this.inputNumber++;
    input.t = now + this.fakeLag;

    // Store all inputs yet to be acknowledged by the server
    this.pendingInputs.push(input);

    // send data to server
    this.socket.emit('input', input);

    // client prediction
    // apply input to entity for instant feedback
    this.entity.applyInput(input);
  };

  Client.prototype.keyboardStateClone = function () {
    return {
      LEFT: this.keyboardState.LEFT,
      RIGHT: this.keyboardState.RIGHT,
      UP: this.keyboardState.UP,
      DOWN: this.keyboardState.DOWN
    };
  };

  Client.prototype.hasNewInput = function () {
    return !!(this.keyboardState.LEFT  ||
              this.keyboardState.RIGHT ||
              this.keyboardState.UP    ||
              this.keyboardState.DOWN);
  };

  return Client;
}());

},{"./Entity":2,"./MessageQueue":3,"./Socket":5}],2:[function(require,module,exports){
/* global module */
module.exports = (function () {
  'use strict';

  function Entity(opts) {
    this.init(opts || {});
  }

  Entity.prototype.init = function (opts) {
    this.x = opts.x || 0;
    this.y = opts.y || 0;

    // speed in pixels per second
    this.speed = opts.speed || 150;

    this.color = opts.color || '#00f';
    this.borderSize = opts.borderSize || 3;
    this.borderColor = opts.borderColor || '#000';
    this.radius = opts.radius || 10;
  };

  Entity.prototype.applyInput = function (input) {
    if (input.LEFT) {
      this.x -= this.speed * input.deltaModifier;
    }

    if (input.RIGHT) {
      this.x += this.speed * input.deltaModifier;
    }

    if (input.DOWN) {
      this.y += this.speed * input.deltaModifier;
    }

    if (input.UP) {
      this.y -= this.speed * input.deltaModifier;
    }
  };

  Entity.prototype.render = function (ctx) {
    ctx.beginPath();
    ctx.fillColor = this.color;
    ctx.strokeSize = this.borderSize;
    ctx.strokeColor = this.borderColor;
    ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  };

  return Entity;
}());

},{}],3:[function(require,module,exports){
/* global module */
module.exports = (function () {
  'use strict';

  function MessageQueue() {
    this.init();
  }

  MessageQueue.prototype.init = function () {
    this.queue = [];
  };

  MessageQueue.prototype.enqueue = function (msg, timestamp) {
    this.queue.push({
      t: timestamp || Date.now(),
      payload: msg
    });
  };

  MessageQueue.prototype.dequeue = function () {
    var now = Date.now(),
        message;

    for (var i = 0; i < this.queue.length; ++i) {
      if (this.queue[i].t <= now) {
        message = this.queue.splice(i, 1)[0];
        break;
      }
    }

    return message;
  };

  return MessageQueue;
}());

},{}],4:[function(require,module,exports){
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

},{"./Entity":2,"./MessageQueue":3}],5:[function(require,module,exports){
// This is a totally fake socket
// it just acts as an extremely simplified event emmiter

/* global module */
module.exports = (function () {
  'use strict';

  function Socket() {
    this.init();
  }

  Socket.prototype.init = function () {
    this.events = {};
  };

  Socket.prototype.on = function (event, cb) {
    this.events[event] = this.events[event] || [];
    this.events[event].push(cb);
  };

  Socket.prototype.emit = function (event, data) {
    for (var i = 0; i < this.events[event].length; ++i) {
      this.events[event][i](data);
    }
  };

  return Socket;
}());

},{}],6:[function(require,module,exports){
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
      client3Lag = document.getElementById('client3-lag');

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

  client1Lag.addEventListener('change', function (e) {
    console.log(this.value)
    client.fakeLag = parseInt(this.value, 10);
  }, false);

  client2Lag.addEventListener('change', function (e) {
    console.log(this.value)
    client2.fakeLag = parseInt(this.value, 10);
  }, false);

  client3Lag.addEventListener('change', function (e) {
    console.log(this.value)
    client3.fakeLag = parseInt(this.value, 10);
  }, false);
}());

},{"./Client":1,"./Server":4,"./Socket":5}]},{},[6])