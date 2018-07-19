const octokit = require('@octokit/rest')();
const { WebClient } = require('@slack/client');

octokit.authenticate({
  type: 'basic',
  username: process.env.GITHUB_APP_USER_NAME,
  password: process.env.GITHUB_APP_USER_PASS,
});
const slackClient = new WebClient(process.env.SLACK_APP_TOKEN);

function getPullRequestAttachments(pullRequests) {
  return pullRequests.data.reduce(function (acc, cur) {
    acc.push({
      fallback: cur.title,
      title: cur.title,
      title_link: cur.html_url,
      fields: [
        {
          title: 'Labels',
          value: cur.labels.map(l => l.name).join(', '),
          short: false,
        },
      ],
      footer: 'Slack PR Reminders',
    });
    return acc;
  }, []);
}

module.exports = {
  async execute() {
    const pullRequests = await octokit.pullRequests.getAll({ owner: process.env.GITHUB_ORG_NAME, repo: process.env.GITHUB_REPOSITORY, per_page: 100 });
    if (!pullRequests.data.length) {
      return;
    }
    const attachments = getPullRequestAttachments(pullRequests);
    const pullRequestsLink = `https://github.com/${process.env.GITHUB_ORG_NAME}/${process.env.GITHUB_REPOSITORY}/pulls`;
    await slackClient.chat.postMessage({
      channel: process.env.SLACK_CHANNEL,
      text: `There are some open Pull Requests. Please take the time to review them: ${pullRequestsLink}`,
      attachments,
    });
  },
};
