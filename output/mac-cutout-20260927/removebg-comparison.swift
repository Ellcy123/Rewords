import AppKit
import Foundation

let folder = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
func load(_ name: String) -> NSImage {
    let url = folder.appendingPathComponent(name)
    guard let image = NSImage(contentsOf: url) else { fatalError("Cannot open \(url.path)") }
    return image
}

let width = 1500
let height = 1170
let cell: CGFloat = 450
let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: width, pixelsHigh: height,
                           bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true,
                           isPlanar: false, colorSpaceName: .deviceRGB,
                           bytesPerRow: 0, bitsPerPixel: 0)!
let context = NSGraphicsContext(bitmapImageRep: rep)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = context
context.imageInterpolation = .high
context.shouldAntialias = true

let canvas = NSRect(x: 0, y: 0, width: width, height: height)
NSColor(calibratedWhite: 0.965, alpha: 1).setFill()
canvas.fill()

func drawText(_ string: String, x: CGFloat, y: CGFloat, size: CGFloat,
              color: NSColor, weight: NSFont.Weight = .regular) {
    let attrs: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: size, weight: weight),
        .foregroundColor: color
    ]
    (string as NSString).draw(at: NSPoint(x: x, y: y), withAttributes: attrs)
}

func drawImage(_ image: NSImage, in rect: NSRect) {
    image.draw(in: rect, from: .zero, operation: .sourceOver, fraction: 1,
               respectFlipped: false, hints: [.interpolation: NSImageInterpolation.high])
}

let columns: [(CGFloat, String)] = [
    (42, "Original · 1254 × 1254"),
    (534, "Finder · 1254 × 1254"),
    (1026, "remove.bg Free · 500 × 500")
]
drawText("remove.bg free preview vs Finder background removal", x: 42, y: 1120,
         size: 25, color: NSColor(calibratedWhite: 0.12, alpha: 1), weight: .semibold)
for (x, title) in columns {
    drawText(title, x: x, y: 1080, size: 18,
             color: NSColor(calibratedWhite: 0.2, alpha: 1), weight: .medium)
}

let dark = NSColor(calibratedRed: 0.13, green: 0.15, blue: 0.19, alpha: 1)
let rows: [(String, String, String, String, CGFloat)] = [
    ("HARD · dog / fur + weeds", "hard-original.png", "hard-cutout.png", "removebg-hard.png", 590),
    ("EASY · rocket / pale fringe", "easy-original.png", "easy-cutout.png", "removebg-easy.png", 70)
]

for (label, originalName, finderName, removeBGName, y) in rows {
    drawText(label, x: 42, y: y + cell + 12, size: 17,
             color: NSColor(calibratedWhite: 0.28, alpha: 1), weight: .bold)
    let originalRect = NSRect(x: 42, y: y, width: cell, height: cell)
    let finderRect = NSRect(x: 534, y: y, width: cell, height: cell)
    let removeBGRect = NSRect(x: 1026, y: y, width: cell, height: cell)

    NSColor.white.setFill()
    originalRect.fill()
    drawImage(load(originalName), in: originalRect)

    dark.setFill()
    finderRect.fill()
    drawImage(load(finderName), in: finderRect)

    dark.setFill()
    removeBGRect.fill()
    drawImage(load(removeBGName), in: removeBGRect)
}

drawText("Transparent outputs composited on the same dark background; remove.bg export is the free 500 × 500 preview.",
         x: 42, y: 22, size: 14, color: NSColor(calibratedWhite: 0.34, alpha: 1))
context.flushGraphics()
NSGraphicsContext.restoreGraphicsState()

guard let data = rep.representation(using: .png, properties: [:]) else { fatalError("PNG encoding failed") }
let destination = folder.appendingPathComponent("removebg-comparison.png")
try data.write(to: destination, options: .atomic)
print("Wrote \(destination.path) (\(width) × \(height))")
