#if os(macOS)
import FluidAudio
import Foundation

private struct Options {
  var audioPath: String?
  var outputPath: String?
  var modelDirectory: String?
  var modelVersion: AsrModelVersion = .v2
}

private enum CliError: LocalizedError {
  case missingAudio
  case missingValue(String)
  case unknownOption(String)
  case unsupportedModel(String)

  var errorDescription: String? {
    switch self {
    case .missingAudio:
      return "usage: roughdraft-parakeet-transcribe <audio.wav> [--output <path>] [--model v2|v3] [--model-dir <path>]"
    case let .missingValue(option):
      return "\(option) requires a value"
    case let .unknownOption(option):
      return "unknown option: \(option)"
    case let .unsupportedModel(model):
      return "unsupported Parakeet model: \(model)"
    }
  }
}

@main
struct RoughdraftParakeetTranscribe {
  static func main() async {
    do {
      let options = try parseArguments(Array(CommandLine.arguments.dropFirst()))
      let transcript = try await transcribe(options: options)

      if let outputPath = options.outputPath {
        try transcript.write(
          toFile: outputPath,
          atomically: true,
          encoding: .utf8
        )
      }

      print(transcript)
    } catch {
      let message = (error as? LocalizedError)?.errorDescription
        ?? String(describing: error)
      fputs("roughdraft-parakeet-transcribe: \(message)\n", stderr)
      Foundation.exit(1)
    }
  }

  private static func parseArguments(_ arguments: [String]) throws -> Options {
    var options = Options()
    var index = 0

    while index < arguments.count {
      let argument = arguments[index]

      switch argument {
      case "--help", "-h":
        throw CliError.missingAudio
      case "--output":
        index += 1
        guard index < arguments.count else { throw CliError.missingValue(argument) }
        options.outputPath = arguments[index]
      case "--model":
        index += 1
        guard index < arguments.count else { throw CliError.missingValue(argument) }
        options.modelVersion = try parseModel(arguments[index])
      case "--model-dir":
        index += 1
        guard index < arguments.count else { throw CliError.missingValue(argument) }
        options.modelDirectory = arguments[index]
      default:
        if argument.hasPrefix("-") {
          throw CliError.unknownOption(argument)
        }
        if options.audioPath == nil {
          options.audioPath = argument
        } else {
          throw CliError.unknownOption(argument)
        }
      }

      index += 1
    }

    guard options.audioPath != nil else { throw CliError.missingAudio }
    return options
  }

  private static func parseModel(_ model: String) throws -> AsrModelVersion {
    switch model {
    case "v2", "parakeet-tdt-0.6b-v2-coreml":
      return .v2
    case "v3", "parakeet-tdt-0.6b-v3-coreml":
      return .v3
    default:
      throw CliError.unsupportedModel(model)
    }
  }

  private static func transcribe(options: Options) async throws -> String {
    let models: AsrModels
    if let modelDirectory = options.modelDirectory {
      models = try await AsrModels.load(
        from: URL(fileURLWithPath: modelDirectory),
        version: options.modelVersion
      )
    } else {
      models = try await AsrModels.downloadAndLoad(version: options.modelVersion)
    }

    let manager = AsrManager()
    try await manager.initialize(models: models)

    guard let audioPath = options.audioPath else { throw CliError.missingAudio }
    let result = try await manager.transcribe(URL(fileURLWithPath: audioPath))
    return result.text.trimmingCharacters(in: .whitespacesAndNewlines)
  }
}
#else
#error("roughdraft-parakeet-transcribe requires macOS")
#endif
