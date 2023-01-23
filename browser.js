console.log("Page.js has started...");

// immediately send "pageInitiated" msg
chrome.runtime.sendMessage({type: "pageInitiated", data: { url: window.location.href } });



const setupOverlay = () => {

    console.log("Setup ran");
    // set body to 85% width
    document.body.style.width = "99%";

    // add div to body
    let div = document.createElement("div");
    div.id = "gpt3web";
    div.style.position = "fixed";
    div.style.top = "0";
    div.style.right = "0";
    div.style.width = "1%";
    div.style.height = "100%";
    div.style.backgroundColor = /* "#000000" */ "rgba(0, 0, 0, 0.5)";
    div.style.border = "1px solid black";
    div.style.zIndex = "1000000000000";

    document.body.parentElement.appendChild(div);

    // if hovering over div, make it 30% width, if mouse leaves makes it 1% width again - but don't do this if the mouse goes outside the window
    div.addEventListener("mouseenter", () => {
        div.style.width = "30%";
    });
    div.addEventListener("mouseleave", (e) => {
        if(e.clientX < window.innerWidth && e.clientY < window.innerHeight && e.clientX > 0 && e.clientY > 0) {
            div.style.width = "1%";
        }
    });

    // add URL <p> to div
    let url = document.createElement("p");
    url.id = "gpt3web-url";
    url.style.color = "white";
    url.style.margin = "0";
    url.style.padding = "0";
    url.style.fontSize = "1.5em";
    url.style.fontWeight = "bold";
    url.style.textAlign = "center";
    url.style.marginTop = "0.5em";
    url.style.marginBottom = "0.5em";
    url.style.textOverflow = "ellipsis";
    url.style.overflow = "hidden";
    url.style.whiteSpace = "nowrap";
    url.style.width = "100%";
    url.style.height = "1.5em";
    url.style.lineHeight = "1.5em";
    url.style.cursor = "pointer";
    url.style.userSelect = "none";
    url.style.webkitUserSelect = "none";
    url.style.mozUserSelect = "none";

    // set url text
    div.appendChild(url);


    const setURL = (_url) => {
        let str = _url;
        // remove https:// or http://
        if(str.startsWith("https://")) {
            str = str.substring(8);
        } else if(str.startsWith("http://")) {
            str = str.substring(7);
        }
        // remove www.
        if(str.startsWith("www.")) {
            str = str.substring(4);
        }
        // remove any query params
        if(str.includes("?")) {
            str = str.substring(0, str.indexOf("?"));
        }
        console.log(str);
        url.innerText = str;
    }

    setURL(window.location.href);

    

    

    return {
        setURL,
    }
};




let getFocusableElements = () => {
    const BLACKLIST_TAGS = ["iframe"];
    const WHITELIST_TAGS = ["a", "input", "button", "textarea", "select", "label"];

    const all = document.querySelectorAll("*");
    let focusable = [];
    for (let i = 0; i < all.length; i++) {
        let element = all[i];
        if (element.tabIndex >= 0) {
            // make sure...
            // element is not hidden
            if(element.offsetParent === null) {
                continue;
            }

            
            // not a blacklisted tag
            if(BLACKLIST_TAGS.includes(element.tagName.toLowerCase())) {
                continue;
            }
            

            focusable.push(element);
        }
    }
    // if any WHITELIST_TAGS, is not in focusable, add it
    for (let i = 0; i < WHITELIST_TAGS.length; i++) {
        const tag = WHITELIST_TAGS[i];
        const elements = document.querySelectorAll(tag);
        for (let j = 0; j < elements.length; j++) {
            const element = elements[j];
            if (!focusable.includes(element)) {
                focusable.push(element);
            }
        }
    }

    return focusable;
}

let _isVisible = (element) => {
    // if aria-hidden=true, return false
    // if offsetParent is null, return false
    // if boundingRect width && height == 0, return false
    // if display is none, return false
    // if opacity is 0, return false
    // if visibility is hidden, return false

    if(element.hasAttribute("aria-hidden") && element.getAttribute("aria-hidden") === "true") {
        return false;
    }

    if(element.offsetParent === null) {
        return false;
    }

    if(element.getBoundingClientRect().width === 0 && element.getBoundingClientRect().height === 0) {
        return false;
    }

    if(window.getComputedStyle(element).display === "none") {
        return false;
    }

    if(window.getComputedStyle(element).opacity === "0") {
        return false;
    }

    if(window.getComputedStyle(element).visibility === "hidden") {
        return false;
    }

    // check if entire element is occluded by checking all 4 corners, if all 4 are occluded, return false
    let rect = element.getBoundingClientRect();
    let top = document.elementFromPoint(rect.left, rect.top);
    let bottom = document.elementFromPoint(rect.left, rect.bottom);
    let left = document.elementFromPoint(rect.left, rect.top);
    let right = document.elementFromPoint(rect.right, rect.top);
    if(top === element && bottom === element && left === element && right === element) {
        return false;
    }





    return true;
}

