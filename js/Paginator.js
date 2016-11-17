class Paginator {

  /**
   *
   * @param fromNode
   * @param toNode
   * @param styleContent
   */
  constructor(fromNode, toNode, styleContent) {
    this.fromNode = fromNode;
    this.toNode = toNode;
    this.styleContent = styleContent;
    this.delay = 0;
    this.callbacks = {};

    // We store realHeight here so that we don't have to fetch it in a loop.
    this.realHeight = document.defaultView.getComputedStyle(this.toNode, null).getPropertyValue('height').replace('px', '');
    this.maxScrollHeight = this.toNode.offsetHeight - this.realHeight;
  }

  /**
   *
   * @param cbk
   * @param cbkFunc
   */
  addCallback(cbk, cbkFunc) {
    if (this.callbacks[cbk]) {
      this.callbacks[cbk].push(cbkFunc);
    } else {
      this.callbacks[cbk] = [cbkFunc];
    }
  }

  /**
   *
   * @param cbk
   * @param arg
   */
  emitCallback(cbk, arg) {
    let cbks = this.callbacks[cbk];
    if (!cbks) {
      return;
    }
    for (let i = 0, l = cbks.length; i < l; i++) {
      cbks[i](arg);
    }
    if (cbk === 'page') {
      // Give the browser some time to react if we've encountered a new page.
      this.delay = 20;
    }
  }

  /**
   *
   * @returns {number}
   */
  realScrollHeight() {
    return this.toNode.scrollHeight - this.maxScrollHeight;
  }

  /**
   *
   */
  nodeHandler() {
    let running = true,
      started = false,
      currentNode = this.toNode,
      nodeHierarchy = [];

    // This is a helper function to facilitate properly cloning nodes. If
    // the source documents are the same, we can use cloneNode, but if
    // not we need to use importNode.
    let shallowClone = function() {
      if (this.fromNode.ownerDocument === this.toNode.ownerDocument) {
        return function(node) {
          return node.cloneNode(false);
        }
      } else {
        let targetDocument = this.toNode.ownerDocument;

        return function(node) {
          return targetDocument.importNode(node, false);
        }
      }
    }();

    let reset = function() {
      this.toNode.innerHTML = '';
      currentNode = this.toNode;

      for (let i = 0, l = nodeHierarchy.length; i < l; i++) {
        let childNode = shallowClone(nodeHierarchy[i]);
        currentNode.appendChild(childNode);
        currentNode = childNode;
        currentNode.appendChild(document.createTextNode(""));
      }
    };

    this.start = () => {
      // Clear target node, just in case.
      reset();
      this.emitCallback('start');
    };

    this.finish = () => {
      this.emitCallback('page', this.toNode.cloneNode(true));
      this.emitCallback('finish');
      reset();
    };

    // Handle an opening element, e.g., <div>, <a>, etc.
    this.startElement = (element, c) => {
      // We don't start on the first element, since the semantic here is
      // that we copy *contained* elements, not the container.
      if (!started) {
        started = true;
        return c();
      }

      // First, clone the node to be copied, fill in data URI if necesssary,
      // and append it to our document.
      let newNode = shallowClone(element);
      if (newNode.nodeName === 'IMG' || newNode.nodeName === 'image') {
        this.emitCallback('image', newNode);
        newNode.style.height = '';
        newNode.style.width = '';
        let containerWidth = document.defaultView.getComputedStyle(currentNode, null).getPropertyValue('width').replace('px', ''),
          scale = Math.min(containerWidth / newNode.width,
            this.realHeight / newNode.height);

        if (scale < 1) {
          newNode.height = newNode.height * scale;
          newNode.width = newNode.width * scale;
        }
      }

      currentNode.appendChild(newNode);

      // If we've exceeded our height now, it's potentially due to image(s).
      // Let's try shrinking them a little. If that doesn't work, we can
      // try moving this element to the next page.
      if (this.realHeight < this.realScrollHeight()) {
        let imgs = this.toNode.getElementsByTagName('IMG'),
        origSizes = [],
          l = imgs.length,
          attempts = 0;

        for (let i = 0; i < l; i++) {
          origSizes[i] = [imgs[i].height, imgs[i].width];
        }

        while (attempts++ < 3 && this.realHeight < this.realScrollHeight()) {
          for (let i = 0; i < l; i++) {
            imgs[i].height = imgs[i].height * 0.9;
            imgs[i].width = imgs[i].width * 0.9;
          }
        }

        // If it didn't work, reset the image sizes.
        if (this.realHeight < this.realScrollHeight()) {
          for (let i = 0, l = origSizes.length; i < l; i++) {
            imgs[i].height = origSizes[i][0];
            imgs[i].width = origSizes[i][1];
          }
        }
      }

      if (newNode.nodeName === 'IMG' && this.realHeight < this.realScrollHeight()) {
        currentNode.removeChild(newNode);
        this.emitCallback('page', this.toNode.cloneNode(true));
        reset();
        currentNode.appendChild(newNode);
      }

      // Now, make this node the currentNode so we can append stuff to it,
      // and track it in the nodeHierarchy.
      currentNode = currentNode.lastChild;
      nodeHierarchy.push(currentNode);

      return c();
    };

    this.endElement = (element, c) => {
      currentNode = currentNode.parentNode;
      nodeHierarchy.pop();

      return c();
    };

    this.textNode = (element, c) => {
      let rawHyphenatedText;
      try {
        rawHyphenatedText = Hyphenator.hyphenate(decodeURIComponent(escape(element.textContent)), 'en');
      } catch (e) {
        rawHyphenatedText = Hyphenator.hyphenate(element.textContent, 'en');
      }
      let newTextNode = currentNode.ownerDocument.createTextNode(rawHyphenatedText);

      currentNode.appendChild(newTextNode);

      if (this.realHeight >= this.realScrollHeight()) {
        // We're still safe. Call the callback! Continue! Do not dawdle!
        let tmpDelay = delay;
        this.delay = 0;
        setTimeout(function continueFast() {
          c();
        }, tmpDelay);
        return;
      }
      // That didn't work. Try the slow approach.
      currentNode.removeChild(newTextNode);

      // Add a text node to the end of currentNode if there isn't already one there.
      if (!currentNode.lastChild || currentNode.lastChild.nodeType != 3) {
        currentNode.appendChild(currentNode.ownerDocument.createTextNode(""));
      }

      let textNode = currentNode.lastChild,
        space = '',
      incomingText;
      try {
        incomingText = Hyphenator.hyphenate(decodeURIComponent(escape(element.textContent)), 'en');
      } catch (e) {
        incomingText = Hyphenator.hyphenate(element.textContent, 'en');
      }

      let fitText = (start, sliceLength) => {
        if (start === incomingText.length) {
          let tmpDelay = this.delay;
          this.delay = 0;

          setTimeout(function continueSlow() {
            c();
          }, tmpDelay);
          return;
        }

        if (sliceLength <= 0) {
          // If we're here, it means we don't have any more text in the current
          // set of chunks that will fit on the page. Trigger a new page!
          this.emitCallback('page', this.toNode.cloneNode(true));

          incomingText = incomingText.substr(start, l - start);
          l = incomingText.length;

          // reset our destination collector to the current hierarchy.
          reset();

          // Now that we've reset the currentNode (which is prepped with
          // a blank text node, we need to point our text node at that.
          textNode = currentNode.lastChild;

          // finally, start the process again.
          return fitText(start, l);
        }

        // Copy a slice of text into the text node. Hopefully it fits.
        textNode.textContent += ((start == 0) ? '' : ' ') + incomingText.substr(start, sliceLength);
        if (this.realHeight < this.realScrollHeight()) {
          // Reset the text and try again with a more conservative sliceLength.
          textNode.textContent = textNode.textContent.substr(0, sliceLength + ((start == 0) ? 0 : 1));
          fitText(start, incomingText.lastIndexOf(' ', Math.floor(sliceLength / 2)));
        } else {
          // We only get here by overrunning our bbox, so keep looking for the
          // floor.
          fitText(sliceLength, incomingText.lastIndexOf(' ', Math.floor(sliceLength / 2)));
        }
      };
      // return fitText(0, l);

      let textChunks;
      try {
        textChunks = Hyphenator.hyphenate(decodeURIComponent(escape(element.textContent)), 'en').split(/[\r\n ]/);
      } catch (e) {
        textChunks = element.textContent.split(/[\r\n ]/);
      }
      let l = textChunks.length;
      while (l--) {
        // Copy this chunk into it, and see if we've overrun our bbox.
        let nextChunk = textChunks.shift();
        textNode.textContent += space + nextChunk;
        space = ' ';

        if (this.realHeight < this.realScrollHeight()) {
          // Okay, we've over-stepped our boundaries, pull off that last
          // text chunk and trigger the new page callback.
          textNode.textContent = textNode.textContent.substr(0, textNode.textContent.length - nextChunk.length);
          this.emitCallback('page', this.toNode.cloneNode(true));

          // Put our next chunk back in the queue to be processed, and
          // reset our destination collector to the current hierarchy.
          textChunks.unshift(nextChunk);
          l++;
          reset();

          // Now that we've reset the currentNode (which is prepped with
          // a blank text node, we need to point our text node at that.
          textNode = currentNode.lastChild;
          space = '';
        }
      }

      let tmpDelay = this.delay;
      this.delay = 0;
      setTimeout(function continueSlow() {
        c();
      }, tmpDelay);
    };
  }

  /**
   * The actual paginate function. Provided only to allow deferred starts.
   */
  paginate() {
    new Sax.Parser(this.fromNode, this.nodeHandler).parse();
  }
}
