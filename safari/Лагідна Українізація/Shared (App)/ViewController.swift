//
//  ViewController.swift
//  Shared (App)
//
//  Created by Yaroslav Korshak on 08/07/2025.
//

#if os(iOS)
import UIKit
import WebKit
typealias PlatformViewController = UIViewController
#elseif os(macOS)
import Cocoa
typealias PlatformViewController = NSViewController
#endif

let extensionBundleIdentifier = "info.hmara.---------------------.Extension"

class ViewController: PlatformViewController {

    @IBOutlet var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()

        #if os(macOS)
        if let url = Bundle.main.url(forResource: "Main", withExtension: "html") {
            self.webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }
        #elseif os(iOS)
        if let url = URL(string: "x-safari-https://hmara.info/") {
            print("Going to hmara.info")
            UIApplication.shared.open(url)
        }
        #endif
    }

}
