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

func drawText(_ string: String, x: CGFloat, y: CGFloat, size: CGFloat, color: NSColor, weight: NSFont.Weight = .regular) {
    let attrs: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: size, weight: weight),
        .foregroundColor: color
    ]
    (string as NSString).draw(at: NSPoint(x: x, y: y), withAttributes: attrs)
}

drawText("macOS Finder · Remove Background", x: 42, y: 1120, size: 25,
         color: NSColor(calibratedWhite: 0.12, alpha: 1), weight: .semibold)
let columns: [(CGFloat, String)] = [(42, "Original"), (534, "Transparent · checkerboard"), (1026, "Transparent · dark")]
for (x, title) in columns {
    drawText(title, x: x, y: 1080, size: 19, color: NSColor(calibratedWhite: 0.2, alpha: 1), weight: .medium)
}

let cell: CGFloat = 450
let rows: [(String, String, String, CGFloat)] = [
    ("HARD", "hard-original.png", "hard-cutout.png", 590),
    ("EASY", "easy-original.png", "easy-cutout.png", 70)
]

func drawImage(_ image: NSImage, in rect: NSRect) {
    image.draw(in: rect, from: .zero, operation: .sourceOver, fraction: 1,
               respectFlipped: false, hints: [.interpolation: NSImageInterpolation.high])
}
func drawCheckerboard(in rect: NSRect, tile: CGFloat = 22) {
    NSColor.white.setFill()
    rect.fill()
    var row = 0
    var y = rect.minY
    while y < rect.maxY {
        var column = 0
        var x = rect.minX
        while x < rect.maxX {
            if (row + column).isMultiple(of: 2) {
                NSColor(calibratedRed: 0.82, green: 0.85, blue: 0.89, alpha: 1).setFill()
                NSRect(x: x, y: y, width: min(tile, rect.maxX - x), height: min(tile, rect.maxY - y)).fill()
            }
            x += tile
            column += 1
        }
        y += tile
        row += 1
    }
}
for (label, originalName, cutoutName, y) in rows {
    drawText(label, x: 42, y: y + cell + 12, size: 17,
             color: NSColor(calibratedWhite: 0.28, alpha: 1), weight: .bold)
    let originalRect = NSRect(x: 42, y: y, width: cell, height: cell)
    let checkerRect = NSRect(x: 534, y: y, width: cell, height: cell)
    let darkRect = NSRect(x: 1026, y: y, width: cell, height: cell)

    NSColor(calibratedWhite: 1, alpha: 1).setFill()
    originalRect.fill()
    drawImage(load(originalName), in: originalRect)

    drawCheckerboard(in: checkerRect)
    drawImage(load(cutoutName), in: checkerRect)

    NSColor(calibratedRed: 0.13, green: 0.15, blue: 0.19, alpha: 1).setFill()
    darkRect.fill()
    drawImage(load(cutoutName), in: darkRect)
}

drawText("Finder outputs are shown unchanged; all panels use the original 1254 × 1254 canvas.",
         x: 42, y: 22, size: 14, color: NSColor(calibratedWhite: 0.34, alpha: 1))
context.flushGraphics()
NSGraphicsContext.restoreGraphicsState()

guard let data = rep.representation(using: .png, properties: [:]) else { fatalError("PNG encoding failed") }
let destination = folder.appendingPathComponent("comparison.png")
try data.write(to: destination, options: .atomic)
print("Wrote \(destination.path) (\(width) × \(height))")
