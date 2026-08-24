import Cocoa

guard CommandLine.arguments.count == 3 else {
    fputs("Usage: make_opening_title_card.swift input.png output.png\n", stderr)
    exit(2)
}

let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])
guard let source = NSImage(contentsOf: inputURL),
      let sourceRep = source.representations.first,
      sourceRep.pixelsWide > 0,
      sourceRep.pixelsHigh > 0 else {
    fputs("Could not read title-card base image.\n", stderr)
    exit(1)
}

let size = CGSize(width: sourceRep.pixelsWide, height: sourceRep.pixelsHigh)
let rep = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: Int(size.width), pixelsHigh: Int(size.height),
    bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true,
    isPlanar: false, colorSpaceName: .deviceRGB,
    bitmapFormat: .alphaFirst, bytesPerRow: 0, bitsPerPixel: 0
)!
let context = NSGraphicsContext(bitmapImageRep: rep)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = context

let canvas = CGRect(origin: .zero, size: size)
source.draw(in: canvas, from: .zero, operation: .copy, fraction: 1)

// A restrained dark glass field turns the generated scene into an actual title card,
// while keeping the five silhouettes and the blast door visible beneath it.
let titleField = NSBezierPath(roundedRect: CGRect(x: 340, y: 407, width: 992, height: 220), xRadius: 2, yRadius: 2)
NSColor.black.withAlphaComponent(0.19).setFill()
titleField.fill()

func font(_ name: String, _ size: CGFloat, fallback: NSFont.Weight = .bold) -> NSFont {
    NSFont(name: name, size: size) ?? NSFont.systemFont(ofSize: size, weight: fallback)
}

func centered(_ text: String, rect: CGRect, font: NSFont, color: NSColor, kern: CGFloat, stroke: CGFloat = 0, strokeColor: NSColor = .clear) {
    let style = NSMutableParagraphStyle()
    style.alignment = .center
    let attrs: [NSAttributedString.Key: Any] = [
        .font: font,
        .foregroundColor: color,
        .paragraphStyle: style,
        .kern: kern,
        .strokeWidth: stroke,
        .strokeColor: strokeColor
    ]
    NSAttributedString(string: text, attributes: attrs).draw(in: rect)
}

// Cyan offset and a faint ember edge echo the teal/orange palette without looking like a default subtitle.
centered("全员同频", rect: CGRect(x: 340, y: 472, width: 992, height: 112),
         font: font("LantingheiSC-Demibold", 112),
         color: NSColor(calibratedRed: 0.10, green: 0.84, blue: 0.82, alpha: 0.62), kern: 16)
centered("全员同频", rect: CGRect(x: 340, y: 478, width: 992, height: 112),
         font: font("LantingheiSC-Demibold", 112),
         color: NSColor(calibratedRed: 0.96, green: 1.0, blue: 0.98, alpha: 1), kern: 16,
         stroke: -1.2, strokeColor: NSColor.black.withAlphaComponent(0.72))

centered("ALL  IN", rect: CGRect(x: 340, y: 434, width: 992, height: 34),
         font: font("HelveticaNeue-CondensedBold", 26),
         color: NSColor(calibratedRed: 0.60, green: 0.96, blue: 0.90, alpha: 0.93), kern: 12)

// Two thin signal bars finish the card and make the text feel part of the image world.
NSColor(calibratedRed: 0.39, green: 0.95, blue: 0.89, alpha: 0.65).setStroke()
let line = NSBezierPath()
line.lineWidth = 1.1
line.move(to: CGPoint(x: 561, y: 432))
line.line(to: CGPoint(x: 694, y: 432))
line.move(to: CGPoint(x: 978, y: 432))
line.line(to: CGPoint(x: 1111, y: 432))
line.stroke()

NSGraphicsContext.restoreGraphicsState()
try rep.representation(using: .png, properties: [:])!.write(to: outputURL)
