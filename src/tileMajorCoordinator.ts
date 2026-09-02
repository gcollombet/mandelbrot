export type TileMajorStepResult<T = undefined> = {
    cancelled: boolean
    value?: T
}

/** Pure outer loop: every temporal frame of one tile completes before the next. */
export async function runTileMajorCoordinator<TTile>(settings: {
    tiles: readonly TTile[]
    isCompleted(tile: TTile): boolean
    renderTile(tile: TTile): Promise<TileMajorStepResult>
    signal?: {aborted: boolean}
}): Promise<{cancelled: boolean; visited: TTile[]}> {
    const visited: TTile[] = []
    for (const tile of settings.tiles) {
        if (settings.isCompleted(tile)) continue
        if (settings.signal?.aborted) return {cancelled: true, visited}
        visited.push(tile)
        const result = await settings.renderTile(tile)
        if (result.cancelled || settings.signal?.aborted) return {cancelled: true, visited}
    }
    return {cancelled: false, visited}
}
