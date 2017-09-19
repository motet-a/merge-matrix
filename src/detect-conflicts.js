'use strict'

const assert = require('assert')

const mergeLogs = require('./merge-logs')
const config = require('./config')
const github = require('./github')
const git = require('./git')

const MAX_LOG_SIZE = 1024 * 64

const getPairs = map => {
    const pairs = new Map()
    for (const [aId, aValue] of map) {
        for (const [bId, bValue] of map) {
            if (aId !== bId) {
                pairs.set(aId + '-' + bId, [aValue, bValue])
            }
        }
    }

    return Array.from(pairs.values())
}

const getMergeCombinations = (pulls, branchNames) => {
    const map = new Map()
    for (const pull of pulls) {
        map.set(pull.number, pull)
    }
    for (const branchName of branchNames) {
        map.set(branchName, branchName)
    }

    return getPairs(map)
}

// `a` and `b` must be either:
//   - a pull request object
//   - a branch name
//
// `existingBranches` must be the list describing the existing
// branches in the cloned repository. Each item must be an object
// with the signature `{name, sha}`.
//
// Returns undefined if the existing result branch is up-to-date.
const mergeBranchesOrPulls = async (a, b, existingBranches, oldMatrixBranchNames) => {

    const getLocalPullBranchName = branchOrPull =>
        typeof branchOrPull === 'string' ? branchOrPull :
        `pull-${branchOrPull.number}`

    const getPullSha = pull => {
        const branchName = getLocalPullBranchName(pull)
        const branch = existingBranches.find(
            branch => branch.name === branchName
        )
        assert(branch)
        return branch.sha.slice(0, 16)
    }

    const aSha = getPullSha(a)
    const bSha = getPullSha(b)

    const newBranchName = aSha + '-' + bSha

    if (existingBranches.find(branch => branch.name === newBranchName) &&
        oldMatrixBranchNames.includes(newBranchName)) {
        return
    }

    let mergeResult
    try {
        mergeResult = await git.merge(bSha, aSha, newBranchName)
    } catch (error) {
        if (!error.stderr && error.stdout && error.conflicts) {
            mergeResult = error
        } else {
            throw error
        }
    }

    return {
        aSha,
        bSha,
        mergeResult,
    }
}

const isPullRequestIgnored = number =>
    config.ignore.includes('#' + number)

// This function is not reentrant.
const detectConflicts = async oldMatrix => {
    const repo = await github.getRepo()

    const pulls = (await github.getPullRequests())
        .filter(pull => !isPullRequestIgnored(pull.number))

    await git.pullBranches(config.branches)

    const pairs = getMergeCombinations(pulls, config.branches)

    await git.fetchPullRequests(
        pulls.map(({number}) => number)
    )

    const oldMatrixBranchNames = Object.values(oldMatrix.matrix)
        .map(merge => merge.aSha + '-' + merge.bSha)

    const existingBranches = await git.getBranches()

    const mergeResults = []

    console.log('merging...')
    for (const [a, b] of pairs) {
        const result = await mergeBranchesOrPulls(
            a, b,
            existingBranches,
            oldMatrixBranchNames,
        )

        if (result) {
            const {mergeResult} = result
            mergeResults.push({
                a: typeof a === 'string' ? a : '#' + a.number,
                b: typeof b === 'string' ? b : '#' + b.number,
                aSha: result.aSha,
                bSha: result.bSha,
                code: mergeResult.code || 0,
                stdout: mergeResult.stdout.slice(0, MAX_LOG_SIZE),
                conflicts: mergeResult.conflicts,
            })
        }
    }
    console.log('merged.')

    await mergeLogs.save(mergeResults)

    const result = {
        timestamp: Date.now(),
        repo,
        pulls,
        mergeResults,
        branchNames: config.branches,
    }

    return result
}

module.exports = detectConflicts
