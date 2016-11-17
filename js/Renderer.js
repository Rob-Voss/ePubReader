class Renderer extends PageHandler {

  /**
   *
   * @constructor
   * @param canvas
   * @param dimensions
   * @param curlRadius
   * @param offset
   */
  constructor(canvas, dimensions, curlRadius, offset) {
    super();

    this.canvas = canvas;

    this.dimensions = dimensions || {
      center: 0,
      top: 0,
      width: 0,
      height: 0
    };

    this.curlRadius = curlRadius || {
      x: 0,
      y: 0,
      maxX: 0,
      maxY: 0
    };

    this.offset = offset || {
      v: 0,
      h: 0
    };
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
        this.canvas.beginPath();
        this.canvas.moveTo(this.dimensions.center, this.dimensions.top + this.curlRadius.y + this.offset.v);

        // Spine
        this.canvas.lineTo(this.dimensions.center, bottom + this.curlRadius.maxY);
        this.canvas.lineTo(this.dimensions.center, bottom + this.curlRadius.maxY);

        // Bottom curl.
        this.canvas.bezierCurveTo(this.dimensions.center - this.curlRadius.x / 4 - this.offset.h, bottom + this.offset.v - this.curlRadius.y / 2,
          this.dimensions.center - this.curlRadius.x - this.offset.h, bottom + this.offset.v - this.curlRadius.y / 2,
          this.dimensions.center - this.curlRadius.x - this.offset.h, bottom + this.offset.v - this.curlRadius.y / 2);

        // Bottom Page Edge
        this.canvas.bezierCurveTo((this.dimensions.center + left) / 2, bottom + this.offset.v / 2 - this.curlRadius.y / 2,
          (this.dimensions.center + left) / 2, bottom + this.offset.v,
          left + 1, bottom + this.offset.v);
        //  canvas.lineTo(left + 1, bottom + vOffset);

        // Left Edge with Rounded Corners
        this.canvas.quadraticCurveTo(left, bottom + this.offset.v, left, bottom + this.offset.v - 1);
        this.canvas.lineTo(left, this.dimensions.top + this.offset.v + 1);
        this.canvas.quadraticCurveTo(left + 1, this.dimensions.top + this.offset.v, left, this.dimensions.top + this.offset.v);

        // Top Page Edge
        this.canvas.bezierCurveTo((this.dimensions.center + left) / 2, this.dimensions.top + this.offset.v,
          (this.dimensions.center + left) / 2, this.dimensions.top + this.offset.v / 2 + this.curlRadius.y / 2,
          this.dimensions.center - this.curlRadius.x, this.dimensions.top + this.offset.v);
        // canvas.lineTo(center - curlRadiusX, top + vOffset + 1);

        // Top Curl
        this.canvas.bezierCurveTo(this.dimensions.center - this.curlRadius.x / 2, this.dimensions.top + this.offset.v,
          this.dimensions.center, this.dimensions.top + this.offset.v + this.curlRadius.y / 2,
          this.dimensions.center, this.dimensions.top + this.curlRadius.y + this.offset.v);

        if (fill) {
          let strokeGradient = this.canvas.createLinearGradient(left, bottom, this.dimensions.center, 0);
          strokeGradient.addColorStop(0, 'rgb(194, 190, 184)');
          strokeGradient.addColorStop(1 - (this.curlRadius.x / this.dimensions.width * 0.5), 'rgb(234, 230, 224)');
          this.canvas.strokeStyle = strokeGradient;
        } else {
          this.canvas.strokeStyle = 'rgb(194,190,184)'
        }
        this.canvas.stroke();

        if (fill) {
          let fillGradient = this.canvas.createLinearGradient(left, 0, this.dimensions.center, this.curlRadius.x / 8);
          fillGradient.addColorStop(1 - (this.curlRadius.x / this.dimensions.width * 0.8), 'rgb(250, 246, 240)');
          fillGradient.addColorStop(1, 'rgb(234, 230, 224)');
          this.canvas.fillStyle = fillGradient;
          this.canvas.fill();
        }
        this.canvas.closePath();

        break;
      case 'right':
        this.canvas.beginPath();
        this.canvas.moveTo(this.dimensions.center, this.dimensions.top + this.curlRadius.y + this.offset.v);

        // Spine
        this.canvas.lineTo(this.dimensions.center, bottom + this.curlRadius.maxY);
        this.canvas.lineTo(this.dimensions.center, bottom + this.curlRadius.maxY);

        // Bottom curl.
        this.canvas.bezierCurveTo(this.dimensions.center + this.curlRadius.x / 2 + this.offset.h, bottom + this.offset.v - this.curlRadius.y / 2,
          this.dimensions.center + this.curlRadius.x + this.offset.h, bottom + this.offset.v - this.curlRadius.y / 2,
          this.dimensions.center + this.curlRadius.x + this.offset.h, bottom + this.offset.v - this.curlRadius.y / 2);

        // Bottom Page Edge
        this.canvas.bezierCurveTo((this.dimensions.center + right) / 2, bottom + this.offset.v / 2 - this.curlRadius.y / 2,
          (this.dimensions.center + right) / 2, bottom + this.offset.v,
          right - 1, bottom + this.offset.v);
        //  canvas.lineTo(right - 1, bottom + vOffset);

        // Left Edge with Rounded Corners
        this.canvas.quadraticCurveTo(right, bottom + this.offset.v, right, bottom + this.offset.v - 1);
        this.canvas.lineTo(right, this.dimensions.top + this.offset.v + 1);
        this.canvas.quadraticCurveTo(right - 1, this.dimensions.top + this.offset.v, right, this.dimensions.top + this.offset.v);

        // Top Page Edge
        this.canvas.bezierCurveTo((this.dimensions.center + right) / 2, this.dimensions.top + this.offset.v / 2 + this.curlRadius.y / 2,
          (this.dimensions.center + right) / 2, this.dimensions.top + this.offset.v,
          this.dimensions.center + this.curlRadius.x, this.dimensions.top + this.offset.v);
        // canvas.lineTo(center + curlRadiusX, top + vOffset);

        // Top Curl
        this.canvas.bezierCurveTo(this.dimensions.center + this.curlRadius.x / 2, this.dimensions.top + this.offset.v,
          this.dimensions.center, this.dimensions.top + this.offset.v + this.curlRadius.y / 2,
          this.dimensions.center, this.dimensions.top + this.curlRadius.y + this.offset.v);

        if (fill) {
          let strokeGradient = this.canvas.createLinearGradient(right, bottom, this.dimensions.center, 0);
          strokeGradient.addColorStop(0, 'rgb(194, 190, 184)');
          strokeGradient.addColorStop(1 - (this.curlRadius.x / this.dimensions.width * 0.5), 'rgb(234, 230, 224)');
          this.canvas.strokeStyle = strokeGradient;
        } else {
          this.canvas.strokeStyle = 'rgb(194,190,184)'
        }
        this.canvas.stroke();

        if (fill) {
          let fillGradient = this.canvas.createLinearGradient(right, 0, this.dimensions.center, 0);
          fillGradient.addColorStop(1 - (this.curlRadius.x / (this.dimensions.width * 0.8)), 'rgb(250, 246, 240)');
          fillGradient.addColorStop(1, 'rgb(234, 230, 224)');
          this.canvas.fillStyle = fillGradient;
          this.canvas.fill();
        }
        this.canvas.closePath();
        break;
    }
  }

  /**
   *
   * @param pct
   */
  drawPct(pct) {
    let canvas = document.getElementById('background'),
      context = this.canvas.getContext('2d'),
      width = canvas.width / 2,
      height = canvas.height,
      thickness = 20,
      dimensions = {center: 0, top: 0, width: 0, height: 0},
      curlRadius = {x: 0, y: 0, maxX: 0, maxY: 0},
      offset = {v: 0, h: 0};

    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    pct = Math.min(1, pct);
    pct = Math.max(0, pct);

    for (let i = thickness; i >= Math.ceil(pct * thickness); i--) {
      let x = Math.max(1, i),
        fill = i == Math.ceil(pct * thickness);
      dimensions.center = width;
      dimensions.top = 0;
      dimensions.width = width - Math.log(thickness + 1) * 10;
      dimensions.height = height - Math.log(thickness) * 6;
      offset.x = Math.log(x + 2) * 8;
      offset.y = Math.log(x + 2) * 4;
      curlRadius.x = Math.log((thickness - x) + 2) * 10;
      curlRadius.y = Math.log((thickness - x) + 2) * 4;
      curlRadius.maxX = Math.log(thickness + 2) * 4;
      curlRadius.maxY = Math.log(thickness + 2) * 4;

      this.drawPage('right', fill, dimensions, curlRadius, offset);
    }

    for (let i = 0; i <= Math.ceil(pct * thickness); i++) {
      let x = Math.max(1, thickness - i),
        fill = i == Math.ceil(pct * thickness);
      dimensions.center = width;
      dimensions.top = 0;
      dimensions.width = width - Math.log(thickness + 1) * 10;
      dimensions.height = height - Math.log(thickness) * 6;
      offset.x = Math.log(x + 2) * 8;
      offset.y = Math.log(x + 2) * 4;
      curlRadius.x = Math.log((thickness - x) + 2) * 10;
      curlRadius.y = Math.log((thickness - x) + 2) * 4;
      curlRadius.maxX = Math.log(thickness + 2) * 4;
      curlRadius.maxY = Math.log(thickness + 2) * 4;

      this.drawPage('left', fill, dimensions, curlRadius, offset);
    }
  }

}
