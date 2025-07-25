const fs = require("fs");
const path = require("path");

const IOhandler = require("./IOhandler");
const zipFilePath = path.join(__dirname, "myfile.zip");
const pathUnzipped = path.join(__dirname, "unzipped");
const pathProcessedGray = path.join(__dirname, "grayscaled");
const pathProcessedSepia = path.join(__dirname, "sepia");
const pathProcessedDither = path.join(__dirname, "dithered");

async function main() {
    await fs.promises.rm(pathUnzipped, { recursive: true, force: true });
    await IOhandler.unzip(zipFilePath, pathUnzipped);
    console.log("Unzipped files!");

    const goodFiles = await IOhandler.readDir(pathUnzipped);
    console.log("Files to process:", goodFiles);

    // Ensure nested output directories exist per file
    for (const file of goodFiles) {
      await fs.promises.mkdir(path.join(pathProcessedGray, path.dirname(file)), { recursive: true });
      await fs.promises.mkdir(path.join(pathProcessedSepia, path.dirname(file)), { recursive: true });
      await fs.promises.mkdir(path.join(pathProcessedDither, path.dirname(file)), { recursive: true });
    }

    // Create directories for output if they don't exist
    await Promise.all([
        fs.promises.mkdir(pathProcessedGray, { recursive: true }),
        fs.promises.mkdir(pathProcessedSepia, { recursive: true }),
        fs.promises.mkdir(pathProcessedDither, { recursive: true }),
    ]);

    // Process files with all filters
    const tasks = goodFiles.map((file) => {
      console.log(`Processing file: ${file}`);
        const inputPath = path.join(pathUnzipped, file);

        return Promise.all([
            IOhandler.grayScale(inputPath, path.join(pathProcessedGray, file)),
            IOhandler.sepia(inputPath, path.join(pathProcessedSepia, file)),
            IOhandler.dither(inputPath, path.join(pathProcessedDither, file)),
        ]);
    });

    // Wait for all tasks to finish and handle errors
    try {
      await Promise.all(tasks);
      console.log("Successfully processed all files with grayscale, sepia, and dithering filters!");
    } catch (err) {
      console.error("Processing error:", err.message);
    }
}

main();
