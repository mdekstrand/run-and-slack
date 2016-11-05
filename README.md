# Run a program and report back to Slack

The `run-and-slack` program runs a program and reports to Slack when it is
finished.  Optionally, it can upload a log file to Gist and include a link
in the Slack message.

## Installation

    npm install -g run-and-slack

## Use

First, set a few environment variables:

- `SLACK_WEBHOOK_URL` - the incoming webhook URL for Slack (**required**)
- `GITHUB_TOKEN` - a Github user token with 'gist' scope (required for uploading log files)
- `SLACK_USERNAME` - the user name to post as (defaults to 'HAL9000')
- `SLACK_EMOJI` - an emoji shortcode for the bot's icon (defaults to ':see_no_evil:')
- `SLACK_CHANNEL` - the Slack channel to notify, including the '#'
- `SLACK_ALERT_USER` - a username to mention in the Slack message
- `SLACK_LOG_FILE` - the path to a log file to upload

[direnv](http://direnv.net/) is super helpful for managing these.

Then run:

    run-and-slack some-command arg1 arg2

It will run the program and report back to Slack when it has finished.

In addition, it takes a few command line options (before the command):

- `-u` _user_ - a user to alert (overrides `SLACK_ALERT_USER`)
- `-f` _file_ - a log file to upload (overrides `SLACK_LOG_FILE`)
- `-c` _channel_ - the channel to notify (overrides `SLACK_CHANNEL`)