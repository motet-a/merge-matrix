
const {promisify} = require('util')
const fs = require('fs')
const path = require('path')

const {fileExists, ensureVarDir} = require('./util')

const dirPath = path.join(__dirname, '..', 'var', 'merge-logs')

const save = async results => {
    await ensureVarDir()

    if (!await fileExists(dirPath)) {
        await promisify(fs.mkdir)(dirPath)
    }

    for (result of results) {
        const fileName = result.aSha + '-' + result.bSha
        await promisify(fs.writeFile)(
            path.join(dirPath, fileName),
            JSON.stringify(result),
        )
    }
}

const get = async (aSha, bSha) => {
    const filePath = path.join(dirPath, aSha + '-' + bSha)
    let buffer
    try {
        buffer = await promisify(fs.readFile)(filePath)
    } catch (error) {
        if (error.code === 'ENOENT') {
            return null
        }

        throw error
    }
    return JSON.parse(buffer.toString())
}

module.exports = {
    save,
    get,
}
