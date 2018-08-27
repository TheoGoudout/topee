//
//  Copyright © 2018 Avast. All rights reserved.
//

import Foundation

class TestPage: NSObject {
    public var url: String
    public let referrerPolicy: ReferrerPolicy

    init(url: String = "http://whatever", referrerPolicy: ReferrerPolicy = .notSpecified) {
        self.url = url
        self.referrerPolicy = referrerPolicy
    }
    
    func makeReferrer() -> String {
        return referrerPolicy.makeReferrer(from: url)
    }
}

typealias TabId = UInt64
typealias Fn0 = () -> Void

// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy
enum ReferrerPolicy {
    case notSpecified
    case noReferrer
    case origin
    // For testing purposes we don't need to specify these:
    //    case noReferrerWhenDowngrade
    //    case originWhenCrossOrigin
    //    case sameOrigin
    //    case strictOrigin
    //    case strictOriginWhenCrossOrigin
    //    case unsafeUrl
    
    func makeReferrer(from: String?) -> String {
        if from == nil {
            return ""
        }
        
        switch self {
        case .notSpecified:
            return from!
        case .noReferrer:
            return ""
        case .origin:
            let fromUrl = URL(string: from!)!
            return "\(fromUrl.scheme!)://\(fromUrl.host!)/"
        }
    }
}

/**
 Simulates browser tab with all gory details
 
 Handles referrer, sessionStorage, history behaviour
 */
class TestTab: NSObject {
    private static var testTabIdCounter: Int = 0
    private var testTabId: Int
    public var id: TabId? = nil
    private let trace: Bool!
    private var isClosed = false
    private let registry: PageRegistry<TestPage>
    private var history: [TestPage] = []
    private var currentIndex: Int? = nil
    private var currentPage: TestPage? {
        get {
            return currentIndex != nil ? history[currentIndex!] : nil
        }
    }
    private var storedTabId: [String: TabId] = [:] // sessionStorage
    
    init(registry: PageRegistry<TestPage>, trace: Bool = false) {
        self.registry = registry
        self.trace = trace
        TestTab.testTabIdCounter = TestTab.testTabIdCounter + 1
        testTabId = TestTab.testTabIdCounter
        super.init()
    }
    
    @discardableResult
    public func navigate(
        url: String,
        referrerPolicy: ReferrerPolicy = .notSpecified,
        completion: (_ bye: Fn0, _ hello: Fn0) -> Void) -> TestTab
    {
        assert(!isClosed)
        
        func byeFn() {
            //// Say bye from current page
            let currentPage = self.currentPage
            self.bye(currentPage)
        }
        
        func helloFn() {
            // Keep reference to current page, code below it's going to change it,
            // but we need it to compute referrer
            let _currentPage = self.currentPage

            //// Say hello
            let nextPage = TestPage(url: url, referrerPolicy: referrerPolicy)
            let nextIndex = currentIndex != nil ? currentIndex! + 1 : 0
            
            // Trim history if we are not going to insert at the end
            history = Array(history.dropLast(history.count - nextIndex))
            history.append(nextPage)
            
            currentIndex = nextIndex
            
            let tabId = storedTabId[baseURL(nextPage.url)]
            let referrer = _currentPage?.makeReferrer() ?? ""
            
            let id = registry.hello(
                page: nextPage,
                tabId: tabId,
                referrer: referrer,
                historyLength: Int64(history.count)
            )
            
            if trace {
                let sTabId = tabId != nil ? String(tabId!) : "nil"
                NSLog("#\(testTabId) hello(page: <\(nextPage.hashValue)>, tabId: \(sTabId), referrer: \(referrer), historyLength: \(history.count) -> \(id)")
            }
            
            // Tab should never change it's ID
            if self.id != nil && self.id != id {
                let message = "#\(testTabId) Tab ID changed from \(self.id!) to \(id)."
                NSLog(message)
                fatalError(message)
            }
            self.id = id
            
            storedTabId[baseURL(nextPage.url)] = self.id
        }
        
        completion(byeFn, helloFn)

        return self
    }
    
    @discardableResult
    public func navigate(url: String, referrerPolicy: ReferrerPolicy = .notSpecified) -> TestTab {
        navigate(url: url, referrerPolicy: referrerPolicy) { bye, hello in
            bye()
            hello()
        }
        
        return self
    }
    
    @discardableResult
    func close() -> TestTab {
        isClosed = true
        bye(currentPage)
        
        return self
    }
    
    func bye(_ page: TestPage?) {
        if page != nil {
            if trace {
                NSLog("#\(testTabId) bye(page: <\(page!.hashValue)>, url: \(page!.url), historyLength: \(history.count) <- \(self.id!)")
            }
            
            registry.bye(
                page: page!,
                url: page!.url,
                historyLength: Int64(history.count)
            )
        }
    }
    
    private func baseURL(_ surl: String) -> String {
        let url = URL(string: surl)!
        return "\(url.scheme!)://\(url.host!)/"
    }
}