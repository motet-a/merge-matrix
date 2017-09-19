'use strict'

const assert = require('assert')
const {promisify} = require('util')
const fs = require('fs')
const path = require('path')

const config = require('./config')
const {fileExists, ensureVarDir} = require('./util')
const detectConflicts = require('./detect-conflicts')
const Matrix = require('./matrix')

let matrix = null
let running = false

const matrixFilePath = path.join(__dirname, '..', 'var', 'matrix.json')

const saveMatrix = async matrix => {
    await ensureVarDir()

    await promisify(fs.writeFile)(
        matrixFilePath,
        JSON.stringify(matrix.toJSON()),
    )
}

const loadMatrix = async () => {
    let buffer
    try {
        buffer = await promisify(fs.readFile)(matrixFilePath)
    } catch (error) {
        if (error.code === 'ENOENT') {
            return null
        }

        throw error
    }

    return Matrix.fromJSON(JSON.parse(buffer.toString()))
}

const tickImpl = async () => {
    const oldMatrix = matrix || new Matrix()
    const newMatrix = oldMatrix.update(await detectConflicts())
    matrix = newMatrix
    await saveMatrix(matrix)
}

const tick = async () => {
    assert(!running)
    running = true
    console.log('update begin')
    try {
        await tickImpl()
    } finally {
        running = false
        console.log('update end')
    }
}

const start = () => {
    const onTimeout = async () => {
        try {
            await tick()
        } catch (error) {
            console.error(error)
        }

        setTimeout(
            onTimeout,
            config.refreshRate * 1000,
        )
    }

    onTimeout()
}

const bootstrap = async () => {
    matrix = await loadMatrix()
}

module.exports = {
    start,
    running: () => running,
    matrix: () => matrix,
    bootstrap,
}
