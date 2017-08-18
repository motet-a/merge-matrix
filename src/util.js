const {promisify} = require('util')
const fs = require('fs')
const path = require('path')
const child_process = require('child_process')

const exec = promisify(child_process.execFile)

const fileExists = path =>
    new Promise(resolve =>
        fs.access(path, error => {
            resolve(!error)
        })
    )

const ensureVarDir = async () => {
    const dir = path.join(__dirname, '..', 'var')
    try {
        await promisify(fs.mkdir)(dir)
    } catch (error) {
        // ignore
    }
}

const isHexHash = string =>
    typeof string === 'string' &&
    !!string.match(/^[a-f0-9]{4,32}$/)

module.exports = {
    exec,
    fileExists,
    isHexHash,
    ensureVarDir,
}
