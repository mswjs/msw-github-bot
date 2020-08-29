import * as fs from 'fs'
import * as path from 'path'
import nock from 'nock'
import { Probot } from 'probot'
import payload from './fixtures/issues.opened.json'
import bot from '../src'

const issueCreatedBody = {
  body: 'Thanks for opening this issue!',
}

describe('Mock Service Worker Git', () => {
  let probot: any
  let fakeCert: string

  beforeAll((done) => {
    fs.readFile(path.join(__dirname, 'fixtures/mock-cert.pem'), (err, cert) => {
      if (err) {
        return done(err)
      }

      fakeCert = cert.toString()
      done()
    })
  })

  beforeEach(() => {
    nock.disableNetConnect()
    probot = new Probot({ id: 123, cert: fakeCert })
    // Load our app into probot
    probot.load(bot)
  })

  test('creates a comment when an issue is opened', async (done) => {
    // Test that we correctly return a test token
    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' })

    // Test that a comment is posted
    nock('https://api.github.com')
      .post('/repos/hiimbex/testing-things/issues/1/comments', (body) => {
        done(expect(body).toMatchObject(issueCreatedBody))
        return true
      })
      .reply(200)

    // Receive a webhook event
    await probot.receive({ name: 'issues', payload })
  })

  afterEach(() => {
    nock.cleanAll()
    nock.enableNetConnect()
  })
})
