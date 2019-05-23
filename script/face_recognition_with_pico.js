// cascade params
const min_size_of_cascade_param = 200; /** Important **/ /** Large Number -> Faster **/

// cliped_canvas context
const lw = 4; // lineWidth
const ss = 'rgba(0, 255, 0, 0.6)'; // strokeStyle
const update_memory = pico.instantiate_detection_memory(5); // we will use the detecions of the last 5 frames

// video canvas size(16:9)
var video_canvas_w = 640; // default 640
var video_canvas_h = Math.round(video_canvas_w * (16 / 9)); // default 360
var facefinder_classify_region = function (r, c, s, pixels, ldim) { return -1.0; };

PICO_FACE = {
    initFaceMargin: function (peerId) {

        var video = document.getElementById('remoteVideos_' + peerId);
        // var range_elem  = document.getElementsByClassName('range');
        $('#tracking_started_' + peerId).val(false);

        video.addEventListener('playing', function () {
            if ($('#tracking_started_' + peerId).val() === true) {
                return;
            }

            PICO_FACE.drawLoop(peerId);
            $('#tracking_started_' + peerId).val(true);
        });
    },

    /*
        (2) get the drawing context on the canvas and define a function to transform an RGBA image to grayscale
    */
    rgbaToGrayscale: function (rgba, nrows, ncols) {
        let gray = new Uint8Array(nrows * ncols);
        for (let r = 0; r < nrows; ++r)
            for (let c = 0; c < ncols; ++c)
                // gray = 0.2*red + 0.7*green + 0.1*blue
                gray[r * ncols + c] = (2 * rgba[r * 4 * ncols + 4 * c + 0] + 7 * rgba[r * 4 * ncols + 4 * c + 1] + 1 * rgba[r * 4 * ncols + 4 * c + 2]) / 10;
        return gray;
    },

    /*
        (3) this function is called each time a video frame becomes available
    */

    processfn: function (peerId) {

        if (document.getElementById('remoteVideos_' + peerId) == null) return;

        var video = document.getElementById('remoteVideos_' + peerId);
        var video_canvas = document.getElementById('from-video_' + peerId);
        var video_canvas_ctx = video_canvas.getContext('2d');

        // render the video frame to the canvas element and extract RGBA pixel data
        const vcw = video_canvas.width;
        const vch = video_canvas.height;
        const long_side = vcw >= vch ? vcw : vch;

        video_canvas_ctx.clearRect(0, 0, vcw, vch);
        video_canvas_ctx.drawImage(video, 0, 0, vcw, vch);

        let rgba = video_canvas_ctx.getImageData(0, 0, vcw, vch).data;

        // prepare input to `run_cascade`
        let image = {
            "pixels": PICO_FACE.rgbaToGrayscale(rgba, vch, vcw),
            "nrows": vch,
            "ncols": vcw,
            "ldim": vcw
        }

        let params = {
            "shiftfactor": 0.1, // move the detection window by 10% of its size
            "minsize": min_size_of_cascade_param, // minimum size of a face
            "maxsize": long_side, // maximum size of a face
            "scalefactor": 1.1 // for multiscale processing: resize the detection window by 10% when moving to the higher scale
        }

        // run the cascade over the frame and cluster the obtained detections
        // dets is an array that contains (r, c, s, q) quadruplets
        // (representing row, column, scale and detection score)
        let dets = pico.run_cascade(image, facefinder_classify_region, params);
        dets = update_memory(dets);
        dets = pico.cluster_detections(dets, 0.2); // set IoU threshold to 0.2

        // draw detections
        dets.filter(function (_dets, i) {
            // check the detection score
            // if it's above the threshold, draw it
            // (the constant 50.0 is empirical: other cascades might require a different one)
            if (_dets[3] > 50.0) {
                const x = Math.round(_dets[1]);
                const y = Math.round(_dets[0]);
                const w = Math.round(_dets[2]);

                var sx = Math.round(x - w / 2 - 15);
                var sy = Math.round(y - w / 2 - 15);
                var sw = w + 30;
                var sh = w + 30;

                video_canvas_ctx.beginPath();
                video_canvas_ctx.lineWidth = lw;
                video_canvas_ctx.strokeStyle = ss;
                video_canvas_ctx.strokeRect(sx, sy, sw, sh);
                video_canvas_ctx.stroke();
            }
        });
    },

    /**
     * draw frame.
     */
    drawLoop: function (peerId) {

        let last = Date.now();
        const loop = function () {
            // For some effects, you might want to know how much time is passed
            // since the last frame; that's why we pass along a Delta time `dt`
            // variable (expressed in milliseconds)
            // (see https://github.com/cbrandolino/camvas)
            let dt = Date.now() - last;
            PICO_FACE.processfn(peerId);
            last = Date.now();

            if ($('#allowFaceDetect').is(':checked'))
            {
                $('.from-video').removeClass('item-visible');
                $('.remoteVideos').addClass('item-visible');
                requestAnimationFrame(loop);
            }
            else {
                $('.from-video').addClass('item-visible');
                $('.remoteVideos').removeClass('item-visible');
            }
        };

        loop();
    },

    /**
     * render cliped_canvas
     */
    renderClipedCcanvas: function (dets, peerId, video_canvas_ctx) { // dets == pico.cluster_detections()

        const x = Math.round(dets[1]);
        const y = Math.round(dets[0]);
        const w = Math.round(dets[2]);

        var sx = Math.round(x - w / 2 - 15);
        var sy = Math.round(y - w / 2 - 15);
        var sw = w + 30;
        var sh = w + 30;

        video_canvas_ctx.beginPath();
        video_canvas_ctx.lineWidth = lw;
        video_canvas_ctx.strokeStyle = ss;
        video_canvas_ctx.strokeRect(sx, sy, sw, sh);
        video_canvas_ctx.stroke();
    }
};