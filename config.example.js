// Example configuration. The real configuration file is named `config.js`.
// Feel free to require() node modules or to use environment variables.

module.exports = {
    owner: 'zestedesavoir',
    repo: 'zds-site',

    ignore: [
        '#3863', // PR numbers to ignore
    ],

    // in seconds
    refreshRate: 5 * 60,

    github: {
        auth: {
            type: 'token',
            token: 'somesecretgithubtoken',
        },
    },
}
