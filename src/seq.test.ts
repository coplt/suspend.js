import { Continue, Suspend } from './co'
import { Sequence } from './seq'

test('seq 1', () => {
    const r = [
        ...Sequence.seq<number>((ctx, co) => {
            return ctx.yield(
                1,
                new Continue(() => {
                    return ctx.yield(
                        2,
                        new Continue(() => {
                            return ctx.yield(3, co)
                        })
                    )
                })
            )
        }),
    ]
    expect(r).toEqual([1, 2, 3])
})

test('seq 2', () => {
    const r = [
        ...Sequence.seq<number>((ctx, co) => {
            return ctx.yieldAll([1, 2, 3], co)
        }),
    ]
    expect(r).toEqual([1, 2, 3])
})

function fib(n: number) {
    return Sequence.seq<number>((ctx, co) => {
        let [i, x, y] = [0, 0, 1]
        const loop = (): Suspend<void> => {
            if (i >= n) return co.suspend(void 0)
            return ctx.yield(
                y,
                new Continue(() => {
                    ;[x, y] = [y, x + y]
                    i++
                    return loop()
                })
            )
        }

        return loop()
    })
}

test('seq fib', () => {
    const r = [...fib(10)]
    expect(r).toEqual([1, 1, 2, 3, 5, 8, 13, 21, 34, 55])
})

function* take<T>(n: number, iter: Iterable<T>): Iterable<T> {
    let i = 0
    for (const v of iter) {
        if (i >= n) return
        yield v
        i++
    }
}

function partA(ctx: Sequence<number>, co: Continue<void>): Suspend<void> {
    return ctx.yield(1, new Continue(() => partB(ctx, co)))
}
function partB(ctx: Sequence<number>, co: Continue<void>): Suspend<void> {
    return ctx.yield(2, new Continue(() => partA(ctx, co)))
}

test('seq multi part', () => {
    const r = [...take(5, Sequence.seq(partA))]
    expect(r).toEqual([1, 2, 1, 2, 1])
})
