
var assert = require('assert')
var stream = require('readable-stream')
var unpipe = require('..')
var util = require('util')

describe('unpipe(stream)', function () {
  describe('arguments', function () {
    describe('stream', function () {
      it('should be required', function () {
        assert.throws(unpipe, /argument stream is required/)
      })
    })
  })

  describe('stream with unpipe support', function () {
    it('should unpipe no destinations', function (done) {
      var stream = new SlowReadStream()

      process.nextTick(function () {
        unpipe(stream)
        done()
      })
    })

    it('should unpipe single destination', function (done) {
      var pipes = 0
      var stream = new SlowReadStream()
      var dest = new SlowWriteStream()

      dest.on('pipe', function () {
        pipes++
      })

      stream.on('resume', function () {
        assert.equal(pipes, 1)

        dest.on('unpipe', function (src) {
          assert.equal(src, stream)
          done()
        })

        unpipe(stream)
      })

      stream.pipe(dest)
    })

    it('should not remove custom close events', function (done) {
      var pipes = 0
      var stream = new SlowReadStream()
      var dest = new SlowWriteStream()

      dest.on('pipe', function () {
        pipes++
      })

      stream.on('resume', function () {
        assert.equal(pipes, 1)

        stream.on('close', done)

        unpipe(stream)
        stream.emit('close')
      })

      stream.pipe(dest)
    })
  })

  describe('stream without unpipe support', function () {
    it('should unpipe no destinations', function (done) {
      var stream = new SlowOldStream()

      process.nextTick(function () {
        unpipe(stream)
        done()
      })
    })

    it('should unpipe single destination', function (done) {
      var pipes = 0
      var stream = new SlowOldStream()
      var dest = new SlowWriteStream()

      dest.on('pipe', function () {
        pipes++
      })

      dest.once('write', function () {
        assert.equal(pipes, 1)
        dest.on('write', function () {
          throw new Error('unexpected write event')
        })

        unpipe(stream)
        stream.emit('data', 'pong')
        process.nextTick(done)
      })

      stream.pipe(dest)
      stream.emit('data', 'ping')
    })

    it('should not remove custom data events', function (done) {
      var pipes = 0
      var stream = new SlowOldStream()
      var dest = new SlowWriteStream()

      stream.on('data', function (chunk) {
        if (chunk === 'pong') {
          done()
        }
      })

      dest.on('pipe', function () {
        pipes++
      })

      dest.once('write', function () {
        assert.equal(pipes, 1)
        dest.on('write', function () {
          throw new Error('unexpected write event')
        })

        unpipe(stream)
        stream.emit('data', 'pong')
      })

      stream.pipe(dest)
      stream.emit('data', 'ping')
    })

    it('should not remove custom close events', function (done) {
      var pipes = 0
      var stream = new SlowOldStream()
      var dest = new SlowWriteStream()

      dest.on('pipe', function () {
        pipes++
      })

      dest.once('write', function () {
        assert.equal(pipes, 1)
        dest.on('write', function () {
          throw new Error('unexpected write event')
        })

        stream.on('close', done)

        unpipe(stream)
        stream.emit('data', 'pong')
        stream.emit('close')
      })

      stream.pipe(dest)
      stream.emit('data', 'ping')
    })
  })
})

function SlowOldStream() {
  stream.Stream.call(this)
}

util.inherits(SlowOldStream, stream.Stream)

function SlowReadStream() {
  stream.Readable.call(this)
}

util.inherits(SlowReadStream, stream.Readable)

SlowReadStream.prototype._read = function _read() {
  setTimeout(this.push.bind(this, '.'), 1000)
}

function SlowWriteStream() {
  stream.Writable.call(this)
}

util.inherits(SlowWriteStream, stream.Writable)

SlowWriteStream.prototype._write = function _write(chunk, encoding, callback) {
  this.emit('write')
  setTimeout(callback, 1000)
}
