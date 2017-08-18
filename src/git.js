
const path = require('path')

const {exec, fileExists, ensureVarDir} = require('./util')
const github = require('./github')

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
