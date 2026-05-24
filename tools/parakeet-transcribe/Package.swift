// swift-tools-version: 5.10
import PackageDescription

let package = Package(
  name: "RoughdraftParakeetTranscribe",
  platforms: [
    .macOS(.v14),
  ],
  products: [
    .executable(
      name: "roughdraft-parakeet-transcribe",
      targets: ["RoughdraftParakeetTranscribe"]
    ),
  ],
  dependencies: [
    .package(
      url: "https://github.com/FluidInference/FluidAudio.git",
      revision: "47552dde26f79b880efff2f23ad4dab55aa914ca"
    ),
  ],
  targets: [
    .executableTarget(
      name: "RoughdraftParakeetTranscribe",
      dependencies: [
        .product(name: "FluidAudio", package: "FluidAudio"),
      ]
    ),
  ],
  cxxLanguageStandard: .cxx17
)
