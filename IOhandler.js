const fs = require("fs");
const PNG = require("pngjs").PNG;
const path = require("path");
const yauzl = require('yauzl-promise');
const {pipeline} = require('stream/promises');
/**
 * Description: decompress file from given pathIn, write to given pathOut
 *
 * @param {string} pathIn
 * @param {string} pathOut
 * @return {promise}
 */
const unzip = async (pathIn, pathOut) => {
  const zip = await yauzl.open(pathIn);
  try {
    await fs.promises.mkdir(pathOut, { recursive: true });
    for await (const entry of zip) {
      if (entry.filename.startsWith("__MACOSX") || path.basename(entry.filename).startsWith(".")) {
        continue;
      }
      if (entry.filename.endsWith('/')) {
        await fs.promises.mkdir(`${pathOut}/${entry.filename}`,{ recursive: true });
      } else {
        const readStream = await entry.openReadStream();
        const writeStream = fs.createWriteStream(
          `${pathOut}/${entry.filename}`
        );
        await pipeline(readStream, writeStream);
      }
    }
  } finally {
    await zip.close();
  }
};

/**
 * Description: read all the png files from given directory and return Promise containing array of each png file path
 *
 * @param {string} path
 * @return {promise}
 */
const readDir = async (dir) => {
  const results = [];
  const traverse = async (currentDir) => {
    const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await traverse(fullPath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".png")) {
        results.push(path.relative(dir, fullPath));
      }
    }
  };
  await traverse(dir);
  return results;
};

/**
 * Description: Read in png file by given pathIn,
 * convert to grayscale and write to given pathOut
 *
 * @param {string} filePath
 * @param {string} pathProcessed
 * @return {promise}
 */

const grayScale = (pathIn, pathOut) => {
  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(pathIn).on('error', reject);
    const png = new PNG({ filterType: 4 }).on('error', reject);
    const writeStream = fs.createWriteStream(pathOut)
      .on('error', reject)
      .on('finish', resolve);
    readStream.pipe(png).on('parsed', function () {
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          const idx = (this.width * y + x) << 2;
          const gray = Math.round(
            0.299 * this.data[idx] +
            0.587 * this.data[idx + 1] +
            0.114 * this.data[idx + 2]
          );
          this.data[idx] = gray;
          this.data[idx + 1] = gray;
          this.data[idx + 2] = gray;
        }
      }
      this.pack().on('error', reject).pipe(writeStream);
    });
  });
};

const sepia = (pathIn, pathOut) => {
  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(pathIn).on('error', reject);
    const png = new PNG({ filterType: 4 }).on('error', reject);
    const writeStream = fs.createWriteStream(pathOut)
      .on('error', reject)
      .on('finish', resolve);
    readStream.pipe(png).on('parsed', function () {
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          const idx = (this.width * y + x) << 2;
          const r = this.data[idx];
          const g = this.data[idx + 1];
          const b = this.data[idx + 2];
          this.data[idx] = Math.min(255, 0.393 * r + 0.769 * g + 0.189 * b);
          this.data[idx + 1] = Math.min(255, 0.349 * r + 0.686 * g + 0.168 * b);
          this.data[idx + 2] = Math.min(255, 0.272 * r + 0.534 * g + 0.131 * b);
        }
      }
      this.pack().on('error', reject).pipe(writeStream);
    });
  });
};

const dither = (pathIn, pathOut) => {
  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(pathIn).on('error', reject);
    const png = new PNG({ filterType: 4 }).on('error', reject);
    const writeStream = fs.createWriteStream(pathOut)
      .on('error', reject)
      .on('finish', resolve);
    readStream.pipe(png).on('parsed', function () {
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          const idx = (this.width * y + x) << 2;
          const oldPixel = this.data[idx];
          const newPixel = oldPixel < 128 ? 0 : 255;
          const error = oldPixel - newPixel;
          this.data[idx] = this.data[idx + 1] = this.data[idx + 2] = newPixel;
          if (x + 1 < this.width) this.data[idx + 4] += (error * 7) >> 4;
          if (y + 1 < this.height) {
            if (x > 0) this.data[idx + this.width * 4 - 4] += (error * 3) >> 4;
            this.data[idx + this.width * 4] += (error * 5) >> 4;
            if (x + 1 < this.width)
              this.data[idx + this.width * 4 + 4] += (error * 1) >> 4;
          }
        }
      }
      this.pack().on('error', reject).pipe(writeStream);
    });
  });
};


module.exports = {
  unzip,
  readDir,
  grayScale,
  sepia,
  dither,
};

