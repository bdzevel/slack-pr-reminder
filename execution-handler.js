const octokit = require('@octokit/rest')();
const { WebClient } = require('@slack/client');

octokit.authenticate({
  type: 'basic',
  username: process.env.GITHUB_APP_USER_NAME,
  password: process.env.GITHUB_APP_USER_PASS,
});
const slackClient = new WebClient(process.env.SLACK_APP_TOKEN);

const REVIEW_STATES = {
  APPROVED: 'APPROVED',
  CHANGES_REQUESTED: 'CHANGES_REQUESTED',
  DISMISSED: 'DISMISSED',
  COMMENTED: 'COMMENTED',
};

function getPullRequestReviewsByUser(reviews) {
  return reviews.reduce(function(acc, cur) {
    const currentSubmittedDate = new Date(cur.submitted_at);
    const userReview = acc.find(r => r.user === cur.user.login);
    if (!userReview) {
      acc.push({ user: cur.user.login, state: cur.state, submitted: currentSubmittedDate });
    } else if (userReview.state === REVIEW_STATES.COMMENTED
      || (cur.state !== REVIEW_STATES.COMMENTED && userReview.submitted < currentSubmittedDate)) {
      userReview.state = cur.state;
      userReview.submitted = currentSubmittedDate;
    }
    return acc;
  }, []);
}

function getAttachmentFields(pr, reviews) {
  const fields = [];
  if (pr.assignee) {
    fields.push({
      title: 'Owner',
      value: pr.assignee.login,
      short: true,
    });
  }
  if (pr.requested_reviewers && pr.requested_reviewers.length) {
    fields.push({
      title: 'Requested Reviewers',
      value: pr.requested_reviewers.map(l => l.login).join(', '),
      short: true,
    });
  }
  fields.push({
    title: 'Labels',
    value: pr.labels.map(l => l.name).join(', '),
    short: true,
  });
  if (pr.reviews && pr.reviews.length) {
    fields.push({
      title: 'Reviews',
      value: reviews.map(r => `${r.user}: ${r.state}`).join(', '),
      short: false,
    });
  }
  return fields;
}

function getReviewColor(reviews) {
  const overallReview = reviews.reduce(function(acc, cur) {
    if (acc === REVIEW_STATES.CHANGES_REQUESTED || cur.state === REVIEW_STATES.CHANGES_REQUESTED) {
      return REVIEW_STATES.CHANGES_REQUESTED;
    }
    if (acc === REVIEW_STATES.APPROVED) {
      return REVIEW_STATES.APPROVED;
    }
    return cur.state;
  }, '');
  if (overallReview === REVIEW_STATES.CHANGES_REQUESTED) {
    return 'danger';
  }
  if (overallReview === REVIEW_STATES.APPROVED) {
    return 'good';
  }
  return undefined;
}

function getPullRequestAttachments(pullRequests) {
  return pullRequests.reduce(function (acc, cur) {
    const reviews = getPullRequestReviewsByUser(cur.reviews);
    acc.push({
      fallback: cur.title,
      title: cur.title,
      title_link: cur.html_url,
      fields: getAttachmentFields(cur, reviews),
      footer: 'Slack PR Reminders',
      color: getReviewColor(reviews),
    });
    return acc;
  }, []);
}

function populatePullRequestReviews(pr) {
  return octokit.pullRequests.getReviews({
    owner: process.env.GITHUB_ORG_NAME, repo: process.env.GITHUB_REPOSITORY, per_page: 100, number: pr.number,
  }).then(reviews => Object.assign(pr, { reviews: reviews.data }));
}

module.exports = {
  async execute() {
    const pullRequests = await octokit.pullRequests.getAll({ owner: process.env.GITHUB_ORG_NAME, repo: process.env.GITHUB_REPOSITORY, per_page: 100 });
    if (!pullRequests.data.length) {
      return;
    }

    const data = await Promise.all(pullRequests.data.map(pr => populatePullRequestReviews(pr)));
    const attachments = getPullRequestAttachments(data);
    const pullRequestsLink = `https://github.com/${process.env.GITHUB_ORG_NAME}/${process.env.GITHUB_REPOSITORY}/pulls`;
    await slackClient.chat.postMessage({
      channel: process.env.SLACK_CHANNEL,
      text: `There are some open Pull Requests. Please take the time to review or merge them: ${pullRequestsLink}`,
      attachments,
    });
  },
};
