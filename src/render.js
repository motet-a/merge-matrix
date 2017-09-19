'use strict'

const ejs = require('ejs')
const path = require('path')

const {getLinkInfo, getCompareUrl} = require('./links')
const cron = require('./cron')


const render = (templateName, data) => {
    const templatePath =
        path.join(__dirname, 'templates', templateName) + '.html'

    const defaultData = {
        detectConflicts: {
            running: cron.running(),
        },
        matrix: cron.matrix(),
        getLinkInfo,
        getCompareUrl,
    }

    const options = {
        strict: true,
        _with: false,
        localsName: '$',
    }

    return new Promise((resolve, reject) => {
        const newData = Object.assign({}, defaultData, data)

        ejs.renderFile(templatePath, newData, options, (err, html) => {
            if (err) {
                reject(err)
                return
            }

            resolve(html)
        })
    })
}

module.exports = async (ctx, next) => {
    ctx.render = async (...args) => {
        ctx.body = await render(...args)
    }

    await next()
}
