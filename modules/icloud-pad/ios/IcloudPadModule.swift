import ExpoModulesCore
import Foundation

/**
 The pad's files in iCloud Drive: a directory in the hidden root of the app's
 ubiquity container. iOS only learns what other devices wrote through a
 metadata query, only downloads a file when asked, and requires file
 coordination for every read and write — this module does those three things
 and nothing else. What the files hold, and how two copies merge, stays in
 TypeScript (ADR 0006).
 */
public class IcloudPadModule: Module {
  private let fileManager = FileManager.default
  private var directory = "pad"
  private var padDirectory: URL?
  private var query: NSMetadataQuery?
  private var queryObservers: [NSObjectProtocol] = []
  private var identityObserver: NSObjectProtocol?
  private var onFirstGathering: (() -> Void)?
  private var knownPaths = Set<String>()
  private let knownPathsLock = NSLock()

  public func definition() -> ModuleDefinition {
    Name("IcloudPad")
    Events("changed", "availability")

    OnStartObserving {
      self.identityObserver = NotificationCenter.default.addObserver(
        forName: .NSUbiquityIdentityDidChange, object: nil, queue: .main
      ) { _ in
        self.sendEvent("availability", ["available": self.fileManager.ubiquityIdentityToken != nil])
      }
    }

    OnStopObserving {
      if let observer = self.identityObserver {
        NotificationCenter.default.removeObserver(observer)
      }
      self.identityObserver = nil
    }

    OnDestroy {
      DispatchQueue.main.async { self.stopQuery() }
    }

    AsyncFunction("isAvailable") { () -> Bool in
      self.fileManager.ubiquityIdentityToken != nil
    }

    // Resolves once the query has gathered what iCloud already knows, so the
    // first pull sees the pad rather than an empty directory.
    AsyncFunction("start") { (directory: String, promise: Promise) in
      self.directory = directory
      guard let pad = self.padURL() else {
        promise.resolve()
        return
      }
      self.padDirectory = pad
      DispatchQueue.main.async {
        self.startQuery(under: pad) { promise.resolve() }
      }
    }

    AsyncFunction("stop") {
      DispatchQueue.main.async { self.stopQuery() }
    }

    AsyncFunction("readAll") { () -> [String: Any] in
      try self.readAll()
    }

    AsyncFunction("write") { (path: String, text: String) in
      try self.write(path: path, text: text)
    }
  }

  /// The pad directory, or nil when this device has no iCloud account or container. Off the main thread.
  private func padURL() -> URL? {
    fileManager.url(forUbiquityContainerIdentifier: nil)?
      .appendingPathComponent(directory, isDirectory: true)
  }

  // MARK: - Discovery

  private func startQuery(under pad: URL, gathered: @escaping () -> Void) {
    stopQuery()
    var resolved = false
    onFirstGathering = {
      guard !resolved else { return }
      resolved = true
      gathered()
    }

    let query = NSMetadataQuery()
    query.searchScopes = [NSMetadataQueryUbiquitousDataScope]
    query.predicate = NSPredicate(format: "%K LIKE '*'", NSMetadataItemFSNameKey)
    query.notificationBatchingInterval = 1
    let center = NotificationCenter.default
    queryObservers = [
      center.addObserver(
        forName: .NSMetadataQueryDidFinishGathering, object: query, queue: .main
      ) { [weak self] _ in
        self?.queryUpdated()
        self?.onFirstGathering?()
      },
      center.addObserver(forName: .NSMetadataQueryDidUpdate, object: query, queue: .main) {
        [weak self] _ in
        self?.queryUpdated()
      },
    ]
    self.query = query
    query.start()

    // Gathering is quick; don't hold the first pull on it forever.
    DispatchQueue.main.asyncAfter(deadline: .now() + 15) { [weak self] in
      self?.onFirstGathering?()
    }
  }

  private func stopQuery() {
    query?.stop()
    query = nil
    queryObservers.forEach(NotificationCenter.default.removeObserver)
    queryObservers.removeAll()
    onFirstGathering = nil
  }

  /// On the main queue: note every file the query knows, ask for the ones not on this device yet, and tell JavaScript.
  private func queryUpdated() {
    guard let query, let pad = padDirectory else { return }
    query.disableUpdates()
    defer { query.enableUpdates() }

    var paths: [String] = []
    for case let item as NSMetadataItem in query.results {
      guard let url = item.value(forAttribute: NSMetadataItemURLKey) as? URL,
        let path = relativePath(of: url, under: pad)
      else { continue }
      if (item.value(forAttribute: NSMetadataItemContentTypeKey) as? String) == "public.folder" {
        continue
      }
      paths.append(path)
      let status = item.value(forAttribute: NSMetadataUbiquitousItemDownloadingStatusKey) as? String
      if status != NSMetadataUbiquitousItemDownloadingStatusCurrent {
        try? fileManager.startDownloadingUbiquitousItem(at: url)
      }
    }

    knownPathsLock.lock()
    knownPaths = Set(paths)
    knownPathsLock.unlock()
    sendEvent("changed", ["paths": paths])
  }

  // MARK: - Reading