let _getElementName = (element) => {
    // try to get the element name

    
    if(element.hasAttribute("aria-label")) {
        return element.getAttribute("aria-label");
    }
    
    if(element.hasAttribute("aria-labelledby")) {
        return element.getAttribute("aria-labelledby");
    }

    if(element.hasAttribute("title")) {
        return element.getAttribute("title");
    }
    
    if(element.hasAttribute("alt")) {
        return element.getAttribute("alt");
    }
    
    if(element.hasAttribute("placeholder")) {
        return element.getAttribute("placeholder");
    }

    if(element.hasAttribute("name")) {
        return element.getAttribute("name");
    }

    if(element.hasAttribute("id")) {
        return element.getAttribute("id");
    }

    if(element.hasAttribute("value")) {
        return element.getAttribute("value");
    }

    // text content
    if(element.textContent) {
        return element.textContent;
    }

    // return tagName + random id
    return element.tagName + "-" + Math.floor(Math.random() * 1000000);   
}

let _cleanElement = (element) => {
    element = element.cloneNode(true);

    let WHITELIST_ATTRIBUTES = ["value", "type", "role", "placeholder", "aria-label", "title", "alt", "name", "id"];

    let attributes = Array.from(element.attributes);
    for (let i = 0; i < attributes.length; i++) {
        const attribute = attributes[i];
        if(!WHITELIST_ATTRIBUTES.includes(attribute.name)) {
            element.removeAttribute(attribute.name);
        }
    }

    let remove = [
        element.querySelectorAll("script"),
        element.querySelectorAll("style"),
        element.querySelectorAll("iframe"),
        element.querySelectorAll("svg"),
        element.querySelectorAll("canvas"),
        element.querySelectorAll("video"),
        element.querySelectorAll("audio"),
        element.querySelectorAll("img"),
        element.querySelectorAll("object"),
        element.querySelectorAll("embed"),
        element.querySelectorAll("applet"),
        element.querySelectorAll("frame"),
        element.querySelectorAll("frameset"),
        element.querySelectorAll("noframes"),
        element.querySelectorAll("noscript"),
        element.querySelectorAll("link"),
        element.querySelectorAll("meta"),
        element.querySelectorAll("base"),
    ]

    for (let i = 0; i < remove.length; i++) {
        const elements = remove[i];
        for (let j = 0; j < elements.length; j++) {
            const element = elements[j];
            element.remove();
        }
    }

    return element;
}

