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
