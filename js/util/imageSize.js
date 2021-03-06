let pngMagicNum = "\211PNG\r\n\032\n",
jpgMagicNum = "\377\330",
gifMagicNum = "GIF8";

let getImageSize = function (imageData) {
  let nextByte = () => {
      return imageData.charCodeAt(pos++);
    },
    pos = 0;

  if (imageData.substr(0, 8) === pngMagicNum) {
    // PNG. Easy peasy.
    pos = imageData.indexOf('IHDR') + 4;

    return {
      width: (nextByte() << 24) | (nextByte() << 16) | (nextByte() << 8) | nextByte(),
      height: (nextByte() << 24) | (nextByte() << 16) | (nextByte() << 8) | nextByte()
    };
  } else if (imageData.substr(0, 4) === gifMagicNum) {
    pos = 6;

    return {
      width: (nextByte() << 8) | nextByte(),
      height: (nextByte() << 8) | nextByte()
    };
  } else if (imageData.substr(0, 2) === jpgMagicNum) {
    pos = 2;

    let l = imageData.length;
    while (pos < l) {
      if (nextByte() != 0xFF) {
        return;
      }

      let marker = nextByte(),
        size = (nextByte() << 8) | nextByte();
      if (marker == 0xDA) {
        break;
      }

      if (marker >= 0xC0 && marker <= 0xCF && !(marker & 0x4) && !(marker & 0x8)) {
        pos += 1;

        return {
          height: (nextByte() << 8) | nextByte(),
          width: (nextByte() << 8) | nextByte()
        };
      } else {
        pos += size - 2;
      }
    }
  }
};
