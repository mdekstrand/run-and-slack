"use strict";

const cp = require('child_process');
const fs = require('fs');
const util = require('util');
const GHAPI = require('github');
const chalk = require('chalk');
const path = require('path');

const github = new GHAPI({
  protocol: 'https'
});

var args = process.argv.slice(2);

function err() {
  var args = [...arguments];
  var exit = null;
  if (typeof args[0] === "number") {
    exit = args.shift();
  }
  let msg = util.format.apply(util, args);
  console.error(chalk.red.bold('[ERROR]') + ' ' + msg);
  if (exit !== null) {
    process.exit(exit);
  }
}
function info() {
  let msg = util.format.apply(util, arguments);
  console.error(chalk.blue('[INFO ]') + ' ' + msg);
}

if (args.length === 0) {
  err(2, "no arguments provided");
}
if (!process.env.SLACK_WEBHOOK_URL) {
  err(2, "missing SLACK_WEBHOOK_URL environment variable");
}

const slack = require('slack-notify')(process.env.SLACK_WEBHOOK_URL);

const options = {
  alertUser: process.env.SLACK_ALERT_USER,
  channel: process.env.SLACK_CHANNEL,
  emoji: process.env.SLACK_ICON_EMOJI || ':speak_no_evil:',
  username: process.env.SLACK_USERNAME || 'HAL9000',
  logFile: process.env.SLACK_LOG_FILE
};

var done = false;
while (!done && args.length > 0) {
  switch (args[0]) {
    case '-u':
      options.alertUser = args[1];
      args = args.slice(2);
      break;
    case '-f':
      options.logFile = args[1];
      args = args.slice(2);
      break;
    case '-c':
      options.channel = args[1];
      args = args.slice(2);
      break;
    default:
      done = true;
  }
}
info('will post to channel %s', options.channel);

if (options.logFile) {
  if (process.env.GITHUB_TOKEN) {
    github.authenticate({
      type: 'oauth',
      token: process.env.GITHUB_TOKEN
    });
  } else {
    err(2, 'no GITHUB_TOKEN for uploading log file');
  }
}

let cmd = cp.spawn(args[0], args.slice(1), {
  stdio: 'inherit',
  shell: true
});
cmd.on('error', (e) => {
  err(3, 'Failed to start child process: %s', e);
});
cmd.on('close', (code) =>{
  info('exited with code %d', code);
  if (options.logFile) {
    fs.stat(options.logFile, (e, stat) => {
      if (e) {
        err('no log file found');
        postResult(code, null);
      } else if (stat.size < 2 * 1024 * 1024) {
        info('uploading log file with %d bytes', stat.size);
        fs.readFile(options.logFile, {encoding: 'utf-8'}, (e, data) => {
          if (e) {
            err('cannot read log file');
            postResult(code, null);
          } else {
            var obj = {
              files: {},
              public: false
            };
            obj.files[path.basename(options.logFile)] = {
              content: data
            };
            github.gists.create(obj, (e, res) => {
              var url = null;
              if (e) {
                err('cannot post to Gist: %s', e);
              } else {
                url = res.html_url;
              }
              postResult(code, url);
            });
          }
        });
      } else {
        info('log file too large (%d bytes)', stat.size);
        postResult(code, stat.size);
      }
    });
  } else {
    postResult(code);
  } 
});

function postResult(code, logUrl) {
  var icon, msg;
  var alert = '';
  if (options.alertUser) {
    alert = util.format(' <@%s>:', options.alertUser);
  }
  if (code) {
    icon = ':skull_and_crossbones:';
    msg = 'exited with code ' + code;
  } else {
    icon = ':tada:';
    msg = 'completed successfully';
  }
  msg = util.format('%s%s command %s %s\n```\n%s\n```', 
                    icon, alert, args[0], msg,
                    args.join(' '));
  if (typeof logUrl === 'string') {
    msg += '\nLog file: <' + logUrl + '>';
  } else if (typeof logUrl === 'number') {
    msg += util.format('\n_Log file too large (%d bytes)_', logUrl);
  }
  info('posting to Slack');
  slack.send({
    channel: options.channel,
    icon_emoji: options.emoji,
    username: options.username,
    text: msg
  });
}