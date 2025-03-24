const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Add version and path configuration
const VERSION = "1.0.0"; // Change this when updating the database structure
const sourcePath = path.join(__dirname, '..', 'test', 'midi-main', 'midi-main');
const outputDirs = [
    path.join(__dirname, '..', 'test'),  // Primary output
    process.argv[2] ? path.resolve(process.argv[2]) : null  // Optional second output
].filter(Boolean);  // Remove null if no second path provided

// Function to clean up old database files
function removeOldDatabases(directory) {
    const files = fs.readdirSync(directory);
    files.forEach(file => {
        if (file.startsWith('midi-database-v') && file.endsWith('.json') || 
            file === 'midi-database-version.json') {
            fs.unlinkSync(path.join(directory, file));
            console.log(`Removed old file from ${directory}: ${file}`);
        }
    });
}

// Function to write database files
function writeFiles(directory, database, minified, gzipped, isPrimary = false) {
    const versionFile = path.join(directory, 'midi-database-version.json');
    const outputPath = path.join(directory, `midi-database-v${VERSION}.json`);
    const gzipPath = outputPath.replace('.json', '.json.gz');
    
    // Create version info file - always needed
    const versionInfo = {
        version: VERSION,
        lastUpdated: database.generatedAt,
        filename: `midi-database-v${VERSION}.json.gz`
    };
    fs.writeFileSync(versionFile, JSON.stringify(versionInfo, null, 2));

    // Write uncompressed files only to primary directory
    if (isPrimary) {
        fs.writeFileSync(outputPath, minified);
    }
    
    // Write gzipped version everywhere
    fs.writeFileSync(gzipPath, gzipped);
    
    console.log(`\nFiles written to ${directory}:`);
    console.log(`- ${path.basename(versionFile)}`);
    if (isPrimary) {
        console.log(`- ${path.basename(outputPath)}`);
    }
    console.log(`- ${path.basename(gzipPath)}`);
}

function parseCSV(csvText) {
    const lines = csvText.split('\n')
        .filter(line => line.trim() && !line.startsWith('manufacturer'));
    
    return lines.map(line => {
        const [
            manufacturer,
            device,
            section,
            parameter_name,
            parameter_description,
            cc_msb,
            cc_lsb,
            cc_min_value,
            cc_max_value,
            nrpn_msb,
            nrpn_lsb,
            nrpn_min_value,
            nrpn_max_value,
            orientation,
            notes,
            usage
        ] = line.split(',').map(field => field?.trim());

        return {
            manufacturer,
            device,
            section,
            name: parameter_name,
            description: parameter_description,
            cc: {
                msb: parseInt(cc_msb),
                lsb: cc_lsb ? parseInt(cc_lsb) : undefined,
                min: parseInt(cc_min_value) || 0,
                max: parseInt(cc_max_value) || 127
            },
            notes,
            usage
        };
    });
}

function buildGenericDevice() {
    return {
        name: "Generic MIDI Device",
        commands: [
            { "name": "Note On", "value": [144, 0, 0, 127, "range"] },
            { "name": "Note Off", "value": [128, 0, 0, 127, "range"] },
            { "name": "Program Change", "value": [192, 0, 0, 127, "range"] },
            { "name": "Channel Pressure", "value": [208, 0, 0, 127, "range"] },
            { "name": "Pitch Bend", "value": [224, 0, 0, 16383, "range"] }
        ]
    };
}

function buildDevice(deviceData, manufacturer) {
    const deviceName = deviceData[0].device;
    
    return {
        name: `${manufacturer} ${deviceName}`,
        manufacturer: manufacturer,
        commands: deviceData.map(param => ({
            name: param.name,
            section: param.section,
            description: param.description,
            value: [
                176, // Control Change
                param.cc.msb,
                param.cc.min,
                param.cc.max,
                param.cc.max <= 1 ? "toggle" : "range"
            ],
            notes: param.notes,
            usage: param.usage
        }))
    };
}

function minifyDatabase(database) {
    // Remove whitespace from JSON
    return JSON.stringify(database);
}

function convertDatabase() {
    console.log('Starting MIDI database conversion...');
    
    // Remove old database files from all output directories
    outputDirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`Created output directory: ${dir}`);
        }
        removeOldDatabases(dir);
    });
    
    const timestamp = new Date().toISOString();
    
    // Create database object with metadata
    const database = {
        version: VERSION,
        generatedAt: timestamp,
        devices: [buildGenericDevice()]
    };
    
    // Get all manufacturer folders
    const manufacturers = fs.readdirSync(sourcePath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    
    console.log(`Found ${manufacturers.length} manufacturers`);
    
    // Process each manufacturer
    manufacturers.forEach(manufacturer => {
        const manufacturerPath = path.join(sourcePath, manufacturer);
        const files = fs.readdirSync(manufacturerPath)
            .filter(file => file.endsWith('.csv'));
        
        console.log(`Processing ${manufacturer}: ${files.length} devices`);
        
        // Process each device CSV
        files.forEach(file => {
            try {
                const csvContent = fs.readFileSync(
                    path.join(manufacturerPath, file), 
                    'utf8'
                );
                const deviceData = parseCSV(csvContent);
                if (deviceData.length > 0) {
                    database.devices.push(buildDevice(deviceData, manufacturer));
                }
            } catch (error) {
                console.error(`Error processing ${manufacturer}/${file}:`, error);
            }
        });
    });
    
    // Prepare compressed versions
    const minified = minifyDatabase(database);
    const gzipped = zlib.gzipSync(minified);
    
    // Write files to all output directories
    outputDirs.forEach((dir, index) => {
        writeFiles(dir, database, minified, gzipped, index === 0);
    });
    
    // Log size differences
    const originalSize = Buffer.from(JSON.stringify(database, null, 2)).length;
    const minifiedSize = minified.length;
    const gzippedSize = gzipped.length;
    
    console.log('\nCompression Results:');
    console.log(`Original: ${(originalSize / 1024).toFixed(2)} KB`);
    console.log(`Minified: ${(minifiedSize / 1024).toFixed(2)} KB (${((minifiedSize/originalSize)*100).toFixed(1)}%)`);
    console.log(`Gzipped:  ${(gzippedSize / 1024).toFixed(2)} KB (${((gzippedSize/originalSize)*100).toFixed(1)}%)`);
    
    console.log('\nDatabase build complete:');
    console.log(`Version: ${VERSION}`);
    console.log(`Generated: ${timestamp}`);
    console.log(`Devices: ${database.devices.length}`);
    console.log(`Output directories: ${outputDirs.length}`);
}

convertDatabase();
