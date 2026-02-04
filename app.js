const express = require('express');
const cors = require('cors');
const youtubedl = require('yt-dlp-exec');
const ffmpegPath = require('ffmpeg-static'); // <--- IMPORT THIS
const app = express();

app.use(cors());

// 1. Get Info
app.get('/info', async (req, res) => {
    const videoURL = req.query.url;
    console.log("Received request for:", videoURL); // <--- Add this to confirm request received

    try {
        const output = await youtubedl(videoURL, {
            dumpJson: true,
            noWarnings: true,
            noCallHome: true
        });
        res.json({
            title: output.title,
            thumbnail: output.thumbnail,
            contentLength: output.filesize_approx || 0
        });
    } catch (error) {
        // ▼▼▼ ADD THIS LINE ▼▼▼
        console.error("YOUTUBE-DL ERROR:", error); 
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
        
        res.status(500).json({ error: 'Failed to fetch video details' });
    }
});

// 2. Direct Stream Download (FIXED: WITH SOUND)
app.get('/download', (req, res) => {
    const videoURL = req.query.url;
    const title = req.query.title || 'video';
    const cleanTitle = title.replace(/[^a-zA-Z0-9 ]/g, "").trim();

    // Tell the browser this is a video file
    res.setHeader('Content-Disposition', `attachment; filename="${cleanTitle}.mp4"`);
    res.setHeader('Content-Type', 'video/mp4');

    const subprocess = youtubedl.exec(videoURL, {
        output: '-',
        
        // Get Best Video and Best Audio
        format: 'bestvideo+bestaudio/best',
        
        // -------------------------------------------------------
        // CRITICAL FIX: Tell yt-dlp where the "Glue" tool is
        // -------------------------------------------------------
        ffmpegLocation: ffmpegPath, 
        
        // ARGS: These allow the video to stream smoothly while being built
        postprocessorArgs: ['ffmpeg:-movflags', 'frag_keyframe+empty_moov+default_base_moof']
    });

    // Pipe the result directly to the user (No Folder Storage)
    subprocess.stdout.pipe(res);

    subprocess.stderr.on('data', (data) => {
        // console.log(data.toString()); // Uncomment to debug
    });

    // Clean up if user closes tab
    req.on('close', () => {
        subprocess.kill(); 
    });
});

app.listen(4000, () => console.log('Server running on port 4000'));