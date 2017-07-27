/**
 * ePub
 *
 * @class
 */
class ePub {

  /**
   *
   * @returns {ePub}
   */
  constructor() {
    this.parser = new DOMParser();
    this.client = new XMLHttpRequest();

    return this;
  }

  /**
   * Open an ePub file
   *
   * @param {string} uri
   * @param {function} callback
   * @returns {ePub}
   */
  open(uri, callback) {
    this.client.onreadystatechange = () => {
      if (this.client.readyState === 4 && this.client.status === 200) {
        let archive = new Zip.Archive(this.client.responseText);
        callback(archive);
      } else if (this.client.readyState === 4 && this.client.status < 400 && this.client.status > 299) {
        alert('I need to look elsewhere for the book, but I don\'t know how!');
      } else if (this.client.readyState === 4) {
        alert('There was an error reading the book! I need CORS support to read books from other domains! (result code was ' + this.client.readyState + '/' + this.client.status);
      }
    };

    this.client.overrideMimeType('text/plain; charset=x-user-defined');
    this.client.open("GET", uri);
    this.client.send(null);

    return this;
  }
}

/**
 * OCF
 *
 * @class
 * @extends ePub
 */
class OCF extends ePub {

  /**
   *
   * @param {string} containerXML
   * @returns {OCF}
   */
  constructor(containerXML) {
    super();

    this.container = this.parser.parseFromString(containerXML, 'application/xml');
    this.rootFiles = this.container.querySelectorAll('rootfile');
    this.formats = {};

    // This ignores the presence of multiple alternate formats of the same type.
    let l = this.rootFiles.length;
    while (l--) {
      let mediaType = this.rootFiles[l].getAttribute('media-type');
      this.formats[mediaType] = this.rootFiles[l].getAttribute('full-path');
    }

    // Since the elements were processed in reverse, this is the first one.
    this.rootFile = this.formats['application/oebps-package+xml'];

    return this;
  }

}


/**
 * OPF
 *
 * @class
 * @extends ePub
 */
class OPF extends ePub {

  /**
   *
   * @param {string} rootFile
   * @param {Archive} archive
   * @returns {OPF}
   */
  constructor(rootFile, archive) {
    super();

    this.rootFile = rootFile;
    this.archive = archive;

    this.opfXML = this.archive.files[this.rootFile].content();
    this.opf = this.parser.parseFromString(this.opfXML, "application/xml");
    this.opfPath = this.rootFile.substr(0, this.rootFile.lastIndexOf('/'));

    return this;
  }

  /**
   *
   * @returns {Array}
   */
  get contents () {
    // Build the contents file. Needs some work.
    let itemRefs = this.spine.querySelectorAll('itemref'),
      il = itemRefs.length,
      contents = [],
      contentsByFile = {};
    while (il--) {
      let id = itemRefs[il].getAttribute('idref'),
        file = this.getFileById(id);
      contents.unshift(file);
      contentsByFile[file.name] = file;
    }

    this.contentsByFile = contentsByFile;

    return contents;
  }

  /**
   *
   * @returns {string}
   */
  get creator () {
    return this.opf.querySelector('creator').textContent;
  }

  /**
   *
   * @returns {Element}
   */
  get manifest () {
    // Get the spine and manifest to make things easier.
    return this.opf.querySelector('manifest');
  }

  /**
   *
   * @returns {Element}
   */
  get spine () {
    // Get the spine and manifest to make things easier.
    return this.opf.querySelector('spine');
  }

  /**
   *
   * @returns {NCX}
   */
  get toc () {
    // Fetch the table of contents. This (i.e., the spec) is really confusing,
    // so it might be wrong. needs more investigation.
    return new NCX(this.spine.getAttribute('toc'), this);
  }

  /**
   *
   * @returns {string}
   */
  get title () {
    return this.opf.querySelector('title').textContent;
  }

  /**
   *
   * @param {string} fileName
   * @returns {*}
   */
  getFileByName(fileName) {
    let fullPath = [this.opfPath, fileName].join("/");

    return this.archive.files[fullPath];
  }

  /**
   *
   * @param {number} id
   * @returns {*}
   */
  getFileById(id) {
    let fileName = this.manifest.querySelector("[id='" + id + "']").getAttribute('href');

    return this.getFileByName(fileName);
  }

}


/**
 * NCX
 *
 * @class
 * @extends ePub
 */
class NCX extends ePub {

  /**
   *
   * @param {string} tocId
   * @param {OPF} opf
   * @returns {NCX}
   */
  constructor(tocId, opf) {
    super();

    this.ncxXML = opf.getFileById(tocId).content();
    this.ncx = this.parser.parseFromString(this.ncxXML, 'application/xml');

    // navmap > navpoint > navlabel > text(), navmap > navpoint > content into an array
    this.navpoints = this.ncx.querySelectorAll('navMap navPoint');

    let contents = [];
    for (let i = 0, l = this.navpoints.length; i < l; i++) {
      let src = this.navpoints[i].querySelector('content').getAttribute('src'),
        file = opf.getFileByName(src),
        content;

      if (!file) {
        content = function () {
          return ""
        };
      } else {
        content = function () {
          return decodeURIComponent(escape(file.content()))
        };
      }

      let point = {
        title: this.navpoints[i].querySelector('navLabel text').textContent,
        fileName: file.name,
        content: content
      };

      if (!file) {
        console.log("Couldn't find a file named " + src + " for section named " + point.title);
      }

      let pos = this.navpoints[i].getAttribute('playOrder') - 1;
      contents[pos] = point;
    }

    this.contents = contents;

    return this;
  }

}
window.ePub = window.ePub || new ePub();