
const Koa = require('koa')
const router = require('koa-router')()

const mergeLogs = require('./merge-logs')
const cron = require('./cron')
const util = require('./util')
const git = require('./git')
const config = require('./config')

const app = new Koa()

app.use(require('./render'))

const repoHtmlUrl = 'https://github.com/' + config.owner + '/' + config.repo

const getPullHtmlUrl = number =>
    repoHtmlUrl + '/pull/' + number

const getBranchHtmlUrl = name =>
    repoHtmlUrl + '/branch/' + name

const commitShaLike = string =>
    string.match(/^[a-f0-9]{8,}$/) && string.match(/[0-9]/)

const getNameUrl = name =>
    name.match(/^#[0-9]+$/) ? repoHtmlUrl + '/pull/' + name.slice(1) :
    commitShaLike(name) ? repoHtmlUrl + '/commit/' + name :
    repoHtmlUrl + '/tree/' + name

const compareUrl = (a, b) =>
    repoHtmlUrl + '/compare/' + a + '...' + b


router
    .get('/', async ctx => {
        await ctx.render('index', {
            config: {
                ignore: config.ignore || [],
            },
            getNameUrl,
        })
    })

    .get('/merge/:aSha/:bSha', async ctx => {
        const {aSha, bSha} = ctx.params
        if (!util.isHexHash(aSha) || !util.isHexHash(aSha)) {
            ctx.status = 400
            return
        }

        const merge = await mergeLogs.get(aSha, bSha)

        if (!merge) {
            ctx.status = 404
            return
        }

        await ctx.render('merge', {
            merge,
            getNameUrl,
            compareUrl,
        })
    })


app.use(router.routes())

let server

const stop = () => {
    if (server) {
        server.close(() => {
            server = null
            stop()
        })
        return
    }

    process.exit()
}

process.on('SIGTERM', stop)
process.on('SIGINT', stop)

git
    .bootstrap()
    .then(() => {
        server = app.listen(8000)
    })
    .then(cron.bootstrap)
    .then(cron.start)
    .catch(error => {
        console.error(error)
    })
