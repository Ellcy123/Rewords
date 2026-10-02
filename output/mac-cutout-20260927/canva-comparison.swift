import AppKit
import Foundation

let folder = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)

func load(_ name: String) -> NSImage {
    let url = folder.appendingPathComponent(name)
    guard let image = NSImage(contentsOf: url) else { fatalError("Cannot open \(url.path)") }
    return image
}

func reportAlpha(_ name: String) {
    let url = folder.appendingPathComponent(name)
    guard let rep = NSBitmapImageRep(data: (try? Data(contentsOf: url)) ?? Data()) else {
        fatalError("Cannot decode \(url.path)")
    }
    var transparent = 0
    var partial = 0
    for y in 0..<rep.pixelsHigh {
        for x in 0..<rep.pixelsWide {
            let alpha = rep.colorAt(x: x, y: y)!.usingColorSpace(.deviceRGB)!.alphaComponent
            if alpha == 0 { transparent += 1 }
            else if alpha < 1 { partial += 1 }
        }
    }
    let total = rep.pixelsWide * rep.pixelsHigh
    print("\(name): \(rep.pixelsWide)×\(rep.pixelsHigh), alpha present, transparent \(String(format: "%.1f", 100 * Double(transparent) / Double(total)))%, partial \(String(format: "%.1f", 100 * Double(partial) / Double(total)) )%")
}

let width = 1800
let height = 1110
let cell: CGFloat = 414
let columns: [CGFloat] = [36, 474, 912, 1350]
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
NSColor(calibratedRed: 0.055, green: 0.065, blue: 0.08, alpha: 1).setFill()
canvas.fill()

func drawText(_ string: String, x: CGFloat, y: CGFloat, size: CGFloat,
              color: NSColor, weight: NSFont.Weight = .regular) {
    let attrs: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: size, weight: weight),
        .foregroundColor: color
    ]
    (string as NSString).draw(at: NSPoint(x: x, y: y), withAttributes: attrs)
}

drawText("Canva background removal · preview comparison", x: 36, y: 1060, size: 25,
         color: .white, weight: .semibold)
let titles = ["Original", "Finder", "remove.bg", "Canva · 200 px preview"]
for (index, title) in titles.enumerated() {
    drawText(title, x: columns[index], y: 1018, size: 18,
             color: NSColor(calibratedWhite: 0.9, alpha: 1), weight: .medium)
}

func drawImage(_ image: NSImage, in rect: NSRect) {
    image.draw(in: rect, from: .zero, operation: .sourceOver, fraction: 1,
               respectFlipped: false, hints: [.interpolation: NSImageInterpolation.high])
}

let rows: [(String, [String], [String], CGFloat)] = [
    ("EASY", ["easy-original.png", "easy-cutout.png", "removebg-easy.png", "canva-easy-preview.png"],
     ["easy-original.png", "easy-cutout.png", "removebg-easy.png", "canva-easy-preview.png"], 560),
    ("HARD", ["hard-original.png", "hard-cutout.png", "removebg-hard.png", "canva-hard-preview.png"],
     ["hard-original.png", "hard-cutout.png", "removebg-hard.png", "canva-hard-preview.png"], 90)
]

for (label, files, _, y) in rows {
    drawText(label, x: 36, y: y + cell + 12, size: 16,
             color: NSColor(calibratedWhite: 0.72, alpha: 1), weight: .bold)
    for index in 0..<4 {
        let rect = NSRect(x: columns[index], y: y, width: cell, height: cell)
        NSColor(calibratedRed: 0.11, green: 0.125, blue: 0.15, alpha: 1).setFill()
        rect.fill()
        drawImage(load(files[index]), in: rect)
    }
}

drawText("Canva is shown from its 200 × 200 px thumbnail, enlarged for viewing; this is not a full-resolution quality comparison.",
         x: 36, y: 26, size: 14, color: NSColor(calibratedWhite: 0.76, alpha: 1))
context.flushGraphics()
NSGraphicsContext.restoreGraphicsState()

guard let data = rep.representation(using: .png, properties: [:]) else { fatalError("PNG encoding failed") }
let destination = folder.appendingPathComponent("canva-comparison.png")
try data.write(to: destination, options: .atomic)
print("Wrote \(destination.path) (\(width) × \(height))")
reportAlpha("canva-easy-preview.png")
reportAlpha("canva-hard-preview.png")