  private func readAll() throws -> [String: Any] {
    guard let pad = padDirectory ?? padURL() else { throw ContainerUnavailableException() }
    var files: [String: String] = [:]
    var skipped: [String] = []

    for path in allPaths(under: pad) {
      let url = pad.appendingPathComponent(path)
      do {
        try ensureDownloaded(url)
        files[path] = try coordinatedRead(url)
      } catch {
        skipped.append(path)
        continue
      }
      // Versions iCloud kept when two devices wrote this file at once: read like any other device's copy.
      let conflicts = NSFileVersion.unresolvedConflictVersionsOfItem(at: url) ?? []
      for (index, version) in conflicts.enumerated() {
        if let text = try? String(contentsOf: version.url, encoding: .utf8) {
          files["\(path)@\(index + 1)"] = text
        }
        version.isResolved = true
      }
      if !conflicts.isEmpty {
        try? NSFileVersion.removeOtherVersionsOfItem(at: url)
      }
    }
    return ["files": files, "skipped": skipped]
  }

  /// Every file the query knows plus every one on disk, placeholders named for the file they stand for.
  private func allPaths(under pad: URL) -> [String] {
    knownPathsLock.lock()
    var paths = knownPaths
    knownPathsLock.unlock()

    let keys: Set<URLResourceKey> = [.isRegularFileKey]
    if let onDisk = fileManager.enumerator(at: pad, includingPropertiesForKeys: Array(keys)) {
      for case let url as URL in onDisk {
        guard (try? url.resourceValues(forKeys: keys))?.isRegularFile == true,
          let path = relativePath(of: url, under: pad)
        else { continue }
        paths.insert(downloadedName(of: path))
      }
    }
    return paths.filter { path in !path.split(separator: "/").contains { $0.hasPrefix(".") } }
      .sorted()
  }

  /// `.entries-2026.json.icloud` is iOS's stand-in for a file not yet downloaded.
  private func downloadedName(of path: String) -> String {
    var parts = path.split(separator: "/").map(String.init)
    guard let name = parts.popLast() else { return path }
    if name.hasPrefix("."), name.hasSuffix(".icloud") {
      parts.append(String(name.dropFirst().dropLast(".icloud".count)))
    } else {
      parts.append(name)
    }
    return parts.joined(separator: "/")
  }

  private func relativePath(of url: URL, under pad: URL) -> String? {
    let padPath = pad.resolvingSymlinksInPath().path
    let path = url.resolvingSymlinksInPath().path
    guard path.hasPrefix(padPath + "/") else { return nil }
    return String(path.dropFirst(padPath.count + 1))
  }

  /// iOS never downloads unasked: ask, then wait for the bytes, a while.
  private func ensureDownloaded(_ url: URL) throws {
    if isDownloaded(url) { return }
    try? fileManager.startDownloadingUbiquitousItem(at: url)
    let deadline = Date().addingTimeInterval(30)
    while !isDownloaded(url) {
      if Date() > deadline { throw NotDownloadedException(url.lastPathComponent) }
      Thread.sleep(forTimeInterval: 0.25)
    }
  }

  private func isDownloaded(_ url: URL) -> Bool {
    guard
      let status = try? url.resourceValues(forKeys: [.ubiquitousItemDownloadingStatusKey])
        .ubiquitousItemDownloadingStatus
    else {
      return fileManager.fileExists(atPath: url.path)
    }
    return status == .current || status == .downloaded
  }

  private func coordinatedRead(_ url: URL) throws -> String {
    var coordinationError: NSError?
    var readError: Error?
    var text: String?
    NSFileCoordinator().coordinate(readingItemAt: url, options: [], error: &coordinationError) {
      readURL in
      do {
        text = try String(contentsOf: readURL, encoding: .utf8)
      } catch {
        readError = error
      }
    }
    if let error = coordinationError ?? readError.map({ $0 as NSError }) {
      throw ReadException("\(url.lastPathComponent): \(error.localizedDescription)")
    }
    guard let text else { throw ReadException(url.lastPathComponent) }
    return text
  }

  // MARK: - Writing

  private func write(path: String, text: String) throws {
    guard let pad = padDirectory ?? padURL() else { throw ContainerUnavailableException() }
    let url = pad.appendingPathComponent(path)
    try fileManager.createDirectory(
      at: url.deletingLastPathComponent(), withIntermediateDirectories: true)

    var coordinationError: NSError?
    var writeError: Error?
    NSFileCoordinator().coordinate(
      writingItemAt: url, options: .forReplacing, error: &coordinationError
    ) { writeURL in
      do {
        try text.write(to: writeURL, atomically: true, encoding: .utf8)
      } catch {
        writeError = error
      }
    }
    if let error = coordinationError ?? writeError.map({ $0 as NSError }) {
      throw WriteException("\(path): \(error.localizedDescription)")
    }
  }
}

private final class ContainerUnavailableException: Exception, @unchecked Sendable {
  override var reason: String {
    "This device has no iCloud container. Is it signed in to iCloud?"
  }
}

private final class NotDownloadedException: GenericException<String>, @unchecked Sendable {
  override var reason: String {
    "\(param) hasn't finished downloading from iCloud"
  }
}

private final class ReadException: GenericException<String>, @unchecked Sendable {
  override var reason: String {
    "Couldn't read \(param) from iCloud"
  }
}

private final class WriteException: GenericException<String>, @unchecked Sendable {
  override var reason: String {
    "Couldn't write \(param) to iCloud"
  }
}
