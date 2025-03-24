const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/**
 * CSV Format:
 * manufacturer,device,section,parameter_name,parameter_description,cc_msb,cc_lsb,cc_min_value,cc_max_value,nrpn_msb,nrpn_lsb,nrpn_min_value,nrpn_max_value,orientation,notes,usage
 * Example:
 * Lofty,Trundler,Oscillators,Glide rate,"Adjusts the glide (portmanteau) time",5,,0,127,1,1,0,127,0-based,Default is zero.,
 * Lofty,Trundler,Oscillators,Glide switch,Enables or disables glide.,65,,0,127,1,2,0,127,0-based,,0-63: Off; 64-127: On
 * Lofty,Trundler,Oscillators,Note sync,Enables and disables Note Sync,81,,0,127,,,,,0-based,,0: Off; 1-127: On
 * Lofty,Trundler,Amp,Pan,Pans between left to right channel,10,,0,127,30,0,0,127,Centered,Left…Centered…Right,0~127: Pan amount
 *
 * JSON Format:
 * {
 *   "version": "1.0.0", // Database version
 *   "generatedAt": "timestamp", // Timestamp of database generation
 *   "devices": [
 *     {
 *       "name": "Manufacturer Device", // Full name of the device
 *       "manufacturer": "Manufacturer", // Manufacturer name
 *       "commands": [
 *         {
 *           "name": "Parameter Name", // Parameter name from CSV
 *           "section": "Section", // Section from CSV
 *           "description": "Description", // Parameter description from CSV
 *           "value": [176, msb, min, max, type], // MIDI value and range
 *           "notes": "Notes", // Optional notes
 *           "usage": "Usage" // Optional usage
 *         },
 *         // more commands here
 *       ]
 *     },
 *     // more devices here
 *   ]
 * }
 */

const VERSION = "1.0.0"; // Update when changing database structure
const rootPath = path.join(__dirname, '..'); // Root folder (one level up from current script)
const outputDir = path.join(rootPath, 'Json'); // Store JSON output in the Json folder

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
            cc: {
                msb: parseInt(fields[5]) || undefined,
                lsb: fields[6] ? parseInt(fields[6]) : undefined,
                min: parseInt(fields[7]) || 0,
                max: parseInt(fields[8]) || 127
            },
            nrpn: {
                msb: parseInt(fields[9]) || undefined,
                lsb: fields[10] ? parseInt(fields[10]) : undefined,
                min: parseInt(fields[11]) || 0,
                max: parseInt(fields[12]) || 127
            },
            orientation: fields[13] || undefined,
            notes: fields[14] || undefined,
            usage: fields[15] || undefined
        };
    });
}

// Converts CSVs into a single JSON database
function convertDatabase() {
    console.log('\n🚀 Starting MIDI database conversion...');

    removeOldDatabases(outputDir);
    const timestamp = new Date().toISOString();
    const database = { version: VERSION, generatedAt: timestamp, devices: [] };

    // Traverse manufacturer folders and find CSV files in the root (not in the 'Json' folder)
    const manufacturerFolders = fs.readdirSync(rootPath).filter(file => fs.statSync(path.join(rootPath, file)).isDirectory() && file !== 'Json');

    manufacturerFolders.forEach(folder => {
        console.log(`📦 Processing folder: ${folder}`);
        
        // Find CSV files inside each manufacturer folder
        const csvFiles = fs.readdirSync(path.join(rootPath, folder)).filter(file => file.endsWith('.csv'));

        console.log(`Found ${csvFiles.length} CSV file(s) in manufacturer folder: ${folder}`);

        csvFiles.forEach(file => {
            try {
                const csvContent = fs.readFileSync(path.join(rootPath, folder, file), 'utf8');
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
                console.error(`❌ Error processing ${file}:`, error);
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
