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
}
