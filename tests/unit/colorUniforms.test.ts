import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'
import {
    COLOR_UNIFORM_FIELDS,
    COLOR_UNIFORM_FLOAT_COUNT,
    colorUniformByteOffset,
    orbitTrapUniforms,
    packColorUniformRun,
    packColorUniforms,
    type ColorUniforms,
} from '../../src/colorUniforms'
import {orbitTrapColorUniformValues, normalizeOrbitTrapConfig} from '../../src/OrbitTrap'

const shader = readFileSync(new URL('../../src/assets/color.wgsl', import.meta.url), 'utf8')

/** Field names of `struct Uniforms { ... }` in color.wgsl, in declaration order. */
function wgslUniformFields(): { name: string; type: string }[] {
    const start = shader.indexOf('struct Uniforms {')
    const body = shader.slice(shader.indexOf('{', start) + 1, shader.indexOf('};', start))
    return body.split('\n')
        .map(line => line.replace(/\/\/.*$/, '').trim())
        .filter(Boolean)
        .map(line => {
            const match = /^(\w+)\s*:\s*(\w+)\s*,?$/.exec(line)
            if (!match) throw new Error(`unparsed uniform line: ${line}`)
            return { name: match[1], type: match[2] }
        })
}

describe('colour uniform layout', () => {
    it('matches color.wgsl field by field, all f32', () => {
        const fields = wgslUniformFields()
        expect(fields.map(f => f.name)).toEqual([...COLOR_UNIFORM_FIELDS])
        expect(fields.every(f => f.type === 'f32')).toBe(true)
        expect(COLOR_UNIFORM_FLOAT_COUNT).toBe(104)
    })

    it('packs by name into the declared slots', () => {
        const values = Object.fromEntries(COLOR_UNIFORM_FIELDS.map((field, i) => [field, i + 0.5])) as ColorUniforms
        const data = packColorUniforms(values)
        expect(data.length).toBe(104)
        expect(data[colorUniformByteOffset('rawOriginX') / 4]).toBe(96.5)
        expect(data[colorUniformByteOffset('liveShiftU') / 4]).toBe(65.5)
        expect(data[colorUniformByteOffset('liveShiftV') / 4]).toBe(67.5)
        expect(data[colorUniformByteOffset('aaAnalytic') / 4]).toBe(63.5)
    })

    it('packs a contiguous run for a partial write and refuses a gap', () => {
        const run = packColorUniformRun({ stereoHeightPass: 1, stereoEyeSlope: 0.25 })
        expect(run.byteOffset).toBe(102 * 4)
        expect([...run.data]).toEqual([0.25, 1])
        expect(() => packColorUniformRun({ liveShiftU: 0, liveShiftV: 0 })).toThrow('not contiguous')
    })

    it('names the orbit-trap block in the order of its packer', () => {
        const config = normalizeOrbitTrapConfig({ mode: 'exact', centerX: 0.3, petals: 5, includeInterior: true } as never, 40)
        const named = orbitTrapUniforms(config)
        expect(Object.values(named)).toEqual(orbitTrapColorUniformValues(config))
        const start = COLOR_UNIFORM_FIELDS.indexOf('orbitTrapMode')
        expect(COLOR_UNIFORM_FIELDS.slice(start, start + 21)).toEqual(Object.keys(named))
    })
})
