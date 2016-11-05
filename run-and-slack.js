"use strict";

const cp = require('child_process');
const util = require('util');
const github = require('github');
const chalk = require('chalk');

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

if (options.logFile && !process.env.GITHUB_TOKEN) {
  err(2, 'no GITHUB_TOKEN for uploading log file');
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
  slack.send({
    channel: options.channel,
    icon_emoji: options.emoji,
    username: options.username,
    text: util.format('%s%s command %s %s\n```\n%s\n```', 
                      icon, alert, args[0], msg,
                      args.join(' '))
  });
});