'use strict'

const {promisify} = require('util')
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const {fileExists, ensureVarDir} = require('./util')

const dirPath = path.join(__dirname, '..', 'var', 'merge-logs')

const save = async results => {
    await ensureVarDir()

    if (!await fileExists(dirPath)) {
        await promisify(fs.mkdir)(dirPath)
    }

    for (const result of results) {
        const fileName = result.aSha + '-' + result.bSha
        const compressed = await promisify(zlib.gzip)(JSON.stringify(result))
        await promisify(fs.writeFile)(
            path.join(dirPath, fileName),
            compressed,
        )
    }
}

const get = async (aSha, bSha) => {
    const filePath = path.join(dirPath, aSha + '-' + bSha)
    let compressed
    try {
        compressed = await promisify(fs.readFile)(filePath)
    } catch (error) {
        if (error.code === 'ENOENT') {
            return null
        }

        throw error
    }
    const buffer = await promisify(zlib.gunzip)(compressed)
    return JSON.parse(buffer.toString())
}

module.exports = {
    save,
    get,
}
