// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "SudoVoice",
    platforms: [
        .macOS(.v14)
    ],
    products: [
        .executable(
            name: "SudoVoice",
            targets: ["SudoVoice"]
        )
    ],
    dependencies: [
        .package(url: "https://github.com/argmaxinc/WhisperKit.git", from: "0.9.0"),
        .package(url: "https://github.com/supabase/supabase-swift.git", from: "2.5.0"),
    ],
    targets: [
        .executableTarget(
            name: "SudoVoice",
            dependencies: [
                "WhisperKit",
                .product(name: "Supabase", package: "supabase-swift"),
            ],
            path: "Sources",
            exclude: ["App/Info.plist"]
        )
    ]
)
