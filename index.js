const path = require('path')
const fs = require('fs')
const express = require('express')
const cookieParser = require('cookie-parser')
const app = express()
const http = require('http').Server(app)
const shell = require('shelljs')

const PORT = process.env.PORT || 3000

const REPOSITORY = 'https://github.com/Toofifty/toofifty.github.io'
const MASTER = path.join('revision', 'master')
const UP_TWO = path.join('..', '..')

if (!shell.which('git')) {
    console.log('This script requires Git.')
    exit()
}

if (!fs.existsSync(MASTER)) {
    console.log('Initializing master revision...')
    shell.exec(`git clone ${REPOSITORY} ` + path.join('revision', 'master'))
} else {
    console.log('Updating master revision...')
    shell.cd(MASTER)
    shell.exec('git pull --no-ff origin master')
    shell.cd(UP_TWO)
}
console.log('Done.')

const createRevision = (revision, callback) => {
    let revisionPath = path.join('revision', revision)
    console.log('Creating revision: ' + revisionPath)
    if (shell.cp('-r', MASTER, revisionPath)) {
        shell.cd(revisionPath)
        shell.exec(`git reset --hard ${revision}`, () => {
            shell.cd(UP_TWO)
            callback(revisionPath)
        })
    } else {
        callback(revisionPath)
    }
}

app.use(cookieParser())

const serveMaster = (req, res) => {
    res.cookie('revision', 'master', { maxAge: 1000 })
    res.status(200).sendFile(path.resolve(__dirname, MASTER, 'index.html'))
}

app.get('/', serveMaster)

app.get('/:revision*', (req, res) => {

    let revision = req.params.revision.toLowerCase()

    if (/[;|'"]/g.exec(revision) !== null || /&&/g.exec(revision) !== null) {
        return res.status(404).send('pls no hack!!')
    }

    if (revision == 'master') {
        return serveMaster(req, res)
    }

    if (req.cookies.revision && req.cookies.revision !== '') {
        let file = path.resolve(__dirname, 'revision', req.cookies.revision, req.url.substr(1, req.url.length))
        res.status(200).sendFile(file)

    } else {
        createRevision(revision, (revisionPath) => {
            res.cookie('revision', req.revision, { maxAge: 1000 })
            res.status(200).sendFile(path.resolve(__dirname, revisionPath, 'index.html'))
        })
    }
})

http.listen(PORT, () => {
    console.log(`History server listening on port ${PORT}`)
})
