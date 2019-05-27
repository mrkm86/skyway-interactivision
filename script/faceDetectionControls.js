const MODEL_URL = '/weights'
const TINY_FACE_DETECTOR = 'tiny_face_detector';
let selectedFaceDetector = TINY_FACE_DETECTOR;

// tiny_face_detector options
let inputSize = 256;
let scoreThreshold = 0.5;

faceapi.loadTinyFaceDetectorModel(MODEL_URL);
faceapi.loadFaceExpressionModel(MODEL_URL);
faceapi.tf.ENV.set('WEBGL_PACK', false);      /*For Google Chrome (error: Failed to link vertex and fragment shaders.)*/

FACE_API = {
  initFaceMargin: function (peerId) {

    var video = document.getElementById('remoteVideos_' + peerId);
    $('#tracking_started_' + peerId).val(false);

    video.addEventListener('playing', function () {
      if ($('#tracking_started_' + peerId).val() === true) {
        return;
      }

      FACE_API.drawLoop(peerId);
      $('#tracking_started_' + peerId).val(true);
    });
  },
  /**
     * draw frame.
     */
  drawLoop: function (peerId) {

    let last = Date.now();
    const loop = async function () {
      // For some effects, you might want to know how much time is passed
      // since the last frame; that's why we pass along a Delta time `dt`
      // variable (expressed in milliseconds)
      // (see https://github.com/cbrandolino/camvas)
      let dt = Date.now() - last;
      FACE_API.processfn(peerId);
      last = Date.now();

      if ($('#allowFaceDetect').is(':checked')) {
        $('.from-video').removeClass('item-visible');
        requestAnimationFrame(loop);
      }
      else {
        $('.from-video').addClass('item-visible');
      }
    };

    loop();
  },
  /*
        This function is called each time a video frame becomes available
    */
  processfn: async function (peerId) {

    if (document.getElementById('remoteVideos_' + peerId) == null) return;
    if (!$('#allowFaceDetect').is(':checked')) return;

    var video = document.getElementById('remoteVideos_' + peerId);
    var video_canvas = document.getElementById('from-video_' + peerId);
    
    const result = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold })).withFaceExpressions();

    if (result) {
      const dims = faceapi.matchDimensions(video_canvas, video, true);
      const resizedResult = faceapi.resizeResults(result, dims);
      const minConfidence = 0.05;

      //Draw frame
      faceapi.draw.drawDetections(video_canvas, resizedResult);
      //Draw face expressions ('neutral', 'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised')
      faceapi.draw.drawFaceExpressions(video_canvas, resizedResult, minConfidence)

      if ($('.from-video').hasClass('item-visible')) {
        $('.from-video').removeClass('item-visible');
      }

    }
    else {
      if (!$('.from-video').hasClass('item-visible')) {
        $('.from-video').addClass('item-visible');
      }
    }
  },
  getCurrentFaceDetectionNet: function () {
    if (selectedFaceDetector === TINY_FACE_DETECTOR) {
      return faceapi.nets.tinyFaceDetector;
    }
  },
  isFaceDetectionModelLoaded: function () {
    return !!getCurrentFaceDetectionNet().params;
  }
}