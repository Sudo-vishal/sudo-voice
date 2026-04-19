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
    ],
    targets: [
        .executableTarget(
            name: "IndianWhisper",
            dependencies: [
                "WhisperKit",
            ],
            path: "Sources",
            exclude: ["App/Info.plist"]
        )
    ]
)
