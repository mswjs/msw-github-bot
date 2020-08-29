import { Application } from 'probot' // eslint-disable-line no-unused-vars

export = (app: Application) => {
  // Thank people on merging pull requests.
  app.on('pull_request.closed', async (context) => {
    const { owner, repo } = context.repo()
    const { pull_request } = context.payload
    const { user } = pull_request

    if (pull_request.merged) {
      const messages = [`Thank you for the great work on this, @${user.login}!`]

      // Figure out if the person is a first-time contributor.
      const userMergedPullRequests = await context.github.search.issuesAndPullRequests(
        {
          q: `is:pr is:merged author:${user.login} repo:${owner}/${repo}`,
        },
      )

      const isFirstTimeContributor =
        userMergedPullRequests.data.items.filter((pullRequest) => {
          return pullRequest.number !== pull_request.number
        }).length > 0

      if (isFirstTimeContributor) {
        messages.push(`Welcome to contributors! 🎉`)
      }

      // Suggest other issues to look at.
      const goodFirstIssues = await context.github.search.issues({
        q: `is:issue is:open label:"good first issue" repo:${owner}/${repo}`,
      })

      if (goodFirstIssues.data.items.length > 0) {
        const goodFirstIssuesIds = goodFirstIssues.data.items.map(
          (issue) => issue.id,
        )
        const goodFirstIssuesMention = goodFirstIssuesIds
          .map((id) => `#${id}`)
          .join(', ')

        messages.push(
          '\n\n',
          `We could use your help with ${goodFirstIssuesMention} issues.`,
        )
      }

      context.github.issues.createComment(
        context.issue({
          body: messages.join(''),
        }),
      )
    }
  })
}
