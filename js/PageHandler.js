/*
 +Page+ takes a reference to a book, from which it extracts content.
 +Page+ takes an array of +displayElement+s, which are document elements
 in which we wish to display the book, and paginates according to the size of
 the first of those elements (the assumption is that they are all sized
 equally).

 It then provides methods to move forwards and backwards in a book, loading
 sections as necessary so as to prevent pre-loading the entire book (which
 can be quite time consuming, and is unnecessary).

 Optional arguments may be supplied, including +pageNumbers+ (an array of
 elements whose textContent will be set to the current corresponding page
 number) and +chapterName+, whose textContent will be set to the current
 chapter name, if any.
 */

class PageHandler {

  constructor(book, displayElements, pageNumbers, chapterName) {
    this.book = book;
    this.displayElements = displayElements;
    this.pageNumbers = pageNumbers;
    this.chapterName = chapterName;
    this.collectorBase = this.displayElements[0];
    this.sections = [];
    this.sectionsByName = {};
    this.pageCounts = [0];
    this.currSection = 0;
    this.loadingIndicator = {};
    this.waiting = 0;
    this.accum = 0;
    this.naccum = 0;

    // Load the book sections.
    for (let i = 0, l = this.book.contents.length; i < l; i++) {
      this.addSection(this.book.contents[i]);
    }

  }

  /**
   *
   * @param {Array} dspElements
   */
  setPages(dspElements) {
    // We need to reset the page numbering, since n > 1 page
    // layouts can have blank pages between chapters.
    if (this.displayElements.length != dspElements.length) {
      this.pageCounts = [0];
    }

    this.displayElements = dspElements;
  }

  /**
   * Show the loading indicator
   * @param {number} t
   */
  showLoadingIndicator(t) {
    this.loadingIndicator = setTimeout(function () {
      document.getElementById('spinner').style.display = 'block';
    }, t);
  }

  /**
   * Hide the loading indicator
   */
  hideLoadingIndicator() {
    clearTimeout(this.loadingIndicator);
    document.getElementById('spinner').style.display = 'none';
  }

  /**
   *
   */
  recalculatePageNumbers() {
    for (let i = 1, l = this.sections.length; i < l; i++) {
      if (this.pageCounts[i] >= 0) {
        continue;
      } else {
        let sectionOffset = this.sections[i - 1].pageCount + this.pageCounts[i - 1],
          roundingCorrection = this.sections[i - 1].pageCount % this.displayElements.length;
        this.pageCounts[i] = sectionOffset + roundingCorrection;
      }
    }
  };

  /**
   *
   * @param pageIdx
   * @param pageOffset
   */
  showPageNumber(pageIdx, pageOffset) {
    if (this.pageNumbers) {
      if (!(this.pageCounts[this.currSection] >= 0)) {
        this.recalculatePageNumbers();
      }

      this.pageNumbers[pageIdx].textContent = this.pageCounts[this.currSection] + pageOffset;
    }
  };

  /**
   *
   */
  pageRenderer() {
    let totalPageCount = this.pageCounts.length;
    for (let i = this.pageCounts.length - 1; i >= 0; i--) {
      if (!this.pageCounts[i]) {
        continue;
      }

      totalPageCount = this.pageCounts[i];
      break;
    }

    let currPage = this.pageCounts[this.currSection] + this.sections[this.currSection].currPage;
    if (!currPage) {
      currPage = Math.min(this.currSection, totalPageCount - 1);
    }
    if (currPage >= totalPageCount) {
      currPage = currPage - 1;
    }

    this.drawPct(currPage / totalPageCount);
  }

  /**
   *
   * @param pageIdx
   * @returns {function(*)}
   */
  pageDisplayer(pageIdx) {
    this.pageRenderer();

    // Expect to get called within 50 ms, or display the loading indicator.
    this.showLoadingIndicator(50);
    this.waiting++;

    return (page) => {
      if (page === null) {
        this.displayElements[pageIdx].innerHTML = '';
        this.showPageNumber(pageIdx, this.sections[this.currSection].currPage + 1);
      } else {
        this.displayElements[pageIdx].innerHTML = page.innerHTML;
        this.showPageNumber(pageIdx, this.sections[this.currSection].currPage);
      }

      if (--this.waiting <= 0) {
        this.hideLoadingIndicator();
        this.waiting = 0;
      }
    }
  }

  /**
   *
   */
  nextPage() {
    if (this.waiting > 0) {
      return;
    }

    // Move to the next section if we're at the end of this one.
    if (this.sections[this.currSection].isLastPage()) {
      if (this.sections.length > this.currSection + 1) {
        this.currSection += 1;
        this.sections[this.currSection].seekBeginning();
      } else {
        // do nothing.
        return;
      }
    }

    for (let i = 0, l = this.displayElements.length; i < l; i++) {
      this.sections[this.currSection].nextPage(this.pageDisplayer(i));
    }
  }

