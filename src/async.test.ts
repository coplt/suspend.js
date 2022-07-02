import { Async } from './async'
import { Continue } from './co'

function delay(ms: number) {
    return new Promise<void>(res => {
        setTimeout(res, ms)
    })
}

test('async 1', async () => {
    const r = await Async.run<number>(co => {
        return Async.await(
            delay(0),
            new Continue(() => {
                return co.suspend(1)
            })
        )
    })
    expect(r).toBe(1)
})

test('async 2', async () => {
    const r = await Async.run<number>(co => {
        return Async.delay(
            0,
            new Continue(() => {
                return co.suspend(1)
            })
        )
    })
    expect(r).toBe(1)
})

test('async err ', async () => {
    try {
        await Async.run<number>(() => {
            return Async.delay(
                0,
                new Continue(() => {
                    throw 'err'
                })
            )
        })
        throw 'never'
    } catch (e) {
        expect(e).toBe('err')
    }
})

test('async err 2', async () => {
    try {
        await Async.run<number>(co => {
            return Async.delay(
                0,
                new Continue(() => {
                    return co.error('err')
                })
            )
        })
        throw 'never'
    } catch (e) {
        expect(e).toBe('err')
    }
})
