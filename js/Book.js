/**
 *
 */
class Book {

  /**
   *
   * Open an epub file and get it's contents
   *
   * @param {Archive} archive
   * @returns {Book}
   */
  constructor (archive) {
    this.archive = archive;
    this.ocf = new OCF(this.archive.files['META-INF/container.xml'].content());
    this.opf = new OPF(this.ocf.rootFile, this.archive);

    return this;
  }

  /**
   *
   * @returns {OPF.getFileByName}
   */
  getFile () {
    return this.opf.getFileByName;
  }

  /**
   *
   * @returns {string|*}
   */
  get author () {
    return this.opf.creator;
  }

  /**
   *
   * @returns {Array|*}
   */
  get contents () {
    return this.opf.contents;
  }

  /**
   *
   * @returns {{}|*}
   */
  get contentsByFile () {
    return this.opf.contentsByFile;
  }

  /**
   *
   * @returns {string|*}
   */
  get title () {
    return this.opf.title;
  }

  /**
   *
   * @returns {Array|*}
   */
  get toc () {
    return this.opf.toc.contents;
  }

}
