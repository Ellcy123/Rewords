import Cocoa

guard CommandLine.arguments.count == 3 else {
    fputs("Usage: render_bilingual_subtitles.swift input.ass output-directory\n", stderr)
    exit(2)
}

let assURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2], isDirectory: true)
try FileManager.default.createDirectory(at: outputURL, withIntermediateDirectories: true)

let ass = try String(contentsOf: assURL, encoding: .utf8)
let tagPattern = try NSRegularExpression(pattern: "\\{[^}]*\\}")

func clean(_ text: String) -> String {
    let range = NSRange(text.startIndex..., in: text)
    let withoutTags = tagPattern.stringByReplacingMatches(in: text, options: [], range: range, withTemplate: "")
    return withoutTags.replacingOccurrences(of: "\\N", with: "\n")
}

func chosenFont(_ postScriptName: String, size: CGFloat) -> NSFont {
    NSFont(name: postScriptName, size: size) ?? NSFont.systemFont(ofSize: size, weight: .medium)
}

func hasCJK(_ text: String) -> Bool {
    text.unicodeScalars.contains { scalar in
        (0x3400...0x9FFF).contains(scalar.value) || (0xAC00...0xD7A3).contains(scalar.value)
    }
}

func drawCentered(_ text: String, in rect: CGRect, fontName: String, size: CGFloat, color: NSColor, stroke: CGFloat = -1.4, kern: CGFloat = 0) {
    let style = NSMutableParagraphStyle()
    style.alignment = .center
    style.lineBreakMode = .byTruncatingTail
    let attributes: [NSAttributedString.Key: Any] = [
        .font: chosenFont(fontName, size: size),
        .foregroundColor: color,
        .strokeColor: NSColor.black.withAlphaComponent(0.76),
        .strokeWidth: stroke,
        .kern: kern,
        .paragraphStyle: style
    ]
    NSAttributedString(string: text, attributes: attributes).draw(in: rect)
}

func textWidth(_ text: String, fontName: String, size: CGFloat) -> CGFloat {
    NSAttributedString(string: text, attributes: [.font: chosenFont(fontName, size: size)]).size().width
}

var eventIndex = 0
for line in ass.split(whereSeparator: \.isNewline) where line.hasPrefix("Dialogue:") {
    let payload = line.dropFirst("Dialogue:".count).trimmingCharacters(in: .whitespaces)
    let fields = payload.split(separator: ",", maxSplits: 9, omittingEmptySubsequences: false)
    guard fields.count == 10 else { continue }
    let style = String(fields[3])
    let text = clean(String(fields[9]))
    let isTitle = style == "Title"
    let width = isTitle ? 920 : 1540
    let height = isTitle ? 168 : 132
    let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: width,
        pixelsHigh: height,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bitmapFormat: .alphaFirst,
        bytesPerRow: 0,
        bitsPerPixel: 0
    )!
    let context = NSGraphicsContext(bitmapImageRep: rep)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = context
    context.cgContext.clear(CGRect(x: 0, y: 0, width: width, height: height))

    if isTitle {
        let titleRect = CGRect(x: 28, y: 37, width: width - 56, height: 96)
        drawCentered(text, in: titleRect.offsetBy(dx: 0, dy: -3), fontName: "PingFangSC-Semibold", size: 88, color: NSColor(calibratedRed: 0.18, green: 0.94, blue: 0.88, alpha: 0.68), stroke: 0, kern: 8)
        drawCentered(text, in: titleRect, fontName: "PingFangSC-Semibold", size: 88, color: NSColor(calibratedRed: 0.95, green: 1.0, blue: 0.97, alpha: 1.0), stroke: -1.0, kern: 8)
    } else {
        let lines = text.split(separator: "\n", maxSplits: 1, omittingEmptySubsequences: false).map(String.init)
        let first = lines.first ?? ""
        let second = lines.count > 1 ? lines[1] : ""
        let primaryFont = hasCJK(first) ? "PingFangSC-Medium" : "HelveticaNeue-CondensedBold"
        let primarySize: CGFloat = hasCJK(first) ? 46 : 52
        let secondaryIsCJK = hasCJK(second)
        let secondaryFont = secondaryIsCJK ? "PingFangSC-Medium" : "HelveticaNeue-CondensedBold"
        let secondarySize: CGFloat = secondaryIsCJK ? 34 : 32
        let cardWidth = min(CGFloat(width - 120), max(textWidth(first, fontName: primaryFont, size: primarySize), textWidth(second, fontName: secondaryFont, size: secondarySize)) + 116)
        let background = NSBezierPath(roundedRect: CGRect(x: (CGFloat(width) - cardWidth) / 2, y: 9, width: cardWidth, height: CGFloat(height - 18)), xRadius: 12, yRadius: 12)
        NSColor.black.withAlphaComponent(0.20).setFill()
        background.fill()
        drawCentered(first, in: CGRect(x: 40, y: 67, width: width - 80, height: 50), fontName: primaryFont, size: primarySize, color: .white, stroke: -1.2, kern: hasCJK(first) ? 1.2 : 1.0)
        drawCentered(second, in: CGRect(x: 40, y: 21, width: width - 80, height: 42), fontName: secondaryFont, size: secondarySize, color: NSColor(calibratedRed: 0.60, green: 0.95, blue: 0.88, alpha: 1.0), stroke: -0.8, kern: secondaryIsCJK ? 0.7 : 0.8)
    }

    NSGraphicsContext.restoreGraphicsState()
    let filename = String(format: "%03d_%@.png", eventIndex, isTitle ? "title" : "subtitle")
    let pngURL = outputURL.appendingPathComponent(filename)
    try rep.representation(using: .png, properties: [:])!.write(to: pngURL)
    eventIndex += 1
}
