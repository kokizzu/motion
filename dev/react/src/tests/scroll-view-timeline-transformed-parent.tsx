/**
 * Reproduction of #3658 (literal port of reporter's repro).
 *
 * The bug: nested motion components inside a useScroll target end up bound
 * to a generic ScrollTimeline (cover-range default) instead of the intended
 * ViewTimeline, because their bindToMotionValue runs before the outer
 * target ref has been attached.
 *
 * Surfaces:
 *  - #opacity-probe: motion.div whose opacity = scrollYProgress (0→1).
 *    Reading getComputedStyle(opacity) reflects what the compositor (WAAPI)
 *    is drawing — independent of the JS-driven motion value.
 *  - #js-progress: a second scroll() with a 2-arg callback, which always
 *    takes the JS scrollInfo path. Provides the expected layout-based
 *    progress to compare against.
 */
import { motion, scroll, useScroll, useTransform } from "framer-motion"
import * as React from "react"
import { useEffect, useRef } from "react"

const FullRangeProbe = ({ progress }: { progress: any }) => {
    const opacity = useTransform(progress, [0, 1], [0, 1])
    return (
        <motion.div
            id="opacity-probe"
            style={{
                width: 40,
                height: 40,
                background: "magenta",
                opacity,
            }}
        />
    )
}

const TextReveal = ({ text }: { text: string }) => {
    const ref = useRef<HTMLDivElement>(null)
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start start", "end end"],
    })

    const jsRef = useRef<HTMLSpanElement>(null)

    useEffect(() => {
        if (!ref.current) return
        // 2-arg callback forces the JS scrollInfo path (see attach-function.ts).
        return scroll(
            (_progress: number, info: any) => {
                if (jsRef.current)
                    jsRef.current.innerText = info.y.progress.toFixed(4)
            },
            {
                target: ref.current,
                offset: ["start start", "end end"] as any,
            }
        )
    }, [])

    const words = text.split(" ")
    return (
        <div ref={ref} style={{ position: "relative", height: "200vh" }}>
            <div
                style={{
                    position: "sticky",
                    top: 0,
                    height: "50%",
                    display: "flex",
                    alignItems: "center",
                    flexDirection: "column",
                    gap: 16,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        gap: 16,
                        fontFamily: "monospace",
                        fontSize: 18,
                    }}
                >
                    <span>
                        js:{" "}
                        <span id="js-progress" ref={jsRef}>
                            0
                        </span>
                    </span>
                </div>
                <FullRangeProbe progress={scrollYProgress} />
                <p
                    style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                        fontSize: 32,
                    }}
                >
                    {words.map((word, i) => {
                        const start = i / words.length
                        const end = start + 1 / words.length
                        const opacity = useTransform(
                            scrollYProgress,
                            [start, end],
                            [0.2, 1]
                        )
                        return (
                            <motion.span
                                key={i}
                                style={{ opacity, color: "cyan" }}
                            >
                                {word}
                            </motion.span>
                        )
                    })}
                </p>
            </div>
        </div>
    )
}

const ClipReveal = ({ children }: { children: React.ReactNode }) => {
    const ref = useRef<HTMLDivElement>(null)
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "start 0.3"],
    })
    const clipPath = useTransform(
        scrollYProgress,
        [0, 1],
        ["inset(8% 12% round 24px)", "inset(0% 0% round 0px)"]
    )
    const scale = useTransform(scrollYProgress, [0, 1], [0.95, 1])

    return (
        <div ref={ref}>
            <motion.div style={{ clipPath, scale }}>{children}</motion.div>
        </div>
    )
}

export const App = () => {
    return (
        <div style={{ background: "#111", color: "#fff", minHeight: "100vh" }}>
            <div
                style={{
                    height: "100vh",
                    display: "grid",
                    placeItems: "center",
                }}
            >
                <h1>Scroll down ↓</h1>
            </div>

            <ClipReveal>
                <section
                    style={{
                        background: "#000",
                        minHeight: "50vh",
                        paddingTop: 40,
                    }}
                >
                    <TextReveal text="Building digital experiences that blur the line between imagination and reality." />
                </section>
            </ClipReveal>

            <div
                style={{
                    height: "100vh",
                    display: "grid",
                    placeItems: "center",
                }}
            >
                <h1>End</h1>
            </div>
        </div>
    )
}