let clean = () => {

    let links = [];
    let typingElements = [];
    let clickingElements = [];


    let focusables = getFocusableElements();
    for (let i = 0; i < focusables.length; i++) {
        const element = focusables[i];

        if(!_isVisible(element)) {
            // console.log("Not visible", element);
            continue;
        }

        // hasLink = has href
        let hasLink = false;
        // hasTyping = has value
        let hasTyping = false;
        // hasClicking = has onclick, or is a button
        let hasClicking = false;

        let isLink = () => {
            return element.hasAttribute("href") && element.href;
        }

        let isTyping = () => {
            if(element.hasAttribute("value")) {
                if(element.tagName.toLowerCase() === "input") {
                    let type = element.getAttribute("type");
                    if(type === "button" || type === "submit" || type === "reset") {
                        return false;
                    }
                }
                return true;
            }
        }

        let isClicking = () => {
            if(element.hasAttribute("onclick") && element.onclick) {
                return true;
            }
            if(element.tagName.toLowerCase() === "button") {
                return true;
            }
            if(element.hasAttribute("role") && (element.getAttribute("role") === "button" || element.getAttribute("role") === "submit" || element.getAttribute("role") === "reset")) {
                return true;
            }

            return false;
        }

        if(isLink()) hasLink = true;
        else if(isTyping()) hasTyping = true;
        else if(isClicking()) hasClicking = true; 

        if(!hasLink && !hasTyping && !hasClicking) {
            console.log("Found dead element", element);
            continue;
        }

        if(hasLink) {
            links.push(element);
        } else if(hasTyping) {
            typingElements.push(element);
        } else if(hasClicking) {
            clickingElements.push(element);
        }
    }



    let linksArr = {};
    let ogLinksArr = {};
    for (let i = 0; i < links.length; i++) {
        const element = links[i];

        const values = Object.values(linksArr);
        if(values.includes(element.href)) continue;
        linksArr[_getElementName(element)] = element.href;
        ogLinksArr[_getElementName(element)] = element;
    }

    let inputsArray = {};
    let ogInputsArray = {};
    for (let i = 0; i < typingElements.length; i++) {
        const element = typingElements[i];

        inputsArray[_getElementName(element)] = _cleanElement(element).outerHTML;
        ogInputsArray[_getElementName(element)] = element;
    }

    let buttonsArray = {};
    let ogButtonsArray = {};
    for (let i = 0; i < clickingElements.length; i++) {
        const element = clickingElements[i];

        buttonsArray[_getElementName(element)] = _cleanElement(element).outerHTML;
        ogButtonsArray[_getElementName(element)] = element;
    }

    /**
     * Get a unique CSS selector for a given DOM node
     * @param {HTMLElement} element - DOM node
     * @return {string} Unique CSS selector for the given DOM node
     */
    function getUniqueSelector (element) {
        /**
        * Gets the element node that is a sibling to this element node (a direct child of the same parent) and is immediately
        * previous to it in the DOM tree. It's a fix for IE that does not support :nth-child pseudoselector
        * @param {HTMLElement} element - DOM node
        * @return {string} Unique CSS selector for the given DOM node
        */
        const previousElementSiblingPolyfill = (element) =>{
            element = element.previousSibling;
            // Loop through ignoring anything not an element
            while(element !== null) {
                if(element.nodeType === Node.ELEMENT_NODE) {
                    return element;
                } else {
                    element = element.previousSibling;
                }
            }
        }


        /**
         * Gets the element node that is a sibling to this element node (a direct child of the same parent) and is immediately
         * previous to it in the DOM tree. It's a fix for IE that does not support :nth-child pseudoselector
         * @param {HTMLElement} element - DOM node
         * @return {string} Unique CSS selector for the given DOM node
         */
        const previousElementSibling = (element) =>{
            if(element.previousElementSibling !== 'undefined') {
                return element.previousElementSibling
            } else {
                return previousElementSiblingPolyfill(element);
            }
        }

        const getPath = (element) => {
            // False on non-elements
            if(!(element instanceof Element)) {
                return false;
            }
        
            const path = [];
            // If element is null it's the end of partial. It's a loose element which has, sofar, not been attached to a parent in the node tree.
            while(element !== null && element.nodeType === Node.ELEMENT_NODE) {
                let selector = element.nodeName;
        
                if (element.id) {
                    selector += `#${element.id}`;
                } else {
                    // Walk backwards until there is no previous sibling
                    let sibling = element;
        
                    // Will hold nodeName to join for adjacent selection
                    let siblingSelectors = [];
        
                    while(sibling !== null && sibling.nodeType === Node.ELEMENT_NODE) {
                        siblingSelectors.unshift(sibling.nodeName);
                        sibling = previousElementSibling(sibling);
                    }
        
                    // :first-child does not apply to HTML
                    if(siblingSelectors[0] !== 'HTML') {
                        siblingSelectors[0] = siblingSelectors[0] + ':first-child';
                    }
        
                    selector = siblingSelectors.join(' + ');
                }
                path.unshift(selector);
                element = element.parentNode;
            }
            return path.join(' > ');
        }
        return getPath(element);
    }

    window._htmlCleaner = {
        _links: ogLinksArr,
        _inputs: ogInputsArray,
        _buttons: ogButtonsArray,
        getInputSelector: (name) => {
            if(!name || !window._htmlCleaner._inputs[name]) return false;
            return getUniqueSelector(window._htmlCleaner._inputs[name]);
        },
        getButtonSelector: (name) => {
            if(!name || !window._htmlCleaner._buttons[name]) return false;
            return getUniqueSelector(window._htmlCleaner._buttons[name]);
        }
    }

    return {
        links: linksArr,
        inputs: inputsArray,
        buttons: buttonsArray
    }

    return `
    Links on page:
    ${linksStr}

    Inputs on page:
    ${JSON.stringify(inputsArray, null, 4)}

    Buttons on page:
    ${JSON.stringify(buttonsArray, null, 4)}`;
}


