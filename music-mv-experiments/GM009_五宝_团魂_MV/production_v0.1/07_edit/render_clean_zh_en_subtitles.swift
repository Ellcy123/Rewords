import Cocoa

guard CommandLine.arguments.count == 3 else {
    fputs("Usage: render_clean_zh_en_subtitles.swift input.ass output-directory\n", stderr)
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

func font(_ postScriptName: String, size: CGFloat, fallback: NSFont.Weight = .medium) -> NSFont {
    NSFont(name: postScriptName, size: size) ?? NSFont.systemFont(ofSize: size, weight: fallback)
}

func hasCJK(_ text: String) -> Bool {
    text.unicodeScalars.contains { scalar in
        (0x3400...0x9FFF).contains(scalar.value)
    }
}

func drawCentered(_ text: String, rect: CGRect, font: NSFont, color: NSColor, kern: CGFloat, stroke: CGFloat) {
    let style = NSMutableParagraphStyle()
    style.alignment = .center
    style.lineBreakMode = .byClipping
    let shadow = NSShadow()
    shadow.shadowColor = NSColor.black.withAlphaComponent(0.94)
    shadow.shadowOffset = NSSize(width: 0, height: -2)
    shadow.shadowBlurRadius = 5
    let attributes: [NSAttributedString.Key: Any] = [
        .font: font,
        .foregroundColor: color,
        .strokeColor: NSColor.black.withAlphaComponent(0.92),
        .strokeWidth: stroke,
        .kern: kern,
        .paragraphStyle: style,
        .shadow: shadow
    ]
    NSAttributedString(string: text, attributes: attributes).draw(in: rect)
}

var eventIndex = 0
for line in ass.split(whereSeparator: \.isNewline) where line.hasPrefix("Dialogue:") {
    let payload = line.dropFirst("Dialogue:".count).trimmingCharacters(in: .whitespaces)
    let fields = payload.split(separator: ",", maxSplits: 9, omittingEmptySubsequences: false)
    guard fields.count == 10 else { continue }
    let text = clean(String(fields[9]))
    let lines = text.split(separator: "\n", maxSplits: 1, omittingEmptySubsequences: false).map(String.init)
    let primary = lines.first ?? ""
    let secondary = lines.count > 1 ? lines[1] : ""

    // The layer itself has generous safe margins. Text is never cropped to a narrow subtitle card.
    let width = 1664
    let height = 208
    let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: width, pixelsHigh: height,
        bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true,
        isPlanar: false, colorSpaceName: .deviceRGB,
        bitmapFormat: .alphaFirst, bytesPerRow: 0, bitsPerPixel: 0
    )!
    let context = NSGraphicsContext(bitmapImageRep: rep)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = context
    context.cgContext.clear(CGRect(x: 0, y: 0, width: width, height: height))

    let primaryIsCJK = hasCJK(primary)
    let secondaryIsCJK = hasCJK(secondary)
    let primaryFont = primaryIsCJK ? font("PingFangSC-Semibold", size: 52, fallback: .semibold) : font("HelveticaNeue-CondensedBold", size: 57, fallback: .bold)
    let secondaryFont = secondaryIsCJK ? font("PingFangSC-Medium", size: 35) : font("HelveticaNeue-CondensedBold", size: 34, fallback: .bold)

    drawCentered(primary,
                 rect: CGRect(x: 74, y: 113, width: width - 148, height: 64),
                 font: primaryFont,
                 color: .white,
                 kern: primaryIsCJK ? 1.0 : 0.9,
                 stroke: -1.15)
    drawCentered(secondary,
                 rect: CGRect(x: 74, y: 57, width: width - 148, height: 44),
                 font: secondaryFont,
                 color: NSColor(calibratedRed: 0.62, green: 0.96, blue: 0.91, alpha: 1),
                 kern: secondaryIsCJK ? 0.75 : 0.7,
                 stroke: -0.85)

    // A short signal line adds rhythm, but never crosses or masks the Chinese characters.
    NSColor(calibratedRed: 0.50, green: 0.94, blue: 0.88, alpha: 0.68).setStroke()
    let marker = NSBezierPath()
    marker.lineWidth = 1.2
    marker.move(to: CGPoint(x: 782, y: 43))
    marker.line(to: CGPoint(x: 882, y: 43))
    marker.stroke()

    NSGraphicsContext.restoreGraphicsState()
    let filename = String(format: "%03d_subtitle.png", eventIndex)
    try rep.representation(using: .png, properties: [:])!.write(to: outputURL.appendingPathComponent(filename))
    eventIndex += 1
}
