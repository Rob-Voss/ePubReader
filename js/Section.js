/**
 * This is a holder for sections; each section needs to store an internal
 * reference to its own pages, since they are loaded internally via the
 * contentCallback.
 *
 * While it would be possible to load all of the sections' pages into a single
 * array, doing so would make it impossible to access each section
 * independently (or, at least, much more difficult).
 */
class Section {

  /**
   *
   * @param {function} contentCallback
   */
  constructor(contentCallback) {
    let pages = [],
      lastPage = -1,
      isLoading = false,
      callbackQueue = [];

    this.currPage = 0;

    /**
     * loadCallback - calls the callback that will load and paginate the
     * content for this section.
     * Calls c() twice if the section isn't loaded the first time around.
     * @param {function} c
     */
    this.loadCallback = (c) => {
      if (lastPage == -1 && !isLoading) {
        isLoading = true;

        let finishLoad = () => {
          this.pageCount = pages.length;
          isLoading = false;

          // The first callback is the one that started the loading.
          c(true);

          // Once we've done that, clear out the pending queue.
          while (callbackQueue.length > 0) {
            callbackQueue.shift()(true);
          }
        };

        let addPage = (page) => {
          lastPage += 1;
          pages.push(page);
        };

        contentCallback(addPage, finishLoad);
      } else {
        c(!isLoading);
        callbackQueue.push(c);
      }
    };

    /**
     * Check if it is the first page
     * @returns {boolean}
     */
    this.isFirstPage = () => this.currPage == 0;

    /**
     * Check if it is the last page
     * @returns {boolean}
     */
    this.isLastPage = () => (!(isLoading || this.currPage < lastPage + 1));

    /**
     * Fetch the next page.
     * We ignore if the whole section is loaded here, triggering the
     * callback only when:
     * - the page is available
     * - the page is never going to be available
     * loadCallback will fire twice if the section isn't loaded.
     * @param {function} callback
     */
    this.nextPage = (callback) => {
      this.loadCallback((loaded) => {
        // callback((pages[this.currPage]) ? pages[this.currPage++] : null);
        if (pages[this.currPage]) {
          // The page we're looking for is present. Go ahead and load it.
          callback(pages[this.currPage++]);
        } else if (loaded === true) {
          // There is no next page. Send null.
          callback(null);
        }
      });
    };

    /**
     * Fetch the previous page.
     * @param callback
     */
    this.prevPage = (callback) => callback((this.currPage > 0) ? pages[--this.currPage] : null);

    /**
     * Go back a number of pages
     * @param n
     */
    this.rewind = (n) => this.currPage = Math.max(this.currPage - n, 0);

    /**
     * Go to the beginning page
     */
    this.seekBeginning = () => this.currPage = 0;

    /**
     * Seek to the end of a section. Waits for the section to fully load.
     * @param {function} callback
     */
    this.seekEnd = (callback) => {
      this.loadCallback((loaded) => {
        if (loaded) {
          this.currPage = lastPage + 1;
          callback(lastPage + 1);
        }
      });
    };

  };
}
