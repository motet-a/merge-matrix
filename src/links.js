'use strict'

const config = require('./config')


const repoHtmlUrl = `https://github.com/${config.owner}/${config.repo}`

const doesItLookLikeACommitSha = string =>
    string.match(/^[a-f0-9]{8,}$/) && string.match(/[0-9]/)

const getLinkType = name => (
    name.match(/^#[0-9]+$/) ? 'pullRequest' :
    doesItLookLikeACommitSha(name) ? 'commit' :
    'branch'
)

const getLinkUrl = (type, name) => {
    switch (type) {
        case 'commit':
            return `${repoHtmlUrl}/commit/${name}`
        case 'pullRequest':
            return `${repoHtmlUrl}/pull/${name.slice(1)}`
        case 'branch':
            return `${repoHtmlUrl}/tree/${name}`
    }
    throw new Error()
}

const getLinkInfo = name => {
    const type = getLinkType(name)
    return {
        type,
        url: getLinkUrl(type, name),
    }
}

const getCompareUrl = (a, b) =>
    `${repoHtmlUrl}/compare/${a}...${b}`

module.exports = {
    getCompareUrl,
    getLinkInfo,
    repoHtmlUrl,
}
