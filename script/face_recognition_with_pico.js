// cascade params
const min_size_of_cascade_param = 30;

// cliped_canvas context
const lw = 4; // lineWidth
const ss = 'rgba(0, 255, 0, 0.6)'; // strokeStyle
const update_memory = pico.instantiate_detection_memory(5); // we will use the detecions of the last 5 frames

// video canvas size(16:9)
var video_canvas_w = 640; // default 640
var video_canvas_h = Math.round(video_canvas_w * (16 / 9)); // default 360
var facefinder_classify_region = function(r, c, s, pixels, ldim) {return -1.0;};

PICO_FACE = {
    
    //Margin for Face's Frame
    setting_face_margin: function (range_elem, peerId) {
        // @link https://blog.sushi.money/entry/2017/04/19/114028
        Array.from(range_elem, function(range) {
            const bar = range.querySelector('input');
            switch (bar.id) {
                case 'adjustment_of_x_' + peerId:
                    $('#adjustment_of_x_' + peerId).val(-bar.value);
                    $('#adjustment_of_w_' + peerId).val(Math.abs(bar.value * 2));
                    break;
                case 'adjustment_of_y_' + peerId:
                    $('#adjustment_of_y_' + peerId).val(-bar.value);
                    $('#adjustment_of_h_' + peerId).val(Math.abs(bar.value * 2));
                    break;
            }
        });
    },
    init_face_margin: function(peerId) {
        
        var video       = document.getElementById('remoteVideos_' + peerId);
        var range_elem  = document.getElementsByClassName('range');
        $('#tracking_started_' + peerId).val(false);

        video.addEventListener('playing', function(){
            if ($('#tracking_started_' + peerId).val() === true) {
                return;
            }
        
            PICO_FACE.draw_loop(peerId);
            $('#tracking_started_' + peerId).val(true);
        });

        var apply_range_val = function(elem, target) {
            return function(evt) {
                PICO_FACE.setting_face_margin(peerId);
                target.innerHTML = elem.value;
            }
        }

        PICO_FACE.setting_face_margin(range_elem, peerId);
    
        for(let i = 0, len = range_elem.length; i < len; i++){
            let range = range_elem[i];
            let bar = range.querySelector('input');
            let target = range.querySelector('span > span.range-val');
            bar.addEventListener('input', apply_range_val(bar, target));
            target.innerHTML = bar.value;
        }
    },
        
    /*
        (2) get the drawing context on the canvas and define a function to transform an RGBA image to grayscale
    */
   rgba_to_grayscale:function (rgba, nrows, ncols) {
        let gray = new Uint8Array(nrows*ncols);
        for(let r=0; r<nrows; ++r)
            for(let c=0; c<ncols; ++c)
                // gray = 0.2*red + 0.7*green + 0.1*blue
                gray[r*ncols + c] = (2*rgba[r*4*ncols+4*c+0]+7*rgba[r*4*ncols+4*c+1]+1*rgba[r*4*ncols+4*c+2])/10;
        return gray;
    },
    
    /*
        (3) this function is called each time a video frame becomes available
    */
    
   processfn: function(peerId) {

        if(document.getElementById('remoteVideos_' + peerId) == null) return;
        
        var video           = document.getElementById('remoteVideos_' + peerId);
        var video_canvas    = document.getElementById('from-video_' + peerId);
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
            "pixels": PICO_FACE.rgba_to_grayscale(rgba, vch, vcw),
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
    
        // List with accurate score.
        let list_with_accurate_score = [];
    
        dets.filter(function(_dets, i) {
            // check the detection score
            // if it's above the threshold, draw it
            // (the constant 50.0 is empirical: other cascades might require a different one)
            if (_dets[3] > 50.0) {
                list_with_accurate_score.push(_dets);
            }
        });
    
        // 検出スコアの降順にソート
        list_with_accurate_score.sort(function(a, b){
            if(a[3] > b[3]) return -1;
            if(a[3] < b[3]) return 1;
            return 0;
        });
    
        for (let i=0;i<list_with_accurate_score.length;++i) {
            PICO_FACE.render_cliped_canvas(list_with_accurate_score, i, peerId);
        }
    },
    
    /**
     * draw frame.
     */
    draw_loop: function(peerId) {

        let last = Date.now();
        const loop = function() {
            // For some effects, you might want to know how much time is passed
            // since the last frame; that's why we pass along a Delta time `dt`
            // variable (expressed in milliseconds)
            // (see https://github.com/cbrandolino/camvas)
            let dt = Date.now() - last;
            PICO_FACE.processfn(peerId);
            last = Date.now();
            requestAnimationFrame(loop);
        };
    
        loop();
    },
    
    /**
     * render cliped_canvas
     */
    render_cliped_canvas: function (dets, i, peerId) { // dets == pico.cluster_detections()
        
        var video_canvas        = document.getElementById('from-video_' + peerId);
        var video_canvas_ctx    = video_canvas.getContext('2d');

        const vcw = video_canvas.width;
        const vch = video_canvas.height;
    
        const x = Math.round(dets[i][1]);
        const y = Math.round(dets[i][0]);
        const w = Math.round(dets[i][2]);
    
        // transform: scaleX(-1); している場合sxとswの関係性が逆転します
        let sx = Math.round(x - w/2 + parseInt($('#adjustment_of_x_' + peerId).val()));
        let sy = Math.round(y - w/2 + parseInt($('#adjustment_of_y_' + peerId).val()));
        let sw = w + parseInt($('#adjustment_of_w_' + peerId).val());
        let sh = w + parseInt($('#adjustment_of_h_' + peerId).val());
    
        // 画面上に顔切り取り部分が見切れた場合
        if (sy < 0) {
            sy += Math.abs(sy);
        }
    
        // 画面下に顔切り取り部分が見切れた場合
        if (sy + sh > vch) {
            sy -= (sy + sh) - vch;
        }
    
        // 画面左に顔切り取り部分が見切れた場合
        if (sx + sw > vcw) {
            sx -= (sx + sw) - vcw;
        }
    
        // 画面右に顔切り取り部分が見切れた場合
        if (sx < 0) {
            sx += Math.abs(sx);
        }
    
        video_canvas_ctx.beginPath();
        video_canvas_ctx.lineWidth = lw;
        video_canvas_ctx.strokeStyle = ss;
        video_canvas_ctx.strokeRect(sx, sy, sw, sh);
        video_canvas_ctx.stroke();
    }    
};