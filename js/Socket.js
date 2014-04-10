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
