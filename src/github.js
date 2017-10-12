'use strict'

const GitHubApi = require('github')

const config = require('./config')

const github = new GitHubApi({
    Promise,
})

if (config.github && config.github.auth) {
    github.authenticate(config.github.auth)
}

const getRepo = async () => {
    const res = await github.repos.get({
        owner: config.owner,
        repo: config.repo,
    })
    return res.data
}

const getPullRequests = async () => {
    const repo = await getRepo()

    const res = await github.pullRequests.getAll({
        owner: config.owner,
        repo: config.repo,
        state: 'open',
        per_page: 100,
    })

    return res.data.filter(pr => config.branches.includes(pr.base.ref))
}

module.exports = {
    getRepo,
    getPullRequests,
}
