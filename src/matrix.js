
const assert = require('assert')

// Removes some properties for persistence
const filterMergeResult = merge => {
    return {
        a: merge.a,
        b: merge.b,
        aSha: merge.aSha,
        bSha: merge.bSha,
        code: merge.code,
        conflicts: merge.conflicts,
    }
}

const indexMergeResults = mergeResults => {
    const matrix = Object.create(null)

    for (const merge of mergeResults) {
        matrix[merge.a + ' ' + merge.b] = merge
    }
    return matrix
}

// Consider this class as immutable
class Matrix {
    construct() {
        this._pulls = []
        this._branchNames = []

        // maps pull numbers or branch names to merge results
        this._matrix = {}

        this._timestamp = Date.now()
    }

    // result: Object returned from detectConflicts()
    update(result) {
        const m = new Matrix()

        assert(result.pulls)
        assert(result.timestamp)
        m._pulls = result.pulls
        m._branchNames = result.branchNames || []
        m._matrix = Object.assign(
            Object.create(null),
            this.matrix,
            indexMergeResults(result.mergeResults.map(filterMergeResult)),
        )

        m._timestamp = result.timestamp

        return m
    }

    get pulls() {
        return this._pulls
    }

    get branchNames() {
        return this._branchNames
    }

    get indices() {
        assert(this._pulls)

        return this.branchNames
                   .concat(
                       this.pulls
                           .map(p => '#' + p.number)
                   )
    }

    get matrix() {
        return this._matrix
    }

    get(a, b) {
        return this._matrix[a + ' ' + b]
    }

    getPull(key) {
        return this.pulls
                   .find(pull => pull.number + '' === key.slice(1))
    }

    getKeyTitle(key) {
        const pull = this.getPull(key)
        return pull ? pull.title : ''
    }

    get timestamp() {
        return this._timestamp
    }

    toJSON() {
        return {
            pulls: this.pulls,
            branchNames: this.branchNames,
            matrix: this.matrix,
            timestamp: this.timestamp,
        }
    }
}

Matrix.fromJSON = json => {
    const m = new Matrix()
    m._pulls = json.pulls
    m._branchNames = json.branchNames
    m._matrix = json.matrix
    m._timestamp = json.timestamp || Date.now()
    return m
}

module.exports = Matrix
