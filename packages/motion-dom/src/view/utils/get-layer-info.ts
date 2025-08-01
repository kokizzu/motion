export function getViewAnimationLayerInfo(pseudoElement: string) {
    const match = pseudoElement.match(
        /::view-transition-(old|new|group|image-pair)\((.*?)\)/
    )
    if (!match) return null

    return { layer: match[2], type: match[1] }
}