  /**
   *
   */
  prevPage() {
    // Don't go back a page if we're already trying to do a page movement.
    if (this.waiting > 0) {
      return;
    }
    if (this.sections[this.currSection].currPage <= this.displayElements.length) {
      if (this.currSection > 0) {
        this.sections[--this.currSection].seekEnd(
          (sectionLength) => {
            let blanks = sectionLength % this.displayElements.length;
            this.sections[this.currSection].rewind(this.displayElements.length - blanks);
            this.nextPage();
          }
        );
      }
    } else {
      this.sections[this.currSection].rewind(this.displayElements.length * 2);
      this.nextPage();
    }
  }

  /**
   *
   * @param secName
   */
  goToSection(secName) {
    this.currSection = this.sectionsByName[secName];
    this.sections[this.currSection].seekBeginning();
  }

  /**
   * addSection takes a callback function that will open the section
   *
   * @param contentRef
   * @returns {Section}
   */
  addSection(contentRef) {
    /**
     *  The content collector. This uses the first displayElement as a template
     *  to paginate the text. We call it from pageHandler.addSection to generate
     *  callbacks that will return content for us when we need it.
     */
    let contentsLoader = () => {
      var parser = new DOMParser();

      var getNewCollector = function () {
        var contentCollector = self.collectorBase.cloneNode(false);
        contentCollector.id = 'contentCollector';
        contentCollector.style.marginTop = '10000px';
        self.collectorBase.parentNode.appendChild(contentCollector);

        return contentCollector;
      };

      return function (contentChunk) {
        return function (addPageCallback, finishCallback) {
          var contentDoc = parser.parseFromString(contentChunk.content(), 'application/xml'),
            contentHeader = contentDoc.getElementsByTagName('head')[0],
            contentContainer = contentDoc.getElementsByTagName('body')[0];

          var contentCollector = getNewCollector();

          var styleContent;
          for (var i = 0, l = contentHeader.children.length; i < l; i++) {
            var elem = contentHeader.children[i];

            if (elem.nodeName == 'link' && elem.rel == 'stylesheet') {
              if (!styleContent) styleContent = '';
              let href = elem.getAttribute('href'),
                fileR = book.getFile(href);
              if (fileR) {
                styleContent += fileR.content();
              }
            } else if (elem.nodeName == 'style') {
              if (!styleContent) styleContent = '';
              styleContent += elem.textContent;
            }
          }

          if (!document.getElementById('rePublishStyle')) {
            var ssheet = document.createElement('style');
            ssheet.id = 'rePublishStyle';
            ssheet.textContent = styleContent;
            document.getElementsByTagName('head')[0].appendChild(ssheet);
          } else {
            var ssheet = document.getElementById('rePublishStyle');
            ssheet.textContent = styleContent;
          }

          var paginator = new Paginator(contentContainer, contentCollector, styleContent);

          paginator.addCallback('page', function (page) {
            addPageCallback(page, contentHeader);
          });

          paginator.addCallback('finish', function () {
            contentCollector.parentNode.removeChild(contentCollector);
            finishCallback();
          });

          paginator.addCallback('image', function (image) {
            var img;
            if (image.getAttribute('src')) {
              var img = book.getFile(image.getAttribute('src'));
            } else {
              var img = book.getFile(image.getAttribute('xlink:href'));
            }

            if (!img) return;

            var imgContent = img.content();
            var b64imgContent = Base64.encode(imgContent);

            try {
              var sz = getImageSize(imgContent);
              if (sz) {
                image.width = sz.width;
                image.height = sz.height;
              }
            } catch (e) {
              // console.log('error finding image size for ' + image.getAttribute('src'));
            }

            var imgType = img.name.substr(img.name.lastIndexOf('.') + 1, img.name.length);
            var dataUri = "data:image/" + imgType + ";base64," + b64imgContent;
            image.setAttribute('src', dataUri);
          });

          paginator.paginate();
        };
      };
    };

    let section = new Section(contentsLoader(contentRef));
    this.sections.push(section);
    this.sectionsByName[contentRef.name] = this.sections.length - 1;

    return section;
  }

  /**
   *
   */
  display() {
    let l = this.book.contents.length;

    function loadSection(n) {
      if (n < l) {
        let startTime = new Date();
        // Load section n, and schedule the next section to load in 100ms.
        this.sections[n].loadCallback((loaded) => {
          let finishTime = new Date();
          console.log("Loading section " + n + " took " + (finishTime - startTime) + "ms");
          this.accum += finishTime - startTime;
          this.naccum++;
          if (loaded) {
            setTimeout(function () {
              loadSection(n + 1)
            }, 20);
          }
        });
      } else {
        console.log('average: ' + (this.accum / this.naccum));
      }
    }

    loadSection(0);

    this.nextPage();
  }

}
