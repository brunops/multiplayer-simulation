/* global module */
module.exports = (function () {
  'use strict';

  function Entity(opts) {
    this.init(opts);
  }

  Entity.prototype.init = function (opts) {
    this.x = opts.x || 0;
    this.y = opts.y || 0;

    this.color = opts.color || '#00f';
    this.borderSize = opts.borderSize || 3;
    this.borderColor = opts.borderColor || '#000';
    this.radius = opts.radius || 10;
  };

  Entity.prototype.render = function (ctx) {
    ctx.fillColor = this.color;
    ctx.strokeSize = this.borderSize;
    ctx.strokeColor = this.borderColor;
    ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  };

  return Entity;
}());
