
const fs = require('fs')
const assert = require('assert')
const path = require('path')
const {promisify} = require('util')

const {exec, fileExists, ensureVarDir} = require('./util')
const github = require('./github')
const countLinesInFile = require('./count-lines-in-file')
const {countLinesInBuffer} = countLinesInFile

const dir = path.join(__dirname, '..', 'var', 'clone')

const git = async (args, options) => {
    const env = {
        // Sometimes some Git commands ask for a password.
        // But they bypass the piped stdin stream and read directly
        // from the TTY by default. Shit happens.
        // This hack forces Git not to ask for passwords.
        GIT_ASKPASS: 'echo',
    }

    try {
        return await exec(
            'git',
            args,
            Object.assign(
                {env},
                options,
            ),
        )
    } catch (error) {
        throw error
    }
}

const bootstrap = async () => {
    await ensureVarDir()

    const cloneUrl = (await github.getRepo()).clone_url

    if (await fileExists(dir)) {
        console.log('repository already cloned')
        return
    }

    console.log('cloning...')
    await git(['clone', '--quiet', '--', cloneUrl, dir])

    await git(['-C', dir, 'config', 'user.email', 'merge-matrix@3.141.ovh'])
    await git(['-C', dir, 'config', 'user.name', 'merge-matrix'])
    console.log('cloned.')
}

const fetchBranches = async refSpecs => {
    await git([
        '-C', dir,
        'fetch',
        '-f',
        'origin',
    ].concat(refSpecs))
}

const fetchPullRequests = async numbers => {
    const refSpecs = numbers
        .map(number => 'pull/' + number + '/head:pull-' + number)

    console.log('fetching pull requests...')
    await fetchBranches(refSpecs)
    console.log('fetched.')
}

const parseStatusLine = line => {
    assert(line[2] === ' ')
    const path = line.slice(3)
    assert(path.length)
    const a = line[0]
    const b = line[1]
    return {a, b, path}
}

const parseStatus = status =>
    status.split('\n')
          .filter(l => l)
          .map(parseStatusLine)

const status = async () => {
    const result = await git([
        '-C', dir,
        'status',
        '--porcelain',
    ])
    assert(!result.stderr)
    return parseStatus(result.stdout)
}

const parseConflicts = (buffer, offset = 0) => {
    const begin = buffer.indexOf('\n<<<<<<<', offset)
    if (begin === -1) {
        return []
    }

    const middle = buffer.indexOf('\n=======', begin)
    if (middle === -1) {
        return []
    }

    const end = buffer.indexOf('\n>>>>>>>', middle)
    if (end === -1) {
        return []
    }

    const a = countLinesInBuffer(buffer.slice(begin, middle))
    const b = countLinesInBuffer(buffer.slice(middle, end))

    return [
        [a, b],
    ].concat(parseConflicts(buffer, end))
}

// Returns the string 'binary' in the case of a binary file
// Returns the string 'tooLarge' in the case of a very large file
const countConflictingLinesInFile = async path => {
    const stat = await promisify(fs.stat)(path)

    if (stat >= 100 * 1024) {
        return 'tooLarge'
    }

    const buffer = await promisify(fs.readFile)(path)
    if (buffer.indexOf(0) !== -1) {
        return 'binary'
    }

    const [a, b] = parseConflicts(buffer)
        .reduce(
            ([sa, sb], [a, b]) => [sa + a, sb + b],
            [0, 0],
        )

    return Math.max(a, b)
}

const getConflictLineCount = async conflict => {
    const {path: relPath, reason} = conflict

    const absPath = path.join(dir, relPath)

    switch (reason) {
        case 'U': {
            const lineCount = await countConflictingLinesInFile(absPath)
            return typeof lineCount === 'number' ? lineCount : 0
        }

        case 'D': {
            const lineCount = await countLinesInFile(absPath)
            return typeof lineCount === 'number' ? lineCount : 0
        }
    }

    console.warn('unsupported conflict reason: ', reason)
    console.warn(conflict)
    return 0
}

const getConflictsStats = async () => {
    const st = await status()
    const conflicts = st
        .filter(({a, b}) => a === 'U' || b === 'U')
        .map(({a, b, path}) => a === 'U' ?
                             {reason: b, path} : {reason: a, path})

    let totalLineCount = 0
    for (const conflict of conflicts) {
        totalLineCount += await getConflictLineCount(conflict)
    }
    return {lineCount: totalLineCount}
}

const merge = async (commit, base, newBranchName) => {
    console.log('merging ' + commit + ' into ' + base)

    await git([
        '-C', dir,
        'checkout',
        '-f',
        '-b', newBranchName,
        base,
    ])

    try {
        return await git([
            '-C', dir,
            'merge',
            commit,
        ])
    } catch (error) {
        if (error.stdout &&
            error.stdout.includes('CONFLICT') &&
            error.stdout.includes('fix conflicts and then commit')) {

            error.conflicts = await getConflictsStats()

            await git([
                '-C', dir,
                'merge',
                '--abort',
            ])
        }

        throw error
    }
}

const getBranches = async () => {
    const {stdout} = await git([
        '-C', dir,
        'branch',
        '--format=%(refname:lstrip=-1) %(objectname)',
    ])

    return stdout
        .split('\n')
        .map(line => line.trim())
        .filter(line => line)
        .map(line => line.split(' '))
        .map(([name, sha]) => ({name, sha}))
}

module.exports = {
    bootstrap,
    fetchPullRequests,
    getBranches,
    merge,
}
