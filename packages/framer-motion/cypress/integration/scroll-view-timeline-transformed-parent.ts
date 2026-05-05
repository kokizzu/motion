/**
 * Regression test for #3658.
 *
 * Two identical 200vh targets side-by-side, both using
 * useScroll({ offset: ["start start", "end end"] }). The right one is
 * wrapped in a motion.div with scale: 0.95.
 *
 * Layout positions are identical for both targets (transforms don't affect
 * layout), so scrollYProgress must match at every scroll position. If the
 * WAAPI ViewTimeline path is sensitive to ancestor transforms, "scaled"
 * will diverge from "plain".
 *
 * Use real Chrome (`--browser chrome`) — Electron's WAAPI/ViewTimeline
 * implementation differs.
 */

const readProgress = (id: string) =>
    cy.get(`#${id}-progress`).then(([$el]: any) => parseFloat($el.innerText))

const scrollToPx = (px: number) =>
    cy.window().then((win) => {
        win.scrollTo(0, px)
    })

const readWaapi = () =>
    cy
        .get("#opacity-probe")
        .then(([$el]: any) => parseFloat(getComputedStyle($el).opacity))
const readJs = () =>
    cy.get("#js-progress").then(([$el]: any) => parseFloat($el.innerText))

describe("useScroll + transformed ancestor (regression for #3658)", () => {
    it("attaches ViewTimeline (not ScrollTimeline) to inner motion components", () => {
        cy.visit("?test=scroll-view-timeline-transformed-parent").wait(500)
        cy.get("#opacity-probe").then(([$el]: any) => {
            const anims = $el.getAnimations()
            expect(
                anims.length,
                "opacity-probe should have a WAAPI animation"
            ).to.be.greaterThan(0)
            const a = anims[0]
            expect(a.timeline?.constructor?.name).to.equal("ViewTimeline")
            // rangeStart/rangeEnd are TimelineRangeOffset objects in Chrome
            // ({ rangeName, offset }). Coerce both shapes to a comparable string.
            const stringify = (r: any) =>
                r && typeof r === "object" && "rangeName" in r
                    ? `${r.rangeName} ${r.offset?.value ?? r.offset}${r.offset?.unit ?? ""}`
                    : String(r)
            expect(stringify(a.rangeStart)).to.match(/contain/)
            expect(stringify(a.rangeEnd)).to.match(/contain/)
        })
    })

    it("WAAPI and JS paths agree on the same target across the scroll range", () => {
        cy.visit("?test=scroll-view-timeline-transformed-parent").wait(500)

        cy.window().then((win) => {
            const vh = win.innerHeight
            const stops: Array<{ label: string; y: number }> = [
                { label: "before", y: 0.5 * vh },
                { label: "enter", y: vh },
                { label: "25%", y: vh + 0.25 * vh },
                { label: "50%", y: vh + 0.5 * vh },
                { label: "75%", y: vh + 0.75 * vh },
                { label: "exit", y: 2 * vh },
            ]
            const lines: string[] = []
            const drift: number[] = []

            cy.wrap(stops)
                .each((stop: any) => {
                    scrollToPx(stop.y)
                    cy.wait(200)
                    readWaapi().then((w) => {
                        readJs().then((j) => {
                            lines.push(
                                `[${stop.label}] y=${stop.y} waapi=${w.toFixed(4)} js=${j.toFixed(4)}`
                            )
                            drift.push(Math.abs(w - j))
                        })
                    })
                })
                .then(() => {
                    const maxDrift = Math.max(...drift)
                    const summary = lines.join(" | ")
                    expect(maxDrift, summary).to.be.lessThan(0.01)
                })
        })
    })
})
