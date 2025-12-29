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

    override func viewDidLoad() {
        super.viewDidLoad()

        #if os(iOS)
        if let url = URL(string: "x-safari-https://hmara.info/onboarding/ios-safari.html") {
            UIApplication.shared.open(url)
        }
        #endif
    }

}
