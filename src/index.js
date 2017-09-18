
const Koa = require('koa')
const router = require('koa-router')()
const compress = require('koa-compress')

const mergeLogs = require('./merge-logs')
const cron = require('./cron')
const util = require('./util')
const git = require('./git')
const config = require('./config')

const app = new Koa()

app.use(compress({
    threshold: 2048,
    flush: require('zlib').Z_SYNC_FLUSH,
}))

app.use(require('./render'))


router
    .get('/', async ctx => {
        await ctx.render('index', {
            config: {
                ignore: config.ignore || [],
            },
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
