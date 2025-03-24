const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const VERSION = "1.0.0"; // Update when changing database structure
const sourcePath = path.join(__dirname); // Root folder
const outputDir = path.join(__dirname, 'Json'); // Store JSON output

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Created output directory: ${outputDir}`);
}

// Removes old JSON database files
function removeOldDatabases(directory) {
    const files = fs.readdirSync(directory);
    files.forEach(file => {
        if (file.startsWith('midi-database-v') && file.endsWith('.json') ||
            file === 'midi-database-version.json') {
            fs.unlinkSync(path.join(directory, file));
            console.log(`Removed old file: ${file}`);
        }
    });
}

// Writes JSON and Gzipped JSON
function writeFiles(database) {
    const timestamp = database.generatedAt;
    const versionFile = path.join(outputDir, 'midi-database-version.json');
    const jsonFile = path.join(outputDir, `midi-database-v${VERSION}.json`);
    const gzipFile = jsonFile + '.gz';

    // Version info
    fs.writeFileSync(versionFile, JSON.stringify({ version: VERSION, lastUpdated: timestamp, filename: path.basename(gzipFile) }, null, 2));

    // Write JSON
    const minified = JSON.stringify(database);
    fs.writeFileSync(jsonFile, minified);

    // Write Gzipped JSON
    fs.writeFileSync(gzipFile, zlib.gzipSync(minified));

    console.log(`\n✅ Database saved to ${outputDir}`);
    console.log(`- ${path.basename(versionFile)}`);
    console.log(`- ${path.basename(jsonFile)}`);
    console.log(`- ${path.basename(gzipFile)}`);
}

// Parses CSV content into JSON objects
function parseCSV(csvText) {
    const lines = csvText.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('manufacturer'));

    return lines.map(line => {
        const fields = line.split(',').map(field => field.trim());
        return {
            manufacturer: fields[0],
            device: fields[1],
            section: fields[2],
            name: fields[3],
            description: fields[4],
            cc: { msb: parseInt(fields[5]) || undefined, lsb: parseInt(fields[6]) || undefined, min: parseInt(fields[7]) || 0, max: parseInt(fields[8]) || 127 },
            nrpn: { msb: parseInt(fields[9]) || undefined, lsb: parseInt(fields[10]) || undefined, min: parseInt(fields[11]) || 0, max: parseInt(fields[12]) || 127 },
            orientation: fields[13] || undefined,
            notes: fields[14] || undefined,
            usage: fields[15] || undefined
        };
    });
}

// Builds a "Generic MIDI Device"
function buildGenericDevice() {
    return {
        name: "Generic MIDI Device",
        commands: [
            { name: "Note On", value: [144, 0, 0, 127, "range"] },
            { name: "Note Off", value: [128, 0, 0, 127, "range"] },
            { name: "Program Change", value: [192, 0, 0, 127, "range"] },
            { name: "Channel Pressure", value: [208, 0, 0, 127, "range"] },
            { name: "Pitch Bend", value: [224, 0, 0, 16383, "range"] }
        ]
    };
}

// Converts CSVs into a single JSON database
function convertDatabase() {
    console.log('\n🚀 Starting MIDI database conversion...');

    removeOldDatabases(outputDir);
    const timestamp = new Date().toISOString();
    const database = { version: VERSION, generatedAt: timestamp, devices: [buildGenericDevice()] };

    // Traverse manufacturer folders and find CSV files
    const manufacturerFolders = fs.readdirSync(sourcePath).filter(file => fs.statSync(path.join(sourcePath, file)).isDirectory());

    manufacturerFolders.forEach(folder => {
        console.log(`📦 Processing folder: ${folder}`);
        
        // Find CSV files inside each manufacturer folder
        const csvFiles = fs.readdirSync(path.join(sourcePath, folder)).filter(file => file.endsWith('.csv'));

        console.log(`Found ${csvFiles.length} CSV file(s) in manufacturer folder: ${folder}`);

        csvFiles.forEach(file => {
            try {
                const csvContent = fs.readFileSync(path.join(sourcePath, folder, file), 'utf8');
                const deviceData = parseCSV(csvContent);
                if (deviceData.length > 0) {
                    const manufacturer = deviceData[0].manufacturer;
                    database.devices.push({
                        name: `${manufacturer} ${deviceData[0].device}`,
                        manufacturer,
                        commands: deviceData.map(param => ({
                            name: param.name,
                            section: param.section,
                            description: param.description,
                            value: [176, param.cc.msb || 0, param.cc.min, param.cc.max, param.cc.max <= 1 ? "toggle" : "range"],
                            notes: param.notes,
                            usage: param.usage
                        }))
                    });
                }
            } catch (error) {
                console.error(`❌ Error processing ${file} in ${folder}:`, error);
            }
        });
    });

    writeFiles(database);

    console.log('\n✅ Conversion complete!');
    console.log(`📂 Devices: ${database.devices.length}`);
    console.log(`📌 Version: ${VERSION}`);
    console.log(`📅 Generated: ${timestamp}`);
}

convertDatabase();
