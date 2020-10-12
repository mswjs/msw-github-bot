import { Application } from 'probot'

export = (app: Application) => {
  /**
   * Thank people on merging pull requests and welcome new contributors.
   * Suggest other issues to look into to engage interest.
   */
  app.on('pull_request.closed', async (context) => {
    const { owner, repo } = context.repo()
    const { pull_request } = context.payload
    const { user } = pull_request

    if (pull_request.merged) {
      const messages = []

      // Figure out if the person is a first-time contributor.
      const userMergedPullRequests = await context.github.search.issuesAndPullRequests(
        {
          q: `is:pr is:merged author:${user.login} repo:${owner}/${repo}`,
        },
      )

      const isFirstTimeContributor =
        userMergedPullRequests.data.items.filter((pullRequest) => {
          return pullRequest.number !== pull_request.number
        }).length === 0

      if (isFirstTimeContributor) {
        messages.push(
          `Thank you for the great work on this, @${user.login}! Welcome to contributors! 🎉`,
        )
      } else {
        messages.push(
          `Thank you for yet another superb contribution, @${user.login}! You're awesome!`,
        )
      }

      // Suggest other issues to look at.
      const openIssuesResponse = await context.github.search.issuesAndPullRequests(
        {
          q: `is:issue is:open no:assignee repo:${owner}/${repo}`,
        },
      )
      const openIssues = openIssuesResponse.data.items

      if (openIssues.length > 0) {
        const goodFirstIssues = openIssues.filter((issue) => {
          return issue.labels.find((label) => {
            return ['good first issue'].includes(label.name.toLowerCase())
          })
        })

        if (goodFirstIssues.length > 0) {
          const goodFirstIssuesNumbers = goodFirstIssues.map(
            (issue) => issue.number,
          )
          const goodFirstIssuesMention = goodFirstIssuesNumbers
            .slice(0, 3)
            .map((number) => `#${number}`)
            .join(', ')

          const issuesMessage =
            goodFirstIssuesNumbers.length > 1
              ? 'There are a few issues'
              : 'There is an issue'

          messages.push(
            '\n\n',
            `${issuesMessage} that could use your help: ${goodFirstIssuesMention}. Please take a look, and if seems interesting, assign it to yourself to let the others know you would like to work on it.`,
          )
        } else {
          messages.push(
            '\n\n',
            `Take a look at the [opened issues](#), perhaps there is one you would be interested to tackle next. Don't forget to assign that one to yourself once you start working on it.`,
          )
        }
      } else {
        messages.push(
          '\n\n',
          `There is no open issues, but we are always happy to hear your feedback. Subscribe to this repository to be notified when a new issue is opened.`,
        )
      }

      messages.push('\n\n', 'See you in the next pull request!')

      const comment = context.issue({
        body: messages.join(''),
      })

      // Comment under the merged pull request.
      context.github.issues.createComment({
        issue_number: comment.number,
        owner: comment.owner,
        repo: comment.repo,
        body: comment.body,
      })
    }
  })

  /**
   * Double check that the issue creator has included a usage example.
   */
  app.on('issues.opened', async (context) => {
    const { issue } = context.payload
    const { user } = issue

    // Check which template has an issue extended.
    const hasRelevantLabel = issue.labels.some((label) => {
      return ['scope:browser', 'scope:server'].includes(
        label.name.toLowerCase(),
      )
    })

    if (!hasRelevantLabel) {
      return
    }

    const checklist = [
      [
        issue.body.trim() !== '',
        `Oops, the issue description seems empty. Could you tell us more about what is wrong?`,
      ],
    ]

    const comment = context.issue({
      body: `\
Hey, @${user.login}! Thank you for reaching out.

There are a few things you can do to get this issue resolved, so I would kindly ask you for cooperation.
${checklist
  .filter(([predicate]) => !predicate)
  .map(([_, message]) => `- ${message}`)
  .join('\n')}

## Add reproduction example

Please create a reproduction example, if you haven't done that already. Choose any of the following options:

- **Create a [Codesandbox from this template](https://codesandbox.io/s/msw-react-reproduction-xx1c8)**
- Fork any of the [official usage examples](https://github.com/mswjs/examples)
- Create a custom public repository on GitHub

Put the link to the example in this issue's description and our team would be much more efficient in solving this problem.

Thank you!
`,
    })

    context.github.issues.createComment({
      issue_number: comment.number,
      owner: comment.owner,
      repo: comment.repo,
      body: comment.body,
    })
  })
}