let waitForPageLoad = () => {
    return new Promise(r => {
        // wait for the page load if not loaed yet, otherwise just resolve
        if(document.readyState === "complete") {
            r();
        }
        window.addEventListener("load", r);
    });
}

waitForPageLoad().then(() => {
    setupOverlay();


    // send background page "pageLoaded" message with the clean() response
    let ogHtml = clean();
    chrome.runtime.sendMessage({type: "pageLoaded", data: { page: ogHtml, url: window.location.href }});

    let doChange = false;
    let _didChange = 0;
    let CHANGE_THRESHOLD = 4;

    setInterval(() => {
        const html = clean();
        if(JSON.stringify(html) !== JSON.stringify(ogHtml)) {
            ogHtml = html;
            _didChange = 0;
            doChange = true;
            // chrome.runtime.sendMessage({type: "pageLoaded", data: { page: ogHtml, url: window.location.href }});
        } else {
            if(doChange) {
                _didChange++;
                if(_didChange > CHANGE_THRESHOLD) {
                    doChange = false;
                    chrome.runtime.sendMessage({type: "pageLoaded", data: { page: ogHtml, url: window.location.href }});
                }
            }
        }
    }, 500);
});


// on message
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if(request.type === "getElement") {
        onGetElement(request.data.elementName, sendResponse);
    }
});

const getAdditionalElementAttributes = (element) => {
    let details = {};

    // add all element attributes to details
    for (let i = 0; i < element.attributes.length; i++) {
        const attribute = element.attributes[i];
        details[attribute.name] = attribute.value;
    }

    return details;
}

const onGetElement = (elementName, sendResponse) => {
    
    if(!window._htmlCleaner) sendResponse("Error: page not setup");
    if(!elementName) sendResponse("Error: no element name");

    let preferredType = false;
    if(elementName.includes(":_:")) {
        preferredType = elementName.split(":_:")[1];
        elementName = elementName.split(":_:")[0];
    }

    console.log("elementName", elementName)
    console.log("preferredType", preferredType)
    

    // let isButton = false;
    // if(preferredType) {
    //     if(preferredType === "button") isButton = true;
    //     if(preferredType === "input") isButton = false;
    // } else {
    //     isButton = window._htmlCleaner._buttons[elementName] ? true : false;
    // }

    // if(isButton) {
    //     if(!window._htmlCleaner._buttons[elementName]) sendResponse("Error: elementName" + elementName + " not found in cache");
    // } else {
    //     if(!window._htmlCleaner._inputs[elementName]) sendResponse("Error: elementName" + elementName + " not found in cache");
    // }


    let cache;
    let type;
    if(preferredType) {
        if(preferredType === "button") {
            if(window._htmlCleaner._buttons[elementName]) {
                cache = window._htmlCleaner._buttons;
                type = "button";
            }
        }
        if(preferredType === "input") {
            if(window._htmlCleaner._inputs[elementName]) {
                cache = window._htmlCleaner._inputs;
                type = "input";
            }
        }
        if(!cache) {
            if(window._htmlCleaner._buttons[elementName]) {
                cache = window._htmlCleaner._buttons;
                type = "button";
            } else if(window._htmlCleaner._inputs[elementName]) {
                cache = window._htmlCleaner._inputs;
                type = "input";
            } else {
                sendResponse("Error: elementName" + elementName + " not found in cache");
            }
        }
    } else {
        cache = window._htmlCleaner._buttons[elementName] ? window._htmlCleaner._buttons : window._htmlCleaner._inputs;
        type = window._htmlCleaner._buttons[elementName] ? "button" : "input";
    }

    console.log(cache);



    let element = cache[elementName];

    if(!element) sendResponse("Error: element not found in cache");

    let rect = element.getBoundingClientRect();
    // convert all values to %'s
    // let top = rect.top / window.innerHeight * 100;
    // let left = rect.left / window.innerWidth * 100;
    // let width = rect.width / window.innerWidth * 100;
    // let height = rect.height / window.innerHeight * 100;

    let attributes = getAdditionalElementAttributes(element);

    let top = rect.top;
    let left = rect.left;
    let width = rect.width;
    let height = rect.height;

    sendResponse({elementName, top, left, width, height, type, attributes});
}