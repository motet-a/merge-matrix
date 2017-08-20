
const fs = require('fs')

const countLinesInBuffer = buffer => {
    let count = 0
    let offset = 0
    while (true) {
        const i = buffer.indexOf('\n', offset)
        if (i === -1) {
            return count
        }
        offset = i + 1
        count++
    }
}

// Returns the string 'binary' in the case of a binary file
const countLinesInFile = path =>
    new Promise((resolve, reject) => {
        let lines = 0
        let binary = false

        fs.createReadStream(path)
          .on('data', buffer => {
              if (binary) {
                  return
              }

              if (buffer.includes(0)) {
                  binary = true
                  return
              }

              lines += countLinesInBuffer(buffer)
          })
          .on('error', error => reject(error))
          .on('end', () => resolve(binary ? 'binary' : lines))
    })

countLinesInFile.countLinesInBuffer = countLinesInBuffer

module.exports = countLinesInFile
