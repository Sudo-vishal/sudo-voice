// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "IndianWhisper",
    platforms: [
        .macOS(.v14)
    ],
    products: [
        .executable(
            name: "IndianWhisper",
            targets: ["IndianWhisper"]
        )
    ],
    dependencies: [
        .package(url: "https://github.com/argmaxinc/WhisperKit.git", from: "0.9.0"),
        .package(url: "https://github.com/sparkle-project/Sparkle.git", from: "2.6.0"),
    ],
    targets: [
        .executableTarget(
            name: "IndianWhisper",
            dependencies: [
                "WhisperKit",
                "Sparkle",
            ],
            path: "Sources",
            exclude: ["App/Info.plist"]
        )
    ]
)
