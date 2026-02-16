import { complex } from "."
import { AnyResolvedKeyframe } from "../../../animation/types"
import { Color } from "../types"

const makeOpaque = (v: number | Color | string) => {
    if (typeof v === "number") return 0
    if (typeof v === "object" && "alpha" in v) return { ...v, alpha: 1 }
    return v
}

function getAnimatableNone(v: AnyResolvedKeyframe) {
    const parsed = complex.parse(v)
    const transformer = complex.createTransformer(v)
    return transformer(parsed.map(makeOpaque))
}

export const mask = {
    ...complex,
    getAnimatableNone,
}
