'use strict';

const blessed = require('blessed');

const { scroll, throttle } = require('./blessed/scroll');

const debug = screen => blessed.with(scroll, throttle).log({
  screen : screen,
  label  : 'Debug',
  tags   : false,
  top    : 1,
  bottom : 1,
  width  : '100%',
  border : 'line',
  keys   : true,
  mouse  : true,
  scrollable : true,
  scrollbar  : {
    ch    : ' ',
    style : { bg: 'white' },
    track : {
      style : { bg: 'grey' },
    }
  },
  style : {
    label : { bold: true },
  }
});

module.exports = screen => {
  const d = debug(screen);
  return {
    // debug : d,
    log : (...args) => new Promise(resolve => {
      d.log(args);
      resolve();
    }),
  }
};
