// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "WhisperAiwithDhruv",
    platforms: [
        .macOS(.v14)
    ],
    products: [
        .executable(
            name: "WhisperAiwithDhruv",
            targets: ["WhisperAiwithDhruv"]
        )
    ],
    dependencies: [
        .package(url: "https://github.com/argmaxinc/WhisperKit.git", from: "0.9.0"),
    ],
    targets: [
        .executableTarget(
            name: "WhisperAiwithDhruv",
            dependencies: [
                "WhisperKit",
            ],
            path: "Sources",
            exclude: ["App/Info.plist"]
        )
    ]
)
