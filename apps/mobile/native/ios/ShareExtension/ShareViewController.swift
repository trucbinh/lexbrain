import Social
import UniformTypeIdentifiers
import UIKit

private let appGroup = "group.datamerge.xyz.lexbrain.app"

final class ShareViewController: SLComposeServiceViewController {
    override func isContentValid() -> Bool {
        true
    }

    override func didSelectPost() {
        let items = extensionContext?.inputItems.compactMap { $0 as? NSExtensionItem } ?? []
        let providers = items.flatMap { $0.attachments ?? [] }
        let subject = items.compactMap { $0.attributedTitle?.string }.first
        loadSharedContent(from: providers) { [weak self] text, sourceUrl in
            guard let self, let text, !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                  let defaults = UserDefaults(suiteName: appGroup) else {
                self?.extensionContext?.cancelRequest(withError: NSError(domain: "LexBrainShare", code: 1))
                return
            }

            defaults.set(text, forKey: "pendingText")
            defaults.set("share", forKey: "pendingSource")
            defaults.set(subject, forKey: "pendingSubject")
            defaults.set(sourceUrl, forKey: "pendingSourceUrl")
            self.extensionContext?.completeRequest(returningItems: nil)
        }
    }

    override func configurationItems() -> [Any]! {
        []
    }

    private func loadSharedContent(
        from providers: [NSItemProvider],
        completion: @escaping (String?, String?) -> Void
    ) {
        let group = DispatchGroup()
        let lock = NSLock()
        var sharedText: String?
        var sharedUrl: String?

        for provider in providers {
            if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                group.enter()
                provider.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { item, _ in
                    if let value = item as? String {
                        lock.lock()
                        if sharedText == nil { sharedText = value }
                        lock.unlock()
                    } else if let value = item as? NSAttributedString {
                        lock.lock()
                        if sharedText == nil { sharedText = value.string }
                        lock.unlock()
                    }
                    group.leave()
                }
            }
            if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                group.enter()
                provider.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { item, _ in
                    let value = (item as? URL)?.absoluteString ?? (item as? NSURL)?.absoluteString
                    if let value {
                        lock.lock()
                        if sharedUrl == nil { sharedUrl = value }
                        lock.unlock()
                    }
                    group.leave()
                }
            }
        }

        group.notify(queue: .main) {
            completion(sharedText, sharedUrl)
        }
    }
}