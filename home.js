#!/usr/bin/env node
var restify = require('restify'),
    logger = require('bunyan'),
    wol = require('wake_on_lan'),
    ping = require('ping'),
    config = require('config');

function Computer(obj) {
  for (var prop in obj) this[prop] = obj[prop];
}

Computer.prototype.wake = function () {
  wol.wake(this.mac);
  return this.name;
}

Computer.prototype.alive = function (callback) {
  ping.sys.probe(this.name, callback);
}

Computer.prototype.shutdown = function () {
  return "not implemented!";
}

Computer.prototype.volume = function (command) {
  return "not implemented";
}

var computersJSON = config.get('Computers');
var computers = [];
for(var c in computersJSON) {
  computers.push(new Computer(computersJSON[c]));
}

var log = new logger.createLogger({
  name: 'home',
  serializers: {
    req: logger.stdSerializers.req
  },
  streams: [
    {
      level: 'warn',
      path: './warn.log'
    },
    {
      level: 'info',
      path: './info.log'
    },
    {
      level: 'info',
      stream: process.stdout
    }
  ],
}),
server = restify.createServer({
  name: 'home',
  version: '0.1.0',
  log: log
});

//Logging function
server.pre(function (request, response, next) {
  request.log.info({ req: request }, 'REQUEST');
  next();
});

server.get(/^\/([a-zA-Z\-\.~]+)\/(.*)/, function(req, res, next) {
  res.setHeader('content-type', 'application/json');

  //Get chosen computer
  var computer;
  for (var i = 0, len = computers.length; i < len; i++) {
    if (req.params[0] === computers[i].name) {
      computer = computers[i];
    }
  }

  if (!computer)
    res.send(404, new Error('Computer not found!'));
  else {
    switch(req.params[1]) {
      case 'alive':
        computer.alive(function (stat) {
          res.end(computer.name + (stat ? ' is alive' : ' is dead'));
        });
        break;

      case 'wake':
        res.end('Waking up ' + computer.wake() + '...');
        break;

      case 'shutdown':
        res.end('Shutting down ' + computer.shutdown());
        break;

      case 'volume':
        res.end('Not implemented!');
        break;

      case '':
        res.end(JSON.stringify(computer));
        break;

      default: 
        res.end(404, new Error('Command not found!'));
    }
  }
  return next();
});

server.listen(8080);
