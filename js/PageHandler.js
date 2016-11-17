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

  /**
   *
   * @param book
   * @param displayElements
   * @param pageNumbers
   * @param chapterName
   */
  constructor(book, displayElements, pageNumbers, chapterName) {
    this.book = book;
    this.canvas = document.getElementById('background');
    this.context = this.canvas.getContext('2d');
    this.width = this.canvas.width / 2;
    this.height = this.canvas.height;
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
    this.dimensions = {
        center: 0,
        top: 0,
        width: 0,
        height: 0
      };
    this.curlRadius = {
        x: 0,
        y: 0,
        maxX: 0,
        maxY: 0
      };
    this.offset = {
        v: 0,
        h: 0
      };

    // Load the book sections.
    for (let i = 0, l = this.book.contents.length; i < l; i++) {
      this.addSection(this.book.contents[i]);
    }

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
      /**
       *
       * @type {DOMParser}
       */
      let parser = new DOMParser(),
        /**
         *
         * @returns {Node}
         */
        getNewCollector = () => {
          /**
           *
           * @type {Node}
           */
          let contentCollector = self.collectorBase.cloneNode(false);
          contentCollector.id = 'contentCollector';
          contentCollector.style.marginTop = '10000px';
          self.collectorBase.parentNode.appendChild(contentCollector);

          return contentCollector;
        };

      return (contentChunk) => {
        return (addPageCallback, finishCallback) => {
          /**
           *
           * @type {Document}
           */
          let contentDoc = parser.parseFromString(contentChunk.content(), 'application/xml'),
            /**
             *
             * @type {Element}
             */
            contentHeader = contentDoc.getElementsByTagName('head')[0],
            /**
             *
             * @type {Element}
             */
            contentContainer = contentDoc.getElementsByTagName('body')[0],
            /**
             *
             * @type {Node}
             */
            contentCollector = getNewCollector(),
            /**
             *
             * @type {string}
             */
            styleContent = '',
            /**
             *
             * @type {Element}
             */
            styleSheet = {};
          for (let i = 0, l = contentHeader.children.length; i < l; i++) {
            let elem = contentHeader.children[i];
            if (elem.nodeName == 'link' && elem.rel == 'stylesheet') {
              let href = elem.getAttribute('href'),
                fileR = this.book.getFile(href);
              styleContent = styleContent || '';
              if (fileR) {
                styleContent += fileR.content();
              }
            } else if (elem.nodeName == 'style') {
              styleContent = styleContent || '';
              styleContent += elem.textContent;
            }
          }

          if (!document.getElementById('rePublishStyle')) {
            styleSheet = document.createElement('style');
            styleSheet.id = 'rePublishStyle';
            document.getElementsByTagName('head')[0].appendChild(styleSheet);
          } else {
            styleSheet = document.getElementById('rePublishStyle');
          }
          styleSheet.textContent = styleContent;

          /**
           *
           * @type {Paginator}
           */
          let paginator = new Paginator(contentContainer, contentCollector, styleContent);
          paginator.addCallback('page', (page) => {
            addPageCallback(page, contentHeader);
          });

          paginator.addCallback('finish', () => {
            contentCollector.parentNode.removeChild(contentCollector);
            finishCallback();
          });

          paginator.addCallback('image', (image) => {
            let img;
            if (image.getAttribute('src')) {
              img = this.book.getFile(image.getAttribute('src'));
            } else {
              img = this.book.getFile(image.getAttribute('xlink:href'));
            }

            if (!img) {
              return;
            }

            let imgContent = img.content(),
              b64imgContent = Base64.encode(imgContent);

            try {
              let sz = getImageSize(imgContent);
              if (sz) {
                image.width = sz.width;
                image.height = sz.height;
              }
            } catch (e) {
              // console.log('error finding image size for ' + image.getAttribute('src'));
            }

            let imgType = img.name.substr(img.name.lastIndexOf('.') + 1, img.name.length),
              dataUri = "data:image/" + imgType + ";base64," + b64imgContent;
            image.setAttribute('src', dataUri);
          });

          paginator.paginate();
        };
      };
    };

    /**
     *
     * @type {Section}
     */
    let section = new Section(contentsLoader(contentRef));
    this.sections.push(section);
    this.sectionsByName[contentRef.name] = this.sections.length - 1;

    return section;
  }

  /**
   *
   * @param side
   * @param fill
   */
  drawPage(side, fill) {
    let bottom = this.dimensions.top + this.dimensions.height,
      // Right Page
      right = this.dimensions.center + this.dimensions.width + this.offset.h,
      // Left Page
      left = this.dimensions.center - this.dimensions.width - this.offset.h;

    switch (side) {
      case 'left':
        this.context.beginPath();
        this.context.moveTo(this.dimensions.center, this.dimensions.top + this.curlRadius.y + this.offset.v);

        // Spine
        this.context.lineTo(this.dimensions.center, bottom + this.curlRadius.maxY);
        this.context.lineTo(this.dimensions.center, bottom + this.curlRadius.maxY);

        // Bottom curl.
        this.context.bezierCurveTo(this.dimensions.center - this.curlRadius.x / 4 - this.offset.h, bottom + this.offset.v - this.curlRadius.y / 2,
          this.dimensions.center - this.curlRadius.x - this.offset.h, bottom + this.offset.v - this.curlRadius.y / 2,
          this.dimensions.center - this.curlRadius.x - this.offset.h, bottom + this.offset.v - this.curlRadius.y / 2);

        // Bottom Page Edge
        this.context.bezierCurveTo((this.dimensions.center + left) / 2, bottom + this.offset.v / 2 - this.curlRadius.y / 2,
          (this.dimensions.center + left) / 2, bottom + this.offset.v,
          left + 1, bottom + this.offset.v);
        //  canvas.lineTo(left + 1, bottom + vOffset);

        // Left Edge with Rounded Corners
        this.context.quadraticCurveTo(left, bottom + this.offset.v, left, bottom + this.offset.v - 1);
        this.context.lineTo(left, this.dimensions.top + this.offset.v + 1);
        this.context.quadraticCurveTo(left + 1, this.dimensions.top + this.offset.v, left, this.dimensions.top + this.offset.v);

        // Top Page Edge
        this.context.bezierCurveTo((this.dimensions.center + left) / 2, this.dimensions.top + this.offset.v,
          (this.dimensions.center + left) / 2, this.dimensions.top + this.offset.v / 2 + this.curlRadius.y / 2,
          this.dimensions.center - this.curlRadius.x, this.dimensions.top + this.offset.v);
        // canvas.lineTo(center - curlRadiusX, top + vOffset + 1);

        // Top Curl
        this.context.bezierCurveTo(this.dimensions.center - this.curlRadius.x / 2, this.dimensions.top + this.offset.v,
          this.dimensions.center, this.dimensions.top + this.offset.v + this.curlRadius.y / 2,
          this.dimensions.center, this.dimensions.top + this.curlRadius.y + this.offset.v);

        if (fill) {
          let strokeGradient = this.context.createLinearGradient(left, bottom, this.dimensions.center, 0);
          strokeGradient.addColorStop(0, 'rgb(194, 190, 184)');
          strokeGradient.addColorStop(1 - (this.curlRadius.x / this.dimensions.width * 0.5), 'rgb(234, 230, 224)');
          this.context.strokeStyle = strokeGradient;
        } else {
          this.context.strokeStyle = 'rgb(194,190,184)'
        }
        this.context.stroke();

        if (fill) {
          let fillGradient = this.context.createLinearGradient(left, 0, this.dimensions.center, this.curlRadius.x / 8);
          fillGradient.addColorStop(1 - (this.curlRadius.x / this.dimensions.width * 0.8), 'rgb(250, 246, 240)');
          fillGradient.addColorStop(1, 'rgb(234, 230, 224)');
          this.context.fillStyle = fillGradient;
          this.context.fill();
        }
        this.context.closePath();

        break;

      case 'right':
        this.context.beginPath();
        this.context.moveTo(this.dimensions.center, this.dimensions.top + this.curlRadius.y + this.offset.v);

        // Spine
        this.context.lineTo(this.dimensions.center, bottom + this.curlRadius.maxY);
        this.context.lineTo(this.dimensions.center, bottom + this.curlRadius.maxY);

        // Bottom curl.
        this.context.bezierCurveTo(this.dimensions.center + this.curlRadius.x / 2 + this.offset.h, bottom + this.offset.v - this.curlRadius.y / 2,
          this.dimensions.center + this.curlRadius.x + this.offset.h, bottom + this.offset.v - this.curlRadius.y / 2,
          this.dimensions.center + this.curlRadius.x + this.offset.h, bottom + this.offset.v - this.curlRadius.y / 2);

        // Bottom Page Edge
        this.context.bezierCurveTo((this.dimensions.center + right) / 2, bottom + this.offset.v / 2 - this.curlRadius.y / 2,
          (this.dimensions.center + right) / 2, bottom + this.offset.v,
          right - 1, bottom + this.offset.v);
        //  canvas.lineTo(right - 1, bottom + vOffset);

        // Left Edge with Rounded Corners
        this.context.quadraticCurveTo(right, bottom + this.offset.v, right, bottom + this.offset.v - 1);
        this.context.lineTo(right, this.dimensions.top + this.offset.v + 1);
        this.context.quadraticCurveTo(right - 1, this.dimensions.top + this.offset.v, right, this.dimensions.top + this.offset.v);

        // Top Page Edge
        this.context.bezierCurveTo((this.dimensions.center + right) / 2, this.dimensions.top + this.offset.v / 2 + this.curlRadius.y / 2,
          (this.dimensions.center + right) / 2, this.dimensions.top + this.offset.v,
          this.dimensions.center + this.curlRadius.x, this.dimensions.top + this.offset.v);
        // canvas.lineTo(center + curlRadiusX, top + vOffset);

        // Top Curl
        this.context.bezierCurveTo(this.dimensions.center + this.curlRadius.x / 2, this.dimensions.top + this.offset.v,
          this.dimensions.center, this.dimensions.top + this.offset.v + this.curlRadius.y / 2,
          this.dimensions.center, this.dimensions.top + this.curlRadius.y + this.offset.v);

        if (fill) {
          let strokeGradient = this.context.createLinearGradient(right, bottom, this.dimensions.center, 0);
          strokeGradient.addColorStop(0, 'rgb(194, 190, 184)');
          strokeGradient.addColorStop(1 - (this.curlRadius.x / this.dimensions.width * 0.5), 'rgb(234, 230, 224)');
          this.context.strokeStyle = strokeGradient;
        } else {
          this.context.strokeStyle = 'rgb(194,190,184)'
        }
        this.context.stroke();

        if (fill) {
          let fillGradient = this.context.createLinearGradient(right, 0, this.dimensions.center, 0);
          fillGradient.addColorStop(1 - (this.curlRadius.x / (this.dimensions.width * 0.8)), 'rgb(250, 246, 240)');
          fillGradient.addColorStop(1, 'rgb(234, 230, 224)');
          this.context.fillStyle = fillGradient;
          this.context.fill();
        }
        this.context.closePath();
        break;
    }
  }

  /**
   *
   * @param pct
   */
  drawPct(pct) {
    let thickness = 20;

    this.context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    pct = Math.min(1, pct);
    pct = Math.max(0, pct);

    for (let i = thickness; i >= Math.ceil(pct * thickness); i--) {
      let x = Math.max(1, i),
        fill = i == Math.ceil(pct * thickness);
      this.dimensions.center = this.width;
      this.dimensions.top = 0;
      this.dimensions.width = this.width - Math.log(thickness + 1) * 10;
      this.dimensions.height = this.height - Math.log(thickness) * 6;
      this.offset.x = Math.log(x + 2) * 8;
      this.offset.y = Math.log(x + 2) * 4;
      this.curlRadius.x = Math.log((thickness - x) + 2) * 10;
      this.curlRadius.y = Math.log((thickness - x) + 2) * 4;
      this.curlRadius.maxX = Math.log(thickness + 2) * 4;
      this.curlRadius.maxY = Math.log(thickness + 2) * 4;

      this.drawPage('right', fill, this.dimensions, this.curlRadius, this.offset);
    }

    for (let i = 0; i <= Math.ceil(pct * thickness); i++) {
      let x = Math.max(1, thickness - i),
        fill = i == Math.ceil(pct * thickness);
      this.dimensions.center = this.width;
      this.dimensions.top = 0;
      this.dimensions.width = this.width - Math.log(thickness + 1) * 10;
      this.dimensions.height = this.height - Math.log(thickness) * 6;
      this.offset.x = Math.log(x + 2) * 8;
      this.offset.y = Math.log(x + 2) * 4;
      this.curlRadius.x = Math.log((thickness - x) + 2) * 10;
      this.curlRadius.y = Math.log((thickness - x) + 2) * 4;
      this.curlRadius.maxX = Math.log(thickness + 2) * 4;
      this.curlRadius.maxY = Math.log(thickness + 2) * 4;

      this.drawPage('left', fill, this.dimensions, this.curlRadius, this.offset);
    }
  }

  /**
   *
   */
  display() {
    let loadSection = (n) => {
      if (n < this.book.contents.length) {
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
    };

    loadSection(0);

    this.nextPage();
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
   * Hide the loading indicator
   */
  hideLoadingIndicator() {
    clearTimeout(this.loadingIndicator);
    document.getElementById('spinner').style.display = 'none';
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
   *
   */
  recalculatePageNumbers() {
    for (let i = 1, l = this.sections.length; i < l; i++) {
      if (this.pageCounts[i] < 0) {
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

}
